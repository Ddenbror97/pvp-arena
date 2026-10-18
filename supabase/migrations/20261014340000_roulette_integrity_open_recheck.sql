-- roulette_integrity_check re-detects a finished round only while it is inside
-- the 48-hour window, then once per cursor wrap (500 ids per hourly run, about
-- 4.5 days at 53k rounds). An unresolved mismatch therefore goes quiet after
-- 48 hours even though nothing was fixed. Every detection inside the window
-- also raised a WARNING every hour.
--
-- 1. Open (unacknowledged) roulette incidents are re-checked every run, so
--    last_seen_at keeps advancing while the data is still wrong.
-- 2. A WARNING is raised when an incident is new, when it comes back after a
--    clean run, or as a daily reminder while it stays open. Counting
--    (occurrences, last_seen_at, details) is unchanged.
-- 3. Acknowledgement is manual only and needs a note. Nothing here sets it, so
--    existing incidents stay open.
--
-- Fingerprints stay unique (integrity_incidents.fingerprint), so the recheck
-- updates the existing row and never creates a second one. If the data is
-- repaired, the incident row is kept; last_seen_at simply stops advancing.
--
-- Rollback: re-run the roulette_integrity_check block from 20261011180000
-- verbatim. Keep the new columns; dropping them loses recorded acknowledgements.

set lock_timeout = '5s';

alter table public.integrity_incidents
  add column if not exists last_alerted_at timestamptz,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_note text;

alter table public.integrity_incidents
  drop constraint if exists integrity_incidents_ack_note_check;
alter table public.integrity_incidents
  add constraint integrity_incidents_ack_note_check
  check (acknowledged_at is null or length(btrim(coalesce(acknowledged_note, ''))) > 0);

-- Identical to 20261011180000 except where marked "open-recheck".
create or replace function public.roulette_integrity_check()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare r record; n integer := 0; v_cursor bigint; v_batch bigint; v_max bigint; v_next bigint; v_scanned integer; v_open bigint;
  v_after bigint; v_above bigint; v_above_max bigint; v_after_next bigint;
  v_alert boolean; n_alerts integer := 0; v_rechecked integer := 0;
begin
  v_cursor := coalesce((select last_id from public.integrity_scan_cursor where name = 'roulette'), 0);
  begin
    drop table if exists pg_temp._roulette_hist;
    drop table if exists pg_temp._roulette_above;
    drop table if exists pg_temp._roulette_scope;
  exception when others then
    null;
  end;
  create temporary table _roulette_hist (id bigint primary key);
  create temporary table _roulette_above (id bigint primary key);
  create temporary table _roulette_scope (id bigint primary key);
  select coalesce(min(id), 0) into v_open
  from public.roulette_games
  where status not in ('COMPLETED', 'CANCELLED');
  insert into _roulette_hist (id)
  select g.id
  from public.roulette_games g
  where g.status in ('COMPLETED', 'CANCELLED')
    and g.id > v_cursor
    and (v_open = 0 or g.id < v_open)
  order by g.id
  limit 500;
  v_after := coalesce((select last_id from public.integrity_scan_cursor where name = 'roulette_after'), 0);
  insert into _roulette_above (id)
  select g.id
  from public.roulette_games g
  where g.status in ('COMPLETED', 'CANCELLED')
    and g.id > greatest(v_after, v_open)
    and coalesce(g.completed_at, g.cancelled_at, g.created_at) < clock_timestamp() - interval '48 hours'
  order by g.id
  limit 500;
  insert into _roulette_scope (id)
  select g.id from public.roulette_games g where g.status not in ('COMPLETED', 'CANCELLED')
  union
  select g.id from public.roulette_games g
   where g.status in ('COMPLETED', 'CANCELLED')
     and coalesce(g.completed_at, g.cancelled_at, g.created_at) >= clock_timestamp() - interval '48 hours'
  union
  select id from _roulette_hist
  union
  select id from _roulette_above;
  -- open-recheck: rounds behind unacknowledged incidents, newest 1000, whatever their age.
  with open_games as (
    select substring(i.fingerprint from '^rl[peos]:([0-9]+)$')::bigint as id
    from public.integrity_incidents i
    where i.check_name like 'roulette\_%'
      and i.acknowledged_at is null
    order by i.last_seen_at desc
    limit 1000
  )
  insert into _roulette_scope (id)
  select distinct o.id
  from open_games o
  join public.roulette_games g on g.id = o.id
  on conflict (id) do nothing;
  get diagnostics v_rechecked = row_count;
  select count(*) into v_scanned from _roulette_scope;
  for r in
    with scope as (select id from _roulette_scope),
    bets as (
      select b.game_id, count(*)::int n, coalesce(sum(b.amount), 0)::bigint s
      from public.roulette_bets b
      where b.game_id in (select id from scope)
      group by b.game_id
    ),
    entries as (
      select t.game_id, count(*)::int n
      from public.ledger_transactions t
      where t.kind = 'roulette_entry' and t.game_id in (select id from scope)
      group by t.game_id
    ),
    settlements as (
      select t.game_id, count(*)::int n
      from public.ledger_transactions t
      where t.kind = 'roulette_settlement' and t.game_id in (select id from scope)
      group by t.game_id
    ),
    refunds as (
      select t.game_id, count(*)::int n
      from public.ledger_transactions t
      where t.kind = 'roulette_refund' and t.game_id in (select id from scope)
      group by t.game_id
    ),
    pays as (
      select p.game_id, count(*)::int n, coalesce(sum(p.amount), 0)::bigint s
      from public.roulette_payouts p
      where p.kind = 'WINNER' and p.game_id in (select id from scope)
      group by p.game_id
    ),
    color_hits as (
      select b.game_id, count(*)::int n
      from public.roulette_bets b
      join public.roulette_games g on g.id = b.game_id
      where b.game_id in (select id from scope) and b.color = g.winning_color
      group by b.game_id
    ),
    bad_pay as (
      select distinct p.game_id
      from public.roulette_payouts p
      join public.roulette_bets b on b.id = p.bet_id
      join public.roulette_games g on g.id = p.game_id
      where p.kind = 'WINNER' and p.game_id in (select id from scope)
        and (b.color is distinct from g.winning_color
          or p.amount <> (b.amount * b.multiplier_bps) / 10000
            - (((b.amount * b.multiplier_bps) / 10000) * g.win_fee_bps) / 10000)
    )
    select 'roulette_pot_mismatch' chk, 'rlp:' || g.id fp, jsonb_build_object('game_id', g.id, 'pot', g.pot_amount, 'bets', g.bet_count) d
      from public.roulette_games g
      left join bets b on b.game_id = g.id
      where g.id in (select id from scope)
        and (g.pot_amount <> coalesce(b.s, 0) or g.bet_count <> coalesce(b.n, 0))
    union all
    select 'roulette_entry_debit_mismatch', 'rle:' || g.id, jsonb_build_object('game_id', g.id)
      from public.roulette_games g
      left join bets b on b.game_id = g.id
      left join entries e on e.game_id = g.id
      where g.id in (select id from scope)
        and coalesce(b.n, 0) <> coalesce(e.n, 0)
    union all
    select 'roulette_outcome_mismatch', 'rlo:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status)
      from public.roulette_games g
      left join bets b on b.game_id = g.id
      left join settlements s on s.game_id = g.id
      left join refunds rf on rf.game_id = g.id
      left join pays p on p.game_id = g.id
      left join color_hits c on c.game_id = g.id
      where g.id in (select id from scope)
        and (coalesce(s.n, 0) <> case when g.status = 'COMPLETED' then g.bet_count else 0 end
         or coalesce(rf.n, 0) <> case when g.status = 'CANCELLED' then g.bet_count else 0 end
         or coalesce(p.n, 0) <> case when g.status = 'COMPLETED' then coalesce(c.n, 0) else 0 end
         or g.id in (select game_id from bad_pay)
         or (g.status = 'COMPLETED' and g.total_payout <> coalesce(p.s, 0)))
    union all
    select 'roulette_settlement_stuck', 'rls:' || g.id,
           jsonb_build_object('game_id', g.id, 'status', g.status, 'attempts', g.settle_attempts, 'last_error', g.last_error,
                              'since', coalesce(g.settlement_started_at, g.spin_end_at, g.betting_ends_at))
      from public.roulette_games g
      where g.id in (select id from scope)
        and ((g.status = 'SETTLEMENT' and (g.settle_attempts >= 3 or g.settlement_started_at < clock_timestamp() - interval '2 minutes'))
         or (g.status in ('LOCKED', 'SPINNING') and g.spin_end_at < clock_timestamp() - interval '2 minutes'))
  loop
    n := n + 1;
    -- open-recheck: alert when new, when back after a clean run (no sighting in
    -- the last 90 minutes of hourly runs), or once a day while still open.
    insert into public.integrity_incidents as i (check_name, fingerprint, details, last_alerted_at)
    values (r.chk, r.fp, r.d, now())
    on conflict (fingerprint) do update set
      details = excluded.details,
      last_seen_at = now(),
      occurrences = i.occurrences + 1,
      last_alerted_at = case
        when i.acknowledged_at is null
          and (i.last_alerted_at is null
            or i.last_alerted_at < now() - interval '24 hours'
            or i.last_seen_at < now() - interval '90 minutes')
        then now()
        else i.last_alerted_at
      end
    returning coalesce(i.last_alerted_at = now(), false) into v_alert;
    if v_alert then
      n_alerts := n_alerts + 1;
      raise warning 'INTEGRITY_INCIDENT % %', r.chk, r.d::text;
    end if;
  end loop;
  select coalesce(max(id), 0) into v_batch from _roulette_hist;
  select coalesce(max(id), 0) into v_max from public.roulette_games where status in ('COMPLETED', 'CANCELLED');
  if v_batch = 0 or v_batch >= v_max then
    v_next := 0;
  else
    v_next := v_batch;
  end if;
  insert into public.integrity_scan_cursor (name, last_id, updated_at)
  values ('roulette', v_next, clock_timestamp())
  on conflict (name) do update set last_id = excluded.last_id, updated_at = excluded.updated_at;
  select coalesce(max(id), 0) into v_above from _roulette_above;
  select coalesce(max(id), 0) into v_above_max
  from public.roulette_games
  where status in ('COMPLETED', 'CANCELLED')
    and (v_open = 0 or id > v_open)
    and coalesce(completed_at, cancelled_at, created_at) < clock_timestamp() - interval '48 hours';
  if v_above = 0 or v_above >= v_above_max then
    v_after_next := 0;
  else
    v_after_next := v_above;
  end if;
  insert into public.integrity_scan_cursor (name, last_id, updated_at)
  values ('roulette_after', v_after_next, clock_timestamp())
  on conflict (name) do update set last_id = excluded.last_id, updated_at = excluded.updated_at;
  return jsonb_build_object('incidents', n, 'alerts', n_alerts, 'rechecked', v_rechecked, 'scanned', v_scanned,
    'cursor', v_next, 'after_cursor', v_after_next);
end
$fn$;
revoke execute on function public.roulette_integrity_check() from public, anon, authenticated;
grant execute on function public.roulette_integrity_check() to service_role;

reset lock_timeout;

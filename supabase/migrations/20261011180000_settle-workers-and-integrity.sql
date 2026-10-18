-- Settlement workers and the hourly roulette integrity scan.
--
-- Money rules are unchanged: the same seeds, fees, idempotency keys, row locks,
-- and ledger postings. This migration only changes who may call the ticks,
-- how often a failed settle is retried, and how much history one integrity
-- pass reads.
--
-- A concurrent index build cannot run inside the migration transaction used
-- by this project and by tests/db/schema.ts. ledger_transactions is small
-- enough for a normal build.
--
-- roulette_payouts already has roulette_payouts_game_idx on (game_id). The
-- hourly scan's payout lookups are correlated by game_id. Another index would
-- not change that plan at the current table size.
--
-- slot_games and crypto_withdrawals are tiny. Their sequential scans are the
-- right plan. No index is added for them.
-- idle_in_transaction_session_timeout stays unset here. A global value has not
-- been measured against a live settle that is waiting on a client.

-- game_id = g.id AND kind = roulette_entry|roulette_settlement|roulette_refund
create index if not exists ledger_tx_game_kind_idx
  on public.ledger_transactions (game_id, kind)
  where game_id is not null;

create table if not exists public.integrity_scan_cursor (
  name text primary key,
  last_id bigint not null default 0,
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.integrity_scan_cursor enable row level security;
revoke all on public.integrity_scan_cursor from public, anon, authenticated;
grant all on public.integrity_scan_cursor to service_role;
drop trigger if exists no_truncate on public.integrity_scan_cursor;
create trigger no_truncate before truncate on public.integrity_scan_cursor
  for each statement execute function public._no_truncate();

-- Retry book for games whose row guard rejects a same-status update.
-- Jackpot stores its own next_retry_at on jackpot_payouts.
create table if not exists public.settlement_retry (
  game text not null,
  game_id bigint not null,
  attempts integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  exhausted_at timestamptz,
  primary key (game, game_id)
);
alter table public.settlement_retry enable row level security;
revoke all on public.settlement_retry from public, anon, authenticated;
grant all on public.settlement_retry to service_role;
drop trigger if exists no_truncate on public.settlement_retry;
create trigger no_truncate before truncate on public.settlement_retry
  for each statement execute function public._no_truncate();

alter table public.jackpot_payouts
  add column if not exists next_retry_at timestamptz;

-- One incident row per stuck round. Repeat notices inside an hour do not
-- rewrite the row, so a one-second worker cannot flood it.
create or replace function public._note_settlement_exhausted(p_check text, p_fp text, p_details jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare noted boolean;
begin
  insert into public.integrity_incidents (check_name, fingerprint, details)
  values (p_check, p_fp, p_details)
  on conflict (fingerprint) do update
    set details = excluded.details,
        last_seen_at = now(),
        occurrences = public.integrity_incidents.occurrences + 1
    where public.integrity_incidents.last_seen_at < now() - interval '1 hour'
  returning true into noted;
  if noted then
    raise warning 'INTEGRITY_INCIDENT % %', p_check, p_details::text;
  end if;
end
$fn$;
revoke all on function public._note_settlement_exhausted(text, text, jsonb) from public, anon, authenticated;

-- Transient failures wait. Permanent validation failures stop sooner.
-- Either way the round, the seed, and the idempotency key stay as they were.
-- Clearing next_retry_at is exhaustion. An operator retries by setting
-- next_retry_at = clock_timestamp() on that payout row. Attempts are not reset.
create or replace function public.jackpot_settle(p_game_id bigint)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
declare g public.jackpot_games; seed bytea; d record; winner uuid; wtotal bigint; sum_amt bigint; n_entries int;
  rake bigint; payout bigint; tx uuid; escrow uuid; house uuid; p record; err text; waived boolean := false;
  n int; permanent boolean;
begin
  select * into g from jackpot_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED','CANCELLED','WAITING') then return 'noop'; end if;
  if g.status = 'ACTIVE' then
    if clock_timestamp() < g.scheduled_end_at then return 'not_due'; end if;
    update jackpot_games set status = 'DRAWING', drawn_at = clock_timestamp() where id = g.id;
    insert into jackpot_payouts (game_id) values (g.id) on conflict do nothing;
    perform _audit(null, 'game_locked', g.id, jsonb_build_object('pot', g.pot_amount, 'players', g.player_count));
    g.status := 'DRAWING';
  end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    select server_seed into seed from jackpot_game_secrets where game_id = g.id;
    if seed is null then raise exception 'SEED_MISSING'; end if;
    if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then
      raise exception 'INVARIANT_COMMITMENT';
    end if;
    select coalesce(sum(amount),0), count(*) into sum_amt, n_entries from jackpot_entries where game_id = g.id;
    if sum_amt <> g.pot_amount or n_entries <> g.entry_count then raise exception 'INVARIANT_POT_MISMATCH'; end if;
    if (select coalesce(sum(total_amount),0) from jackpot_players where game_id = g.id) <> g.pot_amount then raise exception 'INVARIANT_PLAYERS_MISMATCH'; end if;
    if exists (select 1 from (select ticket_start, lag(ticket_end, 1, 0::bigint) over (order by ticket_start) prev_end
               from jackpot_entries where game_id = g.id) t where t.ticket_start <> t.prev_end) then
      raise exception 'INVARIANT_TICKET_GAP';
    end if;

    select * into d from jackpot_draw_ticket(seed, g.id, g.draw_version, g.pot_amount);
    select user_id into winner from jackpot_entries where game_id = g.id and ticket_start <= d.ticket and ticket_end > d.ticket;
    if winner is null then raise exception 'INVARIANT_NO_WINNER'; end if;
    select total_amount into wtotal from jackpot_players where game_id = g.id and user_id = winner;
    rake := (g.pot_amount * g.rake_bps) / 10000;
    if _fee_ticket_take(winner, 'jackpot', g.id, rake) then rake := 0; waived := true; end if;
    payout := g.pot_amount - rake;

    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('jackpot_settlement', 'settle:' || g.id, g.account_type, winner, g.id, 'Jackpot settlement') returning id into tx;
    escrow := _system_account('game_escrow', g.asset, g.account_type);
    for p in select user_id, total_amount from jackpot_players where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(p.user_id, 'user_locked', g.asset, g.account_type), -p.total_amount);
    end loop;
    perform _post(tx, escrow, g.pot_amount);
    perform _post(tx, escrow, -g.pot_amount);
    perform _post(tx, _user_account(winner, 'user_available', g.asset, g.account_type), payout);
    if rake > 0 then
      house := _system_account('house_revenue', g.asset, g.account_type);
      perform _post(tx, house, rake);
    end if;

    update jackpot_payouts set status = 'SETTLED', attempts = attempts + 1, ledger_tx_id = tx, settled_at = clock_timestamp(),
      last_error = null, next_retry_at = null
      where game_id = g.id;
    update jackpot_games set status = 'COMPLETED', completed_at = clock_timestamp(), winning_ticket = d.ticket, draw_counter = d.counter,
      winner_id = winner, winner_total = wtotal, payout_amount = payout, rake_amount = rake, server_seed = encode(seed, 'hex')
      where id = g.id;
    perform _audit(null, 'game_settled', g.id, jsonb_build_object('winner', winner, 'ticket', d.ticket, 'payout', payout, 'rake', rake, 'fee_waived', waived));
  exception when others then
    err := sqlerrm;
    permanent := err like 'INVARIANT%' or err like 'SEED_MISSING%';
    update jackpot_payouts
      set status = 'FAILED',
          attempts = attempts + 1,
          last_error = left(err, 500),
          next_retry_at = case
            when attempts + 1 >= (case when permanent then 3 else 8 end) then null
            else clock_timestamp() + make_interval(secs => (
              least(power(2, least(attempts + 1, 12))::int, 900)
              + floor(random() * least(power(2, least(attempts + 1, 8))::int, 30))::int
            ))
          end
      where game_id = g.id
      returning attempts into n;
    if coalesce(n, 0) >= (case when permanent then 3 else 8 end) then
      perform _note_settlement_exhausted(
        'jackpot_settlement_exhausted',
        'jpse:' || g.id,
        jsonb_build_object('game_id', g.id, 'attempts', n, 'permanent', permanent, 'error', left(err, 500))
      );
      perform _audit(null, 'settlement_exhausted', g.id, jsonb_build_object('error', left(err, 500), 'attempts', n));
    else
      perform _audit(null, 'settlement_failed', g.id, jsonb_build_object('error', err));
    end if;
    return 'failed';
  end;
  return 'settled';
end;
$fn$;
revoke all on function public.jackpot_settle(bigint) from public, anon, authenticated;
grant execute on function public.jackpot_settle(bigint) to service_role;

create or replace function public.jackpot_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare r record; n int := 0; n_cancelled int := 0; res text; wait_secs int;
begin
  if not public._tick_gate('jackpot') then
    return jsonb_build_object('settled', 0, 'cancelled', 0, 'throttled', true, 'server_time', clock_timestamp());
  end if;

  select solo_wait_seconds into wait_secs from public.jackpot_config;

  for r in
    select g.id
    from public.jackpot_games g
    where g.status = 'WAITING'
      and g.player_count >= 1
      and g.pot_amount > 0
      and (
        select min(p.first_entry_at)
        from public.jackpot_players p
        where p.game_id = g.id
      ) <= clock_timestamp() - make_interval(secs => wait_secs)
    order by g.id
    limit 10
    for update of g skip locked
  loop
    res := public._jackpot_refund_waiting(r.id);
    if res = 'cancelled' then n_cancelled := n_cancelled + 1; end if;
  end loop;

  for r in
    select g.id
    from public.jackpot_games g
    left join public.jackpot_payouts p on p.game_id = g.id
    where (
        (g.status = 'ACTIVE' and g.scheduled_end_at <= clock_timestamp())
        or g.status = 'DRAWING'
      )
      and (
        p.game_id is null
        or p.status <> 'FAILED'
        or (p.next_retry_at is not null and p.next_retry_at <= clock_timestamp())
      )
    order by g.id
    limit 10
    for update of g skip locked
  loop
    res := jackpot_settle(r.id);
    if res = 'settled' then n := n + 1; end if;
  end loop;
  perform _ensure_open_game();
  update public.worker_tick_gate set last_run_at = clock_timestamp() where name = 'jackpot';
  return jsonb_build_object('settled', n, 'cancelled', n_cancelled, 'server_time', clock_timestamp());
end;
$fn$;
revoke all on function public.jackpot_tick() from public, anon, authenticated;
grant execute on function public.jackpot_tick() to service_role;

create or replace function public._settlement_backoff(p_game text, p_game_id bigint, p_error text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare nxt int; delay_secs int; permanent boolean; err text;
begin
  -- One statement increments. A read-then-insert could lose a concurrent attempt.
  -- The tick also locks the game row with skip locked, so two workers do not
  -- settle the same game. The conflict update covers a direct second caller.
  err := left(coalesce(p_error, 'failed'), 500);
  insert into public.settlement_retry (game, game_id, attempts, next_retry_at, last_error, exhausted_at)
  values (p_game, p_game_id, 1, null, err, null)
  on conflict (game, game_id) do update
    set attempts = public.settlement_retry.attempts + 1,
        last_error = excluded.last_error
  returning attempts, last_error into nxt, err;
  permanent := err like 'INVARIANT%' or err like 'SEED_MISSING%';
  if nxt >= (case when permanent then 3 else 8 end) then
    update public.settlement_retry
      set next_retry_at = null,
          exhausted_at = clock_timestamp()
      where game = p_game and game_id = p_game_id;
    perform public._note_settlement_exhausted(
      p_game || '_settlement_exhausted',
      'sr:' || p_game || ':' || p_game_id,
      jsonb_build_object('game', p_game, 'game_id', p_game_id, 'attempts', nxt, 'permanent', permanent, 'error', err)
    );
  else
    delay_secs := least(power(2, least(nxt, 12))::int, 900)
      + floor(random() * least(power(2, least(nxt, 8))::int, 30))::int;
    update public.settlement_retry
      set next_retry_at = clock_timestamp() + make_interval(secs => delay_secs),
          exhausted_at = null
      where game = p_game and game_id = p_game_id;
  end if;
end
$fn$;
revoke all on function public._settlement_backoff(text, bigint, text) from public, anon, authenticated;

create or replace function public.coinflip_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare r record; res text; err text; n_settled int := 0; n_cancelled int := 0; n_failed int := 0;
begin
  if not public._tick_gate('coinflip') then
    return jsonb_build_object('settled', 0, 'cancelled', 0, 'failed', 0, 'throttled', true, 'server_time', clock_timestamp());
  end if;
  for r in
    select g.id
    from public.coinflip_games g
    where (
        (g.status = 'WAITING' and g.expires_at <= clock_timestamp())
        or (g.status = 'READY' and g.animation_start_at <= clock_timestamp())
        or (g.status = 'FLIPPING' and g.animation_end_at <= clock_timestamp())
        or g.status = 'SETTLEMENT'
      )
      and not exists (
        select 1 from public.settlement_retry s
        where s.game = 'coinflip'
          and s.game_id = g.id
          and (s.exhausted_at is not null or s.next_retry_at > clock_timestamp())
      )
    order by g.id
    limit 50
    for update of g skip locked
  loop
    begin
      res := coinflip_advance(r.id);
      err := null;
    exception when others then
      err := left(sqlerrm, 500);
      perform _audit_cf(null, 'RECOVERY_FAILED', r.id, jsonb_build_object('error', err));
      res := 'error';
    end;
    if res = 'failed' then
      select left(last_error, 500) into err from coinflip_payouts where game_id = r.id;
    end if;
    if res in ('failed', 'error') then
      perform _settlement_backoff('coinflip', r.id, coalesce(err, 'failed'));
      n_failed := n_failed + 1;
    elsif res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    end if;
  end loop;
  update public.worker_tick_gate set last_run_at = clock_timestamp() where name = 'coinflip';
  return jsonb_build_object('settled', n_settled, 'cancelled', n_cancelled, 'failed', n_failed, 'server_time', clock_timestamp());
end
$fn$;
revoke all on function public.coinflip_tick() from public, anon, authenticated;
grant execute on function public.coinflip_tick() to service_role;

-- The 100ms early LOCKED to SPINNING tolerance stays. SETTLEMENT retries stop
-- at 8. roulette_advance itself is unchanged, so an operator can still call it.
create or replace function public.roulette_tick()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare r record; res text; n_settled integer := 0; n_cancelled integer := 0; n_failed integer := 0; n_steps integer := 0; bumped integer;
begin
  if not public._tick_gate('roulette') then
    return jsonb_build_object('throttled', true, 'server_time', clock_timestamp());
  end if;
  for r in
    select g.id, g.settle_attempts, g.last_error
    from public.roulette_games g
    where g.status = 'SETTLEMENT' and g.settle_attempts >= 8
    order by g.id
    limit 20
  loop
    perform public._note_settlement_exhausted(
      'roulette_settlement_stuck',
      'rls:' || r.id,
      jsonb_build_object('game_id', r.id, 'status', 'SETTLEMENT', 'attempts', r.settle_attempts, 'last_error', r.last_error)
    );
  end loop;
  for r in select id from public.roulette_games
           where (status = 'BETTING' and betting_ends_at <= clock_timestamp())
              or (status = 'LOCKED' and spin_start_at - make_interval(secs => least(0.1, lock_ms / 10000.0)) <= clock_timestamp())
              or (status = 'SPINNING' and spin_end_at <= clock_timestamp())
              or (status = 'SETTLEMENT' and settle_attempts < 8)
           order by id limit 20 for update skip locked loop
    begin
      res := public.roulette_advance(r.id);
    exception when others then
      update public.roulette_games
        set settle_attempts = settle_attempts + 1, last_error = left(sqlerrm, 500)
        where id = r.id and status = 'SETTLEMENT'
        returning settle_attempts into bumped;
      if coalesce(bumped, 0) >= 8 then
        perform public._note_settlement_exhausted(
          'roulette_settlement_stuck',
          'rls:' || r.id,
          jsonb_build_object('game_id', r.id, 'status', 'SETTLEMENT', 'attempts', bumped, 'last_error', left(sqlerrm, 500))
        );
      end if;
      perform public._roulette_audit(null, 'RECOVERY_FAILED', r.id, jsonb_build_object('error', left(sqlerrm, 500)));
      res := 'error';
    end;
    n_steps := n_steps + 1;
    if res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    elsif res in ('failed', 'error') then n_failed := n_failed + 1; end if;
  end loop;
  perform public._roulette_ensure_open();
  update public.worker_tick_gate set last_run_at = clock_timestamp() where name = 'roulette';
  return jsonb_build_object('steps', n_steps, 'settled', n_settled, 'cancelled', n_cancelled, 'failed', n_failed, 'server_time', clock_timestamp());
end
$fn$;
revoke all on function public.roulette_tick() from public, anon, authenticated;
grant execute on function public.roulette_tick() to service_role;

create or replace function public.slot_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare r record; res text; n_settled int := 0; n_cancelled int := 0; n_auto int := 0; n_failed int := 0; bumped int;
begin
  if not public._tick_gate('slot') then
    return jsonb_build_object('throttled', true, 'server_time', clock_timestamp());
  end if;
  for r in
    select g.id, g.settle_attempts, g.last_error
    from public.slot_games g
    where g.status = 'SETTLEMENT' and g.settle_attempts >= 8
    order by g.id
    limit 20
  loop
    perform public._note_settlement_exhausted(
      'slot_settlement_exhausted',
      'slsx:' || r.id,
      jsonb_build_object('game_id', r.id, 'status', 'SETTLEMENT', 'attempts', r.settle_attempts, 'last_error', r.last_error)
    );
  end loop;
  for r in select id from slot_games
           where (status = 'WAITING' and expires_at <= clock_timestamp())
              or (status = 'ACTIVE' and ends_at is null and turn_deadline <= clock_timestamp())
              or (status = 'ACTIVE' and ends_at <= clock_timestamp())
              or (status = 'SETTLEMENT' and settle_attempts < 8)
           order by id limit 50 for update skip locked loop
    begin
      res := slot_advance(r.id);
    exception when others then
      update slot_games
        set settle_attempts = settle_attempts + 1, last_error = left(sqlerrm, 500)
        where id = r.id and status = 'SETTLEMENT'
        returning settle_attempts into bumped;
      if coalesce(bumped, 0) >= 8 then
        perform public._note_settlement_exhausted(
          'slot_settlement_exhausted',
          'slsx:' || r.id,
          jsonb_build_object('game_id', r.id, 'status', 'SETTLEMENT', 'attempts', bumped, 'last_error', left(sqlerrm, 500))
        );
      end if;
      perform _audit_slot(null, 'ADVANCE_FAILED', r.id, jsonb_build_object('error', left(sqlerrm, 500)));
      res := 'error';
    end;
    if res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    elsif res = 'auto_spun' then n_auto := n_auto + 1;
    elsif res in ('failed', 'error') then n_failed := n_failed + 1; end if;
  end loop;
  update public.worker_tick_gate set last_run_at = clock_timestamp() where name = 'slot';
  return jsonb_build_object('settled', n_settled, 'cancelled', n_cancelled, 'auto_spun', n_auto, 'failed', n_failed,
    'server_time', clock_timestamp());
end
$fn$;
revoke all on function public.slot_tick() from public, anon, authenticated;
grant execute on function public.slot_tick() to service_role;

-- settlement_worker_health is not replaced here. The applied definition in
-- 20261012024500 keeps the cron run-id floor (max(runid) - 20000) and the
-- 15-second stale window. Applying this file later must not overwrite that.


-- Open rounds and the last 48 hours are checked every run.
-- Older terminal rounds are split by the oldest unfinished id. Each side
-- advances 500 ids per hourly run, then that cursor wraps.
-- A row that has aged out of the 48-hour window is reached within
-- ceil(rows_on_that_side / 500) hourly runs. An unfinished round does not
-- add to that wait. A mismatch in old history is still reported. It is not dropped.
create or replace function public.roulette_integrity_check()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare r record; n integer := 0; v_cursor bigint; v_batch bigint; v_max bigint; v_next bigint; v_scanned integer; v_open bigint;
  v_after bigint; v_above bigint; v_above_max bigint; v_after_next bigint;
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
  -- Do not walk past an unfinished round. Its id stays in front of the cursor
  -- until it is terminal, so a later completion cannot fall behind the scan.
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
  -- Rows above an unfinished round, already older than 48 hours, use their own
  -- cursor. They are not mixed into the cursor that must stay below that round.
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
    insert into public.integrity_incidents (check_name, fingerprint, details) values (r.chk, r.fp, r.d)
      on conflict (fingerprint) do update set details = excluded.details, last_seen_at = now(), occurrences = public.integrity_incidents.occurrences + 1;
    raise warning 'INTEGRITY_INCIDENT % %', r.chk, r.d::text;
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
  return jsonb_build_object('incidents', n, 'scanned', v_scanned, 'cursor', v_next, 'after_cursor', v_after_next);
end
$fn$;
revoke execute on function public.roulette_integrity_check() from public, anon, authenticated;

-- Do not put jackpot or coinflip on a one-second schedule. Production has six
-- background workers, and 20261011175000 already runs pvp-jackpot-worker and
-- pvp-coinflip-worker from pvp-minute-dispatch. pvp-settlement-health stays
-- on that migration too.
-- prod-only:begin
-- prod-only:end

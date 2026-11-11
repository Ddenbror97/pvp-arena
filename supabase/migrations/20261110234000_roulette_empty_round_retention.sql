-- Roulette rounds nobody bet on are pruned after 14 days (platform audit 2026-11-10,
-- finding 3). Roulette spins continuously (owner's decision): about 3,000 rounds a day, and
-- with no players every one of them stayed forever. The three round tables were 127 MB of a
-- 431 MB database, and the hourly integrity check read all of them.
--
-- What may be deleted is decided in one place, _roulette_round_prunable, and enforced by the
-- tables' own guards: a round that is COMPLETED or CANCELLED, has no bet, no pot, no bet row
-- and no payout row, finished more than 14 days ago, and only while the retention job is
-- running. A round with a bet is never deleted, by the job or by anyone else. For 14 days
-- every round, empty or not, can still be checked against its published commitment.
--
-- The hourly pvp-ops-retention job removes up to 5,000 rounds a run, oldest first.

create or replace function public._roulette_round_prunable(p_game bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(current_setting('pvp.roulette_retention', true), '') = 'on'
    and exists (
      select 1 from public.roulette_games g
      where g.id = p_game
        and g.status in ('COMPLETED', 'CANCELLED')
        and g.bet_count = 0
        and g.pot_amount = 0
        and coalesce(g.completed_at, g.cancelled_at, g.created_at) < now() - interval '14 days'
        and not exists (select 1 from public.roulette_bets b where b.game_id = g.id)
        and not exists (select 1 from public.roulette_payouts p where p.game_id = g.id))
$$;
revoke all on function public._roulette_round_prunable(bigint) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._roulette_game_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
begin
  if tg_op = 'DELETE' then
    -- Only the retention job, and only a finished round nobody bet on (20261110234000).
    if public._roulette_round_prunable(old.id) then return old; end if;
    raise exception 'IMMUTABLE_RECORD roulette_games';
  end if;
  if old.status in ('COMPLETED', 'CANCELLED') then raise exception 'IMMUTABLE_RECORD roulette_games'; end if;
  if new.id <> old.id or new.wheel_version <> old.wheel_version or new.protocol_version <> old.protocol_version
     or new.draw_version <> old.draw_version or new.server_seed_hash <> old.server_seed_hash
     or new.asset <> old.asset or new.account_type <> old.account_type
     or new.min_bet <> old.min_bet or new.max_bet <> old.max_bet or new.max_pot <> old.max_pot
     or new.max_bets_per_user <> old.max_bets_per_user or new.max_bets_per_round <> old.max_bets_per_round
     or new.betting_seconds <> old.betting_seconds or new.lock_ms <> old.lock_ms or new.spin_ms <> old.spin_ms
     or new.stuck_cancel_seconds <> old.stuck_cancel_seconds or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if new.status <> old.status and not (
       (old.status = 'WAITING' and new.status = 'BETTING') or
       (old.status = 'BETTING' and new.status in ('LOCKED', 'CANCELLED')) or
       (old.status = 'LOCKED' and new.status = 'SPINNING') or
       (old.status = 'SPINNING' and new.status = 'SETTLEMENT') or
       (old.status = 'SETTLEMENT' and new.status = 'COMPLETED')) then
    raise exception 'ILLEGAL_TRANSITION % -> %', old.status, new.status;
  end if;
  if (new.pot_amount <> old.pot_amount or new.bet_count <> old.bet_count or new.player_count <> old.player_count)
     and old.status not in ('WAITING', 'BETTING') then
    raise exception 'BETTING_CLOSED';
  end if;
  if new.pot_amount < old.pot_amount or new.bet_count < old.bet_count then raise exception 'IMMUTABLE_FIELD'; end if;
  if (old.betting_ends_at is not null and new.betting_ends_at is distinct from old.betting_ends_at)
     or (old.spin_start_at is not null and new.spin_start_at is distinct from old.spin_start_at)
     or (old.spin_end_at is not null and new.spin_end_at is distinct from old.spin_end_at)
     or (old.winning_slot is not null and new.winning_slot is distinct from old.winning_slot)
     or (old.winning_color is not null and new.winning_color is distinct from old.winning_color) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if new.winning_color is not null and new.status not in ('SPINNING', 'SETTLEMENT', 'COMPLETED') then raise exception 'RESULT_NOT_PUBLIC'; end if;
  if new.server_seed is not null and new.status not in ('COMPLETED', 'CANCELLED') then raise exception 'SEED_NOT_REVEALABLE'; end if;
  new.updated_at := now();
  return new;
end $$;

-- Secrets and results stay immutable, except that the rows of a prunable round go with it.
create or replace function public._roulette_round_rows_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and public._roulette_round_prunable(old.game_id) then return old; end if;
  raise exception 'IMMUTABLE_RECORD %', tg_table_name;
end $$;

revoke all on function public._roulette_round_rows_guard() from public, anon, authenticated;

drop trigger if exists roulette_secrets_immutable on public.roulette_game_secrets;
create trigger roulette_secrets_immutable before update or delete on public.roulette_game_secrets
  for each row execute function public._roulette_round_rows_guard();
drop trigger if exists roulette_results_immutable on public.roulette_results;
create trigger roulette_results_immutable before update or delete on public.roulette_results
  for each row execute function public._roulette_round_rows_guard();

create or replace function public._roulette_prune_empty(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare ids bigint[]; n integer := 0;
begin
  perform set_config('pvp.roulette_retention', 'on', true);
  select coalesce(array_agg(id), '{}') into ids from (
    select g.id
    from public.roulette_games g
    where g.status in ('COMPLETED', 'CANCELLED')
      and g.bet_count = 0
      and coalesce(g.completed_at, g.cancelled_at, g.created_at) < now() - interval '14 days'
      and public._roulette_round_prunable(g.id)
    order by g.id
    limit greatest(0, least(coalesce(p_limit, 0), 20000))
    for update of g skip locked) d;
  if array_length(ids, 1) is not null then
    delete from public.roulette_results where game_id = any (ids);
    delete from public.roulette_game_secrets where game_id = any (ids);
    delete from public.roulette_games where id = any (ids);
    get diagnostics n = row_count;
  end if;
  perform set_config('pvp.roulette_retention', 'off', true);
  return n;
end $$;
revoke all on function public._roulette_prune_empty(integer) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ops_retention()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare v_audit integer; v_chat integer; v_rounds integer;
begin
  perform set_config('pvp.audit_retention', 'on', true);
  with doomed as (
    select a.id
    from public.audit_logs a
    where a.created_at < now() - interval '7 days'
      and public._audit_log_expired(a.action, a.game_type::text, a.created_at)
    order by a.id
    limit 50000
  )
  delete from public.audit_logs a using doomed d where a.id = d.id;
  get diagnostics v_audit = row_count;
  perform set_config('pvp.audit_retention', 'off', true);

  delete from public.game_chat_messages m
  where m.created_at < now() - interval '90 days'
    and (m.created_at < now() - interval '365 days'
      or not exists (select 1 from public.game_chat_moderation_events e where e.message_id = m.id));
  get diagnostics v_chat = row_count;

  v_rounds := public._roulette_prune_empty(5000);

  return jsonb_build_object('audit_logs', v_audit, 'chat_messages', v_chat, 'roulette_rounds', v_rounds);
end
$$;

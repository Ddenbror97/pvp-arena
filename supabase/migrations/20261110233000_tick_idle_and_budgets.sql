-- Idle ticks stop writing, and the shared slot/pool/poker worker fits inside its second
-- (platform audit 2026-11-10, findings 1 and 4). Roulette keeps spinning (owner's decision).
--
-- Before: every one-second tick wrote its heartbeat twice (once in _tick_gate, once at the
-- end) and the poker stats row once, whether or not a game was open: about 9 row updates a
-- second with nobody playing. Now a tick that did work writes its heartbeat at once, and an
-- idle tick refreshes it every 4 seconds (settlement_worker_health alarms at 15).
--
-- The slot, pool and poker passes share one job. Their time budgets were 500 + 250 + 400 ms,
-- more than the one-second schedule: a busy slot hall could push poker turn clocks and pool
-- shots into the next second, and a run longer than a second skips the following one. They
-- are now 250 + 250 + 400 ms (poker keeps the 400 ms its hundred-table tick was sized for).
-- No game rule, payout or settlement path changes.

create or replace function public._tick_beat(p_name text, p_worked boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.worker_tick_gate set last_run_at = clock_timestamp()
  where name = p_name
    and (p_worked or last_run_at <= clock_timestamp() - interval '4 seconds');
$$;
revoke all on function public._tick_beat(text, boolean) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._tick_gate(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare ok boolean; r text; internal boolean;
begin
  r := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  internal := session_user <> 'authenticator' and r not in ('anon', 'authenticated');
  if not pg_try_advisory_xact_lock(hashtext('pvp_tick:' || p_name)) then
    return false;
  end if;
  if internal then
    -- The scheduler's own run: the heartbeat is written by _tick_beat when the tick ends
    -- (at once after work, every few seconds while idle), not on every call.
    if not exists (select 1 from public.worker_tick_gate where name = p_name) then
      insert into public.worker_tick_gate(name, last_run_at)
      values (p_name, clock_timestamp())
      on conflict (name) do nothing;
    end if;
    return true;
  end if;
  update public.worker_tick_gate set last_run_at = clock_timestamp()
    where name = p_name and last_run_at <= clock_timestamp() - interval '250 milliseconds'
    returning true into ok;
  return coalesce(ok, false);
end $$;

CREATE OR REPLACE FUNCTION public.coinflip_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare r record; res text; err text; n_settled int := 0; n_cancelled int := 0; n_failed int := 0; n_seen int := 0;
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
    n_seen := n_seen + 1;
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
  perform public._tick_beat('coinflip', n_seen > 0);
  return jsonb_build_object('settled', n_settled, 'cancelled', n_cancelled, 'failed', n_failed, 'server_time', clock_timestamp());
end
$$;

CREATE OR REPLACE FUNCTION public.jackpot_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare r record; n int := 0; n_cancelled int := 0; res text; wait_secs int; n_seen int := 0;
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
    n_seen := n_seen + 1;
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
    n_seen := n_seen + 1;
    res := jackpot_settle(r.id);
    if res = 'settled' then n := n + 1; end if;
  end loop;
  perform _ensure_open_game();
  perform public._tick_beat('jackpot', n_seen > 0);
  return jsonb_build_object('settled', n, 'cancelled', n_cancelled, 'server_time', clock_timestamp());
end;
$$;

CREATE OR REPLACE FUNCTION public.roulette_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
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
  perform public._tick_beat('roulette', n_steps > 0);
  return jsonb_build_object('steps', n_steps, 'settled', n_settled, 'cancelled', n_cancelled, 'failed', n_failed, 'server_time', clock_timestamp());
end
$$;

CREATE OR REPLACE FUNCTION public._poker_record_tick(p_started timestamp with time zone, p_processed integer, p_failed integer, p_skipped integer, p_exhausted boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare v_backlog int; v_overdue numeric; v_stuck int; v_ms numeric;
begin
  select count(*), coalesce(extract(epoch from clock_timestamp() - min(next_due_at)) * 1000, 0)
    into v_backlog, v_overdue
  from poker_tables where status = 'OPEN' and next_due_at <= clock_timestamp();
  select count(*) into v_stuck from poker_hands where status = 'SETTLEMENT' and settle_attempts >= 8;
  v_ms := extract(epoch from clock_timestamp() - p_started) * 1000;
  -- An idle run only refreshes the heartbeat every few seconds; any work is recorded at once.
  if p_processed = 0 and p_failed = 0 and p_skipped = 0 and not p_exhausted and v_backlog = 0 and v_stuck = 0
     and exists (select 1 from poker_worker_stats
                 where run_at > clock_timestamp() - interval '4 seconds' and processed = 0 and failed = 0
                   and skipped = 0 and backlog = 0 and stuck_hands = 0 and not budget_exhausted) then
    return jsonb_build_object('processed', 0, 'failed', 0, 'skipped', 0, 'backlog', 0, 'stuck_hands', 0,
      'duration_ms', round(v_ms, 1), 'budget_exhausted', false);
  end if;
  update poker_worker_stats set run_at = p_started, duration_ms = round(v_ms, 1), processed = p_processed,
    failed = p_failed, skipped = p_skipped, backlog = v_backlog, max_overdue_ms = round(greatest(v_overdue, 0), 1),
    stuck_hands = v_stuck, budget_exhausted = p_exhausted;
  return jsonb_build_object('processed', p_processed, 'failed', p_failed, 'skipped', p_skipped,
    'backlog', v_backlog, 'stuck_hands', v_stuck, 'duration_ms', round(v_ms, 1), 'budget_exhausted', p_exhausted);
end $$;

CREATE OR REPLACE PROCEDURE public.slot_tick_worker()
 LANGUAGE plpgsql
AS $$
declare
  tid bigint;
  ids bigint[];
  n int := 0;
  failed int := 0;
  skipped int := 0;
  started timestamptz;
  slot_started timestamptz;
  res text;
  cap int;
  exhausted boolean := false;
  slot_n int := 0;
  payload jsonb;
  skip_ids bigint[] := '{}';
begin
  perform public._tick_gate('slot');
  commit;
  perform public._slot_note_exhausted();
  commit;
  slot_started := clock_timestamp();
  loop
    if clock_timestamp() - slot_started > interval '250 milliseconds' then
      exit;
    end if;
    exit when slot_n >= 50;
    begin
      payload := public._slot_tick_one(skip_ids);
      res := payload->>'result';
      if payload ? 'id' then
        skip_ids := skip_ids || (payload->>'id')::bigint;
      end if;
    exception when others then
      res := 'error';
    end;
    commit;
    exit when res = 'idle';
    slot_n := slot_n + 1;
  end loop;
  begin
    perform public.pool_tick();
  exception when others then
    null;
  end;
  commit;
  started := clock_timestamp();
  select tick_tables into cap from public.poker_config;
  ids := public._poker_due_tables(cap);
  foreach tid in array ids loop
    if clock_timestamp() - started > interval '400 milliseconds' then exhausted := true; exit; end if;
    res := public._poker_tick_one(tid);
    if res = 'failed' then failed := failed + 1;
    elsif res = 'skipped' then skipped := skipped + 1;
    else n := n + 1; end if;
    commit;
  end loop;
  perform public._poker_close_idle();
  perform public._poker_record_tick(started, n, failed, skipped, exhausted);
  perform public._tick_beat('slot', slot_n > 0 or n > 0 or failed > 0);
  commit;
end
$$;

-- The one-second worker fires at a near-constant phase, and spin_start_at is exactly
-- lock_ms after the locking tick, so the next tick often landed a few ms before
-- spin_start_at and the spin went public a full second late. Accept LOCKED -> SPINNING
-- up to 100ms early (a tenth of lock_ms at most, so a short lock is never skipped).
-- Bets are closed in LOCKED; the result is still only written
-- when the status becomes SPINNING (RESULT_NOT_PUBLIC guard unchanged).

create or replace function public.roulette_advance(p_game_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare g public.roulette_games; w public.roulette_wheels; seed bytea; d record; ts timestamptz; err text; rc public.roulette_color;
begin
  select * into g from public.roulette_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED', 'CANCELLED') then return 'noop'; end if;
  if g.status = 'WAITING' then return 'not_due'; end if;
  ts := clock_timestamp();

  if g.status = 'BETTING' then
    if ts < g.betting_ends_at then return 'not_due'; end if;
    if ts >= g.betting_ends_at + make_interval(secs => g.stuck_cancel_seconds) then
      perform public._roulette_refund(g.id, 'STUCK');
      perform public._roulette_ensure_open();
      return 'cancelled';
    end if;
    select * into w from public.roulette_wheels where version = g.wheel_version;
    select server_seed into seed from public.roulette_game_secrets where game_id = g.id;
    if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
    select * into d from public.roulette_draw_slot(seed, g.id, g.draw_version, w.slot_count);
    rc := w.layout[d.slot + 1];
    insert into public.roulette_results (game_id, protocol_version, draw_version, wheel_version, server_seed_hash, message, hmac_hex, draw_counter, slot, color)
      values (g.id, g.protocol_version, g.draw_version, g.wheel_version, g.server_seed_hash,
              'PVPCasino:roulette:v1:' || g.id || ':' || g.draw_version || ':' || d.counter, d.hmac_hex, d.counter, d.slot, rc);
    update public.roulette_games set status = 'LOCKED', locked_at = ts,
        spin_start_at = ts + make_interval(secs => lock_ms / 1000.0),
        spin_end_at = ts + make_interval(secs => (lock_ms + spin_ms) / 1000.0)
      where id = g.id returning * into g;
    perform public._roulette_audit(null, 'ROUND_LOCKED', g.id, jsonb_build_object('bets', g.bet_count, 'pot', g.pot_amount));
  end if;

  if g.status = 'LOCKED' then
    if ts < g.spin_start_at - make_interval(secs => least(0.1, g.lock_ms / 10000.0)) then return 'locked'; end if;
    update public.roulette_games gg set status = 'SPINNING', winning_slot = r.slot, winning_color = r.color
      from public.roulette_results r where r.game_id = gg.id and gg.id = g.id returning gg.* into g;
    perform public._roulette_audit(null, 'SPIN_STARTED', g.id, jsonb_build_object('spin_end_at', g.spin_end_at));
  end if;

  if g.status = 'SPINNING' then
    if ts < g.spin_end_at then return 'spinning'; end if;
    update public.roulette_games set status = 'SETTLEMENT', settlement_started_at = ts where id = g.id returning * into g;
  end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    perform public._roulette_settle(g.id);
  exception when others then
    err := sqlerrm;
    update public.roulette_games set settle_attempts = settle_attempts + 1, last_error = left(err, 500) where id = g.id;
    perform public._roulette_audit(null, 'RECOVERY_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
    return 'failed';
  end;
  perform public._roulette_ensure_open();
  return 'settled';
end $$;
revoke execute on function public.roulette_advance(bigint) from public, anon, authenticated;
grant execute on function public.roulette_advance(bigint) to service_role;

create or replace function public.roulette_tick() returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; res text; n_settled integer := 0; n_cancelled integer := 0; n_failed integer := 0; n_steps integer := 0;
begin
  if not public._tick_gate('roulette') then
    return jsonb_build_object('throttled', true, 'server_time', clock_timestamp());
  end if;
  for r in select id from public.roulette_games
           where (status = 'BETTING' and betting_ends_at <= clock_timestamp())
              or (status = 'LOCKED' and spin_start_at - make_interval(secs => least(0.1, lock_ms / 10000.0)) <= clock_timestamp())
              or (status = 'SPINNING' and spin_end_at <= clock_timestamp())
              or status = 'SETTLEMENT'
           order by id limit 20 for update skip locked loop
    begin
      res := public.roulette_advance(r.id);
    exception when others then
      perform public._roulette_audit(null, 'RECOVERY_FAILED', r.id, jsonb_build_object('error', left(sqlerrm, 500)));
      res := 'error';
    end;
    n_steps := n_steps + 1;
    if res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    elsif res in ('failed', 'error') then n_failed := n_failed + 1; end if;
  end loop;
  perform public._roulette_ensure_open();
  return jsonb_build_object('steps', n_steps, 'settled', n_settled, 'cancelled', n_cancelled, 'failed', n_failed, 'server_time', clock_timestamp());
end $$;
revoke execute on function public.roulette_tick() from public, anon, authenticated;
grant execute on function public.roulette_tick() to authenticated, service_role;

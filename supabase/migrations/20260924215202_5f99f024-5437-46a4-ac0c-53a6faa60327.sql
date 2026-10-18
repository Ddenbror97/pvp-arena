create or replace function public._roulette_ensure_open() returns bigint language plpgsql security definer set search_path = '' as $$
declare gid bigint; c public.roulette_config; jc public.jackpot_config; seed bytea; ts timestamptz;
begin
  select id into gid from public.roulette_games where status in ('WAITING', 'BETTING') limit 1;
  if gid is not null then return gid; end if;
  perform pg_advisory_xact_lock(hashtext('roulette:open'));
  select id into gid from public.roulette_games where status in ('WAITING', 'BETTING') limit 1;
  if gid is not null then return gid; end if;
  select * into c from public.roulette_config;
  select * into jc from public.jackpot_config;
  if jc.real_money_enabled or jc.account_type <> 'test_credit' then raise exception 'REAL_MONEY_DISABLED'; end if;
  seed := extensions.gen_random_bytes(32);
  ts := clock_timestamp();
  -- Continuous play: every round opens its betting window immediately (after a 5s result hold).
  insert into public.roulette_games (status, wheel_version, asset, account_type, min_bet, max_bet, max_pot, max_bets_per_user, max_bets_per_round,
      betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, server_seed_hash, betting_started_at, betting_ends_at)
    values ('BETTING', c.wheel_version, jc.asset, jc.account_type, c.min_bet, c.max_bet, c.max_pot, c.max_bets_per_user, c.max_bets_per_round,
      c.betting_seconds, c.lock_ms, c.spin_ms, c.stuck_cancel_seconds, encode(extensions.digest(seed, 'sha256'), 'hex'),
      ts + interval '5 seconds', ts + interval '5 seconds' + make_interval(secs => c.betting_seconds))
    returning id into gid;
  insert into public.roulette_game_secrets (game_id, server_seed) values (gid, seed);
  perform public._roulette_audit(null, 'ROUND_CREATED', gid, jsonb_build_object('wheel_version', c.wheel_version, 'continuous', true));
  return gid;
end $$;
revoke execute on function public._roulette_ensure_open() from public, anon, authenticated;

-- prod-only:begin
-- Move an idle WAITING round into continuous play.
update public.roulette_games set status = 'BETTING', betting_started_at = clock_timestamp(),
  betting_ends_at = clock_timestamp() + make_interval(secs => betting_seconds) where status = 'WAITING';
-- prod-only:end
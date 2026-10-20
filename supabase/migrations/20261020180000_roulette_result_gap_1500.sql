-- The next round used to open its betting clock 3.5s after the winning coin landed.
-- That pause is now 1.5s. Spin length, the wheel, fees, and settlement are unchanged.
-- The client result hold matches this gap, so the finished round hands over when betting opens.

create or replace function public._roulette_ensure_open()
 returns bigint language plpgsql security definer set search_path = ''
as $function$
declare gid bigint; c public.roulette_config; jc public.money_domain_config; seed bytea; ts timestamptz;
begin
  select id into gid from public.roulette_games
    where status in ('BETTING', 'LOCKED', 'SPINNING', 'SETTLEMENT') order by id desc limit 1;
  if gid is not null then return gid; end if;
  perform pg_advisory_xact_lock(hashtext('roulette:open:' || (
    select n.nspname
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where p.oid = 'public._roulette_ensure_open()'::pg_catalog.regprocedure
  )));
  select id into gid from public.roulette_games
    where status in ('BETTING', 'LOCKED', 'SPINNING', 'SETTLEMENT') order by id desc limit 1;
  if gid is not null then return gid; end if;
  select * into c from public.roulette_config;
  select * into jc from public.money_domain_config;
  if not public._roulette_domain_valid() then return null; end if;
  seed := extensions.gen_random_bytes(32);
  ts := clock_timestamp();
  insert into public.roulette_games (money_domain, status, wheel_version, asset, account_type, min_bet, max_bet, max_pot, max_bets_per_user, max_bets_per_round,
      betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, win_fee_bps, server_seed_hash, betting_started_at, betting_ends_at)
    values (jc.money_domain, 'BETTING', c.wheel_version, jc.asset, jc.account_type, c.min_bet, c.max_bet, c.max_pot, c.max_bets_per_user, c.max_bets_per_round,
      c.betting_seconds, c.lock_ms, c.spin_ms, c.stuck_cancel_seconds, c.win_fee_bps, encode(extensions.digest(seed, 'sha256'), 'hex'),
      ts + interval '1.5 seconds', ts + interval '1.5 seconds' + make_interval(secs => c.betting_seconds))
    returning id into gid;
  insert into public.roulette_game_secrets (game_id, server_seed) values (gid, seed);
  perform public._roulette_audit(null, 'ROUND_CREATED', gid, jsonb_build_object('wheel_version', c.wheel_version, 'win_fee_bps', c.win_fee_bps, 'continuous', true));
  return gid;
end $function$;
revoke execute on function public._roulette_ensure_open() from public, anon, authenticated;

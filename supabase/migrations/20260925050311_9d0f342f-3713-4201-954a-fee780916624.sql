CREATE OR REPLACE FUNCTION public._roulette_domain_valid()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select case (select account_type from money_domain_config)
    when 'test_credit' then public._money_state() = 'PRE_MIGRATION' and not coalesce((select money_domain_frozen from crypto_settings), false)
    when 'real' then public._money_state() = 'FINALIZED' and coalesce((select money_domain_frozen from crypto_settings), false)
    else false end
$$;
REVOKE ALL ON FUNCTION public._roulette_domain_valid() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._roulette_ensure_open()
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare gid bigint; c public.roulette_config; jc public.money_domain_config; seed bytea; ts timestamptz;
begin
  select id into gid from public.roulette_games
    where status in ('BETTING', 'LOCKED', 'SPINNING', 'SETTLEMENT') order by id desc limit 1;
  if gid is not null then return gid; end if;
  perform pg_advisory_xact_lock(hashtext('roulette:open'));
  select id into gid from public.roulette_games
    where status in ('BETTING', 'LOCKED', 'SPINNING', 'SETTLEMENT') order by id desc limit 1;
  if gid is not null then return gid; end if;
  select * into c from public.roulette_config;
  select * into jc from public.money_domain_config;
  -- Rounds cycle whenever the money domain is valid; real-play gating is enforced on bets.
  if not public._roulette_domain_valid() then return null; end if;
  seed := extensions.gen_random_bytes(32);
  ts := clock_timestamp();
  insert into public.roulette_games (money_domain, status, wheel_version, asset, account_type, min_bet, max_bet, max_pot, max_bets_per_user, max_bets_per_round,
      betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, server_seed_hash, betting_started_at, betting_ends_at)
    values (jc.money_domain, 'BETTING', c.wheel_version, jc.asset, jc.account_type, c.min_bet, c.max_bet, c.max_pot, c.max_bets_per_user, c.max_bets_per_round,
      c.betting_seconds, c.lock_ms, c.spin_ms, c.stuck_cancel_seconds, encode(extensions.digest(seed, 'sha256'), 'hex'),
      ts + interval '3.5 seconds', ts + interval '3.5 seconds' + make_interval(secs => c.betting_seconds))
    returning id into gid;
  insert into public.roulette_game_secrets (game_id, server_seed) values (gid, seed);
  perform public._roulette_audit(null, 'ROUND_CREATED', gid, jsonb_build_object('wheel_version', c.wheel_version, 'continuous', true));
  return gid;
end $function$;
-- A retried join key must return the original match. _pool_guard runs first and
-- raises ALREADY_IN_MATCH once the table is STARTING, so the duplicate-key
-- lookup never ran for the player who just sat down.

create or replace function public.pool_matchmake(p_stake bigint, p_key text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid; cfg public.pool_config; dom public.money_domain_config; g public.pool_matches;
  existing record; seed bytea; ts timestamptz := clock_timestamp(); open_id bigint;
  stake_min int; stake_max int;
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  uid := auth.uid();
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into existing from pool_entries where user_id = uid and idempotency_key = p_key;
  if found then
    return jsonb_build_object('duplicate', true, 'match_id', existing.match_id,
      'role', case when existing.slot = 1 then 'created' else 'joined' end);
  end if;
  uid := public._pool_guard();
  select * into cfg from pool_config;
  select * into dom from money_domain_config;
  select min(v), max(v) into stake_min, stake_max from unnest(cfg.stakes) as v;
  if p_stake is null or stake_min is null or p_stake < stake_min or p_stake > stake_max then
    raise exception 'STAKE_NOT_ALLOWED';
  end if;
  if (
    select count(*) from pool_matches
    where creator_id = uid and created_at > clock_timestamp() - make_interval(secs => cfg.create_rate_window_seconds)
  ) >= cfg.create_rate_limit then raise exception 'RATE_LIMITED'; end if;

  select id into open_id from pool_matches
    where status = 'WAITING' and stake = p_stake and creator_id <> uid and expires_at > ts
    order by id
    for update skip locked
    limit 1;
  if open_id is not null then
    select * into g from pool_matches where id = open_id;
    perform public._pool_debit(uid, g.id, 2, g.stake, p_key, g.asset, g.account_type);
    update pool_matches set status = 'STARTING', opponent_id = uid, phase_at = ts, version = version + 1
      where id = g.id;
    perform public._pool_audit(uid, 'POOL_JOINED', g.id, jsonb_build_object('stake', g.stake));
    return jsonb_build_object('duplicate', false, 'match_id', g.id, 'role', 'joined');
  end if;

  if (
    select count(*) from pool_matches where creator_id = uid and status = 'WAITING'
  ) >= cfg.max_waiting then raise exception 'TOO_MANY_OPEN_GAMES'; end if;

  seed := extensions.gen_random_bytes(32);
  insert into pool_matches (
    status, creator_id, stake, pot, fee_bps, asset, account_type, server_seed_hash, expires_at, phase_at
  ) values (
    'WAITING', uid, p_stake, p_stake * 2, cfg.fee_bps, dom.asset, dom.account_type,
    encode(extensions.digest(seed, 'sha256'), 'hex'), ts + make_interval(secs => cfg.waiting_seconds), ts
  ) returning * into g;
  insert into pool_secrets (match_id, server_seed) values (g.id, seed);
  perform public._pool_debit(uid, g.id, 1, p_stake, p_key, g.asset, g.account_type);
  perform public._pool_audit(uid, 'POOL_CREATED', g.id, jsonb_build_object('stake', p_stake, 'server_seed_hash', g.server_seed_hash));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'role', 'created');
end $$;

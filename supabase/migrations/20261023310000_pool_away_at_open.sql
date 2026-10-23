-- A seat counts as away when the rack opens if their table was not open in the
-- last 15 seconds. An old visit is not the same as sitting down for the break.
-- The breaker is played by the table, so the opponent is not left looking at
-- ball in hand. An opponent who never arrived is played when the turn reaches them.
-- A seat that was actually here keeps its presence. An absent seat is not stamped
-- as if they had just opened the table.

create or replace function public.pool_begin(p_match bigint, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  g public.pool_matches;
  cfg public.pool_config;
  h text;
  seed bytea;
  expected jsonb;
  away text;
  a_here boolean;
  b_here boolean;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status = 'PLAYING' and g.state is not null then
    return jsonb_build_object('duplicate', true, 'match_id', g.id);
  end if;
  if g.status <> 'STARTING' or g.opponent_id is null then raise exception 'MATCH_NOT_STARTING'; end if;
  select server_seed into seed from pool_secrets where match_id = g.id;
  if seed is null then raise exception 'SEED_MISSING'; end if;
  expected := public.pool_fresh_state(seed);
  if p_state is null or public.pool_state_canon(p_state) is distinct from public.pool_state_canon(expected) then
    raise exception 'BAD_RACK';
  end if;
  h := public.pool_state_hash(expected);
  select * into cfg from pool_config;
  a_here := g.seen_a is not null and g.seen_a > clock_timestamp() - interval '15 seconds';
  b_here := g.seen_b is not null and g.seen_b > clock_timestamp() - interval '15 seconds';
  away := case
    when not a_here then 'A'
    when not b_here then 'B'
    else null
  end;
  update pool_matches set status = 'PLAYING', state = expected, state_hash = h, phase_at = clock_timestamp(),
    stand_in = away,
    stand_in_at = case when away is null then null else clock_timestamp() end,
    stand_in_claim = null,
    seen_a = case when a_here then clock_timestamp() else seen_a end,
    seen_b = case when b_here then clock_timestamp() else seen_b end,
    turn_deadline = clock_timestamp() + make_interval(secs => cfg.shot_seconds),
    version = version + 1
    where id = g.id;
  perform public._pool_audit(null, 'POOL_STARTED', g.id, jsonb_build_object('state_hash', h, 'stand_in', away));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'state_hash', h, 'stand_in', away);
end $$;

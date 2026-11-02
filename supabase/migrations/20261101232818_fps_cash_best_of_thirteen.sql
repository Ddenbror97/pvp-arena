-- New PvP series match Practice. Existing rooms keep their agreed terms.
begin;
set local lock_timeout = '8s';
alter table public.fps_matches
  drop constraint fps_matches_best_of_check,
  add constraint fps_matches_best_of_check check (best_of in (5,9,13)),
  drop constraint fps_matches_score_a_check,
  add constraint fps_matches_score_a_check check (score_a between 0 and (best_of+1)/2),
  drop constraint fps_matches_score_b_check,
  add constraint fps_matches_score_b_check check (score_b between 0 and (best_of+1)/2);
-- Result intent must persist a 7-win result before any payout/retry.
alter table public.fps_result_intents
  drop constraint fps_result_intents_score_a_check,
  add constraint fps_result_intents_score_a_check check (score_a between 0 and 7),
  drop constraint fps_result_intents_score_b_check,
  add constraint fps_result_intents_score_b_check check (score_b between 0 and 7);
create or replace function public._fps_terms(p_user uuid,p_stake bigint,p_best_of int) returns void
language plpgsql security definer set search_path = public as $$
declare cfg fps_config; dom money_domain_config; prof profiles;
begin
  if p_stake=0 then raise exception 'PRACTICE_SOLO_ONLY'; end if;
  if exists(select 1 from fps_private.practice_matches where owner_id=p_user and status='FUNDED' and expires_at>clock_timestamp()) then raise exception 'ALREADY_IN_MATCH'; end if;
  select * into strict cfg from fps_config where id=1;
  if not cfg.enabled then raise exception 'FPS_DISABLED'; end if;
  if p_best_of is null or p_best_of not in (5,9,13) then raise exception 'BEST_OF_NOT_ALLOWED'; end if;
  if p_stake is null or not (p_stake=0 or p_stake between 100 and 5000) then
    raise exception 'STAKE_NOT_ALLOWED';
  end if;
  select * into strict prof from profiles where id=p_user;
  if prof.self_excluded_until > clock_timestamp() then raise exception 'SELF_EXCLUDED'; end if;
  if prof.is_bot then raise exception 'BOT_NOT_ALLOWED'; end if;
  if p_stake=0 then
    if not cfg.practice_allowed then raise exception 'PRACTICE_DISABLED'; end if;
  else
    if not (p_stake = any(cfg.stakes)) then raise exception 'STAKE_NOT_ALLOWED'; end if;
    if not cfg.cash_enabled or not public._play_domain_open() then raise exception 'CASH_DISABLED'; end if;
    select * into strict dom from money_domain_config;
    if dom.asset <> 'USD' or dom.account_type <> 'real' then raise exception 'USD_REAL_REQUIRED'; end if;
  end if;
end $$;
create or replace function fps_private.open_match(p_stake bigint,p_best_of int,p_key text,
  p_private boolean,p_invite text,p_matchmake boolean) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare u uuid; g fps_matches; e fps_entries; token text;
begin
  u := public._fps_user();
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  if p_private is null then raise exception 'PRIVATE_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('fps-user:'||u,0));
  select * into e from fps_entries where user_id=u and idempotency_key=p_key;
  if found then
    select * into strict g from fps_matches where id=e.match_id;
    if g.stake is distinct from p_stake or g.best_of is distinct from p_best_of or g.private<>p_private then
      raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return public._fps_json(g.id,u);
  end if;
  perform public._fps_terms(u,p_stake,p_best_of);
  if exists(select 1 from fps_matches where status in ('WAITING','FUNDED') and (creator_id=u or opponent_id=u)) then
    raise exception 'ALREADY_IN_MATCH'; end if;
  if (select count(*) from fps_entries en join fps_matches m on m.id=en.match_id
      where en.user_id=u and m.created_at>clock_timestamp()-interval '10 minutes')>=8 then
    raise exception 'RATE_LIMITED'; end if;
  if p_invite is not null then
    if not p_private or length(p_invite)<>64 then raise exception 'INVALID_INVITE'; end if;
    select * into g from fps_matches where private and invite_hash=extensions.digest(p_invite,'sha256')
      and status='WAITING' and expires_at>clock_timestamp() for update skip locked;
    if not found then raise exception 'MATCH_NOT_OPEN'; end if;
    if g.stake<>p_stake or g.best_of<>p_best_of then raise exception 'TERMS_CHANGED'; end if;
    return public.fps_join(g.id,p_key,p_invite);
  end if;
  -- User explicitly selects these stake/series/5% terms before entering queue.
  if p_matchmake and not p_private then
    select * into g from fps_matches where status='WAITING' and not private
      and stake=p_stake and best_of=p_best_of and creator_id<>u and expires_at>clock_timestamp()
      order by created_at,id limit 1 for update skip locked;
    if found then return public.fps_join(g.id,p_key,null); end if;
  end if;
  -- Preserve legacy rooms/retries; reject old clients creating new short series.
  if p_best_of <> 13 then raise exception 'BEST_OF_NOT_ALLOWED'; end if;
  if p_private then token := encode(extensions.gen_random_bytes(32),'hex'); end if;
  insert into fps_matches(creator_id,stake,best_of,private,invite_hash)
    values(u,p_stake,p_best_of,p_private,case when p_private then extensions.digest(token,'sha256') end)
    returning * into g;
  if p_private then insert into fps_invite_secrets values(g.id,token); end if;
  perform public._fps_debit(g.id,u,1,p_key);
  return public._fps_json(g.id,u);
end $$;
create or replace function public.fps_rematch(p_match uuid,p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid; prior fps_matches; child fps_matches; e fps_entries; result jsonb; token text;
begin
  u := public._fps_user();
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtextextended('fps-user:'||u,0));
  select * into prior from fps_matches where id=p_match for update;
  if not found or (u<>prior.creator_id and u is distinct from prior.opponent_id) then raise exception 'MATCH_NOT_FOUND'; end if;
  if prior.status not in ('COMPLETED','CANCELLED') or prior.opponent_id is null then
    raise exception 'REMATCH_NOT_AVAILABLE'; end if;
  select * into e from fps_entries where user_id=u and idempotency_key=p_key;
  if found then
    if e.match_id is distinct from prior.rematch_id then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return public._fps_json(e.match_id,u)||jsonb_build_object('match_id',e.match_id);
  end if;
  if prior.rematch_id is null then
    result := public.fps_enter(prior.stake,13,p_key,true,null);
    update fps_matches set rematch_of=prior.id where id=(result->>'id')::uuid;
    update fps_matches set rematch_id=(result->>'id')::uuid where id=prior.id;
    return result||jsonb_build_object('match_id',result->>'id');
  end if;
  select * into strict child from fps_matches where id=prior.rematch_id;
  -- The new rematch confirmation promises BO13. Legacy invitations remain
  -- joinable from the lobby with their original terms, never under that promise.
  if child.best_of <> 13 then raise exception 'TERMS_CHANGED'; end if;
  if child.creator_id=u or exists(select 1 from fps_entries where match_id=child.id and user_id=u) then
    raise exception 'REMATCH_ALREADY_ACCEPTED'; end if;
  select s.token into strict token from fps_invite_secrets s where s.match_id=child.id;
  result := public.fps_join(child.id,p_key,token);
  return result||jsonb_build_object('match_id',child.id);
end $$;
commit;

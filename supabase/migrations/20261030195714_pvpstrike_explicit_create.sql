-- Explicit creation and auto-match share the existing ledger/session guards.
-- Cash activation is an operator setting, never a migration side effect.
begin;
create schema if not exists fps_private;
revoke all on schema fps_private from public,anon,authenticated;
grant usage on schema fps_private to service_role;

create function fps_private.open_match(p_stake bigint,p_best_of int,p_key text,
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
  if p_private then token := encode(extensions.gen_random_bytes(32),'hex'); end if;
  insert into fps_matches(creator_id,stake,best_of,private,invite_hash)
    values(u,p_stake,p_best_of,p_private,case when p_private then extensions.digest(token,'sha256') end)
    returning * into g;
  if p_private then insert into fps_invite_secrets values(g.id,token); end if;
  perform public._fps_debit(g.id,u,1,p_key);
  return public._fps_json(g.id,u);
end $$;

revoke all on function fps_private.open_match(bigint,int,text,boolean,text,boolean) from public,anon,authenticated,service_role;

-- Preserve the existing queue API for old clients and rematches.
create or replace function public.fps_enter(p_stake bigint,p_best_of int,p_key text,
  p_private boolean default false,p_invite text default null) returns jsonb
language sql security definer set search_path = public as $$
  select fps_private.open_match(p_stake,p_best_of,p_key,p_private,p_invite,true);
$$;

-- Create game must never silently join another player's paid room.
create function public.fps_create(p_stake bigint,p_best_of int,p_key text,
  p_private boolean default false) returns jsonb
language sql security definer set search_path = public as $$
  select fps_private.open_match(p_stake,p_best_of,p_key,p_private,null,false);
$$;
revoke all on function public.fps_create(bigint,int,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.fps_create(bigint,int,text,boolean) to authenticated;

create or replace function public._fps_terms(p_user uuid,p_stake bigint,p_best_of int) returns void
language plpgsql security definer set search_path = public as $$
declare cfg fps_config; dom money_domain_config; prof profiles;
begin
  select * into strict cfg from fps_config where id=1;
  if not cfg.enabled then raise exception 'FPS_DISABLED'; end if;
  if p_best_of is null or p_best_of not in (5,9) then raise exception 'BEST_OF_NOT_ALLOWED'; end if;
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

commit;

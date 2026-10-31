begin;
-- Solo sessions are deliberately outside fps_matches and the financial ledger.
create table fps_private.practice_matches (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  request_key text not null check(length(request_key) between 8 and 100),
  status text not null default 'FUNDED' check(status in ('FUNDED','COMPLETED','CANCELLED')),
  score_a int not null default 0 check(score_a between 0 and 7),
  score_b int not null default 0 check(score_b between 0 and 7),
  winner_id uuid,
  reason text,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default clock_timestamp()+interval '20 minutes',
  unique(owner_id,request_key)
);
alter table fps_private.practice_matches enable row level security;
revoke all on fps_private.practice_matches from public,anon,authenticated,service_role;
create index practice_owner_history on fps_private.practice_matches(owner_id,created_at desc);
create unique index practice_one_active on fps_private.practice_matches(owner_id) where status='FUNDED';
create function fps_private.practice_json(p_id uuid) returns jsonb
language sql stable security invoker set search_path=public as $$
  select jsonb_build_object('id',id,'creator_id',owner_id,
    'opponent_id','00000000-0000-4000-8000-000000000013','practice',true,
    'best_of',13,'stake',0,'private',true,'status',status,'score_a',score_a,'score_b',score_b,
    'winner_id',winner_id,'fee_amount',0,'payout_amount',0,'expires_at',expires_at,'reason',reason)
  from fps_private.practice_matches where id=p_id;
$$;
revoke all on function fps_private.practice_json(uuid) from public,anon,authenticated,service_role;
create function public.fps_practice_start(p_key text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid := public._fps_user(); g fps_private.practice_matches; cfg fps_config;
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtextextended('fps-user:'||u,0));
  select * into strict cfg from fps_config where id=1;
  if not cfg.enabled or not cfg.practice_allowed then raise exception 'PRACTICE_DISABLED'; end if;
  if exists(select 1 from profiles where id=u and (is_bot or self_excluded_until>clock_timestamp())) then raise exception 'PLAYER_NOT_ALLOWED'; end if;
  update fps_private.practice_matches set status='CANCELLED',reason='MATCH_TIMEOUT'
    where owner_id=u and status='FUNDED' and expires_at<=clock_timestamp();
  select * into g from fps_private.practice_matches where owner_id=u and request_key=p_key;
  if found then return fps_private.practice_json(g.id); end if;
  if exists(select 1 from fps_matches where status in ('WAITING','FUNDED') and (creator_id=u or opponent_id=u)) then raise exception 'ALREADY_IN_MATCH'; end if;
  select * into g from fps_private.practice_matches where owner_id=u and status='FUNDED';
  if found then return fps_private.practice_json(g.id); end if;
  if (select count(*) from fps_private.practice_matches where owner_id=u and created_at>clock_timestamp()-interval '10 minutes')>=8 then raise exception 'RATE_LIMITED'; end if;
  insert into fps_private.practice_matches(owner_id,request_key) values(u,p_key) returning * into g;
  return fps_private.practice_json(g.id);
end $$;
revoke all on function public.fps_practice_start(text) from public,anon,authenticated,service_role;
grant execute on function public.fps_practice_start(text) to authenticated;

-- Existing cash code and ACLs stay intact behind the same authenticated facade.
alter function public.fps_view(uuid) set schema fps_private;
revoke all on function fps_private.fps_view(uuid) from public,anon,authenticated,service_role;
create function public.fps_view(p_match uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare g fps_private.practice_matches; u uuid;
begin
  select * into g from fps_private.practice_matches where id=p_match;
  if not found then return fps_private.fps_view(p_match); end if;
  if auth.jwt()->>'role' is distinct from 'service_role' then
    u := public._fps_user();
    if u<>g.owner_id then raise exception 'MATCH_NOT_FOUND'; end if;
  end if;
  return fps_private.practice_json(g.id);
end $$;
revoke all on function public.fps_view(uuid) from public,anon,authenticated,service_role;
grant execute on function public.fps_view(uuid) to authenticated,service_role;
alter function public.fps_lobby() set schema fps_private;
revoke all on function fps_private.fps_lobby() from public,anon,authenticated,service_role;
create function public.fps_lobby() returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb := fps_private.fps_lobby(); p uuid;
begin
  if auth.uid() is not null and result->>'mine' is null then
    select id into p from fps_private.practice_matches where owner_id=auth.uid() and status='FUNDED' and expires_at>clock_timestamp();
    if p is not null then result:=jsonb_set(result,'{mine}',fps_private.practice_json(p)); end if;
  end if;
  result:=jsonb_set(result,'{open}',coalesce((select jsonb_agg(r) from jsonb_array_elements(result->'open') r where (r->>'stake')::bigint>0),'[]'::jsonb));
  return result;
end $$;
revoke all on function public.fps_lobby() from public,anon,authenticated,service_role;
grant execute on function public.fps_lobby() to anon,authenticated;
alter function public.fps_cancel(uuid) set schema fps_private;
revoke all on function fps_private.fps_cancel(uuid) from public,anon,authenticated,service_role;
create function public.fps_cancel(p_match uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid := public._fps_user(); g fps_private.practice_matches;
begin
  perform pg_advisory_xact_lock(hashtextextended('fps-user:'||u,0));
  select * into g from fps_private.practice_matches where id=p_match for update;
  if not found then return fps_private.fps_cancel(p_match); end if;
  if g.owner_id<>u then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status='FUNDED' then update fps_private.practice_matches set status='CANCELLED',reason='PLAYER_CANCELLED' where id=p_match; end if;
  return fps_private.practice_json(p_match);
end $$;
revoke all on function public.fps_cancel(uuid) from public,anon,authenticated,service_role;
grant execute on function public.fps_cancel(uuid) to authenticated;

create function public.fps_practice_finish(p_match uuid,p_winner uuid,p_score_a int,p_score_b int,p_reason text,p_runtime text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare g fps_private.practice_matches; bot constant uuid := '00000000-0000-4000-8000-000000000013';
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  select * into strict g from fps_private.practice_matches where id=p_match for update;
  if p_reason is null or p_runtime is distinct from p_match::text or p_score_a is null or p_score_b is null or
    p_score_a not between 0 and 7 or p_score_b not between 0 and 7 then raise exception 'INVALID_RESULT'; end if;
  if p_winner is not null then
    if p_winner not in (g.owner_id,bot) or p_reason not in ('ROUNDS','DISCONNECT') then raise exception 'INVALID_RESULT'; end if;
    if p_reason='ROUNDS' and not ((p_winner=g.owner_id and p_score_a=7 and p_score_b<7) or (p_winner=bot and p_score_b=7 and p_score_a<7)) then raise exception 'INVALID_RESULT'; end if;
  elsif p_reason not in ('INCONCLUSIVE','MATCH_TIMEOUT','NO_SHOW','BOTH_DISCONNECTED','SERVER_RESTART','RUNTIME_ERROR') then raise exception 'INVALID_RESULT'; end if;
  if g.status<>'FUNDED' then return fps_private.practice_json(g.id); end if;
  update fps_private.practice_matches set status=case when p_winner is null then 'CANCELLED' else 'COMPLETED' end,
    score_a=p_score_a,score_b=p_score_b,winner_id=p_winner,reason=p_reason where id=p_match;
  return fps_private.practice_json(p_match);
end $$;
revoke all on function public.fps_practice_finish(uuid,uuid,int,int,text,text) from public,anon,authenticated,service_role;
grant execute on function public.fps_practice_finish(uuid,uuid,int,int,text,text) to service_role;
create or replace function public._fps_terms(p_user uuid,p_stake bigint,p_best_of int) returns void
language plpgsql security definer set search_path = public as $$
declare cfg fps_config; dom money_domain_config; prof profiles;
begin
  if p_stake=0 then raise exception 'PRACTICE_SOLO_ONLY'; end if;
  if exists(select 1 from fps_private.practice_matches where owner_id=p_user and status='FUNDED' and expires_at>clock_timestamp()) then raise exception 'ALREADY_IN_MATCH'; end if;
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

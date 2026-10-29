-- Disabled until the trusted runtime, ticket issuer and expiry worker are deployed.
begin;
create table public.fps_config (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  cash_enabled boolean not null default false,
  practice_allowed boolean not null default true,
  fee_bps int not null default 500 check (fee_bps = 500),
  stakes int[] not null default '{100,200,500,1000,2500,5000}'
    check (cardinality(stakes) > 0 and stakes <@ array[100,200,500,1000,2500,5000]),
  region text not null default 'single' check (region = 'single')
);
insert into public.fps_config(id) values (1);

create table public.fps_matches (
  id uuid primary key default gen_random_uuid(),
  -- Existing ledger game_id is bigint; never truncate/hash the external UUID.
  ledger_game_id bigint generated always as identity unique not null,
  status text not null default 'WAITING' check (status in ('WAITING','FUNDED','COMPLETED','CANCELLED')),
  creator_id uuid not null references public.profiles(id),
  opponent_id uuid references public.profiles(id),
  stake bigint not null check (stake = 0 or stake between 100 and 5000),
  best_of int not null check (best_of in (5,9)),
  private boolean not null default false,
  invite_hash bytea,
  fee_bps int not null default 500 check (fee_bps = 500),
  asset text not null default 'USD' check (asset = 'USD'),
  account_type text not null default 'real' check (account_type = 'real'),
  region text not null default 'single' check (region = 'single'),
  runtime_id text generated always as (id::text) stored,
  score_a int not null default 0 check (score_a between 0 and 5),
  score_b int not null default 0 check (score_b between 0 and 5),
  winner_id uuid references public.profiles(id),
  payout_amount bigint not null default 0 check (payout_amount >= 0),
  fee_amount bigint not null default 0 check (fee_amount >= 0),
  reason text,
  result_recorded boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  funded_at timestamptz,
  expires_at timestamptz not null default clock_timestamp() + interval '10 minutes',
  completed_at timestamptz,
  rematch_id uuid references public.fps_matches(id),
  rematch_of uuid unique references public.fps_matches(id),
  check (creator_id is distinct from opponent_id),
  check (private = (invite_hash is not null)),
  check (status <> 'FUNDED' or (opponent_id is not null and funded_at is not null)),
  check (status <> 'COMPLETED' or (winner_id is not null and winner_id in (creator_id, opponent_id)))
);
create index fps_queue on public.fps_matches(stake,best_of,created_at,id) where status = 'WAITING' and not private;
create index fps_creator_active on public.fps_matches(creator_id,status);
create index fps_opponent_active on public.fps_matches(opponent_id,status) where opponent_id is not null;
create index fps_expiry on public.fps_matches(expires_at,id) where status in ('WAITING','FUNDED');
create unique index fps_invite_hash on public.fps_matches(invite_hash) where private;

-- The raw invite is deliberately inaccessible through the Data API. It permits
-- the creator's lost-response retry without a new token or another debit.
create table public.fps_invite_secrets (
  match_id uuid primary key references public.fps_matches(id),
  token text not null check (length(token) = 64)
);
create table public.fps_entries (
  match_id uuid not null references public.fps_matches(id),
  user_id uuid not null references public.profiles(id),
  slot int not null check (slot in (1,2)),
  amount bigint not null check (amount = 0 or amount between 100 and 5000),
  ledger_tx_id uuid references public.ledger_transactions(id),
  idempotency_key text not null check (length(idempotency_key) between 8 and 100),
  primary key(match_id,slot), unique(match_id,user_id), unique(user_id,idempotency_key),
  check ((amount = 0) = (ledger_tx_id is null))
);
create table public.fps_audit (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.fps_matches(id),
  action text not null check (action in ('CREATED','JOINED','COMPLETED','REFUNDED')),
  actor_id uuid,
  details jsonb not null,
  ledger_tx_id uuid references public.ledger_transactions(id),
  created_at timestamptz not null default clock_timestamp(),
  unique(match_id,action)
);
create table public.fps_ratings (
  user_id uuid primary key references public.profiles(id),
  rating int not null default 1000,
  played int not null default 0 check (played >= 0),
  wins int not null default 0 check (wins between 0 and played)
);

-- A committed authoritative result survives posting failures and expiry. Never
-- replace an intent: reconciliation must settle exactly this immutable outcome.
create table public.fps_result_intents (
  match_id uuid primary key references public.fps_matches(id),
  runtime_id text not null,
  winner_id uuid references public.profiles(id),
  score_a int not null check (score_a between 0 and 5),
  score_b int not null check (score_b between 0 and 5),
  reason text not null,
  recorded_at timestamptz not null default clock_timestamp()
);
alter table public.fps_result_intents enable row level security;
revoke all on public.fps_result_intents from public,anon,authenticated,service_role;
grant select on public.fps_result_intents to service_role;
create trigger fps_result_intents_immutable before update or delete on public.fps_result_intents
  for each row execute function public._immutable();

alter table public.fps_config enable row level security;
alter table public.fps_matches enable row level security;
alter table public.fps_invite_secrets enable row level security;
alter table public.fps_entries enable row level security;
alter table public.fps_audit enable row level security;
alter table public.fps_ratings enable row level security;
revoke all on public.fps_config, public.fps_matches, public.fps_invite_secrets,
  public.fps_entries, public.fps_audit, public.fps_ratings from public,anon,authenticated;
grant select,update on public.fps_config to service_role;
-- Service runtime reads through fps_view, not an unrestricted table API.
create trigger fps_entries_immutable before update or delete on public.fps_entries
  for each row execute function public._immutable();
create trigger fps_audit_immutable before update or delete on public.fps_audit
  for each row execute function public._immutable();
create trigger fps_secrets_immutable before update or delete on public.fps_invite_secrets
  for each row execute function public._immutable();

create function public._fps_match_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op='DELETE' then raise exception 'FPS_MATCH_IMMUTABLE'; end if;
  if row(new.id,new.ledger_game_id,new.creator_id,new.stake,new.best_of,new.private,
      new.invite_hash,new.fee_bps,new.asset,new.account_type,new.region,new.created_at)
    is distinct from row(old.id,old.ledger_game_id,old.creator_id,old.stake,old.best_of,old.private,
      old.invite_hash,old.fee_bps,old.asset,old.account_type,old.region,old.created_at)
    or (old.opponent_id is not null and new.opponent_id is distinct from old.opponent_id)
    or (old.rematch_id is not null and new.rematch_id is distinct from old.rematch_id)
    or (old.rematch_of is not null and new.rematch_of is distinct from old.rematch_of)
    or (old.result_recorded and not new.result_recorded)
    or (old.status in ('COMPLETED','CANCELLED') and
      (to_jsonb(new)-'rematch_id'-'runtime_id') is distinct from (to_jsonb(old)-'rematch_id'-'runtime_id'))
    then raise exception 'FPS_MATCH_IMMUTABLE'; end if;
  return new;
end $$;
create trigger fps_match_guard before update or delete on public.fps_matches
  for each row execute function public._fps_match_guard();

create function public._fps_user() returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); c jsonb := auth.jwt();
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  -- Unlike legacy tooling paths, these browser APIs require a real session.
  if c->>'role' is distinct from 'authenticated' or c->>'session_id' is null then
    raise exception 'LIVE_SESSION_REQUIRED';
  end if;
  perform public._assert_live_session();
  if not exists (select 1 from profiles where id=u) then raise exception 'PROFILE_REQUIRED'; end if;
  return u;
end $$;

create function public._fps_terms(p_user uuid,p_stake bigint,p_best_of int) returns void
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
    if not cfg.cash_enabled or not public._play_domain_open() then raise exception 'CASH_DISABLED'; end if;
    select * into strict dom from money_domain_config;
    if dom.asset <> 'USD' or dom.account_type <> 'real' then raise exception 'USD_REAL_REQUIRED'; end if;
  end if;
end $$;

create function public._fps_json(p_match uuid,p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id',g.id,'status',g.status,'creator_id',g.creator_id,
    'opponent_id',g.opponent_id,'stake',g.stake,'best_of',g.best_of,'private',g.private,
    'runtime_id',g.runtime_id,'region',g.region,'score_a',g.score_a,'score_b',g.score_b,
    'winner_id',g.winner_id,'payout_amount',g.payout_amount,'fee_amount',g.fee_amount,'result_recorded',g.result_recorded,
    'fee_bps',g.fee_bps,'pot',g.stake*2,'reason',g.reason,'expires_at',g.expires_at,
    'funded_at',g.funded_at,'rematch_id',g.rematch_id,
    'reconnect_seconds',30,'pre_start_seconds',60,'max_runtime_seconds',1200)
    || case when g.private and g.creator_id=p_user then
      jsonb_build_object('invite',(select token from fps_invite_secrets where match_id=g.id))
      else '{}'::jsonb end
  from fps_matches g where g.id=p_match;
$$;

create function public.fps_view(p_match uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid; g fps_matches;
begin
  -- EXECUTE is also granted to service_role for trusted runtime initialization.
  if auth.jwt()->>'role' = 'service_role' then
    select * into g from fps_matches where id=p_match;
    if not found then raise exception 'MATCH_NOT_FOUND'; end if;
    return public._fps_json(g.id,null);
  end if;
  u := public._fps_user();
  select * into g from fps_matches where id=p_match;
  if not found or (u <> g.creator_id and u is distinct from g.opponent_id
    and not (not g.private and g.status='FUNDED')) then
    raise exception 'MATCH_NOT_FOUND';
  end if;
  return public._fps_json(g.id,u);
end $$;

-- Capability preview permits explicit terms confirmation before any reservation.
-- Match stake, series and privacy never change through an FPS RPC.
create function public.fps_invite_preview(p_match uuid,p_invite text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g fps_matches;
begin
  perform public._fps_user();
  if p_invite is null or length(p_invite)<>64 then raise exception 'MATCH_NOT_FOUND'; end if;
  select * into g from fps_matches where id=p_match and private
    and invite_hash=extensions.digest(p_invite,'sha256');
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  return jsonb_build_object('id',g.id,'stake',g.stake,'best_of',g.best_of,
    'username',(select username from profiles where id=g.creator_id),'status',g.status,'private',true);
end $$;

create function public._fps_debit(p_match uuid,p_user uuid,p_slot int,p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare g fps_matches; tx uuid; a uuid; l uuid; bal bigint; elig bigint; bonus_part bigint;
begin
  select * into strict g from fps_matches where id=p_match;
  if g.stake>0 then
    perform public._coinflip_lock_wallets(array[p_user],g.asset,g.account_type);
    a := public._user_account(p_user,'user_available',g.asset,g.account_type);
    l := public._user_account(p_user,'user_locked',g.asset,g.account_type);
    select balance into bal from wallet_accounts where id=a;
    if a is null or l is null or bal is null or bal<g.stake then raise exception 'INSUFFICIENT_BALANCE'; end if;
    -- FPS is intentionally outside bonus/partner playthrough allowlists. Reject
    -- restricted players instead of laundering their funds through another user.
    if public._is_active_partner(p_user)
      or public.promo_restricted_cents(p_user)>0
      or public.referral_unplayed_reward_cents(p_user)>0
      or public.leaderboard_prize_restricted_cents(p_user)>0
      or public._partner_release_block(p_user,bal)>0
      or public._partner_profit_hold(p_user)>0 then raise exception 'RESTRICTED_FUNDS'; end if;
    perform public._withdraw_basis_sync();
    select eligible into elig from withdraw_basis_bucket where user_id=p_user;
    if coalesce(elig,0)<g.stake then raise exception 'CASH_ONLY_BUY_IN'; end if;
    insert into ledger_transactions(kind,idempotency_key,account_type,user_id,game_id,memo)
      values ('fps_entry','fps:'||g.id||':entry:'||p_slot,g.account_type,p_user,g.ledger_game_id,'FPS cash stake')
      returning id into tx;
    perform public._post(tx,a,-g.stake);
    perform public._post(tx,l,g.stake);
    perform public._withdraw_basis_sync();
    select bonus into bonus_part from withdraw_basis_ledger_stake where ledger_tx_id=tx;
    if bonus_part is distinct from 0::bigint then raise exception 'CASH_ONLY_BUY_IN'; end if;
  end if;
  insert into fps_entries(match_id,user_id,slot,amount,ledger_tx_id,idempotency_key)
    values(g.id,p_user,p_slot,g.stake,tx,p_key);
  insert into fps_audit(match_id,action,actor_id,details,ledger_tx_id)
    values(g.id,case when p_slot=1 then 'CREATED' else 'JOINED' end,p_user,
      jsonb_build_object('stake',g.stake,'best_of',g.best_of,'fee_bps',g.fee_bps),tx);
end $$;

create function public.fps_join(p_match uuid,p_key text,p_invite text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid; g fps_matches; e fps_entries;
begin
  u := public._fps_user();
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtextextended('fps-user:'||u,0));
  select * into e from fps_entries where user_id=u and idempotency_key=p_key;
  if found then
    if e.match_id<>p_match or e.slot<>2 then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return public._fps_json(e.match_id,u);
  end if;
  if exists(select 1 from fps_matches where status in ('WAITING','FUNDED') and (creator_id=u or opponent_id=u)) then
    raise exception 'ALREADY_IN_MATCH'; end if;
  select * into g from fps_matches where id=p_match for update skip locked;
  if not found or g.status<>'WAITING' or g.expires_at<=clock_timestamp() then raise exception 'MATCH_NOT_OPEN'; end if;
  if g.creator_id=u then raise exception 'OWN_TABLE'; end if;
  if g.rematch_of is not null and not exists(select 1 from fps_matches prior
    where prior.id=g.rematch_of and u in (prior.creator_id,prior.opponent_id)) then
    raise exception 'MATCH_NOT_OPEN'; end if;
  if g.private and (p_invite is null or length(p_invite)<>64 or
      extensions.digest(p_invite,'sha256') is distinct from g.invite_hash) then raise exception 'MATCH_NOT_OPEN'; end if;
  perform public._fps_terms(u,g.stake,g.best_of);
  perform public._fps_debit(g.id,u,2,p_key);
  update fps_matches set opponent_id=u,status='FUNDED',funded_at=clock_timestamp(),
    expires_at=clock_timestamp()+interval '20 minutes' where id=g.id;
  return public._fps_json(g.id,u);
end $$;

create function public.fps_enter(p_stake bigint,p_best_of int,p_key text,
  p_private boolean default false,p_invite text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
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
  if not p_private then
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

create function public._fps_refund(p_match uuid,p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare g fps_matches; e fps_entries; tx uuid; ids uuid[];
begin
  select * into strict g from fps_matches where id=p_match for update;
  if g.status='CANCELLED' then return; end if;
  if g.status not in ('WAITING','FUNDED') then raise exception 'MATCH_NOT_CANCELLABLE'; end if;
  perform 1 from fps_entries where match_id=g.id order by user_id for update;
  select array_agg(user_id order by user_id) into ids from fps_entries where match_id=g.id;
  if coalesce(cardinality(ids),0)<>(case when g.status='WAITING' then 1 else 2 end)
    or exists(select 1 from fps_entries where match_id=g.id and
      (amount<>g.stake or (slot=1 and user_id<>g.creator_id) or (slot=2 and user_id is distinct from g.opponent_id))) then
    raise exception 'POT_MISMATCH'; end if;
  if g.stake>0 then
    perform public._coinflip_lock_wallets(ids,g.asset,g.account_type);
    insert into ledger_transactions(kind,idempotency_key,account_type,game_id,memo)
      values('fps_refund','fps:'||g.id||':refund',g.account_type,g.ledger_game_id,'FPS full refund') returning id into tx;
    for e in select * from fps_entries where match_id=g.id order by user_id loop
      perform public._post(tx,public._user_account(e.user_id,'user_locked',g.asset,g.account_type),-e.amount);
      perform public._post(tx,public._user_account(e.user_id,'user_available',g.asset,g.account_type),e.amount);
    end loop;
    perform public._withdraw_basis_sync();
  end if;
  update fps_matches set status='CANCELLED',reason=p_reason,completed_at=clock_timestamp() where id=g.id;
  insert into fps_audit(match_id,action,details,ledger_tx_id)
    values(g.id,'REFUNDED',jsonb_build_object('reason',p_reason,'players',cardinality(ids),'stake',g.stake),tx);
end $$;

create function public.fps_cancel(p_match uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid; g fps_matches;
begin
  u := public._fps_user();
  perform pg_advisory_xact_lock(hashtextextended('fps-user:'||u,0));
  select * into g from fps_matches where id=p_match for update;
  if not found or g.creator_id<>u then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status='CANCELLED' then return public._fps_json(g.id,u); end if;
  if g.status<>'WAITING' then raise exception 'MATCH_NOT_CANCELLABLE'; end if;
  perform public._fps_refund(g.id,'CREATOR_CANCELLED');
  return public._fps_json(g.id,u);
end $$;

create function public._fps_validate_result(g public.fps_matches,p_winner uuid,p_score_a int,p_score_b int,p_reason text,p_runtime text)
returns void language plpgsql set search_path = public as $$
declare needed int := g.best_of/2+1;
begin
  if p_runtime is distinct from g.runtime_id then raise exception 'RUNTIME_MISMATCH'; end if;
  if p_reason is null then raise exception 'INVALID_RESULT'; end if;
  if p_winner is null then
    if p_reason not in ('SERVER_RESTART','BOTH_DISCONNECTED','NO_SHOW','INCONCLUSIVE','MATCH_TIMEOUT','RUNTIME_ERROR') then
      raise exception 'INVALID_REFUND_REASON'; end if;
    return;
  end if;
  if p_winner not in (g.creator_id,g.opponent_id) or p_score_a is null or p_score_b is null
    or p_score_a<0 or p_score_b<0 or p_score_a>needed or p_score_b>needed then raise exception 'INVALID_RESULT'; end if;
  if p_reason='ROUNDS' then
    if (p_winner=g.creator_id and (p_score_a<>needed or p_score_b>=needed))
      or (p_winner=g.opponent_id and (p_score_b<>needed or p_score_a>=needed)) then raise exception 'INVALID_RESULT'; end if;
  elsif p_reason='DISCONNECT' then
    -- A disconnect may award an unfinished series, never contradict a majority.
    if p_score_a>=needed or p_score_b>=needed then raise exception 'INVALID_RESULT'; end if;
  else raise exception 'INVALID_RESULT'; end if;
end $$;

create function public.fps_record_result(p_match uuid,p_winner uuid,p_score_a int,p_score_b int,p_reason text,p_runtime text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g fps_matches; intent fps_result_intents;
begin
  select * into g from fps_matches where id=p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  perform public._fps_validate_result(g,p_winner,p_score_a,p_score_b,p_reason,p_runtime);
  select * into intent from fps_result_intents where match_id=g.id;
  if found then
    if row(intent.runtime_id,intent.winner_id,intent.score_a,intent.score_b,intent.reason)
      is distinct from row(p_runtime,p_winner,case when p_winner is null then 0 else p_score_a end,
        case when p_winner is null then 0 else p_score_b end,p_reason) then raise exception 'RESULT_CONFLICT'; end if;
    return public._fps_json(g.id,null);
  end if;
  if g.status<>'FUNDED' then raise exception 'MATCH_NOT_FUNDED'; end if;
  -- The trusted runtime may retry its first SQL write after the deadline, but
  -- cannot overturn a refund already committed by cleanup. Both lock this row.
  insert into fps_result_intents(match_id,runtime_id,winner_id,score_a,score_b,reason)
    values(g.id,p_runtime,p_winner,case when p_winner is null then 0 else p_score_a end,
      case when p_winner is null then 0 else p_score_b end,p_reason);
  -- Updating the parent is essential: an expiry SELECT whose snapshot predates
  -- the intent must recheck this predicate on the current locked row (EPQ).
  update fps_matches set result_recorded=true where id=g.id;
  return public._fps_json(g.id,null);
end $$;

create function public.fps_finish(p_match uuid,p_winner uuid,p_score_a int,p_score_b int,p_reason text,p_runtime text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g fps_matches; intent fps_result_intents; e fps_entries; ids uuid[]; tx uuid; pot bigint; fee bigint; payout bigint;
  ra int; rb int; delta int; expected numeric;
begin
  select * into g from fps_matches where id=p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  perform public._fps_validate_result(g,p_winner,p_score_a,p_score_b,p_reason,p_runtime);
  select * into intent from fps_result_intents where match_id=g.id;
  if found then
    if row(intent.runtime_id,intent.winner_id,intent.score_a,intent.score_b,intent.reason)
      is distinct from row(p_runtime,p_winner,case when p_winner is null then 0 else p_score_a end,
        case when p_winner is null then 0 else p_score_b end,p_reason) then raise exception 'RESULT_CONFLICT'; end if;
  elsif g.result_recorded then raise exception 'RESULT_INTENT_MISSING'; end if;
  if g.status in ('COMPLETED','CANCELLED') then
    if g.winner_id is distinct from p_winner or g.reason is distinct from p_reason
      or (g.status='COMPLETED' and (g.score_a is distinct from p_score_a or g.score_b is distinct from p_score_b)) then
      raise exception 'RESULT_CONFLICT'; end if;
    return public._fps_json(g.id,null);
  end if;
  if g.status<>'FUNDED' then raise exception 'MATCH_NOT_FUNDED'; end if;
  if p_winner is null then
    perform public._fps_refund(g.id,p_reason);
    return public._fps_json(g.id,null);
  end if;
  if not g.result_recorded and g.expires_at<=clock_timestamp() then raise exception 'MATCH_EXPIRED'; end if;
  perform 1 from fps_entries where match_id=g.id order by user_id for update;
  select array_agg(user_id order by user_id),sum(amount) into ids,pot from fps_entries where match_id=g.id;
  if cardinality(ids)<>2 or pot<>g.stake*2 then raise exception 'POT_MISMATCH'; end if;
  fee := pot*500/10000; payout := pot-fee;
  if pot>0 then
    perform public._coinflip_lock_wallets(ids,g.asset,g.account_type);
    perform public._lock_system_accounts(array['house_revenue']::public.account_kind[],g.asset,g.account_type);
    -- Apply both entries before settlement; never re-derive a missing cash mix.
    perform public._withdraw_basis_sync();
    if (select count(*) from withdraw_basis_stake where game='fps' and game_id=g.ledger_game_id
      and user_id=any(ids) and eligible=g.stake and bonus=0)<>2 then raise exception 'CASH_BASIS_MISMATCH'; end if;
    insert into ledger_transactions(kind,idempotency_key,account_type,user_id,game_id,memo)
      values('fps_settlement','fps:'||g.id||':settlement',g.account_type,p_winner,g.ledger_game_id,'FPS payout and 5% fee')
      returning id into tx;
    for e in select * from fps_entries where match_id=g.id order by user_id loop
      perform public._post(tx,public._user_account(e.user_id,'user_locked',g.asset,g.account_type),-e.amount);
    end loop;
    perform public._post(tx,public._user_account(p_winner,'user_available',g.asset,g.account_type),payout);
    perform public._post(tx,public._system_account('house_revenue',g.asset,g.account_type),fee);
    perform public._withdraw_basis_sync();
  end if;
  -- Paid public matches only. Private/practice results cannot farm the ranking.
  if g.stake>0 and not g.private then
    insert into fps_ratings(user_id) select unnest(ids) order by 1 on conflict do nothing;
    perform 1 from fps_ratings where user_id=any(ids) order by user_id for update;
    select rating into ra from fps_ratings where user_id=g.creator_id;
    select rating into rb from fps_ratings where user_id=g.opponent_id;
    expected := 1/(1+power(10::numeric,least(800,greatest(-800,rb-ra))::numeric/400));
    delta := round(24*((case when p_winner=g.creator_id then 1 else 0 end)-expected));
    update fps_ratings set rating=rating+case when user_id=g.creator_id then delta else -delta end,
      played=played+1,wins=wins+case when user_id=p_winner then 1 else 0 end where user_id=any(ids);
  end if;
  update fps_matches set status='COMPLETED',winner_id=p_winner,score_a=p_score_a,score_b=p_score_b,
    reason=p_reason,payout_amount=payout,fee_amount=fee,completed_at=clock_timestamp() where id=g.id;
  insert into fps_audit(match_id,action,details,ledger_tx_id) values(g.id,'COMPLETED',jsonb_build_object(
    'winner',p_winner,'score_a',p_score_a,'score_b',p_score_b,'reason',p_reason,'pot',pot,'fee',fee,'payout',payout),tx);
  return public._fps_json(g.id,null);
end $$;

create function public.fps_expire(p_limit int default 100) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g fps_matches; n int := 0;
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT'; end if;
  for g in select * from fps_matches where status in ('WAITING','FUNDED') and not result_recorded and expires_at<=clock_timestamp()
    order by expires_at,id limit p_limit for update skip locked loop
    perform public._fps_refund(g.id,case when g.status='WAITING' then 'WAITING_EXPIRED' else 'SERVER_RESTART' end);
    n := n+1;
  end loop;
  return jsonb_build_object('expired',n);
end $$;

create function public.fps_reconcile(p_limit int default 100) returns jsonb
language plpgsql security definer set search_path = public as $$
declare intent fps_result_intents; settled int := 0; failed int := 0;
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT'; end if;
  for intent in
    select i.* from fps_matches m join fps_result_intents i on i.match_id=m.id
    where m.status='FUNDED' and m.result_recorded
    order by i.recorded_at,m.id limit p_limit for update of m skip locked
  loop
    -- A failed match rolls back only this attempt, retaining its separately
    -- committed intent/reservations while allowing other selected matches to settle.
    begin
      perform public.fps_finish(intent.match_id,intent.winner_id,intent.score_a,intent.score_b,intent.reason,intent.runtime_id);
      settled := settled+1;
    exception when others then
      failed := failed+1;
      raise warning 'FPS_RECONCILE_FAILED match=% sqlstate=% error=%',intent.match_id,SQLSTATE,SQLERRM;
    end;
  end loop;
  return jsonb_build_object('settled',settled,'failed',failed);
end $$;

create function public.fps_rematch(p_match uuid,p_key text) returns jsonb
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
    result := public.fps_enter(prior.stake,prior.best_of,p_key,true,null);
    update fps_matches set rematch_of=prior.id where id=(result->>'id')::uuid;
    update fps_matches set rematch_id=(result->>'id')::uuid where id=prior.id;
    return result||jsonb_build_object('match_id',result->>'id');
  end if;
  select * into strict child from fps_matches where id=prior.rematch_id;
  if child.creator_id=u or exists(select 1 from fps_entries where match_id=child.id and user_id=u) then
    raise exception 'REMATCH_ALREADY_ACCEPTED'; end if;
  select s.token into strict token from fps_invite_secrets s where s.match_id=child.id;
  result := public.fps_join(child.id,p_key,token);
  return result||jsonb_build_object('match_id',child.id);
end $$;

create function public.fps_lobby() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); mine uuid; cfg fps_config;
begin
  select * into strict cfg from fps_config where id=1;
  if u is not null then
    u := public._fps_user();
    select id into mine from fps_matches where status in ('WAITING','FUNDED') and (creator_id=u or opponent_id=u)
      order by created_at desc limit 1;
  end if;
  return jsonb_build_object('enabled',cfg.enabled,'cash_enabled',cfg.cash_enabled,
    'practice_allowed',cfg.practice_allowed,'stakes',to_jsonb(cfg.stakes),'fee_bps',cfg.fee_bps,
    'region',cfg.region,'mine',public._fps_json(mine,u),'live',coalesce((
      select jsonb_agg(jsonb_build_object('id',m.id,'creator_id',m.creator_id,'opponent_id',m.opponent_id,
        'username',p.username,'stake',m.stake,'best_of',m.best_of,'private',false,'status',m.status)
        order by m.funded_at desc,m.id)
      from (select * from fps_matches where status='FUNDED' and not private and not result_recorded and expires_at>clock_timestamp()
        order by funded_at desc,id limit 20) m join profiles p on p.id=m.creator_id),'[]'::jsonb),'open',coalesce((
      select jsonb_agg(jsonb_build_object('id',m.id,'creator_id',m.creator_id,'opponent_id',null,
        'username',p.username,'stake',m.stake,'best_of',m.best_of,'private',false,'status',m.status,
        'fee_bps',m.fee_bps,'expires_at',m.expires_at) order by m.created_at,m.id)
      from (select * from fps_matches where status='WAITING' and not private and expires_at>clock_timestamp()
        order by created_at,id limit 100) m join profiles p on p.id=m.creator_id),'[]'::jsonb));
end $$;

create function public.fps_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.rating desc,t.played desc,t.id),'[]'::jsonb)
    from (select r.user_id as id,p.username,r.rating,r.played,r.wins from fps_ratings r
      join profiles p on p.id=r.user_id order by r.rating desc,r.played desc,r.user_id limit 20) t;
$$;

-- Explicit ACLs in the same transaction: no transient PUBLIC definer endpoints.
revoke all on function public._fps_validate_result(public.fps_matches,uuid,int,int,text,text),
  public.fps_record_result(uuid,uuid,int,int,text,text),public._fps_match_guard(),public._fps_user(),public._fps_terms(uuid,bigint,int),public._fps_json(uuid,uuid),
  public._fps_debit(uuid,uuid,int,text),public._fps_refund(uuid,text),public.fps_lobby(),public.fps_stats(),
  public.fps_view(uuid),public.fps_invite_preview(uuid,text),public.fps_enter(bigint,int,text,boolean,text),public.fps_join(uuid,text,text),
  public.fps_cancel(uuid),public.fps_rematch(uuid,text),public.fps_finish(uuid,uuid,int,int,text,text),public.fps_expire(int),public.fps_reconcile(int)
  from public,anon,authenticated,service_role;
grant execute on function public.fps_lobby(),public.fps_stats() to anon,authenticated;
grant execute on function public.fps_view(uuid) to authenticated,service_role;
grant execute on function public.fps_invite_preview(uuid,text),public.fps_enter(bigint,int,text,boolean,text),public.fps_join(uuid,text,text),
  public.fps_cancel(uuid),public.fps_rematch(uuid,text) to authenticated;
grant execute on function public.fps_record_result(uuid,uuid,int,int,text,text),public.fps_finish(uuid,uuid,int,int,text,text),public.fps_expire(int),public.fps_reconcile(int) to service_role;
commit;

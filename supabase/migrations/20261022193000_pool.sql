-- PVP 8-ball. Stakes use the existing USD ledger (available -> locked).
-- The winner is not drawn. Settlement pays the seat named by the published
-- ruleset after the shot list is replayed. This migration only records that
-- result and moves the same cents: pot = payout + fee, or a full refund.

alter type public.tx_kind add value if not exists 'pool_entry';
alter type public.tx_kind add value if not exists 'pool_settlement';
alter type public.tx_kind add value if not exists 'pool_refund';

alter table public.audit_logs drop constraint if exists audit_logs_game_type_check;
alter table public.audit_logs add constraint audit_logs_game_type_check
  check (game_type = any (array['jackpot'::text, 'coinflip'::text, 'roulette'::text, 'slot'::text, 'pool'::text]));

create table public.pool_config (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  fee_bps int not null default 500 check (fee_bps >= 0 and fee_bps <= 1000),
  stakes int[] not null default '{100,200,500,1000,2500,5000}',
  shot_seconds int not null default 30,
  reconnect_seconds int not null default 45,
  waiting_seconds int not null default 180,
  starting_seconds int not null default 30,
  both_gone_seconds int not null default 180,
  create_rate_limit int not null default 8,
  create_rate_window_seconds int not null default 600,
  max_waiting int not null default 3
);
insert into public.pool_config (id) values (1);
alter table public.pool_config enable row level security;
grant select on public.pool_config to anon, authenticated;

create table public.pool_matches (
  id bigint generated always as identity primary key,
  status text not null check (status in ('WAITING','STARTING','PLAYING','COMPLETED','CANCELLED')),
  creator_id uuid not null references public.profiles(id),
  opponent_id uuid references public.profiles(id),
  stake bigint not null check (stake > 0),
  pot bigint not null check (pot > 0),
  fee_bps int not null,
  fee_amount bigint,
  payout_amount bigint,
  asset text not null,
  account_type text not null,
  server_seed_hash text not null,
  state jsonb,
  state_hash text,
  turn_deadline timestamptz,
  seen_a timestamptz,
  seen_b timestamptz,
  grace_until timestamptz,
  grace_seat text,
  grace_shot int,
  winner_id uuid,
  win_reason text,
  version int not null default 0,
  phase_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  cancel_reason text,
  check (creator_id is distinct from opponent_id)
);
create index pool_matches_open on public.pool_matches (status, stake, id);
create index pool_matches_player on public.pool_matches (creator_id, status);
create index pool_matches_opponent on public.pool_matches (opponent_id, status);

create table public.pool_secrets (
  match_id bigint primary key references public.pool_matches(id),
  server_seed bytea not null check (octet_length(server_seed) = 32)
);

create table public.pool_entries (
  match_id bigint not null references public.pool_matches(id),
  user_id uuid not null references public.profiles(id),
  slot smallint not null check (slot in (1, 2)),
  amount bigint not null check (amount > 0),
  ledger_tx_id uuid not null,
  idempotency_key text not null,
  primary key (match_id, slot),
  unique (user_id, idempotency_key)
);

create table public.pool_events (
  match_id bigint not null references public.pool_matches(id),
  seq int not null check (seq > 0),
  kind text not null check (kind in ('shot','timeout','forfeit')),
  seat text not null check (seat in ('A','B')),
  input jsonb,
  state_hash text not null,
  event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  primary key (match_id, seq)
);

create table public.pool_pending (
  id bigint generated always as identity primary key,
  match_id bigint not null unique references public.pool_matches(id),
  seq int not null,
  user_id uuid not null,
  idempotency_key text not null,
  input jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);

create table public.pool_payouts (
  match_id bigint not null references public.pool_matches(id),
  kind text not null check (kind in ('WIN','REFUND')),
  idempotency_key text not null unique,
  beneficiary_id uuid,
  amount bigint not null check (amount >= 0),
  fee bigint not null default 0 check (fee >= 0),
  ledger_tx_id uuid not null,
  settled_at timestamptz not null default clock_timestamp(),
  primary key (match_id, kind, beneficiary_id)
);

create table public.pool_ratings (
  user_id uuid primary key references public.profiles(id),
  rating int not null default 1000,
  games int not null default 0,
  wins int not null default 0
);

alter table public.pool_matches enable row level security;
alter table public.pool_secrets enable row level security;
alter table public.pool_entries enable row level security;
alter table public.pool_events enable row level security;
alter table public.pool_pending enable row level security;
alter table public.pool_payouts enable row level security;
alter table public.pool_ratings enable row level security;

create policy pool_matches_read on public.pool_matches for select to anon, authenticated using (true);
create policy pool_events_read on public.pool_events for select to anon, authenticated using (true);
create policy pool_ratings_read on public.pool_ratings for select to anon, authenticated using (true);
create policy pool_payouts_read on public.pool_payouts for select to anon, authenticated using (true);

grant select on public.pool_matches, public.pool_events, public.pool_ratings, public.pool_payouts to anon, authenticated;
revoke all on public.pool_secrets, public.pool_entries, public.pool_pending from public, anon, authenticated;
grant all on public.pool_matches, public.pool_secrets, public.pool_entries, public.pool_events,
  public.pool_pending, public.pool_payouts, public.pool_ratings to service_role;

create trigger pool_secrets_immutable before update or delete on public.pool_secrets
  for each row execute function public._immutable();
create trigger pool_events_immutable before update or delete on public.pool_events
  for each row execute function public._immutable();

alter publication supabase_realtime add table public.pool_matches;

create or replace function public._pool_audit(p_actor uuid, p_action text, p_match bigint, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, action, game_id, details, game_type)
  values (p_actor, p_action, p_match, coalesce(p_details, '{}'::jsonb), 'pool')
$$;

-- numeric division rounds. div() is the integer quotient, which matches the
-- 64-bit FNV step in src/lib/pool/rules.ts.
create or replace function public.pool_xor64(a numeric, b numeric) returns numeric
language plpgsql immutable set search_path = public as $$
declare r numeric := 0; bit numeric := 1; i int; aa numeric := a; bb numeric := b; da int; db int;
begin
  if aa < 0 or bb < 0 then raise exception 'XOR_RANGE'; end if;
  for i in 1..64 loop
    da := mod(aa, 2)::int;
    db := mod(bb, 2)::int;
    if da <> db then r := r + bit; end if;
    aa := div(aa, 2);
    bb := div(bb, 2);
    bit := bit * 2;
  end loop;
  return r;
end $$;

create or replace function public.pool_fnv(p text) returns text
language plpgsql immutable set search_path = public as $$
declare
  h numeric := '14695981039346656037'::numeric;
  prime numeric := 1099511628211;
  mask numeric := '18446744073709551616'::numeric;
  i int;
  hex text := '';
  d int;
begin
  for i in 1..length(p) loop
    h := public.pool_xor64(h, ascii(substr(p, i, 1)));
    h := mod(h * prime, mask);
  end loop;
  for i in 1..16 loop
    d := mod(h, 16)::int;
    hex := substr('0123456789abcdef', d + 1, 1) || hex;
    h := div(h, 16);
  end loop;
  return hex;
end $$;

-- Same text as stateCanon() in src/lib/pool/rules.ts.
create or replace function public.pool_state_canon(p jsonb) returns text
language plpgsql immutable set search_path = public as $$
declare
  ball jsonb;
  parts text := '';
  first boolean := true;
begin
  for ball in select value from jsonb_array_elements(p->'balls') loop
    if not first then parts := parts || '|'; end if;
    first := false;
    parts := parts || (ball->>'id') || ':' || (ball->>'x') || ':' || (ball->>'y') || ':' ||
      case when (ball->>'pocketed') = 'true' then '1' else '0' end;
  end loop;
  return parts || '#' || concat_ws(':',
    p->>'turn',
    case when (p->>'open') = 'true' then '1' else '0' end,
    coalesce(p->>'groupA', '-'),
    case when (p->>'ballInHand') = 'true' then '1' else '0' end,
    case when (p->>'kitchenOnly') = 'true' then '1' else '0' end,
    case when (p->>'breakShot') = 'true' then '1' else '0' end,
    coalesce(p->>'winner', '-'),
    coalesce(p->>'reason', '-'),
    coalesce(p->>'shot', '0'),
    coalesce(p->'timeouts'->>'A', '0'),
    coalesce(p->'timeouts'->>'B', '0')
  );
end $$;

create or replace function public.pool_state_hash(p jsonb) returns text
language sql immutable set search_path = public as $$
  select public.pool_fnv(public.pool_state_canon(p))
$$;

create or replace function public.pool_expected_milli(diff int) returns int
language plpgsql immutable set search_path = public as $$
begin
  if diff >= 800 then return 10; end if;
  if diff >= 400 then return 91; end if;
  if diff >= 200 then return 240; end if;
  if diff >= 100 then return 359; end if;
  if diff >= 0 then return 500 - diff * 141 / 100; end if;
  return 1000 - public.pool_expected_milli(-diff);
end $$;

create or replace function public._pool_guard() returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prof public.profiles; cfg public.pool_config;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > clock_timestamp() then
    raise exception 'SELF_EXCLUDED';
  end if;
  select * into cfg from pool_config;
  if not cfg.enabled or not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  perform pg_advisory_xact_lock(hashtext('pool-user:' || uid::text));
  if exists (
    select 1 from pool_matches
    where status in ('STARTING','PLAYING') and (creator_id = uid or opponent_id = uid)
  ) then raise exception 'ALREADY_IN_MATCH'; end if;
  return uid;
end $$;

create or replace function public._pool_debit(p_user uuid, p_match bigint, p_slot int, p_amount bigint, p_key text, p_asset text, p_type text)
returns void language plpgsql security definer set search_path = public as $$
declare avail uuid; locked uuid; bal bigint; elig bigint; tx uuid; bonus_part bigint;
begin
  avail := public._user_account(p_user, 'user_available', p_asset, p_type);
  locked := public._user_account(p_user, 'user_locked', p_asset, p_type);
  if avail is null or locked is null then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public._coinflip_lock_wallets(array[p_user], p_asset, p_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;
  if p_type = 'real' then
    perform public._withdraw_basis_sync();
    select eligible into elig from withdraw_basis_bucket where user_id = p_user;
    if coalesce(elig, 0) < p_amount then raise exception 'CASH_ONLY_BUY_IN'; end if;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('pool_entry', 'pool:' || p_match || ':entry:' || p_slot, p_type, p_user, p_match, 'Pool stake')
    returning id into tx;
  perform public._post(tx, avail, -p_amount);
  perform public._post(tx, locked, p_amount);
  if p_type = 'real' then
    perform public._withdraw_basis_sync();
    select bonus into bonus_part from withdraw_basis_ledger_stake where ledger_tx_id = tx;
    if bonus_part is null or bonus_part <> 0 then raise exception 'CASH_ONLY_BUY_IN'; end if;
  end if;
  insert into pool_entries (match_id, user_id, slot, amount, ledger_tx_id, idempotency_key)
    values (p_match, p_user, p_slot, p_amount, tx, p_key);
end $$;

create or replace function public._pool_refund(p_match bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; tx uuid; e record; ids uuid[];
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status not in ('WAITING','STARTING') then raise exception 'MATCH_NOT_CANCELLABLE'; end if;
  if exists (select 1 from pool_payouts where match_id = g.id) then return; end if;
  select coalesce(array_agg(user_id order by user_id), '{}') into ids from pool_entries where match_id = g.id;
  perform public._coinflip_lock_wallets(ids, g.asset, g.account_type);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('pool_refund', 'pool:' || g.id || ':refund', g.account_type, null, g.id, 'Pool refund')
    returning id into tx;
  for e in select * from pool_entries where match_id = g.id order by user_id loop
    perform public._post(tx, public._user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
    perform public._post(tx, public._user_account(e.user_id, 'user_available', g.asset, g.account_type), e.amount);
    insert into pool_payouts (match_id, kind, idempotency_key, beneficiary_id, amount, fee, ledger_tx_id)
      values (g.id, 'REFUND', 'pool:' || g.id || ':refund:' || e.user_id, e.user_id, e.amount, 0, tx);
  end loop;
  update pool_matches set status = 'CANCELLED', cancel_reason = p_reason, completed_at = clock_timestamp(),
    phase_at = clock_timestamp(), version = version + 1 where id = g.id;
  perform public._pool_audit(null, 'POOL_REFUNDED', g.id, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public._pool_rate(p_user uuid, p_winner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ra int; rb int; exp int; loser uuid; nw int; nl int;
begin
  loser := case when p_user = p_winner then null else p_user end;
  if loser is null then
    select case when creator_id = p_winner then opponent_id else creator_id end into loser
      from pool_matches where winner_id = p_winner order by id desc limit 1;
  end if;
  select coalesce(rating, 1000) into ra from pool_ratings where user_id = p_winner;
  select coalesce(rating, 1000) into rb from pool_ratings where user_id = loser;
  ra := coalesce(ra, 1000);
  rb := coalesce(rb, 1000);
  exp := public.pool_expected_milli(rb - ra);
  nw := ra + (24 * (1000 - exp)) / 1000;
  nl := rb + (24 * (0 - (1000 - exp))) / 1000;
  insert into pool_ratings (user_id, rating, games, wins) values (p_winner, nw, 1, 1)
    on conflict (user_id) do update set rating = nw, games = pool_ratings.games + 1, wins = pool_ratings.wins + 1;
  insert into pool_ratings (user_id, rating, games, wins) values (loser, nl, 1, 0)
    on conflict (user_id) do update set rating = nl, games = pool_ratings.games + 1;
end $$;

create or replace function public._pool_settle(p_match bigint, p_winner uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; pot bigint; fee bigint; payout bigint; tx uuid; e record; ids uuid[]; other_id uuid;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status = 'COMPLETED' then return; end if;
  if g.status <> 'PLAYING' then raise exception 'MATCH_NOT_LIVE'; end if;
  if p_winner is null or (p_winner <> g.creator_id and p_winner <> g.opponent_id) then
    raise exception 'WINNER_NOT_SEATED';
  end if;
  select coalesce(sum(amount), 0) into pot from pool_entries where match_id = g.id;
  if pot <> g.stake * 2 then raise exception 'POT_MISMATCH'; end if;
  fee := (pot * g.fee_bps) / 10000;
  payout := pot - fee;
  if payout + fee <> pot or payout < 0 or fee < 0 then raise exception 'FEE_MISMATCH'; end if;
  select coalesce(array_agg(user_id order by user_id), '{}') into ids from pool_entries where match_id = g.id;
  perform public._coinflip_lock_wallets(ids, g.asset, g.account_type);
  perform public._lock_system_accounts(array['house_revenue']::public.account_kind[], g.asset, g.account_type);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('pool_settlement', 'pool:' || g.id || ':settlement', g.account_type, p_winner, g.id, 'Pool settlement')
    returning id into tx;
  for e in select * from pool_entries where match_id = g.id order by user_id loop
    perform public._post(tx, public._user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
  end loop;
  perform public._post(tx, public._user_account(p_winner, 'user_available', g.asset, g.account_type), payout);
  if fee > 0 then
    perform public._post(tx, public._system_account('house_revenue', g.asset, g.account_type), fee);
  end if;
  insert into pool_payouts (match_id, kind, idempotency_key, beneficiary_id, amount, fee, ledger_tx_id)
    values (g.id, 'WIN', 'pool:' || g.id || ':win', p_winner, payout, fee, tx);
  other_id := case when g.creator_id = p_winner then g.opponent_id else g.creator_id end;
  update pool_matches set status = 'COMPLETED', winner_id = p_winner, win_reason = p_reason,
    fee_amount = fee, payout_amount = payout, completed_at = clock_timestamp(), phase_at = clock_timestamp(),
    version = version + 1, turn_deadline = null
    where id = g.id;
  perform public._pool_rate(p_winner, p_winner);
  if (
    select count(*) from pool_matches
    where status = 'COMPLETED' and completed_at > clock_timestamp() - interval '24 hours'
      and ((creator_id = g.creator_id and opponent_id = g.opponent_id)
        or (creator_id = g.opponent_id and opponent_id = g.creator_id))
  ) >= 6 then
    perform public._pool_audit(null, 'PAIR_REVIEW', g.id, jsonb_build_object('a', g.creator_id, 'b', g.opponent_id));
  end if;
  perform public._pool_audit(null, 'POOL_SETTLED', g.id, jsonb_build_object(
    'winner', p_winner, 'loser', other_id, 'reason', p_reason, 'pot', pot, 'fee', fee, 'payout', payout, 'ledger_tx', tx));
end $$;

create or replace function public.pool_matchmake(p_stake bigint, p_key text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid; cfg public.pool_config; dom public.money_domain_config; g public.pool_matches;
  existing record; seed bytea; ts timestamptz := clock_timestamp(); open_id bigint;
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  uid := public._pool_guard();
  select * into existing from pool_entries where user_id = uid and idempotency_key = p_key;
  if found then
    return jsonb_build_object('duplicate', true, 'match_id', existing.match_id,
      'role', case when existing.slot = 1 then 'created' else 'joined' end);
  end if;
  select * into cfg from pool_config;
  select * into dom from money_domain_config;
  if p_stake is null or not (p_stake = any (cfg.stakes)) then raise exception 'STAKE_NOT_ALLOWED'; end if;
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

create or replace function public.pool_cancel(p_match bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.pool_matches;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.creator_id <> uid or g.status <> 'WAITING' then raise exception 'FORBIDDEN'; end if;
  perform public._pool_refund(g.id, 'CREATOR_CANCELLED');
  return jsonb_build_object('cancelled', true, 'match_id', g.id);
end $$;

create or replace function public.pool_read_secret(p_match bigint) returns text
language plpgsql security definer set search_path = public as $$
declare s bytea; st text;
begin
  select status into st from pool_matches where id = p_match;
  if st is null or st not in ('STARTING','PLAYING','COMPLETED','CANCELLED') then
    raise exception 'SEED_HIDDEN';
  end if;
  select server_seed into s from pool_secrets where match_id = p_match;
  if s is null then raise exception 'SEED_MISSING'; end if;
  return encode(s, 'hex');
end $$;

create or replace function public.pool_begin(p_match bigint, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; cfg public.pool_config; h text;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status = 'PLAYING' and g.state is not null then
    return jsonb_build_object('duplicate', true, 'match_id', g.id);
  end if;
  if g.status <> 'STARTING' or g.opponent_id is null then raise exception 'MATCH_NOT_STARTING'; end if;
  if p_state->>'turn' <> 'A' or (p_state->>'shot')::int <> 0 or p_state->>'winner' is not null then
    raise exception 'BAD_RACK';
  end if;
  if jsonb_array_length(p_state->'balls') <> 16 then raise exception 'BAD_RACK'; end if;
  h := public.pool_state_hash(p_state);
  select * into cfg from pool_config;
  update pool_matches set status = 'PLAYING', state = p_state, state_hash = h, phase_at = clock_timestamp(),
    seen_a = clock_timestamp(), seen_b = clock_timestamp(),
    turn_deadline = clock_timestamp() + make_interval(secs => cfg.shot_seconds),
    version = version + 1
    where id = g.id;
  perform public._pool_audit(null, 'POOL_STARTED', g.id, jsonb_build_object('state_hash', h));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'state_hash', h);
end $$;

create or replace function public.pool_refund_starting(p_match bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._pool_refund(p_match, 'START_FAILED');
end $$;

create or replace function public._pool_seat(g public.pool_matches, p_user uuid) returns text
language sql immutable set search_path = public as $$
  select case
    when p_user = g.creator_id then 'A'
    when p_user = g.opponent_id then 'B'
    else null
  end
$$;

create or replace function public._pool_user_for_seat(g public.pool_matches, p_seat text) returns uuid
language sql immutable set search_path = public as $$
  select case p_seat when 'A' then g.creator_id when 'B' then g.opponent_id else null end
$$;

create or replace function public.pool_prepare_shot(p_match bigint, p_input jsonb, p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.pool_matches; seat text; pend public.pool_pending; seq int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  seat := public._pool_seat(g, uid);
  if seat is null then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from pool_events where match_id = g.id and event->>'key' = p_key) then
    return jsonb_build_object('duplicate', true, 'match_id', g.id);
  end if;
  if g.status <> 'PLAYING' or g.state is null then raise exception 'MATCH_NOT_LIVE'; end if;
  if g.state->>'winner' is not null then raise exception 'MATCH_FINISHED'; end if;
  if g.state->>'turn' <> seat then raise exception 'NOT_YOUR_TURN'; end if;
  if g.turn_deadline < clock_timestamp() then raise exception 'TURN_EXPIRED'; end if;
  if (p_input->>'angleMilli')::int is null or (p_input->>'angleMilli')::int < 0 or (p_input->>'angleMilli')::int > 359999 then
    raise exception 'BAD_SHOT';
  end if;
  if (p_input->>'power')::int is null or (p_input->>'power')::int < 1 or (p_input->>'power')::int > 10000 then
    raise exception 'BAD_SHOT';
  end if;
  if (p_input->>'spinX') is null or (p_input->>'spinY') is null
     or (p_input->>'spinX')::int < -1000 or (p_input->>'spinX')::int > 1000
     or (p_input->>'spinY')::int < -1000 or (p_input->>'spinY')::int > 1000 then
    raise exception 'BAD_SHOT';
  end if;
  if p_input->>'calledPocket' is not null
     and ((p_input->>'calledPocket')::int < 0 or (p_input->>'calledPocket')::int > 5) then
    raise exception 'BAD_SHOT';
  end if;
  select * into pend from pool_pending where match_id = g.id;
  if found and pend.created_at > clock_timestamp() - interval '8 seconds' then
    raise exception 'SHOT_IN_PROGRESS';
  end if;
  delete from pool_pending where match_id = g.id;
  seq := coalesce((g.state->>'shot')::int, 0) + 1;
  insert into pool_pending (match_id, seq, user_id, idempotency_key, input)
    values (g.id, seq, uid, p_key, p_input || jsonb_build_object('key', p_key));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'seq', seq, 'seat', seat, 'state', g.state);
end $$;

create or replace function public.pool_abort_shot(p_match bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from pool_pending where match_id = p_match;
end $$;

create or replace function public.pool_commit_shot(p_match bigint, p_seq int, p_state jsonb, p_hash text, p_event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; pend public.pool_pending; cfg public.pool_config; winner uuid; reason text;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if g.status = 'COMPLETED' then return jsonb_build_object('duplicate', true, 'match_id', g.id); end if;
  select * into pend from pool_pending where match_id = g.id and seq = p_seq;
  if not found then raise exception 'NO_PENDING_SHOT'; end if;
  if public.pool_state_hash(p_state) <> p_hash then raise exception 'HASH_MISMATCH'; end if;
  if (p_state->>'shot')::int <> p_seq then raise exception 'BAD_STATE'; end if;
  reason := p_state->>'reason';
  insert into pool_events (match_id, seq, kind, seat, input, state_hash, event)
    values (g.id, p_seq, 'shot', public._pool_seat(g, pend.user_id), pend.input, p_hash,
      coalesce(p_event, '{}'::jsonb) || jsonb_build_object('key', pend.idempotency_key));
  delete from pool_pending where id = pend.id;
  select * into cfg from pool_config;
  if p_state->>'winner' is null then
    update pool_matches set state = p_state, state_hash = p_hash, version = version + 1,
      grace_until = null, grace_seat = null,
      turn_deadline = clock_timestamp() + make_interval(secs => cfg.shot_seconds),
      seen_a = case when public._pool_seat(g, pend.user_id) = 'A' then clock_timestamp() else seen_a end,
      seen_b = case when public._pool_seat(g, pend.user_id) = 'B' then clock_timestamp() else seen_b end
      where id = g.id;
    return jsonb_build_object('duplicate', false, 'match_id', g.id, 'winner', null);
  end if;
  winner := public._pool_user_for_seat(g, p_state->>'winner');
  update pool_matches set state = p_state, state_hash = p_hash where id = g.id;
  perform public._pool_settle(g.id, winner, coalesce(reason, 'SHOT'));
  return jsonb_build_object('duplicate', false, 'match_id', g.id, 'winner', p_state->>'winner', 'reason', reason);
end $$;

create or replace function public._pool_log_timeout(p_match bigint) returns void
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; seat text; n int; st jsonb; opp text; cfg public.pool_config; h text; seq int; winner uuid;
begin
  select * into g from pool_matches where id = p_match for update;
  if g.status <> 'PLAYING' or g.state is null or g.state->>'winner' is not null then return; end if;
  seat := g.state->>'turn';
  n := coalesce((g.state->'timeouts'->>seat)::int, 0) + 1;
  opp := case seat when 'A' then 'B' else 'A' end;
  st := g.state;
  st := jsonb_set(st, array['timeouts', seat], to_jsonb(n));
  st := jsonb_set(st, '{ballInHand}', 'true'::jsonb);
  st := jsonb_set(st, '{kitchenOnly}', 'false'::jsonb);
  st := jsonb_set(st, '{breakShot}', 'false'::jsonb);
  seq := coalesce((st->>'shot')::int, 0) + 1;
  st := jsonb_set(st, '{shot}', to_jsonb(seq));
  st := jsonb_set(st, '{turn}', to_jsonb(opp));
  if n >= 3 then
    st := jsonb_set(st, '{winner}', to_jsonb(opp));
    st := jsonb_set(st, '{reason}', '"TIMEOUT_FORFEIT"'::jsonb);
    st := jsonb_set(st, '{ballInHand}', 'false'::jsonb);
  end if;
  h := public.pool_state_hash(st);
  insert into pool_events (match_id, seq, kind, seat, input, state_hash, event)
    values (g.id, seq, 'timeout', seat, null, h, jsonb_build_object('timeouts', n));
  select * into cfg from pool_config;
  if n >= 3 then
    update pool_matches set state = st, state_hash = h, grace_until = null, grace_seat = null where id = g.id;
    winner := public._pool_user_for_seat(g, opp);
    perform public._pool_settle(g.id, winner, 'TIMEOUT_FORFEIT');
  else
    update pool_matches set state = st, state_hash = h, version = version + 1, grace_until = null, grace_seat = null,
      turn_deadline = clock_timestamp() + make_interval(secs => cfg.shot_seconds)
      where id = g.id;
  end if;
end $$;

create or replace function public.pool_forfeit_seat(p_match bigint, p_seat text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; opp text; st jsonb; h text; seq int; winner uuid;
begin
  if p_seat not in ('A','B') then raise exception 'BAD_SEAT'; end if;
  select * into g from pool_matches where id = p_match for update;
  if g.status <> 'PLAYING' or g.state is null or g.state->>'winner' is not null then return; end if;
  opp := case p_seat when 'A' then 'B' else 'A' end;
  st := g.state;
  seq := coalesce((st->>'shot')::int, 0) + 1;
  st := jsonb_set(st, '{shot}', to_jsonb(seq));
  st := jsonb_set(st, '{winner}', to_jsonb(opp));
  st := jsonb_set(st, '{reason}', '"FORFEIT"'::jsonb);
  st := jsonb_set(st, '{turn}', to_jsonb(opp));
  st := jsonb_set(st, '{ballInHand}', 'false'::jsonb);
  st := jsonb_set(st, '{kitchenOnly}', 'false'::jsonb);
  h := public.pool_state_hash(st);
  insert into pool_events (match_id, seq, kind, seat, input, state_hash, event)
    values (g.id, seq, 'forfeit', p_seat, null, h, jsonb_build_object('by', p_seat));
  update pool_matches set state = st, state_hash = h where id = g.id;
  winner := public._pool_user_for_seat(g, opp);
  perform public._pool_settle(g.id, winner, 'FORFEIT');
end $$;

create or replace function public.pool_forfeit(p_match bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.pool_matches; seat text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into g from pool_matches where id = p_match;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  seat := public._pool_seat(g, uid);
  if seat is null then raise exception 'FORBIDDEN'; end if;
  perform public.pool_forfeit_seat(g.id, seat);
  return jsonb_build_object('forfeited', true, 'match_id', g.id);
end $$;

create or replace function public.pool_touch(p_match bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.pool_matches; seat text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into g from pool_matches where id = p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  seat := public._pool_seat(g, uid);
  if seat is null then raise exception 'FORBIDDEN'; end if;
  update pool_matches set
    seen_a = case when seat = 'A' then clock_timestamp() else seen_a end,
    seen_b = case when seat = 'B' then clock_timestamp() else seen_b end,
    grace_until = case when grace_seat = seat then null else grace_until end,
    grace_seat = case when grace_seat = seat then null else grace_seat end
    where id = g.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public._pool_tick_one(p_match bigint) returns text
language plpgsql security definer set search_path = public as $$
declare g public.pool_matches; cfg public.pool_config; seat text; seen timestamptz; shots int;
begin
  select * into g from pool_matches where id = p_match for update;
  if not found then return 'missing'; end if;
  select * into cfg from pool_config;
  if g.status = 'WAITING' and g.expires_at <= clock_timestamp() then
    perform public._pool_refund(g.id, 'WAITING_EXPIRED');
    return 'refunded';
  end if;
  if g.status = 'STARTING' and g.phase_at <= clock_timestamp() - make_interval(secs => cfg.starting_seconds) then
    perform public._pool_refund(g.id, 'START_TIMEOUT');
    return 'refunded';
  end if;
  if g.status <> 'PLAYING' or g.state is null or g.state->>'winner' is not null then return 'idle'; end if;
  shots := coalesce((g.state->>'shot')::int, 0);
  if g.seen_a <= clock_timestamp() - make_interval(secs => cfg.both_gone_seconds)
     and g.seen_b <= clock_timestamp() - make_interval(secs => cfg.both_gone_seconds) then
    if shots = 0 then
      update pool_matches set status = 'STARTING' where id = g.id;
      perform public._pool_refund(g.id, 'BOTH_LEFT_BEFORE_BREAK');
      return 'refunded';
    end if;
    -- Inaction is a rules result, not a house pick: the seat that had the table loses.
    perform public.pool_forfeit_seat(g.id, g.state->>'turn');
    return 'forfeit_absent';
  end if;
  if g.turn_deadline is null or g.turn_deadline > clock_timestamp() then return 'waiting'; end if;
  seat := g.state->>'turn';
  seen := case seat when 'A' then g.seen_a else g.seen_b end;
  -- One reconnect window per shot. Coming back does not start a new shot clock,
  -- and a second drop on the same shot is a timeout.
  if seen < clock_timestamp() - interval '15 seconds' and g.grace_until is null
     and g.grace_shot is distinct from shots then
    update pool_matches set grace_until = clock_timestamp() + make_interval(secs => cfg.reconnect_seconds),
      grace_seat = seat, grace_shot = shots,
      turn_deadline = clock_timestamp() + make_interval(secs => cfg.reconnect_seconds)
      where id = g.id;
    return 'grace';
  end if;
  if g.grace_until is not null and g.grace_until > clock_timestamp() then return 'grace'; end if;
  perform public._pool_log_timeout(g.id);
  return 'timeout';
end $$;

create or replace function public.pool_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not pg_try_advisory_xact_lock(hashtext('pool_tick')) then
    return jsonb_build_object('skipped', 'busy');
  end if;
  for r in
    select id from pool_matches
    where status in ('WAITING','STARTING','PLAYING')
    order by coalesce(turn_deadline, expires_at, phase_at), id
    limit 20
  loop
    perform public._pool_tick_one(r.id);
    n := n + 1;
  end loop;
  return jsonb_build_object('processed', n);
end $$;

create or replace function public.pool_nudge(p_match bigint) returns text
language plpgsql security definer set search_path = public as $$
begin
  return public._pool_tick_one(p_match);
end $$;

create or replace function public.pool_lobby() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'enabled', (select enabled from pool_config),
    'fee_bps', (select fee_bps from pool_config),
    'stakes', (select to_jsonb(stakes) from pool_config),
    'shot_seconds', (select shot_seconds from pool_config),
    'open', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'stake', m.stake, 'pot', m.pot, 'fee_bps', m.fee_bps,
        'expires_at', m.expires_at, 'username', p.username, 'avatar_url', p.avatar_url,
        'rating', coalesce(r.rating, 1000)
      ) order by m.id)
      from pool_matches m
      join profiles p on p.id = m.creator_id
      left join pool_ratings r on r.user_id = m.creator_id
      where m.status = 'WAITING' and m.expires_at > clock_timestamp()
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'stake', m.stake, 'pot', m.pot, 'fee_amount', m.fee_amount,
        'payout_amount', m.payout_amount, 'win_reason', m.win_reason, 'completed_at', m.completed_at,
        'winner', w.username, 'creator', c.username, 'opponent', o.username
      ) order by m.completed_at desc)
      from (
        select * from pool_matches where status = 'COMPLETED' order by completed_at desc limit 12
      ) m
      left join profiles w on w.id = m.winner_id
      left join profiles c on c.id = m.creator_id
      left join profiles o on o.id = m.opponent_id
    ), '[]'::jsonb)
  )
$$;

create or replace function public.pool_state(p_match bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g public.pool_matches; seed text;
begin
  select * into g from pool_matches where id = p_match;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  -- STARTING still has a refund if the table never opens. The seed stays hidden
  -- until the rack is the live match, so nobody can read it and walk away.
  if g.status in ('PLAYING', 'COMPLETED') then
    select encode(server_seed, 'hex') into seed from pool_secrets where match_id = g.id;
  end if;
  return jsonb_build_object(
    'id', g.id, 'status', g.status, 'stake', g.stake, 'pot', g.pot, 'fee_bps', g.fee_bps,
    'fee_amount', g.fee_amount, 'payout_amount', g.payout_amount,
    'creator_id', g.creator_id, 'opponent_id', g.opponent_id,
    'server_seed_hash', g.server_seed_hash, 'server_seed', seed,
    'state', g.state, 'state_hash', g.state_hash, 'turn_deadline', g.turn_deadline,
    'winner_id', g.winner_id, 'win_reason', g.win_reason, 'version', g.version,
    'server_now', clock_timestamp(), 'cancel_reason', g.cancel_reason,
    'creator', (select jsonb_build_object('username', username, 'avatar_url', avatar_url) from profiles where id = g.creator_id),
    'opponent', (select jsonb_build_object('username', username, 'avatar_url', avatar_url) from profiles where id = g.opponent_id),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'seq', e.seq, 'kind', e.kind, 'seat', e.seat, 'input', e.input, 'state_hash', e.state_hash, 'event', e.event
      ) order by e.seq)
      from pool_events e where e.match_id = g.id
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.pool_record(p_match bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.pool_state(p_match)
$$;

create or replace function public.slot_tick_with_poker() returns jsonb
language plpgsql security definer set search_path = public as $$
declare a jsonb; b jsonb; c jsonb;
begin
  a := public.slot_tick();
  begin
    b := public.poker_tick();
  exception when others then
    b := jsonb_build_object('error', left(sqlerrm, 300));
  end;
  begin
    c := public.pool_tick();
  exception when others then
    c := jsonb_build_object('error', left(sqlerrm, 300));
  end;
  return jsonb_build_object('slot', a, 'poker', b, 'pool', c);
end $$;

revoke all on function public.pool_matchmake(bigint, text) from public, anon;
revoke all on function public.pool_cancel(bigint) from public, anon;
revoke all on function public.pool_prepare_shot(bigint, jsonb, text) from public, anon;
revoke all on function public.pool_forfeit(bigint) from public, anon;
revoke all on function public.pool_touch(bigint) from public, anon;
revoke all on function public.pool_nudge(bigint) from public, anon;
revoke all on function public.pool_lobby(), public.pool_state(bigint), public.pool_record(bigint) from public;
grant execute on function public.pool_matchmake(bigint, text), public.pool_cancel(bigint),
  public.pool_prepare_shot(bigint, jsonb, text), public.pool_forfeit(bigint),
  public.pool_touch(bigint), public.pool_nudge(bigint)
  to authenticated;
grant execute on function public.pool_lobby(), public.pool_state(bigint), public.pool_record(bigint)
  to anon, authenticated;

revoke all on function public.pool_read_secret(bigint), public.pool_begin(bigint, jsonb),
  public.pool_refund_starting(bigint), public.pool_abort_shot(bigint),
  public.pool_commit_shot(bigint, int, jsonb, text, jsonb), public.pool_tick(),
  public.pool_forfeit_seat(bigint, text)
  from public, anon, authenticated;
grant execute on function public.pool_read_secret(bigint), public.pool_begin(bigint, jsonb),
  public.pool_refund_starting(bigint), public.pool_abort_shot(bigint),
  public.pool_commit_shot(bigint, int, jsonb, text, jsonb), public.pool_tick(),
  public.pool_forfeit_seat(bigint, text)
  to service_role;

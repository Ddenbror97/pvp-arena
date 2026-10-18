
create extension if not exists pgcrypto with schema extensions;

-- ========== ENUMS ==========
create type public.app_role as enum ('admin','moderator','user');
create type public.account_kind as enum ('user_available','user_locked','game_escrow','house_revenue','test_faucet');
create type public.tx_kind as enum ('test_credit_grant','jackpot_entry','jackpot_settlement','deposit','withdrawal','refund');
create type public.game_status as enum ('WAITING','ACTIVE','DRAWING','COMPLETED','CANCELLED');
create type public.payout_status as enum ('PENDING','SETTLED','FAILED');

-- ========== ROLES ==========
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ========== PROFILES ==========
create table public.profiles (
  id uuid primary key,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar_url text check (avatar_url is null or length(avatar_url) <= 500),
  age_confirmed_at timestamptz not null,
  self_excluded_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower on public.profiles (lower(username));
grant select (id, username, avatar_url, created_at) on public.profiles to anon, authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles public" on public.profiles for select to anon, authenticated using (true);

-- ========== CONFIG ==========
create table public.jackpot_config (
  id boolean primary key default true check (id),
  asset text not null default 'TEST_USD',
  account_type text not null default 'test_credit' check (account_type in ('test_credit','real')),
  real_money_enabled boolean not null default false check (real_money_enabled = false),
  min_entry bigint not null default 100 check (min_entry > 0),
  max_entry bigint not null default 1000000 check (max_entry >= min_entry),
  rake_bps int not null default 0 check (rake_bps between 0 and 1000),
  countdown_seconds int not null default 60,
  extension_seconds int not null default 10,
  max_duration_seconds int not null default 180,
  entry_rate_limit int not null default 5,
  entry_rate_window_seconds int not null default 10,
  test_grant_amount bigint not null default 100000,
  updated_at timestamptz not null default now()
);
insert into public.jackpot_config default values;
grant select on public.jackpot_config to anon, authenticated;
grant all on public.jackpot_config to service_role;
alter table public.jackpot_config enable row level security;
create policy "config public" on public.jackpot_config for select to anon, authenticated using (true);

-- ========== WALLET / LEDGER ==========
create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  kind public.account_kind not null,
  asset text not null default 'TEST_USD',
  account_type text not null default 'test_credit' check (account_type in ('test_credit','real')),
  balance bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint non_negative check (kind = 'test_faucet' or balance >= 0),
  constraint owner_matches_kind check ((kind in ('user_available','user_locked')) = (owner_id is not null))
);
create unique index wallet_user_acct on public.wallet_accounts (owner_id, kind, asset, account_type) where owner_id is not null;
create unique index wallet_system_acct on public.wallet_accounts (kind, asset, account_type) where owner_id is null;
grant select on public.wallet_accounts to authenticated;
grant all on public.wallet_accounts to service_role;
alter table public.wallet_accounts enable row level security;
create policy "own accounts" on public.wallet_accounts for select to authenticated using (owner_id = auth.uid());

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  kind public.tx_kind not null,
  idempotency_key text not null unique,
  account_type text not null default 'test_credit',
  user_id uuid,
  game_id bigint,
  memo text,
  created_at timestamptz not null default clock_timestamp()
);
create index ledger_tx_user on public.ledger_transactions (user_id, created_at desc);
grant select on public.ledger_transactions to authenticated;
grant all on public.ledger_transactions to service_role;
alter table public.ledger_transactions enable row level security;

create table public.ledger_postings (
  id bigint generated always as identity primary key,
  tx_id uuid not null references public.ledger_transactions(id),
  account_id uuid not null references public.wallet_accounts(id),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null,
  created_at timestamptz not null default clock_timestamp()
);
create index ledger_postings_account on public.ledger_postings (account_id, id desc);
create index ledger_postings_tx on public.ledger_postings (tx_id);
grant select on public.ledger_postings to authenticated;
grant all on public.ledger_postings to service_role;
alter table public.ledger_postings enable row level security;
create policy "own postings" on public.ledger_postings for select to authenticated
  using (exists (select 1 from public.wallet_accounts a where a.id = account_id and a.owner_id = auth.uid()));
create policy "own tx" on public.ledger_transactions for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.ledger_postings p join public.wallet_accounts a on a.id = p.account_id
    where p.tx_id = ledger_transactions.id and a.owner_id = auth.uid()));

-- Double-entry: postings of each tx must sum to zero (checked at commit)
create or replace function public._ledger_balanced() returns trigger language plpgsql set search_path = public as $$
begin
  if (select coalesce(sum(amount),0) from public.ledger_postings where tx_id = new.tx_id) <> 0 then
    raise exception 'LEDGER_UNBALANCED tx %', new.tx_id;
  end if;
  return null;
end $$;
create constraint trigger ledger_balanced after insert on public.ledger_postings
  deferrable initially deferred for each row execute function public._ledger_balanced();

-- ========== JACKPOT ==========
create table public.jackpot_games (
  id bigint generated always as identity primary key,
  status public.game_status not null default 'WAITING',
  asset text not null,
  account_type text not null,
  rake_bps int not null,
  min_entry bigint not null,
  max_entry bigint not null,
  countdown_seconds int not null,
  extension_seconds int not null,
  max_duration_seconds int not null,
  pot_amount bigint not null default 0 check (pot_amount >= 0),
  player_count int not null default 0 check (player_count >= 0),
  entry_count int not null default 0 check (entry_count >= 0),
  created_at timestamptz not null default clock_timestamp(),
  countdown_started_at timestamptz,
  scheduled_end_at timestamptz,
  max_end_at timestamptz,
  drawn_at timestamptz,
  completed_at timestamptz,
  protocol_version text not null default 'v1',
  draw_version int not null default 1,
  server_seed_hash text not null,
  server_seed text,
  winning_ticket bigint,
  draw_counter int,
  winner_id uuid,
  winner_total bigint,
  payout_amount bigint,
  rake_amount bigint,
  updated_at timestamptz not null default clock_timestamp(),
  constraint active_has_timer check (status not in ('ACTIVE','DRAWING','COMPLETED') or (scheduled_end_at is not null and max_end_at is not null and scheduled_end_at <= max_end_at)),
  constraint completed_has_result check (status <> 'COMPLETED' or (
    winner_id is not null and server_seed is not null and winning_ticket >= 0 and winning_ticket < pot_amount
    and winner_total > 0 and winner_total <= pot_amount and payout_amount + rake_amount = pot_amount)),
  constraint seed_hidden_until_done check (server_seed is null or status = 'COMPLETED')
);
create unique index jackpot_one_open_game on public.jackpot_games ((true)) where status in ('WAITING','ACTIVE');
create index jackpot_games_status on public.jackpot_games (status, scheduled_end_at);
create index jackpot_games_completed on public.jackpot_games (completed_at desc) where status = 'COMPLETED';
grant select on public.jackpot_games to anon, authenticated;
grant all on public.jackpot_games to service_role;
alter table public.jackpot_games enable row level security;
create policy "games public" on public.jackpot_games for select to anon, authenticated using (true);

create table public.jackpot_game_secrets (
  game_id bigint primary key references public.jackpot_games(id),
  server_seed bytea not null check (length(server_seed) = 32)
);
grant all on public.jackpot_game_secrets to service_role;
alter table public.jackpot_game_secrets enable row level security;

create table public.jackpot_entries (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references public.jackpot_games(id),
  user_id uuid not null references public.profiles(id),
  amount bigint not null check (amount > 0),
  ticket_start bigint not null check (ticket_start >= 0),
  ticket_end bigint not null,
  ledger_tx_id uuid not null unique references public.ledger_transactions(id),
  idempotency_key text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint ticket_range check (ticket_end = ticket_start + amount),
  unique (game_id, ticket_start),
  unique (game_id, ticket_end),
  unique (user_id, idempotency_key)
);
create index jackpot_entries_game on public.jackpot_entries (game_id, ticket_start);
create index jackpot_entries_user on public.jackpot_entries (user_id, created_at desc);
grant select on public.jackpot_entries to anon, authenticated;
grant all on public.jackpot_entries to service_role;
alter table public.jackpot_entries enable row level security;
create policy "entries public" on public.jackpot_entries for select to anon, authenticated using (true);

create table public.jackpot_players (
  game_id bigint not null references public.jackpot_games(id),
  user_id uuid not null references public.profiles(id),
  total_amount bigint not null check (total_amount > 0),
  entry_count int not null check (entry_count > 0),
  first_entry_at timestamptz not null,
  last_entry_at timestamptz not null,
  primary key (game_id, user_id)
);
grant select on public.jackpot_players to anon, authenticated;
grant all on public.jackpot_players to service_role;
alter table public.jackpot_players enable row level security;
create policy "players public" on public.jackpot_players for select to anon, authenticated using (true);

create table public.jackpot_payouts (
  game_id bigint primary key references public.jackpot_games(id),
  status public.payout_status not null default 'PENDING',
  attempts int not null default 0,
  last_error text,
  ledger_tx_id uuid unique references public.ledger_transactions(id),
  created_at timestamptz not null default clock_timestamp(),
  settled_at timestamptz
);
grant select on public.jackpot_payouts to anon, authenticated;
grant all on public.jackpot_payouts to service_role;
alter table public.jackpot_payouts enable row level security;
create policy "payouts public" on public.jackpot_payouts for select to anon, authenticated using (true);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  game_id bigint,
  details jsonb not null default '{}',
  created_at timestamptz not null default clock_timestamp()
);
create index audit_logs_game on public.audit_logs (game_id, id);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ========== IMMUTABILITY ==========
create or replace function public._immutable() returns trigger language plpgsql as $$
begin raise exception 'IMMUTABLE_RECORD %', tg_table_name; end $$;
create trigger no_mutation before update or delete on public.ledger_transactions for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.ledger_postings for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.jackpot_entries for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.audit_logs for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.jackpot_game_secrets for each row execute function public._immutable();

create or replace function public._game_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD jackpot_games'; end if;
  if old.status in ('COMPLETED','CANCELLED') then raise exception 'IMMUTABLE_RECORD completed game %', old.id; end if;
  if old.status = 'DRAWING' and new.status not in ('DRAWING','COMPLETED') then raise exception 'ILLEGAL_TRANSITION'; end if;
  if old.status = 'ACTIVE' and new.status not in ('ACTIVE','DRAWING') then raise exception 'ILLEGAL_TRANSITION'; end if;
  if old.status = 'WAITING' and new.status not in ('WAITING','ACTIVE','CANCELLED') then raise exception 'ILLEGAL_TRANSITION'; end if;
  if new.pot_amount < old.pot_amount then raise exception 'POT_DECREASE'; end if;
  if new.server_seed_hash <> old.server_seed_hash then raise exception 'COMMITMENT_CHANGED'; end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
create trigger game_guard before update or delete on public.jackpot_games for each row execute function public._game_guard();

-- ========== INTERNAL HELPERS ==========
create or replace function public._system_account(p_kind public.account_kind, p_asset text, p_type text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from wallet_accounts where owner_id is null and kind = p_kind and asset = p_asset and account_type = p_type;
  if v is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type) values (null, p_kind, p_asset, p_type)
      on conflict do nothing;
    select id into v from wallet_accounts where owner_id is null and kind = p_kind and asset = p_asset and account_type = p_type;
  end if;
  return v;
end $$;

create or replace function public._user_account(p_user uuid, p_kind public.account_kind, p_asset text, p_type text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from wallet_accounts where owner_id = p_user and kind = p_kind and asset = p_asset and account_type = p_type
$$;

create or replace function public._post(p_tx uuid, p_account uuid, p_amount bigint)
returns void language plpgsql security definer set search_path = public as $$
declare nb bigint;
begin
  update wallet_accounts set balance = balance + p_amount where id = p_account returning balance into nb;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  insert into ledger_postings (tx_id, account_id, amount, balance_after) values (p_tx, p_account, p_amount, nb);
end $$;

create or replace function public._audit(p_actor uuid, p_action text, p_game bigint, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, action, game_id, details) values (p_actor, p_action, p_game, coalesce(p_details,'{}'::jsonb))
$$;

-- ========== FAIRNESS (pure, deterministic, public) ==========
create or replace function public.jackpot_draw_ticket(p_seed bytea, p_game_id bigint, p_draw_version int, p_n bigint,
  out ticket bigint, out counter int)
language plpgsql immutable set search_path = public, extensions as $$
declare h bytea; r numeric; lim numeric; two64 numeric := 18446744073709551616; i int;
begin
  if p_n is null or p_n <= 0 then raise exception 'INVALID_RANGE'; end if;
  lim := floor(two64 / p_n) * p_n;
  counter := 0;
  loop
    h := extensions.hmac(convert_to('PVPCasino:jackpot:v1:' || p_game_id || ':' || p_draw_version || ':' || counter, 'UTF8'), p_seed, 'sha256');
    r := 0;
    for i in 0..7 loop r := r * 256 + get_byte(h, i); end loop;
    if r < lim then ticket := (r % p_n)::bigint; return; end if;
    counter := counter + 1;
    if counter > 1000 then raise exception 'DRAW_EXHAUSTED'; end if;
  end loop;
end $$;

-- ========== GAME CREATION ==========
create or replace function public._ensure_open_game() returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare gid bigint; c public.jackpot_config; seed bytea;
begin
  select id into gid from jackpot_games where status in ('WAITING','ACTIVE');
  if gid is not null then return gid; end if;
  perform pg_advisory_xact_lock(hashtext('pvp_jackpot_create'));
  select id into gid from jackpot_games where status in ('WAITING','ACTIVE');
  if gid is not null then return gid; end if;
  -- do not open a new game while one is still settling
  if exists (select 1 from jackpot_games where status = 'DRAWING') then return null; end if;
  select * into c from jackpot_config;
  seed := extensions.gen_random_bytes(32);
  insert into jackpot_games (asset, account_type, rake_bps, min_entry, max_entry, countdown_seconds, extension_seconds, max_duration_seconds, server_seed_hash)
  values (c.asset, c.account_type, c.rake_bps, c.min_entry, c.max_entry, c.countdown_seconds, c.extension_seconds, c.max_duration_seconds,
          encode(extensions.digest(seed, 'sha256'), 'hex'))
  returning id into gid;
  insert into jackpot_game_secrets (game_id, server_seed) values (gid, seed);
  perform _audit(null, 'game_created', gid, null);
  return gid;
end $$;

-- ========== PROFILE / ONBOARDING ==========
create or replace function public.ensure_profile(p_username text, p_age_confirmed boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.jackpot_config; tx uuid; avail uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from profiles where id = uid) then return jsonb_build_object('created', false); end if;
  if not coalesce(p_age_confirmed,false) then raise exception 'AGE_CONFIRMATION_REQUIRED'; end if;
  if p_username is null or p_username !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'INVALID_USERNAME'; end if;
  if exists (select 1 from profiles where lower(username) = lower(p_username)) then raise exception 'USERNAME_TAKEN'; end if;
  select * into c from jackpot_config;
  insert into profiles (id, username, avatar_url, age_confirmed_at)
    values (uid, p_username, 'https://api.dicebear.com/9.x/shapes/svg?seed=' || p_username, now());
  insert into wallet_accounts (owner_id, kind, asset, account_type) values
    (uid, 'user_available', c.asset, c.account_type), (uid, 'user_locked', c.asset, c.account_type);
  avail := _user_account(uid, 'user_available', c.asset, c.account_type);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('test_credit_grant', 'signup:' || uid, c.account_type, uid, 'Welcome test credits (no cash value)') returning id into tx;
  perform _post(tx, _system_account('test_faucet', c.asset, c.account_type), -c.test_grant_amount);
  perform _post(tx, avail, c.test_grant_amount);
  perform _audit(uid, 'profile_created', null, jsonb_build_object('username', p_username));
  return jsonb_build_object('created', true);
end $$;

create or replace function public.update_avatar(p_avatar_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_avatar_url is null or p_avatar_url !~ '^https://' or length(p_avatar_url) > 500 then raise exception 'INVALID_AVATAR'; end if;
  update profiles set avatar_url = p_avatar_url where id = auth.uid();
end $$;

create or replace function public.claim_test_credits()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.jackpot_config; tx uuid; key text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into c from jackpot_config;
  if c.account_type <> 'test_credit' then raise exception 'TEST_CREDITS_DISABLED'; end if;
  if not exists (select 1 from profiles where id = uid) then raise exception 'PROFILE_REQUIRED'; end if;
  key := 'faucet:' || uid || ':' || to_char(date_trunc('hour', now()), 'YYYYMMDDHH24');
  if exists (select 1 from ledger_transactions where idempotency_key = key) then raise exception 'FAUCET_COOLDOWN'; end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('test_credit_grant', key, c.account_type, uid, 'Hourly test credits (no cash value)') returning id into tx;
  perform _post(tx, _system_account('test_faucet', c.asset, c.account_type), -c.test_grant_amount);
  perform _post(tx, _user_account(uid, 'user_available', c.asset, c.account_type), c.test_grant_amount);
  return jsonb_build_object('amount', c.test_grant_amount);
end $$;

-- ========== JOIN ==========
create or replace function public.jackpot_join(p_amount bigint, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); g public.jackpot_games; c public.jackpot_config; prof public.profiles;
  e public.jackpot_entries; ts timestamptz; avail uuid; locked uuid; bal bigint; tx uuid;
  is_new boolean; extended boolean := false; started boolean := false; gid bigint;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  select * into e from jackpot_entries where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('duplicate', true, 'entry_id', e.id, 'game_id', e.game_id, 'amount', e.amount);
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from jackpot_config;
  if (select count(*) from jackpot_entries where user_id = uid and created_at > clock_timestamp() - make_interval(secs => c.entry_rate_window_seconds)) >= c.entry_rate_limit then
    raise exception 'RATE_LIMITED';
  end if;

  gid := _ensure_open_game();
  if gid is null then raise exception 'GAME_CLOSED'; end if;
  select * into g from jackpot_games where id = gid for update;
  if g.status not in ('WAITING','ACTIVE') then raise exception 'GAME_CLOSED'; end if;
  ts := clock_timestamp();
  if g.status = 'ACTIVE' and ts >= g.scheduled_end_at then raise exception 'GAME_CLOSED'; end if;
  if p_amount is null or p_amount < g.min_entry then raise exception 'BELOW_MIN_ENTRY'; end if;
  if p_amount > g.max_entry then raise exception 'ABOVE_MAX_ENTRY'; end if;

  avail := _user_account(uid, 'user_available', g.asset, g.account_type);
  locked := _user_account(uid, 'user_locked', g.asset, g.account_type);
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('jackpot_entry', 'entry:' || uid || ':' || p_idempotency_key, g.account_type, uid, g.id, 'Jackpot entry') returning id into tx;
  perform _post(tx, avail, -p_amount);
  perform _post(tx, locked, p_amount);

  insert into jackpot_entries (game_id, user_id, amount, ticket_start, ticket_end, ledger_tx_id, idempotency_key, created_at)
    values (g.id, uid, p_amount, g.pot_amount, g.pot_amount + p_amount, tx, p_idempotency_key, ts) returning * into e;

  is_new := not exists (select 1 from jackpot_players where game_id = g.id and user_id = uid);
  insert into jackpot_players (game_id, user_id, total_amount, entry_count, first_entry_at, last_entry_at)
    values (g.id, uid, p_amount, 1, ts, ts)
    on conflict (game_id, user_id) do update set total_amount = jackpot_players.total_amount + excluded.total_amount,
      entry_count = jackpot_players.entry_count + 1, last_entry_at = excluded.last_entry_at;

  if is_new then
    g.player_count := g.player_count + 1;
    if g.player_count = 2 then
      g.status := 'ACTIVE';
      g.countdown_started_at := ts;
      g.scheduled_end_at := ts + make_interval(secs => g.countdown_seconds);
      g.max_end_at := ts + make_interval(secs => g.max_duration_seconds);
      started := true;
    elsif g.player_count > 2 then
      g.scheduled_end_at := least(g.scheduled_end_at + make_interval(secs => g.extension_seconds), g.max_end_at);
      extended := true;
    end if;
  end if;

  update jackpot_games set status = g.status, pot_amount = g.pot_amount + p_amount, entry_count = entry_count + 1,
    player_count = g.player_count, countdown_started_at = g.countdown_started_at,
    scheduled_end_at = g.scheduled_end_at, max_end_at = g.max_end_at
  where id = g.id;

  perform _audit(uid, 'entry', g.id, jsonb_build_object('amount', p_amount, 'ticket_start', e.ticket_start, 'new_player', is_new, 'timer_started', started, 'timer_extended', extended));
  return jsonb_build_object('duplicate', false, 'entry_id', e.id, 'game_id', g.id, 'amount', p_amount,
    'ticket_start', e.ticket_start, 'ticket_end', e.ticket_end, 'new_player', is_new, 'timer_started', started, 'timer_extended', extended);
end $$;

-- ========== SETTLEMENT ==========
create or replace function public.jackpot_settle(p_game_id bigint)
returns text language plpgsql security definer set search_path = public as $$
declare g public.jackpot_games; seed bytea; d record; winner uuid; wtotal bigint; sum_amt bigint; n_entries int;
  rake bigint; payout bigint; tx uuid; escrow uuid; house uuid; p record; err text;
begin
  select * into g from jackpot_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED','CANCELLED','WAITING') then return 'noop'; end if;
  if g.status = 'ACTIVE' then
    if clock_timestamp() < g.scheduled_end_at then return 'not_due'; end if;
    update jackpot_games set status = 'DRAWING', drawn_at = clock_timestamp() where id = g.id;
    insert into jackpot_payouts (game_id) values (g.id) on conflict do nothing;
    perform _audit(null, 'game_locked', g.id, jsonb_build_object('pot', g.pot_amount, 'players', g.player_count));
    g.status := 'DRAWING';
  end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    select server_seed into seed from jackpot_game_secrets where game_id = g.id;
    if seed is null then raise exception 'SEED_MISSING'; end if;
    select coalesce(sum(amount),0), count(*) into sum_amt, n_entries from jackpot_entries where game_id = g.id;
    if sum_amt <> g.pot_amount or n_entries <> g.entry_count then raise exception 'INVARIANT_POT_MISMATCH'; end if;
    if (select coalesce(sum(total_amount),0) from jackpot_players where game_id = g.id) <> g.pot_amount then raise exception 'INVARIANT_PLAYERS_MISMATCH'; end if;
    if exists (select 1 from (select ticket_start, lag(ticket_end, 1, 0::bigint) over (order by ticket_start) prev_end
               from jackpot_entries where game_id = g.id) t where t.ticket_start <> t.prev_end) then
      raise exception 'INVARIANT_TICKET_GAP';
    end if;

    select * into d from jackpot_draw_ticket(seed, g.id, g.draw_version, g.pot_amount);
    select user_id into winner from jackpot_entries where game_id = g.id and ticket_start <= d.ticket and ticket_end > d.ticket;
    if winner is null then raise exception 'INVARIANT_NO_WINNER'; end if;
    select total_amount into wtotal from jackpot_players where game_id = g.id and user_id = winner;
    rake := (g.pot_amount * g.rake_bps) / 10000;
    payout := g.pot_amount - rake;

    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('jackpot_settlement', 'settle:' || g.id, g.account_type, winner, g.id, 'Jackpot settlement') returning id into tx;
    escrow := _system_account('game_escrow', g.asset, g.account_type);
    for p in select user_id, total_amount from jackpot_players where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(p.user_id, 'user_locked', g.asset, g.account_type), -p.total_amount);
    end loop;
    perform _post(tx, escrow, g.pot_amount);
    perform _post(tx, escrow, -g.pot_amount);
    perform _post(tx, _user_account(winner, 'user_available', g.asset, g.account_type), payout);
    if rake > 0 then
      house := _system_account('house_revenue', g.asset, g.account_type);
      perform _post(tx, house, rake);
    end if;

    update jackpot_payouts set status = 'SETTLED', attempts = attempts + 1, ledger_tx_id = tx, settled_at = clock_timestamp(), last_error = null
      where game_id = g.id;
    update jackpot_games set status = 'COMPLETED', completed_at = clock_timestamp(), winning_ticket = d.ticket, draw_counter = d.counter,
      winner_id = winner, winner_total = wtotal, payout_amount = payout, rake_amount = rake, server_seed = encode(seed, 'hex')
      where id = g.id;
    perform _audit(null, 'game_settled', g.id, jsonb_build_object('winner', winner, 'ticket', d.ticket, 'payout', payout, 'rake', rake));
  exception when others then
    err := sqlerrm;
    update jackpot_payouts set status = 'FAILED', attempts = attempts + 1, last_error = err where game_id = g.id;
    perform _audit(null, 'settlement_failed', g.id, jsonb_build_object('error', err));
    return 'failed';
  end;
  return 'settled';
end $$;

create or replace function public.jackpot_tick()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; res text;
begin
  for r in select id from jackpot_games
           where (status = 'ACTIVE' and scheduled_end_at <= clock_timestamp()) or status = 'DRAWING'
           order by id limit 10 loop
    res := jackpot_settle(r.id);
    if res = 'settled' then n := n + 1; end if;
  end loop;
  perform _ensure_open_game();
  return jsonb_build_object('settled', n, 'server_time', clock_timestamp());
end $$;

create or replace function public.server_time() returns timestamptz language sql volatile as $$ select clock_timestamp() $$;

-- ========== READ HELPERS ==========
create or replace function public.get_profile_stats(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'games_played', (select count(*) from jackpot_players jp join jackpot_games g on g.id = jp.game_id where jp.user_id = p_user and g.status = 'COMPLETED'),
    'games_won', (select count(*) from jackpot_games where winner_id = p_user and status = 'COMPLETED'),
    'total_wagered', (select coalesce(sum(jp.total_amount),0) from jackpot_players jp join jackpot_games g on g.id = jp.game_id where jp.user_id = p_user and g.status = 'COMPLETED'),
    'total_won', (select coalesce(sum(payout_amount),0) from jackpot_games where winner_id = p_user and status = 'COMPLETED'))
$$;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'open_games', (select count(*) from jackpot_games where status in ('WAITING','ACTIVE')),
    'drawing_games', (select count(*) from jackpot_games where status = 'DRAWING'),
    'completed_games', (select count(*) from jackpot_games where status = 'COMPLETED'),
    'total_volume', (select coalesce(sum(pot_amount),0) from jackpot_games where status = 'COMPLETED'),
    'players', (select count(*) from profiles),
    'failed_payouts', (select count(*) from jackpot_payouts where status = 'FAILED'),
    'ledger_sum', (select coalesce(sum(balance),0) from wallet_accounts),
    'escrow_balance', (select coalesce(sum(balance),0) from wallet_accounts where kind = 'game_escrow'),
    'locked_total', (select coalesce(sum(balance),0) from wallet_accounts where kind = 'user_locked'),
    'open_pot_total', (select coalesce(sum(pot_amount),0) from jackpot_games where status in ('WAITING','ACTIVE','DRAWING')),
    'recent_audit', (select coalesce(jsonb_agg(a order by a.id desc),'[]'::jsonb) from (select * from audit_logs order by id desc limit 50) a));
end $$;

-- ========== FUNCTION PERMISSIONS ==========
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.ensure_profile(text, boolean) to authenticated;
grant execute on function public.update_avatar(text) to authenticated;
grant execute on function public.claim_test_credits() to authenticated;
grant execute on function public.jackpot_join(bigint, text) to authenticated;
grant execute on function public.jackpot_tick() to anon, authenticated;
grant execute on function public.server_time() to anon, authenticated;
grant execute on function public.jackpot_draw_ticket(bytea, bigint, int, bigint) to anon, authenticated;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on all functions in schema public to service_role;

-- ========== REALTIME ==========
alter publication supabase_realtime add table public.jackpot_games, public.jackpot_players, public.jackpot_entries, public.wallet_accounts;
alter table public.jackpot_games replica identity full;

select public._ensure_open_game();

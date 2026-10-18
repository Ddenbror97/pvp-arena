-- ===================== COINFLIP (shared wallet/ledger/fairness) =====================
create type public.coinflip_status as enum ('WAITING','READY','FLIPPING','SETTLEMENT','COMPLETED','CANCELLED');
create type public.coin_side as enum ('HEADS','TAILS');
create type public.coinflip_payout_kind as enum ('WINNER','REFUND');
alter type public.tx_kind add value if not exists 'coinflip_entry';
alter type public.tx_kind add value if not exists 'coinflip_settlement';
alter type public.tx_kind add value if not exists 'coinflip_refund';

alter table public.audit_logs add column if not exists game_type text not null default 'jackpot' check (game_type in ('jackpot','coinflip'));

-- ---------- config ----------
create table public.coinflip_config (
  id boolean primary key default true check (id),
  min_wager bigint not null default 100 check (min_wager > 0),
  max_wager bigint not null default 1000000,
  fee_bps int not null default 0 check (fee_bps between 0 and 1000),
  waiting_timeout_seconds int not null default 60 check (waiting_timeout_seconds > 0),
  pre_delay_ms int not null default 3000 check (pre_delay_ms >= 0),
  animation_ms int not null default 3500 check (animation_ms > 0),
  create_rate_limit int not null default 5 check (create_rate_limit > 0),
  create_rate_window_seconds int not null default 10 check (create_rate_window_seconds > 0),
  max_open_per_user int not null default 3 check (max_open_per_user > 0),
  updated_at timestamptz not null default now(),
  constraint wager_range check (max_wager >= min_wager)
);
insert into public.coinflip_config default values;
grant select on public.coinflip_config to anon, authenticated;
grant all on public.coinflip_config to service_role;
alter table public.coinflip_config enable row level security;
create policy "coinflip config public" on public.coinflip_config for select to anon, authenticated using (true);

-- ---------- games ----------
create table public.coinflip_games (
  id bigint generated always as identity primary key,
  status public.coinflip_status not null default 'WAITING',
  creator_id uuid not null references public.profiles(id),
  opponent_id uuid references public.profiles(id),
  creator_side public.coin_side not null,
  amount bigint not null check (amount > 0),
  pot_amount bigint not null,
  fee_bps int not null check (fee_bps between 0 and 1000),
  asset text not null,
  account_type text not null check (account_type in ('test_credit','real')),
  protocol_version text not null default 'v1' check (protocol_version = 'v1'),
  draw_version int not null default 1 check (draw_version = 1),
  server_seed_hash text not null check (server_seed_hash ~ '^[0-9a-f]{64}$'),
  server_seed text,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  joined_at timestamptz,
  animation_start_at timestamptz,
  animation_end_at timestamptz,
  settlement_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (cancel_reason in ('EXPIRED','CREATOR_CANCELLED')),
  winner_id uuid,
  winning_side public.coin_side,
  payout_amount bigint,
  fee_amount bigint,
  updated_at timestamptz not null default clock_timestamp(),
  constraint pot_is_double check (pot_amount = amount * 2),
  constraint opponent_differs check (opponent_id is null or opponent_id <> creator_id),
  constraint joined_iff_opponent check ((status in ('WAITING','CANCELLED')) = (opponent_id is null)),
  constraint joined_has_times check (opponent_id is null or (joined_at is not null and animation_start_at >= joined_at and animation_end_at > animation_start_at)),
  constraint result_visible_only_when_flipping check ((status in ('FLIPPING','SETTLEMENT','COMPLETED')) = (winner_id is not null and winning_side is not null)),
  constraint winner_is_player check (winner_id is null or winner_id = creator_id or winner_id = opponent_id),
  constraint winner_side_consistent check (winner_id is null or ((winner_id = creator_id) = (winning_side = creator_side))),
  constraint completed_has_result check (status <> 'COMPLETED' or (server_seed is not null and completed_at is not null
    and fee_amount = (pot_amount * fee_bps) / 10000 and payout_amount + fee_amount = pot_amount)),
  constraint seed_hidden_until_done check (server_seed is null or status = 'COMPLETED'),
  constraint cancelled_fields check ((status = 'CANCELLED') = (cancelled_at is not null and cancel_reason is not null))
);
create index coinflip_games_status on public.coinflip_games (status, id);
create index coinflip_games_open on public.coinflip_games (created_at desc) where status = 'WAITING';
create index coinflip_games_creator on public.coinflip_games (creator_id, created_at desc);
create index coinflip_games_opponent on public.coinflip_games (opponent_id, created_at desc);
grant select on public.coinflip_games to anon, authenticated;
grant all on public.coinflip_games to service_role;
alter table public.coinflip_games enable row level security;
create policy "coinflip games public" on public.coinflip_games for select to anon, authenticated using (true);

-- ---------- secrets (server only) ----------
create table public.coinflip_game_secrets (
  game_id bigint primary key references public.coinflip_games(id),
  server_seed bytea not null check (length(server_seed) = 32)
);
grant all on public.coinflip_game_secrets to service_role;
alter table public.coinflip_game_secrets enable row level security;
create policy "coinflip secrets no client access" on public.coinflip_game_secrets for select to authenticated using (false);

-- ---------- entries ----------
create table public.coinflip_entries (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references public.coinflip_games(id),
  user_id uuid not null references public.profiles(id),
  slot smallint not null check (slot in (1,2)),
  side public.coin_side not null,
  amount bigint not null check (amount > 0),
  ledger_tx_id uuid not null unique references public.ledger_transactions(id),
  idempotency_key text not null check (length(idempotency_key) between 8 and 100),
  created_at timestamptz not null default clock_timestamp(),
  unique (game_id, slot),
  unique (game_id, side),
  unique (game_id, user_id),
  unique (user_id, idempotency_key)
);
create index coinflip_entries_user on public.coinflip_entries (user_id, created_at desc);
grant select on public.coinflip_entries to anon, authenticated;
grant all on public.coinflip_entries to service_role;
alter table public.coinflip_entries enable row level security;
create policy "coinflip entries public" on public.coinflip_entries for select to anon, authenticated using (true);

-- ---------- results (hidden until FLIPPING) ----------
create table public.coinflip_results (
  game_id bigint primary key references public.coinflip_games(id),
  protocol_version text not null,
  draw_version int not null,
  server_seed_hash text not null,
  message text not null,
  hmac_hex text not null check (hmac_hex ~ '^[0-9a-f]{64}$'),
  first_byte int not null check (first_byte between 0 and 255),
  winning_side public.coin_side not null,
  winner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default clock_timestamp(),
  constraint side_from_bit check ((first_byte % 2 = 0) = (winning_side = 'HEADS'))
);
grant select on public.coinflip_results to anon, authenticated;
grant all on public.coinflip_results to service_role;
alter table public.coinflip_results enable row level security;
create policy "coinflip results after flip starts" on public.coinflip_results for select to anon, authenticated
  using (exists (select 1 from public.coinflip_games g where g.id = coinflip_results.game_id and g.status in ('FLIPPING','SETTLEMENT','COMPLETED')));

-- ---------- payouts ----------
create table public.coinflip_payouts (
  game_id bigint primary key references public.coinflip_games(id),
  kind public.coinflip_payout_kind not null,
  idempotency_key text not null unique,
  beneficiary_id uuid not null references public.profiles(id),
  amount bigint not null check (amount >= 0),
  status public.payout_status not null default 'PENDING',
  attempts int not null default 0,
  last_error text,
  ledger_tx_id uuid unique references public.ledger_transactions(id),
  created_at timestamptz not null default clock_timestamp(),
  settled_at timestamptz,
  constraint settled_has_tx check (status <> 'SETTLED' or (ledger_tx_id is not null and settled_at is not null))
);
grant select on public.coinflip_payouts to anon, authenticated;
grant all on public.coinflip_payouts to service_role;
alter table public.coinflip_payouts enable row level security;
create policy "coinflip payouts public" on public.coinflip_payouts for select to anon, authenticated using (true);

-- ---------- guards ----------
create or replace function public._coinflip_guard() returns trigger language plpgsql set search_path = public as $$
declare r public.coinflip_results;
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD coinflip_games'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'WAITING' or new.opponent_id is not null or new.winner_id is not null or new.server_seed is not null then
      raise exception 'ILLEGAL_INITIAL_STATE';
    end if;
    return new;
  end if;
  if old.status in ('COMPLETED','CANCELLED') then raise exception 'IMMUTABLE_RECORD coinflip game %', old.id; end if;
  if (old.status::text || '>' || new.status::text) not in
     ('WAITING>READY','READY>FLIPPING','FLIPPING>SETTLEMENT','SETTLEMENT>COMPLETED','WAITING>CANCELLED') then
    raise exception 'ILLEGAL_TRANSITION % -> %', old.status, new.status;
  end if;
  if new.creator_id <> old.creator_id or new.creator_side <> old.creator_side or new.amount <> old.amount
     or new.pot_amount <> old.pot_amount or new.fee_bps <> old.fee_bps or new.server_seed_hash <> old.server_seed_hash
     or new.protocol_version <> old.protocol_version or new.draw_version <> old.draw_version or new.created_at <> old.created_at
     or new.expires_at <> old.expires_at or new.asset <> old.asset or new.account_type <> old.account_type then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if old.opponent_id is not null and (new.opponent_id is distinct from old.opponent_id or new.joined_at is distinct from old.joined_at
     or new.animation_start_at is distinct from old.animation_start_at or new.animation_end_at is distinct from old.animation_end_at) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if old.winner_id is not null and (new.winner_id is distinct from old.winner_id or new.winning_side is distinct from old.winning_side) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if new.status = 'FLIPPING' and clock_timestamp() < new.animation_start_at then raise exception 'TOO_EARLY flip'; end if;
  if new.status = 'SETTLEMENT' and clock_timestamp() < new.animation_end_at then raise exception 'TOO_EARLY settlement'; end if;
  if new.status = 'CANCELLED' and new.cancel_reason = 'EXPIRED' and clock_timestamp() < new.expires_at then raise exception 'TOO_EARLY expiry'; end if;
  if new.winner_id is not null then
    select * into r from public.coinflip_results where game_id = new.id;
    if not found or r.winner_id <> new.winner_id or r.winning_side <> new.winning_side then raise exception 'RESULT_MISMATCH'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
create trigger coinflip_guard before insert or update or delete on public.coinflip_games for each row execute function public._coinflip_guard();

create or replace function public._coinflip_entry_check() returns trigger language plpgsql set search_path = public as $$
declare g public.coinflip_games;
begin
  select * into g from public.coinflip_games where id = new.game_id;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_JOINABLE'; end if;
  if new.amount <> g.amount then raise exception 'WAGER_MISMATCH'; end if;
  if new.slot = 1 and (new.user_id <> g.creator_id or new.side <> g.creator_side) then raise exception 'ENTRY_MISMATCH'; end if;
  if new.slot = 2 and (new.user_id = g.creator_id or new.side = g.creator_side) then raise exception 'ENTRY_MISMATCH'; end if;
  return new;
end $$;
create trigger coinflip_entry_check before insert on public.coinflip_entries for each row execute function public._coinflip_entry_check();

create or replace function public._coinflip_payout_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD coinflip_payouts'; end if;
  if old.status = 'SETTLED' then raise exception 'IMMUTABLE_RECORD settled payout %', old.game_id; end if;
  if new.kind <> old.kind or new.amount <> old.amount or new.beneficiary_id <> old.beneficiary_id or new.idempotency_key <> old.idempotency_key then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  return new;
end $$;
create trigger coinflip_payout_guard before update or delete on public.coinflip_payouts for each row execute function public._coinflip_payout_guard();

create trigger no_mutation before update or delete on public.coinflip_entries for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.coinflip_results for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.coinflip_game_secrets for each row execute function public._immutable();

-- ---------- shared fairness primitive + coinflip v1 derivation ----------
create or replace function public._fair_hmac(p_seed bytea, p_message text) returns bytea
language sql immutable set search_path = public, extensions as $$
  select extensions.hmac(convert_to(p_message, 'UTF8'), p_seed, 'sha256')
$$;

create or replace function public.coinflip_outcome(p_seed bytea, p_game_id bigint, p_draw_version int,
  out hmac_hex text, out first_byte int, out side public.coin_side)
language plpgsql immutable set search_path = public, extensions as $$
declare h bytea;
begin
  if p_seed is null or length(p_seed) <> 32 then raise exception 'INVALID_SEED'; end if;
  h := public._fair_hmac(p_seed, 'PVPCasino:coinflip:v1:' || p_game_id || ':' || p_draw_version);
  hmac_hex := encode(h, 'hex');
  first_byte := get_byte(h, 0);
  side := case when (first_byte & 1) = 0 then 'HEADS'::public.coin_side else 'TAILS'::public.coin_side end;
end $$;

create or replace function public._audit_cf(p_actor uuid, p_action text, p_game bigint, p_details jsonb) returns void
language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, action, game_id, details, game_type)
  values (p_actor, p_action, p_game, coalesce(p_details, '{}'::jsonb), 'coinflip')
$$;

-- Locks both wallet rows of the given users in one global order (owner, kind) to avoid deadlocks.
create or replace function public._coinflip_lock_wallets(p_users uuid[], p_asset text, p_type text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from wallet_accounts where owner_id = any(p_users) and kind in ('user_available','user_locked')
    and asset = p_asset and account_type = p_type order by owner_id, kind for update;
end $$;

-- ---------- create ----------
create or replace function public.coinflip_create(p_amount bigint, p_side public.coin_side, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); prof public.profiles; c public.coinflip_config; jc public.jackpot_config;
  e public.coinflip_entries; g public.coinflip_games; seed bytea; tx uuid; avail uuid; locked uuid; bal bigint; ts timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  if p_side is null then raise exception 'INVALID_SIDE'; end if;
  perform pg_advisory_xact_lock(hashtext('cf:' || uid::text || ':' || p_idempotency_key));
  select * into e from coinflip_entries where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if e.slot <> 1 then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return jsonb_build_object('duplicate', true, 'game_id', e.game_id);
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from coinflip_config;
  select * into jc from jackpot_config;
  if jc.real_money_enabled or jc.account_type <> 'test_credit' then raise exception 'REAL_MONEY_DISABLED'; end if;
  if p_amount is null or p_amount < c.min_wager then raise exception 'BELOW_MIN_WAGER'; end if;
  if p_amount > c.max_wager then raise exception 'ABOVE_MAX_WAGER'; end if;
  if (select count(*) from coinflip_games where creator_id = uid and created_at > clock_timestamp() - make_interval(secs => c.create_rate_window_seconds)) >= c.create_rate_limit then
    raise exception 'RATE_LIMITED';
  end if;
  if (select count(*) from coinflip_games where creator_id = uid and status = 'WAITING') >= c.max_open_per_user then
    raise exception 'TOO_MANY_OPEN_GAMES';
  end if;

  avail := _user_account(uid, 'user_available', jc.asset, jc.account_type);
  locked := _user_account(uid, 'user_locked', jc.asset, jc.account_type);
  perform _coinflip_lock_wallets(array[uid], jc.asset, jc.account_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  ts := clock_timestamp();
  seed := extensions.gen_random_bytes(32);
  insert into coinflip_games (creator_id, creator_side, amount, pot_amount, fee_bps, asset, account_type, server_seed_hash, created_at, expires_at)
  values (uid, p_side, p_amount, p_amount * 2, c.fee_bps, jc.asset, jc.account_type,
          encode(extensions.digest(seed, 'sha256'), 'hex'), ts, ts + make_interval(secs => c.waiting_timeout_seconds))
  returning * into g;
  insert into coinflip_game_secrets (game_id, server_seed) values (g.id, seed);

  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('coinflip_entry', 'coinflip:' || g.id || ':entry:1', jc.account_type, uid, g.id, 'Coinflip wager') returning id into tx;
  perform _post(tx, avail, -p_amount);
  perform _post(tx, locked, p_amount);
  insert into coinflip_entries (game_id, user_id, slot, side, amount, ledger_tx_id, idempotency_key, created_at)
    values (g.id, uid, 1, p_side, p_amount, tx, p_idempotency_key, ts);

  perform _audit_cf(uid, 'GAME_CREATED', g.id, jsonb_build_object('amount', p_amount, 'side', p_side,
    'server_seed_hash', g.server_seed_hash, 'expires_at', g.expires_at, 'fee_bps', g.fee_bps));
  return jsonb_build_object('duplicate', false, 'game_id', g.id);
end $$;

-- ---------- join ----------
create or replace function public.coinflip_join(p_game_id bigint, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); prof public.profiles; c public.coinflip_config; g public.coinflip_games; e public.coinflip_entries;
  seed bytea; o record; tx uuid; avail uuid; locked uuid; bal bigint; ts timestamptz; opp public.coin_side; winner uuid;
  t_start timestamptz; t_end timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtext('cf:' || uid::text || ':' || p_idempotency_key));
  select * into e from coinflip_entries where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if e.slot = 2 and e.game_id = p_game_id then return jsonb_build_object('duplicate', true, 'game_id', e.game_id, 'side', e.side); end if;
    raise exception 'IDEMPOTENCY_KEY_REUSED';
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from coinflip_config;

  select * into g from coinflip_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_JOINABLE'; end if;
  ts := clock_timestamp();
  if ts >= g.expires_at then raise exception 'GAME_EXPIRED'; end if;
  if g.creator_id = uid then raise exception 'CANNOT_JOIN_OWN_GAME'; end if;

  avail := _user_account(uid, 'user_available', g.asset, g.account_type);
  locked := _user_account(uid, 'user_locked', g.asset, g.account_type);
  perform _coinflip_lock_wallets(array[uid], g.asset, g.account_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or bal < g.amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('coinflip_entry', 'coinflip:' || g.id || ':entry:2', g.account_type, uid, g.id, 'Coinflip wager') returning id into tx;
  perform _post(tx, avail, -g.amount);
  perform _post(tx, locked, g.amount);
  opp := case when g.creator_side = 'HEADS' then 'TAILS'::coin_side else 'HEADS'::coin_side end;
  insert into coinflip_entries (game_id, user_id, slot, side, amount, ledger_tx_id, idempotency_key, created_at)
    values (g.id, uid, 2, opp, g.amount, tx, p_idempotency_key, ts);

  -- Outcome is fixed by the seed committed at creation + fixed game id; stored hidden until FLIPPING.
  select server_seed into seed from coinflip_game_secrets where game_id = g.id;
  if seed is null then raise exception 'SEED_MISSING'; end if;
  select * into o from coinflip_outcome(seed, g.id, g.draw_version);
  winner := case when o.side = g.creator_side then g.creator_id else uid end;
  insert into coinflip_results (game_id, protocol_version, draw_version, server_seed_hash, message, hmac_hex, first_byte, winning_side, winner_id)
    values (g.id, g.protocol_version, g.draw_version, g.server_seed_hash,
            'PVPCasino:coinflip:v1:' || g.id || ':' || g.draw_version, o.hmac_hex, o.first_byte, o.side, winner);

  t_start := ts + c.pre_delay_ms * interval '1 millisecond';
  t_end := t_start + c.animation_ms * interval '1 millisecond';
  update coinflip_games set status = 'READY', opponent_id = uid, joined_at = ts, animation_start_at = t_start, animation_end_at = t_end
    where id = g.id;

  perform _audit_cf(uid, 'PLAYER_JOINED', g.id, jsonb_build_object('amount', g.amount, 'side', opp));
  perform _audit_cf(null, 'RESULT_COMMITTED', g.id, jsonb_build_object('server_seed_hash', g.server_seed_hash, 'protocol', 'coinflip:v1', 'draw_version', g.draw_version));
  perform _audit_cf(null, 'GAME_READY', g.id, jsonb_build_object('joined_at', ts, 'animation_start_at', t_start, 'animation_end_at', t_end));
  return jsonb_build_object('duplicate', false, 'game_id', g.id, 'side', opp,
    'joined_at', ts, 'animation_start_at', t_start, 'animation_end_at', t_end);
end $$;

-- ---------- refund (WAITING -> CANCELLED) ----------
create or replace function public._coinflip_refund(p_game_id bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.coinflip_games; tx uuid; key text;
begin
  select * into g from coinflip_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_CANCELLABLE'; end if;
  key := 'coinflip:' || g.id || ':refund';
  perform _coinflip_lock_wallets(array[g.creator_id], g.asset, g.account_type);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('coinflip_refund', key, g.account_type, g.creator_id, g.id, 'Coinflip refund (no opponent)') returning id into tx;
  perform _post(tx, _user_account(g.creator_id, 'user_locked', g.asset, g.account_type), -g.amount);
  perform _post(tx, _user_account(g.creator_id, 'user_available', g.asset, g.account_type), g.amount);
  insert into coinflip_payouts (game_id, kind, idempotency_key, beneficiary_id, amount, status, attempts, ledger_tx_id, settled_at)
    values (g.id, 'REFUND', key, g.creator_id, g.amount, 'SETTLED', 1, tx, clock_timestamp());
  update coinflip_games set status = 'CANCELLED', cancelled_at = clock_timestamp(), cancel_reason = p_reason where id = g.id;
  perform _audit_cf(null, 'GAME_CANCELLED', g.id, jsonb_build_object('reason', p_reason));
  perform _audit_cf(null, 'REFUND_SETTLED', g.id, jsonb_build_object('amount', g.amount, 'beneficiary', g.creator_id, 'ledger_tx', tx));
end $$;

create or replace function public.coinflip_cancel(p_game_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.coinflip_games;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into g from coinflip_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.creator_id <> uid then raise exception 'FORBIDDEN'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_CANCELLABLE'; end if;
  perform _coinflip_refund(g.id, 'CREATOR_CANCELLED');
  return jsonb_build_object('cancelled', true, 'game_id', g.id);
end $$;

-- ---------- advance / settle (idempotent, recoverable) ----------
create or replace function public.coinflip_advance(p_game_id bigint) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare g public.coinflip_games; r public.coinflip_results; po public.coinflip_payouts; seed bytea; o record;
  n_entries int; sum_amt bigint; n_sides int; all_eq boolean; winner_side_ok boolean;
  tx uuid; escrow uuid; fee bigint; payout bigint; p record; err text; was_retry boolean;
begin
  select * into g from coinflip_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED','CANCELLED') then return 'noop'; end if;

  if g.status = 'WAITING' then
    if clock_timestamp() < g.expires_at then return 'not_due'; end if;
    perform _coinflip_refund(g.id, 'EXPIRED');
    return 'cancelled';
  end if;

  select * into r from coinflip_results where game_id = g.id;
  if not found then raise exception 'RESULT_MISSING'; end if;

  if g.status = 'READY' then
    if clock_timestamp() < g.animation_start_at then return 'not_due'; end if;
    update coinflip_games set status = 'FLIPPING', winner_id = r.winner_id, winning_side = r.winning_side where id = g.id;
    perform _audit_cf(null, 'FLIP_STARTED', g.id, jsonb_build_object('animation_start_at', g.animation_start_at));
    g.status := 'FLIPPING';
  end if;

  if g.status = 'FLIPPING' then
    if clock_timestamp() < g.animation_end_at then return 'flipping'; end if;
    fee := (g.pot_amount * g.fee_bps) / 10000;
    update coinflip_games set status = 'SETTLEMENT', settlement_started_at = clock_timestamp() where id = g.id;
    perform _audit_cf(null, 'FLIP_COMPLETED', g.id, jsonb_build_object('winning_side', r.winning_side));
    insert into coinflip_payouts (game_id, kind, idempotency_key, beneficiary_id, amount)
      values (g.id, 'WINNER', 'coinflip:' || g.id || ':winner', r.winner_id, g.pot_amount - fee)
      on conflict (game_id) do nothing;
    perform _audit_cf(null, 'PAYOUT_CREATED', g.id, jsonb_build_object('beneficiary', r.winner_id, 'amount', g.pot_amount - fee));
    g.status := 'SETTLEMENT';
  end if;

  -- SETTLEMENT
  select * into po from coinflip_payouts where game_id = g.id for update;
  if not found then
    fee := (g.pot_amount * g.fee_bps) / 10000;
    insert into coinflip_payouts (game_id, kind, idempotency_key, beneficiary_id, amount)
      values (g.id, 'WINNER', 'coinflip:' || g.id || ':winner', r.winner_id, g.pot_amount - fee) returning * into po;
  end if;
  was_retry := po.attempts > 0;
  if was_retry then perform _audit_cf(null, 'RECOVERY_ATTEMPTED', g.id, jsonb_build_object('attempt', po.attempts + 1)); end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    select count(*), coalesce(sum(amount),0), count(distinct side), coalesce(bool_and(amount = g.amount), false)
      into n_entries, sum_amt, n_sides, all_eq from coinflip_entries where game_id = g.id;
    if n_entries <> 2 or sum_amt <> g.pot_amount or n_sides <> 2 or not all_eq then raise exception 'INVARIANT_ENTRIES'; end if;
    select (side = r.winning_side) into winner_side_ok from coinflip_entries where game_id = g.id and user_id = r.winner_id;
    if not coalesce(winner_side_ok, false) then raise exception 'INVARIANT_WINNER_SIDE'; end if;
    select server_seed into seed from coinflip_game_secrets where game_id = g.id;
    if seed is null then raise exception 'SEED_MISSING'; end if;
    if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
    select * into o from coinflip_outcome(seed, g.id, g.draw_version);
    if o.side <> r.winning_side or o.hmac_hex <> r.hmac_hex then raise exception 'INVARIANT_RESULT'; end if;
    fee := (g.pot_amount * g.fee_bps) / 10000;
    payout := g.pot_amount - fee;
    if po.amount <> payout or po.beneficiary_id <> r.winner_id then raise exception 'INVARIANT_PAYOUT'; end if;

    if po.status <> 'SETTLED' then
      -- Same posting pattern as Jackpot settlement: players' locked -> escrow -> winner available (+ house fee).
      perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
      insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
        values ('coinflip_settlement', po.idempotency_key, g.account_type, r.winner_id, g.id, 'Coinflip settlement') returning id into tx;
      escrow := _system_account('game_escrow', g.asset, g.account_type);
      for p in select user_id, amount from coinflip_entries where game_id = g.id order by user_id loop
        perform _post(tx, _user_account(p.user_id, 'user_locked', g.asset, g.account_type), -p.amount);
      end loop;
      perform _post(tx, escrow, g.pot_amount);
      perform _post(tx, escrow, -g.pot_amount);
      perform _post(tx, _user_account(r.winner_id, 'user_available', g.asset, g.account_type), payout);
      if fee > 0 then perform _post(tx, _system_account('house_revenue', g.asset, g.account_type), fee); end if;
      if current_setting('pvp.fail_after_ledger', true) = 'on' then raise exception 'INJECTED_FAILURE_AFTER_LEDGER'; end if;
      update coinflip_payouts set status = 'SETTLED', attempts = attempts + 1, ledger_tx_id = tx, settled_at = clock_timestamp(), last_error = null
        where game_id = g.id;
      perform _audit_cf(null, 'PAYOUT_SETTLED', g.id, jsonb_build_object('beneficiary', r.winner_id, 'amount', payout, 'fee', fee, 'ledger_tx', tx));
    end if;

    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update coinflip_games set status = 'COMPLETED', completed_at = clock_timestamp(), payout_amount = payout, fee_amount = fee,
      server_seed = encode(seed, 'hex') where id = g.id;
    perform _audit_cf(null, 'GAME_COMPLETED', g.id, jsonb_build_object('winner', r.winner_id, 'winning_side', r.winning_side, 'payout', payout, 'fee', fee));
    if was_retry then perform _audit_cf(null, 'RECOVERY_COMPLETED', g.id, null); end if;
  exception when others then
    err := sqlerrm;
    update coinflip_payouts set status = 'FAILED', attempts = attempts + 1, last_error = left(err, 500) where game_id = g.id;
    perform _audit_cf(null, 'RECOVERY_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
    return 'failed';
  end;
  return 'settled';
end $$;

create or replace function public.coinflip_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; res text; n_settled int := 0; n_cancelled int := 0; n_failed int := 0;
begin
  for r in select id from coinflip_games
           where (status = 'WAITING' and expires_at <= clock_timestamp())
              or (status = 'READY' and animation_start_at <= clock_timestamp())
              or (status = 'FLIPPING' and animation_end_at <= clock_timestamp())
              or status = 'SETTLEMENT'
           order by id limit 50 for update skip locked loop
    begin
      res := coinflip_advance(r.id);
    exception when others then
      perform _audit_cf(null, 'RECOVERY_FAILED', r.id, jsonb_build_object('error', left(sqlerrm, 500)));
      res := 'error';
    end;
    if res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    elsif res in ('failed','error') then n_failed := n_failed + 1; end if;
  end loop;
  return jsonb_build_object('settled', n_settled, 'cancelled', n_cancelled, 'failed', n_failed, 'server_time', clock_timestamp());
end $$;

-- ---------- read helpers ----------
create or replace function public.admin_coinflip_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'waiting', (select count(*) from coinflip_games where status = 'WAITING'),
    'in_progress', (select count(*) from coinflip_games where status in ('READY','FLIPPING','SETTLEMENT')),
    'completed', (select count(*) from coinflip_games where status = 'COMPLETED'),
    'cancelled', (select count(*) from coinflip_games where status = 'CANCELLED'),
    'failed_payouts', (select count(*) from coinflip_payouts where status = 'FAILED'),
    'volume', (select coalesce(sum(pot_amount),0) from coinflip_games where status = 'COMPLETED'),
    'open_locked', (select coalesce(sum(case when status = 'WAITING' then amount else pot_amount end),0) from coinflip_games where status in ('WAITING','READY','FLIPPING','SETTLEMENT')),
    'recent_games', (select coalesce(jsonb_agg(x order by x.id desc),'[]'::jsonb) from (
        select g.id, g.status, g.creator_id, g.opponent_id, g.amount, g.creator_side, g.winner_id, g.winning_side, g.payout_amount,
               g.server_seed_hash, g.created_at, g.joined_at, g.completed_at, p.status as payout_status, p.attempts as payout_attempts
        from coinflip_games g left join coinflip_payouts p on p.game_id = g.id order by g.id desc limit 30) x),
    'recent_audit', (select coalesce(jsonb_agg(a order by a.id desc),'[]'::jsonb) from (select * from audit_logs where game_type = 'coinflip' order by id desc limit 50) a));
end $$;

-- ---------- permissions ----------
revoke execute on function public._coinflip_guard() from public, anon, authenticated;
revoke execute on function public._coinflip_entry_check() from public, anon, authenticated;
revoke execute on function public._coinflip_payout_guard() from public, anon, authenticated;
revoke execute on function public._audit_cf(uuid, text, bigint, jsonb) from public, anon, authenticated;
revoke execute on function public._coinflip_lock_wallets(uuid[], text, text) from public, anon, authenticated;
revoke execute on function public._coinflip_refund(bigint, text) from public, anon, authenticated;
revoke execute on function public.coinflip_advance(bigint) from public, anon, authenticated;
revoke execute on function public.coinflip_create(bigint, public.coin_side, text) from public, anon;
revoke execute on function public.coinflip_join(bigint, text) from public, anon;
revoke execute on function public.coinflip_cancel(bigint) from public, anon;
revoke execute on function public.admin_coinflip_overview() from public, anon;
grant execute on function public.coinflip_create(bigint, public.coin_side, text) to authenticated;
grant execute on function public.coinflip_join(bigint, text) to authenticated;
grant execute on function public.coinflip_cancel(bigint) to authenticated;
grant execute on function public.admin_coinflip_overview() to authenticated;
grant execute on function public.coinflip_tick() to anon, authenticated;
grant execute on function public._fair_hmac(bytea, text) to anon, authenticated;
grant execute on function public.coinflip_outcome(bytea, bigint, int) to anon, authenticated;
grant execute on all functions in schema public to service_role;

-- ---------- realtime (result table intentionally NOT published) ----------
alter publication supabase_realtime add table public.coinflip_games, public.coinflip_entries;
alter table public.coinflip_games replica identity full;

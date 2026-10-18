-- lovable-cron-fallback-reviewed: once-per-minute backstop matching existing Jackpot worker; players' clients drive live rounds, this only settles unattended rounds before the stuck-refund window
alter type public.tx_kind add value if not exists 'roulette_entry';
alter type public.tx_kind add value if not exists 'roulette_settlement';
alter type public.tx_kind add value if not exists 'roulette_refund';

create type public.roulette_color as enum ('RED', 'BLACK', 'YELLOW', 'GREEN');
create type public.roulette_status as enum ('WAITING', 'BETTING', 'LOCKED', 'SPINNING', 'SETTLEMENT', 'COMPLETED', 'CANCELLED');
create type public.roulette_bet_status as enum ('ACCEPTED', 'WON', 'LOST', 'REFUNDED');
create type public.roulette_payout_kind as enum ('WINNER', 'REFUND');

alter table public.audit_logs drop constraint audit_logs_game_type_check;
alter table public.audit_logs add constraint audit_logs_game_type_check check (game_type in ('jackpot', 'coinflip', 'roulette'));
alter table public.game_chat_messages drop constraint game_chat_messages_game_type_check;
alter table public.game_chat_messages add constraint game_chat_messages_game_type_check check (game_type in ('jackpot', 'coinflip', 'roulette'));

create or replace function public._roulette_immutable() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'IMMUTABLE_RECORD %', tg_table_name; end $$;
revoke execute on function public._roulette_immutable() from public, anon, authenticated;

create table public.roulette_wheels (
  version integer primary key check (version > 0),
  slot_count integer not null check (slot_count between 2 and 1000),
  layout public.roulette_color[] not null,
  multipliers_bps jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public._roulette_wheel_check() returns trigger language plpgsql set search_path = '' as $$
declare c public.roulette_color; n integer; m integer;
begin
  if array_length(new.layout, 1) is distinct from new.slot_count then raise exception 'WHEEL_LAYOUT_SIZE'; end if;
  foreach c in array enum_range(null::public.roulette_color) loop
    select count(*) into n from unnest(new.layout) x where x = c;
    m := (new.multipliers_bps ->> c::text)::integer;
    if n < 1 or m is null or m < 10000 then raise exception 'WHEEL_COLOR_INVALID %', c; end if;
    if n::bigint * m > new.slot_count::bigint * 10000 then raise exception 'WHEEL_RTP_ABOVE_100 %', c; end if;
  end loop;
  return new;
end $$;
revoke execute on function public._roulette_wheel_check() from public, anon, authenticated;
create trigger wheel_check before insert on public.roulette_wheels for each row execute function public._roulette_wheel_check();
create trigger wheel_immutable before update or delete on public.roulette_wheels for each row execute function public._roulette_immutable();

insert into public.roulette_wheels (version, slot_count, layout, multipliers_bps) values (1, 15,
  array['GREEN','RED','BLACK','YELLOW','RED','BLACK','RED','YELLOW','BLACK','RED','BLACK','YELLOW','RED','BLACK','YELLOW']::public.roulette_color[],
  '{"RED": 28000, "BLACK": 28000, "YELLOW": 35000, "GREEN": 140000}'::jsonb);

create table public.roulette_config (
  id boolean primary key default true check (id),
  wheel_version integer not null references public.roulette_wheels(version),
  betting_seconds integer not null default 20 check (betting_seconds between 1 and 120),
  lock_ms integer not null default 1000 check (lock_ms between 0 and 10000),
  spin_ms integer not null default 5000 check (spin_ms between 200 and 15000),
  min_bet bigint not null default 100 check (min_bet >= 1),
  max_bet bigint not null default 1000000 check (max_bet <= 1000000),
  max_pot bigint not null default 100000000 check (max_pot <= 100000000),
  max_bets_per_user integer not null default 10 check (max_bets_per_user between 1 and 50),
  max_bets_per_round integer not null default 500 check (max_bets_per_round between 1 and 2000),
  stuck_cancel_seconds integer not null default 600 check (stuck_cancel_seconds >= 60),
  updated_at timestamptz not null default now(),
  constraint bet_bounds check (max_bet >= min_bet and max_pot >= max_bet)
);
insert into public.roulette_config (wheel_version) values (1);

create table public.roulette_games (
  id bigint generated always as identity primary key,
  status public.roulette_status not null default 'WAITING',
  wheel_version integer not null references public.roulette_wheels(version),
  protocol_version text not null default 'v1',
  draw_version integer not null default 1,
  asset text not null,
  account_type text not null,
  min_bet bigint not null,
  max_bet bigint not null,
  max_pot bigint not null,
  max_bets_per_user integer not null,
  max_bets_per_round integer not null,
  betting_seconds integer not null,
  lock_ms integer not null,
  spin_ms integer not null,
  stuck_cancel_seconds integer not null,
  server_seed_hash text not null check (server_seed_hash ~ '^[0-9a-f]{64}$'),
  server_seed text,
  draw_counter integer,
  pot_amount bigint not null default 0 check (pot_amount >= 0),
  bet_count integer not null default 0 check (bet_count >= 0),
  player_count integer not null default 0 check (player_count >= 0),
  created_at timestamptz not null default now(),
  betting_started_at timestamptz,
  betting_ends_at timestamptz,
  locked_at timestamptz,
  spin_start_at timestamptz,
  spin_end_at timestamptz,
  settlement_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  winning_slot integer,
  winning_color public.roulette_color,
  total_payout bigint,
  house_result bigint,
  settle_attempts integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now(),
  constraint pot_cap check (pot_amount <= max_pot and pot_amount <= 100000000),
  constraint real_money_off check (account_type = 'test_credit')
);
create unique index roulette_one_open on public.roulette_games ((true)) where status in ('WAITING', 'BETTING');
create index roulette_games_status_idx on public.roulette_games (status, id desc);

create table public.roulette_game_secrets (
  game_id bigint primary key references public.roulette_games(id),
  server_seed bytea not null check (octet_length(server_seed) = 32)
);
create table public.roulette_results (
  game_id bigint primary key references public.roulette_games(id),
  protocol_version text not null,
  draw_version integer not null,
  wheel_version integer not null references public.roulette_wheels(version),
  server_seed_hash text not null,
  message text not null,
  hmac_hex text not null,
  draw_counter integer not null,
  slot integer not null,
  color public.roulette_color not null,
  created_at timestamptz not null default now()
);

create table public.roulette_bets (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references public.roulette_games(id),
  user_id uuid not null references public.profiles(id),
  color public.roulette_color not null,
  amount bigint not null check (amount > 0),
  multiplier_bps integer not null check (multiplier_bps >= 10000),
  status public.roulette_bet_status not null default 'ACCEPTED',
  payout_amount bigint check (payout_amount >= 0),
  ledger_tx_id uuid not null references public.ledger_transactions(id),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (user_id, idempotency_key)
);
create index roulette_bets_game_idx on public.roulette_bets (game_id, created_at);
create index roulette_bets_user_idx on public.roulette_bets (user_id, created_at desc);

create table public.roulette_payouts (
  bet_id uuid primary key references public.roulette_bets(id),
  game_id bigint not null references public.roulette_games(id),
  kind public.roulette_payout_kind not null,
  beneficiary_id uuid not null references public.profiles(id),
  amount bigint not null check (amount > 0),
  idempotency_key text not null unique,
  ledger_tx_id uuid not null unique references public.ledger_transactions(id),
  created_at timestamptz not null default now()
);
create index roulette_payouts_game_idx on public.roulette_payouts (game_id);

grant select on public.roulette_wheels, public.roulette_config, public.roulette_games, public.roulette_bets, public.roulette_payouts to anon, authenticated;
grant all on public.roulette_wheels, public.roulette_config, public.roulette_games, public.roulette_bets, public.roulette_payouts,
  public.roulette_game_secrets, public.roulette_results to service_role;
alter table public.roulette_wheels enable row level security;
alter table public.roulette_config enable row level security;
alter table public.roulette_games enable row level security;
alter table public.roulette_bets enable row level security;
alter table public.roulette_payouts enable row level security;
alter table public.roulette_game_secrets enable row level security;
alter table public.roulette_results enable row level security;
create policy "roulette wheels public" on public.roulette_wheels for select to anon, authenticated using (true);
create policy "roulette config public" on public.roulette_config for select to anon, authenticated using (true);
create policy "roulette games public" on public.roulette_games for select to anon, authenticated using (true);
create policy "roulette bets public" on public.roulette_bets for select to anon, authenticated using (true);
create policy "roulette payouts public" on public.roulette_payouts for select to anon, authenticated using (true);

create or replace function public._roulette_game_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD roulette_games'; end if;
  if old.status in ('COMPLETED', 'CANCELLED') then raise exception 'IMMUTABLE_RECORD roulette_games'; end if;
  if new.id <> old.id or new.wheel_version <> old.wheel_version or new.protocol_version <> old.protocol_version
     or new.draw_version <> old.draw_version or new.server_seed_hash <> old.server_seed_hash
     or new.asset <> old.asset or new.account_type <> old.account_type
     or new.min_bet <> old.min_bet or new.max_bet <> old.max_bet or new.max_pot <> old.max_pot
     or new.max_bets_per_user <> old.max_bets_per_user or new.max_bets_per_round <> old.max_bets_per_round
     or new.betting_seconds <> old.betting_seconds or new.lock_ms <> old.lock_ms or new.spin_ms <> old.spin_ms
     or new.stuck_cancel_seconds <> old.stuck_cancel_seconds or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if new.status <> old.status and not (
       (old.status = 'WAITING' and new.status = 'BETTING') or
       (old.status = 'BETTING' and new.status in ('LOCKED', 'CANCELLED')) or
       (old.status = 'LOCKED' and new.status = 'SPINNING') or
       (old.status = 'SPINNING' and new.status = 'SETTLEMENT') or
       (old.status = 'SETTLEMENT' and new.status = 'COMPLETED')) then
    raise exception 'ILLEGAL_TRANSITION % -> %', old.status, new.status;
  end if;
  if (new.pot_amount <> old.pot_amount or new.bet_count <> old.bet_count or new.player_count <> old.player_count)
     and old.status not in ('WAITING', 'BETTING') then
    raise exception 'BETTING_CLOSED';
  end if;
  if new.pot_amount < old.pot_amount or new.bet_count < old.bet_count then raise exception 'IMMUTABLE_FIELD'; end if;
  if (old.betting_ends_at is not null and new.betting_ends_at is distinct from old.betting_ends_at)
     or (old.spin_start_at is not null and new.spin_start_at is distinct from old.spin_start_at)
     or (old.spin_end_at is not null and new.spin_end_at is distinct from old.spin_end_at)
     or (old.winning_slot is not null and new.winning_slot is distinct from old.winning_slot)
     or (old.winning_color is not null and new.winning_color is distinct from old.winning_color) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if new.winning_color is not null and new.status not in ('SPINNING', 'SETTLEMENT', 'COMPLETED') then raise exception 'RESULT_NOT_PUBLIC'; end if;
  if new.server_seed is not null and new.status not in ('COMPLETED', 'CANCELLED') then raise exception 'SEED_NOT_REVEALABLE'; end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public._roulette_game_guard() from public, anon, authenticated;
create trigger roulette_game_guard before update or delete on public.roulette_games for each row execute function public._roulette_game_guard();

create or replace function public._roulette_bet_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD roulette_bets'; end if;
  if new.id <> old.id or new.game_id <> old.game_id or new.user_id <> old.user_id or new.color <> old.color
     or new.amount <> old.amount or new.multiplier_bps <> old.multiplier_bps or new.ledger_tx_id <> old.ledger_tx_id
     or new.idempotency_key <> old.idempotency_key or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if old.status <> 'ACCEPTED' or new.status = 'ACCEPTED' then raise exception 'ILLEGAL_TRANSITION'; end if;
  return new;
end $$;
revoke execute on function public._roulette_bet_guard() from public, anon, authenticated;
create trigger roulette_bet_guard before update or delete on public.roulette_bets for each row execute function public._roulette_bet_guard();

create trigger roulette_payouts_immutable before update or delete on public.roulette_payouts for each row execute function public._roulette_immutable();
create trigger roulette_results_immutable before update or delete on public.roulette_results for each row execute function public._roulette_immutable();
create trigger roulette_secrets_immutable before update or delete on public.roulette_game_secrets for each row execute function public._roulette_immutable();

do $$ declare t text; begin
  foreach t in array array['roulette_games','roulette_bets','roulette_payouts','roulette_results','roulette_game_secrets','roulette_wheels'] loop
    execute format('create trigger no_truncate before truncate on public.%I for each statement execute function public._no_truncate()', t);
  end loop;
end $$;
create trigger live_session before insert on public.roulette_bets for each row execute function public._require_live_session();

create or replace function public.roulette_draw_slot(p_seed bytea, p_game_id bigint, p_draw_version integer, p_n integer,
  out slot integer, out counter integer, out hmac_hex text)
language plpgsql immutable set search_path = '' as $$
declare h bytea; r numeric; lim numeric; two64 numeric := 18446744073709551616; i integer;
begin
  if p_seed is null or octet_length(p_seed) <> 32 then raise exception 'INVALID_SEED'; end if;
  if p_n is null or p_n < 2 then raise exception 'INVALID_RANGE'; end if;
  lim := div(two64, p_n::numeric) * p_n;
  counter := 0;
  loop
    h := extensions.hmac(convert_to('PVPCasino:roulette:v1:' || p_game_id || ':' || p_draw_version || ':' || counter, 'UTF8'), p_seed, 'sha256');
    r := 0;
    for i in 0..7 loop r := r * 256 + get_byte(h, i); end loop;
    if r < lim then slot := mod(r, p_n::numeric)::integer; hmac_hex := encode(h, 'hex'); return; end if;
    counter := counter + 1;
    if counter > 1000 then raise exception 'DRAW_EXHAUSTED'; end if;
  end loop;
end $$;
revoke execute on function public.roulette_draw_slot(bytea, bigint, integer, integer) from public, anon, authenticated;

create or replace function public._roulette_audit(p_actor uuid, p_action text, p_game bigint, p_details jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, game_id, details, game_type) values (p_actor, p_action, p_game, coalesce(p_details, '{}'::jsonb), 'roulette');
$$;
revoke execute on function public._roulette_audit(uuid, text, bigint, jsonb) from public, anon, authenticated;

create or replace function public._roulette_ensure_open() returns bigint language plpgsql security definer set search_path = '' as $$
declare gid bigint; c public.roulette_config; jc public.jackpot_config; seed bytea;
begin
  select id into gid from public.roulette_games where status in ('WAITING', 'BETTING') limit 1;
  if gid is not null then return gid; end if;
  perform pg_advisory_xact_lock(hashtext('roulette:open'));
  select id into gid from public.roulette_games where status in ('WAITING', 'BETTING') limit 1;
  if gid is not null then return gid; end if;
  select * into c from public.roulette_config;
  select * into jc from public.jackpot_config;
  if jc.real_money_enabled or jc.account_type <> 'test_credit' then raise exception 'REAL_MONEY_DISABLED'; end if;
  seed := extensions.gen_random_bytes(32);
  insert into public.roulette_games (wheel_version, asset, account_type, min_bet, max_bet, max_pot, max_bets_per_user, max_bets_per_round,
      betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, server_seed_hash)
    values (c.wheel_version, jc.asset, jc.account_type, c.min_bet, c.max_bet, c.max_pot, c.max_bets_per_user, c.max_bets_per_round,
      c.betting_seconds, c.lock_ms, c.spin_ms, c.stuck_cancel_seconds, encode(extensions.digest(seed, 'sha256'), 'hex'))
    returning id into gid;
  insert into public.roulette_game_secrets (game_id, server_seed) values (gid, seed);
  perform public._roulette_audit(null, 'ROUND_CREATED', gid, jsonb_build_object('wheel_version', c.wheel_version));
  return gid;
end $$;
revoke execute on function public._roulette_ensure_open() from public, anon, authenticated;

create or replace function public.roulette_bet(p_color public.roulette_color, p_amount bigint, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); prof public.profiles; b public.roulette_bets; g public.roulette_games; w public.roulette_wheels;
  gid bigint; mult integer; bid uuid; tx uuid; avail uuid; lck uuid; bal bigint; ts timestamptz; n_user integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  if p_color is null then raise exception 'INVALID_COLOR'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'BELOW_MIN_WAGER'; end if;
  perform pg_advisory_xact_lock(hashtext('rl:' || uid::text || ':' || p_idempotency_key));
  select * into b from public.roulette_bets where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if b.color <> p_color or b.amount <> p_amount then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return jsonb_build_object('duplicate', true, 'bet_id', b.id, 'game_id', b.game_id);
  end if;
  select * into prof from public.profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;

  gid := public._roulette_ensure_open();
  select * into g from public.roulette_games where id = gid for update;
  ts := clock_timestamp();
  if g.status not in ('WAITING', 'BETTING') or (g.status = 'BETTING' and ts >= g.betting_ends_at) then raise exception 'BETTING_CLOSED'; end if;
  if g.account_type <> 'test_credit' then raise exception 'REAL_MONEY_DISABLED'; end if;
  if p_amount < g.min_bet then raise exception 'BELOW_MIN_WAGER'; end if;
  if p_amount > g.max_bet then raise exception 'ABOVE_MAX_WAGER'; end if;
  if g.pot_amount + p_amount > g.max_pot then raise exception 'POT_LIMIT_REACHED'; end if;
  if g.bet_count >= g.max_bets_per_round then raise exception 'ROUND_FULL'; end if;
  select count(*) into n_user from public.roulette_bets where game_id = g.id and user_id = uid;
  if n_user >= g.max_bets_per_user then raise exception 'TOO_MANY_BETS'; end if;
  select * into w from public.roulette_wheels where version = g.wheel_version;
  mult := (w.multipliers_bps ->> p_color::text)::integer;
  if mult is null then raise exception 'INVALID_COLOR'; end if;

  avail := public._user_account(uid, 'user_available', g.asset, g.account_type);
  lck := public._user_account(uid, 'user_locked', g.asset, g.account_type);
  perform public._coinflip_lock_wallets(array[uid], g.asset, g.account_type);
  select balance into bal from public.wallet_accounts where id = avail;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  bid := gen_random_uuid();
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('roulette_entry', 'roulette:bet:' || bid || ':entry', g.account_type, uid, g.id, 'Roulette wager') returning id into tx;
  perform public._post(tx, avail, -p_amount);
  perform public._post(tx, lck, p_amount);
  insert into public.roulette_bets (id, game_id, user_id, color, amount, multiplier_bps, ledger_tx_id, idempotency_key, created_at)
    values (bid, g.id, uid, p_color, p_amount, mult, tx, p_idempotency_key, ts);
  update public.roulette_games set pot_amount = pot_amount + p_amount, bet_count = bet_count + 1,
      player_count = player_count + case when n_user = 0 then 1 else 0 end,
      status = 'BETTING', betting_started_at = coalesce(betting_started_at, ts),
      betting_ends_at = coalesce(betting_ends_at, ts + make_interval(secs => betting_seconds))
    where id = g.id returning * into g;
  perform public._roulette_audit(uid, 'BET_ACCEPTED', g.id, jsonb_build_object('bet_id', bid, 'color', p_color, 'amount', p_amount, 'multiplier_bps', mult));
  return jsonb_build_object('duplicate', false, 'bet_id', bid, 'game_id', g.id, 'betting_ends_at', g.betting_ends_at);
end $$;
revoke execute on function public.roulette_bet(public.roulette_color, bigint, text) from public, anon, authenticated;
grant execute on function public.roulette_bet(public.roulette_color, bigint, text) to authenticated;

create or replace function public._roulette_refund(p_game_id bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.roulette_games; b record; tx uuid; seed bytea;
begin
  select * into g from public.roulette_games where id = p_game_id for update;
  if g.status <> 'BETTING' then raise exception 'NOT_CANCELLABLE'; end if;
  perform public._coinflip_lock_wallets(array(select distinct user_id from public.roulette_bets where game_id = g.id order by 1), g.asset, g.account_type);
  for b in select * from public.roulette_bets where game_id = g.id and status = 'ACCEPTED' order by created_at, id loop
    insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('roulette_refund', 'roulette:bet:' || b.id || ':refund', g.account_type, b.user_id, g.id, 'Roulette refund') returning id into tx;
    perform public._post(tx, public._user_account(b.user_id, 'user_locked', g.asset, g.account_type), -b.amount);
    perform public._post(tx, public._user_account(b.user_id, 'user_available', g.asset, g.account_type), b.amount);
    insert into public.roulette_payouts (bet_id, game_id, kind, beneficiary_id, amount, idempotency_key, ledger_tx_id)
      values (b.id, g.id, 'REFUND', b.user_id, b.amount, 'roulette:bet:' || b.id || ':refund', tx);
    update public.roulette_bets set status = 'REFUNDED', payout_amount = b.amount, settled_at = clock_timestamp() where id = b.id;
  end loop;
  select server_seed into seed from public.roulette_game_secrets where game_id = g.id;
  update public.roulette_games set status = 'CANCELLED', cancelled_at = clock_timestamp(), cancel_reason = p_reason,
    server_seed = encode(seed, 'hex') where id = g.id;
  perform public._roulette_audit(null, 'ROUND_CANCELLED', g.id, jsonb_build_object('reason', p_reason, 'refunds', g.bet_count, 'amount', g.pot_amount));
end $$;
revoke execute on function public._roulette_refund(bigint, text) from public, anon, authenticated;

create or replace function public._roulette_settle(p_game_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.roulette_games; r public.roulette_results; w public.roulette_wheels; seed bytea; d record; b record;
  tx uuid; payout bigint; n integer; s bigint; house uuid; bank uuid; total bigint;
begin
  select * into g from public.roulette_games where id = p_game_id for update;
  if g.status <> 'SETTLEMENT' then raise exception 'NOT_IN_SETTLEMENT'; end if;
  select * into r from public.roulette_results where game_id = g.id;
  if not found then raise exception 'RESULT_MISSING'; end if;
  select * into w from public.roulette_wheels where version = g.wheel_version;
  select server_seed into seed from public.roulette_game_secrets where game_id = g.id;
  if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  select * into d from public.roulette_draw_slot(seed, g.id, g.draw_version, w.slot_count);
  if d.slot <> r.slot or d.hmac_hex <> r.hmac_hex or w.layout[r.slot + 1] <> r.color
     or g.winning_slot is distinct from r.slot or g.winning_color is distinct from r.color then
    raise exception 'INVARIANT_RESULT';
  end if;
  select count(*), coalesce(sum(amount), 0) into n, s from public.roulette_bets where game_id = g.id;
  if n <> g.bet_count or s <> g.pot_amount then raise exception 'INVARIANT_BETS'; end if;
  if exists (select 1 from public.roulette_bets where game_id = g.id and multiplier_bps <> (w.multipliers_bps ->> color::text)::integer) then
    raise exception 'INVARIANT_MULTIPLIER';
  end if;

  perform public._coinflip_lock_wallets(array(select distinct user_id from public.roulette_bets where game_id = g.id order by 1), g.asset, g.account_type);
  house := public._system_account('house_revenue', g.asset, g.account_type);
  bank := public._system_account('test_faucet', g.asset, g.account_type);
  for b in select * from public.roulette_bets where game_id = g.id and status = 'ACCEPTED' order by created_at, id loop
    insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('roulette_settlement', 'roulette:bet:' || b.id || ':settle', g.account_type, b.user_id, g.id, 'Roulette settlement') returning id into tx;
    perform public._post(tx, public._user_account(b.user_id, 'user_locked', g.asset, g.account_type), -b.amount);
    if b.color = r.color then
      payout := (b.amount * b.multiplier_bps) / 10000;
      perform public._post(tx, public._user_account(b.user_id, 'user_available', g.asset, g.account_type), payout);
      perform public._post(tx, bank, -(payout - b.amount));
      insert into public.roulette_payouts (bet_id, game_id, kind, beneficiary_id, amount, idempotency_key, ledger_tx_id)
        values (b.id, g.id, 'WINNER', b.user_id, payout, 'roulette:bet:' || b.id || ':win', tx);
      update public.roulette_bets set status = 'WON', payout_amount = payout, settled_at = clock_timestamp() where id = b.id;
    else
      perform public._post(tx, house, b.amount);
      update public.roulette_bets set status = 'LOST', payout_amount = 0, settled_at = clock_timestamp() where id = b.id;
    end if;
  end loop;
  if current_setting('pvp.fail_after_ledger', true) = 'on' then raise exception 'INJECTED_FAILURE_AFTER_LEDGER'; end if;
  select coalesce(sum(amount), 0) into total from public.roulette_payouts where game_id = g.id and kind = 'WINNER';
  update public.roulette_games set status = 'COMPLETED', completed_at = clock_timestamp(), total_payout = total,
    house_result = g.pot_amount - total, server_seed = encode(seed, 'hex'), draw_counter = r.draw_counter where id = g.id;
  perform public._roulette_audit(null, 'ROUND_COMPLETED', g.id, jsonb_build_object('winning_color', r.color, 'slot', r.slot,
    'pot', g.pot_amount, 'payout', total, 'bets', n));
end $$;
revoke execute on function public._roulette_settle(bigint) from public, anon, authenticated;

create or replace function public.roulette_advance(p_game_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare g public.roulette_games; w public.roulette_wheels; seed bytea; d record; ts timestamptz; err text; rc public.roulette_color;
begin
  select * into g from public.roulette_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED', 'CANCELLED') then return 'noop'; end if;
  if g.status = 'WAITING' then return 'not_due'; end if;
  ts := clock_timestamp();

  if g.status = 'BETTING' then
    if ts < g.betting_ends_at then return 'not_due'; end if;
    if ts >= g.betting_ends_at + make_interval(secs => g.stuck_cancel_seconds) then
      perform public._roulette_refund(g.id, 'STUCK');
      perform public._roulette_ensure_open();
      return 'cancelled';
    end if;
    select * into w from public.roulette_wheels where version = g.wheel_version;
    select server_seed into seed from public.roulette_game_secrets where game_id = g.id;
    if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
    select * into d from public.roulette_draw_slot(seed, g.id, g.draw_version, w.slot_count);
    rc := w.layout[d.slot + 1];
    insert into public.roulette_results (game_id, protocol_version, draw_version, wheel_version, server_seed_hash, message, hmac_hex, draw_counter, slot, color)
      values (g.id, g.protocol_version, g.draw_version, g.wheel_version, g.server_seed_hash,
              'PVPCasino:roulette:v1:' || g.id || ':' || g.draw_version || ':' || d.counter, d.hmac_hex, d.counter, d.slot, rc);
    update public.roulette_games set status = 'LOCKED', locked_at = ts,
        spin_start_at = ts + make_interval(secs => lock_ms / 1000.0),
        spin_end_at = ts + make_interval(secs => (lock_ms + spin_ms) / 1000.0)
      where id = g.id returning * into g;
    perform public._roulette_audit(null, 'ROUND_LOCKED', g.id, jsonb_build_object('bets', g.bet_count, 'pot', g.pot_amount));
  end if;

  if g.status = 'LOCKED' then
    if ts < g.spin_start_at then return 'locked'; end if;
    update public.roulette_games gg set status = 'SPINNING', winning_slot = r.slot, winning_color = r.color
      from public.roulette_results r where r.game_id = gg.id and gg.id = g.id returning gg.* into g;
    perform public._roulette_audit(null, 'SPIN_STARTED', g.id, jsonb_build_object('spin_end_at', g.spin_end_at));
  end if;

  if g.status = 'SPINNING' then
    if ts < g.spin_end_at then return 'spinning'; end if;
    update public.roulette_games set status = 'SETTLEMENT', settlement_started_at = ts where id = g.id returning * into g;
  end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    perform public._roulette_settle(g.id);
  exception when others then
    err := sqlerrm;
    update public.roulette_games set settle_attempts = settle_attempts + 1, last_error = left(err, 500) where id = g.id;
    perform public._roulette_audit(null, 'RECOVERY_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
    return 'failed';
  end;
  perform public._roulette_ensure_open();
  return 'settled';
end $$;
revoke execute on function public.roulette_advance(bigint) from public, anon, authenticated;

insert into public.worker_tick_gate (name) values ('roulette') on conflict do nothing;
create or replace function public.roulette_tick() returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; res text; n_settled integer := 0; n_cancelled integer := 0; n_failed integer := 0; n_steps integer := 0;
begin
  if not public._tick_gate('roulette') then
    return jsonb_build_object('throttled', true, 'server_time', clock_timestamp());
  end if;
  for r in select id from public.roulette_games
           where (status = 'BETTING' and betting_ends_at <= clock_timestamp())
              or (status = 'LOCKED' and spin_start_at <= clock_timestamp())
              or (status = 'SPINNING' and spin_end_at <= clock_timestamp())
              or status = 'SETTLEMENT'
           order by id limit 20 for update skip locked loop
    begin
      res := public.roulette_advance(r.id);
    exception when others then
      perform public._roulette_audit(null, 'RECOVERY_FAILED', r.id, jsonb_build_object('error', left(sqlerrm, 500)));
      res := 'error';
    end;
    n_steps := n_steps + 1;
    if res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    elsif res in ('failed', 'error') then n_failed := n_failed + 1; end if;
  end loop;
  perform public._roulette_ensure_open();
  return jsonb_build_object('steps', n_steps, 'settled', n_settled, 'cancelled', n_cancelled, 'failed', n_failed, 'server_time', clock_timestamp());
end $$;
revoke execute on function public.roulette_tick() from public, anon, authenticated;
grant execute on function public.roulette_tick() to authenticated;

create or replace function public.roulette_integrity_check() returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in
    select 'roulette_pot_mismatch' chk, 'rlp:' || g.id fp, jsonb_build_object('game_id', g.id, 'pot', g.pot_amount, 'bets', g.bet_count) d
      from public.roulette_games g
      where g.pot_amount <> (select coalesce(sum(b.amount), 0) from public.roulette_bets b where b.game_id = g.id)
         or g.bet_count <> (select count(*) from public.roulette_bets b where b.game_id = g.id)
    union all
    select 'roulette_entry_debit_mismatch', 'rle:' || g.id, jsonb_build_object('game_id', g.id)
      from public.roulette_games g
      where (select count(*) from public.roulette_bets b where b.game_id = g.id)
         <> (select count(*) from public.ledger_transactions t where t.game_id = g.id and t.kind = 'roulette_entry')
    union all
    select 'roulette_outcome_mismatch', 'rlo:' || g.id, jsonb_build_object('game_id', g.id, 'status', g.status)
      from public.roulette_games g
      where (select count(*) from public.ledger_transactions t where t.game_id = g.id and t.kind = 'roulette_settlement')
              <> case when g.status = 'COMPLETED' then g.bet_count else 0 end
         or (select count(*) from public.ledger_transactions t where t.game_id = g.id and t.kind = 'roulette_refund')
              <> case when g.status = 'CANCELLED' then g.bet_count else 0 end
         or (select count(*) from public.roulette_payouts p where p.game_id = g.id and p.kind = 'WINNER')
              <> case when g.status = 'COMPLETED' then (select count(*) from public.roulette_bets b where b.game_id = g.id and b.color = g.winning_color) else 0 end
         or exists (select 1 from public.roulette_payouts p join public.roulette_bets b on b.id = p.bet_id
                    where p.game_id = g.id and p.kind = 'WINNER' and (b.color is distinct from g.winning_color or p.amount <> (b.amount * b.multiplier_bps) / 10000))
         or (g.status = 'COMPLETED' and g.total_payout <> (select coalesce(sum(p.amount), 0) from public.roulette_payouts p where p.game_id = g.id and p.kind = 'WINNER'))
  loop
    n := n + 1;
    insert into public.integrity_incidents (check_name, fingerprint, details) values (r.chk, r.fp, r.d)
      on conflict (fingerprint) do update set details = excluded.details, last_seen_at = now(), occurrences = public.integrity_incidents.occurrences + 1;
    raise warning 'INTEGRITY_INCIDENT % %', r.chk, r.d::text;
  end loop;
  return jsonb_build_object('incidents', n);
end $$;
revoke execute on function public.roulette_integrity_check() from public, anon, authenticated;
grant execute on function public.roulette_integrity_check() to service_role;
grant execute on function public.roulette_tick(), public.roulette_advance(bigint), public._roulette_settle(bigint) to service_role;

create or replace function public.chat_send(p_user uuid, p_game text, p_message text, p_severity text, p_reason text)
 returns jsonb language plpgsql security definer set search_path = public as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_r public.game_chat_user_restrictions;
  v_id uuid;
  v_status text;
begin
  if p_user is null or p_game not in ('jackpot','coinflip','roulette') or p_message is null
     or char_length(p_message) < 1 or char_length(p_message) > 500
     or p_severity not in ('LOW','MEDIUM','HIGH') then
    return jsonb_build_object('ok', false, 'code', 'CHAT_INVALID');
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'CHAT_INVALID');
  end if;
  perform pg_advisory_xact_lock(hashtext('chat:' || p_user::text));
  select * into v_r from public.game_chat_user_restrictions where user_id = p_user;
  if found and v_r.banned then
    return jsonb_build_object('ok', false, 'code', 'CHAT_MUTED');
  end if;
  if found and v_r.muted_until is not null and v_r.muted_until > v_now then
    return jsonb_build_object('ok', false, 'code', 'CHAT_MUTED');
  end if;
  if (select count(*) from public.game_chat_messages where user_id = p_user and created_at > v_now - interval '10 seconds') >= 5
     or (select count(*) from public.game_chat_messages where user_id = p_user and created_at > v_now - interval '1 minute') >= 20
     or (select count(*) from public.game_chat_messages where user_id = p_user and created_at > v_now - interval '1 hour') >= 100 then
    insert into public.game_chat_moderation_events (user_id, action, reason_code) values (p_user, 'RATE_LIMITED', 'rate');
    return jsonb_build_object('ok', false, 'code', 'CHAT_RATE_LIMITED');
  end if;
  if exists (select 1 from public.game_chat_messages
             where user_id = p_user and game_type = p_game and lower(message) = lower(p_message)
               and created_at > v_now - interval '30 seconds') then
    insert into public.game_chat_moderation_events (user_id, action, reason_code) values (p_user, 'SPAM_DETECTED', 'duplicate');
    return jsonb_build_object('ok', false, 'code', 'CHAT_RATE_LIMITED');
  end if;
  v_status := case when p_severity = 'LOW' then 'visible' else 'hidden' end;
  insert into public.game_chat_messages (game_type, user_id, message, status, moderation_reason, moderation_provider, created_at, moderated_at)
  values (p_game, p_user, p_message, v_status, nullif(p_reason, ''), 'rules', v_now, case when v_status = 'hidden' then v_now end)
  returning id into v_id;
  if p_severity = 'HIGH' then
    insert into public.game_chat_moderation_events (message_id, user_id, action, reason_code) values (v_id, p_user, 'BLOCKED', p_reason);
    return jsonb_build_object('ok', false, 'code', 'CHAT_BLOCKED');
  elsif p_severity = 'MEDIUM' then
    insert into public.game_chat_moderation_events (message_id, user_id, action, reason_code) values (v_id, p_user, 'HIDDEN', p_reason);
    return jsonb_build_object('ok', false, 'code', 'CHAT_BLOCKED');
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'created_at', v_now);
end $function$;

-- realtime-auth:begin
drop policy if exists "chat rooms receive" on realtime.messages;
create policy "chat rooms receive" on realtime.messages for select to authenticated
  using (realtime.topic() in ('chat:jackpot', 'chat:coinflip', 'chat:roulette') and realtime.messages.extension = 'broadcast');
-- realtime-auth:end

alter publication supabase_realtime add table public.roulette_games, public.roulette_bets;

-- prod-only:begin
do $$ begin
  perform cron.schedule('pvp-roulette-worker', '* * * * *', 'select public.roulette_tick()');
exception when others then raise warning 'roulette cron not scheduled: %', sqlerrm;
end $$;
do $$ begin
  perform cron.schedule('pvp-roulette-integrity', '30 * * * *', 'select public.roulette_integrity_check()');
exception when others then raise warning 'roulette integrity cron not scheduled: %', sqlerrm;
end $$;
-- prod-only:end
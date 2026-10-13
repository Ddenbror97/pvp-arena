-- P2P Slott: a 1v1 slot match on the existing USD ledger.
--
-- Two players stake the same configured amount (P2P pot = 2 × stake). They alternate
-- spins A, B, A, B … on a 5-reel × 4-row grid; six spins each (base_spins = 12). The
-- higher total score wins the P2P pot minus fee_bps, which is taken from the P2P pot only.
-- A tie after 12 spins continues with sudden-death pairs up to max_spins; still tied → both
-- stakes are refunded.
--
-- Three or more WILDs in one spin add a promotional bonus to the SHARED match pool
-- (never to the player who hit it). Bonuses scale with the stake through slot_bonus_tiers,
-- are clamped by per-event, per-match, per-user-per-day and global daily caps, are reserved
-- atomically from slot_bonus_budget, and move house_bankroll (test_faucet on test credits)
-- → game_escrow in the same transaction as the spin. Settlement pays escrow to the winner.
--
-- Fairness (protocol slott:v1): seed committed as SHA256 at creation, revealed at completion.
--   cell c (0..19, c = reel*4 + row) of spin n:
--   h = HMAC-SHA256(seed, "PVPCasino:slott:v1:<game_id>:<n>:<c>")
--   r = (h[0]*256 + h[1]) mod 1024  → symbol by the fixed v1 weights (sum 1024, unbiased).
-- Symbol weights/values and paylines are fixed per protocol version; change them only by
-- adding v2. Bonus tiers and caps are server-side config.

alter type public.tx_kind add value if not exists 'slot_entry';
alter type public.tx_kind add value if not exists 'slot_settlement';
alter type public.tx_kind add value if not exists 'slot_refund';
alter type public.tx_kind add value if not exists 'slot_bonus';

alter table public.audit_logs drop constraint if exists audit_logs_game_type_check;
alter table public.audit_logs add constraint audit_logs_game_type_check
  check (game_type = any (array['jackpot'::text, 'coinflip'::text, 'roulette'::text, 'slot'::text]));

create type public.slot_status as enum ('WAITING', 'ACTIVE', 'SETTLEMENT', 'COMPLETED', 'CANCELLED');

-- ---------------------------------------------------------------- configuration

create table public.slot_config (
  id boolean primary key default true check (id),
  stakes bigint[] not null default '{100,500,1000,2500,5000,10000}'
    check (array_length(stakes, 1) between 1 and 12 and 0 < all (stakes) and 5000000 >= all (stakes)),
  fee_bps integer not null default 500 check (fee_bps between 0 and 1000),
  base_spins integer not null default 12 check (base_spins between 2 and 40 and base_spins % 2 = 0),
  max_spins integer not null default 32 check (max_spins % 2 = 0 and max_spins <= 60),
  waiting_timeout_seconds integer not null default 1800 check (waiting_timeout_seconds between 60 and 86400),
  pre_delay_ms integer not null default 3000 check (pre_delay_ms between 0 and 15000),
  spin_ms integer not null default 3200 check (spin_ms between 500 and 10000),
  turn_seconds integer not null default 20 check (turn_seconds between 5 and 120),
  create_rate_limit integer not null default 5 check (create_rate_limit > 0),
  create_rate_window_seconds integer not null default 10 check (create_rate_window_seconds > 0),
  max_open_per_user integer not null default 3 check (max_open_per_user > 0),
  match_cap_bps integer not null default 30000 check (match_cap_bps between 0 and 100000),
  max_event_bonus_cents bigint not null default 30000 check (max_event_bonus_cents >= 0),
  max_match_bonus_cents bigint not null default 30000 check (max_match_bonus_cents >= 0),
  updated_at timestamptz not null default now(),
  constraint slot_config_spins check (max_spins >= base_spins)
);
insert into public.slot_config default values;

-- Budget knobs are operator-only; players see the tier rules and caps above.
create table public.slot_promo_config (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  daily_budget_cents bigint not null default 2500 check (daily_budget_cents >= 0),
  user_daily_cap_cents bigint not null default 3000 check (user_daily_cap_cents >= 0),
  updated_at timestamptz not null default now()
);
insert into public.slot_promo_config default values;

create table public.slot_bonus_tiers (
  min_wilds smallint primary key check (min_wilds between 1 and 20),
  tier text not null unique check (tier ~ '^[A-Z_]{3,20}$'),
  stake_bps integer not null check (stake_bps between 1 and 100000)
);
insert into public.slot_bonus_tiers (min_wilds, tier, stake_bps) values
  (3, 'WILD', 2000), (4, 'MEGA_WILD', 5000), (5, 'GOLDEN_WILD', 10000), (6, 'JACKPOT_WILD', 30000);

-- ---------------------------------------------------------------- match records

create table public.slot_games (
  id bigint generated always as identity primary key,
  status public.slot_status not null default 'WAITING',
  money_domain text not null,
  asset text not null,
  account_type text not null check (account_type in ('test_credit', 'real')),
  creator_id uuid not null references public.profiles (id),
  opponent_id uuid references public.profiles (id),
  stake bigint not null check (stake > 0),
  p2p_pot bigint not null,
  bonus_total bigint not null default 0 check (bonus_total >= 0),
  bonus_cap bigint not null check (bonus_cap >= 0),
  fee_bps integer not null check (fee_bps between 0 and 1000),
  base_spins integer not null,
  max_spins integer not null,
  spin_ms integer not null,
  turn_seconds integer not null,
  protocol_version text not null default 'v1' check (protocol_version = 'v1'),
  server_seed_hash text not null check (server_seed_hash ~ '^[0-9a-f]{64}$'),
  server_seed text,
  next_spin integer not null default 1,
  score_a integer not null default 0 check (score_a >= 0),
  score_b integer not null default 0 check (score_b >= 0),
  turn_opens_at timestamptz,
  turn_deadline timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  joined_at timestamptz,
  settlement_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (cancel_reason in ('EXPIRED', 'CREATOR_CANCELLED')),
  outcome text check (outcome in ('WIN', 'DRAW')),
  winner_id uuid references public.profiles (id),
  fee_amount bigint,
  payout_amount bigint,
  settle_attempts integer not null default 0,
  last_error text,
  updated_at timestamptz not null default clock_timestamp(),
  constraint slot_games_domain check ((money_domain = 'TEST_USD' and asset = 'TEST_USD' and account_type = 'test_credit')
    or (money_domain = 'REAL_USD' and asset = 'USD' and account_type = 'real')),
  constraint pot_is_double check (p2p_pot = stake * 2),
  constraint pot_hard_cap check (p2p_pot <= 100000000),
  constraint bonus_within_cap check (bonus_total <= bonus_cap),
  constraint spins_range check (next_spin between 1 and max_spins + 1 and max_spins >= base_spins),
  constraint joined_iff_opponent check ((status in ('WAITING', 'CANCELLED')) = (opponent_id is null)),
  constraint opponent_differs check (opponent_id is null or opponent_id <> creator_id),
  constraint cancelled_fields check ((status = 'CANCELLED') = (cancelled_at is not null and cancel_reason is not null)),
  constraint seed_hidden_until_done check (server_seed is null or status = 'COMPLETED'),
  constraint winner_is_player check (winner_id is null or winner_id = creator_id or winner_id = opponent_id),
  constraint completed_has_result check (status <> 'COMPLETED' or (
    server_seed is not null and completed_at is not null and (
      (outcome = 'WIN' and winner_id is not null and fee_amount = (p2p_pot * fee_bps) / 10000
        and payout_amount + fee_amount = p2p_pot + bonus_total)
      or (outcome = 'DRAW' and winner_id is null and fee_amount = 0 and payout_amount = 0))))
);
create index slot_games_open on public.slot_games (created_at desc) where status = 'WAITING';
create index slot_games_live on public.slot_games (id desc) where status in ('ACTIVE', 'SETTLEMENT');
create index slot_games_completed on public.slot_games (completed_at desc) where status = 'COMPLETED';
create index slot_games_creator on public.slot_games (creator_id, created_at desc);
create index slot_games_opponent on public.slot_games (opponent_id, created_at desc);

create table public.slot_game_secrets (
  game_id bigint primary key references public.slot_games (id),
  server_seed bytea not null check (length(server_seed) = 32)
);

create table public.slot_entries (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references public.slot_games (id),
  user_id uuid not null references public.profiles (id),
  seat text not null check (seat in ('A', 'B')),
  amount bigint not null check (amount > 0),
  ledger_tx_id uuid not null unique references public.ledger_transactions (id),
  idempotency_key text not null check (length(idempotency_key) between 8 and 100),
  created_at timestamptz not null default clock_timestamp(),
  unique (game_id, seat),
  unique (game_id, user_id),
  unique (user_id, idempotency_key)
);
create index slot_entries_user on public.slot_entries (user_id, created_at desc);

create table public.slot_spins (
  game_id bigint not null references public.slot_games (id),
  spin_no integer not null check (spin_no >= 1),
  seat text not null check (seat in ('A', 'B')),
  player_id uuid not null references public.profiles (id),
  auto boolean not null default false,
  idempotency_key text check (idempotency_key is null or length(idempotency_key) between 8 and 100),
  grid smallint[] not null check (array_length(grid, 1) = 20 and 0 <= all (grid) and 19 >= all (grid)),
  wild_count smallint not null check (wild_count between 0 and 20),
  base_score integer not null check (base_score >= 0),
  line_score integer not null check (line_score >= 0),
  score integer not null,
  lines jsonb not null default '[]'::jsonb,
  bonus_cents bigint not null default 0 check (bonus_cents >= 0),
  created_at timestamptz not null default clock_timestamp(),
  reveal_at timestamptz not null,
  primary key (game_id, spin_no),
  constraint seat_by_parity check ((spin_no % 2 = 1) = (seat = 'A')),
  constraint score_sum check (score = base_score + line_score),
  constraint auto_has_no_key check (auto = (idempotency_key is null))
);
create unique index slot_spins_player_key on public.slot_spins (player_id, idempotency_key) where idempotency_key is not null;

create table public.slot_bonus_budget (
  day date primary key,
  budget_cents bigint not null check (budget_cents >= 0),
  reserved_cents bigint not null default 0 check (reserved_cents >= 0),
  updated_at timestamptz not null default clock_timestamp(),
  constraint within_budget check (reserved_cents <= budget_cents)
);

create table public.slot_bonus_events (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null references public.slot_games (id),
  spin_no integer not null,
  triggered_by uuid not null references public.profiles (id),
  wild_count smallint not null check (wild_count >= 1),
  tier text not null,
  tier_bps integer not null,
  requested_cents bigint not null check (requested_cents > 0),
  awarded_cents bigint not null check (awarded_cents > 0),
  pool_before bigint not null,
  pool_after bigint not null,
  budget_day date not null references public.slot_bonus_budget (day),
  ledger_tx_id uuid not null unique references public.ledger_transactions (id),
  status text not null default 'AWARDED' check (status in ('AWARDED', 'PAID', 'RETURNED')),
  return_tx_id uuid unique references public.ledger_transactions (id),
  created_at timestamptz not null default clock_timestamp(),
  unique (game_id, spin_no),
  foreign key (game_id, spin_no) references public.slot_spins (game_id, spin_no),
  constraint awarded_within_request check (awarded_cents <= requested_cents),
  constraint pool_math check (pool_after = pool_before + awarded_cents),
  constraint returned_has_tx check ((status = 'RETURNED') = (return_tx_id is not null))
);
create index slot_bonus_events_day on public.slot_bonus_events (budget_day);

create table public.slot_payouts (
  game_id bigint not null references public.slot_games (id),
  beneficiary_id uuid not null references public.profiles (id),
  kind text not null check (kind in ('WINNER', 'DRAW_REFUND', 'EXPIRED_REFUND', 'CANCEL_REFUND')),
  amount bigint not null check (amount >= 0),
  ledger_tx_id uuid not null references public.ledger_transactions (id),
  created_at timestamptz not null default clock_timestamp(),
  primary key (game_id, beneficiary_id)
);

-- ---------------------------------------------------------------- guards

create or replace function public._slot_guard()
returns trigger language plpgsql set search_path = public as $$
declare n int; sa bigint; sb bigint; bt bigint;
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD slot_games'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'WAITING' or new.opponent_id is not null or new.winner_id is not null or new.server_seed is not null
       or new.next_spin <> 1 or new.score_a <> 0 or new.score_b <> 0 or new.bonus_total <> 0 or new.outcome is not null then
      raise exception 'ILLEGAL_INITIAL_STATE';
    end if;
    return new;
  end if;
  if old.status in ('COMPLETED', 'CANCELLED') then raise exception 'IMMUTABLE_RECORD slot game %', old.id; end if;
  if (old.status::text || '>' || new.status::text) not in
     ('WAITING>ACTIVE', 'WAITING>CANCELLED', 'ACTIVE>ACTIVE', 'ACTIVE>SETTLEMENT', 'SETTLEMENT>SETTLEMENT', 'SETTLEMENT>COMPLETED') then
    raise exception 'ILLEGAL_TRANSITION % -> %', old.status, new.status;
  end if;
  if (new.creator_id, new.stake, new.p2p_pot, new.bonus_cap, new.fee_bps, new.base_spins, new.max_spins, new.spin_ms,
      new.turn_seconds, new.protocol_version, new.server_seed_hash, new.created_at, new.expires_at, new.asset,
      new.account_type, new.money_domain)
     is distinct from
     (old.creator_id, old.stake, old.p2p_pot, old.bonus_cap, old.fee_bps, old.base_spins, old.max_spins, old.spin_ms,
      old.turn_seconds, old.protocol_version, old.server_seed_hash, old.created_at, old.expires_at, old.asset,
      old.account_type, old.money_domain) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if old.opponent_id is not null and (new.opponent_id, new.joined_at) is distinct from (old.opponent_id, old.joined_at) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if new.next_spin < old.next_spin or new.bonus_total < old.bonus_total
     or (old.ends_at is not null and new.ends_at is distinct from old.ends_at) then
    raise exception 'IMMUTABLE_FIELD progress';
  end if;
  if new.status not in ('WAITING', 'CANCELLED') then
    select count(*), coalesce(sum(score) filter (where seat = 'A'), 0), coalesce(sum(score) filter (where seat = 'B'), 0),
           coalesce(sum(bonus_cents), 0)
      into n, sa, sb, bt from slot_spins where game_id = new.id;
    if n <> new.next_spin - 1 or sa <> new.score_a or sb <> new.score_b then raise exception 'SCORE_MISMATCH'; end if;
    if bt <> new.bonus_total then raise exception 'BONUS_MISMATCH'; end if;
  end if;
  if old.status = 'ACTIVE' and new.status = 'SETTLEMENT' and (new.ends_at is null or clock_timestamp() < new.ends_at) then
    raise exception 'TOO_EARLY settlement';
  end if;
  if new.status = 'CANCELLED' and new.cancel_reason = 'EXPIRED' and clock_timestamp() < new.expires_at then
    raise exception 'TOO_EARLY expiry';
  end if;
  if new.status = 'COMPLETED' then
    if new.outcome = 'WIN' and (new.score_a = new.score_b
       or new.winner_id <> case when new.score_a > new.score_b then new.creator_id else new.opponent_id end) then
      raise exception 'RESULT_MISMATCH';
    end if;
    if new.outcome = 'DRAW' and new.score_a <> new.score_b then raise exception 'RESULT_MISMATCH'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

create trigger slot_guard before insert or update or delete on public.slot_games
  for each row execute function public._slot_guard();
create trigger money_domain_immutable before update on public.slot_games
  for each row execute function public._money_domain_immutable();

create or replace function public._slot_bonus_event_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD slot_bonus_events'; end if;
  if old.status <> 'AWARDED' or new.status not in ('PAID', 'RETURNED') then raise exception 'ILLEGAL_TRANSITION bonus'; end if;
  if (new.id, new.game_id, new.spin_no, new.triggered_by, new.wild_count, new.tier, new.tier_bps, new.requested_cents,
      new.awarded_cents, new.pool_before, new.pool_after, new.budget_day, new.ledger_tx_id, new.created_at)
     is distinct from
     (old.id, old.game_id, old.spin_no, old.triggered_by, old.wild_count, old.tier, old.tier_bps, old.requested_cents,
      old.awarded_cents, old.pool_before, old.pool_after, old.budget_day, old.ledger_tx_id, old.created_at) then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  return new;
end $$;

create trigger slot_bonus_event_guard before update or delete on public.slot_bonus_events
  for each row execute function public._slot_bonus_event_guard();
create trigger no_mutation before update or delete on public.slot_spins for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.slot_entries for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.slot_game_secrets for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.slot_payouts for each row execute function public._immutable();
create trigger no_delete before delete on public.slot_bonus_budget for each row execute function public._immutable();

-- ---------------------------------------------------------------- fairness (pure)

create or replace function public.slot_spin_grid(p_seed bytea, p_game_id bigint, p_spin_no integer)
returns smallint[] language plpgsql immutable set search_path = public, extensions as $$
declare
  w int[] := array[80,80,80,80,80,50,80,16,28,50,50,28,28,50,50,80,28,18,50,18];
  g smallint[] := '{}';
  h bytea; r int; acc int; s int;
begin
  if p_seed is null or length(p_seed) <> 32 then raise exception 'INVALID_SEED'; end if;
  if p_game_id is null or p_game_id < 1 or p_spin_no is null or p_spin_no < 1 then raise exception 'INVALID_SPIN'; end if;
  for c in 0..19 loop
    h := public._fair_hmac(p_seed, 'PVPCasino:slott:v1:' || p_game_id || ':' || p_spin_no || ':' || c);
    r := (get_byte(h, 0) * 256 + get_byte(h, 1)) % 1024;
    acc := 0; s := 0;
    loop
      acc := acc + w[s + 1];
      exit when r < acc;
      s := s + 1;
    end loop;
    g := g || s::smallint;
  end loop;
  return g;
end $$;

-- Base score = sum of cell values; line wins on 5 fixed lines (4 rows + a V), left to right,
-- 3+ matching with WILD (7) substituting. All-WILD line pays as WILD.
create or replace function public.slot_score_v1(p_grid smallint[], out wilds integer, out base integer, out line_score integer, out lines jsonb)
language plpgsql immutable set search_path = public as $$
declare
  v int[] := array[1,1,1,1,1,2,1,10,4,2,2,4,4,2,2,1,4,8,2,8];
  paylines int[] := array[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[3,3,3,3,3],[0,1,2,1,0]];
  mult int[] := array[0,0,5,15,50];
  sym int; run int; cell int; pay int;
begin
  if p_grid is null or array_length(p_grid, 1) <> 20 then raise exception 'INVALID_GRID'; end if;
  wilds := 0; base := 0; line_score := 0; lines := '[]'::jsonb;
  for c in 1..20 loop
    if p_grid[c] = 7 then wilds := wilds + 1; end if;
    base := base + v[p_grid[c] + 1];
  end loop;
  for ln in 1..5 loop
    sym := 7;
    for k in 1..5 loop
      cell := p_grid[(k - 1) * 4 + paylines[ln][k] + 1];
      if cell <> 7 then sym := cell; exit; end if;
    end loop;
    run := 0;
    for k in 1..5 loop
      cell := p_grid[(k - 1) * 4 + paylines[ln][k] + 1];
      exit when cell <> sym and cell <> 7;
      run := run + 1;
    end loop;
    if run >= 3 then
      pay := v[sym + 1] * mult[run];
      line_score := line_score + pay;
      lines := lines || jsonb_build_object('line', ln, 'symbol', sym, 'count', run, 'score', pay);
    end if;
  end loop;
end $$;

create or replace function public.slot_outcome(p_seed bytea, p_game_id bigint, p_spin_no integer,
  out grid smallint[], out wilds integer, out base integer, out line_score integer, out score integer, out lines jsonb)
language plpgsql immutable set search_path = public as $$
declare s record;
begin
  grid := public.slot_spin_grid(p_seed, p_game_id, p_spin_no);
  select * into s from public.slot_score_v1(grid);
  wilds := s.wilds; base := s.base; line_score := s.line_score; score := s.base + s.line_score; lines := s.lines;
end $$;

-- ---------------------------------------------------------------- internals

create or replace function public._audit_slot(p_actor uuid, p_action text, p_game bigint, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, action, game_id, details, game_type)
  values (p_actor, p_action, p_game, coalesce(p_details, '{}'::jsonb), 'slot')
$$;

create or replace function public._slot_refund_waiting(p_game_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.slot_games; tx uuid;
begin
  select * into g from slot_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_CANCELLABLE'; end if;
  perform _coinflip_lock_wallets(array[g.creator_id], g.asset, g.account_type);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('slot_refund', 'slot:' || g.id || ':refund', g.account_type, g.creator_id, g.id, 'P2P Slott refund (no opponent)')
    returning id into tx;
  perform _post(tx, _user_account(g.creator_id, 'user_locked', g.asset, g.account_type), -g.stake);
  perform _post(tx, _user_account(g.creator_id, 'user_available', g.asset, g.account_type), g.stake);
  insert into slot_payouts (game_id, beneficiary_id, kind, amount, ledger_tx_id)
    values (g.id, g.creator_id, case when p_reason = 'EXPIRED' then 'EXPIRED_REFUND' else 'CANCEL_REFUND' end, g.stake, tx);
  update slot_games set status = 'CANCELLED', cancelled_at = clock_timestamp(), cancel_reason = p_reason,
    turn_opens_at = null, turn_deadline = null where id = g.id;
  perform _audit_slot(null, 'GAME_CANCELLED', g.id, jsonb_build_object('reason', p_reason, 'refund', g.stake, 'ledger_tx', tx));
end $$;

-- Performs spin g.next_spin for the seat whose turn it is. Caller must hold the game row lock.
-- p_auto: the worker spins for a player whose turn deadline passed.
create or replace function public._slot_spin(p_game_id bigint, p_actor uuid, p_auto boolean, p_key text)
returns public.slot_spins language plpgsql security definer set search_path = public, extensions as $$
declare
  g public.slot_games; c public.slot_config; pc public.slot_promo_config; t public.slot_bonus_tiers;
  bud public.slot_bonus_budget; sp public.slot_spins;
  seed bytea; n int; v_seat text; pid uuid; grid smallint[]; sc record; ts timestamptz; reveal timestamptz;
  req bigint := 0; award bigint := 0; used bigint; u uuid; v_day date; tx uuid; bank public.account_kind;
  sa int; sb int; done boolean; skip text;
begin
  select * into g from slot_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'ACTIVE' or g.ends_at is not null then raise exception 'MATCH_NOT_ACTIVE'; end if;
  n := g.next_spin;
  v_seat := case when n % 2 = 1 then 'A' else 'B' end;
  pid := case when v_seat = 'A' then g.creator_id else g.opponent_id end;
  ts := clock_timestamp();
  if p_auto then
    if ts < g.turn_deadline then raise exception 'TURN_NOT_EXPIRED'; end if;
  else
    if p_actor is distinct from pid then raise exception 'NOT_YOUR_TURN'; end if;
    if ts < g.turn_opens_at then raise exception 'TURN_NOT_OPEN'; end if;
  end if;

  select server_seed into seed from slot_game_secrets where game_id = g.id;
  if seed is null then raise exception 'SEED_MISSING'; end if;
  if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  grid := slot_spin_grid(seed, g.id, n);
  select * into sc from slot_score_v1(grid);
  reveal := ts + g.spin_ms * interval '1 millisecond';

  -- Promotional bonus for the shared pool: tier by WILD count, scaled by stake, clamped by every cap.
  select * into t from slot_bonus_tiers where min_wilds <= sc.wilds order by min_wilds desc limit 1;
  if found then
    req := (g.stake * t.stake_bps) / 10000;
    select * into c from slot_config;
    select * into pc from slot_promo_config;
    v_day := (clock_timestamp() at time zone 'utc')::date;
    if req <= 0 then skip := 'ZERO_REQUEST';
    elsif not coalesce(pc.enabled, false) then skip := 'PROMO_DISABLED';
    else
      award := least(req, c.max_event_bonus_cents, g.bonus_cap - g.bonus_total);
      insert into slot_bonus_budget (day, budget_cents) values (v_day, pc.daily_budget_cents) on conflict (day) do nothing;
      select * into bud from slot_bonus_budget where day = v_day for update;
      award := least(award, bud.budget_cents - bud.reserved_cents);
      foreach u in array array[g.creator_id, g.opponent_id] loop
        select coalesce(sum(e.awarded_cents), 0) into used
          from slot_bonus_events e join slot_games x on x.id = e.game_id
          where e.budget_day = v_day and e.status <> 'RETURNED' and (x.creator_id = u or x.opponent_id = u);
        award := least(award, pc.user_daily_cap_cents - used);
      end loop;
      if award <= 0 then award := 0; skip := 'CAP_OR_BUDGET_EXHAUSTED'; end if;
    end if;
  end if;

  insert into slot_spins (game_id, spin_no, seat, player_id, auto, idempotency_key, grid, wild_count, base_score, line_score,
                          score, lines, bonus_cents, created_at, reveal_at)
    values (g.id, n, v_seat, pid, p_auto, case when p_auto then null else p_key end, grid, sc.wilds, sc.base, sc.line_score,
            sc.base + sc.line_score, sc.lines, award, ts, reveal)
    returning * into sp;

  if award > 0 then
    update slot_bonus_budget set reserved_cents = reserved_cents + award, updated_at = clock_timestamp() where day = v_day;
    bank := case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end;
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_bonus', 'slot:' || g.id || ':bonus:' || n, g.account_type, pid, g.id, 'P2P Slott promotional bonus to match pool')
      returning id into tx;
    perform _post(tx, _system_account(bank, g.asset, g.account_type), -award);
    perform _post(tx, _system_account('game_escrow', g.asset, g.account_type), award);
    insert into slot_bonus_events (game_id, spin_no, triggered_by, wild_count, tier, tier_bps, requested_cents, awarded_cents,
                                   pool_before, pool_after, budget_day, ledger_tx_id)
      values (g.id, n, pid, sc.wilds, t.tier, t.stake_bps, req, award,
              g.p2p_pot + g.bonus_total, g.p2p_pot + g.bonus_total + award, v_day, tx);
    perform _audit_slot(pid, 'BONUS_AWARDED', g.id, jsonb_build_object('spin', n, 'tier', t.tier, 'wilds', sc.wilds,
      'requested', req, 'awarded', award, 'pool_before', g.p2p_pot + g.bonus_total, 'pool_after', g.p2p_pot + g.bonus_total + award,
      'budget_day', v_day, 'ledger_tx', tx));
  elsif skip is not null then
    perform _audit_slot(pid, 'BONUS_SKIPPED', g.id, jsonb_build_object('spin', n, 'tier', t.tier, 'wilds', sc.wilds,
      'requested', req, 'reason', skip));
  end if;

  sa := g.score_a + case when v_seat = 'A' then sc.base + sc.line_score else 0 end;
  sb := g.score_b + case when v_seat = 'B' then sc.base + sc.line_score else 0 end;
  done := n >= g.base_spins and n % 2 = 0 and (sa <> sb or n >= g.max_spins);
  update slot_games set next_spin = n + 1, score_a = sa, score_b = sb, bonus_total = bonus_total + award,
    turn_opens_at = case when done then null else reveal end,
    turn_deadline = case when done then null else reveal + g.turn_seconds * interval '1 second' end,
    ends_at = case when done then reveal else null end
    where id = g.id;
  perform _audit_slot(pid, case when p_auto then 'SPIN_AUTO' else 'SPIN' end, g.id, jsonb_build_object('spin', n, 'seat', v_seat,
    'score', sc.base + sc.line_score, 'wilds', sc.wilds, 'bonus', award, 'final', done));
  return sp;
end $$;

-- Settles a SETTLEMENT game in one ledger transaction: WIN pays the P2P pot minus fee plus all
-- bonus to the winner; DRAW refunds both stakes and returns every bonus to the bank and budget.
create or replace function public._slot_settle(p_game_id bigint)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare g public.slot_games; seed bytea; n_entries int; sum_amt bigint; ev_total bigint; tx uuid; escrow uuid;
  fee bigint; payout bigint; winner uuid; e record; bank public.account_kind;
begin
  select * into g from slot_games where id = p_game_id for update;
  if g.status <> 'SETTLEMENT' then return 'noop'; end if;
  if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
  select count(*), coalesce(sum(amount), 0) into n_entries, sum_amt from slot_entries where game_id = g.id and amount = g.stake;
  if n_entries <> 2 or sum_amt <> g.p2p_pot then raise exception 'INVARIANT_ENTRIES'; end if;
  select coalesce(sum(awarded_cents), 0) into ev_total from slot_bonus_events where game_id = g.id and status = 'AWARDED';
  if ev_total <> g.bonus_total then raise exception 'INVARIANT_BONUS'; end if;
  select server_seed into seed from slot_game_secrets where game_id = g.id;
  if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  if exists (select 1 from slot_spins s where s.game_id = g.id
             and s.grid <> slot_spin_grid(seed, g.id, s.spin_no)) then
    raise exception 'INVARIANT_RESULT';
  end if;

  perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
  escrow := _system_account('game_escrow', g.asset, g.account_type);
  if g.score_a <> g.score_b then
    winner := case when g.score_a > g.score_b then g.creator_id else g.opponent_id end;
    fee := (g.p2p_pot * g.fee_bps) / 10000;
    payout := g.p2p_pot - fee + g.bonus_total;
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_settlement', 'slot:' || g.id || ':settlement', g.account_type, winner, g.id, 'P2P Slott settlement')
      returning id into tx;
    for e in select user_id, amount from slot_entries where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
    end loop;
    perform _post(tx, escrow, g.p2p_pot);
    perform _post(tx, escrow, -(g.p2p_pot + g.bonus_total));
    perform _post(tx, _user_account(winner, 'user_available', g.asset, g.account_type), payout);
    if fee > 0 then perform _post(tx, _system_account('house_revenue', g.asset, g.account_type), fee); end if;
    update slot_bonus_events set status = 'PAID' where game_id = g.id and status = 'AWARDED';
    insert into slot_payouts (game_id, beneficiary_id, kind, amount, ledger_tx_id) values (g.id, winner, 'WINNER', payout, tx);
    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update slot_games set status = 'COMPLETED', completed_at = clock_timestamp(), outcome = 'WIN', winner_id = winner,
      fee_amount = fee, payout_amount = payout, server_seed = encode(seed, 'hex'), last_error = null where id = g.id;
    perform _audit_slot(null, 'GAME_COMPLETED', g.id, jsonb_build_object('outcome', 'WIN', 'winner', winner, 'score_a', g.score_a,
      'score_b', g.score_b, 'p2p_pot', g.p2p_pot, 'bonus', g.bonus_total, 'fee', fee, 'payout', payout, 'ledger_tx', tx));
  else
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_refund', 'slot:' || g.id || ':draw', g.account_type, null, g.id, 'P2P Slott draw refund')
      returning id into tx;
    for e in select user_id, amount from slot_entries where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
      perform _post(tx, _user_account(e.user_id, 'user_available', g.asset, g.account_type), e.amount);
      insert into slot_payouts (game_id, beneficiary_id, kind, amount, ledger_tx_id) values (g.id, e.user_id, 'DRAW_REFUND', e.amount, tx);
    end loop;
    if g.bonus_total > 0 then
      bank := case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end;
      for e in select budget_day, sum(awarded_cents) amt from slot_bonus_events where game_id = g.id and status = 'AWARDED'
               group by budget_day order by budget_day loop
        update slot_bonus_budget set reserved_cents = reserved_cents - e.amt, updated_at = clock_timestamp() where day = e.budget_day;
      end loop;
      perform _post(tx, _system_account(bank, g.asset, g.account_type), g.bonus_total);
      perform _post(tx, escrow, -g.bonus_total);
      update slot_bonus_events set status = 'RETURNED', return_tx_id = tx where game_id = g.id and status = 'AWARDED';
    end if;
    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update slot_games set status = 'COMPLETED', completed_at = clock_timestamp(), outcome = 'DRAW', winner_id = null,
      fee_amount = 0, payout_amount = 0, server_seed = encode(seed, 'hex'), last_error = null where id = g.id;
    perform _audit_slot(null, 'GAME_COMPLETED', g.id, jsonb_build_object('outcome', 'DRAW', 'score', g.score_a,
      'bonus_returned', g.bonus_total, 'ledger_tx', tx));
  end if;
  return 'settled';
end $$;

-- One lifecycle step for a game. Safe to call repeatedly; every deadline is re-checked here.
create or replace function public.slot_advance(p_game_id bigint)
returns text language plpgsql security definer set search_path = public as $$
declare g public.slot_games; err text; res text;
begin
  select * into g from slot_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED', 'CANCELLED') then return 'noop'; end if;
  if g.status = 'WAITING' then
    if clock_timestamp() < g.expires_at then return 'not_due'; end if;
    perform _slot_refund_waiting(g.id, 'EXPIRED');
    return 'cancelled';
  end if;
  if g.status = 'ACTIVE' then
    if g.ends_at is null then
      if clock_timestamp() < g.turn_deadline then return 'not_due'; end if;
      perform _slot_spin(g.id, null, true, null);
      return 'auto_spun';
    end if;
    if clock_timestamp() < g.ends_at then return 'not_due'; end if;
    update slot_games set status = 'SETTLEMENT', settlement_started_at = clock_timestamp() where id = g.id;
  end if;
  begin
    res := _slot_settle(g.id);
  exception when others then
    err := sqlerrm;
    update slot_games set settle_attempts = settle_attempts + 1, last_error = left(err, 500) where id = g.id;
    perform _audit_slot(null, 'SETTLEMENT_FAILED', g.id, jsonb_build_object('error', left(err, 500)));
    raise log 'SLOT_SETTLEMENT_FAILED game=% error=%', g.id, left(err, 200);
    return 'failed';
  end;
  return res;
end $$;

-- ---------------------------------------------------------------- player RPCs

create or replace function public.slot_create(p_stake bigint, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); prof public.profiles; c public.slot_config; jc public.money_domain_config;
  e public.slot_entries; g public.slot_games; seed bytea; tx uuid; avail uuid; locked uuid; bal bigint; ts timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtext('slot:' || uid::text || ':' || p_idempotency_key));
  select * into e from slot_entries where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if e.seat <> 'A' or e.amount <> p_stake then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return jsonb_build_object('duplicate', true, 'game_id', e.game_id);
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from slot_config;
  select * into jc from money_domain_config;
  if not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  if p_stake is null or not (p_stake = any (c.stakes)) then raise exception 'INVALID_STAKE'; end if;
  if (select count(*) from slot_games where creator_id = uid
      and created_at > clock_timestamp() - make_interval(secs => c.create_rate_window_seconds)) >= c.create_rate_limit then
    raise exception 'RATE_LIMITED';
  end if;
  if (select count(*) from slot_games where creator_id = uid and status = 'WAITING') >= c.max_open_per_user then
    raise exception 'TOO_MANY_OPEN_GAMES';
  end if;

  avail := _user_account(uid, 'user_available', jc.asset, jc.account_type);
  locked := _user_account(uid, 'user_locked', jc.asset, jc.account_type);
  perform _coinflip_lock_wallets(array[uid], jc.asset, jc.account_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or locked is null or bal < p_stake then raise exception 'INSUFFICIENT_BALANCE'; end if;

  ts := clock_timestamp();
  seed := extensions.gen_random_bytes(32);
  insert into slot_games (money_domain, asset, account_type, creator_id, stake, p2p_pot, bonus_cap, fee_bps, base_spins,
                          max_spins, spin_ms, turn_seconds, server_seed_hash, created_at, expires_at)
  values (jc.money_domain, jc.asset, jc.account_type, uid, p_stake, p_stake * 2,
          least((p_stake * c.match_cap_bps) / 10000, c.max_match_bonus_cents), c.fee_bps, c.base_spins, c.max_spins,
          c.spin_ms, c.turn_seconds, encode(extensions.digest(seed, 'sha256'), 'hex'), ts,
          ts + make_interval(secs => c.waiting_timeout_seconds))
  returning * into g;
  insert into slot_game_secrets (game_id, server_seed) values (g.id, seed);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('slot_entry', 'slot:' || g.id || ':entry:A', jc.account_type, uid, g.id, 'P2P Slott stake') returning id into tx;
  perform _post(tx, avail, -p_stake);
  perform _post(tx, locked, p_stake);
  insert into slot_entries (game_id, user_id, seat, amount, ledger_tx_id, idempotency_key, created_at)
    values (g.id, uid, 'A', p_stake, tx, p_idempotency_key, ts);
  perform _audit_slot(uid, 'GAME_CREATED', g.id, jsonb_build_object('stake', p_stake, 'server_seed_hash', g.server_seed_hash,
    'fee_bps', g.fee_bps, 'bonus_cap', g.bonus_cap, 'expires_at', g.expires_at, 'ledger_tx', tx));
  return jsonb_build_object('duplicate', false, 'game_id', g.id);
end $$;

create or replace function public.slot_join(p_game_id bigint, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prof public.profiles; c public.slot_config; g public.slot_games; e public.slot_entries;
  tx uuid; avail uuid; locked uuid; bal bigint; ts timestamptz; opens timestamptz;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtext('slot:' || uid::text || ':' || p_idempotency_key));
  select * into e from slot_entries where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if e.seat = 'B' and e.game_id = p_game_id then return jsonb_build_object('duplicate', true, 'game_id', e.game_id); end if;
    raise exception 'IDEMPOTENCY_KEY_REUSED';
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from slot_config;

  select * into g from slot_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_JOINABLE'; end if;
  if g.account_type <> (select account_type from money_domain_config) or not public._play_domain_open() then
    raise exception 'REAL_MONEY_DISABLED';
  end if;
  ts := clock_timestamp();
  if ts >= g.expires_at then raise exception 'GAME_EXPIRED'; end if;
  if g.creator_id = uid then raise exception 'CANNOT_JOIN_OWN_GAME'; end if;

  avail := _user_account(uid, 'user_available', g.asset, g.account_type);
  locked := _user_account(uid, 'user_locked', g.asset, g.account_type);
  perform _coinflip_lock_wallets(array[uid], g.asset, g.account_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or locked is null or bal < g.stake then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('slot_entry', 'slot:' || g.id || ':entry:B', g.account_type, uid, g.id, 'P2P Slott stake') returning id into tx;
  perform _post(tx, avail, -g.stake);
  perform _post(tx, locked, g.stake);
  insert into slot_entries (game_id, user_id, seat, amount, ledger_tx_id, idempotency_key, created_at)
    values (g.id, uid, 'B', g.stake, tx, p_idempotency_key, ts);
  opens := ts + c.pre_delay_ms * interval '1 millisecond';
  update slot_games set status = 'ACTIVE', opponent_id = uid, joined_at = ts, turn_opens_at = opens,
    turn_deadline = opens + g.turn_seconds * interval '1 second' where id = g.id;
  perform _audit_slot(uid, 'PLAYER_JOINED', g.id, jsonb_build_object('stake', g.stake, 'ledger_tx', tx, 'turn_opens_at', opens));
  return jsonb_build_object('duplicate', false, 'game_id', g.id, 'turn_opens_at', opens);
end $$;

create or replace function public.slot_spin(p_game_id bigint, p_spin_no integer, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.slot_games; sp public.slot_spins; dup boolean := false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  if p_spin_no is null or p_spin_no < 1 then raise exception 'STALE_ACTION'; end if;
  perform pg_advisory_xact_lock(hashtext('slot:' || uid::text || ':' || p_idempotency_key));
  select * into sp from slot_spins where player_id = uid and idempotency_key = p_idempotency_key;
  if found then
    if sp.game_id <> p_game_id or sp.spin_no <> p_spin_no then
      raise log 'SLOT_IDEMPOTENCY_CONFLICT user=% game=%', uid, p_game_id;
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    dup := true;
  else
    select * into g from slot_games where id = p_game_id for update;
    if not found then raise exception 'GAME_NOT_FOUND'; end if;
    if uid <> g.creator_id and uid is distinct from g.opponent_id then
      raise log 'SLOT_SECURITY_REJECTED not_a_player user=% game=%', uid, p_game_id;
      raise exception 'NOT_A_PLAYER';
    end if;
    if p_spin_no < g.next_spin then
      -- A retry with a fresh key for a spin already made returns that spin; never a second one.
      select * into sp from slot_spins where game_id = g.id and spin_no = p_spin_no and player_id = uid;
      if not found then raise exception 'STALE_ACTION'; end if;
      dup := true;
    elsif p_spin_no > g.next_spin then
      raise exception 'STALE_ACTION';
    else
      sp := _slot_spin(g.id, uid, false, p_idempotency_key);
    end if;
  end if;
  select * into g from slot_games where id = p_game_id;
  return jsonb_build_object('duplicate', dup, 'game_id', sp.game_id, 'spin_no', sp.spin_no, 'seat', sp.seat, 'grid', to_jsonb(sp.grid),
    'score', sp.score, 'wild_count', sp.wild_count, 'lines', sp.lines, 'bonus_cents', sp.bonus_cents, 'reveal_at', sp.reveal_at,
    'next_spin', g.next_spin, 'server_time', clock_timestamp());
end $$;

create or replace function public.slot_cancel(p_game_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.slot_games;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into g from slot_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.creator_id <> uid then raise exception 'FORBIDDEN'; end if;
  if g.status <> 'WAITING' then raise exception 'GAME_NOT_CANCELLABLE'; end if;
  perform _slot_refund_waiting(g.id, 'CREATOR_CANCELLED');
  return jsonb_build_object('cancelled', true, 'game_id', g.id);
end $$;

-- Scheduler worker (every second) and browser recovery hint (throttled by _tick_gate).
create or replace function public.slot_tick()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; res text; n_settled int := 0; n_cancelled int := 0; n_auto int := 0; n_failed int := 0;
begin
  if not public._tick_gate('slot') then
    return jsonb_build_object('throttled', true, 'server_time', clock_timestamp());
  end if;
  for r in select id from slot_games
           where (status = 'WAITING' and expires_at <= clock_timestamp())
              or (status = 'ACTIVE' and ends_at is null and turn_deadline <= clock_timestamp())
              or (status = 'ACTIVE' and ends_at <= clock_timestamp())
              or status = 'SETTLEMENT'
           order by id limit 50 for update skip locked loop
    begin
      res := slot_advance(r.id);
    exception when others then
      perform _audit_slot(null, 'ADVANCE_FAILED', r.id, jsonb_build_object('error', left(sqlerrm, 500)));
      res := 'error';
    end;
    if res = 'settled' then n_settled := n_settled + 1;
    elsif res = 'cancelled' then n_cancelled := n_cancelled + 1;
    elsif res = 'auto_spun' then n_auto := n_auto + 1;
    elsif res in ('failed', 'error') then n_failed := n_failed + 1; end if;
  end loop;
  return jsonb_build_object('settled', n_settled, 'cancelled', n_cancelled, 'auto_spun', n_auto, 'failed', n_failed,
    'server_time', clock_timestamp());
end $$;

insert into public.worker_tick_gate (name) values ('slot') on conflict (name) do nothing;

-- ---------------------------------------------------------------- access

alter table public.slot_config enable row level security;
alter table public.slot_promo_config enable row level security;
alter table public.slot_bonus_tiers enable row level security;
alter table public.slot_games enable row level security;
alter table public.slot_game_secrets enable row level security;
alter table public.slot_entries enable row level security;
alter table public.slot_spins enable row level security;
alter table public.slot_bonus_budget enable row level security;
alter table public.slot_bonus_events enable row level security;
alter table public.slot_payouts enable row level security;

revoke all on public.slot_config, public.slot_promo_config, public.slot_bonus_tiers, public.slot_games, public.slot_game_secrets,
  public.slot_entries, public.slot_spins, public.slot_bonus_budget, public.slot_bonus_events, public.slot_payouts
  from public, anon, authenticated;
grant all on public.slot_config, public.slot_promo_config, public.slot_bonus_tiers, public.slot_games, public.slot_game_secrets,
  public.slot_entries, public.slot_spins, public.slot_bonus_budget, public.slot_bonus_events, public.slot_payouts
  to service_role;

create policy "slot config public" on public.slot_config for select to anon, authenticated using (true);
create policy "slot tiers public" on public.slot_bonus_tiers for select to anon, authenticated using (true);
create policy "slot games public" on public.slot_games for select to anon, authenticated using (true);
create policy "slot spins public" on public.slot_spins for select to anon, authenticated using (true);
create policy "slot bonus events public" on public.slot_bonus_events for select to anon, authenticated using (true);
create policy "slot entries own" on public.slot_entries for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "slot payouts admin" on public.slot_payouts for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "slot budget admin" on public.slot_bonus_budget for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "slot promo config admin" on public.slot_promo_config for select to authenticated using (public.has_role(auth.uid(), 'admin'));

grant select on public.slot_config, public.slot_bonus_tiers, public.slot_games to anon, authenticated;
grant select (game_id, spin_no, seat, player_id, auto, grid, wild_count, base_score, line_score, score, lines, bonus_cents,
  created_at, reveal_at) on public.slot_spins to anon, authenticated;
grant select (id, game_id, spin_no, triggered_by, wild_count, tier, tier_bps, requested_cents, awarded_cents, pool_before,
  pool_after, status, created_at) on public.slot_bonus_events to anon, authenticated;
grant select on public.slot_entries, public.slot_payouts, public.slot_bonus_budget, public.slot_promo_config to authenticated;

revoke execute on function public._slot_guard(), public._slot_bonus_event_guard(), public._audit_slot(uuid, text, bigint, jsonb),
  public._slot_refund_waiting(bigint, text), public._slot_spin(bigint, uuid, boolean, text), public._slot_settle(bigint),
  public.slot_advance(bigint), public.slot_create(bigint, text), public.slot_join(bigint, text),
  public.slot_spin(bigint, integer, text), public.slot_cancel(bigint), public.slot_tick(),
  public.slot_spin_grid(bytea, bigint, integer), public.slot_score_v1(smallint[]), public.slot_outcome(bytea, bigint, integer)
  from public, anon, authenticated;
grant execute on function public.slot_create(bigint, text), public.slot_join(bigint, text),
  public.slot_spin(bigint, integer, text), public.slot_cancel(bigint) to authenticated;
grant execute on function public.slot_tick(), public.slot_spin_grid(bytea, bigint, integer), public.slot_score_v1(smallint[]),
  public.slot_outcome(bytea, bigint, integer) to anon, authenticated;

alter publication supabase_realtime add table public.slot_games;

-- prod-only:begin
select cron.schedule('pvp-slot-worker', '1 second', 'select public.slot_tick()');
-- prod-only:end

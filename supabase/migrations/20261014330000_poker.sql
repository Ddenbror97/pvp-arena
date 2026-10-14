-- Poker v1: six-max no-limit Texas Hold'em cash tables.
-- Money model, fee policy, fairness protocol and limitations: docs/POKER.md.
--
-- Money: a buy-in moves deposited cash user_available -> user_locked
-- (poker_entry, game_id = seat id). Each hand settles once between the players'
-- user_locked accounts through game_escrow, with the fee to house_revenue
-- (poker_hand, game_id = hand id). Leaving moves the stack back
-- user_locked -> user_available (poker_settlement, game_id = seat id).
-- Seat and hand ids start in ranges no other game uses.

alter type public.tx_kind add value if not exists 'poker_entry';
alter type public.tx_kind add value if not exists 'poker_hand';
alter type public.tx_kind add value if not exists 'poker_settlement';

-- ---------- configuration ----------
create table public.poker_config (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  fee_bps int not null default 500 check (fee_bps between 0 and 1000),
  reveal_seconds int not null default 5 check (reveal_seconds between 2 and 30),
  action_seconds int not null default 20 check (action_seconds between 5 and 120),
  showdown_seconds int not null default 6 check (showdown_seconds between 1 and 30),
  between_hands_seconds int not null default 3 check (between_hands_seconds between 1 and 30),
  runout_street_seconds int not null default 2 check (runout_street_seconds between 0 and 10),
  max_tables_per_user int not null default 3 check (max_tables_per_user between 1 and 6),
  max_timeouts int not null default 2 check (max_timeouts between 1 and 10),
  sit_out_kick_seconds int not null default 300 check (sit_out_kick_seconds between 30 and 3600),
  max_missed_reveals int not null default 2 check (max_missed_reveals between 1 and 10),
  void_strikes_per_day int not null default 3 check (void_strikes_per_day between 1 and 50),
  tick_tables int not null default 20 check (tick_tables between 1 and 200)
);
insert into public.poker_config default values;

create table public.poker_table_types (
  id smallint primary key,
  label text not null,
  category text not null check (category in ('Micro', 'Low', 'Mid', 'High', 'VIP')),
  small_blind bigint not null check (small_blind > 0),
  big_blind bigint not null,
  min_buy_in bigint not null,
  max_buy_in bigint not null,
  max_seats smallint not null default 6 check (max_seats between 2 and 6),
  enabled boolean not null default true,
  sort smallint not null default 0,
  constraint blinds_order check (big_blind >= small_blind),
  constraint buy_in_range check (
    min_buy_in >= 20 * big_blind and max_buy_in >= min_buy_in and max_buy_in <= 250 * big_blind)
);
-- Integer cents. The label is the maximum buy-in.
insert into public.poker_table_types (id, label, category, small_blind, big_blind, min_buy_in, max_buy_in, sort) values
  (1, '$5', 'Micro', 2, 5, 200, 500, 1),
  (2, '$10', 'Micro', 5, 10, 400, 1000, 2),
  (3, '$25', 'Low', 10, 25, 1000, 2500, 3),
  (4, '$50', 'Low', 25, 50, 2000, 5000, 4),
  (5, '$100', 'Mid', 50, 100, 4000, 10000, 5),
  (6, '$250', 'Mid', 100, 200, 10000, 25000, 6),
  (7, '$500', 'High', 200, 500, 20000, 50000, 7),
  (8, '$1,000', 'VIP', 500, 1000, 40000, 100000, 8);

-- ---------- tables, seats, hands ----------
create table public.poker_tables (
  id bigint generated always as identity primary key,
  type_id smallint not null references public.poker_table_types (id),
  name text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  money_domain text not null,
  asset text not null,
  account_type text not null,
  small_blind bigint not null,
  big_blind bigint not null,
  min_buy_in bigint not null,
  max_buy_in bigint not null,
  max_seats smallint not null,
  fee_bps int not null,
  button_seat smallint,
  hand_id bigint,
  hand_count int not null default 0,
  seated smallint not null default 0,
  version bigint not null default 0,
  next_due_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz
);
create index poker_tables_due on public.poker_tables (next_due_at) where status = 'OPEN' and next_due_at is not null;
create index poker_tables_type on public.poker_tables (type_id, status);

create table public.poker_seats (
  id bigint generated always as identity (start with 1000000000000001) primary key,
  table_id bigint not null references public.poker_tables (id),
  seat_no smallint not null check (seat_no between 0 and 5),
  user_id uuid not null references public.profiles (id),
  status text not null default 'SEATED' check (status in ('SEATED', 'CLOSED')),
  state text not null default 'ACTIVE' check (state in ('ACTIVE', 'SITTING_OUT')),
  leaving boolean not null default false,
  stack bigint not null default 0 check (stack >= 0),
  pending bigint not null default 0 check (pending >= 0),
  buy_in_total bigint not null default 0 check (buy_in_total >= 0),
  buy_in_count int not null default 0,
  cashed_out bigint,
  chain_link text check (chain_link is null or chain_link ~ '^[0-9a-f]{64}$'),
  owes_bb boolean not null default false,
  timeouts int not null default 0,
  missed_reveals int not null default 0,
  sat_out_at timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  close_ledger_tx uuid references public.ledger_transactions (id),
  unique (user_id, idempotency_key),
  constraint closed_is_cashed check (
    status = 'SEATED' or (cashed_out is not null and closed_at is not null and stack = 0 and pending = 0))
);
create unique index poker_seats_open_seat on public.poker_seats (table_id, seat_no) where status = 'SEATED';
create unique index poker_seats_open_user on public.poker_seats (table_id, user_id) where status = 'SEATED';
create index poker_seats_user_open on public.poker_seats (user_id) where status = 'SEATED';
create index poker_seats_table on public.poker_seats (table_id) where status = 'SEATED';

create table public.poker_hands (
  id bigint generated always as identity (start with 2000000000000001) primary key,
  table_id bigint not null references public.poker_tables (id),
  hand_no int not null,
  status text not null default 'COMMIT'
    check (status in ('COMMIT', 'BETTING', 'SETTLEMENT', 'COMPLETED', 'VOIDED')),
  street text not null default 'PREFLOP' check (street in ('PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN')),
  asset text not null,
  account_type text not null,
  max_seats smallint not null,
  button_seat smallint not null,
  sb_seat smallint not null,
  bb_seat smallint not null,
  small_blind bigint not null,
  big_blind bigint not null,
  fee_bps int not null,
  current_bet bigint not null default 0,
  last_raise bigint not null default 0,
  to_act smallint,
  action_deadline timestamptz,
  reveal_deadline timestamptz not null,
  board smallint[] not null default '{}',
  runout_streets int not null default 0,
  version int not null default 0,
  protocol_version text not null default 'v1',
  server_seed_hash text not null,
  server_seed text,
  entropy text,
  pots jsonb,
  fee_total bigint,
  ledger_tx_id uuid unique references public.ledger_transactions (id),
  settle_attempts int not null default 0,
  last_error text,
  void_reason text,
  -- Players whose missing reveal or departure voided the hand.
  voided_by uuid[],
  next_hand_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  dealt_at timestamptz,
  completed_at timestamptz,
  unique (table_id, hand_no),
  constraint seed_hidden_until_done check (server_seed is null or status in ('COMPLETED', 'VOIDED')),
  constraint completed_is_settled check (status <> 'COMPLETED' or (
    server_seed is not null and pots is not null and fee_total is not null and ledger_tx_id is not null
    and completed_at is not null))
);
create index poker_hands_table on public.poker_hands (table_id, id desc);

create table public.poker_hand_secrets (
  hand_id bigint primary key references public.poker_hands (id),
  server_seed bytea not null check (length(server_seed) = 32)
);
create table public.poker_hand_decks (
  hand_id bigint primary key references public.poker_hands (id),
  deck smallint[] not null check (array_length(deck, 1) = 52)
);

create table public.poker_hand_players (
  hand_id bigint not null references public.poker_hands (id),
  seat_no smallint not null,
  seat_id bigint not null references public.poker_seats (id),
  user_id uuid not null references public.profiles (id),
  deal_index smallint not null,
  link text not null check (link ~ '^[0-9a-f]{64}$'),
  reveal text check (reveal is null or reveal ~ '^[0-9a-f]{64}$'),
  posts_bb boolean not null default false,
  start_stack bigint not null check (start_stack > 0),
  stack bigint not null check (stack >= 0),
  street_bet bigint not null default 0 check (street_bet >= 0),
  total_bet bigint not null default 0 check (total_bet >= 0),
  folded boolean not null default false,
  all_in boolean not null default false,
  acted boolean not null default false,
  acted_bet bigint not null default 0,
  last_action text,
  shown_cards smallint[],
  hand_score int,
  hand_name text,
  refund bigint,
  won bigint,
  wagered bigint,
  end_stack bigint,
  primary key (hand_id, seat_no),
  constraint chips_conserved check (stack + total_bet = start_stack),
  constraint settled_stack check (end_stack is null or end_stack = stack + coalesce(won, 0) + coalesce(refund, 0))
);
create index poker_hand_players_user on public.poker_hand_players (user_id, hand_id desc);
create index poker_hand_players_seat on public.poker_hand_players (seat_id);
create index poker_hand_players_link on public.poker_hand_players (link);
create index poker_hand_players_reveal on public.poker_hand_players (reveal) where reveal is not null;

create table public.poker_hole_cards (
  hand_id bigint not null references public.poker_hands (id),
  seat_no smallint not null,
  user_id uuid not null,
  cards smallint[] not null check (array_length(cards, 1) = 2),
  primary key (hand_id, seat_no)
);
create index poker_hole_cards_user on public.poker_hole_cards (user_id, hand_id desc);

create table public.poker_actions (
  id bigint generated always as identity primary key,
  hand_id bigint not null references public.poker_hands (id),
  seq int not null,
  seat_no smallint,
  user_id uuid,
  street text not null,
  action text not null check (action in (
    'POST_SB', 'POST_BB', 'POST_LIVE', 'FOLD', 'CHECK', 'CALL', 'BET', 'RAISE',
    'TIMEOUT_FOLD', 'TIMEOUT_CHECK', 'BOARD', 'VOID')),
  amount bigint not null default 0,
  to_amount bigint,
  all_in boolean not null default false,
  cards smallint[],
  idempotency_key text,
  created_at timestamptz not null default clock_timestamp(),
  unique (hand_id, seq)
);
create unique index poker_actions_key on public.poker_actions (hand_id, user_id, idempotency_key)
  where idempotency_key is not null;

create trigger no_mutation before update or delete on public.poker_hand_secrets
  for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.poker_hand_decks
  for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.poker_hole_cards
  for each row execute function public._immutable();
create trigger no_mutation before update or delete on public.poker_actions
  for each row execute function public._immutable();

create or replace function public._poker_hand_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD poker_hands'; end if;
  if old.status in ('COMPLETED', 'VOIDED') then raise exception 'IMMUTABLE_RECORD poker hand %', old.id; end if;
  if new.server_seed_hash <> old.server_seed_hash then raise exception 'COMMITMENT_CHANGED'; end if;
  if old.entropy is not null and new.entropy is distinct from old.entropy then raise exception 'ENTROPY_CHANGED'; end if;
  if old.status = 'SETTLEMENT' and new.status not in ('SETTLEMENT', 'COMPLETED') then raise exception 'ILLEGAL_TRANSITION'; end if;
  if old.status = 'BETTING' and new.status not in ('BETTING', 'SETTLEMENT') then raise exception 'ILLEGAL_TRANSITION'; end if;
  if old.status = 'COMMIT' and new.status not in ('COMMIT', 'BETTING', 'VOIDED') then raise exception 'ILLEGAL_TRANSITION'; end if;
  return new;
end $$;
create trigger poker_hand_guard before update or delete on public.poker_hands
  for each row execute function public._poker_hand_guard();

-- ---------- access ----------
alter table public.poker_config enable row level security;
alter table public.poker_table_types enable row level security;
alter table public.poker_tables enable row level security;
alter table public.poker_seats enable row level security;
alter table public.poker_hands enable row level security;
alter table public.poker_hand_secrets enable row level security;
alter table public.poker_hand_decks enable row level security;
alter table public.poker_hand_players enable row level security;
alter table public.poker_hole_cards enable row level security;
alter table public.poker_actions enable row level security;

revoke all on public.poker_config, public.poker_table_types, public.poker_tables, public.poker_seats,
  public.poker_hands, public.poker_hand_secrets, public.poker_hand_decks, public.poker_hand_players,
  public.poker_hole_cards, public.poker_actions from public, anon, authenticated;
grant all on public.poker_config, public.poker_table_types, public.poker_tables, public.poker_seats,
  public.poker_hands, public.poker_hand_secrets, public.poker_hand_decks, public.poker_hand_players,
  public.poker_hole_cards, public.poker_actions to service_role;

grant select on public.poker_config, public.poker_table_types, public.poker_tables, public.poker_hands,
  public.poker_hand_players to anon, authenticated;
grant select (id, table_id, seat_no, user_id, status, state, leaving, stack, pending, buy_in_total,
  cashed_out, chain_link, owes_bb, timeouts, missed_reveals, sat_out_at, created_at, closed_at)
  on public.poker_seats to anon, authenticated;
grant select (id, hand_id, seq, seat_no, user_id, street, action, amount, to_amount, all_in, cards, created_at)
  on public.poker_actions to anon, authenticated;
grant select on public.poker_hole_cards to authenticated;

create policy poker_config_read on public.poker_config for select to anon, authenticated using (true);
create policy poker_types_read on public.poker_table_types for select to anon, authenticated using (true);
create policy poker_tables_read on public.poker_tables for select to anon, authenticated using (true);
create policy poker_seats_read on public.poker_seats for select to anon, authenticated using (true);
create policy poker_hands_read on public.poker_hands for select to anon, authenticated using (true);
create policy poker_hand_players_read on public.poker_hand_players for select to anon, authenticated using (true);
create policy poker_actions_read on public.poker_actions for select to anon, authenticated using (true);
create policy poker_hole_cards_own on public.poker_hole_cards for select to authenticated
  using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.poker_tables;

-- ---------- pure helpers (public, used by verifiers) ----------
create or replace function public._poker_straight_top(p_mask int) returns int
language plpgsql immutable set search_path = public as $$
declare top int; run int;
begin
  for top in reverse 12..4 loop
    run := 31 << (top - 4);
    if (p_mask & run) = run then return top; end if;
  end loop;
  if (p_mask & 4111) = 4111 then return 3; end if;
  return -1;
end $$;

create or replace function public._poker_pack(p_cat int, p_k int[]) returns int
language plpgsql immutable set search_path = public as $$
declare s int := p_cat; i int;
begin
  for i in 1..5 loop s := s * 16 + coalesce(p_k[i], 0); end loop;
  return s;
end $$;

create or replace function public._poker_ranks_desc(p_counts int[], p_excl int[]) returns int[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(r order by r desc), '{}')
  from generate_series(0, 12) r
  where p_counts[r + 1] > 0 and not (r = any (coalesce(p_excl, '{}')))
$$;

-- Best five of 5..7 cards. Mirrors src/lib/poker/evaluator.ts.
create or replace function public._poker_eval(p_cards smallint[]) returns int
language plpgsql immutable set search_path = public as $$
declare
  counts int[] := array_fill(0, array[13]);
  smask int[] := array[0, 0, 0, 0];
  scount int[] := array[0, 0, 0, 0];
  mask int := 0;
  c int; r int; s int; fs int := -1; v int;
  quads int[] := '{}'; trips int[] := '{}'; pairs int[] := '{}'; singles int[] := '{}';
  ks int[] := '{}';
begin
  if p_cards is null or array_length(p_cards, 1) not between 5 and 7 then raise exception 'INVALID_HAND'; end if;
  foreach c in array p_cards loop
    if c < 0 or c > 51 then raise exception 'INVALID_CARD'; end if;
    r := c % 13; s := c / 13;
    counts[r + 1] := counts[r + 1] + 1;
    smask[s + 1] := smask[s + 1] | (1 << r);
    scount[s + 1] := scount[s + 1] + 1;
    mask := mask | (1 << r);
  end loop;
  for s in 0..3 loop
    if scount[s + 1] >= 5 then fs := s; end if;
  end loop;
  if fs >= 0 then
    v := public._poker_straight_top(smask[fs + 1]);
    if v >= 0 then return public._poker_pack(8, array[v]); end if;
  end if;
  for r in reverse 12..0 loop
    case counts[r + 1]
      when 4 then quads := quads || r;
      when 3 then trips := trips || r;
      when 2 then pairs := pairs || r;
      when 1 then singles := singles || r;
      else null;
    end case;
  end loop;
  if array_length(quads, 1) > 0 then
    return public._poker_pack(7, array[quads[1], (public._poker_ranks_desc(counts, array[quads[1]]))[1]]);
  end if;
  if array_length(trips, 1) > 0 and (array_length(trips, 1) > 1 or array_length(pairs, 1) > 0) then
    return public._poker_pack(6, array[trips[1], greatest(coalesce(trips[2], -1), coalesce(pairs[1], -1))]);
  end if;
  if fs >= 0 then
    for r in reverse 12..0 loop
      exit when array_length(ks, 1) = 5;
      if smask[fs + 1] & (1 << r) <> 0 then ks := ks || r; end if;
    end loop;
    return public._poker_pack(5, ks);
  end if;
  v := public._poker_straight_top(mask);
  if v >= 0 then return public._poker_pack(4, array[v]); end if;
  if array_length(trips, 1) > 0 then
    return public._poker_pack(3, array[trips[1]] || (public._poker_ranks_desc(counts, array[trips[1]]))[1:2]);
  end if;
  if array_length(pairs, 1) >= 2 then
    return public._poker_pack(2, array[pairs[1], pairs[2],
      (public._poker_ranks_desc(counts, array[pairs[1], pairs[2]]))[1]]);
  end if;
  if array_length(pairs, 1) = 1 then
    return public._poker_pack(1, array[pairs[1]] || (public._poker_ranks_desc(counts, array[pairs[1]]))[1:3]);
  end if;
  return public._poker_pack(0, singles[1:5]);
end $$;

create or replace function public._poker_hand_name(p_score int) returns text
language sql immutable set search_path = public as $$
  select (array['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house',
    'Four of a kind', 'Straight flush'])[p_score / 1048576 + 1]
$$;

-- Fisher-Yates with HMAC-SHA256 rejection sampling. Mirrors src/lib/fairness/poker.ts.
create or replace function public._poker_shuffle(p_seed bytea, p_hand bigint, p_entropy text) returns smallint[]
language plpgsql immutable set search_path = public, extensions as $$
declare deck smallint[]; i int; n bigint; lim bigint; counter int; h bytea; r bigint; j int; tmp smallint;
begin
  if p_seed is null or length(p_seed) <> 32 then raise exception 'INVALID_SEED'; end if;
  if p_entropy is null or p_entropy !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_ENTROPY'; end if;
  deck := array(select g::smallint from generate_series(0, 51) g);
  for i in reverse 51..1 loop
    n := i + 1;
    lim := (4294967296 / n) * n;
    counter := 0;
    loop
      h := public._fair_hmac(p_seed, 'PVPCasino:poker:v1:' || p_hand || ':' || p_entropy || ':' || i || ':' || counter);
      r := (get_byte(h, 0)::bigint << 24) | (get_byte(h, 1)::bigint << 16) | (get_byte(h, 2)::bigint << 8) | get_byte(h, 3)::bigint;
      exit when r < lim;
      counter := counter + 1;
      if counter > 1000 then raise exception 'DRAW_EXHAUSTED'; end if;
    end loop;
    j := (r % n)::int;
    tmp := deck[i + 1];
    deck[i + 1] := deck[j + 1];
    deck[j + 1] := tmp;
  end loop;
  return deck;
end $$;

create or replace function public._poker_entropy(p_hand bigint) returns text
language sql stable security definer set search_path = public, extensions as $$
  select encode(extensions.digest(convert_to(
    'PVPCasino:poker:v1:entropy:' || p_hand || ':' || string_agg(seat_no || '=' || reveal, '|' order by seat_no),
    'UTF8'), 'sha256'), 'hex')
  from public.poker_hand_players where hand_id = p_hand
$$;

-- Clockwise distance from p_from to p_seat in 1..m (p_from itself is m).
create or replace function public._poker_dist(p_from int, p_seat int, p_m int) returns int
language sql immutable set search_path = public as $$
  select case when ((p_seat - p_from + p_m) % p_m) = 0 then p_m else (p_seat - p_from + p_m) % p_m end
$$;

create or replace function public._poker_next(p_seats int[], p_from int, p_m int) returns int
language sql immutable set search_path = public as $$
  select x from unnest(p_seats) x order by public._poker_dist(p_from, x, p_m) limit 1
$$;

-- ---------- betting rules (mirror src/lib/poker/engine.ts) ----------
create or replace function public._poker_call_target(p_hand bigint, p_seat int) returns bigint
language plpgsql stable security definer set search_path = public as $$
declare cb bigint;
begin
  select current_bet into cb from poker_hands where id = p_hand;
  if exists (select 1 from poker_hand_players o where o.hand_id = p_hand and o.seat_no <> p_seat
             and not o.folded and not o.all_in) then
    return cb;
  end if;
  return least(cb, coalesce((select max(o.street_bet) from poker_hand_players o
    where o.hand_id = p_hand and o.seat_no <> p_seat and not o.folded), 0));
end $$;

create or replace function public._poker_needs(p_hand bigint, p_seat int) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare p poker_hand_players;
begin
  select * into p from poker_hand_players where hand_id = p_hand and seat_no = p_seat;
  if not found or p.folded or p.all_in then return false; end if;
  if p.street_bet < public._poker_call_target(p_hand, p_seat) then return true; end if;
  if p.acted then return false; end if;
  return exists (select 1 from poker_hand_players o where o.hand_id = p_hand and o.seat_no <> p_seat
                 and not o.folded and not o.all_in);
end $$;

create or replace function public._poker_find_to_act(p_hand bigint, p_from int, p_inclusive boolean) returns smallint
language plpgsql stable security definer set search_path = public as $$
declare m int; s smallint;
begin
  select max_seats into m from poker_hands where id = p_hand;
  for s in
    select seat_no from poker_hand_players where hand_id = p_hand
    order by case when seat_no = p_from then case when p_inclusive then 0 else m end
                  else public._poker_dist(p_from, seat_no, m) end
  loop
    if public._poker_needs(p_hand, s) then return s; end if;
  end loop;
  return null;
end $$;

create or replace function public._poker_legal(p_hand bigint, p_seat int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare h poker_hands; p poker_hand_players; to_call bigint; all_in_to bigint; can_raise boolean;
begin
  select * into h from poker_hands where id = p_hand;
  select * into p from poker_hand_players where hand_id = p_hand and seat_no = p_seat;
  to_call := greatest(0, public._poker_call_target(p_hand, p_seat) - p.street_bet);
  all_in_to := p.street_bet + p.stack;
  can_raise := (not p.acted or h.current_bet - p.acted_bet >= h.last_raise)
    and all_in_to > h.current_bet
    and exists (select 1 from poker_hand_players o where o.hand_id = p_hand and o.seat_no <> p_seat
                and not o.folded and not o.all_in);
  return jsonb_build_object(
    'seat', p_seat,
    'to_call', to_call,
    'can_fold', true,
    'can_check', to_call = 0,
    'can_call', to_call > 0,
    'call_amount', least(to_call, p.stack),
    'can_raise', can_raise,
    'min_raise_to', case when can_raise then least(h.current_bet + h.last_raise, all_in_to) else 0 end,
    'max_raise_to', case when can_raise then all_in_to else 0 end,
    'current_bet', h.current_bet);
end $$;

-- Pots, fee and payouts for a finished hand. Mirrors src/lib/poker/pots.ts.
create or replace function public._poker_pots(p_hand bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  h poker_hands;
  a_seat int[]; contrib bigint[]; a_folded boolean[]; a_score int[];
  n int; i int; top_i int := 0; top_v bigint := -1; second_v bigint := 0;
  refunds jsonb := '{}'; payouts jsonb := '{}'; wagered jsonb := '{}';
  levels bigint[]; lvl bigint; prev bigint := 0; amt bigint; elig int[]; raw jsonb := '[]'; last_idx int;
  live_seats int[]; ord int[]; pot jsonb; pamt bigint; fee bigint; net bigint; best int;
  winners int[]; w int; each_share bigint; odd bigint; share bigint; shares jsonb;
  pots jsonb := '[]'; fee_total bigint := 0; flop boolean; r record;
begin
  select * into h from poker_hands where id = p_hand;
  select array_agg(hp.seat_no::int order by hp.seat_no), array_agg(hp.total_bet order by hp.seat_no),
         array_agg(hp.folded order by hp.seat_no), array_agg(coalesce(hp.hand_score, 0) order by hp.seat_no)
    into a_seat, contrib, a_folded, a_score
  from poker_hand_players hp where hp.hand_id = p_hand;
  n := coalesce(array_length(a_seat, 1), 0);
  if n < 2 then raise exception 'INVARIANT_PLAYERS'; end if;
  flop := coalesce(array_length(h.board, 1), 0) >= 3;

  for i in 1..n loop
    if contrib[i] > top_v then top_v := contrib[i]; top_i := i; end if;
  end loop;
  for i in 1..n loop
    if i <> top_i and contrib[i] > second_v then second_v := contrib[i]; end if;
  end loop;
  if top_v > second_v then
    refunds := jsonb_build_object(a_seat[top_i]::text, top_v - second_v);
    contrib[top_i] := second_v;
  end if;

  live_seats := array(select a_seat[k] from generate_subscripts(a_seat, 1) k where not a_folded[k] order by a_seat[k]);
  if coalesce(array_length(live_seats, 1), 0) = 0 then raise exception 'NO_LIVE_PLAYER'; end if;
  select array_agg(distinct v order by v) into levels from unnest(contrib) v where v > 0;

  foreach lvl in array coalesce(levels, '{}') loop
    amt := 0;
    for i in 1..n loop amt := amt + least(contrib[i], lvl) - least(contrib[i], prev); end loop;
    elig := array(select a_seat[k] from generate_subscripts(a_seat, 1) k
                  where not a_folded[k] and contrib[k] >= lvl order by a_seat[k]);
    prev := lvl;
    continue when amt = 0;
    last_idx := jsonb_array_length(raw) - 1;
    if coalesce(array_length(elig, 1), 0) = 0 then
      if last_idx >= 0 then
        raw := jsonb_set(raw, array[last_idx::text, 'amount'], to_jsonb((raw -> last_idx ->> 'amount')::bigint + amt));
      else
        raw := raw || jsonb_build_array(jsonb_build_object('amount', amt, 'eligible', '[]'::jsonb));
      end if;
      continue;
    end if;
    if last_idx >= 0 and (jsonb_array_length(raw -> last_idx -> 'eligible') = 0
                          or raw -> last_idx -> 'eligible' = to_jsonb(elig)) then
      raw := jsonb_set(raw, array[last_idx::text], jsonb_build_object(
        'amount', (raw -> last_idx ->> 'amount')::bigint + amt, 'eligible', to_jsonb(elig)));
      continue;
    end if;
    raw := raw || jsonb_build_array(jsonb_build_object('amount', amt, 'eligible', to_jsonb(elig)));
  end loop;

  ord := array(select x from unnest(live_seats) x order by public._poker_dist(h.button_seat, x, h.max_seats));
  for pot in select value from jsonb_array_elements(raw) loop
    pamt := (pot ->> 'amount')::bigint;
    fee := case when flop then (pamt * h.fee_bps) / 10000 else 0 end;
    net := pamt - fee;
    elig := array(select x::int from jsonb_array_elements_text(pot -> 'eligible') x);
    if array_length(live_seats, 1) = 1 then
      winners := live_seats;
    else
      select max(a_score[k]) into best from generate_subscripts(a_seat, 1) k where a_seat[k] = any (elig);
      winners := array(select a_seat[k] from generate_subscripts(a_seat, 1) k
                       where a_seat[k] = any (elig) and a_score[k] = best);
    end if;
    winners := array(select x from unnest(ord) x where x = any (winners)
                     order by public._poker_dist(h.button_seat, x, h.max_seats));
    each_share := net / array_length(winners, 1);
    odd := net - each_share * array_length(winners, 1);
    shares := '{}';
    foreach w in array winners loop
      share := each_share + case when odd > 0 then 1 else 0 end;
      if odd > 0 then odd := odd - 1; end if;
      shares := shares || jsonb_build_object(w::text, share);
      payouts := jsonb_set(payouts, array[w::text], to_jsonb(coalesce((payouts ->> w::text)::bigint, 0) + share));
    end loop;
    fee_total := fee_total + fee;
    pots := pots || jsonb_build_array(jsonb_build_object(
      'amount', pamt, 'fee', fee, 'eligible', pot -> 'eligible', 'winners', to_jsonb(winners), 'shares', shares));
  end loop;

  for r in select key, value from jsonb_each_text(refunds) loop
    payouts := jsonb_set(payouts, array[r.key], to_jsonb(coalesce((payouts ->> r.key)::bigint, 0) + r.value::bigint));
  end loop;
  for i in 1..n loop
    wagered := wagered || jsonb_build_object(a_seat[i]::text, contrib[i]);
  end loop;
  return jsonb_build_object('pots', pots, 'payouts', payouts, 'refunds', refunds, 'fee_total', fee_total,
    'wagered', wagered, 'flop', flop);
end $$;

-- ---------- internal state transitions ----------
create or replace function public._poker_log(
  p_hand bigint, p_seat int, p_user uuid, p_street text, p_action text, p_amount bigint, p_to bigint,
  p_all_in boolean, p_cards smallint[], p_key text
) returns void language sql security definer set search_path = public as $$
  insert into poker_actions (hand_id, seq, seat_no, user_id, street, action, amount, to_amount, all_in, cards, idempotency_key)
  values (p_hand, coalesce((select max(seq) from poker_actions where hand_id = p_hand), 0) + 1,
          p_seat, p_user, p_street, p_action, coalesce(p_amount, 0), p_to, coalesce(p_all_in, false), p_cards, p_key)
$$;

-- Version bump (realtime hint) and the next time the worker must look at this table.
create or replace function public._poker_touch(p_table bigint) returns void
language plpgsql security definer set search_path = public as $$
declare t poker_tables; h poker_hands; c poker_config; due timestamptz; ready int; last_next timestamptz; kick timestamptz;
begin
  select * into t from poker_tables where id = p_table;
  select * into c from poker_config;
  if t.hand_id is not null then
    select * into h from poker_hands where id = t.hand_id;
    due := case h.status
      when 'COMMIT' then h.reveal_deadline
      when 'BETTING' then h.action_deadline
      when 'SETTLEMENT' then clock_timestamp() + interval '2 seconds' end;
  else
    select count(*) into ready from poker_seats
      where table_id = p_table and status = 'SEATED' and state = 'ACTIVE' and not leaving
        and stack + pending > 0 and chain_link is not null;
    select next_hand_at into last_next from poker_hands where table_id = p_table order by id desc limit 1;
    select min(sat_out_at) + make_interval(secs => c.sit_out_kick_seconds) into kick from poker_seats
      where table_id = p_table and status = 'SEATED' and state = 'SITTING_OUT';
    due := least(case when ready >= 2 then greatest(coalesce(last_next, clock_timestamp()), clock_timestamp()) end, kick);
  end if;
  update poker_tables set
    next_due_at = due,
    version = version + 1,
    updated_at = clock_timestamp(),
    seated = (select count(*) from poker_seats where table_id = p_table and status = 'SEATED')
  where id = p_table;
end $$;

-- Deposited cash into a seat. Rejects any part that the withdrawal basis would classify as bonus.
create or replace function public._poker_take_cash(p_seat bigint, p_amount bigint, p_pending boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare s poker_seats; t poker_tables; avail uuid; locked uuid; bal bigint; elig bigint; tx uuid; bonus_part bigint;
begin
  select * into s from poker_seats where id = p_seat for update;
  select * into t from poker_tables where id = s.table_id;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  avail := _user_account(s.user_id, 'user_available', t.asset, t.account_type);
  locked := _user_account(s.user_id, 'user_locked', t.asset, t.account_type);
  if avail is null or locked is null then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform _coinflip_lock_wallets(array[s.user_id], t.asset, t.account_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;
  if t.account_type = 'real' then
    perform public._withdraw_basis_sync();
    select eligible into elig from withdraw_basis_bucket where user_id = s.user_id;
    if coalesce(elig, 0) < p_amount then raise exception 'CASH_ONLY_BUY_IN'; end if;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('poker_entry', 'poker:seat:' || s.id || ':buyin:' || (s.buy_in_count + 1), t.account_type, s.user_id, s.id,
            'Poker buy-in')
    returning id into tx;
  perform _post(tx, avail, -p_amount);
  perform _post(tx, locked, p_amount);
  if t.account_type = 'real' then
    perform public._withdraw_basis_sync();
    select bonus into bonus_part from withdraw_basis_ledger_stake where ledger_tx_id = tx;
    if bonus_part is null or bonus_part <> 0 then raise exception 'CASH_ONLY_BUY_IN'; end if;
  end if;
  update poker_seats set
    stack = stack + case when p_pending then 0 else p_amount end,
    pending = pending + case when p_pending then p_amount else 0 end,
    buy_in_total = buy_in_total + p_amount,
    buy_in_count = buy_in_count + 1
  where id = s.id;
  perform _audit(s.user_id, 'poker_buy_in', s.table_id, jsonb_build_object(
    'seat_id', s.id, 'amount', p_amount, 'pending', p_pending, 'ledger_tx', tx));
  return tx;
end $$;

create or replace function public._poker_in_hand(p_seat bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from poker_hand_players hp join poker_hands h on h.id = hp.hand_id
    where hp.seat_id = p_seat and h.status in ('COMMIT', 'BETTING', 'SETTLEMENT'))
$$;

create or replace function public._poker_cashout(p_seat bigint) returns void
language plpgsql security definer set search_path = public as $$
declare s poker_seats; t poker_tables; tx uuid; amt bigint;
begin
  select * into s from poker_seats where id = p_seat for update;
  if not found or s.status <> 'SEATED' then return; end if;
  if public._poker_in_hand(s.id) then raise exception 'SEAT_IN_HAND'; end if;
  select * into t from poker_tables where id = s.table_id;
  amt := s.stack + s.pending;
  if amt > 0 then
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('poker_settlement', 'poker:seat:' || s.id || ':cashout', t.account_type, s.user_id, s.id, 'Poker cash-out')
      returning id into tx;
    perform _post(tx, _user_account(s.user_id, 'user_locked', t.asset, t.account_type), -amt);
    perform _post(tx, _user_account(s.user_id, 'user_available', t.asset, t.account_type), amt);
  end if;
  update poker_seats set status = 'CLOSED', cashed_out = amt, stack = 0, pending = 0, leaving = false,
    closed_at = clock_timestamp(), close_ledger_tx = tx
  where id = s.id;
  perform _audit(s.user_id, 'poker_cash_out', s.table_id, jsonb_build_object(
    'seat_id', s.id, 'amount', amt, 'buy_in_total', s.buy_in_total, 'ledger_tx', tx));
end $$;

create or replace function public._poker_set_turn(p_hand bigint, p_seat int) returns void
language plpgsql security definer set search_path = public as $$
declare v_leaving boolean; v_secs int;
begin
  select s.leaving into v_leaving from poker_hand_players hp join poker_seats s on s.id = hp.seat_id
    where hp.hand_id = p_hand and hp.seat_no = p_seat;
  select action_seconds into v_secs from poker_config;
  update poker_hands set to_act = p_seat,
    action_deadline = case when coalesce(v_leaving, false) then clock_timestamp()
                           else clock_timestamp() + make_interval(secs => v_secs) end,
    version = version + 1
  where id = p_hand;
end $$;

create or replace function public._poker_open_hand(p_table bigint) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare t poker_tables; c poker_config; seats_arr int[]; n int; btn int; sbs int; bbs int; hid bigint; seed bytea;
begin
  select * into t from poker_tables where id = p_table;
  if t.status <> 'OPEN' or t.hand_id is not null then return null; end if;
  select * into c from poker_config;
  if not c.enabled or not public._play_domain_open()
     or t.account_type <> (select account_type from money_domain_config) then
    return null;
  end if;
  -- Top-ups bought during the last hand join the stack before it is frozen.
  update poker_seats set stack = stack + pending, pending = 0
    where table_id = t.id and status = 'SEATED' and pending > 0;
  select array_agg(seat_no::int order by seat_no) into seats_arr from poker_seats
    where table_id = t.id and status = 'SEATED' and state = 'ACTIVE' and not leaving
      and stack > 0 and chain_link is not null;
  n := coalesce(array_length(seats_arr, 1), 0);
  if n < 2 then return null; end if;
  btn := case when t.button_seat is null then seats_arr[1] else public._poker_next(seats_arr, t.button_seat, t.max_seats) end;
  if n = 2 then
    sbs := btn;
    bbs := public._poker_next(seats_arr, btn, t.max_seats);
  else
    sbs := public._poker_next(seats_arr, btn, t.max_seats);
    bbs := public._poker_next(seats_arr, sbs, t.max_seats);
  end if;
  seed := extensions.gen_random_bytes(32);
  insert into poker_hands (table_id, hand_no, asset, account_type, max_seats, button_seat, sb_seat, bb_seat,
    small_blind, big_blind, fee_bps, reveal_deadline, server_seed_hash)
  values (t.id, t.hand_count + 1, t.asset, t.account_type, t.max_seats, btn, sbs, bbs,
    t.small_blind, t.big_blind, t.fee_bps, clock_timestamp() + make_interval(secs => c.reveal_seconds),
    encode(extensions.digest(seed, 'sha256'), 'hex'))
  returning id into hid;
  insert into poker_hand_secrets (hand_id, server_seed) values (hid, seed);
  insert into poker_hand_players (hand_id, seat_no, seat_id, user_id, deal_index, link, posts_bb, start_stack, stack)
  select hid, s.seat_no, s.id, s.user_id,
    (row_number() over (order by public._poker_dist(btn, s.seat_no, t.max_seats)) - 1)::smallint,
    s.chain_link, s.owes_bb and s.seat_no <> bbs, s.stack, s.stack
  from poker_seats s
  where s.table_id = t.id and s.seat_no = any (seats_arr) and s.status = 'SEATED';
  update poker_tables set hand_id = hid, hand_count = hand_count + 1 where id = t.id;
  perform _audit(null, 'poker_hand_opened', hid, jsonb_build_object(
    'table', t.id, 'server_seed_hash', encode(extensions.digest(seed, 'sha256'), 'hex'), 'seats', to_jsonb(seats_arr)));
  return hid;
end $$;

create or replace function public._poker_void(p_hand bigint, p_reason text, p_by uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare seed bytea; c poker_config;
begin
  select * into c from poker_config;
  select server_seed into seed from poker_hand_secrets where hand_id = p_hand;
  update poker_hands set status = 'VOIDED', server_seed = encode(seed, 'hex'), void_reason = p_reason,
    voided_by = p_by, to_act = null, action_deadline = null, completed_at = clock_timestamp(),
    next_hand_at = clock_timestamp() + interval '1 second', version = version + 1
  where id = p_hand and status = 'COMMIT';
  if not found then raise exception 'VOID_NOT_ALLOWED'; end if;
  perform public._poker_log(p_hand, null, null, 'PREFLOP', 'VOID', 0, null, false, null, null);
  update poker_tables set hand_id = null where hand_id = p_hand;
  perform _audit(null, 'poker_hand_voided', p_hand, jsonb_build_object('reason', p_reason, 'by', to_jsonb(p_by)));
end $$;

-- Hands this player voided in the last 24 hours, by withholding a reveal or leaving mid-commit.
create or replace function public._poker_void_strikes(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from poker_hand_players hp join poker_hands h on h.id = hp.hand_id
  where hp.user_id = p_user and h.status = 'VOIDED' and p_user = any (h.voided_by)
    and h.completed_at > clock_timestamp() - interval '24 hours'
$$;

create or replace function public._poker_settle(p_hand bigint) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  h poker_hands; c poker_config; seed bytea; res jsonb; tx uuid; escrow uuid; house uuid; p record;
  total bigint; paid bigint; live int; s poker_seats;
begin
  select * into h from poker_hands where id = p_hand for update;
  if h.status <> 'SETTLEMENT' then return; end if;
  if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
  select * into c from poker_config;
  select server_seed into seed from poker_hand_secrets where hand_id = h.id;
  if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> h.server_seed_hash then
    raise exception 'INVARIANT_COMMITMENT';
  end if;
  if exists (select 1 from poker_hand_players where hand_id = h.id and stack + total_bet <> start_stack) then
    raise exception 'INVARIANT_CHIPS';
  end if;
  select count(*) into live from poker_hand_players where hand_id = h.id and not folded;
  if live > 1 then
    if coalesce(array_length(h.board, 1), 0) <> 5 then raise exception 'INVARIANT_BOARD'; end if;
    update poker_hand_players hp set
      hand_score = public._poker_eval(hc.cards || h.board),
      hand_name = public._poker_hand_name(public._poker_eval(hc.cards || h.board)),
      shown_cards = hc.cards
    from poker_hole_cards hc
    where hc.hand_id = hp.hand_id and hc.seat_no = hp.seat_no and hp.hand_id = h.id and not hp.folded;
  end if;
  res := public._poker_pots(h.id);
  select coalesce(sum(total_bet), 0) into total from poker_hand_players where hand_id = h.id;
  select coalesce(sum(value::bigint), 0) into paid from jsonb_each_text(res -> 'payouts');
  if total <= 0 or paid + (res ->> 'fee_total')::bigint <> total then raise exception 'INVARIANT_POT_MISMATCH'; end if;

  escrow := _system_account('game_escrow', h.asset, h.account_type);
  house := _system_account('house_revenue', h.asset, h.account_type);
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('poker_hand', 'poker:hand:' || h.id || ':settle', h.account_type, null, h.id, 'Poker hand settlement')
    returning id into tx;
  for p in select * from poker_hand_players where hand_id = h.id and total_bet > 0 order by user_id, seat_no loop
    perform _post(tx, _user_account(p.user_id, 'user_locked', h.asset, h.account_type), -p.total_bet);
  end loop;
  perform _post(tx, escrow, total);
  perform _post(tx, escrow, -total);
  for p in
    select hp.user_id, coalesce((res -> 'payouts' ->> hp.seat_no::text)::bigint, 0) as pay
    from poker_hand_players hp where hp.hand_id = h.id order by hp.user_id, hp.seat_no
  loop
    if p.pay > 0 then
      perform _post(tx, _user_account(p.user_id, 'user_locked', h.asset, h.account_type), p.pay);
    end if;
  end loop;
  if (res ->> 'fee_total')::bigint > 0 then
    perform _post(tx, house, (res ->> 'fee_total')::bigint);
  end if;

  update poker_hand_players hp set
    refund = coalesce((res -> 'refunds' ->> hp.seat_no::text)::bigint, 0),
    won = coalesce((res -> 'payouts' ->> hp.seat_no::text)::bigint, 0)
          - coalesce((res -> 'refunds' ->> hp.seat_no::text)::bigint, 0),
    wagered = coalesce((res -> 'wagered' ->> hp.seat_no::text)::bigint, 0),
    end_stack = hp.stack + coalesce((res -> 'payouts' ->> hp.seat_no::text)::bigint, 0)
  where hp.hand_id = h.id;

  for p in select hp.* from poker_hand_players hp where hp.hand_id = h.id order by hp.seat_id loop
    select * into s from poker_seats where id = p.seat_id for update;
    if s.status <> 'SEATED' or s.stack <> p.start_stack then raise exception 'INVARIANT_SEAT_STACK'; end if;
    update poker_seats set stack = p.end_stack where id = s.id;
  end loop;

  update poker_hands set
    status = 'COMPLETED', server_seed = encode(seed, 'hex'), pots = res -> 'pots', fee_total = (res ->> 'fee_total')::bigint,
    ledger_tx_id = tx, completed_at = clock_timestamp(), to_act = null, action_deadline = null,
    next_hand_at = clock_timestamp() + make_interval(secs =>
      case when live > 1 then c.showdown_seconds else c.between_hands_seconds end
      + h.runout_streets * c.runout_street_seconds),
    version = version + 1
  where id = h.id;
  update poker_tables set hand_id = null, button_seat = h.button_seat where id = h.table_id and hand_id = h.id;

  -- Prestige XP counts contested chips only in hands that reached the flop (fee-bearing hands).
  if (res ->> 'flop')::boolean then
    for p in select hp.user_id, hp.seat_no, hp.wagered from poker_hand_players hp
             where hp.hand_id = h.id and hp.wagered > 0 order by hp.user_id loop
      begin
        perform public.prestige_award_wager(p.user_id, 'poker', 'hand:' || h.id || ':' || p.seat_no, p.wagered,
          jsonb_build_object('hand_id', h.id));
      exception when others then
        perform _audit(p.user_id, 'prestige_hook_error', h.id, jsonb_build_object('game', 'poker', 'error', left(sqlerrm, 200)));
      end;
    end loop;
  end if;
  perform _audit(null, 'poker_hand_settled', h.id, jsonb_build_object(
    'table', h.table_id, 'fee_total', res -> 'fee_total', 'pot_total', total, 'ledger_tx', tx));
end $$;

create or replace function public._poker_post_hand(p_table bigint) returns void
language plpgsql security definer set search_path = public as $$
declare s poker_seats; c poker_config;
begin
  select * into c from poker_config;
  for s in select * from poker_seats where table_id = p_table and status = 'SEATED' order by id for update loop
    if public._poker_in_hand(s.id) then continue; end if;
    if s.leaving then
      perform public._poker_cashout(s.id);
    elsif s.state = 'ACTIVE' and (s.stack + s.pending = 0 or s.timeouts >= c.max_timeouts) then
      update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp() where id = s.id;
    end if;
  end loop;
end $$;

create or replace function public._poker_finish(p_hand bigint) returns text
language plpgsql security definer set search_path = public as $$
declare tid bigint;
begin
  update poker_hands set status = 'SETTLEMENT', to_act = null, action_deadline = null, version = version + 1
    where id = p_hand and status = 'BETTING';
  select table_id into tid from poker_hands where id = p_hand;
  begin
    perform public._poker_settle(p_hand);
  exception when others then
    update poker_hands set settle_attempts = settle_attempts + 1, last_error = left(sqlerrm, 500) where id = p_hand;
    perform _audit(null, 'poker_settle_failed', p_hand, jsonb_build_object('error', left(sqlerrm, 500)));
    return 'failed';
  end;
  perform public._poker_post_hand(tid);
  return 'settled';
end $$;

create or replace function public._poker_advance(p_hand bigint) returns void
language plpgsql security definer set search_path = public as $$
declare h poker_hands; live int; nxt text; deck smallint[]; n int; b int; new_board smallint[]; added smallint[]; nxt_seat smallint;
begin
  loop
    select * into h from poker_hands where id = p_hand;
    select count(*) into live from poker_hand_players where hand_id = p_hand and not folded;
    if live <= 1 then perform public._poker_finish(p_hand); return; end if;
    nxt := case h.street when 'PREFLOP' then 'FLOP' when 'FLOP' then 'TURN' when 'TURN' then 'RIVER' else 'SHOWDOWN' end;
    update poker_hand_players set street_bet = 0, acted = false, acted_bet = 0 where hand_id = p_hand;
    select d.deck into deck from poker_hand_decks d where d.hand_id = p_hand;
    select count(*) into n from poker_hand_players where hand_id = p_hand;
    b := 2 * n;
    added := case nxt
      when 'FLOP' then array[deck[b + 2], deck[b + 3], deck[b + 4]]
      when 'TURN' then array[deck[b + 6]]
      when 'RIVER' then array[deck[b + 8]]
      else '{}'::smallint[] end;
    new_board := h.board || added;
    update poker_hands set street = nxt, current_bet = 0, last_raise = big_blind, board = new_board,
      to_act = null, action_deadline = null, version = version + 1
    where id = p_hand;
    if nxt = 'SHOWDOWN' then perform public._poker_finish(p_hand); return; end if;
    perform public._poker_log(p_hand, null, null, nxt, 'BOARD', 0, null, false, added, null);
    nxt_seat := public._poker_find_to_act(p_hand, h.button_seat, false);
    if nxt_seat is not null then perform public._poker_set_turn(p_hand, nxt_seat); return; end if;
    update poker_hands set runout_streets = runout_streets + 1 where id = p_hand;
  end loop;
end $$;

create or replace function public._poker_deal(p_hand bigint) returns void
language plpgsql security definer set search_path = public as $$
declare h poker_hands; seed bytea; ent text; deck smallint[]; n int; p record; amt bigint; kind text; first_seat int;
  nxt smallint; seats_arr int[];
begin
  select * into h from poker_hands where id = p_hand for update;
  if h.status <> 'COMMIT' then return; end if;
  if exists (select 1 from poker_hand_players where hand_id = p_hand and reveal is null) then return; end if;
  select server_seed into seed from poker_hand_secrets where hand_id = p_hand;
  ent := public._poker_entropy(p_hand);
  deck := public._poker_shuffle(seed, p_hand, ent);
  insert into poker_hand_decks (hand_id, deck) values (p_hand, deck);
  select count(*), array_agg(seat_no::int order by seat_no) into n, seats_arr from poker_hand_players where hand_id = p_hand;
  insert into poker_hole_cards (hand_id, seat_no, user_id, cards)
  select p_hand, hp.seat_no, hp.user_id, array[deck[hp.deal_index + 1], deck[hp.deal_index + n + 1]]
  from poker_hand_players hp where hp.hand_id = p_hand;
  for p in select * from poker_hand_players where hand_id = p_hand order by deal_index loop
    if p.seat_no = h.sb_seat then
      amt := case when p.posts_bb then h.big_blind else h.small_blind end;
      kind := case when p.posts_bb then 'POST_LIVE' else 'POST_SB' end;
    elsif p.seat_no = h.bb_seat then
      amt := h.big_blind; kind := 'POST_BB';
    elsif p.posts_bb then
      amt := h.big_blind; kind := 'POST_LIVE';
    else
      continue;
    end if;
    amt := least(amt, p.stack);
    update poker_hand_players set stack = stack - amt, street_bet = amt, total_bet = amt, all_in = (stack - amt = 0)
      where hand_id = p_hand and seat_no = p.seat_no;
    perform public._poker_log(p_hand, p.seat_no, p.user_id, 'PREFLOP', kind, amt, amt, p.stack - amt = 0, null, null);
  end loop;
  update poker_seats set owes_bb = false
    where id in (select seat_id from poker_hand_players where hand_id = p_hand);
  update poker_hands set status = 'BETTING', entropy = ent, current_bet = big_blind, last_raise = big_blind,
    dealt_at = clock_timestamp(), version = version + 1
  where id = p_hand;
  first_seat := case when n = 2 then h.button_seat else public._poker_next(seats_arr, h.bb_seat, h.max_seats) end;
  nxt := public._poker_find_to_act(p_hand, first_seat, true);
  if nxt is null then perform public._poker_advance(p_hand); else perform public._poker_set_turn(p_hand, nxt); end if;
end $$;

-- One betting action by the seat to act. p_source: 'player', 'timeout' or 'leave'.
create or replace function public._poker_apply(
  p_hand bigint, p_seat int, p_action text, p_amount bigint, p_source text, p_key text
) returns void
language plpgsql security definer set search_path = public as $$
declare h poker_hands; p poker_hand_players; la jsonb; act text := upper(coalesce(p_action, ''));
  amt bigint := coalesce(p_amount, 0); v_add bigint := 0; raise_by bigint; live int; nxt smallint; logged text;
begin
  select * into h from poker_hands where id = p_hand for update;
  if h.status <> 'BETTING' or h.to_act is distinct from p_seat then raise exception 'NOT_YOUR_TURN'; end if;
  select * into p from poker_hand_players where hand_id = p_hand and seat_no = p_seat for update;
  la := public._poker_legal(p_hand, p_seat);
  if act = 'ALL_IN' then
    if p.street_bet + p.stack <= h.current_bet then
      act := 'CALL';
    else
      if not (la ->> 'can_raise')::boolean then raise exception 'RAISE_NOT_ALLOWED'; end if;
      act := case when h.current_bet = 0 then 'BET' else 'RAISE' end;
      amt := p.street_bet + p.stack;
    end if;
  end if;
  if act = 'FOLD' then
    update poker_hand_players set folded = true where hand_id = p_hand and seat_no = p_seat;
  elsif act = 'CHECK' then
    if not (la ->> 'can_check')::boolean then raise exception 'CANNOT_CHECK'; end if;
  elsif act = 'CALL' then
    if not (la ->> 'can_call')::boolean then raise exception 'NOTHING_TO_CALL'; end if;
    v_add := (la ->> 'call_amount')::bigint;
  elsif act in ('BET', 'RAISE') then
    if act = 'BET' and h.current_bet <> 0 then raise exception 'USE_RAISE'; end if;
    if act = 'RAISE' and h.current_bet = 0 then raise exception 'USE_BET'; end if;
    if not (la ->> 'can_raise')::boolean then raise exception 'RAISE_NOT_ALLOWED'; end if;
    if amt > p.street_bet + p.stack then raise exception 'AMOUNT_EXCEEDS_STACK'; end if;
    if (amt < (la ->> 'min_raise_to')::bigint and amt <> p.street_bet + p.stack) or amt <= h.current_bet then
      raise exception 'BELOW_MIN_RAISE';
    end if;
    raise_by := amt - h.current_bet;
    update poker_hands set
      last_raise = case when raise_by >= last_raise then raise_by else last_raise end,
      current_bet = amt
    where id = p_hand;
    v_add := amt - p.street_bet;
  else
    raise exception 'UNKNOWN_ACTION';
  end if;
  logged := case when p_source = 'timeout' then 'TIMEOUT_' || act else act end;
  update poker_hand_players set
    stack = stack - v_add, street_bet = street_bet + v_add, total_bet = total_bet + v_add,
    all_in = all_in or (stack - v_add = 0 and act <> 'FOLD'),
    acted = true,
    acted_bet = (select current_bet from poker_hands where id = p_hand),
    last_action = logged
  where hand_id = p_hand and seat_no = p_seat;
  perform public._poker_log(p_hand, p_seat, p.user_id, h.street, logged, v_add,
    case when act in ('BET', 'RAISE') then amt when act = 'CALL' then p.street_bet + v_add end,
    p.stack - v_add = 0 and act <> 'FOLD', null, p_key);
  update poker_hands set version = version + 1 where id = p_hand;
  select count(*) into live from poker_hand_players where hand_id = p_hand and not folded;
  if live = 1 then perform public._poker_finish(p_hand); return; end if;
  nxt := public._poker_find_to_act(p_hand, p_seat, false);
  if nxt is null then perform public._poker_advance(p_hand); else perform public._poker_set_turn(p_hand, nxt); end if;
end $$;

-- Does whatever is due on one table. Caller holds the table row lock.
create or replace function public._poker_tick_table(p_table bigint) returns text
language plpgsql security definer set search_path = public as $$
declare t poker_tables; h poker_hands; c poker_config; la jsonb; s record; res text := 'idle'; hid bigint;
  v_leaving boolean;
begin
  select * into t from poker_tables where id = p_table;
  select * into c from poker_config;
  if t.hand_id is not null then
    select * into h from poker_hands where id = t.hand_id;
    if h.status = 'COMMIT' and clock_timestamp() >= h.reveal_deadline then
      -- Withholders sit out; repeat withholders are cashed out after the void.
      update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp(),
          missed_reveals = missed_reveals + 1,
          leaving = leaving or missed_reveals + 1 >= c.max_missed_reveals
        where id in (select seat_id from poker_hand_players where hand_id = h.id and reveal is null);
      perform public._poker_void(h.id, 'missing_reveal', array(
        select user_id from poker_hand_players where hand_id = h.id and reveal is null order by seat_no));
      perform public._poker_post_hand(t.id);
      res := 'voided';
    elsif h.status = 'BETTING' and clock_timestamp() >= h.action_deadline then
      la := public._poker_legal(h.id, h.to_act);
      select ps.leaving into v_leaving from poker_seats ps join poker_hand_players hp on hp.seat_id = ps.id
        where hp.hand_id = h.id and hp.seat_no = h.to_act;
      if not v_leaving then
        update poker_seats set timeouts = timeouts + 1
          where id = (select seat_id from poker_hand_players where hand_id = h.id and seat_no = h.to_act);
      end if;
      perform public._poker_apply(h.id, h.to_act,
        case when not v_leaving and (la ->> 'can_check')::boolean then 'CHECK' else 'FOLD' end, 0,
        case when v_leaving then 'leave' else 'timeout' end, null);
      res := 'timeout';
    elsif h.status = 'SETTLEMENT' and h.settle_attempts < 8 then
      res := public._poker_finish(h.id);
    end if;
  else
    for s in select id from poker_seats where table_id = t.id and status = 'SEATED'
               and (leaving or (state = 'SITTING_OUT'
                    and sat_out_at <= clock_timestamp() - make_interval(secs => c.sit_out_kick_seconds)))
             order by id loop
      perform public._poker_cashout(s.id);
      res := 'cashed_out';
    end loop;
    if coalesce((select next_hand_at from poker_hands where table_id = t.id order by id desc limit 1), '-infinity')
       <= clock_timestamp() then
      hid := public._poker_open_hand(t.id);
      if hid is not null then res := 'opened'; end if;
    end if;
  end if;
  perform public._poker_touch(t.id);
  return res;
end $$;

-- ---------- worker ----------
create or replace function public.poker_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; failed int := 0; started timestamptz := clock_timestamp(); c poker_config;
begin
  if not pg_try_advisory_xact_lock(hashtext('poker_tick')) then
    return jsonb_build_object('skipped', 'busy');
  end if;
  select * into c from poker_config;
  for r in
    select id from poker_tables
    where status = 'OPEN' and next_due_at <= clock_timestamp()
    order by next_due_at
    limit c.tick_tables
    for update skip locked
  loop
    exit when clock_timestamp() - started > interval '400 milliseconds';
    begin
      perform public._poker_tick_table(r.id);
      n := n + 1;
    exception when others then
      failed := failed + 1;
      perform _audit(null, 'poker_tick_failed', r.id, jsonb_build_object('error', left(sqlerrm, 500)));
      update poker_tables set next_due_at = clock_timestamp() + interval '5 seconds' where id = r.id;
    end;
  end loop;
  update poker_tables set status = 'CLOSED', closed_at = clock_timestamp(), next_due_at = null
  where status = 'OPEN' and seated = 0 and hand_id is null
    and updated_at < clock_timestamp() - interval '10 minutes'
    and id not in (select min(id) from poker_tables where status = 'OPEN' group by type_id);
  return jsonb_build_object('processed', n, 'failed', failed);
end $$;

-- Runs inside the existing one-second Slott job. Poker errors never fail the Slott tick.
create or replace function public.slot_tick_with_poker() returns jsonb
language plpgsql security definer set search_path = public as $$
declare a jsonb; b jsonb;
begin
  a := public.slot_tick();
  begin
    b := public.poker_tick();
  exception when others then
    b := jsonb_build_object('error', left(sqlerrm, 300));
  end;
  return jsonb_build_object('slot', a, 'poker', b);
end $$;

-- ---------- player RPCs ----------
create or replace function public._poker_uid() returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  return uid;
end $$;

-- A head whose preimages were already published would let the server know that player's
-- future contribution before committing its seed.
create or replace function public._poker_assert_fresh_chain(p_head text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_head !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_CHAIN'; end if;
  if exists (select 1 from poker_hand_players where link = p_head)
     or exists (select 1 from poker_hand_players where reveal = p_head) then
    raise exception 'CHAIN_REUSED';
  end if;
end $$;

create or replace function public.poker_sit(
  p_table bigint, p_type smallint, p_seat smallint, p_buy_in bigint, p_chain_head text, p_key text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); prof profiles; c poker_config; ty poker_table_types; t poker_tables;
  jc money_domain_config; s poker_seats; v_seat smallint; head text := lower(coalesce(p_chain_head, '')); running boolean;
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtext('poker:' || uid::text || ':' || p_key));
  select * into s from poker_seats where user_id = uid and idempotency_key = p_key;
  if found then
    return jsonb_build_object('duplicate', true, 'table_id', s.table_id, 'seat_no', s.seat_no);
  end if;
  select * into prof from profiles where id = uid;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if prof.self_excluded_until is not null and prof.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  select * into c from poker_config;
  if not c.enabled then raise exception 'POKER_DISABLED'; end if;
  if not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  if public._poker_void_strikes(uid) >= c.void_strikes_per_day then raise exception 'VOID_COOLDOWN'; end if;
  perform public._poker_assert_fresh_chain(head);
  select * into jc from money_domain_config;

  if p_table is null then
    select * into ty from poker_table_types where id = p_type and enabled;
    if not found then raise exception 'INVALID_TABLE_TYPE'; end if;
    select * into t from poker_tables pt
      where pt.type_id = ty.id and pt.status = 'OPEN' and pt.account_type = jc.account_type
        and pt.seated < pt.max_seats
        and not exists (select 1 from poker_seats x where x.table_id = pt.id and x.user_id = uid and x.status = 'SEATED')
      order by pt.seated desc, pt.id
      limit 1
      for update;
    if not found then
      insert into poker_tables (type_id, name, money_domain, asset, account_type, small_blind, big_blind,
        min_buy_in, max_buy_in, max_seats, fee_bps)
      values (ty.id, ty.label || ' Hold''em', jc.money_domain, jc.asset, jc.account_type, ty.small_blind,
        ty.big_blind, ty.min_buy_in, ty.max_buy_in, ty.max_seats, c.fee_bps)
      returning * into t;
      update poker_tables set name = ty.label || ' Hold''em #' || t.id where id = t.id;
    end if;
  else
    select * into t from poker_tables where id = p_table for update;
    if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  end if;
  if t.status <> 'OPEN' then raise exception 'TABLE_CLOSED'; end if;
  if t.account_type <> jc.account_type then raise exception 'REAL_MONEY_DISABLED'; end if;
  if exists (select 1 from poker_seats where table_id = t.id and user_id = uid and status = 'SEATED') then
    raise exception 'ALREADY_SEATED';
  end if;
  if (select count(*) from poker_seats where user_id = uid and status = 'SEATED') >= c.max_tables_per_user then
    raise exception 'TOO_MANY_TABLES';
  end if;
  if p_buy_in is null or p_buy_in < t.min_buy_in or p_buy_in > t.max_buy_in then raise exception 'INVALID_BUY_IN'; end if;
  if p_seat is not null then
    if p_seat < 0 or p_seat >= t.max_seats then raise exception 'INVALID_SEAT'; end if;
    if exists (select 1 from poker_seats x where x.table_id = t.id and x.seat_no = p_seat and x.status = 'SEATED') then
      raise exception 'SEAT_TAKEN';
    end if;
    v_seat := p_seat;
  else
    select g::smallint into v_seat from generate_series(0, t.max_seats - 1) g
      where not exists (select 1 from poker_seats x where x.table_id = t.id and x.seat_no = g and x.status = 'SEATED')
      order by g limit 1;
    if v_seat is null then raise exception 'TABLE_FULL'; end if;
  end if;
  running := t.hand_id is not null or (select count(*) from poker_seats x where x.table_id = t.id and x.status = 'SEATED'
                                       and x.state = 'ACTIVE' and x.stack > 0) >= 2;
  insert into poker_seats (table_id, seat_no, user_id, chain_link, owes_bb, idempotency_key)
    values (t.id, v_seat, uid, head, running, p_key)
    returning * into s;
  perform public._poker_take_cash(s.id, p_buy_in, false);
  perform _audit(uid, 'poker_sit', t.id, jsonb_build_object('seat_id', s.id, 'seat_no', v_seat, 'buy_in', p_buy_in));
  if t.hand_id is null then perform public._poker_tick_table(t.id); else perform public._poker_touch(t.id); end if;
  return jsonb_build_object('duplicate', false, 'table_id', t.id, 'seat_no', v_seat);
end $$;

create or replace function public.poker_top_up(p_table bigint, p_amount bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); t poker_tables; s poker_seats; in_hand boolean;
begin
  if not (select enabled from poker_config) then raise exception 'POKER_DISABLED'; end if;
  if not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  select * into t from poker_tables where id = p_table for update;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  select * into s from poker_seats where table_id = t.id and user_id = uid and status = 'SEATED' for update;
  if not found then raise exception 'NOT_SEATED'; end if;
  if s.leaving then raise exception 'LEAVING'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if s.stack + s.pending + p_amount > t.max_buy_in then raise exception 'ABOVE_MAX_BUY_IN'; end if;
  if s.stack + s.pending + p_amount < t.min_buy_in then raise exception 'BELOW_MIN_BUY_IN'; end if;
  in_hand := public._poker_in_hand(s.id);
  perform public._poker_take_cash(s.id, p_amount, in_hand);
  perform public._poker_touch(t.id);
  return jsonb_build_object('ok', true, 'pending', in_hand);
end $$;

create or replace function public.poker_reveal(p_hand bigint, p_value text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := public._poker_uid(); h poker_hands; hp poker_hand_players; v text := lower(coalesce(p_value, ''));
begin
  select * into h from poker_hands where id = p_hand;
  if not found then raise exception 'HAND_NOT_FOUND'; end if;
  perform 1 from poker_tables where id = h.table_id for update;
  select * into h from poker_hands where id = p_hand for update;
  select * into hp from poker_hand_players where hand_id = p_hand and user_id = uid;
  if not found then raise exception 'NOT_IN_HAND'; end if;
  if hp.reveal is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if h.status <> 'COMMIT' then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  if v !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_REVEAL'; end if;
  if encode(extensions.digest(decode(v, 'hex'), 'sha256'), 'hex') <> hp.link then raise exception 'REVEAL_MISMATCH'; end if;
  update poker_hand_players set reveal = v where hand_id = p_hand and seat_no = hp.seat_no;
  update poker_seats set chain_link = v where id = hp.seat_id;
  perform public._poker_deal(p_hand);
  perform public._poker_touch(h.table_id);
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

create or replace function public.poker_commit_chain(p_table bigint, p_head text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); head text := lower(coalesce(p_head, ''));
begin
  perform public._poker_assert_fresh_chain(head);
  perform 1 from poker_tables where id = p_table for update;
  update poker_seats set chain_link = head where table_id = p_table and user_id = uid and status = 'SEATED';
  if not found then raise exception 'NOT_SEATED'; end if;
  perform public._poker_touch(p_table);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.poker_act(
  p_hand bigint, p_version int, p_action text, p_amount bigint, p_key text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); h poker_hands; hp poker_hand_players;
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  select * into h from poker_hands where id = p_hand;
  if not found then raise exception 'HAND_NOT_FOUND'; end if;
  perform 1 from poker_tables where id = h.table_id for update;
  if exists (select 1 from poker_actions where hand_id = p_hand and user_id = uid and idempotency_key = p_key) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  select * into h from poker_hands where id = p_hand for update;
  if h.status <> 'BETTING' then raise exception 'HAND_NOT_ACTIVE'; end if;
  select * into hp from poker_hand_players where hand_id = p_hand and user_id = uid;
  if not found then raise exception 'NOT_IN_HAND'; end if;
  if h.to_act is distinct from hp.seat_no then raise exception 'NOT_YOUR_TURN'; end if;
  if p_version is distinct from h.version then raise exception 'STALE_STATE'; end if;
  if clock_timestamp() > h.action_deadline + interval '1 second' then raise exception 'ACTION_EXPIRED'; end if;
  update poker_seats set timeouts = 0 where id = hp.seat_id;
  perform public._poker_apply(p_hand, hp.seat_no, p_action, p_amount, 'player', p_key);
  perform public._poker_touch(h.table_id);
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

create or replace function public.poker_sit_out(p_table bigint, p_out boolean, p_chain_head text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); s poker_seats; head text := nullif(lower(coalesce(p_chain_head, '')), '');
  t poker_tables;
begin
  if head is not null then perform public._poker_assert_fresh_chain(head); end if;
  select * into t from poker_tables where id = p_table for update;
  select * into s from poker_seats where table_id = p_table and user_id = uid and status = 'SEATED' for update;
  if not found then raise exception 'NOT_SEATED'; end if;
  if p_out then
    update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp() where id = s.id and state = 'ACTIVE';
  else
    if s.stack + s.pending = 0 then raise exception 'TOP_UP_REQUIRED'; end if;
    if coalesce(head, s.chain_link) is null then raise exception 'INVALID_CHAIN'; end if;
    if public._poker_void_strikes(uid) >= (select void_strikes_per_day from poker_config) then
      raise exception 'VOID_COOLDOWN';
    end if;
    update poker_seats set state = 'ACTIVE', sat_out_at = null, timeouts = 0,
      owes_bb = owes_bb or s.state = 'SITTING_OUT', chain_link = coalesce(head, chain_link)
    where id = s.id;
  end if;
  if t.hand_id is null then perform public._poker_tick_table(p_table); else perform public._poker_touch(p_table); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.poker_leave(p_table bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); s poker_seats; t poker_tables; h poker_hands; hp poker_hand_players;
begin
  select * into t from poker_tables where id = p_table for update;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  select * into s from poker_seats where table_id = p_table and user_id = uid and status = 'SEATED' for update;
  if not found then return jsonb_build_object('ok', true, 'already', true); end if;
  update poker_seats set leaving = true where id = s.id;
  if t.hand_id is not null then
    select * into h from poker_hands where id = t.hand_id for update;
    select * into hp from poker_hand_players where hand_id = h.id and seat_id = s.id;
    if found then
      if h.status = 'COMMIT' then
        perform public._poker_void(h.id, 'player_left', array[uid]);
      elsif h.status = 'BETTING' and h.to_act = hp.seat_no and not hp.folded then
        perform public._poker_apply(h.id, hp.seat_no, 'FOLD', 0, 'leave', null);
      end if;
    end if;
  end if;
  if not public._poker_in_hand(s.id) then perform public._poker_cashout(s.id); end if;
  perform public._poker_touch(p_table);
  return jsonb_build_object('ok', true, 'pending', public._poker_in_hand(s.id));
end $$;

-- Browser recovery hint: does only what is already due on this table.
create or replace function public.poker_nudge(p_table bigint) returns text
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select id into r from poker_tables
    where id = p_table and status = 'OPEN' and next_due_at <= clock_timestamp()
    for update skip locked;
  if not found then return 'not_due'; end if;
  return public._poker_tick_table(p_table);
end $$;

-- ---------- reads ----------
create or replace function public.poker_lobby() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'enabled', (select enabled from poker_config),
    'fee_bps', (select fee_bps from poker_config),
    'action_seconds', (select action_seconds from poker_config),
    'types', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ty.id, 'label', ty.label, 'category', ty.category, 'small_blind', ty.small_blind,
        'big_blind', ty.big_blind, 'min_buy_in', ty.min_buy_in, 'max_buy_in', ty.max_buy_in,
        'max_seats', ty.max_seats,
        'tables', (select count(*) from poker_tables t where t.type_id = ty.id and t.status = 'OPEN'),
        'players', (select coalesce(sum(t.seated), 0) from poker_tables t where t.type_id = ty.id and t.status = 'OPEN')
      ) order by ty.sort) from poker_table_types ty where ty.enabled), '[]'::jsonb),
    'tables', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'type_id', t.type_id, 'name', t.name, 'seated', t.seated, 'max_seats', t.max_seats,
        'hand_count', t.hand_count, 'live', t.hand_id is not null,
        'players', (select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'avatar_url', p.avatar_url)
                      order by s.seat_no), '[]'::jsonb)
                    from poker_seats s join profiles p on p.id = s.user_id
                    where s.table_id = t.id and s.status = 'SEATED')
      ) order by t.type_id, t.seated desc, t.id) from poker_tables t where t.status = 'OPEN'), '[]'::jsonb)
  )
$$;

create or replace function public.poker_buyin_info(p_type smallint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); jc money_domain_config; bal bigint; cash bigint; ty poker_table_types;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into jc from money_domain_config;
  select * into ty from poker_table_types where id = p_type;
  select balance into bal from wallet_accounts
    where owner_id = uid and kind = 'user_available' and asset = jc.asset and account_type = jc.account_type;
  if jc.account_type = 'real' then
    cash := least(coalesce(bal, 0), (public._withdraw_basis_peek(uid) ->> 'eligible')::bigint);
  else
    cash := coalesce(bal, 0);
  end if;
  return jsonb_build_object('available', coalesce(bal, 0), 'cash', greatest(cash, 0),
    'min_buy_in', ty.min_buy_in, 'max_buy_in', ty.max_buy_in);
end $$;

create or replace function public._poker_hand_json(p_hand bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', h.id, 'hand_no', h.hand_no, 'status', h.status, 'street', h.street,
    'button_seat', h.button_seat, 'sb_seat', h.sb_seat, 'bb_seat', h.bb_seat,
    'small_blind', h.small_blind, 'big_blind', h.big_blind, 'fee_bps', h.fee_bps,
    'current_bet', h.current_bet, 'last_raise', h.last_raise, 'to_act', h.to_act,
    'action_deadline', h.action_deadline, 'reveal_deadline', h.reveal_deadline,
    'board', to_jsonb(h.board), 'version', h.version, 'protocol_version', h.protocol_version,
    'server_seed_hash', h.server_seed_hash, 'server_seed', h.server_seed, 'entropy', h.entropy,
    'pots', h.pots, 'fee_total', h.fee_total, 'next_hand_at', h.next_hand_at, 'void_reason', h.void_reason,
    'voided_by', to_jsonb(h.voided_by),
    'runout_streets', h.runout_streets, 'created_at', h.created_at, 'dealt_at', h.dealt_at,
    'completed_at', h.completed_at,
    'players', (select coalesce(jsonb_agg(jsonb_build_object(
        'seat_no', hp.seat_no, 'user_id', hp.user_id, 'deal_index', hp.deal_index,
        'start_stack', hp.start_stack, 'stack', hp.stack, 'street_bet', hp.street_bet, 'total_bet', hp.total_bet,
        'folded', hp.folded, 'all_in', hp.all_in, 'acted', hp.acted, 'acted_bet', hp.acted_bet,
        'posts_bb', hp.posts_bb, 'last_action', hp.last_action,
        'link', hp.link, 'reveal', hp.reveal, 'shown_cards', to_jsonb(hp.shown_cards), 'hand_name', hp.hand_name,
        'won', hp.won, 'refund', hp.refund, 'wagered', hp.wagered, 'end_stack', hp.end_stack
      ) order by hp.seat_no), '[]'::jsonb) from poker_hand_players hp where hp.hand_id = h.id),
    'actions', (select coalesce(jsonb_agg(jsonb_build_object(
        'seq', a.seq, 'seat_no', a.seat_no, 'street', a.street, 'action', a.action, 'amount', a.amount,
        'to_amount', a.to_amount, 'all_in', a.all_in, 'cards', to_jsonb(a.cards), 'at', a.created_at
      ) order by a.seq), '[]'::jsonb) from poker_actions a where a.hand_id = h.id)
  )
  from poker_hands h where h.id = p_hand
$$;

create or replace function public.poker_table_state(p_table bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); t poker_tables; cur bigint; last_done bigint; me jsonb := null; ms poker_seats;
  hp poker_hand_players; h poker_hands; cards smallint[];
begin
  select * into t from poker_tables where id = p_table;
  if not found then return null; end if;
  cur := t.hand_id;
  select id into last_done from poker_hands where table_id = t.id and status in ('COMPLETED', 'VOIDED')
    order by id desc limit 1;
  if uid is not null then
    select * into ms from poker_seats where table_id = t.id and user_id = uid and status = 'SEATED';
    if found then
      me := jsonb_build_object('seat_id', ms.id, 'seat_no', ms.seat_no, 'stack', ms.stack, 'pending', ms.pending,
        'state', ms.state, 'leaving', ms.leaving, 'chain_link', ms.chain_link, 'owes_bb', ms.owes_bb,
        'buy_in_total', ms.buy_in_total, 'timeouts', ms.timeouts, 'missed_reveals', ms.missed_reveals);
    end if;
    if cur is not null then
      select * into hp from poker_hand_players where hand_id = cur and user_id = uid;
      if found then
        select hc.cards into cards from poker_hole_cards hc where hc.hand_id = cur and hc.user_id = uid;
        select * into h from poker_hands where id = cur;
        me := coalesce(me, '{}'::jsonb) || jsonb_build_object(
          'hand_id', cur, 'hand_seat', hp.seat_no, 'hole_cards', to_jsonb(cards), 'link', hp.link,
          'revealed', hp.reveal is not null,
          'legal', case when h.status = 'BETTING' and h.to_act = hp.seat_no then public._poker_legal(cur, hp.seat_no) end);
      end if;
    end if;
  end if;
  return jsonb_build_object(
    'server_time', clock_timestamp(),
    'config', (select jsonb_build_object('enabled', enabled, 'fee_bps', fee_bps, 'action_seconds', action_seconds,
                 'reveal_seconds', reveal_seconds) from poker_config),
    'table', jsonb_build_object('id', t.id, 'type_id', t.type_id, 'name', t.name, 'status', t.status,
      'small_blind', t.small_blind, 'big_blind', t.big_blind, 'min_buy_in', t.min_buy_in, 'max_buy_in', t.max_buy_in,
      'max_seats', t.max_seats, 'fee_bps', t.fee_bps, 'button_seat', t.button_seat, 'hand_count', t.hand_count,
      'seated', t.seated, 'version', t.version, 'account_type', t.account_type),
    'seats', (select coalesce(jsonb_agg(jsonb_build_object(
        'seat_id', s.id, 'seat_no', s.seat_no, 'user_id', s.user_id, 'username', p.username, 'avatar_url', p.avatar_url,
        'stack', s.stack, 'pending', s.pending, 'state', s.state, 'leaving', s.leaving, 'owes_bb', s.owes_bb
      ) order by s.seat_no), '[]'::jsonb)
      from poker_seats s join profiles p on p.id = s.user_id where s.table_id = t.id and s.status = 'SEATED'),
    'hand', case when cur is not null then public._poker_hand_json(cur) end,
    'last_hand', case when last_done is not null then public._poker_hand_json(last_done) end,
    'recent', (select coalesce(jsonb_agg(x.j order by x.id desc), '[]'::jsonb) from (
        select h2.id, jsonb_build_object('id', h2.id, 'hand_no', h2.hand_no, 'board', to_jsonb(h2.board),
          'fee_total', h2.fee_total, 'completed_at', h2.completed_at,
          'pot', (select coalesce(sum(total_bet), 0) from poker_hand_players where hand_id = h2.id),
          'winners', (select coalesce(jsonb_agg(jsonb_build_object('seat_no', hp2.seat_no, 'username', pr.username,
                        'won', hp2.won, 'hand_name', hp2.hand_name) order by hp2.won desc), '[]'::jsonb)
                      from poker_hand_players hp2 join profiles pr on pr.id = hp2.user_id
                      where hp2.hand_id = h2.id and hp2.won > 0)) j
        from poker_hands h2 where h2.table_id = t.id and h2.status = 'COMPLETED' order by h2.id desc limit 12) x),
    'me', me
  );
end $$;

create or replace function public.poker_hand_detail(p_hand bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when h.status in ('COMPLETED', 'VOIDED') then public._poker_hand_json(h.id) end
  from poker_hands h where h.id = p_hand
$$;

-- Every open seat, closed seat and completed hand must agree with the ledger.
create or replace function public.poker_reconcile() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare seat_bad int; closed_bad int; hand_bad int; locked_bad int; examples jsonb;
begin
  select count(*) into seat_bad from poker_seats s
  where s.status = 'SEATED' and not public._poker_in_hand(s.id)
    and s.stack + s.pending <> s.buy_in_total + coalesce((
      select sum(hp.end_stack - hp.start_stack) from poker_hand_players hp join poker_hands h on h.id = hp.hand_id
      where hp.seat_id = s.id and h.status = 'COMPLETED'), 0);
  select count(*) into closed_bad from poker_seats s
  where s.status = 'CLOSED' and s.cashed_out <> s.buy_in_total + coalesce((
      select sum(hp.end_stack - hp.start_stack) from poker_hand_players hp join poker_hands h on h.id = hp.hand_id
      where hp.seat_id = s.id and h.status = 'COMPLETED'), 0);
  select count(*) into hand_bad from poker_hands h
  where h.status = 'COMPLETED' and (
    (select coalesce(sum(p.amount), 0) from ledger_postings p join wallet_accounts a on a.id = p.account_id
      where p.tx_id = h.ledger_tx_id and a.kind = 'house_revenue') <> h.fee_total
    or (select coalesce(sum(p.amount), 0) from ledger_postings p join wallet_accounts a on a.id = p.account_id
      where p.tx_id = h.ledger_tx_id and a.kind = 'user_locked')
       <> (select coalesce(sum(end_stack - start_stack), 0) from poker_hand_players where hand_id = h.id)
    or (select coalesce(sum(total_bet), 0) from poker_hand_players where hand_id = h.id)
       <> (select coalesce(sum(won + refund), 0) from poker_hand_players where hand_id = h.id) + h.fee_total);
  select count(*) into locked_bad from (
    select s.user_id, sum(s.stack + s.pending) as seated, t.asset, t.account_type
    from poker_seats s join poker_tables t on t.id = s.table_id
    where s.status = 'SEATED' group by s.user_id, t.asset, t.account_type) x
  where x.seated > coalesce((select balance from wallet_accounts w where w.owner_id = x.user_id
    and w.kind = 'user_locked' and w.asset = x.asset and w.account_type = x.account_type), 0);
  return jsonb_build_object('ok', seat_bad + closed_bad + hand_bad + locked_bad = 0,
    'open_seats', seat_bad, 'closed_seats', closed_bad, 'hands', hand_bad, 'locked_coverage', locked_bad);
end $$;

-- ---------- prestige and profile stats ----------
alter table public.xp_events drop constraint if exists xp_events_source_game_check;
alter table public.xp_events add constraint xp_events_source_game_check
  check (source_game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'daily_chest'));

create or replace function public.prestige_award_wager(
  p_user uuid, p_game text, p_source text, p_cents bigint, p_meta jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare xp bigint; inserted int; cur public.user_prestige; nxt int; before_level int;
begin
  if p_user is null or p_cents is null or p_cents <= 0 then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker') then raise exception 'BAD_GAME'; end if;
  if p_source is null or length(p_source) > 80 then raise exception 'BAD_SOURCE'; end if;
  xp := p_cents / 10;
  if xp <= 0 then return; end if;
  insert into public.user_prestige (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into cur from public.user_prestige where user_id = p_user for update;
  insert into public.xp_events (user_id, source_game, source_transaction_id, event_type, xp_amount, metadata)
  values (p_user, p_game, p_source, 'wager_settled', xp, coalesce(p_meta, '{}'::jsonb) - 'seed' - 'secret' - 'token')
  on conflict (source_game, source_transaction_id, event_type) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    perform public._audit(p_user, 'prestige_replay', null, jsonb_build_object('game', p_game, 'source', p_source));
    return;
  end if;
  before_level := cur.current_level;
  nxt := public.prestige_level_for(cur.total_xp + xp);
  update public.user_prestige
    set total_xp = total_xp + xp, current_level = nxt, updated_at = clock_timestamp()
    where user_id = p_user;
  perform public.prestige_sync_user(p_user);
  perform public._audit(p_user, 'prestige_xp_earned', null, jsonb_build_object('game', p_game, 'xp', xp, 'source', p_source));
  if nxt > before_level then
    perform public._audit(p_user, 'prestige_level_up', null, jsonb_build_object('from', before_level, 'to', nxt));
    perform public._audit(p_user, 'prestige_reward_unlocked', null, jsonb_build_object('level', nxt));
  end if;
end $$;

create or replace function public.get_profile_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_wagered bigint;
  v_played bigint;
  v_won bigint;
  v_wins bigint;
begin
  if auth.uid() is distinct from p_user then
    return null;
  end if;

  select coalesce((
    (select coalesce(sum(jp.total_amount), 0)
     from public.jackpot_players jp
     join public.jackpot_games g on g.id = jp.game_id
     where jp.user_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(e.amount), 0)
       from public.coinflip_entries e
       join public.coinflip_games g on g.id = e.game_id
       where e.user_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(b.amount), 0)
       from public.roulette_bets b
       join public.roulette_games g on g.id = b.game_id
       where b.user_id = p_user and b.status in ('WON', 'LOST') and g.status = 'COMPLETED')
    + (select coalesce(sum(e.amount), 0)
       from public.slot_entries e
       join public.slot_games g on g.id = e.game_id
       where e.user_id = p_user and g.status = 'COMPLETED' and e.amount > 0)
    + (select coalesce(sum(hp.wagered), 0)
       from public.poker_hand_players hp
       join public.poker_hands h on h.id = hp.hand_id
       where hp.user_id = p_user and h.status = 'COMPLETED')
  ), 0) into v_wagered;

  select coalesce((
    (select count(*)::bigint from public.jackpot_players jp
     join public.jackpot_games g on g.id = jp.game_id
     where jp.user_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.coinflip_entries e
       join public.coinflip_games g on g.id = e.game_id
       where e.user_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.roulette_bets b
       join public.roulette_games g on g.id = b.game_id
       where b.user_id = p_user and b.status in ('WON', 'LOST') and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.slot_entries e
       join public.slot_games g on g.id = e.game_id
       where e.user_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.poker_hand_players hp
       join public.poker_hands h on h.id = hp.hand_id
       where hp.user_id = p_user and h.status = 'COMPLETED' and hp.total_bet > 0)
  ), 0) into v_played;

  select coalesce((
    (select coalesce(sum(g.payout_amount), 0)
     from public.jackpot_games g
     where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(g.payout_amount), 0)
       from public.coinflip_games g
       where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(b.payout_amount), 0)
       from public.roulette_bets b
       where b.user_id = p_user and b.status = 'WON')
    + (select coalesce(sum(g.payout_amount), 0)
       from public.slot_games g
       where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(hp.won), 0)
       from public.poker_hand_players hp
       join public.poker_hands h on h.id = hp.hand_id
       where hp.user_id = p_user and h.status = 'COMPLETED' and hp.won > 0)
  ), 0) into v_won;

  select coalesce((
    (select count(*)::bigint from public.jackpot_games g
     where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.coinflip_games g
       where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.roulette_bets b
       where b.user_id = p_user and b.status = 'WON')
    + (select count(*)::bigint from public.slot_games g
       where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.poker_hand_players hp
       join public.poker_hands h on h.id = hp.hand_id
       where hp.user_id = p_user and h.status = 'COMPLETED' and hp.won > 0)
  ), 0) into v_wins;

  return jsonb_build_object(
    'games_played', v_played,
    'games_won', v_wins,
    'total_wagered', v_wagered,
    'total_won', v_won
  );
end $$;

-- ---------- admin cash-flow report ----------
-- Same as 20261010180000 plus a Poker winnings row.
create or replace function public.admin_ledger_cashflow()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  epoch timestamptz := coalesce((select started_at from public.ops_stat_epoch), '-infinity'::timestamptz);
  since timestamptz := greatest(day_start, epoch);
  bal record;
  players record;
  dep_today bigint;
  dep_all bigint;
  wd_today bigint;
  wd_all bigint;
  fee_today bigint;
  fee_all bigint;
  open_cents bigint;
  open_count bigint;
  house_fee_today bigint;
  house_fee_all bigint;
  wins jsonb;
  credits jsonb;
  wallets jsonb;
  fresh_cents bigint;
  stale boolean;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();

  select
    coalesce(sum(balance) filter (where kind = 'user_available'), 0) player_available,
    coalesce(sum(balance) filter (where kind = 'user_locked'), 0) player_locked,
    coalesce(sum(balance) filter (where kind = 'game_escrow'), 0) game_escrow,
    coalesce(sum(balance) filter (where kind = 'house_revenue'), 0) house_revenue,
    coalesce(sum(balance) filter (where kind = 'house_bankroll'), 0) house_bankroll,
    coalesce(sum(balance) filter (where kind = 'external_custody'), 0) external_custody
  into bal
  from wallet_accounts
  where account_type = 'real' and asset = 'USD';

  select
    coalesce(sum(w.balance) filter (
      where w.kind = 'user_available' and not coalesce(p.active, false)
    ), 0) available_cents,
    coalesce(sum(w.balance) filter (
      where w.kind = 'user_locked' and not coalesce(p.active, false)
    ), 0) locked_cents,
    coalesce(sum(w.balance) filter (
      where w.kind in ('user_available', 'user_locked') and p.active
    ), 0) partner_cents
  into players
  from wallet_accounts w
  left join public.partners p on p.user_id = w.owner_id
  where w.account_type = 'real'
    and w.asset = 'USD'
    and w.kind in ('user_available', 'user_locked');

  select
    coalesce(sum(usd_cents) filter (where credited_at >= since), 0),
    coalesce(sum(usd_cents) filter (where credited_at >= epoch), 0)
  into dep_today, dep_all
  from public._admin_credited_deposits() d;

  select
    coalesce(sum(usd_cents) filter (where paid_at >= since), 0),
    coalesce(sum(usd_cents) filter (where paid_at >= epoch), 0),
    coalesce(sum(fee_usd_cents) filter (where paid_at >= since), 0),
    coalesce(sum(fee_usd_cents) filter (where paid_at >= epoch), 0)
  into wd_today, wd_all, fee_today, fee_all
  from public._admin_settled_withdrawals() w;

  select coalesce(sum(usd_cents), 0), count(*)::bigint
  into open_cents, open_count
  from public._admin_open_withdrawals() o;

  select coalesce(jsonb_agg(jsonb_build_object(
    'game', x.game, 'today', x.today, 'all_time', x.all_time
  ) order by x.ord), '[]'::jsonb)
  into wins
  from (
    select k.ord, k.game,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= since), 0) today,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= epoch), 0) all_time
    from (values
      (1, 'Jackpot', 'jackpot_settlement'::public.tx_kind),
      (2, 'Coinflip', 'coinflip_settlement'),
      (3, 'Roulette', 'roulette_settlement'),
      (4, 'Slott', 'slot_settlement'),
      (5, 'Slott bonus', 'slot_bonus')
    ) as k(ord, game, kind)
    left join ledger_transactions t on t.kind = k.kind and t.account_type = 'real'
    left join ledger_postings p on p.tx_id = t.id
    left join wallet_accounts a on a.id = p.account_id
      and a.kind = 'user_available' and a.account_type = 'real' and a.asset = 'USD'
    group by k.ord, k.game
  ) x;

  -- Poker pays pot shares into the seat, not the wallet, and returns uncalled chips in the
  -- same transaction, so its row comes from the settled hand records.
  select wins || jsonb_build_array(jsonb_build_object('game', 'Poker',
      'today', coalesce(sum(hp.won) filter (where h.completed_at >= since), 0),
      'all_time', coalesce(sum(hp.won) filter (where h.completed_at >= epoch), 0)))
  into wins
  from poker_hands h join poker_hand_players hp on hp.hand_id = h.id
  where h.status = 'COMPLETED' and h.account_type = 'real' and h.asset = 'USD' and hp.won > 0;

  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', x.kind, 'today', x.today, 'all_time', x.all_time
  ) order by x.ord), '[]'::jsonb)
  into credits
  from (
    select k.ord, k.kind,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= since), 0) today,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= epoch), 0) all_time
    from (values
      (1, 'Promo', 'promo_reward'::public.tx_kind),
      (2, 'Referral', 'referral_reward'),
      (3, 'Prestige', 'prestige_reward'),
      (4, 'Partner', 'partner_credit')
    ) as k(ord, kind, txkind)
    left join ledger_transactions t on t.kind = k.txkind and t.account_type = 'real'
    left join ledger_postings p on p.tx_id = t.id
    left join wallet_accounts a on a.id = p.account_id
      and a.kind = 'user_available' and a.account_type = 'real' and a.asset = 'USD'
    group by k.ord, k.kind
  ) x;

  select
    coalesce(sum(p.amount) filter (where p.amount > 0 and t.created_at >= since), 0),
    coalesce(sum(p.amount) filter (where p.amount > 0 and t.created_at >= epoch), 0)
  into house_fee_today, house_fee_all
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  join wallet_accounts a on a.id = p.account_id
  where a.kind = 'house_revenue' and a.account_type = 'real' and a.asset = 'USD';

  select coalesce(jsonb_agg(jsonb_build_object(
    'network', y.network,
    'asset', y.asset_key,
    'total_cents', y.total_cents,
    'reserved_cents', y.reserved_cents,
    'available_cents', y.available_cents,
    'fresh', y.fresh,
    'observed_at', y.observed_at
  ) order by y.network, y.asset_key), '[]'::jsonb),
    coalesce(sum(y.total_cents) filter (where y.fresh and y.total_cents is not null), 0),
    coalesce(bool_or(not y.fresh), false)
  into wallets, fresh_cents, stale
  from (
    select t.network, t.asset_key,
      case when p.price is null or st.balance_units is null then null
        else floor(st.balance_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as total_cents,
      case when p.price is null then null
        else floor(st.reserved_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as reserved_cents,
      case when p.price is null or st.available_units is null then null
        else floor(st.available_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as available_cents,
      st.available_units is not null as fresh,
      st.observed_at
    from treasury_assets t
    cross join lateral public._treasury_state(t.network, t.asset_key) st
    cross join lateral (select public._treasury_price(t.network, t.asset_key) as price) p
    where t.network = 'bitcoin'
      or exists (
        select 1 from chain_assets a
        join chain_networks n on n.chain_id = a.chain_id
        where 'eip155:' || a.chain_id = t.network and a.asset_key = t.asset_key and a.is_enabled and n.is_enabled
      )
  ) y;

  return jsonb_build_object(
    'server_time', clock_timestamp(),
    'stat_epoch', epoch,
    'balances', jsonb_build_object(
      'player_available', players.available_cents,
      'player_locked', players.locked_cents,
      'game_escrow', bal.game_escrow,
      'player_owed', players.available_cents + players.locked_cents + bal.game_escrow,
      'partner_play', players.partner_cents,
      'house_revenue', bal.house_revenue,
      'house_bankroll', bal.house_bankroll,
      'custody_net', -bal.external_custody,
      'books_balance', -bal.external_custody = bal.player_available + bal.player_locked + bal.game_escrow + bal.house_revenue + bal.house_bankroll
    ),
    'deposits', jsonb_build_object('today', dep_today, 'all_time', dep_all),
    'withdrawals', jsonb_build_object(
      'paid_today', wd_today,
      'paid_all_time', wd_all,
      'fees_today', fee_today,
      'fees_all_time', fee_all,
      'open_cents', open_cents,
      'open_count', open_count
    ),
    'winnings', wins,
    'fees', jsonb_build_object('today', house_fee_today, 'all_time', house_fee_all),
    'credits', credits,
    'wallets', wallets,
    'wallets_fresh_cents', fresh_cents,
    'wallets_stale', stale
  );
end $$;

-- ---------- grants ----------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname like '\_poker\_%' or p.proname like 'poker\_%'
      or p.proname = 'slot_tick_with_poker')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

grant execute on function public._poker_eval(smallint[]) to anon, authenticated;
grant execute on function public._poker_shuffle(bytea, bigint, text) to anon, authenticated;
grant execute on function public.poker_lobby() to anon, authenticated;
grant execute on function public.poker_table_state(bigint) to anon, authenticated;
grant execute on function public.poker_hand_detail(bigint) to anon, authenticated;
grant execute on function public.poker_buyin_info(smallint) to authenticated;
grant execute on function public.poker_sit(bigint, smallint, smallint, bigint, text, text) to authenticated;
grant execute on function public.poker_top_up(bigint, bigint) to authenticated;
grant execute on function public.poker_reveal(bigint, text) to authenticated;
grant execute on function public.poker_commit_chain(bigint, text) to authenticated;
grant execute on function public.poker_act(bigint, int, text, bigint, text) to authenticated;
grant execute on function public.poker_sit_out(bigint, boolean, text) to authenticated;
grant execute on function public.poker_leave(bigint) to authenticated;
grant execute on function public.poker_nudge(bigint) to authenticated;
revoke all on function public.prestige_award_wager(uuid, text, text, bigint, jsonb) from public, anon, authenticated;
revoke all on function public.get_profile_stats(uuid) from public, anon, authenticated;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;

-- prod-only:begin
select cron.schedule('pvp-slot-worker', '1 second', 'select public.slot_tick_with_poker()');
-- prod-only:end

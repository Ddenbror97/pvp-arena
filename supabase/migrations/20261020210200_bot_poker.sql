-- Poker bots act inside the existing table tick. Thinking time is a timestamp,
-- never a sleep, so the worker does not hold locks while a bot "decides".
-- Hole cards other than the bot's own seat are not read.

alter table public.poker_hands
  add column if not exists bot_act_at timestamptz,
  add column if not exists bot_action text,
  add column if not exists bot_amount bigint;

create or replace function public._poker_bot_bitcount(p_n int)
returns int
language sql
immutable
as $$
  select count(*)::int from generate_series(0, 12) g where (p_n & (1 << g)) <> 0
$$;

create or replace function public._poker_bot_strength(p_hole smallint[], p_board smallint[])
returns int
language plpgsql
stable
set search_path = public
as $$
declare
  r1 int; r2 int; gap int; s int; suited boolean; board_n int;
  c int; suit int; rank int; i int;
  suits int[] := array[0, 0, 0, 0];
  hole_suits int[] := array[0, 0, 0, 0];
  mask int := 0; hole_mask int := 0;
  flush int := 0; straight int := 0; low int; span int; run boolean;
  cat int; bonus int;
  made int[] := array[18, 48, 66, 76, 84, 88, 94, 97, 99];
begin
  if p_hole is null or coalesce(array_length(p_hole, 1), 0) <> 2 then return 0; end if;
  board_n := coalesce(array_length(p_board, 1), 0);
  if board_n < 3 then
    r1 := p_hole[1] % 13;
    r2 := p_hole[2] % 13;
    if r1 < r2 then
      s := r1; r1 := r2; r2 := s;
    end if;
    gap := r1 - r2;
    suited := (p_hole[1] / 13) = (p_hole[2] / 13);
    if gap = 0 then
      s := (r1 + 2) * 6;
    else
      s := (r1 + 2) * 2 + (r2 + 2);
      if suited then s := s + 8; end if;
      if gap = 1 then s := s + 6;
      elsif gap = 2 then s := s + 2;
      elsif gap >= 4 then s := s - 4;
      end if;
      if r1 < 8 and gap > 2 then s := s - 6; end if;
    end if;
    return greatest(0, least(100, s));
  end if;
  cat := public._poker_eval(p_hole || p_board) / 1048576;
  if cat < 4 then
    for i in 1..board_n loop
      c := p_board[i];
      suit := c / 13;
      rank := c % 13;
      suits[suit + 1] := suits[suit + 1] + 1;
      mask := mask | (1 << rank);
    end loop;
    for i in 1..2 loop
      c := p_hole[i];
      suit := c / 13;
      rank := c % 13;
      suits[suit + 1] := suits[suit + 1] + 1;
      hole_suits[suit + 1] := hole_suits[suit + 1] + 1;
      mask := mask | (1 << rank);
      hole_mask := hole_mask | (1 << rank);
    end loop;
    for i in 1..4 loop
      if suits[i] = 4 and hole_suits[i] > 0 then flush := 14; end if;
    end loop;
    for low in 0..9 loop
      span := case when low = 9 then (1 << 12) | 15 else 31 << low end;
      if public._poker_bot_bitcount(mask & span) <> 4 then continue; end if;
      if (hole_mask & span) = 0 then continue; end if;
      run := low <> 9 and (
        public._poker_bot_bitcount(mask & (15 << low)) = 4
        or public._poker_bot_bitcount(mask & (15 << (low + 1))) = 4
      );
      straight := greatest(straight, case when run then 12 else 5 end);
    end loop;
    bonus := least(20, flush + straight);
  else
    bonus := 0;
  end if;
  if cat < 0 or cat > 8 then cat := 0; end if;
  return least(99, made[cat + 1] + bonus);
end $$;

create or replace function public._poker_bot_roll(p_hand bigint, p_seat int, p_street text, p_version int)
returns int
language plpgsql
immutable
as $$
declare h bigint := 2166136261; s text; i int; ch int;
begin
  s := p_hand::text || ':' || p_seat::text || ':' || p_street || ':' || p_version::text;
  for i in 1..length(s) loop
    ch := ascii(substr(s, i, 1));
    h := (h # ch) & 4294967295;
    h := (h * 16777619) & 4294967295;
  end loop;
  return (h % 10000)::int;
end $$;

create or replace function public._poker_bot_delay_ms(p_action text, p_roll int)
returns int
language sql
immutable
as $$
  select case
    when p_action in ('FOLD', 'CHECK') then 800 + (p_roll % 1001)
    when p_action = 'CALL' then 1000 + (p_roll % 1501)
    else 1500 + (p_roll % 2001)
  end
$$;

create or replace function public._poker_bot_position(
  p_seat int, p_button int, p_sb int, p_bb int, p_live int[], p_max int
) returns text
language plpgsql
immutable
set search_path = public
as $$
declare n int; i int; seat_key int; other_key int;
begin
  n := coalesce(array_length(p_live, 1), 0);
  if n <= 3 then
    if p_seat = p_button then return 'late'; else return 'blind'; end if;
  end if;
  if p_seat = p_button then return 'late'; end if;
  if p_seat = p_sb or p_seat = p_bb then return 'blind'; end if;
  seat_key := case when public._poker_dist(p_button, p_seat, p_max) = 0 then p_max
                   else public._poker_dist(p_button, p_seat, p_max) end;
  select count(*) into i
  from unnest(p_live) as s(seat)
  where (case when public._poker_dist(p_button, s.seat, p_max) = 0 then p_max
              else public._poker_dist(p_button, s.seat, p_max) end) < seat_key;
  if i < n / 2 then return 'early'; end if;
  return 'middle';
end $$;

-- Mirrors src/lib/poker/bot.ts chooseBotAction. Keep the thresholds together.
create or replace function public._poker_bot_decide(
  p_hole smallint[], p_board smallint[], p_pot bigint, p_hero_stack bigint, p_hero_street bigint,
  p_effective bigint, p_opponents int, p_position text, p_raises int, p_bb bigint,
  p_style text, p_roll int, p_legal jsonb
) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  fold_b int; bet_b int; bluff_b int; raise_b int; pos int; strength int;
  opp_adj int; raise_adj int; need int; to_call bigint; pot_odds int; short boolean;
  raise_roll int; raise_cut int; can_raise boolean; can_call boolean; can_check boolean; can_fold boolean;
  min_to bigint; max_to bigint; current_bet bigint; call_amt bigint;
  action text; amount bigint; target bigint; want bigint; bet_bar int; shove boolean; style text;
begin
  style := case when p_style in ('casual', 'standard', 'competitive') then p_style else 'standard' end;
  if style = 'casual' then
    fold_b := 14; bet_b := 10; bluff_b := 400; raise_b := 78;
  elsif style = 'competitive' then
    fold_b := -10; bet_b := -8; bluff_b := 1600; raise_b := 60;
  else
    fold_b := 0; bet_b := 0; bluff_b := 900; raise_b := 68;
  end if;
  pos := case p_position when 'late' then -6 when 'early' then 8 when 'blind' then 4 else 0 end;
  strength := public._poker_bot_strength(p_hole, p_board);
  opp_adj := greatest(0, coalesce(p_opponents, 1) - 1) * 4;
  raise_adj := coalesce(p_raises, 0) * 6;
  need := strength - fold_b - pos - opp_adj - raise_adj;
  can_raise := coalesce((p_legal ->> 'can_raise')::boolean, false);
  can_call := coalesce((p_legal ->> 'can_call')::boolean, false);
  can_check := coalesce((p_legal ->> 'can_check')::boolean, false);
  can_fold := coalesce((p_legal ->> 'can_fold')::boolean, true);
  min_to := coalesce((p_legal ->> 'min_raise_to')::bigint, 0);
  max_to := coalesce((p_legal ->> 'max_raise_to')::bigint, 0);
  current_bet := coalesce((p_legal ->> 'current_bet')::bigint, 0);
  call_amt := coalesce((p_legal ->> 'call_amount')::bigint, 0);
  to_call := case when can_call then call_amt else 0 end;
  pot_odds := case when to_call <= 0 or p_pot + to_call <= 0 then 0
                   else round(to_call * 100.0 / (p_pot + to_call))::int end;
  short := coalesce(p_bb, 0) > 0 and p_effective <= p_bb * 12;
  raise_roll := coalesce(p_roll, 0) % 100;
  raise_cut := 70 + case style when 'competitive' then 15 when 'casual' then -15 else 0 end;
  action := 'FOLD';
  amount := 0;
  if to_call > 0 then
    if can_raise and (need >= raise_b or (short and need >= raise_b - 12)) and raise_roll < raise_cut then
      target := (p_pot * 2) / 3;
      want := greatest(min_to, current_bet + target);
      amount := least(max_to, greatest(min_to, want));
      shove := short and need >= raise_b - 12;
      if shove then amount := max_to; end if;
      if amount >= max_to and max_to = p_hero_street + p_hero_stack then
        action := 'ALL_IN'; amount := max_to;
      else
        action := 'RAISE';
      end if;
    elsif can_call and need >= pot_odds - (case when style = 'casual' then 0 else 4 end) then
      action := 'CALL'; amount := 0;
    elsif can_fold then
      action := 'FOLD'; amount := 0;
    elsif can_check then
      action := 'CHECK'; amount := 0;
    elsif can_call then
      action := 'CALL'; amount := 0;
    end if;
  else
    bet_bar := 58 + bet_b + pos + opp_adj;
    if can_raise and current_bet = 0
       and (need >= bet_bar or (coalesce(p_roll, 0) < bluff_b and need >= 28 and p_position is distinct from 'early')) then
      target := (p_pot * 2) / 3;
      want := greatest(min_to, target);
      amount := least(max_to, greatest(min_to, want));
      shove := short and need >= raise_b;
      if shove then amount := max_to; end if;
      if amount >= max_to and max_to = p_hero_street + p_hero_stack then
        action := 'ALL_IN'; amount := max_to;
      else
        action := 'BET';
      end if;
    elsif can_check then
      action := 'CHECK'; amount := 0;
    elsif can_call then
      action := 'CALL'; amount := 0;
    end if;
  end if;
  if action in ('BET', 'RAISE', 'ALL_IN') and not can_raise then
    if can_check then action := 'CHECK'; amount := 0;
    elsif can_call then action := 'CALL'; amount := 0;
    else action := 'FOLD'; amount := 0;
    end if;
  end if;
  if action = 'CALL' and not can_call then
    if can_check then action := 'CHECK'; amount := 0; else action := 'FOLD'; amount := 0; end if;
  end if;
  if action = 'CHECK' and not can_check then
    if can_call then action := 'CALL'; amount := 0; else action := 'FOLD'; amount := 0; end if;
  end if;
  if action = 'FOLD' and can_check then action := 'CHECK'; amount := 0; end if;
  if action in ('BET', 'RAISE') then
    amount := least(max_to, greatest(min_to, amount));
  end if;
  return jsonb_build_object('action', action, 'amount', amount);
end $$;

create or replace function public._poker_bot_choose(p_hand bigint, p_seat int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h public.poker_hands;
  p public.poker_hand_players;
  hole smallint[];
  style text;
  live int[];
  pot bigint;
  opponents int;
  effective bigint;
  raises int;
  pos text;
  roll int;
begin
  select * into h from public.poker_hands where id = p_hand;
  select * into p from public.poker_hand_players where hand_id = p_hand and seat_no = p_seat;
  select hc.cards into hole from public.poker_hole_cards hc
    where hc.hand_id = p_hand and hc.seat_no = p_seat;
  select pr.bot_style into style from public.profiles pr where pr.id = p.user_id;
  select coalesce(array_agg(hp.seat_no::int order by hp.seat_no), '{}') into live
    from public.poker_hand_players hp where hp.hand_id = p_hand and not hp.folded;
  select coalesce(sum(hp.total_bet), 0) into pot from public.poker_hand_players hp where hp.hand_id = p_hand;
  select count(*) into opponents from public.poker_hand_players hp
    where hp.hand_id = p_hand and not hp.folded and hp.seat_no <> p_seat;
  select least(p.stack, coalesce(max(hp.stack), p.stack)) into effective
    from public.poker_hand_players hp
    where hp.hand_id = p_hand and not hp.folded and hp.seat_no <> p_seat;
  select count(*) into raises from public.poker_actions a
    where a.hand_id = p_hand and a.street = h.street and a.action in ('BET', 'RAISE');
  pos := public._poker_bot_position(p_seat, h.button_seat, h.sb_seat, h.bb_seat, live, h.max_seats);
  roll := public._poker_bot_roll(p_hand, p_seat, h.street, h.version + 1);
  return public._poker_bot_decide(
    hole, h.board, pot, p.stack, p.street_bet, effective, opponents, pos, raises, h.big_blind,
    style, roll, public._poker_legal(p_hand, p_seat));
end $$;

create or replace function public._bot_new_links(p_hands int)
returns text[]
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare n int := p_hands + 1; arr text[]; i int; cur text;
begin
  if p_hands < 8 or p_hands > 300 then raise exception 'INVALID_LENGTH'; end if;
  arr := array_fill(''::text, array[n]);
  cur := encode(extensions.gen_random_bytes(32), 'hex');
  arr[n] := cur;
  for i in reverse n - 1 .. 1 loop
    cur := encode(extensions.digest(decode(cur, 'hex'), 'sha256'), 'hex');
    arr[i] := cur;
  end loop;
  return arr;
end $$;

create or replace function public._poker_bot_prepare(p_table bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s record; ch public.bot_chains; fresh text[];
begin
  for s in
    select ps.id, ps.user_id from public.poker_seats ps
    join public.profiles pr on pr.id = ps.user_id and pr.is_bot
    where ps.table_id = p_table and ps.status = 'SEATED'
    order by ps.id
  loop
    select * into ch from public.bot_chains where user_id = s.user_id for update;
    if not found or coalesce(array_length(ch.links, 1), 0) - ch.cursor < 8 then
      fresh := public._bot_new_links(64);
      insert into public.bot_chains (user_id, links, cursor) values (s.user_id, fresh, 1)
        on conflict (user_id) do update set links = excluded.links, cursor = 1;
      update public.poker_seats set chain_link = fresh[1] where id = s.id;
    else
      update public.poker_seats set chain_link = ch.links[ch.cursor] where id = s.id;
    end if;
  end loop;
end $$;

create or replace function public._poker_bot_reveal(p_hand bigint)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare h public.poker_hands; hp record; ch public.bot_chains; pre text;
begin
  select * into h from public.poker_hands where id = p_hand;
  if h.status is distinct from 'COMMIT' then return; end if;
  for hp in
    select p.seat_no, p.user_id, p.seat_id, p.link
    from public.poker_hand_players p
    join public.profiles pr on pr.id = p.user_id and pr.is_bot
    where p.hand_id = p_hand and p.reveal is null
    order by p.seat_no
  loop
    select * into ch from public.bot_chains where user_id = hp.user_id for update;
    if not found or ch.cursor >= coalesce(array_length(ch.links, 1), 0) then
      raise exception 'BOT_CHAIN_BROKEN';
    end if;
    pre := ch.links[ch.cursor + 1];
    if encode(extensions.digest(decode(pre, 'hex'), 'sha256'), 'hex') <> hp.link then
      raise exception 'BOT_CHAIN_BROKEN';
    end if;
    update public.poker_hand_players set reveal = pre where hand_id = p_hand and seat_no = hp.seat_no;
    update public.poker_seats set chain_link = pre where id = hp.seat_id;
    update public.bot_chains set cursor = cursor + 1 where user_id = hp.user_id;
  end loop;
  perform public._poker_deal(p_hand);
end $$;

create or replace function public._poker_set_turn(p_hand bigint, p_seat int) returns void
language plpgsql security definer set search_path = public as $$
declare v_leaving boolean; v_secs int; v_bot boolean; decision jsonb; delay_ms int; v_action text;
begin
  select s.leaving, coalesce(pr.is_bot, false) into v_leaving, v_bot
    from poker_hand_players hp
    join poker_seats s on s.id = hp.seat_id
    join profiles pr on pr.id = hp.user_id
    where hp.hand_id = p_hand and hp.seat_no = p_seat;
  select action_seconds into v_secs from poker_config;
  decision := null;
  delay_ms := null;
  if v_bot then
    begin
      decision := public._poker_bot_choose(p_hand, p_seat);
    exception when others then
      decision := jsonb_build_object('action',
        case when coalesce((public._poker_legal(p_hand, p_seat) ->> 'can_check')::boolean, false)
             then 'CHECK' else 'FOLD' end, 'amount', 0);
    end;
    v_action := decision ->> 'action';
    delay_ms := public._poker_bot_delay_ms(v_action, public._poker_bot_roll(
      p_hand, p_seat, (select street from poker_hands where id = p_hand),
      (select version from poker_hands where id = p_hand) + 1));
  end if;
  update poker_hands set to_act = p_seat,
    action_deadline = case when coalesce(v_leaving, false) then clock_timestamp()
                           else clock_timestamp() + make_interval(secs => v_secs) end,
    bot_act_at = case when v_bot then clock_timestamp() + make_interval(secs => delay_ms / 1000.0) end,
    bot_action = case when v_bot then v_action end,
    bot_amount = case when v_bot then coalesce((decision ->> 'amount')::bigint, 0) end,
    version = version + 1
  where id = p_hand;
end $$;

create or replace function public._poker_open_hand(p_table bigint) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare t poker_tables; c poker_config; seats_arr int[]; n int; btn int; sbs int; bbs int; hid bigint; seed bytea;
  x record;
begin
  select * into t from poker_tables where id = p_table;
  if t.status <> 'OPEN' or t.hand_id is not null then return null; end if;
  select * into c from poker_config;
  if not c.enabled or not public._play_domain_open()
     or t.account_type <> (select account_type from money_domain_config) then
    return null;
  end if;
  for x in select s.id, s.user_id from poker_seats s
           where s.table_id = t.id and s.status = 'SEATED' and public._poker_self_excluded(s.user_id)
           order by s.id loop
    perform public._poker_cashout(x.id);
    perform _audit(x.user_id, 'poker_self_excluded_cashout', t.id, jsonb_build_object('seat_id', x.id));
  end loop;
  for x in update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp(), sat_out_reason = 'away'
           where table_id = t.id and status = 'SEATED' and state = 'ACTIVE' and not leaving
             and last_seen_at < clock_timestamp() - interval '20 seconds'
             and not exists (select 1 from profiles pr where pr.id = poker_seats.user_id and pr.is_bot)
           returning id, user_id, last_seen_at loop
    perform _audit(x.user_id, 'poker_seat_away', t.id, jsonb_build_object('seat_id', x.id, 'last_seen_at', x.last_seen_at));
  end loop;
  update poker_seats set stack = stack + pending, pending = 0
    where table_id = t.id and status = 'SEATED' and pending > 0;
  perform public._poker_bot_prepare(t.id);
  select array_agg(seat_no::int order by seat_no) into seats_arr from poker_seats
    where table_id = t.id and status = 'SEATED' and state = 'ACTIVE' and not leaving
      and stack > 0 and chain_link is not null;
  n := coalesce(array_length(seats_arr, 1), 0);
  if n < 2 then return null; end if;
  if not exists (
    select 1 from poker_seats s
    join profiles pr on pr.id = s.user_id and not pr.is_bot
    where s.table_id = t.id and s.seat_no = any (seats_arr)
  ) then
    return null;
  end if;
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
  perform public._poker_bot_reveal(hid);
  return hid;
end $$;

create or replace function public._poker_cashout(p_seat bigint) returns void
language plpgsql security definer set search_path = public as $$
declare s poker_seats; t poker_tables; tx uuid; amt bigint;
begin
  select * into s from poker_seats where id = p_seat for update;
  if not found or s.status <> 'SEATED' then return; end if;
  if public._poker_in_hand(s.id) then raise exception 'SEAT_IN_HAND'; end if;
  select * into t from poker_tables where id = s.table_id;
  amt := s.stack + s.pending;
  perform _coinflip_lock_wallets(array[s.user_id], t.asset, t.account_type);
  if amt > 0 then
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('poker_settlement', 'poker:seat:' || s.id || ':cashout', t.account_type, s.user_id, s.id, 'Poker cash-out')
      returning id into tx;
    perform _post(tx, _user_account(s.user_id, 'user_locked', t.asset, t.account_type), -amt);
    perform _post(tx, _user_account(s.user_id, 'user_available', t.asset, t.account_type), amt);
  elsif t.account_type = 'real' then
    perform public._withdraw_basis_sync();
    delete from withdraw_basis_stake where user_id = s.user_id and game = 'poker' and game_id = s.id;
  end if;
  update poker_seats set status = 'CLOSED', cashed_out = amt, stack = 0, pending = 0, leaving = false,
    closed_at = clock_timestamp(), close_ledger_tx = tx
  where id = s.id;
  if exists (select 1 from profiles where id = s.user_id and is_bot) then
    perform public._bot_sweep(s.user_id, t.asset, t.account_type,
      'bot:sweep:poker:' || s.id::text || ':' || coalesce(tx::text, 'zero'));
  end if;
  perform _audit(s.user_id, 'poker_cash_out', s.table_id, jsonb_build_object(
    'seat_id', s.id, 'amount', amt, 'buy_in_total', s.buy_in_total, 'ledger_tx', tx));
end $$;

create or replace function public._poker_post_hand(p_table bigint) returns void
language plpgsql security definer set search_path = public as $$
declare seat_row poker_seats; c poker_config; v_bot boolean;
begin
  select * into c from poker_config;
  for seat_row in select * from poker_seats where table_id = p_table and status = 'SEATED' order by id for update loop
    if public._poker_in_hand(seat_row.id) then continue; end if;
    select is_bot into v_bot from profiles where id = seat_row.user_id;
    if seat_row.leaving then
      perform public._poker_cashout(seat_row.id);
    elsif coalesce(v_bot, false) and seat_row.stack + seat_row.pending = 0 then
      perform public._poker_cashout(seat_row.id);
    elsif seat_row.state = 'ACTIVE' and (seat_row.stack + seat_row.pending = 0 or seat_row.timeouts >= c.max_timeouts) then
      update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp() where id = seat_row.id;
    end if;
  end loop;
  if not exists (
    select 1 from poker_seats ps
    join profiles pr on pr.id = ps.user_id and not pr.is_bot
    where ps.table_id = p_table and ps.status = 'SEATED'
  ) then
    for seat_row in
      select ps.* from poker_seats ps
      join profiles pr on pr.id = ps.user_id and pr.is_bot
      where ps.table_id = p_table and ps.status = 'SEATED'
      order by ps.id
    loop
      if not public._poker_in_hand(seat_row.id) then
        perform public._poker_cashout(seat_row.id);
      end if;
    end loop;
  end if;
end $$;

create or replace function public._poker_touch(p_table bigint) returns void
language plpgsql security definer set search_path = public as $$
declare t poker_tables; h poker_hands; c poker_config; due timestamptz; ready int; last_next timestamptz; kick timestamptz;
  humans int; bots int;
begin
  select * into t from poker_tables where id = p_table;
  select * into c from poker_config;
  if t.hand_id is not null then
    select * into h from poker_hands where id = t.hand_id;
    due := case h.status
      when 'COMMIT' then h.reveal_deadline
      when 'BETTING' then least(h.action_deadline, coalesce(h.bot_act_at, h.action_deadline))
      when 'SETTLEMENT' then case when h.settle_attempts < 8 then clock_timestamp() + interval '2 seconds' end end;
  else
    select count(*) into ready from poker_seats
      where table_id = p_table and status = 'SEATED' and state = 'ACTIVE' and not leaving
        and stack + pending > 0 and chain_link is not null;
    select next_hand_at into last_next from poker_hands where table_id = p_table order by id desc limit 1;
    select min(sat_out_at) + make_interval(secs => c.sit_out_kick_seconds) into kick from poker_seats
      where table_id = p_table and status = 'SEATED' and state = 'SITTING_OUT';
    due := least(case when ready >= 2 then greatest(coalesce(last_next, clock_timestamp()), clock_timestamp()) end, kick);
    select count(*) filter (where not pr.is_bot), count(*) filter (where pr.is_bot)
      into humans, bots
    from poker_seats ps join profiles pr on pr.id = ps.user_id
    where ps.table_id = p_table and ps.status = 'SEATED';
    if humans = 0 and bots > 0 then
      due := clock_timestamp();
    end if;
  end if;
  update poker_tables set
    next_due_at = due,
    version = version + 1,
    updated_at = clock_timestamp(),
    seated = (select count(*) from poker_seats where table_id = p_table and status = 'SEATED')
  where id = p_table;
end $$;

create or replace function public._poker_tick_table(p_table bigint) returns text
language plpgsql security definer set search_path = public as $$
declare t poker_tables; h poker_hands; c poker_config; la jsonb; seat_row record; res text := 'idle'; hid bigint;
  v_leaving boolean; v_bot boolean;
begin
  select * into t from poker_tables where id = p_table;
  select * into c from poker_config;
  if t.hand_id is not null then
    select * into h from poker_hands where id = t.hand_id;
    if h.status = 'COMMIT' then
      perform public._poker_bot_reveal(h.id);
      select * into h from poker_hands where id = t.hand_id;
    end if;
    if h.status = 'COMMIT' and clock_timestamp() >= h.reveal_deadline then
      update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp(),
          missed_reveals = missed_reveals + 1,
          leaving = leaving or missed_reveals + 1 >= c.max_missed_reveals
        where id in (
          select hp.seat_id from poker_hand_players hp
          join profiles pr on pr.id = hp.user_id and not pr.is_bot
          where hp.hand_id = h.id and hp.reveal is null
        );
      perform public._poker_void(h.id, 'missing_reveal', array(
        select user_id from poker_hand_players where hand_id = h.id and reveal is null order by seat_no));
      perform public._poker_post_hand(t.id);
      res := 'voided';
    elsif h.status = 'BETTING' and h.bot_act_at is not null and clock_timestamp() >= h.bot_act_at
          and exists (
            select 1 from poker_hand_players hp
            join profiles pr on pr.id = hp.user_id and pr.is_bot
            where hp.hand_id = h.id and hp.seat_no = h.to_act
          ) then
      begin
        perform public._poker_apply(h.id, h.to_act, h.bot_action, coalesce(h.bot_amount, 0), 'bot',
          'bot:' || h.id::text || ':' || h.version::text || ':' || h.to_act::text);
      exception when others then
        if sqlerrm ilike '%NOT_YOUR_TURN%' then
          null;
        else
          begin
            la := public._poker_legal(h.id, h.to_act);
            perform public._poker_apply(h.id, h.to_act,
              case when coalesce((la ->> 'can_check')::boolean, false) then 'CHECK' else 'FOLD' end,
              0, 'bot',
              'bot:' || h.id::text || ':' || h.version::text || ':' || h.to_act::text || ':fb');
          exception when others then
            if sqlerrm ilike '%NOT_YOUR_TURN%' then null; else raise; end if;
          end;
        end if;
      end;
      res := 'bot';
    elsif h.status = 'BETTING' and clock_timestamp() >= h.action_deadline then
      la := public._poker_legal(h.id, h.to_act);
      select ps.leaving, coalesce(pr.is_bot, false) into v_leaving, v_bot
        from poker_seats ps
        join poker_hand_players hp on hp.seat_id = ps.id
        join profiles pr on pr.id = hp.user_id
        where hp.hand_id = h.id and hp.seat_no = h.to_act;
      if not v_leaving and not coalesce(v_bot, false) then
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
  elsif not exists (
    select 1 from poker_seats ps
    join profiles pr on pr.id = ps.user_id and not pr.is_bot
    where ps.table_id = t.id and ps.status = 'SEATED'
  ) then
    for seat_row in select id from poker_seats where table_id = t.id and status = 'SEATED' order by id loop
      perform public._poker_cashout(seat_row.id);
      res := 'cashed_out';
    end loop;
  else
    for seat_row in select id from poker_seats where table_id = t.id and status = 'SEATED'
               and (leaving or (state = 'SITTING_OUT'
                    and sat_out_at <= clock_timestamp() - make_interval(secs => c.sit_out_kick_seconds)))
             order by id loop
      perform public._poker_cashout(seat_row.id);
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

create or replace function public.poker_call_bot(p_table bigint, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._poker_uid();
  cfg public.bot_config;
  t public.poker_tables;
  s public.poker_seats;
  bot uuid;
  v_seat smallint;
  v_buy bigint;
  running boolean;
  result jsonb;
  head text;
  fresh text[];
begin
  if p_key is null or length(p_key) not between 8 and 100 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtext('bot-call:' || uid::text));
  select bc.result into result from public.bot_calls bc where bc.user_id = uid and bc.idempotency_key = p_key;
  if found then
    if result ->> 'table_id' is distinct from p_table::text then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return result || jsonb_build_object('duplicate', true);
  end if;
  select * into cfg from public.bot_config;
  if (select count(*) from public.bot_calls
      where user_id = uid and game = 'poker'
        and created_at > clock_timestamp() - make_interval(secs => cfg.call_rate_window_seconds))
     >= cfg.call_rate_limit then
    raise exception 'RATE_LIMITED';
  end if;
  select * into t from public.poker_tables where id = p_table for update;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  if t.status <> 'OPEN' then raise exception 'TABLE_CLOSED'; end if;
  if not exists (
    select 1 from public.poker_seats ps
    join public.profiles pr on pr.id = ps.user_id and not pr.is_bot
    where ps.table_id = t.id and ps.user_id = uid and ps.status = 'SEATED'
  ) then
    raise exception 'NOT_SEATED';
  end if;
  if not cfg.enabled or not cfg.poker_enabled then raise exception 'BOTS_DISABLED'; end if;
  if (select count(*) from public.poker_seats ps
      join public.profiles pr on pr.id = ps.user_id and pr.is_bot
      where ps.table_id = t.id and ps.status = 'SEATED') >= cfg.max_bots_per_table then
    raise exception 'BOT_TABLE_FULL';
  end if;
  select g::smallint into v_seat from generate_series(0, t.max_seats - 1) g
    where not exists (
      select 1 from public.poker_seats x where x.table_id = t.id and x.seat_no = g and x.status = 'SEATED'
    )
    order by g limit 1;
  if v_seat is null then
    result := jsonb_build_object('ok', false, 'joined', false, 'duplicate', false, 'reason', 'NO_SEAT', 'table_id', t.id);
    insert into public.bot_calls (user_id, idempotency_key, game, result) values (uid, p_key, 'poker', result);
    return result;
  end if;
  select pr.id into bot from public.profiles pr
    where pr.is_bot
      and not exists (select 1 from public.poker_seats ps where ps.user_id = pr.id and ps.status = 'SEATED')
    order by pr.username
    limit 1;
  if bot is null then raise exception 'BOTS_BUSY'; end if;
  perform pg_advisory_xact_lock(hashtext('bot-user:' || bot::text));
  if exists (select 1 from public.poker_seats ps where ps.user_id = bot and ps.status = 'SEATED') then
    raise exception 'BOTS_BUSY';
  end if;
  v_buy := least(t.max_buy_in, greatest(t.min_buy_in, t.big_blind * 20));
  fresh := public._bot_new_links(64);
  insert into public.bot_chains (user_id, links, cursor) values (bot, fresh, 1)
    on conflict (user_id) do update set links = excluded.links, cursor = 1;
  head := fresh[1];
  perform public._bot_fund(bot, v_buy, t.asset, t.account_type, 'bot:fund:poker:' || t.id::text || ':' || p_key);
  running := t.hand_id is not null or (
    select count(*) from public.poker_seats x
    where x.table_id = t.id and x.status = 'SEATED' and x.state = 'ACTIVE' and x.stack > 0
  ) >= 2;
  insert into public.poker_seats (table_id, seat_no, user_id, chain_link, owes_bb, idempotency_key, last_seen_at)
    values (t.id, v_seat, bot, head, running, left(p_key || ':' || uid::text, 120), clock_timestamp())
    returning * into s;
  perform public._poker_take_cash(s.id, v_buy, false);
  perform public._audit(uid, 'poker_bot_called', t.id, jsonb_build_object(
    'seat_id', s.id, 'seat_no', v_seat, 'bot', bot, 'buy_in', v_buy));
  if t.hand_id is null then
    perform public._poker_tick_table(t.id);
  else
    perform public._poker_touch(t.id);
  end if;
  result := jsonb_build_object('ok', true, 'joined', true, 'duplicate', false,
    'table_id', t.id, 'seat_no', v_seat, 'user_id', bot);
  insert into public.bot_calls (user_id, idempotency_key, game, result) values (uid, p_key, 'poker', result);
  return result;
end $$;
revoke all on function public.poker_call_bot(bigint, text) from public, anon;
grant execute on function public.poker_call_bot(bigint, text) to authenticated;

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
        'buy_in_total', ms.buy_in_total, 'timeouts', ms.timeouts, 'missed_reveals', ms.missed_reveals,
        'sat_out_reason', ms.sat_out_reason);
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
        'is_bot', p.is_bot,
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
        'players', (select count(*) from poker_seats s
                      join poker_tables t on t.id = s.table_id
                      join profiles p on p.id = s.user_id and not p.is_bot
                      where t.type_id = ty.id and t.status = 'OPEN' and s.status = 'SEATED')
      ) order by ty.sort) from poker_table_types ty where ty.enabled), '[]'::jsonb),
    'tables', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'type_id', t.type_id, 'name', t.name, 'seated', t.seated, 'max_seats', t.max_seats,
        'hand_count', t.hand_count, 'live', t.hand_id is not null,
        'players', (select coalesce(jsonb_agg(jsonb_build_object(
                      'username', p.username, 'avatar_url', p.avatar_url, 'is_bot', p.is_bot)
                      order by s.seat_no), '[]'::jsonb)
                    from poker_seats s join profiles p on p.id = s.user_id
                    where s.table_id = t.id and s.status = 'SEATED')
      ) order by t.type_id, t.seated desc, t.id) from poker_tables t where t.status = 'OPEN'), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(jsonb_build_object(
        'table_id', t.id, 'name', t.name, 'stack', s.stack, 'state', s.state) order by s.id)
      from poker_seats s join poker_tables t on t.id = s.table_id
      where s.user_id = auth.uid() and s.status = 'SEATED'), '[]'::jsonb)
  )
$$;

revoke all on function public._poker_bot_bitcount(int) from public, anon, authenticated;
revoke all on function public._poker_bot_strength(smallint[], smallint[]) from public, anon, authenticated;
revoke all on function public._poker_bot_roll(bigint, int, text, int) from public, anon, authenticated;
revoke all on function public._poker_bot_delay_ms(text, int) from public, anon, authenticated;
revoke all on function public._poker_bot_position(int, int, int, int, int[], int) from public, anon, authenticated;
revoke all on function public._poker_bot_decide(smallint[], smallint[], bigint, bigint, bigint, bigint, int, text, int, bigint, text, int, jsonb) from public, anon, authenticated;
revoke all on function public._poker_bot_choose(bigint, int) from public, anon, authenticated;
revoke all on function public._bot_new_links(int) from public, anon, authenticated;
revoke all on function public._poker_bot_prepare(bigint) from public, anon, authenticated;
revoke all on function public._poker_bot_reveal(bigint) from public, anon, authenticated;

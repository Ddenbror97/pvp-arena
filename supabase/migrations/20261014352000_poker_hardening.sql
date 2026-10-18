-- Poker audit F4, F6, F8, F9.
--
-- F4  Self-exclusion was checked only by poker_sit. A seated player excluded later
--     could top up, sit back in and keep being dealt. Top-up and sit-in now refuse,
--     and hand opening cashes an excluded player out in full instead of dealing them.
--     A hand already running plays out; nothing is confiscated. Every check is a
--     single read of the committed profile, so an exclusion that commits during a
--     call takes effect at the next one, never half-way through.
-- F6  Player RPCs had no server-side rate limit, and repeated commit_chain/sit_out
--     calls bumped the table version (a realtime refetch for every viewer) even when
--     nothing changed.
-- F8  anon and authenticated could read poker_hands.last_error and settle_attempts.
-- F9  A head already committed by another open seat was accepted: once that seat
--     revealed, this seat's next contribution was public before the deal.

-- ---------- F6: per-user fixed-window limits ----------
alter table public.poker_config
  add column rpc_rate_limit int not null default 40 check (rpc_rate_limit > 0),
  add column rpc_rate_window_seconds int not null default 10 check (rpc_rate_window_seconds > 0),
  add column buy_in_rate_limit int not null default 10 check (buy_in_rate_limit > 0),
  add column buy_in_rate_window_seconds int not null default 60 check (buy_in_rate_window_seconds > 0);

create table public.poker_rate_limits (
  user_id uuid not null references public.profiles (id),
  op text not null check (op in ('rpc', 'buy_in')),
  window_start timestamptz not null,
  n int not null,
  primary key (user_id, op)
);
alter table public.poker_rate_limits enable row level security;
revoke all on public.poker_rate_limits from public, anon, authenticated;
grant all on public.poker_rate_limits to service_role;

-- A refused call rolls back with its increment, so the counter stays at the limit
-- until the window ends.
create or replace function public._poker_rate(p_user uuid, p_op text, p_limit int, p_window_seconds int)
returns void
language plpgsql security definer set search_path = public as $$
declare cnt int; now_ts timestamptz := clock_timestamp();
begin
  insert into poker_rate_limits as r (user_id, op, window_start, n) values (p_user, p_op, now_ts, 1)
  on conflict (user_id, op) do update set
    n = case when r.window_start <= now_ts - make_interval(secs => p_window_seconds) then 1 else r.n + 1 end,
    window_start = case when r.window_start <= now_ts - make_interval(secs => p_window_seconds)
                        then now_ts else r.window_start end
  returning n into cnt;
  if cnt > p_limit then raise exception 'RATE_LIMITED'; end if;
end $$;

create or replace function public._poker_uid() returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c poker_config;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  select * into c from poker_config;
  perform public._poker_rate(uid, 'rpc', c.rpc_rate_limit, c.rpc_rate_window_seconds);
  return uid;
end $$;

create or replace function public._poker_self_excluded(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_user and self_excluded_until > now())
$$;

-- Same as 20261014330000 plus the buy-in rate limit.
create or replace function public._poker_take_cash(p_seat bigint, p_amount bigint, p_pending boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare s poker_seats; t poker_tables; avail uuid; locked uuid; bal bigint; elig bigint; tx uuid; bonus_part bigint;
  c poker_config;
begin
  select * into s from poker_seats where id = p_seat for update;
  select * into t from poker_tables where id = s.table_id;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select * into c from poker_config;
  perform public._poker_rate(s.user_id, 'buy_in', c.buy_in_rate_limit, c.buy_in_rate_window_seconds);
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

-- ---------- F9: chain heads unique across open seats ----------
create unique index poker_seats_open_chain on public.poker_seats (chain_link)
  where status = 'SEATED' and chain_link is not null;

-- p_seat is the caller's own seat when replacing its head, so keeping it is not reuse.
create or replace function public._poker_assert_fresh_chain(p_head text, p_seat bigint default null) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_head !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_CHAIN'; end if;
  -- Serializes writers of the same head; the loser re-reads after the winner commits.
  perform pg_advisory_xact_lock(hashtext('poker-chain:' || p_head));
  if exists (select 1 from poker_hand_players where link = p_head)
     or exists (select 1 from poker_hand_players where reveal = p_head)
     or exists (select 1 from poker_seats where chain_link = p_head and status = 'SEATED'
                and id is distinct from p_seat) then
    raise exception 'CHAIN_REUSED';
  end if;
end $$;
drop function public._poker_assert_fresh_chain(text);

-- ---------- F4 + F6 + F9: player RPCs ----------
create or replace function public.poker_top_up(p_table bigint, p_amount bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); t poker_tables; s poker_seats; in_hand boolean;
begin
  if not (select enabled from poker_config) then raise exception 'POKER_DISABLED'; end if;
  if not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;
  if public._poker_self_excluded(uid) then raise exception 'SELF_EXCLUDED'; end if;
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

create or replace function public.poker_commit_chain(p_table bigint, p_head text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); head text := lower(coalesce(p_head, '')); s poker_seats;
begin
  if head !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_CHAIN'; end if;
  perform 1 from poker_tables where id = p_table for update;
  select * into s from poker_seats where table_id = p_table and user_id = uid and status = 'SEATED' for update;
  if not found then raise exception 'NOT_SEATED'; end if;
  if s.chain_link = head then return jsonb_build_object('ok', true, 'unchanged', true); end if;
  perform public._poker_assert_fresh_chain(head, s.id);
  update poker_seats set chain_link = head where id = s.id;
  perform public._poker_touch(p_table);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.poker_sit_out(p_table bigint, p_out boolean, p_chain_head text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._poker_uid(); s poker_seats; head text := nullif(lower(coalesce(p_chain_head, '')), '');
  t poker_tables;
begin
  select * into t from poker_tables where id = p_table for update;
  select * into s from poker_seats where table_id = p_table and user_id = uid and status = 'SEATED' for update;
  if not found then raise exception 'NOT_SEATED'; end if;
  if p_out then
    if s.state = 'SITTING_OUT' then return jsonb_build_object('ok', true, 'unchanged', true); end if;
    update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp() where id = s.id;
  else
    if public._poker_self_excluded(uid) then raise exception 'SELF_EXCLUDED'; end if;
    if s.state = 'ACTIVE' and (head is null or head = s.chain_link) then
      return jsonb_build_object('ok', true, 'unchanged', true);
    end if;
    if head is not null and head is distinct from s.chain_link then
      perform public._poker_assert_fresh_chain(head, s.id);
    end if;
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
  if s.leaving and public._poker_in_hand(s.id) then
    return jsonb_build_object('ok', true, 'pending', true, 'unchanged', true);
  end if;
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

-- Same as 20261014330000; excluded players are cashed out instead of dealt in.
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

-- ---------- F8: settlement diagnostics are operator-only ----------
revoke select on public.poker_hands from anon, authenticated;
grant select (id, table_id, hand_no, status, asset, account_type, max_seats, button_seat, sb_seat, bb_seat,
  small_blind, big_blind, fee_bps, street, current_bet, last_raise, to_act, action_deadline, reveal_deadline,
  board, runout_streets, version, protocol_version, server_seed_hash, server_seed, entropy, pots, fee_total,
  ledger_tx_id, void_reason, voided_by, next_hand_at, created_at, dealt_at, completed_at)
  on public.poker_hands to anon, authenticated;

revoke all on function public._poker_rate(uuid, text, int, int) from public, anon, authenticated;
revoke all on function public._poker_uid() from public, anon, authenticated;
revoke all on function public._poker_self_excluded(uuid) from public, anon, authenticated;
revoke all on function public._poker_take_cash(bigint, bigint, boolean) from public, anon, authenticated;
revoke all on function public._poker_assert_fresh_chain(text, bigint) from public, anon, authenticated;
revoke all on function public._poker_open_hand(bigint) from public, anon, authenticated;
revoke all on function public.poker_top_up(bigint, bigint) from public, anon;
revoke all on function public.poker_commit_chain(bigint, text) from public, anon;
revoke all on function public.poker_sit_out(bigint, boolean, text) from public, anon;
revoke all on function public.poker_leave(bigint) from public, anon;
grant execute on function public._poker_rate(uuid, text, int, int) to service_role;
grant execute on function public._poker_self_excluded(uuid) to service_role;
grant execute on function public._poker_assert_fresh_chain(text, bigint) to service_role;
grant execute on function public.poker_top_up(bigint, bigint) to authenticated;
grant execute on function public.poker_commit_chain(bigint, text) to authenticated;
grant execute on function public.poker_sit_out(bigint, boolean, text) to authenticated;
grant execute on function public.poker_leave(bigint) to authenticated;

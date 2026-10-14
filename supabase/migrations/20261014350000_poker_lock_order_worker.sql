-- Poker audit F1, F2, F5, F10.
--
-- Lock order for every real-money transaction (docs/POKER.md, "Lock order"):
--   1. game rows (table, hand, seat)
--   2. participant wallets, (owner_id, kind) order
--   3. withdraw-basis lock (taken by the first real ledger insert or by _withdraw_basis_sync)
--   4. system accounts and prestige rows
-- _poker_settle took 3 before 2 (ledger insert, then postings) while buy-ins take
-- 2 before 3, a reproducible deadlock; _poker_cashout took no wallet lock at all.
-- Single-user paths that insert their ledger row before touching the wallet
-- (deposit credits, Slott spins, daily chest, ...) now get that user's wallets
-- locked by the ledger trigger before the withdraw-basis lock.
--
-- The withdraw-basis lock is held from the first real ledger insert to commit.
-- pvp-slot-worker ran slot_tick and every due poker table in one transaction, so
-- one settlement held it for the rest of the tick (up to 400 ms) and every other
-- game's ledger write queued behind it. The worker is now a procedure that commits
-- after the slot tick and after each poker table.
--
-- F10: a zero-stack cash-out writes no ledger transaction, so the seat's
-- withdraw-basis stake row was never released. A closed seat without a cash-out
-- transaction has nothing in play; both the cash-out and the full rebuild drop it.

-- ---------- lock order: ledger trigger ----------
-- Real balances are USD only, so this is the same (owner, kind) order as
-- _coinflip_lock_wallets; a second real asset would need an asset-aware order here.
create or replace function public._withdraw_basis_writer_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_type = 'real' then
    if new.user_id is not null then
      perform 1 from wallet_accounts
        where owner_id = new.user_id and account_type = 'real' and kind in ('user_available', 'user_locked')
        order by kind
        for update;
    end if;
    perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));
    update public.withdraw_basis_meta
      set ledger_real_tx_count = ledger_real_tx_count + 1
      where id = 1;
  end if;
  return new;
end $$;
revoke all on function public._withdraw_basis_writer_lock() from public, anon, authenticated;
grant execute on function public._withdraw_basis_writer_lock() to service_role;

-- ---------- settlement: wallets before the ledger, ledger last ----------
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

  perform 1 from poker_seats where id in (select seat_id from poker_hand_players where hand_id = h.id)
    order by id for update;
  perform _coinflip_lock_wallets(
    array(select distinct user_id from poker_hand_players where hand_id = h.id order by user_id), h.asset, h.account_type);

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
  if current_setting('pvp.fail_settlement', true) = 'late' then raise exception 'INJECTED_LATE_FAILURE'; end if;

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
  -- Same place as the other games' settlement hooks: after the ledger, before commit.
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

-- ---------- cash-out: wallets first; F10 stake release ----------
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
    -- Nothing left in play: the buy-in's eligible/bonus split was spent at the table.
    perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));
    delete from withdraw_basis_stake where user_id = s.user_id and game = 'poker' and game_id = s.id;
  end if;
  update poker_seats set status = 'CLOSED', cashed_out = amt, stack = 0, pending = 0, leaving = false,
    closed_at = clock_timestamp(), close_ledger_tx = tx
  where id = s.id;
  perform _audit(s.user_id, 'poker_cash_out', s.table_id, jsonb_build_object(
    'seat_id', s.id, 'amount', amt, 'buy_in_total', s.buy_in_total, 'ledger_tx', tx));
end $$;

-- Same as 20261013231000 plus the closed-seat release, so a rebuild matches the cache.
create or replace function public._withdraw_basis_rebuild_full()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tx record;
  v_n bigint;
  v_tx bigint;
  v_last_at timestamptz;
  v_last_id uuid;
begin
  perform set_config('client_min_messages', 'warning', true);
  perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));
  truncate withdraw_basis_bucket, withdraw_basis_stake, withdraw_basis_hold, withdraw_basis_ledger_stake restart identity;
  for tx in
    select t.id, t.kind::text as kind, t.game_id, t.created_at
    from ledger_transactions t
    where t.account_type = 'real'
    order by t.created_at, t.id
  loop
    perform public._withdraw_basis_apply_tx(tx.id, tx.kind, tx.game_id);
    v_last_at := tx.created_at;
    v_last_id := tx.id;
  end loop;
  delete from withdraw_basis_stake ws
  using poker_seats ps
  where ws.game = 'poker' and ws.game_id = ps.id and ws.user_id = ps.user_id
    and ps.status = 'CLOSED' and ps.close_ledger_tx is null;
  select count(*) into v_n
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  where t.account_type = 'real';
  select ledger_real_tx_count into v_tx from withdraw_basis_meta where id = 1;
  update withdraw_basis_meta
    set posting_count = v_n,
        last_created_at = v_last_at,
        last_tx_id = v_last_id,
        applied_tx_count = v_tx
  where id = 1;
end $$;
revoke all on function public._withdraw_basis_rebuild_full() from public, anon, authenticated;
grant execute on function public._withdraw_basis_rebuild_full() to service_role;

-- ---------- worker: one committed transaction per table ----------
create table public.poker_worker_stats (
  id boolean primary key default true check (id),
  run_at timestamptz,
  duration_ms numeric,
  processed int not null default 0,
  failed int not null default 0,
  skipped int not null default 0,
  backlog int not null default 0,
  max_overdue_ms numeric not null default 0,
  stuck_hands int not null default 0,
  budget_exhausted boolean not null default false
);
insert into public.poker_worker_stats default values;
alter table public.poker_worker_stats enable row level security;
revoke all on public.poker_worker_stats from public, anon, authenticated;
grant all on public.poker_worker_stats to service_role;

-- Settlements that exhausted their automatic retries wait for operator recovery
-- (poker_admin_recover_settlement) instead of being revisited every two seconds.
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
      when 'SETTLEMENT' then case when h.settle_attempts < 8 then clock_timestamp() + interval '2 seconds' end end;
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

-- One table, one step, in the caller's transaction. Returns 'skipped' if the table is
-- locked by a player action or is no longer due.
create or replace function public._poker_tick_one(p_table bigint) returns text
language plpgsql security definer set search_path = public as $$
declare r record; res text;
begin
  select id into r from poker_tables
    where id = p_table and status = 'OPEN' and next_due_at <= clock_timestamp()
    for update skip locked;
  if not found then return 'skipped'; end if;
  begin
    res := public._poker_tick_table(p_table);
  exception when others then
    perform _audit(null, 'poker_tick_failed', p_table, jsonb_build_object('error', left(sqlerrm, 500)));
    update poker_tables set next_due_at = clock_timestamp() + interval '5 seconds' where id = p_table;
    return 'failed';
  end;
  return res;
end $$;

-- Most overdue first, then id, so a table that missed this tick is first in the next.
create or replace function public._poker_due_tables(p_limit int) returns bigint[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id order by next_due_at, id), '{}') from (
    select id, next_due_at from poker_tables
    where status = 'OPEN' and next_due_at <= clock_timestamp()
    order by next_due_at, id
    limit p_limit) d
$$;

create or replace function public._poker_close_idle() returns void
language sql security definer set search_path = public as $$
  update poker_tables set status = 'CLOSED', closed_at = clock_timestamp(), next_due_at = null
  where status = 'OPEN' and seated = 0 and hand_id is null
    and updated_at < clock_timestamp() - interval '10 minutes'
    and id not in (select min(id) from poker_tables where status = 'OPEN' group by type_id)
$$;

create or replace function public._poker_record_tick(
  p_started timestamptz, p_processed int, p_failed int, p_skipped int, p_exhausted boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_backlog int; v_overdue numeric; v_stuck int; v_ms numeric;
begin
  select count(*), coalesce(extract(epoch from clock_timestamp() - min(next_due_at)) * 1000, 0)
    into v_backlog, v_overdue
  from poker_tables where status = 'OPEN' and next_due_at <= clock_timestamp();
  select count(*) into v_stuck from poker_hands where status = 'SETTLEMENT' and settle_attempts >= 8;
  v_ms := extract(epoch from clock_timestamp() - p_started) * 1000;
  update poker_worker_stats set run_at = p_started, duration_ms = round(v_ms, 1), processed = p_processed,
    failed = p_failed, skipped = p_skipped, backlog = v_backlog, max_overdue_ms = round(greatest(v_overdue, 0), 1),
    stuck_hands = v_stuck, budget_exhausted = p_exhausted;
  return jsonb_build_object('processed', p_processed, 'failed', p_failed, 'skipped', p_skipped,
    'backlog', v_backlog, 'stuck_hands', v_stuck, 'duration_ms', round(v_ms, 1), 'budget_exhausted', p_exhausted);
end $$;

-- Single-transaction tick: tests and manual recovery only. The scheduler uses
-- slot_tick_worker(), which commits per table.
create or replace function public.poker_tick() returns jsonb
language plpgsql security definer set search_path = public as $$
declare tid bigint; n int := 0; failed int := 0; skipped int := 0; started timestamptz := clock_timestamp();
  c poker_config; res text; exhausted boolean := false;
begin
  if not pg_try_advisory_xact_lock(hashtext('poker_tick')) then
    return jsonb_build_object('skipped', 'busy');
  end if;
  select * into c from poker_config;
  foreach tid in array public._poker_due_tables(c.tick_tables) loop
    if clock_timestamp() - started > interval '400 milliseconds' then exhausted := true; exit; end if;
    res := public._poker_tick_one(tid);
    if res = 'failed' then failed := failed + 1;
    elsif res = 'skipped' then skipped := skipped + 1;
    else n := n + 1; end if;
  end loop;
  perform public._poker_close_idle();
  return public._poker_record_tick(started, n, failed, skipped, exhausted);
end $$;

-- pvp-slot-worker. Not SECURITY DEFINER and no SET clause: a procedure needs both
-- absent to COMMIT. Runs as the job owner; every step is a definer function.
-- The name keeps "slot_tick" in the job's query text for settlement_worker_health.
create or replace procedure public.slot_tick_worker()
language plpgsql
as $$
declare tid bigint; ids bigint[]; n int := 0; failed int := 0; skipped int := 0; started timestamptz;
  res text; cap int; exhausted boolean := false;
begin
  perform public.slot_tick();
  commit;
  started := clock_timestamp();
  select tick_tables into cap from public.poker_config;
  ids := public._poker_due_tables(cap);
  foreach tid in array ids loop
    if clock_timestamp() - started > interval '400 milliseconds' then exhausted := true; exit; end if;
    res := public._poker_tick_one(tid);
    if res = 'failed' then failed := failed + 1;
    elsif res = 'skipped' then skipped := skipped + 1;
    else n := n + 1; end if;
    commit;
  end loop;
  perform public._poker_close_idle();
  perform public._poker_record_tick(started, n, failed, skipped, exhausted);
  commit;
end $$;

create or replace function public.poker_worker_health() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare st poker_worker_stats;
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  select * into st from poker_worker_stats;
  return jsonb_build_object(
    'last_run', to_jsonb(st) - 'id',
    'age_seconds', round(extract(epoch from clock_timestamp() - st.run_at)::numeric, 1),
    'backlog_now', (select count(*) from poker_tables where status = 'OPEN' and next_due_at <= clock_timestamp()),
    'stuck_settlements', (select coalesce(jsonb_agg(jsonb_build_object('hand_id', id, 'table_id', table_id,
        'attempts', settle_attempts, 'since', created_at) order by id), '[]'::jsonb)
      from poker_hands where status = 'SETTLEMENT' and settle_attempts >= 8));
end $$;

revoke all on function public._poker_tick_one(bigint) from public, anon, authenticated;
revoke all on function public._poker_due_tables(int) from public, anon, authenticated;
revoke all on function public._poker_close_idle() from public, anon, authenticated;
revoke all on function public._poker_record_tick(timestamptz, int, int, int, boolean) from public, anon, authenticated;
revoke all on function public.poker_worker_health() from public, anon;
revoke all on procedure public.slot_tick_worker() from public, anon, authenticated;
grant execute on function public._poker_tick_one(bigint) to service_role;
grant execute on function public._poker_due_tables(int) to service_role;
grant execute on function public._poker_close_idle() to service_role;
grant execute on function public._poker_record_tick(timestamptz, int, int, int, boolean) to service_role;
grant execute on function public.poker_worker_health() to authenticated, service_role;
grant execute on procedure public.slot_tick_worker() to service_role;
revoke all on function public._poker_settle(bigint) from public, anon, authenticated;
revoke all on function public._poker_cashout(bigint) from public, anon, authenticated;
revoke all on function public._poker_touch(bigint) from public, anon, authenticated;
revoke all on function public.poker_tick() from public, anon, authenticated;

-- prod-only:begin
select cron.schedule('pvp-slot-worker', '1 second', 'call public.slot_tick_worker()');
-- prod-only:end

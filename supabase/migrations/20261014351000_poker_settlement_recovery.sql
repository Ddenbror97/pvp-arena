-- Poker audit F3: a hand whose settlement failed eight times stayed in SETTLEMENT
-- with its chips locked, the worker revisited it every two seconds, and the hand
-- guard forbade SETTLEMENT -> VOIDED, so nobody could recover the funds.
--
-- Settlement is all-or-nothing (one savepoint in _poker_finish), so a failed
-- attempt never leaves a ledger entry. Recovery is an operator action:
--   retry  - run the same settlement again, regardless of the automatic cap;
--   refund - void the hand and return every contribution, only when no settlement
--            ledger transaction exists and every seat still holds its start stack.
-- Chips stay in user_locked during a hand, so a refund moves no money: each seat
-- keeps its start stack. Every failure is kept in poker_settlement_failures.

create table public.poker_settlement_failures (
  id bigint generated always as identity primary key,
  hand_id bigint not null references public.poker_hands (id),
  attempt int not null,
  error text not null,
  source text not null check (source in ('auto', 'admin_retry')),
  created_at timestamptz not null default clock_timestamp()
);
create index poker_settlement_failures_hand on public.poker_settlement_failures (hand_id, id);
create trigger no_mutation before update or delete on public.poker_settlement_failures
  for each row execute function public._immutable();
alter table public.poker_settlement_failures enable row level security;
revoke all on public.poker_settlement_failures from public, anon, authenticated;
grant select, insert on public.poker_settlement_failures to service_role;

-- SETTLEMENT -> VOIDED only through the refund recovery, and only without a settlement tx.
create or replace function public._poker_hand_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD poker_hands'; end if;
  if old.status in ('COMPLETED', 'VOIDED') then raise exception 'IMMUTABLE_RECORD poker hand %', old.id; end if;
  if new.server_seed_hash <> old.server_seed_hash then raise exception 'COMMITMENT_CHANGED'; end if;
  if old.entropy is not null and new.entropy is distinct from old.entropy then raise exception 'ENTROPY_CHANGED'; end if;
  if old.status = 'SETTLEMENT' and new.status = 'VOIDED' then
    if current_setting('pvp.poker_recovery', true) is distinct from 'refund:' || old.id::text
       or old.ledger_tx_id is not null or new.ledger_tx_id is not null then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
  elsif old.status = 'SETTLEMENT' and new.status not in ('SETTLEMENT', 'COMPLETED') then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if old.status = 'BETTING' and new.status not in ('BETTING', 'SETTLEMENT') then raise exception 'ILLEGAL_TRANSITION'; end if;
  if old.status = 'COMMIT' and new.status not in ('COMMIT', 'BETTING', 'VOIDED') then raise exception 'ILLEGAL_TRANSITION'; end if;
  return new;
end $$;

create or replace function public._poker_note_settle_failure(p_hand bigint, p_error text, p_source text)
returns int
language plpgsql security definer set search_path = public as $$
declare n int; tid bigint;
begin
  update poker_hands set settle_attempts = settle_attempts + 1, last_error = left(p_error, 500)
    where id = p_hand returning settle_attempts, table_id into n, tid;
  insert into poker_settlement_failures (hand_id, attempt, error, source) values (p_hand, n, left(p_error, 500), p_source);
  perform _audit(null, 'poker_settle_failed', p_hand, jsonb_build_object('error', left(p_error, 500), 'attempt', n,
    'source', p_source));
  if n = 8 then
    insert into integrity_incidents (check_name, fingerprint, details)
    values ('poker_settlement_stuck', 'pks:' || p_hand,
      jsonb_build_object('hand_id', p_hand, 'table_id', tid, 'attempts', n, 'last_error', left(p_error, 500)))
    on conflict (fingerprint) do update set details = excluded.details, last_seen_at = now(),
      occurrences = integrity_incidents.occurrences + 1;
    raise warning 'INTEGRITY_INCIDENT poker_settlement_stuck %', jsonb_build_object('hand_id', p_hand, 'table_id', tid);
  end if;
  return n;
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
    perform public._poker_note_settle_failure(p_hand, sqlerrm, 'auto');
    return 'failed';
  end;
  perform public._poker_post_hand(tid);
  return 'settled';
end $$;

create or replace function public.poker_admin_recover_settlement(p_hand bigint, p_mode text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); h poker_hands; seed bytea; n int; err text; actor jsonb;
begin
  if uid is not null then
    if not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
    perform public._assert_live_session();
    perform public._require_admin_stepup();
  end if;
  if p_mode not in ('retry', 'refund') then raise exception 'INVALID_MODE'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 5 and 500 then raise exception 'REASON_REQUIRED'; end if;
  select * into h from poker_hands where id = p_hand;
  if not found then raise exception 'HAND_NOT_FOUND'; end if;
  perform 1 from poker_tables where id = h.table_id for update;
  select * into h from poker_hands where id = p_hand for update;
  actor := jsonb_build_object('by', uid, 'mode', p_mode, 'reason', p_reason);
  if h.status in ('COMPLETED', 'VOIDED') then
    return jsonb_build_object('ok', true, 'already', h.status, 'ledger_tx', h.ledger_tx_id);
  end if;
  if h.status <> 'SETTLEMENT' then raise exception 'NOT_IN_SETTLEMENT'; end if;

  if p_mode = 'retry' then
    begin
      perform public._poker_settle(p_hand);
    exception when others then
      err := sqlerrm;
    end;
    if err is not null then
      n := public._poker_note_settle_failure(p_hand, err, 'admin_retry');
      perform _audit(uid, 'poker_settle_recovery_failed', p_hand, actor || jsonb_build_object('error', left(err, 500)));
      return jsonb_build_object('ok', false, 'error', left(err, 200), 'attempts', n);
    end if;
    perform public._poker_post_hand(h.table_id);
    perform public._poker_touch(h.table_id);
    perform _audit(uid, 'poker_settle_recovered', p_hand, actor);
    return jsonb_build_object('ok', true, 'result', 'settled');
  end if;

  -- refund: prove that no payout was applied before returning anything.
  if h.ledger_tx_id is not null
     or exists (select 1 from ledger_transactions where idempotency_key = 'poker:hand:' || p_hand || ':settle') then
    raise exception 'ALREADY_PAID';
  end if;
  if exists (select 1 from poker_hand_players where hand_id = p_hand and stack + total_bet <> start_stack) then
    raise exception 'INVARIANT_CHIPS';
  end if;
  if exists (select 1 from poker_hand_players hp join poker_seats s on s.id = hp.seat_id
             where hp.hand_id = p_hand and (s.status <> 'SEATED' or s.stack <> hp.start_stack)) then
    raise exception 'INVARIANT_SEAT_STACK';
  end if;
  select server_seed into seed from poker_hand_secrets where hand_id = p_hand;
  perform set_config('pvp.poker_recovery', 'refund:' || p_hand::text, true);
  update poker_hand_players set refund = total_bet, won = 0, wagered = 0, end_stack = start_stack
    where hand_id = p_hand;
  update poker_hands set status = 'VOIDED', server_seed = encode(seed, 'hex'), void_reason = 'settlement_refund',
    to_act = null, action_deadline = null, completed_at = clock_timestamp(),
    next_hand_at = clock_timestamp() + interval '1 second', version = version + 1
  where id = p_hand;
  perform set_config('pvp.poker_recovery', '', true);
  perform public._poker_log(p_hand, null, null, h.street, 'VOID', 0, null, false, null, null);
  update poker_tables set hand_id = null where hand_id = p_hand;
  perform _audit(uid, 'poker_settle_refunded', p_hand, actor || jsonb_build_object(
    'refunds', (select jsonb_object_agg(seat_no, total_bet) from poker_hand_players where hand_id = p_hand)));
  perform public._poker_post_hand(h.table_id);
  perform public._poker_touch(h.table_id);
  return jsonb_build_object('ok', true, 'result', 'refunded');
end $$;

-- Same as 20261014330000 plus stuck settlements, which block a table's funds.
create or replace function public.poker_reconcile() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare seat_bad int; closed_bad int; hand_bad int; locked_bad int; stuck int; pending int;
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
  select count(*) filter (where settle_attempts >= 8), count(*) filter (where settle_attempts < 8)
    into stuck, pending
  from poker_hands where status = 'SETTLEMENT';
  return jsonb_build_object('ok', seat_bad + closed_bad + hand_bad + locked_bad + stuck = 0,
    'open_seats', seat_bad, 'closed_seats', closed_bad, 'hands', hand_bad, 'locked_coverage', locked_bad,
    'stuck_settlements', stuck, 'retrying_settlements', pending);
end $$;

revoke all on function public._poker_note_settle_failure(bigint, text, text) from public, anon, authenticated;
revoke all on function public._poker_finish(bigint) from public, anon, authenticated;
revoke all on function public.poker_admin_recover_settlement(bigint, text, text) from public, anon;
revoke all on function public.poker_reconcile() from public, anon, authenticated;
grant execute on function public._poker_note_settle_failure(bigint, text, text) to service_role;
grant execute on function public._poker_finish(bigint) to service_role;
grant execute on function public.poker_admin_recover_settlement(bigint, text, text) to authenticated, service_role;
grant execute on function public.poker_reconcile() to service_role;

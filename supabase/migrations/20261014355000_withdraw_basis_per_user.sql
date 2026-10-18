-- Withdraw basis without global serialization.
--
-- Before: every real ledger insert took an exclusive advisory lock and bumped one meta
-- row, so all real-money writes (every game, every user) ran one at a time from their
-- first ledger insert to commit. The cache was replayed lazily in (created_at, id) order.
--
-- Now each real ledger transaction applies its own basis effect when it commits (a
-- deferred constraint trigger), and records a sequence number in withdraw_basis_applied.
-- Why that is equivalent to a serial replay:
--   * A tx only changes the bucket, holds and stakes of users it posts to, plus rows keyed
--     by its game (stakes, ledger stakes).
--   * _post locks both of a user's real wallets (available, locked; enum order) before
--     changing either balance, and those locks are held to commit. So two txs that touch
--     the same user's basis can never both be in flight.
--   * Every entry, refund and settlement path locks its game row (or poker seat) FOR
--     UPDATE, so game-keyed rows are serialized the same way.
--   * The sequence number is taken at commit while those locks are still held, so seq
--     order is a valid serial order of all effects. _withdraw_basis_rebuild_full replays
--     in seq order and must reproduce the cache exactly.
-- Readers that need the current figure (withdrawals) lock the user's wallets first, which
-- waits for any in-flight tx of that user; its basis effect commits atomically with its
-- ledger rows.
--
-- The advisory lock survives in shared mode only: writers and readers never block each
-- other on it; the maintenance rebuild takes it exclusively so it never truncates under
-- an in-flight apply.

lock table public.ledger_transactions, public.ledger_postings in share row exclusive mode;
select public._withdraw_basis_sync();

create table public.withdraw_basis_applied (
  tx_id uuid primary key references public.ledger_transactions (id),
  seq bigint not null unique,
  applied_at timestamptz not null default clock_timestamp()
);
create sequence public.withdraw_basis_applied_seq owned by public.withdraw_basis_applied.seq;
alter table public.withdraw_basis_applied
  alter column seq set default nextval('public.withdraw_basis_applied_seq');

insert into public.withdraw_basis_applied (tx_id, seq)
select t.id, row_number() over (order by t.created_at, t.id)
from public.ledger_transactions t
where t.account_type = 'real';
select setval('public.withdraw_basis_applied_seq',
  greatest((select max(seq) from public.withdraw_basis_applied), 0) + 1, false);

alter table public.withdraw_basis_applied enable row level security;
revoke all on public.withdraw_basis_applied from public, anon, authenticated;
revoke all on sequence public.withdraw_basis_applied_seq from public, anon, authenticated;
grant all on public.withdraw_basis_applied to service_role;
grant usage on sequence public.withdraw_basis_applied_seq to service_role;

create or replace function public._post(p_tx uuid, p_account uuid, p_amount bigint) returns void
language plpgsql security definer set search_path = public as $$
declare nb bigint; a record;
begin
  select owner_id, kind, account_type into a from wallet_accounts where id = p_account;
  if a.owner_id is not null and a.account_type = 'real' and a.kind in ('user_available', 'user_locked') then
    perform 1 from wallet_accounts
      where owner_id = a.owner_id and account_type = 'real' and kind in ('user_available', 'user_locked')
      order by kind
      for update;
  end if;
  update wallet_accounts set balance = balance + p_amount where id = p_account returning balance into nb;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  insert into ledger_postings (tx_id, account_id, amount, balance_after) values (p_tx, p_account, p_amount, nb);
end $$;

create or replace function public._withdraw_basis_apply_one(p_tx uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select id, kind::text as kind, game_id, account_type into t from ledger_transactions where id = p_tx;
  if not found or t.account_type <> 'real' then return; end if;
  perform pg_advisory_xact_lock_shared(hashtext('withdraw-basis-sync'));
  insert into withdraw_basis_applied (tx_id) values (p_tx) on conflict (tx_id) do nothing;
  if not found then return; end if;
  perform public._withdraw_basis_apply_tx(t.id, t.kind, t.game_id);
end $$;

create or replace function public._withdraw_basis_apply_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public._withdraw_basis_apply_one(new.id);
  return null;
end $$;

create constraint trigger withdraw_basis_apply
  after insert on public.ledger_transactions
  deferrable initially deferred
  for each row when (new.account_type = 'real')
  execute function public._withdraw_basis_apply_trg();

-- Pending ids of this transaction, so a mid-transaction reader can apply them early.
-- Transaction-local and reverted with a rolled-back subtransaction.
create or replace function public._withdraw_basis_writer_lock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.account_type = 'real' then
    if new.user_id is not null then
      perform 1 from wallet_accounts
        where owner_id = new.user_id and account_type = 'real' and kind in ('user_available', 'user_locked')
        order by kind
        for update;
    end if;
    perform pg_advisory_xact_lock_shared(hashtext('withdraw-basis-sync'));
    perform set_config('pvp.wb_pending',
      coalesce(current_setting('pvp.wb_pending', true), '') || new.id::text || ',', true);
  end if;
  return new;
end $$;

-- Applies this transaction's own pending ledger txs. Committed txs are already applied.
create or replace function public._withdraw_basis_sync() returns void
language plpgsql security definer set search_path = public as $$
declare v text := current_setting('pvp.wb_pending', true); id uuid;
begin
  if coalesce(v, '') = '' then return; end if;
  perform set_config('pvp.wb_pending', '', true);
  foreach id in array string_to_array(trim(both ',' from v), ',')::uuid[] loop
    perform public._withdraw_basis_apply_one(id);
  end loop;
end $$;

create or replace function public._withdraw_basis(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_deposits bigint := 0;
  v_eligible bigint := 0;
  v_bonus bigint := 0;
  v_room bigint := 0;
begin
  perform 1 from wallet_accounts
    where owner_id = p_user and account_type = 'real' and kind in ('user_available', 'user_locked')
    order by kind
    for update;
  perform public._withdraw_basis_sync();
  select b.deposits, b.eligible, b.bonus
    into v_deposits, v_eligible, v_bonus
  from withdraw_basis_bucket b
  where b.user_id = p_user;
  v_deposits := coalesce(v_deposits, 0);
  v_eligible := greatest(coalesce(v_eligible, 0), 0);
  v_bonus := greatest(coalesce(v_bonus, 0), 0);
  v_room := v_eligible + case when v_deposits >= 2000 then v_bonus else 0 end;
  return jsonb_build_object(
    'deposits', v_deposits,
    'eligible', v_eligible,
    'bonus', v_bonus,
    'room', v_room
  );
end $$;

create or replace function public._withdraw_basis_has_pending() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ledger_transactions t
    where t.account_type = 'real'
      and not exists (select 1 from public.withdraw_basis_applied a where a.tx_id = t.id)
  );
$$;

-- Maintenance only: waits for every in-flight apply, then replays in seq order.
create or replace function public._withdraw_basis_rebuild_full() returns void
language plpgsql security definer set search_path = public as $$
declare
  tx record;
  v_n bigint;
  v_tx bigint;
  v_last_at timestamptz;
  v_last_id uuid;
begin
  perform set_config('client_min_messages', 'warning', true);
  perform public._withdraw_basis_sync();
  perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));
  if public._withdraw_basis_has_pending() then
    raise exception 'WITHDRAW_BASIS_UNAPPLIED';
  end if;
  truncate withdraw_basis_bucket, withdraw_basis_stake, withdraw_basis_hold, withdraw_basis_ledger_stake restart identity;
  for tx in
    select t.id, t.kind::text as kind, t.game_id, t.created_at
    from withdraw_basis_applied a
    join ledger_transactions t on t.id = a.tx_id
    order by a.seq
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
  select count(*) into v_tx from withdraw_basis_applied;
  update withdraw_basis_meta
    set posting_count = v_n,
        last_created_at = v_last_at,
        last_tx_id = v_last_id,
        ledger_real_tx_count = v_tx,
        applied_tx_count = v_tx
  where id = 1;
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
    -- Nothing left in play: the buy-in's eligible/bonus split was spent at the table.
    perform public._withdraw_basis_sync();
    delete from withdraw_basis_stake where user_id = s.user_id and game = 'poker' and game_id = s.id;
  end if;
  update poker_seats set status = 'CLOSED', cashed_out = amt, stack = 0, pending = 0, leaving = false,
    closed_at = clock_timestamp(), close_ledger_tx = tx
  where id = s.id;
  perform _audit(s.user_id, 'poker_cash_out', s.table_id, jsonb_build_object(
    'seat_id', s.id, 'amount', amt, 'buy_in_total', s.buy_in_total, 'ledger_tx', tx));
end $$;

revoke all on function public._withdraw_basis_apply_one(uuid) from public, anon, authenticated;
revoke all on function public._withdraw_basis_apply_trg() from public, anon, authenticated;
grant execute on function public._withdraw_basis_apply_one(uuid) to service_role;

select public._withdraw_basis_assert_rebuild_idempotent();

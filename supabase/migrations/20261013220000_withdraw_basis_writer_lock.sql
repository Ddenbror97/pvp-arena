-- Late commit with an earlier (created_at, id) can advance the cursor past a row
-- that is not visible yet. Serialize real ledger inserts with the same xact lock
-- as sync, and rebuild when ledger_real_tx_count <> applied_tx_count.

alter table public.withdraw_basis_meta
  add column if not exists ledger_real_tx_count bigint not null default 0,
  add column if not exists applied_tx_count bigint not null default 0;

update public.withdraw_basis_meta m
set
  ledger_real_tx_count = coalesce((
    select count(*)::bigint from public.ledger_transactions t where t.account_type = 'real'
  ), 0),
  applied_tx_count = coalesce((
    select count(*)::bigint from public.ledger_transactions t where t.account_type = 'real'
  ), 0)
where m.id = 1;

create or replace function public._withdraw_basis_writer_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_type = 'real' then
    perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));
    update public.withdraw_basis_meta
      set ledger_real_tx_count = ledger_real_tx_count + 1
      where id = 1;
  end if;
  return new;
end $$;

drop trigger if exists withdraw_basis_writer_lock on public.ledger_transactions;
create trigger withdraw_basis_writer_lock
  before insert on public.ledger_transactions
  for each row
  execute function public._withdraw_basis_writer_lock();

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
  truncate withdraw_basis_bucket, withdraw_basis_stake, withdraw_basis_hold restart identity;
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

create or replace function public._withdraw_basis_sync()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  tx record;
  v_applied int;
  v_last_at timestamptz;
  v_last_id uuid;
  v_n bigint;
  v_ledger bigint;
  v_done bigint;
begin
  perform set_config('client_min_messages', 'warning', true);
  perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));

  select ledger_real_tx_count, applied_tx_count, last_created_at, last_tx_id
    into v_ledger, v_done, v_last_at, v_last_id
  from withdraw_basis_meta
  where id = 1;

  if v_last_id is null and v_ledger > 0 then
    perform public._withdraw_basis_rebuild_full();
    return;
  end if;

  if v_ledger = v_done and not public._withdraw_basis_has_pending() then
    return;
  end if;

  if v_ledger <> v_done and not public._withdraw_basis_has_pending() then
    perform public._withdraw_basis_rebuild_full();
    return;
  end if;

  loop
    v_applied := 0;
    for tx in
      select t.id, t.kind::text as kind, t.game_id, t.created_at
      from ledger_transactions t
      where t.account_type = 'real'
        and (
          v_last_id is null
          or (t.created_at, t.id) > (
            coalesce(v_last_at, '-infinity'::timestamptz),
            coalesce(v_last_id, '00000000-0000-0000-0000-000000000000'::uuid)
          )
        )
      order by t.created_at, t.id
    loop
      perform public._withdraw_basis_apply_tx(tx.id, tx.kind, tx.game_id);
      v_last_at := tx.created_at;
      v_last_id := tx.id;
      v_applied := v_applied + 1;
      update withdraw_basis_meta
        set applied_tx_count = applied_tx_count + 1,
            last_created_at = v_last_at,
            last_tx_id = v_last_id
        where id = 1;
    end loop;
    exit when v_applied = 0;
  end loop;

  select ledger_real_tx_count, applied_tx_count
    into v_ledger, v_done
  from withdraw_basis_meta
  where id = 1;

  if v_ledger <> v_done or public._withdraw_basis_has_pending() then
    perform public._withdraw_basis_rebuild_full();
    return;
  end if;

  select count(*) into v_n
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  where t.account_type = 'real';

  update withdraw_basis_meta
    set posting_count = v_n
  where id = 1;
end $$;

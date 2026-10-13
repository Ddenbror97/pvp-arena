-- No-op shape fix: rebuild_full without unused tx count (same behavior).

create or replace function public._withdraw_basis_rebuild_full()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tx record;
  v_n bigint;
  v_last_at timestamptz;
  v_last_id uuid;
begin
  perform set_config('client_min_messages', 'warning', true);
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
  update withdraw_basis_meta
    set posting_count = v_n,
        last_created_at = v_last_at,
        last_tx_id = v_last_id
  where id = 1;
end $$;

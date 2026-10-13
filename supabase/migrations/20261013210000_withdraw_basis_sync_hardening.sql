-- Fast path: O(1) EXISTS on (created_at, id) cursor — no COUNT(*) on postings.
-- Catch-up: repeat apply passes until no new real txs (READ COMMITTED + advisory lock).
-- Parity: rebuild_full is idempotent; tests compare bucket snapshots before/after rebuild.

create index if not exists ledger_transactions_real_created_id_idx
  on public.ledger_transactions (created_at, id)
  where account_type = 'real';

create or replace function public._withdraw_basis_has_pending()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.withdraw_basis_meta m
    cross join lateral (
      select 1
      from public.ledger_transactions t
      where t.account_type = 'real'
        and (
          m.last_tx_id is null
          or (t.created_at, t.id) > (
            coalesce(m.last_created_at, '-infinity'::timestamptz),
            coalesce(m.last_tx_id, '00000000-0000-0000-0000-000000000000'::uuid)
          )
        )
      limit 1
    ) pending
    where m.id = 1
  );
$$;

revoke all on function public._withdraw_basis_has_pending() from public, anon, authenticated;
grant execute on function public._withdraw_basis_has_pending() to service_role;

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
begin
  perform set_config('client_min_messages', 'warning', true);
  perform pg_advisory_xact_lock(hashtext('withdraw-basis-sync'));

  select last_created_at, last_tx_id
    into v_last_at, v_last_id
  from withdraw_basis_meta
  where id = 1;

  if v_last_id is null and exists (
    select 1 from ledger_transactions t where t.account_type = 'real' limit 1
  ) then
    perform public._withdraw_basis_rebuild_full();
    return;
  end if;

  if not public._withdraw_basis_has_pending() then
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
    end loop;
    exit when v_applied = 0;
  end loop;

  if public._withdraw_basis_has_pending() then
    perform public._withdraw_basis_rebuild_full();
    return;
  end if;

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

-- Test helper: cached buckets must match a full rebuild (service_role / pvp_test only).
create or replace function public._withdraw_basis_buckets_json()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      user_id::text,
      jsonb_build_object(
        'deposits', deposits,
        'eligible', eligible,
        'bonus', bonus,
        'room', eligible + case when deposits >= 2000 then bonus else 0 end
      )
    ),
    '{}'::jsonb
  )
  from withdraw_basis_bucket;
$$;

revoke all on function public._withdraw_basis_buckets_json() from public, anon, authenticated;
grant execute on function public._withdraw_basis_buckets_json() to service_role;

create or replace function public._withdraw_basis_assert_rebuild_idempotent()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  before jsonb;
  after jsonb;
begin
  before := public._withdraw_basis_buckets_json();
  perform public._withdraw_basis_rebuild_full();
  after := public._withdraw_basis_buckets_json();
  if before is distinct from after then
    raise exception 'WITHDRAW_BASIS_PARITY_FAIL';
  end if;
end $$;

revoke all on function public._withdraw_basis_assert_rebuild_idempotent() from public, anon, authenticated;
grant execute on function public._withdraw_basis_assert_rebuild_idempotent() to service_role;

comment on function public._withdraw_basis_sync() is
  'Mutates withdraw_basis_* under advisory lock. Not a read-only audit; do not call on production for benchmarking.';
comment on function public._withdraw_basis(p_user uuid) is
  'Calls _withdraw_basis_sync then reads cached buckets. Withdrawal path only.';

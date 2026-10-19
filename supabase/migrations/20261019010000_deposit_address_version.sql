-- Versioned Base deposit addresses and payout-nonce leases.
-- Not applied to production until the rollout is approved.
-- Existing crypto_deposit_addresses rows stay version 1. This migration does
-- not update their address or derivation_index columns. PostgreSQL runs this
-- file in one transaction, so a failed statement rolls the whole migration back.

alter table public.crypto_deposit_addresses
  add column derivation_version smallint not null default 1;

alter table public.crypto_deposit_addresses
  drop constraint if exists crypto_deposit_addresses_derivation_version_check;
alter table public.crypto_deposit_addresses
  add constraint crypto_deposit_addresses_derivation_version_check
  check (derivation_version in (1, 2));

-- Replace the single-address-per-user and single-index-per-chain uniques.
-- (chain_id, address) stays, so two versions cannot store the same address.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'crypto_deposit_addresses'
      and con.contype = 'u'
      and pg_get_constraintdef(con.oid) in (
        'UNIQUE (chain_id, user_id)',
        'UNIQUE (chain_id, derivation_index)'
      )
  loop
    execute format('alter table public.crypto_deposit_addresses drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.crypto_deposit_addresses
  drop constraint if exists crypto_deposit_addresses_chain_user_version_key;
alter table public.crypto_deposit_addresses
  add constraint crypto_deposit_addresses_chain_user_version_key
  unique (chain_id, user_id, derivation_version);

alter table public.crypto_deposit_addresses
  drop constraint if exists crypto_deposit_addresses_chain_version_index_key;
alter table public.crypto_deposit_addresses
  add constraint crypto_deposit_addresses_chain_version_index_key
  unique (chain_id, derivation_version, derivation_index);

comment on column public.crypto_deposit_addresses.derivation_version is
  '1 = historical compressed-key address, kept for late deposits. 2 = standard Ethereum address. Indexes are not shared across versions.';

-- Sweep only version 2. Gas stipends are capped for the life of the address.
-- The configured deposit treasury has to be the Base MetaMask treasury.
create or replace function public.crypto_sweep_begin(
  p_chain bigint,
  p_deposit text,
  p_index integer,
  p_asset text,
  p_amount numeric,
  p_nonce integer,
  p_payer text,
  p_to text,
  p_gas numeric,
  p_fee numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dep text := lower(p_deposit);
  dst text := lower(p_to);
  payer text := lower(p_payer);
  key text;
  inserted_id uuid;
  treasury constant text := '0x9eaff85db9a2559ec958740a6a3b523751237987';
  cap constant numeric := 200000000000000;
  lifetime constant numeric := 400000000000000;
  db_treasury text;
  funded_count integer;
  attempt_count integer;
  funded_sum numeric;
begin
  if p_chain <> 8453 then raise exception 'SWEEP_CHAIN'; end if;
  if p_asset not in ('ETH', 'USDC', 'GAS') then raise exception 'SWEEP_ASSET'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'SWEEP_AMOUNT'; end if;
  if p_nonce is null or p_nonce < 0 then raise exception 'SWEEP_NONCE'; end if;
  if p_fee is null or p_fee <= 0 then raise exception 'SWEEP_FEE'; end if;
  if p_asset = 'USDC' and p_gas <> 80000 then raise exception 'SWEEP_GAS'; end if;
  if p_asset <> 'USDC' and p_gas <> 21000 then raise exception 'SWEEP_GAS'; end if;
  if dep !~ '^0x[0-9a-f]{40}$' or dst !~ '^0x[0-9a-f]{40}$' or payer !~ '^0x[0-9a-f]{40}$' then
    raise exception 'SWEEP_ADDRESS';
  end if;
  select lower(address) into db_treasury
  from public.chain_treasury_accounts
  where chain_id = p_chain and role = 'deposit' and is_active;
  if db_treasury is distinct from treasury then raise exception 'SWEEP_TREASURY_MISMATCH'; end if;
  if not exists (
    select 1 from public.crypto_deposit_addresses
    where chain_id = p_chain
      and lower(address) = dep
      and derivation_index = p_index
      and derivation_version = 2
  ) then
    raise exception 'SWEEP_NOT_VERSION_2';
  end if;
  if p_asset in ('ETH', 'USDC') then
    if dst <> treasury then raise exception 'SWEEP_DESTINATION_FORBIDDEN'; end if;
    if payer <> dep then raise exception 'SWEEP_PAYER'; end if;
  else
    if p_amount > cap then raise exception 'GAS_CAP'; end if;
    if dst <> dep then raise exception 'GAS_DESTINATION_FORBIDDEN'; end if;
    if payer = dep then raise exception 'GAS_PAYER'; end if;
    select count(*) into funded_count
    from public.crypto_deposit_sweeps
    where chain_id = p_chain and deposit_address = dep and asset_key = 'GAS' and status <> 'FAILED';
    select count(*) into attempt_count
    from public.crypto_deposit_sweeps
    where chain_id = p_chain and deposit_address = dep and asset_key = 'GAS';
    select coalesce(sum(amount), 0) into funded_sum
    from public.crypto_deposit_sweeps
    where chain_id = p_chain and deposit_address = dep and asset_key = 'GAS' and status <> 'FAILED';
    if attempt_count >= 3 then raise exception 'GAS_ATTEMPTS'; end if;
    if funded_count >= 2 or funded_sum + p_amount > lifetime then raise exception 'GAS_LIFETIME'; end if;
  end if;
  key := 'sweep:' || p_chain::text || ':' || dep || ':' || p_asset || ':' || p_nonce::text;
  insert into public.crypto_deposit_sweeps (
    chain_id, deposit_address, derivation_index, asset_key, amount, nonce,
    gas_limit, max_fee_per_gas, status, payer, to_address, idempotency_key
  ) values (
    p_chain, dep, p_index, p_asset, p_amount, p_nonce,
    p_gas, p_fee, 'PENDING', payer, dst, key
  )
  on conflict (idempotency_key) do nothing
  returning id into inserted_id;
  if found then
    return jsonb_build_object('id', inserted_id, 'created', true, 'status', 'PENDING');
  end if;
  return jsonb_build_object('id', null, 'created', false);
exception
  when unique_violation then
    return jsonb_build_object('id', null, 'created', false);
end;
$$;

-- Confirmation requires the decoded signed transaction to match the stored row.
-- The worker calls this only after the safe-head and two-provider check.
drop function if exists public.crypto_sweep_confirm(uuid);

create or replace function public.crypto_sweep_confirm(
  p_id uuid,
  p_hash text,
  p_sender text,
  p_to text,
  p_amount numeric,
  p_chain bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare row public.crypto_deposit_sweeps;
begin
  if p_chain <> 8453 then raise exception 'SWEEP_CHAIN'; end if;
  if p_hash is null or p_hash !~ '^0x[0-9a-f]{64}$' then raise exception 'SWEEP_HASH'; end if;
  select * into row from public.crypto_deposit_sweeps where id = p_id;
  if row.id is null then raise exception 'SWEEP_NOT_INFLIGHT'; end if;
  if row.status = 'CONFIRMED' then
    if lower(row.tx_hash) = lower(p_hash)
      and row.payer = lower(p_sender)
      and row.to_address = lower(p_to)
      and row.amount = p_amount
      and row.chain_id = p_chain then
      return;
    end if;
    raise exception 'SWEEP_CONFIRM_MISMATCH';
  end if;
  if row.status not in ('SIGNED', 'BROADCAST') or row.signed_raw_tx is null or row.tx_hash is null then
    raise exception 'SWEEP_NOT_INFLIGHT';
  end if;
  if lower(row.tx_hash) <> lower(p_hash)
    or row.payer <> lower(p_sender)
    or row.to_address <> lower(p_to)
    or row.amount <> p_amount
    or row.chain_id <> p_chain then
    raise exception 'SWEEP_CONFIRM_MISMATCH';
  end if;
  update public.crypto_deposit_sweeps
  set status = 'CONFIRMED', confirmed_at = now(), updated_at = now()
  where id = p_id and status in ('SIGNED', 'BROADCAST');
  if not found then raise exception 'SWEEP_NOT_INFLIGHT'; end if;
end;
$$;

create or replace function public.crypto_sweep_for_address(p_chain bigint, p_deposit text)
returns table (
  id uuid,
  deposit_address text,
  derivation_index integer,
  asset_key text,
  amount text,
  gas_limit text,
  max_fee_per_gas text,
  tx_hash text,
  signed_raw_tx text,
  nonce integer,
  status text,
  payer text,
  to_address text,
  idempotency_key text,
  error text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    id, deposit_address, derivation_index, asset_key, amount::text, gas_limit::text,
    max_fee_per_gas::text, tx_hash, signed_raw_tx, nonce, status, payer, to_address,
    idempotency_key, error
  from public.crypto_deposit_sweeps
  where chain_id = p_chain and deposit_address = lower(p_deposit)
  order by created_at;
$$;

-- One nonce stream for the payout wallet. Withdrawals and gas stipends both
-- reserve here. A retry of the same unsigned owner reuses its nonce. Another
-- owner cannot release or reuse that reservation.
create table public.crypto_nonce_leases (
  chain_id bigint not null,
  payer text not null,
  nonce integer not null check (nonce >= 0),
  purpose text not null check (purpose in ('withdrawal', 'gas_stipend')),
  owner_id text not null,
  status text not null check (status in ('reserved', 'used', 'released')),
  signed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (chain_id, payer, nonce),
  constraint crypto_nonce_leases_addr_fmt check (payer ~ '^0x[0-9a-f]{40}$')
);

create unique index crypto_nonce_leases_owner_reserved
  on public.crypto_nonce_leases (chain_id, payer, owner_id)
  where status = 'reserved';

alter table public.crypto_nonce_leases enable row level security;
revoke all on public.crypto_nonce_leases from public, anon, authenticated;
grant all on public.crypto_nonce_leases to service_role;
create trigger no_truncate
  before truncate on public.crypto_nonce_leases
  for each statement execute function public._no_truncate();

create or replace function public.crypto_reserve_nonce(
  p_chain bigint,
  p_payer text,
  p_purpose text,
  p_owner text,
  p_chain_nonce integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payer text := lower(p_payer);
  existing integer;
  lease_floor integer;
  sweep_floor integer;
  withdrawal_floor integer;
  next_nonce integer;
begin
  if p_chain <> 8453 then raise exception 'NONCE_CHAIN'; end if;
  if p_purpose not in ('withdrawal', 'gas_stipend') then raise exception 'NONCE_PURPOSE'; end if;
  if p_owner is null or length(p_owner) < 8 or length(p_owner) > 200 then raise exception 'NONCE_OWNER'; end if;
  if p_chain_nonce is null or p_chain_nonce < 0 then raise exception 'NONCE_LEASE'; end if;
  if payer !~ '^0x[0-9a-f]{40}$' then raise exception 'NONCE_PAYER'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_chain::text || ':' || payer, 0));

  select nonce into existing
  from public.crypto_nonce_leases
  where chain_id = p_chain and payer = payer and owner_id = p_owner
    and status = 'reserved' and signed = false;
  if found then
    return jsonb_build_object('nonce', existing, 'reused', true);
  end if;

  select coalesce(max(nonce) + 1, 0) into lease_floor
  from public.crypto_nonce_leases
  where chain_id = p_chain and payer = payer and status in ('reserved', 'used');

  select coalesce(max(nonce) + 1, 0) into sweep_floor
  from public.crypto_deposit_sweeps
  where chain_id = p_chain and payer = payer
    and status in ('PENDING', 'SIGNED', 'BROADCAST') and nonce is not null;

  select coalesce(max(nonce) + 1, 0) into withdrawal_floor
  from public.crypto_withdrawals
  where chain_id = p_chain and status in ('SUBMITTING', 'SUBMITTED') and nonce is not null;

  next_nonce := greatest(p_chain_nonce, lease_floor, sweep_floor, withdrawal_floor);
  while exists (
    select 1 from public.crypto_nonce_leases
    where chain_id = p_chain and payer = payer and nonce = next_nonce and status <> 'released'
  ) loop
    next_nonce := next_nonce + 1;
  end loop;

  insert into public.crypto_nonce_leases (chain_id, payer, nonce, purpose, owner_id, status, signed)
  values (p_chain, payer, next_nonce, p_purpose, p_owner, 'reserved', false);
  return jsonb_build_object('nonce', next_nonce, 'reused', false);
end;
$$;

create or replace function public.crypto_nonce_mark_signed(
  p_chain bigint,
  p_payer text,
  p_nonce integer,
  p_owner text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crypto_nonce_leases
  set signed = true, status = 'used', updated_at = now()
  where chain_id = p_chain and payer = lower(p_payer) and nonce = p_nonce
    and owner_id = p_owner and status = 'reserved';
  if not found then raise exception 'NONCE_LEASE'; end if;
end;
$$;

create or replace function public.crypto_nonce_release(
  p_chain bigint,
  p_payer text,
  p_nonce integer,
  p_owner text,
  p_chain_nonce integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare released integer;
begin
  if p_chain_nonce is null or p_chain_nonce < 0 or p_chain_nonce > p_nonce then
    return false;
  end if;
  update public.crypto_nonce_leases
  set status = 'released', updated_at = now()
  where chain_id = p_chain and payer = lower(p_payer) and nonce = p_nonce
    and owner_id = p_owner and status = 'reserved' and signed = false;
  get diagnostics released = row_count;
  return released = 1;
end;
$$;

revoke all on function public.crypto_sweep_for_address(bigint, text) from public, anon, authenticated;
revoke all on function public.crypto_sweep_confirm(uuid, text, text, text, numeric, bigint) from public, anon, authenticated;
revoke all on function public.crypto_reserve_nonce(bigint, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.crypto_nonce_mark_signed(bigint, text, integer, text) from public, anon, authenticated;
revoke all on function public.crypto_nonce_release(bigint, text, integer, text, integer) from public, anon, authenticated;

grant execute on function public.crypto_sweep_for_address(bigint, text) to service_role;
grant execute on function public.crypto_sweep_confirm(uuid, text, text, text, numeric, bigint) to service_role;
grant execute on function public.crypto_reserve_nonce(bigint, text, text, text, integer) to service_role;
grant execute on function public.crypto_nonce_mark_signed(bigint, text, integer, text) to service_role;
grant execute on function public.crypto_nonce_release(bigint, text, integer, text, integer) to service_role;

-- Activity keeps every existing field and adds the derivation version so the
-- client can tell a monitored version 1 address from the current version 2 address.
create or replace function public.crypto_my_activity(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with basis as (select public._withdraw_basis_peek(p_user) as j)
  select jsonb_build_object(
    'deposits', coalesce((select jsonb_agg(x order by x.detected_at desc) from (
      select d.id, d.chain_id, d.asset_key, d.tx_hash, d.units::text as units, d.usd_cents, d.status, d.detected_at, d.credited_at, a.decimals
      from crypto_deposits d
      left join chain_assets a on a.chain_id = d.chain_id and a.asset_key = d.asset_key
      where d.user_id = p_user
      order by d.detected_at desc limit 20
    ) x), '[]'),
    'withdrawals', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select w.id, w.chain_id, w.asset_key, w.tx_hash, w.units::text as units, w.usd_cents, w.fee_usd_cents, w.status, w.review_required, w.created_at, w.confirmed_at, w.last_error, a.decimals
      from crypto_withdrawals w
      left join chain_assets a on a.chain_id = w.chain_id and a.asset_key = w.asset_key
      where w.user_id = p_user
      order by w.created_at desc limit 20
    ) x), '[]'),
    'bitcoin', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select b.id,
        case when b.status = 'CREDITED' and b.credited_cents > 0 then b.credited_cents else b.usd_cents end as usd_cents,
        b.status, b.created_at, b.btc_due, b.required_confirmations
      from btcpay_invoices b
      where b.user_id = p_user
      order by b.created_at desc limit 20
    ) x), '[]'),
    'bitcoin_payouts', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select p.id, p.usd_cents, p.status, p.created_at, p.address
      from btcpay_payouts p
      where p.user_id = p_user
      order by p.created_at desc limit 20
    ) x), '[]'),
    'card', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.usd_cents, c.status, c.created_at
      from nowpayments_invoices c
      where c.user_id = p_user
      order by c.created_at desc limit 20
    ) x), '[]'),
    'settings', (select jsonb_build_object('deposits_enabled', crypto_system_enabled and deposits_enabled, 'withdrawals_enabled', crypto_system_enabled and withdrawals_enabled, 'min_deposit_cents', min_deposit_cents, 'min_withdrawal_cents', min_withdrawal_cents, 'daily_limit_cents', daily_limit_cents, 'fee_cents', withdrawal_fee_cents, 'auto_approve_cents', auto_approve_cents) from crypto_settings),
    'chains', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'chain_id', n.chain_id,
          'name', n.name,
          'network_mode', n.network_mode,
          'min_deposit_cents', n.min_deposit_cents,
          'min_withdrawal_cents', n.min_withdrawal_cents,
          'credit_confirmations', n.credit_confirmations,
          'assets', coalesce((
            select jsonb_agg(jsonb_build_object(
              'asset_key', a.asset_key,
              'display_name', a.display_name,
              'decimals', a.decimals,
              'settlement_kind', a.settlement_kind,
              'payout_ready', public.treasury_can_fund_cents('eip155:' || n.chain_id, a.asset_key, n.min_withdrawal_cents)
            ) order by a.asset_key)
            from chain_assets a
            where a.chain_id = n.chain_id and a.is_enabled
          ), '[]'::jsonb)
        )
        order by n.chain_id
      )
      from chain_networks n
      where n.is_enabled
    ), '[]'::jsonb),
    'deposit_addresses', coalesce((select jsonb_agg(jsonb_build_object('chain_id', da.chain_id, 'address', da.address, 'derivation_version', da.derivation_version) order by da.derivation_version desc, da.created_at) from crypto_deposit_addresses da where da.user_id = p_user), '[]'),
    'withdraw', (
      select jsonb_build_object(
        'room_cents', coalesce((basis.j->>'room')::bigint, 0),
        'bonus_cents', coalesce((basis.j->>'bonus')::bigint, 0),
        'deposit_cents', coalesce((basis.j->>'deposits')::bigint, 0),
        'deposit_floor_cents', (select min_withdrawal_cents from crypto_settings limit 1)
      )
      from basis
    ),
    'wallet', (select normalized_address from user_wallets where user_id = p_user and is_verified order by is_primary desc limit 1)
  )
  from basis
$$;

-- Base deposit sweeps. Not applied to production until the sweep recovery plan
-- is approved. This table records ETH, USDC, and gas-stipend transactions.
-- It does not credit or debit user balances.

create table public.crypto_deposit_sweeps (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null,
  deposit_address text not null,
  derivation_index integer not null check (derivation_index >= 0),
  asset_key text not null check (asset_key in ('ETH', 'USDC', 'GAS')),
  amount numeric not null check (amount > 0),
  gas_limit numeric not null check (gas_limit > 0),
  max_fee_per_gas numeric not null check (max_fee_per_gas > 0),
  tx_hash text,
  signed_raw_tx text,
  nonce integer check (nonce is null or nonce >= 0),
  status text not null check (status in ('PENDING', 'SIGNED', 'BROADCAST', 'CONFIRMED', 'FAILED')),
  payer text not null,
  to_address text not null,
  idempotency_key text not null unique,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  broadcast_at timestamptz,
  confirmed_at timestamptz,
  failed_at timestamptz,
  constraint crypto_deposit_sweeps_addr_fmt check (
    deposit_address ~ '^0x[0-9a-f]{40}$'
    and payer ~ '^0x[0-9a-f]{40}$'
    and to_address ~ '^0x[0-9a-f]{40}$'
  )
);

create unique index crypto_deposit_sweeps_one_inflight
  on public.crypto_deposit_sweeps (chain_id, deposit_address)
  where status in ('PENDING', 'SIGNED', 'BROADCAST');

alter table public.crypto_deposit_sweeps enable row level security;
revoke all on public.crypto_deposit_sweeps from public, anon, authenticated;
grant all on public.crypto_deposit_sweeps to service_role;
create trigger no_truncate
  before truncate on public.crypto_deposit_sweeps
  for each statement execute function public._no_truncate();

create table public.crypto_sweep_cursor (
  chain_id bigint primary key,
  next_index integer not null default 0 check (next_index >= 0),
  updated_at timestamptz not null default now()
);
alter table public.crypto_sweep_cursor enable row level security;
revoke all on public.crypto_sweep_cursor from public, anon, authenticated;
grant all on public.crypto_sweep_cursor to service_role;

create or replace function public.crypto_sweep_cursor_get(p_chain bigint)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select next_index from public.crypto_sweep_cursor where chain_id = p_chain), 0);
$$;

create or replace function public.crypto_sweep_cursor_set(p_chain bigint, p_next integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_chain <> 8453 then raise exception 'SWEEP_CHAIN'; end if;
  if p_next is null or p_next < 0 then raise exception 'SWEEP_CURSOR'; end if;
  insert into public.crypto_sweep_cursor (chain_id, next_index)
  values (p_chain, p_next)
  on conflict (chain_id) do update
    set next_index = excluded.next_index, updated_at = now();
  return p_next;
end;
$$;

create or replace function public.crypto_sweep_inflight(p_chain bigint)
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
    id,
    deposit_address,
    derivation_index,
    asset_key,
    amount::text,
    gas_limit::text,
    max_fee_per_gas::text,
    tx_hash,
    signed_raw_tx,
    nonce,
    status,
    payer,
    to_address,
    idempotency_key,
    error
  from public.crypto_deposit_sweeps
  where chain_id = p_chain
    and status in ('PENDING', 'SIGNED', 'BROADCAST')
  order by created_at;
$$;

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
  payer_norm text := lower(p_payer);
  key text;
  inserted_id uuid;
  treasury constant text := '0x9eaff85db9a2559ec958740a6a3b523751237987';
  cap constant numeric := 200000000000000;
begin
  if p_chain <> 8453 then raise exception 'SWEEP_CHAIN'; end if;
  if p_asset not in ('ETH', 'USDC', 'GAS') then raise exception 'SWEEP_ASSET'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'SWEEP_AMOUNT'; end if;
  if p_nonce is null or p_nonce < 0 then raise exception 'SWEEP_NONCE'; end if;
  if p_fee is null or p_fee <= 0 then raise exception 'SWEEP_FEE'; end if;
  if p_asset = 'USDC' and p_gas <> 80000 then raise exception 'SWEEP_GAS'; end if;
  if p_asset <> 'USDC' and p_gas <> 21000 then raise exception 'SWEEP_GAS'; end if;
  if dep !~ '^0x[0-9a-f]{40}$' or dst !~ '^0x[0-9a-f]{40}$' or payer_norm !~ '^0x[0-9a-f]{40}$' then
    raise exception 'SWEEP_ADDRESS';
  end if;
  if not exists (
    select 1 from public.crypto_deposit_addresses
    where chain_id = p_chain and lower(address) = dep and derivation_index = p_index
  ) then
    raise exception 'SWEEP_UNKNOWN_DEPOSIT';
  end if;
  if p_asset in ('ETH', 'USDC') then
    if dst <> treasury then raise exception 'SWEEP_DESTINATION_FORBIDDEN'; end if;
    if payer_norm <> dep then raise exception 'SWEEP_PAYER'; end if;
  else
    if p_amount > cap then raise exception 'GAS_CAP'; end if;
    if dst <> dep then raise exception 'GAS_DESTINATION_FORBIDDEN'; end if;
    if payer_norm = dep then raise exception 'GAS_PAYER'; end if;
  end if;
  key := 'sweep:' || p_chain::text || ':' || dep || ':' || p_asset || ':' || p_nonce::text;
  insert into public.crypto_deposit_sweeps (
    chain_id, deposit_address, derivation_index, asset_key, amount, nonce,
    gas_limit, max_fee_per_gas, status, payer, to_address, idempotency_key
  ) values (
    p_chain, dep, p_index, p_asset, p_amount, p_nonce,
    p_gas, p_fee, 'PENDING', payer_norm, dst, key
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

create or replace function public.crypto_sweep_store_signed(p_id uuid, p_hash text, p_raw text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hash !~ '^0x[0-9a-fA-F]{64}$' then raise exception 'SWEEP_HASH'; end if;
  if p_raw !~ '^0x[0-9a-fA-F]+$' or length(p_raw) < 100 or length(p_raw) > 20000 then
    raise exception 'SWEEP_RAW';
  end if;
  update public.crypto_deposit_sweeps
  set status = 'SIGNED',
      tx_hash = lower(p_hash),
      signed_raw_tx = p_raw,
      updated_at = now()
  where id = p_id
    and status = 'PENDING'
    and signed_raw_tx is null
    and nonce is not null;
  if not found then raise exception 'SWEEP_NOT_PENDING'; end if;
end;
$$;

create or replace function public.crypto_sweep_mark_broadcast(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crypto_deposit_sweeps
  set status = 'BROADCAST',
      attempts = attempts + 1,
      broadcast_at = coalesce(broadcast_at, now()),
      updated_at = now()
  where id = p_id and status = 'SIGNED';
  if found then return; end if;
  update public.crypto_deposit_sweeps
  set attempts = attempts + 1, updated_at = now()
  where id = p_id and status = 'BROADCAST';
end;
$$;

-- Confirms the chain receipt only. Does not post a ledger entry and does not
-- credit or debit a user balance.
create or replace function public.crypto_sweep_confirm(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crypto_deposit_sweeps
  set status = 'CONFIRMED', confirmed_at = now(), updated_at = now()
  where id = p_id and status in ('SIGNED', 'BROADCAST');
  if found then return; end if;
  if exists (
    select 1 from public.crypto_deposit_sweeps where id = p_id and status = 'CONFIRMED'
  ) then
    return;
  end if;
  raise exception 'SWEEP_NOT_INFLIGHT';
end;
$$;

create or replace function public.crypto_sweep_fail(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crypto_deposit_sweeps
  set status = 'FAILED',
      error = left(coalesce(p_reason, 'reverted'), 300),
      failed_at = now(),
      updated_at = now()
  where id = p_id and status in ('SIGNED', 'BROADCAST');
  if found then return; end if;
  -- An unsigned pending row was never broadcast. Failing it releases the address.
  update public.crypto_deposit_sweeps
  set status = 'FAILED',
      error = left(coalesce(p_reason, 'reverted'), 300),
      failed_at = now(),
      updated_at = now()
  where id = p_id and status = 'PENDING' and signed_raw_tx is null;
  if found then return; end if;
  if exists (
    select 1 from public.crypto_deposit_sweeps where id = p_id and status = 'FAILED'
  ) then
    return;
  end if;
  raise exception 'SWEEP_NOT_INFLIGHT';
end;
$$;

create or replace function public.crypto_sweep_note(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crypto_deposit_sweeps
  set error = left(coalesce(p_reason, ''), 300), updated_at = now()
  where id = p_id and status <> 'CONFIRMED';
end;
$$;

revoke all on function public.crypto_sweep_cursor_get(bigint) from public, anon, authenticated;
revoke all on function public.crypto_sweep_cursor_set(bigint, integer) from public, anon, authenticated;
revoke all on function public.crypto_sweep_inflight(bigint) from public, anon, authenticated;
revoke all on function public.crypto_sweep_begin(bigint, text, integer, text, numeric, integer, text, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.crypto_sweep_store_signed(uuid, text, text) from public, anon, authenticated;
revoke all on function public.crypto_sweep_mark_broadcast(uuid) from public, anon, authenticated;
revoke all on function public.crypto_sweep_confirm(uuid) from public, anon, authenticated;
revoke all on function public.crypto_sweep_fail(uuid, text) from public, anon, authenticated;
revoke all on function public.crypto_sweep_note(uuid, text) from public, anon, authenticated;

grant execute on function public.crypto_sweep_cursor_get(bigint) to service_role;
grant execute on function public.crypto_sweep_cursor_set(bigint, integer) to service_role;
grant execute on function public.crypto_sweep_inflight(bigint) to service_role;
grant execute on function public.crypto_sweep_begin(bigint, text, integer, text, numeric, integer, text, text, numeric, numeric) to service_role;
grant execute on function public.crypto_sweep_store_signed(uuid, text, text) to service_role;
grant execute on function public.crypto_sweep_mark_broadcast(uuid) to service_role;
grant execute on function public.crypto_sweep_confirm(uuid) to service_role;
grant execute on function public.crypto_sweep_fail(uuid, text) to service_role;
grant execute on function public.crypto_sweep_note(uuid, text) to service_role;

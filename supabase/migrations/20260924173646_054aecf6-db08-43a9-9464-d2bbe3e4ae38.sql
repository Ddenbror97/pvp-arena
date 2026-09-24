-- Crypto funding rails, step 2: structure, access rules and the network allowlist.
-- Nothing here touches the existing games, ledger rules, fairness or settlement code.

-- 1. Network allowlist. Only a migration can change it; there is no settings page.
create table public.chain_networks (
  chain_id bigint primary key,
  name text not null,
  network_mode text not null,
  safe_confirmations integer not null default 3,
  finalized_confirmations integer not null default 32,
  is_enabled boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint chain_networks_mode_check check (network_mode in ('testnet')),
  constraint chain_networks_safe_conf_check check (safe_confirmations between 1 and 1000),
  constraint chain_networks_final_conf_check check (finalized_confirmations between 1 and 5000)
);

-- 2. Funding assets (ETH and USDC on Base Sepolia).
create table public.chain_assets (
  chain_id bigint not null references public.chain_networks (chain_id) on delete restrict,
  asset_key text not null,
  display_name text not null,
  settlement_kind text not null,
  contract_address text,
  decimals smallint not null,
  price_feed_address text,
  usd_per_unit numeric(20,10),
  min_deposit_units numeric(40,0) not null,
  ledger_asset text not null,
  ledger_account_type text not null,
  is_enabled boolean not null default true,
  created_at timestamp with time zone not null default now(),
  primary key (chain_id, asset_key),
  constraint chain_assets_kind_check check (settlement_kind in ('native','erc20')),
  constraint chain_assets_decimals_check check (decimals between 0 and 36),
  constraint chain_assets_contract_check check (
    (settlement_kind = 'erc20' and contract_address ~* '^0x[0-9a-f]{40}$')
    or (settlement_kind = 'native' and contract_address is null)
  ),
  constraint chain_assets_feed_check check (
    (settlement_kind = 'native' and price_feed_address ~* '^0x[0-9a-f]{40}$' and usd_per_unit is null)
    or (settlement_kind = 'erc20' and price_feed_address is null and usd_per_unit = 1)
  ),
  constraint chain_assets_min_check check (min_deposit_units > 0)
);

-- 3. The platform's own on-chain addresses.
create table public.chain_treasury_accounts (
  chain_id bigint not null references public.chain_networks (chain_id) on delete restrict,
  address text not null,
  role text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  primary key (chain_id, address, role),
  constraint chain_treasury_role_check check (role in ('deposit','payout')),
  constraint chain_treasury_address_check check (address ~* '^0x[0-9a-f]{40}$')
);

create unique index chain_treasury_one_deposit_idx
  on public.chain_treasury_accounts (chain_id, role)
  where role = 'deposit' and is_active;

-- 4. Server-side valuation history (never a browser-provided price).
create table public.crypto_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null,
  asset_key text not null,
  feed_address text not null,
  feed_round_id numeric(40,0) not null,
  price_micro_usd bigint not null,
  max_age_seconds integer not null default 90,
  observed_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint crypto_price_snapshot_asset_fk foreign key (chain_id, asset_key)
    references public.chain_assets (chain_id, asset_key) on delete restrict,
  constraint crypto_price_snapshot_positive_check check (price_micro_usd > 0),
  constraint crypto_price_snapshot_age_check check (max_age_seconds between 5 and 3600),
  constraint crypto_price_snapshot_feed_check check (feed_address ~* '^0x[0-9a-f]{40}$')
);

create index crypto_price_snapshots_lookup_idx
  on public.crypto_price_snapshots (chain_id, asset_key, observed_at desc);

-- 5. Money arriving on chain. One row per transfer, matched to an account by the
--    sender's already-verified wallet address; idempotent on chain + tx + log.
create table public.crypto_deposits (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null,
  asset_key text not null,
  tx_hash text not null,
  log_index integer not null default 0,
  block_number bigint not null,
  from_address text not null,
  to_address text not null,
  units numeric(40,0) not null,
  usd_cents bigint not null,
  price_snapshot_id uuid references public.crypto_price_snapshots (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete restrict,
  status text not null default 'DETECTED',
  ledger_tx_id uuid references public.ledger_transactions (id) on delete restrict,
  detected_at timestamp with time zone not null default now(),
  confirmed_at timestamp with time zone,
  credited_at timestamp with time zone,
  closed_reason text,
  created_at timestamp with time zone not null default now(),
  constraint crypto_deposits_asset_fk foreign key (chain_id, asset_key)
    references public.chain_assets (chain_id, asset_key) on delete restrict,
  constraint crypto_deposits_unique unique (chain_id, tx_hash, log_index),
  constraint crypto_deposits_status_check check (status in ('DETECTED','CONFIRMED','CREDITED','REJECTED','ORPHANED')),
  constraint crypto_deposits_amount_check check (units > 0 and usd_cents >= 0),
  constraint crypto_deposits_block_check check (block_number >= 0),
  constraint crypto_deposits_log_check check (log_index >= 0),
  constraint crypto_deposits_address_check check (
    from_address ~* '^0x[0-9a-f]{40}$' and to_address ~* '^0x[0-9a-f]{40}$'
  ),
  constraint crypto_deposits_hash_check check (tx_hash ~* '^0x[0-9a-f]{64}$')
);

create index crypto_deposits_user_idx on public.crypto_deposits (user_id, created_at desc);
create index crypto_deposits_open_idx on public.crypto_deposits (status, block_number);

-- 6. Money leaving on chain. A request holds the balance first, then the worker sends.
create table public.crypto_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  chain_id bigint not null,
  asset_key text not null,
  to_address text not null,
  units numeric(40,0) not null,
  usd_cents bigint not null,
  fee_usd_cents bigint not null default 0,
  status text not null default 'PENDING',
  review_required boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete restrict,
  reviewed_at timestamp with time zone,
  hold_ledger_tx_id uuid references public.ledger_transactions (id) on delete restrict,
  settle_ledger_tx_id uuid references public.ledger_transactions (id) on delete restrict,
  release_ledger_tx_id uuid references public.ledger_transactions (id) on delete restrict,
  tx_hash text,
  attempts integer not null default 0,
  last_error text,
  created_at timestamp with time zone not null default now(),
  submitted_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  closed_at timestamp with time zone,
  constraint crypto_withdrawals_asset_fk foreign key (chain_id, asset_key)
    references public.chain_assets (chain_id, asset_key) on delete restrict,
  constraint crypto_withdrawals_status_check check (status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','CONFIRMED','REJECTED','FAILED','RELEASED')),
  constraint crypto_withdrawals_amount_check check (units > 0 and usd_cents > 0 and fee_usd_cents >= 0),
  constraint crypto_withdrawals_attempts_check check (attempts between 0 and 100),
  constraint crypto_withdrawals_address_check check (to_address ~* '^0x[0-9a-f]{40}$'),
  constraint crypto_withdrawals_hash_check check (tx_hash is null or tx_hash ~* '^0x[0-9a-f]{64}$')
);

create index crypto_withdrawals_user_idx on public.crypto_withdrawals (user_id, created_at desc);
create index crypto_withdrawals_open_idx on public.crypto_withdrawals (status, created_at);

-- 7. Guards: the allowlist is read-only, money records are never deleted, and a
--    closed record cannot be reopened.
create or replace function public.crypto_allowlist_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'the blockchain allowlist is read-only: it can only change through a migration'
    using errcode = '42501';
end;
$$;

create trigger chain_networks_readonly
  before update or delete on public.chain_networks
  for each row execute function public.crypto_allowlist_guard();

create trigger chain_assets_readonly
  before update or delete on public.chain_assets
  for each row execute function public.crypto_allowlist_guard();

create trigger chain_treasury_readonly
  before update or delete on public.chain_treasury_accounts
  for each row execute function public.crypto_allowlist_guard();

create or replace function public.crypto_deposit_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'crypto deposits are never deleted'
      using errcode = '42501';
  end if;
  if old.status in ('CREDITED','REJECTED','ORPHANED') then
    raise exception 'crypto deposit % is already closed', old.id
      using errcode = '42501';
  end if;
  if new.status = 'CREDITED' and new.ledger_tx_id is null then
    raise exception 'a credited deposit must reference its ledger transaction'
      using errcode = '42501';
  end if;
  if new.status = 'CREDITED' and new.user_id is null then
    raise exception 'a credited deposit must belong to exactly one account'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger crypto_deposits_guard
  before update or delete on public.crypto_deposits
  for each row execute function public.crypto_deposit_guard();

create or replace function public.crypto_withdrawal_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'crypto withdrawals are never deleted'
      using errcode = '42501';
  end if;
  if old.status in ('CONFIRMED','REJECTED','RELEASED') then
    raise exception 'crypto withdrawal % is already closed', old.id
      using errcode = '42501';
  end if;
  if new.status in ('SUBMITTING','SUBMITTED','CONFIRMED') and new.tx_hash is null then
    raise exception 'a sending withdrawal must carry its transaction hash'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger crypto_withdrawals_guard
  before update or delete on public.crypto_withdrawals
  for each row execute function public.crypto_withdrawal_guard();

create trigger chain_networks_no_truncate before truncate on public.chain_networks
  for each statement execute function public._no_truncate();
create trigger chain_assets_no_truncate before truncate on public.chain_assets
  for each statement execute function public._no_truncate();
create trigger chain_treasury_no_truncate before truncate on public.chain_treasury_accounts
  for each statement execute function public._no_truncate();
create trigger crypto_price_snapshots_no_truncate before truncate on public.crypto_price_snapshots
  for each statement execute function public._no_truncate();
create trigger crypto_deposits_no_truncate before truncate on public.crypto_deposits
  for each statement execute function public._no_truncate();
create trigger crypto_withdrawals_no_truncate before truncate on public.crypto_withdrawals
  for each statement execute function public._no_truncate();

-- 8. Access: the platform's own server code only. No browser or anonymous access
--    to any of these records, and no access rules that would allow one.
grant all on public.chain_networks to service_role;
grant all on public.chain_assets to service_role;
grant all on public.chain_treasury_accounts to service_role;
grant all on public.crypto_price_snapshots to service_role;
grant all on public.crypto_deposits to service_role;
grant all on public.crypto_withdrawals to service_role;

revoke all on public.chain_networks from anon, authenticated;
revoke all on public.chain_assets from anon, authenticated;
revoke all on public.chain_treasury_accounts from anon, authenticated;
revoke all on public.crypto_price_snapshots from anon, authenticated;
revoke all on public.crypto_deposits from anon, authenticated;
revoke all on public.crypto_withdrawals from anon, authenticated;

alter table public.chain_networks enable row level security;
alter table public.chain_assets enable row level security;
alter table public.chain_treasury_accounts enable row level security;
alter table public.crypto_price_snapshots enable row level security;
alter table public.crypto_deposits enable row level security;
alter table public.crypto_withdrawals enable row level security;

-- 9. The allowlist itself: Base Sepolia only, ETH and test USDC, one shared
--    deposit address and one payout address (the verified platform wallet).
insert into public.chain_networks
  (chain_id, name, network_mode, safe_confirmations, finalized_confirmations)
values
  (84532, 'Base Sepolia', 'testnet', 3, 32)
on conflict (chain_id) do nothing;

insert into public.chain_assets
  (chain_id, asset_key, display_name, settlement_kind, contract_address, decimals,
   price_feed_address, usd_per_unit, min_deposit_units, ledger_asset, ledger_account_type)
values
  (84532, 'USDC', 'USD Coin (test)', 'erc20',
   '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 6, null, 1, 100000,
   'TEST_USD', 'test_credit'),
  (84532, 'ETH', 'Ether (test)', 'native', null, 18,
   '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', null, 1000000000000000,
   'TEST_USD', 'test_credit')
on conflict (chain_id, asset_key) do nothing;

insert into public.chain_treasury_accounts (chain_id, address, role)
values
  (84532, '0x9EAff85db9A2559eC958740A6a3b523751237987', 'deposit'),
  (84532, '0x9EAff85db9A2559eC958740A6a3b523751237987', 'payout')
on conflict (chain_id, address, role) do nothing;
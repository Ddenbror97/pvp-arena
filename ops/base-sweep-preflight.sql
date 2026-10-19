-- Read-only production preflight for the Base sweep rollout.
-- Do not read job credentials, signed transaction bytes, or HTTP response rows.
-- The HTTP response table has no url column, and its body can contain the job credential.

select version
from supabase_migrations.schema_migrations
where version in (
  '20261018233000',
  '20261019010000',
  '20261019020000'
)
order by version;

select derivation_version, count(*) as rows
from public.crypto_deposit_addresses
where chain_id = 8453
group by derivation_version
order by derivation_version;

select role, lower(address) as address, is_active
from public.chain_treasury_accounts
where chain_id = 8453 and is_active
order by role;

select asset_key, lower(contract_address) as contract_address, is_enabled
from public.chain_assets
where chain_id = 8453 and asset_key in ('ETH', 'USDC');

select status, count(*) as rows
from public.crypto_withdrawals
where status in ('SUBMITTING', 'SUBMITTED', 'APPROVED', 'LIQUIDITY_PENDING')
group by status;

select jobname, schedule, active
from cron.job
where jobname = 'pvp-minute-dispatch';

select
  pg_get_functiondef('public.crypto_my_activity(uuid)'::regprocedure) like '%bitcoin_payouts%'
    as keeps_bitcoin_payouts,
  pg_get_functiondef('public.crypto_my_activity(uuid)'::regprocedure) like '%_withdraw_basis_peek%'
    as keeps_withdraw_basis,
  pg_get_functiondef('public.crypto_my_activity(uuid)'::regprocedure) like '%derivation_version%'
    as exposes_derivation_version;

select public.crypto_sweep_readiness();

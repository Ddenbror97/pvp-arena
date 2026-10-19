-- Read-only sweep monitoring. Aggregates only.
-- Do not read signed transaction bytes, job credentials, or HTTP response rows.

select public.crypto_sweep_ops_snapshot();

select status, count(*) as rows,
       extract(epoch from (clock_timestamp() - min(created_at)))::bigint as oldest_seconds
from public.crypto_deposit_sweeps
where chain_id = 8453
group by status
order by status;

select derivation_version, count(*) as rows
from public.crypto_deposit_addresses
where chain_id = 8453
group by derivation_version
order by derivation_version;

select status, count(*) as rows
from public.crypto_nonce_leases
where chain_id = 8453
group by status
order by status;

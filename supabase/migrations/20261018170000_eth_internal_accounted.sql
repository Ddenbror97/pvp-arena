-- Exact wei already recorded per deposit address. The watcher compares this with the
-- on-chain balance to find ETH that arrived inside a contract call (exchange payouts).
-- Numeric is returned as text so a full ETH value is not rounded in JSON.

create or replace function public.crypto_eth_accounted(p_chain bigint)
returns table (to_address text, units text)
language sql
stable
security definer
set search_path = public
as $$
  select lower(d.to_address), sum(d.units)::text
  from public.crypto_deposits d
  where d.chain_id = p_chain
    and d.asset_key = 'ETH'
    and d.status in ('DETECTED', 'CONFIRMED', 'CREDITED')
  group by lower(d.to_address);
$$;

revoke all on function public.crypto_eth_accounted(bigint) from public;
grant execute on function public.crypto_eth_accounted(bigint) to service_role;

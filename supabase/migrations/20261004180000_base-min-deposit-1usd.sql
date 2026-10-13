-- Product floors: $1 deposits and $5 withdrawals on Base.
-- Bitcoin keeps its own $5 floors in the worker. Ethereum mainnet stays at $25 and disabled.
-- The asset unit floor is only a scan filter. The chain cent floor is what gets credited.
-- USDC is pegged, so 1_000_000 units is $1. ETH uses 0.00005 ETH so a $1 send is still
-- seen if the price rises well above today's, and anything the oracle prices under $1 is rejected.

update public.crypto_settings
set min_deposit_cents = 100,
    min_withdrawal_cents = 500;

drop trigger chain_networks_readonly on public.chain_networks;
update public.chain_networks
set min_deposit_cents = 100,
    min_withdrawal_cents = 500
where chain_id = 8453;
create trigger chain_networks_readonly
  before update or delete on public.chain_networks
  for each row execute function public.crypto_allowlist_guard();

drop trigger chain_assets_readonly on public.chain_assets;
update public.chain_assets
set min_deposit_units = 1000000
where chain_id = 8453 and asset_key = 'USDC';
update public.chain_assets
set min_deposit_units = 50000000000000
where chain_id = 8453 and asset_key = 'ETH';
create trigger chain_assets_readonly
  before update or delete on public.chain_assets
  for each row execute function public.crypto_allowlist_guard();

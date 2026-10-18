-- Product floor: $2 minimum deposit on Base (ETH, USDC). Bitcoin uses BTCPAY_MIN_DEPOSIT_CENTS on the worker.
-- The asset unit floors are scan filters. 2_000_000 USDC units is $2. 0.0001 ETH still sees a $2
-- send if the price rises; the chain cent floor is what gets credited.

update public.crypto_settings
set min_deposit_cents = 200
where min_deposit_cents < 200;

drop trigger if exists chain_networks_readonly on public.chain_networks;
update public.chain_networks
set min_deposit_cents = 200
where chain_id = 8453 and min_deposit_cents < 200;
create trigger chain_networks_readonly
  before update or delete on public.chain_networks
  for each row execute function public.crypto_allowlist_guard();

drop trigger if exists chain_assets_readonly on public.chain_assets;
update public.chain_assets
set min_deposit_units = 2000000
where chain_id = 8453 and asset_key = 'USDC';
update public.chain_assets
set min_deposit_units = 100000000000000
where chain_id = 8453 and asset_key = 'ETH';
create trigger chain_assets_readonly
  before update or delete on public.chain_assets
  for each row execute function public.crypto_allowlist_guard();

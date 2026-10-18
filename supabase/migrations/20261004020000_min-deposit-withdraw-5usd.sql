-- $5 USD floor for Base ETH/USDC deposits and withdrawals.
update public.crypto_settings
set min_deposit_cents = 500, min_withdrawal_cents = 500;

drop trigger chain_networks_readonly on public.chain_networks;
update public.chain_networks
set min_deposit_cents = 500, min_withdrawal_cents = 500
where chain_id = 8453;
create trigger chain_networks_readonly
  before update or delete on public.chain_networks
  for each row execute function public.crypto_allowlist_guard();

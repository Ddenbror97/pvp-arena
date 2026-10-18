DROP TRIGGER chain_networks_readonly ON public.chain_networks;
DROP TRIGGER chain_assets_readonly ON public.chain_assets;
DROP TRIGGER chain_treasury_readonly ON public.chain_treasury_accounts;

UPDATE public.chain_networks SET is_enabled = false WHERE chain_id = 84532;
UPDATE public.chain_assets SET is_enabled = false WHERE chain_id = 84532;
UPDATE public.chain_treasury_accounts SET is_active = false WHERE chain_id = 84532;

CREATE TRIGGER chain_networks_readonly BEFORE UPDATE OR DELETE ON public.chain_networks FOR EACH ROW EXECUTE FUNCTION public.crypto_allowlist_guard();
CREATE TRIGGER chain_assets_readonly BEFORE UPDATE OR DELETE ON public.chain_assets FOR EACH ROW EXECUTE FUNCTION public.crypto_allowlist_guard();
CREATE TRIGGER chain_treasury_readonly BEFORE UPDATE OR DELETE ON public.chain_treasury_accounts FOR EACH ROW EXECUTE FUNCTION public.crypto_allowlist_guard();

CREATE OR REPLACE FUNCTION public._no_testnet_enable() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
begin
  if new.is_enabled and new.network_mode <> 'mainnet' then raise exception 'TESTNET_REMOVED'; end if;
  return new;
end $$;
CREATE TRIGGER no_testnet_enable BEFORE INSERT ON public.chain_networks FOR EACH ROW EXECUTE FUNCTION public._no_testnet_enable();

UPDATE public.crypto_settings SET withdrawals_enabled = true WHERE chain_id = 8453;
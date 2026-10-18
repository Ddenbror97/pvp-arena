DROP TRIGGER chain_networks_readonly ON public.chain_networks;
DROP TRIGGER chain_assets_readonly ON public.chain_assets;

UPDATE public.chain_networks SET is_enabled = true WHERE chain_id = 8453;
UPDATE public.chain_assets SET is_enabled = true WHERE chain_id = 8453;

CREATE TRIGGER chain_networks_readonly BEFORE UPDATE OR DELETE ON public.chain_networks FOR EACH ROW EXECUTE FUNCTION public.crypto_allowlist_guard();
CREATE TRIGGER chain_assets_readonly BEFORE UPDATE OR DELETE ON public.chain_assets FOR EACH ROW EXECUTE FUNCTION public.crypto_allowlist_guard();
-- Balance updates: default replica identity omits owner_id from the replication
-- stream on UPDATE, so Realtime cannot evaluate the owner RLS policy and drops
-- the event. FULL replica identity makes owner-scoped balance events deliverable.
ALTER TABLE public.wallet_accounts REPLICA IDENTITY FULL;

-- Players may read their own deposits (needed for live "confirming" feedback).
GRANT SELECT ON public.crypto_deposits TO authenticated;
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own deposits"
  ON public.crypto_deposits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.crypto_deposits REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_deposits;

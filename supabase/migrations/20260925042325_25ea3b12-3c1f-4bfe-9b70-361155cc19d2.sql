-- Payout records: admin only
DROP POLICY IF EXISTS "coinflip payouts public" ON public.coinflip_payouts;
CREATE POLICY "Admins read coinflip payouts" ON public.coinflip_payouts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "roulette payouts public" ON public.roulette_payouts;
CREATE POLICY "Admins read roulette payouts" ON public.roulette_payouts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Coinflip entries: own rows + admin
DROP POLICY IF EXISTS "coinflip entries public" ON public.coinflip_entries;
CREATE POLICY "Players read own coinflip entries" ON public.coinflip_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Jackpot entries stay public for fairness checks, but hide internal references
REVOKE SELECT ON public.jackpot_entries FROM anon, authenticated;
GRANT SELECT (id, game_id, user_id, amount, ticket_start, ticket_end, created_at)
  ON public.jackpot_entries TO anon, authenticated;

-- Profiles stay public for names/avatars, but hide age and self-exclusion data
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, avatar_url, created_at) ON public.profiles TO anon, authenticated;
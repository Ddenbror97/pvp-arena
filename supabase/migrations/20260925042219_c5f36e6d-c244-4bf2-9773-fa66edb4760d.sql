DROP POLICY IF EXISTS "payouts public" ON public.jackpot_payouts;
CREATE POLICY "Admins read jackpot payouts" ON public.jackpot_payouts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roulette bets public" ON public.roulette_bets;
CREATE POLICY "Players read own roulette bets" ON public.roulette_bets
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.roulette_round_bets(p_game_id bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'game_id', b.game_id, 'user_id', b.user_id, 'color', b.color,
    'amount', b.amount, 'multiplier_bps', b.multiplier_bps, 'status', b.status,
    'payout_amount', b.payout_amount, 'created_at', b.created_at, 'settled_at', b.settled_at,
    'player', jsonb_build_object('username', p.username, 'avatar_url', p.avatar_url)
  ) ORDER BY b.created_at), '[]'::jsonb)
  FROM (SELECT * FROM roulette_bets WHERE game_id = p_game_id ORDER BY created_at LIMIT 500) b
  LEFT JOIN profiles p ON p.id = b.user_id;
$$;
REVOKE ALL ON FUNCTION public.roulette_round_bets(bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.roulette_round_bets(bigint) TO anon, authenticated;
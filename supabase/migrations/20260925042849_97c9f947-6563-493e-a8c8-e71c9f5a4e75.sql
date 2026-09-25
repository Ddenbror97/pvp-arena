REVOKE EXECUTE ON FUNCTION public.claim_test_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_test_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_test_credits(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.roulette_round_bets(p_game_id bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'game_id', b.game_id, 'user_id', b.user_id, 'color', b.color,
    'amount', b.amount, 'multiplier_bps', b.multiplier_bps, 'status', b.status,
    'payout_amount', b.payout_amount, 'created_at', b.created_at, 'settled_at', b.settled_at,
    'player', jsonb_build_object('username', p.username, 'avatar_url', p.avatar_url)
  ) ORDER BY b.created_at), '[]'::jsonb)
  FROM (SELECT * FROM public.roulette_bets WHERE game_id = p_game_id ORDER BY created_at LIMIT 500) b
  LEFT JOIN public.profiles p ON p.id = b.user_id;
$$;
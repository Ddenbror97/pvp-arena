-- 5% house rake on new jackpot games. Each game snapshots rake_bps at creation, so the round
-- already open keeps the rake it was created with. Roulette stays fee-free (edge is in the wheel).
update public.jackpot_config set rake_bps = 500;

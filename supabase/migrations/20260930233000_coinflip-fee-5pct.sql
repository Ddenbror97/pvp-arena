-- 5% house fee on new coinflip games. Each game snapshots fee_bps at creation, so games
-- already open keep the fee they were created with.
update public.coinflip_config set fee_bps = 500;

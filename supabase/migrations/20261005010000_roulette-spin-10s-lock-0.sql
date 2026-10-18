-- Longer strip (7s → 10s). Lock delay is 0 so the spin clock starts on the lock tick.
-- Open game rows keep their copied timing; the next opened round reads this config.
update public.roulette_config
set spin_ms = 10000, lock_ms = 0;

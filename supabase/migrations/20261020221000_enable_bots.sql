-- Turn automated opponents on. The house bot bankroll stays at zero until a later top-up.
-- Partner credit cannot be withdrawn, and it is not part of bot exposure or this bankroll.
update public.bot_config
set enabled = true,
    coinflip_enabled = true,
    poker_enabled = true,
    max_exposure_cents = 2500000
where id = true;

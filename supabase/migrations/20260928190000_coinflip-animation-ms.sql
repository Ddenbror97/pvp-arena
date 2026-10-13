-- Match coinflip flip length to the slower client animation. Outcome math is unchanged.
alter table public.coinflip_config alter column animation_ms set default 5600;
update public.coinflip_config set animation_ms = 5600 where animation_ms = 3500;

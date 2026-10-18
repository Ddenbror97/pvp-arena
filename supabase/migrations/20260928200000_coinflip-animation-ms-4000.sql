-- Match coinflip flip length to the 4s client animation. Outcome math is unchanged.
alter table public.coinflip_config alter column animation_ms set default 4000;
update public.coinflip_config set animation_ms = 4000 where animation_ms in (3500, 5600);

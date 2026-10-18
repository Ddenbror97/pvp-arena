-- Match coinflip flip length to the 3.8s ease-out. Outcome math is unchanged.
alter table public.coinflip_config alter column animation_ms set default 3800;
update public.coinflip_config set animation_ms = 3800 where animation_ms in (3500, 4000, 5600);

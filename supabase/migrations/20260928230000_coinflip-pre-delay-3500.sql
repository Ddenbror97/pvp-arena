-- Match the pre-flip countdown to 3.5s. Flip length and outcome math are unchanged.
alter table public.coinflip_config alter column pre_delay_ms set default 3500;
update public.coinflip_config set pre_delay_ms = 3500 where pre_delay_ms = 3000;

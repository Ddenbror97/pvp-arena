-- P2P Slott: an idle player is auto-spun after 3.5 s instead of 20 s.
-- Matches snapshot turn_seconds at creation, so games already running keep their timer.
alter table public.slot_config drop constraint slot_config_turn_seconds_check;
alter table public.slot_config
  alter column turn_seconds type numeric(5, 2),
  alter column turn_seconds set default 3.5;
alter table public.slot_config
  add constraint slot_config_turn_seconds_check check (turn_seconds between 3 and 120);
alter table public.slot_games alter column turn_seconds type numeric(5, 2);

update public.slot_config set turn_seconds = 3.5, updated_at = now();

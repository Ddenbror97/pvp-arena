-- Roulette wheel v4: 33 slots, 16 Purple (RED), 16 Silver (BLACK), 1 Green, paying 2x, 2x and 14x.
-- Green lands 1 time in 33 (3.03%). Purple and Silver return 32/33 and Green 14/33 before the
-- 5% win fee. The wheel check trigger enforces the layout size and the <= 100% RTP bound.
--
-- Only new rounds use it: _roulette_ensure_open copies roulette_config.wheel_version onto the
-- round row, and bets, the draw, settlement and fairness all read the round's stored version.
-- Version 3 rows stay as they are (roulette_wheels is immutable).
insert into public.roulette_wheels (version, slot_count, layout, multipliers_bps)
values (4, 33,
  array['RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK',
        'GREEN',
        'RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK']::public.roulette_color[],
  '{"RED":20000,"BLACK":20000,"GREEN":140000}'::jsonb);

update public.roulette_config set wheel_version = 4, updated_at = now();

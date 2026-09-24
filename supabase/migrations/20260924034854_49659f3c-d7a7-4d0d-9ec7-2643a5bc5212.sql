insert into public.roulette_wheels (version, slot_count, layout, multipliers_bps)
values (3, 15,
  array['RED','BLACK','RED','BLACK','RED','BLACK','GREEN','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK']::public.roulette_color[],
  '{"RED":20000,"BLACK":20000,"GREEN":140000}'::jsonb);
update public.roulette_config set wheel_version = 3;
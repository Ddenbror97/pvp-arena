create or replace function public._roulette_wheel_check() returns trigger language plpgsql set search_path = '' as $$
declare c text; n integer; m integer; k text;
begin
  if array_length(new.layout, 1) is distinct from new.slot_count then raise exception 'WHEEL_LAYOUT_SIZE'; end if;
  if jsonb_typeof(new.multipliers_bps) <> 'object' then raise exception 'WHEEL_MULTIPLIERS_INVALID'; end if;
  -- every colour on the wheel needs a multiplier, and every multiplier needs a colour on the wheel
  for c in select distinct x::text from unnest(new.layout) x loop
    if not (new.multipliers_bps ? c) then raise exception 'WHEEL_COLOR_INVALID %', c; end if;
  end loop;
  for k in select jsonb_object_keys(new.multipliers_bps) loop
    select count(*) into n from unnest(new.layout) x where x::text = k;
    if jsonb_typeof(new.multipliers_bps -> k) <> 'number' then raise exception 'WHEEL_COLOR_INVALID %', k; end if;
    m := (new.multipliers_bps ->> k)::integer;
    if n < 1 or m < 10000 then raise exception 'WHEEL_COLOR_INVALID %', k; end if;
    if n::bigint * m > new.slot_count::bigint * 10000 then raise exception 'WHEEL_RTP_ABOVE_100 %', k; end if;
  end loop;
  return new;
end $$;
revoke execute on function public._roulette_wheel_check() from public, anon, authenticated;

insert into public.roulette_wheels (version, slot_count, layout, multipliers_bps) values (2, 15,
  array['GREEN','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK','RED','BLACK']::public.roulette_color[],
  '{"RED": 20000, "BLACK": 20000, "GREEN": 140000}'::jsonb);

alter table public.roulette_config alter column spin_ms set default 7000;
update public.roulette_config set wheel_version = 2, spin_ms = 7000;

-- Move only an untouched open round (no bets) onto the new wheel/timing.
alter table public.roulette_games disable trigger roulette_game_guard;
update public.roulette_games set wheel_version = 2, spin_ms = 7000 where status = 'WAITING' and bet_count = 0;
alter table public.roulette_games enable trigger roulette_game_guard;
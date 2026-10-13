-- Equipping the cosmetic that is already in its slot clears that slot.
-- A different frame or crown still replaces the one currently worn.

create or replace function public.prestige_equip(p_cosmetic uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c public.cosmetics;
  clearing boolean := false;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  if p_cosmetic is null then raise exception 'BAD_REQUEST'; end if;
  perform public.prestige_sync_user(uid);
  select * into c from public.cosmetics where id = p_cosmetic and active;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not exists (select 1 from public.user_cosmetics where user_id = uid and cosmetic_id = c.id) then
    raise exception 'LOCKED';
  end if;
  if c.type = 'frame' then
    select equipped_frame_id = c.id into clearing from public.user_prestige where user_id = uid;
    update public.user_prestige
      set equipped_frame_id = case when clearing then null else c.id end,
          updated_at = clock_timestamp()
      where user_id = uid;
  elsif c.type = 'crown' then
    select equipped_crown_id = c.id into clearing from public.user_prestige where user_id = uid;
    update public.user_prestige
      set equipped_crown_id = case when clearing then null else c.id end,
          updated_at = clock_timestamp()
      where user_id = uid;
  else
    raise exception 'BAD_REQUEST';
  end if;
  perform public._audit(
    uid,
    case when clearing then 'prestige_cosmetic_unequipped' else 'prestige_cosmetic_equipped' end,
    null,
    jsonb_build_object('cosmetic', c.id, 'type', c.type)
  );
  return public.prestige_state();
end $$;

revoke all on function public.prestige_equip(uuid) from public, anon, authenticated;
grant execute on function public.prestige_equip(uuid) to authenticated;

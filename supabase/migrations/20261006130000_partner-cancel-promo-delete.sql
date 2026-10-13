-- Partners can take their own campaign off the public list before prizes are created.
-- Admins can delete a promo code that has never been claimed and never attributed a player.

create or replace function public.leaderboard_partner_cancel(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._lb_require_partner(); c public.leaderboard_campaigns;
begin
  select * into c from leaderboard_campaigns where id = p_campaign and partner_user_id = uid for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if c.awards_created or c.status in ('settling', 'under_review', 'completed') then
    raise exception 'AWARDS_EXIST';
  end if;
  if c.status not in ('draft', 'pending_approval', 'rejected', 'scheduled', 'active', 'suspended', 'closing') then
    raise exception 'NOT_ALLOWED';
  end if;
  update leaderboard_campaigns
    set status = 'cancelled',
        closed_at = coalesce(closed_at, clock_timestamp()),
        updated_at = clock_timestamp()
    where id = c.id;
  perform public._audit(uid, 'leaderboard_cancelled', null, jsonb_build_object('campaign_id', c.id, 'by', 'partner'));
  return public.leaderboard_partner_get(c.id);
end $$;

create or replace function public.promo_admin_delete(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  if p_id is null then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from public.promo_claims where promo_code_id = p_id)
     or exists (select 1 from public.partner_referrals where promo_code_id = p_id) then
    raise exception 'CODE_USED';
  end if;
  delete from public.promo_codes where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform public._audit(uid, 'promo_deleted', null, jsonb_build_object('id', p_id));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.promo_admin_delete(uuid) from public, anon;
grant execute on function public.promo_admin_delete(uuid) to authenticated;

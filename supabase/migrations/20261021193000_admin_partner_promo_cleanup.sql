-- Admin partners: removed partners leave the list. Credits left is the promotional
-- grant still backed by the wallet, not the lifetime top-up. Balance includes
-- real USD and any leftover test-credit wallet.
-- Promo codes: a claimed code can be deleted. The row leaves the admin list.
-- Claim and referral history stay, so an open wager is unchanged.

alter table public.promo_codes
  add column if not exists deleted_at timestamptz;

create or replace function public._partner_admin_money(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with w as (
    select
      coalesce(sum(balance) filter (
        where account_type = 'real' and asset = 'USD' and kind = 'user_available'
      ), 0) as real_avail,
      coalesce(sum(balance) filter (
        where account_type = 'real' and asset = 'USD' and kind = 'user_locked'
      ), 0) as real_locked,
      coalesce(sum(balance) filter (
        where account_type = 'test_credit' and kind = 'user_available'
      ), 0) as test_avail,
      coalesce(sum(balance) filter (
        where account_type = 'test_credit' and kind = 'user_locked'
      ), 0) as test_locked
    from public.wallet_accounts
    where owner_id = p_user
  ),
  g as (
    select
      coalesce((select sum(amount_cents) from public.partner_topups where user_id = p_user), 0)
      - coalesce((select sum(amount_cents) from public.partner_credit_removals where user_id = p_user), 0)
      as net
  ),
  e as (
    select coalesce((select eligible from public.withdraw_basis_bucket where user_id = p_user), 0) as eligible
  )
  select jsonb_build_object(
    'real_available_cents', trunc(w.real_avail)::bigint,
    'available_cents', trunc(w.real_avail + w.test_avail)::bigint,
    'locked_cents', trunc(w.real_locked + w.test_locked)::bigint,
    'balance_cents', trunc(w.real_avail + w.real_locked + w.test_avail + w.test_locked)::bigint,
    'credits_cents', trunc(least(
      greatest(g.net, 0),
      greatest(
        w.real_avail + w.real_locked + w.test_avail + w.test_locked - greatest(e.eligible, 0),
        0
      )
    ))::bigint
  )
  from w, g, e;
$$;

revoke all on function public._partner_admin_money(uuid) from public, anon, authenticated;

create or replace function public.partner_admin_list(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin();
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  return jsonb_build_object(
    'settings', (select jsonb_build_object('min_topup_cents', min_topup_cents, 'max_topup_cents', max_topup_cents) from public.partner_settings where id),
    'rows', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select p.user_id, pr.username, p.active, p.leaderboard, p.commission_bps, p.created_at, p.removed_at,
        coalesce((select jsonb_agg(c.code order by c.created_at) from public.promo_codes c
          where c.partner_user_id = p.user_id and c.active and c.deleted_at is null), '[]'::jsonb) as codes,
        (select count(*) from public.partner_referrals r where r.partner_user_id = p.user_id) as attributed_users,
        (public._partner_admin_money(p.user_id)->>'credits_cents')::bigint as credits_cents,
        (public._partner_admin_money(p.user_id)->>'balance_cents')::bigint as balance_cents,
        public._partner_window(p.user_id, p.commission_bps, p_from, p_to) as period
      from public.partners p
      join public.profiles pr on pr.id = p.user_id
      where p.active
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.partner_admin_list(timestamptz, timestamptz) from public, anon;
grant execute on function public.partner_admin_list(timestamptz, timestamptz) to authenticated;

create or replace function public.partner_admin_detail(p_user uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); p public.partners; now_ts timestamptz := clock_timestamp();
  money jsonb; real_avail bigint;
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  select * into p from public.partners where user_id = p_user;
  if p.user_id is null then raise exception 'NOT_PARTNER'; end if;
  money := public._partner_admin_money(p.user_id);
  real_avail := (money->>'real_available_cents')::bigint;
  return jsonb_build_object(
    'user_id', p.user_id,
    'username', (select username from public.profiles where id = p.user_id),
    'email', (select email from auth.users where id = p.user_id),
    'active', p.active,
    'leaderboard', p.leaderboard,
    'commission_bps', p.commission_bps,
    'note', p.note,
    'created_at', p.created_at,
    'removed_at', p.removed_at,
    'withdrawal', case when p.active then 'blocked' when public._partner_release_hold(p.user_id) > 0 then 'held' else 'normal' end,
    'held_cents', case when p.active then null else least(real_avail, public._partner_release_block(p.user_id, real_avail)) end,
    'available_cents', (money->>'available_cents')::bigint,
    'locked_cents', (money->>'locked_cents')::bigint,
    'credits_cents', (money->>'credits_cents')::bigint,
    'removals', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select r.id, r.amount_cents, r.note, r.created_at, ap.username as admin
      from public.partner_credit_removals r left join public.profiles ap on ap.id = r.admin_id
      where r.user_id = p.user_id order by r.created_at desc limit 100
    ) x), '[]'::jsonb),
    'codes', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.code, c.reward_cents, c.max_claims, c.claim_count, c.expires_at, c.active, c.created_at,
        (select count(*) from public.partner_referrals r where r.promo_code_id = c.id) as attributed_users
      from public.promo_codes c
      where c.partner_user_id = p.user_id and c.deleted_at is null
    ) x), '[]'::jsonb),
    'topups', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select t.id, t.amount_cents, t.note, t.created_at, ap.username as admin
      from public.partner_topups t left join public.profiles ap on ap.id = t.admin_id
      where t.user_id = p.user_id order by t.created_at desc limit 100
    ) x), '[]'::jsonb),
    'windows', jsonb_build_object(
      'd7', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '7 days', null),
      'd30', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '30 days', null),
      'd90', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '90 days', null),
      'all', public._partner_window(p.user_id, p.commission_bps, null, null),
      'range', public._partner_window(p.user_id, p.commission_bps, p_from, p_to)
    ),
    'attributed_users', (select count(*) from public.partner_referrals where partner_user_id = p.user_id),
    'users', coalesce((select jsonb_agg(x order by x.range_cents desc, x.attributed_at desc) from (
      select r.user_id, pr.username, coalesce(c.code, ac.code) as code, r.created_at as attributed_at,
        coalesce(rng.cents, 0) as range_cents, coalesce(rng.deposits, 0) as range_deposits, coalesce(al.cents, 0) as all_cents
      from public.partner_referrals r
      join public.profiles pr on pr.id = r.user_id
      left join public.promo_codes c on c.id = r.promo_code_id
      left join public.partner_acquisition_codes ac on ac.id = r.acquisition_code_id
      left join public._partner_deposits(p.user_id, p_from, p_to) rng on rng.user_id = r.user_id
      left join public._partner_deposits(p.user_id, null, null) al on al.user_id = r.user_id
      where r.partner_user_id = p.user_id
      order by coalesce(rng.cents, 0) desc, r.created_at desc
      limit 200
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.partner_admin_detail(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.partner_admin_detail(uuid, timestamptz, timestamptz) to authenticated;

create or replace function public.promo_admin_delete(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); row public.promo_codes;
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  if p_id is null then raise exception 'NOT_FOUND'; end if;
  select * into row from public.promo_codes where id = p_id;
  if row.id is null then raise exception 'NOT_FOUND'; end if;
  if row.deleted_at is not null then
    return jsonb_build_object('ok', true);
  end if;
  if exists (select 1 from public.promo_claims where promo_code_id = p_id)
     or exists (select 1 from public.partner_referrals where promo_code_id = p_id) then
    update public.promo_codes
      set deleted_at = clock_timestamp(), active = false
      where id = p_id;
  else
    delete from public.promo_codes where id = p_id;
  end if;
  perform public._audit(uid, 'promo_deleted', null, jsonb_build_object('id', p_id, 'code', row.code));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.promo_admin_delete(uuid) from public, anon;
grant execute on function public.promo_admin_delete(uuid) to authenticated;

create or replace function public.promo_admin_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  return jsonb_build_object(
    'rows', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.code, c.reward_cents, c.max_claims, c.claim_count, (c.max_claims - c.claim_count) as remaining,
        c.expires_at, c.active, c.created_at, pr.username as partner
      from public.promo_codes c
      left join public.profiles pr on pr.id = c.partner_user_id
      where c.deleted_at is null
      order by c.created_at desc
      limit 100
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.promo_admin_list() from public, anon;
grant execute on function public.promo_admin_list() to authenticated;

create or replace function public.promo_admin_update(
  p_id uuid, p_active boolean, p_max_claims integer, p_expires timestamptz, p_touch_expiry boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  if p_active is null then raise exception 'BAD_REQUEST'; end if;
  if p_max_claims is null or p_max_claims < 1 or p_max_claims > 100000 then raise exception 'BAD_CLAIMS'; end if;
  if coalesce(p_touch_expiry, false) and p_expires is not null and p_expires <= clock_timestamp() then
    raise exception 'BAD_EXPIRY';
  end if;
  update public.promo_codes
  set active = p_active,
      max_claims = p_max_claims,
      expires_at = case when coalesce(p_touch_expiry, false) then p_expires else expires_at end
  where id = p_id and deleted_at is null and p_max_claims >= claim_count;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'BAD_REQUEST'; end if;
  perform public._audit(uid, 'promo_updated', null, jsonb_build_object('id', p_id, 'active', p_active, 'max', p_max_claims));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.promo_admin_update(uuid, boolean, integer, timestamptz, boolean) from public, anon;
grant execute on function public.promo_admin_update(uuid, boolean, integer, timestamptz, boolean) to authenticated;

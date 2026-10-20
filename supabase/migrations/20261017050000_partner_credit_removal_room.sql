-- Partner reports count credits still on the account, and the detail includes removals.
-- Already applied in production as schema_migrations version 20261017050000.
-- This file exists so a fresh database matches production. Do not apply it again there.
-- credits_cents is top-ups minus removals. Deposited balances are unchanged.

create or replace function public.partner_admin_list(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin();
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  return jsonb_build_object(
    'settings', (select jsonb_build_object('min_topup_cents', min_topup_cents, 'max_topup_cents', max_topup_cents) from public.partner_settings where id),
    'rows', coalesce((select jsonb_agg(x order by x.active desc, x.created_at desc) from (
      select p.user_id, pr.username, p.active, p.leaderboard, p.commission_bps, p.created_at, p.removed_at,
        coalesce((select jsonb_agg(c.code order by c.created_at) from public.promo_codes c where c.partner_user_id = p.user_id and c.active), '[]'::jsonb) as codes,
        (select count(*) from public.partner_referrals r where r.partner_user_id = p.user_id) as attributed_users,
        (
          (select coalesce(sum(t.amount_cents), 0) from public.partner_topups t where t.user_id = p.user_id)
          - (select coalesce(sum(r.amount_cents), 0) from public.partner_credit_removals r where r.user_id = p.user_id)
        ) as credits_cents,
        (select coalesce(sum(a.balance), 0) from public.wallet_accounts a
          where a.owner_id = p.user_id and a.kind in ('user_available', 'user_locked') and a.asset = 'USD' and a.account_type = 'real') as balance_cents,
        public._partner_window(p.user_id, p.commission_bps, p_from, p_to) as period
      from public.partners p
      join public.profiles pr on pr.id = p.user_id
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.partner_admin_list(timestamptz, timestamptz) from public, anon;
grant execute on function public.partner_admin_list(timestamptz, timestamptz) to authenticated;

create or replace function public.partner_admin_detail(p_user uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); p public.partners; now_ts timestamptz := clock_timestamp(); avail bigint;
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  select * into p from public.partners where user_id = p_user;
  if p.user_id is null then raise exception 'NOT_PARTNER'; end if;
  avail := (select coalesce(sum(balance), 0) from public.wallet_accounts where owner_id = p.user_id and kind = 'user_available' and asset = 'USD' and account_type = 'real');
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
    'held_cents', case when p.active then null else least(avail, public._partner_release_block(p.user_id, avail)) end,
    'available_cents', avail,
    'locked_cents', (select coalesce(sum(balance), 0) from public.wallet_accounts where owner_id = p.user_id and kind = 'user_locked' and asset = 'USD' and account_type = 'real'),
    'credits_cents', (
      (select coalesce(sum(amount_cents), 0) from public.partner_topups where user_id = p.user_id)
      - (select coalesce(sum(amount_cents), 0) from public.partner_credit_removals where user_id = p.user_id)
    ),
    'removals', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select r.id, r.amount_cents, r.note, r.created_at, ap.username as admin
      from public.partner_credit_removals r left join public.profiles ap on ap.id = r.admin_id
      where r.user_id = p.user_id order by r.created_at desc limit 100
    ) x), '[]'::jsonb),
    'codes', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.code, c.reward_cents, c.max_claims, c.claim_count, c.expires_at, c.active, c.created_at,
        (select count(*) from public.partner_referrals r where r.promo_code_id = c.id) as attributed_users
      from public.promo_codes c where c.partner_user_id = p.user_id
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

-- Partner / streamer program.
-- A partner is an existing user with an active row in partners. Admin top-ups are ordinary
-- ledger credits (kind partner_credit, house_bankroll -> user_available) recorded in
-- partner_topups. Games settle exactly as before: a normal user who beats a partner is paid
-- normal withdrawable money, and anything a partner holds stays inside the partner account
-- because every withdrawal from an active partner is refused in _assert_reward_holds.
-- On removal the account balance at that moment stays held. The hold only shrinks when the
-- balance falls below it, so funds deposited after removal are withdrawable as usual.
-- Attribution: the first partner code a user redeems links that user to the partner for good.
-- Attributed deposits are read from the existing credited deposit rows and their stored usd_cents.

alter type public.tx_kind add value if not exists 'partner_credit';

create table public.partner_settings (
  id boolean primary key default true check (id),
  min_topup_cents bigint not null default 100,
  max_topup_cents bigint not null default 200000,
  updated_at timestamptz not null default clock_timestamp(),
  constraint partner_settings_range check (min_topup_cents >= 1 and max_topup_cents >= min_topup_cents and max_topup_cents <= 10000000)
);
insert into public.partner_settings (id) values (true) on conflict (id) do nothing;
alter table public.partner_settings enable row level security;
revoke all on public.partner_settings from public, anon, authenticated;
grant all on public.partner_settings to service_role;

create table public.partners (
  user_id uuid primary key references public.profiles (id) on delete restrict,
  active boolean not null default true,
  commission_bps integer not null default 0 check (commission_bps between 0 and 10000),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default clock_timestamp(),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id),
  release_hold_cents bigint not null default 0 check (release_hold_cents >= 0),
  constraint partners_removed check (
    (active and removed_at is null and release_hold_cents = 0)
    or (not active and removed_at is not null)
  )
);
create index partners_active_idx on public.partners (active, created_at desc);
alter table public.partners enable row level security;
revoke all on public.partners from public, anon, authenticated;
grant all on public.partners to service_role;
create trigger no_delete before delete on public.partners for each row execute function public._immutable();
create trigger no_truncate before truncate on public.partners for each statement execute function public._no_truncate();

create table public.partner_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.partners (user_id),
  amount_cents bigint not null check (amount_cents > 0),
  note text check (note is null or char_length(note) <= 200),
  admin_id uuid not null references public.profiles (id),
  request_id uuid not null unique,
  ledger_tx_id uuid not null unique references public.ledger_transactions (id),
  created_at timestamptz not null default clock_timestamp()
);
create index partner_topups_user_idx on public.partner_topups (user_id, created_at desc);
alter table public.partner_topups enable row level security;
revoke all on public.partner_topups from public, anon, authenticated;
grant all on public.partner_topups to service_role;
create trigger no_mutation before update or delete on public.partner_topups for each row execute function public._immutable();
create trigger no_truncate before truncate on public.partner_topups for each statement execute function public._no_truncate();

alter table public.promo_codes add column partner_user_id uuid references public.partners (user_id);
create index promo_codes_partner_idx on public.promo_codes (partner_user_id) where partner_user_id is not null;

create table public.partner_referrals (
  user_id uuid primary key references public.profiles (id),
  partner_user_id uuid not null references public.partners (user_id),
  promo_code_id uuid not null references public.promo_codes (id),
  promo_claim_id uuid not null unique references public.promo_claims (id),
  created_at timestamptz not null default clock_timestamp(),
  constraint partner_referrals_not_self check (user_id <> partner_user_id)
);
create index partner_referrals_partner_idx on public.partner_referrals (partner_user_id, created_at);
alter table public.partner_referrals enable row level security;
revoke all on public.partner_referrals from public, anon, authenticated;
grant all on public.partner_referrals to service_role;
create trigger no_mutation before update or delete on public.partner_referrals for each row execute function public._immutable();
create trigger no_truncate before truncate on public.partner_referrals for each statement execute function public._no_truncate();

create index if not exists crypto_deposits_user_credited_idx on public.crypto_deposits (user_id, credited_at) where status = 'CREDITED';
create index if not exists btcpay_invoices_user_credited_idx on public.btcpay_invoices (user_id, credited_at) where status = 'CREDITED';

-- The owning partner is fixed when the code is created.
create or replace function public.promo_code_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.code is distinct from old.code or new.reward_cents is distinct from old.reward_cents
       or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at
       or new.partner_user_id is distinct from old.partner_user_id then
      raise exception 'IMMUTABLE';
    end if;
    if new.claim_count < old.claim_count or new.claim_count > new.max_claims then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end $$;

create or replace function public._is_active_partner(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partners where user_id = p_user and active);
$$;
revoke all on function public._is_active_partner(uuid) from public, anon, authenticated;

-- Balance held after removal. Removal requires nothing locked, so the hold starts equal to the
-- whole real balance. It shrinks to the lowest available+locked total reached since removal,
-- netted per ledger transaction, so moving a stake into a game or a withdrawal hold never lowers it.
create or replace function public._partner_release_hold(p_user uuid)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare p public.partners; dip bigint;
begin
  select * into p from public.partners where user_id = p_user and not active;
  if p.user_id is null or p.release_hold_cents = 0 then return 0; end if;
  select min(running) into dip from (
    select sum(sum(lp.amount)) over (order by min(lp.id)) as running
    from public.ledger_postings lp
    join public.wallet_accounts a on a.id = lp.account_id
    where a.owner_id = p_user and a.kind in ('user_available', 'user_locked') and a.asset = 'USD' and a.account_type = 'real'
      and lp.created_at >= p.removed_at
    group by lp.tx_id
  ) x;
  return greatest(0, p.release_hold_cents + least(0, coalesce(dip, 0)));
end $$;
revoke all on function public._partner_release_hold(uuid) from public, anon, authenticated;

-- Called by both withdrawal paths after the per-user withdrawal lock and the balance row lock.
create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  referral_hold bigint;
  promo_hold bigint;
  partner_hold bigint;
  bal bigint;
begin
  if public._is_active_partner(p_user) then raise exception 'PARTNER_WITHDRAWAL_BLOCKED'; end if;
  referral_hold := public.referral_unplayed_reward_cents(p_user);
  promo_hold := public.promo_restricted_cents(p_user);
  partner_hold := public._partner_release_hold(p_user);
  if p_balance - referral_hold - promo_hold - partner_hold >= p_total then return; end if;
  if partner_hold > 0 and p_balance - referral_hold - promo_hold >= p_total then
    raise exception 'PARTNER_FUNDS_HELD';
  end if;
  bal := p_balance - partner_hold;
  if promo_hold > 0 and bal - referral_hold >= p_total then
    raise exception 'PROMO_PLAYTHROUGH';
  end if;
  if referral_hold > 0 and bal - promo_hold >= p_total then
    raise exception 'REFERRAL_PLAYTHROUGH';
  end if;
  if promo_hold > 0 then raise exception 'PROMO_PLAYTHROUGH'; end if;
  if referral_hold > 0 then raise exception 'REFERRAL_PLAYTHROUGH'; end if;
  raise exception 'PARTNER_FUNDS_HELD';
end $$;
revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;

-- Server check before a withdrawal code is emailed. Records the refusal, which a raised
-- exception inside the withdrawal function cannot do.
create or replace function public.partner_withdrawal_check(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  if not public._is_active_partner(p_user) then return false; end if;
  perform public._audit(p_user, 'partner_withdrawal_blocked', null, '{}'::jsonb);
  return true;
end $$;
revoke all on function public.partner_withdrawal_check(uuid) from public, anon, authenticated;
grant execute on function public.partner_withdrawal_check(uuid) to service_role;

create or replace function public._partner_open_withdrawal(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.crypto_withdrawals
    where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')
  ) or exists (
    select 1 from public.btcpay_payouts
    where user_id = p_user and status in ('HOLD','AWAITING_APPROVAL','QUEUED')
  );
$$;
revoke all on function public._partner_open_withdrawal(uuid) from public, anon, authenticated;

create or replace function public._assert_admin()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  return uid;
end $$;
revoke all on function public._assert_admin() from public, anon, authenticated;

-- Adds a partner, reactivates a removed one, or updates commission and note.
create or replace function public.partner_admin_set(p_user uuid, p_commission_bps integer, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); p public.partners; v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_user is null then raise exception 'BAD_REQUEST'; end if;
  if p_commission_bps is null or p_commission_bps < 0 or p_commission_bps > 10000 then raise exception 'BAD_COMMISSION'; end if;
  if v_note is not null and char_length(v_note) > 500 then raise exception 'BAD_NOTE'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'USER_NOT_FOUND'; end if;
  -- Same lock the withdrawal functions take, so a withdrawal cannot start while status changes.
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  select * into p from public.partners where user_id = p_user for update;
  if p.user_id is not null and p.active then
    if p.commission_bps = p_commission_bps and p.note is not distinct from v_note then
      return jsonb_build_object('ok', true, 'status', 'unchanged');
    end if;
    update public.partners set commission_bps = p_commission_bps, note = v_note, updated_by = uid, updated_at = clock_timestamp()
    where user_id = p_user;
    perform public._audit(uid, 'partner_updated', null, jsonb_build_object('user', p_user, 'commission_bps', p_commission_bps, 'previous_bps', p.commission_bps));
    return jsonb_build_object('ok', true, 'status', 'updated');
  end if;
  if public._partner_open_withdrawal(p_user) then raise exception 'PARTNER_HAS_PENDING_WITHDRAWAL'; end if;
  if p.user_id is null then
    insert into public.partners (user_id, commission_bps, note, created_by, updated_by)
    values (p_user, p_commission_bps, v_note, uid, uid);
    perform public._audit(uid, 'partner_added', null, jsonb_build_object('user', p_user, 'commission_bps', p_commission_bps));
    return jsonb_build_object('ok', true, 'status', 'added');
  end if;
  update public.partners
  set active = true, removed_at = null, removed_by = null, release_hold_cents = 0,
      commission_bps = p_commission_bps, note = v_note, updated_by = uid, updated_at = clock_timestamp()
  where user_id = p_user;
  perform public._audit(uid, 'partner_reactivated', null, jsonb_build_object('user', p_user, 'commission_bps', p_commission_bps));
  return jsonb_build_object('ok', true, 'status', 'reactivated');
end $$;
revoke all on function public.partner_admin_set(uuid, integer, text) from public, anon;
grant execute on function public.partner_admin_set(uuid, integer, text) to authenticated;

create or replace function public.partner_admin_remove(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); p public.partners; locked bigint; avail bigint; codes int;
begin
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  select * into p from public.partners where user_id = p_user for update;
  if p.user_id is null then raise exception 'NOT_PARTNER'; end if;
  if not p.active then return jsonb_build_object('ok', true, 'status', 'already_removed'); end if;
  -- Waits for any settlement or deposit still posting to this account, so the hold sees it.
  perform 1 from public.wallet_accounts where owner_id = p_user and asset = 'USD' and account_type = 'real' for update;
  select coalesce(sum(balance) filter (where kind = 'user_locked'), 0), coalesce(sum(balance) filter (where kind = 'user_available'), 0)
  into locked, avail
  from public.wallet_accounts where owner_id = p_user and asset = 'USD' and account_type = 'real';
  if locked > 0 then raise exception 'PARTNER_HAS_OPEN_GAMES'; end if;
  update public.partners
  set active = false, removed_at = clock_timestamp(), removed_by = uid, release_hold_cents = greatest(avail, 0),
      updated_by = uid, updated_at = clock_timestamp()
  where user_id = p_user;
  update public.promo_codes set active = false where partner_user_id = p_user and active;
  get diagnostics codes = row_count;
  perform public._audit(uid, 'partner_removed', null, jsonb_build_object('user', p_user, 'held_cents', greatest(avail, 0), 'codes_disabled', codes));
  return jsonb_build_object('ok', true, 'status', 'removed', 'held_cents', greatest(avail, 0));
end $$;
revoke all on function public.partner_admin_remove(uuid) from public, anon;
grant execute on function public.partner_admin_remove(uuid) to authenticated;

-- p_request_id comes from the admin form. A retry with the same id returns the first result.
create or replace function public.partner_admin_topup(p_user uuid, p_amount_cents bigint, p_note text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); s public.partner_settings; prior public.partner_topups;
  v_note text := nullif(btrim(coalesce(p_note, '')), ''); tx uuid; topup uuid := gen_random_uuid();
  v_asset text; v_type text; v_bank public.account_kind; bank uuid;
begin
  if p_user is null or p_request_id is null then raise exception 'BAD_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtext('partner_topup:' || p_request_id::text));
  select * into prior from public.partner_topups where request_id = p_request_id;
  if prior.id is not null then
    if prior.user_id <> p_user or prior.amount_cents <> p_amount_cents then raise exception 'REQUEST_REUSED'; end if;
    return jsonb_build_object('ok', true, 'id', prior.id, 'amount_cents', prior.amount_cents, 'duplicate', true);
  end if;
  select * into s from public.partner_settings where id;
  if p_amount_cents is null or p_amount_cents < s.min_topup_cents or p_amount_cents > s.max_topup_cents then
    raise exception 'BAD_AMOUNT';
  end if;
  if v_note is not null and char_length(v_note) > 200 then raise exception 'BAD_NOTE'; end if;
  perform 1 from public.partners where user_id = p_user and active for update;
  if not found then raise exception 'NOT_PARTNER'; end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = p_user and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = p_user and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  bank := public._system_account(v_bank, v_asset, v_type);
  perform 1 from public.wallet_accounts where id = bank for update;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('partner_credit', 'partner:topup:' || p_request_id::text, v_type, p_user, 'Partner promotional credit')
  returning id into tx;
  perform public._post(tx, bank, -p_amount_cents);
  perform public._post(tx, public._user_account(p_user, 'user_available', v_asset, v_type), p_amount_cents);
  insert into public.partner_topups (id, user_id, amount_cents, note, admin_id, request_id, ledger_tx_id)
  values (topup, p_user, p_amount_cents, v_note, uid, p_request_id, tx);
  perform public._audit(uid, 'partner_credit_added', null, jsonb_build_object('user', p_user, 'cents', p_amount_cents, 'tx', tx, 'topup', topup));
  return jsonb_build_object('ok', true, 'id', topup, 'amount_cents', p_amount_cents, 'duplicate', false);
end $$;
revoke all on function public.partner_admin_topup(uuid, bigint, text, uuid) from public, anon;
grant execute on function public.partner_admin_topup(uuid, bigint, text, uuid) to authenticated;

create or replace function public.partner_admin_create_code(p_user uuid, p_code text, p_reward_cents bigint, p_max_claims integer, p_expires timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); canonical text; new_id uuid;
begin
  if not public._is_active_partner(p_user) then raise exception 'NOT_PARTNER'; end if;
  canonical := public._promo_code(p_code);
  if canonical is null then raise exception 'BAD_CODE'; end if;
  if p_reward_cents is null or p_reward_cents < 100 or p_reward_cents > 500 then raise exception 'BAD_REWARD'; end if;
  if p_max_claims is null or p_max_claims < 1 or p_max_claims > 100000 then raise exception 'BAD_CLAIMS'; end if;
  if p_expires is not null and p_expires <= clock_timestamp() then raise exception 'BAD_EXPIRY'; end if;
  insert into public.promo_codes (code, reward_cents, max_claims, expires_at, active, created_by, partner_user_id)
  values (canonical, p_reward_cents, p_max_claims, p_expires, true, uid, p_user)
  returning promo_codes.id into new_id;
  perform public._audit(uid, 'promo_created', null, jsonb_build_object('code', canonical, 'cents', p_reward_cents, 'max', p_max_claims, 'partner', p_user));
  return jsonb_build_object('ok', true, 'id', new_id, 'code', canonical);
exception
  when unique_violation then
    raise exception 'CODE_TAKEN';
end $$;
revoke all on function public.partner_admin_create_code(uuid, text, bigint, integer, timestamptz) from public, anon;
grant execute on function public.partner_admin_create_code(uuid, text, bigint, integer, timestamptz) to authenticated;

-- Credited real-money deposits by users attributed to the partner, after attribution, in [from, to).
create or replace function public._partner_deposits(p_partner uuid, p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, cents bigint, deposits bigint)
language sql stable security definer set search_path = public as $$
  select r.user_id, coalesce(sum(x.usd_cents), 0)::bigint, count(x.usd_cents)::bigint
  from public.partner_referrals r
  left join lateral (
    select d.usd_cents from public.crypto_deposits d
    join public.ledger_transactions lt on lt.id = d.ledger_tx_id and lt.account_type = 'real'
    where d.user_id = r.user_id and d.status = 'CREDITED'
      and d.credited_at >= r.created_at
      and d.credited_at >= coalesce(p_from, '-infinity'::timestamptz)
      and d.credited_at < coalesce(p_to, 'infinity'::timestamptz)
    union all
    select b.usd_cents from public.btcpay_invoices b
    where b.user_id = r.user_id and b.status = 'CREDITED'
      and b.credited_at >= r.created_at
      and b.credited_at >= coalesce(p_from, '-infinity'::timestamptz)
      and b.credited_at < coalesce(p_to, 'infinity'::timestamptz)
  ) x on true
  where r.partner_user_id = p_partner
  group by r.user_id;
$$;
revoke all on function public._partner_deposits(uuid, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public._partner_window(p_partner uuid, p_bps integer, p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deposit_cents', coalesce(sum(cents), 0),
    'deposit_count', coalesce(sum(deposits), 0),
    'depositing_users', count(*) filter (where cents > 0),
    'commission_cents', (coalesce(sum(cents), 0) * p_bps) / 10000
  )
  from public._partner_deposits(p_partner, p_from, p_to);
$$;
revoke all on function public._partner_window(uuid, integer, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.partner_admin_list(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin();
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  return jsonb_build_object(
    'settings', (select jsonb_build_object('min_topup_cents', min_topup_cents, 'max_topup_cents', max_topup_cents) from public.partner_settings where id),
    'rows', coalesce((select jsonb_agg(x order by x.active desc, x.created_at desc) from (
      select p.user_id, pr.username, p.active, p.commission_bps, p.created_at, p.removed_at,
        coalesce((select jsonb_agg(c.code order by c.created_at) from public.promo_codes c where c.partner_user_id = p.user_id and c.active), '[]'::jsonb) as codes,
        (select count(*) from public.partner_referrals r where r.partner_user_id = p.user_id) as attributed_users,
        (select coalesce(sum(t.amount_cents), 0) from public.partner_topups t where t.user_id = p.user_id) as credits_cents,
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
declare uid uuid := public._assert_admin(); p public.partners; now_ts timestamptz := clock_timestamp();
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  select * into p from public.partners where user_id = p_user;
  if p.user_id is null then raise exception 'NOT_PARTNER'; end if;
  return jsonb_build_object(
    'user_id', p.user_id,
    'username', (select username from public.profiles where id = p.user_id),
    'email', (select email from auth.users where id = p.user_id),
    'active', p.active,
    'commission_bps', p.commission_bps,
    'note', p.note,
    'created_at', p.created_at,
    'removed_at', p.removed_at,
    'withdrawal', case when p.active then 'blocked' when public._partner_release_hold(p.user_id) > 0 then 'held' else 'normal' end,
    'held_cents', case when p.active then null else public._partner_release_hold(p.user_id) end,
    'available_cents', (select coalesce(sum(balance), 0) from public.wallet_accounts where owner_id = p.user_id and kind = 'user_available' and asset = 'USD' and account_type = 'real'),
    'locked_cents', (select coalesce(sum(balance), 0) from public.wallet_accounts where owner_id = p.user_id and kind = 'user_locked' and asset = 'USD' and account_type = 'real'),
    'credits_cents', (select coalesce(sum(amount_cents), 0) from public.partner_topups where user_id = p.user_id),
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
      select r.user_id, pr.username, c.code, r.created_at as attributed_at,
        coalesce(rng.cents, 0) as range_cents, coalesce(rng.deposits, 0) as range_deposits, coalesce(al.cents, 0) as all_cents
      from public.partner_referrals r
      join public.profiles pr on pr.id = r.user_id
      join public.promo_codes c on c.id = r.promo_code_id
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

-- Finds existing accounts by username or exact email for the "add partner" form.
create or replace function public.partner_admin_search(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); q text := btrim(coalesce(p_query, ''));
begin
  if char_length(q) < 2 or char_length(q) > 120 then return jsonb_build_object('rows', '[]'::jsonb); end if;
  return jsonb_build_object('rows', coalesce((select jsonb_agg(x) from (
    select pr.id as user_id, pr.username, u.email,
      coalesce(pa.active, false) as is_partner
    from public.profiles pr
    left join auth.users u on u.id = pr.id
    left join public.partners pa on pa.user_id = pr.id
    where pr.username ilike replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
       or lower(u.email) = lower(q)
    order by pr.username
    limit 10
  ) x), '[]'::jsonb));
end $$;
revoke all on function public.partner_admin_search(text) from public, anon;
grant execute on function public.partner_admin_search(text) to authenticated;

create or replace function public.promo_admin_list()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  return jsonb_build_object(
    'rows', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.code, c.reward_cents, c.max_claims, c.claim_count, (c.max_claims - c.claim_count) as remaining,
        c.expires_at, c.active, c.created_at, pr.username as partner
      from public.promo_codes c
      left join public.profiles pr on pr.id = c.partner_user_id
      order by c.created_at desc
      limit 100
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.promo_admin_list() from public, anon;
grant execute on function public.promo_admin_list() to authenticated;

-- Same as 20261002181040, plus partner codes: the owner cannot redeem their own code, a code of a
-- removed partner is unavailable, and the first partner code a non-partner redeems sets attribution.
create or replace function public.promo_claim(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  canonical text;
  promo public.promo_codes;
  claim_id uuid := gen_random_uuid();
  tx uuid;
  key text;
  v_asset text;
  v_type text;
  v_bank public.account_kind;
  bank uuid;
  attempts int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if not exists (select 1 from public.profiles where id = uid) then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext('promo_claim:' || uid::text));
  insert into public.promo_claim_attempts (user_id) values (uid);
  select count(*) into attempts from public.promo_claim_attempts
  where user_id = uid and created_at > clock_timestamp() - interval '10 minutes';
  if attempts > 5 then
    perform public._audit(uid, 'promo_claim_rate_limited', null, '{}'::jsonb);
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  canonical := public._promo_code(p_code);
  if canonical is null then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  select * into promo from public.promo_codes where promo_codes.code = canonical for update;
  if promo.id is null then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if exists (select 1 from public.promo_claims c where c.promo_code_id = promo.id and c.user_id = uid) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'already_claimed'));
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;
  if promo.partner_user_id is not null
     and (promo.partner_user_id = uid or not public._is_active_partner(promo.partner_user_id)) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'partner_code'));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if not promo.active
     or (promo.expires_at is not null and promo.expires_at <= clock_timestamp())
     or promo.claim_count >= promo.max_claims then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  if v_bank = 'house_bankroll' then
    bank := public._system_account(v_bank, v_asset, v_type);
    perform 1 from public.wallet_accounts where id = bank for update;
  end if;
  key := 'promo:claim:' || claim_id::text;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('promo_reward', key, v_type, uid, 'Promo reward')
  returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -promo.reward_cents);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), promo.reward_cents);
  insert into public.promo_claims (id, promo_code_id, user_id, reward_cents, required_wager_cents, ledger_tx_id)
  values (claim_id, promo.id, uid, promo.reward_cents, promo.reward_cents, tx);
  update public.promo_codes set claim_count = claim_count + 1 where id = promo.id and claim_count < max_claims;
  if not found then raise exception 'PROMO_EXHAUSTED'; end if;
  if promo.partner_user_id is not null and not public._is_active_partner(uid) then
    insert into public.partner_referrals (user_id, partner_user_id, promo_code_id, promo_claim_id)
    values (uid, promo.partner_user_id, promo.id, claim_id)
    on conflict (user_id) do nothing;
    if found then
      perform public._audit(uid, 'partner_referral_attributed', null, jsonb_build_object('partner', promo.partner_user_id, 'code', canonical));
    end if;
  end if;
  perform public._audit(uid, 'promo_claimed', null, jsonb_build_object('code', canonical, 'cents', promo.reward_cents, 'tx', tx, 'claim', claim_id));
  return jsonb_build_object('ok', true, 'reward_cents', promo.reward_cents, 'required_wager_cents', promo.reward_cents);
exception
  when unique_violation then
    if uid is not null and promo.id is not null
       and exists (select 1 from public.promo_claims c where c.promo_code_id = promo.id and c.user_id = uid) then
      return jsonb_build_object('ok', false, 'reason', 'already_claimed');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
end $$;
revoke all on function public.promo_claim(text) from public, anon;
grant execute on function public.promo_claim(text) to authenticated;

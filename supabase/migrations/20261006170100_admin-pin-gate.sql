-- Admin PIN and trusted-device step-up. Browser roles cannot read or write these tables.
-- The PIN hash is produced in the server (scrypt). These functions never receive a raw OTP.

create table public.admin_pins (
  user_id uuid primary key,
  pin_hash text not null check (pin_hash like 'scrypt$%' and length(pin_hash) between 40 and 200),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.admin_pins enable row level security;
revoke all on public.admin_pins from public, anon, authenticated;
grant select, insert, update, delete on public.admin_pins to service_role;

create table public.admin_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  verified_at timestamptz,
  revoked_at timestamptz,
  ip_hash text,
  ua_hash text
);
create index admin_devices_user on public.admin_devices (user_id, created_at desc);
alter table public.admin_devices enable row level security;
revoke all on public.admin_devices from public, anon, authenticated;
grant select, insert, update, delete on public.admin_devices to service_role;

create table public.admin_stepup (
  session_id uuid primary key,
  user_id uuid not null,
  device_id uuid not null references public.admin_devices (id),
  verified_at timestamptz not null default clock_timestamp()
);
create index admin_stepup_user on public.admin_stepup (user_id, verified_at desc);
alter table public.admin_stepup enable row level security;
revoke all on public.admin_stepup from public, anon, authenticated;
grant select, insert, update, delete on public.admin_stepup to service_role;

create table public.admin_pin_grants (
  session_id uuid not null,
  device_id uuid not null references public.admin_devices (id),
  user_id uuid not null,
  granted_at timestamptz not null default clock_timestamp(),
  primary key (session_id, device_id)
);
alter table public.admin_pin_grants enable row level security;
revoke all on public.admin_pin_grants from public, anon, authenticated;
grant select, insert, update, delete on public.admin_pin_grants to service_role;

create table public.admin_pin_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  device_hash text,
  ip_hash text,
  created_at timestamptz not null default clock_timestamp()
);
create index admin_pin_attempts_user on public.admin_pin_attempts (user_id, created_at desc);
create index admin_pin_attempts_ip on public.admin_pin_attempts (ip_hash, created_at desc);
alter table public.admin_pin_attempts enable row level security;
revoke all on public.admin_pin_attempts from public, anon, authenticated;
grant select, insert, delete on public.admin_pin_attempts to service_role;

create or replace function public.admin_audit(p_user uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_action not in (
    'admin_pin_setup', 'admin_pin_ok', 'admin_pin_fail', 'admin_context_new',
    'admin_otp_sent', 'admin_otp_ok', 'admin_otp_fail', 'admin_device_trusted', 'admin_device_revoked'
  ) then
    raise exception 'BAD_REQUEST';
  end if;
  insert into public.audit_logs (actor_id, action, details)
  values (p_user, p_action, '{}'::jsonb);
end $$;
revoke all on function public.admin_audit(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_audit(uuid, text) to service_role;

create or replace function public._admin_pin_locked(p_user uuid, p_device text, p_ip text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.admin_pin_attempts
      where user_id = p_user and created_at > clock_timestamp() - interval '15 minutes') >= 5
    or (p_device is not null and (
      select count(*) from public.admin_pin_attempts
      where user_id = p_user and device_hash = p_device
        and created_at > clock_timestamp() - interval '15 minutes') >= 5)
    or (p_ip is not null and (
      select count(*) from public.admin_pin_attempts
      where user_id = p_user and ip_hash = p_ip
        and created_at > clock_timestamp() - interval '15 minutes') >= 10);
$$;
revoke all on function public._admin_pin_locked(uuid, text, text) from public, anon, authenticated;
grant execute on function public._admin_pin_locked(uuid, text, text) to service_role;

create or replace function public._require_admin_stepup()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  sid uuid;
begin
  if uid is null or not public.has_role(uid, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  begin
    sid := nullif(claims->>'session_id', '')::uuid;
  exception when others then
    raise exception 'ADMIN_STEP_UP';
  end;
  if sid is null or not exists (
    select 1 from public.admin_stepup s
    where s.session_id = sid and s.user_id = uid
  ) then
    raise exception 'ADMIN_STEP_UP';
  end if;
end $$;
revoke all on function public._require_admin_stepup() from public, anon, authenticated;
grant execute on function public._require_admin_stepup() to service_role;

create or replace function public.admin_stepup_ok(p_user uuid, p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user is not null and p_session is not null
    and public.has_role(p_user, 'admin')
    and exists (
      select 1 from public.admin_stepup s
      where s.user_id = p_user and s.session_id = p_session
    );
$$;
revoke all on function public.admin_stepup_ok(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_stepup_ok(uuid, uuid) to service_role;

create or replace function public.admin_verified_email(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email from auth.users u
  where u.id = p_user and u.email_confirmed_at is not null
  limit 1;
$$;
revoke all on function public.admin_verified_email(uuid) from public, anon, authenticated;
grant execute on function public.admin_verified_email(uuid) to service_role;

create or replace function public.admin_security_status(p_user uuid, p_session uuid, p_device_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_pin boolean;
  trusted boolean := false;
  stepped boolean := false;
  granted boolean := false;
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    return jsonb_build_object('admin', false);
  end if;
  select exists (select 1 from public.admin_pins where user_id = p_user) into has_pin;
  if p_device_hash is not null then
    select exists (
      select 1 from public.admin_devices d
      where d.user_id = p_user and d.token_hash = p_device_hash
        and d.verified_at is not null and d.revoked_at is null
    ) into trusted;
  end if;
  if p_session is not null then
    select exists (
      select 1 from public.admin_stepup s
      where s.session_id = p_session and s.user_id = p_user
    ) into stepped;
    select exists (
      select 1 from public.admin_pin_grants g
      join public.admin_devices d on d.id = g.device_id
      where g.session_id = p_session and g.user_id = p_user
        and d.token_hash = p_device_hash and d.revoked_at is null
        and g.granted_at > clock_timestamp() - interval '15 minutes'
    ) into granted;
  end if;
  return jsonb_build_object(
    'admin', true,
    'has_pin', has_pin,
    'device_trusted', trusted,
    'stepped_up', stepped,
    'pin_granted', granted
  );
end $$;
revoke all on function public.admin_security_status(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_security_status(uuid, uuid, text) to service_role;

create or replace function public.admin_device_touch(
  p_user uuid, p_token_hash text, p_ip_hash text, p_ua_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d public.admin_devices;
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'BAD_REQUEST';
  end if;
  select * into d from public.admin_devices where token_hash = p_token_hash;
  if found and d.user_id <> p_user then
    return jsonb_build_object('foreign', true);
  end if;
  if not found then
    insert into public.admin_devices (user_id, token_hash, ip_hash, ua_hash)
    values (p_user, p_token_hash, p_ip_hash, p_ua_hash)
    returning * into d;
  else
    update public.admin_devices
      set last_seen_at = clock_timestamp(), ip_hash = coalesce(p_ip_hash, ip_hash), ua_hash = coalesce(p_ua_hash, ua_hash)
      where id = d.id
      returning * into d;
  end if;
  return jsonb_build_object(
    'foreign', false,
    'device_id', d.id,
    'trusted', d.verified_at is not null and d.revoked_at is null,
    'revoked', d.revoked_at is not null
  );
end $$;
revoke all on function public.admin_device_touch(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_device_touch(uuid, text, text, text) to service_role;

create or replace function public.admin_pin_prepare(p_user uuid, p_device_hash text, p_ip_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare stored text;
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform pg_advisory_xact_lock(hashtext('admin-pin:' || p_user::text));
  if public._admin_pin_locked(p_user, p_device_hash, p_ip_hash) then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts. Try again later.');
  end if;
  select pin_hash into stored from public.admin_pins where user_id = p_user;
  if stored is null then
    return jsonb_build_object('ok', false, 'error', 'setup');
  end if;
  return jsonb_build_object('ok', true, 'pin_hash', stored);
end $$;
revoke all on function public.admin_pin_prepare(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_pin_prepare(uuid, text, text) to service_role;

create or replace function public.admin_pin_commit(
  p_user uuid, p_session uuid, p_device_hash text, p_ip_hash text, p_match boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d public.admin_devices; trusted boolean;
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_session is null or p_device_hash is null then
    raise exception 'BAD_REQUEST';
  end if;
  perform pg_advisory_xact_lock(hashtext('admin-pin:' || p_user::text));
  if public._admin_pin_locked(p_user, p_device_hash, p_ip_hash) then
    return jsonb_build_object('ok', false, 'error', 'Too many attempts. Try again later.');
  end if;
  if not p_match then
    insert into public.admin_pin_attempts (user_id, device_hash, ip_hash)
    values (p_user, p_device_hash, p_ip_hash);
    perform public.admin_audit(p_user, 'admin_pin_fail');
    if public._admin_pin_locked(p_user, p_device_hash, p_ip_hash) then
      return jsonb_build_object('ok', false, 'error', 'Too many attempts. Try again later.');
    end if;
    return jsonb_build_object('ok', false, 'error', 'Incorrect PIN.');
  end if;
  delete from public.admin_pin_attempts where user_id = p_user;
  select * into d from public.admin_devices
    where user_id = p_user and token_hash = p_device_hash and revoked_at is null;
  if not found then
    raise exception 'BAD_REQUEST';
  end if;
  trusted := d.verified_at is not null;
  perform public.admin_audit(p_user, 'admin_pin_ok');
  if trusted then
    insert into public.admin_stepup (session_id, user_id, device_id)
    values (p_session, p_user, d.id)
    on conflict (session_id) do update set user_id = excluded.user_id, device_id = excluded.device_id, verified_at = clock_timestamp();
    delete from public.admin_pin_grants where session_id = p_session;
    return jsonb_build_object('ok', true, 'next', 'ready');
  end if;
  insert into public.admin_pin_grants (session_id, device_id, user_id, granted_at)
  values (p_session, d.id, p_user, clock_timestamp())
  on conflict (session_id, device_id) do update set granted_at = clock_timestamp();
  perform public.admin_audit(p_user, 'admin_context_new');
  return jsonb_build_object('ok', true, 'next', 'otp');
end $$;
revoke all on function public.admin_pin_commit(uuid, uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_pin_commit(uuid, uuid, text, text, boolean) to service_role;

create or replace function public.admin_pin_create(
  p_user uuid, p_session uuid, p_device_hash text, p_pin_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d public.admin_devices;
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_session is null or p_device_hash is null or p_pin_hash is null or p_pin_hash not like 'scrypt$%' then
    raise exception 'BAD_REQUEST';
  end if;
  if exists (select 1 from public.admin_pins where user_id = p_user) then
    return jsonb_build_object('ok', false, 'error', 'Incorrect PIN.');
  end if;
  insert into public.admin_pins (user_id, pin_hash) values (p_user, p_pin_hash);
  select * into d from public.admin_devices
    where user_id = p_user and token_hash = p_device_hash and revoked_at is null;
  if not found then
    raise exception 'BAD_REQUEST';
  end if;
  update public.admin_devices set verified_at = clock_timestamp(), last_seen_at = clock_timestamp()
    where id = d.id;
  insert into public.admin_stepup (session_id, user_id, device_id)
  values (p_session, p_user, d.id)
  on conflict (session_id) do update set user_id = excluded.user_id, device_id = excluded.device_id, verified_at = clock_timestamp();
  perform public.admin_audit(p_user, 'admin_pin_setup');
  perform public.admin_audit(p_user, 'admin_device_trusted');
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_pin_create(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_pin_create(uuid, uuid, text, text) to service_role;

create or replace function public.admin_otp_open(p_user uuid, p_session uuid, p_device_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if not exists (
    select 1 from public.admin_pin_grants g
    join public.admin_devices d on d.id = g.device_id
    where g.user_id = p_user and g.session_id = p_session
      and d.token_hash = p_device_hash and d.revoked_at is null
      and d.verified_at is null
      and g.granted_at > clock_timestamp() - interval '15 minutes'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Enter your admin PIN to continue.');
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_otp_open(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_otp_open(uuid, uuid, text) to service_role;

create or replace function public.admin_device_trust(
  p_user uuid, p_session uuid, p_device_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare d public.admin_devices;
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if not exists (
    select 1 from public.admin_pin_grants g
    join public.admin_devices x on x.id = g.device_id
    where g.user_id = p_user and g.session_id = p_session
      and x.token_hash = p_device_hash and x.revoked_at is null
      and g.granted_at > clock_timestamp() - interval '15 minutes'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Enter your admin PIN to continue.');
  end if;
  select * into d from public.admin_devices
    where user_id = p_user and token_hash = p_device_hash and revoked_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Enter your admin PIN to continue.');
  end if;
  update public.admin_devices
    set verified_at = clock_timestamp(), last_seen_at = clock_timestamp()
    where id = d.id;
  insert into public.admin_stepup (session_id, user_id, device_id)
  values (p_session, p_user, d.id)
  on conflict (session_id) do update
    set user_id = excluded.user_id, device_id = excluded.device_id, verified_at = clock_timestamp();
  delete from public.admin_pin_grants where session_id = p_session and device_id = d.id;
  perform public.admin_audit(p_user, 'admin_otp_ok');
  perform public.admin_audit(p_user, 'admin_device_trusted');
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_device_trust(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_device_trust(uuid, uuid, text) to service_role;

create or replace function public.admin_device_revoke(p_user uuid, p_device uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  update public.admin_devices
    set revoked_at = clock_timestamp()
    where id = p_device and user_id = p_user and revoked_at is null;
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false);
  end if;
  delete from public.admin_stepup where device_id = p_device and user_id = p_user;
  delete from public.admin_pin_grants where device_id = p_device and user_id = p_user;
  perform public.admin_audit(p_user, 'admin_device_revoked');
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_device_revoke(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_device_revoke(uuid, uuid) to service_role;

create or replace function public.admin_otp_failed(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform public.admin_audit(p_user, 'admin_otp_fail');
end $$;
revoke all on function public.admin_otp_failed(uuid) from public, anon, authenticated;
grant execute on function public.admin_otp_failed(uuid) to service_role;

create or replace function public.admin_otp_sent(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or not public.has_role(p_user, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform public.admin_audit(p_user, 'admin_otp_sent');
end $$;
revoke all on function public.admin_otp_sent(uuid) from public, anon, authenticated;
grant execute on function public.admin_otp_sent(uuid) to service_role;

-- Existing admin gates now also require a PIN-verified session.

CREATE OR REPLACE FUNCTION public._assert_admin()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  return uid;
end $function$;

CREATE OR REPLACE FUNCTION public._lb_require_admin()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  return uid;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_coinflip_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  return jsonb_build_object(
    'waiting', (select count(*) from coinflip_games where status = 'WAITING'),
    'in_progress', (select count(*) from coinflip_games where status in ('READY','FLIPPING','SETTLEMENT')),
    'completed', (select count(*) from coinflip_games where status = 'COMPLETED'),
    'cancelled', (select count(*) from coinflip_games where status = 'CANCELLED'),
    'failed_payouts', (select count(*) from coinflip_payouts where status = 'FAILED'),
    'volume', (select coalesce(sum(pot_amount),0) from coinflip_games where status = 'COMPLETED'),
    'open_locked', (select coalesce(sum(case when status = 'WAITING' then amount else pot_amount end),0) from coinflip_games where status in ('WAITING','READY','FLIPPING','SETTLEMENT')),
    'recent_games', (select coalesce(jsonb_agg(x order by x.id desc),'[]'::jsonb) from (
        select g.id, g.status, g.creator_id, g.opponent_id, g.amount, g.creator_side, g.winner_id, g.winning_side, g.payout_amount,
               g.server_seed_hash, g.created_at, g.joined_at, g.completed_at, p.status as payout_status, p.attempts as payout_attempts
        from coinflip_games g left join coinflip_payouts p on p.game_id = g.id order by g.id desc limit 30) x),
    'recent_audit', (select coalesce(jsonb_agg(a order by a.id desc),'[]'::jsonb) from (select * from audit_logs where game_type = 'coinflip' order by id desc limit 50) a));
end $function$;

CREATE OR REPLACE FUNCTION public.admin_ledger_cashflow()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  bal record;
  dep_today bigint;
  dep_all bigint;
  wd_today bigint;
  wd_all bigint;
  fee_today bigint;
  fee_all bigint;
  open_cents bigint;
  open_count bigint;
  house_fee_today bigint;
  house_fee_all bigint;
  wins jsonb;
  credits jsonb;
  wallets jsonb;
  fresh_cents bigint;
  stale boolean;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();

  select
    coalesce(sum(balance) filter (where kind = 'user_available'), 0) player_available,
    coalesce(sum(balance) filter (where kind = 'user_locked'), 0) player_locked,
    coalesce(sum(balance) filter (where kind = 'game_escrow'), 0) game_escrow,
    coalesce(sum(balance) filter (where kind = 'house_revenue'), 0) house_revenue,
    coalesce(sum(balance) filter (where kind = 'house_bankroll'), 0) house_bankroll,
    coalesce(sum(balance) filter (where kind = 'external_custody'), 0) external_custody
  into bal
  from wallet_accounts
  where account_type = 'real' and asset = 'USD';

  select
    coalesce(sum(usd_cents) filter (where credited_at >= day_start), 0),
    coalesce(sum(usd_cents), 0)
  into dep_today, dep_all
  from public._admin_credited_deposits() d;

  select
    coalesce(sum(usd_cents) filter (where paid_at >= day_start), 0),
    coalesce(sum(usd_cents), 0),
    coalesce(sum(fee_usd_cents) filter (where paid_at >= day_start), 0),
    coalesce(sum(fee_usd_cents), 0)
  into wd_today, wd_all, fee_today, fee_all
  from public._admin_settled_withdrawals() w;

  select coalesce(sum(usd_cents), 0), count(*)::bigint
  into open_cents, open_count
  from public._admin_open_withdrawals() o;

  select coalesce(jsonb_agg(jsonb_build_object(
    'game', x.game, 'today', x.today, 'all_time', x.all_time
  ) order by x.ord), '[]'::jsonb)
  into wins
  from (
    select k.ord, k.game,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= day_start), 0) today,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0), 0) all_time
    from (values
      (1, 'Jackpot', 'jackpot_settlement'::public.tx_kind),
      (2, 'Coinflip', 'coinflip_settlement'),
      (3, 'Roulette', 'roulette_settlement'),
      (4, 'Slott', 'slot_settlement'),
      (5, 'Slott bonus', 'slot_bonus')
    ) as k(ord, game, kind)
    left join ledger_transactions t on t.kind = k.kind and t.account_type = 'real'
    left join ledger_postings p on p.tx_id = t.id
    left join wallet_accounts a on a.id = p.account_id
      and a.kind = 'user_available' and a.account_type = 'real' and a.asset = 'USD'
    group by k.ord, k.game
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', x.kind, 'today', x.today, 'all_time', x.all_time
  ) order by x.ord), '[]'::jsonb)
  into credits
  from (
    select k.ord, k.kind,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= day_start), 0) today,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0), 0) all_time
    from (values
      (1, 'Promo', 'promo_reward'::public.tx_kind),
      (2, 'Referral', 'referral_reward'),
      (3, 'Prestige', 'prestige_reward'),
      (4, 'Partner', 'partner_credit')
    ) as k(ord, kind, txkind)
    left join ledger_transactions t on t.kind = k.txkind and t.account_type = 'real'
    left join ledger_postings p on p.tx_id = t.id
    left join wallet_accounts a on a.id = p.account_id
      and a.kind = 'user_available' and a.account_type = 'real' and a.asset = 'USD'
    group by k.ord, k.kind
  ) x;

  select
    coalesce(sum(p.amount) filter (where p.amount > 0 and t.created_at >= day_start), 0),
    coalesce(sum(p.amount) filter (where p.amount > 0), 0)
  into house_fee_today, house_fee_all
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  join wallet_accounts a on a.id = p.account_id
  where a.kind = 'house_revenue' and a.account_type = 'real' and a.asset = 'USD';

  select coalesce(jsonb_agg(jsonb_build_object(
    'network', y.network,
    'asset', y.asset_key,
    'total_cents', y.total_cents,
    'reserved_cents', y.reserved_cents,
    'available_cents', y.available_cents,
    'fresh', y.fresh,
    'observed_at', y.observed_at
  ) order by y.network, y.asset_key), '[]'::jsonb),
    coalesce(sum(y.total_cents) filter (where y.fresh and y.total_cents is not null), 0),
    coalesce(bool_or(not y.fresh), false)
  into wallets, fresh_cents, stale
  from (
    select t.network, t.asset_key,
      case when p.price is null or st.balance_units is null then null
        else floor(st.balance_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as total_cents,
      case when p.price is null then null
        else floor(st.reserved_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as reserved_cents,
      case when p.price is null or st.available_units is null then null
        else floor(st.available_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as available_cents,
      st.available_units is not null as fresh,
      st.observed_at
    from treasury_assets t
    cross join lateral public._treasury_state(t.network, t.asset_key) st
    cross join lateral (select public._treasury_price(t.network, t.asset_key) as price) p
    where t.network = 'bitcoin'
      or exists (
        select 1 from chain_assets a
        join chain_networks n on n.chain_id = a.chain_id
        where 'eip155:' || a.chain_id = t.network and a.asset_key = t.asset_key and a.is_enabled and n.is_enabled
      )
  ) y;

  return jsonb_build_object(
    'server_time', clock_timestamp(),
    'balances', jsonb_build_object(
      'player_available', bal.player_available,
      'player_locked', bal.player_locked,
      'game_escrow', bal.game_escrow,
      'player_owed', bal.player_available + bal.player_locked + bal.game_escrow,
      'house_revenue', bal.house_revenue,
      'house_bankroll', bal.house_bankroll,
      'custody_net', -bal.external_custody,
      'books_balance', -bal.external_custody = bal.player_available + bal.player_locked + bal.game_escrow + bal.house_revenue + bal.house_bankroll
    ),
    'deposits', jsonb_build_object('today', dep_today, 'all_time', dep_all),
    'withdrawals', jsonb_build_object(
      'paid_today', wd_today,
      'paid_all_time', wd_all,
      'fees_today', fee_today,
      'fees_all_time', fee_all,
      'open_cents', open_cents,
      'open_count', open_count
    ),
    'winnings', wins,
    'fees', jsonb_build_object('today', house_fee_today, 'all_time', house_fee_all),
    'credits', credits,
    'wallets', wallets,
    'wallets_fresh_cents', fresh_cents,
    'wallets_stale', stale
  );
end $function$;

CREATE OR REPLACE FUNCTION public.admin_ops_query(p_kind text, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  lim int := 25;
  v_cursor text;
  v_status text;
  v_q text;
  v_from timestamptz;
  v_to timestamptz;
  v_game text;
  v_sev text;
  v_asset text;
  v_chain text;
  v_rail text;
  rows jsonb;
  v_id bigint;
  v_uuid uuid;
  v_cursor_at timestamptz;
  v_cursor_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  if p_args is null then p_args := '{}'::jsonb; end if;
  if p_kind is null or p_kind !~ '^(overview|live|games|game|deposits|withdrawals|withdrawal|logs)$' then
    raise exception 'BAD_REQUEST';
  end if;

  begin
    if coalesce(p_args->>'limit', '') <> '' then
      if p_args->>'limit' !~ '^[0-9]{1,3}$' then raise exception 'BAD_REQUEST'; end if;
      lim := (p_args->>'limit')::int;
    end if;
    if lim < 1 or lim > 50 then lim := 25; end if;

    v_cursor := nullif(p_args->>'cursor', '');
    if v_cursor is not null and v_cursor !~ '^[0-9]+$' and p_kind not in ('deposits', 'withdrawals') then
      raise exception 'BAD_REQUEST';
    end if;
    v_status := nullif(upper(p_args->>'status'), '');
    if v_status is not null and v_status !~ '^[A-Z_]{3,32}$' then raise exception 'BAD_REQUEST'; end if;
    v_q := nullif(left(regexp_replace(coalesce(p_args->>'q', ''), '[%_\\]', '', 'g'), 80), '');
    v_game := nullif(lower(p_args->>'game'), '');
    if v_game is not null and v_game not in ('jackpot', 'coinflip', 'roulette') then raise exception 'BAD_REQUEST'; end if;
    v_sev := nullif(upper(p_args->>'severity'), '');
    if v_sev is not null and v_sev not in ('INFO', 'WARNING', 'ERROR', 'CRITICAL') then raise exception 'BAD_REQUEST'; end if;
    v_asset := nullif(upper(p_args->>'asset'), '');
    if v_asset is not null and v_asset !~ '^[A-Z0-9]{2,12}$' then raise exception 'BAD_REQUEST'; end if;
    v_chain := nullif(p_args->>'chain', '');
    if v_chain is not null and v_chain !~ '^[0-9]{1,12}$' then raise exception 'BAD_REQUEST'; end if;
    v_rail := nullif(lower(p_args->>'rail'), '');
    if v_rail is not null and v_rail not in ('evm', 'bitcoin', 'card') then raise exception 'BAD_REQUEST'; end if;
    if coalesce(p_args->>'from', '') <> '' then
      if p_args->>'from' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then raise exception 'BAD_REQUEST'; end if;
      v_from := (p_args->>'from')::timestamptz;
    end if;
    if coalesce(p_args->>'to', '') <> '' then
      if p_args->>'to' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then raise exception 'BAD_REQUEST'; end if;
      v_to := (p_args->>'to')::timestamptz;
    end if;
    if p_kind in ('deposits', 'withdrawals') and v_cursor is not null then
      if v_cursor !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'BAD_REQUEST'; end if;
      if coalesce(p_args->>'cursor_at', '') !~ '^[0-9]{4}-' then raise exception 'BAD_REQUEST'; end if;
      v_cursor_id := v_cursor::uuid;
      v_cursor_at := (p_args->>'cursor_at')::timestamptz;
    end if;
  exception
    when invalid_text_representation or datetime_field_overflow then
      raise exception 'BAD_REQUEST';
  end;

  if p_kind = 'live' then
    return jsonb_build_object(
      'server_time', clock_timestamp(),
      'workers', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', name,
          'last_run_at', last_run_at,
          'age_seconds', extract(epoch from (clock_timestamp() - last_run_at))
        ) order by name)
        from worker_tick_gate
      ), '[]'::jsonb),
      'jobs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', name,
          'last_run_at', last_run_at,
          'age_seconds', extract(epoch from (clock_timestamp() - last_run_at))
        ) order by name)
        from crypto_job_runs
      ), '[]'::jsonb),
      'integrity', (
        select jsonb_build_object('id', id, 'started_at', started_at, 'finished_at', finished_at, 'incidents_found', incidents_found)
        from integrity_runs order by id desc limit 1
      ),
      'crypto_cursor_at', (select max(updated_at) from crypto_chain_cursor),
      'roulette_error', (
        select public._admin_redact_text(last_error) from roulette_games
        where last_error is not null order by id desc limit 1
      ),
      'latest_failure', (
        select jsonb_build_object('id', id, 'action', action, 'game_type', game_type, 'game_id', game_id, 'created_at', created_at)
        from audit_logs where action ~* '(fail|error|critical)' order by id desc limit 1
      ),
      'roulette', (
        select jsonb_build_object(
          'id', id, 'status', status, 'pot_amount', pot_amount, 'bet_count', bet_count, 'player_count', player_count,
          'created_at', created_at, 'betting_ends_at', betting_ends_at, 'spin_end_at', spin_end_at,
          'locked_at', locked_at, 'completed_at', completed_at,
          'winning_color', case when status = 'COMPLETED' then winning_color::text else null end,
          'total_payout', case when status = 'COMPLETED' then total_payout else null end
        )
        from roulette_games
        where status not in ('COMPLETED', 'CANCELLED')
        order by id desc limit 1
      )
    );
  end if;

  if p_kind = 'overview' then
    return jsonb_build_object(
      'server_time', clock_timestamp(),
      'jackpot', (
        select jsonb_build_object(
          'waiting', count(*) filter (where status = 'WAITING'),
          'active', count(*) filter (where status = 'ACTIVE'),
          'drawing', count(*) filter (where status = 'DRAWING')
        ) from jackpot_games where status in ('WAITING', 'ACTIVE', 'DRAWING')
      ) || jsonb_build_object(
        'completed_today', (select count(*) from jackpot_games where status = 'COMPLETED' and completed_at >= day_start),
        'cancelled_today', (select count(*) from jackpot_games where status = 'CANCELLED' and updated_at >= day_start),
        'rounds_today', (select count(*) from jackpot_games where created_at >= day_start)
      ),
      'coinflip', jsonb_build_object(
        'waiting', (select count(*) from coinflip_games where status = 'WAITING'),
        'active', (select count(*) from coinflip_games where status in ('READY', 'FLIPPING', 'SETTLEMENT')),
        'completed_today', (select count(*) from coinflip_games where status = 'COMPLETED' and completed_at >= day_start),
        'cancelled_today', (select count(*) from coinflip_games where status = 'CANCELLED' and cancelled_at >= day_start),
        'open_wager', (select coalesce(sum(case when status = 'WAITING' then amount else pot_amount end), 0) from coinflip_games where status in ('WAITING', 'READY', 'FLIPPING', 'SETTLEMENT'))
      ),
      'roulette', jsonb_build_object(
        'completed_today', (select count(*) from roulette_games where status = 'COMPLETED' and completed_at >= day_start),
        'cancelled_today', (select count(*) from roulette_games where status = 'CANCELLED' and cancelled_at >= day_start)
      ),
      'deposits', jsonb_build_object(
        'pending', (select count(*) from crypto_deposits where status = 'DETECTED'),
        'confirming', (select count(*) from crypto_deposits where status = 'CONFIRMED'),
        'unmatched', (select count(*) from crypto_deposits where status = 'UNMATCHED'),
        'failed_today', (select count(*) from crypto_deposits where status in ('REJECTED', 'ORPHANED') and created_at >= day_start),
        'open_invoices', (
          select count(*) from btcpay_invoices where status in ('NEW', 'PROCESSING', 'SETTLED', 'REVIEW', 'INVALID')
        ) + (
          select count(*) from nowpayments_invoices where status in ('NEW', 'WAITING')
        ),
        'today_count', (
          select count(*) from crypto_deposits where created_at >= day_start
        ) + (
          select count(*) from btcpay_invoices where created_at >= day_start
        ) + (
          select count(*) from nowpayments_invoices where created_at >= day_start
        ),
        'today_cents', (
          select coalesce(sum(usd_cents) filter (where credited_at >= day_start), 0)
          from public._admin_credited_deposits()
        )
      ),
      'withdrawals', coalesce((
        select jsonb_build_object(
          'requested', coalesce(sum(c) filter (where status = 'PENDING' and not review_required), 0),
          'manual_review', coalesce(sum(c) filter (where review_required and status in ('PENDING', 'HELD')), 0),
          'funds_locked', coalesce(sum(c) filter (where status = 'HELD'), 0),
          'approved', coalesce(sum(c) filter (where status = 'APPROVED'), 0),
          'queued', coalesce(sum(c) filter (where status = 'LIQUIDITY_PENDING'), 0),
          'signing', coalesce(sum(c) filter (where status = 'SUBMITTING'), 0),
          'broadcast', coalesce(sum(c) filter (where status = 'SUBMITTED'), 0),
          'requested_cents', coalesce(sum(cents) filter (where status = 'PENDING'), 0),
          'open_cents', (select coalesce(sum(usd_cents), 0) from public._admin_open_withdrawals()),
          'bitcoin_open', (select count(*) from btcpay_payouts where status in ('HOLD', 'AWAITING_APPROVAL', 'QUEUED'))
        )
        from (
          select status, review_required, count(*)::int c, coalesce(sum(usd_cents), 0)::bigint cents
          from crypto_withdrawals
          where status in ('PENDING', 'HELD', 'APPROVED', 'LIQUIDITY_PENDING', 'SUBMITTING', 'SUBMITTED')
          group by status, review_required
        ) s
      ), '{}'::jsonb) || jsonb_build_object(
        'completed_today', (select count(*) from public._admin_settled_withdrawals() where paid_at >= day_start),
        'completed_today_cents', (select coalesce(sum(usd_cents) filter (where paid_at >= day_start), 0) from public._admin_settled_withdrawals()),
        'failed_today', (
          select count(*) from crypto_withdrawals where status = 'FAILED' and created_at >= day_start
        ) + (
          select count(*) from btcpay_payouts where status = 'FAILED' and coalesce(closed_at, created_at) >= day_start
        ),
        'cancelled_today', (
          select count(*) from crypto_withdrawals where status in ('REJECTED', 'RELEASED') and coalesce(closed_at, created_at) >= day_start
        ) + (
          select count(*) from btcpay_payouts where status = 'CANCELLED' and coalesce(closed_at, created_at) >= day_start
        )
      )
    );
  end if;

  if p_kind = 'games' then
    if v_game is null then raise exception 'BAD_REQUEST'; end if;
    if v_game = 'jackpot' then
      select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into rows from (
        select g.id, g.status::text as status, g.player_count, g.entry_count, g.pot_amount,
          w.username as winner, g.rake_amount as fee, g.payout_amount, g.created_at, g.completed_at, g.updated_at, g.scheduled_end_at
        from jackpot_games g
        left join profiles w on w.id = g.winner_id
        where (v_cursor is null or g.id < v_cursor::bigint)
          and (v_status is null or g.status::text = v_status)
        order by g.id desc
        limit lim
      ) x;
    elsif v_game = 'coinflip' then
      select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into rows from (
        select g.id, g.status::text as status, c.username as creator, o.username as opponent, g.amount as wager,
          w.username as winner, g.fee_amount as fee, g.payout_amount, g.created_at, g.joined_at, g.completed_at
        from coinflip_games g
        left join profiles c on c.id = g.creator_id
        left join profiles o on o.id = g.opponent_id
        left join profiles w on w.id = g.winner_id
        where (v_cursor is null or g.id < v_cursor::bigint)
          and (v_status is null or g.status::text = v_status)
        order by g.id desc
        limit lim
      ) x;
    else
      select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into rows from (
        select g.id, g.status::text as status,
          case when g.status = 'COMPLETED' then g.winning_color::text else null end as result,
          g.pot_amount, case when g.status = 'COMPLETED' then g.total_payout else null end as total_payout,
          g.bet_count, g.player_count, g.created_at, g.completed_at
        from roulette_games g
        where (v_cursor is null or g.id < v_cursor::bigint)
          and (v_status is null or g.status::text = v_status)
        order by g.id desc
        limit lim
      ) x;
    end if;
    return jsonb_build_object('rows', rows, 'next', case when jsonb_array_length(rows) = lim then rows->(lim - 1)->>'id' else null end);
  end if;

  if p_kind = 'game' then
    if v_game is null or coalesce(p_args->>'id', '') !~ '^[0-9]+$' then raise exception 'BAD_REQUEST'; end if;
    v_id := (p_args->>'id')::bigint;
    if v_game = 'jackpot' then
      select to_jsonb(x) into rows from (
        select g.id, g.status::text as status, g.player_count, g.entry_count, g.pot_amount, w.username as winner,
          g.rake_amount as fee, g.payout_amount, g.created_at, g.countdown_started_at, g.scheduled_end_at,
          g.drawn_at, g.completed_at, g.updated_at, public._admin_redact_text(p.last_error) as last_error
        from jackpot_games g
        left join profiles w on w.id = g.winner_id
        left join jackpot_payouts p on p.game_id = g.id
        where g.id = v_id
      ) x;
    elsif v_game = 'coinflip' then
      select to_jsonb(x) into rows from (
        select g.id, g.status::text as status, c.username as creator, o.username as opponent, g.amount as wager,
          w.username as winner, g.fee_amount as fee, g.payout_amount, g.created_at, g.joined_at, g.completed_at,
          g.cancelled_at, g.cancel_reason, public._admin_redact_text(p.last_error) as last_error
        from coinflip_games g
        left join profiles c on c.id = g.creator_id
        left join profiles o on o.id = g.opponent_id
        left join profiles w on w.id = g.winner_id
        left join lateral (
          select last_error from coinflip_payouts where game_id = g.id and kind = 'WINNER' order by created_at desc limit 1
        ) p on true
        where g.id = v_id
      ) x;
    else
      select to_jsonb(x) into rows from (
        select g.id, g.status::text as status, g.pot_amount, g.bet_count, g.player_count,
          case when g.status = 'COMPLETED' then g.winning_color::text else null end as result,
          case when g.status = 'COMPLETED' then g.total_payout else null end as total_payout,
          g.created_at, g.betting_started_at, g.betting_ends_at, g.locked_at, g.spin_start_at, g.spin_end_at,
          g.completed_at, g.cancelled_at, g.cancel_reason, public._admin_redact_text(g.last_error) as last_error
        from roulette_games g where g.id = v_id
      ) x;
    end if;
    return jsonb_build_object('game', rows);
  end if;


  if p_kind = 'deposits' then
    select coalesce(jsonb_agg(x order by x.created_at desc, x.id desc), '[]'::jsonb) into rows from (
      select u.id, u.user_id, pr.username, u.rail, u.asset_key, u.chain_id, u.network,
        u.units, u.usd_cents, u.status, u.tx_hash, u.created_at, u.confirmed_at, u.credited_at, u.from_masked
      from (
        select d.id, d.user_id, 'evm'::text as rail, d.asset_key, d.chain_id, n.name as network,
          d.units::text as units, d.usd_cents, d.status, d.tx_hash, d.created_at, d.confirmed_at, d.credited_at,
          case when d.from_address is null then null else left(d.from_address, 6) || '…' || right(d.from_address, 4) end as from_masked
        from crypto_deposits d
        left join chain_networks n on n.chain_id = d.chain_id
        union all
        select b.id, b.user_id, 'bitcoin', 'BTC', null::bigint, 'Bitcoin',
          b.btc_due, case when b.status = 'CREDITED' and b.credited_cents > 0 then b.credited_cents else b.usd_cents end,
          b.status, null::text, b.created_at, b.credited_at, b.credited_at,
          case when b.address is null then null else left(b.address, 6) || '…' || right(b.address, 4) end
        from btcpay_invoices b
        union all
        select i.id, i.user_id, 'card', coalesce(nullif(upper(i.pay_currency), ''), 'CARD'), null::bigint, 'Card',
          null::text, i.usd_cents, i.status, null::text, i.created_at, i.credited_at, i.credited_at, null::text
        from nowpayments_invoices i
      ) u
      left join profiles pr on pr.id = u.user_id
      where (v_status is null or u.status = v_status)
        and (v_rail is null or u.rail = v_rail)
        and (v_asset is null or u.asset_key = v_asset)
        and (v_chain is null or u.chain_id = v_chain::bigint)
        and (v_from is null or u.created_at >= v_from)
        and (v_to is null or u.created_at < v_to)
        and (v_cursor_id is null or u.created_at < v_cursor_at or (u.created_at = v_cursor_at and u.id < v_cursor_id))
        and (
          v_q is null
          or (v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (u.id = v_q::uuid or u.user_id = v_q::uuid))
          or (v_q ~* '^0x[0-9a-f]{64}$' and lower(u.tx_hash) = lower(v_q))
        )
      order by u.created_at desc, u.id desc
      limit lim
    ) x;
    return jsonb_build_object(
      'rows', rows,
      'next', case when jsonb_array_length(rows) = lim then rows->(lim - 1) else null end
    );
  end if;

  if p_kind = 'withdrawals' then
    select coalesce(jsonb_agg(x order by x.created_at desc, x.id desc), '[]'::jsonb) into rows from (
      select u.id, u.user_id, pr.username, u.rail, u.asset_key, u.chain_id, u.network,
        u.usd_cents, u.units, u.status, u.review_required, u.tx_hash, u.created_at, u.confirmed_at, u.closed_at, u.to_masked
      from (
        select w.id, w.user_id, 'evm'::text as rail, w.asset_key, w.chain_id, n.name as network,
          w.usd_cents, w.units::text as units, w.status, w.review_required, w.tx_hash,
          w.created_at, w.confirmed_at, w.closed_at,
          case when w.to_address is null then null else left(w.to_address, 6) || '…' || right(w.to_address, 4) end as to_masked
        from crypto_withdrawals w
        left join chain_networks n on n.chain_id = w.chain_id
        union all
        select b.id, b.user_id, 'bitcoin', 'BTC', null::bigint, 'Bitcoin',
          b.usd_cents, null::text, b.status, b.status = 'AWAITING_APPROVAL', null::text,
          b.created_at, case when b.status = 'COMPLETED' then b.closed_at else null end, b.closed_at,
          case when b.address is null then null else left(b.address, 6) || '…' || right(b.address, 4) end
        from btcpay_payouts b
      ) u
      left join profiles pr on pr.id = u.user_id
      where (v_status is null or u.status = v_status)
        and (v_rail is null or u.rail = v_rail)
        and (v_asset is null or u.asset_key = v_asset)
        and (v_chain is null or u.chain_id = v_chain::bigint)
        and (v_from is null or u.created_at >= v_from)
        and (v_to is null or u.created_at < v_to)
        and (v_cursor_id is null or u.created_at < v_cursor_at or (u.created_at = v_cursor_at and u.id < v_cursor_id))
        and (
          v_q is null
          or (v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (u.id = v_q::uuid or u.user_id = v_q::uuid))
          or (v_q ~* '^0x[0-9a-f]{64}$' and lower(u.tx_hash) = lower(v_q))
        )
      order by u.created_at desc, u.id desc
      limit lim
    ) x;
    return jsonb_build_object(
      'rows', rows,
      'next', case when jsonb_array_length(rows) = lim then rows->(lim - 1) else null end
    );
  end if;

  if p_kind = 'withdrawal' then
    if coalesce(p_args->>'id', '') !~* '^[0-9a-f-]{36}$' then raise exception 'BAD_REQUEST'; end if;
    v_uuid := (p_args->>'id')::uuid;
    if v_rail is null or v_rail = 'evm' then
      select to_jsonb(x) into rows from (
        select w.id, w.user_id, p.username, 'evm'::text as rail, w.asset_key, w.chain_id, n.name as network,
          w.usd_cents, w.units::text as units, w.status, w.review_required, w.reviewed_at, w.tx_hash,
          w.created_at, w.submitted_at, w.confirmed_at, w.closed_at, w.attempts,
          public._admin_redact_text(w.last_error) as last_error,
          left(w.to_address, 6) || '…' || right(w.to_address, 4) as to_masked
        from crypto_withdrawals w
        left join profiles p on p.id = w.user_id
        left join chain_networks n on n.chain_id = w.chain_id
        where w.id = v_uuid
      ) x;
    end if;
    if rows is null and (v_rail is null or v_rail = 'bitcoin') then
      select to_jsonb(x) into rows from (
        select b.id, b.user_id, p.username, 'bitcoin'::text as rail, 'BTC'::text as asset_key, 'Bitcoin'::text as network,
          b.usd_cents, b.fee_usd_cents, b.status, b.created_at, b.closed_at,
          public._admin_redact_text(b.closed_reason) as closed_reason,
          left(b.address, 6) || '…' || right(b.address, 4) as to_masked
        from btcpay_payouts b
        left join profiles p on p.id = b.user_id
        where b.id = v_uuid
      ) x;
    end if;
    return jsonb_build_object('withdrawal', rows);
  end if;

  -- logs
  select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into rows from (
    select a.id, a.created_at, a.action, a.game_type, a.game_id, a.actor_id,
      case
        when a.action ~* 'critical' then 'CRITICAL'
        when a.action ~* '(fail|error)' then 'ERROR'
        when a.action ~* '(warn|reject|cancel|unmatched)' then 'WARNING'
        else 'INFO'
      end as severity,
      public._admin_redact(a.details) as details
    from audit_logs a
    where (v_cursor is null or a.id < v_cursor::bigint)
      and (v_game is null or a.game_type = v_game)
      and (v_from is null or a.created_at >= v_from)
      and (v_to is null or a.created_at < v_to)
      and (
        v_sev is null
        or (v_sev = 'CRITICAL' and a.action ~* 'critical')
        or (v_sev = 'ERROR' and a.action ~* '(fail|error)' and a.action !~* 'critical')
        or (v_sev = 'WARNING' and a.action ~* '(warn|reject|cancel|unmatched)' and a.action !~* '(fail|error|critical)')
        or (v_sev = 'INFO' and a.action !~* '(critical|fail|error|warn|reject|cancel|unmatched)')
      )
      and (
        v_q is null
        or a.action ilike '%' || v_q || '%'
        or (v_q ~ '^[0-9]+$' and a.game_id = v_q::bigint)
      )
    order by a.id desc
    limit lim
  ) x;
  return jsonb_build_object('rows', rows, 'next', case when jsonb_array_length(rows) = lim then rows->(lim - 1)->>'id' else null end);
exception
  when others then
    if sqlerrm in ('FORBIDDEN', 'BAD_REQUEST', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'ADMIN_STEP_UP') then
      raise;
    end if;
    raise warning 'admin_ops_query failed: %', left(sqlerrm, 200);
    raise exception 'ADMIN_UNAVAILABLE' using errcode = 'XX000';
end $function$;

CREATE OR REPLACE FUNCTION public.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  return jsonb_build_object(
    'open_games', (select count(*) from jackpot_games where status in ('WAITING','ACTIVE')),
    'drawing_games', (select count(*) from jackpot_games where status = 'DRAWING'),
    'completed_games', (select count(*) from jackpot_games where status = 'COMPLETED'),
    'total_volume', (select coalesce(sum(pot_amount),0) from jackpot_games where status = 'COMPLETED'),
    'players', (select count(*) from profiles),
    'failed_payouts', (select count(*) from jackpot_payouts where status = 'FAILED'),
    'ledger_sum', (select coalesce(sum(balance),0) from wallet_accounts),
    'escrow_balance', (select coalesce(sum(balance),0) from wallet_accounts where kind = 'game_escrow'),
    'locked_total', (select coalesce(sum(balance),0) from wallet_accounts where kind = 'user_locked'),
    'open_pot_total', (select coalesce(sum(pot_amount),0) from jackpot_games where status in ('WAITING','ACTIVE','DRAWING')),
    'recent_audit', (select coalesce(jsonb_agg(a order by a.id desc),'[]'::jsonb) from (select * from audit_logs order by id desc limit 50) a));
end $function$;

CREATE OR REPLACE FUNCTION public.admin_prestige_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  return jsonb_build_object(
    'xp_total', coalesce((select sum(xp_amount) from public.xp_events), 0),
    'by_game', coalesce((select jsonb_object_agg(source_game, xp) from (
      select source_game, sum(xp_amount) xp from public.xp_events group by source_game
    ) g), '{}'::jsonb),
    'users_by_level', coalesce((select jsonb_object_agg(current_level, n) from (
      select current_level, count(*) n from public.user_prestige group by current_level
    ) l), '{}'::jsonb),
    'cosmetics_unlocked', (select count(*) from public.user_cosmetics),
    'rewards_claimed', (select count(*) from public.user_reward_claims),
    'usdc_cents', coalesce((select sum(amount) from public.user_reward_claims), 0),
    'replays', (select count(*) from public.audit_logs where action = 'prestige_replay'),
    'recent', coalesce((select jsonb_agg(x) from (
      select id, user_id, source_game, event_type, xp_amount, created_at
      from public.xp_events order by created_at desc limit 12
    ) x), '[]'::jsonb)
  );
end $function$;

CREATE OR REPLACE FUNCTION public.admin_referrals()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  return jsonb_build_object(
    'rows', coalesce((select jsonb_agg(x) from (
      select r.id, r.inviter_user_id, r.referred_user_id, r.invite_id, r.status,
        r.qualifying_deposit_id, r.qualifying_deposit_cents, r.qualifying_play_cents,
        r.reward_cents, r.qualified_at, r.rewarded_at, r.created_at,
        rw.status as reward_status, rw.ledger_tx_id, rw.idempotency_key
      from public.referrals r
      left join public.referral_rewards rw on rw.referral_id = r.id
      order by r.created_at desc
      limit 100
    ) x), '[]'::jsonb)
  );
end $function$;

CREATE OR REPLACE FUNCTION public.promo_admin_create(p_code text, p_reward_cents bigint, p_max_claims integer, p_expires timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); canonical text; new_id uuid;
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  canonical := public._promo_code(p_code);
  if canonical is null then raise exception 'BAD_CODE'; end if;
  if p_reward_cents is null or p_reward_cents < 100 or p_reward_cents > 500 then raise exception 'BAD_REWARD'; end if;
  if p_max_claims is null or p_max_claims < 1 or p_max_claims > 100000 then raise exception 'BAD_CLAIMS'; end if;
  if p_expires is not null and p_expires <= clock_timestamp() then raise exception 'BAD_EXPIRY'; end if;
  insert into public.promo_codes (code, reward_cents, max_claims, expires_at, active, created_by)
  values (canonical, p_reward_cents, p_max_claims, p_expires, true, uid)
  returning promo_codes.id into new_id;
  perform public._audit(uid, 'promo_created', null, jsonb_build_object('code', canonical, 'cents', p_reward_cents, 'max', p_max_claims));
  return jsonb_build_object('ok', true, 'id', new_id, 'code', canonical);
exception
  when unique_violation then
    raise exception 'CODE_TAKEN';
end $function$;

CREATE OR REPLACE FUNCTION public.promo_admin_delete(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid, 'admin') then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  if p_id is null then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from public.promo_claims where promo_code_id = p_id)
     or exists (select 1 from public.partner_referrals where promo_code_id = p_id) then
    raise exception 'CODE_USED';
  end if;
  delete from public.promo_codes where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform public._audit(uid, 'promo_deleted', null, jsonb_build_object('id', p_id));
  return jsonb_build_object('ok', true);
end $function$;

CREATE OR REPLACE FUNCTION public.promo_admin_list()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      order by c.created_at desc
      limit 100
    ) x), '[]'::jsonb)
  );
end $function$;

CREATE OR REPLACE FUNCTION public.promo_admin_update(p_id uuid, p_active boolean, p_max_claims integer, p_expires timestamp with time zone, p_touch_expiry boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  where id = p_id and p_max_claims >= claim_count;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'BAD_REQUEST'; end if;
  perform public._audit(uid, 'promo_updated', null, jsonb_build_object('id', p_id, 'active', p_active, 'max', p_max_claims));
  return jsonb_build_object('ok', true);
end $function$;

-- Active device-code id only. The code itself stays in the email.
create or replace function public.admin_active_otp(p_user uuid, p_session uuid, p_device_hash text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.email_otp_challenges c
  where c.user_id = p_user
    and c.purpose = 'ADMIN_DEVICE'
    and c.status = 'ACTIVE'
    and c.expires_at > clock_timestamp()
    and exists (
      select 1 from public.admin_pin_grants g
      join public.admin_devices d on d.id = g.device_id
      where g.user_id = p_user
        and g.session_id = p_session
        and d.token_hash = p_device_hash
        and d.revoked_at is null
        and g.granted_at > clock_timestamp() - interval '15 minutes'
    )
  order by c.created_at desc
  limit 1;
$$;
revoke all on function public.admin_active_otp(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_active_otp(uuid, uuid, text) to service_role;

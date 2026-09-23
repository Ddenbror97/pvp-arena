-- ===================== EMAIL OTP (signup verification, server-only) =====================
create type public.otp_purpose as enum ('SIGNUP_EMAIL_VERIFICATION');
create type public.otp_status as enum ('PENDING_SEND','ACTIVE','CONSUMED','INVALIDATED','SUPERSEDED','EXPIRED','SEND_FAILED');

create table public.email_otp_challenges (
  id uuid primary key,
  user_id uuid not null,
  email text not null check (email = lower(email) and length(email) between 3 and 320),
  purpose public.otp_purpose not null,
  otp_digest text not null check (otp_digest ~ '^[0-9a-f]{64}$'),
  status public.otp_status not null default 'PENDING_SEND',
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  attempt_count int not null default 0,
  max_attempts int not null default 5 check (max_attempts between 1 and 10),
  consumed_at timestamptz,
  last_sent_at timestamptz,
  resend_count int not null default 0,
  ip_hash text,
  user_agent_hash text,
  created_by_request_id uuid not null,
  constraint otp_lifetime check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  constraint otp_attempts check (attempt_count between 0 and max_attempts),
  constraint otp_consumed check ((status = 'CONSUMED') = (consumed_at is not null))
);
create unique index email_otp_one_active on public.email_otp_challenges (email, purpose) where status in ('PENDING_SEND','ACTIVE');
create index email_otp_email_time on public.email_otp_challenges (email, purpose, created_at desc);
create index email_otp_ip_time on public.email_otp_challenges (ip_hash, created_at desc);
grant all on public.email_otp_challenges to service_role;
alter table public.email_otp_challenges enable row level security;
create policy "otp no client access" on public.email_otp_challenges for select to authenticated using (false);

create table public.auth_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('OTP_REQUESTED','OTP_SENT','OTP_SEND_FAILED','OTP_VERIFY_FAILED','OTP_EXPIRED','OTP_RATE_LIMITED','EMAIL_VERIFIED','OTP_INVALIDATED')),
  user_id uuid,
  challenge_id uuid,
  purpose public.otp_purpose,
  request_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index auth_events_time on public.auth_events (created_at desc);
grant all on public.auth_events to service_role;
alter table public.auth_events enable row level security;
create policy "auth events no client access" on public.auth_events for select to authenticated using (false);
create trigger no_mutation before update or delete on public.auth_events for each row execute function public._immutable();

create or replace function public.otp_log(p_event text, p_user uuid, p_challenge uuid, p_purpose public.otp_purpose, p_request uuid, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into auth_events (event, user_id, challenge_id, purpose, request_id, details)
  values (p_event, p_user, p_challenge, p_purpose, p_request, coalesce(p_details, '{}'::jsonb))
$$;

-- Issue a new challenge (rate limited). Returns {ok, reason?, expires_at?}. Supersedes the previous active one.
create or replace function public.otp_issue(p_id uuid, p_user uuid, p_email text, p_purpose public.otp_purpose, p_digest text,
  p_ip_hash text, p_ua_hash text, p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email)); last_at timestamptz; n_email int; n_ip int; exp timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('otp:' || e || ':' || p_purpose::text));
  select max(created_at) into last_at from email_otp_challenges where email = e and purpose = p_purpose;
  select count(*) into n_email from email_otp_challenges where email = e and purpose = p_purpose and created_at > clock_timestamp() - interval '1 hour';
  if p_ip_hash is not null then
    select count(*) into n_ip from email_otp_challenges where ip_hash = p_ip_hash and created_at > clock_timestamp() - interval '1 hour';
  else n_ip := 0; end if;
  if (last_at is not null and last_at > clock_timestamp() - interval '60 seconds') or n_email >= 5 or n_ip >= 20 then
    perform otp_log('OTP_RATE_LIMITED', p_user, null, p_purpose, p_request,
      jsonb_build_object('scope', case when n_ip >= 20 then 'ip' when n_email >= 5 then 'email_hour' else 'email_60s' end));
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  update email_otp_challenges set status = 'SUPERSEDED' where email = e and purpose = p_purpose and status in ('PENDING_SEND','ACTIVE');
  exp := clock_timestamp() + interval '10 minutes';
  insert into email_otp_challenges (id, user_id, email, purpose, otp_digest, created_at, expires_at, ip_hash, user_agent_hash, created_by_request_id, resend_count)
    values (p_id, p_user, e, p_purpose, p_digest, clock_timestamp(), exp, p_ip_hash, p_ua_hash, p_request, n_email);
  perform otp_log('OTP_REQUESTED', p_user, p_id, p_purpose, p_request, jsonb_build_object('resend_count', n_email));
  return jsonb_build_object('ok', true, 'expires_at', exp);
end $$;

create or replace function public.otp_mark_sent(p_id uuid, p_ok boolean, p_error text, p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c email_otp_challenges;
begin
  select * into c from email_otp_challenges where id = p_id for update;
  if not found or c.status <> 'PENDING_SEND' then return; end if;
  if p_ok then
    update email_otp_challenges set status = 'ACTIVE', last_sent_at = clock_timestamp() where id = p_id;
    perform otp_log('OTP_SENT', c.user_id, p_id, c.purpose, p_request, null);
  else
    update email_otp_challenges set status = 'SEND_FAILED' where id = p_id;
    perform otp_log('OTP_SEND_FAILED', c.user_id, p_id, c.purpose, p_request, jsonb_build_object('error', left(coalesce(p_error, ''), 200)));
  end if;
end $$;

-- Atomic verification. Row lock serialises concurrent attempts; a code is accepted at most once.
create or replace function public.otp_verify(p_id uuid, p_purpose public.otp_purpose, p_digest text, p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c email_otp_challenges; n int;
begin
  select * into c from email_otp_challenges where id = p_id for update;
  if not found or c.purpose <> p_purpose then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if c.status = 'INVALIDATED' then return jsonb_build_object('ok', false, 'reason', 'too_many_attempts'); end if;
  if c.status = 'EXPIRED' or (c.status = 'ACTIVE' and clock_timestamp() >= c.expires_at) then
    if c.status <> 'EXPIRED' then
      update email_otp_challenges set status = 'EXPIRED' where id = p_id;
      perform otp_log('OTP_EXPIRED', c.user_id, p_id, c.purpose, p_request, null);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if c.status <> 'ACTIVE' then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if c.otp_digest <> p_digest then
    n := c.attempt_count + 1;
    update email_otp_challenges set attempt_count = n, status = case when n >= max_attempts then 'INVALIDATED'::otp_status else status end where id = p_id;
    perform otp_log(case when n >= c.max_attempts then 'OTP_INVALIDATED' else 'OTP_VERIFY_FAILED' end, c.user_id, p_id, c.purpose, p_request, jsonb_build_object('attempt', n));
    return jsonb_build_object('ok', false, 'reason', case when n >= c.max_attempts then 'too_many_attempts' else 'invalid' end);
  end if;
  update email_otp_challenges set status = 'CONSUMED', consumed_at = clock_timestamp() where id = p_id;
  return jsonb_build_object('ok', true, 'user_id', c.user_id, 'email', c.email);
end $$;

create or replace function public.otp_challenge_info(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('user_id', user_id, 'email', email, 'purpose', purpose, 'status', status)
  from email_otp_challenges where id = p_id
$$;

create or replace function public.auth_user_by_email(p_email text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', u.id, 'confirmed', u.email_confirmed_at is not null)
  from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1
$$;

create or replace function public.otp_cleanup() returns void language plpgsql security definer set search_path = public as $$
begin
  update email_otp_challenges set status = 'EXPIRED' where status in ('ACTIVE','PENDING_SEND') and expires_at <= clock_timestamp();
  delete from email_otp_challenges where created_at < clock_timestamp() - interval '7 days';
end $$;

revoke execute on function public.otp_log(text, uuid, uuid, public.otp_purpose, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.otp_issue(uuid, uuid, text, public.otp_purpose, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.otp_mark_sent(uuid, boolean, text, uuid) from public, anon, authenticated;
revoke execute on function public.otp_verify(uuid, public.otp_purpose, text, uuid) from public, anon, authenticated;
revoke execute on function public.otp_challenge_info(uuid) from public, anon, authenticated;
revoke execute on function public.auth_user_by_email(text) from public, anon, authenticated;
revoke execute on function public.otp_cleanup() from public, anon, authenticated;
grant execute on function public.otp_log(text, uuid, uuid, public.otp_purpose, uuid, jsonb) to service_role;
grant execute on function public.otp_issue(uuid, uuid, text, public.otp_purpose, text, text, text, uuid) to service_role;
grant execute on function public.otp_mark_sent(uuid, boolean, text, uuid) to service_role;
grant execute on function public.otp_verify(uuid, public.otp_purpose, text, uuid) to service_role;
grant execute on function public.otp_challenge_info(uuid) to service_role;
grant execute on function public.auth_user_by_email(text) to service_role;
grant execute on function public.otp_cleanup() to service_role;

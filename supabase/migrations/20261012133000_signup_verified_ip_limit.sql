-- One finished sign-up per IP per hour. The clock starts when the email
-- code is accepted, so a typo or a resend does not use the slot.

create table public.signup_verifications (
  id bigint generated always as identity primary key,
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index signup_verifications_ip on public.signup_verifications (ip_hash, created_at desc);
grant all on public.signup_verifications to service_role;
alter table public.signup_verifications enable row level security;
revoke all on public.signup_verifications from public, anon, authenticated;

create or replace function public.signup_verified_claim(p_challenge uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text;
  v_purpose public.otp_purpose;
begin
  select ip_hash, purpose into v_ip, v_purpose
  from public.email_otp_challenges
  where id = p_challenge and status = 'CONSUMED';
  if v_purpose is distinct from 'SIGNUP_EMAIL_VERIFICATION' then
    return jsonb_build_object('ok', false, 'reason', 'NOT_SIGNUP');
  end if;
  if v_ip is null or v_ip !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'reason', 'IP_REQUIRED');
  end if;
  perform pg_advisory_xact_lock(hashtext('signup-verified:' || v_ip));
  if exists (
    select 1 from public.signup_verifications
    where ip_hash = v_ip and created_at > clock_timestamp() - interval '1 hour'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'IP_LIMIT');
  end if;
  insert into public.signup_verifications (ip_hash) values (v_ip);
  delete from public.signup_verifications
  where created_at < clock_timestamp() - interval '2 days';
  return jsonb_build_object('ok', true);
end
$$;

revoke all on function public.signup_verified_claim(uuid) from public, anon, authenticated;
grant execute on function public.signup_verified_claim(uuid) to service_role;

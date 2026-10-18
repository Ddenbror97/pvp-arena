-- Password reset and email change reuse the signup OTP issuer.
-- New enum labels are not referenced in this file so they can be added
-- in the same transaction that creates them.

alter type public.otp_purpose add value if not exists 'PASSWORD_RESET';
alter type public.otp_purpose add value if not exists 'EMAIL_CHANGE';

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.auth_events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%OTP_REQUESTED%'
  loop
    execute format('alter table public.auth_events drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.auth_events add constraint auth_events_event_check check (event = any (array[
  'OTP_REQUESTED', 'OTP_SENT', 'OTP_SEND_FAILED', 'OTP_VERIFY_FAILED', 'OTP_EXPIRED',
  'OTP_RATE_LIMITED', 'EMAIL_VERIFIED', 'OTP_INVALIDATED',
  'WALLET_CONNECTION_STARTED', 'WALLET_CONNECTED', 'WALLET_VERIFICATION_REQUESTED',
  'WALLET_VERIFICATION_FAILED', 'WALLET_VERIFIED', 'WALLET_DISCONNECTED',
  'PASSWORD_CHANGED', 'EMAIL_CHANGED'
]));

-- prod-only:begin
-- Deletes live auth sessions. The isolated test schema must not define this.
create or replace function public.auth_revoke_sessions(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then return; end if;
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;
end $$;

revoke all on function public.auth_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.auth_revoke_sessions(uuid) to service_role;
-- prod-only:end

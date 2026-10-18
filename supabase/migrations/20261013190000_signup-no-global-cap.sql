-- Drop site-wide finished-signup pace (BUSY). Per-IP 1/hour and OTP limits remain.

create or replace function public._signup_slot_reason(p_ip text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_ip is null or p_ip !~ '^[0-9a-f]{64}$' then
    return 'IP_REQUIRED';
  end if;
  if exists (
    select 1 from public.signup_verifications
    where ip_hash = p_ip and created_at > clock_timestamp() - interval '1 hour'
  ) then
    return 'IP_LIMIT';
  end if;
  return null;
end $$;

revoke all on function public._signup_slot_reason(text) from public, anon, authenticated;
grant execute on function public._signup_slot_reason(text) to service_role;

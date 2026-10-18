CREATE OR REPLACE FUNCTION public.otp_issue(p_id uuid, p_user uuid, p_email text, p_purpose otp_purpose, p_digest text, p_ip_hash text, p_ua_hash text, p_request uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare e text := lower(trim(p_email)); last_at timestamptz; n_email int; n_ip int; exp timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('otp:' || e || ':' || p_purpose::text));
  -- Failed deliveries do not start the 60s resend cooldown (they still count toward hourly caps).
  select max(created_at) into last_at from email_otp_challenges where email = e and purpose = p_purpose and status <> 'SEND_FAILED';
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
end $function$;
REVOKE ALL ON FUNCTION public.otp_issue(uuid,uuid,text,otp_purpose,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otp_issue(uuid,uuid,text,otp_purpose,text,text,text,uuid) TO service_role;
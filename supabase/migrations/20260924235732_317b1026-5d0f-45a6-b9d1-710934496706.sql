CREATE OR REPLACE FUNCTION public.wallet_log(p_event text, p_user uuid, p_details jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_event not in ('WALLET_CONNECTION_STARTED','WALLET_CONNECTED','WALLET_VERIFICATION_REQUESTED','WALLET_VERIFICATION_FAILED','WALLET_VERIFIED','WALLET_DISCONNECTED','WALLET_CONNECT_FAILED') then
    raise exception 'INVALID_EVENT';
  end if;
  insert into public.auth_events (event, user_id, details) values (p_event, p_user, coalesce(p_details, '{}'::jsonb));
end $function$;
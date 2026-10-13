-- Restore LIQUIDITY_PENDING status writes now that the check constraint allows it.
create or replace function public.crypto_withdrawal_liquidity_pending(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public._require_server_caller();
  update crypto_withdrawals
    set status = 'LIQUIDITY_PENDING', last_error = left(p_reason, 500)
    where id = p_id and status in ('APPROVED', 'LIQUIDITY_PENDING');
  if found then
    perform _crypto_incident(
      'crypto_liquidity',
      'crypto_liquidity:' || p_id,
      jsonb_build_object('withdrawal', p_id, 'reason', left(p_reason, 300))
    );
  end if;
end $function$;

revoke execute on function public.crypto_withdrawal_liquidity_pending(uuid, text)
  from public, anon, authenticated;

-- The first Bitcoin credit function (2026-09-28) credited an invoice's USD amount once BTCPay
-- called it Settled. It was replaced on 2026-10-04 by btcpay_credit_received, which credits the
-- settled satoshis and, since 2026-10-10, only against recorded transaction outputs. Nothing
-- calls the first function any more, but its body was still live: a caller with the service
-- role could credit an invoice without output identity. It now fails closed, as the two
-- superseded btcpay_credit_received overloads already do. The signature stays so an old
-- worker gets an answer instead of an error.
create or replace function public.btcpay_credit_invoice(
  p_id uuid,
  p_status text,
  p_additional text,
  p_speed_policy text,
  p_amount text,
  p_currency text,
  p_order_id text,
  p_onchain_settled boolean,
  p_lightning_seen boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  return jsonb_build_object('status', 'SUPERSEDED');
end $$;

revoke all on function public.btcpay_credit_invoice(uuid, text, text, text, text, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.btcpay_credit_invoice(uuid, text, text, text, text, text, text, boolean, boolean) to service_role;

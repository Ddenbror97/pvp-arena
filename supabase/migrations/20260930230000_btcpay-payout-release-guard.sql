-- A BTCPay payout hold may only be released when the release reason matches a state in which
-- no BTCPay payout can be paying out: a user cancel only after BTCPay has the payout (and the
-- server has confirmed BTCPay cancelled it), a create failure only before any payout id exists.
create or replace function public.btcpay_fail_payout(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p btcpay_payouts; tx uuid; total bigint; next_status text;
begin
  perform public._require_server_caller();
  select * into p from btcpay_payouts where id = p_id for update;
  if p is null then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if p.status in ('COMPLETED', 'CANCELLED', 'FAILED') then return; end if;
  if p.status = 'QUEUED' and p_reason is distinct from 'CANCELLED' and p_reason is distinct from 'NOT_ONCHAIN' then
    return;
  end if;
  if p_reason = 'cancelled by user' and (p.status <> 'AWAITING_APPROVAL' or p.btcpay_payout_id is null) then
    raise exception 'NOT_CANCELLABLE';
  end if;
  if p_reason = 'BTCPAY_CREATE' and (p.status <> 'HOLD' or p.btcpay_payout_id is not null) then
    raise exception 'PAYOUT_EXISTS';
  end if;
  total := p.usd_cents + p.fee_usd_cents;
  next_status := case when p_reason = 'cancelled by user' then 'CANCELLED' else 'FAILED' end;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('refund', 'btcpay-payout:' || p.id || ':release', 'real', p.user_id, 'Bitcoin cashout released')
    on conflict (idempotency_key) do nothing
    returning id into tx;
  if tx is null then
    select id into tx from ledger_transactions where idempotency_key = 'btcpay-payout:' || p.id || ':release';
  else
    perform _post(tx, _user_account(p.user_id, 'user_locked', 'USD', 'real'), -total);
    perform _post(tx, _user_account(p.user_id, 'user_available', 'USD', 'real'), total);
  end if;
  update btcpay_payouts
    set status = next_status, release_ledger_tx_id = coalesce(release_ledger_tx_id, tx),
        closed_reason = left(p_reason, 200), closed_at = now(), updated_at = now()
    where id = p.id;
  perform _audit(p.user_id, 'btcpay_payout_released', null, jsonb_build_object('payout', p.id, 'status', next_status, 'reason', p_reason));
end $$;

revoke all on function public.btcpay_fail_payout(uuid, text) from public, anon, authenticated;
grant execute on function public.btcpay_fail_payout(uuid, text) to service_role;

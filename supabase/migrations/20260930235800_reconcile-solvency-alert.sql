-- Reconciliation also compares what users are owed (available + locked real balances) with the
-- funds the house actually holds on-chain plus withdrawals already in flight. external_custody
-- only tracks net deposits, so house losses (a negative house_bankroll) were invisible to it.
-- The incident is an alert for the operator; it never blocks play, deposits or withdrawals.

create or replace function public.crypto_reconcile(p_onchain_cents bigint, p_details jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare liab bigint; pend bigint; owed bigint; inv jsonb; solvent boolean;
begin
  select coalesce(-sum(balance),0) into liab from wallet_accounts where kind = 'external_custody' and account_type = 'real';
  select coalesce(sum(usd_cents),0) into pend from crypto_withdrawals where status in ('SUBMITTING','SUBMITTED');
  select coalesce(sum(balance),0) into owed from wallet_accounts
    where owner_id is not null and kind in ('user_available','user_locked') and account_type = 'real';
  inv := public.money_real_invariants();
  if not (inv->>'ok_postings_zero')::boolean or not (inv->>'ok_custody_equals_liabilities')::boolean then
    perform _crypto_incident('crypto_reconcile', 'crypto_reconcile:invariant:' || to_char(now(),'YYYYMMDD'), p_details || jsonb_build_object('invariants', inv));
    return jsonb_build_object('ok', false, 'ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'users_owed_cents', owed, 'invariants', inv);
  end if;
  solvent := p_onchain_cents + pend >= owed;
  if not solvent then
    perform _crypto_incident('crypto_solvency', 'crypto_solvency:users_owed_exceeds_custody:' || to_char(now(),'YYYYMMDD'),
      p_details || jsonb_build_object('users_owed_cents', owed, 'onchain_cents', p_onchain_cents, 'in_flight_cents', pend,
        'shortfall_cents', owed - p_onchain_cents - pend));
  end if;
  if p_onchain_cents + pend < liab then
    perform _crypto_incident('crypto_reconcile', 'crypto_reconcile:shortfall:' || to_char(now(),'YYYYMMDD'),
      p_details || jsonb_build_object('ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'in_flight_cents', pend));
    return jsonb_build_object('ok', false, 'ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'users_owed_cents', owed, 'solvent', solvent, 'invariants', inv);
  end if;
  return jsonb_build_object('ok', solvent, 'ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'users_owed_cents', owed, 'solvent', solvent, 'invariants', inv);
end $$;
revoke all on function public.crypto_reconcile(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.crypto_reconcile(bigint, jsonb) to service_role;

-- The solvency alert counted every real user balance as owed, including partner credits that
-- partner_withdrawal_check never lets leave. Owed is now only money that can be cashed out:
--   non-partners: what the withdrawal basis allows (eligible, plus bonus once deposits reach
--     $20, including the parts held in open game stakes);
--   active partners: only their deposit-derived (eligible) part, never partner or promo credits.
-- Each user is capped at their real balance. The invariant and ledger-custody checks are unchanged.

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
  with bal as (
    select owner_id, sum(balance) as bal
    from wallet_accounts
    where owner_id is not null and kind in ('user_available','user_locked') and account_type = 'real'
    group by owner_id
  ), held as (
    select user_id, sum(eligible_part) as e, sum(bonus_part) as b
    from withdraw_basis_hold
    group by user_id
  ), owed_by_user as (
    select least(
      greatest(bal.bal, 0),
      greatest(coalesce(wb.eligible, 0), 0) + coalesce(h.e, 0)
        + case
            when not public._is_active_partner(bal.owner_id) and coalesce(wb.deposits, 0) >= 2000
              then greatest(coalesce(wb.bonus, 0), 0) + coalesce(h.b, 0)
            else 0
          end
    ) as owed
    from bal
    left join withdraw_basis_bucket wb on wb.user_id = bal.owner_id
    left join held h on h.user_id = bal.owner_id
  )
  select coalesce(sum(owed), 0) into owed from owed_by_user;
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

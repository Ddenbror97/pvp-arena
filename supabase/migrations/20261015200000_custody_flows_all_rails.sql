-- Custody-equals-flows counted only Base rows, so every BTCPay deposit and payout showed up as a
-- mismatch. Flows now come from the same per-rail helpers the admin dashboard uses. Custody
-- entries whose source row was removed with a deleted account are counted from the ledger and
-- reported separately; entries from an unknown source are never excused.

create or replace function public.money_real_invariants()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with acc as (
    select
      coalesce(sum(balance) filter (where kind = 'external_custody'),0) custody,
      coalesce(sum(balance) filter (where kind = 'user_available'),0) avail,
      coalesce(sum(balance) filter (where kind = 'user_locked'),0) locked,
      coalesce(sum(balance) filter (where kind = 'game_escrow'),0) escrow,
      coalesce(sum(balance) filter (where kind = 'house_revenue'),0) house,
      coalesce(sum(balance) filter (where kind = 'house_bankroll'),0) bankroll,
      coalesce(sum(balance),0) total
    from wallet_accounts where account_type = 'real'
  ), post as (
    select coalesce(sum(p.amount),0) s from ledger_postings p join wallet_accounts w on w.id = p.account_id where w.account_type = 'real'
  ), cust as (
    select t.id, split_part(t.idempotency_key, ':', 1) src, split_part(t.idempotency_key, ':', 2) ref, p.amount
    from ledger_postings p
    join wallet_accounts w on w.id = p.account_id
    join ledger_transactions t on t.id = p.tx_id
    where w.kind = 'external_custody' and w.account_type = 'real'
  ), orphan as (
    select c.amount from cust c
    where case c.src
      when 'deposit' then not exists (select 1 from crypto_deposits d where d.ledger_tx_id = c.id)
      when 'btcpay' then not exists (select 1 from btcpay_invoices b where b.btcpay_invoice_id = c.ref)
      when 'nowpayments' then not exists (select 1 from nowpayments_invoices n where n.id::text = c.ref)
      when 'withdrawal' then not exists (select 1 from crypto_withdrawals w where w.id::text = c.ref)
      when 'btcpay-payout' then not exists (select 1 from btcpay_payouts b where b.id::text = c.ref)
      else false
    end
  ), flows as (
    select
      coalesce((select sum(usd_cents) from _admin_credited_deposits()),0) deposits,
      coalesce((select sum(usd_cents + fee_usd_cents) from _admin_settled_withdrawals()),0) withdrawals,
      (select count(*) from orphan) orphans,
      coalesce((select -sum(amount) from orphan),0) orphan_net
  )
  select jsonb_build_object(
    'postings_sum', post.s, 'balances_sum', acc.total,
    'custody', acc.custody, 'player_available', acc.avail, 'player_locked', acc.locked,
    'game_escrow', acc.escrow, 'house_revenue', acc.house, 'house_bankroll', acc.bankroll,
    'credited_deposits', flows.deposits, 'settled_withdrawals', flows.withdrawals,
    'orphaned_flows', flows.orphans, 'orphaned_flow_cents', flows.orphan_net,
    'ok_postings_zero', post.s = 0 and acc.total = 0,
    'ok_custody_equals_liabilities', -acc.custody = acc.avail + acc.locked + acc.escrow + acc.house + acc.bankroll,
    'ok_custody_equals_flows', -acc.custody = flows.deposits - flows.withdrawals + flows.orphan_net
  ) from acc, post, flows
$$;
revoke all on function public.money_real_invariants() from public, anon, authenticated;
grant execute on function public.money_real_invariants() to service_role;

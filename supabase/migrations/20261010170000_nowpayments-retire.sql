-- Retire NOWPayments as a payment rail.
-- Historical nowpayments_invoices rows, their ledger postings, and audit
-- records stay. This does not credit, cancel, or rewrite any invoice.
-- Applied to production as schema_migrations version 20261010112419.
--
-- Rollback re-enables NOWPayments credits and invoice writes for service_role.
-- Do not run it without explicit approval. After confirming no credit is in flight:
--   restore public.nowpayments_credit_invoice from
--   20261005180000_nowpayments-invoices.sql;
--   grant execute on that function to service_role;
--   grant select, insert, update, delete, truncate, references, trigger, maintain
--     on public.nowpayments_invoices to service_role.
-- Do not drop the table, the guard trigger, or ledger rows.

create or replace function public.nowpayments_credit_invoice(
  p_id uuid,
  p_payment_id text,
  p_invoice_id text,
  p_status text,
  p_price text,
  p_price_currency text,
  p_pay_currency text,
  p_order_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'NOWPAYMENTS_RETIRED';
end $$;

revoke all on function public.nowpayments_credit_invoice(uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;

revoke insert, update, delete, truncate, references, trigger, maintain
  on table public.nowpayments_invoices
  from public, anon, authenticated, service_role;
grant select on table public.nowpayments_invoices to service_role;

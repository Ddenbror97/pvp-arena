-- Settlement debits the reserved balance. It may run only after this same payout
-- row has a persisted 64-hex transaction id. A txid on another row does not
-- authorize this one. Already-completed rows stay idempotent so a retry of a
-- payout settled before this check does not debit again and does not fail.
-- Unresolved HOLD, AWAITING_APPROVAL, and QUEUED rows are not changed until
-- btcpay_note_payout_txid has stored proof on that row.
-- Not applied to production by this change.
--
-- Rollback, after confirming no settlement is mid-flight:
--   drop index if exists public.btcpay_payouts_payout_txid_uidx;
--   then restore the previous btcpay_settle_payout body from
--   20260928170000_btcpay-payouts.sql. Do not drop payout_txid or the quote checks.

create unique index if not exists btcpay_payouts_payout_txid_uidx
  on public.btcpay_payouts (payout_txid)
  where payout_txid is not null;

-- A copied txid hits the unique index inside the update. Report the same
-- conflict the worker already refuses to settle, instead of a raw index error.
create or replace function public.btcpay_note_payout_txid(p_id uuid, p_txid text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_server_caller();
  if p_txid is null or p_txid !~ '^[0-9a-f]{64}$' then raise exception 'TXID'; end if;
  update btcpay_payouts
    set payout_txid = lower(p_txid), updated_at = now()
    where id = p_id and (payout_txid is null or payout_txid = lower(p_txid));
  if not found then raise exception 'TXID_CONFLICT'; end if;
exception
  when unique_violation then
    raise exception 'TXID_CONFLICT';
end $$;

revoke all on function public.btcpay_note_payout_txid(uuid, text) from public, anon, authenticated;
grant execute on function public.btcpay_note_payout_txid(uuid, text) to service_role;

create or replace function public.btcpay_settle_payout(p_id uuid, p_state text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare p btcpay_payouts; tx uuid; total bigint;
begin
  perform public._require_server_caller();
  if p_state is distinct from 'Completed' then return; end if;
  select * into p from btcpay_payouts where id = p_id for update;
  if p is null then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if p.status = 'COMPLETED' then return; end if;
  if p.status not in ('AWAITING_APPROVAL', 'QUEUED') then return; end if;
  if p.payout_txid is null or p.payout_txid !~ '^[0-9a-f]{64}$' then
    raise exception 'TXID_REQUIRED';
  end if;
  if exists (
    select 1 from btcpay_payouts other
    where other.payout_txid = p.payout_txid and other.id <> p.id
  ) then
    raise exception 'TXID_CONFLICT';
  end if;
  total := p.usd_cents + p.fee_usd_cents;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'btcpay-payout:' || p.id || ':settle', 'real', p.user_id, 'Bitcoin cashout sent')
    on conflict (idempotency_key) do nothing
    returning id into tx;
  if tx is null then
    select id into tx from ledger_transactions where idempotency_key = 'btcpay-payout:' || p.id || ':settle';
    update btcpay_payouts
      set status = 'COMPLETED', settle_ledger_tx_id = coalesce(settle_ledger_tx_id, tx), closed_at = coalesce(closed_at, now()), updated_at = now()
      where id = p.id;
    return;
  end if;
  perform _post(tx, _user_account(p.user_id, 'user_locked', 'USD', 'real'), -total);
  perform _post(tx, _system_account('external_custody', 'USD', 'real'), p.usd_cents);
  if p.fee_usd_cents > 0 then
    perform _post(tx, _system_account('house_revenue', 'USD', 'real'), p.fee_usd_cents);
  end if;
  update btcpay_payouts
    set status = 'COMPLETED', settle_ledger_tx_id = tx, closed_at = now(), updated_at = now()
    where id = p.id;
  perform _audit(p.user_id, 'btcpay_payout_completed', null, jsonb_build_object('payout', p.id, 'cents', p.usd_cents, 'txid', p.payout_txid));
end $$;

revoke all on function public.btcpay_settle_payout(uuid, text) from public, anon, authenticated;
grant execute on function public.btcpay_settle_payout(uuid, text) to service_role;

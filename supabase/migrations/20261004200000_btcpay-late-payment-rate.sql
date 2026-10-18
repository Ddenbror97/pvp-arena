-- Late Bitcoin payments no longer get the invoice's stale rate.
-- Sats received before the invoice expired credit at the invoice rate (cumulative, face
-- amount once the due is covered). Sats received after expiry credit at the lower of the
-- invoice rate and the BTCPay store rate seen when they are first credited. That value is
-- frozen: a later rate recovery never tops it up, so an expired invoice is not a free option.

alter table public.btcpay_invoices
  add column if not exists credited_ontime_cents bigint not null default 0,
  add column if not exists credited_late_sats bigint not null default 0,
  add column if not exists credited_late_cents bigint not null default 0;

-- Every credit so far was received before expiry (checked against BTCPay on 2026-10-04:
-- both settled payments have receivedDate before expirationTime). Backfill before the
-- check, or the two already-credited rows fail it.
update public.btcpay_invoices
  set credited_ontime_cents = credited_cents
  where credited_ontime_cents = 0 and credited_late_cents = 0 and credited_cents > 0;

alter table public.btcpay_invoices drop constraint if exists btcpay_invoices_credit_parts_check;
alter table public.btcpay_invoices add constraint btcpay_invoices_credit_parts_check check (
  credited_ontime_cents >= 0 and credited_late_sats >= 0 and credited_late_cents >= 0
  and credited_cents = credited_ontime_cents + credited_late_cents
);

create or replace function public.btcpay_credit_received(
  p_id uuid,
  p_ontime_sats bigint,
  p_late_sats bigint,
  p_rate_micro bigint,
  p_onchain_settled boolean,
  p_lightning_seen boolean,
  p_order_id text,
  p_currency text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.btcpay_invoices;
  s crypto_settings;
  tx uuid;
  key text;
  floor_conf int;
  due_sats bigint;
  ontime_target bigint;
  ontime_delta bigint := 0;
  new_late bigint := 0;
  late_delta bigint := 0;
  late_at_invoice bigint;
  late_at_market bigint;
  invoice_rate numeric;
  delta bigint;
  rate_missing boolean := false;
begin
  perform public._require_server_caller();
  if p_onchain_settled is not true or p_lightning_seen is true then
    return jsonb_build_object('status', 'NOT_ONCHAIN');
  end if;
  if p_currency is distinct from 'USD' then
    return jsonb_build_object('status', 'CURRENCY');
  end if;
  if p_ontime_sats is null or p_late_sats is null or p_ontime_sats < 0 or p_late_sats < 0
     or p_ontime_sats > 2100000000000000 or p_late_sats > 2100000000000000 then
    return jsonb_build_object('status', 'BAD_AMOUNT');
  end if;
  if p_ontime_sats + p_late_sats = 0 then
    return jsonb_build_object('status', 'NO_PAYMENT');
  end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.deposits_enabled or s.watch_only then
    return jsonb_build_object('status', 'PAUSED');
  end if;
  if public._money_state() <> 'FINALIZED' then
    return jsonb_build_object('status', 'LEDGER_NOT_READY');
  end if;
  select * into inv from btcpay_invoices where id = p_id for update;
  if inv is null then
    raise exception 'INVOICE_NOT_FOUND';
  end if;
  if inv.network is distinct from 'mainnet' then
    return jsonb_build_object('status', 'NETWORK_BLOCKED');
  end if;
  if inv.status not in ('NEW', 'PROCESSING', 'SETTLED', 'EXPIRED', 'CREDITED') then
    return jsonb_build_object('status', inv.status);
  end if;
  floor_conf := case inv.speed_policy
    when 'MediumSpeed' then 1
    when 'LowMediumSpeed' then 2
    when 'LowSpeed' then 6
    else null
  end;
  if floor_conf is null or floor_conf < inv.required_confirmations then
    return jsonb_build_object('status', 'CONFIRMATIONS');
  end if;
  if p_order_id is distinct from inv.id::text then
    return jsonb_build_object('status', 'ORDER_MISMATCH');
  end if;
  if inv.btc_due is null or inv.btc_due !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,8})?$' then
    return jsonb_build_object('status', 'NO_RATE');
  end if;
  due_sats := (inv.btc_due::numeric * 100000000)::bigint;
  if due_sats <= 0 then
    return jsonb_build_object('status', 'NO_RATE');
  end if;
  if exists (select 1 from ledger_transactions where idempotency_key = 'btcpay:' || inv.btcpay_invoice_id)
     and inv.credited_cents = 0 then
    update btcpay_invoices
      set credited_cents = usd_cents, credited_ontime_cents = usd_cents
      where id = inv.id
      returning * into inv;
  end if;

  ontime_target := (p_ontime_sats * inv.usd_cents) / due_sats;
  if p_ontime_sats >= due_sats and ontime_target < inv.usd_cents then
    ontime_target := inv.usd_cents;
  end if;
  ontime_delta := greatest(ontime_target - inv.credited_ontime_cents, 0);

  new_late := p_late_sats - inv.credited_late_sats;
  if new_late > 0 then
    invoice_rate := inv.usd_cents::numeric * 1000000000000 / due_sats;
    if p_rate_micro is null or p_rate_micro <= 0 or p_rate_micro < invoice_rate / 2 or p_rate_micro > invoice_rate * 2 then
      rate_missing := true;
      new_late := 0;
    else
      late_at_invoice := (new_late * inv.usd_cents) / due_sats;
      late_at_market := floor(new_late::numeric * p_rate_micro / 1000000000000)::bigint;
      late_delta := least(late_at_invoice, late_at_market);
    end if;
  else
    new_late := 0;
  end if;

  if inv.credited_cents + ontime_delta + late_delta > 100000000 then
    update btcpay_invoices
      set status = 'REVIEW', closed_reason = 'OVER_CAP', updated_at = now()
      where id = inv.id and credited_cents = 0;
    return jsonb_build_object('status', 'REVIEW');
  end if;

  delta := ontime_delta + late_delta;
  if delta <= 0 then
    if new_late > 0 then
      update btcpay_invoices set credited_late_sats = credited_late_sats + new_late, updated_at = now() where id = inv.id;
    end if;
    if rate_missing then
      return jsonb_build_object('status', 'AWAITING_RATE', 'cents', inv.credited_cents, 'delta', 0);
    end if;
    if inv.credited_cents > 0 then
      return jsonb_build_object('status', 'CREDITED', 'cents', inv.credited_cents, 'delta', 0);
    end if;
    return jsonb_build_object('status', 'DUST');
  end if;
  if public._user_account(inv.user_id, 'user_available', 'USD', 'real') is null then
    return jsonb_build_object('status', 'ACCOUNT_NOT_FOUND');
  end if;

  key := 'btcpay:' || inv.btcpay_invoice_id || ':' || p_ontime_sats::text || ':' || (inv.credited_late_sats + new_late)::text;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, 'real', inv.user_id, 'Bitcoin deposit ' || inv.btcpay_invoice_id)
    on conflict (idempotency_key) do nothing
    returning id into tx;
  if tx is null then
    return jsonb_build_object('status', 'CREDITED', 'cents', inv.credited_cents, 'delta', 0);
  end if;
  perform _post(tx, _system_account('external_custody', 'USD', 'real'), -delta);
  perform _post(tx, _user_account(inv.user_id, 'user_available', 'USD', 'real'), delta);
  update btcpay_invoices
    set status = 'CREDITED',
        credited_ontime_cents = credited_ontime_cents + ontime_delta,
        credited_late_sats = credited_late_sats + new_late,
        credited_late_cents = credited_late_cents + late_delta,
        credited_cents = credited_cents + delta,
        ledger_tx_id = coalesce(ledger_tx_id, tx),
        credited_at = coalesce(credited_at, now()),
        updated_at = now()
    where id = inv.id;
  perform _audit(inv.user_id, 'btcpay_deposit_credited', null, jsonb_build_object(
    'invoice', inv.id, 'btcpay', inv.btcpay_invoice_id, 'cents', delta,
    'ontime_sats', p_ontime_sats, 'late_sats', inv.credited_late_sats + new_late,
    'late_cents', late_delta, 'rate_micro', case when late_delta > 0 then p_rate_micro end,
    'confirmations', inv.required_confirmations, 'speed', inv.speed_policy, 'network', inv.network
  ));
  return jsonb_build_object('status', 'CREDITED', 'cents', inv.credited_cents + delta, 'delta', delta);
end $$;

revoke all on function public.btcpay_credit_received(uuid, bigint, bigint, bigint, boolean, boolean, text, text) from public, anon, authenticated;
grant execute on function public.btcpay_credit_received(uuid, bigint, bigint, bigint, boolean, boolean, text, text) to service_role;

-- The six-argument version valued late sats at the stale invoice rate. It now refuses;
-- the worker released with this migration calls the eight-argument version.
create or replace function public.btcpay_credit_received(
  p_id uuid,
  p_paid_sats bigint,
  p_onchain_settled boolean,
  p_lightning_seen boolean,
  p_order_id text,
  p_currency text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._require_server_caller();
  return jsonb_build_object('status', 'SUPERSEDED');
end $$;
revoke all on function public.btcpay_credit_received(uuid, bigint, boolean, boolean, text, text) from public, anon, authenticated;
grant execute on function public.btcpay_credit_received(uuid, bigint, boolean, boolean, text, text) to service_role;

create index if not exists btcpay_invoices_watch_idx on public.btcpay_invoices (updated_at)
  where status in ('EXPIRED', 'CREDITED');

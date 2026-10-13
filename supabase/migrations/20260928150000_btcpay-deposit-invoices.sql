-- Native Bitcoin deposits via BTCPay (mainnet on-chain).
-- The invoice USD amount is the ledger credit. This function does not price BTC.
-- No Bitcoin seed, xprv, or payout key is stored here.
-- Withdrawals are not part of this migration. A later payout pass stays manual.

create table public.btcpay_invoices (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete restrict,
  btcpay_invoice_id text not null unique,
  usd_cents bigint not null,
  required_confirmations integer not null,
  speed_policy text not null,
  network text not null,
  status text not null default 'NEW',
  address text,
  btc_due text,
  expires_at timestamptz,
  closed_reason text,
  ledger_tx_id uuid unique references public.ledger_transactions (id) on delete restrict,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint btcpay_invoices_cents_check check (usd_cents > 0),
  constraint btcpay_invoices_conf_check check (required_confirmations between 1 and 6),
  constraint btcpay_invoices_speed_check check (speed_policy in ('MediumSpeed', 'LowMediumSpeed', 'LowSpeed')),
  constraint btcpay_invoices_network_check check (network = 'mainnet'),
  constraint btcpay_invoices_status_check check (status in ('NEW', 'PROCESSING', 'SETTLED', 'EXPIRED', 'INVALID', 'REVIEW', 'CREDITED')),
  constraint btcpay_invoices_address_check check (
    address is null
    or (
      char_length(address) between 14 and 120
      and address ~ '^[A-Za-z0-9]+$'
      and address ~* '^bc1'
    )
  )
);

create index btcpay_invoices_user_idx on public.btcpay_invoices (user_id, created_at desc);
create index btcpay_invoices_open_idx on public.btcpay_invoices (created_at)
  where status in ('NEW', 'PROCESSING', 'SETTLED');

alter table public.btcpay_invoices enable row level security;
revoke all on public.btcpay_invoices from public, anon, authenticated;
grant select, insert, update on public.btcpay_invoices to service_role;

insert into public.crypto_job_runs (name) values ('btcpay') on conflict (name) do nothing;

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
language plpgsql
security definer
set search_path = public
as $$
declare inv public.btcpay_invoices;
  s crypto_settings;
  tx uuid;
  key text;
  floor_conf int;
  parsed_cents bigint;
begin
  perform public._require_server_caller();
  if p_onchain_settled is not true or p_lightning_seen is true then
    return jsonb_build_object('status', 'NOT_ONCHAIN');
  end if;
  if p_status is distinct from 'Settled' then
    return jsonb_build_object('status', 'NOT_SETTLED');
  end if;
  if p_additional is distinct from 'None' and p_additional is distinct from 'PaidOver' then
    return jsonb_build_object('status', 'ADDITIONAL_STATUS');
  end if;
  if p_currency is distinct from 'USD' or p_amount !~ '^\d+(\.\d{1,2})?$' then
    return jsonb_build_object('status', 'AMOUNT');
  end if;
  floor_conf := case p_speed_policy
    when 'MediumSpeed' then 1
    when 'LowMediumSpeed' then 2
    when 'LowSpeed' then 6
    else null
  end;
  if floor_conf is null then
    return jsonb_build_object('status', 'CONFIRMATIONS');
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
  if floor_conf < inv.required_confirmations then
    return jsonb_build_object('status', 'CONFIRMATIONS');
  end if;
  if p_order_id is distinct from inv.id::text then
    return jsonb_build_object('status', 'ORDER_MISMATCH');
  end if;
  parsed_cents := (p_amount::numeric * 100)::bigint;
  if parsed_cents is distinct from inv.usd_cents then
    return jsonb_build_object('status', 'AMOUNT');
  end if;
  if inv.status = 'CREDITED' then
    return jsonb_build_object('status', 'CREDITED', 'cents', inv.usd_cents);
  end if;
  if inv.status not in ('NEW', 'PROCESSING', 'SETTLED') then
    return jsonb_build_object('status', inv.status);
  end if;
  if public._user_account(inv.user_id, 'user_available', 'USD', 'real') is null then
    return jsonb_build_object('status', 'ACCOUNT_NOT_FOUND');
  end if;
  key := 'btcpay:' || inv.btcpay_invoice_id;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, 'real', inv.user_id, 'Bitcoin deposit ' || inv.btcpay_invoice_id)
    on conflict (idempotency_key) do nothing
    returning id into tx;
  if tx is null then
    select id into tx from ledger_transactions where idempotency_key = key;
    update btcpay_invoices
      set status = 'CREDITED', ledger_tx_id = coalesce(ledger_tx_id, tx), credited_at = coalesce(credited_at, now()), updated_at = now()
      where id = inv.id;
    return jsonb_build_object('status', 'CREDITED', 'cents', inv.usd_cents);
  end if;
  perform _post(tx, _system_account('external_custody', 'USD', 'real'), -inv.usd_cents);
  perform _post(tx, _user_account(inv.user_id, 'user_available', 'USD', 'real'), inv.usd_cents);
  update btcpay_invoices
    set status = 'CREDITED', ledger_tx_id = tx, credited_at = now(), updated_at = now()
    where id = inv.id;
  perform _audit(inv.user_id, 'btcpay_deposit_credited', null, jsonb_build_object(
    'invoice', inv.id, 'btcpay', inv.btcpay_invoice_id, 'cents', inv.usd_cents,
    'confirmations', inv.required_confirmations, 'speed', p_speed_policy, 'network', inv.network
  ));
  return jsonb_build_object('status', 'CREDITED', 'cents', inv.usd_cents);
end $$;

revoke all on function public.btcpay_credit_invoice(uuid, text, text, text, text, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.btcpay_credit_invoice(uuid, text, text, text, text, text, text, boolean, boolean) to service_role;

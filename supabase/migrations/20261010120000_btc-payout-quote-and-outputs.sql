-- Bitcoin cashouts store an immutable satoshi quote. The three-argument
-- request no longer creates a hold: this BTCPay server treats payout amount
-- as bitcoin and ignores a currency field, so an unquoted "1.00" is 1 BTC.
-- Deposit outputs are unique on (network, txid, vout). Historical credits are
-- not backfilled; their transaction ids were not stored, and guessing them
-- would be wrong. A later reconcile that sees the payment id records it
-- without a second credit.

alter table public.btcpay_payouts
  add column if not exists quote_sats bigint,
  add column if not exists rate_micro bigint,
  add column if not exists quoted_at timestamptz,
  add column if not exists quote_expires_at timestamptz,
  add column if not exists payout_txid text;

alter table public.btcpay_payouts drop constraint if exists btcpay_payouts_quote_pair_check;
alter table public.btcpay_payouts add constraint btcpay_payouts_quote_pair_check check (
  (quote_sats is null and rate_micro is null)
  or (quote_sats >= 546 and quote_sats <= 1000000000 and rate_micro >= 1000000000 and rate_micro <= 10000000000000)
);

alter table public.btcpay_payouts drop constraint if exists btcpay_payouts_txid_check;
alter table public.btcpay_payouts add constraint btcpay_payouts_txid_check check (
  payout_txid is null or payout_txid ~ '^[0-9a-f]{64}$'
);

create table if not exists public.btcpay_deposit_outputs (
  network text not null check (network = 'mainnet'),
  txid text not null check (txid ~ '^[0-9a-f]{64}$'),
  vout integer not null check (vout >= 0 and vout <= 100000),
  invoice_id uuid not null references public.btcpay_invoices (id) on delete restrict,
  sats bigint not null check (sats >= 0),
  status text not null check (status in ('Settled', 'Invalid', 'Processing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (network, txid, vout)
);

create index if not exists btcpay_deposit_outputs_invoice_idx
  on public.btcpay_deposit_outputs (invoice_id);

alter table public.btcpay_deposit_outputs enable row level security;
revoke all on public.btcpay_deposit_outputs from public, anon, authenticated;
grant select, insert, update on public.btcpay_deposit_outputs to service_role;

alter table public.btcpay_invoices drop constraint if exists btcpay_invoices_status_check;
alter table public.btcpay_invoices add constraint btcpay_invoices_status_check check (
  status = any (array['NEW', 'PROCESSING', 'SETTLED', 'EXPIRED', 'INVALID', 'REVIEW', 'CREDITED', 'DISPUTED'])
);

-- Unquoted requests fail closed. They do not reserve a balance and they do not
-- create a BTCPay payout.
create or replace function public.btcpay_request_payout(p_user uuid, p_usd_cents bigint, p_address text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  raise exception 'QUOTE_REQUIRED';
end $$;

revoke all on function public.btcpay_request_payout(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.btcpay_request_payout(uuid, bigint, text) to service_role;

create or replace function public.btcpay_request_payout(
  p_user uuid,
  p_usd_cents bigint,
  p_address text,
  p_quote_sats bigint,
  p_rate_micro bigint,
  p_quote_expires_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings;
  avail uuid; locked uuid; bal bigint; tx uuid; pid uuid := gen_random_uuid();
  total bigint; used bigint; used_global bigint; expected bigint;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  if p_usd_cents <= 0 then raise exception 'BELOW_MINIMUM'; end if;
  if p_address !~* '^bc1' then raise exception 'ADDRESS'; end if;
  if p_rate_micro is null or p_rate_micro < 1000000000 or p_rate_micro > 10000000000000 then
    raise exception 'BAD_QUOTE';
  end if;
  expected := floor(p_usd_cents::numeric * 1000000000000 / p_rate_micro)::bigint;
  if p_quote_sats is distinct from expected or p_quote_sats < 546 or p_quote_sats > 1000000000 then
    raise exception 'BAD_QUOTE';
  end if;
  if p_quote_expires_at is null
     or p_quote_expires_at <= now()
     or p_quote_expires_at > now() + interval '10 minutes' then
    raise exception 'BAD_QUOTE';
  end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (
    select 1 from crypto_withdrawals
    where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')
  ) then raise exception 'WITHDRAWAL_PENDING'; end if;
  if exists (
    select 1 from btcpay_payouts
    where user_id = p_user and status in ('HOLD','AWAITING_APPROVAL','QUEUED')
  ) then raise exception 'WITHDRAWAL_PENDING'; end if;
  select coalesce(sum(usd_cents),0) into used from (
    select usd_cents from crypto_withdrawals
      where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('CANCELLED','FAILED')
  ) x;
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from (
    select usd_cents from crypto_withdrawals
      where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED')
    union all
    select usd_cents from btcpay_payouts
      where created_at > now() - interval '24 hours' and status not in ('CANCELLED','FAILED')
  ) y;
  if used_global + p_usd_cents > s.daily_global_limit_cents then raise exception 'GLOBAL_DAILY_LIMIT'; end if;
  total := p_usd_cents + s.withdrawal_fee_cents;
  avail := _user_account(p_user, 'user_available', 'USD', 'real');
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < total then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public._assert_reward_holds(p_user, bal, total);
  locked := _user_account(p_user, 'user_locked', 'USD', 'real');
  if locked is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type)
      values (p_user, 'user_locked', 'USD', 'real') returning id into locked;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'btcpay-payout:' || pid || ':hold', 'real', p_user, 'Bitcoin cashout hold')
    returning id into tx;
  perform _post(tx, avail, -total);
  perform _post(tx, locked, total);
  insert into btcpay_payouts (
    id, user_id, usd_cents, fee_usd_cents, address, status, hold_ledger_tx_id,
    quote_sats, rate_micro, quoted_at, quote_expires_at
  ) values (
    pid, p_user, p_usd_cents, s.withdrawal_fee_cents, p_address, 'HOLD', tx,
    p_quote_sats, p_rate_micro, now(), p_quote_expires_at
  );
  perform public._treasury_reserve('bitcoin', 'BTC', p_user, null, pid, p_usd_cents, null, null);
  perform _audit(p_user, 'btcpay_payout_requested', null, jsonb_build_object(
    'payout', pid, 'cents', p_usd_cents, 'quote_sats', p_quote_sats, 'rate_micro', p_rate_micro
  ));
  return jsonb_build_object('id', pid, 'status', 'HOLD', 'quote_sats', p_quote_sats);
end $$;

revoke all on function public.btcpay_request_payout(uuid, bigint, text, bigint, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.btcpay_request_payout(uuid, bigint, text, bigint, bigint, timestamptz) to service_role;

create or replace function public.btcpay_note_payout_txid(p_id uuid, p_txid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  if p_txid is null or p_txid !~ '^[0-9a-f]{64}$' then raise exception 'TXID'; end if;
  update btcpay_payouts
    set payout_txid = lower(p_txid), updated_at = now()
    where id = p_id and (payout_txid is null or payout_txid = lower(p_txid));
  if not found then raise exception 'TXID_CONFLICT'; end if;
end $$;

revoke all on function public.btcpay_note_payout_txid(uuid, text) from public, anon, authenticated;
grant execute on function public.btcpay_note_payout_txid(uuid, text) to service_role;

-- Credits without an output list are refused. The eight-argument function
-- remains so an old worker fails closed instead of crediting without identity.
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
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_server_caller();
  return jsonb_build_object('status', 'SUPERSEDED');
end $$;

revoke all on function public.btcpay_credit_received(uuid, bigint, bigint, bigint, boolean, boolean, text, text) from public, anon, authenticated;
grant execute on function public.btcpay_credit_received(uuid, bigint, bigint, bigint, boolean, boolean, text, text) to service_role;

create or replace function public.btcpay_credit_received(
  p_id uuid,
  p_ontime_sats bigint,
  p_late_sats bigint,
  p_rate_micro bigint,
  p_onchain_settled boolean,
  p_lightning_seen boolean,
  p_order_id text,
  p_currency text,
  p_outputs jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
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
  output_sum bigint;
  elem record;
  out_txid text;
  out_vout int;
  out_sats bigint;
  out_status text;
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
  if p_outputs is null or jsonb_typeof(p_outputs) is distinct from 'array' then
    return jsonb_build_object('status', 'PAYMENT_IDENTITY_MISSING');
  end if;
  select coalesce(sum((value->>'sats')::bigint), 0) into output_sum
    from jsonb_array_elements(p_outputs)
    where coalesce(value->>'status', '') = 'Settled';
  if output_sum is distinct from p_ontime_sats + p_late_sats then
    return jsonb_build_object('status', 'OUTPUT_SUM');
  end if;
  begin
    for elem in select value from jsonb_array_elements(p_outputs)
    loop
      out_txid := lower(elem.value->>'txid');
      out_vout := (elem.value->>'vout')::int;
      out_sats := (elem.value->>'sats')::bigint;
      out_status := elem.value->>'status';
      if out_txid !~ '^[0-9a-f]{64}$' or out_vout is null or out_vout < 0 or out_vout > 100000
         or out_sats is null or out_sats < 0
         or out_status not in ('Settled', 'Invalid', 'Processing') then
        return jsonb_build_object('status', 'PAYMENT_IDENTITY_MISSING');
      end if;
      insert into btcpay_deposit_outputs (network, txid, vout, invoice_id, sats, status)
        values ('mainnet', out_txid, out_vout, inv.id, out_sats, out_status)
        on conflict (network, txid, vout) do update
          set status = excluded.status, updated_at = now()
          where btcpay_deposit_outputs.invoice_id = excluded.invoice_id
            and btcpay_deposit_outputs.sats = excluded.sats;
      if exists (
        select 1 from btcpay_deposit_outputs d
        where d.network = 'mainnet' and d.txid = out_txid and d.vout = out_vout and d.invoice_id <> inv.id
      ) then
        raise exception 'DUPLICATE_OUTPUT';
      end if;
    end loop;
  exception
    when others then
      if sqlerrm like '%DUPLICATE_OUTPUT%' then
        return jsonb_build_object('status', 'DUPLICATE_OUTPUT');
      end if;
      raise;
  end;
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

revoke all on function public.btcpay_credit_received(uuid, bigint, bigint, bigint, boolean, boolean, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.btcpay_credit_received(uuid, bigint, bigint, bigint, boolean, boolean, text, text, jsonb) to service_role;

-- A credited deposit whose stored output is no longer settled is marked disputed.
-- The balance is not debited. Spending a disputed credit is an operator decision.
create or replace function public.btcpay_note_deposit_regression(p_id uuid, p_outputs jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare inv public.btcpay_invoices;
begin
  perform public._require_server_caller();
  select * into inv from btcpay_invoices where id = p_id for update;
  if inv is null then raise exception 'INVOICE_NOT_FOUND'; end if;
  if inv.status is distinct from 'CREDITED' then
    return jsonb_build_object('status', inv.status);
  end if;
  if p_outputs is null or jsonb_typeof(p_outputs) is distinct from 'array' then
    return jsonb_build_object('status', 'UNREADABLE');
  end if;
  if exists (
    select 1 from btcpay_deposit_outputs d
    where d.invoice_id = inv.id
      and not exists (
        select 1 from jsonb_array_elements(p_outputs) e
        where lower(e->>'txid') = d.txid
          and (e->>'vout')::int = d.vout
          and e->>'status' = 'Settled'
      )
  ) then
    update btcpay_invoices
      set status = 'DISPUTED', closed_reason = 'CONFIRMATION_REGRESSION', updated_at = now()
      where id = inv.id and status = 'CREDITED';
    perform _audit(inv.user_id, 'btcpay_deposit_disputed', null, jsonb_build_object(
      'invoice', inv.id, 'btcpay', inv.btcpay_invoice_id, 'credited_cents', inv.credited_cents
    ));
    return jsonb_build_object('status', 'DISPUTED');
  end if;
  return jsonb_build_object('status', 'CREDITED');
end $$;

revoke all on function public.btcpay_note_deposit_regression(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.btcpay_note_deposit_regression(uuid, jsonb) to service_role;

-- Read-only checks. Do not run the writes above against production until the
-- worker that sends quoted satoshis is deployed with this migration.
--
-- select p.id, p.status, p.usd_cents, p.quote_sats, p.payout_txid
--   from btcpay_payouts p
--   where p.status in ('HOLD','AWAITING_APPROVAL','QUEUED');
-- select wa.owner_id, wa.kind, wa.balance,
--        wa.balance - coalesce((select sum(lp.amount) from ledger_postings lp where lp.account_id = wa.id), 0) as gap
--   from wallet_accounts wa
--   where wa.asset = 'USD' and wa.account_type = 'real' and wa.kind in ('user_available','user_locked');
-- select network, txid, vout, count(*) from btcpay_deposit_outputs group by 1, 2, 3 having count(*) > 1;

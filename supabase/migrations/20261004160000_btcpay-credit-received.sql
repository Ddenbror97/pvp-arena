-- Settled on-chain Bitcoin credits at the invoice's locked USD/BTC rate.
-- A short or late payment is still the player's money. Cents are
-- (paid sats * invoice usd) / due sats, floored. The face amount is the floor
-- when the due amount is covered. No second BTC price is applied.

alter table public.btcpay_invoices
  add column if not exists credited_cents bigint not null default 0;

alter table public.btcpay_invoices
  drop constraint if exists btcpay_invoices_credited_cents_check;

alter table public.btcpay_invoices
  add constraint btcpay_invoices_credited_cents_check check (credited_cents >= 0);

update public.btcpay_invoices
  set credited_cents = usd_cents
  where status = 'CREDITED' and credited_cents = 0;

-- Full-invoice credits record the same cents so a later received-amount pass cannot post them again.
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
      set status = 'CREDITED', credited_cents = usd_cents, ledger_tx_id = coalesce(ledger_tx_id, tx), credited_at = coalesce(credited_at, now()), updated_at = now()
      where id = inv.id;
    return jsonb_build_object('status', 'CREDITED', 'cents', inv.usd_cents);
  end if;
  perform _post(tx, _system_account('external_custody', 'USD', 'real'), -inv.usd_cents);
  perform _post(tx, _user_account(inv.user_id, 'user_available', 'USD', 'real'), inv.usd_cents);
  update btcpay_invoices
    set status = 'CREDITED', credited_cents = usd_cents, ledger_tx_id = tx, credited_at = now(), updated_at = now()
    where id = inv.id;
  perform _audit(inv.user_id, 'btcpay_deposit_credited', null, jsonb_build_object(
    'invoice', inv.id, 'btcpay', inv.btcpay_invoice_id, 'cents', inv.usd_cents,
    'confirmations', inv.required_confirmations, 'speed', p_speed_policy, 'network', inv.network
  ));
  return jsonb_build_object('status', 'CREDITED', 'cents', inv.usd_cents);
end $$;

revoke all on function public.btcpay_credit_invoice(uuid, text, text, text, text, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.btcpay_credit_invoice(uuid, text, text, text, text, text, text, boolean, boolean) to service_role;

-- Credits the settled on-chain amount. A later larger payment posts only the difference.
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
declare
  inv public.btcpay_invoices;
  s crypto_settings;
  tx uuid;
  key text;
  floor_conf int;
  due_sats bigint;
  cents bigint;
  delta bigint;
begin
  perform public._require_server_caller();
  if p_onchain_settled is not true or p_lightning_seen is true then
    return jsonb_build_object('status', 'NOT_ONCHAIN');
  end if;
  if p_currency is distinct from 'USD' then
    return jsonb_build_object('status', 'CURRENCY');
  end if;
  if p_paid_sats is null or p_paid_sats <= 0 then
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
  if inv.status in ('INVALID', 'REVIEW') then
    return jsonb_build_object('status', inv.status);
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
  if exists (
    select 1 from ledger_transactions
    where idempotency_key = 'btcpay:' || inv.btcpay_invoice_id
  ) and inv.credited_cents = 0 then
    update btcpay_invoices set credited_cents = usd_cents where id = inv.id;
    inv.credited_cents := inv.usd_cents;
  end if;
  cents := (p_paid_sats * inv.usd_cents) / due_sats;
  if p_paid_sats >= due_sats and cents < inv.usd_cents then
    cents := inv.usd_cents;
  end if;
  if cents > 100000000 then
    if inv.credited_cents = 0 then
      update btcpay_invoices
        set status = 'REVIEW', closed_reason = 'OVER_CAP', updated_at = now()
        where id = inv.id;
    end if;
    return jsonb_build_object('status', 'REVIEW');
  end if;
  if cents < 1 then
    return jsonb_build_object('status', 'DUST');
  end if;
  delta := cents - inv.credited_cents;
  if delta <= 0 then
    return jsonb_build_object('status', 'CREDITED', 'cents', inv.credited_cents, 'delta', 0);
  end if;
  if public._user_account(inv.user_id, 'user_available', 'USD', 'real') is null then
    return jsonb_build_object('status', 'ACCOUNT_NOT_FOUND');
  end if;
  key := 'btcpay:' || inv.btcpay_invoice_id || ':sats:' || p_paid_sats::text;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('deposit', key, 'real', inv.user_id, 'Bitcoin deposit ' || inv.btcpay_invoice_id)
    on conflict (idempotency_key) do nothing
    returning id into tx;
  if tx is null then
    select id into tx from ledger_transactions where idempotency_key = key;
    update btcpay_invoices
      set status = 'CREDITED',
          credited_cents = greatest(credited_cents, cents),
          ledger_tx_id = coalesce(ledger_tx_id, tx),
          credited_at = coalesce(credited_at, now()),
          updated_at = now()
      where id = inv.id;
    return jsonb_build_object('status', 'CREDITED', 'cents', cents, 'delta', 0);
  end if;
  perform _post(tx, _system_account('external_custody', 'USD', 'real'), -delta);
  perform _post(tx, _user_account(inv.user_id, 'user_available', 'USD', 'real'), delta);
  update btcpay_invoices
    set status = 'CREDITED',
        credited_cents = cents,
        ledger_tx_id = coalesce(ledger_tx_id, tx),
        credited_at = coalesce(credited_at, now()),
        updated_at = now()
    where id = inv.id;
  perform _audit(inv.user_id, 'btcpay_deposit_credited', null, jsonb_build_object(
    'invoice', inv.id, 'btcpay', inv.btcpay_invoice_id, 'cents', delta, 'paid_sats', p_paid_sats,
    'confirmations', inv.required_confirmations, 'speed', inv.speed_policy, 'network', inv.network
  ));
  return jsonb_build_object('status', 'CREDITED', 'cents', cents, 'delta', delta);
end $$;

revoke all on function public.btcpay_credit_received(uuid, bigint, boolean, boolean, text, text) from public, anon, authenticated;
grant execute on function public.btcpay_credit_received(uuid, bigint, boolean, boolean, text, text) to service_role;

-- Activity and partner totals follow the cents actually posted.
create or replace function public._partner_deposits(p_partner uuid, p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, cents bigint, deposits bigint)
language sql stable security definer set search_path = public as $$
  select r.user_id, coalesce(sum(x.usd_cents), 0)::bigint, count(x.usd_cents)::bigint
  from public.partner_referrals r
  left join lateral (
    select d.usd_cents from public.crypto_deposits d
    join public.ledger_transactions lt on lt.id = d.ledger_tx_id and lt.account_type = 'real'
    where d.user_id = r.user_id and d.status = 'CREDITED'
      and d.credited_at >= r.created_at
      and d.credited_at >= coalesce(p_from, '-infinity'::timestamptz)
      and d.credited_at < coalesce(p_to, 'infinity'::timestamptz)
    union all
    select case when b.credited_cents > 0 then b.credited_cents else b.usd_cents end
    from public.btcpay_invoices b
    where b.user_id = r.user_id and b.status = 'CREDITED'
      and b.credited_at >= r.created_at
      and b.credited_at >= coalesce(p_from, '-infinity'::timestamptz)
      and b.credited_at < coalesce(p_to, 'infinity'::timestamptz)
  ) x on true
  where r.partner_user_id = p_partner
  group by r.user_id;
$$;
revoke all on function public._partner_deposits(uuid, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.crypto_my_activity(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deposits', coalesce((select jsonb_agg(x order by x.detected_at desc) from (
      select d.id, d.chain_id, d.asset_key, d.tx_hash, d.units::text as units, d.usd_cents, d.status, d.detected_at, d.credited_at, a.decimals
      from crypto_deposits d
      left join chain_assets a on a.chain_id = d.chain_id and a.asset_key = d.asset_key
      where d.user_id = p_user
      order by d.detected_at desc limit 20
    ) x), '[]'),
    'withdrawals', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select w.id, w.chain_id, w.asset_key, w.tx_hash, w.units::text as units, w.usd_cents, w.fee_usd_cents, w.status, w.review_required, w.created_at, w.confirmed_at, w.last_error, a.decimals
      from crypto_withdrawals w
      left join chain_assets a on a.chain_id = w.chain_id and a.asset_key = w.asset_key
      where w.user_id = p_user
      order by w.created_at desc limit 20
    ) x), '[]'),
    'bitcoin', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select b.id,
        case when b.status = 'CREDITED' and b.credited_cents > 0 then b.credited_cents else b.usd_cents end as usd_cents,
        b.status, b.created_at, b.btc_due, b.required_confirmations
      from btcpay_invoices b
      where b.user_id = p_user
      order by b.created_at desc limit 20
    ) x), '[]'),
    'bitcoin_payouts', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select p.id, p.usd_cents, p.status, p.created_at, p.address
      from btcpay_payouts p
      where p.user_id = p_user
      order by p.created_at desc limit 20
    ) x), '[]'),
    'settings', (select jsonb_build_object('deposits_enabled', crypto_system_enabled and deposits_enabled, 'withdrawals_enabled', crypto_system_enabled and withdrawals_enabled, 'min_deposit_cents', min_deposit_cents, 'min_withdrawal_cents', min_withdrawal_cents, 'daily_limit_cents', daily_limit_cents, 'fee_cents', withdrawal_fee_cents, 'auto_approve_cents', auto_approve_cents) from crypto_settings),
    'chains', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'chain_id', n.chain_id,
          'name', n.name,
          'network_mode', n.network_mode,
          'min_deposit_cents', n.min_deposit_cents,
          'min_withdrawal_cents', n.min_withdrawal_cents,
          'credit_confirmations', n.credit_confirmations,
          'assets', coalesce((
            select jsonb_agg(jsonb_build_object(
              'asset_key', a.asset_key,
              'display_name', a.display_name,
              'decimals', a.decimals,
              'settlement_kind', a.settlement_kind,
              'payout_ready', public.treasury_can_fund_cents('eip155:' || n.chain_id, a.asset_key, n.min_withdrawal_cents)
            ) order by a.asset_key)
            from chain_assets a
            where a.chain_id = n.chain_id and a.is_enabled
          ), '[]'::jsonb)
        )
        order by n.chain_id
      )
      from chain_networks n
      where n.is_enabled
    ), '[]'::jsonb),
    'deposit_addresses', coalesce((select jsonb_agg(jsonb_build_object('chain_id', da.chain_id, 'address', da.address)) from crypto_deposit_addresses da where da.user_id = p_user), '[]'),
    'wallet', (select normalized_address from user_wallets where user_id = p_user and is_verified order by is_primary desc limit 1)
  ) $$;

create or replace function public.admin_ledger_cashflow()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  bal record;
  dep_today bigint;
  dep_all bigint;
  wd_today bigint;
  wd_all bigint;
  fee_today bigint;
  fee_all bigint;
  open_cents bigint;
  open_count bigint;
  house_fee_today bigint;
  house_fee_all bigint;
  wins jsonb;
  credits jsonb;
  wallets jsonb;
  fresh_cents bigint;
  stale boolean;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'FORBIDDEN';
  end if;

  select
    coalesce(sum(balance) filter (where kind = 'user_available'), 0) player_available,
    coalesce(sum(balance) filter (where kind = 'user_locked'), 0) player_locked,
    coalesce(sum(balance) filter (where kind = 'game_escrow'), 0) game_escrow,
    coalesce(sum(balance) filter (where kind = 'house_revenue'), 0) house_revenue,
    coalesce(sum(balance) filter (where kind = 'house_bankroll'), 0) house_bankroll,
    coalesce(sum(balance) filter (where kind = 'external_custody'), 0) external_custody
  into bal
  from wallet_accounts
  where account_type = 'real' and asset = 'USD';

  select
    coalesce(sum(usd_cents) filter (where credited_at >= day_start), 0),
    coalesce(sum(usd_cents), 0)
  into dep_today, dep_all
  from (
    select usd_cents, credited_at from crypto_deposits where status = 'CREDITED'
    union all
    select case when credited_cents > 0 then credited_cents else usd_cents end as usd_cents, credited_at
    from btcpay_invoices where status = 'CREDITED'
  ) d;

  select
    coalesce(sum(usd_cents) filter (where paid_at >= day_start), 0),
    coalesce(sum(usd_cents), 0),
    coalesce(sum(fee_usd_cents) filter (where paid_at >= day_start), 0),
    coalesce(sum(fee_usd_cents), 0)
  into wd_today, wd_all, fee_today, fee_all
  from (
    select usd_cents, fee_usd_cents, confirmed_at as paid_at
    from crypto_withdrawals where status = 'CONFIRMED'
    union all
    select usd_cents, fee_usd_cents, closed_at as paid_at
    from btcpay_payouts where status = 'COMPLETED'
  ) w;

  select coalesce(sum(usd_cents), 0), count(*)::bigint
  into open_cents, open_count
  from (
    select usd_cents from crypto_withdrawals
    where status in ('PENDING', 'HELD', 'APPROVED', 'LIQUIDITY_PENDING', 'SUBMITTING', 'SUBMITTED')
    union all
    select usd_cents from btcpay_payouts
    where status in ('HOLD', 'AWAITING_APPROVAL', 'QUEUED')
  ) o;

  select coalesce(jsonb_agg(jsonb_build_object(
    'game', x.game, 'today', x.today, 'all_time', x.all_time
  ) order by x.ord), '[]'::jsonb)
  into wins
  from (
    select k.ord, k.game,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= day_start), 0) today,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0), 0) all_time
    from (values
      (1, 'Jackpot', 'jackpot_settlement'::public.tx_kind),
      (2, 'Coinflip', 'coinflip_settlement'),
      (3, 'Roulette', 'roulette_settlement'),
      (4, 'Slott', 'slot_settlement'),
      (5, 'Slott bonus', 'slot_bonus')
    ) as k(ord, game, kind)
    left join ledger_transactions t on t.kind = k.kind and t.account_type = 'real'
    left join ledger_postings p on p.tx_id = t.id
    left join wallet_accounts a on a.id = p.account_id
      and a.kind = 'user_available' and a.account_type = 'real' and a.asset = 'USD'
    group by k.ord, k.game
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', x.kind, 'today', x.today, 'all_time', x.all_time
  ) order by x.ord), '[]'::jsonb)
  into credits
  from (
    select k.ord, k.kind,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0 and t.created_at >= day_start), 0) today,
      coalesce(sum(p.amount) filter (where a.id is not null and p.amount > 0), 0) all_time
    from (values
      (1, 'Promo', 'promo_reward'::public.tx_kind),
      (2, 'Referral', 'referral_reward'),
      (3, 'Prestige', 'prestige_reward'),
      (4, 'Partner', 'partner_credit')
    ) as k(ord, kind, txkind)
    left join ledger_transactions t on t.kind = k.txkind and t.account_type = 'real'
    left join ledger_postings p on p.tx_id = t.id
    left join wallet_accounts a on a.id = p.account_id
      and a.kind = 'user_available' and a.account_type = 'real' and a.asset = 'USD'
    group by k.ord, k.kind
  ) x;

  select
    coalesce(sum(p.amount) filter (where p.amount > 0 and t.created_at >= day_start), 0),
    coalesce(sum(p.amount) filter (where p.amount > 0), 0)
  into house_fee_today, house_fee_all
  from ledger_postings p
  join ledger_transactions t on t.id = p.tx_id
  join wallet_accounts a on a.id = p.account_id
  where a.kind = 'house_revenue' and a.account_type = 'real' and a.asset = 'USD';

  select coalesce(jsonb_agg(jsonb_build_object(
    'network', y.network,
    'asset', y.asset_key,
    'total_cents', y.total_cents,
    'reserved_cents', y.reserved_cents,
    'available_cents', y.available_cents,
    'fresh', y.fresh,
    'observed_at', y.observed_at
  ) order by y.network, y.asset_key), '[]'::jsonb),
    coalesce(sum(y.total_cents) filter (where y.fresh and y.total_cents is not null), 0),
    coalesce(bool_or(not y.fresh), false)
  into wallets, fresh_cents, stale
  from (
    select t.network, t.asset_key,
      case when p.price is null or st.balance_units is null then null
        else floor(st.balance_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as total_cents,
      case when p.price is null then null
        else floor(st.reserved_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as reserved_cents,
      case when p.price is null or st.available_units is null then null
        else floor(st.available_units * p.price / power(10::numeric, t.decimals) / 10000)::bigint end as available_cents,
      st.available_units is not null as fresh,
      st.observed_at
    from treasury_assets t
    cross join lateral public._treasury_state(t.network, t.asset_key) st
    cross join lateral (select public._treasury_price(t.network, t.asset_key) as price) p
    where t.network = 'bitcoin'
      or exists (
        select 1 from chain_assets a
        join chain_networks n on n.chain_id = a.chain_id
        where 'eip155:' || a.chain_id = t.network and a.asset_key = t.asset_key and a.is_enabled and n.is_enabled
      )
  ) y;

  return jsonb_build_object(
    'server_time', clock_timestamp(),
    'balances', jsonb_build_object(
      'player_available', bal.player_available,
      'player_locked', bal.player_locked,
      'game_escrow', bal.game_escrow,
      'player_owed', bal.player_available + bal.player_locked + bal.game_escrow,
      'house_revenue', bal.house_revenue,
      'house_bankroll', bal.house_bankroll,
      'custody_net', -bal.external_custody,
      'books_balance', -bal.external_custody = bal.player_available + bal.player_locked + bal.game_escrow + bal.house_revenue + bal.house_bankroll
    ),
    'deposits', jsonb_build_object('today', dep_today, 'all_time', dep_all),
    'withdrawals', jsonb_build_object(
      'paid_today', wd_today,
      'paid_all_time', wd_all,
      'fees_today', fee_today,
      'fees_all_time', fee_all,
      'open_cents', open_cents,
      'open_count', open_count
    ),
    'winnings', wins,
    'fees', jsonb_build_object('today', house_fee_today, 'all_time', house_fee_all),
    'credits', credits,
    'wallets', wallets,
    'wallets_fresh_cents', fresh_cents,
    'wallets_stale', stale
  );
end $$;

revoke all on function public.admin_ledger_cashflow() from public, anon, authenticated;
grant execute on function public.admin_ledger_cashflow() to authenticated;

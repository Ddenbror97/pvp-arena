-- Cashout minimum is $20 on every rail (Bitcoin, USDC, ETH).
-- A cashout is refused until settled play is at least half of crypto deposits.
-- Bonus still unlocks only after deposits reach that same $20 floor.
-- Promo, referral, prize, and partner holds stay in place.

update public.crypto_settings
set min_withdrawal_cents = 2000;

drop trigger if exists chain_networks_readonly on public.chain_networks;
update public.chain_networks
set min_withdrawal_cents = 2000;
create trigger chain_networks_readonly
  before update or delete on public.chain_networks
  for each row execute function public.crypto_allowlist_guard();

-- Non-refunded game entries, plus contested poker chips once a hand sees the flop.
-- poker_entry is a table buy-in, not a wager.
create or replace function public._deposit_wager_cents(p_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(s.stake)
      from (
        select coalesce(sum(p.amount) filter (where w.kind = 'user_locked' and p.amount > 0), 0) as stake
        from ledger_transactions t
        join ledger_postings p on p.tx_id = t.id
        join wallet_accounts w on w.id = p.account_id
        where w.owner_id = p_user
          and w.account_type = 'real'
          and t.account_type = 'real'
          and t.kind::text ~ '_(entry)$'
          and t.kind::text <> 'poker_entry'
        group by t.id
      ) s
    ), 0)
    - coalesce((
      select sum(r.back)
      from (
        select coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) as back
        from ledger_transactions t
        join ledger_postings p on p.tx_id = t.id
        join wallet_accounts w on w.id = p.account_id
        where w.owner_id = p_user
          and w.account_type = 'real'
          and t.account_type = 'real'
          and t.kind::text ~ '_(refund)$'
        group by t.id
      ) r
    ), 0)
    + coalesce((
      select sum(hp.wagered)
      from poker_hand_players hp
      join poker_hands h on h.id = hp.hand_id
      where hp.user_id = p_user
        and hp.wagered > 0
        and h.status = 'COMPLETED'
        and h.account_type = 'real'
        and coalesce(array_length(h.board, 1), 0) >= 3
    ), 0);
$$;

revoke all on function public._deposit_wager_cents(uuid) from public, anon, authenticated;
grant execute on function public._deposit_wager_cents(uuid) to service_role;

create or replace function public._withdraw_basis(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_deposits bigint := 0;
  v_eligible bigint := 0;
  v_bonus bigint := 0;
  v_wagered bigint := 0;
  v_need bigint := 0;
  v_floor bigint := 0;
  v_cash bigint := 0;
  v_room bigint := 0;
begin
  perform 1 from wallet_accounts
    where owner_id = p_user and account_type = 'real' and kind in ('user_available', 'user_locked')
    order by kind
    for update;
  perform public._withdraw_basis_sync();
  select b.deposits, b.eligible, b.bonus
    into v_deposits, v_eligible, v_bonus
    from withdraw_basis_bucket b
    where b.user_id = p_user;
  v_deposits := coalesce(v_deposits, 0);
  v_eligible := greatest(coalesce(v_eligible, 0), 0);
  v_bonus := greatest(coalesce(v_bonus, 0), 0);
  v_wagered := greatest(coalesce(public._deposit_wager_cents(p_user), 0), 0);
  v_need := v_deposits / 2;
  select min_withdrawal_cents into v_floor from crypto_settings limit 1;
  v_floor := coalesce(v_floor, 0);
  v_cash := v_eligible + case when v_deposits >= v_floor then v_bonus else 0 end;
  v_room := case when v_wagered >= v_need then v_cash else 0 end;
  return jsonb_build_object(
    'deposits', v_deposits,
    'eligible', v_eligible,
    'bonus', v_bonus,
    'wagered', v_wagered,
    'wager_required', v_need,
    'cash', v_cash,
    'room', v_room
  );
end $$;

revoke all on function public._withdraw_basis(uuid) from public, anon, authenticated;
grant execute on function public._withdraw_basis(uuid) to service_role;

create or replace function public._withdraw_basis_peek(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'deposits', coalesce(b.deposits, 0),
    'eligible', greatest(coalesce(b.eligible, 0), 0),
    'bonus', greatest(coalesce(b.bonus, 0), 0),
    'wagered', greatest(coalesce(public._deposit_wager_cents(p_user), 0), 0),
    'wager_required', coalesce(b.deposits, 0) / 2,
    'cash', greatest(coalesce(b.eligible, 0), 0)
      + case
          when coalesce(b.deposits, 0) >= coalesce((select min_withdrawal_cents from crypto_settings limit 1), 0)
          then greatest(coalesce(b.bonus, 0), 0)
          else 0
        end,
    'room', case
      when greatest(coalesce(public._deposit_wager_cents(p_user), 0), 0) >= coalesce(b.deposits, 0) / 2
      then greatest(coalesce(b.eligible, 0), 0)
        + case
            when coalesce(b.deposits, 0) >= coalesce((select min_withdrawal_cents from crypto_settings limit 1), 0)
            then greatest(coalesce(b.bonus, 0), 0)
            else 0
          end
      else 0
    end
  )
  from (select 1) _
  left join public.withdraw_basis_bucket b on b.user_id = p_user;
$$;

revoke all on function public._withdraw_basis_peek(uuid) from public, anon, authenticated;
grant execute on function public._withdraw_basis_peek(uuid) to service_role;

create or replace function public._withdraw_basis_buckets_json()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      user_id::text,
      jsonb_build_object(
        'deposits', deposits,
        'eligible', eligible,
        'bonus', bonus,
        'wagered', greatest(coalesce(public._deposit_wager_cents(user_id), 0), 0),
        'wager_required', deposits / 2,
        'room', case
          when greatest(coalesce(public._deposit_wager_cents(user_id), 0), 0) >= deposits / 2
          then eligible + case
            when deposits >= coalesce((select min_withdrawal_cents from crypto_settings limit 1), 0)
            then bonus else 0 end
          else 0
        end
      )
    ),
    '{}'::jsonb
  )
  from withdraw_basis_bucket;
$$;

revoke all on function public._withdraw_basis_buckets_json() from public, anon, authenticated;
grant execute on function public._withdraw_basis_buckets_json() to service_role;

create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  referral_hold bigint;
  promo_hold bigint;
  prize_hold bigint;
  partner_hold bigint;
  profit_hold bigint;
  b0 bigint;
  bal bigint;
  basis jsonb;
  cash bigint;
  room bigint;
begin
  if public._is_active_partner(p_user) then raise exception 'PARTNER_WITHDRAWAL_BLOCKED'; end if;
  referral_hold := public.referral_unplayed_reward_cents(p_user);
  promo_hold := public.promo_restricted_cents(p_user);
  prize_hold := public.leaderboard_prize_restricted_cents(p_user);
  partner_hold := public._partner_release_block(p_user, p_balance);
  profit_hold := public._partner_profit_hold(p_user);
  if p_balance - referral_hold - promo_hold - prize_hold - partner_hold - profit_hold >= p_total then
    null;
  elsif profit_hold > 0 and p_balance - referral_hold - promo_hold - prize_hold - partner_hold >= p_total then
    raise exception 'PARTNER_PROFIT_REVIEW';
  else
    b0 := p_balance - profit_hold;
    if partner_hold > 0 and b0 - referral_hold - promo_hold - prize_hold >= p_total then
      raise exception 'PARTNER_FUNDS_HELD';
    end if;
    bal := b0 - partner_hold;
    if promo_hold > 0 and bal - referral_hold - prize_hold >= p_total then
      raise exception 'PROMO_PLAYTHROUGH';
    end if;
    if prize_hold > 0 and bal - referral_hold - promo_hold >= p_total then
      raise exception 'LEADERBOARD_PLAYTHROUGH';
    end if;
    if referral_hold > 0 and bal - promo_hold - prize_hold >= p_total then
      raise exception 'REFERRAL_PLAYTHROUGH';
    end if;
    if promo_hold > 0 then raise exception 'PROMO_PLAYTHROUGH'; end if;
    if prize_hold > 0 then raise exception 'LEADERBOARD_PLAYTHROUGH'; end if;
    if referral_hold > 0 then raise exception 'REFERRAL_PLAYTHROUGH'; end if;
    if partner_hold > 0 then raise exception 'PARTNER_FUNDS_HELD'; end if;
    raise exception 'PARTNER_PROFIT_REVIEW';
  end if;
  basis := public._withdraw_basis(p_user);
  cash := coalesce((basis->>'cash')::bigint, 0);
  room := coalesce((basis->>'room')::bigint, 0);
  if p_total > cash then
    raise exception 'BONUS_NOT_WITHDRAWABLE';
  end if;
  if p_total > room then
    raise exception 'DEPOSIT_WAGER_REQUIRED';
  end if;
end $$;

revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;

create or replace function public.crypto_quote_withdrawal(p_user uuid, p_chain bigint, p_usd_cents bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; ps crypto_price_snapshots; wei numeric; q crypto_withdrawal_quotes;
  basis jsonb; cash bigint; room bigint;
begin
  perform public._require_server_caller();
  select * into s from crypto_settings;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  if not exists (
    select 1 from chain_assets where chain_id = p_chain and asset_key = 'ETH' and is_enabled and settlement_kind = 'native'
  ) then
    raise exception 'ASSET_NOT_ALLOWLISTED';
  end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  basis := public._withdraw_basis(p_user);
  cash := coalesce((basis->>'cash')::bigint, 0);
  room := coalesce((basis->>'room')::bigint, 0);
  if p_usd_cents > cash then raise exception 'BONUS_NOT_WITHDRAWABLE'; end if;
  if p_usd_cents > room then raise exception 'DEPOSIT_WAGER_REQUIRED'; end if;
  select * into ps from crypto_price_snapshots
    where chain_id = p_chain and asset_key = 'ETH'
    order by observed_at desc limit 1;
  if ps is null or ps.price_micro_usd <= 0
     or ps.observed_at < now() - make_interval(secs => s.price_max_age_seconds)
     or ps.oracle_updated_at < now() - interval '1320 seconds' then
    raise exception 'PRICE_STALE';
  end if;
  wei := floor(p_usd_cents::numeric * 10000 * power(10::numeric, 18) / ps.price_micro_usd);
  insert into crypto_withdrawal_quotes (user_id, chain_id, asset_key, usd_cents, units, price_snapshot_id, price_micro_usd, expires_at)
    values (p_user, p_chain, 'ETH', p_usd_cents, wei, ps.id, ps.price_micro_usd, now() + make_interval(secs => s.quote_ttl_seconds))
    returning * into q;
  return jsonb_build_object('quote_id', q.id, 'usd_cents', q.usd_cents, 'wei', q.units::text,
    'price_micro_usd', q.price_micro_usd, 'expires_at', q.expires_at, 'snapshot', ps.id);
end $$;

revoke all on function public.crypto_quote_withdrawal(uuid, bigint, bigint) from public, anon, authenticated;
grant execute on function public.crypto_quote_withdrawal(uuid, bigint, bigint) to service_role;

create or replace function public.crypto_my_activity(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with basis as (select public._withdraw_basis_peek(p_user) as j)
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
    'card', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.usd_cents, c.status, c.created_at
      from nowpayments_invoices c
      where c.user_id = p_user
      order by c.created_at desc limit 20
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
    'deposit_addresses', coalesce((select jsonb_agg(jsonb_build_object('chain_id', da.chain_id, 'address', da.address, 'derivation_version', da.derivation_version) order by da.derivation_version desc, da.created_at) from crypto_deposit_addresses da where da.user_id = p_user), '[]'),
    'withdraw', (
      select jsonb_build_object(
        'room_cents', coalesce((basis.j->>'room')::bigint, 0),
        'bonus_cents', coalesce((basis.j->>'bonus')::bigint, 0),
        'deposit_cents', coalesce((basis.j->>'deposits')::bigint, 0),
        'deposit_floor_cents', (select min_withdrawal_cents from crypto_settings limit 1),
        'wagered_cents', coalesce((basis.j->>'wagered')::bigint, 0),
        'wager_required_cents', coalesce((basis.j->>'wager_required')::bigint, 0)
      )
      from basis
    ),
    'wallet', (select normalized_address from user_wallets where user_id = p_user and is_verified order by is_primary desc limit 1)
  )
  from basis
$$;

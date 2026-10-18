-- The $10 referral reward is spendable on Jackpot, Coinflip, and Roulette immediately.
-- That same $10 stays in the balance until the recipient wagers it. Other funds stay withdrawable.

alter table public.referral_rewards
  add column playthrough_cents bigint not null default 0 check (playthrough_cents >= 0),
  add column playthrough_met_cents bigint not null default 0 check (playthrough_met_cents >= 0),
  add constraint referral_rewards_playthrough check (playthrough_met_cents <= playthrough_cents);

create index referral_rewards_unplayed_idx
  on public.referral_rewards (user_id)
  where status = 'PAID' and playthrough_met_cents < playthrough_cents;

-- One settled wager, so a replayed settlement cannot clear the requirement twice.
create table public.referral_reward_wagers (
  game text not null check (game in ('jackpot', 'coinflip', 'roulette')),
  source_id text not null check (char_length(source_id) between 1 and 80),
  user_id uuid not null references public.profiles (id),
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default clock_timestamp(),
  primary key (game, source_id)
);
alter table public.referral_reward_wagers enable row level security;
revoke all on public.referral_reward_wagers from public, anon, authenticated;
grant all on public.referral_reward_wagers to service_role;

-- A paid reward locks exactly the credited amount until later settled stake covers it.
create or replace function public.referral_reward_lock_playthrough()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.playthrough_cents := new.amount_cents;
  new.playthrough_met_cents := 0;
  return new;
end $$;
drop trigger if exists referral_rewards_lock_playthrough on public.referral_rewards;
create trigger referral_rewards_lock_playthrough
  before insert on public.referral_rewards
  for each row execute function public.referral_reward_lock_playthrough();

create or replace function public.referral_unplayed_reward_cents(p_user uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(playthrough_cents - playthrough_met_cents), 0)
  from public.referral_rewards
  where user_id = p_user and status = 'PAID' and playthrough_met_cents < playthrough_cents;
$$;
revoke all on function public.referral_unplayed_reward_cents(uuid) from public, anon, authenticated;

-- Apply settled stake to the recipient's unpaid reward playthrough, oldest reward first.
-- Stake recorded before the reward existed is not stored, so it cannot clear the lock later.
create or replace function public.referral_apply_reward_wager(p_user uuid, p_game text, p_source text, p_cents bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  inserted int;
  remaining bigint := p_cents;
  reward public.referral_rewards;
  room bigint;
  take bigint;
begin
  if p_user is null or p_cents is null or p_cents <= 0 then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  if public.referral_unplayed_reward_cents(p_user) = 0 then return; end if;
  insert into public.referral_reward_wagers (game, source_id, user_id, amount_cents)
  values (p_game, p_source, p_user, p_cents)
  on conflict (game, source_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  for reward in
    select * from public.referral_rewards
    where user_id = p_user and status = 'PAID' and playthrough_met_cents < playthrough_cents
    order by created_at, id
    for update
  loop
    exit when remaining <= 0;
    room := reward.playthrough_cents - reward.playthrough_met_cents;
    take := least(room, remaining);
    update public.referral_rewards
    set playthrough_met_cents = playthrough_met_cents + take
    where id = reward.id;
    remaining := remaining - take;
  end loop;
end $$;
revoke all on function public.referral_apply_reward_wager(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_apply_reward_wager(uuid, text, text, bigint) to service_role;

create or replace function public.referral_note_play(p_user uuid, p_game text, p_source text, p_cents bigint)
returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; inserted int;
begin
  if p_user is null or p_cents is null or p_cents <= 0 then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  -- The player's own referral reward, independent of whether they were referred.
  perform public.referral_apply_reward_wager(p_user, p_game, p_source, p_cents);
  select * into r from public.referrals where referred_user_id = p_user for update;
  if r.id is null then return; end if;
  if r.status = 'PLAY_REQUIREMENT_PENDING' then
    insert into public.referral_play_events (referral_id, game, source_id, amount_cents)
    values (r.id, p_game, p_source, p_cents)
    on conflict (game, source_id) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 1 then
      update public.referrals set qualifying_play_cents = qualifying_play_cents + p_cents where id = r.id;
      perform public._audit(r.inviter_user_id, 'referral_gameplay_progress', null, jsonb_build_object('referral', r.id, 'game', p_game, 'source', p_source, 'cents', p_cents));
    end if;
  end if;
  perform public.referral_progress(p_user);
end $$;
revoke all on function public.referral_note_play(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_note_play(uuid, text, text, bigint) to service_role;

create or replace function public.referral_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cfg public.referral_config; code text; open_user uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  for open_user in
    select referred_user_id from public.referrals
    where inviter_user_id = uid and status in ('SIGNED_UP', 'DEPOSIT_PENDING', 'DEPOSIT_QUALIFIED', 'PLAY_REQUIREMENT_PENDING', 'QUALIFIED')
  loop
    begin
      perform public.referral_progress(open_user);
    exception when others then
      perform public._audit(uid, 'referral_hook_error', null, jsonb_build_object('hook', 'dashboard'));
    end;
  end loop;
  select * into cfg from public.referral_config where id;
  select i.code into code from public.referral_invites i where i.inviter_user_id = uid;
  return jsonb_build_object(
    'code', code,
    'deposit_cents', cfg.deposit_cents,
    'play_cents', cfg.play_cents,
    'reward_cents', cfg.reward_cents,
    'playthrough_left_cents', public.referral_unplayed_reward_cents(uid),
    'invited', (select count(*) from public.referrals where inviter_user_id = uid),
    'qualified', (select count(*) from public.referrals where inviter_user_id = uid and status in ('QUALIFIED', 'REWARD_PENDING', 'REWARDED')),
    'earned_cents', coalesce((select sum(reward_cents) from public.referrals where inviter_user_id = uid and status = 'REWARDED'), 0),
    'pending_cents', coalesce((select sum(reward_cents) from public.referrals where inviter_user_id = uid and status in ('QUALIFIED', 'REWARD_PENDING')), 0),
    'rows', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select p.username, r.status, r.reward_cents, r.created_at
      from public.referrals r
      join public.profiles p on p.id = r.referred_user_id
      where r.inviter_user_id = uid
      order by r.created_at desc
      limit 50
    ) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.referral_dashboard() from public;
grant execute on function public.referral_dashboard() to authenticated;

-- Same withdrawal function as 20260926220000, with the unplayed reward held back.
create or replace function public.crypto_request_withdrawal(p_user uuid, p_chain bigint, p_asset text, p_usd_cents bigint, p_quote uuid, p_env_ok boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s crypto_settings; net chain_networks; a chain_assets; w user_wallets; q crypto_withdrawal_quotes;
  units numeric; total bigint; avail uuid; locked uuid; bal bigint; tx uuid; wid uuid := gen_random_uuid();
  review boolean; used bigint; used_global bigint; payout_wei numeric; locked_wei numeric; wd_status text;
  unplayed bigint;
begin
  perform public._require_server_caller();
  if public._money_state() <> 'FINALIZED' then raise exception 'LEDGER_NOT_READY'; end if;
  select * into s from crypto_settings;
  if not s.crypto_system_enabled or not s.withdrawals_enabled then raise exception 'WITHDRAWALS_PAUSED'; end if;
  select * into net from chain_networks where chain_id = p_chain and is_enabled;
  if net is null then raise exception 'CHAIN_DISABLED'; end if;
  select * into a from chain_assets where chain_id = p_chain and asset_key = p_asset and is_enabled;
  if a is null then raise exception 'ASSET_NOT_ALLOWLISTED'; end if;
  if p_usd_cents < net.min_withdrawal_cents then raise exception 'BELOW_MINIMUM'; end if;
  if exists (select 1 from profiles where id = p_user and self_excluded_until > now()) then raise exception 'SELF_EXCLUDED'; end if;
  select * into w from user_wallets where user_id = p_user and is_verified order by is_primary desc, verified_at desc limit 1;
  if w is null then raise exception 'NO_VERIFIED_WALLET'; end if;
  if exists (
    select 1 from user_wallets o
    where o.user_id = p_user and o.is_verified and o.normalized_address <> w.normalized_address
  ) and w.became_primary_at > clock_timestamp() - interval '24 hours' then
    raise exception 'WALLET_CHANGE_COOLDOWN';
  end if;
  perform pg_advisory_xact_lock(hashtext('crypto_withdraw:' || p_user));
  if exists (select 1 from crypto_withdrawals where user_id = p_user and status in ('PENDING','HELD','APPROVED','SUBMITTING','SUBMITTED','LIQUIDITY_PENDING')) then raise exception 'WITHDRAWAL_PENDING'; end if;
  select coalesce(sum(usd_cents),0) into used from crypto_withdrawals where user_id = p_user and created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
  if used + p_usd_cents > s.daily_limit_cents then raise exception 'DAILY_LIMIT'; end if;
  select coalesce(sum(usd_cents),0) into used_global from crypto_withdrawals where created_at > now() - interval '24 hours' and status not in ('REJECTED','RELEASED');
  if used_global + p_usd_cents > s.daily_global_limit_cents then raise exception 'GLOBAL_DAILY_LIMIT'; end if;
  if a.settlement_kind = 'native' then
    select * into q from crypto_withdrawal_quotes where id = p_quote for update;
    if q is null or q.user_id <> p_user or q.asset_key <> p_asset or q.chain_id <> p_chain then raise exception 'QUOTE_INVALID'; end if;
    if q.used_at is not null then raise exception 'QUOTE_USED'; end if;
    if q.expires_at < now() then raise exception 'QUOTE_EXPIRED'; end if;
    if q.usd_cents <> p_usd_cents then raise exception 'QUOTE_MISMATCH'; end if;
    update crypto_withdrawal_quotes set used_at = now() where id = q.id;
    units := q.units;
  else
    units := p_usd_cents::numeric * power(10::numeric, a.decimals) / 100;
  end if;
  total := p_usd_cents + s.withdrawal_fee_cents;
  avail := _user_account(p_user, 'user_available', a.ledger_asset, a.ledger_account_type);
  select balance into bal from wallet_accounts where id = avail for update;
  if bal is null or bal < total then raise exception 'INSUFFICIENT_BALANCE'; end if;
  unplayed := public.referral_unplayed_reward_cents(p_user);
  if bal - unplayed < total then raise exception 'REFERRAL_PLAYTHROUGH'; end if;
  locked := _user_account(p_user, 'user_locked', a.ledger_asset, a.ledger_account_type);
  if locked is null then
    insert into wallet_accounts (owner_id, kind, asset, account_type) values (p_user, 'user_locked', a.ledger_asset, a.ledger_account_type) returning id into locked;
  end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('withdrawal', 'withdrawal:' || wid || ':hold', a.ledger_account_type, p_user, 'Withdrawal hold') returning id into tx;
  perform _post(tx, avail, -total);
  perform _post(tx, locked, total);
  review := not coalesce(p_env_ok, false) or p_usd_cents > s.auto_approve_cents;
  wd_status := case when review then 'PENDING' else 'APPROVED' end;
  if wd_status = 'APPROVED' and a.settlement_kind = 'native' and p_chain = 8453 then
    select i.payout_wei into payout_wei
      from crypto_chain_inventory i
      where i.chain_id = p_chain and i.observed_at > now() - interval '10 minutes';
    select coalesce(sum(w2.units), 0) into locked_wei
      from crypto_withdrawals w2
      where w2.chain_id = p_chain and w2.asset_key = 'ETH'
        and w2.status in ('APPROVED','LIQUIDITY_PENDING','SUBMITTING','SUBMITTED');
    if payout_wei is null or payout_wei < locked_wei + units + 50000000000000 then
      wd_status := 'LIQUIDITY_PENDING';
    end if;
  end if;
  insert into crypto_withdrawals (id, user_id, chain_id, asset_key, to_address, units, usd_cents, fee_usd_cents, status, review_required, hold_ledger_tx_id, quote_id)
    values (wid, p_user, p_chain, p_asset, w.normalized_address, units, p_usd_cents, s.withdrawal_fee_cents, wd_status, review, tx, q.id);
  perform _audit(p_user, 'crypto_withdrawal_requested', null, jsonb_build_object('withdrawal', wid, 'cents', p_usd_cents, 'asset', p_asset, 'chain', p_chain, 'review', review, 'status', wd_status));
  return jsonb_build_object('id', wid, 'status', wd_status);
end $$;

revoke execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean) from public, anon, authenticated;
grant execute on function public.crypto_request_withdrawal(uuid, bigint, text, bigint, uuid, boolean) to service_role;

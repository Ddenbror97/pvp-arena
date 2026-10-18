-- A referral reward may not push house_bankroll below zero.
-- Qualifying stake and reward playthrough come from the settled game row, not the caller's amount.

create or replace function public.referral_settled_stake(p_user uuid, p_game text, p_source text)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare
  v_game bigint;
  v_user uuid;
  stake bigint;
begin
  if p_user is null or p_source is null or length(p_source) > 80 then return null; end if;
  if p_game = 'roulette' then
    select b.amount into stake
    from public.roulette_bets b
    where b.id = p_source::uuid and b.user_id = p_user and b.status in ('WON', 'LOST') and b.amount > 0;
    return stake;
  end if;
  if p_game not in ('jackpot', 'coinflip') then return null; end if;
  v_game := split_part(p_source, ':', 1)::bigint;
  v_user := split_part(p_source, ':', 2)::uuid;
  if v_user is distinct from p_user then return null; end if;
  if p_game = 'jackpot' then
    select jp.total_amount into stake
    from public.jackpot_players jp
    join public.jackpot_games g on g.id = jp.game_id
    where jp.game_id = v_game and jp.user_id = p_user and g.status = 'COMPLETED' and jp.total_amount > 0;
    return stake;
  end if;
  select e.amount into stake
  from public.coinflip_entries e
  join public.coinflip_games g on g.id = e.game_id
  where e.game_id = v_game and e.user_id = p_user and g.status = 'COMPLETED' and e.amount > 0;
  return stake;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return null;
end $$;
revoke all on function public.referral_settled_stake(uuid, text, text) from public, anon, authenticated;

create or replace function public.referral_try_pay(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; cfg public.referral_config; dep public.crypto_deposits;
  v_asset text; v_type text; v_bank public.account_kind; tx uuid; key text;
  bank uuid; bank_bal bigint;
begin
  select * into r from public.referrals where id = p_id for update;
  if r.id is null or r.status <> 'QUALIFIED' then return; end if;
  if exists (select 1 from public.referral_rewards where referral_id = r.id and status = 'PAID') then
    update public.referrals set status = 'REWARD_PENDING' where id = r.id and status = 'QUALIFIED';
    update public.referrals set status = 'REWARDED', rewarded_at = coalesce(rewarded_at, clock_timestamp()) where id = r.id and status = 'REWARD_PENDING';
    return;
  end if;
  select * into cfg from public.referral_config where id;
  select * into dep from public.crypto_deposits where id = r.qualifying_deposit_id;
  if dep.id is null or dep.status <> 'CREDITED' or dep.user_id <> r.referred_user_id or dep.ledger_tx_id is null or dep.usd_cents < cfg.deposit_cents then
    return;
  end if;
  if r.qualifying_play_cents < cfg.play_cents then return; end if;
  if public._referral_shared_wallet(r.inviter_user_id, r.referred_user_id) then
    update public.referrals set status = 'FRAUD_REVIEW' where id = r.id;
    perform public._audit(r.inviter_user_id, 'referral_fraud_review', null, jsonb_build_object('referral', r.id, 'reason', 'shared_wallet'));
    return;
  end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = r.inviter_user_id and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = r.inviter_user_id and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  -- Hold the bankroll row across the debit. A short balance stays QUALIFIED and pays on a later retry.
  if v_bank = 'house_bankroll' then
    bank := public._system_account(v_bank, v_asset, v_type);
    select balance into bank_bal from public.wallet_accounts where id = bank for update;
    if bank_bal is null or bank_bal < r.reward_cents then
      perform public._audit(r.inviter_user_id, 'referral_reward_deferred', null, jsonb_build_object('referral', r.id, 'reason', 'insufficient_bankroll', 'bankroll_cents', bank_bal));
      return;
    end if;
  end if;
  key := 'referral:reward:' || r.id::text;
  update public.referrals set status = 'REWARD_PENDING' where id = r.id;
  insert into public.referral_rewards (referral_id, user_id, amount_cents, currency, status, deposit_id, idempotency_key)
  values (r.id, r.inviter_user_id, r.reward_cents, 'USD', 'PENDING', dep.id, key)
  on conflict (referral_id) do nothing;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('referral_reward', key, v_type, r.inviter_user_id, 'Friend referral reward')
  on conflict (idempotency_key) do nothing
  returning id into tx;
  if tx is null then
    select id into tx from public.ledger_transactions where idempotency_key = key;
  end if;
  if not exists (select 1 from public.ledger_postings where tx_id = tx) then
    perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -r.reward_cents);
    perform public._post(tx, public._user_account(r.inviter_user_id, 'user_available', v_asset, v_type), r.reward_cents);
  end if;
  update public.referral_rewards set status = 'PAID', ledger_tx_id = tx, paid_at = clock_timestamp() where referral_id = r.id;
  update public.referrals set status = 'REWARDED', rewarded_at = clock_timestamp() where id = r.id;
  perform public._audit(r.inviter_user_id, 'referral_reward_created', null, jsonb_build_object('referral', r.id, 'cents', r.reward_cents, 'tx', tx));
  perform public._audit(r.inviter_user_id, 'referral_reward_paid', null, jsonb_build_object('referral', r.id, 'cents', r.reward_cents, 'tx', tx, 'idempotency_key', key));
end $$;
revoke all on function public.referral_try_pay(uuid) from public, anon, authenticated;

create or replace function public.referral_apply_reward_wager(p_user uuid, p_game text, p_source text, p_cents bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  stake bigint;
  inserted int;
  remaining bigint;
  reward public.referral_rewards;
  room bigint;
  take bigint;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  stake := public.referral_settled_stake(p_user, p_game, p_source);
  if stake is null or stake <= 0 then return; end if;
  if public.referral_unplayed_reward_cents(p_user) = 0 then return; end if;
  remaining := stake;
  insert into public.referral_reward_wagers (game, source_id, user_id, amount_cents)
  values (p_game, p_source, p_user, stake)
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
declare r public.referrals; inserted int; stake bigint;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  stake := public.referral_settled_stake(p_user, p_game, p_source);
  if stake is not null and stake > 0 then
    perform public.referral_apply_reward_wager(p_user, p_game, p_source, stake);
    select * into r from public.referrals where referred_user_id = p_user for update;
    if r.id is not null and r.status = 'PLAY_REQUIREMENT_PENDING' then
      insert into public.referral_play_events (referral_id, game, source_id, amount_cents)
      values (r.id, p_game, p_source, stake)
      on conflict (game, source_id) do nothing;
      get diagnostics inserted = row_count;
      if inserted = 1 then
        update public.referrals set qualifying_play_cents = qualifying_play_cents + stake where id = r.id;
        perform public._audit(r.inviter_user_id, 'referral_gameplay_progress', null, jsonb_build_object('referral', r.id, 'game', p_game, 'source', p_source, 'cents', stake));
      end if;
    end if;
  end if;
  perform public.referral_progress(p_user);
end $$;
revoke all on function public.referral_note_play(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_note_play(uuid, text, text, bigint) to service_role;

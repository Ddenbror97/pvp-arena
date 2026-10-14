-- One lock order for every money path, so no two transactions can wait on each other:
--   1. the game row (or poker seat / table)
--   2. participant wallets, both kinds, sorted by (owner_id, kind)
--   3. system accounts, sorted by kind::text
--      (external_custody < game_escrow < house_bankroll < house_revenue < test_faucet)
--   4. the Slott promo budget row
-- User-scoped rows (prestige, promo and referral holds) are touched only while that
-- user's wallets are held. A referral reward paid from inside another user's settlement
-- cannot take the inviter's wallets in order, so it takes them NOWAIT and defers.
-- Each function below is its previous definition with only the lock lines added.

create or replace function public._lock_system_accounts(p_kinds public.account_kind[], p_asset text, p_type text)
returns void
language plpgsql security definer set search_path = public as $$
declare k public.account_kind;
begin
  foreach k in array p_kinds loop
    perform public._system_account(k, p_asset, p_type);
  end loop;
  perform 1 from wallet_accounts
    where owner_id is null and kind = any (p_kinds) and asset = p_asset and account_type = p_type
    order by kind::text
    for update;
end $$;

revoke all on function public._lock_system_accounts(public.account_kind[], text, text) from public, anon, authenticated;
grant execute on function public._lock_system_accounts(public.account_kind[], text, text) to service_role;

-- jackpot_settle/1
create or replace function public.jackpot_settle(p_game_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare g public.jackpot_games; seed bytea; d record; winner uuid; wtotal bigint; sum_amt bigint; n_entries int;
  rake bigint; payout bigint; tx uuid; escrow uuid; house uuid; p record; err text; waived boolean := false;
  n int; permanent boolean;
begin
  select * into g from jackpot_games where id = p_game_id for update;
  if not found then return 'not_found'; end if;
  if g.status in ('COMPLETED','CANCELLED','WAITING') then return 'noop'; end if;
  if g.status = 'ACTIVE' then
    if clock_timestamp() < g.scheduled_end_at then return 'not_due'; end if;
    update jackpot_games set status = 'DRAWING', drawn_at = clock_timestamp() where id = g.id;
    insert into jackpot_payouts (game_id) values (g.id) on conflict do nothing;
    perform _audit(null, 'game_locked', g.id, jsonb_build_object('pot', g.pot_amount, 'players', g.player_count));
    g.status := 'DRAWING';
  end if;

  begin
    if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
    select server_seed into seed from jackpot_game_secrets where game_id = g.id;
    if seed is null then raise exception 'SEED_MISSING'; end if;
    if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then
      raise exception 'INVARIANT_COMMITMENT';
    end if;
    select coalesce(sum(amount),0), count(*) into sum_amt, n_entries from jackpot_entries where game_id = g.id;
    if sum_amt <> g.pot_amount or n_entries <> g.entry_count then raise exception 'INVARIANT_POT_MISMATCH'; end if;
    if (select coalesce(sum(total_amount),0) from jackpot_players where game_id = g.id) <> g.pot_amount then raise exception 'INVARIANT_PLAYERS_MISMATCH'; end if;
    if exists (select 1 from (select ticket_start, lag(ticket_end, 1, 0::bigint) over (order by ticket_start) prev_end
               from jackpot_entries where game_id = g.id) t where t.ticket_start <> t.prev_end) then
      raise exception 'INVARIANT_TICKET_GAP';
    end if;
    perform _coinflip_lock_wallets(array(select user_id from jackpot_players where game_id = g.id order by user_id),
      g.asset, g.account_type);
    perform _lock_system_accounts(array['game_escrow', 'house_revenue']::account_kind[], g.asset, g.account_type);

    select * into d from jackpot_draw_ticket(seed, g.id, g.draw_version, g.pot_amount);
    select user_id into winner from jackpot_entries where game_id = g.id and ticket_start <= d.ticket and ticket_end > d.ticket;
    if winner is null then raise exception 'INVARIANT_NO_WINNER'; end if;
    select total_amount into wtotal from jackpot_players where game_id = g.id and user_id = winner;
    rake := (g.pot_amount * g.rake_bps) / 10000;
    if _fee_ticket_take(winner, 'jackpot', g.id, rake) then rake := 0; waived := true; end if;
    payout := g.pot_amount - rake;

    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('jackpot_settlement', 'settle:' || g.id, g.account_type, winner, g.id, 'Jackpot settlement') returning id into tx;
    escrow := _system_account('game_escrow', g.asset, g.account_type);
    for p in select user_id, total_amount from jackpot_players where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(p.user_id, 'user_locked', g.asset, g.account_type), -p.total_amount);
    end loop;
    perform _post(tx, escrow, g.pot_amount);
    perform _post(tx, escrow, -g.pot_amount);
    perform _post(tx, _user_account(winner, 'user_available', g.asset, g.account_type), payout);
    if rake > 0 then
      house := _system_account('house_revenue', g.asset, g.account_type);
      perform _post(tx, house, rake);
    end if;

    update jackpot_payouts set status = 'SETTLED', attempts = attempts + 1, ledger_tx_id = tx, settled_at = clock_timestamp(),
      last_error = null, next_retry_at = null
      where game_id = g.id;
    update jackpot_games set status = 'COMPLETED', completed_at = clock_timestamp(), winning_ticket = d.ticket, draw_counter = d.counter,
      winner_id = winner, winner_total = wtotal, payout_amount = payout, rake_amount = rake, server_seed = encode(seed, 'hex')
      where id = g.id;
    perform _audit(null, 'game_settled', g.id, jsonb_build_object('winner', winner, 'ticket', d.ticket, 'payout', payout, 'rake', rake, 'fee_waived', waived));
  exception when others then
    err := sqlerrm;
    permanent := err like 'INVARIANT%' or err like 'SEED_MISSING%';
    update jackpot_payouts
      set status = 'FAILED',
          attempts = attempts + 1,
          last_error = left(err, 500),
          next_retry_at = case
            when attempts + 1 >= (case when permanent then 3 else 8 end) then null
            else clock_timestamp() + make_interval(secs => (
              least(power(2, least(attempts + 1, 12))::int, 900)
              + floor(random() * least(power(2, least(attempts + 1, 8))::int, 30))::int
            ))
          end
      where game_id = g.id
      returning attempts into n;
    if coalesce(n, 0) >= (case when permanent then 3 else 8 end) then
      perform _note_settlement_exhausted(
        'jackpot_settlement_exhausted',
        'jpse:' || g.id,
        jsonb_build_object('game_id', g.id, 'attempts', n, 'permanent', permanent, 'error', left(err, 500))
      );
      perform _audit(null, 'settlement_exhausted', g.id, jsonb_build_object('error', left(err, 500), 'attempts', n));
    else
      perform _audit(null, 'settlement_failed', g.id, jsonb_build_object('error', err));
    end if;
    return 'failed';
  end;
  return 'settled';
end;
$$;

-- prestige_claim/1
create or replace function public.prestige_claim(p_reward uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.prestige_rewards; up public.user_prestige;
  v_asset text; v_type text; v_bank public.account_kind; tx uuid; inserted int; v_amount bigint;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  perform public._assert_live_session();
  select * into r from public.prestige_rewards where id = p_reward;
  if not found or r.reward_type not in ('usdc', 'lootbox')
     or (r.reward_type = 'usdc' and (r.amount is null or r.amount <= 0)) then
    raise exception 'NOT_A_REWARD';
  end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    perform public._coinflip_lock_wallets(array[uid], 'USD', 'real');
  else
    perform public._coinflip_lock_wallets(array[uid], 'TEST_USD', 'test_credit');
  end if;
  select * into up from public.user_prestige where user_id = uid for update;
  if up.user_id is null or up.current_level < r.level then raise exception 'LOCKED'; end if;
  v_amount := case when r.reward_type = 'lootbox' then public._prestige_loot_roll() else r.amount end;
  insert into public.user_reward_claims (user_id, reward_id, amount, currency)
  values (uid, r.id, v_amount, coalesce(r.currency, 'USD'))
  on conflict (user_id, reward_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then raise exception 'ALREADY_CLAIMED'; end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
    values ('prestige_reward', 'prestige:reward:' || uid::text || ':' || r.id::text, v_type, uid,
            case when r.reward_type = 'lootbox' then 'Prestige loot box' else 'Prestige milestone' end)
    returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -v_amount);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), v_amount);
  update public.user_reward_claims set transaction_id = tx where user_id = uid and reward_id = r.id;
  perform public._audit(uid, 'prestige_reward_claimed', null,
    jsonb_build_object('reward', r.id, 'type', r.reward_type, 'cents', v_amount, 'tx', tx));
  return public.prestige_state();
end $$;

-- _lb_pay_campaign/1
create or replace function public._lb_pay_campaign(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a public.leaderboard_prize_awards;
  tx uuid;
  avail uuid;
  house uuid;
begin
  house := public._system_account('house_bankroll', 'USD', 'real');
  perform 1 from wallet_accounts w
    where w.account_type = 'real' and w.asset = 'USD' and w.kind in ('user_available', 'user_locked')
      and w.owner_id in (
        select x.player_id from leaderboard_prize_awards x
        where x.campaign_id = p_campaign and x.payout_status = 'pending'
        order by x.final_rank
        limit 25)
    order by w.owner_id, w.kind
    for update;
  for a in
    select * from leaderboard_prize_awards
    where campaign_id = p_campaign and payout_status = 'pending'
    order by final_rank
    limit 25
  loop
    begin
      select id into tx from ledger_transactions where idempotency_key = 'lb-prize:' || a.id::text;
      if tx is null then
        avail := public._user_account(a.player_id, 'user_available', 'USD', 'real');
        if avail is null then
          insert into wallet_accounts (owner_id, kind, asset, account_type)
            values (a.player_id, 'user_available', 'USD', 'real')
            returning id into avail;
        end if;
        insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
          values ('leaderboard_prize', 'lb-prize:' || a.id::text, 'real', a.player_id, 'Leaderboard prize')
          returning id into tx;
        perform public._post(tx, house, -a.reward_cents);
        perform public._post(tx, avail, a.reward_cents);
      end if;
      insert into leaderboard_prize_holds (award_id, user_id, reward_cents, required_wager_cents, ledger_tx_id)
      values (a.id, a.player_id, a.reward_cents, a.reward_cents, tx)
      on conflict (award_id) do nothing;
      update leaderboard_prize_awards
        set payout_status = 'paid', ledger_tx_id = tx, paid_at = coalesce(paid_at, clock_timestamp()), last_error = null
        where id = a.id and payout_status = 'pending';
      perform public._audit(null, 'leaderboard_prize_paid', null,
        jsonb_build_object('campaign_id', p_campaign, 'award_id', a.id, 'cents', a.reward_cents, 'ledger_tx_id', tx));
    exception when others then
      update leaderboard_prize_awards
        set payout_status = 'failed', last_error = left(sqlerrm, 160)
        where id = a.id and payout_status = 'pending';
      perform public._audit(null, 'leaderboard_prize_failed', null,
        jsonb_build_object('campaign_id', p_campaign, 'award_id', a.id, 'error', left(sqlerrm, 160)));
    end;
  end loop;
end $$;

-- promo_claim/1
create or replace function public.promo_claim(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  canonical text;
  promo public.promo_codes;
  claim_id uuid := gen_random_uuid();
  tx uuid;
  key text;
  v_asset text;
  v_type text;
  v_bank public.account_kind;
  bank uuid;
  v_ip inet;
  cname text;
  linked uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if not exists (select 1 from public.profiles where id = uid) then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext('promo_claim:' || uid::text));
  v_ip := public._promo_client_ip();
  if v_ip is null then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('reason', 'ip_unavailable'));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  perform pg_advisory_xact_lock(hashtext('promo_ip:' || host(v_ip)));
  canonical := public._promo_code(p_code);
  if canonical is null then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  select * into promo from public.promo_codes where promo_codes.code = canonical for update;
  if promo.id is null then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if promo.partner_user_id is not null and not public._is_active_partner(promo.partner_user_id) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'partner_inactive'));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if not promo.active
     or (promo.expires_at is not null and promo.expires_at <= clock_timestamp())
     or promo.claim_count >= promo.max_claims then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if exists (select 1 from public.promo_claims c where c.user_id = uid)
     or exists (
       select 1 from public.ledger_transactions t
       where t.user_id = uid and t.kind = 'promo_reward'
     ) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'PROMO_ALREADY_REDEEMED'));
    return jsonb_build_object('ok', false, 'reason', 'PROMO_ALREADY_REDEEMED');
  end if;
  if exists (select 1 from public.promo_claims c where c.client_ip = v_ip) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'PROMO_IP_ALREADY_REDEEMED', 'ip', host(v_ip)));
    return jsonb_build_object('ok', false, 'reason', 'PROMO_IP_ALREADY_REDEEMED');
  end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  perform public._coinflip_lock_wallets(array[uid], v_asset, v_type);
  if v_bank = 'house_bankroll' then
    bank := public._system_account(v_bank, v_asset, v_type);
    perform 1 from public.wallet_accounts where id = bank for update;
  end if;
  key := 'promo:claim:' || claim_id::text;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('promo_reward', key, v_type, uid, 'Promo ' || canonical)
  returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -promo.reward_cents);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), promo.reward_cents);
  insert into public.promo_claims (id, promo_code_id, user_id, reward_cents, required_wager_cents, ledger_tx_id, client_ip)
  values (claim_id, promo.id, uid, promo.reward_cents, promo.reward_cents, tx, v_ip);
  update public.promo_codes set claim_count = claim_count + 1 where id = promo.id and claim_count < max_claims;
  if not found then raise exception 'PROMO_EXHAUSTED'; end if;
  if promo.partner_user_id is not null and not public._is_active_partner(uid) then
    insert into public.partner_referrals (user_id, partner_user_id, source, promo_code_id, promo_claim_id)
    values (uid, promo.partner_user_id, 'promo', promo.id, claim_id)
    on conflict (user_id) do nothing
    returning user_id into linked;
    if linked is not null then
      perform public._audit(uid, 'partner_referral_attributed', null, jsonb_build_object(
        'partner', promo.partner_user_id, 'code', canonical, 'source', 'promo'
      ));
    end if;
  end if;
  perform public._audit(uid, 'promo_claimed', null, jsonb_build_object(
    'code', canonical, 'cents', promo.reward_cents, 'tx', tx, 'claim', claim_id, 'ip', host(v_ip)
  ));
  return jsonb_build_object('ok', true, 'reward_cents', promo.reward_cents, 'required_wager_cents', promo.reward_cents);
exception
  when unique_violation then
    get stacked diagnostics cname = CONSTRAINT_NAME;
    if cname = 'promo_claims_one_ip'
       or exists (select 1 from public.promo_claims c where c.client_ip = v_ip and c.user_id is distinct from uid) then
      return jsonb_build_object('ok', false, 'reason', 'PROMO_IP_ALREADY_REDEEMED');
    end if;
    if cname in ('promo_claims_one_account', 'promo_claims_promo_code_id_user_id_key')
       or exists (select 1 from public.promo_claims c where c.user_id = uid)
       or exists (
         select 1 from public.ledger_transactions t
         where t.user_id = uid and t.kind = 'promo_reward'
       ) then
      return jsonb_build_object('ok', false, 'reason', 'PROMO_ALREADY_REDEEMED');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
end $$;

-- partner_admin_topup/4
create or replace function public.partner_admin_topup(p_user uuid, p_amount_cents bigint, p_note text, p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); s public.partner_settings; prior public.partner_topups;
  v_note text := nullif(btrim(coalesce(p_note, '')), ''); tx uuid; topup uuid := gen_random_uuid();
  v_asset text; v_type text; v_bank public.account_kind; bank uuid;
begin
  if p_user is null or p_request_id is null then raise exception 'BAD_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtext('partner_topup:' || p_request_id::text));
  select * into prior from public.partner_topups where request_id = p_request_id;
  if prior.id is not null then
    if prior.user_id <> p_user or prior.amount_cents <> p_amount_cents then raise exception 'REQUEST_REUSED'; end if;
    return jsonb_build_object('ok', true, 'id', prior.id, 'amount_cents', prior.amount_cents, 'duplicate', true);
  end if;
  select * into s from public.partner_settings where id;
  if p_amount_cents is null or p_amount_cents < s.min_topup_cents or p_amount_cents > s.max_topup_cents then
    raise exception 'BAD_AMOUNT';
  end if;
  if v_note is not null and char_length(v_note) > 200 then raise exception 'BAD_NOTE'; end if;
  perform 1 from public.partners where user_id = p_user and active for update;
  if not found then raise exception 'NOT_PARTNER'; end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = p_user and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = p_user and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  perform public._coinflip_lock_wallets(array[p_user], v_asset, v_type);
  bank := public._system_account(v_bank, v_asset, v_type);
  perform 1 from public.wallet_accounts where id = bank for update;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('partner_credit', 'partner:topup:' || p_request_id::text, v_type, p_user, 'Partner promotional credit')
  returning id into tx;
  perform public._post(tx, bank, -p_amount_cents);
  perform public._post(tx, public._user_account(p_user, 'user_available', v_asset, v_type), p_amount_cents);
  insert into public.partner_topups (id, user_id, amount_cents, note, admin_id, request_id, ledger_tx_id)
  values (topup, p_user, p_amount_cents, v_note, uid, p_request_id, tx);
  perform public._audit(uid, 'partner_credit_added', null, jsonb_build_object('user', p_user, 'cents', p_amount_cents, 'tx', tx, 'topup', topup));
  return jsonb_build_object('ok', true, 'id', topup, 'amount_cents', p_amount_cents, 'duplicate', false);
end $$;

-- referral_try_pay/1
create or replace function public.referral_try_pay(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
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
  -- Often runs inside another user's settlement, after that tx took system accounts, so the
  -- inviter's wallets and the bankroll are taken NOWAIT: contention raises 55P03 and the
  -- reward stays QUALIFIED for the next progress, dashboard or claim call.
  perform 1 from public.wallet_accounts
    where owner_id = r.inviter_user_id and asset = v_asset and account_type = v_type
      and kind in ('user_available', 'user_locked')
    order by kind
    for update nowait;
  -- Hold the bankroll row across the debit. A short balance stays QUALIFIED and pays on a later retry.
  if v_bank = 'house_bankroll' then
    bank := public._system_account(v_bank, v_asset, v_type);
    select balance into bank_bal from public.wallet_accounts where id = bank for update nowait;
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

-- _slot_spin/4
create or replace function public._slot_spin(p_game_id bigint, p_actor uuid, p_auto boolean, p_key text) returns public.slot_spins
language plpgsql security definer set search_path = public, extensions as $$
declare
  g public.slot_games; c public.slot_config; pc public.slot_promo_config; t public.slot_bonus_tiers;
  bud public.slot_bonus_budget; sp public.slot_spins;
  seed bytea; n int; v_seat text; pid uuid; grid smallint[]; sc record; ts timestamptz; reveal timestamptz;
  req bigint := 0; award bigint := 0; used bigint; u uuid; v_day date; tx uuid; bank public.account_kind;
  sa int; sb int; done boolean; skip text; points int;
begin
  select * into g from slot_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if g.status <> 'ACTIVE' or g.ends_at is not null then raise exception 'MATCH_NOT_ACTIVE'; end if;
  n := g.next_spin;
  v_seat := case when n % 2 = 1 then 'A' else 'B' end;
  pid := case when v_seat = 'A' then g.creator_id else g.opponent_id end;
  ts := clock_timestamp();
  if p_auto then
    if ts < g.turn_deadline then raise exception 'TURN_NOT_EXPIRED'; end if;
  else
    if p_actor is distinct from pid then raise exception 'NOT_YOUR_TURN'; end if;
    if ts < g.turn_opens_at then raise exception 'TURN_NOT_OPEN'; end if;
  end if;

  select server_seed into seed from slot_game_secrets where game_id = g.id;
  if seed is null then raise exception 'SEED_MISSING'; end if;
  if encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  if g.protocol_version = 'v1' then
    grid := public.slot_spin_grid(seed, g.id, n);
  elsif g.protocol_version = 'v2' then
    grid := public.slot_spin_grid_v2(seed, g.id, n);
  elsif g.protocol_version = 'v3' then
    grid := public.slot_spin_grid_v3(seed, g.id, n);
  else
    raise exception 'INVARIANT_PROTOCOL';
  end if;
  reveal := ts + g.spin_ms * interval '1 millisecond';

  -- Either seat landing a bomb ends the match. That spin scores nothing and awards no bonus.
  if g.protocol_version in ('v2', 'v3') and 20 = any (grid) then
    insert into slot_spins (game_id, spin_no, seat, player_id, auto, idempotency_key, grid, wild_count, base_score, line_score,
                            score, lines, bonus_cents, created_at, reveal_at)
      values (g.id, n, v_seat, pid, p_auto, case when p_auto then null else p_key end, grid, 0, 0, 0,
              0, '[]'::jsonb, 0, ts, reveal)
      returning * into sp;
    update slot_games set next_spin = n + 1,
      turn_opens_at = null, turn_deadline = null, ends_at = reveal
      where id = g.id;
    perform _audit_slot(pid, case when p_auto then 'SPIN_AUTO' else 'SPIN' end, g.id, jsonb_build_object(
      'spin', n, 'seat', v_seat, 'score', 0, 'wilds', 0, 'bonus', 0, 'final', true, 'bomb', true));
    return sp;
  end if;

  select * into sc from slot_score_v1(grid);

  select * into t from slot_bonus_tiers where min_wilds <= sc.wilds order by min_wilds desc limit 1;
  if found then
    req := (g.stake * t.stake_bps) / 10000;
    select * into c from slot_config;
    select * into pc from slot_promo_config;
    v_day := (clock_timestamp() at time zone 'utc')::date;
    if req <= 0 then skip := 'ZERO_REQUEST';
    elsif not coalesce(pc.enabled, false) then skip := 'PROMO_DISABLED';
    else
      award := least(req, c.max_event_bonus_cents, g.bonus_cap - g.bonus_total);
      perform _lock_system_accounts(array['game_escrow',
        case when g.account_type = 'real' then 'house_bankroll' else 'test_faucet' end]::account_kind[],
        g.asset, g.account_type);
      insert into slot_bonus_budget (day, budget_cents) values (v_day, pc.daily_budget_cents) on conflict (day) do nothing;
      select * into bud from slot_bonus_budget where day = v_day for update;
      award := least(award, bud.budget_cents - bud.reserved_cents);
      foreach u in array array[g.creator_id, g.opponent_id] loop
        select coalesce(sum(e.awarded_cents), 0) into used
          from slot_bonus_events e join slot_games x on x.id = e.game_id
          where e.budget_day = v_day and e.status <> 'RETURNED' and (x.creator_id = u or x.opponent_id = u);
        award := least(award, pc.user_daily_cap_cents - used);
      end loop;
      if award <= 0 then award := 0; skip := 'CAP_OR_BUDGET_EXHAUSTED'; end if;
    end if;
  end if;

  points := sc.base + sc.line_score;
  insert into slot_spins (game_id, spin_no, seat, player_id, auto, idempotency_key, grid, wild_count, base_score, line_score,
                          score, lines, bonus_cents, created_at, reveal_at)
    values (g.id, n, v_seat, pid, p_auto, case when p_auto then null else p_key end, grid, sc.wilds, sc.base, sc.line_score,
            points, sc.lines, award, ts, reveal)
    returning * into sp;

  if award > 0 then
    update slot_bonus_budget set reserved_cents = reserved_cents + award, updated_at = clock_timestamp() where day = v_day;
    bank := case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end;
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_bonus', 'slot:' || g.id || ':bonus:' || n, g.account_type, pid, g.id, 'P2P Slott promotional bonus to match pool')
      returning id into tx;
    perform _post(tx, _system_account(bank, g.asset, g.account_type), -award);
    perform _post(tx, _system_account('game_escrow', g.asset, g.account_type), award);
    insert into slot_bonus_events (game_id, spin_no, triggered_by, wild_count, tier, tier_bps, requested_cents, awarded_cents,
                                   pool_before, pool_after, budget_day, ledger_tx_id)
      values (g.id, n, pid, sc.wilds, t.tier, t.stake_bps, req, award,
              g.p2p_pot + g.bonus_total, g.p2p_pot + g.bonus_total + award, v_day, tx);
    perform _audit_slot(pid, 'BONUS_AWARDED', g.id, jsonb_build_object('spin', n, 'tier', t.tier, 'wilds', sc.wilds,
      'requested', req, 'awarded', award, 'pool_before', g.p2p_pot + g.bonus_total, 'pool_after', g.p2p_pot + g.bonus_total + award,
      'budget_day', v_day, 'ledger_tx', tx));
  elsif skip is not null then
    perform _audit_slot(pid, 'BONUS_SKIPPED', g.id, jsonb_build_object('spin', n, 'tier', t.tier, 'wilds', sc.wilds,
      'requested', req, 'reason', skip));
  end if;

  sa := g.score_a + case when v_seat = 'A' then points else 0 end;
  sb := g.score_b + case when v_seat = 'B' then points else 0 end;
  done := n >= g.base_spins and n % 2 = 0 and (sa <> sb or n >= g.max_spins);
  update slot_games set next_spin = n + 1, score_a = sa, score_b = sb, bonus_total = bonus_total + award,
    turn_opens_at = case when done then null else reveal end,
    turn_deadline = case when done then null else reveal + g.turn_seconds * interval '1 second' end,
    ends_at = case when done then reveal else null end
    where id = g.id;
  perform _audit_slot(pid, case when p_auto then 'SPIN_AUTO' else 'SPIN' end, g.id, jsonb_build_object('spin', n, 'seat', v_seat,
    'score', points, 'wilds', sc.wilds, 'bonus', award, 'final', done));
  return sp;
end $$;

-- _slot_settle/1
create or replace function public._slot_settle(p_game_id bigint) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare g public.slot_games; seed bytea; n_entries int; sum_amt bigint; ev_total bigint; tx uuid; escrow uuid;
  fee bigint; payout bigint; winner uuid; e record; bank public.account_kind; waived boolean := false; bombed boolean;
begin
  select * into g from slot_games where id = p_game_id for update;
  if g.status <> 'SETTLEMENT' then return 'noop'; end if;
  if current_setting('pvp.fail_settlement', true) = 'on' then raise exception 'INJECTED_FAILURE'; end if;
  select count(*), coalesce(sum(amount), 0) into n_entries, sum_amt from slot_entries where game_id = g.id and amount = g.stake;
  if n_entries <> 2 or sum_amt <> g.p2p_pot then raise exception 'INVARIANT_ENTRIES'; end if;
  select coalesce(sum(awarded_cents), 0) into ev_total from slot_bonus_events where game_id = g.id and status = 'AWARDED';
  if ev_total <> g.bonus_total then raise exception 'INVARIANT_BONUS'; end if;
  select server_seed into seed from slot_game_secrets where game_id = g.id;
  if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  if g.protocol_version = 'v1' then
    if exists (select 1 from slot_spins s where s.game_id = g.id
               and s.grid <> slot_spin_grid(seed, g.id, s.spin_no)) then
      raise exception 'INVARIANT_RESULT';
    end if;
  elsif g.protocol_version = 'v2' then
    if exists (select 1 from slot_spins s where s.game_id = g.id
               and s.grid <> slot_spin_grid_v2(seed, g.id, s.spin_no)) then
      raise exception 'INVARIANT_RESULT';
    end if;
  elsif g.protocol_version = 'v3' then
    if exists (select 1 from slot_spins s where s.game_id = g.id
               and s.grid <> slot_spin_grid_v3(seed, g.id, s.spin_no)) then
      raise exception 'INVARIANT_RESULT';
    end if;
  else
    raise exception 'INVARIANT_PROTOCOL';
  end if;

  bombed := g.protocol_version in ('v2', 'v3') and exists (
    select 1 from slot_spins s where s.game_id = g.id and 20 = any (s.grid));

  perform _coinflip_lock_wallets(array[g.creator_id, g.opponent_id], g.asset, g.account_type);
  perform _lock_system_accounts(array['game_escrow', 'house_revenue']::account_kind[]
    || case when g.bonus_total > 0 then array[case when g.account_type = 'real' then 'house_bankroll'
                                                  else 'test_faucet' end]::account_kind[]
            else array[]::account_kind[] end,
    g.asset, g.account_type);
  escrow := _system_account('game_escrow', g.asset, g.account_type);
  if bombed then
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_settlement', 'slot:' || g.id || ':bomb', g.account_type, null, g.id, 'P2P Slott bomb')
      returning id into tx;
    for e in select user_id, amount from slot_entries where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
    end loop;
    perform _post(tx, escrow, g.p2p_pot);
    perform _post(tx, escrow, -g.p2p_pot);
    perform _post(tx, _system_account('house_revenue', g.asset, g.account_type), g.p2p_pot);
    if g.bonus_total > 0 then
      bank := case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end;
      for e in select budget_day, sum(awarded_cents) amt from slot_bonus_events where game_id = g.id and status = 'AWARDED'
               group by budget_day order by budget_day loop
        update slot_bonus_budget set reserved_cents = reserved_cents - e.amt, updated_at = clock_timestamp() where day = e.budget_day;
      end loop;
      perform _post(tx, _system_account(bank, g.asset, g.account_type), g.bonus_total);
      perform _post(tx, escrow, -g.bonus_total);
      update slot_bonus_events set status = 'RETURNED', return_tx_id = tx where game_id = g.id and status = 'AWARDED';
    end if;
    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update slot_games set status = 'COMPLETED', completed_at = clock_timestamp(), outcome = 'BOMB', winner_id = null,
      fee_amount = g.p2p_pot, payout_amount = 0, server_seed = encode(seed, 'hex'), last_error = null where id = g.id;
    perform _audit_slot(null, 'GAME_COMPLETED', g.id, jsonb_build_object('outcome', 'BOMB', 'score_a', g.score_a,
      'score_b', g.score_b, 'p2p_pot', g.p2p_pot, 'bonus_returned', g.bonus_total, 'ledger_tx', tx));
  elsif g.score_a <> g.score_b then
    winner := case when g.score_a > g.score_b then g.creator_id else g.opponent_id end;
    fee := (g.p2p_pot * g.fee_bps) / 10000;
    if _fee_ticket_take(winner, 'slott', g.id, fee) then fee := 0; waived := true; end if;
    payout := g.p2p_pot - fee + g.bonus_total;
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_settlement', 'slot:' || g.id || ':settlement', g.account_type, winner, g.id, 'P2P Slott settlement')
      returning id into tx;
    for e in select user_id, amount from slot_entries where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
    end loop;
    perform _post(tx, escrow, g.p2p_pot);
    perform _post(tx, escrow, -(g.p2p_pot + g.bonus_total));
    perform _post(tx, _user_account(winner, 'user_available', g.asset, g.account_type), payout);
    if fee > 0 then perform _post(tx, _system_account('house_revenue', g.asset, g.account_type), fee); end if;
    update slot_bonus_events set status = 'PAID' where game_id = g.id and status = 'AWARDED';
    insert into slot_payouts (game_id, beneficiary_id, kind, amount, ledger_tx_id) values (g.id, winner, 'WINNER', payout, tx);
    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update slot_games set status = 'COMPLETED', completed_at = clock_timestamp(), outcome = 'WIN', winner_id = winner,
      fee_amount = fee, payout_amount = payout, server_seed = encode(seed, 'hex'), last_error = null where id = g.id;
    perform _audit_slot(null, 'GAME_COMPLETED', g.id, jsonb_build_object('outcome', 'WIN', 'winner', winner, 'score_a', g.score_a,
      'score_b', g.score_b, 'p2p_pot', g.p2p_pot, 'bonus', g.bonus_total, 'fee', fee, 'fee_waived', waived, 'payout', payout, 'ledger_tx', tx));
  else
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('slot_refund', 'slot:' || g.id || ':draw', g.account_type, null, g.id, 'P2P Slott draw refund')
      returning id into tx;
    for e in select user_id, amount from slot_entries where game_id = g.id order by user_id loop
      perform _post(tx, _user_account(e.user_id, 'user_locked', g.asset, g.account_type), -e.amount);
      perform _post(tx, _user_account(e.user_id, 'user_available', g.asset, g.account_type), e.amount);
      insert into slot_payouts (game_id, beneficiary_id, kind, amount, ledger_tx_id) values (g.id, e.user_id, 'DRAW_REFUND', e.amount, tx);
    end loop;
    if g.bonus_total > 0 then
      bank := case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end;
      for e in select budget_day, sum(awarded_cents) amt from slot_bonus_events where game_id = g.id and status = 'AWARDED'
               group by budget_day order by budget_day loop
        update slot_bonus_budget set reserved_cents = reserved_cents - e.amt, updated_at = clock_timestamp() where day = e.budget_day;
      end loop;
      perform _post(tx, _system_account(bank, g.asset, g.account_type), g.bonus_total);
      perform _post(tx, escrow, -g.bonus_total);
      update slot_bonus_events set status = 'RETURNED', return_tx_id = tx where game_id = g.id and status = 'AWARDED';
    end if;
    if current_setting('pvp.fail_before_complete', true) = 'on' then raise exception 'INJECTED_FAILURE_BEFORE_COMPLETE'; end if;
    update slot_games set status = 'COMPLETED', completed_at = clock_timestamp(), outcome = 'DRAW', winner_id = null,
      fee_amount = 0, payout_amount = 0, server_seed = encode(seed, 'hex'), last_error = null where id = g.id;
    perform _audit_slot(null, 'GAME_COMPLETED', g.id, jsonb_build_object('outcome', 'DRAW', 'score', g.score_a,
      'bonus_returned', g.bonus_total, 'ledger_tx', tx));
  end if;
  return 'settled';
end $$;

-- _roulette_settle/1
create or replace function public._roulette_settle(p_game_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.roulette_games; r public.roulette_results; w public.roulette_wheels; seed bytea; d record; b record;
  tx uuid; gross bigint; fee bigint; payout bigint; n integer; s bigint; house uuid; bank uuid; total bigint;
begin
  select * into g from public.roulette_games where id = p_game_id for update;
  if g.status <> 'SETTLEMENT' then raise exception 'NOT_IN_SETTLEMENT'; end if;
  select * into r from public.roulette_results where game_id = g.id;
  if not found then raise exception 'RESULT_MISSING'; end if;
  select * into w from public.roulette_wheels where version = g.wheel_version;
  select server_seed into seed from public.roulette_game_secrets where game_id = g.id;
  if seed is null or encode(extensions.digest(seed, 'sha256'), 'hex') <> g.server_seed_hash then raise exception 'INVARIANT_COMMITMENT'; end if;
  select * into d from public.roulette_draw_slot(seed, g.id, g.draw_version, w.slot_count);
  if d.slot <> r.slot or d.hmac_hex <> r.hmac_hex or w.layout[r.slot + 1] <> r.color
     or g.winning_slot is distinct from r.slot or g.winning_color is distinct from r.color then
    raise exception 'INVARIANT_RESULT';
  end if;
  select count(*), coalesce(sum(amount), 0) into n, s from public.roulette_bets where game_id = g.id;
  if n <> g.bet_count or s <> g.pot_amount then raise exception 'INVARIANT_BETS'; end if;
  if exists (select 1 from public.roulette_bets where game_id = g.id and multiplier_bps <> (w.multipliers_bps ->> color::text)::integer) then
    raise exception 'INVARIANT_MULTIPLIER';
  end if;

  perform public._coinflip_lock_wallets(array(select distinct user_id from public.roulette_bets where game_id = g.id order by 1), g.asset, g.account_type);
  perform public._lock_system_accounts(array['house_revenue',
    case when g.account_type = 'real' then 'house_bankroll' else 'test_faucet' end]::public.account_kind[],
    g.asset, g.account_type);
  house := public._system_account('house_revenue', g.asset, g.account_type);
  bank := public._system_account(case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end, g.asset, g.account_type);
  for b in select * from public.roulette_bets where game_id = g.id and status = 'ACCEPTED' order by created_at, id loop
    insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
      values ('roulette_settlement', 'roulette:bet:' || b.id || ':settle', g.account_type, b.user_id, g.id, 'Roulette settlement') returning id into tx;
    perform public._post(tx, public._user_account(b.user_id, 'user_locked', g.asset, g.account_type), -b.amount);
    if b.color = r.color then
      gross := (b.amount * b.multiplier_bps) / 10000;
      fee := (gross * g.win_fee_bps) / 10000;
      payout := gross - fee;
      perform public._post(tx, public._user_account(b.user_id, 'user_available', g.asset, g.account_type), payout);
      perform public._post(tx, bank, -(gross - b.amount));
      if fee > 0 then perform public._post(tx, house, fee); end if;
      insert into public.roulette_payouts (bet_id, game_id, kind, beneficiary_id, amount, idempotency_key, ledger_tx_id)
        values (b.id, g.id, 'WINNER', b.user_id, payout, 'roulette:bet:' || b.id || ':win', tx);
      update public.roulette_bets set status = 'WON', payout_amount = payout, settled_at = clock_timestamp() where id = b.id;
    else
      perform public._post(tx, house, b.amount);
      update public.roulette_bets set status = 'LOST', payout_amount = 0, settled_at = clock_timestamp() where id = b.id;
    end if;
  end loop;
  if current_setting('pvp.fail_after_ledger', true) = 'on' then raise exception 'INJECTED_FAILURE_AFTER_LEDGER'; end if;
  select coalesce(sum(amount), 0) into total from public.roulette_payouts where game_id = g.id and kind = 'WINNER';
  update public.roulette_games set status = 'COMPLETED', completed_at = clock_timestamp(), total_payout = total,
    house_result = g.pot_amount - total, server_seed = encode(seed, 'hex'), draw_counter = r.draw_counter where id = g.id;
  perform public._roulette_audit(null, 'ROUND_COMPLETED', g.id, jsonb_build_object('winning_color', r.color, 'slot', r.slot,
    'pot', g.pot_amount, 'payout', total, 'win_fee_bps', g.win_fee_bps, 'bets', n));
end $$;


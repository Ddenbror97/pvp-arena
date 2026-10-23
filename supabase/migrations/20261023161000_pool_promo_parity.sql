-- 8-ball takes promo, referral, prize and partner credits under the same rules as the
-- other games.
--
--   * Buy-ins draw eligible cash first, then bonus. The cash-only refusal is gone.
--   * Settlement already pays the pot's mix (floored toward bonus) through the shared
--     entry/settlement basis path, so bonus lost to another player stays bonus.
--   * A completed real match counts each player's stake toward promo, referral and
--     leaderboard-prize playthrough, once per player.
--   * Partner profit: when an active partner loses to a regular player, the winner's
--     net gain is held the same way as coinflip.

alter table public.promo_wagers drop constraint promo_wagers_game_check;
alter table public.promo_wagers add constraint promo_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool'));
alter table public.referral_reward_wagers drop constraint referral_reward_wagers_game_check;
alter table public.referral_reward_wagers add constraint referral_reward_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool'));
alter table public.leaderboard_prize_wagers drop constraint leaderboard_prize_wagers_game_check;
alter table public.leaderboard_prize_wagers add constraint leaderboard_prize_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool'));
alter table public.referral_play_events drop constraint referral_play_events_game_check;
alter table public.referral_play_events add constraint referral_play_events_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool'));
alter table public.partner_profit_events drop constraint partner_profit_events_game_check;
alter table public.partner_profit_events add constraint partner_profit_events_game_check
  check (game in ('coinflip', 'jackpot', 'slott', 'poker', 'pool'));

create or replace function public._pool_debit(p_user uuid, p_match bigint, p_slot int, p_amount bigint, p_key text, p_asset text, p_type text)
returns void language plpgsql security definer set search_path = public as $$
declare avail uuid; locked uuid; bal bigint; tx uuid;
begin
  avail := public._user_account(p_user, 'user_available', p_asset, p_type);
  locked := public._user_account(p_user, 'user_locked', p_asset, p_type);
  if avail is null or locked is null then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public._coinflip_lock_wallets(array[p_user], p_asset, p_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('pool_entry', 'pool:' || p_match || ':entry:' || p_slot, p_type, p_user, p_match, 'Pool stake')
    returning id into tx;
  perform public._post(tx, avail, -p_amount);
  perform public._post(tx, locked, p_amount);
  insert into pool_entries (match_id, user_id, slot, amount, ledger_tx_id, idempotency_key)
    values (p_match, p_user, p_slot, p_amount, tx, p_key);
end $$;
revoke all on function public._pool_debit(uuid, bigint, int, bigint, text, text, text)
  from public, anon, authenticated, service_role;

create or replace function public._playthrough_stake(p_user uuid, p_game text, p_source text)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare stake bigint;
begin
  if p_user is null or p_source is null or length(p_source) > 80 then return null; end if;
  if p_game = 'slott' then
    select e.amount into stake
    from public.slot_entries e
    join public.slot_games g on g.id = e.game_id
    where e.id = p_source::uuid
      and e.user_id = p_user
      and e.amount > 0
      and g.status = 'COMPLETED';
    return stake;
  end if;
  if p_game = 'poker' then
    if split_part(p_source, ':', 2)::uuid is distinct from p_user then return null; end if;
    select hp.wagered into stake
    from public.poker_hand_players hp
    join public.poker_hands h on h.id = hp.hand_id
    where hp.hand_id = split_part(p_source, ':', 1)::bigint
      and hp.user_id = p_user
      and hp.wagered > 0
      and h.status = 'COMPLETED'
      and h.account_type = 'real'
      and coalesce(array_length(h.board, 1), 0) >= 3;
    return stake;
  end if;
  if p_game = 'pool' then
    if split_part(p_source, ':', 2)::uuid is distinct from p_user then return null; end if;
    select e.amount into stake
    from public.pool_entries e
    join public.pool_matches g on g.id = e.match_id
    where e.match_id = split_part(p_source, ':', 1)::bigint
      and e.user_id = p_user
      and e.amount > 0
      and g.status = 'COMPLETED'
      and g.account_type = 'real';
    return stake;
  end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return null; end if;
  return public.referral_settled_stake(p_user, p_game, p_source);
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return null;
end $$;
revoke all on function public._playthrough_stake(uuid, text, text) from public, anon, authenticated;

create or replace function public.promo_apply_wager(p_user uuid, p_game text, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stake bigint;
  inserted int;
  remaining bigint;
  claim public.promo_claims;
  room bigint;
  take bigint;
  next_status text;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  if public.promo_restricted_cents(p_user) = 0 then return; end if;
  stake := public._playthrough_stake(p_user, p_game, p_source);
  if stake is null or stake <= 0 then return; end if;
  remaining := stake;
  insert into public.promo_wagers (game, source_id, user_id, amount_cents)
  values (p_game, p_source, p_user, stake)
  on conflict (game, source_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  for claim in
    select * from public.promo_claims
    where user_id = p_user and status in ('CLAIMED', 'WAGERING')
    order by created_at, id
    for update
  loop
    exit when remaining <= 0;
    room := claim.required_wager_cents - claim.qualifying_wager_cents;
    take := least(room, remaining);
    if claim.qualifying_wager_cents + take >= claim.required_wager_cents then
      next_status := 'COMPLETED';
    else
      next_status := 'WAGERING';
    end if;
    update public.promo_claims
    set qualifying_wager_cents = qualifying_wager_cents + take,
        status = next_status,
        completed_at = case when next_status = 'COMPLETED' then clock_timestamp() else null end
    where id = claim.id;
    if next_status = 'COMPLETED' then
      perform public._audit(p_user, 'promo_wager_completed', null, jsonb_build_object('claim', claim.id, 'cents', claim.reward_cents));
    end if;
    remaining := remaining - take;
  end loop;
end $$;

create or replace function public.referral_apply_reward_wager(p_user uuid, p_game text, p_source text, p_cents bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stake bigint;
  inserted int;
  remaining bigint;
  reward public.referral_rewards;
  room bigint;
  take bigint;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  stake := public._playthrough_stake(p_user, p_game, p_source);
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

create or replace function public.leaderboard_apply_prize_wager(p_user uuid, p_game text, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stake bigint;
  inserted int;
  remaining bigint;
  hold public.leaderboard_prize_holds;
  room bigint;
  take bigint;
  next_status text;
  v_game bigint;
  v_user uuid;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  if public.leaderboard_prize_restricted_cents(p_user) = 0 then return; end if;
  begin
    if p_game in ('poker', 'pool') then
      stake := public._playthrough_stake(p_user, p_game, p_source);
    elsif p_game = 'slott' then
      select e.amount into stake
      from public.slot_entries e
      join public.slot_games g on g.id = e.game_id
      where e.id = p_source::uuid
        and e.user_id = p_user
        and e.amount > 0
        and g.status = 'COMPLETED'
        and g.account_type = 'real';
    else
      if p_game in ('jackpot', 'coinflip') then
        v_game := split_part(p_source, ':', 1)::bigint;
        v_user := split_part(p_source, ':', 2)::uuid;
        if v_user is distinct from p_user then return; end if;
        if p_game = 'jackpot' and not exists (
          select 1 from public.jackpot_games g
          where g.id = v_game and g.status = 'COMPLETED' and g.account_type = 'real'
        ) then return; end if;
        if p_game = 'coinflip' and not exists (
          select 1 from public.coinflip_games g
          where g.id = v_game and g.status = 'COMPLETED' and g.account_type = 'real'
        ) then return; end if;
      elsif not exists (
        select 1 from public.roulette_bets b
        join public.roulette_games g on g.id = b.game_id
        where b.id = p_source::uuid and b.user_id = p_user and g.account_type = 'real'
      ) then
        return;
      end if;
      stake := public.referral_settled_stake(p_user, p_game, p_source);
    end if;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      return;
  end;
  if stake is null or stake <= 0 then return; end if;
  remaining := stake;
  insert into public.leaderboard_prize_wagers (game, source_id, user_id, amount_cents)
  values (p_game, p_source, p_user, stake)
  on conflict (game, source_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  for hold in
    select * from public.leaderboard_prize_holds
    where user_id = p_user and status in ('CLAIMED', 'WAGERING')
    order by created_at, award_id
    for update
  loop
    exit when remaining <= 0;
    room := hold.required_wager_cents - hold.qualifying_wager_cents;
    take := least(room, remaining);
    if hold.qualifying_wager_cents + take >= hold.required_wager_cents then
      next_status := 'COMPLETED';
    else
      next_status := 'WAGERING';
    end if;
    update public.leaderboard_prize_holds
    set qualifying_wager_cents = qualifying_wager_cents + take,
        status = next_status,
        completed_at = case when next_status = 'COMPLETED' then clock_timestamp() else null end
    where award_id = hold.award_id;
    if next_status = 'COMPLETED' then
      perform public._audit(p_user, 'leaderboard_prize_wager_completed', null,
        jsonb_build_object('award_id', hold.award_id, 'cents', hold.reward_cents));
    end if;
    remaining := remaining - take;
  end loop;
end $$;

create or replace function public.referral_note_play(p_user uuid, p_game text, p_source text, p_cents bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.referrals; inserted int; stake bigint;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  begin
    perform public.leaderboard_apply_prize_wager(p_user, p_game, p_source);
  exception when others then
    perform public._audit(p_user, 'leaderboard_prize_hook_error', null, jsonb_build_object('game', p_game, 'source', p_source));
  end;
  stake := public._playthrough_stake(p_user, p_game, p_source);
  if stake is not null and stake > 0 then
    begin
      perform public.promo_apply_wager(p_user, p_game, p_source);
    exception when others then
      perform public._audit(p_user, 'promo_hook_error', null, jsonb_build_object('game', p_game, 'source', p_source));
    end;
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

create or replace function public._pool_completed_hooks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare e record; loser uuid; tx uuid;
begin
  if new.account_type <> 'real' or new.winner_id is null then return null; end if;
  for e in select user_id, amount from pool_entries where match_id = new.id and amount > 0 order by user_id loop
    begin
      perform public.referral_note_play(e.user_id, 'pool', new.id::text || ':' || e.user_id::text, e.amount);
    exception when others then
      perform public._audit(e.user_id, 'referral_hook_error', new.id, jsonb_build_object('hook', 'pool'));
    end;
  end loop;
  if public._is_active_partner(new.winner_id) then return null; end if;
  loser := case when new.winner_id = new.creator_id then new.opponent_id else new.creator_id end;
  if loser is null or not public._is_active_partner(loser) then return null; end if;
  select ledger_tx_id into tx from public.pool_payouts where match_id = new.id and kind = 'WIN';
  perform public._partner_profit_record('pool', new.id, loser, new.winner_id, new.stake, new.stake, new.fee_amount,
    new.payout_amount - new.stake, tx);
  return null;
end $$;
revoke all on function public._pool_completed_hooks() from public, anon, authenticated;

drop trigger if exists pool_completed_hooks on public.pool_matches;
create trigger pool_completed_hooks
  after update of status on public.pool_matches
  for each row
  when (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED')
  execute function public._pool_completed_hooks();

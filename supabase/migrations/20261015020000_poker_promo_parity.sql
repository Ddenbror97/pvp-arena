-- Poker takes promo, referral, prize and partner credits under the same rules as the
-- other games.
--
--   * Buy-ins: the entry draws eligible cash first, then bonus (the shared _entry rule).
--     CASH_ONLY_BUY_IN is gone.
--   * Each hand mixes chips the way a pot does in every other game. Every contributor's
--     chips leave their seat stake in that seat's eligible/bonus proportion, and winners
--     take the pot's proportion (floored toward bonus). Without this, bonus lost to a
--     depositor would come back to them as eligible cash at cash-out.
--   * Cash-out (poker_settlement) already pays the seat stake's own proportion.
--   * Promo, referral and leaderboard-prize playthrough and referral qualification count
--     poker through referral_note_play, once per player per hand. The stake is the
--     player's contested chips (uncalled returns excluded) in hands that reached the flop,
--     the hands that pay rake and earn prestige XP.
--   * Partner profit: chips an active partner loses in a hand to a regular player are
--     recorded per (partner, winner) and held like coinflip, jackpot and slot profit.

alter table public.promo_wagers drop constraint promo_wagers_game_check;
alter table public.promo_wagers add constraint promo_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker'));
alter table public.referral_reward_wagers drop constraint referral_reward_wagers_game_check;
alter table public.referral_reward_wagers add constraint referral_reward_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker'));
alter table public.leaderboard_prize_wagers drop constraint leaderboard_prize_wagers_game_check;
alter table public.leaderboard_prize_wagers add constraint leaderboard_prize_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker'));
alter table public.referral_play_events drop constraint referral_play_events_game_check;
alter table public.referral_play_events add constraint referral_play_events_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker'));

-- A poker hand can have several winners against one partner.
alter table public.partner_profit_events drop constraint partner_profit_events_game_check;
alter table public.partner_profit_events add constraint partner_profit_events_game_check
  check (game in ('coinflip', 'jackpot', 'slott', 'poker'));
alter table public.partner_profit_events drop constraint partner_profit_events_game_game_id_partner_user_id_key;
alter table public.partner_profit_events add constraint partner_profit_events_game_game_id_partner_user_id_key
  unique (game, game_id, partner_user_id, user_id);

create or replace function public._partner_profit_record(p_game text, p_game_id bigint, p_partner uuid, p_winner uuid,
  p_partner_stake bigint, p_winner_stake bigint, p_fee bigint, p_profit bigint, p_tx uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s public.partner_settings; d date := (clock_timestamp() at time zone 'UTC')::date;
  pair_used bigint; day_used bigint; auto bigint;
begin
  if p_profit is null or p_profit <= 0 then return; end if;
  if p_tx is null then raise exception 'PARTNER_PROFIT_NO_LEDGER'; end if;
  perform pg_advisory_xact_lock(hashtext('partner_profit:' || p_partner::text));
  select * into s from public.partner_settings;
  select coalesce(sum(auto_cleared_cents), 0) into pair_used from public.partner_profit_events
    where partner_user_id = p_partner and user_id = p_winner;
  select coalesce(sum(auto_cleared_cents), 0) into day_used from public.partner_profit_events
    where partner_user_id = p_partner and day = d;
  auto := least(p_profit, greatest(0, s.opponent_profit_allowance_cents - pair_used), greatest(0, s.daily_profit_allowance_cents - day_used));
  insert into public.partner_profit_events (game, game_id, partner_user_id, user_id, partner_stake_cents, winner_stake_cents,
    fee_cents, profit_cents, auto_cleared_cents, held_cents, ledger_tx_id, day)
  values (p_game, p_game_id, p_partner, p_winner, p_partner_stake, p_winner_stake, p_fee, p_profit, auto, p_profit - auto, p_tx, d)
  on conflict (game, game_id, partner_user_id, user_id) do nothing;
  if found and p_profit > auto then
    perform public._audit(p_winner, 'partner_profit_held', p_game_id, jsonb_build_object('game', p_game, 'partner', p_partner,
      'profit', p_profit, 'auto_cleared', auto, 'held', p_profit - auto, 'tx', p_tx));
  end if;
end $$;
revoke all on function public._partner_profit_record(text, bigint, uuid, uuid, bigint, bigint, bigint, bigint, uuid)
  from public, anon, authenticated;

create or replace function public._poker_take_cash(p_seat bigint, p_amount bigint, p_pending boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare s poker_seats; t poker_tables; avail uuid; locked uuid; bal bigint; tx uuid; c poker_config;
begin
  select * into s from poker_seats where id = p_seat for update;
  select * into t from poker_tables where id = s.table_id;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select * into c from poker_config;
  perform public._poker_rate(s.user_id, 'buy_in', c.buy_in_rate_limit, c.buy_in_rate_window_seconds);
  avail := _user_account(s.user_id, 'user_available', t.asset, t.account_type);
  locked := _user_account(s.user_id, 'user_locked', t.asset, t.account_type);
  if avail is null or locked is null then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform _coinflip_lock_wallets(array[s.user_id], t.asset, t.account_type);
  select balance into bal from wallet_accounts where id = avail;
  if bal is null or bal < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into ledger_transactions (kind, idempotency_key, account_type, user_id, game_id, memo)
    values ('poker_entry', 'poker:seat:' || s.id || ':buyin:' || (s.buy_in_count + 1), t.account_type, s.user_id, s.id,
            'Poker buy-in')
    returning id into tx;
  perform _post(tx, avail, -p_amount);
  perform _post(tx, locked, p_amount);
  update poker_seats set
    stack = stack + case when p_pending then 0 else p_amount end,
    pending = pending + case when p_pending then p_amount else 0 end,
    buy_in_total = buy_in_total + p_amount,
    buy_in_count = buy_in_count + 1
  where id = s.id;
  perform _audit(s.user_id, 'poker_buy_in', s.table_id, jsonb_build_object(
    'seat_id', s.id, 'amount', p_amount, 'pending', p_pending, 'ledger_tx', tx));
  return tx;
end $$;
revoke all on function public._poker_take_cash(bigint, bigint, boolean) from public, anon, authenticated;

create or replace function public._withdraw_basis_apply_tx(
  p_tx_id uuid,
  p_kind text,
  p_game_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  leg record;
  v_game text := substring(p_kind from '^(.+)_(?:entry|refund|settlement)$');
  v_pot_e bigint;
  v_pot_b bigint;
  v_pot bigint;
  v_payout bigint;
  v_gain_e bigint;
  v_part_e bigint;
  v_part_b bigint;
  v_hold bigint;
begin
  if p_kind = 'deposit' then
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where p.amount > 0), 0) as amt
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where p.amount > 0), 0) > 0
    loop
      insert into withdraw_basis_bucket (user_id, deposits, eligible, bonus)
      values (leg.owner_id, leg.amt, leg.amt, 0)
      on conflict (user_id) do update
        set deposits = withdraw_basis_bucket.deposits + excluded.deposits,
            eligible = withdraw_basis_bucket.eligible + excluded.eligible;
    end loop;

  elsif p_kind in (
    'promo_reward', 'referral_reward', 'leaderboard_prize',
    'prestige_reward', 'partner_credit', 'slot_bonus'
  ) then
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where p.amount > 0), 0) as amt
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where p.amount > 0), 0) > 0
    loop
      insert into withdraw_basis_bucket (user_id, deposits, eligible, bonus)
      values (leg.owner_id, 0, 0, leg.amt)
      on conflict (user_id) do update
        set bonus = withdraw_basis_bucket.bonus + excluded.bonus;
    end loop;

  elsif p_kind = 'withdrawal' or p_kind = 'refund' then
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount), 0) as net,
        coalesce(sum(p.amount) filter (where w.kind = 'user_locked'), 0) as locked_delta
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
    loop
      insert into withdraw_basis_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
      if p_kind = 'withdrawal' and leg.net = 0 and leg.locked_delta > 0 then
        select b.eligible, b.bonus into v_part_e, v_part_b
        from withdraw_basis_bucket b where b.user_id = leg.owner_id;
        v_part_e := least(greatest(v_part_e, 0), leg.locked_delta);
        v_part_b := leg.locked_delta - v_part_e;
        update withdraw_basis_bucket
          set eligible = greatest(eligible - v_part_e, 0),
              bonus = greatest(bonus - v_part_b, 0)
          where user_id = leg.owner_id;
        insert into withdraw_basis_hold (user_id, eligible_part, bonus_part)
        values (leg.owner_id, v_part_e, v_part_b);
      elsif p_kind = 'refund' and leg.net = 0 and leg.locked_delta < 0 then
        select h.eligible_part, h.bonus_part, h.id
          into v_part_e, v_part_b, v_hold
        from withdraw_basis_hold h
        where h.user_id = leg.owner_id
        order by h.id desc
        limit 1;
        if found then
          update withdraw_basis_bucket
            set eligible = eligible + v_part_e, bonus = bonus + v_part_b
            where user_id = leg.owner_id;
          delete from withdraw_basis_hold where id = v_hold;
        end if;
      end if;
    end loop;

  elsif p_kind = 'poker_hand' and p_game_id is not null then
    -- The pot: contributions leave each seat stake pro rata, payouts take the pot's mix.
    v_pot_e := 0;
    v_pot := 0;
    for leg in
      select w.owner_id, hp.seat_id,
        coalesce(-sum(p.amount) filter (where p.amount < 0), 0) as put
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      join poker_hand_players hp on hp.hand_id = p_game_id and hp.user_id = w.owner_id
      where p.tx_id = p_tx_id and w.kind = 'user_locked'
      group by w.owner_id, hp.seat_id
      having coalesce(-sum(p.amount) filter (where p.amount < 0), 0) > 0
      order by w.owner_id
    loop
      select greatest(s.eligible, 0), greatest(s.bonus, 0) into v_part_e, v_part_b
      from withdraw_basis_stake s
      where s.user_id = leg.owner_id and s.game = 'poker' and s.game_id = leg.seat_id;
      v_part_e := coalesce(v_part_e, 0);
      v_part_b := coalesce(v_part_b, 0);
      if v_part_e + v_part_b > 0 then
        v_gain_e := least(v_part_e, (leg.put * v_part_e) / (v_part_e + v_part_b));
      else
        v_gain_e := 0;
      end if;
      update withdraw_basis_stake
        set eligible = greatest(eligible - v_gain_e, 0),
            bonus = greatest(bonus - (leg.put - v_gain_e), 0)
        where user_id = leg.owner_id and game = 'poker' and game_id = leg.seat_id;
      v_pot_e := v_pot_e + v_gain_e;
      v_pot := v_pot + leg.put;
    end loop;
    for leg in
      select w.owner_id, hp.seat_id,
        coalesce(sum(p.amount) filter (where p.amount > 0), 0) as amt
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      join poker_hand_players hp on hp.hand_id = p_game_id and hp.user_id = w.owner_id
      where p.tx_id = p_tx_id and w.kind = 'user_locked'
      group by w.owner_id, hp.seat_id
      having coalesce(sum(p.amount) filter (where p.amount > 0), 0) > 0
      order by w.owner_id
    loop
      if v_pot > 0 then
        v_gain_e := (leg.amt * v_pot_e) / v_pot;
      else
        v_gain_e := 0;
      end if;
      insert into withdraw_basis_stake (user_id, game, game_id, eligible, bonus)
      values (leg.owner_id, 'poker', leg.seat_id, v_gain_e, leg.amt - v_gain_e)
      on conflict (user_id, game, game_id) do update
        set eligible = withdraw_basis_stake.eligible + excluded.eligible,
            bonus = withdraw_basis_stake.bonus + excluded.bonus;
    end loop;

  elsif p_kind like '%\_entry' escape '\' and p_game_id is not null then
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where w.kind = 'user_locked' and p.amount > 0), 0) as stake
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where w.kind = 'user_locked' and p.amount > 0), 0) > 0
    loop
      insert into withdraw_basis_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
      select b.eligible into v_part_e from withdraw_basis_bucket b where b.user_id = leg.owner_id;
      v_part_e := least(greatest(v_part_e, 0), leg.stake);
      v_part_b := leg.stake - v_part_e;
      update withdraw_basis_bucket
        set eligible = greatest(eligible - v_part_e, 0),
            bonus = greatest(bonus - v_part_b, 0)
        where user_id = leg.owner_id;
      insert into withdraw_basis_stake (user_id, game, game_id, eligible, bonus)
      values (leg.owner_id, v_game, p_game_id, v_part_e, v_part_b)
      on conflict (user_id, game, game_id) do update
        set eligible = withdraw_basis_stake.eligible + excluded.eligible,
            bonus = withdraw_basis_stake.bonus + excluded.bonus;
      insert into withdraw_basis_ledger_stake (ledger_tx_id, user_id, eligible, bonus, stake_total)
      values (p_tx_id, leg.owner_id, v_part_e, v_part_b, leg.stake)
      on conflict (ledger_tx_id) do update
        set eligible = excluded.eligible,
            bonus = excluded.bonus,
            stake_total = excluded.stake_total,
            user_id = excluded.user_id;
    end loop;

  elsif p_kind like '%\_refund' escape '\' and p_game_id is not null then
    delete from withdraw_basis_ledger_stake s
    using ledger_transactions t
    where t.game_id = p_game_id and s.ledger_tx_id = t.id
      and t.kind::text = v_game || '_entry';
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) as back
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) > 0
    loop
      select s.eligible, s.bonus into v_part_e, v_part_b
      from withdraw_basis_stake s
      where s.user_id = leg.owner_id and s.game = v_game and s.game_id = p_game_id;
      if found then
        update withdraw_basis_bucket
          set eligible = eligible + v_part_e, bonus = bonus + v_part_b
          where user_id = leg.owner_id;
        delete from withdraw_basis_stake
          where user_id = leg.owner_id and game = v_game and game_id = p_game_id;
      end if;
    end loop;

  elsif p_kind like '%\_settlement' escape '\' and p_game_id is not null then
    if not exists (select 1 from withdraw_basis_stake s where s.game = v_game and s.game_id = p_game_id) then
      for leg in
        select w.owner_id,
          coalesce(sum(-p.amount) filter (where w.kind = 'user_locked' and p.amount < 0), 0) as stake
        from ledger_postings p
        join wallet_accounts w on w.id = p.account_id
        where p.tx_id = p_tx_id and w.owner_id is not null
        group by w.owner_id
        having coalesce(sum(-p.amount) filter (where w.kind = 'user_locked' and p.amount < 0), 0) > 0
      loop
        insert into withdraw_basis_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
        select b.eligible into v_part_e from withdraw_basis_bucket b where b.user_id = leg.owner_id;
        v_part_e := least(greatest(v_part_e, 0), leg.stake);
        v_part_b := leg.stake - v_part_e;
        update withdraw_basis_bucket
          set eligible = greatest(eligible - v_part_e, 0), bonus = greatest(bonus - v_part_b, 0)
          where user_id = leg.owner_id;
        insert into withdraw_basis_stake (user_id, game, game_id, eligible, bonus)
        values (leg.owner_id, v_game, p_game_id, v_part_e, v_part_b)
        on conflict (user_id, game, game_id) do update
          set eligible = withdraw_basis_stake.eligible + excluded.eligible,
              bonus = withdraw_basis_stake.bonus + excluded.bonus;
      end loop;
    end if;
    select coalesce(sum(s.eligible), 0), coalesce(sum(s.bonus), 0)
      into v_pot_e, v_pot_b
    from withdraw_basis_stake s
    where s.game = v_game and s.game_id = p_game_id;
    v_pot := v_pot_e + v_pot_b;
    for leg in
      select w.owner_id,
        coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) as amt
      from ledger_postings p
      join wallet_accounts w on w.id = p.account_id
      where p.tx_id = p_tx_id and w.owner_id is not null
      group by w.owner_id
      having coalesce(sum(p.amount) filter (where w.kind = 'user_available' and p.amount > 0), 0) > 0
    loop
      v_payout := leg.amt;
      insert into withdraw_basis_bucket (user_id) values (leg.owner_id) on conflict (user_id) do nothing;
      if v_pot > 0 then
        v_gain_e := (v_payout * v_pot_e) / v_pot;
      else
        v_gain_e := 0;
      end if;
      update withdraw_basis_bucket
        set eligible = eligible + v_gain_e,
            bonus = bonus + (v_payout - v_gain_e)
        where user_id = leg.owner_id;
    end loop;
    delete from withdraw_basis_stake where game = v_game and game_id = p_game_id;
  end if;
end $$;
revoke all on function public._withdraw_basis_apply_tx(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public._withdraw_basis_apply_tx(uuid, text, bigint) to service_role;

-- Poker source ids are '<hand id>:<user id>'.
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
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker') then return; end if;
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
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker') then return; end if;
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
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  if public.leaderboard_prize_restricted_cents(p_user) = 0 then return; end if;
  begin
    if p_game = 'poker' then
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
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker') then return; end if;
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

-- Same place as the other games' hooks: an AFTER trigger on the round reaching COMPLETED,
-- inside the settlement transaction.
create or replace function public._poker_hand_hooks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p record; w record; gain bigint;
begin
  if new.account_type <> 'real' then return null; end if;
  if coalesce(array_length(new.board, 1), 0) >= 3 then
    for p in select user_id, wagered from poker_hand_players
             where hand_id = new.id and wagered > 0 order by user_id loop
      begin
        perform public.referral_note_play(p.user_id, 'poker', new.id::text || ':' || p.user_id::text, p.wagered);
      exception when others then
        perform public._audit(p.user_id, 'referral_hook_error', new.id, jsonb_build_object('hook', 'poker'));
      end;
    end loop;
  end if;
  -- A partner's net loss is split across the hand's net winners by their share of the gains.
  select coalesce(sum(end_stack - start_stack), 0) into gain
  from poker_hand_players where hand_id = new.id and end_stack > start_stack;
  if gain <= 0 then return null; end if;
  for p in select user_id, total_bet, start_stack - end_stack as lost from poker_hand_players
           where hand_id = new.id and end_stack < start_stack order by user_id loop
    continue when not public._is_active_partner(p.user_id);
    for w in select user_id, total_bet, end_stack - start_stack as won from poker_hand_players
             where hand_id = new.id and end_stack > start_stack and total_bet > 0 order by user_id loop
      continue when public._is_active_partner(w.user_id);
      perform public._partner_profit_record('poker', new.id, p.user_id, w.user_id, p.total_bet, w.total_bet,
        new.fee_total, (p.lost * w.won) / gain, new.ledger_tx_id);
    end loop;
  end loop;
  return null;
end $$;
revoke all on function public._poker_hand_hooks() from public, anon, authenticated;

drop trigger if exists poker_hand_hooks on public.poker_hands;
create trigger poker_hand_hooks
  after update of status on public.poker_hands
  for each row
  when (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED')
  execute function public._poker_hand_hooks();

-- Open seats' stakes now follow their stacks; replay so the cache matches the new rule.
select public._withdraw_basis_rebuild_full();
select public._withdraw_basis_assert_rebuild_idempotent();

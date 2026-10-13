-- Leaderboard prizes follow the promo-code hold. The prize is credited, then locked
-- until settled Roulette stake covers that same amount once. Jackpot, Coinflip, and
-- Slott do not clear it. One Roulette source is applied once, oldest open prize first.
-- Deposited funds stay withdrawable. This does not change promo, referral, partner, or treasury holds.

create table public.leaderboard_prize_holds (
  award_id uuid primary key references public.leaderboard_prize_awards (id),
  user_id uuid not null references public.profiles (id),
  reward_cents bigint not null check (reward_cents > 0),
  required_wager_cents bigint not null check (required_wager_cents > 0),
  qualifying_wager_cents bigint not null default 0 check (qualifying_wager_cents >= 0),
  status text not null default 'CLAIMED' check (status in ('CLAIMED', 'WAGERING', 'COMPLETED')),
  ledger_tx_id uuid not null unique references public.ledger_transactions (id),
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  constraint leaderboard_prize_holds_wager_cap check (qualifying_wager_cents <= required_wager_cents),
  constraint leaderboard_prize_holds_locked check (required_wager_cents = reward_cents),
  constraint leaderboard_prize_holds_completed check (
    (status = 'COMPLETED' and qualifying_wager_cents = required_wager_cents and completed_at is not null)
    or (status = 'WAGERING' and qualifying_wager_cents > 0 and qualifying_wager_cents < required_wager_cents and completed_at is null)
    or (status = 'CLAIMED' and qualifying_wager_cents = 0 and completed_at is null)
  )
);
create index leaderboard_prize_holds_open_idx on public.leaderboard_prize_holds (user_id, created_at)
  where status in ('CLAIMED', 'WAGERING');
alter table public.leaderboard_prize_holds enable row level security;
revoke all on public.leaderboard_prize_holds from public, anon, authenticated;
grant all on public.leaderboard_prize_holds to service_role;
create trigger no_truncate before truncate on public.leaderboard_prize_holds
  for each statement execute function public._no_truncate();

create table public.leaderboard_prize_wagers (
  game text not null check (game = 'roulette'),
  source_id text not null check (char_length(source_id) between 1 and 80),
  user_id uuid not null references public.profiles (id),
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default clock_timestamp(),
  primary key (game, source_id)
);
alter table public.leaderboard_prize_wagers enable row level security;
revoke all on public.leaderboard_prize_wagers from public, anon, authenticated;
grant all on public.leaderboard_prize_wagers to service_role;
create trigger no_truncate before truncate on public.leaderboard_prize_wagers
  for each statement execute function public._no_truncate();

create or replace function public.leaderboard_prize_hold_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD leaderboard_prize_holds'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'CLAIMED' or new.qualifying_wager_cents <> 0 or new.completed_at is not null then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    if new.required_wager_cents is distinct from new.reward_cents then
      raise exception 'ILLEGAL_TRANSITION';
    end if;
    return new;
  end if;
  if new.award_id is distinct from old.award_id
     or new.user_id is distinct from old.user_id
     or new.reward_cents is distinct from old.reward_cents
     or new.required_wager_cents is distinct from old.required_wager_cents
     or new.ledger_tx_id is distinct from old.ledger_tx_id
     or new.created_at is distinct from old.created_at then
    raise exception 'IMMUTABLE';
  end if;
  if new.qualifying_wager_cents < old.qualifying_wager_cents then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if old.status = 'COMPLETED' and (new.status is distinct from 'COMPLETED' or new.qualifying_wager_cents is distinct from old.qualifying_wager_cents) then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if (old.status, new.status) not in (
    ('CLAIMED', 'CLAIMED'),
    ('CLAIMED', 'WAGERING'),
    ('CLAIMED', 'COMPLETED'),
    ('WAGERING', 'WAGERING'),
    ('WAGERING', 'COMPLETED'),
    ('COMPLETED', 'COMPLETED')
  ) then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if new.status = 'CLAIMED' and new.qualifying_wager_cents <> 0 then raise exception 'ILLEGAL_TRANSITION'; end if;
  if new.status = 'WAGERING' and (new.qualifying_wager_cents <= 0 or new.qualifying_wager_cents >= new.required_wager_cents or new.completed_at is not null) then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if new.status = 'COMPLETED' and new.qualifying_wager_cents <> new.required_wager_cents then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if new.status = 'COMPLETED' and new.completed_at is null then
    new.completed_at := clock_timestamp();
  end if;
  if new.status <> 'COMPLETED' and new.completed_at is not null then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
create trigger leaderboard_prize_hold_guard before insert or update or delete on public.leaderboard_prize_holds
  for each row execute function public.leaderboard_prize_hold_guard();

create or replace function public.leaderboard_prize_restricted_cents(p_user uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(required_wager_cents - qualifying_wager_cents), 0)
  from public.leaderboard_prize_holds
  where user_id = p_user and status in ('CLAIMED', 'WAGERING');
$$;

create or replace function public.leaderboard_apply_prize_wager(p_user uuid, p_game text, p_source text)
returns void language plpgsql security definer set search_path = public as $$
declare
  stake bigint;
  inserted int;
  remaining bigint;
  hold public.leaderboard_prize_holds;
  room bigint;
  take bigint;
  next_status text;
begin
  if p_user is null then return; end if;
  if p_game is distinct from 'roulette' then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  if public.leaderboard_prize_restricted_cents(p_user) = 0 then return; end if;
  stake := public.referral_settled_stake(p_user, p_game, p_source);
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

create or replace function public._lb_pay_campaign(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a public.leaderboard_prize_awards;
  tx uuid;
  avail uuid;
  house uuid;
begin
  house := public._system_account('house_bankroll', 'USD', 'real');
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

create or replace function public._assert_reward_holds(p_user uuid, p_balance bigint, p_total bigint)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  referral_hold bigint;
  promo_hold bigint;
  prize_hold bigint;
  partner_hold bigint;
  profit_hold bigint;
  b0 bigint;
  bal bigint;
begin
  if public._is_active_partner(p_user) then raise exception 'PARTNER_WITHDRAWAL_BLOCKED'; end if;
  referral_hold := public.referral_unplayed_reward_cents(p_user);
  promo_hold := public.promo_restricted_cents(p_user);
  prize_hold := public.leaderboard_prize_restricted_cents(p_user);
  partner_hold := public._partner_release_block(p_user, p_balance);
  profit_hold := public._partner_profit_hold(p_user);
  if p_balance - referral_hold - promo_hold - prize_hold - partner_hold - profit_hold >= p_total then return; end if;
  if profit_hold > 0 and p_balance - referral_hold - promo_hold - prize_hold - partner_hold >= p_total then
    raise exception 'PARTNER_PROFIT_REVIEW';
  end if;
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
end $$;

create or replace function public.referral_note_play(p_user uuid, p_game text, p_source text, p_cents bigint)
returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; inserted int; stake bigint;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  if p_game = 'roulette' then
    stake := public.referral_settled_stake(p_user, p_game, p_source);
  end if;
  if stake is not null and stake > 0 then
    begin
      perform public.promo_apply_wager(p_user, p_game, p_source);
    exception when others then
      perform public._audit(p_user, 'promo_hook_error', null, jsonb_build_object('game', p_game, 'source', p_source));
    end;
    begin
      perform public.leaderboard_apply_prize_wager(p_user, p_game, p_source);
    exception when others then
      perform public._audit(p_user, 'leaderboard_prize_hook_error', null, jsonb_build_object('game', p_game, 'source', p_source));
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

create or replace function public._lb_rules(c public.leaderboard_campaigns) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_array(
    'Window: ' || to_char(c.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC to '
      || to_char(c.ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC (' || c.timezone || ' is the display zone).',
    'Eligible games: ' || array_to_string(c.games, ', ') || '.',
    'A qualifying wager is the stake on a completed real-money game in that window.',
    'Cancelled games, refunded roulette bets, reversed settlements, and test-credit games do not count.',
    'Slott spins and house-funded bonuses are not extra wagers. Only the match stake counts.',
    'Promo credits, referral credits, and partner credits are not wagers. A real stake placed with money from those credits still counts, because the settled stake is real money.',
    'The campaign host''s own stakes do not count.',
    case when c.min_wager_cents > 0
      then 'Each stake must be at least ' || trim(to_char(c.min_wager_cents / 100.0, 'FM999999990.00')) || ' USD.'
      else 'There is no minimum stake beyond the game''s own minimum.' end,
    'Currency is USD. Stake amounts are the game''s USD cents. There is no conversion.',
    'Ties: the higher qualifying total places higher. If the totals match, the player whose last qualifying wager was earlier places higher. If that time also matches, the lower account id places higher.',
    'Prizes are fixed USD amounts for a rank or a rank range. They are not a percentage of the pool.',
    'The prize pool is a commitment. It is not held in a separate escrow. When the campaign settles, each prize is posted to the winner''s available balance and locked until that same amount has been wagered on settled Roulette. Jackpot, Coinflip, and Slott do not clear the lock. Other deposited funds stay withdrawable.',
    'Rankings and prizes freeze when the campaign finishes accepting late settlements. They are not edited after that.',
    'Payout status is pending until the ledger transaction exists, paid after it commits, or failed if it did not. Paid does not mean the prize can be withdrawn yet.'
  )
$$;

revoke all on function public.leaderboard_prize_hold_guard() from public, anon, authenticated;
revoke all on function public.leaderboard_prize_restricted_cents(uuid) from public, anon, authenticated;
revoke all on function public.leaderboard_apply_prize_wager(uuid, text, text) from public, anon, authenticated;
revoke all on function public._lb_pay_campaign(uuid) from public, anon, authenticated;
revoke all on function public._assert_reward_holds(uuid, bigint, bigint) from public, anon, authenticated;
revoke all on function public.referral_note_play(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_note_play(uuid, text, text, bigint) to service_role;

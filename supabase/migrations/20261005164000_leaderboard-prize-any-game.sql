-- Leaderboard prize playthrough counts a settled real-money stake on Jackpot,
-- Coinflip, Roulette, or Slott. The amount comes from the settled row. One source
-- is applied once. Cancelled games, refunds, and test-credit games do not count.
-- Promo and referral playthrough stay on Roulette.

alter table public.leaderboard_prize_wagers drop constraint leaderboard_prize_wagers_game_check;
alter table public.leaderboard_prize_wagers add constraint leaderboard_prize_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott'));

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
  v_game bigint;
  v_user uuid;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  if public.leaderboard_prize_restricted_cents(p_user) = 0 then return; end if;
  begin
    if p_game = 'slott' then
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
returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; inserted int; stake bigint;
begin
  if p_user is null then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott') then return; end if;
  if p_source is null or length(p_source) > 80 then return; end if;
  begin
    perform public.leaderboard_apply_prize_wager(p_user, p_game, p_source);
  exception when others then
    perform public._audit(p_user, 'leaderboard_prize_hook_error', null, jsonb_build_object('game', p_game, 'source', p_source));
  end;
  if p_game = 'roulette' then
    stake := public.referral_settled_stake(p_user, p_game, p_source);
  end if;
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

create or replace function public.leaderboard_on_slott()
returns trigger language plpgsql security definer set search_path = public as $$
declare e record;
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' and new.account_type = 'real' then
    for e in
      select id, user_id from public.slot_entries where game_id = new.id and amount > 0 order by user_id
    loop
      begin
        perform public.leaderboard_apply_prize_wager(e.user_id, 'slott', e.id::text);
      exception when others then
        perform public._audit(e.user_id, 'leaderboard_prize_hook_error', new.id,
          jsonb_build_object('hook', 'slott', 'source', e.id));
      end;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists leaderboard_slott on public.slot_games;
create trigger leaderboard_slott after update of status on public.slot_games
  for each row execute function public.leaderboard_on_slott();

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
    'The prize pool is a commitment. It is not held in a separate escrow. When the campaign settles, each prize is posted to the winner''s available balance and locked until that same amount has been wagered on settled Jackpot, Coinflip, Roulette, or Slott. Other deposited funds stay withdrawable.',
    'Rankings and prizes freeze when the campaign finishes accepting late settlements. They are not edited after that.',
    'Payout status is pending until the ledger transaction exists, paid after it commits, or failed if it did not. Paid does not mean the prize can be withdrawn yet.'
  )
$$;

revoke all on function public.leaderboard_apply_prize_wager(uuid, text, text) from public, anon, authenticated;
revoke all on function public.referral_note_play(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_note_play(uuid, text, text, bigint) to service_role;
revoke all on function public.leaderboard_on_slott() from public, anon, authenticated;
revoke all on function public._lb_rules(public.leaderboard_campaigns) from public, anon, authenticated;

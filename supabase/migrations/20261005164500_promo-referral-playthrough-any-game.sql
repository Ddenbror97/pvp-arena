-- Promo playthrough, the referral reward lock, and the referral play requirement
-- count a settled stake on Jackpot, Coinflip, Roulette, or Slott. The amount is
-- read from the settled row. One source is applied once. Cancelled games and
-- refunds do not count. The withdrawal hold itself is unchanged.

alter table public.promo_wagers drop constraint promo_wagers_game_check;
alter table public.promo_wagers add constraint promo_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott'));

alter table public.referral_reward_wagers drop constraint referral_reward_wagers_game_check;
alter table public.referral_reward_wagers add constraint referral_reward_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott'));

alter table public.referral_play_events drop constraint referral_play_events_game_check;
alter table public.referral_play_events add constraint referral_play_events_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott'));

create or replace function public._playthrough_stake(p_user uuid, p_game text, p_source text)
returns bigint language plpgsql stable security definer set search_path = public as $$
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
  if p_game not in ('jackpot', 'coinflip', 'roulette') then return null; end if;
  return public.referral_settled_stake(p_user, p_game, p_source);
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return null;
end $$;

create or replace function public.promo_apply_wager(p_user uuid, p_game text, p_source text)
returns void language plpgsql security definer set search_path = public as $$
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
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott') then return; end if;
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
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott') then return; end if;
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

create or replace function public.leaderboard_on_slott()
returns trigger language plpgsql security definer set search_path = public as $$
declare e record;
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    for e in
      select id, user_id, amount from public.slot_entries where game_id = new.id and amount > 0 order by user_id
    loop
      begin
        perform public.referral_note_play(e.user_id, 'slott', e.id::text, e.amount);
      exception when others then
        perform public._audit(e.user_id, 'leaderboard_prize_hook_error', new.id,
          jsonb_build_object('hook', 'slott', 'source', e.id));
      end;
    end loop;
  end if;
  return new;
end $$;

revoke all on function public._playthrough_stake(uuid, text, text) from public, anon, authenticated;
revoke all on function public.promo_apply_wager(uuid, text, text) from public, anon, authenticated;
grant execute on function public.promo_apply_wager(uuid, text, text) to service_role;
revoke all on function public.referral_apply_reward_wager(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_apply_reward_wager(uuid, text, text, bigint) to service_role;
revoke all on function public.referral_note_play(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.referral_note_play(uuid, text, text, bigint) to service_role;
revoke all on function public.leaderboard_on_slott() from public, anon, authenticated;

-- Profile "Wagered" / "Played" only counted Jackpot. Prestige XP ignored Slott,
-- so streamers who mostly play P2P Slott saw far too little wager credit.

alter table public.xp_events drop constraint if exists xp_events_source_game_check;
alter table public.xp_events add constraint xp_events_source_game_check
  check (source_game in ('jackpot', 'coinflip', 'roulette', 'slott', 'daily_chest'));

create or replace function public.prestige_award_wager(
  p_user uuid, p_game text, p_source text, p_cents bigint, p_meta jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare xp bigint; inserted int; cur public.user_prestige; nxt int; before_level int;
begin
  if p_user is null or p_cents is null or p_cents <= 0 then return; end if;
  if p_game not in ('jackpot', 'coinflip', 'roulette', 'slott') then raise exception 'BAD_GAME'; end if;
  if p_source is null or length(p_source) > 80 then raise exception 'BAD_SOURCE'; end if;
  xp := p_cents / 10;
  if xp <= 0 then return; end if;
  insert into public.user_prestige (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into cur from public.user_prestige where user_id = p_user for update;
  insert into public.xp_events (user_id, source_game, source_transaction_id, event_type, xp_amount, metadata)
  values (p_user, p_game, p_source, 'wager_settled', xp, coalesce(p_meta, '{}'::jsonb) - 'seed' - 'secret' - 'token')
  on conflict (source_game, source_transaction_id, event_type) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    perform public._audit(p_user, 'prestige_replay', null, jsonb_build_object('game', p_game, 'source', p_source));
    return;
  end if;
  before_level := cur.current_level;
  nxt := public.prestige_level_for(cur.total_xp + xp);
  update public.user_prestige
    set total_xp = total_xp + xp, current_level = nxt, updated_at = clock_timestamp()
    where user_id = p_user;
  perform public.prestige_sync_user(p_user);
  perform public._audit(p_user, 'prestige_xp_earned', null, jsonb_build_object('game', p_game, 'xp', xp, 'source', p_source));
  if nxt > before_level then
    perform public._audit(p_user, 'prestige_level_up', null, jsonb_build_object('from', before_level, 'to', nxt));
    perform public._audit(p_user, 'prestige_reward_unlocked', null, jsonb_build_object('level', nxt));
  end if;
end $$;

create or replace function public.prestige_on_slott()
returns trigger language plpgsql security definer set search_path = public as $$
declare e record;
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    for e in
      select id, user_id, amount from public.slot_entries
      where game_id = new.id and amount > 0
      order by user_id
    loop
      perform public.prestige_award_wager(
        e.user_id, 'slott', e.id::text, e.amount, jsonb_build_object('game_id', new.id));
    end loop;
  end if;
  return new;
end $$;

revoke all on function public.prestige_on_slott() from public, anon, authenticated;
drop trigger if exists prestige_slott_xp on public.slot_games;
create trigger prestige_slott_xp after update of status on public.slot_games
  for each row execute function public.prestige_on_slott();

do $backfill$
declare e record;
begin
  for e in
    select ent.id, ent.user_id, ent.amount, ent.game_id
    from public.slot_entries ent
    join public.slot_games g on g.id = ent.game_id
    where g.status = 'COMPLETED' and ent.amount > 0
    order by ent.created_at, ent.id
  loop
    perform public.prestige_award_wager(
      e.user_id, 'slott', e.id::text, e.amount, jsonb_build_object('game_id', e.game_id, 'backfill', true));
  end loop;
end $backfill$;

create or replace function public.get_profile_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_wagered bigint;
  v_played bigint;
  v_won bigint;
  v_wins bigint;
begin
  if auth.uid() is distinct from p_user then
    return null;
  end if;

  select coalesce((
    (select coalesce(sum(jp.total_amount), 0)
     from public.jackpot_players jp
     join public.jackpot_games g on g.id = jp.game_id
     where jp.user_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(e.amount), 0)
       from public.coinflip_entries e
       join public.coinflip_games g on g.id = e.game_id
       where e.user_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(b.amount), 0)
       from public.roulette_bets b
       join public.roulette_games g on g.id = b.game_id
       where b.user_id = p_user and b.status in ('WON', 'LOST') and g.status = 'COMPLETED')
    + (select coalesce(sum(e.amount), 0)
       from public.slot_entries e
       join public.slot_games g on g.id = e.game_id
       where e.user_id = p_user and g.status = 'COMPLETED' and e.amount > 0)
  ), 0) into v_wagered;

  select coalesce((
    (select count(*)::bigint from public.jackpot_players jp
     join public.jackpot_games g on g.id = jp.game_id
     where jp.user_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.coinflip_entries e
       join public.coinflip_games g on g.id = e.game_id
       where e.user_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.roulette_bets b
       join public.roulette_games g on g.id = b.game_id
       where b.user_id = p_user and b.status in ('WON', 'LOST') and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.slot_entries e
       join public.slot_games g on g.id = e.game_id
       where e.user_id = p_user and g.status = 'COMPLETED')
  ), 0) into v_played;

  select coalesce((
    (select coalesce(sum(g.payout_amount), 0)
     from public.jackpot_games g
     where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(g.payout_amount), 0)
       from public.coinflip_games g
       where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select coalesce(sum(b.payout_amount), 0)
       from public.roulette_bets b
       where b.user_id = p_user and b.status = 'WON')
    + (select coalesce(sum(g.payout_amount), 0)
       from public.slot_games g
       where g.winner_id = p_user and g.status = 'COMPLETED')
  ), 0) into v_won;

  select coalesce((
    (select count(*)::bigint from public.jackpot_games g
     where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.coinflip_games g
       where g.winner_id = p_user and g.status = 'COMPLETED')
    + (select count(*)::bigint from public.roulette_bets b
       where b.user_id = p_user and b.status = 'WON')
    + (select count(*)::bigint from public.slot_games g
       where g.winner_id = p_user and g.status = 'COMPLETED')
  ), 0) into v_wins;

  return jsonb_build_object(
    'games_played', v_played,
    'games_won', v_wins,
    'total_wagered', v_wagered,
    'total_won', v_won
  );
end $$;

revoke all on function public.get_profile_stats(uuid) from public, anon, authenticated;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;

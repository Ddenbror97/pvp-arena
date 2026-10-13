-- A solo jackpot used the empty lobby's created_at. That lobby often sits
-- for longer than max_duration_seconds, so the first entry was refunded on
-- the next minute tick (a few seconds after the stake). The wait starts at
-- the first player's entry instead.
create or replace function public.jackpot_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare r record; n int := 0; n_cancelled int := 0; res text;
begin
  if not public._tick_gate('jackpot') then
    return jsonb_build_object('settled', 0, 'cancelled', 0, 'throttled', true, 'server_time', clock_timestamp());
  end if;

  for r in
    select g.id
    from public.jackpot_games g
    where g.status = 'WAITING'
      and g.player_count >= 1
      and g.pot_amount > 0
      and (
        select min(p.first_entry_at)
        from public.jackpot_players p
        where p.game_id = g.id
      ) <= clock_timestamp() - make_interval(secs => g.max_duration_seconds)
    order by g.id
    limit 10
    for update of g skip locked
  loop
    res := public._jackpot_refund_waiting(r.id);
    if res = 'cancelled' then n_cancelled := n_cancelled + 1; end if;
  end loop;

  for r in select id from jackpot_games
           where (status = 'ACTIVE' and scheduled_end_at <= clock_timestamp()) or status = 'DRAWING'
           order by id limit 10 loop
    res := jackpot_settle(r.id);
    if res = 'settled' then n := n + 1; end if;
  end loop;
  perform _ensure_open_game();
  return jsonb_build_object('settled', n, 'cancelled', n_cancelled, 'server_time', clock_timestamp());
end;
$$;

revoke all on function public.jackpot_tick() from public;
grant execute on function public.jackpot_tick() to anon, authenticated, service_role;

-- Players cannot cancel a coinflip. An unjoined game refunds itself after
-- waiting_timeout_seconds (24 hours) via coinflip_tick.
create or replace function public.coinflip_cancel(p_game_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._assert_live_session();
  raise exception 'CANCEL_DISABLED';
end;
$$;

revoke all on function public.coinflip_cancel(bigint) from public, anon, authenticated;

-- A lone jackpot waits 24 hours from the first entry. max_duration_seconds
-- stays the active-round cap (countdown cannot run longer than that).
alter table public.jackpot_config
  add column if not exists solo_wait_seconds int not null default 86400
  check (solo_wait_seconds > 0);

update public.jackpot_config set solo_wait_seconds = 86400;

create or replace function public.jackpot_tick()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare r record; n int := 0; n_cancelled int := 0; res text; wait_secs int;
begin
  if not public._tick_gate('jackpot') then
    return jsonb_build_object('settled', 0, 'cancelled', 0, 'throttled', true, 'server_time', clock_timestamp());
  end if;

  select solo_wait_seconds into wait_secs from public.jackpot_config;

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
      ) <= clock_timestamp() - make_interval(secs => wait_secs)
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

-- Waiting coinflips cannot be cancelled by the creator. The worker refunds
-- them after expires_at (24 hours).
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

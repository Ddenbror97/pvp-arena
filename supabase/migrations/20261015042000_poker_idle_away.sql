-- A player waiting alone for an opponent who closes the browser instead of pressing
-- Leave kept the seat (and the buy-in) indefinitely: a table without a hand is never
-- due, so nothing noticed. The worker's idle sweep now sits such seats out as 'away';
-- the existing sit-out kick then cashes them out after sit_out_kick_seconds unless the
-- player comes back (the client deals an 'away' seat back in when the tab is visible).
-- 90 s, not 20 s: a long-hidden tab's heartbeat timer can be throttled to once a minute.
-- Tables are locked before seats, as everywhere else.

create or replace function public._poker_close_idle() returns void
language plpgsql security definer set search_path = public as $$
declare tid bigint; x record;
begin
  for tid in
    select t.id from poker_tables t
    where t.status = 'OPEN' and t.hand_id is null
      and exists (select 1 from poker_seats s
        where s.table_id = t.id and s.status = 'SEATED' and s.state = 'ACTIVE' and not s.leaving
          and s.last_seen_at < clock_timestamp() - interval '90 seconds')
    order by t.id
    for update of t skip locked
  loop
    for x in update poker_seats set state = 'SITTING_OUT', sat_out_at = clock_timestamp(), sat_out_reason = 'away'
      where table_id = tid and status = 'SEATED' and state = 'ACTIVE' and not leaving
        and last_seen_at < clock_timestamp() - interval '90 seconds'
      returning id, user_id, last_seen_at
    loop
      perform _audit(x.user_id, 'poker_seat_away', tid,
        jsonb_build_object('seat_id', x.id, 'last_seen_at', x.last_seen_at, 'idle', true));
    end loop;
    perform public._poker_touch(tid);
  end loop;

  update poker_tables set status = 'CLOSED', closed_at = clock_timestamp(), next_due_at = null
  where status = 'OPEN' and seated = 0 and hand_id is null
    and updated_at < clock_timestamp() - interval '10 minutes'
    and id not in (select min(id) from poker_tables where status = 'OPEN' group by type_id);
end $$;

revoke all on function public._poker_close_idle() from public, anon, authenticated;
grant execute on function public._poker_close_idle() to service_role;

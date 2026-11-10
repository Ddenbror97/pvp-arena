-- PROPOSED, NOT APPLIED. This file is outside supabase/migrations on purpose: the owner
-- decides when it runs (move it into supabase/migrations, or run it in the SQL editor).
-- The site works without it: the PvPStrike lobby then keeps polling as before.
--
-- PvPStrike lobby push (foundation audit 2026-11-10, finding 12). Every lobby viewer polled
-- public.fps_lobby() every 5 s while rooms were open. With this, a change to a match sends
-- one private broadcast ("something changed", no data) on game:fps-lobby, the pattern the
-- other game feeds use (20261015034000_game_feed_broadcast.sql); viewers then read the lobby
-- once and poll only every 30 s as a fallback (src/lib/fps/lobby-feed.ts).
--
-- The broadcast carries no row: private rooms and stakes are exposed to nobody. Browsers get
-- a SELECT policy only, so nobody can publish on the topic. A failed send never rolls back
-- the match write.

create or replace function public._fps_lobby_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send('{}'::jsonb, 'changed', 'game:fps-lobby', true);
  exception when others then
    raise warning 'fps lobby broadcast failed: %', sqlstate;
  end;
  return null;
end
$$;
revoke all on function public._fps_lobby_broadcast() from public, anon, authenticated;

drop trigger if exists fps_matches_lobby_feed on public.fps_matches;
create trigger fps_matches_lobby_feed
  after insert or delete or update of status, opponent_id on public.fps_matches
  for each statement execute function public._fps_lobby_broadcast();

-- realtime-auth:begin
-- The existing game feeds policy plus the PvPStrike lobby topic.
drop policy if exists "game feeds receive" on realtime.messages;
create policy "game feeds receive" on realtime.messages for select to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (realtime.topic() in ('game:roulette', 'game:jackpot', 'game:coinflip', 'game:slot', 'game:fps-lobby')
      or realtime.topic() ~ '^poker:table:[0-9]+$')
  );
-- realtime-auth:end

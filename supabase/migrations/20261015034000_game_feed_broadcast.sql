-- Game feeds move from postgres_changes to private database broadcast, the
-- pattern live chat already uses (backend audit 2026-10-15).
--
-- postgres_changes decodes every change once per subscriber and checks RLS for
-- each one; it was the largest database cost (about 3,600 s over 338k WAL
-- polls). A broadcast is written once to realtime.messages and fanned out by
-- Realtime, so cost no longer grows with viewers.
--
-- Topics (all private; browsers have SELECT policies only, so nobody can
-- publish a fake game event):
--   game:roulette   event row     full roulette_games row
--   game:jackpot    event game    full jackpot_games row
--                   event player  {game_id} from jackpot_players
--   game:coinflip   event row     full coinflip_games row
--   game:slot       event row     full slot_games row
--   poker:table:<id> event row    {id, version}
--   wallet:<owner>  event changed {kind, account_type}; owner only
--
-- The game tables are fully readable by anon and authenticated today (RLS
-- "using (true)", every column granted), so the broadcast rows expose nothing
-- new. wallet_accounts is owner-only, so its topic carries no balance and only
-- its owner may join it.
--
-- A failed send never rolls back the game write. The tables stay in the
-- supabase_realtime publication until the new frontend is live
-- (20261015035000), so open tabs on the old bundle keep working.

create or replace function public._feed_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_topic text; v_payload jsonb;
begin
  begin
    case tg_argv[0]
      when 'wallet' then
        if new.owner_id is null
           or (tg_op = 'UPDATE' and new.balance is not distinct from old.balance) then
          return null;
        end if;
        v_topic := 'wallet:' || new.owner_id::text;
        v_payload := jsonb_build_object('kind', new.kind, 'account_type', new.account_type);
      when 'poker' then
        v_topic := 'poker:table:' || new.id::text;
        v_payload := jsonb_build_object('id', new.id, 'version', new.version);
      when 'jackpot_players' then
        v_topic := 'game:jackpot';
        v_payload := jsonb_build_object('game_id', new.game_id);
      else
        v_topic := 'game:' || tg_argv[0];
        v_payload := to_jsonb(new);
    end case;
    perform realtime.send(v_payload, tg_argv[1], v_topic, true);
  exception when others then
    raise warning 'feed broadcast failed: %', sqlstate;
  end;
  return null;
end
$$;
revoke all on function public._feed_broadcast() from public, anon, authenticated;

drop trigger if exists roulette_games_feed on public.roulette_games;
create trigger roulette_games_feed after insert or update on public.roulette_games
  for each row execute function public._feed_broadcast('roulette', 'row');

drop trigger if exists jackpot_games_feed on public.jackpot_games;
create trigger jackpot_games_feed after insert or update on public.jackpot_games
  for each row execute function public._feed_broadcast('jackpot', 'game');

drop trigger if exists jackpot_players_feed on public.jackpot_players;
create trigger jackpot_players_feed after insert or update on public.jackpot_players
  for each row execute function public._feed_broadcast('jackpot_players', 'player');

drop trigger if exists coinflip_games_feed on public.coinflip_games;
create trigger coinflip_games_feed after insert or update on public.coinflip_games
  for each row execute function public._feed_broadcast('coinflip', 'row');

drop trigger if exists slot_games_feed on public.slot_games;
create trigger slot_games_feed after insert or update on public.slot_games
  for each row execute function public._feed_broadcast('slot', 'row');

drop trigger if exists poker_tables_feed on public.poker_tables;
create trigger poker_tables_feed after update on public.poker_tables
  for each row execute function public._feed_broadcast('poker', 'row');

drop trigger if exists wallet_accounts_feed on public.wallet_accounts;
create trigger wallet_accounts_feed after insert or update of balance on public.wallet_accounts
  for each row execute function public._feed_broadcast('wallet', 'changed');

-- realtime-auth:begin
drop policy if exists "game feeds receive" on realtime.messages;
create policy "game feeds receive" on realtime.messages for select to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (realtime.topic() in ('game:roulette', 'game:jackpot', 'game:coinflip', 'game:slot')
      or realtime.topic() ~ '^poker:table:[0-9]+$')
  );
drop policy if exists "wallet feed receive" on realtime.messages;
create policy "wallet feed receive" on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'wallet:' || (select auth.uid())::text
  );
-- realtime-auth:end

-- Realtime publication trim (backend audit 2026-10-15). Apply after the frontend that
-- stops subscribing to roulette_bets is live; tabs still on the old bundle fall back to
-- polling until they reload.
--
-- roulette_bets: RLS lets a player read only their own bets, yet every roulette viewer
-- subscribed to all inserts, so each bet cost one RLS check per viewer and was delivered
-- to nobody else. Clients now refresh the bet list when the round row's bet_count changes.
-- crypto_deposits: no client subscribes to it.
--
-- Rollback: alter publication supabase_realtime add table public.roulette_bets, public.crypto_deposits;

-- prod-only:begin
do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
             and schemaname = 'public' and tablename = 'roulette_bets') then
    alter publication supabase_realtime drop table public.roulette_bets;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
             and schemaname = 'public' and tablename = 'crypto_deposits') then
    alter publication supabase_realtime drop table public.crypto_deposits;
  end if;
end $$;
-- prod-only:end

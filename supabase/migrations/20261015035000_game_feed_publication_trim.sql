-- Second step of 20261015034000: once the broadcast frontend is live, stop
-- decoding game and wallet changes for postgres_changes. Apply only after the
-- deploy that switches the hooks to listenTopic(). Tabs still on an older bundle
-- fall back to their polling until they reload.
--
-- Rollback: alter publication supabase_realtime add table <same list>.

alter publication supabase_realtime drop table
  public.roulette_games,
  public.jackpot_games,
  public.jackpot_players,
  public.coinflip_games,
  public.slot_games,
  public.poker_tables,
  public.wallet_accounts;

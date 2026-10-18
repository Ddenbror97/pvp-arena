-- Audit follow-up: no client or server code listens to row changes on these tables
-- (verified: no postgres_changes subscription, no server consumer). Rows stay intact.
-- rollback = alter publication supabase_realtime add table public.jackpot_entries, public.coinflip_entries;
alter publication supabase_realtime drop table public.jackpot_entries, public.coinflip_entries;
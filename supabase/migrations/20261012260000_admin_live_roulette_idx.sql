-- admin_ops_query('live') asks for the newest roulette round with last_error
-- set. None of the rounds have one, so the primary-key walk reads the whole
-- table to prove the limit is empty. The open-round lookup filters a status
-- index that also contains every finished round.
--
-- Build outside a transaction. Apply each statement on its own, then record
-- version 20261012260000.

create index concurrently if not exists roulette_games_error_id_idx
  on public.roulette_games (id desc)
  where last_error is not null;

create index concurrently if not exists roulette_games_open_id_idx
  on public.roulette_games (id desc)
  where status not in ('COMPLETED', 'CANCELLED');

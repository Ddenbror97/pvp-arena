-- Security audit 2026-09-26 (finding C-1): a platform-level bulk grant re-issued EXECUTE on every
-- public function and full INSERT/UPDATE/DELETE on every public table to anon/authenticated,
-- undoing earlier revokes. That exposed server-only money functions (crypto_observe_deposit,
-- crypto_credit_deposit, crypto_request_withdrawal, wallet_consume_and_verify, ...) to the
-- public Data API. This restores deny-by-default and re-grants only what browsers use.
-- Idempotent: safe to re-apply after any future platform reset.

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Server code (service_role) and the scheduler keep full access.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Browser reads: exactly the tables that carry a SELECT policy for that role.
grant select on public.coinflip_config, public.coinflip_games, public.coinflip_results,
  public.jackpot_config, public.jackpot_games, public.jackpot_players,
  public.roulette_config, public.roulette_games, public.roulette_wheels,
  public.money_domain_config
  to anon, authenticated;
grant select (id, game_id, user_id, amount, ticket_start, ticket_end, created_at)
  on public.jackpot_entries to anon, authenticated;
grant select (id, username, avatar_url, created_at) on public.profiles to anon, authenticated;
grant select on public.audit_logs, public.coinflip_entries, public.coinflip_payouts,
  public.crypto_deposit_addresses, public.crypto_deposits, public.game_chat_messages,
  public.integrity_incidents, public.integrity_runs, public.jackpot_payouts,
  public.ledger_postings, public.ledger_transactions, public.roulette_bets, public.roulette_payouts,
  public.user_roles, public.user_wallets, public.wallet_accounts
  to authenticated;

-- Browser RPCs. Everything else is server/scheduler only.
grant execute on function public.jackpot_tick() to anon, authenticated;
grant execute on function public.coinflip_tick() to anon, authenticated;
grant execute on function public.server_time() to anon, authenticated;
grant execute on function public.real_play_open() to anon, authenticated;
grant execute on function public.roulette_round_bets(bigint) to anon, authenticated;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;
grant execute on function public.jackpot_draw_ticket(bytea, bigint, integer, bigint) to anon, authenticated;
grant execute on function public._fair_hmac(bytea, text) to anon, authenticated;
grant execute on function public.coinflip_outcome(bytea, bigint, integer) to anon, authenticated;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.ensure_profile(text, boolean) to authenticated;
grant execute on function public.update_avatar(text) to authenticated;
grant execute on function public.get_my_account_status() to authenticated;
grant execute on function public.chat_heartbeat() to authenticated;
grant execute on function public.jackpot_join(bigint, text) to authenticated;
grant execute on function public.coinflip_create(bigint, public.coin_side, text) to authenticated;
grant execute on function public.coinflip_join(bigint, text) to authenticated;
grant execute on function public.coinflip_cancel(bigint) to authenticated;
grant execute on function public.roulette_bet(public.roulette_color, bigint, text) to authenticated;
grant execute on function public.roulette_tick() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_coinflip_overview() to authenticated;

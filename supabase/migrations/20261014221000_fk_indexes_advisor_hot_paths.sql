-- Cover selected unindexed foreign keys (advisor backlog). Each index matches the
-- FK's leading column(s) for ON DELETE/UPDATE and join plans. Skips cases called
-- out in 20261012190000 (e.g. jackpot_players PK (game_id, user_id), roulette_payouts PK on bet_id).

create index if not exists roulette_games_wheel_version_idx
  on public.roulette_games (wheel_version);

create index if not exists roulette_results_wheel_version_idx
  on public.roulette_results (wheel_version);

create index if not exists roulette_bets_ledger_tx_id_idx
  on public.roulette_bets (ledger_tx_id)
  where ledger_tx_id is not null;

create index if not exists partner_referrals_acquisition_code_id_idx
  on public.partner_referrals (acquisition_code_id);

create index if not exists partner_referrals_promo_code_id_idx
  on public.partner_referrals (promo_code_id)
  where promo_code_id is not null;

create index if not exists promo_wagers_user_id_idx
  on public.promo_wagers (user_id);

create index if not exists crypto_deposit_addresses_user_id_idx
  on public.crypto_deposit_addresses (user_id);

create index if not exists slot_payouts_ledger_tx_id_idx
  on public.slot_payouts (ledger_tx_id)
  where ledger_tx_id is not null;

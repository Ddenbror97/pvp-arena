-- Covering indexes for the 50 foreign keys in public that had none (performance
-- advisor, 2026-10-15; the advisor's 103 also counted the pvp_test copy). Every
-- table involved is small, so the indexes are cheap to build and keep, and
-- deletes or key updates on the parent no longer scan the child.

create index if not exists admin_pin_grants_device_id_idx on public.admin_pin_grants (device_id);
create index if not exists admin_stepup_device_id_idx on public.admin_stepup (device_id);
create index if not exists coinflip_payouts_beneficiary_id_idx on public.coinflip_payouts (beneficiary_id);
create index if not exists coinflip_results_winner_id_idx on public.coinflip_results (winner_id);
create index if not exists crypto_deposits_asset_idx on public.crypto_deposits (chain_id, asset_key);
create index if not exists crypto_deposits_ledger_tx_id_idx on public.crypto_deposits (ledger_tx_id);
create index if not exists crypto_deposits_price_snapshot_id_idx on public.crypto_deposits (price_snapshot_id);
create index if not exists crypto_withdrawal_quotes_asset_idx on public.crypto_withdrawal_quotes (chain_id, asset_key);
create index if not exists crypto_withdrawal_quotes_price_snapshot_id_idx on public.crypto_withdrawal_quotes (price_snapshot_id);
create index if not exists crypto_withdrawal_quotes_user_id_idx on public.crypto_withdrawal_quotes (user_id);
create index if not exists crypto_withdrawals_asset_idx on public.crypto_withdrawals (chain_id, asset_key);
create index if not exists crypto_withdrawals_hold_ledger_tx_id_idx on public.crypto_withdrawals (hold_ledger_tx_id);
create index if not exists crypto_withdrawals_release_ledger_tx_id_idx on public.crypto_withdrawals (release_ledger_tx_id);
create index if not exists crypto_withdrawals_reviewed_by_idx on public.crypto_withdrawals (reviewed_by);
create index if not exists crypto_withdrawals_settle_ledger_tx_id_idx on public.crypto_withdrawals (settle_ledger_tx_id);
create index if not exists daily_chest_opens_cosmetic_id_idx on public.daily_chest_opens (cosmetic_id);
create index if not exists daily_chest_opens_reward_key_idx on public.daily_chest_opens (reward_key);
create index if not exists daily_chest_pool_items_cosmetic_id_idx on public.daily_chest_pool_items (cosmetic_id);
create index if not exists game_chat_moderation_events_message_id_idx on public.game_chat_moderation_events (message_id);
create index if not exists jackpot_players_user_id_idx on public.jackpot_players (user_id);
create index if not exists leaderboard_campaigns_approved_by_idx on public.leaderboard_campaigns (approved_by);
create index if not exists leaderboard_campaigns_template_id_idx on public.leaderboard_campaigns (template_id);
create index if not exists leaderboard_entries_player_id_idx on public.leaderboard_entries (player_id);
create index if not exists leaderboard_prize_awards_player_id_idx on public.leaderboard_prize_awards (player_id);
create index if not exists leaderboard_prize_wagers_user_id_idx on public.leaderboard_prize_wagers (user_id);
create index if not exists leaderboard_templates_created_by_idx on public.leaderboard_templates (created_by);
create index if not exists leaderboard_wager_events_player_id_idx on public.leaderboard_wager_events (player_id);
create index if not exists partner_profit_releases_admin_id_idx on public.partner_profit_releases (admin_id);
create index if not exists partner_topups_admin_id_idx on public.partner_topups (admin_id);
create index if not exists partners_created_by_idx on public.partners (created_by);
create index if not exists partners_removed_by_idx on public.partners (removed_by);
create index if not exists partners_updated_by_idx on public.partners (updated_by);
create index if not exists poker_seats_close_ledger_tx_idx on public.poker_seats (close_ledger_tx);
create index if not exists prestige_rewards_cosmetic_id_idx on public.prestige_rewards (cosmetic_id);
create index if not exists promo_codes_created_by_idx on public.promo_codes (created_by);
create index if not exists referral_reward_wagers_user_id_idx on public.referral_reward_wagers (user_id);
create index if not exists referral_rewards_deposit_id_idx on public.referral_rewards (deposit_id);
create index if not exists referrals_invite_id_idx on public.referrals (invite_id);
create index if not exists referrals_qualifying_deposit_id_idx on public.referrals (qualifying_deposit_id);
create index if not exists roulette_config_wheel_version_idx on public.roulette_config (wheel_version);
create index if not exists roulette_payouts_beneficiary_id_idx on public.roulette_payouts (beneficiary_id);
create index if not exists slot_bonus_events_return_tx_id_idx on public.slot_bonus_events (return_tx_id);
create index if not exists slot_bonus_events_triggered_by_idx on public.slot_bonus_events (triggered_by);
create index if not exists slot_games_winner_id_idx on public.slot_games (winner_id);
create index if not exists slot_payouts_beneficiary_id_idx on public.slot_payouts (beneficiary_id);
create index if not exists user_cosmetics_cosmetic_id_idx on public.user_cosmetics (cosmetic_id);
create index if not exists user_prestige_equipped_crown_id_idx on public.user_prestige (equipped_crown_id);
create index if not exists user_prestige_equipped_frame_id_idx on public.user_prestige (equipped_frame_id);
create index if not exists user_reward_claims_reward_id_idx on public.user_reward_claims (reward_id);

-- signup_blocked_ips was created in production outside the migration history.
-- prod-only:begin
create index if not exists signup_blocked_ips_blocked_by_idx on public.signup_blocked_ips (blocked_by);
-- prod-only:end

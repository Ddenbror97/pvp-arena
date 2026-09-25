# Real-money ledger migration (test credits → real USD)

Follows your uploaded spec. Nothing gets credited, withdrawn or sent. At the end the system is ready for real money but still switched off.

## 1. What exists today (inspected)

```text
wallet_accounts   (owner, kind, asset, account_type, balance)  <- balance cache only; written by _post()
ledger_transactions (kind, idempotency_key UNIQUE, account_type, user/game)
ledger_postings   (tx, account, amount, balance_after)          <- double-entry, _ledger_balanced trigger sums to 0
```

- **Test money:** every account is `TEST_USD / test_credit`: player spendable + locked, house_revenue, game_escrow, test_faucet. Players still hold 277,400 test cents in total, spread over 4 non-zero accounts.
- **Real money:** only the deposit/withdrawal code points at `USD / real` (`chain_assets.ledger_asset/ledger_account_type`). No `USD/real` accounts exist yet. That is why the $4.50 credit failed with ACCOUNT_NOT_FOUND.
- **Where each game gets its money type:**
  - Jackpot copies `jackpot_config.asset/account_type` onto each game.
  - Coinflip (`coinflip_create`) and Roulette (`_roulette_ensure_open`, `roulette_bet`) hardcode `'test_credit'`.
  - Settle and refund functions (`jackpot_settle`, `coinflip_advance/_coinflip_refund`, `_roulette_settle/_roulette_refund`) read the type from the game row. That part is already correct.
- **Test-money functions:** `ensure_profile` (welcome grant), `claim_test_credits`, `reset_test_credits`.
- **Deposit/withdrawal functions:** `crypto_credit_deposit`, `crypto_request_withdrawal`, `_crypto_release`, `crypto_withdrawal_confirmed`, `crypto_reconcile`. They use `deposit:chain:tx:log` style idempotency keys and write audit rows through `_audit`.
- **Open test games:** 1 Jackpot round and 1 Roulette round are open on test money. Coinflip has none open.

## 2. Money separation (permanent)

- Test money stays in its own isolated area (option 1 of your spec). Nothing is deleted and no test balance is converted.
- Two new database rules:
  - Every ledger transaction may touch only accounts whose `account_type` matches the transaction's own. Mixing test and real is rejected.
  - Transaction kinds are split: `test_credit_grant` and `test_credit_reset` are allowed only on test money; `deposit` and `withdrawal` only on real money.
- A new `money_domain_frozen` flag locks the test area. After finalization, no new test-money transactions can be written (history stays readable).
- `ensure_profile` stops granting test credits. It creates the new player's real spendable and locked accounts at $0 instead.
- `claim_test_credits` is removed from use: its permission is revoked and it always refuses.

## 3. Real USD accounts

- **Per player:** `user_available` and `user_locked` for `USD/real`. They are created by the migration for existing players (at $0) and at signup for new ones. `_user_account` still fails closed if an account is missing.
- **House:** `house_revenue`, `game_escrow` and `external_custody` for `USD/real`. All start at $0, so no value is created.
- **Balances:** they change only through `_post()`. The existing negative-balance check, row locks and idempotency key apply. The client still has no write access.

## 4. Games switch money type (accounting only)

- `jackpot_config.asset/account_type` becomes `USD/real`.
- Coinflip and Roulette read the money type from a single new config value, replacing the hardcoded `'test_credit'`.
- Game rules, fairness/HMAC, timing, limits, multipliers and winner selection stay byte-identical. Only the lines that pick the money type change.
- **Open test rounds:** the one open Jackpot round and the one open Roulette round are cancelled and refunded in test money through their existing refund paths. After that, every new round is real.
- **Real play gate:** games may open real rounds only if `crypto_settings.real_play_enabled` is true. It stays **false**, so no real bet is possible at the end of this task.

## 5. Migration safety

- One versioned migration. It records a marker in a new `money_migrations` table and writes an audit record.
- It stops, without changing anything, unless all of these hold:
  - no real-money ledger transactions exist
  - no open withdrawals exist
  - the $2 and $4.50 deposits are CONFIRMED with no ledger link
  - the marker is not already present
- Everything runs in one database transaction, so a failure changes nothing.
- It can be undone until you finalize: a documented rollback migration exists. Finalizing (freezing test money) is a separate step.

## 6. Screens

- The header and wallet page show real USD spendable, plus locked if not zero.
- Test balances are never shown as money. The faucet and test-credit controls are gone.
- When real play is off, the games show "Real-money play not yet open" instead of a bet button. No other visual changes.

## 7. Guards kept or added

- Existing: chain 8453, USDC contract/decimals, two RPCs agreeing, payout-key/address match, reserved treasury/payout addresses, limits, float cap, emergency stop, watch-only.
- New: every real-money function refuses to run unless the migration marker exists and the test area is frozen. There is no fallback to test money or Sepolia.
- Security review: confirm no real-money function can be executed by anon or authenticated users other than the intended player functions. Run the linter.

## 8. Tests (run before any report of readiness)

New database money tests, run inside rolled-back transactions against the real schema. Coverage:
- Test/real mixing rejected.
- Ledger: debit/credit, lock/unlock, insufficient balance, concurrent spend, rollback, idempotency.
- Deposits: duplicate credit, unknown or unverified sender, minimum amount, decimals.
- Each game on real money: entry, settlement, winner payout, house fee exactness, duplicate settlement, race.
- Roulette limits: max bets, max wager, pot limit, locked period.
- Withdrawals: insufficient balance, locked funds, duplicate request, failure release, float cap, daily limit, emergency stop.
- Reconciliation.

The existing 119 unit tests and 13 database tests must also pass.

**Reconciliation rule** (documented with the tests): on the real side, the sum of all postings is 0. Player liabilities plus house plus escrow equals minus `external_custody`, which equals credited deposits minus settled withdrawals.

## 9. End state

Real deposit crediting, withdrawals, real play and watch-only are exactly as today:
- Crediting and withdrawals: OFF
- Real play: OFF
- Watch-only: ON
- $2 and $4.50 deposits: untouched

The final report follows your 16 points. Any failed check means stopping without enabling anything.

## Technical details

- New objects:
  - `money_migrations`: version, applied_at, details, finalized_at. Service-role only.
  - A `_ledger_domain_guard` trigger on `ledger_postings`.
  - Settings: `crypto_settings.real_play_enabled` and `money_domain_frozen`.
  - A config value for game money type.
- Functions edited only where they pick the money type: `ensure_profile`, `coinflip_create`, `_roulette_ensure_open`, `roulette_bet`, plus the `jackpot_config` row.
- `claim_test_credits` and `reset_test_credits` are hardened to refuse after the freeze.
- `crypto_reconcile` is extended with the real-domain invariant and excludes test money.
- Code changes: balance query in the header/wallet (read the `USD/real` accounts), removal of the faucet UI, and the disabled game state when real play is off.

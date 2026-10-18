# Real-money ledger migration (test credits → real USD)

Follows your spec plus all 8 reviewer changes. Nothing gets credited, withdrawn or sent. At the end the system is ready for real money but still switched off.

## 1. What exists today (inspected)

```text
wallet_accounts     (owner, kind, asset, account_type, balance)  <- balance cache; written only by _post()
ledger_transactions (kind, idempotency_key UNIQUE, account_type, user/game)
ledger_postings     (tx, account, amount, balance_after)         <- double-entry; _ledger_balanced makes each tx sum to 0
```

- **Test money:** every account is `TEST_USD / test_credit`: player spendable + locked, house_revenue, game_escrow, test_faucet. Players still hold 277,400 test cents in total.
- **Real money:** only the deposit/withdrawal code points at `USD / real`. No `USD/real` accounts exist yet. That is why the $4.50 credit failed with ACCOUNT_NOT_FOUND.
- **How games pick their money type:**
  - Jackpot copies `jackpot_config.asset/account_type` onto each game.
  - Coinflip and Roulette hardcode `'test_credit'`.
  - Settle and refund already read the type from the game row.
- **Test-money functions:** `ensure_profile` (welcome grant), `claim_test_credits`, `reset_test_credits`.
- **Open test games:** 1 Jackpot round and 1 Roulette round.

## 2. Separation enforced by the database (reviewer point 1)

A `_ledger_domain_guard` trigger on `ledger_postings` runs for every insert, including from server functions and admin access. It rejects:
- a posting whose account `asset/account_type` differs from its transaction's `account_type`
- any `TEST_USD` posting in a `real` transaction, or `USD` in a `test_credit` one
- test-only kinds (`test_credit_grant`, `test_credit_reset`) on real money, and `deposit`/`withdrawal` on test money
- any test-domain posting once the test domain is frozen

The functions `claim_test_credits` and the test grant in `ensure_profile` are cut off. `ensure_profile` creates the player's real accounts at $0 instead. No function exists that converts in either direction.

## 3. One server-side money setting (architecture change)

- A single row in a new `money_domain_config` table (`money_domain = REAL_USD`, `asset = USD`, `account_type = real`) is the only source.
- A new `money_domain` column is stored on each game row when the game is created, so past games stay unchanged. Jackpot, Coinflip and Roulette creation read it on the server.
- Bets, settlement and refunds use the game row's value, never the setting again.
- Clients never pass asset, account type or domain. The functions have no such inputs.

## 4. Explicit migration states (reviewer point 2)

```text
PRE_MIGRATION --migrate--> MIGRATED --finalize--> FINALIZED
```

- **MIGRATED requires:** real accounts exist, test accounts untouched, zero open test games, and real play, crediting and withdrawals all OFF.
- **FINALIZED requires:** everything in MIGRATED, plus the test domain frozen for good.
- **Real play is allowed only if all hold:**
  - state = FINALIZED
  - `money_domain_frozen`
  - `real_play_enabled`
  - `crypto_system_enabled` (emergency stop not triggered)

  One of these switches alone is never enough.
- **Real-money functions** (bet, credit, withdraw) refuse unless state is FINALIZED.

## 5. The migration itself (reviewer points 3, 5, 6)

It runs as one database transaction, and every check that fails aborts everything.

**Before any change**, it checks:
- The marker is absent; if present, it exits without changes, so running twice is safe.
- No real transactions exist.
- No withdrawal rows are open.
- The two deposits are exactly as recorded: status, hash, amount, sender, destination, block and confirmed time, with no ledger link. This snapshot is stored in the marker's details.

**Steps:**
1. Cancel and refund the 1 open Jackpot and 1 open Roulette test round through their existing refund functions.
2. Create the real accounts at $0.
3. Set the money setting.
4. Point game creation at it.
5. Write the marker plus an audit record.

**After the steps, it verifies:**
- Open test games = 0. Each cancelled game is terminal, has its refund transaction and refund key, and has $0 left in escrow.
- Test escrow = $0.
- Test player balances are unchanged apart from the refunds.
- Every real total is exactly $0: player, escrow, house, custody, and the sum of all real postings.
- The two deposits match the snapshot, still with no ledger link.

**Undo and finalize:**
- A tested rollback migration returns to PRE_MIGRATION while in the MIGRATED state.
- Finalizing is a separate small migration run after the tests pass.

## 6. Reconciliation (reviewer point 4)

The sign convention is encoded in tests and in `crypto_reconcile`. Custody is the negative side.

- `SUM(all real postings) = 0`
- `-external_custody = player_available + player_locked + game_escrow + house_revenue`
- `-external_custody = credited deposits - settled withdrawals` (checked independently from the chain records)

Test money is excluded from all three.

## 7. Screens

- The header and wallet page show real USD spendable, plus locked if not zero.
- Test balances and the faucet are gone.
- When real play is off, the game bet buttons show "Real-money play not yet open". No other visual changes.

## 8. Tests (reviewer points 7, 8)

**Baseline:** first, find the current full suite and record its unit, database and security test counts. That count may not drop. All old tests plus all new ones must pass.

**New database tests**, run in rolled-back transactions:
- Mixing test and real is rejected.
- Ledger: debit/credit, lock/unlock, insufficient balance, negative balances blocked, concurrent spend, rollback, idempotency.
- Deposits: duplicate credit, unknown or unverified sender, minimum amount, decimals.
- Each game on real money: entry, settlement, payout, exact house fee, duplicate settlement, concurrent settlement.
- Roulette limits.
- Withdrawals: insufficient balance, locked funds, duplicate request, failure release, float cap, limits, emergency stop.
- State machine gates and rollback.
- Reconciliation equations.

**Attack tests as a signed-in browser user.** Each path must fail:
- Direct RPC calls with malformed arguments or extra asset/account/domain arguments.
- REST insert/update on wallet_accounts, ledger tables, games, the money setting, migration state and crypto_settings.
- Attempts to change `real_play_enabled` or a game's money type.

**Not proof of readiness:** passing the linter, typecheck or build does not count on its own.

## 9. Acceptance gates

The report includes your full reviewer checklist, each item marked pass or fail. Any fail means stop, with nothing enabled.

**End state:**
- Crediting: OFF
- Withdrawals: OFF
- Real play: OFF
- Watch-only: ON
- Both deposits: untouched and uncredited

## Technical details

- **New:**
  - `money_migrations` table: version, state, details, applied_at, finalized_at. Service-role only.
  - `money_domain_config`, a single row, read-only to clients.
  - `money_domain` column on the jackpot, coinflip and roulette game tables. Existing games get TEST_USD.
  - Settings: `crypto_settings.real_play_enabled` and `money_domain_frozen`.
  - The `_ledger_domain_guard` trigger.
- **Edited:** only the lines that pick the money type in `jackpot_join`/`_ensure_open_game`, `coinflip_create` and `_roulette_ensure_open`/`roulette_bet`, plus `ensure_profile`. Fairness, timing and settlement math are unchanged.
- **Hardened:** `claim_test_credits` and `reset_test_credits` refuse after the freeze.
- **Extended:** `crypto_reconcile`.
- **Screens:** the balance query in the header/wallet, faucet removal, and the disabled bet state.

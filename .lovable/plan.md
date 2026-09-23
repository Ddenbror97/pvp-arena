# PVPCasino — Jackpot (first release)

One game, built properly: a live multiplayer jackpot where the server owns every number that matters. Winner takes the pot (house fee exists in config, set to 0%). Wallets hold clearly-labelled TEST CREDITS only, amounts shown in USD. This release is not production-ready for real money and will not be described as such until it passes security, accounting, concurrency and fairness verification.

## What you'll be able to do

- Sign up with email and password, pick a username and avatar.
- See a wallet marked TEST CREDITS with available balance, locked (in-game) balance, and a full transaction list.
- Join the current jackpot with any amount (quick picks $5 / $10 / $25 / $50 / MAX) and see your live chance before confirming.
- Watch the pot, player list, entry count and countdown update instantly as others join.
- Countdown starts at 60s when the second player joins, each new player adds 10s, never above 180s. Topping up your own entry adds no time.
- At zero: entries lock, the wheel spins and slows, and it stops on the winner the server already picked. Celebration with the winner's avatar, exact win chance and payout.
- Browse past games and open any one for the full record, and verify the draw yourself with a built-in verifier.

## Provably fair protocol (core, built with the engine)

```text
Before entries open:
  server_seed      = 32 random bytes (CSPRNG)
  server_seed_hash = SHA256(server_seed)          -> published immediately

Fixed, operator-independent message (known before outcome):
  message = "PVPCasino:jackpot:v1:" + game_id + ":" + draw_version(=1)

After entries close (entries frozen, final pot N cents = ticket units):
  counter = 0
  loop:
    h = HMAC-SHA256(server_seed, message + ":" + counter)
    r = first 8 bytes of h as unsigned 64-bit integer
    limit = floor(2^64 / N) * N
    if r < limit: winning_ticket = r mod N; stop
    counter += 1                                   (rejection sampling, no modulo bias)
  winner = entry with ticket_start <= winning_ticket < ticket_end

After settlement: reveal server_seed.
```

- No free nonce the operator can choose; the message is fully determined by the game ID and protocol version, which are fixed when the seed is committed.
- The seed is stored in a server-only table, never readable by clients until the game completes.
- Published: protocol spec page, deterministic test vectors, and an in-browser verifier that recomputes the winner from revealed data.
- Noted for later (before real money): adding an external randomness contribution the operator can't control alone, reviewed by a cryptography specialist.

## Game invariants (enforced by constraints, transactions and tests)

1. A completed, cancelled or drawing game accepts no entries.
2. An entry belongs to exactly one game.
3. Ticket ranges never overlap and have no gaps; first starts at 0.
4. Sum of entry amounts equals the final pot; last ticket_end equals the pot.
5. Every entry has exactly one ledger debit.
6. Every completed game has exactly one winner.
7. A payout is processed at most once.
8. The winning ticket lies inside the final ticket range.
9. The displayed win probability equals winner total / final pot from the immutable record.
10. A game is drawn at most once.
11. No client can modify any financial or game-critical value.

## Concurrency and closing rules

All entry and closing operations use one transaction and lock strategy: row-lock the game (`SELECT ... FOR UPDATE`) first, then act.
- Join: lock game, check status is WAITING/ACTIVE and the database clock `now()` is strictly before `scheduled_end_at`; otherwise reject, whatever the screen shows.
- Close: lock game, verify deadline passed, conditionally set ACTIVE to DRAWING (`WHERE status = 'ACTIVE'`). Exactly one caller wins that transition; others see it done and exit.
- Because both paths hold the same row lock, an entry either commits fully before the close or is rejected after it. At-or-after the deadline = rejected.
- Workers are idempotent and safe to run in parallel.

## Background worker

```text
Database scheduler (every few seconds, runs with nobody online)
  -> find games past deadline or stuck mid-settlement
  -> lock game -> verify deadline -> ACTIVE to DRAWING
  -> freeze entries -> compute winner (protocol above)
  -> create payout obligation -> settle payout to ledger
  -> reveal seed -> COMPLETED
```

The scheduler runs inside the database, independent of browsers, realtime connections, or the page being open. Any step that fails leaves the game in a named recoverable state with an audit record; the next run retries from there. Never a fake "paid".

## Wallet accounting

Example: balance $100, joins with $25 -> available $75, locked $25. Winner at settlement: locked $0, available $75 + pot. Loser: locked $0, available $75.
- Double-entry ledger: every movement is an immutable pair of rows between accounts (user available, user locked, game escrow, house).
- Invariant: sum of user available + locked + unsettled game escrow reconciles exactly with the ledger. Balance columns are a cache checked against the ledger by a reconciliation test and job.
- Account type is part of every wallet and ledger row: `test_credit` vs `real`. The jackpot only mixes funds of one type per game; test and real accounting never share a path.

## Test credits restrictions

- No cash value, cannot be withdrawn or transferred, labelled TEST CREDITS everywhere.
- Real-money mode is off by default by configuration; no deposit or withdrawal provider connected.
- Crypto deposit/withdrawal exist only as interfaces (WalletProvider, DepositProvider, WithdrawalProvider, BalanceProvider) that refuse to run while real money is disabled.

## Order of work

1. Architecture and security model.
2. Database schema and accounting invariants.
3. Accounts and profiles.
4. Test-credit wallet and double-entry ledger.
5. Jackpot engine and state machine.
6. Provably fair protocol with test vectors.
7. Secure drawing, background worker and settlement.
8. Realtime updates.
9. UI, wheel and drawing animation.
10. Game history and in-app verifier.
11. Security testing and failure recovery.
12. Read-only admin view.

## Technical notes

- Integer cents everywhere; no floating point in money or ticket paths.
- Idempotency key on every entry and payout; repeats return the original result.
- States: `WAITING -> ACTIVE -> DRAWING -> COMPLETED`, plus `CANCELLED`; payout has its own state (`PENDING -> SETTLED` / `FAILED`, retryable).
- Timer columns are server-set (`countdown_started_at`, `scheduled_end_at`, `max_end_at`); the browser renders against a server time offset only.
- Row-level security: users read only their own wallet and ledger; public game data read-only; seeds unreadable until completion; all writes go through server functions and database functions.
- Rate limiting on entries per user.
- Tables: `profiles`, `user_roles`, `wallet_accounts`, `ledger_entries`, `jackpot_games`, `jackpot_game_secrets`, `jackpot_entries`, `jackpot_results`, `payouts`, `audit_logs`.
- Compliance hooks as configuration only: age gate, KYC/AML, geo restrictions, limits, self-exclusion, terms/privacy/responsible-gambling pages.
- Tests: fairness test vectors and bias checks, ticket maths, timer start/extend/cap, multiple and concurrent entries, deadline race, double-close, insufficient balance, duplicates, payout idempotency, access rules, ledger reconciliation, full lifecycle.

## Not in this release

No other games. No real funds. No admin controls that can alter an outcome or a balance.

# PVPCasino Jackpot — architecture and verification report

Status: **test credits only**. Production-quality engineering standards; not presented as production-ready real-money gambling.

## Where the logic lives

All game-critical and financial logic runs inside Postgres functions (single transactions, row locks). The browser only calls:

| Function | Who | Purpose |
|---|---|---|
| `ensure_profile(username, age_confirmed)` | signed-in | create profile, wallet accounts, welcome test credits |
| `jackpot_join(amount, idempotency_key)` | signed-in | the only way to enter a game |
| `claim_test_credits()` | signed-in | hourly test-credit faucet (idempotent per hour) |
| `update_avatar(url)` | signed-in | profile avatar |
| `jackpot_tick()` | anyone | idempotent worker: settles games whose server deadline passed |
| `server_time()`, `jackpot_draw_ticket(...)`, `get_profile_stats(user)` | anyone | read-only / pure |
| `admin_overview()` | admins | read-only overview |

Internal (not callable by clients): `jackpot_settle`, `_post`, `_ensure_open_game`, `_system_account`, `_user_account`, `_audit`.

## Worker

`pg_cron` runs `jackpot_tick()` every minute, independent of browsers. Clients also call it when their countdown reaches zero, so settlement is instant while players are watching. The server re-checks the deadline itself; an early call is a no-op.

## Locking model

- Join: `_ensure_open_game` (advisory lock for creation) → `SELECT … FOR UPDATE` on the game → check status and `clock_timestamp() < scheduled_end_at` → lock the user's available account → ledger debit → entry → aggregates.
- Close: `SELECT … FOR UPDATE` on the game → deadline check → `ACTIVE → DRAWING` → draw → settle → `COMPLETED`.
- Both paths take the game row lock first, so an entry commits entirely before the close or is rejected after it.
- A partial unique index guarantees at most one open (WAITING/ACTIVE) game.

## Ledger

Double-entry: every `ledger_transactions` row has postings summing to zero (deferred constraint trigger). Accounts: `user_available`, `user_locked`, `game_escrow`, `house_revenue`, `test_faucet`. Every account and transaction carries `account_type` (`test_credit` | `real`); `jackpot_config.real_money_enabled` is constrained to `false`.

Entry: available → locked. Settlement (one transaction): each player's locked → escrow, escrow → winner available (pot − rake) and house (rake).

Invariants checked by tests: all balances sum to 0; each cached balance equals its postings; locked total = open pots; escrow = 0 after settlement.

## Immutability

Triggers block update/delete on ledger, entries, audit log and seeds; completed/cancelled games cannot change; illegal status transitions, pot decreases and commitment changes are rejected.

## Fairness protocol v1

See `/fairness` in the app and `src/lib/jackpot/fairness.ts`. Seed (32 bytes, pgcrypto) committed as SHA-256 at game creation, stored in a table no client can read, revealed on the game record only when `COMPLETED` (enforced by a check constraint). Winner ticket via HMAC-SHA256 over a fixed message with integer rejection sampling. Known limitation: operator is the sole randomness source — add an independent contribution before any real-money use.

## Tests (`bun run test`)

- `tests/fairness.test.ts` — published test vectors, range, rejection sampling, uniformity, verifier tamper detection.
- `tests/math.test.ts` — integer money, probability, timer rules, wheel geometry.
- `tests/db/jackpot.integration.test.ts` — builds an isolated `pvp_test` schema from the real migrations and covers: full lifecycle, timer cap, validation, idempotency, rate limit, 25-user concurrent joins, double spend, join-vs-close race, 15 duplicate workers, injected settlement failure and recovery, transaction rollback, repeated payout attempts, immutability, seed hiding, faucet, and SQL ↔ TypeScript draw agreement on random seeds.
- `tests/db/rls.integration.test.ts` — anonymous client cannot read private data, write game/financial tables, or call internal functions.

A failure in any of these blocks deployment.

A cross-check between the SQL draw and the TypeScript verifier found a numeric-precision bug in the SQL draw for pots above roughly 2^62 cents. It was fixed (exact integer `div`/`mod`) before any real game used it.

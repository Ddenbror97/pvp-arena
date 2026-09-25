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

---

# Coinflip (v1) — TEST CREDITS ONLY

## Lifecycle
WAITING → READY → FLIPPING → SETTLEMENT → COMPLETED, and WAITING → CANCELLED. Every other transition is rejected by the `coinflip_guard` trigger.
- Create (`coinflip_create`): validates auth, profile, self-exclusion, test-credit mode, min/max, rate limit, open-game cap, balance; locks wallet rows; generates a 32-byte seed; stores SHA-256 commitment; posts available → locked; writes entry slot 1.
- Join (`coinflip_join`): `FOR UPDATE` on the game row, then the joiner's wallet rows; checks WAITING, not expired, not creator, balance; posts available → locked; server assigns the opposite side; computes the outcome into `coinflip_results` (hidden); sets `joined_at = clock_timestamp()` once and derives `animation_start_at = joined_at + 3000 ms`, `animation_end_at = start + 3500 ms`.
- READY → FLIPPING only when `animation_start_at <= db time`; FLIPPING → SETTLEMENT only when `animation_end_at <= db time` (enforced in the trigger).
- Settlement (`coinflip_advance`): same posting pattern as Jackpot (players' locked → escrow → winner available → house if fee > 0). Payout row per game, idempotency key `coinflip:{id}:winner`. All invariants re-checked (2 entries, equal wagers, opposite sides, seed hash, recomputed HMAC). Any failure leaves the game in SETTLEMENT with a FAILED payout; the next worker retries.
- Expiry/cancel: `_coinflip_refund` posts locked → available once (`coinflip:{id}:refund`).
- Worker: `coinflip_tick()` (row-locked, `SKIP LOCKED`) runs in the existing once-a-minute job and is also called by open browsers at each deadline.

## Result visibility
The outcome exists server-side from the join, but the public game row carries `winner_id/winning_side = NULL` until FLIPPING (CHECK constraint), `coinflip_results` is readable only once the game is FLIPPING or later (RLS), the results table is not in realtime, and the join RPC returns no result. The seed is only written to the game row at COMPLETED (CHECK constraint). Seeds never appear in audit logs (tested).

## Fairness
`h = HMAC-SHA256(server_seed, "PVPCasino:coinflip:v1:{game_id}:{draw_version}")`, `side = h[0] & 1 ? TAILS : HEADS`. Shared primitive `_fair_hmac` (pgcrypto) / `src/lib/fairness/core.ts` (Web Crypto). 32 published vectors in `src/lib/fairness/coinflip-v1-vectors.json`, generated by a third implementation (Node crypto) and checked independently by SQL and by the browser verifier.

## Tables
`coinflip_config`, `coinflip_games`, `coinflip_entries` (unique per game: slot, side, user; unique user+idempotency key), `coinflip_game_secrets` (no client access), `coinflip_results` (immutable), `coinflip_payouts` (PK game_id, unique idempotency key, immutable once SETTLED). `audit_logs.game_type` added. Enum additions: `coinflip_status`, `coin_side`, `coinflip_payout_kind`, three `tx_kind` values.

## Known notes
- Jackpot settlement locks wallet rows in a different order than joins; under heavy load this can cause a retry-safe deadlock. Coinflip locks all wallet rows in one global order. Jackpot left unchanged by request.
- Linter warnings remain for the intentionally callable game actions (create/join/cancel/tick, Jackpot join/tick, profile helpers). Internal functions are not callable from the browser (tested).

## Withdrawal finality (security meaning of CONFIRMED)
A withdrawal becomes CONFIRMED (hold settled to external custody) only when its payout
receipt is `success`, its block is at or below the RPC `safe` head (Base: batch posted to L1),
and two independent providers agree on the receipt status, block number and block hash.
A reverted payout releases the hold only under the same safe + two-provider condition, so a
reorg of an unsafe block can never refund a payout that later succeeds. Disagreement raises
`crypto_withdrawal_rpc_disagreement` and keeps the hold. Settle/release are idempotent
(`withdrawal:<id>:settle|release`) and mutually exclusive; closed rows are immutable.

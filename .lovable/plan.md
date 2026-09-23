# PVPCasino — Coinflip (TEST CREDITS ONLY)

Second game, built on the existing Jackpot wallet, ledger, fairness, audit, realtime and worker infrastructure. No new wallet, ledger, auth or crypto implementation. Jackpot logic, fairness protocol v1 and its test vectors stay byte-identical.

## What the player gets

- **Coinflip lobby** (`/coinflip`): create panel (wager, quick $5/$10/$25/$50/MAX, HEADS/TAILS, "You wager / Pot / Win" summary, TEST CREDITS badge) plus live list of open games (creator, avatar, wager, side VS opposite side, WIN amount, Join).
- **Game room** (`/coinflip/$gameId`): Waiting for opponent (with Cancel) → Opponent found ($5 vs $5) → 3-2-1 from server time → 3.5 s coin animation → winner card with exact settled amount (+$10.00 / -$5.00 TEST CREDITS). Works on refresh, in two tabs, and after reconnecting.
- Header nav gains Jackpot / Coinflip. History, game detail page, fairness page and admin overview show both games.

## Game lifecycle (server-owned)

```text
WAITING --join--> READY --t>=animation_start--> FLIPPING --t>=animation_end--> SETTLEMENT --> COMPLETED
   |                                                                                ^
   +--timeout / creator cancel--> CANCELLED (refund via ledger)        failure -> stays SETTLEMENT, retried
```

- Create: lock wager (available → locked), 32-byte seed generated, SHA-256 hash committed at creation (before any opponent exists).
- Join (one transaction, `FOR UPDATE` on game row, then wallet): verify WAITING, not expired, not creator, exact same amount, balance; lock wager; server assigns opposite side; set `joined_at = clock_timestamp()`, `animation_start_at = +3s`, `animation_end_at = +6.5s`; compute outcome and store in hidden result record; status READY.
- Outcome becomes publicly readable only once FLIPPING (animation start); seed revealed only at COMPLETED.
- Settlement: both locked → escrow → winner available (pot − fee; fee 0 bps, stored per game) → house if fee > 0. Payout row unique per game, idempotency key `coinflip:{id}:winner`. Failure keeps game in SETTLEMENT with FAILED payout, retried; never COMPLETED without ledger success.
- Expiry: configurable WAITING timeout (default 60 s) → CANCELLED with idempotent refund `coinflip:{id}:refund`. Cancel allowed only by creator while WAITING.

## Fairness (shared engine, domain-separated)

- Message: `PVPCasino:coinflip:v1:{game_id}:{draw_version}`, HMAC-SHA256 keyed by server seed, `first_byte & 1` → 0 HEADS, 1 TAILS. Same pgcrypto primitives as Jackpot.
- Client verifier refactored into a shared core (`sha256`, `hmacSha256`, message builder) with two derivations: jackpot (unchanged) and coinflip. Fairness page gets a game-type selector; verification runs entirely in the browser.
- Published test vectors (≥3 HEADS, ≥3 TAILS) with seed, hash, digest, first byte, expected side; SQL and TypeScript must match or tests fail.

## Worker

- `coinflip_tick()` (idempotent, row-locked, `SKIP LOCKED`) advances READY→FLIPPING→SETTLEMENT→COMPLETED, retries failed settlements, expires WAITING games; writes RECOVERY_* audit events.
- Called by: the existing pg_cron job (extended to also run coinflip ticks; switched to a seconds-level schedule so games finish without any browser), plus clients near deadlines as a harmless accelerator. Note: faster schedule adds some ongoing Cloud cost.

## Testing / Definition of done

Extend the isolated test schema harness; add `tests/db/coinflip.integration.test.ts`, coinflip vectors in `tests/fairness.test.ts`, RLS cases in `tests/db/rls.integration.test.ts`. Covers every item in the request: create/join validation, simultaneous joins (only one wins), double-create/double-join idempotency, exact timestamps, hidden result before FLIPPING, seed hidden before COMPLETED, correct payouts and loser balance, duplicate/delayed workers, injected failure before/after payout and recovery, expiry refunds, cancel, immutability, ledger reconciliation (sum of all balances = 0). Then full Jackpot regression, linter, typecheck, Playwright two-account browser run. Deliverable: test results + schema/RLS/security report in `docs/ARCHITECTURE.md`.

## Technical details

New migration (additive only):
- Enums: `coinflip_status` (WAITING, READY, FLIPPING, SETTLEMENT, COMPLETED, CANCELLED), `coin_side`; add `coinflip_entry`, `coinflip_settlement`, `coinflip_refund` to `tx_kind`.
- `coinflip_config` (singleton: min/max wager, fee bps 0, waiting timeout 60, pre-delay 3000 ms, animation 3500 ms, rate limit).
- `coinflip_games`: creator, amount (bigint cents, >0), creator_side, status, fee_bps, pot (CHECK = 2×amount), asset/account_type, protocol_version, draw_version, server_seed_hash, timestamps (expires_at, joined_at, animation_start_at, animation_end_at, completed_at), winner_id, winning_side, payout, server_seed (revealed). Guard trigger enforces legal transitions, immutable commitment/amount/sides, immutable COMPLETED/CANCELLED.
- `coinflip_entries`: unique (game_id,user_id), unique (game_id,side), `slot` CHECK in (1,2) unique per game, ledger_tx_id, idempotency key unique per user; immutable.
- `coinflip_game_secrets` (seed; no client access, immutable) and `coinflip_results` (winner, side, digest first byte; readable via RLS only when game status ≥ FLIPPING; immutable).
- `coinflip_payouts`: PK game_id, kind (WINNER/REFUND), status, attempts, last_error, ledger_tx_id.
- `audit_logs` gains `game_type text default 'jackpot'` (existing rows unaffected) for GAME_CREATED … RECOVERY_FAILED events; seeds never logged.
- RPCs (security definer, `auth.uid()` checks): `coinflip_create(amount, side, idem_key)`, `coinflip_join(game_id, idem_key)`, `coinflip_cancel(game_id)`, `coinflip_tick()`, `coinflip_settle(game_id)` (internal, revoked from clients). Reuse `_post`, `_user_account`, `_system_account`, `_audit`, `has_role`. Shared helper `_fair_digest(seed, message)` added; Jackpot function left untouched.
- Public SELECT on games/entries/payouts; realtime publication for coinflip_games/entries/results. `admin_overview` extended with coinflip counts and escrow reconciliation.

Frontend: `src/lib/coinflip/api.ts` (queries, realtime, server-offset reuse), `src/lib/jackpot/fairness.ts` split into shared core + game derivations, components `CoinflipCreatePanel`, `OpenGamesList`, `CoinflipRoom`, `Coin` (CSS 3D, fixed 3.5 s keyframed easing whose final rotation is chosen from the server result; no randomness), routes `coinflip.tsx`, `coinflip.$gameId.tsx`, with head() metadata. Project memory updated: two games (Jackpot, Coinflip).

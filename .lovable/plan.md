# PVPCasino — Jackpot (first release)

One game, built properly: a live multiplayer jackpot where the server owns every number that matters. Winner takes the pot (house fee exists in config, set to 0%). Wallets are funded with clearly-labelled test credits for now, amounts shown in USD.

## What you'll be able to do

- Sign up with email and password, pick a username and avatar.
- See a wallet with an available balance, an in-game balance, and a full transaction list.
- Join the current jackpot with any amount (quick picks $5 / $10 / $25 / $50 / MAX) and see your live chance before confirming.
- Watch the pot, player list, entry count and countdown update instantly as others join.
- Countdown starts at 60s when the second player joins, each new player adds 10s, never above 180s. Someone topping up their own entry adds no time.
- At zero: entries lock, the wheel spins and slows, and it stops on the winner the server already picked. Celebration with the winner's avatar, exact win chance and payout.
- Browse past games and open any one for the full record: pot, players, every contribution and chance, winner, payout, timestamps, and the fairness data to verify the draw.

## How fairness works

Before a game accepts entries the server generates a secret seed and publishes only its hash. When the game closes, the winning ticket is derived from that seed plus a public nonce, then the seed is revealed with the finished game. Anyone can recompute the result from the published values and check it against the hash. Nothing about the outcome is decided in the browser — the animation only replays a result that is already written down.

## Order of work

1. Backend setup, design system, dark PvP visual identity and branding.
2. Accounts and profiles (email/password now, structured for social logins later).
3. Wallet with an immutable ledger; test-credit top-up behind a swappable funding interface.
4. Jackpot database schema with constraints and indexes.
5. Server-side engine: join, tickets, timer, lock, draw, payout.
6. Realtime game state, countdown driven off server time.
7. Wheel, drawing animation, winner celebration.
8. Game history and detail view.
9. Security pass: access rules, rate limits, audit log.
10. Automated tests for money and game logic.
11. Read-only admin view (active games, volume, payouts, audit trail).

## Technical notes

- Money stored as integer cents. No floating-point in any financial path.
- Entries are one Postgres transaction: row-lock the game, verify state and balance, insert a ledger debit, insert the entry with `ticket_start`/`ticket_end` from the running pot total, update aggregates. Concurrent joins serialize on the game row, so ticket ranges can never overlap or gap.
- Idempotency key on every entry and payout; a repeated request returns the original result instead of acting twice.
- Winner: `crypto`-grade random seed committed as SHA-256 before entries open; winning ticket = HMAC(seed, nonce) mapped into `[0, pot)`; the entry whose range contains it wins. Never `Math.random()`, never client-side.
- Draw and payout are a state machine: `WAITING → ACTIVE → DRAWING → COMPLETED` plus `CANCELLED`, with a separate payout state so a failed payout leaves a recoverable record and an audit row, never a false "paid".
- Timer is authoritative server columns (`countdown_started_at`, `scheduled_end_at`, `max_end_at`); the browser only renders the difference against server time. A scheduled server-side sweep closes and draws games whose deadline passed, so a closed browser changes nothing.
- Row-level security: a user reads only their own wallet and ledger; games, entries and results are readable but never writable from the client; all mutations go through server-side functions.
- Multiple entries per user are supported and each row is kept; the player list aggregates them into total, chance and entry count.
- Tables: `profiles`, `wallets`, `wallet_transactions`, `jackpot_games`, `jackpot_entries`, `jackpot_results`, `audit_logs`, plus `user_roles` for admin.
- Funding, withdrawal and balance sit behind provider interfaces with configuration for supported assets, network and limits, so a real crypto provider drops in without touching the jackpot engine.
- Compliance placeholders wired as configuration only: age gate, KYC/AML hooks, geo restrictions, deposit and wager limits, self-exclusion, terms/privacy/responsible-gambling pages. Nothing claims to be licensed.
- Tests: ticket maths, probability, timer start/extension/cap, multiple and concurrent entries, insufficient balance, duplicate requests, locking, winner selection, payout idempotency, access rules, ledger consistency, plus a full lifecycle integration test.

## Not in this release

No other games. No real crypto movement — the abstraction is real, the provider is not connected. No admin controls that could alter an outcome or a balance silently.

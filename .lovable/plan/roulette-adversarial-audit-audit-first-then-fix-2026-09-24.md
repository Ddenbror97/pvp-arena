# Roulette — Adversarial Audit (audit first, then fix)

Roulette stays TEST CREDITS only. Jackpot and Coinflip rules, balances, wallet and sign-in stay unchanged. Nothing gets called real-money ready.

## Phase A — Attack the live implementation (no changes)
The attacks run against the real database functions, access rules, background job and page. They run in two places: the isolated test copy of the database, and signed-out or signed-in direct calls to the live backend. All attacks behave like an untrusted browser: direct function calls, forged or malformed payloads, replays, simultaneous requests, several accounts and fake clocks.

1. **State machine** — try every illegal move (WAITING→COMPLETED, BETTING→SPINNING/SETTLEMENT/COMPLETED, LOCKED→BETTING/CANCELLED, SPINNING/SETTLEMENT→CANCELLED, COMPLETED→BETTING/SETTLEMENT, CANCELLED→BETTING/COMPLETED) with direct updates and function calls. Confirm the only way to cancel is from BETTING after the database deadline plus the recovery grace period.
2. **Betting window** — bets before the round opens, during betting, at the deadline, 1 ms before and after, and in LOCKED, SPINNING, SETTLEMENT, COMPLETED and CANCELLED. Each is sent as a normal call, a raw HTTP request, a forged payload and a simultaneous burst.
3. **Exact-close race** — 30 simultaneous bets from several players, colours and amounts, landing on the deadline and on deadline + 1 s. Check: no partial bets, no charge without a bet, no bet without its ledger entry, no lost bets, and a result that doesn't change.
4. **Limits** — amounts of $0, negative, $0.01, $0.99, $1.00, $10,000, $10,000.01, very large values, malformed decimals and NaN/Infinity. Also test the 10-bets-per-round cap (11 sequential or simultaneous bets, several sessions) and the pot cap under races.
5. **Multi-bet** — several bets on one colour and on several colours, each settled on its own exactly once.
6. **Payout math** — gross 2x and 14x payouts on $1, $1.01, $1.11, $10, $10.01, $99.99, $100.01, $999.99 and $10,000, rounded down to the cent, with balances adding up after every round.
7. **Wheel math** — 15 slots and the layout on v1, v2 and v3. Wheels can't be changed once used. Each round stores its version and settlement uses that stored version. Check the return-to-player figure against the database numbers.
8. **Provably fair** — 32-byte seed, fingerprint published before betting, seed hidden during betting (access rules and realtime), result fixed at lock, seed revealed only after settlement, and fingerprint matching the seed. The exact HMAC-SHA256(key = seed, message = `PVPCasino:roulette:v1:{round}:{draw_version}:{counter}`) is reproduced by a separate implementation.
9. **Rejection sampling** — lowest and highest accepted values, the rejection boundary, a rejection followed by an accepted value, the redraw limit and the failure path. Check that no colour gets a small built-in advantage.
10. **Extra checks** — reading or writing other players' rows, reading secrets, calling internal functions as signed-out and signed-in users, spamming the round nudge, realtime subscriptions and forged broadcasts, double payouts, payout plus refund on the same bet, and crashed or duplicate background jobs.

Each finding gets a severity, evidence, the attack, whether it can be reproduced, the affected database objects, the fix, the test that proves the fix, and whether it blocks a real-money launch.

## Phase B — Fix only what Phase A proves
- Fixes are narrow database or page changes, applied through reviewed migrations. They don't change the math or odds, and Jackpot and Coinflip aren't touched.
- The failed attack is re-run after each fix to confirm it now fails.

## Phase C — Permanent tests and report
- Add `tests/db/roulette.integration.test.ts` and `tests/roulette-fairness.test.ts` (fixed test examples for every colour, the first and last slot, and redraws). Add Roulette to the hourly balance check tests.
- Connect the existing Roulette checker to the Fairness page as a Roulette tab. This was left open from the build plan.
- Run the full test suite and the code check.
- Write the report to `/mnt/documents/PVPspinArena-roulette-audit.md`. It will include a findings table (before and after), a pass/fail matrix for every attack above, race results, changed files, remaining weaknesses and an explicit "not real-money ready" statement.

## Technical notes
- Tests use the existing `pvp_test` schema builder and the same simultaneous-transaction style as `security.integration.test.ts`.
- Live checks are read-only or signed-out attempts only. No new test accounts are created on the live site (the user tests multi-account flows themselves).

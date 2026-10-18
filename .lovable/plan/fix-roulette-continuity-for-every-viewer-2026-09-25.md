# Fix Roulette continuity for every viewer

## Confirmed issue

The published site reproduced the difference:
- **Signed out:** Roulette remained on “Bets locked” for over 80 seconds.
- **Signed in:** the same page completed several rounds normally.

The database history confirms recent rounds regularly waited about 38–45 seconds after their deadlines. Roulette currently depends on a signed-in browser to advance each phase. Signed-out browsers can only watch, while the independent database check runs once per minute. That is too slow for a game with a 1-second lock and 7-second spin.

## Correction

1. **Make the server the primary clock.** Run the existing safe, idempotent Roulette worker every second so betting, lock, spin, settlement, and the next round advance without any open browser.
2. **Keep browser calls as recovery hints.** Signed-in pages may continue nudging the worker, but game continuity will no longer depend on them. Signed-out visitors will see the same authoritative timeline without receiving write privileges.
3. **Preserve the game rules.** Do not change the wheel, odds, fairness draw, bet limits, payouts, ledger entries, or real-money settings.
4. **Add regression checks.** Verify the schedule, anonymous permissions, concurrent calls, empty rounds, and complete lifecycle with no player session.
5. **Validate both experiences.** Watch multiple published-style rounds signed out and signed in; both must leave “Bets locked” promptly and show the same result timeline.

## Timing and operating trade-off

A one-second schedule runs **86,400 very small checks per day**. That frequency is necessary to honor the existing 1-second lock phase and gives at most about one second of scheduler delay. It can increase Lovable Cloud usage because the database stays active. A five-second schedule would reduce checks to 17,280 per day, but could visibly hold “Bets locked” for up to five seconds, so it does not meet the requested continuous behavior.

## Technical details

- Keep `roulette_tick()` server-authoritative, transaction-safe, rate-gated, and unavailable to anonymous callers.
- Replace the minute schedule for `pvp-roulette-worker` with pg_cron’s supported seconds schedule.
- Add a migration that updates the existing named job without creating duplicate workers.
- Add an automated assertion for the exact schedule so it cannot silently regress to one minute.
- Run the Roulette integration, concurrency, ledger-invariant, and full test suites before completion.

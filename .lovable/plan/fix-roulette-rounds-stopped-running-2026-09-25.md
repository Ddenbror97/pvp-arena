# Fix: Roulette rounds stopped running

## What's actually wrong
Roulette logic wasn't rewritten, but the real-money switch did stop it. The live database shows:
- The last round (#389) was cancelled at 04:20 UTC, and no new round has opened since.
- A new round now only opens if real play is allowed. Real play is **off**, which is on purpose and waiting for your approval. So the wheel just stops instead of cycling.

Before the switch, test-credit play was always open, so rounds kept going forever. That's why it seemed to change with the migration.

## The fix
Keep the wheel running all the time, whether or not real play is on. The real-play switch should only block **bets**, not rounds.

1. **Rounds always cycle.** A new round opens right after the last one ends: betting countdown, lock, spin, result, repeat. No waiting for a first bet.
2. **Bets stay gated.** Placing a bet still checks the real-play switch and your balance on the server. While real play is off, bets are refused with the existing "real money play is disabled" message, and the wheel keeps spinning with empty rounds.
3. **Empty rounds settle cleanly.** A round with no bets completes normally, with no money moving and no ledger entries.
4. **No extra cancellations.** Find out why #389 was cancelled (most likely the stuck-round timeout during the switch) and make sure empty rounds don't pile up as cancelled.
5. **Screen message.** While real play is off, the Roulette page shows a small notice next to the bet buttons ("Real-money play opens soon"), and the wheel and history keep updating.

Unchanged: wheel math, fairness and commit/reveal, payouts, Jackpot, Coinflip, the deposit and withdrawal switches, and watch-only mode. Real play stays **off**.

## Technical details
- Migration: in `_roulette_ensure_open()`, replace `if not _play_domain_open() then return null` with a check that only needs the money domain to be valid (`money_domain_config.account_type = 'real'` and `_money_state() = 'FINALIZED'`, or pre-migration test). This way new rounds are always created in the current money domain and never with frozen test credits.
- `roulette_place_bet` (or its equivalent) keeps `_play_domain_open()`/`_real_play_allowed()` as the hard gate, raising `REAL_MONEY_DISABLED`. Check this in the function body before changing anything.
- Check that `roulette_tick` settles zero-bet rounds to COMPLETED and calls ensure_open afterwards. Look at the audit log for #389's cancel reason.
- Tests: add cases in `tests/db/roulette` for (a) real play off: rounds keep being created, a bet is rejected, and nothing is written to the ledger; (b) an empty round completes and the next round opens; (c) real play on: bets work as before. Run the full suite with `--no-file-parallelism`.
- UI: `src/routes/roulette` disables the bet controls using the account status (real_play_enabled) and shows the notice.
- Security check after the migration. Publish once you approve.

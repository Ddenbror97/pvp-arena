# Free 8-ball Practice

The pool lobby links to `/pool/practice`: a free local rack against a dedicated
bot. No account, deposit or stake is required. No payout, ledger entry, public
cash result or rating is created. The route is noindex and outside the sitemap.

## Reuse and isolation

- Reuses PoolTable, the versioned pool physics, rack generation, placement,
  group assignment, fouls and called-eight rules. Cash pool and its AFK stand-in
  are unchanged. Practice omits the cash shot clock and disconnect forfeits.
- A per-table browser worker plans bot shots and simulates both sides' shots.
  Candidate search never runs on the rendering thread. There is no synchronous
  search fallback; worker errors/timeouts offer a fresh rack.
- Dedicated bot evaluates clear ghost-ball pocket routes, several powers,
  legal ball-in-hand positions, scratches, fouls and one-cushion contact escapes.
  At most 67 candidate simulations are evaluated per ordinary turn. Small aim
  error allows misses; the bot cannot alter physics or directly pocket a ball.
- Visible bot cue, normal shot replay and sounds precede the resulting turn.
  Input is locked until replay completes. New rack and unmount terminate the
  worker, clear timers and invalidate stale asynchronous responses.
- Only the settled table state is saved to tab session storage. Refresh resumes
  that position; an interrupted animation is not saved as a partially moving rack.
  Invalid/incompatible saved states start a fresh rack. No wallet, cash-pool
  action or settlement API is imported by Practice.

## Validation

- 63 targeted pool/SEO checks passed. The bot pots at least 80% of 36 controlled
  clear-shot samples and exceeds the AFK stand-in by at least 20 percentage points
  on those samples. This is a test-layout comparison, not a human win-rate claim.
- Three seeded complete racks finish under the existing shot rules. Separate
  checks cover scratch placement and a legally called eight.
- Browser scenarios exercise guest entry, human/bot handoff and cue animation,
  refresh recovery, restart during bot work, mobile layout and a called-eight
  finish with a free result and Play again.
- About/How It Works, pool FAQs, Terms, Privacy, Responsible Play and llms.txt
  describe the free local mode separately from cash matches.

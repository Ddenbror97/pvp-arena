# Final CLS / moving-object hardening: Jackpot, Coinflip, Roulette

This is a stability pass, not a redesign. Game logic, settlement, fairness, balances and wallet security stay exactly as they are.

## 1. Measure first (before any edits)
I'll write a Playwright harness that records every layout shift, with the elements that moved (via a LayoutShift observer and element geometry snapshots taken every 100ms up to 8s), for `/` (Jackpot), `/coinflip` and `/roulette` under:
- a fresh context with an empty cache and empty storage, run twice (cold start, then refresh)
- desktop widths 1920, 1440, 1280 and 1024, plus mobile at 390 and 320
- no throttling, Fast 3G, and Slow 3G with 4x CPU throttling
- signed out and signed in (using a minted session), with wallet connected and disconnected
- live updates: a bet or chat message arriving while the page is open

Output: a table per page listing each element that moved, grew, appeared late or disappeared, with its size and timing.

## 2. Audit checklist (from your brief)
- Page shell: header, logo, nav, balance/wallet control, auth-resolved buttons, scrollbar gutter, footer.
- Game area: title, board/wheel/coin/strip, countdown, pot, players, result, bet controls, fairness panel.
- Secondary: chat, recent games/rolls, pagination, tabs, tooltips, empty/loading/error states.
- Fonts: fallback-to-webfont swap (size-adjust metric overrides), numeric width (tabular figures).
- Dynamic data: counters and balances that change digit count, and names of varying length.
- Hydration: server vs. client differences, storage read at render, anything that only renders on the client.
- Animations: only transform/opacity; anything that animates width, height, top or margin gets flagged.
- Old or duplicate CLS workarounds that conflict.

## 3. Fix root causes
- Each moving element gets its final size reserved: fixed or min dimensions, aspect-ratio, skeletons at the same size, and `scrollbar-gutter: stable`.
- Late-arriving auth and wallet UI renders into slots that are already the right size.
- Changing numbers use fixed-width figures and reserved minimum widths.
- Duplicate or conflicting reservation logic gets removed.
- No new network requests or added JS weight. Text and cards stay usable at every width.

## 4. Verify and report
- Re-run the full harness and compare before and after for each scenario.
- Acceptance: no visible jump on any page or scenario. Per-scenario CLS stays at or below 0.01, and any shift that remains is listed with its cause.
- Run the existing fast test suite. The build has to stay clean.
- The final report lists what moved, why, what fixed it, before/after numbers, and anything that can't be fixed. It won't just say "CLS is 0".
- Live-site changes still need a publish.

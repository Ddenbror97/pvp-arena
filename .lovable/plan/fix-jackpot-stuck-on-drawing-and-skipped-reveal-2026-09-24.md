# Fix: Jackpot stuck on "Drawing" and skipped reveal

## What the data shows

- Game #1: timer ended 00:17:55.6, drawn and paid 00:18:00.02.
- Game #2: timer ended 00:22:29.6, drawn and paid 00:23:00.02 (about 30 s stuck on "Drawing").
- Both games were settled exactly on the minute. That is the once-a-minute background job. Settlement itself worked correctly both times: one payout, balanced ledger, no errors, no failed attempts.
- So the players' browsers never triggered the draw early. Every draw waited for the background job, which can mean waiting up to 60 s.

## Root cause 1: the browser "draw now" call never gets sent

In `JackpotStage.tsx`, the call that asks the server to draw at 0:00 is written as `void supabase.rpc("jackpot_tick")`. The database client only sends a request once the call is awaited or `.then()` is attached to it. `void` does neither, so no request goes out. The 1.5 s retry loop has the same problem. The server logs show no browser-sent draw requests, which fits this.

## Root cause 2 (likely): the reveal gets skipped after a long wait

The reveal only plays if the live "game completed" update arrives while the page still thinks the completed game is the current one. During a long wait, the page can switch to the next game first, for example by refreshing on tab focus or reconnecting. The next empty game is then already on screen, the "completed" update is ignored, and the animation never plays. This is inferred from the code; I have not reproduced it yet.

## Fix

1. **Send the draw request.** Replace `void supabase.rpc(...)` with a small helper that awaits the call and logs errors, and use it in the 0:00 nudge and its retry loop. The server still checks the deadline itself, so this only makes things faster and changes no draw logic.
2. **Don't lose the reveal.** In `useLiveJackpot`, remember which game the player was watching. If the current game changes to a newer one before that game's reveal plays, fetch the old game once. If it is COMPLETED and finished recently (within about 60 s), show the reveal first, then move on. Also turn off focus-refetch for the open-game query while a game is DRAWING, or while the timer is past zero.
3. **Stuck-state safety net.** If "Drawing" lasts more than 10 s, re-fetch the game directly instead of relying only on live updates. The screen then moves on even if a live update was missed.
4. **Same bug in Coinflip.** Check Coinflip for the same `void supabase.rpc` pattern and fix it the same way.

## Not changed

Settlement, fairness, ledger, timer rules and the background job stay as they are. The server logic behaved correctly.

## Verification

- Search the code to confirm no fire-and-forget database calls are left.
- Type check, then a browser run that checks a draw request is sent when the countdown hits zero.
- You then run a live 2-account round: expect "Drawing" for about 1–2 s, then the full spin and winner reveal. Afterwards I check the game record to confirm the paid-at time is right after the deadline, not on the minute.

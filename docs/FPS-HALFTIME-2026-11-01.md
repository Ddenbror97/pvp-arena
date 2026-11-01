# PvPStrike halftime

New Practice and cash PvP matches keep their starting side until halftime, then
swap Police/Terrorist models and spawn positions exactly once. Identity seats,
scores, winners, player IDs and settlement ownership never swap.

| Format | Halftime after | Second half begins |
| --- | --- | --- |
| Best of 5 | Round 2 | Round 3 |
| Best of 9 | Round 4 | Round 5 |
| Practice, best of 13 | Round 6 | Round 7 |

The existing transparent winner presentation announces halftime for five seconds.
The next round starts automatically. Normal round breaks and win/draw rules are
unchanged. The scoreboard shows each player's actual side. Practice routes mirror
the bot's spawn, so both sides retain its route/style variety.

Both opponent models are loaded and their shaders compiled before entry. The
renderer changes which existing actor it displays and resets animation history;
halftime adds no model download. New commands carry their round number, preventing
late old-round movement/fire from affecting a respawn. Commands without this
optional field remain compatible with cached clients.

`sideVersion: 1` is stored in new match state/checkpoints. Older checkpoints keep
their existing alternating-spawn and fixed-character rules until completion.
There are no database migrations or financial-rule changes. Deploy the website
and FPS worker together after existing matches finish.

## Verification

- Complete best-of-5/9/13 simulation series check one swap, exact break timing,
  checkpoint recovery, preserved scores/IDs/sequences and normal match winners.
- Legacy checkpoint and stale-round movement/trigger tests cover compatibility.
- RoundBreak rendering checks the announcement and absence of an accept button.
- Browser tests for seats A and B inspect the actual rendered opponent model in
  first/second-half rounds and verify that player identity stays unchanged.
- Runtime tests check wrong-round input rejection without consuming the input
  sequence or ammo, alongside existing session revocation and snapshot checks.
- Targeted unit run: 185 passed, one skipped. Both browser model tests passed;
  hosted staging entry passed for Practice and both cash-game seats.
- The full runtime run passed 19/23; two timing assertions and the bot-visibility
  wait passed in an isolated rerun. The remaining reconnect test subscribed after
  the initial waiting snapshot; subscribing before readiness fixed that test and
  its isolated rerun passed. No timing thresholds were loosened.
- TypeScript, changed-file lint and production/staging builds were checked.

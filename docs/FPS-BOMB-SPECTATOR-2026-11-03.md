# Bomb Defusal spectator POV and best-of-13 — 2026-11-03

## Behavior

Bomb Defusal ends when one team wins seven rounds (at most thirteen). Halftime follows the sixth completed round and swaps Police/Terrorist sides while retaining each team's score. A 6–6 match continues to round thirteen. The HUD, scoreboard and lobby describe the same rules.

Dead players spectate living teammates through the existing interpolated movement timeline. A separate, allowlisted `pov` snapshot field supplies that teammate's weapon, ammunition, recoil, scope, reload, grenade and equipment presentation. `self` remains the recipient's own state, so spectating never grants control of the teammate. Enemy visibility continues to use server-filtered snapshots and the validated teammate's eyes.

Shot effects and centered shot/reload sounds follow the spectator playback clock. Target changes clear transient presentation state. The HUD shows the watched teammate's health, armor, equipment and ammunition. Plant/defuse hands use the watched slot and the delayed objective clock. First-person views reuse the existing preloaded models.

The weapon group's zero-intensity light stays present during C4 handling, avoiding new light-count shader variants when the rifle is hidden.

## Validation

- Rule tests cover halftime, a 7–0 sweep and a 7–6 deciding round.
- Snapshot/playback tests cover allowlisted teammate state, identity/damage-ledger exclusion, nested-state isolation, invalid/enemy targets, no living targets, respawn, target changes, timed shots and grenade handling.
- Focused snapshot, HUD, scoreboard, match and spectator tests: 40 passing.
- Durable Object runtime, C4 and grenade presentation tests: 20 passing.
- Native Chrome/D3D11 renderer harness: `node scripts/fps/bomb-harness/spectator.mjs`. `CHROME_PATH` can select the installed Chrome executable. Uses the actual models and renderer with an in-page simulation; plant/defuse presentation also uses controlled public snapshot fixtures. Outputs screenshots and results under ignored `.wrangler/spectator-review/`.
- Typecheck and configured production build pass. No database migration.

## Release

Deploy the production-generated FPS Worker configuration before the configured app build. The additional optional snapshot field is backward compatible with cached clients. Best-of-13 is guaranteed for newly started matches; matches already beyond the old halftime boundary are not restarted or forcibly migrated.

# Bomb Defusal bot tactics, visibility and controls — 2026-11-03

## Changes

- Snapshot reveal checks the rendered silhouette, including boots, shoulders and the weapon tip. The older nine-point perception test could hide a crouched operator whose lower legs remained exposed below cover. The bots' own perception remains unchanged, and walls/smoke still occlude every reveal ray. Existing reveal hold and enemy-data redaction are retained.
- Defenders receive shuffled angle assignments each round and change unpressured holds after a bounded interval. Push, support and slow/lurk styles choose different approaches. Crouching is limited to defusing and short combat holds rather than permanent idle crouching.
- Bots can throw smoke for an approach/retake and HE/incendiary at visible opponents. They use ordinary input, inventory, equip/prime/release and server physics. A bounded trajectory check rejects poor landings and throws close to teammates. Utility checks and route recalculations are staggered.
- The shared wheel order is rifle → knife → HE → smoke → incendiary, reversing when scrolling up and skipping empty grenade inventory. `5` cycles grenades; `4` remains supported. Armed throws remain locked against switching. This applies to 1v1 and Bomb Defusal.
- Bomb Defusal no longer releases mouse capture on match completion. Capture persists through the scoreboard and room change. Escape opens settings; explicit buy-menu use and browser focus/security behavior still apply.
- Removed the requested explanatory paragraphs from both Practice lobby cards.
- Dead spectators now get their watched teammate's plant/defuse progress. Defusing bots face and look down at the planted device so its world-positioned hands remain in view. The renderer harness now uses actual objective inputs and normal filtered snapshots instead of synthetic plant/defuse presentation fixtures.

## Validation

- Deterministic full bot match: ten rounds, six plants, 78 kills, seven smoke throws, ten HE throws and nine incendiaries in the checked run; no timeout-only rounds. Different random seeds produce different openings. A separate test verifies a defuser looks down and holds use without walking.
- Full-room benchmark with ten serialized recipient snapshots: 4,500 ticks; p99 total tick 2.991 ms (9% of the 33.33 ms budget), maximum 9.17 ms on this workstation. This is a local CPU measurement, not a regional latency or player-device FPS guarantee.
- Native Chrome: Bomb Defusal `5`/wheel selection in both directions, watched weapons and scope, and real simulated Police defuse/Terrorist plant. No new shader compilation during the checked POV transitions.
- Native Chrome 1v1 fixture: `5`, wheel selection in both directions, Karambit selection and retained real pointer capture, with no page errors.
- Focused rules, bots, visibility, snapshot, objective/HUD, spectator and grenade tests; Durable Object runtime tests; typecheck, targeted lint and configured production build.

## Release

Deploy the production-generated FPS Worker configuration first, followed by the configured app. No database migration, wallet or economy changes. Cached clients can continue using key 4 and the existing input protocol.

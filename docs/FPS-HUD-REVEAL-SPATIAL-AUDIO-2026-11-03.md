# Bomb HUD, standing, reveal continuity and spatial audio — 2026-11-03

## Player-facing changes

Sound and fullscreen controls move from the Bomb Defusal HUD to the Escape settings menu. Grenade slots use transparent backgrounds in both modes and show key 5 (key 4 remains supported). The selected grenade still rises and has an accessible selected label.

Living, grounded operators release crouching when the round ends, including after a successful defuse. Clearance is checked before expanding the standing hull, so this does not force anyone into a ceiling or alter jump physics. Planting during a live round continues to honor the player's crouch input.

## Remaining disappearance investigation

5v5 already shares authored operators, collision, movement, interpolation and model warmup. Two differences remained: its snapshot reveal did not include the same latency-aware nearby viewpoints as the 1v1 core, and its frustum/tag pass used the previous frame's camera.

Both modes now call `revealsBody` for the same silhouette/peek logic. Bomb Defusal supplies measured connection lookback and bounded viewer velocity; the reveal hold and wall/smoke checks remain. Bot aiming perception stays separate. The underlying allocation-free sight-segment test is shared too, avoiding a full nearest-hit trace for every visibility ray. The superseded Bomb-only silhouette helper is removed.

The renderer samples remote poses once, updates the current camera, and only then tests actor bounds and projects name tags. Spectator camera placement uses those same sampled poses.

## Sound in 1v1 and Bomb Defusal

A shared hearing model distinguishes AWP, AK and suppressed M4 reports, with continuous distance attenuation and high-frequency rolloff. Walls apply separate attenuation and filtering. Local trigger feedback stays immediate, with the existing recordings and mute/volume controls.

Remote 1v1 shot voices now carry audible world bearings into the existing listener-following panner, rather than staying at one pan for the whole sound. Hidden-enemy Bomb sounds retain coarse direction/distance, occlusion and footstep material/quiet-step metadata without sending source coordinates. Friendly/visible sounds use the same hearing curve. Bomb footsteps join the existing displayed-pose scheduling and stale-backlog rejection.

## Validation

- Standing regressions cover normal and kit defuses, using physically clear positions in reach of the bomb.
- Visibility tests cover the core peek/reveal contract, exposed crouched silhouettes, wall redaction and the optimized segment test against 40,000 reference pairs.
- Shared sound tests cover distance/filter monotonicity, listener-relative left/right, weapon hearing ranges, and privacy/material retention for hidden footsteps.
- `node scripts/fps/audio-spatial-check.mjs`: Chromium and Firefox actual Web Audio checks passed. At the checked near/far inputs, report filter cutoffs were approximately 16.3 kHz / 4.0 kHz and voice gains 0.384 / 0.043. Both modes' panning and playback-aligned footstep checks passed without page errors.
- `node scripts/fps/bomb-harness/spectator.mjs`: real renderer, weapons and simulated plant/defuse checks passed; no new shader compilations in the checked transitions.
- Ten-recipient local CPU benchmark, 4,500 ticks: p99 full tick 6.384 ms, maximum 21.407 ms against the 33.33 ms tick budget. This measures CPU locally, not regional ping or every player's FPS.
- Typecheck, targeted lint (one inherited Fast Refresh warning), configured production build and Worker runtime tests.

## Release

Deploy the generated production FPS Worker configuration first, then the configured website. Output audio fields are additive and old clients remain compatible. No database, wallet, economy or 1v1 match-rule changes.

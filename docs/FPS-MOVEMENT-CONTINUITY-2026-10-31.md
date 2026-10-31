# Movement continuity — 2026-10-31

The remaining jerk was in camera position presentation rather than the WebGL draw budget. `FrameMotion` snapped to its target whenever its horizontal error exceeded 15 cm. Changing direction can differ by one 34 ms command tick, crossing that threshold during otherwise normal movement. The jitter fixture recorded a 20 cm correction in a 13.9 ms frame while renderer CPU was about 2 ms.

Presentation now integrates controls immediately and corrects small position differences continuously, capped at 2 m/s per horizontal axis with a 65 ms decay. Large teleports and respawns remain explicit resets. Mouse yaw is not filtered. The camera uses the existing collision occupancy, sliding correction axes separately along cover.

An initial normalized-vector correction revealed another corner case: the blocked axis consumed the error budget, starving the clearance axis. The camera could remain on the wrong side of a crate and eventually teleport. Independent bounded axes remove that starvation. A deterministic crate-corner regression checks clearance, collision safety and per-frame displacement.

The server's physics, inputs, damage, hitboxes, tick cadence and ledger are unchanged. Renderer diagnostics expose pending commands, predicted pose and correction values only when requested; no per-frame diagnostic logging or additional rendering allocations were introduced.

Validation:

- The 100–135 ms ordered snapshot-jitter direction-change trace passes in Chrome and Firefox. Final observed peak movement was approximately 7.1 m/s rather than the earlier correction spike; this is a local controlled test, not a regional network measurement.
- Both browsers complete six gameplay rounds with controls, damage, reload and respawn checks: four browser tests pass in 3.2 minutes. Earlier jump/crouch and walking checks also pass.
- Fourteen focused presentation tests pass. The full unit run passes 736/737 tests, with the unrelated poker randomness loop hitting its 15-second timeout under parallel load. Its complete eight-test file passes in 3.25 seconds when rerun alone. No timeout or game behavior was changed for it.
- TypeScript and targeted lint pass.

This frontend-only release preserves the current match runtime and all database/cash settings. Cross-region network measurement and lag compensation are a separate follow-up for the US, Europe and South America.

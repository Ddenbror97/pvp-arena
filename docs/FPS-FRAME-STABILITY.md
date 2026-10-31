# PvPStrike frame stability

The second stability pass keeps the existing Three.js renderer and authoritative
runtime. The changes target work repeated during normal gameplay:

- Render the first-person weapon in a separate scene, with the same dedicated
  lighting, environment and camera projection. The weapon pass no longer walks
  the arena, opponent rigs and world lights a second time.
- Preserve shared materials within each authored model instance. Different
  players still own separate material instances and can use different uniforms.
- Cull an opponent's whole presentation rig outside a conservative camera
  frustum. This does not change server visibility, collision volumes or damage.
- Compose the rig before IK, then refresh changed bone subtrees instead of
  repeatedly recomputing every ancestor's world matrix.
- Reuse remote-pose slots, motion scratch state and cached badge references;
  avoid rebuilding combat-volume objects solely to obtain an eye height.
- Stop idle blood/dust/spark uploads and transparent particle draws. Pools remain
  bounded, and confirmed impacts still control emission.
- Prepare world and weapon shaders before the Ready state using Three.js
  `compileAsync`, including hidden combat effects.
- Preserve physically held movement keys across respawn, while resetting fire,
  reload and jump. Mouse release, blur and authorization suspension still clear
  input. Let the pelvis settle during a stride so a planted leg can reach its
  target without floating.

## Reproduce the checks

Start `node --env-file=.env.fps-staging scripts/fps/serve-fixtures.mjs` on port
4173. The fixture uses the real renderer and shared simulation; its synthetic
state and test-only routes are not included in production. Restart the fixture
server after source changes because its Vite watcher is disabled.

Run the frame-pacing, culling, round-input, six-round, walking, character, grip,
pointer-lock and blood-wall Playwright specs. Use a unique `--output` directory;
Playwright clears its selected output directory before each run. The pacing
spec exercises normal CPU speed, 4x CPU throttling and delayed snapshots.
The lifecycle spec repeatedly mounts and disposes the arena within one page,
checking GPU resource release, listener cleanup and garbage-collected heap.

For the sustained test, set `FPS_SOAK_MINUTES=30` and run
`tests/e2e/fps-soak.spec.ts` by itself. Other browser tests can compete for OS
pointer capture and invalidate the run. Keep a real captured mouse throughout;
the test asserts this rather than silently accepting idle frames. It moves,
fires, reloads, changes weapons and remounts the arena every five minutes.

The soak writes bounded frame-time histograms, optional asynchronous WebGL GPU
timings, actual canvas GPU identity, renderer geometry/texture/program counts,
heap usage, DOM/listener counts and context-loss events to its output directory.
It records progress approximately every 30 seconds and writes a final result
only after the requested duration. Fixture-only input/event logs are bounded.
GPU queries are test instrumentation, not a production per-frame polling cost.
Their scope starts at the first actual draw and ends after that frame's render
passes; starting at the previous animation callback would include idle time.

Treat renderer resource counts as leak indicators, not a measurement of total
GPU VRAM. CPU throttling models a CPU constraint; it does not emulate every
older computer or another GPU. Separate warmup, concurrent build activity and
steady gameplay when interpreting percentiles. A local fixture does not certify
regional network latency or server capacity.

## Release boundaries

This is an app-only release. No database migration, match-worker restart,
authorization lease, tick-rate change, hitbox change, payout-setting change or
cash toggle is required. Validate hosted staging gameplay and its synthetic
ledger settlement before production. Preserve current app bindings, secrets,
routes and cron configuration. After deployment, run a private zero-stake match
and verify that the QA accounts generated no financial postings.

Three.js shader preparation API:
https://threejs.org/docs/pages/WebGLRenderer.html#compileAsync

WebGL GPU timing specification:
https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/

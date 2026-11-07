# Battle Royale startup ordering — 2026-11-07

## Root cause

`BrMatch` started the lobby admission/socket effect independently of its dynamic arena import and asset readiness. An early snapshot was sent to `arena.current?.snapshot`, so it could be discarded before the arena existed, or its loot/door baselines consumed before their renderers existed. The Worker sends the route only once per connection; its seat sync also sends initial loot and door state as baselines, then deltas. Losing that first delivery can leave a loaded renderer without the route required by its frame loop and therefore without a first HUD frame. The standalone GPU/simulation harness constructed the arena before connecting, so it did not exercise this component lifecycle race.

## Fix

Admission now starts only after the arena and its awaited assets are ready. A fresh load resets ready/HUD/error/progress, and callbacks from disposed loads are ignored. The first HUD clears a 30-second connection startup deadline; a silent or unusable first connection becomes a visible retry/reload error rather than an endless loading screen. The deadline is cancelled on cleanup and cannot fail a successfully entered match. The displayed percentage stays below 100 while startup is incomplete; entry remains automatic.

No snapshot protocol, Worker, database, access-control or movement changes. Existing reconnect seat behavior is retained. App-only deployment.

## Regression validation

`tests/e2e/br-startup.spec.ts` mounts the actual React BrMatch/loading screen in Chrome with isolated admission, transport, GPU-arena and HUD-overlay fixtures. The transport sends route/loot/door baselines once, then route-less deltas. Delayed assets prevent admission until their renderer can consume the initial state; the screen then disappears automatically and all three baselines are consumed. Advancing time past 30 seconds after entry produces no false timeout. Separate tests cover silent socket startup and asset failure.

All three integration checks pass. Running the delayed-assets check against the previous BrMatch source fails because admission occurs before assets are ready. Optional `BR_STARTUP_SOURCE` selects a local source copy to repeat that comparison; it is used by the test bundler only. Public/admin route-gate unit tests remain part of release validation.

# PvPStrike motion and rendering release — 2026-10-30

Deployed after [PR #8](https://github.com/Ddenbror97/pvp-arena/pull/8), merge a69ae8425b2f23ae7a4890760d2fbbbdfd1a578f. Final verification: 30 October 2026 at 19:46:59 GMT-3 (America/Sao_Paulo).

## Findings and changes

The renderer could produce adequate FPS while walking still looked unstable: the local camera displayed only fixed 30 Hz prediction steps. In the baseline walking sample, 56.17% of rendered frames repeated the previous position. Each authoritative snapshot also replaced the predicted pose directly. Finally, the throttled planar floor reflector reused a stale camera projection between captures, making the surface appear to swim during movement or mouse look.

The camera now previews the unsent fraction of each movement tick using the same collision function, without changing authoritative physics or sending extra commands. Mouse rotation stays local and immediate. Small reconciliation errors decay over 65 ms; corrections beyond half a metre and round/session resets snap instead of dragging the camera through cover. Visible opponents interpolate actual received poses over one snapshot interval; hidden history is cleared and positions are never extrapolated.

The floor retains PBR/environment lighting without the extra planar scene pass. Static 1024px arena shadows are cached; moving opponents receive inexpensive contact shadows. Static environment transforms are composed once. A 1.5-million-pixel framebuffer budget and a maximum initial 1.25 device-pixel ratio bound high-DPI rendering; sustained slow frames lower scale, with hysteresis for recovery. Even sustained frames over 100 ms trigger adaptation. Weapon muzzle/grip anchors and animated node lookups are cached instead of repeatedly traversing the authored model.

Idle React HUD work is reduced, important health/ammo/phase changes remain immediate, and the view-query poll stops once players are paired. Movement already uses WebSockets and a Cloudflare Durable Object, not database coordinate writes or Supabase Realtime. Server-owned authentication checks, physics, damage, hit volumes, recoil, protocol and settlement were not changed. Fresh database session checks deliberately remain in the runtime authorization path.

An experimental static geometry merge reduced draw calls further but worsened measured frame times. It was removed: per-object culling gave better results here. This follows the measured behavior rather than optimizing draw-call count in isolation. Relevant primary references: [Three.js object optimization](https://threejs.org/manual/pages/optimize-lots-of-objects.html), [Three.js resolution guidance](https://threejs.org/manual/pages/responsive.html), and [prediction/reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html).

## Validation

- 77 unit files / 694 tests passed. The final severe-stall policy also passed its six presentation regression tests. Typecheck, lint, production build and private-value/bundle scans passed.
- Normal, 4x CPU-throttled, and ordered 100–135 ms delayed-snapshot walking tests all recorded zero repeated-position frames. Real mouse-look and confirmed wall-splatter checks passed. The wall fixture now waits for pointer lock and the reset camera/input orientation before firing.
- In the retained local configuration, draw calls were about 141 rather than the baseline 273; triangles fell from about 408k to 233k. Normal p95 frame intervals measured 14 ms; the 4x CPU-throttled run measured 27.9 ms p95. These bounded runs have different scheduling/compilation conditions and do not establish a universal FPS guarantee.
- Six actual bot rounds passed 5–1 during the investigation, covering movement, damage, crouch, jumping, reload, head hits and respawn. Final hosted staging passed all five browser checks, including paid BO5/reconnect and exact-once synthetic ledger settlement.
- Production private zero-stake BO5 passed 3–0, including walking, shooting, damage and reconnect. All seven audio samples loaded; confirmed shot/step/hit events arrived. No browser page errors, payout, fees, QA funding or ledger transactions.
- Production active-frame sample: 2956 frames, median 13.9 ms, p95 20.8 ms, p99 21.0 ms. Median pacing is about 72 Hz; this does not mean a 60 FPS minimum on every frame or every machine.
- Production server tick observation: 29.36 ticks/sec versus the integer-34ms target of 29.41. Server-stamped snapshot gap p95 was 72 ms. This is snapshot cadence, not internet round-trip latency. Tick starvation was not observed in this two-player run.
- Chrome GPU inspection reported hardware WebGL/compositing enabled and an Intel UHD default ANGLE D3D11 renderer; NVIDIA RTX 2050 was also enumerated. No browser or operating-system settings were changed. This probe does not certify every player's GPU configuration.
- Four production lobby/navigation/loading/CLS checks passed after deployment.

## Production state

Only the app worker was deployed: 6f64270b-d09a-4e21-bb0b-52237fe92c0d. The combat runtime remains 5bf6c3d8-8402-4871-88b0-fe28d277a6eb, so active room objects were not restarted. App rollback 8797e14b-140a-498c-8a42-841aa120f9c2 remains available.

All 32 app secrets, both existing runtime secrets, public variables, routes, minute scheduler and existing room namespace were preserved. Cash, stakes, fee and practice configuration match the pre-release snapshot. Financial fingerprints are unchanged and all money invariant booleans pass. Schema migrations remain at 299, latest 20261030195714. Both QA users are disabled, sessions revoked, with zero nonzero wallet balances, ledger transactions or active rooms.

Observed tails: app 47 events and runtime 78 events; zero exceptions, HTTP 5xx or console errors in either. Browser-disconnect canceled outcomes were present. This is a bounded observation, not a new regional concurrency or long-duration soak certification. Initial unrestricted Vitest invocation also selected database integration tests without their required isolated TEST_DATABASE_URL; those refused to run. The correctly scoped complete unit project passed. No schema change required a new database migration rehearsal.

Players should refresh before their next match to load the new renderer. Raw operator traces and diagnostics remain in ignored test-results/pacing-* files.

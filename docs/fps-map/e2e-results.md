# Browser test results: aim arena (headless Chrome, SwiftShader, 2 CPU cores)

SwiftShader renders roughly one frame every 3–6 s. Interactive specs whose default 5 s polls
assume a real GPU therefore time out here. Where a failure could have been the map's fault,
it was compared against `main` (the Foundry map) in the same environment.

| Spec | Result | Notes |
|---|---|---|
| `fps-surface-depth` (rewritten for the GLB) | **pass** | The shipped GLB has 0 coplanar same-facing overlaps, and every collision-face probe at 1 m hits rendered geometry within 6.5 cm. |
| `fps-cover`: renders from both spawns, no WebGL errors | **pass** | Screenshots: `img/ingame.jpg` |
| `fps-cover`: authoritative impacts on concrete, metal, wood and ground | **pass** | Poses moved to the new map; poll timeout raised to 30 s for software GL. |
| `fps-cover`: Ctrl crouch | **pass** | Poll timeout raised to 30 s; it also fails on `main` here with the 5 s default. |
| `fps-cover`: frame timing p95 < 100 ms | fail (environment) | Needs a real GPU. It fails the same way on `main`. |
| `fps-authored-assets` | **pass** | |
| `fps-culling` | pass with 60 s polls | With the default 5 s polls it times out under SwiftShader. Positions are valid in the new map. |
| `fps-map-baseline` (perf sequence) | **pass** | `after-aim-arena-chrome.json` |
| `fps-map-views` (visual capture) | **pass** | `img/final-views-*.jpg` |
| `fps-lifecycle` | fail (**pre-existing**) | After dispose, 7 textures stay in the renderer. `main` leaves the same 7 textures (plus 1 geometry). With the arena GLB blocked the leak is identical, so it is not the map. The map itself returns all geometry (0 left, versus 1 on `main`). |
| `fps-six-rounds` | adapted, not run to completion | The test drove the old map (strafe to x > 9.25). It now walks the aim-arena main lane with real mouse turns and W, and the test bot mirrors it. In node simulation both seats reach the 6 m duel corner on both sides with mutual sight. At 3–6 s per frame a six-round run would take hours here, so run it on a real GPU. |
| `fps-loading` | not runnable | Needs the production preview server on :4180. |
| `fps-practice-staging`, `fps-soak` | skipped by design | They need the staging or soak environment flags. |
| Firefox | not runnable | This environment cannot download a Playwright Firefox build (egress blocked). |

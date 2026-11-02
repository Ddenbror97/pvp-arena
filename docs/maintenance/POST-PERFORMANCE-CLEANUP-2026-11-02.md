# Post-performance cleanup (2026-11-02)

Branch `post-performance-cleanup`, from main `fe32f22` (which carries all the approved FPS
performance work: LOST TRAIL fixes and passes 1–2, the render audit, the single render
configuration with adaptive-resolution hysteresis, the GPU benchmark). Not merged.

Method: knip (unused files, exports, dependencies) over every entry point (routes, server,
workers, scripts, tests, configs), then a whole-word grep per flagged symbol across `src`,
`workers`, `tests`, `scripts` and `supabase` so that dynamic imports, SQL and test-only use
were counted; depcheck-style lockfile analysis for dependencies; manual review of the
rendering, gameplay and resource-lifecycle code. Every removal was followed by the type
check, lint and the unit suite. Anything uncertain was kept and is listed under "preserved".

## What changed (actual improvements)

### 1. Files inspected

2,716 tracked files; 1,770 under `src/`; 2,293 TypeScript/TSX/MJS/Python source files outside
`node_modules` and build output. All `.ts`/`.tsx` under `src`, `workers`, `tests` and `scripts`
went through the unused-export scan; the FPS renderer, presentation, environments, settings,
`DuelMatch` and `GameSettings` were read in full.

### 2. Files removed

- `src/lib/wallet/providers.ts` (67 lines): interfaces for external value providers; the file
  itself says no provider is connected, and nothing imported it.
- Locally: nine `tests/e2e/zz-*.spec.ts` probe specs left by earlier sessions. They were never
  tracked (excluded through `.git/info/exclude`), so this is a working-tree cleanup only.

### 3. Dead functions, constants and components removed (57 symbols, 512 lines net)

Each had no reference anywhere but its own declaration.

- FPS: `ARENA_MAP_URL`, `listMaps`, `WEAPON_ROTATION`, `MAG_ROTATION`.
- Crypto rails and BTCPay: `inferHeldAsset`, `balanceTriggerLabel`, `formatDepositUnits`,
  `depositTodayCents`, `listHeaderRails`, `listFundingRows`, `fundingFacts`,
  `readWalletTotalSats`, `uncoveredLiabilityCents`, `liabilityKeepSats`, `autoTopUpCents`,
  `BTC_WITHDRAWAL_APPROVAL`, `depositAssetEnabled`, `BONUS_NOT_WITHDRAWABLE_SHORT`,
  `btcRequestNotice`, `evmRequestNotice`, `TRACE_CALL_CU`, `countActions`, and the
  job-budget timing constants (`CALLER_TIMEOUT_MS`, `SWEEP_SAFETY_MARGIN_MS`,
  `SWEEP_WORK_BUDGET_MS`, `MAX_INFLIGHT_RECONCILE_PER_RUN`, `sweepDeadline`,
  `separateJobOutcome`; the timing is enforced by pg_net and the SQL dispatcher, and the
  comment describing that contract stays).
- Poker: `nextButton`, `timeoutAction`, `boardCount`, `shownHand`, `potTotal`, `botPosition`,
  `cardCode`, `dealerFrameIds`, `POKER_PROTOCOL`.
- Prestige: `oneIn`, `averagePayout`, `oddsTotal`, `xpFromWagerCents`, `levelForXp`.
- Jackpot, slott, roulette: `peekOpenGame`, `fetchOpenGame`, `recentGamesQuery`,
  `fetchLiveSlots`, `slotCancel`, `winningCells`, `COLORS`.
- Other: guide `pillarOf`, `groupsFor`; `CRYPTO` config block; `OTP_TTL_MINUTES`;
  `CAMPAIGN_TIMEZONES`; `GAME_SIGNUP_MODAL_MS`.

No component was dead: every React component is reachable from a route.

### 4. Old rendering logic

None left to remove: the High/Low graphics system was removed on the previous branch. Verified
again here (searched `graphics`, `GraphicsQuality`, `setGraphicsQuality`, `setQuality`,
`applyQuality`, `backgroundBatches`, `RENDER_CAPS`, `LOW_KEEP`, `"low"` across `src`, `tests`,
`scripts` and the LOST TRAIL build): the only matches are unrelated poker stakes, chat
moderation severities and an SEO fetch-priority type.

### 5. Dependencies

- Removed: none (see "preserved" for `@tanstack/router-plugin`).
- Declared: `esbuild`, `playwright-core` and `ws` as devDependencies, pinned to the versions
  already in the lockfile. Unit tests (`fps-runtime`, `fps-map-runtime`), the map and
  viewmodel captures, the GPU benchmark build and the hosted-verification scripts import them
  directly but only had them transitively (through wrangler, playwright and viem); a
  transitive dependency can disappear on an unrelated upgrade. Nothing was installed or
  upgraded; the lockfile change is the three root entries.
- Count: 31 dependencies / 25 devDependencies → 31 / 28.

### 6. Duplicate logic consolidated

None. The candidates found (seven local one-line `clamp`/`wrap` helpers in unrelated modules)
are smaller than a shared import would be; consolidating them would add an abstraction for no
gain.

### 7. Memory and resource management

Audited; no change needed. See "Findings that needed no change".

### 8. Security and production findings

- No secrets in the frontend. `src/lib/worker-env.ts` lists binding _names_ only and is
  server-side (imports `node:fs`).
- Dev-only routes (`/poker/replay`, `/poker/dealer`) return `notFound()` outside
  `import.meta.env.DEV`.
- Console output: one structured `console.log` in the server-side ops log; everything else is
  `console.warn`/`console.error` on genuine failures. No `debugger`, no TODO/FIXME markers.
- `eslint .` was taking over 30 minutes because it walked `.wrangler/` (3 MB of Vite
  pre-bundled dependencies) and the 0.5 MB generated guide catalog through typescript-eslint
  and prettier. Those and the other build outputs are now ignored; a full lint takes under a
  minute. No rules changed.

### 9. Dependency count

31 / 25 → 31 / 28 (three declared, none removed).

### 10. Build size

Identical to the byte, as expected: dead exports were already tree-shaken.

|                  | Before       | After        |
| ---------------- | ------------ | ------------ |
| `.output/public` | 54,720,911 B | 54,720,968 B |
| Client JS total  | 3,717,396 B  | 3,717,339 B  |
| `renderer-*.js`  | 820,335 B    | 820,278 B    |
| `index-*.js`     | 538,938 B    | 538,938 B    |

(57 bytes of difference are hashed asset names.)

### 11. Build time

`vite build` on this container: 29.6 s before, 21.3 s after. The difference is cache state
between consecutive builds, not the cleanup; treat the two as equal.

### 12. Test results

- Unit suite (`vitest --project unit`): 124 files, 1,187 passed, 1 skipped. One timing test
  (`fps-runtime` › strict session gate latency with 72 ms session reads) failed once while the
  e2e specs and captures ran on the same CPU; alone it passes (25/25).
- TypeScript: clean. ESLint on every file this branch touches: clean (see debt for the
  pre-existing repo-wide prettier errors).
- Production build: succeeds.
- e2e: `fps-settings` (settings UI, persistence) pass; `fps-combat` (combat audio, reload
  audio timeline, blood pools reset each round) 3/3 pass; `fps-cover` 3/4 pass: the fourth,
  "records local arena frame timing without stalls", asserts a p95 frame under 100 ms,
  which the software renderer of this container cannot meet on any branch (it measured
  8.1 s); it is a real-hardware assertion, and the real-hardware run in §13 is the
  equivalent check; `fps-lifecycle` (repeated arena mounts release resources and listeners) passed
  on the previous branch, from which no runtime code changed here beyond the dead-export
  removals.
- Map layout, reachability, first contact, collision, hit detection and match lifecycle are
  in the unit suite (`fps-*-layout`, `fps-jump-cover`, `fps-combat`, `fps-simulation`,
  `fps-knife`, `fps-remote-sync`, `fps-runtime`): all pass.
- `tests/db/*` need `TEST_DATABASE_URL` and fail identically on main without it.

### 13. Performance regression comparison

Static captures (software renderer, same views as the audit baseline, `scripts/fps/map-capture`):
draw calls, triangles, GPU geometries, textures and shader programs are **identical** on all
four maps to the last baseline (Dustfront 55/54/54 calls, 26.4 k triangles; FROSTLINE 67,
57.6 k; CROSSFIRE 62/61/63, 52.5 k; LOST TRAIL 160/161/152, 257.7 k; programs 22/29/30/26).
Frame times are not comparable from this run (the unit suite ran concurrently).

Four-map lifecycle (`--lifecycle=dustfront,frostline,crossfire,lost-trail --cycles=2`): 0 leaks,
heap flat (9.0 / 11.0 / 11.6 / 15.5 MB), GPU resources back to baseline after every dispose.

Real GPU, owner's MSI laptop (NVIDIA RTX 2050, 1920×1080, 144 Hz), the benchmark page rebuilt
from this branch, three cycles, every sample visible and focused:

| Map        | Avg FPS | 1% low      | 0.1% low    | GPU p95    | CPU p95    | Draws   | Triangles |
| ---------- | ------- | ----------- | ----------- | ---------- | ---------- | ------- | --------- |
| Dustfront  | 144     | 139.1–139.4 | 131.6–136.4 | 1.3 ms     | 1.5–1.6 ms | 83–87   | 152–161 k |
| FROSTLINE  | 144     | 137.4–139.4 | 126.6–138.9 | 1.3–1.4 ms | 1.6–2.0 ms | 97–103  | 185–194 k |
| CROSSFIRE  | 144     | 139.0–139.7 | 132.7–137.0 | 1.3 ms     | 1.7 ms     | 98–100  | 179–189 k |
| LOST TRAIL | 144     | 139.7–140.0 | 135.1–136.4 | 1.5–1.8 ms | 2.1–2.2 ms | 184–191 | 383–391 k |

The same as the pre-cleanup validation run (144 fps on every map, 1% lows 138–140, GPU
1.3–1.6 ms). The first Dustfront sample of the session had a 30 fps 0.1% low from shader
warm-up seconds after the first load; cycles 2 and 3 do not show it.

## Findings that needed no change

Rendering (`renderer.ts`, `presentation.ts`, `arena-environment.ts`, `lost-trail-environment.ts`,
`DuelMatch.tsx`, `GameSettings.tsx`, `settings.ts`):

- One render configuration: `RENDER_CAP` and `RenderBudget` are the only resolution logic;
  `setPixelRatio` is called from `resize()` alone. FROSTLINE's snowfall has its own
  self-halving when frames run slow (sprite count, not resolution); it is independent of the
  budget and cannot conflict with it.
- Reflections are captured twice per mount by design: once over the blockout at mount, so
  materials compile with an environment map from the first frame, and once after the authored
  map replaces it, before Ready. Dropping the first would make three.js recompile every
  material when the environment appears. The shadow map is rendered once after load and once
  more only if a map's scenery changes.
- Frozen matrices (`matrixWorldAutoUpdate = false` on both scenes, `matrixAutoUpdate = false`
  on every authored mesh), per-section frustum culling and the `compileAsync` of both scenes
  before `authoredModels = "ready"` are intact.
- The frame loop allocates nothing per frame beyond two tiny arrays (`Object.values` of two
  knife views; a rest-pose spread only while the knife is out) and traverses no scene graph.
- `DuelMatch` sends snapshots straight to the renderer; `setFrame` runs at most every 250 ms
  unless something important changed; `setConnection("Connected")` on every snapshot is a
  no-op re-render (same string). A 100 ms `setNow` interval runs only outside live play (lobby
  and countdown).

Gameplay (`simulation.ts`, `collision.ts`, `visibility.ts`, `practice-bot.ts`, workers):

- Movement, shooting, hit detection and visibility are linear scans over a map's solids
  (0.19–0.42 ms per tick; 1% of a core). No duplicated calculations found; the client
  prediction, server step and bot all call the same functions with the same map. Nothing was
  changed here: the brief's "preserve gameplay exactly" outweighs any micro-optimisation.

Resources:

- `mountArena().dispose()` removes all ten document/window listeners it adds, disconnects the
  ResizeObserver, cancels the animation frame, disposes every geometry, material, texture,
  render target, instanced mesh, the shadow map, the effect pools, both viewmodels, both knife
  views, both characters, the environment and the renderer, then forces a context loss.
- `DuelMatch` closes the WebSocket with handlers detached, clears the reconnect timer, disposes
  the arena and unsubscribes the sound bus on unmount. Map GLBs are reference-counted
  (`retainAuthoredAsset`/`release`) and shared across mounts.
- Verified by `fps-lifecycle.spec.ts` and the four-map lifecycle capture (0 leaks, GPU
  geometries/textures back to baseline after every dispose).

## Remaining technical debt (preserved, reported)

- **`npm run lint` fails on main** with 1,276 pre-existing prettier errors, 195 of them in
  `src/content/guides/*`, 25 in `src/components`, 18 in `tests/db`, 9 in `art/blender`. All
  are auto-fixable (`eslint --fix`) but touching 250 files is outside this cleanup. The files
  changed on this branch lint clean.
- **`@tanstack/router-plugin`** is a direct dependency that nothing imports; `@lovable.dev/
vite-tanstack-config` registers the router plugin itself and peer-requires
  `@tanstack/router-generator`, which is hoisted from this package. Removing it would change
  how that peer resolves in a Lovable-managed install; left in place.
- **75 unused exported types** (knip): types used only inside their own module but exported.
  Harmless; left.
- **`tests/db/*` integration tests** need `TEST_DATABASE_URL`; they fail identically on main in
  an environment without it.
- **Seven local `clamp`/`wrap` helpers** across unrelated modules (see §6).
- **64 documents under `docs/`**, many of them dated reports. None were deleted: they are the
  project's history and nothing in the brief makes them obsolete.
- The `db` vitest project and the e2e suites are not run by `npm test` in CI-less setups.

## Deliberately preserved

- `scripts/fps/*.mjs` operations scripts (staging, production rehearsal, hosted verification):
  referenced from `docs/FPS-OPERATIONS.md`.
- `scripts/fps/map-capture/lost-trail-players.json`: a valid capture views file with character
  stand-ins (used for scale checks).
- `art/blender/lost-trail/instance_sections.mjs` instance shuffle: no longer needed by the
  runtime (Low quality is gone) but harmless and documented; removing it would change the
  shipped GLB bytes for no benefit.
- The private FPS GPU Benchmark page and `scripts/fps/gpu-bench`.
- `src/integrations/supabase/types.ts` `Constants` export (generated file).

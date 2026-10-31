# PvPStrike frontend cleanup — 2026-10-31

## Scope and decisions

Audited imports and exports across `src/lib/fps`, the FPS components/routes,
renderer/model loaders, related fixtures, asset references and application
dependencies. Checked references across `src`, `workers`, `scripts` and `tests`
before removing code. TypeScript's unused-local/parameter diagnostics were also
checked for the game frontend.

- Removed 83 unreferenced selectors (77 complete rules) from `duel.css`, primarily
  the retired lobby. The active lobby owns `strike-lobby.css`.
- Removed 29 earlier declarations overridden by later declarations of the same
  property on the same root-level selector. Kept responsive rules and cascade
  order, then formatted the surviving stylesheet for review and maintenance.
- Removed `anatomical-forearm.ts`: no module, fixture or script imports it. The
  current authored continuous forearms and the procedural loading/failure hands
  remain in use.
- Removed the unused `SNAPSHOT_MS` and `PRACTICE_BEST_OF` declarations and two
  unused simulation imports. Made the error lookup private to its API module.
  The live server's snapshot cadence and Practice format are unchanged.
- Added `model-assets.ts` as the common model-URL manifest for intent preloading
  and both authored loaders. URLs, preload timing and failed-load retry behavior
  are unchanged.
- Kept application dependencies: renderer packages, shared casino dependencies,
  CSS imports and plugins supplied by the Lovable build configuration are still
  required. No package/lockfile churn was justified by this frontend audit.

No changes to prediction, input, recoil, hitboxes, damage, network timing,
session validation, settlement, schema or cash configuration. Retained authored
asset failure fallbacks, source-asset disposal and old-checkpoint compatibility.
Only the frontend Worker needs deployment; the match Worker is preserved.

## Evidence

Local evidence is under ignored `test-results/fps-cleanup-*` paths; it contains
operational artifacts and is not published with the site.

- Minified match CSS: **18,301 → 11,386 bytes** (38% reduction); gzip:
  **4,746 → 3,245 bytes** (32% reduction). This is a stylesheet saving, not an FPS
  or whole-application performance claim.
- Compared all computed properties for 4,755 representative game/HUD/overlay
  elements across five viewport sizes, including short and mobile screens:
  identical before/after styles. This supplements browser gameplay checks; it
  does not replace human visual review of every game state.
- Full unit suite: **755 tests, 92 files passed**.
- TypeScript and FPS-source ESLint passed. The broad `eslint .` run was stopped
  because it scans ignored local operational artifacts; the scoped game lint
  completed successfully.
- Hosted staging lobby checks cover desktop, 390px and 320px layouts, image,
  navigation and creation terms. Updated its action-reachability assertion to
  scroll the intentionally scrollable creation panel before measuring the CTA.
- Chrome and Firefox movement-continuity checks pass under snapshot jitter.
  The first Chrome six-round run missed the test's five-second bot-kill bound;
  its isolated rerun passed all six rounds (5–1). Eight repeated arena mounts
  also passed the GPU/resource and input-listener lifecycle checks.

Production verification additionally requires a fresh frontend-only deployment
guard, unchanged match runtime/configuration/migrations, and a zero-funded solo
Practice game with reload, shot confirmation and Practice-again. QA accounts
must be disabled and their sessions revoked afterwards.

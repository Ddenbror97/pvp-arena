# Post-map frontend cleanup (2026-11-09)

Branch `cleanup-2026-11-09`, from main 50ce54c8 (the deployed build with the roads, map edges and roadside cover). No gameplay change intended.

## The request

> "run a post frontend clean up, we have done alot of changes to the map, increased quality of
> water/ground/etc, built alot of objects … you can also go outside the checklist, to find
> anything else that will help performance/maintain"

The attached checklist's method was followed: inventory first, static and dynamic references checked, deletions in batches, each verified with tsc, lint, build and tests.

## What was removed

### Obsolete BR asset revisions (60.6 MB, 371 files)

Every world revision kept its own manifest, collision file and GLB set in `public/fps/br/models`. The game loads only the current one (`world.ts WORLD_ASSETS` → `roads-v1`, `doors.v9`). Removed:

| | Files | Kept |
|---|---|---|
| Model manifests `models.*.json` | 20 old revisions (access-v1…v11, walls-v1…v3, audit, deadspace, landmarks, locations, military, prison, superstore) | `models.roads-v1.json`, `models.json` (the processor's working manifest) |
| Collision `collision.*.json` (2 MB each) | 18 old revisions | `collision.roads-v1.json`, `collision.json` |
| Door atlases `doors.v*.{json,webp}` | v1–v8 | `doors.v9` |
| Model GLBs | 316 LOD files no current manifest references (old `*.access-vN.*`, `*.walls-vN.*`, and the pre-fit-out base models of every building that now has a fitted copy) | 915 referenced LODs, plus the five loaded by name in code: `attachments`, `canopy`, `gear`, `ground-loot-v1`, `vehicles` |

**How "unreferenced" was decided:** a GLB is kept if the live manifest names it, or if its filename appears anywhere in `src`, `workers`, `tests`, `scripts` or the art pipeline. The build pipeline (`add_models.mjs`) creates a new revision from the previous one, so it reads only the revision `world.ts` points at; `fitout/*.py` scripts name the revision they were written against in comments and their JSON, not as runtime input.

**One script fixed:** `scripts/br/interior-review/capture.mjs` defaulted to `collision.access-v6.json`. It now reads the live revision from `world.ts` unless `REV=` is given.

### Superseded audio (2.1 MB, 18 files)

`public/fps/audio`: every `*-v1.wav` or `*-v2.wav` with a newer version that `audio.ts` / `br-audio.ts` actually name (`awp-reload-empty-v2` → v3, `br-mp5-*-v1` → v2, `m4-reload-*-v1` → v2, `knife-equip-v1` → v2, and so on), plus five early AK and pistol takes (`ak47-a/b-v1/v2`, `pistol-v1`) no code or script references. The two `ak-reload-*-v1.wav` files stay: `scripts/fps/build-ak-audio.mjs` uses them as source material.

### Other

- `public/brand/arena-logo.webp`: nothing references it (the app imports `src/assets/arena-logo-v2.webp`; emails use `arena-logo-email.png`).
- **Dead code** found with `tsc --noUnusedLocals --noUnusedParameters`:
  - `karambit-viewmodel.ts`: the `Wraps` type, `circumcentre()` and `fingerWraps()` (a finger-wrap solver nothing calls), and an unused `stance` local;
  - `br/loot-renderer.ts`: `labelTexture()` (canvas labels replaced by model icons);
  - `bomb/match.ts`: an unused `Primary` type import;
  - `br/layout.ts seaPier`: an unused `poi` parameter, dropped at both call sites.

`public/` goes from 197 MB to 137 MB (−30 %). Nothing the deployed game requests has changed.

## Three.js lifecycle: one real leak fixed

**The BR arena did not dispose its operators.** `br-arena.ts dispose()` tore down each subsystem by name, but the list missed:

- the pool of 100 character rigs (`actors`), your own figure (`me`) and the inventory's figure (`figureActor`): GLTF instances, rifles and gear, each with its own `dispose()` never called;
- the shared rifle kit (`weaponKit`: two textures and three materials) and the operators' `plain` material;
- the grenade renderer (`nadeFx`: balls, puffs, flames, flash ball).

Leaving and re-entering a match kept all of it on the GPU; `renderer.info.memory` (shown in the diagnostics) would climb with every match. The 1v1 renderer avoids this with a final scene-wide sweep, and the BR arena now does the same: after the named disposals, every geometry and material still in the scene is disposed, instanced meshes released, the sun's shadow map freed and the scene cleared. No future leak depends on the list staying complete.

**Checked and found correct:** every listener the arena adds is removed; the frame loop stops on `disposed`; the one timer is cleared; `BrMatch.tsx` disposes the arena, closes the socket and clears its reconnect timer; the terrain, water, vegetation, props, structures, door, loot and power-line renderers dispose their own textures and instanced meshes; the island's impostor object URLs are revoked after upload. The frame loop pools its poses and vectors (no per-frame allocation beyond a ≤100-element sort).

## Audited, nothing to do

- **knip:** no unused files or dependencies. Its 7 "unused exports" are same-named exports in other modules, `import()` uses, or the shadcn re-exports kept on purpose (see the 11-05 cleanup).
- **CSS:** every class in `styles.css`, `br.css` and the lobby sheets is rendered by a component (dynamic prefixes checked).
- **Debug logging:** the `console.log` calls left are structured server-side ops logs (settlement, crypto jobs, match settlement), intentional.
- **Code splitting:** three.js and the arenas (`grenade-viewmodel` chunk, 816 kB; `br-arena`, 277 kB) load only when a game opens. The landing route's bundle does not include them.
- **Dependencies:** no unused packages. Scripts use `playwright`, `sharp` and `meshoptimizer` without declaring them (as noted on 11-05); declaring them needs a lockfile change, left alone.

## Baseline and result

| | main | now |
|---|---|---|
| `public/` on disk | 197 MB | 137 MB |
| `public/fps/br/models` | 104 MB | 44 MB |
| Client JS (221 chunks) | 4.31 MB | 4.31 MB |
| tsc (`--noUnusedLocals --noUnusedParameters`) | 5 unused | clean |
| Unit suite | all pass but the 3-room load test | same |

(The `catalog.generated.ts` type errors seen in the roads merge are not real: the file is build-generated and gitignored; `scripts/emit-guide-assets.ts` writes it during `vite build`.)

## Recommended follow-ups (not done here: content or history decisions)

1. **Weapon viewmodel textures (biggest download win left).** `mp5-police.glb` (7.9 MB), `deagle-police.glb` (7.3 MB), `m4a1-authored.glb` (5.8 MB) and the terrorist variants each embed the same ~3.3 MB set of 2048² arm and glove textures. Sharing one arm texture set across the viewmodels (or loading arms once) would cut ~15 MB from the weapon downloads. It needs a re-export of the viewmodels.
2. **`docs/` holds 32 MB of review screenshots** (52 PNGs, many 1.7 MB) that nothing uses at runtime. They are the visual record the handoff docs point to; moving them to the project's docs or Git LFS would make every clone and CI checkout lighter.
3. **Memory check in CI:** `renderer.info.memory.geometries` before and after a mount/dispose cycle would catch the next leak of the kind fixed here. The arena already exposes the figures.

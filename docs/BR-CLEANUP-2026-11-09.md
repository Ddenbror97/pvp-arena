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

`public/` went from 204 MB to 132 MB after the first pass's removals and the texture sharing (−33 %). Nothing the deployed game requests has changed.

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
| `public/` (bytes) | 204 MB | 132 MB |
| `public/fps/br/models` | 106 MB | 46 MB |
| `public/fps/models` (weapon viewmodels and maps) | 74 MB | 49 MB |
| Tracked `docs/` | 34 MB | 2 MB |
| Client JS (221 chunks) | 4.31 MB | 4.31 MB |
| tsc (`--noUnusedLocals --noUnusedParameters`) | 5 unused | clean |
| Unit suite | all pass but the 3-room load test | same |

(The `catalog.generated.ts` type errors seen in the roads merge are not real: the file is build-generated and gitignored; `scripts/emit-guide-assets.ts` writes it during `vite build`.)

## Follow-ups, done (second pass, same day)

### Weapon viewmodel textures shared: −33 MB

Every weapon viewmodel is built on the same arm rig, so the eight GLBs (AK, M4, AWP × 2, MP5 × 2, Desert Eagle × 2) each shipped their own copy of the glove, sleeve, watch and strap textures, and the police/terrorist variants of a gun each carried the gun's own textures too: 25 MB of byte-identical textures across the set.

- **`art/blender/dedupe_viewmodel_textures.mjs`** (a post-process on the shipped GLBs; idempotent, re-run after any viewmodel rebuild): every texture whose bytes appear in two or more viewmodels is written once to `public/fps/models/viewmodel-shared.glb` and replaced in the weapon GLBs by a 1×1 placeholder. `viewmodel-shared.json` maps each GLB's material and slot to its shared texture. 44 textures shared.
- **`authored-assets.ts`** re-attaches them: a weapon GLB with an entry in the map also retains the shared pack and, once both are loaded, swaps the placeholders for the shared textures (copying the placeholder's colour space and sampling). The pack is a normal ref-counted asset: it goes when the last weapon does, and its textures are skipped by the weapons' own disposal.
- **Result:** the eight viewmodels go from 46 MB to 11.4 MB, plus the 9.5 MB pack loaded once (net −33 MB; the biggest single weapon, `mp5-police`, 7.9 → 1.5 MB). Verified by rendering MP5, M4 and Desert Eagle on both teams through the gun-review harness: every sleeve, glove, watch and gun texture resolves.

### Review screenshots out of the working tree: −32 MB

The 52 images under `docs/screenshots`, `docs/images` and `docs/fps-map/img` are removed from the tree. Every link in the docs (49, both `![image]` embeds and plain links) now points at the last commit that carried them, served raw from GitHub, so no page lost its pictures; `docs/SCREENSHOTS.md` says how to restore them locally. (A release asset was the first choice but this session cannot create releases.)

### The leak check as a tool: `scripts/br/leak-check`

`node scripts/br/leak-check/capture.mjs [--cycles=3]` mounts the real arena with the island assets on headless Chromium, renders a frame, disposes, and repeats. After each teardown the renderer must track no geometry or texture beyond three.js's own floor (3 each: the shadow map, its depth, the DFG lookup), the mounted counts must not grow, and no authored asset may still be retained. Between "rendered" and "dispose" it snapshots the heap for every uploaded texture, so anything the teardown never disposes is **named** (texture, size, source, and the scene material that owned it). `dispose()` now returns the renderer's post-teardown counts for this.

**Running it found three more leaks**, all "a material's `dispose()` does not dispose its maps":

| Left on the GPU each match | Fixed in |
|---|---|
| The 8 MB door atlas (`doors.v9.webp`), lent to the door renderer and never disposed | `island-scene.ts` |
| The ground-loot pack's 55 item textures | `loot-renderer.ts` |
| The six tree leaf and bark textures | `vegetation-renderer.ts` |
| A LOD still downloading at teardown, uploading afterwards to a dead renderer | `props-renderer.ts` (freed on arrival) |

After the fixes: 3 mount/dispose cycles, 3 geometries and 3 textures left after each (the floor), JS heap flat at 15 MB. One lesson recorded in the tool: a CDP `queryObjects` result handle retains everything it matched; the first runs reported the probe's own retention as a 100 MB leak until the handles were released.

### Also in this pass

- **Battle Royale is public.** Every layer that asked the database for the admin role (lobby, server admission, the room's connect and its 15-second re-check) now admits any signed-in player; sign-in and live-session checks are unchanged. The room no longer makes a role RPC per player per period. Lobby copy: "Play Now" / "Sign in to play"; the direct route asks signed-out visitors to sign in. `workers/fps/br-access.ts` is removed; the access tests are rewritten for the public rule.
- **Loading screen:** the owner's labelled island map replaces the previous loading art (`src/assets/fps/project-island-loading.webp`, 1672 × 941). The screen already draws it edge to edge (`object-fit: cover`); verified at 16:9 and 21:9.

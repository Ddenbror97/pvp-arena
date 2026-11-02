# LOST TRAIL (jungle 1v1 aim map)

Branch `fps-map-lost-trail`, on top of the shared map registry (`docs/FPS-MAP-REGISTRY.md`).
The map is registered in the catalog with `rotation: false`, so matches don't draw it until
it is accepted.

## Pipeline

`art/blender/lost-trail/build.sh` runs the whole build. It is deterministic; every step is
seeded.

| Step | File | Output |
| --- | --- | --- |
| Layout | `layout.py` | `src/lib/fps/lost-trail-layout.ts` (gameplay solids, barriers, spawns), `build/layout.json` |
| Textures | `textures.py` | `build/tex/*.png` (generated, plus CC0 bark scans and optional scanned overrides) |
| Tree skeletons | `trees/generate_trees.mjs` | EZ-Tree (MIT) OBJ files: five archetypes × near/far |
| Scene | `build_trail.py` (+ `scanned.py`) | `build/lost-trail.glb`, `build/lost-trail.blend` |
| Instancing | `instance_sections.mjs` | Per-section `EXT_mesh_gpu_instancing`, shuffled instance order |
| Compression | `gltf-transform meshopt` | `public/fps/models/lost-trail.glb` |

Optional scanned CC0 assets are covered in `art/blender/lost-trail/source/SCANNED-ASSETS.md`.

## Art rules

- **Collision is the truth.** Every gameplay solid is dressed inside its collision box:
  - layered rock beds and jointed blocks are set back at most 10 cm;
  - boulders are clamped to their box;
  - the ridge top stays flush, because players stand on it.

  Nothing visual taller than ankle height stands in a lane unless it is a solid. The ford
  stones are about 7 cm tall.
- **Decoration out of head height.** On the giant trees, hanging vines and aerial roots end at
  least 5.5 m above the base in tree units (≥ 7.7 m on the in-arena giants, ≥ 4 m on the forest
  edge). Epiphytes sit at 4 m or higher. Strangler roots are only on forest-edge trees outside
  the arena.
- **Mirror fairness.** Each mirrored pair of giants uses the same species and mirrored yaw.
- **No new shader cost.** Lianas, vines, roots and epiphytes use the tree's own bark and leaf
  materials, so they add no draw calls. River rock shares the rock normal map. Reeds are one
  instanced clump. Ground wetness is a vertex colour (one varying) on the ground mesh.

## Performance

Measured on the headless capture (SwiftShader); see Verification for the method.

| | Art pass 2 | Art pass 3 |
| --- | --- | --- |
| Draw calls, everything visible | 216 | 219 |
| Triangles, everything visible | 1.03 M | 0.87 M |
| GLB (meshopt) | 3.20 MB | 3.46 MB |

Pass 3 changes behind these numbers:

- **Bark thinning.** Only the near trees' crown twigs are collapse-decimated, 45% kept; the
  trunk keeps every ring.
- **Buttresses.** Buttress fins use the trunk's own material.
- **River.** Single instanced reed and wet-rock libraries.
- **Welding.** Tubes and boulders share vertices.

### Graphics quality "Low" (Settings → Graphics)

- Every background-section batch (beyond 6.5 m outside the playable edge) draws a seeded random
  half of its instances. The kept trees grow 14% so the far canopy still reads as closed.
- The forest edge and the arena are untouched, so sight lines are identical on both settings.
- The cached shadow map is re-rendered once when the setting changes.
- There is no new shader and no per-frame work.

## Practice bot

The bot's path grid keeps 0.18 m beyond the player radius, so gaps players squeeze through
(about 0.9–1.0 m) are closed to it. Three small layout adjustments give it the bridge and the
north bank:

- The bridge crate stack is 0.9 m across the deck, leaving two 1.25 m lanes.
- The bridgehead rocks sit 0.3 m nearer the gorge.
- The plaza logs sit 0.4 m nearer the spawns.

Spawn safety, first contact and route times are unchanged. All nine first-round patrols
reveal the bot to an idle player within 20 s (6.6–19.1 s), the bound pinned by
`tests/fps-practice-bot-reveal.test.ts` (from the FROSTLINE branch).

## Verification

- `tests/fps-lost-trail-layout.test.ts`: layout, spawn safety, reachability, first contact,
  post view and bot patrols on the real movement and visibility code.
- `tests/fps-lost-trail-quality.test.ts`: low thins only background batches; high restores
  them exactly.
- `scripts/fps/map-capture/capture.mjs`:
  - `lost-trail <out> [views] [--quality=low]` writes screenshots and per-view draw calls and
    triangles.
  - `--lifecycle=dustfront,lost-trail --cycles=N` mounts and disposes map environments
    repeatedly. GPU geometries and textures must not grow (map-switching / resource-cleanup
    check).
- Still to do: real-GPU Chrome and Firefox frame timing on a player's machine.

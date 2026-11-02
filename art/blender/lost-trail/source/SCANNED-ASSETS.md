# LOST TRAIL: scanned CC0 vegetation and rock workflow

The map builds with no downloads: every plant, rock and texture has a procedural or
already-bundled CC0 source. Scanned assets are an optional upgrade. You drop files into
`source/scanned/` and run the normal build; the build swaps them in under the same budgets.
Without files, nothing changes.

There are two kinds of swap. **Texture swaps** are the most effective: real leaf, frond, bark
and rock photos on the existing optimised cards and meshes. **Mesh swaps** are only for
decoration that has no collision.

## 1. What to download

Download on your computer. Nothing in this repo fetches assets.

- Licence: CC0 only. Record each asset in `source/README.md` with its URL.
- Resolution: 1K or 2K. The build downscales to 1024 px; 4K/8K only slows the build.
- Poly Haven filenames are `<slug>_diff_1k.jpg`, `<slug>_nor_gl_1k.jpg` (use the OpenGL
  normal, not `_nor_dx`), `<slug>_rough_1k.jpg`, and glTF models as `<slug>_1k.gltf` + `.bin`
  + `textures/`. Rename them to the target names below.

### A. Texture swaps: `source/scanned/textures/<target>.png|jpg`

The `<target>` name must be one of the build's maps (anything else is ignored):

| Target file | What it replaces | Layout the cards expect |
| --- | --- | --- |
| `leaves_canopy.png` (RGBA) | Emergent/hardwood crown leaves | Cluster of leaves filling the square, alpha = leaf cut-out, stems toward the bottom centre |
| `leaves_broad.png` (RGBA) | Broad/twisted crowns, vines, ivy, epiphytes | Same as above, larger leaves |
| `leaves_understory.png` (RGBA) | Bushes | Same, big glossy understory leaves |
| `frond_palm.png` (RGBA) | Palm fronds | One frond, rachis vertical, base at the bottom edge, tip at the top |
| `frond_fern.png` (RGBA) | Ferns | One fern frond, same orientation |
| `reeds.png` (RGBA, 1:2) | River reeds | Blades rooted along the bottom edge |
| `bark_jungle.png`, `bark_jungle_n.png`, `bark_jungle_r.png` | Dark trunks, roots, lianas | Tileable bark: colour, OpenGL normal, roughness |
| `bark_pale.png` (+ `_n`, `_r`) | Pale trunks (slender, broad, palms) | Tileable |
| `rock_moss.png`, `rock_moss_n.png`, `rock_moss_r.png` | All rock (walls, ridges, boulders) | Tileable; layered or bedded rock reads best (beds horizontal) |
| `rock_wet.png`, `rock_wet_r.png` | River rock (shares `rock_moss_n`) | Tileable, dark and wet |
| `forest_floor.png` (+ `_n`, `_r`) | Ground | Tileable leaf litter |
| `trail_mud.png` (+ `_n`, `_r`) | Trails, banks | Tileable mud |

Normal maps must be OpenGL (+Y). Leaf atlases need a real alpha channel: the cards are
alpha-tested at 0.5, so soft or premultiplied alpha turns leaves into blobs.

Suggested sources (check the CC0 badge on each page):

- Poly Haven textures: bark, rock and forest ground sets. For example,
  [forest_ground_04](https://polyhaven.com/a/forest_ground_04) and
  [leaves_forest_ground](https://polyhaven.com/a/leaves_forest_ground) suit `forest_floor`. The
  bark scans already used came from Poly Haven.
- ambientCG (CC0): bark, rock, ground, and "Leaf"/"Foliage" atlas sets with opacity maps.
  Combine colour + opacity into one RGBA PNG.

### B. Mesh swaps: `source/scanned/<slot>/<name>.gltf|glb` (at most 2 per slot)

| Slot | Replaces | Normalised height | Triangle budget per variant | Shadows |
| --- | --- | --- | --- | --- |
| `fern` | Ground ferns | 1.1 m | 1,200 | no |
| `bush` | Understory bushes | 1.5 m | 1,500 | no |
| `palm` | Palms in the jungle zones and at the forest edge | 10 m | 4,000 | yes |
| `reeds` | River reeds (first file only) | 1.0 m | 600 | no |
| `rock` | Decorative jungle rocks (not gameplay boulders) | 1.1 m | 900 | yes |

Use game-ready (card-based) plant models. Film-resolution plant scans are far over budget,
and decimating them to these budgets destroys the leaves. For example, Poly Haven's
[Searsia Lucida](https://polyhaven.com/a/searsia_lucida) shrub is 842k triangles. For those,
take the scan's leaf texture into a texture swap (A) instead. Rocks decimate well, so any CC0
rock scan works as a `rock` mesh.

Gameplay rocks, walls, ridges and the giant trunks are never swapped: they are built inside
their collision boxes so cover matches what you see (see `build_trail.py`).

## 2. Folder layout

```
art/blender/lost-trail/source/scanned/
  textures/      leaves_canopy.png, frond_fern.png, rock_moss.png, …
  fern/          fern_a_1k.gltf (+ .bin, textures/)
  bush/
  palm/
  reeds/
  rock/          boulder_a_1k.glb
```

## 3. Build

Run the normal pipeline:

```bash
BLENDER_PY=/path/to/python-with-bpy art/blender/lost-trail/build.sh
```

With a desktop Blender instead of the pip `bpy` module, run the same steps; `build.sh` lists
them:

```bash
cd art/blender/lost-trail
python3 layout.py && python3 textures.py
(cd trees && node generate_trees.mjs ../build/trees)
blender -b --python build_trail.py -- build/lost-trail.glb --blend build/lost-trail.blend
node instance_sections.mjs build/lost-trail.glb build/lost-trail-instanced.glb
../node_modules/.bin/gltf-transform meshopt build/lost-trail-instanced.glb ../../../public/fps/models/lost-trail.glb --level medium
```

Check the log:

- `textures: … scanned overrides: [...]` lists the texture swaps applied.
- `SCANNED <slot> <file> <tris> tris` appears for each mesh swap. A missing line means the file
  wasn't found or had no mesh.

Then compare before and after with the capture tool:

```bash
node scripts/fps/map-capture/capture.mjs lost-trail /tmp/lt-after --chromium=/path/to/chrome
```

The tool writes screenshots, plus draw calls and triangles per view, to `stats.json`.

## 4. What the importer does (`scanned.py`)

1. Imports the glTF, bakes all transforms and joins the parts into one mesh.
2. Centres the base on the origin, puts it on the ground, and scales it to the slot height.
3. Collapse-decimates it to the slot's triangle budget.
4. Caps its textures at 1024 px.
5. Renames materials to `scan-<slot>-<n>`. Alpha-masked materials then get the runtime's
   foliage treatment automatically (wind and alpha-to-coverage); there is no shader change.
6. Makes foliage double-sided, and sets the slot's shadow flag.

Each variant is one instanced mesh per culling section, so two variants per slot is the draw
call cap.

# Project Island building access and crouch-jumps

The previous access bake repaired five building types. Further inspection found sealed
door geometry, voxel collision across entrances, missing walkable floors, and stair/rail
collision across the usable path in other assets. The terrain audit also found approaches
that were valid on a flat test pad but obstructed in the actual island layout.

`art/br/building-access-v2.json` adds authored repairs for 16 building types: cabin, the three
rural stores, office trailer, mobile home, brick shop, Bauhaus block, diner, church, barracks,
industrial hut, two industrial warehouses, Quonset hut and fire station. Portals are cut in
the rendered meshes as well as collision; floors, thresholds, landings and stairs use precise
support boxes. The fire station's exterior flight connects to its upper entrance. Existing
wall-surface repairs, textures, source credits and LOD budgets are retained.

Rebuild from the repository root:

```sh
node art/blender/br/repair_building_access.mjs art/br/building-access-v2.json
node art/blender/br/repair_wall_surfaces.mjs models.access-v2.json walls-v2 art/br/building-access-v2.json
```

The bake takes the published wall-repaired manifest and access-v1 collision as immutable
inputs. It preserves previous authored entrances and publishes access-v2 files. Earlier asset
URLs remain available to cached clients. `WORLD_ASSETS` selects the matching render/collision
revision together.
The second pass removes coplanar duplicates after the new clipping and double-sided interior
surfaces are generated, retaining the existing wall-flicker repair rather than reintroducing it.

`entrance-sites.json` contains eight authored placement corrections. Seven keep their x/z
position while correcting doorway orientation/foundation height; one house moves 10 metres
to a clear site. The corrections apply once in the shared layout, so rendering, collision,
doors, vegetation clearings and loot all use the same placement. There is no per-frame site
search, terrain-only collision override or unstick teleport used to simulate access.

The collision broadphase avoids deduplication writes when a hull occupies one grid cell.
Door sets also retain their vertical bounds, allowing rays and hulls entirely above or below
all doors to skip door-only queries. Underlying building/roof collision is still checked.

BR movement now uses the arena's air-duck hull contraction. Jump impulse, gravity, walking
step height and existing animations are unchanged. Crouch-jumping lifts the feet toward the
head rather than adding upward velocity, allowing appropriately sized cover to be cleared.
The offset is replicated in private player snapshots and retained in checkpoints, preventing
prediction from applying it twice. It clears on landing and swimming. Standing remains blocked
under low ceilings; hull clearance is queried only when the stance actually changes.

## Checks

- The permanent building test walks 25 authored routes at four model rotations and at all
  matching island placements: **2,100 placed routes, in both directions**, including exterior
  stairs, upper doors and terrain approaches. It rejects unstick teleports and oversized steps.
- Closed-door collision and surrounding frames still block; opening a door permits traversal.
- Jump checks cover ordinary low cover, crouch-jump cover, unreachable walls, gravity/impulse,
  repeated input, low ceilings and replicated/restored hull state.
- Existing 1v1/5v5 jump and simulation checks remain unchanged and pass.
- Model tests retain the existing triangle, draw, texture and total download budgets.
- Worker functional checks pass, including admission, reconnect, insertion and a complete
  match. The 300-player/three-room check initially exceeded the unchanged 12 ms p99 limit
  (12.47 ms; single-cell optimization alone measured 12.79 ms). After vertical door broadphase
  it passes at 11.85 ms over 23,553 requests. The prior live code measured 11.63 ms on this
  workstation. The single-room check passes at 9.80 ms. These are local runtime measurements,
  not player-hardware frame rates or regional network timings.
- Native Chrome/D3D11 walkthroughs use the real BR client and shared match simulation,
  walking and opening doors with E at the fire station's upper entrance, diner, mobile home,
  cabin, rural store and Bauhaus block. All six reach their interior targets without page
  errors. This is a local integration check, not a production human-player match.

BR rules version is **4** and world revision is **building-access-v2**. Deploy the site and
match Worker as one release with the generated production configuration. No database migration.

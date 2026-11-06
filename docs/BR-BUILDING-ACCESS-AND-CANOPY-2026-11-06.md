# Project Island: building access and parachute controls

## Building faults and repair

The screenshots match the `house` and `barn` prefabs. Their visible entrances were not
reliably traversable: collision-derived doorway inference could select a porch railing
gap or window, while the actual imported doorway still contained triangles. Low stair
risers had also been discarded by the original collision bake; coarse voxels could leave
an oversized next step or overhead obstruction. The barn included a flat dirt sheet
intersecting the heightfield, causing the brown/grass surface to fight for depth.

`art/br/building-access.json` describes measured openings, floors and approaches for
`house`, `barn`, `rural-house`, `rural-wood-1` and `rural-wood-4`. The offline repair:

- Cuts the actual doorway triangles, preserving interpolated UVs and the existing textures.
- Aligns interactive doors with those openings; the closed door and surrounding frame still
  block the standing player hull.
- Adds walkable approaches and room floors. Stair collision uses precise shallow risers;
  the general collision grid stays at 0.3 m. Player jump and stepping rules are unchanged.
- Removes the barn's overlapping dirt sheet. The heightfield remains the ground surface.
- Retains far-LOD batching: each repaired far prefab is one draw, with simplified floor
  sheets/stair wedges and no additional texture assets. New near floors/stairs are matte
  geometry, not newly authored detailed architectural textures.

The first complete runtime check exposed a collision-query cost: the old 16 m broad-phase
cells returned most of a detailed building for each small hull query. The index now uses
4 m cells without changing any collision box. A representative entrance-area benchmark
visited 975,744 candidates instead of 4,473,867 (78.2% fewer), with identical blocked counts,
support-height sums and ray-hit distance sums. This is an internal benchmark, not a claim
of 78.2% higher FPS. The initial runtime p99 results were 16.27 ms (three rooms) and 15.87 ms
(one room); the original 12 ms acceptance threshold was retained for the final rerun.

That rerun also uncovered a fixture lifecycle problem: each socket starts a live room
interval, but the tests previously shared one runtime, leaving earlier scenarios running
during later benchmarks. Each scenario now gets its own runtime and disposes it afterward.
With the unchanged scenarios/player counts and 12 ms limit, all seven runtime tests pass:
three 100-player rooms recorded p99 11.58 ms (mean 4.70 ms), and a single 100-player insertion
recorded p99 9.26 ms (mean 4.22 ms), including test request overhead. A full match completed
after 13,200 simulation ticks to one winner. These workstation measurements are not a
production regional latency or capacity guarantee.

Original GLBs and manifests remain the bake inputs. To reproduce from the repository root,
using the existing `art/blender` tooling dependencies:

```sh
node art/blender/br/repair_building_access.mjs
```

Output is 15 `*.access-v1.lod*.glb` files plus `models.access-v1.json` and
`collision.access-v1.json`. A second bake produced identical SHA-256 hashes for every output.
All runtime and QA readers use `WORLD_ASSETS`; model/collision manifests must carry the
same revision. Derived entrance/loot caches are scoped to the collision object.

Checkpoint testing also exposed an existing recovery fault: regenerating bot landing
targets from _remaining_ loot could redirect a swimmer after a room restart. Checkpoints
now retain the original drop plans, with the legacy checkpoint fallback preserved.
Door indices from an older geometry revision are reinitialised, rather than applied to
different entrances; player inventory, health and match progress remain recoverable.

## Parachute controls

Normal mouse movement sets a flight course; holding the right mouse button moves only
the camera. Releasing it recentres over roughly 180 ms. A/D still turn, W glides, S brakes,
Ctrl dives, and V changes camera. Keyboard steering takes precedence and updates the
mouse course when released, avoiding a turn back toward an obsolete target. The canopy's
bank and toggle movement follow actual turning rather than only keyboard state.

The course is a separately validated, optional `canopyYaw` input. Shared client/server
simulation limits mouse turns to the same angular rate as keyboard turns, including angle
wrap-around. Free-look yaw cannot steer flight. Blur, pointer-lock loss and leaving the
canopy clear held free look; ordinary on-foot look/aim controls resume on landing.

This follows the separation of movement and free look described in
[PUBG's controls](https://support.pubg.com/hc/en-us/articles/360002074913-What-are-the-basic-game-commands)
and [Activision's parachute guidance](https://blog.activision.com/call-of-duty/2020-05/Warzone-Parachute-Techniques).
Right-drag is the owner's chosen binding, rather than a claim that it is PUBG's default.

## Evidence and limits

- Building traversal regression: five prefabs at all four rotations, walking in and back
  out with the standing hull; checks exclude unstick teleports and verify closed doors/jambs.
- Real terrain probes also traversed representative Northstar, Millhaven, countryside and
  other placements. These are samples, not every building placement on the island.
- Native Chrome/D3D11 on Intel UHD: doorway/stair screenshots reviewed; no browser errors.
  Fixed 1280×720 exterior views recorded 158–161 draws, 31 shader programs and mean frame
  intervals of 13.35–15.13 ms. These are short fixed-scene checks, not a whole-match FPS guarantee.
- The ground-scene pixel colour masks are not a valid flicker percentage: camera parallax
  and the intentional dirt-sheet removal change those pixels. No numerical flicker reduction
  is claimed from them.
- `node scripts/br/client-sim/canopy-controls.mjs` passed mouse steering, right-drag isolation,
  release recentering, blur recovery and landing controls, with zero page errors. It runs
  the real arena against an in-page shared match; pointer lock is assumed by the harness.
  It is not an authenticated production match or a Firefox hardware measurement.
- Final BR validation totals 179 checks: 171 non-runtime checks in the full BR run, seven
  runtime scenarios in fresh isolated runtimes, and the additional collision-grid edge/ray
  regression. The four camera-controller checks were rerun after the final camera-helper
  change. Native Chrome's forced WebGL context-loss check recovered without page errors.
- The production website build succeeds. Existing TanStack server-function deprecation
  notices remain unrelated to this change.

## Release order

Both the site and FPS Worker are required; there are no database migrations. **Publish the
site first, then the Worker**, using the production-generated config, because the Worker
loads the new versioned collision asset from the site. Confirm those static asset URLs
return the expected bytes before updating the Worker. Preserve production vars/secrets,
Hyperdrive and the five-map aim rotation.

The BR WebSocket query, welcome and hibernation attachment carry the world revision.
Incompatible clients are closed with 4409, and the current client requests a page reload
instead of predicting against different collision geometry. An already open old BR tab
must be refreshed; this release does not promise seamless mixed-revision play. Verify
both artifacts after rollout. Roll back both together if required.

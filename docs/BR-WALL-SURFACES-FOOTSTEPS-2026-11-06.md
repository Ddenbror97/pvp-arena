# Project Island: close wall edges and intermittent footsteps

## Faults

The reported strips around wall tops, bottoms and sides match overlapping coplanar building
faces. Auditing the decoded near assets found same-facing overlapping surfaces in imported
houses and the procedural townhouse/apartment, including wall/roof/trim joins. Rendering
both at the same depth makes their visible colour depend on the camera angle and rounding.
This is distinct from the barn dirt sheet and aerial water issues fixed earlier.

Footsteps had two independent cadence faults. The body advances at 30 Hz, but `BrStrides`
was sampled on each rendered frame. An unchanged position between ticks cleared the stride.
A regression using actual 30 Hz position updates produced **zero** steps at 60 FPS before
the fix. Small snapshot rounding corrections also looked like slow movement and reset it;
native-browser traces showed repeated corrections of about 0.25–0.8 mm between valid moves.

## Changes

`art/blender/br/coplanar-surfaces.mjs` assigns each coincident surface to one visible owner.
Small trim/detail faces retain their appearance; only covered portions of backing faces are
removed. Polygon clipping interpolates UVs and other attributes. Shared boundary vertices
belong to both clipping halves, and each subtraction checks area conservation to prevent
accidental holes. Front/back surfaces that depend on back-face culling remain separate;
double-sided duplicates receive one owner. Nearby but distinct parallel walls are not merged.
Transparent and alpha-cutout faces never act as opaque coverage, and one-sided material cannot
replace a two-sided face's visible interior.
There is no global polygon depth bias or change to camera depth settings.

`repair_wall_surfaces.mjs` consumes the access-v1 manifest and original selected assets,
flattens transforms in floating point, repairs all affected LODs, and publishes versioned
render assets plus `models.walls-v1.json`. Existing collision data, interactive doorway
coordinates, movement, networking and server rules are unchanged. Rebuild from the root:

```sh
node art/blender/br/repair_wall_surfaces.mjs
```

The repair covers 32 building/outbuilding models and 84 affected LOD files. All selected
models retain their existing draw/texture budgets; far LODs remain one draw and triangle
counts decrease with distance. Only exact, zero-error simplification removes redundant
collinear subdivisions if needed for that monotonic LOD budget. Position quantization is
16-bit, with the existing meshopt loader. A repeat bake produces identical hashes.

The stride tracker now retains the accumulated distance between physics updates. Its spatial
anchor advances only after at least 2 cm of travel, so snapshot rounding cannot repeatedly
reset it; many small genuine interpolated movements still accumulate. The speed check uses
elapsed time since that spatial observation. Real idle periods clear the phase, while quiet
walking, crouching, healing, airborne movement, large corrections and long observation gaps
remain silent. Existing recordings, material responses, volume and directional mix are kept.

## Verification

- All 178 non-runtime BR checks pass, with a clean typecheck, changed-file lint and production
  build. Match-server runtime tests are unchanged and were not rerun for this client-only fix.
- Regression tests exercise 20/30/60/90/144/240 FPS over 30 Hz movement, changing frame rates,
  snapshot correction jitter, stationary noise, quiet/airborne motion and teleports.
- Pure geometry tests cover UV interpolation, area conservation, shared boundary vertices,
  opposite-facing interiors, double-sided duplicates, touching faces and separate thin walls.
- Existing model budgets and standing entrance traversal checks pass against the new manifest.
- Native Chrome/D3D11 renders the real instanced props with production logarithmic depth.
  In identical close-view micro-jitter checks, the townhouse sample changed from 1,511 to
  2 unstable pixels per frame, and the apartment sample from 367 to 10. House changed from
  128 to 50. Barn/wood samples were already low and showed no large reduction. These are
  controlled sample measurements; antialiasing/texture edges still change pixels, so they
  are not a claim of a universally flicker-free island.
- Visual review caught an initial shared-boundary clipping fault before release. It was
  corrected and given its own regression. Final townhouse/house views preserve solid walls.
- Draw calls and shader counts were unchanged in those native samples. The total selected
  LOD download remains below the existing 14 MiB test budget; no graphics setting was lowered.
- A native browser running the real arena against the shared in-page match walked four
  five-second segments (roughly 25 m each). Each segment started 13 local footstep buffers
  on a running AudioContext, with no page errors. This verifies playback rather than only
  counting requested sound events. It is not an authenticated production match test.

## Release

App-only deployment: no match Worker, database, migration or map-rotation change is needed.
Publish the new manifest and its versioned GLBs with the client, then verify their bytes
against the build. The collision/world revision stays `building-access-v1` because physical
geometry is unchanged. Old source assets remain available for existing cached clients and
as reproducible bake inputs. Rollback consists of redeploying the previous app build.

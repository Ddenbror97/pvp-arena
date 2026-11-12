# 5v5: wall flicker and bot group movement (2026-11-12)

Owner's report: "fix the flicker on both 5v5 maps, on the first 5v5 map its less the new 5v5 map
its more noticeble. on the first map its close to the ground/corners on the frames on the walls,
on the new map its on the frames of the walls … also fix so the bots for 5v5 dont run on each
other and take same path, they run laggy when you run together."

**Machine.** This session's container: headless Chromium on SwiftShader, and Node. Which face a
pixel shows is exact there. Nothing here was run on a graphics card (see "Not verified").

## 1. Flicker

### Cause

The map kits lay trim, frames, plinths, bands and decals in the plane of the wall behind them,
and neighbouring buildings' walls overlap in one plane. Two faces in one plane fight for the
depth test. Which of them a pixel shows depends on how each was rounded and on the order they
were drawn in, and both change as the camera moves: that is the flicker.

`art/blender/map06/find_coplanar.mjs` measures it in the shipped files: every triangle in world
space, every overlapping pair in one plane or within 20 mm of it, the overlap clipped exactly.

| Map           | Triangles | Overlap that can be seen fighting | Of it exactly coplanar | Left alone: doubled faces that look the same |
| ------------- | --------- | --------------------------------- | ---------------------- | -------------------------------------------- |
| Iron District | 99,304    | 1,297 m²                          | 591 m²                 | 210 m²                                       |
| Sandgate      | 216,701   | 4,470 m²                          | 171 m²                 | 242 m²                                       |

Iron District has three and a half times Sandgate's exactly coplanar area, on the walls (plaster
on plaster, concrete bands and brick on plaster). That is the map where it is "more noticeable".
Most of Sandgate's area is decals and ground a few millimetres apart, which only fight at range;
its coplanar part is plinths and frames low on the walls and at corners.

### Fix

Depth layers. Of two overlapping faces one is laid on the other: the one in front, or, where
they are exactly coplanar, the one from the smaller patch (a frame, a plinth, a strip of trim).
Each triangle gets a layer one above everything it is laid on. Most get none.

| Map           | Triangles on a layer | Of the map | Deepest layer | Meshes with layered triangles |
| ------------- | -------------------- | ---------- | ------------- | ----------------------------- |
| Iron District | 2,458                | 2.5 %      | 5             | 92 of 162                     |
| Sandgate      | 4,565                | 2.1 %      | 4             | 79 of 200                     |

The layer is a vertex attribute, and the vertex shader moves a layered vertex a few depth-buffer
steps towards the camera per layer (`src/lib/fps/maps/depth-layers.ts`). It is what a polygon
offset does, computed per vertex: the depth slope of the face's plane per pixel times a factor,
plus a fixed number of steps. Only depth changes. Nothing moves on screen, the GLB files are
untouched, and **a mesh stays one draw call**:

| Map           | Draw calls per view, before (p50 / p95) | After     |
| ------------- | --------------------------------------- | --------- |
| Iron District | 81 / 149                                | 81 / 149  |
| Sandgate      | 103 / 176                               | 103 / 176 |

A mesh gets a geometry of its own that reuses the cached asset's vertex buffers and adds the
layer attribute; where triangles on different layers share a vertex, the vertex is repeated and
the buffers are copied. Its material is a clone with the shader patch.

The table (`depth-layers.json`, 27 kB) names triangles of one build of each GLB: both map build
scripts rewrite it, a test checks it against the shipped files, and a mesh whose triangle count
no longer matches is left as it is.

Two versions were thrown away on the way:

- **One layer per mesh.** A mesh on these maps is "all the sandstone of a zone", so a wall and
  the frame laid on it are often the same mesh, and the order between two meshes differs from
  place to place. It could not part faces of one mesh, and it drew walls over decals and trim
  that stood clear of them.
- **Layered triangles as meshes of their own with a polygon offset.** Correct, but it added 136
  meshes on Iron District: 81 → 152 draw calls in the median view, 149 → 267 at p95.

Bullet marks, blood and contact shadows are drawn in front of the layers (`decalDepthOffset`),
so a mark on a frame is not covered by the frame.

### Measured

`scripts/fps/map-capture/flicker.mjs` draws the map with every triangle in a colour of its own,
from every standable spot on a 6 m grid in sixteen directions (eight headings, four of them
also looking up and down), at 640×360. Per view it counts:

- **ties**: pixels where two faces are at exactly the same depth (the frame drawn twice, once
  letting a face win at equal depth and once not);
- **near-ties**: patches that change owner when the camera moves half a millimetre.

Doubled faces of one material with the same texture and shade on the overlap are not counted:
nobody can see which of them is drawn.

| Map           | Views | Ties before  | Ties after | Near-ties before | Near-ties after |
| ------------- | ----- | ------------ | ---------- | ---------------- | --------------- |
| Iron District | 4,816 | 2,070,231 px | 88 px      | 2,300,965 px     | 21,181 px       |
| Sandgate      | 3,200 | 224,192 px   | 340 px     | 329,670 px       | 9,272 px        |

What the layers changed, checked pixel by pixel (the same frame with the offsets off):

| Map           | Pixels that went to the face laid on top | Pixels that changed between faces the scan does not order |
| ------------- | ---------------------------------------- | --------------------------------------------------------- |
| Iron District | 3,800,926                                | 3,887 (0.1 %)                                             |
| Sandgate      | 825,764                                  | 4,802 (0.6 %)                                             |

Ties are down by more than 99.99 % on Iron District and 99.8 % on Sandgate, near-ties by 99.1 %
and 97.2 %. No pixel went against the order the scan gave.

What is left:

- **Near-ties in single views.** Half of Iron District's remaining near-tie pixels come from
  three spots: 6,038 px in the foundry (an ordered pair seen at so flat an angle that the
  software renderer's 1/16-pixel vertex grid outweighs the offset), 3,237 px in the tunnel (the
  camera stands in the plane of a face; the count is the same without the layers) and 3,071 px
  on one Upper Town wall in one view.
- **Props.** The third-party prop models (containers, the forklift, crates) have thin
  double-sided parts of their own, and their instanced copies are not layered. 3,049 of
  Sandgate's 4,802 unordered pixels are inside one forklift seen from close by; the before and
  after pictures of its worst view are the same to the eye.
- **Edges.** 50,138 tied pixels on Iron District and 37,166 on Sandgate lie in single lines,
  where a face inside a wall meets the wall's surface along an edge (169,421 and 72,050
  before). A layer cannot part faces that are not in one plane. It is a line one pixel wide.
- **Unsettled orders.** 17 m² on Iron District and 83 m² on Sandgate, mostly where an instanced
  prop would have to be laid on something (instanced meshes are drawn whole).

### The offset

`UNITS = 4`, `FACTOR = 0.1` per layer, with a polygon offset's meaning. The slope term does most
of the work: a rasteriser snaps vertices to a sub-pixel grid, so two faces in one plane come out
apart by a fraction of the plane's own depth slope. Measured on a sample of both maps: a factor
of 0.035 leaves patches fighting, 0.05 settles them, 0.1 is the value shipped. It is kept that
small on purpose. A face on a layer is drawn over anything that stands less than `FACTOR` pixels
of the surface's depth in front of it: at 0.5 the layers took trim that stood clear of the wall
(33,306 pixels in a quarter of Iron District's views, against 3,887 in all of them at 0.1).

SwiftShader snaps to 1/16 of a pixel. Graphics cards use 1/256, so they need less.

Faces a hair apart are ordered by which is in front, not by size. Each mesh is stored on its
own grid, so faces modelled in one plane come out up to a few tenths of a millimetre apart, and
from close by the one in front is the one drawn. It stays the one on top at every range.

## 2. Bots

A route is a chain of half-metre steps in eight directions. Every bot on a route headed for the
same next step and was pushed off it by the others: they zig-zagged, jostled for one cell and
stood inside each other. A human running with them was pushed the same way.

`src/lib/fps/bomb/bots.ts`:

- A bot heads for the farthest step of its route it can walk straight to (`navClear`, up to
  4 m ahead), so it runs in lines and turns once at a corner.
- Each bot keeps to its own side of the route, 0.8 m out by its role this round, as far as the
  walk graph allows, and comes back to the line where the route narrows and at its end.
- Teammates, a human's too, are given room sideways, smoothly, and a bot slows behind one it
  would otherwise run into, instead of pushing through.

Measured over six rounds with ten bots (`scripts/fps/bot-motion/run.mjs`), moving bots only:

| Map           |        | Inside a teammate (within 0.6 m) | Within 1 m | Change of direction | Zig-zag steps | Turning of the view | Plants | Kills |
| ------------- | ------ | -------------------------------- | ---------- | ------------------- | ------------- | ------------------- | ------ | ----- |
| Sandgate      | before | 9.3 % of the time                | 13.5 %     | 8.78 rad/s          | 13.6 %        | 0.96 rad/s          | 6      | 45    |
|               | after  | 0.8 %                            | 3.1 %      | 0.71 rad/s          | 4.0 %         | 0.61 rad/s          | 6      | 43    |
| Iron District | before | 4.3 %                            | 11.3 %     | 7.34 rad/s          | 12.6 %        | 0.92 rad/s          | 6      | 41    |
|               | after  | 0.5 %                            | 2.8 %      | 0.74 rad/s          | 4.0 %         | 0.60 rad/s          | 5      | 40    |

A bot now slows behind a teammate 2 % of its running time (0.1 % before): that is the following
instead of pushing through. Bots that walk by design (about a third, by role) still walk.

`tests/fps-bomb-bot-motion.test.ts` holds these on both maps.

## Not verified

- **On a graphics card.** The counts are from a software renderer. The order the layers fix is
  the same on any card; how much offset a card needs is argued above, not measured.
- **By eye in a match.** The before and after pictures are still frames from the map capture
  tool, without players.

## Tools

- `node art/blender/map06/find_coplanar.mjs <map.glb> [--layers=<mapId>:<table>] [--plan=<out>]`
  (`--why=a,b` explains what it made of two triangles).
- `node scripts/fps/map-capture/flicker.mjs <mapId> <views.json> <plan.json> <out.json>
[--no-layers] [--compare] [--raw]`; views from `PITCH=1 sweep-views.ts`.
- `node scripts/fps/map-capture/capture.mjs <mapId> <outDir> <views.json> [--no-layers]` for
  before and after pictures.
- `node scripts/fps/bot-motion/run.mjs`.

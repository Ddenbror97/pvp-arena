# Render and frame-cost audit: Dustfront vs FROSTLINE, CROSSFIRE (and LOST TRAIL)

Goal: smooth play on weak and strong PCs and Macs. Dustfront is the reference ("perfect").

## Method

- **Static scene, per map:** `scripts/fps/map-capture/capture.mjs <map> <out> compare-<size>.views.json`
  on SwiftShader (software rendering, 960×540, 4× MSAA): draw calls and triangles of the map
  (no players, no viewmodel) and frame time, the median of three frames after a warm-up frame.
  Each frame ends in a 1-pixel `readPixels`: `gl.finish()` returns at once under
  ANGLE/SwiftShader, so the earlier capture timings mostly measured something else. Fixed in
  `entry.ts`.
- **Cost breakdown:** the same frames with each material hidden in turn (temporary hook, not
  committed), and FROSTLINE with and without its snowfall.
- **Full game:** `tests/e2e/fps-frostline-perf.spec.ts` results already in this folder
  (`*-perf-chromium-*.json`: real renderer with both players and the viewmodel).
- **CPU:** server and practice simulation per tick (movement, shots, bot, visibility, client
  prediction replay) for 6,000 ticks per map in Node.

## Results

Static scene (player-height views; CROSSFIRE's mid-arena views are left out because the
centre of that map is inside the helicopter wreck):

| Map        | Draw calls | Triangles | Software frame | vs Dustfront |
| ---------- | ---------- | --------- | -------------- | ------------ |
| Dustfront  | 43–55      | 21–26 k   | 0.74–1.09 s    | 1×           |
| FROSTLINE  | 54–67      | 49–58 k   | 0.90–1.45 s    | 1.2–1.3×     |
| CROSSFIRE  | 61–63      | 52 k      | 1.11–1.44 s    | 1.3×         |
| LOST TRAIL | 109–161    | 200–258 k | 2.8–3.7 s      | about 3.5×   |

Full game (perf spec, same harness): Dustfront 84 calls / 159 k triangles, FROSTLINE 103 /
240 k, CROSSFIRE 91 / 185 k. Most of the triangles are the two operators and the viewmodel,
which are the same on every map.

CPU per simulation tick: Dustfront 0.19 ms, FROSTLINE 0.21 ms, LOST TRAIL 0.19 ms, CROSSFIRE
0.42 ms (199 solids against Dustfront's 71, all linear scans). At 30 ticks a second that is
about 1% of one core, so not a bottleneck even on a slow laptop.

## What was checked and found fine on FROSTLINE and CROSSFIRE

- **Textures:** the same sizes as Dustfront (512–1024 px WebP, no 2048s), 35–38 per map against 26.
- **Materials:** the same PBR set as Dustfront. Alpha-tested materials: banners, decals, palm
  leaves and pad markings only.
- **Draw calls:** static meshes are merged per material, about 60 draws, culling not needed at
  this size.
- **Lights:** sun plus hemisphere only (lamps and windows are emissive). The shadow map is
  static, 2048 px, rendered once.
- **Shader warm-up:** both lighting variants, both teams and the viewmodels are compiled before
  Ready (`compileAsync`). The one-off reflection capture renders the scene, so map textures are
  uploaded during loading, not at first sight.
- **FROSTLINE snowfall:** with and without it the frame times are the same within noise
  (1,800 sprites of 1–3.5 px, no depth writes, self-halving when frames are slow).
- **CROSSFIRE helicopter:** 11.5 k triangles, double-sided. Cheap on a real GPU; it only shows
  up when the camera is inside it.

## Changes in this pass

- **One render configuration (owner's decision, later the same day).** The Graphics setting
  (High / Low) is gone from Settings, `StrikeSettings`, the renderer and the map environments;
  a stored `graphics` value is ignored. The single configuration is what High was:
  - framebuffer at most 1.25 pixels per CSS pixel and 1.5 MP per frame (`RENDER_CAP` in
    `presentation.ts`), 4× MSAA: a 1080p window renders at about 0.85×, a 1440p Retina
    window at about 0.64×;
  - the adaptive scale on top: after 1.5 s with more than 5% of frames over 18.5 ms the
    scale drops 0.1 (floor 0.6×); eight consecutive fast windows raise it 0.1. This is not a
    quality preset: it is automatic, per machine, and the only thing it changes is the
    framebuffer size;
  - full scenery on every map (LOST TRAIL's background forest is now its baked backdrop plus
    the real trees inside ±33 m, so there is no longer a cheaper variant to thin).
    Earlier the same day Low had briefly been given a 1×/1.0 MP cap; that is gone with it.
- **Capture timing** fixed (readback instead of `gl.finish()`), median of three frames.
- `compare-48x40.views.json` for CROSSFIRE-sized arenas.

## Remaining bottleneck

LOST TRAIL: leaf-card fragments. After its second pass (trimmed cards, baked forest backdrop;
`docs/FPS-LOST-TRAIL.md`) it is about 3.5× Dustfront's static-scene frame cost in software
rendering (was about 11× when this audit was written), with 1.7× Dustfront's overdraw.
FROSTLINE and CROSSFIRE are within 1.2–1.3× of Dustfront.

Still to do: real-GPU timing (Chrome, Safari, Firefox) on a weak laptop and a Mac with the
perf spec at `MAP_PERF_SCALE=30`.

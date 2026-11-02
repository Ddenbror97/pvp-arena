# FPS performance: final validation before merge (2026-11-02)

Scope: branch `fps-single-render-config` and the performance work already on main (LOST TRAIL
fixes and passes 1–2, render audit). Nothing merged.

## 1. Code review

- **Single render configuration.** One framebuffer cap (`RENDER_CAP` in `presentation.ts`: at
  most 1.25 framebuffer pixels per CSS pixel and 1.5 MP per frame, 4× MSAA) for every map, plus
  the adaptive scale. No High/Low left in `src/`, `tests/`, `scripts/` or the LOST TRAIL build
  (searched: `graphics`, `GraphicsQuality`, `setGraphicsQuality`, `setQuality`, `applyQuality`,
  `backgroundBatches`, `RENDER_CAPS`, `LOW_KEEP`, `"low"`; the only matches are unrelated
  poker, chat-moderation and SEO code). A stored `graphics` setting is ignored.
- **One pipeline for all four maps.** Same renderer, loader (`createArenaEnvironment`), static
  shadow map, reflections captured once, frozen matrices, per-section culling. Map factories
  only add scenery effects on top: FROSTLINE snowfall, LOST TRAIL foliage wind / alpha-to-
  coverage / water scroll / backdrop material. No per-map rendering system.
- **No added per-frame work.** The frame loop reuses its scratch objects, does no scene
  traversal and no React state updates; the HUD updates at most every 250 ms unless something
  important changes. LOST TRAIL's backdrop is one extra draw; foliage render order is set once
  at load.
- **Adaptive resolution: an oscillation found and fixed.** The scale dropped 0.1 after a
  1.5 s window with more than 5% of frames over 18.5 ms and rose 0.1 after 8 fast windows
  (12 s). On a GPU at the boundary between two steps that cycles forever: up, 1.5 s of slow
  frames, down, wait 12 s, repeat. Simulated 10 minutes at three GPU speeds: 29–31 resizes
  (one every ~20 s) and 3.9–4.2% slow frames. Now a scale that proved too slow is retried
  only after a wait that doubles with each failed retry (12 s, 24 s, 48 s … 3.2 min), and the
  wait resets once that scale holds for a minute. Same simulation: 5–7 resizes, front-loaded,
  1.7–1.9% slow frames. Steps are rounded to tenths. Unit tests: no oscillation at the boundary,
  full recovery when the load eases (`tests/fps-presentation.test.ts`).

## 2. Real-GPU measurement

Hardware available: the owner's MSI laptop, **NVIDIA GeForce RTX 2050 (laptop)**, Windows,
Direct3D 11 via ANGLE, Chromium 152 inside the Claude desktop app, 144 Hz display, device pixel
ratio 1.25, plugged in. **No AMD GPU, no separate Intel-integrated run and no other lower-end
machine were available**, so those are not measured. (The laptop's integrated GPU is not
selectable from here: Windows assigns the browser to the NVIDIA GPU.)

Tool: `scripts/fps/gpu-bench` (built page, published privately and opened on that laptop): the
game's own renderer and simulation, both players moving and shooting (practice bot vs a
scripted player: strafing, walking, turning, 0.4 s bursts every 1.6 s), shots, impacts,
muzzle flashes, casings, deaths and rounds through the real code; 1920×1080 window, so the
framebuffer is at the 1.5 MP cap (scale 0.867); 4 s warm-up, 20 s sampled per map; the
adaptive scale does not move without pointer lock, so every map renders at the same size.

| Map        | Avg FPS | 1% low | 0.1% low | Frame p50 / p99 | CPU p95 | GPU p95 | Draws | Triangles | GPU geo / tex | JS heap | Load  |
| ---------- | ------- | ------ | -------- | --------------- | ------- | ------- | ----- | --------- | ------------- | ------- | ----- |
| Dustfront  | 144     | 139.0  | 135.1    | 6.9 / 7.1 ms    | 1.8 ms  | 1.3 ms  | 87    | 152 k     | 130 / 63      | 66 MB   | 2.3 s |
| FROSTLINE  | 144     | 139.8  | 135.7    | 6.9 / 7.1 ms    | 1.7 ms  | 1.3 ms  | 103   | 185 k     | 141 / 72      | 89 MB   | 1.7 s |
| CROSSFIRE  | 144     | 140.0  | 137.6    | 6.9 / 7.1 ms    | 1.6 ms  | 1.3 ms  | 98    | 180 k     | 137 / 79      | 65 MB   | 2.0 s |
| LOST TRAIL | 144     | 138.0  | 131.0    | 6.9 / 7.1 ms    | 2.0 ms  | 1.6 ms  | 184   | 382 k     | 158 / 77      | 95 MB   | 1.7 s |

Repeat runs of Dustfront on the same machine: 1% low 139.6, CPU p95 1.5–2.0 ms, GPU p95
1.3–1.4 ms (run-to-run spread).

Reading: every map is held at the display's 144 Hz with the same frame-time distribution. The
GPU spends 1.3 ms per frame on Dustfront, FROSTLINE and CROSSFIRE and 1.6 ms on LOST TRAIL
(about 1.2×), out of the 6.9 ms a 144 Hz frame allows. On this GPU there is roughly 4× headroom
on every map. The software-renderer ratios used earlier (LOST TRAIL ≈ 3.5× Dustfront) overstate
real-GPU cost: SwiftShader has no early depth rejection and rasterises on the CPU.

Not valid: the second cycle of the first run and the whole second run on the laptop. The
browser panel was hidden part-way (the Claude app shows one side panel at a time), and the
browser then throttles the page to one frame per second. Those rows are excluded; the page
now records whether it was visible and focused for each sample.

## 3. Gameplay, map switching, long session

- Gameplay under load: the benchmark plays real rounds on every map (scores and rounds advance;
  shots, hits, deaths, round restarts) through the real renderer and simulation.
- Map switching and repeated matches: GPU geometries and textures return to the same counts
  after every map switch; JS heap stays flat across cycles (§6).
  The existing checks pass: `fps-lifecycle.spec.ts` (repeated SPA arena mounts release
  resources and input listeners) and the four-map lifecycle capture (0 leaks).
- Not covered: two human players on two machines over the network (the benchmark runs both
  seats locally). Networking code is unchanged by this work.
- There are no explosions in the game (no grenades or explosive weapons); effects covered are
  muzzle flash, smoke, shell casings, bullet impacts, blood and the death presentation.

## 4. LOST TRAIL: further optimisation

Investigated and not implemented. On the real GPU LOST TRAIL renders at 1.2× Dustfront's GPU
time and the same frame rate and lows. Every remaining lever (fewer leaf cards in the forest
edge, a closer backdrop, cheaper leaf shading) changes how the forest looks, and the brief
requires a measurable benefit: none would show on this hardware, which holds 144 Hz with ~4×
headroom. If a weaker GPU (integrated graphics) proves not to hold frame rate, the adaptive
resolution scale will absorb it first; a further pass should then be driven by measurements
from that machine (`scripts/fps/gpu-bench`).

## 5. Tests

Unit suite 1182 passed, 1 skipped; TypeScript and ESLint clean; e2e `fps-settings` and
`fps-lifecycle` pass; four-map lifecycle 0 leaks.

## 6. Long session (software renderer, resource counts only)

The benchmark page in headless Chromium (SwiftShader): three cycles of all four maps, each
mounted, played and disposed in turn. Frame times there mean nothing; resource counts do.

| Map        | Draws (c1 / c2 / c3) | GPU geometries  | GPU textures | JS heap (MB)       |
| ---------- | -------------------- | --------------- | ------------ | ------------------ |
| Dustfront  | 82 / 82 / 82         | 122 / 122 / 122 | 60 / 60 / 60 | 68.8 / 72.7 / 72.9 |
| FROSTLINE  | 97 / 97 / 97         | 133 / 133 / 133 | 69 / 69 / 69 | 75.4 / 69.0 / 63.5 |
| CROSSFIRE  | 91 / 91 / 79         | 129 / 129 / 129 | 76 / 76 / 76 | 80.7 / 61.8 / 70.8 |
| LOST TRAIL | 186 / 185 / 186      | 150 / 150 / 150 | 74 / 74 / 74 | 70.5 / 71.8 / 81.6 |

GPU resources are identical every cycle; the heap moves with garbage collection, with no
upward trend over twelve map loads. (CROSSFIRE's draw count varies with where the scripted
player is looking.)

# Project Island surface quality

The ground keeps its existing 1024 px albedo / 512 px normal tile arrays and nearby normal
mapping. A 2048² mipmapped aerial albedo replaces distant flat colour blends with the same
credited tile materials, softer land-cover transitions, and restrained field variation.
`ground-style.ts` supplies the same palette to both the runtime and offline bake. Mountain
weathering no longer uses evenly spaced sinusoidal bands.

Leaf cards use matte, depth-writing cutouts and MSAA alpha-to-coverage. Their shading normals
receive broad skylight instead of producing black backs. Opaque bark stays unchanged. This
also removes the pine transparent material's extra back/front render pass; no trees, cover,
model geometry, LOD thresholds, view distances, resolution, or gameplay rules are removed.
The existing single graphics configuration and adaptive render budget are unchanged.

## Rebuild and validate

After changing land cover, the ground palette, the source tile strip, or `ground.json`:

```sh
node scripts/br/bake-surface.mjs
npx vitest run tests/br-surface-quality.test.ts tests/br-terrain-lod.test.ts tests/br-vegetation.test.ts tests/br-fairness-boundary.test.ts
```

Commit both `surface-v1.webp` and `surface-v1.json`. The latter records source/palette/output
hashes so tests detect a stale bake. JSON source hashes use parsed data, so Windows/Linux
line endings and whitespace do not invalidate a correct bake; binary source and output hashes
remain byte-exact. The texture's rows follow the heightfield's north-to-south order
(`flipY: false`). Its channels use the same approximate square colour decoding as the
existing terrain tiles. The original source credits also apply to the derivative image.

## Cost and limits

The atlas adds about 1.2 MB transferred and 21.3 MiB of uncompressed RGBA8 mipmapped GPU memory.
It replaces the far colour loop with one texture sample; there are no new terrain draw calls
or per-frame texture generation. It streams with the existing ground assets, with the previous
palette fallback if unavailable. A late load is disposed if the terrain has already unmounted.

This improves the existing island's surface rendering. It does not add H1Z1 assets, rebuild its
terrain geometry, or imply the same production assets/visual fidelity as that game.

## Matched visual/performance checks

```sh
node scripts/br/surface-review.mjs control --baseline=c17ff93f
node scripts/br/surface-review.mjs result
```

The harness uses the existing real-island explorer renderer in native Chrome/D3D11 at a fixed
1280×720 buffer. It captures an 800 m insertion view, ground-level meadow, and Iron Peaks.
It measures 180 frames after 60 warm-up frames per scene, recording frame time, CPU submission,
draws, triangles, tree/prop counts and GPU identification, with PNGs and JSON under
`.wrangler/br-surfaces/`. The baseline switches only terrain/vegetation renderer modules back
to the given commit; other dependencies and world assets stay identical. These are local,
fixed-view samples, not sustained live-combat, all-hardware, or cross-browser guarantees.

The 2026-11-05 comparison used Intel UHD through ANGLE/D3D11. Mean frame times were 6.98→6.94 ms
(aerial), 10.54→9.47 ms (meadow), and 6.94→6.95 ms (Iron Peaks). The elevated views were capped
near the display's 144 Hz refresh, so these do not demonstrate a higher maximum FPS. Each view
kept the same terrain triangles, tree/prop counts and render buffer, and used one fewer draw
call after the foliage pass change. CPU submission times varied between runs; no general CPU
speedup is claimed. The native full-arena recovery harness also restored WebGL successfully
without JavaScript errors.

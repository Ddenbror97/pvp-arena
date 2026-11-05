# Project Island renderer profile

Runs the real BR renderer and island assets on local Chrome with native D3D11, using fixed airfield and Northstar Town viewpoints at Medium and Ultra. No authentication, live room, wallet or database is involved.

From the repository root:

```sh
node scripts/br/render-profile/capture.mjs baseline
node scripts/br/render-profile/capture.mjs current
node scripts/br/render-profile/capture.mjs recovery --recover-only
node scripts/br/render-profile/capture.mjs crowd --visibility-only
```

`baseline*` labels load the two modified renderer modules (`br-arena.ts` and `br-viewmodel.ts`) from commit `92c7b373`. Other labels use the working tree. The transform helper is used only by the working-tree arena. Keep the other renderer dependencies/assets identical when comparing versions.

Outputs are in `.wrangler/br-profile/`: JSON timings, V8 CPU profiles, the bundled harness and screenshots. Each of the four scene/quality combinations captures 360 frames after warm-up. The recovery check forces a WebGL context loss, restores it and verifies rendering resumes.

The harness:

- Uses actual character, weapon, terrain, building and tree renderers.
- Feeds deterministic warm-up snapshots and acknowledges inputs with three ticks pending, avoiding an artificial prediction backlog.
- Completes the one-off tactical-map generation before timing.
- Holds the render buffer at the initial 1280 × 720 size **in the harness only**. This prevents adaptive resolution from making a faster run by drawing fewer pixels. Production render-budget behavior is untouched.
- Records frame times, CPU render-call duration, selection time, draw calls, triangles, render-buffer size and GPU identification.
- Samples JavaScript with Chrome's profiler. Render-call duration includes CPU submission and matrix work; it is not a GPU timer measurement.

Some necessary dynamic transform work moves before the render call. Use the full frame-time result to assess net improvement, rather than treating the render-call reduction as the total CPU saving.

Compare draw calls, triangles, texture/geometry counts and render-buffer dimensions as well as timings. Inspect both screenshots. These fixed-view samples isolate renderer overhead; they are not a live 100-player match, combat-load, all-browser or sustained thermal benchmark. Native browser/GPU scheduling introduces timing variance.

## Transform ownership

The island's Object3D transforms are composed after loading; its per-instance buffers and shader uniforms continue updating normally. `updateSceneRoots` refreshes visible moving roots, including their complete character/bone subtrees. Invisible pooled roots are refreshed as soon as they are revealed. The weapon view camera already updates its hierarchy, so its render pass does not repeat the same walk. GPU timer queries run while the developer overlay is visible.

No texture resolution, model/character count, LOD threshold, view distance, terrain setting, material, lighting or gameplay visibility rule is reduced by these changes.

`--visibility-only` rotates through a crowded 24-bot fixture, alternating crouched/standing poses, in the full BR arena. Every received
bot must retain either a full operator rig or its existing instanced stand-in throughout the
rotation. It also checks that a real keyboard gesture resumes the shared BR AudioContext,
without requiring another canvas click. Interest redaction timing is checked separately by
`tests/br-remote-visibility.test.ts`; no grace period reveals a server-hidden bot.

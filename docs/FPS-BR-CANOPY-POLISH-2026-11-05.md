# Project Island canopy and water-depth polish

## Findings and changes

The world camera spans 0.1–14,000 metres (up to 16,000 with view distance). Ordinary perspective depth loses precision at aerial ranges, allowing near-equal shoreline/terrain/water depths to compete as the camera moves. The previous physical shoreline mask remains useful but does not solve that depth-buffer limitation. The water's level, terrain LODs, texture resolution and visible range are preserved.

Enable Three.js logarithmic depth on the BR renderer and the island explorer. Standard materials, including the terrain and water's modified standard shaders, retain Three's depth chunks. The first-person weapon camera remains separate. No new render pass, texture, geometry or graphics preset is added. This setting is confined to BR; the 1v1/5v5 renderers are unchanged.

Canopy throttle uses an exponential 0.45-second response instead of the former approximately 0.8-second response. Low-speed turns tighten; fast dives turn more widely. W/S remain glide/brake, A/D steer and the mouse remains free look. Maximum glide/dive speeds stay unchanged. Client prediction and Worker authority use the same `stepDrop` implementation.

The former dive clamp could instantly change sink speed from approximately 34 to 6.5 m/s at 45 m AGL. Recovery now blends in below 100 m and caps sink speed using braking distance (`v² = u² + 2as`), reaching a safe final flare progressively. Visual dive pitch and canopy pose follow actual sink velocity, so holding Dive near the ground no longer shows a full dive after recovery. Camera banking and pitch use exponential damping. On-foot jumping is untouched.

## Research boundary

Activision's [Warzone Parachute Techniques](https://blog.activision.com/call-of-duty/2020-05/Warzone-Parachute-Techniques) documents free look, the choice between glide and faster descent, and landing control. It does not publish exact canopy acceleration or steering coefficients. Those are this game's tuning choices, not claimed Warzone values. This polish retains the existing always-open canopy design rather than adding Warzone's cut/redeploy mechanic or confusing its parachute with later wingsuit modes.

Three.js documents logarithmic depth for scenes with large scale differences in [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Fragment-depth writes can affect early depth rejection, so native rendering was checked before release rather than assuming the setting is free on every GPU.

## Reproducible checks

Run `node scripts/br/surface-review.mjs <label> --shore`; pass `--baseline=5a337a67` to compile the prior renderer. Both use the production 0.1 m camera near plane, 1280×720, identical assets, 240 frames per angle and alternating ±2 cm camera translations. The water-colour mask changes include legitimate shoreline-edge motion; zero is not an appropriate target for a moving camera.

On this workstation's Intel UHD / D3D11 Chrome renderer:

- Aerial shore: unstable water-colour pixels per comparison 786 → 54 (93% reduction); frame interval 17.53 → 17.27 ms.
- Lake: 20 → 19; frame interval 17.78 → 17.46 ms.
- Shallow/grazing shore: 392 → 148 (62% reduction); frame interval 17.73 → 17.12 ms.
- Draw calls, triangles, textures and program counts unchanged at each angle (107/96/142 calls respectively). No shader/browser errors.

These are fixed-scene measurements on one machine, not a promise of universal FPS or a player-match latency measurement. The actual BR client also rendered with zero browser errors and successfully recovered from a forced WebGL context loss. Existing drop tests cover safe landing, glide reach, free look, dive speed and step-size consistency; new tests cover prompt throttle, symmetric steering and continuous flare recovery.

All 150 BR checks passed across the suite and the isolated load check. The initial random-room load runs exceeded the 12 ms p99 wall-time budget (18.49 ms alongside graphics checks, 14.68 ms isolated). Room IDs also seed the simulation, so random IDs were changed to three fixed scenarios for a reproducible comparison, without relaxing the limit. On those identical scenarios the prior authority measured 4.18 ms mean / 11.38 ms p99; the new authority measured 4.28 ms mean / 11.93 ms p99 over 23,553 tick requests. These include local request overhead, not just Worker CPU. Full-match, insertion, reconnect and two-player visibility checks passed in the suite. Typecheck, targeted lint and the production build passed.

Native Chrome also exercised keyboard inputs in the actual client with a local shared-simulation authority: W reached 12.81 m/s after 1.5 s, D changed the flight direction, mouse free look left the heading unchanged, and Ctrl reached 29.74 m/s down after 1.2 s. First/third-person views were captured without browser/shader errors. This is a browser control check, not an authenticated production match.

Deploy the match Worker and site together because canopy prediction and authority share the new flight coefficients. No database migration or aim-map rotation change is required.

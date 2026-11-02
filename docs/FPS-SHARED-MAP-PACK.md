# Shared FPS map pack

Every registered map uses the same engine. A fourth map adds data and presentation; it must not copy the simulation, network transport, opponent presentation, character rig, input timing or audio controller.

## Shared gameplay and latency

- Match admission selects a registered map on the server and fixes its mapId for the entire match. Unknown ids fail instead of silently loading Dustfront.
- workers/fps/index.ts uses the same strict session checks, fixed simulation cadence, immediate trigger handling, command timing, hit rewind and redacted snapshots for every map. Hyperdrive and placement belong to the Worker, not a map definition.
- renderer.ts and presentation.ts supply the same adaptive opponent playback, motion continuity, frame-rate-independent camera, crouch and jump presentation. Each collision/prediction/visibility call receives the match's resolved map. Map factories only dress the environment.
- All characters, world weapons, wrist/finger grips and hit volumes are shared. Map art must not replace a character controller or install a competing update loop.
- Environment extensions retain the shared loader, culling, frozen static transforms, one static shadow capture, bounded effects and disposal. Snowfall is GPU animated and kept out of reflection/shadow passes; jungle quality changes only its background batches.

## Box jumping on every map

The one predictMovement implementation is used by client prediction and the match server. JUMP_SPEED=6.8 m/s and GRAVITY=14 m/s² clear approximately 1.54 m at the fixed tick. Ground-level cover of 1.3–1.45 m is reachable with an open approach and headroom. A 2.2 m box cannot be jumped directly from the ground. STEP_HEIGHT remains 0.35 m, and a takeoff cannot gain an extra stair boost. Never implement map-specific jump impulses or camera gravity.

Gameplay box extents must match the render surfaces. Keep a free approach and a clear standing space above any crate meant to be climbable. The shared contract test attempts every accessible ground-level low crate on every registered map.

## Author sound materials as map data

Footsteps are independent of bullet/impact materials. In a map definition, optional footsteps metadata supports:

- floor: snow, dirt, concrete, metal or wood;
- tops: a dictionary from existing solid id to the material underfoot on its top (for example snow on a metal container);
- regions: ordered x/z rectangles (x, z, w, d, surface) for sheltered or cleared ground within the default floor.

A real box top keeps its physical material unless explicitly overridden. Ground regions never turn a wooden crate into concrete. Metadata validates once when the registry compiles; unknown solid ids and invalid materials fail early. No duplicate collision boxes are needed for sound.

Dustfront uses concrete ground with wooden and metal solids. FROSTLINE uses snow outside, concrete in the covered loading bay, snow on exposed roofs/crates, and wood on uncovered bay pallets. LOST TRAIL uses dirt ground; its bridge, logs and crates retain wood.

The shared footstep-surfaces lookup runs on a grounded stride on the server. Events carry the surface, server time, gain and coarse audible bearing. Hidden source coordinates are removed. The same audio controller aligns steps to the displayed opponent, follows current mouse-look orientation, suppresses stale/duplicate steps and keeps Shift walking silent. Four variations per material are baked once from existing samples, with no extra downloads or per-frame synthesis; voices and pending steps stay bounded.

## Registering map four

1. Add a plain MapDefinition under src/lib/fps/maps and one entry in catalog.ts. Supply boxes, barriers, spawns, bot routes, presentation and optional footsteps metadata.
2. Supply the model URL and loading art through the existing registries. Extra effects belong in the map environment factory and must dispose cleanly.
3. Run tests/fps-shared-map-contract.test.ts: every catalog map is automatically checked for prediction/server parity, grounded sounds, silent walking and crate jumps. The fourth-map metadata fixture also checks the default shared sound path.
4. Keep the strict twenty-second bot-reveal checks, map collision/visibility tests and renderer resource/performance checks. Dustfront-specific coordinate fixtures explicitly select Dustfront; map-independent tests cover every registered map.
5. Deploy the production-generated match Worker config before or with the app. Rotation flags are a separate release decision. Verify /health maps and rotation against the intended catalog.

Browser fixtures import tests/fixtures/three.ts so loaders, cameras and assertions use the same Vite-resolved Three instance as the game. Direct node_modules/three imports can create a second class identity and produce false empty-mesh/camera checks in development.

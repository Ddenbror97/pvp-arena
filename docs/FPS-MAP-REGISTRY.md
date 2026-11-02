# PvPStrike map registry

Branch `fps-map-registry`. One engine, any number of maps. Dustfront is the only shipped map
and plays exactly as before; FROSTLINE and LOST TRAIL plug in as independent definitions.

## What a map is

A map is a plain-data `MapDefinition` (`src/lib/fps/maps/types.ts`), with no Three.js, so the
browser, the match Worker and tests share it:

| Field | Used by |
| --- | --- |
| `id`, `name` | Match config and state (`mapId`), loading screen. **Ids are permanent.** |
| `rotation` | In the random rotation for new matches (keep a map out until it's accepted) |
| `arena` | Movement rectangle (centred on the origin), bot grid extent, floor |
| `boxes` | Movement **and** bullets/sight (cover, walls, trunks, stairs, platforms) |
| `structures` | Bullets/sight only (e.g. lintels above head height) |
| `walls` | Bullet-only perimeter |
| `barriers` | **Movement only** (new): organic edges, gorges, impassable undergrowth. Bullets and sight pass; the bot grid avoids them |
| `floorSurface` | Ground impact/footstep material (default `concrete`) |
| `spawns` | Seat A/B spawns before halftime (sides swap after halftime as before) |
| `bot` | Practice-bot patrols (openings, enemy-spawn sweep, flanks, regroup), east-side coordinates, mirrored in x for a west spawn |
| `presentation` | GLB URL, lighting/fog/exposure, sky colours, static shadow frustum, camera far plane, blockout tints |

`compileMap()` derives, once at module load, the sets every system uses: `worldSolids`
(boxes, walls, structures, floor, in Dustfront's original tracing order), `movementSolids`
(boxes, barriers) and `worldBounds` (visibility prefilter).

## How every system resolves the same map

- **Random map per match.** The lobby is unchanged. When the match Worker creates a match
  (practice or PvP, on the first admission) without an explicit `map_id`, it draws a map
  uniformly from the rotation with the platform CSPRNG and fixes it in the match state.
  Rematches are new matches, so they draw again.
- An explicit `map_id` in the runtime config (from the match row, `DuelView.map_id`, if a
  future column sets one) always wins.
- The Worker rejects unknown ids (`400 BAD_CONFIG`) and treats a different map for an existing
  room as `409 CONFIG_CONFLICT`. `/health` lists the maps the runtime can simulate (`maps`)
  and the rotation (`rotation`).
- Every init response returns the room's `mapId`. `duelAdmission` hands it to the client with
  the socket ticket, so the match page loads that scene and shows that map's loading screen
  before connecting. A player's page never loads a guessed map: it waits for the ticket or
  the first snapshot.
- `createMatch(…, mapId)` stores `mapId` in the authoritative `MatchState`. Dustfront matches
  leave it absent, so legacy checkpoints and snapshots are byte-for-byte the same shape.
- Server movement, shots, footsteps, anti-wallhack reveal (`revealsOpponent`, `RevealGate`,
  `canSeeOpponent`, trail steps), audio occlusion and the practice bot all call
  `mapOf(state)`. The bot builds one navigation grid per map, lazily, and caches it.
- Snapshots carry `state.mapId` to every client, including after a reconnect. `DuelMatch`
  mounts the arena on `frame.state.mapId ?? ticket.mapId` (finished or open matches: the match
  row, else Dustfront) and remounts if the authoritative id differs from what it loaded. The renderer ignores snapshots for another map.
  Unknown ids show "Reload to update" and never fall back to another map.
- Client prediction, camera motion, opponent bridging, death poses and blood decals take the
  mounted `GameMap`. Low-level helpers (`predictMovement`, `isMovementBlocked`, `traceWorld`,
  `deathSupport`, `createBloodEffects`, `FrameMotion`, `RemotePresentation`) default to
  Dustfront only for tests and tools. **Engine code must always pass the match's map.**
- Rendering: `createMapEnvironment(scene, map)` (`maps/environments.ts`) uses the shared loader
  (blockout from the map's solids, then its GLB, sky dome and shadow flags). A map that needs
  animated water, foliage wind or particles registers its own factory there. Environments may
  expose an optional `update(dt, now)`; static maps omit it, so there is no idle per-frame work.
  The static shadow map, frozen matrices, one-off reflection capture, `compileAsync` warm-up,
  adaptive resolution, the separate weapon pass and asset reference counting are unchanged
  and apply to every map.

## Adding FROSTLINE (or LOST TRAIL)

Branch from `fps-map-registry` (or from `main` once it is merged).

1. **Gameplay solids.** Generate them into their own file, e.g. `src/lib/fps/frostline-layout.ts`
   from `art/blender/frostline/layout.py`, following `art/blender/map/layout.py`.
2. **Definition.** Add `src/lib/fps/maps/frostline.ts` exporting a `MapDefinition`
   (copy `dustfront.ts`):
   - Pick an id (`"frostline"`); it can never change once shipped.
   - Point `presentation.modelUrl` at `/fps/models/frostline.glb`.
   - Set the map's own lighting, sky, shadow extent (cover the playable area), view distance
     and blockout tints.
   - Write bot routes whose points sit on open ground.
3. **Register it.** Add one import and one entry to `src/lib/fps/maps/catalog.ts`. This line
   is the only shared edit, so FROSTLINE and LOST TRAIL merge trivially.
4. **Loading screen.** Add the map's art as a 1672 × 941 WebP in `src/assets/fps/` and one line
   in `src/lib/fps/maps/loading-screens.ts`. It is shown exactly like Dustfront's: the art, the
   map name and the loading bar. All rotation maps' art is preloaded on match intent.
5. **Optional:** add a custom environment factory in `maps/environments.ts` for animated
   effects.
6. **Rotation.** Set `rotation: false` while the map is in progress; set it to `true` once
   accepted. With it `true`, practice and PvP matches can draw it.
7. **Test it.**
   - Add a layout test like `tests/fps-arena-layout.test.ts`, passing your map explicitly.
   - Run `tests/fps-map-registry.test.ts`, `tests/fps-map-runtime.test.ts` and
     `tests/fps-map-dustfront-parity.test.ts`.
   - The parity test asserts that `MAP_IDS` and `ROTATION_MAP_IDS` are `["dustfront"]`. Update
     those lines when you add your map.

Constraints the engine imposes (unchanged):

- Gameplay collision is axis-aligned boxes on a flat floor at y = 0.
- Players step up 0.35 m without jumping; the jump apex is about 0.89 m.
- There are no ramps and no ground below y = 0.
- Every gameplay box is tested by server movement and visibility on every tick, so keep cover
  counts close to Dustfront's (62 boxes) and keep purely visual detail out of the layout.
- Impact surfaces are `concrete | metal | wood`. A new surface (snow, ice, dirt) is an engine
  change: impacts, audio and protocol validation. Coordinate it in one branch.

## Choosing a map

New matches draw from the rotation (above), so no lobby or database change is needed. A
player-chosen map would need a `map_id` column on the match table (a Supabase migration) plus
a lobby picker. Both are deliberately not built.

## Deploying

Deploy the match Worker and the app together. The Worker decides the map, so:

- **New Worker, old app:** the old app loads Dustfront's scene. That is only safe while the
  rotation is Dustfront-only.
- **New app, old Worker:** the old Worker reports no map, so the app plays Dustfront, which
  matches.
- **Unknown map:** an app that doesn't know a drawn map asks the player to reload. It never
  plays a different map.

Deploys where Dustfront is the only rotation map change no gameplay.

## Verification (this branch)

- `tests/fps-map-dustfront-parity.test.ts`: Dustfront's solids, tracing order, floor, spawns,
  lighting, shadow framing, camera range, model URL, bot patrols and match state shape are
  identical to the pre-registry hard-wiring.
- `tests/fps-map-registry.test.ts`: a test-only map (`tests/fixtures/test-map.ts`), registered
  through a mocked catalog. It checks:
  - id resolution and unknown-id refusal;
  - server collision with boxes and barriers;
  - risers;
  - bullets stopping at walls but not barriers;
  - redaction and visibility;
  - map identity through rounds, halftime spawn swap, checkpoint JSON and trail steps;
  - bot patrols and navigation;
  - client prediction and death poses.
- `tests/fps-map-runtime.test.ts`: the real Worker in workerd, bundled with the test catalog.
  It checks:
  - `/health` maps;
  - `map_id` validation and conflicts;
  - map id in both players' snapshots and after a reconnect;
  - server collision against the test wall;
  - redaction behind it;
  - the practice bot on the test map.
- The existing FPS suite runs on Dustfront unchanged. The `fps-runtime` solo-bot test is flaky
  on `main` as well (it failed 3/4 on untouched `main` and 2/4 on this branch). It waits 12 s
  for a randomly routed bot to come into view.

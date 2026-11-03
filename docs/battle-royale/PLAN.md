# Battle Royale "Project Island": technical plan (Phase 0)

Status 2026-11-03. Branch `br-foundation` (from main 116b434). Pushed, not merged or deployed.
Reference research: [RESEARCH.md](RESEARCH.md). Concept map: `art/br/concept/project-island-concept.png`.

## 1. Decisions that override or sharpen the master spec

| Topic | Decision | Why |
| --- | --- | --- |
| Graphics quality | **One render configuration, as in 1v1 and 5v5**: `RENDER_CAP` (1.25 px per CSS px, 1.5 MP) plus the adaptive `RenderBudget` in `presentation.ts`. **No Low/Medium/High/Ultra presets** (the spec's §5 "Graphics presets" is superseded by the owner's instruction). | Owner: "use the adjust quality as for the other maps 1v1/5v5, not different quality modes". Weak machines are served by budgets designed into the content (below) and by the adaptive pixel ratio, never by a menu. |
| Network latency | **The FPS cross-region work applies to the BR** ([FPS-CROSS-REGION-2026-11-01.md](../FPS-CROSS-REGION-2026-11-01.md)): US-East match objects (`FPS_ROOM_REGION` / `locationHint`), the shared lag-compensation bounds (`MAX_REWIND_MS` 280, `MAX_SERVER_DELAY_MS` 200, `REMOTE_DELAY_MS` 110), the bounded command catch-up, per-continent latency telemetry (`latency.ts`), and batched session checks over the persistent Hyperdrive connection. | Owner instruction. Details and what changes at 100 players: §6.5. |
| Money | Free practice only. No entry fees, ledger, deposits or paid matchmaking. Match results are produced by the server in a shape a future, separate settlement service can consume. | Spec §14 Phase 5. |
| Engine | Keep three.js 0.186 / WebGL2, TanStack Start, Cloudflare Workers + Durable Objects, Supabase. | Proven by 1v1/5v5; the benchmark (§6.2) shows a match fits one Durable Object. |
| Isolation | The BR is a new module tree (`src/lib/fps/br/`, a new Worker class, new route). 1v1 and 5v5 code paths are not modified except to share pure helpers. | Spec rule 1, 11. |

## 2. Audit: what exists and what the BR reuses

| Area | Today | BR reuse |
| --- | --- | --- |
| Rendering | three.js WebGL2; one render config (`RENDER_CAP`, `RenderBudget` with hysteresis); ACES, sRGB; shader warm-up before Ready (`compileAsync`); frozen matrices on static scenery. Real GPU (RTX 2050, 1080p): all 1v1 maps at the 144 Hz cap, GPU p95 1.3–1.6 ms. | Same renderer settings, budget and warm-up discipline. New: terrain, water, vegetation and streaming modules. |
| Simulation | `simulation.ts`: 30 Hz fixed step (`TICK_MS` 33.3), axis-aligned box collision (`collision.ts`), shared by client prediction and server. | Same step, weapons (`primary.ts`, `combat.ts`), damage and hit rules. New ground model: heightfield + building box grid (§6.3). |
| Rooms | `DuelRoom` (1v1, strict per-command session reads), `BombRoom` + `BombLobby` (5v5, bots in `bomb/bots.ts`, periodic session checks). Worker `pvpspinarena-fps`, `cpu_ms` 30000, `setInterval` ticks. | New `BrRoom` (one per match) and `BrLobby` Durable Object classes in the same Worker. |
| Networking | WebSocket JSON snapshots at 20 Hz with a physics-step trail, 110 ms interpolation, server-side lag compensation, per-recipient visibility redaction. | Same protocol style, plus interest management (§6.4). |
| Auth / DB | Supabase sessions; `session-auth.ts` checks many sessions in one query (REST, or Hyperdrive when configured). | Same, batched per room. No per-frame database writes; one result write per match. |
| Bots | 1v1 practice bot and 5v5 navigation bots on per-map nav grids. | New BR bot brain on the heightfield (§6.6); reuse aiming/shooting rules. |

## 3. World

- **Coordinates** (`src/lib/fps/br/world.ts`): metres, origin at the map centre, +x east, +z south, sea level y = 0, playable square [-5000, 5000]². Map grid A–J × 1–10, 1 km per cell, identical to the concept map, so "Superstore F9" on the map UI is F9 in the world.
- **Built from the concept map** by `art/br/build_world.py` (deterministic, seed 20261103):
  - `public/fps/br/height.v1.hf` — 2561² heights at 3.906 m, centimetre precision, 2.0 MB (plane-predicted zlib);
  - `landcover.v1.png` — 8 classes at 7.8 m (water, sand, grass, field, forest, rock, urban, road), 186 KB;
  - `world.v1.json` — POIs (15, with flat building pads), lakes with levels, rivers, the two island bridges, two runways.
- **Geography**: mainland with northern mountains (Iron Peaks, snow above ~250 m), Redstone Quarry pit, Old Dam reservoir, rivers and 22 lakes; a strait with two bridges; the southern military island with the Superstore (F9), military base (G7), airfield (I9) and East Works.
- **One source of truth for ground**: the same heightfield file is decoded by the client renderer, client prediction, the server room and the tests (`tests/br-world.test.ts`).

## 4. Client rendering and streaming

### 4.1 Budgets (single configuration, adaptive pixel ratio on top)

| Item | Budget per frame | Phase 1 measured |
| --- | --- | --- |
| Draw calls | ≤ 250 typical, ≤ 400 worst (1v1 maps: 83–191) | terrain + all water: **2** |
| Triangles | ≤ 1.2 M (terrain ≤ 0.25 M) | terrain 44–121 k |
| Shader programs | ≤ 40, all compiled before Ready | 2 |
| GPU memory | ≤ 600 MB | terrain ≈ 30 MB (R16UI heights 13 MB, cover 2×6.5 MB + mips) |
| CPU per frame (render-side) | ≤ 3 ms on mid-range | patch selection 0.1–1.2 ms (headless SwiftShader) |
| Download before first frame | ≤ 25 MB, then streamed | 2.2 MB world data |

### 4.2 Terrain (done)

`terrain.ts` + `terrain-lod.ts`: CDLOD in **one instanced draw call**. A 16×16 patch is instanced per quadtree node; the vertex shader reads exact centimetre heights from an `R16UI` texture. Six levels (3.9 m quads within 430 m, up to 125 m quads), geomorphing, frustum culling against a min/max pyramid. Crack-free **without skirts**: neighbours differ by at most one level and meet on identical vertices. `checkLodConfig` proves this statically; `tests/br-terrain-lod.test.ts` checks it on 60 real viewpoints. Skirts were removed because they z-fought under MSAA and drew dark lines along patch borders.

### 4.3 Water (done)

`water.ts`: the sea and all lakes are one mesh and one draw. Lake rectangles are masked by the land-cover water weight, so shorelines follow the terrain. Proper water shading (normal-mapped waves, depth tint) comes later inside the same draw.

### 4.4 Streaming (next)

- **World cells** of 250 m (40 × 40). A cell's static content (building instances, prop instances, collision boxes) is a small JSON/binary record. Large shared meshes (each building or prop type) are GLBs loaded once and instanced everywhere.
- **Radius rings**:
  - ≤ 300 m: full detail, interiors and doors;
  - ≤ 1.2 km: exteriors, LOD1, no interiors;
  - ≤ 4 km: LOD2 or merged per-POI silhouette;
  - beyond: terrain only, plus hero landmarks (dam, towers, radio mast) as tiny impostors.
- **Priority queue**: current cell, then the travel direction; preload along the plane path and the parachute landing prediction. One GLB in flight at a time on slow links. Decoding happens off the main thread (meshopt/Draco decoder workers, KTX2 transcoder).
- **Unload** after a cell has been out of range for 30 s. Shared geometries are reference-counted; `dispose()` is verified by the lifecycle harness (GPU resources must return to baseline, as for the 1v1 maps).
- **Vegetation is not downloaded per cell.** Trees, bushes and rocks are placed deterministically from land cover + seed, generated on the client per cell, and drawn as `InstancedMesh`:
  - one draw per species and LOD ring;
  - crossed-quad impostors beyond ~350 m;
  - tree collision (trunk cylinders) uses the same placement on the server.

### 4.5 Asset pipeline (in progress)

- **Sources**: CC BY / CC0 Sketchfab models the owner downloads.
- **Inventory**: `art/br/assets/inventory.py` records the licence, triangles, draws and textures for each download, and generates `ATTRIBUTION.md`.
- **Per asset** (Blender on the owner's machine, or glTF-Transform here):
  - normalise scale and pivot to metres and y-up;
  - decimate to the budget below;
  - merge materials into one atlas per kit where possible;
  - textures to KTX2 (UASTC for normals, ETC1S for colour) at ≤ 1K (≤ 2K for hero buildings);
  - meshopt compression;
  - LOD1/LOD2 generated (about 50% and 15%);
  - collision boxes authored or derived per building.

| Class | LOD0 budget |
| --- | --- |
| Small props | ≤ 3 k triangles |
| Large props and vehicles | ≤ 15 k triangles |
| Buildings | ≤ 30 k triangles |
| Aircraft | ≤ 40 k triangles |
| Trees | ≤ 4 k triangles (LOD0) |

## 5. Movement on the island

- **Ground** is `Heightfield.heightAt`, with the maximum climbable slope enforced (≈ 45°; steeper ground slides).
- **Buildings and props** use axis-aligned boxes (the existing `collision.ts` model) stored in a 50 m spatial grid. The swept test only checks the cells the move touches.
- **Water**: below a lake or sea level the player swims (slow, no shooting). Deep water at the map edge is out of bounds.
- **Out of map**: the playable square is clamped by the server.
- **Plane and parachute**:
  - the plane flies a server-chosen line across the island at 800 m, about 100 km/h ground speed shown (time-compressed);
  - after the jump: freefall at 180 km/h (234 km/h diving);
  - the parachute opens automatically 300 m above the ground, or manually;
  - glide at about 54 km/h descent, with steering;
  - numbers from RESEARCH.md §1; the server validates every transition.

## 6. Server: one Durable Object per match

### 6.1 Shape

- `BrLobby` (one): the practice queue and match creation. It fills to 100 with bots after a timeout.
- `BrRoom` (one per match, `locationHint` = `FPS_ROOM_REGION`) owns everything for the match:
  - match lifecycle: lobby, plane, drop, zone phases, end;
  - movement, shots, damage;
  - the zone and gas;
  - airdrops;
  - bots.
- The room loads `height.v1.hf` and the static collision grid at creation (from static assets, about 2 MB, cached in memory for the object's life).
- Nothing per tick is written to the database. One summary row is written per match at the end, idempotent by match id.
- **Reconnect**: the session token plus the match id rejoin the same seat within 60 s. After that the seat is handed to a bot (as in 5v5). Empty rooms tear down after 2 minutes. An alarm-based watchdog ends matches stuck for over 45 minutes.

### 6.2 Cost (Phase 0 benchmark, `scripts/br/bench-room.ts`)

100 players on the real heightfield for 20 s, in Node/V8. The benchmark covers:
- terrain movement;
- bot steering;
- about 40 shots per second, each with a terrain raycast;
- 20 Hz snapshots per recipient, with line-of-sight interest management.

| Players | Mean tick | p95 | p99 | Share of 30 Hz budget | Line-of-sight checks/s | Snapshot per player |
| --- | --- | --- | --- | --- | --- | --- |
| 100 | 3.51 ms | 7.07 ms | 8.3 ms | 10.5% | 14.8 k | 5.3 KB/s |
| 64 | 1.4 ms | — | — | 4% | — | — |

**Verdict:** one Durable Object per match is feasible with headroom. The real room adds building collision, lag-compensation history and gas, so Phase 2 must re-measure in the real runtime and stay under 35% of the tick budget at p99. Mitigations if it does not:
- run line-of-sight for far players at 10 Hz;
- give bots a 15 Hz brain;
- use a binary snapshot encoding.

### 6.3 Ground truth on the server

The server uses the same `Heightfield` and collision grid as the client prediction, so prediction errors come only from latency, never from different geometry.

### 6.4 Interest management and bandwidth

- **Players within 300 m** are always sent.
- **Players from 300 m to 1 km** are sent only with a terrain + building line of sight (checked at 10 Hz and cached between checks).
- **Farther players** are omitted, except in the plane, parachuting, or when relevant to the minimap.
- **Hidden players** are redacted, as in 1v1 (no positions leave the server for players you cannot see).
- **Bandwidth**: about 5 KB/s per player at 20 Hz, or about 0.5 MB/s outbound per room. A compact binary format is planned only if the measured traffic requires it.

### 6.5 Cross-region latency at 100 players

The 1v1 design carries over unchanged where it is per-player:
- edge continent tagging and `fps_region_latency` telemetry;
- RTT challenges;
- `ConnectionTiming`;
- the split rewind bounds;
- the movement catch-up budget (`applyQueuedMovement`, at most 3 per tick).

What changes with 100 players in one room:

- **Session checks are batched per room.** `liveSessions` already checks many identities in one query. The room runs one pipelined read for all humans (at most 4 in flight, at least 25 ms apart), instead of one read per player.
- **Strictness:** practice (free) uses the 5v5 rule, a periodic check (15 s) plus a check on join. **Before any paid BR match**, switch to the 1v1 strict rule: no command received after revocation is applied. The batched read keeps that affordable.
- **Hyperdrive persistent connection.** `session-auth.ts` already supports it. Turn it on for BR rooms first: the room holds the connection for the match, which removes about 50–65 ms of HTTP overhead per read.
- **Telemetry:** per-continent p50/p95/p99 of command delay and RTT, room-wide session-read percentiles, plus tick time p99 and snapshot bytes per player.
- **Regional matchmaking:** prefer filling a lobby with same-continent humans when several practice lobbies are open, and show the lobby's measured ping.

### 6.6 Bots

- Server-side participants in real seats. They jump from the plane, choose landing spots weighted by POI, loot-walk inside the POI, rotate toward the zone along the terrain (with slope and water avoidance from the heightfield), and fight using the existing aim and recoil rules with reaction delays.
- They run at 15 Hz decisions and 30 Hz movement.
- Bots far from every human (beyond 1 km) run a cheap "abstract" update and resolve bot-vs-bot fights statistically. This keeps 90-bot matches inside the CPU budget, as in PUBG and Warzone practice lobbies.

### 6.7 Zone, gas and airdrops

- The zone uses the circle table from RESEARCH.md, scaled to 10 km, with server-chosen centres that stay on land.
- Gas damage per phase is applied in the tick.
- Airdrops are server events: a plane path, a crate falling with a parachute, and a crate entity (contents empty until Phase 5).

## 7. Phases and acceptance criteria

| Phase | Scope | Acceptance (measurable) |
| --- | --- | --- |
| 0 Audit and plan | This document, RESEARCH.md, the benchmark | Benchmark committed and reproducible; plan reviewed by the owner |
| 1 Map foundation | Terrain, water, roads, forests (instanced), POI footprints with first buildings, bridges, collision, walk/fly explorer | `br-world` and `br-terrain-lod` tests green. Explorer on the owner's GPU: ≥ 60 fps at 1080p everywhere, 1% low ≥ 50, ≤ 250 draws, no shader compiles after Ready. Walk the island: no falling through ground or bridges, building collision works. Download before first frame ≤ 25 MB. |
| 2 BR core | Lobby, 100 participants with bots, plane, jump, freefall, parachute, landing, sync | 100-participant room in the Durable Object runtime test: tick p99 ≤ 12 ms. Two browsers see each other's parachutes. Server rejects illegal transitions (teleports, opening below the ground, leaving the plane early). 1v1/5v5 suites unchanged. |
| 3 Survival | Zone, countdowns, gas, elimination, airdrops, winner | Full bot match runs to a single winner in the runtime test. Gas damage and timings match the table. Result row written once. |
| 4 Hardening | Streaming polish, network optimisation, load tests, browsers, leaks | 3 concurrent 100-player rooms. 30-minute match with a flat heap and stable GPU resources. Chrome, Firefox and Edge pass. Per-continent latency within the 1v1 targets. |
| 5 Content (not now) | Loot, vehicles, squads, paid matches | — |

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Durable Object CPU at 100 players with real collision and gas | Measure in the real runtime early (Phase 2 test). Reduced-rate line of sight and abstract far bots (§6.6). Binary snapshots if needed. |
| Asset weight: many downloads are far over budget (the inventory shows the gaps) | Hard per-class budgets, decimation + KTX2 + meshopt, instancing, reject or replace offenders. The streaming radius keeps memory bounded. |
| Weak GPUs without presets | Content budgets sized for mid-range, `RenderBudget` lowers resolution adaptively, impostors for far vegetation, no real-time shadows beyond ~150 m (baked terrain shading for the far field). |
| Shader compile hitches when streaming new materials | One shared material set per kit, compiled before Ready (as in 1v1). New materials are never introduced mid-match. |
| TCP head-of-line blocking on lossy links | Unchanged from 1v1 (no UDP on Durable Objects). Interpolation buffer and trail. |
| Licence mistakes | Inventory gate: only CC BY / CC0 with an author and URL get into the build; `ATTRIBUTION.md` is generated. |

## 9. Phase 1 progress (this branch)

Done:

- **World data:** world builder; heightfield codec (`PIH2`); land-cover codec (`PIC1`, shared by the client and the server); world metadata with building pads (`padRadius`); every building pad has a built-up core.
- **CDLOD terrain** without skirts, with tests.
- **Merged water** (sea and all lakes in one draw).
- **Vegetation** (`vegetation.ts`, `vegetation-renderer.ts`):
  - deterministic placement, shared by the client and the server: 278 k trees on the island, about 100 per hectare in forests, none on water, beaches, roads, building pads or runways;
  - the server gets trunk collision from `forEachTrunkNear`;
  - rendering: 6 instanced draws (3 species × near/far), every tree within 1.5 km drawn for everyone;
  - CPU while moving (`scripts/br/bench-vegetation.ts`): p99 0.8 ms per frame; the cold start is about 60–80 ms (behind the loading screen).
  - Explorer views: 5–20 k trees, 80–370 k tree triangles with placeholder meshes.
- **Fairness boundary test:** gameplay and server code cannot import the renderer, the budget or three.js.
- **Explorer:** captures and static site (`scripts/br/explorer`).
- **Room benchmark.**
- **Research.**
- **Asset inventory:** `art/br/assets/INVENTORY.md`, `ATTRIBUTION.md`, `inventory.py` (rerunnable).

Next:

1. **Process the first asset batches** (military island, airfield, Superstore first) to the §4.5 budgets:
   - fix scale;
   - re-export spec/gloss materials;
   - decimate;
   - atlas;
   - KTX2 + meshopt;
   - LODs.
2. **Replace the placeholder trees** with the processed CC BY trees (and their LODs), and add a far-forest impostor ring (1.5–4 km) so forests read from the plane.
3. **Road network** from land cover.
4. **POI building placement** and the collision grid.
5. **Walking with collision in the explorer**, plus the stress scene and the dev overlay.
6. **Real-GPU run** of the explorer on the owner's machine.

## 10. Owner's performance blueprint: how it maps onto this plan

The owner's "Browser FPS – Foundation & Performance Blueprint" (2026-11-03) is adopted, with three deliberate deviations noted.

| Blueprint item | Here |
| --- | --- |
| Targets: 60 fps minimum, 120 fps on strong hardware, 1080p, 16.6 ms frame | Phase 1/4 acceptance (§7). Reference machine: the owner's RTX 2050 laptop, where the 1v1 maps hold the 144 Hz cap. An Intel iGPU and an AMD GPU are still needed for the low end. |
| Game runtime separate from React | Same as 1v1/5v5: the renderer and loop live in `src/lib/fps` modules. The React route only mounts the canvas, menus and HUD, and receives throttled HUD values (no per-frame React state). The BR runtime lives in `src/lib/fps/br/`. |
| Fixed-step simulation, variable-step rendering | Existing: 30 Hz `TICK_MS` simulation shared with the server, interpolated rendering. |
| Instancing, frustum culling, LOD, batching, atlases, KTX2, compressed geometry | Terrain: one instanced draw, CDLOD, frustum culled (done). Buildings, props and vegetation: instanced per type, LOD rings, KTX2 + meshopt, atlased kits (§4.4, §4.5). |
| Occlusion culling where worthwhile | Cheap version: terrain horizon occlusion per cell (heightfield ray from the camera to the cell's top), plus interiors only within 300 m. No GPU occlusion queries (stalls on WebGL2). |
| Avoid real-time shadows, limit lights, baked lighting | One sun shadow map limited to ~150 m around the player, refreshed at a lower rate for static scenery. Terrain far field uses its own normal shading. No dynamic point lights except the muzzle flash. Building kits use baked AO in the texture. |
| Adaptive resolution with hysteresis and cooldown | Existing `RenderBudget` (scale 0.6–1, failed retries wait twice as long, reset after 1 minute stable). |
| Dynamic scaling beyond resolution | Only for **cosmetic** items, automatically, never in a menu: particle counts, far ground clutter (grass tufts beyond ~60 m), shadow refresh rate. Anything that hides or reveals players (trees, bushes, buildings, view distance, fog) is identical for every player, so slower machines never see more or less than others. |
| PerformanceManager and dev overlay | Extend the existing benchmark tooling: a dev-only overlay (fps, frame ms, simulation ms, GPU ms via `EXT_disjoint_timer_query_webgl2` when available, draws, triangles, visible instances, entities, RTT, loss). The explorer already reports draws, triangles, patches and selection ms. |
| Object pooling and no per-frame allocations | Existing practice (shell casings, impacts, decals). Terrain selection writes straight into the instance buffer (no per-frame objects). The streaming cells reuse instance buffers. |
| Chunking, streaming, separate collision geometry, view distance | §4.4 (250 m cells, rings), §5 (box grid separate from visual meshes). |
| Asset caching, no duplicate loads, disposal | Shared GLB cache with reference counts. The lifecycle harness checks that GPU resources return to baseline (as for the 1v1 maps). |
| Fullscreen (owner requirement) | Same as the other PvP Strike games: a fullscreen button in the match header that fullscreens the match host (canvas + HUD), with overlays (buy menu, map, inventory later) rendered into `document.fullscreenElement` so they stay visible. Pointer lock, the M map and Esc behave as in 1v1/5v5. The resolution budget recomputes on the fullscreen resize (one `resize()` path). |
| WebGL context-loss recovery | New for the BR (the FPS has none today; the pool game does): on `webglcontextlost`, pause rendering (the simulation keeps running); on restore, rebuild the GPU resources from the cached CPU data (heights, cover, instance lists). |
| Networking: authority, prediction, reconciliation, interpolation, interest management, prioritisation, compression, latency/loss monitoring | Existing 1v1 stack plus §6.4/§6.5. Snapshots: nearer and visible players at 20 Hz, far players at a lower rate. Binary packing only if measured traffic requires it. |
| Benchmark map | Add a **stress scene** to the explorer: 100 building sections, 1,000 vegetation instances, 2,000 props, moving entities, particles and a fixed camera path. Its numbers go in the report, and it doubles as the real-GPU page for the owner's machine. |

**Fairness invariants (owner requirement, 2026-11-03).** Adaptive resolution and cosmetic scaling must never affect gameplay, hit detection, visibility or simulation determinism. Enforced by:

- **One-way dependency.** The simulation, movement, collision, hit and visibility code (`simulation.ts`, `combat.ts`, `collision.ts`, `visibility.ts`, `br/heightfield.ts`, and the future BR movement, zone and bot modules) never imports the renderer, `presentation.ts`, the budget or any cosmetic module. An import-graph test fails the build if one does.
- **Server authority.** Hits, damage and line of sight are decided on the server from the heightfield and the collision grid. Rendered resolution, LOD, impostors or culled cosmetics cannot change a result.
- **Same world for everyone.**
  - Cover geometry (trees, bushes, buildings, rocks that block sight or bullets) is placed from the shared seed and collided on the server, identically for all players.
  - Its visual LOD only changes triangle detail, never presence, within the gameplay view distance. Fog and view distance are constants.
  - A test renders the same viewpoint at budget scale 1.0 and 0.6 and checks that the set of drawn cover instances is identical.
- **Cosmetic list is closed.** Only particles, far ground clutter beyond 60 m that does not hide a standing or crouched player, and shadow refresh rate may scale. Each scaler is listed in one module, and adding to it needs this document updated.
- **Determinism test.** The same input sequence through the shared simulation gives bit-identical state regardless of frame rate or budget scale (render-rate independence of the 30 Hz step).

Deviations:

1. **Graphics presets (Low/Medium/High): not built** (confirmed by the owner 2026-11-03). The owner's standing decision is one render configuration for every mode ("use the adjust quality as for the other maps 1v1/5v5, not different quality modes"). Weak machines are handled by content budgets and the adaptive budget above.
2. **Rapier physics: not adopted** (owner agreed). Movement and hits must be bit-identical between client prediction and the Durable Object, and the existing shared TypeScript simulation already is. The island needs only a heightfield plus boxes and capsules, which that code handles. A WASM physics engine would add load size and a second collision model on the server. Revisit for vehicles (Phase 5).
3. **Zustand: not needed.** The runtime is not React state; the few HUD values are pushed at a throttled rate, as in 1v1.

## 11. Owner's backend blueprint: how it maps onto this plan

Adopted with the existing infrastructure; the blueprint's own rule applies: "don't scale before measuring", "don't introduce unnecessary dependencies".

### 11.1 Component mapping

| Blueprint component | Here (and why) |
| --- | --- |
| Dedicated authoritative game server (Colyseus suggested) | **Cloudflare Durable Objects, already in production for 1v1 and 5v5.** One object per match is an isolated authoritative room with its own fixed-step loop, WebSockets (hibernation API), storage and alarms. It is allocated on demand by name, so "automatic server allocation" and horizontal scaling need no servers, containers or orchestration. Colyseus would add a second server stack (Node hosts, Docker, scaling, DDoS) beside the one that works. Revisit only if measured Durable Object CPU (§6.2) cannot hold a 100-player room. |
| Redis (queues, sessions, discovery, temporary state with TTL) | **Durable Objects with SQLite storage and alarms** play this role: `BrLobby` holds the queue and party state with expiry alarms; rooms are discovered by id (no registry); session checks stay in Postgres (strict, §6.5). No Redis until a measured need appears. |
| Supabase | Persistent layer only: auth, profiles, stats, match history, results. **Never** per-tick state, positions or bullets (already the rule in 1v1/5v5). |
| Backend API | The existing TanStack server functions (create/join, tickets) and the FPS Worker's HTTP routes. |
| CDN, DDoS protection, HTTPS/WSS | Cloudflare (static assets, Worker, WebSockets) — already in place. |
| Docker, CI/CD, environments | Workers deploy via wrangler (owner deploys); staging = a separate Worker name + Supabase branch when needed. No containers. |

### 11.2 Checklist status

| Area | Already in the 1v1/5v5 stack | BR work |
| --- | --- | --- |
| Authority | Movement, shots, hits, damage, health/armour, fire-rate and reload clocks, ammo, collision, spawns all server-side; clients send inputs only; client prediction, reconciliation, 110 ms interpolation, lag compensation with split bounds | Same modules; BR movement on heightfield + box grid + trunks; plane/parachute/landing transitions server-validated |
| Message hygiene | 512-byte message cap, 70 messages/s per socket (closes 1008), JSON schema validation, bounded input queues, read-only spectator sockets, session expiry checks | Same caps in `BrRoom`; per-socket backpressure: skip a snapshot for a socket whose buffered amount is high instead of queueing |
| Sessions | Ticket-based join, duplicate-session handling, strict revocation (1v1), periodic checks (5v5), Hyperdrive-capable batched reads | Batched per room (§6.5); one seat per user per match; a second connection replaces the first |
| Matchmaking | Duel queue (DB), `BombLobby` (5v5) | **Generic mode config** (`{ mode, minPlayers, maxPlayers, teamSize, fillWithBots, readyTimeout, regionPreference }`) used by `BrLobby`; 1v1/5v5 keep their working queues and can adopt the config later without behaviour change. Match state machine: `waiting → starting → plane → active → ending → completed`. Queue timeout, cancel, capacity enforcement, ping/region preference (§6.5). Parties and private matches: data model ready, UI later. |
| Database | Migrations, FKs, indexes, RLS on exposed tables, service role only on the Worker | New tables via migrations: `br_matches` (id, mode, region, started/ended, winner, version) and `br_match_players` (match, user or bot, placement, kills, damage, survived seconds), written **once per match, idempotent by match id** in one transaction. RLS: players read their own rows and public match summaries. No rewards, currency or ledger now (paid matches are Phase 5). |
| Anti-cheat | Speed/acceleration via shared simulation, fire-rate/reload/ammo clocks, line of sight for hits and visibility redaction (no wallhack data) | Same; plus suspicious-event counters per player (rejected inputs, impossible moves, flood closes) logged as structured events; bans table checked at join (added if absent). |
| Reliability | Health route, maintenance mode, per-continent latency telemetry, cleanup of empty rooms | Room snapshots to Durable Object storage every 5 s (positions, health, zone, phase) so a restarted object resumes the match; watchdog alarm; deploy draining (the lobby stops creating rooms for an old build version; running rooms finish). |
| Network | Ping (server challenges), RTT/jitter percentiles per continent, reconnect | Reconnect within 60 s to the same seat; tab backgrounding keeps the socket (inputs pause; the server treats the player as idle); refresh = reconnect with the same ticket. WebTransport: not available on Durable Objects (§8). |
| BR specifics | — | Lobby to 100 with bots, countdown, plane route, drop distribution, zone/gas, elimination and kill attribution, remaining-player counter, last-standing winner, end-of-match stats, spectator architecture (read-only sockets already exist). Loot/inventory: Phase 5 data model only. |

### 11.3 Load testing (added to Phase 2 and Phase 4 acceptance)

- **Room CPU**: `scripts/br/bench-room.ts` (done, Node) and the same scenario inside the Durable Object runtime test (Miniflare/workerd).
- **Socket load**: `scripts/br/load-clients.ts` — N headless clients (10, 25, 50, 75, 100) joining one `BrRoom` on `wrangler dev`, sending inputs at the real rate, measuring tick time, snapshot bytes, message throughput, p50/p95/p99 command delay and reconnection success; scenarios: one 100-player match, ten 10-player matches, mass disconnect/reconnect, added latency and jitter, room restart mid-match.
- **Targets** (validated, not assumed): 30 Hz simulation, 20 Hz snapshots, tick p99 ≤ 12 ms at 100 players, reconnection within 5 s, flat memory over a 30-minute match.

# Map 06 — Practice Bomb Defusal (5v5): architecture plan

Status: Phase 1 (inspection). Branch `map06-bomb-defusal`. Not in the random 1v1 rotation:
the map is registered with `rotation: false` and is only reachable from the Bomb Defusal mode.

## What exists and is reused unchanged

| System                                      | Where                                                                    | Reuse                                     |
| ------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| Map registry, loader, environments          | `src/lib/fps/maps/*`                                                     | New map definition, `rotation: false`     |
| Movement, jump, crouch, step-up, collision  | `simulation.ts` (`predictMovement`, `isMovementBlocked`), `collision.ts` | Called per player                         |
| Hit volumes, damage, armour, spread, recoil | `combat.ts`, `player-volumes.ts`                                         | Called per shot, per target               |
| Team rifles                                 | `combat.ts` `SIDE_RIFLE`: Police M4A1-S, Terrorist AK-47                 | Fixed per team, as specified              |
| Characters, viewmodels, weapon kit, sounds  | `character.ts`, `authored-*`, `audio.ts`                                 | One character instance per player         |
| Sides and halftime                          | `sides.ts`                                                               | Same naming (Police / Terrorist)          |
| Signed admission tickets                    | `ticket.ts`                                                              | New audience `fps-bomb`                   |
| One Durable Object per match                | `workers/fps` `DuelRoom`                                                 | New class `BombRoom`: isolation per match |
| Bot navigation grid                         | `practice-bot.ts` `navGraph`                                             | Shared by up to 10 bots per match         |
| Visibility test (anti-wallhack)             | `visibility.ts`                                                          | Per-recipient snapshot filtering          |

## What is 1v1-only and needs new code (without touching the 1v1 paths)

| 1v1 assumption                                   | New                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `MatchState.players: Record<"A" \| "B", Player>` | `BombMatchState`: 10 slots, team per slot, bomb, round clock                    |
| `shoot()` resolves against `other(seat)`         | Shot resolves against every living enemy (no friendly fire)                     |
| `stepMatch` round rules (best of 13)             | MR15, freeze 15 s, round 1:55, bomb 40 s, defuse 10 s, halftime 15 s            |
| One practice bot, one target                     | Up to 10 bots: roles, bomb carrier, plant, defuse, retake                       |
| Renderer: two characters                         | Remote-player pool (up to 9), spectator camera                                  |
| Matchmaking: one DB row per 1v1 match            | `BombLobby` directory object assigns humans to open matches                     |
| HUD                                              | TAB / halftime scoreboard, bomb carrier and plant/defuse progress, spectator UI |

The 1v1 code paths (`DuelRoom`, `stepMatch`, `MatchState`, renderer 1v1 mode) are not modified
beyond exporting existing pure helpers.

## Server design

- `BombLobby` (one Durable Object): list of open practice matches and their human count.
  A join takes the first match with a free bot slot and fewer than 10 humans, otherwise
  creates a new match id. No database rows: practice has no money, ledger or results.
- `BombRoom` (one Durable Object per match): authoritative 30 Hz simulation of all 10 slots,
  bots stepped inside the room, bomb ownership/plant/defuse/explosion, timers, halftime,
  scoreboard, spectator targets. A human join replaces a bot on the team with fewer humans
  (bot's slot keeps its kills/deaths reset, never mid-air: alive bot → the human takes over at
  the next round start, or immediately if the bot is dead). A disconnect hands the slot back
  to a bot; a bomb carrier who leaves drops the bomb.
- Per-recipient snapshots: own team in full; enemies only when visible to the recipient (alive)
  or to the spectated teammate (dead), using the existing visibility test. Dead players can only
  select living teammates; the server rejects any other spectate target.
- Wrangler: new migration tag `v2` adds `BombRoom` and `BombLobby`. `DuelRoom` is unchanged.

## Client

- Route `/fps-bomb` (PvPStrike lobby → "Practice · Bomb Defusal"). `bombAdmission`
  (authenticated user, live session) asks the lobby for a match and signs an `fps-bomb` ticket;
  a socket refused before its welcome (the match just filled) retries with that match excluded.
- Renderer (`src/lib/fps/bomb/bomb-renderer.ts`): a separate mount that reuses the 1v1 building
  blocks (map environment, authored operators and rifles, presentation filters) without touching
  `renderer.ts`. The local player is predicted with the shared movement code from the snapshot's
  own full state (`self`); up to nine remote players each have their own playback timeline;
  enemies exist only while the room reveals them; bodies stay until the round ends; teammates get
  name tags; the viewmodel follows the team (M4 Police, AK Terrorists, swapped at halftime);
  a dead player sees through the spectated teammate's eyes, or a fixed overhead view of where
  they fell when the whole team is down (never a free camera).
- HUD (`hud.ts`, unit-tested): team bars, score, freeze/round clock (hidden once the bomb is
  planted: the beeps speed up instead), kill feed, plant/defuse prompts and progress, round
  banner, TAB scoreboard (K/A/D/HS%/status, bot labels, round and half), automatic halftime and
  final scoreboards, spectator bar (name, team, left/right click to switch).
- Audio: an additive `cue()` API on the shared audio module. Enemy sounds arrive as a bearing and
  gain only and are panned; own and teammate sounds use positions.
- Room/network changes made for the client: a per-slot input queue (one input per tick,
  bounded backlog), events accumulated between snapshots with increasing ids, and an empty
  event list on the join view.
- Verification: `scripts/fps/bomb-harness/run.mjs` runs the real renderer with an in-page room
  in headless Chromium (movement vs the room, reveal/hide, spectating, bomb). The real-hardware
  benchmark (`scripts/fps/gpu-bench`) includes a `sandgate-5v5` run next to the 1v1 maps.

- Travel-time targets (5 m/s): T spawn → A and → B about 14–18 s, Police → A and → B about
  6–10 s, first mid contact about 9–12 s. Measured on the real walk graph, as for LOST TRAIL.

## Assets

Candidates were verified (page, licence, downloadable, quality); the owner downloaded them into
`art/blender/map06/incoming/` (gitignored). Only CC0 and CC BY 4.0 sources are used; the full record
(title, author, source page, licence, use and modifications of every model and texture, plus the
custom-made assets) is `ASSETS.md`, generated from `art/blender/map06/assets.json`. The public
credit lines ship as `public/fps/models/sandgate-credits.txt`.

## Phases

1. Inspection and asset research (this document, `ASSETS.md`).
2. Layout: collision boxes, bombsites, spawns, walk graph and timing tests.
3. Environment: Blender build with imported and custom assets, PBR materials.
4. Bomb Defusal mode: lobby, room, rules, bots, renderer pool, HUD, spectating.
5. Optimisation and measurement against the 1v1 maps.
6. Full test pass and report.

## Environment (Phase 3)

Build: `art/blender/map06/build.sh [--review]` (layout → `textures.py` → `credits.py` → `assets.py`
library → `build_sandgate.py` → per-area GPU instancing → meshopt → `public/fps/models/sandgate.glb`;
`--review` adds the review renders, `build/perf.json` and the dressing check `build/check.json`).
Organised scene: `art/blender/map06/sandgate.blend` (one collection per area — Bombsite A, Bombsite B,
Central Mid, A Long, B Main, Terrorist Spawn, Police Spawn, Exterior Architecture N/E/S/W, Ground and
Road Surfaces — each split into Buildings, Interior Architecture, Military Sand Walls and Barriers,
Containers and Cover, Vehicles, Industrial Equipment, Stairs and Platforms, Props, Decals; plus the
non-exported Collision Geometry, Navigation and Gameplay Markers, Lighting and Asset Library). The
area collections are also the GLB's culling sections.

Rules: every gameplay solid is dressed inside its collision box. Building blocks get facades whose
wall plane sits 4 cm inside the box; plinths, string courses, cornices, surrounds, quoins and
pilasters are flush with it; sills stick out at most 3 cm; windows, doors, niches, loggias and
drainpipe chases are recessed into the block. Above the 8 m blocks the architecture is free (upper
storeys, parapets, terracotta roofs, rooftop tanks). The covered passages (Police passages, B hall,
lower passage) have ceilings at 3.7–5.6 m, above every player and below the roofs; the gate beams
at the long and mid doors sit above 3.2 m. Beyond the spawns' open arena edge, a Bremer barrier wall
(Police) and a T-wall line (Terrorists) stand on the boundary with the buildings set back behind.

Identities: A — sandstone old town, flagstone floor, terracotta roofs, tan armoured truck, yellow
forklift, crate quad, painted A. B — industrial depot: concrete and corrugated cladding, slab paving,
loading dock with hazard edge, green truck, rust container, guard office with a timber ceiling,
well and planters, painted B. Mid — plaster and adobe shopfronts (shutters, shop boards), flagstone
plaza, timber-beamed mid doors. A long — asphalt service road, olive and tan containers, long-doors
gate, car. B main — dirt lane between warehouses (roller doors, steel doors, cabinets), burnt car,
sandbags, covered hall with tile wainscot. Navigation paint (plain A / B letters and arrows) at mid,
both spawns and both sites. No PVPSPINARENA branding and no real-world brand artwork anywhere.

Lighting (`src/lib/fps/bomb/sandgate.ts` presentation only): early-afternoon sun from the south-west
46° high, warm sand bounce in the hemisphere term, neutral sky, fog 85–320 m; the sun sits 90 m out
with a 56 m shadow extent so the static shadow map holds the whole map.

### Performance (measured)

GLB numbers from `art/blender/map06/measure_glb.mjs` (draw calls = mesh primitives, a GPU-instanced
node is one call; texture memory = RGBA8 + mips as three.js uploads JPEG/PNG/WebP; no KTX2 loader
in the runtime, so textures ship as WebP):

| Map                   |    File | Draw calls | Shadow casters | Triangles drawn | Unique tris | Materials | Texture GPU |
| --------------------- | ------: | ---------: | -------------: | --------------: | ----------: | --------: | ----------: |
| Sandgate (80 × 80 m)  | 10.0 MB |        198 |            191 |          240.8k |      109.7k |        50 |      244 MB |
| Lost Trail            |  3.1 MB |        170 |            141 |          265.5k |       70.4k |        23 |      117 MB |
| Frostline             |  1.4 MB |         65 |             44 |           56.6k |       41.1k |        23 |       75 MB |
| Crossfire             |  1.7 MB |         62 |             46 |           51.6k |       50.5k |        28 |       97 MB |
| Aim arena (Dustfront) |  0.9 MB |         55 |             55 |           25.5k |       23.7k |        27 |       68 MB |

In engine (review harness, the game's loader and bomb-renderer lighting, SwiftShader, 1280 × 720):
199 meshes, 56 programs, load 1.2 s; per first-person view 44–192 draw calls and 48k–237k
triangles (whole map in view: 199 / 242k), versus Lost Trail's 171 calls / 266k triangles for its
overhead view under the same kind of harness. Draw calls are within ~16 % of the largest 1v1 map and
triangles below it; texture memory is about 2× Lost Trail for a map 3× its area and the plan's
higher texture standard (2K albedo only on plaster, sandstone and the two atlases; 512 px normal /
ORM maps; flat-colour textures shrunk to 32 px). SwiftShader frame times are not representative of
a GPU; real-GPU FPS and frame times belong to Phase 5.

### Collision-dressing check

`review/capture.mjs --check` loads the shipped GLB in three.js and (a) shoots rays inward on a
0.25 m grid over every exposed face of every gameplay solid, requiring visual geometry within
0.45 m behind the face, and (b) samples every triangle (≤ 0.2 m) for intrusion into walkable space
(open floor not inside any solid or the perimeter walls, ±5 cm) between floor + 5 cm and floor +
2 m. Result: 0 intrusion cells; coverage 100 % on stairs, platforms, catwalk, gates, booth, well,
planter, pillars, containers, spawn and office walls, crates and sand barriers; buildings ≥ 95.6 %
(the misses are the recessed upper-floor loggias); blast walls ≥ 97.9 %, crate quad 90.9 %,
sandbags 90.3 % (rounded model edges). Vehicles 57.5–66.6 % and the forklift 47.9 % are below
full cover because their silhouettes (cabins, wheel arches, the forklift's open cage) are smaller
than the single layout box each uses; a dark underbody fill and a pallet load on the forks reduce
it. Tightening those boxes (e.g. a lower box for the bonnet and wheels plus a narrower cabin box,
and a forklift box without the cage) would make them exact; that is a layout change, left to the
gameplay owner.

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

- Route `/fps-bomb` (Practice → Bomb Defusal). Server function: authenticated user → lobby slot
  → signed ticket → WebSocket to `BombRoom`.
- Renderer: the existing arena renderer, with the single opponent generalised to a pool of
  remote players (same character, animation and remote-presentation code per instance).
- HUD: team scores, round clock / bomb clock, bomb carrier icon, plant and defuse progress,
  TAB scoreboard (held), automatic halftime scoreboard, spectator bar (name, team, next/prev).

## Research: the best of Cache, Mirage, Dust2 and Inferno

Principles every source agrees on (Valve's map guide, level-design analyses, pro and community
breakdowns; sources in the commit and below):

- Three lanes with few, staggered connectors; simple to learn, hard to master.
- Two Terrorist entrances per bombsite, more Police paths than Terrorist paths into each site
  (Mirage: 3 vs 2), Police rotate faster.
- Police reach the sites first; both teams reach mid at about the same time.
- Site cover lets a defender watch one entrance while covered from another; open areas get little
  cover, tight areas more; no spot coverable by more than 2–3 players.
- Height variation (Cache was criticised as flat); no unreachable vantage points; chokepoints that
  favour neither side (Inferno's single-route banana is the cautionary example).
- Readable, bright, no dark corners for attackers to blend into (the Cache rebuild removed them),
  no clutter. Balance target 45–55 % rounds per side.

Favourite areas and their counterpart here (the idea and how it plays, never the shape or look):

| Source                                              | Idea                                                                                                                   | Here                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Dust2 long doors, long car, long corner             | A double-door gate starts the long fight; a car near the site; a corner so long sees only part of the site             | A long gate, long car, long corner                                                   |
| Dust2 catwalk + Mirage palace / Inferno balcony     | A raised route from mid onto A with a drop                                                                             | A short: raised catwalk from mid with stairs, balcony and stairs onto A              |
| Dust2 mid doors, xbox                               | Door gap where mid meets: the round-start duel; a box that boosts toward short                                         | Mid doors; mid boost crate by the catwalk stairs                                     |
| Dust2 lower tunnels / Cache vents                   | Mid-to-B link for splits                                                                                               | Lower passage from T mid to B main                                                   |
| Inferno banana                                      | A winding contested lane with a car at the top and sandbags halfway                                                    | B main (with a second route into B, unlike banana)                                   |
| Mirage apartments, van, bench, market, kitchen      | Exit facing two angles; vehicle anchor facing it; low back-wall cover; Police room with door and window; fast rotation | Covered hall exit; supply truck; planters; guard office linked to the Police passage |
| Cache quad, forklift                                | Back-of-site stack covering both doors; sightline breaker                                                              | A quad; A forklift                                                                   |
| Cache heaven, Dust2 B plat, FMPONE's two-level site | Raised Police platform over B, plant on the lower level                                                                | B dock (stairs from the Police side and from the site)                               |
| Inferno fountain, coffins                           | Low cover splitting the site; deep back cover                                                                          | B well; B planters                                                                   |

## Map

- Cache-sized playable area (about 75 × 65 m), three lanes (long exterior, mid, close interior),
  two bombsites with zones defined in the map definition (`bombsites: { A, B }` boxes), T and
  Police spawns. Built from boxes for collision (the engine's collision is axis-aligned boxes and
  box floors), dressed in Blender with imported and custom assets.
- Measured (tests/fps-bomb-layout.test.ts, 5 m/s, real walk graph): {"T → A": 14.6, "T → B": 15, "Police → A": 5, "Police → B": 5.3, "T → mid doors": 8, "Police → mid doors": 8.4, "rotation A → B": 11.1};
  first contact 5.7 s at the mid doors; no spawn-to-spawn sightline; longest
  lane 51 m.
- Travel-time targets (5 m/s): T spawn → A and → B about 14–18 s, Police → A and → B about
  6–10 s, first mid contact about 9–12 s. Measured on the real walk graph, as for LOST TRAIL.

## Assets

Sketchfab / Poly Haven / ambientCG are not reachable from the build environment. Candidates are
verified (page, licence, downloadable, quality) and listed in `ASSETS.md`; the owner downloads
them into `art/blender/map06/source/`. Only CC0 and CC BY (attributed) are used.

## Phases

1. Inspection and asset research (this document, `ASSETS.md`).
2. Layout: collision boxes, bombsites, spawns, walk graph and timing tests.
3. Environment: Blender build with imported and custom assets, PBR materials.
4. Bomb Defusal mode: lobby, room, rules, bots, renderer pool, HUD, spectating.
5. Optimisation and measurement against the 1v1 maps.
6. Full test pass and report.

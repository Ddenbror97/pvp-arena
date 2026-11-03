# Grenades: HE · smoke · incendiary

Three throwables for the 1v1 maps and Bomb Defusal (5v5): **RGD-5** (HE), **M18** (smoke) and
**AN-M14** (incendiary), from the owner-supplied "Game ready grenades set" (Riskyerick,
Sketchfab Standard licence). Counter-Strike-style controls and rules; first-person handling on
each team's own arms.

## Controls

| Input                                | Does                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `4`                                  | draw a grenade (the first one carried); `4` again: the next type carried (HE → smoke → incendiary) |
| hold left mouse                      | pull the pin, wind up overhand; release: full throw                                                |
| hold right mouse                     | pull the pin, wind up underhand; release: short toss                                               |
| hold both (at any point of the hold) | medium throw                                                                                       |
| `F`                                  | inspect (cosmetic; anything interrupts it)                                                         |
| `1` / `2` / wheel                    | back to the rifle / Karambit (not while a released grenade is leaving the hand)                    |

After a throw the previous weapon is drawn automatically. A tap waits for the pin: a release
before `primeMs` (620 ms) throws as soon as the grenade is ready.

## Rules (`src/lib/fps/grenades/rules.ts`, all server-side)

- **Inventory:** one of each, handed out at every spawn (every round, every life). Configurable.
  The server refuses to draw or throw a type that is not carried; a hold makes at most one throw.
- **Timing:** draw `equipMs` 450; prime `primeMs` 620 from the press; the grenade leaves the hand
  `releaseMs` after the release (120 overhand / 110 medium / 140 underhand); the previous weapon
  returns `recoverMs` 520 after the release. The fuse starts when the grenade leaves the hand,
  never on draw or pin pull.
- **Throw (CS's formula, in metres):** the aim is biased 10° up at the horizon, the speed is
  `min(17, (90 − pitch°) × 6 × 17 / 750)` m/s × (strength × 0.7 + 0.3), strength 1 / 0.5 / 0
  (overhand / medium / underhand), plus 1.25 × the thrower's velocity (running and jump throws).
  Leaves 0.3 m in front of the eye (traced: never inside a wall).
- **Flight (`physics.ts`):** fixed 1/128 s steps from the release; gravity 8.6 m/s²; a 4.5 cm
  sphere swept continuously against the map's gameplay collision (boxes, walls, structures, floor,
  movement barriers, and an unlimited-height wall along the arena's edge), so nothing tunnels
  through thin walls or leaves the world; a bounce mirrors the velocity and keeps 45 % (CS); on
  a floor below 0.55 m/s it stops. Only + − × ÷ and square roots: the server and every client
  replay the identical path from the throw's origin and velocity (sent as numbers), at any frame
  rate. Grenades do not collide with players.
- **HE:** 1.5 s fuse; up to 98 damage, 5 m reach, `98 × (1 − d/5)^1.35`, times the exposed share
  of the body (legs 0.3, chest 0.4, head 0.3: a wall between the blast and a sample point
  blocks that share); a vest absorbs half (costing half as much armour). The thrower can hurt
  themselves (CS). Bomb Defusal has no friendly fire: teammates are never hurt.
- **Smoke:** pops once at rest (no earlier than 0.9 s; at the latest 4 s), lasts 18 s (grows
  over 1.6 s, thins over the last 3 s). The cloud is a set of up to 220 puffs (0.8 m grid)
  flood-filled from the can through open space only, inside a 3.4 m × 2.6 m squat ellipsoid:
  it rolls round corners and through doorways, never through walls. **Sight:** a line is blocked
  once it crosses 3 m of summed puff chords (≈ 0.9 m into the cloud's body). This blocks the
  servers' enemy reveal (1v1 snapshots, Bomb per-recipient views), the practice bot's sight and
  the Bomb bots' sight. The renderer draws sprites on exactly these puffs, opaque at that depth;
  there is no graphics setting that thins them.
- **Incendiary:** bursts on its first floor contact (in the air after 2 s: no fire); flames
  flood a 0.5 m grid over the floor from the landing point (≤ 3.1 m, ≤ 44 cells, spreading at
  5 m/s): a cell needs floor within a 0.38 m step of its neighbour, found from above (never a
  floor below, never a ledge above) and no wall between them. 7 s. Standing in flames: 8 HP/s
  rising by 10 HP/s per second to 34 HP/s, dealt every 250 ms; it stops on leaving (exposure
  resets after 0.6 s out). **Smoke puts fire out:** a cloud extinguishes the cells it covers,
  and an incendiary landing in smoke fizzles.

## Network

- Input: `weapon: "grenade"` with `nade: "he" | "smoke" | "fire"`; the held buttons ride the
  regular input ticks (`fire`, `alt`). Grenade presses and releases are never folded into the
  movement catch-up.
- Events: `nade-throw` (the projectile: id, type, owner, kind, `at`, origin, velocity) and
  `nade-detonate` (id, position, time, `dud`). Damage arrives as ordinary `hit` events with
  `nade`. Throws and detonations are public (a grenade in the air is visible to everyone).
- State: `grenades` (flights, clouds with their puffs, fires with their cells) in every
  snapshot, without the server-only flight state; late joiners rebuild everything from it.
- A hidden enemy's grenade handling is redacted with their pose; a visible one carries `nade`
  and the wind-up for the third-person animation.
- **Deploy order: the FPS Worker first, then the site** (an old Worker reads
  `weapon: "grenade"` as the knife).

## Client

- `grenade-timeline.ts`: `LocalGrenadeHands` predicts the hold / release / leave / recover on
  the local clock with exactly the server's rule (unit-tested against it), and maps it to clips.
- `grenade-viewmodel.ts`: the team's own arms (shared rig, gloves, forearms, sleeves) with baked
  finger poses (open, a grip per grenade shape, a pinch); the palm is solved onto the clip's
  `G_Hand` and the grenade sits in it; the left pinch rides the ring as the pin comes out.
- `grenade-world-view.ts`: pooled grenade meshes (flights replayed from the throw, tumbling; the
  spoon flies off; a spent smoke can stays), two instanced sprite meshes for every effect (soft:
  smoke, dust; glow: flames, flash, sparks), a grey veil when the eye is inside a cloud. All
  created and compiled at load.
- Own throws are predicted and handed over to the server's flight (offset eased out over ~90 ms);
  the first 100 ms blend from the hand's release point.
- Sounds: synthesized (draw, pin, spoon, throw whoosh, bounces per body, HE blast, smoke pop and
  hiss bed, fire burst and crackle bed, fizzle), spatialized by bearing and distance.
- Third person: the operator carries the grenade in the right fist, winds up while the pin is
  out and throws on the server's event.

## Tests

- `tests/fps-grenades.test.ts`: physics determinism (chunking-independent), no tunnelling, rest,
  bounces, throw ranges and jump throws, every registered map (throws stay in the world and
  settle; smoke and fire from both spawns), HE falloff / cover / vest, smoke walls and sight,
  fire spread rules (walls, steps, floors above and below), burn ramp and stop, smoke puts fire
  out, handling (inventory, kinds, prime wait, no double throw), prediction = server timing.
- `tests/fps-grenade-match.test.ts`: the 1v1 and Bomb steps (inventory, refusal, damage, smoke
  hiding the opponent from snapshots, round reset, fire damage, no friendly fire, public world
  without server state).
- `tests/fps-runtime.test.ts` ("grenades over the wire"): two players on the real Durable
  Object: A throws an HE; B's snapshot carries the throw, and replaying it reproduces the
  server's detonation point; the HE is used up and a second one refused; a smoke reaches both.
- `scripts/fps/bomb-harness/grenades.mjs`: the real Bomb client in headless Chromium with mouse
  input (HE, smoke, incendiary), screenshots, damage, smoke hiding the enemy, fire, draw calls,
  shader programs before and after.

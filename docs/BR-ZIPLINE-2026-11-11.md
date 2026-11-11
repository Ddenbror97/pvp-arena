# Zip-line (Iron Peaks → Pine Ridge) and the watchtower ladder (2026-11-11)

A one-way steel zip-line from the Iron Peaks watchtower down to Pine Ridge. E on the top deck takes
hold. The rider glides in third person for 28 s and steps off on a timber landing platform in Pine
Ridge.

## Route (real map coordinates, world metres, y up)

| | x | y | z |
|---|---|---|---|
| Watchtower (Iron Peaks, layout `watchtower`, ground) | −578.10 | 507.78 | −4082.00 |
| Stand point on the top deck (E range 1.6 m) | −578.10 | 514.52 | −4080.40 |
| Cable start (portal beam above the deck) | −578.10 | 517.00 | −4079.35 |
| Cable end (Pine Ridge A-frame) | −710.80 | 83.55 | −3063.00 |
| Landing (feet on the platform) | −711.01 | 80.46 | −3061.41 |

These are on the raised Iron Peaks / Pine Ridge terrain that main got in #156 (merged into this
branch). On that terrain the route was re-surveyed from the Iron Peaks watchtower nearest Pine
Ridge. Bearings within ±30° of the hamlet's centre and lengths from 850 to 1150 m were checked.
The chosen route runs 7.5° east of the line to the centre and is 1025 m long. Along it the hanging
rider clears every tree, rock and building.

- Horizontal span: **1025.0 m**. Cable length (with the 2.2 % sag, a parabola): **1113.9 m**.
  Elevation drop: **433.5 m** (42 % average grade; slope −0.51 at the top, −0.33 at the bottom).
- The cable end is 185 m from Pine Ridge's centre (radius 678). The nearest building is 118 m from
  the landing.
- The rider hangs 2.4 m below the cable: the handle is 0.36 m under it and the arms span 2.04 m. The
  rider's feet stay at least **2.6 m above the terrain** the whole way. They are lowest just off
  the summit and much higher above the valley. No building, rock box or tree comes near the
  rider. `tests/br-zipline.test.ts` walks every 0.5 m against the server's collision world and the
  tree trunks, using twice the trunk height as the crown.
- Clearings are cut in the vegetation around both stations (`zipClearings`), and the station posts,
  deadmen and platform are solid (`zipStationBoxes`).

## Timing

| | ms |
|---|---|
| Reach for the handle | 380 |
| Pull up (feet leave the deck, +0.85 m) | 620 |
| Glide | **28 000** |
| Drop to the platform | 420 |
| **E → on foot** | **29 420** |

The glide accelerates over 3.2 s (smoothstep), cruises, then brakes over 4.2 s to 2.2 m/s at the
end stop. The cruise speed is solved from the cable length so the glide takes exactly 28 s. That
gives 45.6 m/s (≈ 164 km/h), with a peak of 46.3 m/s (≈ 167 km/h). This is the top end of real long
lines, which is realistic for a steep 1 km line. Speed changes by at most 1.6 m/s per 33 ms tick,
so there are no jerks. A small time-based lateral swing is added on the client (pendulum, visual
only).

## How it works

- **Shared, deterministic ride** (`src/lib/fps/br/zipline.ts`). The rider's pose is a pure function
  of `zip.ms`, the ride time accumulated in fixed server ticks. That includes feet, handle, heading,
  speed, reach and knee tuck. The cable is pre-tabulated by arc length (512 steps), so a pose costs
  one table lookup. `stepDrop` handles the new `"zip"` phase identically on the server and in client
  prediction. Input is ignored, so a modified client cannot change the speed.
- **Attach** (`match.ts → zipAct`). The server checks: alive, on foot, not in a vehicle, within
  1.6 m of the stand point (and 0.9 m vertically), and the line free (`spacingMs` 1.6 s between
  riders). Failures return "Not here", "Too far" or "Busy" in the usual act reply. A second E while
  riding is ignored, and there is no duplicate attach. Heal, reload, aim and trigger are cleared.
- **While riding.** `stepHands` returns before acts, so firing, reloading, using items, doors and
  vehicles are all blocked. Movement input is ignored. Health and damage apply as normal. Riders
  count as airborne for interest management, so they are visible far away against the sky like
  parachutists.
- **Death mid-ride.** `dropGear` drops the body to the ground under the cable (`dropFromZip`), and
  the gear is laid out there.
- **Disconnect.** The ride does not need input, so it completes and the body lands. A bot takeover
  is harmless (bots return a no-op input for `"zip"`).
- **One way.** There is nothing to take at Pine Ridge (`zipReachable` is only the top deck).

## Network

There are no new messages and no new fields for other players:

- Player rows carry phase code **6** (zip). Remote clients recover the rider's ride time from their
  replicated position (`zipMsAt(x, z)`, accurate to within a tick). They then pose the remote actor
  from the same deterministic function and interpolate as for any player.
- The local snapshot `you` gains `zip: ms` while riding, so reconciliation restores the ride clock
  exactly. The prediction error stays at 0 in the tests.

## Camera (client, `br-arena.ts`)

- **Attach.** Over 700 ms the camera eases out of the eye (smoothstep blend on position, slerp on
  rotation) into the follow view. Yaw and pitch ease toward the line heading over 1.2 s.
- **Follow view.** The camera sits **4.0 m** from the rider's chest, rising to **4.9 m** at full
  speed and closing in to 3.4 m near the end. That is about 3.3–4.2 m behind at the default
  tilt. Height is set by the pitch tilt: about **2–3 m above** the rider's
  head at the default pitch. It sits 0.95 m to the right of the line, so the cable runs past the
  lens into the shot instead of covering the rider. It looks down past the rider to a point 3.5 m
  ahead on the line (about 27° down at the default pitch). The rider sits in the lower middle of
  the view, boots to trolley, and the valley and Pine Ridge fill the upper part. The offset is
  damped with a 160 ms time constant (frame-rate independent).
- **No jitter.** The ride is drawn from its own clock. That clock advances with the frame and eases
  onto the predicted clock (220 ms). The drawn body, the trolley and the camera all come from that
  one pose, so a server correction never snaps the rider and the hands stay on the handle.
- **Verified in the real client.** `zip-capture.mjs` checked the framing at cruise: the rider's
  feet sit at screen y −0.42 (NDC), the view looks 23° down, and the whole body, the handle and
  the trolley are in frame.
  - A bug found here is fixed: the first-person/third-person blend used
    `quaternion.slerpQuaternions(fp, camera.quaternion)`, which copies its first argument over
    the second before reading it. The follow view's rotation was lost, and the camera kept the
    first-person angle.
- **Mouse orbit.** Yaw is free and pitch is clamped. It only moves the camera; the ride is
  unchanged.
- **Collision.** The camera is pulled in against terrain (`heightAt`) and solid boxes (`blocked`)
  in short steps. This uses no raycasts against meshes.
- **FOV.** FOV widens by up to +9° with speed, smoothly.
- **Landing.** Over 600 ms the camera blends back into first person. The normal FPS camera, mouse
  look and weapon view return.

## Animation (`authored-character.ts`, the existing rig and IK)

There is a new `zip` motion. Both hands are IK-pinned to the handle (±0.105 m), and the weapon is
put away. On attach the hands reach from the chest to the handle (`reach`). The legs hang below
with the knees slightly bent, and a small sway follows speed and the pendulum swing. The body leans
back slightly (root pitch 0.08). For landing, the knees tuck up (`tuck`), the feet reach for the
platform and the normal stance returns. Remote players use the same motion from the same pose
function, so all teams' character models work unchanged.

## Station hardware (`zipline-renderer.ts`)

- **Start.** A steel portal on the tower deck, with an anchor beam, hazard bands, a tension
  turnbuckle, cable clamps, bolt studs, guy stays to concrete deadmen and footings. The deadmen sit
  at ±8 m east/west and 0.5 m south of the tower, so the east stay clears the ladder.
- **End.** A steel A-frame on footings, a brake spring and stop block, stays to deadmen, and a
  3.4 m timber landing platform.
- **Cable.** A 220-segment tube with a metallic material, plus a one-pixel hairline along it. The
  tube is under a pixel wide past about 60 m, so the hairline keeps the line visible running up
  the mountain from the valley and from Pine Ridge.
- **Trolley.** A trolley (carriage and pulley) with a T-handle: parked at the top, and one per
  rider while moving, up to 8.

Everything is one static vertex-coloured mesh built once, plus two InstancedMeshes (carriage and
handle), and the hairline. That is **4 draw calls** in total. Nothing is rebuilt per frame, and there are no physics
bodies along the cable.

## Audio (`br-audio.ts`)

- `br-zip-enter-v1.mp3` (the owner's "Enter zip line" recording) plays on taking hold. Remote
  riders play it positionally when first seen on the deck.
- `br-zip-glide-loop-v1.mp3` is the owner's "Zip glide metallic" recording. The 1.05–7.0 s section
  is looped with a 0.5 s equal-power crossfade, and the final non-glide sound is cut. It plays for
  the whole ride with gain and pitch following speed, plus the existing wind loop rising with
  speed². Both fade out on landing.

## Performance

- Idle cost is 4 draw calls when on screen (the ladder is merged into the static mesh); they are frustum-culled otherwise. There is no
  per-frame work beyond writing the instance matrices for riders (≤ 8).
- Riding cost is one arc-length lookup per rider per frame plus a handful of camera box queries.
- The network cost is zero added bytes for others, and one small number in `you`.

## Tests

- `tests/br-zipline.test.ts` has 8 tests:
  - The route on the real island.
  - Clearance against terrain, buildings and trees.
  - Timing and smoothness.
  - The full server ride with movement, jump, fire, E and exit spammed: nothing changes, the rider
    lands in 29.4 s and walks off.
  - One way.
  - Busy and spacing.
  - Death mid-ride (body and gear on the ground).
  - Replication (phase 6, `you.zip`, prediction equal to the server).
- `scripts/br/client-sim/zip-capture.mjs` is a headless real-client run. It covers the prompt, E,
  attach, the third-person distance and height, orbit, landing back to first person, and the other
  player seen riding in. Screenshots go to `art/br/build/zip-sim`.

## Watchtower ladder (owner, 2026-11-11)

The owner asked to check that the tower has a ladder. It has a switchback stair up to the deck. A
breadth-first walk over the server's collision confirms that the deck is reachable on foot. There
was no ladder, so `src/lib/fps/br/ladders.ts` adds one.

- **Where.** On the tower's east face, at plane x −575.80 and z −4080.20, facing west. The foot
  is on the ground at y 507.78. At the top the climber goes over the deck's 0.76 m east rail onto
  the deck at (−576.35, 514.52, −4080.20). That spot is clear of the roof's corner beam and the
  zip-line's portal, and 1.7 m from the zip handle.
- **Size.** 7.56 m climbed (the feet end 0.82 m above the deck to step over the rail). There are
  31 galvanised rungs at 0.238 m spacing, steel stiles rising 1.05 m above the top rung, and three
  pairs of brackets into the tower. The geometry is merged into the zip-line's static mesh, so it
  adds **no draw call**.
- **Controls.**
  - **[E] Climb Ladder** at the foot, or **[E] Climb Down** at the top exit.
  - **W** climbs up and **S** climbs down at 1.25 m/s (about 6 s to the top). With no key held, the
    climber holds still.
  - **Space** lets go: the climber is pushed off and falls (the normal fall-damage rules apply).
  - Firing, reloading, items, doors and vehicles are blocked while climbing. The gun is put away
    and the first-person viewmodel is hidden.
  - In first person the head leans 0.2 m back off the rungs, and the view turns to face the ladder
    on taking hold. The altimeter is hidden, and the hint line shows W/S/Space.
- **Server.**
  - `ladderAct` checks: alive, on foot, not driving, within 1.1 m of the foot or exit (0.6 m
    vertically), and not within 600 ms of stepping off. That last check stops a held E from putting
    the climber straight back on.
  - Getting on eases the climber from where they stood onto the rungs over 320 ms.
  - Getting off at the top goes over the rail and down onto the deck over 650 ms. Getting on at the
    top plays the same path in reverse.
  - Death on the ladder drops the body and gear to whatever is below.
  - Phase `"ladder"` is code **7** in the rows.
  - `you.ladder` carries `{ id, s, stage, t }` for exact reconciliation. The client predicts with
    the same step.
- **Animation.** The owner's Mixamo "Climbing Ladder" FBX is baked by
  `scripts/fps/locomotion/bake-ladder.mjs` into `public/fps/locomotion/ladder-v1.json`.
  - It is one 0.77 s cycle: both hands and both feet move two rungs. The climb is taken out, and
    the grip plane and lowest foot are stored.
  - `ladder-clip.ts` binds it to any team rig, like the swim clip. The hands are placed on the
    ladder's plane for that rig's size.
  - The phase of the clip is **the height climbed ÷ 0.476 m**, so the hands and feet meet the
    rungs. Other players' phase comes from their replicated height (`climbAt`), with no extra data.
  - Climbing down plays the cycle backwards.
- **Sound.** The owner's "climbing_ladder.mp3" (9.1 s, about 20 hand and boot contacts) is cut
  into its ten cleanest contacts, levelled, in `br-ladder-steps-v1.mp3` (45 KB). One plays per
  rung passed, a different one each time, with hands a little louder than boots. Your own is
  centred; others' are spatial.
- **Tests.** `tests/br-ladder.test.ts` has 6 tests:
  - The route is clear: the climber's column, the exit, and no stay within 0.6 m.
  - E and W up onto the deck, with the time matching speed and no step over 12 cm per tick; the
    zip handle is then reachable.
  - E at the top and S down to the foot.
  - Hold still with no key; jump lets go, and the climber falls to the ground.
  - Death on the ladder puts the body and gear at the foot.
  - Phase 7 rows, `climbAt` recovering the height, `you.ladder`, and prediction equal to the server.

## Limitations

- The zip-line is one-way only, by design for the first version.
- Bots use the watchtower's stairs, never the ladder or the zip-line.
- Stepping off the ladder at the top uses the standing pose, with no dedicated climb-over clip
  (the Mixamo file is a climb cycle only).
- Up to 8 trolleys are drawn at once. More riders are allowed, but the extra trolleys are not drawn.
- Clothing has no secondary motion (the rig has none). The legs and swing carry the motion.
- Remote players' ride time is derived from their position. It is exact to within a tick, so it is
  not visible.

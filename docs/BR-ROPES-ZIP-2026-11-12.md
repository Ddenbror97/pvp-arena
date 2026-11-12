# Iron Peaks: four climbing ropes, the climb itself, and the zip-line's landing (2026-11-12)

Owner's report: "1) the climb rope at the zip-line mountain, is should be 1 rope on each side
going all the way to the buttom, there is only 1 right now that is too short also. player should
be able to climb up from the buttom. 2) improve the climping animation while climing the rope,
the character does not do in properly motions to look realistic. 3) fix so when the player rides
the zep-line and gets off it there is a view of the character standing still or someting, looks
weird, fix that", then: "the 4 climbing ropes on that mountain, 2 infront 2 in back".

**Machine.** This session's container: Node for the server's rules and the terrain, headless
Chromium on SwiftShader for pictures. Nothing here was played on a graphics card or by hand (see
"Not verified").

## 1. Four ropes, from ground you can walk to

### What was wrong

The summit's cap is a cliff all the way round. `movement.ts` refuses a move where the terrain
rises faster than 45° along it, and a flood of the ground that can be walked from the lowlands
(`scripts/br/walkable.ts`, the same rule with a fifth to spare) stops 20–85 m below the plateau
on every bearing: nobody walks up. The one rope's foot was 33 m out on the north-north-east
face, 48 m under the plateau, with another 125 m of 53°–65° rock under it. It could be used
from the top down and by somebody who had dropped onto the face, not from below.

### The four routes

`scripts/br/rope-survey.ts` goes round the summit every 5°: where the plateau breaks into the
face, the first ground below that is 40° or less for 6 m (or the bottom of a saddle) and can be
walked to, the drop between them, and what stands in the way. "Front" is the south side
(Pine Ridge and the island; the first zip-line leaves over it), "back" the north side (the
broadcast tower, in the owner's words "behind the first Iron Peaks zip-line mountain").

| Rope             | Side  | Bearing | Climb   | Height  | Foot                       | Time at 2 m/s |
| ---------------- | ----- | ------- | ------- | ------- | -------------------------- | ------------- |
| north-north-east | back  | 150°    | 205.3 m | 175.1 m | the saddle between summits | 1:44          |
| north-east       | back  | 125°    | 150.5 m | 125.9 m | the shelf above the valley | 1:17          |
| south-south-east | front | 28°     | 58.8 m  | 47.0 m  | the shoulder under the cap | 0:31          |
| south-west       | front | 315°    | 70.3 m  | 60.9 m  | the south-west shelf       | 0:37          |

- The first is the old rope's line, lengthened from 52.75 m to the saddle. Both back ropes are
  east of the second zip-line's landing: west of it the face falls 215–270 m without a break.
- The two front ropes are either side of the first zip-line's cable (353°), 35° and 38° off it.
- Each foot is ground you stand on (33°–38°), walked to from the lowlands; each top is the
  plateau by the watchtower, 9.5–13 m from its centre.
- A rim rock stood where the south-south-east rope's climber steps off. The layout now keeps
  its outcrops off every rope's line (`onRopeRoute`): that one rock is gone, nothing else moved.

Climbing speed is 2 m/s (it was 1.5): at 1.5 the long rope took 2:17. The old rope's "20 %
faster than the walk round" no longer applies: there is no walk round.

The rope hangs 0.5 m off the rock (it was 0.9 m): the old stand-off came from the old clip's
straight-legged reach, and with the body behind the rope no leg reaches rock 0.9 m in front.

### Drawing

Each rope is one static mesh and a one-pixel line. The braid is worked out per pixel from the
distance along the rope, so the tube has a ring every half metre instead of every 6 cm: the four
ropes (485 m) are about 27k triangles together, where the old one alone was 12k for 55 m. A
rope's mesh is drawn within 280 m of the camera; its line always.

### Mechanics

Unchanged: the ropes are "ladders" (E takes hold at the foot or at the top, W up, S down, still
holds, E or jump lets go, E within a stride of an end steps off there), server-authoritative,
phase 7 rows. Ladder ids: 0 the watchtower's ladder, 1–4 the ropes (the old rope keeps 1), then
the placed models' ladders.

## 2. The climb

### What was wrong

The climb was Mixamo's "Climbing A Rope": a slow climb of a free-hanging rope, half a metre in
2.6 s. Its phase was tied to the distance climbed, so at 1.5 m/s it ran at seven times its pace
(at 2 m/s it would be ten): four tiny reaches a second with the feet pedalling.

### What it is now

`src/lib/fps/rope-climb.ts` works the climb out for the pace it is climbed at. One cycle is
1.5 m of rope: each hand pulls once (reach high, pull down past the chest to the hip, let go,
reach again) and each foot steps once up the rock in front, opposite hand and foot together as
in a walk. The body leans back on the rope behind it, the shoulders turn into each reach and the
hips into each step, the head stays on the rope above. At 2 m/s that is 1.3 cycles a second,
the cadence of a run.

The hands and feet are placed from the distance climbed, not from time:

- a hand that grips stays on its spot of the rope, a foot that stands stays on its spot of the
  rock, while the body moves past, at any speed, up or down;
- every client shows the same pose from the climber's position alone (nothing new on the wire);
- held still, the free hand takes the rope and the free foot the rock.

`authored-character.ts` turns the numbers into the rig's pose with its own limb solver: the
arms to the grips, the fists closed round the rope (the fingers' fold is worked out from each
rig's knuckles; a reaching hand opens), the legs to the steps, the soles flat on the rock. The
arena passes how far the rock is in front of the rope where the climber is, so the feet stand on
it at the foot of a rope and at the lip of the plateau too.

Measured on both characters over 6 m of climbing at 2 m/s (`scripts/fps/rope-check`):

| Character | Grip off the rope's line | A gripping hand moves | A standing foot moves | Foot off the rock | Arm at most | Leg at most |
| --------- | ------------------------ | --------------------- | --------------------- | ----------------- | ----------- | ----------- |
| Police    | 0.6 cm                   | 0.6 cm a frame        | 0.1 cm a frame        | 0.02 cm           | 85 % out    | 89 % out    |
| Terrorist | 0.4 cm                   | 0.7 cm a frame        | 0.1 cm a frame        | 0.02 cm           | 92 % out    | 95 % out    |

(The body moves 3.3 cm a frame. The hand's 0.6 cm is the fist turning round the rope as the arm
passes it, at one point of the pull.)

The old clip, its bake script and `rope-clip.ts` are removed.

## 3. Off the zip-line

### Cause

The ride is seen from behind and above; the view went back to first person only after the ride
had ended. For the first half second of that, the rider was drawn standing on the platform with
empty hands, seen from behind as the camera flew into their head. The same happened stepping off
the climbing rope.

### Fix

The view starts back as the rider comes off the end of the cable (the last 0.8 s of the ride:
the brake's end and the drop onto the platform) and is in first person as the feet touch down.
The figure is only ever drawn riding. The rope does the same over the last 0.55 s of the step
off, at the top and at the foot.

## Not verified

- **By hand, on a graphics card.** The pictures are stills from headless runs.
- **The view back to first person at the zip-line's landing** was changed in code and type-checked;
  see the capture results below for what was run.

## Tools

- `npx tsx scripts/br/rope-survey.ts [--only=150,125,28,315]`: the summit's faces and the ropes
  as built.
- `node scripts/fps/rope-check/capture.mjs [outDir] [--seats=A,B] [--views=side,rear,orbit,hands]`:
  the climb in strips through a cycle, and the measurements above (`MEASURE=1` for those only).
- `node scripts/br/client-sim/rope-capture.mjs [outDir] [--rope=0…3]`: a rope in the real client.
- Tests: `tests/br-rope.test.ts` (routes, reachability, the server's climb on all four),
  `tests/fps-rope-climb.test.ts` (the pose).

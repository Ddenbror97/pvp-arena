# Opponent "micro-vanish" investigation (2026-11-01)

Report: while walking or running, the opponent (bot or player) sometimes blinks out for a
moment or looks broken when it reappears, both near and far.

## Cause (measured)

The anti-wallhack redaction hid the opponent while part of them was on screen.

`canSeeOpponent` sent a pose only if one of nine body points (head top, eye, chest; centre
and ±0.32 m) had a sight line **from the viewer's current server position**. Two mismatches
with what the client actually draws:

1. **Envelope.** Boots, legs, arms and the rifle (~0.8 m ahead of the chest) were not
   sampled. Around a corner the rifle and shoulder show first and leave last.
2. **Timing.** The client draws the opponent `REMOTE_DELAY_MS` + one way behind the server
   step, while its own camera is one way + the server command wait ahead. At 135 ms RTT
   the camera is ~350 ms of movement (up to ~1.7 m) away from the position the server
   tested.

`tests/fps-reveal-continuity.test.ts` lets two players roam the real arena (walk, run,
sprint, crouch, strafe with free look) and compares each rendered frame (60 FPS) with a
dense ground-truth sample of the drawn operator from the real client camera.

| 135 ms RTT, 100 ms server wait                              | Previous rule | New rule |
| ----------------------------------------------------------- | ------------- | -------- |
| On-screen frames where the opponent was wrongly hidden      | **~18%**      | **<1%**  |
| Wrongly hidden all frames                                   | 6.1%          | 0.2%     |
| Short (<250 ms) vanishes / pop-ins per minute               | ~9            | ~1.9     |
| Visible → hidden → visible blinks per minute                | 1.0           | 0.35     |
| Pose sent while behind cover from the camera (early reveal) | 4.5%          | 15%      |

At 30 and 180 ms RTT the results are the same shape (0.2–0.4% wrongly hidden).

A second, smaller effect: when the opponent reappeared (or came back into the camera
frustum), the gait read the jump as one huge stride, a one-frame sprint pop.

## Fix

- **`revealsOpponent` / `RevealGate`** (`src/lib/fps/visibility.ts`), used by the match
  Worker for every snapshot and every bundled trail step:
  - samples the rendered envelope: boots to head top at ±0.38 m, plus the rifle muzzle;
  - tests from the viewer's position extrapolated over the latency window (start, middle,
    end; speed capped at sprint, window ≤ 450 ms) and a ±0.4 m lateral peek margin;
  - holds a reveal for 200 ms after the last sight line.
- The latency window is per player: measured `lookbackMs` (min RTT + `REMOTE_DELAY_MS`,
  capped) plus that player's latest server-side command wait.
- The practice bot's perception still uses the strict `canSeeOpponent`.
- Renderer: `resetMotion` seeds the gait from the opponent's real velocity
  (`RemotePresentation.velocity`, never across a hidden gap) when it reappears.

## Security trade-off

Redaction still never sends an opponent that has no line of sight from any viewpoint
within the viewer's latency window and peek margin. Deep cover stays redacted (tested).
The cost is earlier reveal near edges: poses behind cover are sent in ~15% of frames
(was ~4.5%). An honest client draws nothing there, since the wall occludes them. A
wallhack would see an opponent roughly one short step (≤0.4 m) or one latency window
before the honest player does. This is the same "reveal slightly early" trade-off as
VALORANT's fog of war. To tighten it, lower `REVEAL_MARGIN_M` or `REVEAL_HOLD_MS`; the
test reports both sides.

CPU: one decision costs ~110 µs (the old test ~130 µs), so about 7 ms per room-second.

Deploy: the match Worker (and the frontend for the gait fix), together.

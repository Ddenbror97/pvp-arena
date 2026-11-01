# Bot and player movement timeline investigation

## Reproduced cause

The runtime advances physics in fixed 34 ms clock steps, with bounded catch-up.
Snapshot deadlines run at 20 Hz and are serviced by that clock. Poses were labelled
with the later send timestamp (`serverNow`), rather than the physics timestamp.
Timer jitter and catch-up therefore made equal distances appear to cover unequal
time intervals. Increasing the interpolation buffer or predicting briefly cannot
correct this incorrect temporal input.

A second defect capped the opponent playback clock's elapsed time to 100 ms,
using the same cap as safe physics integration. A 400 ms rendering stall therefore
lost 300 ms on the playback clock, then needed seconds to recover at its bounded
5% phase correction rate. Playback now uses the full monotonic draw interval;
the physics integration cap is unchanged. A regression asserts immediate clock
recovery after a 400 ms stall. Browser traces use actual rAF timestamps and mouse
capture, rather than treating a background tab's deliberate draw throttling as
active gameplay. Test timeline resets also discard previously queued old frames.

The previous averaged wall-clock offset also incorporated queued old packets
after a stall as though their extra age were normal network travel. Opponent
playback now maps monotonic local time using the least-delayed recent packet,
matching the existing bounded rewind's preference for baseline RTT. An old-packet
burst cannot pull that clock backward. The clock resets on the first resumed
snapshot after a connection/authorization pause, not while the paused old pose is
still displayed. This avoids both clock-domain jumps and lasting added delay.

A deterministic constant-speed 2 m/s trace, with 0–29 ms send scheduling offsets,
reproduced a 3.95 m/s apparent speed range at 60 Hz and 7.29 m/s at 144 Hz. The same
trace using physics timestamps had a speed range below 0.01 m/s. These are local
fault-injection measurements, not measurements of a player's network or GPU.

## Changes

- Snapshots carry `poseAt` from the authoritative physics step, independently of
  `serverNow`. The latter still calibrates transport time and audio/reload timing.
  The client accepts old snapshots without `poseAt` for rollout compatibility.
- Both bot and human opponent playback use the physics timeline. Render FPS,
  simulation rate, input validation and movement speed are unchanged.
- Private shot rewind records every physics step on that same timeline instead
  of attaching send timestamps to occasional snapshots. Its 200 ms bound remains.
- Crouch is interpolated alongside the position and rotation. The character's
  pelvis, weapon, badge, head anchor and stride use that sampled stance; airborne
  presentation uses sampled feet height. The fallback rig uses the same stance.
- Historical hit volumes interpolate the server-owned crouch fraction too, so
  the rendered head and rewound head stay aligned through the transition. Normal
  standing/crouched physics volumes and weapon damage are unchanged. Client inputs
  cannot supply stance fractions, historical poses or timestamps.

Existing visibility filtering still removes hidden opponent history. The bounded
50 ms late-packet bridge, world occupancy checks, death/respawn resets and shared
shot lookback remain. Severe network outages can still stall updates; there is no
claim of instantaneous cross-region play.

## Validation

Regression coverage includes the old/new send-clock comparison at 60/144 Hz,
interpolated crouch/head alignment, real Durable Object session checks and fixed
clock under 120 ms database-read delay. Browser traces exercise both player seats
and the real practice bot controller with 120 ms delayed, uneven snapshots. Local
camera direction changes, jumping and crouching are also checked in Chrome and
Firefox. Bot walking traces suppress fire only to isolate locomotion; intentional
AI combat pauses remain. Runtime tests exercise ordinary two-player combat.

Deployment requires a matched frontend/runtime release after rooms drain. No
database schema, ledger, fee, stake or asset/map changes are included.

## Measured final traces

All eight targeted opponent tests passed across Chrome and Firefox: each browser
tested a 400 ms render stall, player seat A, player seat B and actual bot inputs.
Continuous player traces had zero stationary samples after warmup, median speeds
around the unchanged 4.90 m/s fixed-step walking rate, and maxima below 5.27 m/s.
Displayed pose age was about 199–215 ms with 120 ms injected one-way delay plus
the unchanged 75 ms interpolation cushion. Bot pauses correspond to its existing
combat intent; they are not treated as delivery failures.

The runtime test's producer was corrected to match the browser's fixed-step input
accumulator instead of emitting one command per potentially late Node timer. With
120 ms session reads, it measured 29.52 Hz, a maximum 83 ms snapshot interval and
movement in 96.9% of consecutive raw snapshots. Its original movement threshold
was retained. The render continuity test and raw runtime test measure different
layers of the pipeline. Local turn, jump/crouch and direction-change browser tests
also passed. These are workstation fault-injection results, not regional SLAs.

Final release gates: 801 unit tests across 97 files passed; TypeScript, targeted
ESLint, production frontend build and runtime deployment dry run passed.

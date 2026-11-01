# Existing-infrastructure latency pipeline

This release keeps the same match hosting, database, session validation and cash
settlement. It changes input scheduling and presentation, not geographic network RTT.

## Trigger transmission

Mouse-down sends a combat-only input immediately, independently of the render
accumulator's 34 ms movement deadline. Its axes are zero and it cannot carry jump,
reload, sprint or walk. It shares the connection's sequence watermark and fresh
session validation. The runtime extracts one authorized trigger per seat per
combat tick without spending or creating movement credits. Weapon and reload
changes remain ordered behind it. Normal movement and triggers share one combat
step and cooldown; duplicates cannot mint bullets. Moving spread and sprint-fire
restrictions use the last server-authorized movement intent, so zero axes cannot
grant stationary accuracy. Those intent flags are redacted for hidden opponents.
Aim and rewind use the original
trigger input and its server-recorded arrival, even if a later movement input turns
the camera. Legacy clients retain their regular-input firing path.

## Snapshots and playback

The runtime sends a snapshot for each approximately 34 ms physics tick, rather
than waiting for a 50 ms deadline. Intermediate poses and visibility redaction
remain intact. The browser starts at the legacy 110 ms playback buffer and adapts
within 65–110 ms from the p95 of recent arrival gaps plus physics-pose age and a
16 ms margin. At least 20 observations are required. Changes slew smoothly and
the existing monotonic presentation clock prevents backward playback.

Every new input includes the bounded effective drawn delay, including presentation
clock catch-up. Server rewind adds measured RTT to that value; absent hints retain
110 ms. Existing rewind caps, session gates and cash-result authority are unchanged.
Clean streams can use 45 ms less playback buffering; this is not a 45 ms ping reduction.

Percentiles are calculated on snapshot arrival, not each rendering frame. This
avoids adding per-frame sorting/allocations. The tradeoff is approximately 50%
more baseline snapshot messages (30 rather than 20 per second).

## Verification

- 198 unit tests passed, one existing skip, covering adaptive playback under
  10/30/80 ms jitter, movement, combat and hit registration across 50–180 ms RTT.
- Five targeted real Durable Object tests passed: immediate trigger, strict
  revocation, in-flight authority, movement flooding and held-fire burst recovery.
- Chrome browser tests passed for synchronous trigger transmission, short taps,
  automatic fire, walking and mouse look. The test's old route hit a Dustfront
  building; its start was moved to the open west perimeter alley without relaxing
  its distance assertion.
- Integrated Intel GPU profiling measured renderer CPU p95 about 2.6–2.8 ms and
  event-to-render p95 about 17–18 ms in the walking/look fixture. This does not
  establish a networking-worker bottleneck, so that rewrite was deferred.
- Hosted staging passed Practice plus two synthetic authenticated human seats,
  including immediate fire and snapshot cadence. Synthetic stakes were refunded
  and before/after balances matched. No production-money test transactions.

Deploy app and runtime together after draining rooms. Runtime supports cached
clients, but the new client requires the combat-only input path. Revert app first
before reverting the runtime if rollback is needed. Runtime health advertises
latencyVersion=2 and fps_region_latency includes an immediate-trigger counter.
Actual improvements on regional player connections require post-release samples.

Claude's opponent continuity update from main is included in this release. Its
latency-aware reveal window uses the same bounded effective playback delay as
shot rewind, and includes the arrival wait for immediate triggers. Its gait reset
and cover-edge reveal behavior are preserved.
The combined unit run passes 221 tests (one skip), plus five targeted runtime
checks. Snapshot sending is keyed to a new simulation tick rather than a second
wall-clock deadline, avoiding skipped updates when timer callbacks jitter.

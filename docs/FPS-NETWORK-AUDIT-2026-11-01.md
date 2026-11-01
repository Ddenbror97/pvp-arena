# PvPStrike pre-merge audit: opponent sync, movement and performance (2026-11-01)

Branch `fps-netaudit`, built on `fps-cleanup`. **Not merged and not deployed.**

## A. Root-cause analysis

The evidence comes from `tests/fps-remote-sync.test.ts`. It runs the real server pipeline end to
end on the client's actual playback classes, and compares every frame with the authoritative
server history at the drawn physics time. The pipeline includes:

- the server step: a 30 Hz fixed step with catch-up and timer jitter;
- the 20 Hz snapshot deadline, with `poseAt` on the physics clock;
- per-recipient visibility redaction;
- an in-order WebSocket model with RTT, jitter and delivery stalls;
- the client's actual playback classes, rendered at 30–240 FPS.

### Reproduced and fixed

1. **Back-and-forth motion and backward snapping during counter-strafing.** This was the
   main defect.
   - The 20 Hz snapshot deadline is serviced by a 30 Hz physics clock, so snapshot gaps
     alternate between 34 and 67 ms. Platform timer jitter stretches the long gap to about
     80 ms.
   - The 75 ms interpolation buffer covered only 1.5 snapshot intervals, so playback regularly
     ran past the newest received pose.
   - The 50 ms late-packet bridge then extrapolated through every direction reversal,
     overshot, and pulled back.
   - Measured on the previous client at 100 ms RTT and 10 ms jitter, counter-strafing gave
     **28 backward frames in 6 s, with up to 0.34 m drawn error**. At 30 ms jitter it gave 50
     backward frames.
   - This is network-independent: with zero jitter there were still 20 backward frames and
     0.29 m of error.
2. **Opponent hidden off the playback timeline.**
   - The server redacts the opponent's pose when it has no sight line, which is correct
     anti-wallhack behaviour.
   - The client applied that flag when the packet arrived. It draws opponents one buffer plus
     latency in the past, so the opponent vanished 0–75 ms before the drawn pose reached
     cover, depending on snapshot phase and jitter.
   - The client also wiped the movement history on every redacted frame, so each reappearance
     started without interpolation history.
3. **Teleport after a delivery stall.**
   - After a 400 ms stall the opponent jumped 1.25–1.45 m in one frame.
   - The existing smoothing only covered the 50 ms bridge, and in a post-stall burst only the
     first packet computed the correction.
4. **Five browser specs did not test the game.** They still used old Foundry coordinates.
   - In the hit-registration and blood specs, player B stood inside a solid object on the
     new map, with cover in the line of fire. The real server step confirms the shots hit
     cover there.
   - They "failed on main" for that reason, not because of game code.

### Ruled out (verified)

- **Stale or out-of-order frames reaching local reconciliation.** WebSocket delivery is
  in-order. A reconnect starts only after the old socket's `close` fires, and its handlers are
  detached, so two connections never overlap. Remote playback now also ignores stale and
  duplicate frames explicitly.
- **Clock-offset steps rewinding playback.** `SnapshotClock` maps time through the
  least-delayed packet, so a late burst cannot pull it back. This was already true and is now
  covered by a test.
- **Cosmetic frustum culling hiding a visible opponent.** The culling sphere (r = 1.65 m at
  0.85 m height) contains the new 1.7 m models and their rifles.
- **NaN or invalid positions.** No path was found; `push` now also rejects non-finite times.
- **React remounts and keys.** The 3D scene is outside React. HUD updates are throttled to
  4 Hz or important changes. Snapshot handling uses refs.
- **Frame-rate-dependent physics.** Inputs come from a capped-delta accumulator, one
  `TICK_MS` step each, on both client and server. A new test checks that 30, 120, 144 and
  240 FPS match 60 FPS in input rate, distance and jump height.
- **Per-frame allocation in the render loop.** It has none, apart from a one-time lazy
  initialisation.
- **Bandwidth.** A snapshot is 954 bytes, about 19 KB/s per player at 20 Hz. Message frequency
  is unchanged.

## B. Changes implemented

| File | Change | Why |
| --- | --- | --- |
| `src/lib/fps/presentation.ts` | See the list below this table. | Defects 2 and 3 |
| `src/lib/fps/renderer.ts` | Pushes every frame with its visibility; draws only when `sample` returns a pose; removes the "snap to the raw server position" fallback. | Uses the timeline |
| `src/lib/fps/network.ts` | `REMOTE_DELAY_MS` 75 → **100** ms (two snapshot intervals, the `cl_interp_ratio 2` rule); `MAX_REWIND_MS` 200 → **250** ms. | Defect 1; keeps lag compensation aligned with what is drawn |
| `workers/fps/lag-compensation.ts` | Shot history keeps the rewind cap plus two steps. | A maximal lookback still interpolates |
| `tests/fps-remote-sync.test.ts` | New end-to-end sync harness and deterministic timeline tests. | P0 and P7 |
| `tests/fps-network.test.ts`, `tests/fps-lag-compensation.test.ts` | Use the shared constants instead of hard-coded 200 ms. The lag-compensation test had hand-coded a more generous lookback (`rtt + 50`) than the server uses. | Correct expectations |
| `tests/e2e/fps-characters.spec.ts`, `fps-blood-wall.spec.ts` | Moved to verified open positions on the Aim Arena. | Defect 4 |

In `src/lib/fps/presentation.ts`, `RemotePresentation` now:

- applies visibility redaction at the redacted frame's physics time;
- never interpolates across a hidden interval;
- ignores stale and duplicate frames;
- repays post-stall catch-up as a decaying forward glide of up to 1.5 m, and snaps beyond
  that.

## Results (harness, previous client → current client)

| Scenario | Backward frames | Max drawn error | Missed while visible | Teleports |
| --- | --- | --- | --- | --- |
| Counter-strafe, 100 ms RTT, 10 ms jitter | 28 → **2** | 0.34 → **0.16 m** | 0 → 0 | 0 → 0 |
| Counter-strafe, 30 ms jitter | 50 → **9–10** | 0.47 → **0.29 m** | 0 → 0 | 0 → 0 |
| Corner peeks, 50/100/200 ms RTT × 30/60/144/240 FPS | ≤ 1 per reversal | ≤ 0.22 m | 3 → **0** | 0 |
| 400 ms delivery stall | 0 | — | 0 | 1 → **0** |

The remaining backward frames are one per direction reversal: linear interpolation between
20 Hz poses cuts each reversal corner by up to about 0.2 m. The only remedy is a higher
snapshot rate.

## Gameplay impact (intentional)

- Opponents are drawn 25 ms further in the past: 100 ms instead of 75 ms, plus one-way
  latency. This is the standard trade-off for smooth playback at 20 Hz.
- Lag compensation follows the same constant, so hit registration still matches what the
  shooter sees. Full compensation now covers up to 150 ms RTT, and a moving target registers
  at 180 ms RTT, the same as the previously tested coverage.
- **Deploy the frontend and the match Worker together**, after rooms drain. A mismatched
  pair would rewind 25 ms off for one side.

## C. Performance measurements

These were measured with `fps-map-baseline`, comparing `fps-cleanup` (before) with this branch
(after), on the same machine and in the same session.

| Metric | Before | After |
| --- | --- | --- |
| Draw calls | 94 | 94 |
| Triangles | 186,419 | 186,419 |
| Shader programs | 63 | 63 |
| Per-frame CPU, p50 (idle / run-turn / look-360) | 5.9 / 3.6 / 4.7 ms | 4.5 / 2.8 / 4.8 ms |
| Per-frame CPU, p95 | 20.3 / 16.3 / 11.1 ms | 9.0 / 14.0 / 13.7 ms |
| Lifecycle (4 remounts): textures / geometries / programs after dispose | 32 / 59 / 62 | 32 / 59 / 62 |
| JS heap across remounts | 86–99 MB | 83–100 MB |
| Match Worker bundle | — | 74.2 KiB (19.4 KiB gzip) |

- The render workload is identical. The sync changes are O(1) per frame and add no allocations.
- CPU differences are within run-to-run noise.
- This environment renders with SwiftShader, a CPU rasteriser, at 3–8 s per frame. Its
  wall-clock frame times, FPS and 1% lows say nothing about a player's GPU, so they are not
  reported as FPS.
- **Real GPU frame pacing, 120/144 Hz, and Chrome/Firefox/Edge on Windows were not measured
  here.**
- The arena's earlier GPU baselines in `docs/fps-map/` stand, and the render workload has not
  changed since.

Network:

- Snapshot payload: 954 B; 20 Hz send rate; about 19 KB/s per player.
- Message rate is unchanged.
- The interpolation delay is 100 ms, up from 75.

## D. Regression results

### Passed

- Unit and integration: 895 tests in 98 files. This includes the new sync harness (44 cases)
  and the real Durable Object runtime tests.
- The one failing file, `architecture-opt`, is a pre-existing missing generated guide
  catalogue that also fails on `main`.
- TypeScript is clean (apart from that missing catalogue), as is `--noUnusedLocals` on the FPS
  code.
- ESLint passes on all changed files.
- `npm run build` succeeds, and so does `wrangler deploy --dry-run` for the match Worker.
- Browser specs:
  - `fps-character-models`
  - `fps-characters`: head height, body hits and headshots
  - `fps-combat`
  - `fps-authored-assets`
  - `fps-motion-continuity`
  - `fps-map-baseline` (before and after)

### Fixed test defects

`fps-characters` and `fps-blood-wall` were broken by the map change: B stood inside cover. On a
software-rendered start, the fixture's 60 s round also expired and respawned both players.
Probes confirmed that positioning and hit registration work.

### Not executable here

These need real GPU frame times. SwiftShader gives about 0.2–0.4 FPS, so the specs fail on
frame counts or frame-time assertions whatever the code does:

- `fps-opponent-timeline`
- `fps-close-opponent`
- `fps-culling`
- `fps-death-feedback`
- the p95 frame-time assertion in `fps-blood-wall`
- `fps-frame-pacing`

`fps-lobby` and `fps-loading` need the `:4180` app server.

The P0 behaviour these specs observe is covered deterministically by
`tests/fps-remote-sync.test.ts`.

Also not executed:

- Firefox and Edge;
- real two-client play over a real network;
- tab backgrounding and window resizing on real hardware.

## E. Remaining issues

- **20 Hz interpolation corner-cutting.** Each direction reversal is drawn up to about 0.2 m
  inside the true path. The fix is a higher snapshot rate, which costs bandwidth and Durable
  Object CPU. Revisit only if players notice.
- **Heavy jitter.** At 30 ms or more, the 50 ms bridge still overshoots some reversals: about
  10 backward frames in 6 s of continuous counter-strafing, down from 50. Removing the bridge
  trades this for visible freezes.
- **Edge flicker.** Server visibility redaction uses nine sight-line points on a 0.9 ×
  radius silhouette. An opponent whose rifle or elbow pokes past cover is still redacted, by
  design. If players report enemies "blinking" at corner edges, widen the silhouette or add a
  short redaction hysteresis. Both trade a little wallhack resistance.
- **Real-hardware verification** of frame pacing at 120/144 Hz, Firefox and Edge, and a two-PC
  match with network throttling (Chrome DevTools: 100 ms RTT plus jitter).

## F. Merge decision: **GO to merge; deploy after a short real-hardware check**

Evidence:

- The reproduced defects (counter-strafe overshoot and pull-back, early disappearance at
  cover, teleport after stalls) are fixed in the code the game runs. They are verified
  frame-by-frame against the authoritative server history, across 50–200 ms RTT, 10–30 ms
  jitter and 30–240 FPS.
- Server authority, anti-wallhack redaction, input validation and the bounded rewind are
  intact. Lag compensation moves with the interpolation delay.
- The render workload and resource lifecycle are unchanged.

Before deploying:

- Deploy the **frontend and the match Worker together**, after rooms drain:
  `npm run deploy` and `npx wrangler deploy --config workers/fps/wrangler.jsonc`.
- Play one two-PC match on real hardware: strafe, peek corners and shoot.
- If the enemy "disappearing" you saw is still reproducible after that, it is not one of the
  causes found here. Report the map location, and the client diagnostics will help trace it.

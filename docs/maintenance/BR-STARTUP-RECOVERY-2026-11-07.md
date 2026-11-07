# Battle Royale startup recovery — 2026-11-07

Project Island's loading bar deliberately stops at 99% until assets are ready and the
arena has rendered a HUD frame from the server snapshot. Asset completion alone must
not uncover a blank canvas or discard the initial route, kit, loot and door baselines.

## Confirmed defects

- The 30-second first-frame deadline permanently stopped the connection and set an
  error which a subsequently rendered frame could not clear. The player remained
  covered by the loading screen even after rendering recovered.
- Admission had no browser-side deadline. An unresolved request prevented reconnects.
- Socket callbacks did not distinguish the current socket from a replaced connection.
- A reconnect baseline at an already-consumed tick was discarded by the arena's tick
  filter, despite containing one-time state for that connection.
- Asset downloads had no per-request timeout or automatic recovery. Completion after unmount also
  leaked a newly loaded island or continued shader preparation on a disposed renderer.

## Changes

Keep the prepared island while retrying a slow connection. Clear the recoverable
startup notice when the first frame arrives; terminal version/access/session errors
remain terminal. Bound each admission attempt to 15 seconds, reject stale socket
callbacks and consume reconnect baselines even at an identical tick. Keep progress
monotonic within an attempt. Once a snapshot arrives, wait for the GPU frame without
replacing a working connection.

The follow-up removes the manual retry button and the whole-arena restart wrapper.
Terrain metadata, models (including weapons/gear) and tree textures use a shared
download path: a 20-second inactivity deadline covers headers and the response body,
resetting whenever another chunk arrives so slow healthy transfers finish. Transient
network/408/429/5xx failures retry only that file with capped backoff. Successful work
is preserved. Leaving the arena aborts outstanding downloads and retry delays. There
is no arbitrary total loading deadline that turns a slowly completing load into a
permanent failure. Missing files and corrupt assets still report a deployment error
rather than being retried forever. Late callbacks cannot admit a disposed attempt.

No graphics settings, gameplay rules, Worker protocol or database changes.

## Validation

- Eight isolated browser integration tests: delayed assets, first-frame timeout,
  late-frame recovery, socket replacement/baseline resend, hung admission, slow assets,
  asset failure and fullscreen/inventory behavior.
- The delayed-frame regression fails with the previous component's permanent error.
- Native Chrome runs the real component and GPU arena against local production assets
  and a synthetic transport. It enters gameplay without page errors and accepts loot
  in a reconnect baseline at the same tick. This is a renderer/transport check, not a
  claim that every production network interruption has been reproduced.
- An injected model HTTP 503 is retried exactly once in native Chrome before automatic
  gameplay entry. No page errors or player interaction are needed.
- Download unit tests cover transient failures, a stalled response body, slow healthy streams, cancellation
  and permanent missing files.
- Fourteen related match/HUD/insertion-audio unit tests, TypeScript, lint and production
  build pass.

Deploy the site only. The production match Worker stays unchanged.

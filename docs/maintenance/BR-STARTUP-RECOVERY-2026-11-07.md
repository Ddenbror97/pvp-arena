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
- Asset preparation had no deadline or in-place retry. Completion after unmount also
  leaked a newly loaded island or continued shader preparation on a disposed renderer.

## Changes

Keep the prepared island while retrying a slow connection. Clear the recoverable
startup notice when the first frame arrives; terminal version/access/session errors
remain terminal. Bound each admission attempt to 15 seconds, reject stale socket
callbacks and consume reconnect baselines even at an identical tick. Keep progress
monotonic within an attempt. After 120 seconds of asset preparation, offer **Try again**
to dispose the old attempt and create a new one without leaving the route. Late
callbacks cannot complete or admit the disposed attempt.

No graphics settings, gameplay rules, Worker protocol or database changes.

## Validation

- Eight isolated browser integration tests: delayed assets, first-frame timeout,
  late-frame recovery, socket replacement/baseline resend, hung admission, asset retry,
  asset failure and fullscreen/inventory behavior.
- The delayed-frame regression fails with the previous component's permanent error.
- Native Chrome runs the real component and GPU arena against local production assets
  and a synthetic transport. It enters gameplay without page errors and accepts loot
  in a reconnect baseline at the same tick. This is a renderer/transport check, not a
  claim that every production network interruption has been reproduced.
- Fourteen related match/HUD/insertion-audio unit tests, TypeScript, lint and production
  build pass.

Deploy the site only. The production match Worker stays unchanged.

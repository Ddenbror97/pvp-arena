# Project Island insertion and landing movement

The aircraft now crosses any seeded route in 30 seconds. Position uses the fraction of the route completed rather than a fixed metres-per-second value; diagonal routes no longer extend the flight. The jump window opens after two seconds so players can still reach the early part of the island. The HUD reads this same shared constant.

The room previously applied a human's movement only when a new packet was available for that tick. With alternate packets missing, a character who had just landed walked half the normal distance. Parachutes continued gliding on those empty ticks, making this particularly noticeable after landing. The regression test reproduces that difference on flat, dry ground.

`BrInputQueue` preserves continuous movement for up to 100 ms of simulation time across short packet gaps. Inputs older than 200 ms of wall time are discarded. A fresh stop overrides held movement immediately. Repeated input never repeats fire, jump, reload, plane exit, parachute deployment or weapon selection. Packet bursts still grant at most one input per simulation step, with an eight-input backlog. Existing reconnect and disconnect cleanup also discard the continuity state.

The browser clears held controls on loss of pointer lock, window focus or visibility, preventing missed key-up events from leaving quiet-walk/crouch controls stuck. Healing and intentional walk/crouch speed limits remain in place.

Validation: the drop, match and static-world suites passed; all four new continuity regressions and all six real Worker runtime tests passed, including a full match and multi-room load coverage. Typecheck, targeted lint and the production site build passed. This reproduces and fixes a code path consistent with the reported symptom; it does not claim production session telemetry identified every possible slowdown.

Release both the site and FPS Worker together after existing matches finish, preserving production runtime configuration. Both artifacts use the shared flight timing. No database migration is needed. Reload cached game clients before the next match.

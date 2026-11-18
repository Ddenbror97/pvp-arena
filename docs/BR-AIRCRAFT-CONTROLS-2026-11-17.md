# Aircraft controls and landing tolerance — 2026-11-17

The pilot can hold the left mouse button and drag up/down to select a modest nose angle. The angle stays selected while held; releasing centres the elevator. The controller eases the elevator as the aircraft approaches the selected angle, instead of indefinitely pulling into a stall. Unheld mouse input retains its existing spring-back behavior. Up/Down arrow keys offer an alternate pitch control. Rotation waits for about 55 KT, avoiding a tail scrape while accelerating.

The cockpit hint documents the gesture and rotation speed. The engine auto-starts on boarding; F toggles it off/on. W/S change throttle, A/D roll, Q/R rudder, Space brakes, G flaps, C camera, Alt free look and E exit. The flight branch consumes mouse buttons before the weapon handlers. Button release, free look, inventory/settings, blur, pointer-lock loss, seat changes and exit clear held pitch.

Landing gear now tolerates 4 m/s sink before damage (previously 2.8); the failure reference is 8 m/s (previously 6). Gear damage counts a touchdown once rather than again on each suspension-compression substep. Bullet damage, overall health, hull collision and severe-impact damage are unchanged.

Validation: aircraft client, physics and match tests; new regression tests drive the real client controls through the current Island Airfield terrain/collision at 30 Hz, including short and large drags, a pull held before rotation speed, and arrow-key takeoff. On this simulation the aircraft climbs beyond 25 m without damage and remains above 30 m/s. A 5 m/s wheels-first touchdown loses under 5% health and retains functional gear; a 15 m/s slam still causes lethal damage. Typecheck, targeted lint and production build are required before release. Physical mouse feel in a live multiplayer match has not been verified here.

Release: site and dedicated BR match Worker, preserving production settings. No database changes, secrets or feature-flag changes.

## Follow-up — 2026-11-18

The first release's 100-pixel drag regression missed the user's small-drag case: a 10-pixel upward drag left the aircraft grounded. That regression was run against the old controls and failed before the correction. Holding left mouse now uses a separate aircraft pitch gain, independent of on-foot aiming sensitivity. At full power and rotation speed, a deliberate upward request selects the bounded 12-degree climb target and holds it after liftoff. W still controls throttle; arrows remain optional, not part of the required gesture.

New coverage includes a 10-pixel drag at normal and low on-foot sensitivity. A headless Chrome run also exercised the real arena's mouse events, resampler, input serialization/validation, prediction, snapshots and shared match simulation, with W and left mouse held and no arrow keys: the aircraft climbed above 30 metres with full health. This is local rendered-client evidence, not a production multiplayer playtest. The cockpit hint now explicitly describes a small drag. This follow-up changes only the site; landing physics from PR #274 remain unchanged.

## Mouse steering and calmer corrections — 2026-11-18

Holding left mouse now steers the bank with horizontal movement; on the ground it steers the nose wheel. Turns are bounded to a 30-degree target and the aileron command ramps in. Releasing left mouse eases the wings level and selects a gentle 3–5-degree cruise attitude, instead of allowing a neutral-elevator descent. A/D remain optional backup controls. Downward pitch gain is one third of the takeoff gain; upward corrections in the air use half the takeoff gain. Cockpit instructions describe W/S, mouse steering/pitch, rotation speed and release behavior.

The engine uses the owner's takeoff loop on the runway and in the air, with RPM/speed-driven rate and level. The separate driving recording is no longer requested or layered in; startup, stall warning, spatial falloff and shutdown remain. The old static audio file remains available for older clients.

Regression coverage adds physical left/right mouse turns, wing levelling after release, ground steering, a gentle downward correction, a current-terrain takeoff/release flight and audio continuity without an extra driving source. A local headless Chrome run through the real arena and shared match also confirmed the turn and wing levelling. Site-only release; no Worker, database, secrets or feature flags change.

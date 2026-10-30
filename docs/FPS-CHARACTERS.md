# Reference-based opponent characters

The later [authored model integration](FPS-AUTHORED-ASSETS.md) supersedes the
primitive geometry below; this rig remains the loading/failure fallback.

The two supplied portraits guide the existing seat roles: A is the navy-clad
police officer with cap, aviators, radio and dark armor; B is the masked fighter
with woven scarf, dark clothing and tan webbing. These are procedural 3D meshes
with articulated joints, not portrait billboards. Faces and clothing remain
stylized; they do not reproduce the portraits' photographic asset quality.

## Geometry and movement

`character-rig.ts` builds tapered torsos, layered armor, magazine pouches, belt
buckles, shoulder patches, radio cable, separate aviator lenses/frames, cap brim,
mask/scarf, cargo pockets, knee pads, boots, palms and curved gripping fingers.
Each joint's static geometry is merged by material before play. Existing AK
artwork and volumetric weapon geometry are retained. Opponents now switch their
visible weapon with authoritative snapshots, including pistol muzzle effects.

Two-segment arm and leg solvers keep elbows/knees connected as the pose changes.
Stride phase follows distance traveled, with velocity-smoothed amplitude and
local travel direction for forward/back/strafe motion. Idle breathing, airborne
leg tuck, crouched leg folding, recoil and reload weapon tilt are cosmetic.
Yaw uses shortest-angle interpolation. Positions, jump height, crouch, life,
weapon, reload and confirmed shots still come from authoritative state.
No second input controller, client damage claim or new networking loop is added.
These are procedural motion poses, not captured human animation clips.

## Hit volumes

`player-volumes.ts` defines the shared server head/body envelope. Head centers
remain at 1.6 m standing and 0.95 m crouched, relative to the server's feet
coordinate. Head full extents remain 0.4 m per axis; body horizontal extents
remain 0.7 m. The character rig uses the same shared head height.

Body height now spans floor to 1.4 m standing / 0.8 m crouched. This intentionally
fixes the old 15–20 cm gap below the body's hit box: visible boots can now take
body damage. Headshot multipliers, weapon damage and world-cover occlusion are
unchanged. Hit volumes remain coarse head/body boxes, not per-finger/per-bone
mesh collision. Decorative equipment and weapon meshes do not enlarge them.

The server's existing tick-start snapshot determines the hit pose, including
crouch transitions; tests establish crouch before firing instead of assuming
same-tick input changes an earlier combat snapshot. The frontend and match
Worker must be released together for the body-envelope change.

## Verification and captures

619 unit tests passed, including new standing/crouched boot-hit regressions and
a miss at the old standing head height after crouching. Browser checks exercise
actual shots against the rendered opponent, head/body hit events, model head
alignment while standing/crouching/jumping, finite rig matrices, movement,
reloading, full-auto release, impacts, both roles and disposal. Screenshots use
the real renderer and local simulation fixture; they are not proof of deployed,
authenticated multiplayer. App/Worker TypeScript, targeted lint and build are
also checked. Existing financial release gates still apply.

- [Police in the actual arena](screenshots/fps-character-officer.png)
- [Masked fighter in the actual arena](screenshots/fps-character-fighter.png)

This pass is local and is not deployed.

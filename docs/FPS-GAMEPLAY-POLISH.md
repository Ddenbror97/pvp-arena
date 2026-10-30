# In-game polish, October 29

The existing Three.js renderer, arena, shared movement controller, authoritative
simulation and admission protocol are retained. No lobby, wallet, database or
authentication changes are part of this pass.

## Characters

`src/lib/fps/character.ts` creates two articulated, stylized 3D characters from
the supplied visual references: seat A wears navy police gear, cap, glasses and
POLICE patch; seat B wears a woven face covering, glasses, dark clothes and an
olive chest rig. Both carry a rifle, have procedural walking/aiming animation,
and show confirmed remote-shot flashes. The opponent is selected from the
existing server-assigned seat, including spectator view. Cosmetic identities
stay fixed when round spawns alternate. Hitboxes, health and collision remain
identical; these are not photorealistic scanned/rigged versions of the portraits.

## Weapon and input

The existing procedural rifle retains its receiver, barrel, furniture and purple
branding. It gains a curved magazine silhouette, receiver branding, restrained
view lighting, gloved support hands, idle/strafe/turn sway, jump/landing response,
kickback and smooth reload tilt. A second layer pass through the same renderer
and camera draws only the held weapon after depth clear, preventing wall clips
without allowing opponent models to render through walls.

Confirmed shot events drive short yellow-orange flashes, a pooled smoke mesh,
brief lighting, bounded predictable camera recoil and weapon kick. Event IDs
prevent duplicate recoil from repeated snapshots. Damage, ammo, fire intervals,
magazine sizes and reload deadlines stay server-controlled. The existing spread
calculation now scales with burst length, movement and airborne state; the burst
resets after a pause. The renderer and standalone match Worker must deploy the
same shared simulation when this feature is released.

Input emission now uses the runtime's existing 34 ms integer cadence so the
client does not slowly accumulate commands ahead of the server. Mouse-up clears
the fire intent synchronously; already transmitted commands still have ordinary
network/snapshot latency. Escape explicitly releases pointer lock and clears
held keys, using the existing listener. WASD, mouse, Space, R and 1/2 remain;
Shift retains the game's existing sprint behavior. Crouching did not exist and
is not faked with a camera-only height change.

The existing HUD layout remains. Crosshair expansion and a short confirmed-hit
marker update directly from the render/snapshot loop, without per-frame React
state. Reload visuals follow the authoritative weapon and expiry, even when a
weapon switch is requested while reloading.

## Verification

The unit suite passed 588 tests, including fixed-rate full-auto, release, empty
magazine, reload/refill, burst reset, deterministic bounded recoil, moving/airborne
spread and identical recoil recovery at 30/60/144 rendering FPS. Existing collision,
combat, financial and real WebSocket lifecycle tests remain in the suite.

Browser tests use real Three.js, the real controller and shared simulation in an
explicit local fixture, with no production test route or fake authenticated user.
They exercise both characters, pointer lock/re-entry, strafing, mouse aiming,
jump, held automatic fire/release, reload and renderer disposal. The separate
application smoke tests continue checking lobby layout and actual route startup.
These tests do not replace the previously documented authenticated staging and
cash-release gates in `FPS-OPERATIONS.md`.

Final checks passed: 588 unit tests, four Chrome browser tests, targeted ESLint,
casino and match-worker TypeScript checks, and the production build. Character
screenshots in the ignored `test-results/` directory are local renderer fixtures,
not evidence of authenticated deployed multiplayer. This polish was not deployed.

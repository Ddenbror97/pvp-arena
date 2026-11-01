# Held-fire command queue recovery

The 14:11 São Paulo practice match had 16–17 ms median session checks but
151–154 ms median arrival-to-applied command delay. The original catch-up helper
rejected every fire=true input, including redundant held-rifle inputs between
actual shots. A four-command burst therefore left firing behind the live queue.
The diagnostic runtime reproduced 176 ms median input-to-snapshot delay while
holding fire, versus 82 ms without the burst. These local end-to-end measurements
include snapshot delivery and are not identical to production command-delay telemetry.

Catch-up now accepts a rifle hold only if a newer authorized rifle hold remains.
Movement still spends the existing bounded command credit. Only the normal combat
step fires; ammo, recoil, shot timestamps, rewind and rate limiting retain their
normal paths. A tap followed by release, reload, weapon switch or pistol shot is
not folded. Folding a release updates triggerHeld so pistol trigger edges survive.

Regression coverage includes burst latency, no extra ammo consumption or faster
cadence, protected action edges, strict session checks, movement flood limits and
hit registration. The latency regression requires median local input-to-snapshot
delay below 140 ms after a burst with 18 ms session checks. Regional ping is unchanged.

Deployment is match-server-only: client timing, protocol, normal simulation and
map assets are unchanged. Pause new entries and drain rooms before restarting.

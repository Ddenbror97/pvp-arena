# Dustfront loading and silent walking

Practice and paired human matches use the supplied full-screen image, converted
at original 1672 × 941 resolution to a quality-92 WebP (414,530 bytes). The same
hashed asset URL is used for match-intent preload, document preload and display.
The lobby showcase remains independent.

The preparation bar follows real completion milestones: engine import, map,
operators and weapon preparation, shader compilation, then the authenticated
connection and initial snapshot. It measures preparation, not download bytes.
At 100% the client sends readiness automatically and reveals the arena without
an Enter/acceptance button. Explicit cash-entry consent stays in the lobby and
private invitation flow; loading never reserves a second entry.

Start/Join clicks reserve pointer lock on the stable document body, then hand it
to the canvas after loading. Reservation ownership prevents Practice cleanup
from releasing the next cash match's mouse permission. Failed/abandoned starts
release late grants. Direct links or restricted browser permissions still enter
automatically; a small in-arena hint allows a canvas click to grant mouse control,
without a modal or Enter button. First gameplay interaction can unlock audio on
browsers that gate it separately. Escape retains the existing settings menu.
See [browser pointer-lock requirements](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock).

Both Shift keys now select silent walk at 45% of normal movement speed. The same
physics function drives local prediction and authoritative movement. An optional,
strictly validated `walk` input preserves compatibility with older input shapes.
The server emits no footstep events during walking and resets accumulated stride
distance; walking does not block firing. Crouch and ordinary WASD retain their
existing movement. The legacy sprint input stays supported for cached clients;
the current keyboard mapping uses Shift for walking.

All existing footstep sample gains are multiplied by 0.75, including local,
opponent and soft crouch steps. Gunshots, reloads and other sounds are unchanged.

This release also incorporates main's frontend cleanup and opponent-sync audit.
The shared playback buffer is 100 ms, so the app and match worker must deploy
together with active matches drained first. No schema migration is required.

Validation includes real authenticated staging Practice and both human seats,
full-screen WebP/preload checks, absence of entry buttons/modals, automatic canvas
mouse capture, and a real Shift+W movement/footstep check. Targeted simulation,
protocol, network, rewind and pointer-handoff tests cover the changed behavior.

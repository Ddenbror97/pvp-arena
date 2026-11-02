# Shared crouch-jump clearance

Space jumps, Ctrl crouches and W moves forward. Shift remains silent walk. Duck
at takeoff or during ascent to tuck the feet above a reachable ledge. Grounded
duck before takeoff also works. Release Ctrl after landing to stand up.

The existing jump impulse (5 m/s), gravity (14 m/s²), normal jump trajectory,
stairs and character animation clips are unchanged. Air-duck contracts the hull
upward by the 0.65 m standing/crouched eye-height difference. It changes feet
clearance, not vertical velocity. A normal jump still peaks at about 0.811 m;
fully tucked feet can clear approximately 1.461 m, subject to horizontal timing
and headroom. This permits the tested 1.3 m crates; it does not mantle arbitrary
walls. No automatic climbing or new jump impulse is applied at a ledge.

`Player.airCrouchOffset` records the applied stance offset for shared prediction
and server snapshots. Uncrouching reverses the offset only when the standing
hull fits. Landing clears it without lowering the feet through their support.
Repeated duck transitions cannot accumulate height. Hit volumes continue to
follow the authoritative feet and crouch stance. Hidden opponents have the
offset redacted alongside their other movement fields.

The camera compensates for the feet-coordinate shift while preserving the
existing normal jump interpolation. The shared simulation applies to Practice,
human matches and every registered map. No per-map movement implementation is
needed. Existing authored jump/crouch animations are reused.

For release, deploy both the match Worker and app: both contain shared movement
prediction. Use the generated production Worker configuration. An older client
predicts the previous duck behavior until refreshed.

Regression coverage: `tests/fps-jump-cover.test.ts` and
`tests/fps-frame-motion.test.ts`, including original jump trajectory, early and
late duck, pre-duck, tall/unreachable cover, limited headroom, blocked uncrouch,
repeated duck and camera stance continuity.

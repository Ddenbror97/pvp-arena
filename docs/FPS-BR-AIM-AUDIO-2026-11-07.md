# Project Island aiming and audio repair

## Confirmed causes

- The three BR-specific v1 rifle WAVs contain zero-valued PCM data. Looking at the WAV header bytes gives a misleading nonzero peak. Tests now locate the RIFF `data` chunk and check real sample energy for all six rifle/silencer combinations.
- BR added authoritative recoil to shot direction without sending that recoil to the local camera. Sustained fire could therefore miss above a target while the visible reticle remained on its body.
- Viewmodel sight alignment happened before the final weapon rotation and sway, moving the visible optic away from the camera ray. M4 irons also targeted the mounting rail rather than the rear aperture.
- BR never connected most grenade sound cues. Its HE used the C4 recording, while smoke/fire had no ignition or sustained sound.

## Changes

- Rebuild audible replacement rifle mixes from existing project recordings; retain the silent v1 URLs for cached clients. Source and processing are documented in `public/fps/audio/ATTRIBUTION.md`. Decode audio during loading before entering the arena.
- Send the local player's authoritative recoil and shot counter. Predict recoil with the same shared combat pattern, discard acknowledged predictions, and recover rejected predictions. Display it once in the camera; input still carries raw mouse aim so the server does not apply recoil twice.
- Align sights after final weapon rotation. Calibrate the M4 rear aperture. Hitboxes, damage and ballistic drop are unchanged.
- Extract the existing 1v1/5v5 procedural grenade bank into a shared module. BR uses it for draw, pin, throw, spoon, bounce, HE, smoke pop/hiss and fire ignition/crackle, with positional attenuation and the existing volume control. Late area snapshots do not replay ignition sounds.
- BR rules version is now 3. Deploy site and match Worker together using the generated production configuration. No database migration.

## Validation

- Regression tests cover actual PCM energy, shared grenade samples, area sound lifecycle, sight alignment under rotation, predicted/acknowledged recoil, and 50-metre chest hits with AK/M4 irons and red dots using island collision.
- Native Chrome with the real viewmodels and game simulation checks all six rifle reports and target damage at 50 metres, plus all three grenade detonations and handling/ambient cues. M4 iron and optic screenshots are retained in local release evidence.
- These checks establish functional correctness; they do not establish frame rates on every player's hardware or real regional latency.

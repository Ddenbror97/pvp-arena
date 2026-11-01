# PvPStrike recorded sound effects

The legacy source recordings listed below are **CC0**. They were downloaded from the public mirror
https://github.com/petroulacl/fps-asset-kit and their original asset pages were
independently checked on 2026-10-30. These legacy recordings do not include Counter-Strike/Valve audio.

- `ak47-a-v1.wav`: Ben Jaszczak, Brian Nelson, Kevin Heras and Matthew Nanney,
  The Free Firearm Sound Library, `AK-47/C_27P.wav`, final shot of the opening burst.
- `ak47-b-v1.wav`: same authors/library, `AK-47/C_29P.wav`, final shot of the opening burst.
- `pistol-v1.wav`: same authors/library, `1911/A_34P.wav`, isolated shot.
  Original source and license: https://opengameart.org/content/the-free-firearm-sound-library
- `step-0-v1.wav` through `step-3-v1.wav`: Fantozzi, stone steps L1, R1, L2, R2.
  Original source and license: https://opengameart.org/content/fantozzis-footsteps-grasssand-stone

Processing: isolated shots, short fade boundaries, level normalization, mono mix
and 24kHz 16-bit PCM WAV conversion. Footsteps converted from the source Ogg files.
Total audio payload is 196,188 bytes; samples are decoded once per arena audio
session and played with distance/pan/occlusion filtering and bounded voice counts.

## AK sound design update

`ak47-a-v2.wav` and `ak47-b-v2.wav` are new mixes of the CC0 recordings above,
with a tighter tail, reinforced low-frequency report and original synthesized
mechanical layers. `ak-reload-empty-v1.wav` and `ak-reload-tactical-v1.wav` are
original deterministic procedural effects: magazine release, rock-out, insertion,
seating and (empty only) bolt travel/closure. Their 1.8-second timelines follow
the authored reload clips. No samples from the user's Counter-Strike reference
are included. Rebuild with `node scripts/fps/build-ak-audio.mjs`.

## User-requested reference extraction

The currently active `ak47-reference-v1.wav`, `ak-reload-reference-empty-v1.wav`
and `ak-reload-reference-tactical-v1.wav` are edited extracts from the user's
supplied `AK47 CSGO sound for shooting and reload.wav`, at their explicit request.
They are not the CC0 recordings or the original synthesized effects described
above. Processing preserves the reference pitch and 48 kHz sample rate, mixes
to mono for positional playback, trims/fades boundaries and normalizes level.
Reload components are placed on the existing 1.8-second animation timeline.
No new license is asserted for the supplied reference. Rebuild with
`node scripts/fps/extract-reference-ak-audio.mjs <reference-path>`.

## Police M4A1 (seat A)

`m4a1-suppressed-v1.wav` is the single shot isolated from the M4 recording the project/user
supplied (`M4_sound.wav`, 2026-11-01), at their request: onset-aligned, short fade boundaries,
mono, 48 kHz, normalised. No new license is asserted for the supplied recording.
`m4-reload-tactical-v1.wav` and `m4-reload-empty-v1.wav` are original deterministic procedural
effects (release button, magazine out of the well, pouch, insertion and seating; empty: the
dropped magazine and the bolt-catch release) on the 1.8-second M4 reload clips. The brass
casing landing is synthesised at runtime. Rebuild with
`node scripts/fps/build-m4-audio.mjs <M4 recording.wav>`.

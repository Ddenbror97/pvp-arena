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

The active `m4-reload-tactical-v2.wav` and `m4-reload-empty-v2.wav` replace that
procedural foley with the user-supplied AK reference reload components described
above. Each mechanical cue is raised one semitone with a subtle high-frequency
emphasis and retimed for the M4 magazine release, seating and empty-only bolt
release. Both clips remain mono, 48 kHz PCM16 and 1.8 seconds long. No new license
is asserted for these derivatives. Rebuild independently with
`node scripts/fps/build-m4-reload-audio.mjs`; the full M4 builder runs it too.
The old v1 reload files remain available for cached clients.

## Karambit (secondary slot)

`knife-flip-v1`, `knife-spin-v1`, `knife-catch-v1`, `knife-catch-soft-v1`,
`knife-cloth-v1`, `knife-slash-v1`, `knife-stab-v1`, `knife-hit-v1` and `knife-wall-v1` are
original deterministic procedural effects (no recordings). Idle tricks, the inspect and the
equip play them at cue times authored in the knife's Blender clips. Rebuild with
`node scripts/fps/build-knife-audio.mjs`. `pistol-v1.wav` is no longer played; it is kept for
one release so clients cached from before the Karambit do not request a missing file.

`knife-equip-v2.wav` (the draw) is the owner-supplied `pull_up_knife.mp3` (2026-11-09): the
blade's draw from its onset (1.419 s), 0.42 s, mono, the last 0.15 s faded, at the level of the
procedural `knife-equip-v1` it replaces (kept one release for cached clients). It plays on the
equip clip's `equip` cue (0.02 s), so it peaks while both hands rise into view, before the flip
(0.2 s) and catch (0.45 s) cues. Built by `node scripts/fps/build-br-smg-pistol-audio.mjs`.

## Bomb Defusal voice lines

Supplied by the project owner; no license is asserted here beyond the owner's. Each is trimmed
to the spoken line, mixed to mono, 70 Hz high-pass, 20/70 ms fades, loudness-matched to about
-16 LUFS (peak limit -1 dBFS), 48 kHz PCM16.

| File                        | Line                         | Source                          | Played                                             |
| --------------------------- | ---------------------------- | ------------------------------- | -------------------------------------------------- |
| `voice-t-planting-v1.wav`   | "Planting the bomb."         | `Terrorist_audio.wav`           | Terrorist radio, when a Terrorist starts planting  |
| `voice-p-defuse-v1.wav`     | "Defuse the bomb."           | `Defuse_the_bomb.wav`           | Police radio, when a Police player starts defusing |
| `voice-bomb-defused-v1.wav` | "The bomb has been defused." | `The_bomb_has_been_defused.wav` | everyone, when the bomb is defused                 |

`voice-bomb-planted-v1.mp3`: "The bomb has been planted." — owner-supplied `The bomb has been planted.mp3`, copied without re-encoding or voice/pitch changes; played to everyone on the authoritative bomb-planted event. Unlike the three WAV lines above, this file retains its original MP3 encoding.

`voice-terrorist-win-v1.mp3` and `voice-police-win-v1.mp3` are the owner's supplied `Terrorist win.mp3` and `Anti terrorist win.mp3`, copied without re-encoding or voice changes. The matching line plays to everyone on a confirmed Bomb Defusal round end, including halftime and the final round. They are not loaded in 1v1.

## AWP

`awp-shot-v2.wav`: the owner-supplied `Sniper_shoot_sound.mp3`. Its 1.5 s of leading silence was
trimmed, it was downmixed to mono (for in-game panning), the last 0.45 s faded and the level set
to −16.5 LUFS; nothing else was changed (no EQ, pitch or effects).

The rest is original, deterministic procedural synthesis (no recordings), built by
`scripts/fps/build-awp-audio.mjs` on the AWP animation timeline (`src/lib/fps/awp-timeline.ts`).

| File                                        | Sound                                                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `awp-bolt-v1.wav`                           | bolt cycle after a shot: handle up, rearward slide, case, forward, lock                                              |
| `awp-reload-v2.wav`                         | magazine change with a round chambered, with ringing steel on the release, the magazine leaving the well and seating |
| `awp-reload-empty-v2.wav`                   | the same, the empty magazine clanking on the floor, then the bolt slamming home                                      |
| `awp-zoom-in-v1.wav`, `awp-zoom-out-v1.wav` | scope clicks                                                                                                         |
| `awp-draw-v1.wav`                           | sling rustle and the rifle settling into the shoulder                                                                |

## Battle royale gunshots

Owner-supplied recordings (2026-11-03: "new sounds for battle royal with or no silencers"), one
shot cut from each, downmixed to mono, faded and levelled to −14 LUFS; nothing else changed.

| File                      | Source                                                           | Used for                                          |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `br-m4-v1.wav`            | `M4_no_silencer.mp3` (the last shot of the final burst, 6.135 s) | M4 without a silencer (the battle royale default) |
| `br-ak47-silenced-v1.wav` | `AK_silencer.mp3` (the last shot of the third burst, 4.605 s)    | AK-47 with the Silencer attachment                |
| `br-awp-silenced-v1.wav`  | `AWP_silencer.mp3` (the single shot at 2.215 s)                  | AWP with the Silencer attachment                  |

The other combinations reuse the existing sounds: the unsuppressed AK-47 and AWP their 1v1/5v5
shots, the M4 with a silencer the M4A1-S shot.

### Rifle audio repair (2026-11-07)

The three BR v1 WAV files listed above contain entirely zero-valued PCM samples.
Their original MP3 sources were not available for this repair. The active v2 files
are derived from existing project recordings by `scripts/fps/build-br-rifle-audio.mjs`:
`br-m4-v2.wav` combines the existing AK report and suppressed M4 recording with
short fades and a pitch adjustment; `br-ak47-silenced-v2.wav` and
`br-awp-silenced-v2.wav` filter the existing AK and AWP reports. These are replacement
mixes, not recovered copies of the original BR recordings. The v1 files remain for
cached clients. Grenade cues use the same procedural sample bank as 1v1 and 5v5.

### Silenced AK and AWP, v3 (2026-11-09)

The v2 silenced AK/AWP kept the unsuppressed report's blast and tail (only filtered), so
they did not sound suppressed. `br-ak47-silenced-v3.wav` and `br-awp-silenced-v3.wav`
(`scripts/fps/build-br-silenced-audio.mjs`) are built from the project's suppressed M4A1-S
recording (`m4a1-suppressed-v1.wav`), pitched down per gun, mixed with a short low-passed
slice of the gun's own report (`ak47-reference-v1.wav`, `awp-shot-v2.wav`) under a fast
decay. Same sources and licences as those files. The v2 files remain for cached clients.

## Battle royale parachute

`br-wind-loop-v1.wav`: owner-supplied `Wind audio.mp3`, first 12.5 seconds filtered at
85 Hz / 7 kHz, with a 500 ms equal-power wrap crossfade into a seamless 12-second loop.
Mono PCM16 at 24 kHz, RMS approximately -22 dBFS with peak below -9 dBFS. Mixed quietly
at 0.18 before the game master volume. Loops only while the local player is under the
parachute; fades out within 200 ms on landing or elimination. Rebuild with
`node scripts/fps/build-br-wind.mjs "path/to/Wind audio.mp3"`.

`br-parachute-v1.mp3`: owner-supplied `parachute audio.mp3`. Kept 2.30–23.18 s,
removing the silent opening and trailing silence; 5 ms/50 ms edge fades, stereo 192 kb/s MP3.
No pitch or voice changes. Plays once on the local parachute opening (manual or automatic),
uses the game volume setting, and fades out on landing or elimination.

`br-airplane-loop-v1.mp3`: owner-supplied `airplane sound.mp3`, 2.15–15.15 s,
with a 400 ms wraparound crossfade for continuous cabin ambience (stereo 192 kb/s MP3).
Uses the game volume setting; fades in aboard the plane and out when jumping or eliminated.

`br-captain-v1.mp3`: owner-supplied `captain speak airplane.mp3`, retaining 1.07–27.32 s
(leading/trailing silence removed, short edge fades), mono 128 kb/s MP3, approximately -16 LUFS.
Original voice retained; no voice synthesis or pitch changes. Plays once after the loading
screen has cleared and an aboard-plane frame is rendered. Engine ambience ducks during the
announcement; jumping or leaving fades the voice out. Uses the game volume setting.

## MP5 and Desert Eagle (all modes)

Owner-supplied recordings (2026-11-09: "add sound to the 2 new weapons … use the attached
files"), kept as received in `art/audio/owner-2026-11-09/` and built by
`node scripts/fps/build-br-smg-pistol-audio.mjs` (needs ffmpeg). Downmixed to mono, cut, faded and
levelled; no EQ, pitch change (except where noted) or effects. A peak limiter (1.5 ms lookahead,
40 ms release) holds the loudest cracks at −1 dBFS where noted.

| File                                                                | Source                                                                                                                                                                                                                        | Used for                                                      |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `br-mp5-v2.wav`                                                     | `MP5_no_silencer_sound.mp3`, the last shot of the burst (1.844 s) and the burst's tail, 0.42 s                                                                                                                                | MP5 in 1v1 / 5v5, and in the battle royale without a silencer |
| `br-mp5-silenced-v2.wav`                                            | `MP5_shoot_silencer_sound.mp3`, the single shot (1.555 s) with its bolt clack, 0.3 s; crack limited 5 dB                                                                                                                      | battle royale MP5 with the Silencer                           |
| `br-deagle-v2.wav`                                                  | `Desert_eagle_shoot_sound.mp3` (2.667 s), 1.4 s with the echo, the last 0.5 s faded                                                                                                                                           | Desert Eagle, all modes (it takes no silencer)                |
| `br-mp5-reload-tactical-v2.wav`, `br-mp5-reload-empty-v2.wav`       | `MP5_reload_sound.mp3`: release and magazine out, the new one in, seated, the cocking lever back, the HK slap; each cue on its frame of the 2.3 s clips (`mp5-animation.ts`)                                                  | MP5 reloads                                                   |
| `br-deagle-reload-tactical-v2.wav`, `br-deagle-reload-empty-v2.wav` | `desert_eagle_reload_sound.mp3`: release button, magazine out, in and seated, on the 1.9 s clips (`deagle-animation.ts`); the empty reload's slide (not in the recording) is its insert click and seat, lowered 2–3 semitones | Desert Eagle reloads                                          |

The earlier mixes (`br-mp5-v1.wav`, `br-mp5-silenced-v1.wav`, `br-deagle-v1.wav` and the four
`…-reload-…-v1.wav`) are no longer played; they are kept for one release for cached clients.

## Driver engines (cars and motorbike)

Owner-provided recordings, retained in `art/audio/owner-2026-11-09/`:

- `vehicle-start.mp3`: original `starting car and bike.mp3`, used only for the three cars.
  `br-car-start-v1.wav` keeps 0.94–3.00 s, then removes the remaining silent lead-in with
  10 ms pre-roll. `br-car-idle-v1.wav` keeps 2.90–4.45 s with a 120 ms loop crossfade.
- `car-driving.mp3`: original `car driving.mp3`. `br-car-drive-v1.wav` keeps 4.10–14.75 s,
  with a 200 ms wrap crossfade for a seamless 10.45 s driving loop.
- `bike-start.mp3`: original `start motorbike.mp3`, replacing the first startup reference
  for the bike. `br-bike-start-v1.wav` keeps 0.97–2.90 s and trims the remaining silence.
  `br-bike-idle-v1.wav` keeps 1.85–2.90 s, with a 100 ms wrap crossfade.
- `bike-riding.mp3`: original `riding bike.mp3`. `br-bike-drive-v1.wav` keeps 10.80–14.80 s,
  with a 180 ms wrap crossfade for a seamless 3.82 s riding loop.

All outputs are mono PCM16 at 32 kHz, lightly high-passed at 45 Hz and RMS-levelled to
0.14 (or lower to hold peaks at 0.78). Starts have 3 ms / 80 ms edge fades. Idle and
driving layers crossfade with actual speed and throttle; subtle model-specific tuning
distinguishes the police car, 4x4 and pickup. Gear hysteresis prevents snapshot corrections
from making pitch chatter. Ignition plays once per confirmed seating in a stationary
vehicle; already moving vehicles and stale autoplay/buffer completions never crank again.
Exit, destruction and elimination fade the voices out in 150 ms. The normal volume setting
controls the whole mix. No driving physics or server rules are changed.

Rebuild with `node scripts/fps/build-br-vehicle-audio.mjs` (uses local Chrome for decoding;
no external encoder or synthesis).

### Door and loot pickup (2026-11-10)

`br-door-v1.wav` (doors opening and closing, in 3D at the door) and `br-pickup-v1.wav` (picking
an item up) are the owner's supplied recordings ("Door_sound.mp3", "pick_up_loot_sound.mp3"),
trimmed to the sound (the files began with 0.9 s and 1.3 s of silence), mixed to mono for the
3D panner, faded in and out and peak-normalised (ffmpeg). The pickup recording replaces the
synthesised two-tone pickup beep.

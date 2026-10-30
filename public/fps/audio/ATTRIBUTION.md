# PvPStrike recorded sound effects

All source recordings below are **CC0**. They were downloaded from the public mirror
https://github.com/petroulacl/fps-asset-kit and their original asset pages were
independently checked on 2026-10-30. No Counter-Strike/Valve audio is included.

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

/**
 * Battle royale silenced sniper shot (2026-11-14) from the owner's recording, kept in
 * art/audio/owner-2026-11-14/sniper_silencer.mp3 (owner: "the two snipers in battle royale have
 * incorrect sound for silencer. use this for both, make sure sounds good/synced"). Decoding needs
 * ffmpeg on the PATH (build time only).
 *
 *  - br-sniper-silenced-v1.wav: the single shot cut 2 ms before its onset (the recording has 3 s
 *    of silence before it, which would play the shot 3 s late), downmixed to mono at 48 kHz,
 *    0.95 s with the tail faded over its last 0.25 s, raised 3 dB with a limiter at −1 dBFS on the
 *    first crack: its body then sits about 3 dB under the v3 mix it replaces (the recording's
 *    crack is far peakier than that mix). No EQ, pitch change or effects.
 *
 * The AWP and the Hunting Rifle both fire it with a Silencer.
 *
 *   node scripts/fps/build-br-sniper-silenced-audio.mjs
 */
import { execFileSync } from "node:child_process";

const src = new URL("../../art/audio/owner-2026-11-14/sniper_silencer.mp3", import.meta.url);
const out = new URL("../../public/fps/audio/br-sniper-silenced-v1.wav", import.meta.url);
const ONSET = 3.0445 - 0.002;
const SECONDS = 0.95;
const FADE = 0.25;

execFileSync(
  "ffmpeg",
  [
    "-v",
    "error",
    "-y",
    "-i",
    src.pathname,
    "-af",
    [
      `atrim=${ONSET}:${ONSET + SECONDS}`,
      "asetpts=PTS-STARTPTS",
      `afade=t=in:st=0:d=0.002`,
      `afade=t=out:st=${SECONDS - FADE}:d=${FADE}`,
      "volume=3dB",
      "alimiter=limit=0.89:attack=0.5:release=20:level=false",
    ].join(","),
    "-ac",
    "1",
    "-ar",
    "48000",
    "-c:a",
    "pcm_s16le",
    out.pathname,
  ],
  { stdio: "inherit" },
);
console.log(`→ ${out.pathname}`);

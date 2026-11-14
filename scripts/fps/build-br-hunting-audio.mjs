/**
 * Battle royale Hunting Rifle shot (2026-11-13) from the owner's recording, kept in
 * art/audio/owner-2026-11-13/new_sniper_rifle.mp3. Decoding needs ffmpeg on the PATH (build time
 * only).
 *
 *  - br-hunting-shot-v1.wav: the single shot, cut at its onset (the leading near-silence
 *    removed), downmixed to mono at 48 kHz, 2.85 s with the natural tail faded over its last
 *    0.45 s, levelled 1.6 dB down (about −17 LUFS integrated, peak about −1 dBFS): a notch under
 *    the AWP's report. No EQ, pitch change or effects.
 *
 * Silenced, the rifle fires the AWP's silenced shot (br-awp-silenced-v3.wav; owner, 2026-11-13).
 *
 *   node scripts/fps/build-br-hunting-audio.mjs
 */
import { execFileSync } from "node:child_process";

const src = new URL("../../art/audio/owner-2026-11-13/new_sniper_rifle.mp3", import.meta.url);
const out = new URL("../../public/fps/audio/br-hunting-shot-v1.wav", import.meta.url);
const SECONDS = 2.85;
const FADE = 0.45;

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
      "silenceremove=start_periods=1:start_threshold=-45dB",
      `atrim=0:${SECONDS}`,
      `afade=t=out:st=${SECONDS - FADE}:d=${FADE}`,
      "volume=-1.6dB",
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

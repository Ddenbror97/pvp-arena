/** Owner recordings shared by all FPS modes. Run with FFMPEG set or ffmpeg on PATH. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const directory = "public/fps/audio/";
function render(source, start, seconds, filters, output) {
  execFileSync(ffmpeg, [
    "-v",
    "error",
    "-y",
    "-ss",
    String(start),
    "-t",
    String(seconds),
    "-i",
    "art/audio/owner-2026-11-25/" + source,
    "-af",
    filters,
    "-ac",
    "1",
    "-ar",
    "48000",
    "-c:a",
    "pcm_s16le",
    "-map_metadata",
    "-1",
    "-fflags",
    "+bitexact",
    "-flags:a",
    "+bitexact",
    directory + output,
  ]);
}
render(
  "shells-hitting-ground.mp3",
  3.765,
  0.4,
  "highpass=f=250,afade=t=in:d=0.003,afade=t=out:st=0.25:d=0.15,volume=4",
  "casing-ground-v1.wav",
);
render(
  "sniper-bolt.mp3",
  1.465,
  0.75,
  "atempo=1.35,highpass=f=100,afade=t=in:d=0.003,afade=t=out:st=0.49:d=0.065,volume=0.6,adelay=420,apad=whole_dur=1.463",
  "awp-bolt-v2.wav",
);
// Keep the magazine handling, replace the synthetic empty-reload bolt segment.
const reload = readFileSync(directory + "awp-reload-empty-v4.wav");
const bolt = readFileSync(directory + "awp-bolt-v2.wav");
if (reload.toString("ascii", 36, 40) !== "data" || bolt.toString("ascii", 36, 40) !== "data")
  throw new Error("Expected canonical PCM WAV headers");
const start = Math.round(2.45 * 48000);
const end = Math.round(3.05 * 48000);
reload.fill(0, 44 + start * 2, 44 + end * 2);
bolt.copy(
  reload,
  44 + start * 2,
  44 + Math.round(0.42 * 48000) * 2,
  44 + Math.round(1.02 * 48000) * 2,
);
writeFileSync(directory + "awp-reload-empty-v5.wav", reload);

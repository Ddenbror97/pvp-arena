/** Build the flyable aircraft's ground-engine loop from the owner's recording.
 * FFMPEG=/path/to/ffmpeg node scripts/fps/build-aircraft-takeoff-audio.mjs /path/to/source.mp3
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) throw Error("Supply the owner's takeoff recording as the first argument.");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const rate = 48000,
  length = 12,
  overlap = 1,
  pad = 0.25;
const decoded = spawnSync(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    source,
    "-t",
    String(length + overlap),
    "-ac",
    "1",
    "-ar",
    String(rate),
    "-f",
    "f32le",
    "pipe:1",
  ],
  { maxBuffer: 16 * 1024 * 1024 },
);
if (decoded.status !== 0) throw Error(decoded.stderr?.toString() || "Audio decode failed");
const count = length * rate,
  cross = overlap * rate,
  padding = pad * rate;
if (decoded.stdout.length < (count + cross) * 4)
  throw Error("Recording is shorter than 13 seconds");
const input = (i) => decoded.stdout.readFloatLE(i * 4);
const loop = new Float32Array(count);
let peak = 0,
  energy = 0;
for (let i = 0; i < count; i++) {
  // Begin after the first second. Blend the tail back into that first second, so its end
  // rejoins the start at the same source position with no click or repeated acceleration.
  let sample = input(i + cross);
  if (i >= count - cross) {
    const t = (i - (count - cross)) / cross;
    sample =
      sample * Math.cos((t * Math.PI) / 2) +
      input(i - (count - cross)) * Math.sin((t * Math.PI) / 2);
  }
  loop[i] = sample;
  peak = Math.max(peak, Math.abs(sample));
  energy += sample * sample;
}
const rms = Math.sqrt(energy / count);
const gain = Math.min(
  10 ** (-12 / 20) / Math.max(rms, 1e-9),
  10 ** (-2 / 20) / Math.max(peak, 1e-9),
);
const pcm = Buffer.alloc((count + 2 * padding) * 4);
for (let i = 0; i < count + 2 * padding; i++)
  pcm.writeFloatLE(loop[(i - padding + count) % count] * gain, i * 4);
const target = fileURLToPath(
  new URL("../../public/fps/audio/br-plane-roll-loop-v2.mp3", import.meta.url),
);
const encoded = spawnSync(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "f32le",
    "-ar",
    String(rate),
    "-ac",
    "1",
    "-i",
    "pipe:0",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    target,
  ],
  { input: pcm, maxBuffer: 1024 * 1024 },
);
if (encoded.status !== 0) throw Error(encoded.stderr?.toString() || "Audio encode failed");
console.log(
  JSON.stringify({
    target,
    sampleRate: rate,
    channels: 1,
    loopStart: pad,
    loopEnd: pad + length,
    duration: length + 2 * pad,
    peakDb: 20 * Math.log10(peak * gain),
    rmsDb: 20 * Math.log10(rms * gain),
  }),
);

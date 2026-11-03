/** AWP reloads derived from the active AK recording, preserving its natural pitch.
 * The magazine and bolt cues follow AWP_TIMELINE; the gameplay reload stays 3.67 s.
 * Run: node scripts/fps/build-awp-reload-audio.mjs
 */
import fs from "node:fs";

const rate = 48000;
const directory = new URL("../../public/fps/audio/", import.meta.url);
function read(name) {
  const wav = fs.readFileSync(new URL(name, directory));
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE")
    throw Error(`Invalid WAV: ${name}`);
  let data;
  let validFormat = false;
  for (let p = 12; p + 8 <= wav.length;) {
    const size = wav.readUInt32LE(p + 4);
    if (p + 8 + size > wav.length) throw Error(`Truncated WAV: ${name}`);
    const id = wav.toString("ascii", p, p + 4);
    if (id === "fmt ")
      validFormat =
        size >= 16 &&
        wav.readUInt16LE(p + 8) === 1 &&
        wav.readUInt16LE(p + 10) === 1 &&
        wav.readUInt32LE(p + 12) === rate &&
        wav.readUInt16LE(p + 22) === 16;
    if (id === "data") data = wav.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!validFormat || !data || data.length !== rate * 1.8 * 2)
    throw Error(`Expected 1.8-second mono 48 kHz PCM16: ${name}`);
  return Float64Array.from({ length: data.length / 2 }, (_, i) => data.readInt16LE(i * 2) / 32768);
}

function cue(out, source, from, to, at) {
  // Retain the source pitch; move individual cues onto the AWP handling timeline.
  const pitch = 1;
  const start = Math.round(from * rate);
  const count = Math.floor(((to - from) * rate) / pitch);
  const destination = Math.round(at * rate);
  let low = 0;
  for (let i = 0; i < count; i++) {
    const position = start + i * pitch;
    const index = Math.floor(position);
    const fraction = position - index;
    const sample = source[index] * (1 - fraction) + source[index + 1] * fraction;
    low += 0.08 * (sample - low);
    const fade = Math.max(0, Math.min(1, i / 48, (count - 1 - i) / 384));
    out[destination + i] += (sample * 0.9 + (sample - low) * 0.1) * fade;
  }
}

for (const empty of [false, true]) {
  const source = read(`ak-reload-reference-${empty ? "empty" : "tactical"}-v1.wav`);
  const out = new Float64Array(Math.round(rate * 3.67));
  // AWP_TIMELINE release / magazine seat / empty bolt cycle, in seconds.
  cue(out, source, 0.28, 0.57, empty ? 0.55 : 0.65);
  cue(out, source, 0.96, 1.26, empty ? 1.95 : 2.35);
  if (empty) {
    cue(out, source, 1.385, 1.44, 2.45);
    cue(out, source, 1.44, 1.495, 2.72);
  }
  const peak = out.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0);
  if (!Number.isFinite(peak) || peak < 0.01) throw Error("Invalid or silent AWP reload");
  const wav = Buffer.alloc(44 + out.length * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(out.length * 2, 40);
  for (let i = 0; i < out.length; i++)
    wav.writeInt16LE(Math.round((out[i] / peak) * 0.84 * 32767), 44 + i * 2);
  const name = `awp-reload-${empty ? "empty" : "tactical"}-v3.wav`;
  fs.writeFileSync(new URL(name, directory), wav);
  console.log(JSON.stringify({ name, seconds: out.length / rate, bytes: wav.length }));
}

/** AWP reloads derived from the active AK recording, preserving its natural pitch.
 * The magazine and bolt cues follow AWP_TIMELINE; the gameplay reload stays 3.67 s.
 * Run: node scripts/fps/build-awp-reload-audio.mjs
 */
import fs from "node:fs";

const rate = 48000;
const directory = new URL("../../public/fps/audio/", import.meta.url);
/** Inputs no game mode plays (kept out of the deploy). */
const sources = new URL("../../art/fps/audio-src/", import.meta.url);
function read(name, seconds = 1.8) {
  const stored = new URL(name, sources);
  const wav = fs.readFileSync(fs.existsSync(stored) ? stored : new URL(name, directory));
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE")
    throw Error(`Invalid WAV: ${name}`);
  let data;
  let inputRate;
  let validFormat = false;
  for (let p = 12; p + 8 <= wav.length;) {
    const size = wav.readUInt32LE(p + 4);
    if (p + 8 + size > wav.length) throw Error(`Truncated WAV: ${name}`);
    const id = wav.toString("ascii", p, p + 4);
    if (id === "fmt ") {
      inputRate = wav.readUInt32LE(p + 12);
      validFormat =
        size >= 16 &&
        wav.readUInt16LE(p + 8) === 1 &&
        wav.readUInt16LE(p + 10) === 1 &&
        (inputRate === rate || inputRate === 44100) &&
        wav.readUInt16LE(p + 22) === 16;
    }
    if (id === "data") data = wav.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!validFormat || !data || Math.abs(data.length / 2 - inputRate * seconds) > 1)
    throw Error(`Expected ${seconds}-second mono PCM16: ${name}`);
  // The existing procedural bolt is 44.1 kHz; preserve its pitch in the 48 kHz mix.
  return Float64Array.from({ length: Math.round(rate * seconds) }, (_, i) => {
    const position = Math.min((i * inputRate) / rate, data.length / 2 - 1);
    const index = Math.floor(position),
      fraction = position - index;
    const a = data.readInt16LE(index * 2);
    const b = data.readInt16LE(Math.min(index + 1, data.length / 2 - 1) * 2);
    return (a * (1 - fraction) + b * fraction) / 32768;
  });
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

const bolt = read("awp-bolt-v1.wav", 1.463);
for (const empty of [false, true]) {
  // Only the magazine cues are clean. The empty AK recording's 1.385–1.495 s
  // segment contains an AK shot, not a bolt sound; never reuse it for a reload.
  const source = read("ak-reload-reference-tactical-v1.wav");
  const out = new Float64Array(Math.round(rate * 3.67));
  // AWP_TIMELINE release / magazine seat / empty bolt cycle, in seconds.
  cue(out, source, 0.28, 0.57, empty ? 0.55 : 0.65);
  cue(out, source, 0.96, 1.26, empty ? 1.95 : 2.35);
  if (empty) {
    cue(out, bolt, 0.42, 0.52, 2.45);
    cue(out, bolt, 0.7, 0.88, 2.72);
    cue(out, bolt, 0.88, 0.98, 2.88);
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
  const name = `awp-reload-${empty ? "empty" : "tactical"}-v4.wav`;
  fs.writeFileSync(new URL(name, directory), wav);
  console.log(JSON.stringify({ name, seconds: out.length / rate, bytes: wav.length }));
}

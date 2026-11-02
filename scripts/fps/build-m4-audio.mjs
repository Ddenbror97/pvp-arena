/**
 * Police M4A1 audio.
 *
 *   node scripts/fps/build-m4-audio.mjs <user-supplied M4 shot recording.wav>
 *
 * - m4a1-suppressed-v1.wav: the single shot isolated from the recording the project supplied
 *   (onset at the first transient, short fade boundaries, mono, 48 kHz, normalised).
 * - Reloads use the AK recording with M4 cue timing and a slightly brighter tone.
 *   Rebuild just the reloads with: node scripts/fps/build-m4-reload-audio.mjs
 */
import fs from "node:fs";

const rate = 48000;
function read(file) {
  const b = fs.readFileSync(file);
  let channels, hz, bits, data;
  for (let p = 12; p + 8 <= b.length;) {
    const id = b.toString("ascii", p, p + 4),
      size = Math.min(b.readUInt32LE(p + 4), b.length - p - 8);
    if (id === "fmt ") {
      channels = b.readUInt16LE(p + 10);
      hz = b.readUInt32LE(p + 12);
      bits = b.readUInt16LE(p + 22);
    }
    if (id === "data") data = b.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (bits !== 16 || !data) throw Error("Expected PCM16 WAV");
  const out = new Float64Array(Math.floor(data.length / (channels * 2)));
  for (let i = 0; i < out.length; i++)
    for (let c = 0; c < channels; c++)
      out[i] += data.readInt16LE((i * channels + c) * 2) / (32768 * channels);
  return { samples: out, rate: hz };
}
function write(name, samples, peakTarget = 0.88) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peakTarget / Math.max(0.001, peak),
    b = Buffer.alloc(44 + samples.length * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++)
    b.writeInt16LE(
      Math.max(-32768, Math.min(32767, Math.round(samples[i] * scale * 32767))),
      44 + i * 2,
    );
  fs.writeFileSync("public/fps/audio/" + name, b);
  console.log(
    JSON.stringify({ name, seconds: +(samples.length / rate).toFixed(3), bytes: b.length }),
  );
}

// ---------------------------------------------------------------- shot
const source = process.argv[2];
if (!source) {
  console.error("usage: build-m4-audio.mjs <M4 shot recording.wav>");
  process.exit(2);
}
{
  const rec = read(source);
  if (rec.rate !== rate) throw Error(`expected ${rate} Hz, got ${rec.rate}`);
  // First transient: smoothed envelope crossing 25% of the recording's peak.
  let peak = 0;
  for (const s of rec.samples) peak = Math.max(peak, Math.abs(s));
  let env = 0,
    onset = 0;
  for (let i = 0; i < rec.samples.length; i++) {
    env += 0.02 * (Math.abs(rec.samples[i]) - env);
    if (env > peak * 0.25) {
      onset = i;
      break;
    }
  }
  onset = Math.max(0, onset - Math.round(rate * 0.006));
  // The isolated shot (report + mechanism) lasts ~0.24 s; keep its natural tail to 0.45 s.
  const length = Math.round(rate * 0.45),
    out = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / rate,
      fadeIn = Math.min(1, i / (rate * 0.002)),
      fadeOut = Math.min(1, (length - 1 - i) / (rate * 0.06)),
      tail = Math.exp(-Math.max(0, t - 0.26) * 10);
    out[i] = (rec.samples[onset + i] ?? 0) * fadeIn * fadeOut * tail;
  }
  write("m4a1-suppressed-v1.wav", out, 0.82);
}

// Share the standalone reload builder so a full rebuild cannot restore the old foley.
await import("./build-m4-reload-audio.mjs");

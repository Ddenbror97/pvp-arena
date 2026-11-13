/**
 * Silenced BR shots, v3 (owner, 2026-11-09: "the AK47 sound with silencer don't work").
 *
 * The v2 AK/AWP variants (build-br-rifle-audio.mjs) were the unsuppressed reports low-passed
 * and normalised back to near full scale: the same boom and the same second-long tail, only
 * duller, so a silenced AK sounded like a muffled loud AK. A suppressor removes the muzzle blast;
 * what is left is a short, sharp "thwap" and the action cycling.
 *
 * Each variant is built from the project's real suppressed recording (the M4A1-S,
 * m4a1-suppressed-v1.wav), pitched down per gun, plus a short low-passed slice of the gun's own
 * report for its weight (the AK fuller, the AWP heaviest), under a fast exponential decay and
 * at a lower level than the unsuppressed shots. Mono PCM16, 48 kHz.
 *
 *   node scripts/fps/build-br-silenced-audio.mjs
 */
import fs from "node:fs";

const DIR = "public/fps/audio/";
function read(path) {
  const b = fs.readFileSync(path);
  let channels, rate, data;
  for (let p = 12; p + 8 <= b.length;) {
    const n = b.readUInt32LE(p + 4),
      id = b.toString("ascii", p, p + 4);
    if (id === "fmt ") {
      if (b.readUInt16LE(p + 8) !== 1 || b.readUInt16LE(p + 22) !== 16)
        throw Error("PCM16 required: " + path);
      channels = b.readUInt16LE(p + 10);
      rate = b.readUInt32LE(p + 12);
    }
    if (id === "data") data = b.subarray(p + 8, p + 8 + n);
    p += 8 + n + (n % 2);
  }
  const samples = Float64Array.from({ length: data.length / (2 * channels) }, (_, i) => {
    let v = 0;
    for (let c = 0; c < channels; c++)
      v += data.readInt16LE((i * channels + c) * 2) / (32768 * channels);
    return v;
  });
  return { samples, rate };
}
const at = (a, t) => {
  const x = t * a.rate,
    i = Math.floor(x),
    f = x - i;
  return (a.samples[i] ?? 0) * (1 - f) + (a.samples[i + 1] ?? 0) * f;
};
/** Seconds from the start of a recording to its first sample above `level` of its peak. */
function onset(a, level = 0.2) {
  let peak = 0;
  for (const v of a.samples) peak = Math.max(peak, Math.abs(v));
  const i = a.samples.findIndex((v) => Math.abs(v) >= peak * level);
  return Math.max(0, i) / a.rate;
}
function write(name, values, rate, peakOut) {
  let peak = 0;
  for (const v of values) peak = Math.max(peak, Math.abs(v));
  if (!(peak > 0.02)) throw Error("Silent result: " + name);
  const b = Buffer.alloc(44 + values.length * 2);
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
  b.writeUInt32LE(values.length * 2, 40);
  for (let i = 0; i < values.length; i++)
    b.writeInt16LE(Math.round(((values[i] * peakOut) / peak) * 32767), 44 + i * 2);
  fs.writeFileSync(DIR + name, b);
  console.log(`Built ${name}: ${(values.length / rate).toFixed(2)} s`);
}

const rate = 48000;
const core = read(DIR + "m4a1-suppressed-v1.wav");
const coreStart = onset(core);

/**
 * @param gun the gun's unsuppressed report (for its low body)
 * @param o.speed playback speed of the suppressed core (< 1: lower and a little longer)
 * @param o.body share of the gun's low-passed report, o.bodyHz its cut-off, o.bodyMs its decay
 * @param o.tailMs overall decay time constant, o.seconds the length
 */
function silenced(name, gun, o) {
  const gunStart = onset(gun);
  const n = Math.round(o.seconds * rate);
  const values = new Float64Array(n);
  const k = 1 - Math.exp((-2 * Math.PI * o.bodyHz) / rate);
  let low = 0,
    low2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const c = at(core, coreStart + t * o.speed);
    const raw = at(gun, gunStart + t);
    // Two one-pole low-passes: the body keeps the thump, never the crack.
    low += (raw - low) * k;
    low2 += (low - low2) * k;
    const body = low2 * Math.exp(-t / (o.bodyMs / 1000));
    const env =
      Math.min(1, t / 0.0006) *
      Math.exp(-t / (o.tailMs / 1000)) *
      Math.min(1, (o.seconds - t) / 0.02);
    values[i] = (c * (1 - o.body) + body * o.body * 3) * env;
  }
  write(name, values, rate, o.peak);
}

silenced("br-ak47-silenced-v3.wav", read(DIR + "ak47-reference-v1.wav"), {
  speed: 0.9,
  body: 0.3,
  bodyHz: 650,
  bodyMs: 35,
  tailMs: 70,
  seconds: 0.32,
  peak: 0.6,
});
silenced("br-awp-silenced-v3.wav", read(DIR + "awp-shot-v2.wav"), {
  speed: 0.78,
  body: 0.42,
  bodyHz: 480,
  bodyMs: 70,
  tailMs: 120,
  seconds: 0.5,
  peak: 0.66,
});
// The Hunting Rifle (2026-11-13): a lighter report than the AWP's, a little less body.
silenced("br-hunting-silenced-v1.wav", read(DIR + "br-hunting-shot-v1.wav"), {
  speed: 0.82,
  body: 0.38,
  bodyHz: 520,
  bodyMs: 60,
  tailMs: 110,
  seconds: 0.46,
  peak: 0.64,
});

/**
 * Karambit sound effects: original, deterministic procedural synthesis (no recordings).
 *
 *   node scripts/fps/build-knife-audio.mjs
 *
 * Restrained by design: idle flips, spins and catches are quiet mechanical details; the slash,
 * stab and hit are short and dry. Timing comes from the animation cues baked into the knife GLB
 * (art/blender/karambit), not from these files.
 *
 *   knife-equip-v1    fabric brush, then the blade drawn against the ring (steel slide + tick)
 *   knife-flip-v1     short airy whoosh
 *   knife-spin-v1     fast double whoosh with the ring rattling on the finger
 *   knife-catch-v1    palm slap and a bright steel click
 *   knife-catch-soft-v1  lighter catch
 *   knife-cloth-v1    sleeve rustle (inspect)
 *   knife-slash-v1    swept whoosh, rising then falling
 *   knife-stab-v1     tight thrust whoosh with a low push
 *   knife-hit-v1      dull impact with a short cut
 *   knife-wall-v1     steel scrape on a hard surface
 */
import fs from "node:fs";
import path from "node:path";

const rate = 44100;
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../public/fps/audio");

/** Deterministic noise (xorshift). */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}
function write(name, samples, peakTarget = 0.8) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peakTarget / Math.max(1e-4, peak),
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
      Math.max(-32767, Math.min(32767, Math.round(samples[i] * scale * 32767))),
      44 + i * 2,
    );
  fs.writeFileSync(path.join(OUT, `${name}.wav`), b);
  return b.length;
}
const buffer = (seconds) => new Float64Array(Math.round(seconds * rate));
/** One-pole band shaping: lowpass then highpass, cutoffs may vary per sample. */
function bandNoise(out, start, length, seed, lo, hi, env, gain = 1) {
  const noise = rng(seed);
  let lp = 0,
    hp = 0,
    prev = 0;
  for (let i = 0; i < length && start + i < out.length; i++) {
    const t = i / length,
      fl = typeof lo === "function" ? lo(t) : lo,
      fh = typeof hi === "function" ? hi(t) : hi;
    const a = Math.exp((-2 * Math.PI * fh) / rate),
      b = Math.exp((-2 * Math.PI * fl) / rate);
    const n = noise();
    lp = lp * a + n * (1 - a);
    const h = b * (hp + lp - prev);
    prev = lp;
    hp = h;
    out[start + i] += h * env(t) * gain;
  }
}
/** Damped metallic partials (steel tick / ring). */
function ring(out, start, freqs, decay, gain, seed = 3) {
  const noise = rng(seed);
  for (let i = 0; start + i < out.length; i++) {
    const t = i / rate,
      e = Math.exp(-t / decay);
    if (e < 1e-4) break;
    let v = 0;
    freqs.forEach((f, k) => (v += Math.sin(2 * Math.PI * f * t + k) / (k + 1)));
    out[start + i] += (v + noise() * 0.15 * Math.exp(-t / 0.002)) * e * gain;
  }
}
function thump(out, start, freq, decay, gain) {
  for (let i = 0; start + i < out.length; i++) {
    const t = i / rate,
      e = Math.exp(-t / decay);
    if (e < 1e-4) break;
    out[start + i] += Math.sin(2 * Math.PI * freq * t * (1 - t * 2)) * e * gain;
  }
}
const at = (s) => Math.round(s * rate);
const swell =
  (peak, sharp = 2) =>
  (t) =>
    t < peak ? (t / peak) ** sharp : ((1 - t) / (1 - peak)) ** 1.5;

const made = {};
{
  const s = buffer(0.42);
  bandNoise(s, 0, at(0.16), 11, 300, 2500, swell(0.4), 0.35);
  bandNoise(s, at(0.12), at(0.22), 12, (t) => 2500 + t * 3000, 9000, swell(0.3, 1), 0.5);
  ring(s, at(0.31), [3150, 5420, 7980], 0.035, 0.35, 13);
  made["knife-equip-v1"] = write("knife-equip-v1", s, 0.6);
}
{
  const s = buffer(0.22);
  bandNoise(
    s,
    0,
    at(0.22),
    21,
    (t) => 500 + t * 900,
    (t) => 2200 + Math.sin(t * Math.PI) * 2600,
    swell(0.45),
    1,
  );
  made["knife-flip-v1"] = write("knife-flip-v1", s, 0.45);
}
{
  const s = buffer(0.36);
  for (const [o, seed] of [
    [0, 31],
    [0.13, 32],
  ])
    bandNoise(
      s,
      at(o),
      at(0.17),
      seed,
      700,
      (t) => 2600 + Math.sin(t * Math.PI) * 3600,
      swell(0.5),
      0.8,
    );
  for (let k = 0; k < 5; k++)
    ring(s, at(0.03 + k * 0.058), [4100 + k * 70, 6900], 0.006, 0.18, 33 + k);
  made["knife-spin-v1"] = write("knife-spin-v1", s, 0.45);
}
{
  const s = buffer(0.2);
  thump(s, 0, 140, 0.03, 0.8);
  bandNoise(s, 0, at(0.04), 41, 400, 3000, (t) => 1 - t, 0.5);
  ring(s, at(0.004), [2840, 4710, 6930, 9120], 0.028, 0.55, 42);
  made["knife-catch-v1"] = write("knife-catch-v1", s, 0.55);
}
{
  const s = buffer(0.14);
  thump(s, 0, 160, 0.02, 0.5);
  ring(s, at(0.003), [3020, 5170], 0.016, 0.3, 52);
  made["knife-catch-soft-v1"] = write("knife-catch-soft-v1", s, 0.35);
}
{
  const s = buffer(0.32);
  bandNoise(
    s,
    0,
    at(0.32),
    61,
    250,
    (t) => 1800 + Math.sin(t * 9) * 500,
    (t) => Math.sin(Math.PI * t) ** 1.2 * (0.7 + 0.3 * Math.sin(t * 40)),
    1,
  );
  made["knife-cloth-v1"] = write("knife-cloth-v1", s, 0.3);
}
{
  const s = buffer(0.3);
  bandNoise(
    s,
    0,
    at(0.3),
    71,
    (t) => 400 + t * 700,
    (t) => 1500 + Math.sin(Math.PI * Math.min(1, t * 1.6)) * 6000,
    swell(0.32, 1.6),
    1,
  );
  bandNoise(s, at(0.04), at(0.12), 72, 3500, 11000, swell(0.4), 0.35);
  made["knife-slash-v1"] = write("knife-slash-v1", s, 0.7);
}
{
  const s = buffer(0.3);
  bandNoise(s, 0, at(0.2), 81, 300, (t) => 1200 + t * 4500, swell(0.6, 2.5), 1);
  thump(s, at(0.11), 95, 0.05, 0.6);
  made["knife-stab-v1"] = write("knife-stab-v1", s, 0.7);
}
{
  const s = buffer(0.26);
  thump(s, 0, 85, 0.06, 1);
  bandNoise(s, 0, at(0.09), 91, 250, 1800, (t) => (1 - t) ** 2, 0.8);
  bandNoise(s, at(0.01), at(0.06), 92, 2000, 7000, (t) => (1 - t) ** 3, 0.35);
  made["knife-hit-v1"] = write("knife-hit-v1", s, 0.75);
}
{
  const s = buffer(0.3);
  ring(s, 0, [2210, 3790, 5930, 8410], 0.06, 0.6, 101);
  bandNoise(s, 0, at(0.18), 102, 2500, 9000, (t) => (1 - t) ** 1.5, 0.5);
  made["knife-wall-v1"] = write("knife-wall-v1", s, 0.6);
}
const total = Object.values(made).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ files: Object.keys(made).length, bytes: total }));

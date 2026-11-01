/**
 * Police M4A1 audio.
 *
 *   node scripts/fps/build-m4-audio.mjs <user-supplied M4 shot recording.wav>
 *
 * - m4a1-suppressed-v1.wav: the single shot isolated from the recording the project supplied
 *   (onset at the first transient, short fade boundaries, mono, 48 kHz, normalised).
 * - m4-reload-tactical-v1.wav / m4-reload-empty-v1.wav: original, deterministic procedural
 *   effects on the 1.8-second reload window, timed to M4_TACTICAL_RELOAD / M4_EMPTY_RELOAD
 *   (src/lib/fps/reload-animation.ts): release button, magazine sliding out of the well, pouch,
 *   insertion and seating, and (empty) the dropped magazine and the bolt-catch release slam.
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

// ---------------------------------------------------------------- reload foley (procedural)
let seed = 52113;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
const add = (out, at, i, v) => {
  const n = Math.round(at * rate) + i;
  if (n >= 0 && n < out.length) out[n] += v;
};
/** Metallic impact: inharmonic partials over a filtered noise burst. */
function clack(out, at, strength, tone, decay = 0.03, body = 0.5) {
  let low = 0;
  for (let i = 0; i < rate * decay * 8; i++) {
    const t = i / rate,
      env = Math.min(1, t / 0.0006) * Math.exp(-t / decay),
      white = noise();
    low += 0.12 * (white - low);
    const ring =
      Math.sin(2 * Math.PI * tone * t) * 0.32 +
      Math.sin(2 * Math.PI * tone * 2.41 * t) * 0.16 +
      Math.sin(2 * Math.PI * tone * 3.93 * t) * 0.08;
    const thump = Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t / 0.012) * body;
    add(out, at, i, strength * (env * (ring + (white - low) * 0.45 + low * 0.5) + thump * 0.6));
  }
}
/** Short polymer/steel tick (release button, latch). */
const tick = (out, at, strength, tone = 3400) => clack(out, at, strength, tone, 0.006, 0.1);
/** Friction: band-limited noise with a rising-then-falling envelope (magazine leaving the well). */
function slide(out, at, duration, strength, brightness = 0.35) {
  let low = 0,
    lower = 0;
  for (let i = 0; i < rate * duration; i++) {
    const t = i / duration / rate,
      env = Math.sin(Math.PI * t) ** 0.7 * (0.75 + 0.25 * Math.sin(i * 0.0021)),
      white = noise();
    low += brightness * (white - low);
    lower += 0.03 * (low - lower);
    add(out, at, i, strength * env * (low - lower));
  }
}
/** Fabric and pouch: soft low-passed noise in grains. */
function rustle(out, at, duration, strength) {
  let low = 0;
  for (let i = 0; i < rate * duration; i++) {
    const t = i / rate,
      grain = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 23 + Math.sin(t * 41) * 3),
      env = Math.sin((Math.PI * i) / (rate * duration)) * grain,
      white = noise();
    low += 0.05 * (white - low);
    add(out, at, i, strength * env * low * 2.2);
  }
}
/** Gloved hand landing on the rail: dull low thud. */
function thud(out, at, strength) {
  for (let i = 0; i < rate * 0.08; i++) {
    const t = i / rate;
    add(
      out,
      at,
      i,
      strength * Math.exp(-t / 0.018) * (Math.sin(2 * Math.PI * 110 * t) + noise() * 0.25),
    );
  }
}
/** Bolt carrier released by the catch: slam plus the buffer spring's ring. */
function boltSlam(out, at, strength) {
  clack(out, at, strength, 1250, 0.045, 0.9);
  clack(out, at + 0.004, strength * 0.5, 2950, 0.022, 0);
  for (let i = 0; i < rate * 0.35; i++) {
    const t = i / rate,
      spring = Math.sin(2 * Math.PI * (610 + 40 * Math.sin(t * 90)) * t) * Math.exp(-t / 0.09);
    add(out, at, i, strength * 0.12 * spring);
  }
}

const R = 1.8; // seconds: the server reload window both clips share
for (const empty of [false, true]) {
  const out = new Float64Array(Math.round(rate * R));
  if (!empty) {
    tick(out, 0.15 * R, 0.4); // magazine release button
    slide(out, 0.165 * R, 0.09, 0.32); // magazine leaves the well into the hand
    rustle(out, 0.3 * R, 0.24, 0.22); // stowed in the pouch, fresh one drawn
    slide(out, 0.535 * R, 0.08, 0.2, 0.5); // lips enter the well
    clack(out, 0.6 * R, 0.85, 980, 0.03); // seated
    tick(out, 0.665 * R, 0.25, 2600); // tug check
    thud(out, 0.84 * R, 0.35); // back on the handguard
  } else {
    tick(out, 0.1 * R, 0.42);
    slide(out, 0.115 * R, 0.08, 0.3);
    // The empty magazine hits the floor below: two damped polymer bounces.
    clack(out, 0.33 * R, 0.28, 520, 0.02, 0.6);
    clack(out, 0.37 * R, 0.12, 610, 0.015, 0.4);
    rustle(out, 0.2 * R, 0.24, 0.22);
    slide(out, 0.5 * R, 0.07, 0.2, 0.5);
    clack(out, 0.545 * R, 0.85, 980, 0.03);
    // Palm strikes the bolt catch; the carrier slams home.
    tick(out, 0.705 * R, 0.3, 1900);
    boltSlam(out, 0.715 * R, 1);
    thud(out, 0.92 * R, 0.32);
  }
  write(empty ? "m4-reload-empty-v1.wav" : "m4-reload-tactical-v1.wav", out);
}

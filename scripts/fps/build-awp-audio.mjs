/**
 * AWP sound effects: original, deterministic procedural synthesis (no recordings).
 *
 *   node scripts/fps/build-awp-audio.mjs
 *
 * Timing follows src/lib/fps/awp-timeline.ts (copied below; a unit test checks they agree), so
 * every click lands on its animation frame:
 *
 *   awp-shot-v1          .338 report: supersonic crack, deep chest thump, rolling tail and echo
 *   awp-bolt-v1          the bolt cycle after a shot (lift, rearward slide, forward, lock)
 *   awp-reload-v1        magazine change with a round chambered (release, out, insert, tap)
 *   awp-reload-empty-v1  magazine change and the bolt worked to chamber a round
 *   awp-zoom-in-v1       scope ring click, soft
 *   awp-zoom-out-v1      lighter click
 *   awp-draw-v1          sling rustle and the rifle settling in the shoulder
 */
import fs from "node:fs";
import path from "node:path";

const rate = 44100;
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../public/fps/audio");

/** Must match AWP_TIMELINE in src/lib/fps/awp-timeline.ts (tests/fps-awp-animation.test.ts). */
export const TIMES = {
  bolt: { lift: 420, back: 520, eject: 650, forward: 700, lower: 880, cycle: 1463 },
  tactical: { release: 650, magOut: 650, seat: 2350, tap: 2550, guard: 2650, length: 3670 },
  empty: {
    release: 550,
    magOut: 550,
    seat: 1950,
    lift: 2450,
    back: 2550,
    forward: 2720,
    lower: 2880,
    length: 3670,
  },
};

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}
function write(name, samples, peakTarget = 0.85) {
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
  console.log(name, (samples.length / rate).toFixed(2) + " s", b.length + " B");
}
const buffer = (seconds) => new Float32Array(Math.ceil(seconds * rate));
/** One-pole low/high pass helpers over a whole array. */
/** Four cascaded one-pole low passes (24 dB/octave). */
function lowpass(x, hz) {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / rate);
  for (let pass = 0; pass < 4; pass++) {
    let y = 0;
    for (let i = 0; i < x.length; i++) x[i] = y += a * (x[i] - y);
  }
  return x;
}
function highpass(x, hz) {
  const a = Math.exp((-2 * Math.PI * hz) / rate);
  let prevX = 0,
    y = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    y = a * (y + v - prevX);
    prevX = v;
    x[i] = y;
  }
  return x;
}
/** Two-pole resonant band-pass (biquad, constant 0 dB peak). */
function bandpass(x, hz, q) {
  const w = (2 * Math.PI * hz) / rate,
    alpha = Math.sin(w) / (2 * q),
    b0 = alpha,
    a0 = 1 + alpha,
    a1 = -2 * Math.cos(w),
    a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = (b0 * v - b0 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = v;
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}
function mix(into, part, atSeconds, gain = 1) {
  const o = Math.round(atSeconds * rate);
  for (let i = 0; i < part.length && o + i < into.length; i++)
    if (o + i >= 0) into[o + i] += part[i] * gain;
}

/** A metallic click: a sharp noise tick through two steel resonances, with a short ring. */
function click(seed, { ms = 30, freqs = [3200, 5100], q = 9, body = 0 } = {}) {
  const n = rng(seed),
    out = buffer(ms / 1000 + 0.05);
  const tick = out.map((_, i) => n() * Math.exp(-i / (rate * 0.0012)));
  for (const f of freqs) mix(out, bandpass(Float32Array.from(tick), f, q), 0, 1.4);
  mix(out, tick, 0, 0.35);
  if (body) {
    const thump = out.map(
      (_, i) => Math.sin((2 * Math.PI * body * i) / rate) * Math.exp(-i / (rate * 0.012)),
    );
    mix(out, thump, 0, 0.6);
  }
  return out;
}
/** Steel sliding on steel: band-limited noise with a slow swell, a little rattle. */
function slide(seed, ms, { from = 1800, to = 2600, gain = 1 } = {}) {
  const n = rng(seed),
    out = buffer(ms / 1000);
  const len = out.length;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    out[i] = n() * Math.sin(Math.PI * t) ** 0.6 * gain * (0.7 + 0.3 * Math.sin(i / 37));
  }
  // Sweep by filtering two halves at different centres.
  const a = bandpass(out.slice(0, len >> 1), from, 1.2),
    b = bandpass(out.slice(len >> 1), to, 1.2);
  out.set(a, 0);
  out.set(b, len >> 1);
  return out;
}
function rustle(seed, ms, gain = 1) {
  const n = rng(seed),
    out = buffer(ms / 1000);
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    out[i] = n() * Math.sin(Math.PI * t) * gain * (0.5 + 0.5 * Math.abs(Math.sin(i / 900)));
  }
  return lowpass(highpass(out, 600), 4200);
}

// ------------------------------------------------------------------ the shot
{
  const out = buffer(2.4),
    n = rng(338);
  // Supersonic crack: a very short broadband spike, emphasised in the upper mids.
  const crack = buffer(0.03).map((_, i) => n() * Math.exp(-i / (rate * 0.0025)));
  mix(out, highpass(Float32Array.from(crack), 900), 0, 1.0);
  mix(out, bandpass(Float32Array.from(crack), 2400, 1.5), 0, 1.6);
  // Chest thump: a falling sine from 110 Hz to 38 Hz, long decay (the .338's weight).
  const thump = buffer(0.9);
  let phase = 0;
  for (let i = 0; i < thump.length; i++) {
    const t = i / rate,
      f = 38 + 72 * Math.exp(-t / 0.06);
    phase += (2 * Math.PI * f) / rate;
    thump[i] = Math.sin(phase) * Math.exp(-t / 0.22) * Math.min(1, t / 0.0015);
  }
  mix(out, thump, 0.001, 0.32);
  // Body: mid-band noise blast.
  const body = buffer(0.35).map((_, i) => n() * Math.exp(-i / (rate * 0.06)));
  mix(out, bandpass(Float32Array.from(body), 260, 0.8), 0.002, 2.6);
  mix(out, bandpass(Float32Array.from(body), 700, 0.9), 0.002, 1.6);
  mix(out, bandpass(Float32Array.from(body), 1600, 1.1), 0.001, 0.8);
  // Rolling tail: low-passed noise, slow decay, with a slapback echo off the walls.
  const tail = buffer(2.2).map(
    (_, i) => n() * Math.exp(-i / (rate * 0.55)) * Math.min(1, i / (rate * 0.03)),
  );
  lowpass(tail, 900);
  mix(out, tail, 0.02, 0.8);
  const echo = Float32Array.from(out.subarray(0, Math.round(rate * 0.6)));
  lowpass(echo, 1400);
  mix(out, echo, 0.16, 0.28);
  mix(out, echo, 0.41, 0.12);
  // Fade the very end.
  for (let i = 0; i < out.length; i++) out[i] *= Math.min(1, (out.length - i) / (rate * 0.3));
  write("awp-shot-v1", out, 0.95);
}

// ------------------------------------------------------------------ the bolt cycle
function boltSequence(out, t0, times, seed) {
  const s = (ms) => (ms - t0) / 1000;
  mix(out, rustle(seed, 160, 0.25), s(times.lift - 220)); // hand leaves the grip
  mix(out, click(seed + 1, { freqs: [2600, 4300], body: 180 }), s(times.lift + 40), 0.9); // handle up
  mix(
    out,
    slide(seed + 2, times.forward - times.back - 20, { from: 1600, to: 2300 }),
    s(times.back),
    0.8,
  );
  mix(out, click(seed + 3, { freqs: [1900, 3600], q: 6 }), s(times.forward - 25), 0.7); // stop
  if (times.eject !== undefined) {
    // The case tinkling onto the floor a moment later.
    mix(out, click(seed + 4, { freqs: [5200, 7600], q: 14 }), s(times.eject + 380), 0.25);
    mix(out, click(seed + 5, { freqs: [4800, 7100], q: 14 }), s(times.eject + 470), 0.15);
  }
  mix(
    out,
    slide(seed + 6, times.lower - times.forward - 15, { from: 2400, to: 1700 }),
    s(times.forward),
    0.75,
  );
  mix(out, click(seed + 7, { freqs: [2200, 3900], body: 140 }), s(times.lower - 20), 1.0); // chambered
  mix(out, click(seed + 8, { freqs: [3000, 5200], body: 220 }), s(times.lower + 85), 1.1); // locked down
}
{
  const out = buffer(TIMES.bolt.cycle / 1000);
  boltSequence(out, 0, TIMES.bolt, 41);
  write("awp-bolt-v1", out, 0.8);
}

// ------------------------------------------------------------------ reloads
function magazineChange(out, times, seed) {
  const s = (ms) => ms / 1000;
  mix(out, rustle(seed, 260, 0.3), s(times.release - 280));
  mix(out, click(seed + 1, { freqs: [2800, 4600], body: 0 }), s(times.release), 0.8); // release
  mix(out, slide(seed + 2, 220, { from: 900, to: 1300, gain: 0.8 }), s(times.magOut + 30), 0.7);
  mix(out, rustle(seed + 3, 500, 0.35), s(times.magOut + 450)); // to the pouch
  mix(out, slide(seed + 4, 180, { from: 1200, to: 900 }), s(times.seat - 200), 0.6);
  mix(out, click(seed + 5, { freqs: [1500, 3100], q: 5, body: 120 }), s(times.seat), 1.2); // seated
}
{
  const t = TIMES.tactical,
    out = buffer(t.length / 1000);
  magazineChange(out, t, 600);
  mix(out, click(612, { freqs: [1300, 2600], q: 4, body: 90 }), t.tap / 1000, 0.6); // palm tap
  mix(out, rustle(613, 300, 0.25), t.guard / 1000);
  write("awp-reload-v1", out, 0.8);
}
{
  const t = TIMES.empty,
    out = buffer(t.length / 1000);
  magazineChange(out, t, 700);
  boltSequence(out, 0, t, 720);
  write("awp-reload-empty-v1", out, 0.8);
}

// ------------------------------------------------------------------ zoom and draw
{
  const zin = buffer(0.12);
  mix(zin, click(801, { freqs: [3600, 6200], q: 11 }), 0, 0.7);
  mix(zin, rustle(802, 90, 0.2), 0.005);
  write("awp-zoom-in-v1", zin, 0.5);
  const zout = buffer(0.1);
  mix(zout, click(803, { freqs: [4200, 6800], q: 12 }), 0, 0.6);
  write("awp-zoom-out-v1", zout, 0.4);
  const draw = buffer(0.95);
  mix(draw, rustle(804, 520, 0.6), 0);
  mix(draw, click(805, { freqs: [1700, 3300], q: 5, body: 110 }), 0.58, 0.8);
  mix(draw, click(806, { freqs: [2600, 4500], q: 8 }), 0.74, 0.45);
  write("awp-draw-v1", draw, 0.6);
}

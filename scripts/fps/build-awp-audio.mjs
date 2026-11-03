/**
 * AWP sound effects: original, deterministic procedural synthesis (no recordings). The shot
 * (awp-shot-v2.wav) is the owner-supplied recording, not built here.
 *
 *   node scripts/fps/build-awp-audio.mjs
 *
 * Timing follows src/lib/fps/awp-timeline.ts (copied below; a unit test checks they agree), so
 * every click lands on its animation frame:
 *
 *   awp-bolt-v1          the bolt cycle after a shot (lift, rearward slide, forward, lock)
 *   awp-reload-v2        magazine change with a round chambered (release, out, insert, tap), with
 *                        ringing steel on the release, the magazine leaving the well and seating
 *   awp-reload-empty-v2  the same, the empty magazine clanking on the floor, then the bolt
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

/**
 * Struck steel: a short noise strike exciting inharmonic plate/bar modes (ratios of a free steel
 * bar), each ringing with its own decay — the metallic "clank" of a magazine against a receiver.
 */
function clank(seed, { base = 1150, decay = 0.11, gain = 1, bright = 1 } = {}) {
  const n = rng(seed),
    out = buffer(decay * 4 + 0.02);
  const modes = [
    [1, 1, 1],
    [2.756, 0.7, 0.8],
    [5.404, 0.45 * bright, 0.55],
    [8.933, 0.3 * bright, 0.4],
    [13.34, 0.18 * bright, 0.3],
  ];
  for (const [ratio, amp, life] of modes) {
    const f = base * ratio * (1 + n() * 0.004),
      tau = decay * life,
      phase0 = Math.abs(n()) * Math.PI;
    if (f > rate / 2.2) continue;
    for (let i = 0; i < out.length; i++) {
      const t = i / rate;
      out[i] += Math.sin(2 * Math.PI * f * t + phase0) * amp * Math.exp(-t / tau);
    }
  }
  // The strike itself: a 2 ms broadband tick.
  for (let i = 0; i < rate * 0.004; i++) out[i] += n() * Math.exp(-i / (rate * 0.0007)) * 0.9;
  for (let i = 0; i < out.length; i++) out[i] *= gain * Math.min(1, i / (rate * 0.0003));
  return out;
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
  // Steel: the release latch snaps and the magazine's lips ring as it leaves the well.
  mix(out, clank(seed + 11, { base: 1850, decay: 0.06 }), s(times.release + 4), 0.28);
  mix(out, clank(seed + 12, { base: 1320, decay: 0.09, bright: 0.8 }), s(times.magOut + 60), 0.3);
  mix(out, slide(seed + 2, 220, { from: 900, to: 1300, gain: 0.8 }), s(times.magOut + 30), 0.7);
  mix(out, rustle(seed + 3, 500, 0.35), s(times.magOut + 450)); // to the pouch
  mix(out, slide(seed + 4, 180, { from: 1200, to: 900 }), s(times.seat - 200), 0.6);
  // Fresh magazine knocks the well's edge going in, then seats with a ringing steel clank.
  mix(out, clank(seed + 13, { base: 1500, decay: 0.05, bright: 0.7 }), s(times.seat - 110), 0.35);
  mix(out, click(seed + 5, { freqs: [1500, 3100], q: 5, body: 120 }), s(times.seat), 1.2); // seated
  mix(out, clank(seed + 14, { base: 980, decay: 0.14 }), s(times.seat + 30), 0.45);
}
{
  const t = TIMES.tactical,
    out = buffer(t.length / 1000);
  magazineChange(out, t, 600);
  mix(out, click(612, { freqs: [1300, 2600], q: 4, body: 90 }), t.tap / 1000, 0.6); // palm tap
  mix(out, clank(614, { base: 1180, decay: 0.07, bright: 0.6 }), t.tap / 1000 + 0.002, 0.3);
  mix(out, rustle(613, 300, 0.25), t.guard / 1000);
  write("awp-reload-v2", out, 0.8);
}
{
  const t = TIMES.empty,
    out = buffer(t.length / 1000);
  magazineChange(out, t, 700);
  // The empty magazine hits the floor: two dull steel bounces, further away.
  mix(
    out,
    lowpass(clank(730, { base: 720, decay: 0.08, bright: 0.5 }), 3500),
    (t.magOut + 330) / 1000,
    0.45,
  );
  mix(
    out,
    lowpass(clank(731, { base: 760, decay: 0.06, bright: 0.4 }), 3000),
    (t.magOut + 470) / 1000,
    0.25,
  );
  boltSequence(out, 0, t, 720);
  // The bolt slams home on a fresh round: a bright steel ring under the lock click.
  mix(out, clank(732, { base: 1650, decay: 0.08 }), (t.lower - 18) / 1000, 0.4);
  write("awp-reload-empty-v2", out, 0.8);
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

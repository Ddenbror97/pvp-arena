/**
 * SPAS-12 sounds (battle royale) from the owner's recordings (2026-11-13), kept in
 * art/audio/owner-2026-11-13/. Decoding needs ffmpeg on the PATH (build time only).
 *
 * As build-br-smg-pistol-audio.mjs: cut at the onset (2 ms pre-roll), mono, the natural tail
 * kept and faded, levelled against the other guns (the loudest 50 ms window). No EQ, pitch or
 * effects.
 *  - br-spas12-v1.wav: Shotgun_shooting_sound.mp3 is a string of twelve shots; the last one
 *    (5.717 s), the only one whose boom and echo ring out.
 *  - br-spas12-silenced-v1.wav: Shotgun_silencer_sound.mp3 is six suppressed shots 0.2 s apart;
 *    the last one (2.206 s) with its tail.
 *  - br-spas12-reload-v1.wav: Reload_shotgun_sound.mp3 is seven shells pushed into the tube
 *    0.53 s apart, then the action worked and three shots. The reload here is counted shell by
 *    shell by the server (br/combat.ts), so the cues are played one at a time: six of them in
 *    0.42 s slots after a 0.05 s lead-in (br-audio.ts SPAS12_CUES), each levelled:
 *      0      the gun rolled over and the first shell picked up (the recording's first handling
 *             sound, 0.345 s)
 *      1 – 4  a shell pushed past the shell stop (four of the recording's, so no two in a row
 *             are the same); the click is 50 ms into the slot
 *      5      the bolt let go and running home (the action's clack at 4.87 s); the hit is 70 ms
 *             into the slot
 *
 *   node scripts/fps/build-br-spas12-audio.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const RATE = 48000;
const src = new URL("../../art/audio/owner-2026-11-13/", import.meta.url);
const out = new URL("../../public/fps/audio/", import.meta.url);

/** Mono float samples of an owner recording at 48 kHz. */
function decode(name) {
  const raw = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      new URL(name, src).pathname,
      "-ac",
      "1",
      "-ar",
      `${RATE}`,
      "-f",
      "f64le",
      "-",
    ],
    { maxBuffer: 1 << 28 },
  );
  return new Float64Array(raw.buffer, raw.byteOffset, raw.length / 8);
}
const at = (x, t) => {
  const p = t * RATE,
    i = Math.floor(p),
    f = p - i;
  return (x[i] ?? 0) * (1 - f) + (x[i + 1] ?? 0) * f;
};
/** Loudest 50 ms RMS in dBFS (how the existing gun sounds were compared). */
function loudness(x) {
  const w = RATE / 20;
  let best = 0;
  for (let i = 0; i + w <= x.length; i += w / 4) {
    let s = 0;
    for (let k = i; k < i + w; k++) s += x[k] * x[k];
    best = Math.max(best, s / w);
  }
  return 10 * Math.log10(best);
}
const CEILING = 10 ** (-1 / 20);
/** Peak limiter: 1.5 ms lookahead, a 1 ms ramp into the reduction and a 40 ms release. */
function limit(y) {
  const n = y.length,
    look = Math.round(0.0015 * RATE),
    need = Float64Array.from(y, (v) => Math.min(1, CEILING / Math.max(1e-9, Math.abs(v))));
  const env = new Float64Array(n);
  const rel = 1 - Math.exp(-1 / (0.04 * RATE)),
    att = 1 - Math.exp(-1 / (0.001 * RATE));
  for (let i = 0, g = 1; i < n; i++) {
    let m = 1;
    for (let k = i; k < Math.min(n, i + look); k++) m = Math.min(m, need[k]);
    g = Math.min(m, g + (1 - g) * rel);
    env[i] = g;
  }
  for (let i = n - 2; i >= 0; i--) env[i] = Math.min(env[i], env[i + 1] + (1 - env[i + 1]) * att);
  return Float64Array.from(y, (v, i) => Math.max(-CEILING, Math.min(CEILING, v * env[i])));
}
/** Level to `targetDb` (loudest 50 ms), at most `maxLimitDb` of the peaks limited to get there. */
function level(x, targetDb, maxLimitDb = 0) {
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (!(peak > 0.01)) throw Error("silent");
  const lift = Math.min(
    10 ** ((targetDb - loudness(x)) / 20),
    (CEILING * 10 ** (maxLimitDb / 20)) / peak,
  );
  return limit(Float64Array.from(x, (v) => v * lift));
}
function write(name, x) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24);
  b.writeUInt32LE(RATE * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++)
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(new URL(name, out), b);
  console.log(
    JSON.stringify({
      name,
      seconds: +(x.length / RATE).toFixed(3),
      loudest50ms: +loudness(x).toFixed(1),
    }),
  );
}
/** `seconds` of `x` from `fromS`, faded in over `inS` and out (cos²) over the last `fadeS`. */
function cut(x, fromS, seconds, fadeS, inS = 0.002) {
  return Float64Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = i / RATE,
      fadeIn = Math.min(1, t / inS),
      u = Math.max(0, (t - (seconds - fadeS)) / fadeS),
      fadeOut = Math.cos((u * Math.PI) / 2) ** 2;
    return at(x, fromS + t) * fadeIn * fadeOut;
  });
}

// ------------------------------------------------------------------ shots
// A 12 gauge is the loudest gun on the island after the AWP: a little over the rifles (−9.5).
write(
  "br-spas12-v1.wav",
  level(cut(decode("Shotgun_shooting_sound.mp3"), 5.7165 - 0.002, 1.05, 0.5), -8.5, 2.5),
);
// Under the open report (as the suppressor makes it), like the other silenced guns (−12.5).
write(
  "br-spas12-silenced-v1.wav",
  level(cut(decode("Shotgun_silencer_sound.mp3"), 2.206 - 0.002, 0.6, 0.38), -12, 4),
);

// ------------------------------------------------------------------ reload cues
const reload = decode("Reload_shotgun_sound.mp3");
const PAD = 0.05,
  SLOT = 0.42;
/** [from, length, target dB]: each cue starts at its slot's start. */
const CUES = [
  [0.345, 0.39, -17],
  // Shells: the slide of the hull starts 50 ms before the click of the shell stop.
  [1.831 - 0.05, 0.31, -14],
  [2.365 - 0.05, 0.31, -14],
  [2.898 - 0.05, 0.31, -14],
  [3.431 - 0.05, 0.3, -14],
  // The action: a click, then the bolt's clack 70 ms on.
  [4.87, 0.33, -13],
];
const sheet = new Float64Array(Math.round((PAD + SLOT * CUES.length) * RATE));
CUES.forEach(([from, seconds, db], i) => {
  const cue = level(cut(reload, from, seconds, 0.04, 0.004), db, 3);
  sheet.set(cue, Math.round((PAD + SLOT * i) * RATE));
});
write("br-spas12-reload-v1.wav", sheet);

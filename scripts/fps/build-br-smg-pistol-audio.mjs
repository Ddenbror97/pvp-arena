/**
 * MP5, Desert Eagle and Karambit-draw sounds (all modes) from the owner's recordings (2026-11-09), kept in
 * art/audio/owner-2026-11-09/. Decoding needs ffmpeg on the PATH (build time only).
 *
 * Shots: one shot cut at its onset (2 ms pre-roll), downmixed to mono, its natural tail kept and
 * faded, and levelled against the sounds they replace (the loudest 50 ms window). No EQ, pitch or
 * effects.
 *  - br-mp5-v2.wav: MP5_no_silencer_sound.mp3, the last shot of the burst (1.844 s) with the
 *    burst's tail; the MP5 in 1v1 / 5v5 and in the battle royale without a silencer.
 *  - br-mp5-silenced-v2.wav: MP5_shoot_silencer_sound.mp3, the single shot (1.555 s) with its
 *    bolt clack; the battle royale MP5 with the Silencer.
 *  - br-deagle-v2.wav: Desert_eagle_shoot_sound.mp3 (2.667 s), 1.4 s of its boom and echo.
 *  - knife-equip-v2.wav: pull_up_knife.mp3 (1.419 s), the blade drawn; played on the Karambit
 *    equip clip's "equip" cue (0.02 s), so its ring peaks while both hands rise into view.
 *
 * Reloads: the recordings' own mechanical cues, cut at quiet gaps and placed on the reload clips'
 * frames (mp5-animation.ts 2.3 s, deagle-animation.ts 1.9 s) so each sound lands on the frame
 * that makes it; at natural pitch except where one cue stands in for a missing one.
 *
 *   node scripts/fps/build-br-smg-pistol-audio.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const RATE = 48000;
const src = new URL("../../art/audio/owner-2026-11-09/", import.meta.url);
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
/**
 * Peak limiter for the few milliseconds of a crack that would clip: 1.5 ms lookahead, a 1 ms
 * ramp into the reduction and a 40 ms release, so the snap stays and nothing pumps.
 */
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
/**
 * Level to `targetDb` (loudest 50 ms) with the peaks held at −1 dBFS: up to `maxLimitDb` of the
 * crack is limited to get there, beyond that the level stays under the target. PCM16 mono WAV.
 */
function write(name, x, targetDb, maxLimitDb = 0) {
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (!(peak > 0.01)) throw Error(`${name}: silent`);
  const lift = Math.min(
    10 ** ((targetDb - loudness(x)) / 20),
    (CEILING * 10 ** (maxLimitDb / 20)) / peak,
  );
  x = limit(Float64Array.from(x, (v) => v * lift));
  const gain = 1;
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
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * gain * 32767))), 44 + i * 2);
  fs.writeFileSync(new URL(name, out), b);
  const level = loudness(Float64Array.from(x, (v) => v * gain)),
    limited = 20 * Math.log10((lift * peak) / CEILING);
  console.log(
    JSON.stringify({
      name,
      seconds: +(x.length / RATE).toFixed(3),
      loudest50ms: +level.toFixed(1),
      limitedDb: +Math.max(0, limited).toFixed(1),
    }),
  );
}

// ------------------------------------------------------------------ shots
/** One shot: from `onsetS` (2 ms pre-roll), `seconds` long, the last `fadeS` faded (cos²). */
function shot(x, onsetS, seconds, fadeS) {
  const start = onsetS - 0.002;
  return Float64Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = i / RATE,
      fadeIn = Math.min(1, t / 0.002),
      u = Math.max(0, (t - (seconds - fadeS)) / fadeS),
      fadeOut = Math.cos((u * Math.PI) / 2) ** 2;
    return at(x, start + t) * fadeIn * fadeOut;
  });
}
write("br-mp5-v2.wav", shot(decode("MP5_no_silencer_sound.mp3"), 1.8443, 0.42, 0.15), -9.5);
write(
  "br-mp5-silenced-v2.wav",
  shot(decode("MP5_shoot_silencer_sound.mp3"), 1.5546, 0.3, 0.08),
  // Under the open report (as the suppressor makes it), its crack limited to get there.
  -12.5,
  6,
);
// The .50's report sits with the rifles' (the previous mix was 5 dB under them).
write("br-deagle-v2.wav", shot(decode("Desert_eagle_shoot_sound.mp3"), 2.6666, 1.4, 0.5), -9, 1.5);

// The Karambit draw: the same length and level as the sound it replaces (knife-equip-v1).
write("knife-equip-v2.wav", shot(decode("pull_up_knife.mp3"), 1.4191, 0.42, 0.15), -15.6);

// ------------------------------------------------------------------ reloads
/**
 * A cue: the recording's [from, to) (s, cut at quiet points), whose transient at `onset` lands at
 * `atS` in the clip; `speed` > 1 raises the pitch (and shortens it), `gain` scales it.
 */
function reload(seconds, x, cues) {
  const y = new Float64Array(Math.round(seconds * RATE));
  for (const { from, to, onset, atS, speed = 1, gain = 1 } of cues) {
    const begin = atS - (onset - from) / speed,
      length = (to - from) / speed;
    if (begin < 0 || begin + length > seconds) throw Error(`cue ${onset} outside the clip`);
    const first = Math.round(begin * RATE),
      count = Math.round(length * RATE);
    for (let i = 0; i < count; i++) {
      const t = i / RATE,
        edge = Math.min(1, t / 0.003, (length - t) / 0.025);
      y[first + i] += gain * edge * at(x, from + t * speed);
    }
  }
  return y;
}
const semis = (n) => 2 ** (n / 12);

// MP5 (MP5_reload_sound.mp3): release 1.056, magazine out 1.269, the new one going in 2.016,
// seated 2.754, cocking lever back and locked 3.456, HK slap 3.768.
const mp5 = decode("MP5_reload_sound.mp3");
const MP5 = {
  release: { from: 0.99, to: 1.5, onset: 1.0559 }, // release and the magazine pulled out
  insert: { from: 1.95, to: 2.32, onset: 2.0164 },
  seat: { from: 2.7, to: 2.92, onset: 2.7544 },
  lever: { from: 3.4, to: 3.64, onset: 3.4563 },
  slap: { from: 3.7, to: 4.0, onset: 3.7682 },
};
const MP5_S = 2.3;
// Tactical: release 0.13, magazine away by 0.27, the fresh one near at 0.50, seated 0.56; the
// palm's second push at 0.665 (fractions of 2.3 s).
write(
  "br-mp5-reload-tactical-v2.wav",
  reload(MP5_S, mp5, [
    { ...MP5.release, atS: 0.13 * MP5_S },
    { ...MP5.insert, atS: 0.56 * MP5_S - 0.3 },
    { ...MP5.seat, atS: 0.56 * MP5_S },
    { ...MP5.seat, atS: 0.665 * MP5_S, speed: semis(2), gain: 0.35 },
  ]),
  -13.7,
);
// Empty: the lever reaches the back and hooks up at 0.165, release 0.27, seated 0.625, the slap
// lets the lever fly home at 0.755.
write(
  "br-mp5-reload-empty-v2.wav",
  reload(MP5_S, mp5, [
    { ...MP5.lever, atS: 0.165 * MP5_S },
    { ...MP5.release, atS: 0.27 * MP5_S },
    { ...MP5.insert, atS: 0.625 * MP5_S - 0.3 },
    { ...MP5.seat, atS: 0.625 * MP5_S },
    { ...MP5.slap, atS: 0.755 * MP5_S },
  ]),
  -13.7,
);

// Desert Eagle (desert_eagle_reload_sound.mp3): release button 1.077, magazine out 1.432, the
// fresh one in 1.841 and seated 1.917 (a second click 1.972). There is no slide in the recording:
// the empty reload's rack uses the insert click and the seat lowered (a heavier steel slam).
const de = decode("desert_eagle_reload_sound.mp3");
const DE = {
  button: { from: 1.06, to: 1.4, onset: 1.0773 },
  out: { from: 1.4, to: 1.76, onset: 1.4323 },
  seat: { from: 1.77, to: 2.15, onset: 1.9171 }, // insert, seat, latch
  click: { from: 1.83, to: 1.9, onset: 1.8413 },
  slam: { from: 1.9, to: 2.08, onset: 1.9171 },
};
const DE_S = 1.9;
// Tactical: release 0.12, the magazine drops out after it, seated 0.56.
write(
  "br-deagle-reload-tactical-v2.wav",
  reload(DE_S, de, [
    { ...DE.button, atS: 0.12 * DE_S },
    { ...DE.out, atS: 0.12 * DE_S + 0.07 },
    { ...DE.seat, atS: 0.56 * DE_S },
  ]),
  -13.7,
  3,
);
// Empty: release 0.10, seated 0.49, the slide pulled off the stop 0.665–0.70, home at 0.718.
write(
  "br-deagle-reload-empty-v2.wav",
  reload(DE_S, de, [
    { ...DE.button, atS: 0.1 * DE_S },
    { ...DE.out, atS: 0.1 * DE_S + 0.07 },
    { ...DE.seat, atS: 0.49 * DE_S },
    { ...DE.click, atS: 0.68 * DE_S, speed: semis(-2), gain: 0.5 },
    { ...DE.slam, atS: 0.718 * DE_S, speed: semis(-3), gain: 1.1 },
  ]),
  -13.7,
  3,
);

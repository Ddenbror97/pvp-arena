/**
 * Battle royale MP5 and Desert Eagle sounds (2026-11-09), derived from the project's existing
 * recordings like build-br-rifle-audio.mjs (public/fps/audio/ATTRIBUTION.md):
 *
 *  - br-mp5-v1.wav: the AK report raised ≈ 5 semitones and cut short (a 9 mm SMG's snappier,
 *    lighter crack) under a little of the CC0 1911 shot;
 *  - br-mp5-silenced-v1.wav: the suppressed M4A1-S shot raised ≈ 2.5 semitones;
 *  - br-deagle-v1.wav: the CC0 1911 shot lowered ≈ 3 semitones with the AK's body under it and a
 *    longer tail (the .50 AE's heavy boom);
 *  - reloads (tactical / empty): the AK reference reload's mechanical cues, re-pitched and placed
 *    on the MP5 (2.3 s) and Deagle (1.9 s) clips' frames (mp5-animation.ts,
 *    deagle-animation.ts): magazine release, seating, the MP5's cocking-lever pull and HK slap,
 *    the Deagle's slide going home.
 *
 *   node scripts/fps/build-br-smg-pistol-audio.mjs
 */
import fs from "node:fs";

const RATE = 48000;
const dir = new URL("../../public/fps/audio/", import.meta.url);
function read(name) {
  const b = fs.readFileSync(new URL(name, dir));
  let channels, rate, data;
  for (let p = 12; p + 8 <= b.length;) {
    const n = b.readUInt32LE(p + 4),
      id = b.toString("ascii", p, p + 4);
    if (id === "fmt ") {
      if (b.readUInt16LE(p + 8) !== 1 || b.readUInt16LE(p + 22) !== 16)
        throw Error("PCM16 required");
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
/** Sample of `a` at source time t (seconds), linear interpolation. */
const at = (a, t) => {
  const x = t * a.rate,
    i = Math.floor(x),
    f = x - i;
  return (a.samples[i] ?? 0) * (1 - f) + (a.samples[i + 1] ?? 0) * f;
};
function write(name, out, level = 0.88) {
  const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (!(peak > 0.01)) throw Error(`${name}: silent`);
  const b = Buffer.alloc(44 + out.length * 2);
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
  b.writeUInt32LE(out.length * 2, 40);
  for (let i = 0; i < out.length; i++)
    b.writeInt16LE(Math.round((out[i] / peak) * level * 32767), 44 + i * 2);
  fs.writeFileSync(new URL(name, dir), b);
  console.log(JSON.stringify({ name, seconds: +(out.length / RATE).toFixed(3), bytes: b.length }));
}
const semis = (n) => 2 ** (n / 12);
/** A shot: layers [source, speed, gain], an attack ramp and a fade to `seconds`. */
function shot(seconds, fadeS, layers) {
  return Float64Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = i / RATE;
    let v = 0;
    for (const [src, speed, gain] of layers) v += gain * at(src, t * speed);
    return v * Math.min(1, t / 0.0005) * Math.min(1, (seconds - t) / fadeS);
  });
}

const ak = read("ak47-reference-v1.wav"),
  m4s = read("m4a1-suppressed-v1.wav"),
  colt = read("pistol-v1.wav");
write(
  "br-mp5-v1.wav",
  shot(0.3, 0.08, [
    [ak, semis(5), 0.85],
    [colt, semis(2), 0.3],
  ]),
);
write("br-mp5-silenced-v1.wav", shot(0.32, 0.08, [[m4s, semis(2.5), 1]]), 0.8);
write(
  "br-deagle-v1.wav",
  shot(0.75, 0.25, [
    [colt, semis(-3), 0.8],
    [ak, semis(-4), 0.45],
  ]),
);

// ------------------------------------------------------------------ reloads
const tactical = read("ak-reload-reference-tactical-v1.wav"),
  empty = read("ak-reload-reference-empty-v1.wav");
/** Source cues in the AK reference (s): release, seating, bolt release (empty file only). */
const RELEASE = [0.28, 0.57],
  SEAT = [0.96, 1.26],
  BOLT = [1.385, 1.495];
function cue(out, src, [from, to], atS, pitch, gain = 1) {
  const count = Math.floor(((to - from) * src.rate) / pitch);
  const dest = Math.round(atS * RATE);
  for (let i = 0; i < count && dest + i < out.length; i++) {
    const fade = Math.max(0, Math.min(1, i / 48, (count - 1 - i) / 384));
    out[dest + i] += gain * at(src, from + (i * pitch) / src.rate) * fade;
  }
}
function reload(name, seconds, cues) {
  const out = new Float64Array(Math.round(seconds * RATE));
  for (const [src, span, fraction, pitch, gain] of cues)
    cue(out, src, span, fraction * seconds, pitch, gain);
  write(name, out, 0.84);
}
// MP5 (2.3 s; MP5_TACTICAL_RELOAD / MP5_EMPTY_RELOAD frames), two semitones up.
const P = semis(2);
reload("br-mp5-reload-tactical-v1.wav", 2.3, [
  [tactical, RELEASE, 0.13, P],
  [tactical, SEAT, 0.555, P],
  // The palm smack under the magazine.
  [tactical, SEAT, 0.66, semis(4), 0.55],
]);
reload("br-mp5-reload-empty-v1.wav", 2.3, [
  // The cocking lever pulled back and locked in its notch.
  [empty, BOLT, 0.105, semis(4), 0.7],
  [empty, RELEASE, 0.27, P],
  [empty, SEAT, 0.62, P],
  // HK slap: the bolt flies home.
  [empty, BOLT, 0.752, semis(1), 1],
]);
// Desert Eagle (1.9 s; DEAGLE_TACTICAL_RELOAD / DEAGLE_EMPTY_RELOAD frames), three up.
const D = semis(3);
reload("br-deagle-reload-tactical-v1.wav", 1.9, [
  [tactical, RELEASE, 0.12, D],
  [tactical, SEAT, 0.555, D],
]);
reload("br-deagle-reload-empty-v1.wav", 1.9, [
  [empty, RELEASE, 0.1, D],
  [empty, SEAT, 0.485, D],
  // The slide pulled off the stop, then slamming home.
  [empty, BOLT, 0.66, semis(6), 0.4],
  [empty, BOLT, 0.715, semis(-1), 1],
]);

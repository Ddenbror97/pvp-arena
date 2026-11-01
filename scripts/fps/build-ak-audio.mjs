import fs from "node:fs";
const rate = 24000;
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
function write(name, samples) {
  const peak = Math.max(...samples.map(Math.abs)),
    scale = 0.88 / Math.max(0.001, peak),
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
    b.writeInt16LE(Math.round(samples[i] * scale * 32767), 44 + i * 2);
  fs.writeFileSync("public/fps/audio/" + name, b);
  console.log(
    JSON.stringify({ name, seconds: samples.length / rate, bytes: b.length, peak: 0.88 }),
  );
}
let seed = 7163;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
function mechanism(out, at, duration, strength, tone) {
  let low = 0;
  for (let i = 0; i < duration * rate; i++) {
    const n = Math.round(at * rate) + i;
    if (n >= out.length) break;
    const t = i / rate,
      attack = Math.min(1, t / 0.001),
      env = attack * Math.exp(-t / (duration / 6));
    const white = noise();
    low += 0.16 * (white - low);
    const metal =
      Math.sin(t * 2 * Math.PI * tone) * 0.35 +
      Math.sin(t * 2 * Math.PI * tone * 2.73) * 0.13 +
      Math.sin(t * 2 * Math.PI * tone * 4.11) * 0.06;
    out[n] += strength * env * (metal + (white - low) * 0.4 + low * 0.6);
  }
}
for (const variant of ["a", "b"]) {
  const source = read("public/fps/audio/ak47-" + variant + "-v1.wav");
  // Find onset in our CC0 recording; none of the reference WAV is sampled.
  let onset = source.samples.findIndex((x) => Math.abs(x) > 0.035);
  onset = Math.max(0, onset - 24);
  const out = new Float64Array(Math.round(rate * 0.42));
  let bass = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate,
      index = onset + ((i * source.rate) / rate) * 0.96,
      a = Math.floor(index),
      f = index - a;
    const v = (source.samples[a] ?? 0) * (1 - f) + (source.samples[a + 1] ?? 0) * f;
    bass += 0.085 * (v - bass);
    const body = Math.sin(2 * Math.PI * (105 * t - 30 * t * t)) * Math.exp(-t * 34) * 0.18;
    const envelope =
      Math.min(1, (out.length - 1 - i) / (rate * 0.035)) * Math.exp(-Math.max(0, t - 0.1) * 9);
    out[i] = (v * 0.8 + bass * 0.3 + body) * envelope * Math.min(1, (i + 1) / 12);
  }
  mechanism(out, 0.004, 0.045, 0.19, 1750);
  mechanism(out, 0.058, 0.05, 0.075, 2300);
  write("ak47-" + variant + "-v2.wav", out);
}
for (const empty of [false, true]) {
  const out = new Float64Array(Math.round(rate * 1.8));
  // Align to the existing authored magazine rock-out, seating and bolt tracks.
  mechanism(out, 0.14, 0.1, 0.22, 1100);
  mechanism(out, 0.31, 0.11, 0.4, 720);
  mechanism(out, 0.45, 0.13, 0.16, 430);
  mechanism(out, 0.84, 0.12, 0.18, 620);
  mechanism(out, 1.02, 0.13, 0.55, 890);
  mechanism(out, 1.07, 0.065, 0.24, 1900);
  if (empty) {
    mechanism(out, 1.23, 0.14, 0.28, 1400);
    mechanism(out, 1.395, 0.17, 0.65, 1150);
  } else {
    mechanism(out, 1.23, 0.1, 0.18, 680);
    mechanism(out, 1.39, 0.1, 0.1, 440);
  }
  write(empty ? "ak-reload-empty-v1.wav" : "ak-reload-tactical-v1.wav", out);
}
if (process.argv[2]) {
  const ref = read(process.argv[2]),
    rms = [];
  for (let i = 0; i < ref.samples.length; i += ref.rate / 10) {
    let sum = 0;
    for (let j = i; j < Math.min(ref.samples.length, i + ref.rate / 10); j++)
      sum += ref.samples[j] ** 2;
    rms.push({ at: +(i / ref.rate).toFixed(1), rms: Math.sqrt(sum / (ref.rate / 10)) });
  }
  console.log(
    JSON.stringify({
      referenceSeconds: ref.samples.length / ref.rate,
      strongestWindows: rms.sort((a, b) => b.rms - a.rms).slice(0, 12),
    }),
  );
}

import fs from "node:fs";
const path = process.argv[2];
if (!path) throw Error("Pass the user-supplied reference WAV path");
const b = fs.readFileSync(path);
let channels, rate, bits, data;
for (let p = 12; p + 8 <= b.length;) {
  const id = b.toString("ascii", p, p + 4),
    size = Math.min(b.readUInt32LE(p + 4), b.length - p - 8);
  if (id === "fmt ") {
    channels = b.readUInt16LE(p + 10);
    rate = b.readUInt32LE(p + 12);
    bits = b.readUInt16LE(p + 22);
  }
  if (id === "data") data = b.subarray(p + 8, p + 8 + size);
  p += 8 + size + (size % 2);
}
if (bits !== 16 || rate !== 48000 || !data) throw Error("Expected supplied 48 kHz PCM16 reference");
const input = new Float64Array(data.length / (channels * 2));
for (let i = 0; i < input.length; i++)
  for (let c = 0; c < channels; c++)
    input[i] += data.readInt16LE((i * channels + c) * 2) / (channels * 32768);
function layer(out, from, to, at = 0, gain = 1) {
  const count = Math.round((to - from) * rate),
    start = Math.round(from * rate),
    destination = Math.round(at * rate);
  for (let i = 0; i < count && destination + i < out.length; i++) {
    const fade = Math.min(1, (i + 1) / 24, (count - 1 - i) / (rate * 0.012));
    out[destination + i] += (input[start + i] ?? 0) * gain * Math.max(0, fade);
  }
}
function write(name, samples) {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const gain = 0.84 / Math.max(0.001, peak),
    out = Buffer.alloc(44 + samples.length * 2);
  out.write("RIFF");
  out.writeUInt32LE(out.length - 8, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++)
    out.writeInt16LE(Math.round(samples[i] * gain * 32767), 44 + i * 2);
  fs.writeFileSync("public/fps/audio/" + name, out);
  console.log(JSON.stringify({ name, seconds: samples.length / rate, bytes: out.length }));
}
// The first report is isolated; later reports overlap in the reference burst.
const shot = new Float64Array(Math.round(1.08 * rate));
layer(shot, 2.3109, 3.3909);
write("ak47-reference-v1.wav", shot);
for (const empty of [false, true]) {
  const reload = new Float64Array(Math.round(1.8 * rate));
  layer(reload, 9.79, 10.08, 0.28);
  layer(reload, 10.5, 10.8, 0.96);
  if (empty) layer(reload, 11.89, 12.0, 1.385);
  write(empty ? "ak-reload-reference-empty-v1.wav" : "ak-reload-reference-tactical-v1.wav", reload);
}

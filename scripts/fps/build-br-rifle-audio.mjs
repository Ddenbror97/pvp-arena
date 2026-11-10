/** Rebuild the audible unsuppressed BR M4 from the project's existing rifle recordings.
 * The previous br-m4-v1.wav contains only zero samples; the source MP3 is unavailable.
 * This mix has an unsuppressed crack/body, distinct from the quiet M4A1-S recording. */
import fs from "node:fs";
function read(path) {
  const b = fs.readFileSync(path);
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
const ak = read("public/fps/audio/ak47-reference-v1.wav"),
  m4 = read("public/fps/audio/m4a1-suppressed-v1.wav"),
  rate = 48000;
const at = (a, t) => {
  const x = t * a.rate,
    i = Math.floor(x),
    f = x - i;
  return (a.samples[i] ?? 0) * (1 - f) + (a.samples[i + 1] ?? 0) * f;
};
const samples = Float64Array.from({ length: Math.round(0.32 * rate) }, (_, i) => {
  const t = i / rate;
  return (
    (0.86 * at(ak, t * 1.12) + 0.14 * at(m4, t * 1.04)) *
    Math.min(1, t / 0.0005) *
    Math.min(1, (0.32 - t) / 0.02)
  );
});
const peak = Math.max(...samples.map(Math.abs));
if (!(peak > 0.05)) throw Error("Source audio is silent");
const b = Buffer.alloc(44 + samples.length * 2);
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
  b.writeInt16LE(Math.round(((samples[i] * 0.88) / peak) * 32767), 44 + i * 2);
fs.writeFileSync("public/fps/audio/br-m4-v2.wav", b);
console.log("Built br-m4-v2.wav: 0.32 seconds, mono PCM16, non-silent unsuppressed report.");

// The silenced AK and AWP reports are built by build-br-silenced-audio.mjs (v3).

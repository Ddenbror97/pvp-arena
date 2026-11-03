/** Import owner-supplied C4 recordings. Usage: node scripts/fps/import-c4-recordings.mjs <keypad.mp3> <explosion.mp3> */
import fs from "node:fs";
import { chromium } from "playwright";
const [keypadFile, explosionFile] = process.argv.slice(2);
if (!keypadFile || !explosionFile) throw Error("Expected keypad and explosion recording paths");
const rate = 48000,
  dir = new URL("../../public/fps/audio/", import.meta.url);
const browser = await chromium.launch({ headless: true });
async function decode(file) {
  const page = await browser.newPage();
  try {
    const encoded = fs.readFileSync(file).toString("base64");
    const pcm = await page.evaluate(async (encoded) => {
      const context = new OfflineAudioContext(1, 1, 48000),
        bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const audio = await context.decodeAudioData(bytes.buffer),
        mono = new Float32Array(audio.length);
      for (let c = 0; c < audio.numberOfChannels; c++) {
        const data = audio.getChannelData(c);
        for (let i = 0; i < mono.length; i++) mono[i] += data[i] / audio.numberOfChannels;
      }
      const raw = new Uint8Array(mono.buffer);
      let value = "";
      for (let i = 0; i < raw.length; i += 32768)
        value += String.fromCharCode(...raw.subarray(i, i + 32768));
      return btoa(value);
    }, encoded);
    const b = Buffer.from(pcm, "base64");
    return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  } finally {
    await page.close();
  }
}
function write(name, source, start, seconds, target) {
  const offset = Math.max(0, Math.floor(start * rate)),
    count = Math.min(source.length - offset, Math.round(seconds * rate));
  const data = new Float32Array(count);
  let peak = 0;
  for (let i = 0; i < count; i++) {
    const fade = Math.min(1, i / 48, (count - 1 - i) / 480);
    data[i] = source[offset + i] * Math.max(0, fade);
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak < 0.001) throw Error("Recording slice is silent: " + name);
  const gain = target / peak,
    wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) wav.writeInt16LE(Math.round(data[i] * gain * 32767), 44 + i * 2);
  fs.writeFileSync(new URL(name, dir), wav);
  console.log(
    JSON.stringify({
      name,
      seconds: count / rate,
      peak: target,
      gainDb: +(20 * Math.log10(gain)).toFixed(2),
      mono: true,
    }),
  );
}
try {
  const keypad = await decode(keypadFile);
  for (const [i, start] of [2.042, 2.218, 2.663].entries())
    write(`c4-keypad-${i}-v1.wav`, keypad, start, 0.085, 0.7);
  const boom = await decode(explosionFile);
  let first = 0,
    last = boom.length - 1;
  while (first < boom.length && Math.abs(boom[first]) < 0.005) first++;
  while (last > first && Math.abs(boom[last]) < 0.0003) last--;
  const start = Math.max(0, first / rate - 0.002),
    end = Math.min(boom.length / rate, last / rate + 0.2);
  write("c4-explosion-v1.wav", boom, start, end - start, 0.94);
} finally {
  await browser.close();
}

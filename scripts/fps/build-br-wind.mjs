/** Build a quiet, seamless, mono PCM loop from the owner's wind recording; no external encoder. */
import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const input = process.argv[2];
assert(input, 'Usage: node scripts/fps/build-br-wind.mjs "path/to/Wind audio.mp3"');
const source = fs.readFileSync(input);
const server = http.createServer((req, res) => {
  if (req.url === "/wind") return res.writeHead(200, { "content-type": "audio/mpeg" }).end(source);
  res.end("<!doctype html><title>Local audio processing</title>");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async () => {
    const rate = 24000;
    const decoder = new OfflineAudioContext(1, rate, rate);
    const decoded = await decoder.decodeAudioData(
      await fetch("/wind").then((r) => r.arrayBuffer()),
    );
    const length = Math.min(decoded.length, Math.round(12.5 * rate));
    const render = new OfflineAudioContext(1, length, rate);
    const src = render.createBufferSource();
    src.buffer = decoded;
    const high = render.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 85;
    high.Q.value = 0.7;
    const low = render.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 7000;
    low.Q.value = 0.7;
    src.connect(high).connect(low).connect(render.destination);
    src.start();
    const samples = (await render.startRendering()).getChannelData(0);
    const fade = Math.min(Math.round(0.5 * rate), Math.floor(samples.length / 4));
    const out = new Float32Array(samples.length - fade);
    for (let i = 0; i < out.length; i++) {
      const w = i / fade;
      out[i] =
        i < fade
          ? samples[out.length + i] * Math.cos((w * Math.PI) / 2) +
            samples[i] * Math.sin((w * Math.PI) / 2)
          : samples[i];
    }
    let peak = 0,
      energy = 0;
    for (const v of out) {
      peak = Math.max(peak, Math.abs(v));
      energy += v * v;
    }
    const rms = Math.sqrt(energy / out.length);
    if (rms < 0.00001) throw Error("Wind recording is silent");
    const gain = Math.min(10 ** (-22 / 20) / rms, 0.45 / peak);
    const bytes = new Uint8Array(44 + out.length * 2),
      view = new DataView(bytes.buffer);
    const word = (s, p) => {
      for (let i = 0; i < s.length; i++) bytes[p + i] = s.charCodeAt(i);
    };
    word("RIFF", 0);
    view.setUint32(4, bytes.length - 8, true);
    word("WAVEfmt ", 8);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    word("data", 36);
    view.setUint32(40, out.length * 2, true);
    for (let i = 0; i < out.length; i++)
      view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, out[i] * gain)) * 32767), true);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return {
      base64: btoa(binary),
      duration: out.length / rate,
      sourceDuration: decoded.duration,
      rate,
      rms: rms * gain,
      peak: peak * gain,
    };
  });
  fs.writeFileSync("public/fps/audio/br-wind-loop-v1.wav", Buffer.from(result.base64, "base64"));
  const { base64, ...metadata } = result;
  console.log(JSON.stringify(metadata));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}

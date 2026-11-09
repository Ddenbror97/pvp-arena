/** Owner recordings -> trimmed starts and seamless engine loops. No external encoder needed. */
import fs from "node:fs";
import http from "node:http";
import { chromium } from "playwright";

const sources = ["vehicle-start", "car-driving", "bike-start", "bike-riding"];
const server = http.createServer((req, res) => {
  const key = req.url.slice(1);
  if (sources.includes(key))
    return res.end(fs.readFileSync(`art/audio/owner-2026-11-09/${key}.mp3`));
  res.end("<title>Offline vehicle audio processing</title>");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const files = await page.evaluate(async (sources) => {
    const rate = 32000;
    const decoded = {};
    for (const name of sources) {
      const context = new OfflineAudioContext(1, rate, rate);
      decoded[name] = await context.decodeAudioData(
        await fetch("/" + name).then((r) => r.arrayBuffer()),
      );
    }
    const cuts = [
      ["car-start", "vehicle-start", 0.94, 3.0, 0],
      ["car-idle", "vehicle-start", 2.9, 4.45, 0.12],
      ["car-drive", "car-driving", 4.1, 14.75, 0.2],
      ["bike-start", "bike-start", 0.97, 2.9, 0],
      ["bike-idle", "bike-start", 1.85, 2.9, 0.1],
      ["bike-drive", "bike-riding", 10.8, 14.8, 0.18],
    ];
    const results = [];
    for (const [name, source, from, to, crossfade] of cuts) {
      const length = Math.round((to - from) * rate);
      const context = new OfflineAudioContext(1, length, rate);
      const input = context.createBufferSource();
      input.buffer = decoded[source];
      const high = context.createBiquadFilter();
      high.type = "highpass";
      high.frequency.value = 45;
      high.Q.value = 0.7;
      input.connect(high).connect(context.destination);
      input.start(0, from, to - from);
      let samples = (await context.startRendering()).getChannelData(0);
      const wrap = Math.round(crossfade * rate);
      if (wrap) {
        const loop = new Float32Array(samples.length - wrap);
        for (let i = 0; i < loop.length; i++)
          loop[i] =
            i < wrap
              ? samples[loop.length + i] * Math.cos(((i / wrap) * Math.PI) / 2) +
                samples[i] * Math.sin(((i / wrap) * Math.PI) / 2)
              : samples[i];
        samples = loop;
      } else {
        // Keep 10 ms of pre-roll at the first real mechanical/ignition sound.
        let first = 0;
        while (first < samples.length && Math.abs(samples[first]) < 0.004) first++;
        samples = samples.slice(Math.max(0, first - Math.round(rate * 0.01)));
        const head = Math.round(rate * 0.003),
          tail = Math.round(rate * 0.08);
        for (let i = 0; i < head; i++) samples[i] *= i / head;
        for (let i = 0; i < tail; i++) samples[samples.length - 1 - i] *= i / tail;
      }
      let energy = 0,
        peak = 0;
      for (const v of samples) {
        energy += v * v;
        peak = Math.max(peak, Math.abs(v));
      }
      const rms = Math.sqrt(energy / samples.length);
      if (rms < 0.001) throw Error("Silent engine recording: " + name);
      const gain = Math.min(0.14 / rms, 0.78 / peak);
      const bytes = new Uint8Array(44 + samples.length * 2),
        view = new DataView(bytes.buffer);
      const word = (s, offset) => {
        for (let i = 0; i < s.length; i++) bytes[offset + i] = s.charCodeAt(i);
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
      view.setUint32(40, samples.length * 2, true);
      for (let i = 0; i < samples.length; i++)
        view.setInt16(44 + i * 2, Math.round(samples[i] * gain * 32767), true);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      results.push({
        name,
        source,
        from,
        to,
        crossfade,
        duration: samples.length / rate,
        rms: rms * gain,
        peak: peak * gain,
        base64: btoa(binary),
      });
    }
    return results;
  }, sources);
  for (const { base64, ...meta } of files) {
    fs.writeFileSync(`public/fps/audio/br-${meta.name}-v1.wav`, Buffer.from(base64, "base64"));
    console.log(JSON.stringify(meta));
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

/** Recorded keypad/explosion browser regression; no game login or wallet required. */
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { build } from "esbuild";
import { chromium, firefox } from "playwright";
import assert from "node:assert/strict";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const built = await build({
  stdin: {
    contents:
      'import {createCombatAudio} from "./src/lib/fps/audio";window.makeAudio=createCombatAudio;',
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  alias: { "@": path.join(root, "src") },
  logLevel: "error",
});
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><button id=start>Enable audio</button><script type=module src=/audio.js></script>",
    );
  if (url === "/audio.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(built.outputFiles[0].text);
  const file = path.join(root, "public", url);
  if (
    !file.startsWith(path.join(root, "public")) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  )
    return res.writeHead(404).end();
  res.writeHead(200, { "content-type": file.endsWith(".wav") ? "audio/wav" : "audio/mpeg" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage(),
        requests = [],
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("request", (r) => {
        if (/c4-(keypad|explosion)/.test(r.url())) requests.push(r.url());
      });
      await page.goto("http://127.0.0.1:" + server.address().port + "/");
      await page.waitForFunction(() => !!window.makeAudio);
      await page.evaluate(async () => {
        const aim = window.makeAudio();
        await aim.ready();
        aim.dispose();
      });
      assert.equal(requests.length, 0, "1v1 must not load the bomb recordings");
      await page.evaluate(async () => {
        window.audio = window.makeAudio(undefined, { bomb: true });
        await window.audio.ready();
        document.querySelector("#start").onclick = () => window.audio.unlock();
      });
      await page.click("#start");
      const result = await page.evaluate(async () => {
        await window.audio.unlock();
        const original = AudioBufferSourceNode.prototype.start,
          played = [];
        AudioBufferSourceNode.prototype.start = function (...args) {
          if (this.buffer) {
            const d = this.buffer.getChannelData(0);
            let peak = 0;
            for (const x of d) peak = Math.max(peak, Math.abs(x));
            played.push({ seconds: this.buffer.duration, peak });
          }
          return original.apply(this, args);
        };
        try {
          for (let i = 0; i < 3; i++) window.audio.cue("c4-key");
          window.audio.cue("explosion", { gain: 1 });
          const before = played.length;
          window.audio.setMuted(true);
          window.audio.cue("c4-key");
          window.audio.cue("explosion");
          return { played, mutedStarts: played.length - before };
        } finally {
          AudioBufferSourceNode.prototype.start = original;
          window.audio.dispose();
        }
      });
      assert.equal(requests.length, 4);
      assert.equal(result.played.length, 4);
      for (const p of result.played.slice(0, 3)) assert(Math.abs(p.seconds - 0.085) < 0.002);
      assert(result.played[3].seconds > 2 && result.played[3].seconds < 3);
      assert(result.played[3].peak > 0.85 && result.played[3].peak < 0.99);
      assert.equal(result.mutedStarts, 0);
      assert.deepEqual(errors, []);
      console.log(
        JSON.stringify({
          browser: name,
          bombOnlyFiles: requests.length,
          keypadSeconds: result.played[0].seconds,
          explosion: result.played[3],
          muteRespected: true,
          errors,
        }),
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}

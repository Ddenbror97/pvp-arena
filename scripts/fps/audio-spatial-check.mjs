import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium, firefox } from "playwright";
const root = process.cwd();
const built = await build({
  stdin: {
    contents:
      'import {createCombatAudio} from "./src/lib/fps/audio";import {createMatch} from "./src/lib/fps/simulation";import{distanceGain}from"./src/lib/fps/spatial-audio";window.audioApi={createCombatAudio,createMatch,distanceGain};',
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  alias: { "@": path.join(root, "src") },
  loader: { ".webp": "empty" },
  logLevel: "error",
});
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      '<!doctype html><button id="unlock">Start audio</button><script type="module" src="/h.js"></script>',
    );
  if (url === "/h.js")
    return res.writeHead(200, { "Content-Type": "text/javascript" }).end(built.outputFiles[0].text);
  const file = path.join(root, "public", url);
  if (
    !file.startsWith(path.join(root, "public")) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  )
    return res.writeHead(404).end();
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
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:" + server.address().port + "/");
      await page.waitForFunction(() => !!window.audioApi);
      await page.evaluate(async () => {
        const pans = [],
          filters = [],
          levels = [],
          starts = [],
          sources = [];
        for (const [method, list] of [
          ["createStereoPanner", pans],
          ["createBiquadFilter", filters],
          ["createGain", levels],
        ]) {
          const original = AudioContext.prototype[method];
          AudioContext.prototype[method] = function (...args) {
            const node = original.apply(this, args);
            list.push(node);
            return node;
          };
        }
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
          starts.push(performance.now());
          sources.push(this);
          return start.apply(this, args);
        };
        const view = { yaw: 0, poseAt: 900 },
          audio = window.audioApi.createCombatAudio(() => view, { bomb: true }),
          state = window.audioApi.createMatch({ A: "a", B: "b" }, 13, 0);
        await audio.ready();
        document.querySelector("#unlock").onclick = () => audio.unlock();
        window.probe = { pans, filters, levels, starts, sources, view, audio, state };
      });
      await page.click("#unlock");
      await page.waitForTimeout(100);
      const near = await page.evaluate(() => {
        const p = window.probe;
        p.state.phase = "live";
        p.state.tick = 1;
        p.state.events = [
          {
            id: 1,
            type: "shot",
            text: "shot",
            seat: "B",
            weapon: "rifle",
            at: 1000,
            audio: { kind: "shot", gain: 0.8, pan: 0, bearing: Math.PI / 2, distance: 3 },
          },
        ];
        p.audio.snapshot(p.state, "A", 1000);
        return {
          pan: p.pans.at(-1).pan.value,
          hz: p.filters.at(-1).frequency.value,
          gain: p.levels.at(-1).gain.value,
        };
      });
      assert(near.pan > 0.9);
      await page.evaluate(() => (window.probe.view.yaw = Math.PI));
      await page.waitForTimeout(40);
      assert((await page.evaluate(() => window.probe.pans.at(-1).pan.value)) < -0.8);
      const far = await page.evaluate(() => {
        const p = window.probe;
        p.state.tick++;
        p.state.events = [
          {
            id: 2,
            type: "shot",
            text: "shot",
            seat: "B",
            weapon: "rifle",
            at: 1100,
            audio: {
              kind: "shot",
              gain: window.audioApi.distanceGain(45, 90),
              pan: 0,
              bearing: -Math.PI / 2,
              distance: 45,
            },
          },
        ];
        p.audio.snapshot(p.state, "A", 1100);
        return { hz: p.filters.at(-1).frequency.value, gain: p.levels.at(-1).gain.value };
      });
      assert(far.hz < near.hz && far.gain < near.gain);
      await page.evaluate(() => {
        const p = window.probe;
        p.view.yaw = 0;
        p.audio.cue("shot", { gain: 0.8, bearing: -Math.PI / 2, distance: 4, m4: true });
      });
      assert((await page.evaluate(() => window.probe.pans.at(-1).pan.value)) < -0.9);
      const before = await page.evaluate(() => {
        const p = window.probe;
        const before = p.starts.length;
        p.state.tick++;
        p.audio.cue("step", {
          gain: 1,
          bearing: Math.PI / 2,
          distance: 6,
          surface: "metal",
          at: 1000,
        });
        return before;
      });
      await page.waitForTimeout(60);
      assert.equal(await page.evaluate(() => window.probe.starts.length), before);
      await page.evaluate(() => (window.probe.view.poseAt = 1000));
      await page.waitForFunction((n) => window.probe.starts.length > n, before);
      assert((await page.evaluate(() => window.probe.pans.at(-1).pan.value)) > 0.9);
      await page.evaluate(() => (window.probe.view.yaw = Math.PI));
      await page.waitForTimeout(40);
      assert((await page.evaluate(() => window.probe.pans.at(-1).pan.value)) < -0.8);
      const damage = await page.evaluate(() => {
        const p = window.probe;
        const before = p.starts.length;
        p.state.players.A.armor = 100;
        p.state.events = [
          { id: 3, type: "hit", weapon: "rifle", hit: { victim: "A", zone: "chest", damage: 26 } },
        ];
        p.audio.snapshot(p.state, "A", 1200);
        const torso = Array.from(p.sources.at(-1).buffer.getChannelData(0));
        const victimGain = p.levels.at(-1).gain.value;
        const victimPan = p.pans.at(-1).pan.value;
        p.audio.snapshot(p.state, "A", 1200);
        const deduplicated = p.starts.length === before + 1;
        p.audio.cue("hurt", { hitZone: "chest", armored: true });
        p.audio.cue("hurt", { hitZone: "head", armored: true });
        p.audio.cue("hurt", { hitZone: "chest", armored: true });
        const bombTorso = p.sources.at(-1).buffer.getChannelData(0);
        const identicalAcrossModes = torso.every((s, i) => s === bombTorso[i]);
        const shotsBeforeMute = p.starts.length;
        p.audio.setMuted(true);
        p.audio.cue("hurt", { hitZone: "head" });
        const volumeRespected = p.starts.length === shotsBeforeMute;
        return {
          victimGain,
          victimPan,
          deduplicated,
          identicalAcrossModes,
          volumeRespected,
          voicesStarted: shotsBeforeMute - before,
        };
      });
      assert.equal(damage.deduplicated, true);
      assert.equal(damage.volumeRespected, true);
      assert.equal(damage.identicalAcrossModes, true);
      assert.equal(damage.victimPan, 0);
      assert(damage.victimGain >= 0.7);
      assert.equal(damage.voicesStarted, 4);
      assert.deepEqual(errors, []);
      console.log(
        JSON.stringify({
          browser: name,
          near,
          far,
          gunshotsTrackListener: true,
          bombModePan: true,
          footstepsAlignedAndDirectional: true,
          damage,
          errors,
        }),
      );
      await page.evaluate(() => window.probe.audio.dispose());
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}

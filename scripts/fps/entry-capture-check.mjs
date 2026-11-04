import fs from "node:fs";
import http from "node:http";
import { build } from "esbuild";
import { chromium, firefox } from "playwright";
import assert from "node:assert/strict";
const b = await build({
  stdin: {
    contents:
      'import{reserveArenaPointer}from"./src/lib/fps/entry-capture";import{capturePointer}from"./src/lib/fps/pointer-capture";window.entryApi={reserveArenaPointer,capturePointer};',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
});
const server = http.createServer((q, r) =>
  q.url === "/h.js"
    ? r.writeHead(200, { "Content-Type": "text/javascript" }).end(b.outputFiles[0].text)
    : r.end(
        '<!doctype html><button id="start">Practice</button><canvas id="arena"></canvas><script type="module" src="/h.js"></script>',
      ),
);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto("http://127.0.0.1:" + server.address().port + "/");
      await page.waitForFunction(() => !!window.entryApi);
      await page.evaluate(
        () =>
          (document.querySelector("#start").onclick = () =>
            window.entryApi.reserveArenaPointer("bomb")),
      );
      await page.click("#start");
      await page.waitForFunction(() => document.pointerLockElement === document.body);
      await page.waitForTimeout(6500);
      await page.evaluate(() => window.entryApi.capturePointer(document.querySelector("#arena")));
      assert(
        await page.evaluate(() => document.pointerLockElement === document.querySelector("#arena")),
      );
      console.log(JSON.stringify({ browser: name, loadingDelayMs: 6500, noSecondClick: true }));
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}

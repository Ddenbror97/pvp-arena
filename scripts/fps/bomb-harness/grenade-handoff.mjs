import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const result = await build({
  stdin: {
    contents:
      'import {checkGrenadeHandoffs} from "./scripts/fps/bomb-harness/grenade-handoff";window.checkGrenadeHandoffs=checkGrenadeHandoffs;',
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
  if (url === "/") return res.end("<!doctype html><script type=module src=/h.js></script>");
  if (url === "/h.js")
    return res
      .writeHead(200, { "content-type": "text/javascript" })
      .end(result.outputFiles[0].text);
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
      await page.goto("http://127.0.0.1:" + server.address().port + "/");
      await page.waitForFunction(() => typeof window.checkGrenadeHandoffs === "function");
      const result = await page.evaluate(() => window.checkGrenadeHandoffs());
      console.log(JSON.stringify({ browser: name, ...result }));
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}

/** node scripts/fps/compile-check/run.mjs [maps] [--chromium=…]  (see entry.ts) */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const maps = (
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "dustfront"
).split(",");
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/fps/compile-check/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    loader: { ".webp": "empty", ".png": "empty", ".css": "empty" },
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><body style='margin:0'><script type=module src='/c.js'></script>",
    );
  if (url === "/c.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (
    !file.startsWith(path.join(ROOT, "public")) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  )
    return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": file.endsWith(".glb")
      ? "model/gltf-binary"
      : file.endsWith(".wav")
        ? "audio/wav"
        : "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on("pageerror", (e) => console.error("page:", String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.check === "function");
let bad = 0;
for (const m of maps) {
  const r = await page.evaluate(
    ([m, ms]) => window.check(m, ms),
    [m, Number(process.env.PLAY_MS ?? 60000)],
  );
  console.log(JSON.stringify({ ...r, compiledAfterReady: r.after - r.atReady }));
  if (r.after !== r.atReady) bad++;
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);

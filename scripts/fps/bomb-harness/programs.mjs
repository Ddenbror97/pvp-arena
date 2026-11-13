/**
 * 5v5 shader warm-up check (headless): which shader programs are first built while playing
 * instead of before the match is ready. A program's first use stalls the frame that draws it,
 * so everything a match can show should be built behind the loading screen.
 *
 *   node scripts/fps/bomb-harness/programs.mjs [--map=iron-district] [--seconds=90] [--chromium=/path]
 *
 * The real renderer with an in-page room and ten bots playing (buying, shooting, throwing
 * grenades, planting). Lists every program built after the arena reported ready, with the
 * material and object that asked for it and how it differs from the nearest earlier program.
 * Exit code 1 if there is one. The battle royale's check: scripts/br/client-sim/programs.mjs.
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const MAP = arg("map", "iron-district");
const seconds = Number(arg("seconds", 90));
const exe = arg("chromium");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/fps/bomb-harness/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    loader: { ".webp": "empty", ".png": "empty", ".css": "empty" },
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
// three asks for a material's program parameters (who asks is recorded) and then, if no program
// has them yet, builds one.
const asked = "function getParameters(material, lights, shadows, scene, object, lightProbeGrids) {";
const built = "program = new WebGLProgram(renderer, cacheKey, parameters, bindingStates);";
if (!js.includes(asked) || !js.includes(built)) throw new Error("three's program code not found");
const served = js
  .replace(
    asked,
    `${asked}
    window.__asked = material.type + " '" + material.name + "' on " + object.type + " '" + (object.name || object.parent?.name || "") + "'";`,
  )
  .replace(
    built,
    `${built}
    (window.__built ??= []).push({ late: !!window.__ready, asked: window.__asked, parameters: { ...parameters, vertexShader: "", fragmentShader: "" } });`,
  );
const types = { ".glb": "model/gltf-binary", ".wasm": "application/wasm" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><html><body style='margin:0;background:#000'><script type=module src='/h.js'></script></body></html>",
    );
  if (url === "/h.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(served);
  const file = path.join(ROOT, "public", url);
  if (
    !file.startsWith(path.join(ROOT, "public")) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  )
    return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
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
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.on("pageerror", (e) => console.log("pageerror", String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.harness === "object");
await page.evaluate((m) => window.harness.start(0, m), MAP);
const atReady = await page.evaluate(() => {
  window.__ready = true;
  return (window.__built ?? []).length;
});
await page.evaluate(() => window.harness.live());
/** The programs built since the last call, each with how it differs from the nearest earlier one. */
const lateBuilt = () =>
  page.evaluate(() => {
    const all = window.__built ?? [];
    const out = [];
    for (const b of all) {
      if (!b.late || b.told) continue;
      b.told = true;
      let best = null;
      for (const e of all) {
        if (e === b || e.late || e.parameters.shaderID !== b.parameters.shaderID) continue;
        const diff = Object.keys(b.parameters).filter(
          (k) => JSON.stringify(b.parameters[k]) !== JSON.stringify(e.parameters[k]),
        );
        if (!best || diff.length < best.length) best = diff;
      }
      const differs = best
        ? best
            .filter((k) => k !== "shaderName" && k !== "uniforms")
            .map((k) => `${k}=${JSON.stringify(b.parameters[k])}`)
            .join(", ") || "its uniforms only"
        : "no program of this shader before ready";
      out.push(`${b.parameters.shaderName || "(unnamed)"}: ${b.asked}; differs in: ${differs}`);
    }
    return out;
  });
// The local player runs and turns while the bots play.
await page.keyboard.down("KeyW");
let total = 0;
for (const end = Date.now() + seconds * 1000; Date.now() < end;) {
  await page.evaluate(() => {
    window.harness.turn(0.25);
    window.harness.state().roundEndsAt = Date.now() + 3_600_000;
  });
  await page.waitForTimeout(500);
  for (const l of await lateBuilt()) {
    total++;
    console.log(`after ${Math.round(seconds - (end - Date.now()) / 1000)} s: ${l}`);
  }
}
await page.keyboard.up("KeyW");
console.log(`${MAP}: ${atReady} programs at ready, ${total} built while playing (${seconds} s)`);
await browser.close();
server.close();
process.exit(total ? 1 : 0);

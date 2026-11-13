/**
 * Battle royale shader warm-up check (headless): which shader programs are first built while
 * playing instead of before "Ready". A program's first use stalls the frame that draws it (the
 * driver compiles and links it), so everything a match can show should be built behind the
 * loading screen (br-arena.ts: compileAsync, then warmPrograms).
 *
 *   node scripts/br/client-sim/programs.mjs [--chromium=/path]
 *
 * Plays the in-page match: the plane, the parachute, the ground with another player in view,
 * every gear level and gun (in your hands and in theirs), each grenade, the loot, the zip-line,
 * the rope, the ladder and the gas. Lists every program built after Ready with the material
 * and object that asked for it and how it differs from the nearest program built before Ready.
 * Exit code 1 if there is one. Vehicles are not in this match (scripts/br/vehicle-check).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const bundle = async (entry) =>
  (
    await build({
      entryPoints: [path.join(ROOT, entry)],
      bundle: true,
      write: false,
      format: "esm",
      target: "es2022",
      alias: { "@": path.join(ROOT, "src") },
      logLevel: "error",
    })
  ).outputFiles[0].text;
// three asks for a material's program parameters (who asks is recorded) and then, if no program
// has them yet, builds one: every program's parameters are kept to say how a late one differs
// from the nearest one built before Ready.
const asked = "function getParameters(material, lights, shadows, scene, object, lightProbeGrids) {";
const built = "program = new WebGLProgram(renderer, cacheKey, parameters, bindingStates);";
const js = await bundle("scripts/br/client-sim/entry.ts");
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
const workerJs = await bundle("src/lib/fps/br/tactical-map.worker.ts");
const html =
  "<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}</style><script type=module src='sim.js'></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/tactical-map.worker.ts")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(workerJs);
  if (url === "/") return res.end(html);
  if (url === "/sim.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(served);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
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
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on("pageerror", (e) => console.log("pageerror", String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/?loot=1`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.sim, null, { timeout: 180000 });
await page.evaluate(() => window.sim.ready);
const atReady = await page.evaluate(() => {
  window.__ready = true;
  return window.sim.arena.debug().programs;
});
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
        : "no program of this shader before Ready";
      out.push(`${b.parameters.shaderName || "(unnamed)"}: ${b.asked}; differs in: ${differs}`);
    }
    return out;
  });
const frames = (n) =>
  page.evaluate(
    (n) =>
      new Promise((r) => {
        const f = () => (--n > 0 ? requestAnimationFrame(f) : r());
        requestAnimationFrame(f);
      }),
    n,
  );
const status = () => page.evaluate(() => window.sim.status());
for (const t = Date.now(); (await status()).phase !== "plane";) {
  if (Date.now() - t > 240000) throw new Error("no plane");
  await new Promise((r) => setTimeout(r, 500));
}
const sim = (f, ...args) => page.evaluate(([f, args]) => window.sim[f](...args), [f, args]);
const steps = [
  ["in the plane", () => {}],
  [
    "under the parachute",
    async () => {
      await new Promise((r) => setTimeout(r, 11000)); // the jump window opens at 10 s
      await page.keyboard.press("Space");
      for (const t = Date.now(); (await status()).me.phase !== "parachute";) {
        if (Date.now() - t > 60000) throw new Error("no parachute");
        await new Promise((r) => setTimeout(r, 500));
      }
    },
  ],
  ["on the ground, another player ahead", () => sim("knifeSetup", false)],
  ["gear level 1", () => sim("giveGear", 1)],
  ["gear level 2", () => sim("giveGear", 2)],
  ["gear level 3", () => sim("giveGear", 3)],
  ...["ak47", "m4", "mp5", "deagle"].flatMap((gun) => [
    [`you hold the ${gun}`, () => sim("giveGun", gun)],
    [`the other player holds the ${gun}`, () => sim("otherGun", gun)],
  ]),
  ["an AWP with a scope and a silencer", () => sim("giveGun", "awp", "scope-4x", "silencer")],
  ["the other player holds the awp", () => sim("otherGun", "awp")],
  ...["he", "smoke", "fire"].map((n) => [`a ${n} grenade thrown`, () => sim("throwNade", n)]),
  ["at the loot", () => sim("toLoot")],
  ["on the zip-line", () => sim("toZip")],
  ["the other player on the zip-line", () => sim("zipOther")],
  ["at the climbing rope", () => sim("toRope")],
  ["the other player on the rope", () => sim("ropeOther")],
  ["at the ladder", () => sim("toLadder")],
  ["in the gas", () => sim("toGas")],
];
const seen = [];
for (const [name, act] of steps) {
  await act();
  await frames(name.includes("grenade") ? 14 : 6);
  const late = await lateBuilt();
  console.log(`${name}: ${late.length} built`);
  for (const l of late) console.log(`    ${l}`);
  seen.push(...late);
}
const after = await page.evaluate(() => window.sim.arena.debug().programs);
console.log(`programs: ${atReady} at Ready, ${after} after; ${seen.length} built while playing`);
await browser.close();
server.close();
process.exit(seen.length ? 1 : 0);

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = process.cwd(),
  out = path.join(root, ".wrangler/spectator-review");
fs.mkdirSync(out, { recursive: true });
let bundle = "";
const types = {
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      '<!doctype html><html><body style="margin:0"><script type="module" src="/h.js"></script></body></html>',
    );
  if (url === "/h.js") return res.writeHead(200, { "Content-Type": "text/javascript" }).end(bundle);
  if (url === "/favicon.ico") return res.writeHead(204).end();
  const file = path.join(root, "public", url);
  if (
    !file.startsWith(path.join(root, "public")) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  )
    return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
const source = fs.readFileSync("src/lib/fps/bomb/bomb-renderer.ts", "utf8").replace(
  "  const frame = (now: number) => {",
  `  (window as any).__spectatorDebug=()=>({camera:camera.position.toArray(),fov:camera.fov,variant:view.variant,rifle:view.root.visible,knife:knifeView.root.visible,weaponGroup:weaponGroup.visible,scope:scope.overlay,pov:latest?.pov,self:latest?.self.slot,c4:c4.view.kind,c4Plant:c4View.root.visible,c4Defuse:c4DefuseView.root.visible,grenades:viewScene.getObjectsByProperty('name','grenade-first-person').map(o=>o.visible),watchedBody:latest?.spectating!=null?remotes[latest.spectating]?.actor?.root.visible:null});
  const frame = (now: number) => {`,
);
const entry = fs
  .readFileSync("scripts/fps/bomb-harness/entry.ts", "utf8")
  .replace("    await arena.ready;", "    (window as any).__arena=arena; await arena.ready;")
  .replace(
    "    setInterval(() => {",
    "    setInterval(() => { if ((window as any).__pauseRoom) return;",
  );
const built = await build({
  entryPoints: [path.join(root, "scripts/fps/bomb-harness/entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  loader: { ".webp": "empty", ".png": "empty", ".css": "empty" },
  alias: { "@": path.join(root, "src") },
  logLevel: "error",
  plugins: [
    {
      name: "spectator-test",
      setup(b) {
        b.onLoad({ filter: /bomb-renderer\.ts$/ }, () => ({
          contents: source,
          loader: "ts",
          resolveDir: path.join(root, "src/lib/fps/bomb"),
        }));
        b.onLoad({ filter: /bomb-harness[\\/]entry\.ts$/ }, () => ({
          contents: entry,
          loader: "ts",
          resolveDir: path.join(root, "scripts/fps/bomb-harness"),
        }));
      },
    },
  ],
});
bundle = built.outputFiles[0].text;
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--use-angle=d3d11", "--force-high-performance-gpu", "--disable-software-rasterizer"],
});
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }),
    errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("PAGEERROR", e.stack);
  });
  await page.goto("http://localhost:" + server.address().port + "/");
  await page.waitForFunction(() => !!window.harness);
  await page.evaluate(() => window.harness.start(0));
  await page.evaluate(() => {
    window.harness.freezeBots(true);
    window.harness.live();
  });
  await page.waitForTimeout(200);
  await page.keyboard.press("Digit5");
  await page.waitForFunction(
    () =>
      window.harness.state().players[0].weapon === "grenade" &&
      window.harness.state().players[0].nade === "he",
  );
  await page.keyboard.press("Digit5");
  await page.waitForFunction(() => window.harness.state().players[0].nade === "smoke");
  await page.mouse.wheel(0, 120);
  await page.waitForFunction(() => window.harness.state().players[0].nade === "fire");
  await page.waitForTimeout(170);
  await page.mouse.wheel(0, 120);
  await page.waitForFunction(() => window.harness.state().players[0].weapon === "rifle");
  await page.waitForTimeout(170);
  await page.mouse.wheel(0, -120);
  await page.waitForFunction(
    () =>
      window.harness.state().players[0].weapon === "grenade" &&
      window.harness.state().players[0].nade === "fire",
  );
  await page.keyboard.press("Digit1");
  await page.waitForFunction(() => window.harness.state().players[0].weapon === "rifle");
  checks.push("Bomb mode key 5 and wheel cycle real grenade inputs in both directions");
  await page.evaluate(() => {
    window.harness.set(0, { hp: 0, dead: true, x: 10, z: 30 });
    window.harness.set(1, {
      yaw: 0,
      pitch: 0,
      weapon: "rifle",
      primary: "rifle",
      ammo: 17,
      reserve: 42,
      lastShotAt: -100000,
    });
    window.harness.spectate(1);
  });
  await page.waitForTimeout(1000);
  const programsAtReady = await page.evaluate(() => window.harness.programs().length);
  const read = () => page.evaluate(() => window.__spectatorDebug());
  let d = await read();
  assert.equal(d.variant, "m4");
  assert.equal(d.self, 0);
  assert.equal(d.pov.slot, 1);
  assert.equal(d.pov.ammo, 17);
  assert.equal(d.rifle, true);
  const mate = await page.evaluate(() => window.harness.state().players[1]);
  assert(Math.abs(d.camera[0] - mate.x) < 0.15 && Math.abs(d.camera[2] - mate.z) < 0.15);
  checks.push("M4 first-person camera and teammate ammo, recipient stays dead");
  await page.screenshot({ path: path.join(out, "spectator-m4.png") });
  await page.keyboard.press("Digit2");
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(300);
  d = await read();
  assert.equal(d.rifle, true);
  assert.equal(d.pov.weapon, "rifle");
  checks.push("spectator keys cannot change watched equipment");
  await page.evaluate(() => window.harness.set(1, { weapon: "knife" }));
  await page.waitForTimeout(600);
  d = await read();
  assert.equal(d.knife, true);
  assert.equal(d.rifle, false);
  checks.push("Karambit replaces the rifle");
  await page.evaluate(() =>
    window.harness.set(1, {
      weapon: "rifle",
      primary: "awp",
      scoped: true,
      scopedAt: Date.now() - 2000,
      lastShotAt: Date.now() - 5000,
    }),
  );
  await page.waitForTimeout(700);
  d = await read();
  assert.equal(d.scope, true);
  assert(d.fov < 30);
  assert.equal(d.weaponGroup, false);
  checks.push("AWP scoped camera and reticle");
  await page.evaluate(() =>
    window.harness.set(1, { scoped: false, reloadUntil: Date.now() + 3000, ammo: 0 }),
  );
  await page.waitForTimeout(500);
  d = await read();
  assert.equal(d.scope, false);
  assert.equal(d.rifle, true);
  checks.push("AWP reload cancels zoom and restores arms");
  await page.evaluate(() =>
    window.harness.set(1, {
      primary: "rifle",
      reloadUntil: 0,
      weapon: "grenade",
      nade: "smoke",
      nadeHold: { type: "smoke", since: Date.now() - 800, mask: 1 },
    }),
  );
  await page.waitForTimeout(500);
  d = await read();
  assert.equal(d.rifle, false);
  assert(d.grenades.some(Boolean));
  checks.push("watched smoke grenade hands");
  await page.screenshot({ path: path.join(out, "spectator-grenade.png") });
  await page.evaluate(() => {
    window.harness.set(2, { weapon: "rifle", primary: "rifle" });
    window.harness.spectate(2);
  });
  await page.waitForTimeout(600);
  d = await read();
  assert.equal(d.pov.slot, 2);
  assert.equal(d.rifle, true);
  assert(d.grenades.every((v) => !v));
  const mate2 = await page.evaluate(() => window.harness.state().players[2]);
  assert(Math.abs(d.camera[0] - mate2.x) < 0.15);
  checks.push("target switch clears grenade and follows next teammate");
  // Run real objective inputs through the simulation and per-recipient snapshots.
  await page.evaluate(() => {
    const h = window.harness;
    h.set(2, {
      x: -27,
      y: 0,
      z: -24,
      yaw: 0,
      pitch: -0.8,
      weapon: "rifle",
      primary: "rifle",
      defuseKit: true,
    });
    h.plant("A");
    h.state().bomb.z = -25;
    h.use(2, true);
  });
  await page.waitForFunction(() => window.harness.view().bomb.defuser === 2);
  await page.waitForTimeout(650);
  d = await read();
  assert.equal(d.c4, "defuse");
  assert.equal(d.c4Defuse, true);
  checks.push("Real simulated Police defuse is visible while spectating");
  await page.screenshot({ path: path.join(out, "spectator-defuse.png") });
  await page.evaluate(() => {
    const h = window.harness;
    h.use(2, false);
    h.state().half = 2;
    h.state().bomb = { state: "carried", carrier: 2 };
    h.use(2, true);
  });
  await page.waitForFunction(() => window.harness.view().bomb.state === "planting");
  await page.waitForTimeout(700);
  d = await read();
  assert.equal(d.variant, "ak");
  assert.equal(d.c4, "plant");
  assert.equal(d.c4Plant, true);
  checks.push("Real simulated Terrorist plant is visible while spectating");
  await page.screenshot({ path: path.join(out, "spectator-plant.png") });
  assert.equal(
    await page.evaluate(() => window.harness.programs().length),
    programsAtReady,
    "No additional shader compilation during spectating",
  );
  checks.push("No shader compilation during POV switches");
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.evaluate(() => window.harness.errors), []);
  const result = {
    checks,
    diagnostics: await page.evaluate(() => window.harness.diagnostics()),
    errors,
  };
  fs.writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  server.close();
}

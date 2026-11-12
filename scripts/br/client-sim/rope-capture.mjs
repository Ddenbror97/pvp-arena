/**
 * The Iron Peaks climbing rope (headless, real client and HUD against the in-page match): at its
 * foot the [E] Climb Rope prompt, E takes hold, the third-person camera (default above and
 * behind, then orbited to each side, the front, high overhead and low behind, the climber held
 * still on the rope), climbing on over the edge and first person again on the plateau; then the
 * other player climbing, watched from the slope beside the rope (the remote actor's pose).
 *
 *   node scripts/br/client-sim/rope-capture.mjs [outDir] [--chromium=/path] [--size=1280x720]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/rope-sim",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const [W, H] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "1280x720")
  .split("x")
  .map(Number);
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/client-sim/ui.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const css = ["src/components/fps/duel.css", "src/components/fps/br.css"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
  .join("\n");
const html = `<!doctype html><meta charset=utf-8><title>Project Island rope check</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}${css}</style><div class="duel-game br-game"><div class="duel-render-host" id="arena"></div><div id="hud"></div></div><script type=module src='ui.js'></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/ui.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
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
const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });
await page.addInitScript(() => (globalThis.__brAssumeLock = true));
const errors = [];
page.on("pageerror", (e) => (errors.push(String(e)), console.log("pageerror", String(e))));
page.on(
  "console",
  (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errors.push(m.text()),
);
page.on("response", (r) => {
  if (r.status() === 404 && !r.url().endsWith("/favicon.ico")) errors.push(`404 ${r.url()}`);
});
await page.goto(`http://127.0.0.1:${server.address().port}/?immortal=1`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.sim, null, { timeout: 240000 });
await page.evaluate(() => window.sim.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const status = () => page.evaluate(() => window.sim.status());
const until = async (pred, label, ms = 120000) => {
  const t = Date.now();
  for (;;) {
    const s = await status();
    if (await pred(s)) return s;
    if (Date.now() - t > ms)
      throw new Error(`timed out waiting for ${label}: ${JSON.stringify(s)}`);
    await wait(250);
  }
};
const shots = [];
const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", name, detail === undefined ? "" : JSON.stringify(detail));
};
const shot = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 84 });
  shots.push(name);
  console.log("shot", name);
};
const ropeS = (who) => page.evaluate((w) => window.sim.ropeS?.(w) ?? -1, who);
await page.mouse.click(W / 2, H / 2);
const LONG = 900000;
await until((s) => s.phase === "plane", "the plane");
await wait(11000);
await page.keyboard.press("Space");
await until((s) => s.me.phase === "freefall" || s.me.phase === "parachute", "the jump", 60000);
const rope = await page.evaluate(() => window.sim.toRope());
// ROPE_REMOTE=1: only the other player's climb (the remote actor's pose).
if (!process.env.ROPE_REMOTE) {
  await until((s) => s.predicted.phase === "ground", "at the rope's foot", 60000);
  await page.evaluate((h) => window.sim.arena.look(h, 0.35), rope.yaw);
  await wait(5000);
  check(
    "the [E] Climb Rope prompt at its foot",
    /Climb Rope/.test(await page.evaluate(() => document.body.innerText)),
  );
  await shot("r1-prompt");
  await page.keyboard.press("KeyE");
  await until((s) => s.me.phase === "ladder", "on the rope", 60000);
  // (Software WebGL draws ≈ 1 frame/s: the camera's 0.45 s blend takes a few seconds here.)
  let s = await until((x) => x.ndc?.ropeBlend > 0.5, "the third-person view", 60000);
  await shot("r2-attach");
  check("third person on taking hold", s.ndc?.ropeBlend > 0.5, s.ndc);
  await page.keyboard.down("KeyW");
  await until(async () => (await ropeS()) > 9, "9 m up", LONG);
  await page.keyboard.up("KeyW");
  // Held still on the rope: the orbit round the climber.
  const held = await ropeS();
  await wait(3000);
  s = await status();
  await shot("r3-angle-a-rear-elevated");
  console.log(
    "framing A",
    JSON.stringify({ ndc: s.ndc, cam: s.cam, shown: s.shown, d: s.camDist }),
  );
  check(
    "A: 3–4.5 m from the chest, above the climber",
    s.camDist > 3 && s.camDist < 5.2 && s.cam[1] > s.shown[1] + 2.5,
    { d: s.camDist, cam: s.cam, shown: s.shown },
  );
  check(
    "A: the climber on screen",
    s.ndc && Math.abs(s.ndc.root[0]) < 0.9 && Math.abs(s.ndc.root[1]) < 0.9,
    s.ndc,
  );
  check(
    "A: looking down 25–45°",
    s.ndc && s.ndc.pitchDeg <= -20 && s.ndc.pitchDeg >= -48,
    s.ndc?.pitchDeg,
  );
  const angles = [
    ["r4-angle-b-side-left", Math.PI / 2, 0.1],
    ["r5-angle-b-side-right", -Math.PI / 2, 0.1],
    ["r6-angle-c-front", Math.PI, 0.25],
    ["r7-angle-d-overhead", 0, -0.85],
    ["r8-angle-e-low-rear", 0, 0.95],
  ];
  for (const [name, dy, p] of angles) {
    await page.evaluate(([h, pp]) => window.sim.arena.look(h, pp), [rope.yaw + dy, p]);
    await wait(6000);
    await shot(name);
    await wait(1500);
    s = await status();
    console.log("framing", name, JSON.stringify({ ndc: s.ndc, cam: s.cam, d: s.camDist }));
    check(`${name}: camera above the ground`, s.cam[1] > s.groundAtCam + 0.3, {
      cam: s.cam,
      g: s.groundAtCam,
    });
    check(
      `${name}: the climber on screen`,
      s.ndc && Math.abs(s.ndc.root[0]) < 1 && Math.abs(s.ndc.root[1]) < 1,
      s.ndc,
    );
  }
  check("held still while the camera orbited", Math.abs((await ropeS()) - held) < 1e-6, { held });
  await page.evaluate((h) => window.sim.arena.look(h, 0), rope.yaw);
  await page.keyboard.down("KeyW");
  await until(async () => (await ropeS()) > rope.length * 0.55, "past half way", LONG);
  await shot("r9-climbing-high");
  const top = await until((x) => x.me.phase === "ground", "off at the top", LONG);
  await page.keyboard.up("KeyW");
  check("stepped onto the plateau", Math.abs(top.me.y - rope.top) < 0.05, top.me);
  check("prediction on the server's climb", top.error < 0.15, top.error);
  await wait(6000);
  s = await status();
  await shot("r10-first-person");
  check("first person again (camera at the eye)", s.camDist > 1.2 && s.camDist < 1.8, s.camDist);
}
// The other player climbing, from the slope beside the rope, looking at them.
await page.evaluate(() => window.sim.ropeOther(2.2));
await until((x) => x.otherPhase === "ladder", "the other climbing", 60000);
for (const [up, name] of [
  [4, "r11-remote-climb-low"],
  [9, "r12-remote-climb-high"],
]) {
  await until(async () => (await ropeS("other")) > up, `the other ${up} m up`, LONG);
  const st = await status();
  const [ox, oy, oz] = st.otherPos;
  const dx = ox - st.me.x,
    dz = oz - st.me.z,
    dy = oy + 1.2 - (st.me.y + 1.6);
  await page.evaluate(
    ([h, p]) => window.sim.arena.look(h, p),
    [Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))],
  );
  await wait(5000);
  await shot(name);
}
const fin = await status();
check(
  "the other climber is seen on the rope",
  Array.isArray(fin.otherSeen) && fin.otherSeen[4] === 7,
  fin.otherSeen,
);
check("no page errors", errors.length === 0, errors);
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ shots, checks, errors }, null, 1),
);
console.log("ALLDONE");
await browser.close();
server.close();

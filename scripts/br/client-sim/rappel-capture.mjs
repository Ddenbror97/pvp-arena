/**
 * The rappel (headless, real client and HUD against the in-page match): at a Downtown roof's
 * edge the [E] Rappel down prompt, E throws the rope, over the edge, braced on the wall with
 * the camera above (then orbited to each side, low and overhead), a wall jump held at four
 * moments, the rest of the way down by itself, first person again on the floor; then the other
 * player (the terrorist) down the same wall, watched from the street (the remote figure and
 * its rope). The descent is held still for the pictures (sim.rappelHold): software WebGL draws
 * a frame a second while the in-page server keeps time.
 *
 *   node scripts/br/client-sim/rappel-capture.mjs [outDir] [--chromium=/path] [--size=1280x720]
 *   RAPPEL_STAND=tall|mid|parapet|low   RAPPEL_REMOTE=1 (only the other player's)
 */
/** Roof edges from the map audit (scripts/br/map-audit/rappel-sites.ts --poi=downtown --list). */
const STANDS = {
  tall: { at: [1299.55, 100.23, 198.2], yaw: 0 },
  mid: { at: [1344.63, 29.63, 293.2], yaw: 0 },
  parapet: { at: [1376.3, 23.23, 434.2], yaw: 0 },
  low: { at: [1323.29, 16.89, 442.6], yaw: -1.571 },
};
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : "art/br/build/rappel-sim",
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
const html = `<!doctype html><meta charset=utf-8><title>Project Island rappel check</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}${css}</style><div class="duel-game br-game"><div class="duel-render-host" id="arena"></div><div id="hud"></div></div><script type=module src='ui.js'></script>`;
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
await page.addInitScript(() => {
  globalThis.__brAssumeLock = true;
  // The first other player drawn is the terrorist (the watched rappel below).
  globalThis.__brActorsFrom = "B";
});
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
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 86 });
  shots.push(name);
  console.log("shot", name);
};
const view = () =>
  page.evaluate(() => {
    const d = window.sim.arena.debug();
    return { blend: d.view.rappelBlend, ropes: d.view.rappelRopes };
  });
const hold = (h) => page.evaluate((x) => window.sim.rappelHold(x), h);
const look = (yaw, pitch) => page.evaluate(([y, p]) => window.sim.arena.look(y, p), [yaw, pitch]);
// (Software WebGL draws about a frame a second: a settle is several frames.)
const SETTLE = Number(process.env.RAPPEL_SETTLE ?? 7000);

await page.mouse.click(W / 2, H / 2);
await until((s) => s.phase === "plane", "the plane");
await wait(11000);
await page.keyboard.press("Space");
await until((s) => s.me.phase === "freefall" || s.me.phase === "parachute", "the jump", 60000);

// ---- yours: a Downtown roof, 16 m of wall under its north edge
const mine = STANDS[process.env.RAPPEL_STAND ?? "mid"];
const wallYaw = mine.yaw + Math.PI;
if (!process.env.RAPPEL_REMOTE) {
  await page.evaluate((s) => window.sim.rappelStand("me", s.at[0], s.at[1], s.at[2], s.yaw), mine);
  await until((s) => s.predicted.phase === "ground", "on the roof", 60000);
  await look(mine.yaw, -0.25);
  await wait(SETTLE);
  const text = await page.evaluate(() => document.body.innerText);
  check(
    "the [E] Rappel down prompt at the roof's edge",
    /Rappel down/i.test(text),
    text.match(/.*Rappel.*/i)?.[0],
  );
  await shot("a1-prompt-at-the-edge");
  // Back from the edge, and facing away from it: no prompt.
  await look(mine.yaw + Math.PI, 0);
  await wait(SETTLE);
  check(
    "no prompt with your back to the edge",
    !/Rappel down/i.test(await page.evaluate(() => document.body.innerText)),
  );
  await look(mine.yaw, -0.25);
  await wait(3000);
  await page.keyboard.press("KeyE");
  await until((s) => s.me.phase === "rappel", "on the rope", 60000);
  for (const [name, of] of [
    ["a2-taking-the-rope", 0.3],
    ["a3-over-the-edge", 0.55],
    ["a4-onto-the-wall", 0.8],
  ]) {
    await hold({ who: "me", stage: "on", of });
    await until(async () => (await view()).blend > 0.95, "the view from above", 90000);
    await wait(SETTLE);
    await shot(name);
  }
  // Braced on the wall, 5 m under the edge: the view from above, then round it.
  await hold({ who: "me", stage: "hang", of: -1, s: 5 });
  await wait(SETTLE + 2000);
  let s = await status();
  let v = await view();
  await shot("b1-braced-from-above");
  console.log("framing", JSON.stringify({ ndc: s.ndc, cam: s.cam, shown: s.shown, d: s.camDist }));
  check("third person on the rope", v.blend > 0.95, v);
  check("one rope drawn", v.ropes === 1, v);
  check("the camera is above you", s.cam[1] > s.shown[1] + 3, { cam: s.cam, shown: s.shown });
  check("looking down the wall", s.ndc && s.ndc.pitchDeg <= -30, s.ndc?.pitchDeg);
  check(
    "you are on screen",
    s.ndc && Math.abs(s.ndc.root[0]) < 0.85 && Math.abs(s.ndc.root[1]) < 0.85,
    s.ndc,
  );
  const angles = [
    ["b2-side-left", 1.25, 0.25],
    ["b3-side-right", -1.25, 0.25],
    ["b4-diagonal-low", 0.7, 0.75],
    ["b5-overhead", 0, -0.6],
  ];
  for (const [name, dy, p] of angles) {
    await look(wallYaw + dy, p);
    await wait(SETTLE);
    await shot(name);
    s = await status();
    console.log("framing", name, JSON.stringify({ ndc: s.ndc, cam: s.cam, d: s.camDist }));
    check(
      `${name}: you are on screen`,
      s.ndc && Math.abs(s.ndc.root[0]) < 0.95 && Math.abs(s.ndc.root[1]) < 0.95,
      s.ndc?.root,
    );
    check(`${name}: the camera is out of the ground`, s.cam[1] > s.groundAtCam + 0.3, {
      cam: s.cam,
      g: s.groundAtCam,
    });
  }
  // A wall jump, held at four moments of it (from the side, where the swing shows).
  await look(wallYaw + 1.05, 0.45);
  for (const [name, of] of [
    ["c1-hop-knees-bent", 0.12],
    ["c2-hop-off-the-wall", 0.32],
    ["c3-hop-dropping", 0.55],
    ["c4-hop-back-on-the-wall", 0.84],
  ]) {
    await hold({ who: "me", stage: "hang", of, s: 5 });
    await wait(SETTLE);
    await shot(name);
  }
  await look(wallYaw, 0);
  await hold({ who: "me", stage: "hang", of: 0.5, s: 5 });
  await wait(SETTLE);
  await shot("c5-hop-from-above");
  // Walking back up (S), held mid-step.
  await hold(null);
  await page.keyboard.down("KeyS");
  await wait(2500);
  const up = await page.evaluate(() => window.sim.rappel());
  await page.keyboard.up("KeyS");
  console.log("climbing", JSON.stringify(up && { stage: up.stage, s: up.s, hop: up.hop }));
  // The rest of the way down by itself, and the landing.
  const t0 = Date.now();
  await until((x) => x.me.phase === "ground", "landed", 180000);
  console.log("down in", ((Date.now() - t0) / 1000).toFixed(1), "s");
  await wait(SETTLE);
  v = await view();
  s = await status();
  check("first person again on the floor", v.blend === 0, v);
  check("the rope is gone", v.ropes === 0, v);
  check("standing on the floor", Math.abs(s.me.y - s.ground) < 0.05, { y: s.me.y, g: s.ground });
  await shot("d1-landed-first-person");
}

// ---- theirs: the terrorist down the same wall, watched from the street
await page.evaluate(
  (s) => window.sim.rappelStand("other", s.at[0], s.at[1], s.at[2], s.yaw, 6.5, 3.5),
  mine,
);
await until((s) => s.predicted.phase === "ground", "watching from the street", 60000);
await wait(3000);
await page.evaluate(() => window.sim.rappelOther());
await until((s) => s.otherPhase === "rappel", "the other on the rope", 60000);
const lookAtOther = async () => {
  const s = await status();
  const dx = s.otherPos[0] - s.me.x,
    dy = s.otherPos[1] + 1 - (s.me.y + 1.6),
    dz = s.otherPos[2] - s.me.z;
  await look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
};
for (const [name, h] of [
  ["e1-other-over-the-edge", { stage: "on", of: 0.7 }],
  ["e2-other-braced", { stage: "hang", of: -1, s: 6 }],
  ["e3-other-hop-off-the-wall", { stage: "hang", of: 0.35, s: 6 }],
  ["e4-other-hop-dropping", { stage: "hang", of: 0.6, s: 6 }],
  ["e5-other-braced-low", { stage: "hang", of: -1, s: 11 }],
  ["e6-other-landing", { stage: "land", of: 0.55, s: 11 }],
]) {
  await hold({ who: "other", ...h });
  await wait(2500);
  await lookAtOther();
  await wait(SETTLE);
  await shot(name);
  if (name === "e2-other-braced") {
    const v = await view();
    check("their rope is drawn", v.ropes === 1, v);
  }
}
await hold(null);
await until((s) => s.otherPhase === "ground", "the other landed", 180000);
await wait(SETTLE);
{
  const v = await view();
  check("their rope is gone once they stand", v.ropes === 0, v);
  await lookAtOther();
  await wait(4000);
  await shot("e7-other-landed");
}
check("no page errors", errors.length === 0, errors.slice(0, 5));
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ checks, shots, errors }, null, 2),
);
await browser.close();
server.close();
const failed = checks.filter((c) => !c.ok);
console.log(failed.length ? `${failed.length} FAILED` : `all ${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);

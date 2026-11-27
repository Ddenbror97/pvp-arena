/**
 * Hit effects in the battle royale's real client (headless, against the in-page match): you
 * shoot the other player (the red mist where the server's hit record puts it), they shoot you
 * (the direction crescent, turned as you turn; the red edge flash), and your health is taken
 * under half and down (the blood at the bottom and the edges), then back up, then to nothing.
 *
 * Software WebGL takes seconds over a frame and a screenshot, and the mist lasts half a second.
 * The page's clocks (performance.now, Date.now, requestAnimationFrame, timers) are therefore
 * run slow together once the players are placed, so the client, the in-page server and the
 * effects stay in step and each frame can be caught: `--slow` for the mist (default 0.005: a
 * second of the match takes 200), eight times that for the rest.
 *
 *   node scripts/br/client-sim/hit-capture.mjs [outDir] [--chromium=/path] [--size=960x540]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "art/br/build/hit-sim",
);
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const SLOW = Number(process.argv.find((a) => a.startsWith("--slow="))?.slice(7) ?? 0.005);
const [W, H] = (process.argv.find((a) => a.startsWith("--size="))?.slice(7) ?? "960x540")
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
    // (Components import their style sheets; the page below carries the ones it needs.)
    loader: { ".css": "empty" },
    logLevel: "error",
  })
).outputFiles[0].text;
const css = ["src/components/fps/duel.css", "src/components/fps/br.css"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
  .join("\n");
const html = `<!doctype html><meta charset=utf-8><title>Project Island hit check</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}${css}</style><div class="duel-game br-game"><div class="duel-render-host" id="arena"></div><div id="hud"></div></div><script type=module src='ui.js'></script>`;
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
  // One clock for the whole page, run at `__pace` of real time (1 until the script slows it).
  globalThis.__pace = 1;
  const realNow = performance.now.bind(performance),
    realDate = Date.now.bind(Date),
    realTimeout = setTimeout.bind(globalThis),
    realRaf = requestAnimationFrame.bind(globalThis);
  let lastReal = realNow(),
    virtual = lastReal;
  const now = () => {
    const r = realNow();
    virtual += (r - lastReal) * globalThis.__pace;
    lastReal = r;
    return virtual;
  };
  const dateBase = realDate() - realNow();
  performance.now = now;
  Date.now = () => Math.round(dateBase + now());
  globalThis.requestAnimationFrame = (f) => realRaf(() => f(now()));
  globalThis.setTimeout = (f, ms = 0, ...a) => realTimeout(f, ms / globalThis.__pace, ...a);
  const live = new Map();
  let ids = 1e9;
  globalThis.setInterval = (f, ms = 0, ...a) => {
    const id = ids++;
    const again = () => {
      if (!live.has(id)) return;
      live.set(id, realTimeout(again, Math.max(1, ms) / globalThis.__pace));
      f(...a);
    };
    live.set(id, realTimeout(again, Math.max(1, ms) / globalThis.__pace));
    return id;
  };
  const realClear = clearInterval.bind(globalThis);
  globalThis.clearInterval = (id) => {
    if (live.has(id)) {
      clearTimeout(live.get(id));
      live.delete(id);
    } else realClear(id);
  };
});
const errors = [];
page.on("pageerror", (e) => (errors.push(String(e)), console.log("pageerror", String(e))));
page.on(
  "console",
  (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errors.push(m.text()),
);
await page.goto(`http://127.0.0.1:${server.address().port}/`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => window.sim, null, { timeout: 60000 });
await page.evaluate(() => window.sim.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** `ms` of the match's own time. */
const pass = (ms) => wait(ms / pace);
let pace = 1;
const status = () => page.evaluate(() => window.sim.status());
const until = async (pred, label, ms = 180000) => {
  const t = Date.now();
  for (;;) {
    const s = await status();
    if (pred(s)) return s;
    if (Date.now() - t > ms)
      throw new Error(`timed out waiting for ${label}: ${JSON.stringify(s).slice(0, 400)}`);
    await wait(250);
  }
};
const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok: !!ok, detail });
  console.log(ok ? "PASS" : "FAIL", name, detail === undefined ? "" : JSON.stringify(detail));
};
const shot = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 88 });
  console.log("shot", name);
};
/** The damage overlay as the page has it now. */
const overlay = () =>
  page.evaluate(() => {
    const root = document.querySelector(".fps-dmg");
    if (!root) return null;
    const num = (el) => Number(el?.style.opacity || 0);
    return {
      shown: root.style.display !== "none",
      low: num(root.querySelector(".fps-dmg-low")),
      flash: num(root.querySelector(".fps-dmg-flash")),
      arcs: [...root.querySelectorAll(".fps-dmg-arc")]
        .filter((a) => num(a) > 0)
        .map((a) => ({
          angle: Math.round(Number(/rotate\(([-\d.]+)deg\)/.exec(a.style.transform)?.[1])),
          armoured: a.classList.contains("armoured"),
        })),
      elements: root.querySelectorAll("*").length,
    };
  });
await page.mouse.click(W / 2, H / 2);
// Past the lobby (in the warm-up nobody is hurt), then straight onto the ground.
await wait(3000);
await page.evaluate(() => window.sim.takeOff?.());
await until((s) => s.phase !== "waiting" && s.phase !== "starting", "take-off");
await page.evaluate(() => window.sim.fightSetup?.(5, 0));
await until((s) => s.predicted.phase === "ground", "on foot", 60000);
await wait(6000);
await page.evaluate(() => window.sim.look?.(-0.06));
await wait(2500);
check("armed: the AK-47 is in hand", (await status()).myActive === 0);
check("no overlay at full health", (await overlay())?.shown === false, await overlay());
await shot("1-before");

// ---- slow from here
const setPace = async (p) => {
  pace = p;
  await page.evaluate((v) => (globalThis.__pace = v), p);
};
await setPace(SLOW);
await pass(60);
const hp0 = (await status()).otherHp;
await page.mouse.down({ button: "left" });
await pass(50);
await page.mouse.up({ button: "left" });
// The shot, its hit record and the mist: a picture every 40 ms or so of the match (each takes
// several real seconds), from the server taking the health until the cloud has gone.
let mistAt = null;
for (let i = 0; i < 40 && mistAt === null; i++) {
  await pass(10);
  if ((await status()).otherHp < hp0) mistAt = i;
}
for (let i = 0; i < 18; i++) {
  await shot(`2-mist-${String(i).padStart(2, "0")}`);
  await pass(15);
}
const hp1 = (await status()).otherHp;
check("your shot hit (the server took the other player's health)", hp1 < hp0, { hp0, hp1 });
await setPace(SLOW * 8);

// ---- they shoot you: from ahead, then you turn a quarter right (they are on your left)
/** A burst from the other player (two or three rounds), your health topped up after it. */
const burst = async () => {
  await page.evaluate(() => window.sim.health?.(100, 100));
  await page.evaluate(() => window.sim.otherFire?.(true));
  await pass(230);
  await page.evaluate(() => window.sim.otherFire?.(false));
  await pass(150);
  const before = await page.evaluate(() => window.sim.health?.(null).mine);
  return before;
};
let left = await burst();
check("their burst hit you (the server took your health)", left < 100 && left > 0, { left });
let seen = await overlay();
check(
  "hit from ahead: a crescent at the top and the edge flash",
  seen?.arcs.length === 1 && Math.abs(seen.arcs[0].angle) < 25 && seen.flash > 0,
  seen,
);
await shot("3-hit-from-ahead");
const yaw = (await status()).input?.yaw ?? 0;
await page.evaluate(() => window.sim.health?.(100));
await pass(1800);
await page.evaluate((y) => window.sim.face?.(y - Math.PI / 2, -0.06), yaw);
await pass(300);
left = await burst();
seen = await overlay();
check(
  "turned a quarter right: the crescent is on the left",
  seen?.arcs.length >= 1 && seen.arcs.every((a) => a.angle < -60 && a.angle > -120),
  seen,
);
await shot("4-hit-from-left");
// The crescent stays on the shooter as you turn back to face them.
await page.evaluate((y) => window.sim.face?.(y, -0.06), yaw);
await pass(200);
seen = await overlay();
check(
  "turned back: the same crescent has come round to the top",
  seen?.arcs.length >= 1 && seen.arcs.every((a) => Math.abs(a.angle) < 25),
  seen,
);
await shot("4b-turned-back");
await page.evaluate(() => window.sim.health?.(100));
await pass(2200);

// ---- health
const lows = {};
for (const hp of [60, 45, 25, 8]) {
  await page.evaluate((h) => window.sim.health?.(h), hp);
  await pass(1600);
  lows[hp] = (await overlay())?.low ?? 0;
  await shot(`5-health-${String(hp).padStart(2, "0")}`);
}
check(
  "no blood at 60, some under 50, more as health falls",
  lows[60] === 0 && lows[45] > 0.3 && lows[25] > lows[45] && lows[8] >= lows[25],
  lows,
);
await page.evaluate(() => window.sim.health?.(90));
await pass(2500);
seen = await overlay();
check("healed: the overlay is gone", seen?.low === 0 && seen.shown === false, seen);
await shot("6-healed");
await page.evaluate(() => window.sim.health?.(12));
await pass(1500);
await page.evaluate(() => window.sim.die?.());
await pass(600);
seen = await overlay();
check(
  "eliminated: everything cleared",
  seen?.shown === false && seen.low === 0 && seen.arcs.length === 0,
  seen,
);
check(
  "the overlay is still its nine elements",
  seen?.elements >= 8 && seen.elements <= 40,
  seen?.elements,
);
await shot("7-eliminated");
check("no page errors", errors.length === 0, errors.slice(0, 5));
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ checks, mistAt, errors }, null, 1),
);
await browser.close();
server.close();
process.exit(checks.every((c) => c.ok) ? 0 : 1);

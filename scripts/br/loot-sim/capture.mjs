/**
 * Loot client check (headless Chromium): pickups, inventory, aiming through the red dot,
 * shooting a target. Screenshots and a report in outDir.
 *
 *   node scripts/br/loot-sim/capture.mjs [outDir]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2] ?? "art/br/build/loot-sim");
const W = 1280,
  H = 720;
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/loot-sim/entry.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    alias: { "@": path.join(ROOT, "src") },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
  })
).outputFiles[0].text;
const css = ["src/components/fps/duel.css", "src/components/fps/br.css"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
  .join("\n");
const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000;font-family:system-ui}#game{position:absolute;inset:0}#hud{position:absolute;inset:0;pointer-events:none}${css}</style><div id=game></div><div id=hud></div><script type=module src=/sim.js></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/sim.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--enable-precise-memory-info",
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", (e) => (errors.push(String(e)), console.log("pageerror", String(e))));
page.on(
  "console",
  (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()),
);
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.sim?.ready, null, { timeout: 60000 });
await page.evaluate(() => window.sim.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const status = () => page.evaluate(() => window.sim.status());
const shot = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), quality: 82 });
  console.log(name, JSON.stringify(await status()).slice(0, 400));
};
await wait(4000);
await shot("1-loot");
// Sweep the view across the fan and press E on whatever the prompt shows.
const yaw = await page.evaluate(() => window.sim.yaw);
for (let i = 0; i < 13; i++) {
  const a = (i - 6) * 0.22;
  await page.evaluate(([y, p]) => window.sim.look(y, p), [yaw + a, -0.85]);
  await wait(1200);
  await page.keyboard.press("KeyE");
  await wait(1000);
}
// Whatever the sweep missed (slow software frames): look straight at it and press E again.
for (let pass = 0; pass < 3; pass++)
  for (const id of await page.evaluate(() => window.sim.remaining())) {
    await page.evaluate((i) => window.sim.lookAtItem(i), id);
    await wait(1500);
    await page.keyboard.press("KeyE");
    await wait(1200);
  }
await shot("2-after-pickups");
await page.evaluate(() => window.sim.inventory(true));
await wait(600);
await shot("3-inventory");
// Attach the red dot and the silencer through the inventory screen (real clicks).
for (const name of ["Red dot sight", "Silencer"]) {
  const cell = page.locator(".br-cell", { hasText: name });
  if (await cell.count()) {
    await cell.first().click();
    await wait(300);
    await page.locator(".br-actions button", { hasText: "Attach to AK-47" }).click();
    await wait(1500);
  }
}
await shot("3b-inventory-attached");
await page.evaluate(() => window.sim.inventory(false));
await page.evaluate(() => window.sim.lookAtTarget());
await wait(500);
await page.mouse.down({ button: "right" });
await wait(700);
await shot("4-aim-red-dot");
for (let i = 0; i < 6; i++) {
  await page.mouse.down({ button: "left" });
  await wait(60);
  await page.mouse.up({ button: "left" });
  await wait(400);
}
await shot("5-after-shots");
await page.mouse.up({ button: "right" });
// The Tactical Tablet: open, unlock Faster Reload and Recon Chip, activate both.
await page.evaluate(() => window.sim.tablet(true));
await wait(800);
for (const name of ["Faster Reload", "Recon Chip"]) {
  const card = page.locator(".br-perk", { hasText: name });
  await card.locator("button").click();
  await wait(1500);
  const again = page.locator(".br-perk", { hasText: name }).locator("button");
  if (await again.count()) await again.click();
  await wait(1500);
  await page.locator(".br-tablet-slots button").nth(1).click();
  await wait(300);
}
await shot("10-tablet");
await page.evaluate(() => window.sim.tablet(false));
// Grenades: 4 draws the HE, left mouse throws it toward the target; then the smoke.
await page.evaluate(() => window.sim.look(window.sim.yaw, 0.25));
await wait(400);
// Held like 1v1/5v5: the pin comes out while the button is down, the throw on release.
await page.keyboard.press("Digit4");
await wait(800);
await shot("7a-nade-hand");
await page.mouse.down({ button: "left" });
await wait(450);
await shot("7b-nade-pin");
await page.mouse.up({ button: "left" });
await wait(2300);
await shot("7-he-burst");
await wait(1500);
await page.keyboard.press("Digit4");
await wait(800);
await page.mouse.down({ button: "left" });
await wait(80);
await page.mouse.up({ button: "left" });
await wait(5000);
await shot("8-smoke");
// Vehicles: E to enter the car, drive, get out; then the motorbike.
for (const which of ["car", "bike"]) {
  await page.evaluate((w) => window.sim.toVehicle(w), which);
  await wait(1500);
  await shot(`9-${which}-prompt`);
  await page.keyboard.press("KeyE");
  await wait(1200);
  await page.keyboard.down("KeyW");
  await wait(2500);
  await page.keyboard.down("KeyA");
  await wait(900);
  await page.keyboard.up("KeyA");
  await shot(`9-${which}-driving`);
  await page.keyboard.up("KeyW");
  console.log(which, JSON.stringify(await page.evaluate((w) => window.sim.vehicle(w), which)));
  await page.keyboard.down("KeyS");
  await wait(2500);
  await page.keyboard.up("KeyS");
  await page.keyboard.press("KeyE");
  await wait(1200);
  console.log(
    which,
    "after exit",
    JSON.stringify(await page.evaluate((w) => window.sim.vehicle(w), which)),
  );
}
for (const n of [0, 7, 19]) {
  console.log("town", JSON.stringify(await page.evaluate((k) => window.sim.visitTown(k), n)));
  await wait(3500);
  await shot(`6-town-${n}`);
}
// Soak (Phase 4): --soak=MINUTES hops between POIs every 15 s, firing, and logs memory.
const soak = Number(process.argv.find((x) => x.startsWith("--soak="))?.slice(7) ?? 0);
const soakLog = [];
for (let i = 0; i < soak * 4; i++) {
  const r = await page.evaluate((n) => window.sim.soakStep(n), i);
  soakLog.push(r);
  console.log("soak", i, JSON.stringify(r));
  for (let k = 0; k < 10; k++) {
    await page.mouse.down({ button: "left" });
    await wait(200);
    await page.mouse.up({ button: "left" });
    await wait(1300);
  }
}
const final = await status();
fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify({ errors, final, soakLog }, null, 1),
);
console.log("errors:", errors);
await browser.close();
server.close();

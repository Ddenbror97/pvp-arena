/** node scripts/br/attach-check/capture.mjs [outDir] — screenshots every gun with attachments. */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.resolve(process.argv[2] ?? "art/br/build/attach-check");
fs.mkdirSync(outDir, { recursive: true });
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/attach-check/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    alias: { "@": path.join(ROOT, "src") },
    logLevel: "error",
  })
).outputFiles[0].text;
const html =
  "<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}</style><script type=module src=/e.js></script>";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/e.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => m.type() === "error" && console.log("console", m.text()));
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.ready, null, { timeout: 120_000 });
await page.evaluate(() => window.ready);
const cases = JSON.parse(process.argv[3] ?? "null") ?? [
  ["ak-bare", { item: "ak47", mag: 30, optic: null, muzzle: null }, false],
  ["ak-red-silencer", { item: "ak47", mag: 30, optic: "sight-red", muzzle: "silencer" }, false],
  ["ak-red-aim", { item: "ak47", mag: 30, optic: "sight-red", muzzle: "silencer" }, true],
  ["m4-bare", { item: "m4", mag: 30, optic: null, muzzle: null }, false],
  ["m4-holo-comp", { item: "m4", mag: 30, optic: "sight-holo", muzzle: "compensator" }, false],
  ["m4-holo-aim", { item: "m4", mag: 30, optic: "sight-holo", muzzle: "compensator" }, true],
  ["m4-silencer", { item: "m4", mag: 30, optic: "scope-4x", muzzle: "silencer" }, false],
  ["awp-bare", { item: "awp", mag: 5, optic: null, muzzle: null }, false],
  [
    "awp-reflex-flash",
    { item: "awp", mag: 5, optic: "sight-reflex", muzzle: "flash-hider" },
    false,
  ],
  ["ak-6x", { item: "ak47", mag: 30, optic: "scope-6x", muzzle: "compensator" }, false],
  ["side-ak", { item: "ak47", mag: 30, optic: "sight-red", muzzle: "silencer" }, false, true],
  ["side-m4", { item: "m4", mag: 30, optic: "scope-4x", muzzle: "compensator" }, false, true],
  ["side-m4s", { item: "m4", mag: 30, optic: null, muzzle: "silencer" }, false, true],
  ["side-awp", { item: "awp", mag: 5, optic: "scope-6x", muzzle: "flash-hider" }, false, true],
  // Battle royale MP5 (every attachment) and Desert Eagle (a red dot only).
  ["mp5-bare", { item: "mp5", mag: 30, optic: null, muzzle: null }, false],
  ["mp5-iron-aim", { item: "mp5", mag: 30, optic: null, muzzle: null }, true],
  ["mp5-red-silencer", { item: "mp5", mag: 30, optic: "sight-red", muzzle: "silencer" }, false],
  ["mp5-red-aim", { item: "mp5", mag: 30, optic: "sight-red", muzzle: "silencer" }, true],
  ["mp5-holo-aim", { item: "mp5", mag: 30, optic: "sight-holo", muzzle: "compensator" }, true],
  ["side-mp5", { item: "mp5", mag: 30, optic: "sight-red", muzzle: "silencer" }, false, true],
  ["side-mp5-bare", { item: "mp5", mag: 30, optic: null, muzzle: null }, false, true],
  ["deagle-bare", { item: "deagle", mag: 7, optic: null, muzzle: null }, false],
  ["deagle-iron-aim", { item: "deagle", mag: 7, optic: null, muzzle: null }, true],
  ["deagle-red", { item: "deagle", mag: 7, optic: "sight-red", muzzle: null }, false],
  ["deagle-red-aim", { item: "deagle", mag: 7, optic: "sight-red", muzzle: null }, true],
  ["side-deagle-red", { item: "deagle", mag: 7, optic: "sight-red", muzzle: null }, false, true],
];
for (const [name, gun, aim, side] of cases) {
  await page.evaluate(([g, a, s]) => window.show(g, a, s), [gun, aim, side]);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
}
// Worn gear (`--gear`): helmet/vest/backpack levels on both characters, front and back.
if (process.argv.includes("--gear")) {
  await page.evaluate(() => window.thirdReady);
  await page.evaluate(() => window.third(0, null, "side", 21));
  await page.evaluate(() => window.third(1, null, "side", 21));
  console.log("helmet fit", JSON.stringify(await page.evaluate(() => window.helmetFit())));
  for (const seat of [0, 1])
    console.log(
      "grip gap",
      seat,
      JSON.stringify(await page.evaluate((s) => window.gripGap(s), seat)),
    );
  // GEAR_CODES=4,16 renders single pieces (helmet + 4 × vest + 16 × backpack) instead of the
  // three full sets, named gear-<character>-c<code>-<view>.png.
  const sets = process.env.GEAR_CODES
    ? process.env.GEAR_CODES.split(",").map((c) => [`c${c}`, +c])
    : [1, 2, 3].map((lv) => [lv, lv + lv * 4 + lv * 16]);
  for (const seat of [0, 1])
    for (const [name, code] of sets)
      for (const view of ["front", "back", "side", "top", "torso"]) {
        const gun = { item: "ak47", mag: 30, optic: null, muzzle: null };
        await page.evaluate(([s, g, v, c]) => window.third(s, g, v, c), [seat, gun, view, code]);
        await page.screenshot({
          path: path.join(outDir, `gear-${seat ? "masked" : "police"}-${name}-${view}.png`),
        });
      }
}
// Third person (`--third`): other players' guns with attachments.
if (process.argv.includes("--third")) {
  await page.evaluate(() => window.thirdReady);
  const third = [
    ["tp-police-ak-red-sil", 0, { item: "ak47", mag: 30, optic: "sight-red", muzzle: "silencer" }],
    ["tp-police-m4-bare", 0, { item: "m4", mag: 30, optic: null, muzzle: null }],
    ["tp-police-m4-4x-sil", 0, { item: "m4", mag: 30, optic: "scope-4x", muzzle: "silencer" }],
    [
      "tp-masked-m4-holo-comp",
      1,
      { item: "m4", mag: 30, optic: "sight-holo", muzzle: "compensator" },
    ],
    ["tp-masked-ak-bare", 1, { item: "ak47", mag: 30, optic: null, muzzle: null }],
    [
      "tp-masked-awp-6x-flash",
      1,
      { item: "awp", mag: 5, optic: "scope-6x", muzzle: "flash-hider" },
    ],
    ["tp-masked-empty", 1, null],
    ["tp-police-mp5-red-sil", 0, { item: "mp5", mag: 30, optic: "sight-red", muzzle: "silencer" }],
    ["tp-masked-mp5-bare", 1, { item: "mp5", mag: 30, optic: null, muzzle: null }],
    ["tp-police-deagle", 0, { item: "deagle", mag: 7, optic: null, muzzle: null }],
    ["tp-masked-deagle-red", 1, { item: "deagle", mag: 7, optic: "sight-red", muzzle: null }],
  ];
  for (const [name, seat, gun] of third) {
    await page.evaluate(([s, g]) => window.third(s, g), [seat, gun]);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    await page.evaluate(([s, g]) => window.third(s, g, "close"), [seat, gun]);
    await page.screenshot({ path: path.join(outDir, `${name}-close.png`) });
  }
}
await browser.close();
server.close();
console.log("wrote", outDir);

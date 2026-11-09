/**
 * MP5 / Desert Eagle runtime review renders (scripts/fps/gun-review/entry.ts): the game's own
 * viewmodel code, posed through the shot and both reloads, from the eye and outside angles.
 *
 *   node scripts/fps/gun-review/capture.mjs --gun=mp5|deagle [--views=eye,side,top,rear,front,below,left]
 *     [--teams=police,terrorist] [--only=empty] [--ps=empty:0.54,0.58] [--rest='{"x":..}'] [--out=dir]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const outDir = path.resolve(
  ROOT,
  flag("out") ?? `art/blender/${flag("gun") ?? "mp5"}/build/runtime-review`,
);
fs.mkdirSync(outDir, { recursive: true });

const gun = flag("gun") ?? "mp5";
const P = (kind, ps) =>
  ps.map((p) => ({ kind, p, label: `${kind}-${String(Math.round(p * 1000)).padStart(3, "0")}` }));
// --ps=empty:0.54,0.58 samples just those fractions of one clip instead of the standard set.
const extra = flag("ps")?.split(":");
const CLIPS = extra
  ? P(extra[0], extra[1].split(",").map(Number))
  : [
      { kind: "rest", label: "rest" },
      { kind: "shot", label: "shot", kick: 1 },
      ...(gun === "deagle" ? [{ kind: "locked", label: "locked" }] : []),
      ...P("tactical", [0.1, 0.2, 0.3, 0.45, 0.56, 0.62, 0.75]),
      ...P(
        "empty",
        gun === "mp5"
          ? [0.08, 0.13, 0.19, 0.3, 0.45, 0.6, 0.72, 0.75, 0.78, 0.86]
          : [0.06, 0.2, 0.33, 0.45, 0.5, 0.6, 0.67, 0.7, 0.73, 0.8],
      ),
    ];
const views = (flag("views") ?? "eye").split(",");
const teams = (flag("teams") ?? "police").split(",");
const only = flag("only");
const SHOTS = teams
  .flatMap((team) =>
    views.flatMap((view) =>
      CLIPS.map((c) => ({
        name: `${team}-${view}-${c.label}`,
        team,
        view,
        kind: c.kind,
        p: c.p,
        kick: c.kick,
      })),
    ),
  )
  .filter((s) => !only || only.split(",").some((o) => s.name.includes(o)));
const bundle = await build({
  entryPoints: [path.join(HERE, "entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  logLevel: "error",
  nodePaths: [path.join(ROOT, "node_modules")],
});
const js = bundle.outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><html><body style='margin:0'><script type=module src='/review.js'></script></body></html>",
    );
  if (url === "/review.js")
    return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": file.endsWith(".glb") ? "model/gltf-binary" : "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const fallback = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const launch = (executablePath) =>
  chromium.launch({
    executablePath,
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--no-sandbox",
    ],
  });
const browser = await launch(undefined).catch(() => launch(fallback));
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.review === "function");
const rest = flag("rest") ? JSON.parse(flag("rest")) : undefined;
const shots = await page.evaluate(
  ([g, list, size, r]) => window.review(g, list, size, r),
  [gun, SHOTS, [960, 540], rest],
);
for (const [name, data] of Object.entries(shots))
  fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data.split(",")[1], "base64"));
console.log(`${Object.keys(shots).length} views → ${outDir}`, errors.length ? errors : "");
await browser.close();
server.close();

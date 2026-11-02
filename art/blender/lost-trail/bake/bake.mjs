/**
 * Bake the LOST TRAIL forest backdrop from a full-forest build (see entry.ts).
 *
 *   node bake/bake.mjs <full.glb> <outDir> [--chromium=/path] [--half=33] [--size=1024]
 *
 * Writes face-{px,nx,pz,nz}.png (straight alpha) and backdrop.json (wall corners + UVs).
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const [glb, outDir] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const half = Number(flag("half") ?? 29),
  size = Number(flag("size") ?? 1024),
  eye = 1.6,
  // The wall's lower edge: 0.2 × half below eye height (11° down from the centre). Below that
  // the bake sees only the inside of the terrain hills (the real ground occludes it in game).
  bottom = eye - 0.2 * half,
  keepTop = 0.6; // fraction of each face image kept (from the top): down to the wall's lower edge
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../../../..");
fs.mkdirSync(outDir, { recursive: true });
const bundle = await build({
  entryPoints: [path.join(HERE, "entry.ts")],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  loader: { ".webp": "empty", ".png": "empty" },
  logLevel: "error",
});
const js = bundle.outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/")
    return res.end(
      "<!doctype html><html><body style='margin:0'><script type=module src='/bake.js'></script></body></html>",
    );
  if (url === "/bake.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  // The map's model URL serves the full-forest build being baked.
  const file =
    url === "/fps/models/lost-trail.glb" ? path.resolve(glb) : path.join(ROOT, "public", url);
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: flag("chromium"),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && console.error("page:", m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => typeof window.bake === "function");
const faces = await page.evaluate(
  ([h, e, b, s]) => window.bake(h, e, b, s),
  [half, eye, bottom, size],
);
const names = { "1,0,0": "px", "-1,0,0": "nx", "0,0,1": "pz", "0,0,-1": "nz" };
const out = { half, eye, bottom, size, keepTop, faces: [] };
for (const f of faces) {
  const name = names[f.dir.join(",")];
  fs.writeFileSync(
    path.join(outDir, `face-${name}.png`),
    Buffer.from(f.image.split(",")[1], "base64"),
  );
  out.faces.push({ name, dir: f.dir, corners: f.corners });
}
fs.writeFileSync(path.join(outDir, "backdrop.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ baked: out.faces.map((f) => f.name), half, size }));
await browser.close();
server.close();

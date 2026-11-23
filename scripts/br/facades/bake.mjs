/**
 * Facade atlas bake: renders the near model of every flat mid-distance LOD from five sides into
 * the shared atlas (see art/blender/br/build_facades.mjs, which writes the layout and the LOD1
 * files; run it first).
 *
 *   node scripts/br/facades/bake.mjs [revision=facades-v1] [--chromium=/path]
 *
 * Reads art/br/<revision>.json, writes public/fps/br/models/atlas.<revision>.webp.
 *
 * A far atlas (build_facades.mjs --far) also gets each view's mean colour written back: into
 * the layout (`means`), and into the far LOD files' vertex colours, a vertex taking the mean
 * of the view its texture coordinates lie in. That is the colour the renderer fades a wall to
 * where the atlas would be sampled below its gutters, and what the far proxy beyond the last
 * ring is cut from, so the three agree.
 */
import { build } from "esbuild";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { storedFile } from "../../../art/blender/br/model-files.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const revision = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "facades-v1";
const exe = process.argv.find((a) => a.startsWith("--chromium="))?.slice(11);
const layout = JSON.parse(fs.readFileSync(path.join(root, `art/br/${revision}.json`), "utf8"));
const js = (
  await build({
    entryPoints: [path.join(root, "scripts/br/facades/entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    logLevel: "error",
  })
).outputFiles[0].text;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end('<!doctype html><script type="module" src="/bake.js"></script>');
  if (url === "/bake.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  // (A base file the tools keep out of the deploy: art/blender/br/model-files.mjs.)
  const file = storedFile(url) ?? path.join(root, "public", url);
  if (!(file.startsWith(path.join(root, "public")) || storedFile(url)) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
  ],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.facades, null, { timeout: 60000 });
const { atlas: base64, means } = await page.evaluate((l) => window.facades.bake(l), layout);
await browser.close();
server.close();
if (errors.length) {
  console.error(errors);
  process.exit(1);
}
const out = path.join(root, `public/fps/br/models/atlas.${revision}.webp`);
fs.writeFileSync(out, Buffer.from(base64, "base64"));
if (Object.values(layout.models).some((m) => m.lod)) {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
  for (const [id, m] of Object.entries(layout.models)) {
    m.means = means[id];
    if (!m.lod) continue;
    const file = path.join(root, "public", m.lod);
    const doc = await io.read(file);
    for (const mesh of doc.getRoot().listMeshes())
      for (const prim of mesh.listPrimitives()) {
        const uv = prim.getAttribute("TEXCOORD_0"),
          col = prim.getAttribute("COLOR_0");
        const e = [0, 0];
        for (let i = 0; i < uv.getCount(); i++) {
          uv.getElement(i, e);
          const px = e[0] * layout.width,
            py = e[1] * layout.height;
          // (Half a texel of slack: the coordinates are 16-bit.)
          const vi = m.rects.findIndex(
            ([x, y, w, h]) =>
              px >= x - 0.5 && px <= x + w + 0.5 && py >= y - 0.5 && py <= y + h + 0.5,
          );
          if (vi < 0) throw new Error(`${id}: a vertex outside its views`);
          col.setElement(i, m.means[vi]);
        }
      }
    await doc.transform(
      meshopt({ encoder: MeshoptEncoder, level: "medium", quantizeTexcoord: 16 }),
    );
    await io.write(file, doc);
  }
  fs.writeFileSync(path.join(root, `art/br/${revision}.json`), JSON.stringify(layout, null, 1));
}
console.log(
  `${Object.keys(layout.models).length} models → ${path.relative(root, out)} ` +
    `(${layout.width} × ${layout.height}, ${Math.round(fs.statSync(out).size / 1024)} kB)`,
);

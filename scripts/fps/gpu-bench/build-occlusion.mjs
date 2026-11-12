/**
 * Build the occlusion-culling potential benchmark (occlusion.ts) into one folder: page.html (the
 * page body, as an artifact takes it), occ.js, bundled textures and the two 5v5 maps as base64
 * text. files.json maps every published path to its file.
 *
 *   node scripts/fps/gpu-bench/build-occlusion.mjs <outDir>
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "dist/occlusion-bench");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../../..");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "fps/models"), { recursive: true });
await build({
  entryPoints: [path.join(HERE, "occlusion.ts")],
  bundle: true,
  outfile: path.join(out, "occ.js"),
  format: "esm",
  target: "es2022",
  minify: true,
  loader: {
    ".webp": "file",
    ".png": "file",
    ".jpg": "file",
    ".glb": "file",
    ".svg": "file",
    ".css": "empty",
  },
  assetNames: "assets/[name]-[hash]",
  publicPath: "./",
  logLevel: "error",
});
for (const n of ["sandgate", "iron-district"])
  fs.writeFileSync(
    path.join(out, "fps/models", `${n}.glb.txt`),
    fs.readFileSync(path.join(ROOT, "public/fps/models", `${n}.glb`)).toString("base64"),
  );
// Sandgate's sponsor boards load this with the map.
fs.mkdirSync(path.join(out, "brand"));
fs.copyFileSync(
  path.join(ROOT, "public/brand/arena-logo-email.png"),
  path.join(out, "brand/arena-logo-email.png"),
);
fs.copyFileSync(path.join(HERE, "occlusion.html"), path.join(out, "page.html"));
const files = {};
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f !== "page.html" && f !== "files.json")
      files[path.relative(out, p)] = path.relative(out, p);
  }
})(out);
fs.writeFileSync(path.join(out, "files.json"), JSON.stringify(files, null, 1));
for (const f of Object.keys(files))
  console.log(String(Math.round(fs.statSync(path.join(out, f)).size / 1024)).padStart(7), "kB ", f);

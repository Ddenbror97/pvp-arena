/**
 * List a downloaded model's node tree with each node's world-space size (m, at the file's scale)
 * and triangle count, to pick `piece`s out of a pack for kit.json:
 *   node art/blender/br/list_nodes.mjs <sf:uid> [maxDepth]
 * The zip is staged (art/br/assets/stage.py) into a scratch folder; nothing is written to the repo.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { getBounds } from "@gltf-transform/core";

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const [key, depthArg] = process.argv.slice(2);
const maxDepth = Number(depthArg ?? 3);
const inv = JSON.parse(fs.readFileSync("art/br/assets/inventory.json", "utf8"));
const src = inv.assets.find((a) => a.uid === key.replace(/^sf:/, ""));
if (!src) throw new Error(`${key} not in the inventory`);
const zip = src.zips.find((z) => z.present !== false && fs.existsSync(z.path));
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "nodes-"));
execFileSync("python3", ["-I", "art/br/assets/stage.py", zip.path, src.gltf_member, stage], {
  stdio: ["ignore", "ignore", "inherit"],
});
const file = fs.existsSync(path.join(stage, "scene.gltf"))
  ? path.join(stage, "scene.gltf")
  : path.join(stage, path.basename(src.gltf_member));
const doc = await io.read(file);
const tris = (node) => {
  let n = 0;
  node.traverse((c) => {
    for (const p of c.getMesh()?.listPrimitives() ?? []) {
      const i = p.getIndices();
      n += (i ? i.getCount() : p.getAttribute("POSITION").getCount()) / 3;
    }
  });
  return n;
};
console.log(src.title);
const walk = (node, d) => {
  if (d > maxDepth) return;
  const b = getBounds(node);
  const size = b.max.map((v, i) => (v - b.min[i]).toFixed(2));
  const t = tris(node);
  if (t > 0) console.log(`${"  ".repeat(d)}${node.getName()} [${size.join(" x ")}] ${t} tris`);
  for (const c of node.listChildren()) walk(c, d + 1);
};
for (const scene of doc.getRoot().listScenes()) for (const n of scene.listChildren()) walk(n, 0);
fs.rmSync(stage, { recursive: true, force: true });

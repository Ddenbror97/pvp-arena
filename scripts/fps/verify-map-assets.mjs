import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { build } from "esbuild";
const b = await build({
  entryPoints: ["src/lib/fps/maps/registry.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { MAP_IDS, getMap } = await import(
  "data:text/javascript;base64," + Buffer.from(b.outputFiles[0].text).toString("base64")
);
const rows = [];
for (const id of MAP_IDS) {
  const m = getMap(id);
  const file = path.resolve("public" + m.presentation.modelUrl);
  assert(file.startsWith(path.resolve("public") + path.sep));
  const glb = fs.readFileSync(file);
  assert.equal(glb.readUInt32LE(0), 0x46546c67);
  assert.equal(glb.readUInt32LE(8), glb.length);
  const doc = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
  let referenced = 0;
  for (const item of [...(doc.buffers ?? []), ...(doc.images ?? [])])
    if (item.uri && !item.uri.startsWith("data:")) {
      const target = path.resolve(path.dirname(file), decodeURIComponent(item.uri));
      assert(target.startsWith(path.resolve("public") + path.sep));
      assert(fs.existsSync(target), target);
      referenced++;
    }
  assert(m.rotation);
  for (const s of Object.values(m.spawns)) assert([s.x, s.z, s.yaw].every(Number.isFinite));
  assert(m.worldSolids.length);
  rows.push({
    id,
    name: m.name,
    rotation: m.rotation,
    model: m.presentation.modelUrl,
    bytes: glb.length,
    externalReferences: referenced,
    passed: true,
  });
}
fs.writeFileSync(
  "test-results/fps-five-map-assets.json",
  JSON.stringify({ rows, passed: true }, null, 2),
);
console.log(JSON.stringify(rows));

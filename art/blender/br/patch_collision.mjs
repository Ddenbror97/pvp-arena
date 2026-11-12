/**
 * Collision-only edits on top of a published world revision, for fixes that need no new mesh
 * (repair_building_access.mjs re-derives a model's collision from its mesh, which would lose the
 * exact fit-outs carried into it). The spec names the base revision, the new one, and per model
 * the boxes to replace (matched to 1 mm) with their replacements, or boxes to add. The models manifest is copied
 * with the new revision (its meshes are unchanged).
 *
 *   node art/blender/br/patch_collision.mjs art/br/collision-patch-v21.json
 */
import fs from "node:fs";
import path from "node:path";

const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const dir = "public/fps/br/models";
const manifest = JSON.parse(fs.readFileSync(path.join(dir, `models.${spec.base}.json`), "utf8"));
const collision = JSON.parse(
  fs.readFileSync(path.join(dir, `collision.${spec.base}.json`), "utf8"),
);
manifest.worldRevision = collision.worldRevision = `building-${spec.version}`;
const same = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.0015);
for (const [model, edits] of Object.entries(spec.models)) {
  const boxes = collision.models[model];
  if (!boxes) throw new Error(`no collision for ${model}`);
  for (const { replace, with: replacement, add, why } of edits) {
    if (add) {
      boxes.push(...add);
      console.log(model, "added", add.length, "boxes -", why);
      continue;
    }
    const i = boxes.findIndex((b) => same(b, replace));
    if (i < 0) throw new Error(`${model}: box ${JSON.stringify(replace)} not found`);
    boxes.splice(i, 1, ...replacement);
    console.log(model, "replaced 1 box with", replacement.length, "-", why);
  }
}
fs.writeFileSync(path.join(dir, `models.${spec.version}.json`), JSON.stringify(manifest));
fs.writeFileSync(path.join(dir, `collision.${spec.version}.json`), JSON.stringify(collision));
console.log("wrote", `collision.${spec.version}.json`, `models.${spec.version}.json`);

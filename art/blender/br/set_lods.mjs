/**
 * Points a world revision at rebuilt LOD files, without re-deriving the models round them (a
 * builder's `--far` / FAR_ONLY run writes one LOD; the others in the game went through later
 * passes that a full rebuild would undo).
 *
 *   node art/blender/br/set_lods.mjs <from-models> <from-collision> <revision> \
 *        --lod=<id>:<level>:<file>,… [--set=<id>:<key>:<value>,…]
 *
 * e.g. node art/blender/br/set_lods.mjs models.sweep-v1.json collision.sweep-v1.json air-v1 \
 *        --lod=apartment:2:apartment.far-v3.lod2.glb --set=apartment:air:far
 *
 * Writes public/fps/br/models/models.<revision>.json and collision.<revision>.json (the same
 * collision under the new revision). A LOD's triangle count and size are read from its file;
 * `--set` writes a field of the model's entry (an empty value removes it).
 */
import fs from "node:fs";
import path from "node:path";

const dir = "public/fps/br/models";
const [fromModels, fromCollision, revision, ...flags] = process.argv.slice(2);
const flag = (name) =>
  flags
    .find((f) => f.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .split(",")
    .filter(Boolean) ?? [];
if (!revision || (!flag("lod").length && !flag("set").length))
  throw new Error(
    "usage: set_lods.mjs <from-models> <from-collision> <revision> --lod=id:level:file,… [--set=id:key:value,…]",
  );
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const manifest = read(fromModels);
const collision = read(fromCollision);

/** Triangles of a GLB, from its JSON chunk (indices, or positions where a primitive has none). */
function triangles(file) {
  const glb = fs.readFileSync(file);
  if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8"));
  let tris = 0;
  for (const mesh of json.meshes ?? [])
    for (const p of mesh.primitives)
      tris += json.accessors[p.indices ?? p.attributes.POSITION].count / 3;
  return tris;
}

const entry = (id) => {
  const m = manifest.models[id];
  if (!m) throw new Error(`${id}: not in ${fromModels}`);
  return m;
};
for (const item of flag("lod")) {
  const [id, level, file] = item.split(":");
  const lod = entry(id).lods[Number(level)];
  if (!lod) throw new Error(`${id}: no LOD ${level}`);
  const at = path.join(dir, file);
  if (!fs.existsSync(at)) throw new Error(`${at}: missing`);
  const tris = triangles(at);
  console.log(
    `${id} LOD ${level}: ${path.basename(lod.file)} (${lod.tris} tris) → ${file} (${tris})`,
  );
  Object.assign(lod, {
    file: `/fps/br/models/${file}`,
    tris,
    kB: Math.round(fs.statSync(at).size / 1024),
  });
}
for (const item of flag("set")) {
  const [id, key, value] = item.split(":");
  if (value) entry(id)[key] = value;
  else delete entry(id)[key];
}
manifest.worldRevision = collision.worldRevision = revision;
fs.writeFileSync(path.join(dir, `models.${revision}.json`), JSON.stringify(manifest));
fs.writeFileSync(path.join(dir, `collision.${revision}.json`), JSON.stringify(collision));
console.log(`models.${revision}.json and collision.${revision}.json written`);

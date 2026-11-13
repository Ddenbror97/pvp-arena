/**
 * Adds newly processed kit models to the island's runtime manifest and collision, as a new world
 * revision (the runtime pair is derived: building access and wall repairs on top of the base
 * models.json / collision.json, so re-deriving it from scratch would drop those repairs).
 *
 *   node art/blender/br/add_models.mjs <from-models> <from-collision> <revision> <id,id,...>
 *
 * e.g. node art/blender/br/add_models.mjs models.walls-v3.json collision.access-v3.json \
 *        superstore-v1 shop-cart,fuel-pump,…
 *
 * Copies each id's base entry (process_assets.mjs, build_collision.mjs) over, replacing an older
 * copy, and writes public/fps/br/models/models.<revision>.json and collision.<revision>.json with
 * worldRevision = <revision>. Ids no longer in the kit can be dropped with a leading "-".
 * A procedural model's authored entrances (art/br/procedural/<id>.entrances.json, e.g. the
 * condo storeys: their doors sit on floors reached by stairs, which door inference cannot see
 * from the ground) go into the collision's `entrances`.
 */
import fs from "node:fs";
import path from "node:path";

const dir = "public/fps/br/models";
const [fromModels, fromCollision, revision, list] = process.argv.slice(2);
if (!list) throw new Error("usage: add_models.mjs <from-models> <from-collision> <revision> <ids>");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const manifest = read(fromModels);
const collision = read(fromCollision);
const baseModels = read("models.json").models;
const baseCollision = read("collision.json").models;
for (const raw of list.split(",").filter(Boolean)) {
  if (raw.startsWith("-")) {
    delete manifest.models[raw.slice(1)];
    delete collision.models[raw.slice(1)];
    continue;
  }
  if (!baseModels[raw]) throw new Error(`${raw}: not in models.json (run process_assets.mjs)`);
  if (!(raw in baseCollision))
    throw new Error(`${raw}: not in collision.json (run build_collision.mjs)`);
  manifest.models[raw] = baseModels[raw];
  collision.models[raw] = baseCollision[raw];
  const doors = `art/br/procedural/${raw}.entrances.json`;
  if (fs.existsSync(doors))
    (collision.entrances ??= {})[raw] = JSON.parse(fs.readFileSync(doors, "utf8"));
}
manifest.worldRevision = collision.worldRevision = revision;
fs.writeFileSync(path.join(dir, `models.${revision}.json`), JSON.stringify(manifest));
fs.writeFileSync(path.join(dir, `collision.${revision}.json`), JSON.stringify(collision));
console.log(
  `models.${revision}.json: ${Object.keys(manifest.models).length} models; collision.${revision}.json: ${Object.keys(collision.models).length}`,
);

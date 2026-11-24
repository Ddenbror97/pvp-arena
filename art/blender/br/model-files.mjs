/**
 * Where a model file named by a manifest ("/fps/br/models/<name>.glb") is on disk.
 *
 * Published files live in public/fps/br/models: every file the game's manifest
 * (world.ts WORLD_ASSETS.models) or the game's code names. The tools' base manifest
 * (models.json) also names files no player ever requests: the originals a later revision
 * (a fit-out, lifted coplanar faces, a rebuilt LOD) was derived from. Those are kept out of the
 * deploy, in art/br/models-base, and read from there (cleanup 2026-11-16: 18 MB of them were
 * being published).
 *
 *   node art/blender/br/model-files.mjs          move what only models.json names to the store
 *   node art/blender/br/model-files.mjs --dry    list it
 *
 * Run it after a revision replaces files (offset_coplanar.mjs, relod.mjs, a fit-out).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const PUBLISHED = path.join(REPO, "public");
export const BASE_STORE = path.join(REPO, "art/br/models-base");

/** The file on disk for a manifest's `file`: the published one, else the store's. */
export function modelFile(file) {
  const published = path.join(PUBLISHED, file);
  if (fs.existsSync(published)) return published;
  const stored = path.join(BASE_STORE, path.basename(file));
  return fs.existsSync(stored) ? stored : published;
}

/**
 * The manifests a model edit updates, in this order: the game's live one (world.ts
 * WORLD_ASSETS.models, read from the source so a new revision needs no edit here) and the
 * tools' base one (models.json). Tools used to name the live revision ("models.locations-v1
 * .json") and broke when a later revision retired it (final audit 2026-11-24).
 */
export function editedManifests() {
  const world = fs.readFileSync(path.join(REPO, "src/lib/fps/br/world.ts"), "utf8");
  const live = /\bmodels:\s*"\/fps\/br\/models\/(models\.[\w.-]+\.json)"/.exec(world)?.[1];
  if (!live) throw new Error("world.ts: WORLD_ASSETS.models not found");
  if (!fs.existsSync(path.join(PUBLISHED, "fps/br/models", live)))
    throw new Error(`world.ts names ${live}, which is not in public/fps/br/models`);
  return [live, "models.json"];
}

/** For the review tools' servers: the store's copy of a URL the public folder does not have. */
export function storedFile(url) {
  if (!url.startsWith("/fps/br/models/") || fs.existsSync(path.join(PUBLISHED, url))) return null;
  const stored = path.join(BASE_STORE, path.basename(url));
  return fs.existsSync(stored) ? stored : null;
}

function strings(value, out) {
  if (typeof value === "string") out.add(value);
  else if (value && typeof value === "object")
    for (const v of Array.isArray(value) ? value : Object.values(value)) strings(v, out);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.join(PUBLISHED, "fps/br/models");
  const dry = process.argv.includes("--dry");
  // Published: named by any manifest but the base one, or by name in the game's code.
  const published = new Set();
  for (const f of fs.readdirSync(dir))
    if (/^(models|collision|doors)\..+\.json$/.test(f))
      strings(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), published);
  let code = "";
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|json)$/.test(e.name)) code += fs.readFileSync(p, "utf8");
    }
  })(path.join(REPO, "src"));
  const base = strings(
    JSON.parse(fs.readFileSync(path.join(dir, "models.json"), "utf8")),
    new Set(),
  );
  let moved = 0,
    bytes = 0;
  fs.mkdirSync(BASE_STORE, { recursive: true });
  for (const file of base) {
    if (!file.startsWith("/fps/br/models/") || published.has(file)) continue;
    const name = path.basename(file);
    const from = path.join(dir, name);
    if (!fs.existsSync(from) || code.includes(name)) continue;
    moved++;
    bytes += fs.statSync(from).size;
    if (dry) console.log(name);
    else execFileSync("git", ["mv", from, path.join(BASE_STORE, name)], { cwd: REPO });
  }
  console.log(
    `${dry ? "would move" : "moved"} ${moved} files, ${(bytes / 1e6).toFixed(1)} MB, to art/br/models-base`,
  );
}

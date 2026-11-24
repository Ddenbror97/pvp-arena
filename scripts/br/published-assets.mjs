/**
 * What is published under public/fps/br without anything asking for it (cleanup 2026-11-23).
 *
 * Every world revision writes a new manifest, collision file and a few hundred model files
 * beside the old ones, and the old ones stay in public/ unless someone removes them: seven
 * days of revisions had left 192 MB that no player, test or tool ever reads in the deploy
 * (19 superseded manifest pairs, 1,012 model files of older revisions, five older heightfields).
 *
 *   node scripts/br/published-assets.mjs           list what could go, by kind
 *   node scripts/br/published-assets.mjs --check   the same, exit code 1 if there is any
 *
 * A file stays when it is named by
 *  - the live world (src/lib/fps/br/world.ts WORLD_ASSETS and DOOR_ASSETS, and every string in
 *    the manifest, collision and door files they point at), or
 *  - the game's code, a test or a tool, by its file name (templated names: TEMPLATED below).
 *
 * What it reports, and what to do with it:
 *  - "superseded": manifests, collision files, door and facade atlases of older revisions, and
 *    older world steps. Delete the first; move older heights, land covers and metas to
 *    art/br/world-base (the scripts that derive one from the other read them there).
 *  - "base only": named by the art tools' base manifest (models.json) alone. Move with
 *    `node art/blender/br/model-files.mjs`.
 *  - "unnamed": nothing names them. Delete.
 * A test that reads a superseded manifest keeps the entries it compares against in
 * tests/fixtures/br-superseded-manifests.json.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUBLIC = path.join(REPO, "public");
const worldTs = fs.readFileSync(path.join(REPO, "src/lib/fps/br/world.ts"), "utf8");
// The values of WORLD_ASSETS and DOOR_ASSETS (not the revision history in their comments).
const live = [
  ...worldTs.matchAll(
    /^\s*(?:height|landcover|meta|models|collision|atlas):\s*"(\/fps\/br\/[^"]+)"/gm,
  ),
].map((m) => m[1]);
if (live.length !== 7) throw new Error(`world.ts: expected 7 live files, found ${live.length}`);

function strings(value, out) {
  if (typeof value === "string") out.add(value);
  else if (value && typeof value === "object")
    for (const v of Array.isArray(value) ? value : Object.values(value)) strings(v, out);
  return out;
}
const named = new Set(live);
for (const file of live)
  if (file.endsWith(".json"))
    strings(JSON.parse(fs.readFileSync(path.join(PUBLIC, file), "utf8")), named);
const base = strings(
  JSON.parse(fs.readFileSync(path.join(PUBLIC, "fps/br/models/models.json"), "utf8")),
  new Set(),
);

/** Source text of the game, the tests and the tools (world.ts without its history comments). */
let text = "";
function read(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/^(node_modules|models-base|world-base|build|\.git)$/.test(e.name)) read(p);
    } else if (/\.(ts|tsx|mjs|cjs|js|json|jsonc|py|css|html)$/.test(e.name))
      text +=
        (p.endsWith(path.join("br", "world.ts"))
          ? worldTs.replace(/\/\/.*$/gm, "")
          : fs.readFileSync(p, "utf8")) + "\n";
  }
}
for (const dir of ["src", "workers", "plugins", "tests", "scripts", "art"])
  read(path.join(REPO, dir));

/** Names the code builds at run time (`${id}.webp` and the like), and what a licence requires. */
const TEMPLATED = [
  /^fps\/br\/icons\/[^/]+\.webp$/,
  /^fps\/br\/models\/plane-c172\.lod\d\.glb$/,
  /ATTRIBUTION[^/]*\.md$/,
];
const SUPERSEDED =
  /^fps\/br\/models\/(?:(?:models|collision)\.[a-z0-9-]+-v\d+\.json|doors\.v\d+\.(?:json|webp)|atlas\.[a-z-]+-v\d+\.webp)$|^fps\/br\/(?:height\.v\d+\.hf|landcover\.v\d+\.lc|world\.v\d+\.json)$/;
const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The file's name as a whole word of a path or a string (`lighthouse.x` does not name `house.x`). */
const inText = (name) => new RegExp(`(^|[/"'\`\\s(,:=])${escaped(name)}`, "m").test(text);

const kinds = { superseded: [], "base only": [], unnamed: [] };
const tracked = execFileSync("git", ["ls-files", "public/fps/br"], {
  cwd: REPO,
  maxBuffer: 1 << 28,
})
  .toString()
  .trim()
  .split("\n")
  // (A file removed but not yet committed is still tracked.)
  .filter((f) => fs.existsSync(path.join(REPO, f)));
for (const published of tracked) {
  const file = published.slice("public/".length);
  if (named.has("/" + file)) continue;
  if (SUPERSEDED.test(file)) kinds.superseded.push(file);
  else if (TEMPLATED.some((t) => t.test(file)) || inText(path.basename(file))) continue;
  else if (base.has("/" + file)) kinds["base only"].push(file);
  else kinds.unnamed.push(file);
}
let total = 0;
for (const [kind, files] of Object.entries(kinds)) {
  const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(PUBLIC, f)).size, 0);
  total += files.length;
  console.log(`${kind}: ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB`);
  for (const f of files) console.log("  " + f);
}
if (process.argv.includes("--check") && total) process.exit(1);

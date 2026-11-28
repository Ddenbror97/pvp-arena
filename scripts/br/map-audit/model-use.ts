/**
 * Map audit: which of the live manifest's models the island actually places, and what the
 * rest cost in public/ (post-development cleanup, 2026-11-28).
 *   node scripts/br/map-audit/run.mjs model-use [--json out.json]
 * A model counts as used when the island's layout places it, or the game's code names it
 * (vehicles, aircraft, loot, props spawned at run time: reported apart, by a text search).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const isl = buildIsland(
  hf,
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  col,
);
const placed = new Map<string, number>();
for (const p of isl.layout) placed.set(p.model, (placed.get(p.model) ?? 0) + 1);

const filesOf = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === "string") {
    if (/\.(glb|ktx2|webp|png|jpg|bin)$/.test(v)) out.push(v);
  } else if (v && typeof v === "object")
    for (const x of Array.isArray(v) ? v : Object.values(v)) filesOf(x, out);
  return out;
};
const size = (f: string) => {
  const p = f.startsWith("/") ? `public${f}` : `public/fps/br/models/${f}`;
  try {
    return statSync(p).size;
  } catch {
    return -1;
  }
};
const src = execFileSync(
  "git",
  [
    "grep",
    "-h",
    "-o",
    "-E",
    '"[a-z0-9-]+"',
    "--",
    "src/lib/fps",
    "src/components/fps",
    "workers/fps",
  ],
  {
    maxBuffer: 1 << 28,
  },
)
  .toString()
  .split("\n");
const namedInCode = new Set(src.map((s) => s.slice(1, -1)));

const unused: Array<{
  id: string;
  files: number;
  bytes: number;
  code: boolean;
  collision: boolean;
}> = [];
let usedBytes = 0,
  usedFiles = 0,
  missing = 0;
for (const [id, def] of Object.entries(manifest.models as Record<string, unknown>)) {
  const files = [...new Set(filesOf(def))];
  const bytes = files.reduce((a, f) => a + Math.max(0, size(f)), 0);
  missing += files.filter((f) => size(f) < 0).length;
  if (placed.has(id)) {
    usedBytes += bytes;
    usedFiles += files.length;
  } else
    unused.push({
      id,
      files: files.length,
      bytes,
      code: namedInCode.has(id),
      collision: !!col.models[id],
    });
}
unused.sort((a, b) => b.bytes - a.bytes);
const sum = (l: typeof unused) => l.reduce((a, u) => a + u.bytes, 0);
const dead = unused.filter((u) => !u.code);
console.log(
  `manifest models ${Object.keys(manifest.models).length}, placed ${placed.size} (${isl.layout.length} placements), files of placed ${usedFiles}, ${(usedBytes / 1e6).toFixed(1)} MB; missing files ${missing}`,
);
console.log(
  `not placed: ${unused.length} models, ${(sum(unused) / 1e6).toFixed(1)} MB; of them named in code ${unused.length - dead.length} (${(sum(unused.filter((u) => u.code)) / 1e6).toFixed(1)} MB), named nowhere ${dead.length} (${(sum(dead) / 1e6).toFixed(1)} MB)`,
);
console.log(
  "placed but not in manifest:",
  [...placed.keys()].filter((id) => !manifest.models[id]).join(" ") || "none",
);
for (const u of unused)
  console.log(
    `  ${u.code ? "code" : "DEAD"} ${u.collision ? "col" : "   "} ${u.id.padEnd(30)} ${String(u.files).padStart(3)} files ${(u.bytes / 1e3).toFixed(0).padStart(7)} kB`,
  );
const j = process.argv.indexOf("--json");
if (j > 0)
  writeFileSync(
    process.argv[j + 1]!,
    JSON.stringify({ placed: Object.fromEntries(placed), unused }),
  );

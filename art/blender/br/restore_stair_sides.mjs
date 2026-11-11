#!/usr/bin/env node
/**
 * Walls and railings beside stairs, made solid again (owner, 2026-11-11: "some walls the player
 * can fall or walk through, e.g. in the superstore at the stairs to the 2nd level, some houses
 * with a staircase").
 *
 * repair_building_access.mjs clears the voxel collision round every authored flight before it
 * puts in the exact steps: the flight's bounds grown by one voxel (0.3 m) on each side, up to
 * the top tread plus `clearUp` (1.3 m on the towers). That envelope also takes whatever stands
 * beside the flight: its side walls, its railings, the wall of the cabin it arrives at. They are
 * still drawn, and a player walks or falls through them (a sweep of every building's stairs,
 * 2026-11-11, found it on the superstore's mezzanine flights, the fire lookout and the
 * watchtower; tests/br-stair-sides.test.ts keeps the first two).
 *
 * This puts back, inside each cleared envelope only, the voxel collision of the drawn surfaces
 * that are not the steps: near-vertical triangles that do not face along the flight (risers
 * do), voxelised as everywhere else (build_collision.mjs voxelBoxes), then kept out of the
 * flight's own column, its doorways and the spec's `clear` openings. And the superstore's two
 * mezzanine handrails, drawn without collision by build_superstore_interior.mjs (fixed there
 * too), get theirs.
 *
 *   node art/blender/br/restore_stair_sides.mjs
 *
 * Reads models/collision.access-v12.json and its manifest; writes the access-v13 pair (the same
 * models, the added boxes; worldRevision building-access-v13).
 */
import fs from "node:fs";
import path from "node:path";
import { triangles, voxelBoxes } from "./build_collision.mjs";

const FROM = "access-v12",
  TO = "access-v13";
const dir = "public/fps/br/models";
const collision = JSON.parse(fs.readFileSync(path.join(dir, `collision.${FROM}.json`), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, `models.${FROM}.json`), "utf8"));
const V = collision.voxel;
const MIN_HALF_WIDTH = 0.6;

// The latest spec of each model (later revisions replace earlier ones).
const specs = [
  "building-access.json",
  ...fs
    .readdirSync("art/br")
    .filter((f) => /^building-access-v\d+\.json$/.test(f))
    .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]),
];
const latest = new Map();
for (const f of specs) {
  const d = JSON.parse(fs.readFileSync(path.join("art/br", f), "utf8"));
  for (const [id, m] of Object.entries(d.models ?? {})) latest.set(id, m);
}

const overlap = (a, b) => [0, 1, 2].every((k) => a[k] < b[k + 3] && a[k + 3] > b[k]);
const intersect = (a, b) => [
  Math.max(a[0], b[0]),
  Math.max(a[1], b[1]),
  Math.max(a[2], b[2]),
  Math.min(a[3], b[3]),
  Math.min(a[4], b[4]),
  Math.min(a[5], b[5]),
];
function subtractBox(box, cut) {
  if ([0, 1, 2].some((k) => box[k + 3] <= cut[k] || box[k] >= cut[k + 3])) return [box];
  const result = [],
    b = [...box];
  for (let k = 0; k < 3; k++) {
    if (b[k] < cut[k]) {
      const q = [...b];
      q[k + 3] = cut[k];
      result.push(q);
      b[k] = cut[k];
    }
    if (b[k + 3] > cut[k + 3]) {
      const q = [...b];
      q[k] = cut[k + 3];
      result.push(q);
      b[k + 3] = cut[k + 3];
    }
  }
  return result;
}
const round = (b) => b.map((v) => +v.toFixed(3));
const report = {};

for (const [id, access] of latest) {
  const stairs = access.stairs ?? [];
  if (!stairs.length || !collision.models[id] || !manifest.models[id]) continue;
  const tris = await triangles(path.join("public", manifest.models[id].lods[0].file));
  // What repair_building_access.mjs cleared round each flight.
  const envelopes = stairs.map((s) => {
    const b = s.bounds;
    const top = access.collisionOnly
      ? b[4] + (s.clearUp ?? 1.3)
      : s.clearUp
        ? b[4] + s.clearUp
        : b[4] + (V + 0.01);
    return [
      b[0] - (V + 0.01),
      b[1] - 0.01,
      b[2] - (V + 0.01),
      b[3] + (V + 0.01),
      top,
      b[5] + (V + 0.01),
    ];
  });
  // Kept clear: every flight's own column (and head room over it), the doorways, the openings.
  const keep = [
    // (along the flight the column runs the envelope's full length: its approach and arrival;
    // across, at least 1.2 m: a hull is 0.7 m square, and the narrow tower flights are walked
    // with the hull through their drawn handrails, as the routes in art/br/tower-routes.json do)
    ...stairs.map((s, i) => {
      const b = s.bounds,
        e = envelopes[i];
      const across = (lo, hi) => {
        const c = (lo + hi) / 2,
          h = Math.max((hi - lo) / 2, MIN_HALF_WIDTH);
        return [c - h, c + h];
      };
      if (s.axis === "x") {
        const [z0, z1] = across(b[2], b[5]);
        return [e[0], b[1] - 0.01, z0, e[3], e[4] + 2, z1];
      }
      const [x0, x1] = across(b[0], b[3]);
      return [x0, b[1] - 0.01, e[2], x1, e[4] + 2, e[5]];
    }),
    ...(collision.entrances[id] ?? []).map((d) =>
      d.along === "x"
        ? [d.x - d.width / 2 - 0.07, d.y0, d.z - 0.8, d.x + d.width / 2 + 0.07, d.y1, d.z + 0.8]
        : [d.x - 0.8, d.y0, d.z - d.width / 2 - 0.07, d.x + 0.8, d.y1, d.z + d.width / 2 + 0.07],
    ),
    ...(access.clear ?? []),
  ];
  const added = [];
  stairs.forEach((s, i) => {
    const env = envelopes[i];
    const axis = s.axis === "x" ? 0 : 2;
    const sides = tris.filter((t) => {
      const lo = [0, 1, 2].map((k) => Math.min(t[0][k], t[1][k], t[2][k])),
        hi = [0, 1, 2].map((k) => Math.max(t[0][k], t[1][k], t[2][k]));
      if (!overlap([...lo, ...hi], env)) return false;
      const e1 = [0, 1, 2].map((k) => t[1][k] - t[0][k]),
        e2 = [0, 1, 2].map((k) => t[2][k] - t[0][k]);
      const n = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ];
      const len = Math.hypot(...n);
      if (len < 1e-9) return false;
      // Not treads or floors (horizontal), not risers (facing along the flight).
      return Math.abs(n[1]) / len < 0.7 && Math.abs(n[axis]) / len < 0.7;
    });
    if (!sides.length) return;
    let boxes = voxelBoxes(sides, undefined, V)
      .filter((b) => overlap(b, env))
      .map((b) => intersect(b, env));
    for (const cut of keep) boxes = boxes.flatMap((b) => subtractBox(b, cut));
    added.push(
      ...boxes.filter((b) => b[3] - b[0] > 0.02 && b[4] - b[1] > 0.02 && b[5] - b[2] > 0.02),
    );
  });
  if (!added.length) continue;
  collision.models[id].push(...added.map(round));
  report[id] = added.length;
}

// The superstore's mezzanine handrails (build_superstore_interior.mjs: x = ±31.6 ± 0.04, the
// flights' outer edges, from the sales floor to 1 m over the deck), 0.1 m thick.
const rails = [
  [-31.65, 0, -23, -31.55, 5.6, -5],
  [31.55, 0, -23, 31.65, 5.6, -5],
];
collision.models["superstore-interior"].push(...rails);
report["superstore-interior"] = rails.length;

collision.worldRevision = manifest.worldRevision = `building-${TO}`;
fs.writeFileSync(path.join(dir, `collision.${TO}.json`), JSON.stringify(collision));
fs.writeFileSync(path.join(dir, `models.${TO}.json`), JSON.stringify(manifest));
console.log("boxes added", JSON.stringify(report));

/**
 * Stair collision as ramps for models built before the fortress's fix (owner, 2026-11-25,
 * Blackwater Prison: "some lagg in tight space and corners", at the keep's stair head). The
 * keep's and the watchtower's flights (build_blackwater.mjs, textured-kit `flight`) collide as
 * their treads: 0.28 m boxes rising 0.17–0.19 m each, so walking up or down a flight the body
 * jumped a riser every other tick (0, 0.19, 0, 0.19 …), the jolt the fortress's and the ruins'
 * stairs had until fort-v2. As there (build_fortress.mjs `rampUnder`), each flight's treads are
 * replaced by slices rising RAMP_RISE, a quarter riser over the line through the treads' backs,
 * flat at the top; each slice as thick as a tread box was, so the space under a flight stays as
 * it was. The treads are still drawn (render unchanged).
 *
 * Writes a patch_collision.mjs spec: flights are found in the collision itself (runs of four or
 * more equal treads, each starting where the last ended, rising by one riser).
 *
 *   node art/blender/br/stair_ramps.mjs <base> <version> id[,id…] > art/br/collision-patch-<version>.json
 */
import fs from "node:fs";
import path from "node:path";

const [base, version, list] = process.argv.slice(2);
if (!list) throw new Error("usage: stair_ramps.mjs <base> <version> id[,id…]");
const RAMP_RISE = 0.05,
  THICK = 0.35;
const collision = JSON.parse(
  fs.readFileSync(path.join("public/fps/br/models", `collision.${base}.json`), "utf8"),
);
const near = (a, b, e = 0.002) => Math.abs(a - b) < e;
const r3 = (v) => Math.round(v * 1000) / 1000;
const spec = { base, version, revision: version, models: {} };
for (const id of list.split(",")) {
  const boxes = collision.models[id];
  if (!boxes) throw new Error(`no collision for ${id}`);
  const edits = [];
  for (const axis of [0, 2]) {
    const c = 2 - axis; // the cross axis (x ↔ z)
    // Candidate treads: 0.2–0.36 m long on the axis, at most THICK tall.
    const treads = boxes.filter(
      (b) =>
        b[3 + axis] - b[axis] > 0.2 &&
        b[3 + axis] - b[axis] < 0.36 &&
        b[4] - b[1] <= THICK + 0.002 &&
        b[3 + c] - b[c] > 0.6,
    );
    const used = new Set();
    for (const t of treads) {
      if (used.has(t)) continue;
      // Grow a chain both ways: the next tread starts where this one ends, a riser up or down.
      const next = (b, dir) =>
        treads.find(
          (q) =>
            !used.has(q) &&
            q !== b &&
            near(q[c], b[c]) &&
            near(q[3 + c], b[3 + c]) &&
            near(dir > 0 ? q[axis] : q[3 + axis], dir > 0 ? b[3 + axis] : b[axis]) &&
            Math.abs(q[4] - b[4]) > 0.1 &&
            Math.abs(q[4] - b[4]) < 0.26,
        );
      // Which way it rises: try both directions from t.
      for (const dir of [1, -1]) {
        const chain = [t];
        let b = t;
        for (;;) {
          const q = next(b, dir);
          if (
            !q ||
            (chain.length > 1 && !near(q[4] - b[4], b[4] - chain[chain.length - 2][4], 0.01))
          )
            break;
          if (q[4] <= b[4]) break; // must rise in this direction
          chain.push(q);
          b = q;
        }
        if (chain.length < 4) continue;
        // Extend back down from t the other way (lower treads).
        let lo = t;
        for (;;) {
          const q = next(lo, -dir);
          if (!q || q[4] >= lo[4] || !near(lo[4] - q[4], chain[1][4] - chain[0][4], 0.01)) break;
          chain.unshift(q);
          lo = q;
        }
        chain.forEach((q) => used.add(q));
        const r = chain[1][4] - chain[0][4];
        const tread = chain[0][3 + axis] - chain[0][axis];
        const n = chain.length;
        const y = chain[0][4] - r;
        const rise = r * n,
          runLen = tread * n;
        const a = dir > 0 ? chain[0][axis] : chain[0][3 + axis];
        const count = Math.max(1, Math.ceil(rise / RAMP_RISE));
        const at = (d) => Math.min(y + rise, Math.max(y, y + r / 4 + (r * d) / tread));
        const ramp = [];
        for (let i = 0; i < count; i++) {
          const d0 = (runLen * i) / count,
            d1 = (runLen * (i + 1)) / count;
          const top = at((d0 + d1) / 2);
          const pa = a + dir * d0,
            pb = a + dir * d1;
          const box = [0, 0, 0, 0, 0, 0];
          box[axis] = r3(Math.min(pa, pb));
          box[3 + axis] = r3(Math.max(pa, pb));
          box[c] = chain[0][c];
          box[3 + c] = chain[0][3 + c];
          box[1] = r3(Math.max(y, top - THICK));
          box[4] = r3(top);
          ramp.push(box);
        }
        const why = `stair ramp: ${n} treads of ${r.toFixed(3)} m from y ${y.toFixed(2)} along ${axis ? "z" : "x"}`;
        edits.push({ replace: chain[0], with: ramp, why });
        for (const q of chain.slice(1))
          edits.push({ replace: q, with: [], why: "(tread, in the ramp)" });
        break;
      }
    }
  }
  spec.models[id] = edits;
  console.error(`${id}: ${edits.filter((e) => e.with.length).length} flights`);
}
process.stdout.write(JSON.stringify(spec, null, 1) + "\n");

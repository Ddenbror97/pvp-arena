/**
 * Map audit: the slanted walls rebuilt from their staircases (slants.ts) on the island: per
 * model, how many, how far the staircase reached in front of the drawn face, how many ends are
 * mitred; and a check that every staircase box is inside its wall grown by its reach (nothing
 * the staircase stopped is now open further than it reached) and that the wall is inside the
 * staircase grown by 7 cm (nothing open before is now solid by more than the notches).
 *   node scripts/br/map-audit/run.mjs slants
 */
import { readFileSync } from "node:fs";
import {
  findSlants,
  slantPrisms,
  SLANT,
  S_NORMALS,
  S_PLANES,
  S_CORNERS,
} from "@/lib/fps/br/slants";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8")) as {
  models: Record<string, number[][]>;
};
let all = 0;
for (const [model, boxes] of Object.entries(col.models)) {
  const { walls, used } = findSlants(boxes);
  if (!walls.length) continue;
  all += walls.length;
  const p = slantPrisms(walls);
  let mitred = 0,
    reach = 0,
    outside = 0,
    furthest = 0;
  for (let w = 0; w < walls.length; w++) {
    const o = w * SLANT,
      wall = walls[w]!;
    const ux = wall.bx - wall.ax,
      uz = wall.bz - wall.az,
      l = Math.hypot(ux, uz);
    // A mitred end: its corners not square across the line.
    for (const [a, b] of [
      [0, 3],
      [1, 2],
    ] as const) {
      const ex = p[o + S_CORNERS + a * 2]! - p[o + S_CORNERS + b * 2]!,
        ez = p[o + S_CORNERS + a * 2 + 1]! - p[o + S_CORNERS + b * 2 + 1]!;
      if (Math.abs((ex * ux + ez * uz) / l) > 0.01) mitred++;
    }
    // The staircase's boxes against the prism's long faces (the edges along the line).
    for (let k = 0; k < boxes.length; k++) {
      if (!used[k]) continue;
      const b = boxes[k]!;
      const cx = (b[0]! + b[3]!) / 2,
        cz = (b[2]! + b[5]!) / 2;
      // (This wall's boxes: centred on its line, within its length.)
      const along = ((cx - wall.ax) * ux + (cz - wall.az) * uz) / l;
      const off = Math.abs((-(cx - wall.ax) * uz + (cz - wall.az) * ux) / l);
      if (off > 0.01 || along < -0.01 || along > l + 0.01 || b[1] !== wall.y0 || b[4] !== wall.y1)
        continue;
      for (const x of [b[0]!, b[3]!])
        for (const z of [b[2]!, b[5]!]) {
          let worst = -Infinity;
          // (The long faces: edges 0 and 2; past a mitred end the staircase is in the next wall.)
          for (const e of [0, 2])
            worst = Math.max(
              worst,
              x * p[o + S_NORMALS + e * 2]! +
                z * p[o + S_NORMALS + e * 2 + 1]! -
                p[o + S_PLANES + e]!,
            );
          reach = Math.max(reach, worst);
        }
    }
    // The prism's corners against the staircase (inside one of its boxes grown by 7 cm?).
    for (let c = 0; c < 4; c++) {
      const x = p[o + S_CORNERS + c * 2]!,
        z = p[o + S_CORNERS + c * 2 + 1]!;
      let gap = Infinity;
      for (let k = 0; k < boxes.length; k++) {
        const b = boxes[k]!;
        if (b[4]! <= wall.y0 || b[1]! >= wall.y1) continue;
        const gx = Math.max(b[0]! - x, 0, x - b[3]!),
          gz = Math.max(b[2]! - z, 0, z - b[5]!);
        gap = Math.min(gap, Math.hypot(gx, gz));
      }
      if (gap > 0.07) {
        outside++;
        if (outside <= 3)
          console.log(
            `  ${model} wall ${w} corner ${c} at ${x.toFixed(2)}, ${z.toFixed(2)} (y ${wall.y0}..${wall.y1}): ${gap.toFixed(3)} m from a box`,
          );
      }
      furthest = Math.max(furthest, gap);
    }
  }
  console.log(
    `${model.padEnd(18)} ${String(walls.length).padStart(4)} walls (${used.reduce((a, b) => a + b, 0)} boxes), ${mitred} mitred ends, staircase reached ${reach.toFixed(2)} m past the face, ${outside} prism corners over 7 cm outside the boxes (furthest ${furthest.toFixed(2)} m)`,
  );
}
console.log(`${all} slanted walls in all`);

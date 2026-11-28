/**
 * Map audit: can loot be picked up through a floor or a wall? (Post-development audit,
 * 2026-11-28: "upper-floor loot … cannot accidentally be collected through ceilings".)
 *
 * The room's rule (actions.ts "pickup", loot-reach.ts): the item's point (0.15 m over where it
 * lies) within INVENTORY.reachM of the eye, and a look from the eye to it not stopped more than
 * 0.3 m short (and, since this audit, not at all from under the floor it lies on: before that,
 * 40 items of a match's roll could be taken through the 10 cm decks of four models).
 * For every item of a match's roll that has a storey under it, eyes are stood on that storey
 * under and round the item (standing, and at the top of a jump); for every item, eyes are also
 * stood on its own level round it. Counted: items the rule lets through although something
 * solid lies between (the look is stopped short of the item, inside the 0.3 m allowance).
 *
 *   node scripts/br/map-audit/run.mjs pickup-through [seed=1]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { INVENTORY } from "@/lib/fps/br/items";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { lootInSight } from "@/lib/fps/br/loot-reach";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { EYE_HEIGHT } from "@/lib/fps/map";
import { GRAVITY, JUMP_SPEED } from "@/lib/fps/simulation";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const isl = buildIsland(
  hf,
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  col,
);
const world = isl.solid;
const items = rollLoot(Number(process.argv[2] ?? 1), isl.layout, col, world, meta);
const JUMP = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
const RINGS = [0, 0.6, 1.2, 1.8, 2.3];
const nearest = (x: number, z: number, y: number) => {
  let best = "",
    d = 1e9;
  for (const p of isl.layout) {
    const q = Math.hypot(p.x - x, p.z - z) + Math.abs(p.y - y) * 0.2;
    if (q < d && col.models[p.model]?.length > 6) {
      d = q;
      best = p.model;
    }
  }
  return best;
};
/** The rule's verdict from an eye: null out of reach or refused, else how far short the look stopped. */
function passes(ex: number, ey: number, ez: number, it: { x: number; y: number; z: number }) {
  const ty = it.y + 0.15;
  const dist = Math.hypot(it.x - ex, ty - ey, it.z - ez);
  if (dist > INVENTORY.reachM) return null;
  // The game's own rule (loot-reach.ts), then how far short the look stopped.
  if (!lootInSight(world, ex, ey, ez, it, dist)) return null;
  const hit = world.raycast(ex, ey, ez, it.x - ex, ty - ey, it.z - ez, dist, true);
  return hit ? dist - hit.distance : 0;
}
let withStorey = 0,
  open = 0;
const floor = { stand: 0, jump: 0 },
  byModel = new Map<string, { stand: number; jump: number; slab: number[] }>();
let wall = 0;
const wallBy = new Map<string, number>();
for (const it of items) {
  const ground = world.hf.heightAt(it.x, it.z);
  // The storey under the item: the next surface under its own floor, with room to stand.
  const below = world.supportAt(it.x, it.z, 0.05, it.y - 0.4);
  const gap = it.y - below;
  if (below >= ground - 0.3 && gap > 1.7 && gap < 4.6) {
    withStorey++;
    let stand = false,
      jump = false;
    for (const r of RINGS)
      for (let k = 0; k < (r ? 8 : 1); k++) {
        const px = it.x + Math.cos((k * Math.PI) / 4) * r,
          pz = it.z + Math.sin((k * Math.PI) / 4) * r;
        const f = world.supportAt(px, pz, 0.35, it.y - 0.4);
        if (Math.abs(f - below) > 0.6 || world.blocked(px, f + 0.05, pz, 1.8, 0.35)) continue;
        // Through the floor: the look is stopped short (inside the allowance) and the eye
        // has that floor over it. (An item on a landing or a ledge seen from the stair or
        // the street under it, with nothing between, is in plain reach: not counted.)
        const through = (ey: number) => {
          const short = passes(px, ey, pz, it);
          if (short === null) return false;
          if (short < 0.03) return (open++, false);
          const over = world.raycast(px, ey, pz, 0, 1, 0, it.y + 0.1 - ey, true);
          return !!over;
        };
        if (through(f + EYE_HEIGHT)) stand = true;
        else if (!world.blocked(px, f + JUMP, pz, 1.8, 0.35) && through(f + JUMP + EYE_HEIGHT))
          jump = true;
      }
    if (stand || jump) {
      const id = nearest(it.x, it.z, it.y);
      const e = byModel.get(id) ?? { stand: 0, jump: 0, slab: [] };
      if (stand) {
        floor.stand++;
        e.stand++;
      } else {
        floor.jump++;
        e.jump++;
      }
      // The slab's thickness under the item (its top to the first thing under it from below).
      const under = world.raycast(it.x, below + 0.3, it.z, 0, 1, 0, gap, true);
      e.slab.push(under ? +(gap - 0.3 - under.distance).toFixed(2) : -1);
      byModel.set(id, e);
    }
  }
  // Its own level: an eye round it whose look is stopped short by something standing between
  // (higher than a table: more than 0.6 m over the item's floor at the stop).
  let through = false;
  for (const r of [1.2, 1.8, 2.3])
    for (let k = 0; k < 16 && !through; k++) {
      const px = it.x + Math.cos((k * Math.PI) / 8) * r,
        pz = it.z + Math.sin((k * Math.PI) / 8) * r;
      const f = world.supportAt(px, pz, 0.35, it.y + 0.5);
      if (Math.abs(f - it.y) > 0.4 || world.blocked(px, f + 0.05, pz, 1.8, 0.35)) continue;
      const ey = f + EYE_HEIGHT;
      const short = passes(px, ey, pz, it);
      if (short === null || short < 0.06) continue;
      // Something solid across the whole height between them: a wall, not furniture.
      let solid = 0;
      for (const h of [0.3, 0.9, 1.5]) {
        const d = Math.hypot(it.x - px, it.z - pz);
        const hit = world.raycast(px, f + h, pz, it.x - px, 0, it.z - pz, d - 0.05, true);
        if (hit) solid++;
      }
      if (solid === 3) through = true;
    }
  if (through) {
    wall++;
    const id = nearest(it.x, it.z, it.y);
    wallBy.set(id, (wallBy.get(id) ?? 0) + 1);
  }
}
console.log(
  `${items.length} items; ${withStorey} lie over a storey a player can stand on. Through the floor from below: ${floor.stand} standing, ${floor.jump} more at the top of a jump. (${open} eye positions reach an item over them with nothing between: a ledge or a landing.)`,
);
for (const [id, e] of [...byModel]
  .sort((a, b) => b[1].stand + b[1].jump - a[1].stand - a[1].jump)
  .slice(0, 40))
  console.log(
    `  ${id.padEnd(26)} stand ${String(e.stand).padStart(4)} jump ${String(e.jump).padStart(4)}  slab m ${[
      ...new Set(e.slab),
    ]
      .sort((a, b) => a - b)
      .slice(0, 6)
      .join(" ")}`,
  );
console.log(`Through a wall on its own level: ${wall} items`);
for (const [id, n] of [...wallBy].sort((a, b) => b[1] - a[1]).slice(0, 25))
  console.log(`  ${id.padEnd(26)} ${n}`);

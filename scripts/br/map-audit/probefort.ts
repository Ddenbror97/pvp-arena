/** Map audit: support heights and blocking along a line through the Old Fortress (debug). */
import { readFileSync } from "node:fs";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import type { Placement } from "@/lib/fps/br/layout";
import { FORTRESS } from "@/lib/fps/br/fortress-plan";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
const models: Record<string, number[][]> = {};
for (const [m] of FORTRESS) models[m] ??= JSON.parse(readFileSync(`art/br/procedural/${m}.boxes.json`, "utf8"));
const world = new StaticWorld({ heightAt: () => 0, raycast: () => null } as unknown as Heightfield, FORTRESS.map(([model, x, y, z, turn]) => ({ model, x, y, z, turn, poi: "t" }) as Placement), { voxel: 0.1, models } as CollisionData, null);
const [x0, z0, x1, z1, y] = process.argv.slice(2).map(Number);
for (let i = 0; i <= 20; i++) {
  const x = x0! + ((x1! - x0!) * i) / 20, z = z0! + ((z1! - z0!) * i) / 20;
  const s = world.supportAt(x, z, 0.35, y! + 0.4);
  console.log(x.toFixed(2), z.toFixed(2), "support", s.toFixed(2), "blocked@support", world.blocked(x, s + 0.01, z, 1.8, 0.35));
}

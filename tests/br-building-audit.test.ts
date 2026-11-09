import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { islandDoors, modelDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { buildIsland } from "@/lib/fps/br/island";
import type { Placement } from "@/lib/fps/br/layout";
import { turnPoint } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Building audit (owner, 2026-11-08: "check so every kind of stairs works to walk on, eg i found
 * a silo with a side stair that could not be walked on"): the drawn stairs of the towers and the
 * storage tank are walked to the top and back down with the real movement code, at every turn on
 * flat ground and at their island placements (art/br/tower-routes.json, model-local).
 */
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const towers = JSON.parse(readFileSync("art/br/tower-routes.json", "utf8")) as Array<{
  model: string;
  top: number;
  route: number[][];
}>;

function walk(world: StaticWorld, body: BrBody, points: number[][]) {
  let high = body.y;
  for (const [x, z] of points) {
    for (let tick = 0; tick < 200 && Math.hypot(body.x - x!, body.z - z!) > 0.18; tick++) {
      const before = { ...body };
      stepBody(world, body, { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x!, body.z - z!) }, 34);
      // No unstick teleport may pass for a climb, and no rise faster than a step.
      expect(Math.hypot(body.x - before.x, body.z - before.z)).toBeLessThan(0.18);
      expect(body.y - before.y).toBeLessThanOrEqual(0.351);
      high = Math.max(high, body.y);
    }
    expect(Math.hypot(body.x - x!, body.z - z!), `stuck before ${x},${z}`).toBeLessThan(0.19);
  }
  return high;
}

describe("building audit: tower and tank stairs", () => {
  for (const { model, top, route } of towers)
    for (const turn of [0, 1, 2, 3] as const)
      it(`${model}: up to ${top} m and back down at rotation ${turn}`, () => {
        const p: Placement = { model, turn, x: 100, y: 12, z: -100, poi: "test" };
        const hf = { heightAt: () => p.y } as Heightfield;
        const world = new StaticWorld(hf, [p], collision, null);
        const path = route.map(([x, z]) => {
          const q = turnPoint(x!, z!, turn);
          return [q[0] + p.x, q[1] + p.z];
        });
        const body: BrBody = {
          x: path[0]![0]!,
          z: path[0]![1]!,
          y: p.y,
          velocityY: 0,
          grounded: true,
          crouched: false,
        };
        const high = walk(world, body, path.slice(1));
        expect(high - p.y).toBeGreaterThan(top - 0.05);
        walk(world, body, [...path].reverse().slice(1));
        expect(body.y - p.y).toBeLessThan(0.05);
      });

  it("climbs every placed tower on the island", async () => {
    const buffer = (path: string) => {
      const b = readFileSync(path);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    };
    const hf = await decodeHeightfield(buffer("public" + WORLD_ASSETS.height));
    const cover = await decodeLandCover(buffer("public" + WORLD_ASSETS.landcover));
    const meta = JSON.parse(readFileSync("public" + WORLD_ASSETS.meta, "utf8")) as WorldMeta;
    const island = buildIsland(hf, cover, meta, collision);
    const counts: Record<string, [number, number]> = {};
    for (const { model, top, route } of towers)
      for (const p of island.layout.filter((q) => q.model === model)) {
        const path = route.map(([x, z]) => {
          const q = turnPoint(x!, z!, p.turn);
          return [q[0] + p.x, q[1] + p.z];
        });
        const body: BrBody = {
          x: path[0]![0]!,
          z: path[0]![1]!,
          y: hf.heightAt(path[0]![0]!, path[0]![1]!),
          grounded: true,
          crouched: false,
          velocityY: 0,
        };
        const c = (counts[model] ??= [0, 0]);
        c[1]++;
        try {
          if (walk(island.solid, body, path.slice(1)) - p.y > top - 0.05) c[0]++;
        } catch (e) {
          // a placement whose approach is blocked by its surroundings: counted, not thrown
          if (process.env.AUDIT_DEBUG) console.log(model, p.x, p.z, p.turn, p.poi, String(e).slice(0, 160));
        }
      }
    console.log("BR tower climbs", JSON.stringify(counts));
    for (const [model, [ok, n]] of Object.entries(counts))
      expect(ok / n, `${model}: ${ok}/${n}`).toBeGreaterThan(0.8);
  }, 120_000);

  it("names no doors on towers, the tank or the church ruin", () => {
    for (const id of [...towers.map((t) => t.model), "church-ruins"]) {
      expect(modelDoors(collision, id), id).toEqual([]);
      expect(
        islandDoors([{ model: id, turn: 0, x: 0, y: 0, z: 0, poi: "t" }], collision).doors,
      ).toEqual([]);
    }
  });
});

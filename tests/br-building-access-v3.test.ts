import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { islandDoors, modelDoors, withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { Placement } from "@/lib/fps/br/layout";
import { modelSpots, turnPoint } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { DOOR_ASSETS, WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import type { DoorLookData } from "@/lib/fps/br/door-renderer";

/**
 * Building access v3 (owner, 2026-11-08: "a small house on a farm can't be entered, and some
 * big houses"): the farm and yard sheds, garages, caravans, the military HQ and the airfield
 * warehouses open; the big town house's porch gate fits the player; the two doors cut beside
 * their painted doors (rural-wood-1, rural-diner) moved onto them; every door wears its own look.
 */
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const ROUTES: Array<[string, number[][]]> = [
  [
    "shed",
    [
      [-2.1, 3],
      [-2.1, 0.9],
      [-2.05, 0.3],
      [-1.5, -0.6],
    ],
  ],
  [
    "garage",
    [
      [3.6, -1.93],
      [0.5, -1.93],
    ],
  ],
  [
    "garage",
    [
      [-3.6, 1.935],
      [-0.5, 1.935],
    ],
  ],
  [
    "rural-trailer",
    [
      [-2.8, -0.385],
      [0, -0.385],
    ],
  ],
  [
    "military-hq",
    [
      [9.095, 4.6],
      [9.095, -1.5],
    ],
  ],
  [
    "warehouse",
    [
      [0, 24.5],
      [0, 20],
    ],
  ],
  [
    "warehouse",
    [
      [0, -24.5],
      [0, -20],
    ],
  ],
];

/** Walks the body through the points; false if it stalls (no teleports, no tall steps). */
function walk(world: StaticWorld, body: BrBody, points: number[][], strict = true) {
  for (const [x, z] of points) {
    for (let tick = 0; tick < 200 && Math.hypot(body.x - x!, body.z - z!) > 0.18; tick++) {
      const before = { ...body };
      stepBody(
        world,
        body,
        { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x!, body.z - z!) },
        34,
      );
      // An unstick teleport or a tall step is not a way in.
      const jump = Math.hypot(body.x - before.x, body.z - before.z) >= 0.18,
        climb = body.y - before.y > 0.351;
      if (strict) {
        expect(jump).toBe(false);
        expect(climb).toBe(false);
      } else if (jump || climb) return false;
    }
    if (Math.hypot(body.x - x!, body.z - z!) > 0.19) return false;
  }
  return true;
}

describe("building access v3", () => {
  for (const [model, local] of ROUTES)
    for (const turn of [0, 1, 2, 3] as const)
      it(`${model} from ${local[0]}: in and back out at rotation ${turn}`, () => {
        const placement: Placement = { model, turn, x: 100, y: 12, z: -100, poi: "test" };
        const hf = { heightAt: () => placement.y } as Heightfield;
        const solid = new StaticWorld(hf, [placement], collision, null);
        const set = islandDoors([placement], collision);
        const open = withDoors(solid, set, new Uint8Array(set.doors.length).fill(1));
        const path = local.map(([x, z]) => {
          const p = turnPoint(x!, z!, turn);
          return [p[0] + placement.x, p[1] + placement.z];
        });
        const body: BrBody = {
          x: path[0]![0]!,
          z: path[0]![1]!,
          y: placement.y,
          velocityY: 0,
          grounded: true,
          crouched: false,
        };
        expect(walk(open, body, path.slice(1))).toBe(true);
        expect(walk(open, body, [...path].reverse().slice(1))).toBe(true);
        // Closed, the door blocks.
        const closed = withDoors(solid, set, new Uint8Array(set.doors.length));
        const d = set.doors.find((q) => Math.hypot(q.x - path[1]![0]!, q.z - path[1]![1]!) < 3.5)!;
        expect(closed.blocked(d.x, d.y0 + 0.02, d.z, 1.8, 0.35)).toBe(true);
      });

  it("opens them with rooms to loot", () => {
    for (const model of ["shed", "garage", "rural-trailer", "military-hq", "warehouse"])
      expect(modelSpots(collision, model, "indoor", 2.5, 60).length, model).toBeGreaterThan(0);
  });

  it("lets the player in at their island placements (sheds dug into steep slopes aside)", async () => {
    const buffer = (path: string) => {
      const b = readFileSync(path);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    };
    const hf = await decodeHeightfield(buffer("public" + WORLD_ASSETS.height));
    const cover = await decodeLandCover(buffer("public" + WORLD_ASSETS.landcover));
    const meta = JSON.parse(readFileSync("public" + WORLD_ASSETS.meta, "utf8")) as WorldMeta;
    const island = buildIsland(hf, cover, meta, collision);
    const world = withDoors(
      island.solid,
      island.doors,
      new Uint8Array(island.doors.doors.length).fill(1),
    );
    const rate: Record<string, [number, number]> = {};
    for (const [model, local] of ROUTES)
      for (const p of island.layout.filter((q) => q.model === model)) {
        const path = local.map(([x, z]) => {
          const q = turnPoint(x!, z!, p.turn);
          return [q[0] + p.x, q[1] + p.z];
        });
        const body: BrBody = {
          x: path[0]![0]!,
          z: path[0]![1]!,
          y: Math.max(hf.heightAt(path[0]![0]!, path[0]![1]!), p.y),
          grounded: true,
          crouched: false,
          velocityY: 0,
        };
        const r = (rate[model] ??= [0, 0]);
        r[1]++;
        if (walk(world, body, path.slice(1), false)) r[0]++;
      }
    for (const [model, [ok, n]] of Object.entries(rate)) {
      expect(n, model).toBeGreaterThan(0);
      expect(ok / n, `${model}: ${ok}/${n}`).toBeGreaterThan(model === "shed" ? 0.88 : 0.97);
    }
  }, 120_000);
});

describe("fitted doors (doors.v5)", () => {
  const look = JSON.parse(readFileSync(`public${DOOR_ASSETS.meta}`, "utf8")) as DoorLookData;
  it("has a look for every doorway of every building with doors, inside the atlas", () => {
    for (const id of Object.keys(collision.models)) {
      const doors = modelDoors(collision, id);
      for (let k = 0; k < doors.length; k++) {
        const v = look.models[id]?.[k];
        expect(v, `${id} door ${k}`).toBeTruthy();
        const [x, y, w, h] = v!.rect;
        expect(x >= 0 && y >= 0 && x + w <= look.atlas[0] && y + h <= look.atlas[1]).toBe(true);
        // The panel fills the opening: as wide as the doorway (or its authored cut), sill to head.
        expect(v!.width).toBeGreaterThanOrEqual(doors[k]!.width - 0.01);
        expect(v!.width).toBeLessThan(doors[k]!.width + 0.3);
        expect(v!.y1 - v!.y0).toBeCloseTo(doors[k]!.y1 - doors[k]!.y0, 2);
      }
    }
  });
});

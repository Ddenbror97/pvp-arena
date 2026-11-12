import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The Island Superstore can be entered and played inside (owner, 2026-11-08: "be able to enter,
 * fun to play inside, not just flat; like the Verdansk Superstore"): the front glass doors, the
 * loading docks and the side doors lead in; stairs climb to the office mezzanine; outside stairs
 * climb onto both wing roofs. Walked with the real movement code on the island's own placement.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const open = withDoors(
  island.solid,
  island.doors,
  new Uint8Array(island.doors.doors.length).fill(1),
);
const store = island.layout.find((p) => p.model === "superstore")!;

/** Walks store-relative waypoints; the body, or null when it stalls or teleports. */
function walk(points: number[][]) {
  const [sx, sz] = points[0]!;
  const body: BrBody = {
    x: store.x + sx!,
    z: store.z + sz!,
    y: store.y,
    velocityY: 0,
    grounded: true,
    crouched: false,
  };
  for (const [px, pz] of points.slice(1)) {
    const x = store.x + px!,
      z = store.z + pz!;
    for (let tick = 0; tick < 1200 && Math.hypot(body.x - x, body.z - z) > 0.18; tick++) {
      const before = { ...body };
      stepBody(open, body, { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x, body.z - z) }, 34);
      if (Math.hypot(body.x - before.x, body.z - before.z) >= 0.18) return null;
    }
    if (Math.hypot(body.x - x, body.z - z) > 0.19) return null;
  }
  return body;
}

/**
 * A player standing at store-relative (sx, sz) on the floor at about `level` m pushes towards
 * (tx, tz) for 3 s; their body afterwards (owner, 2026-11-11: "missing walls, stair case
 * handle": every open edge and stair side must hold a player).
 */
function push(sx: number, sz: number, level: number, tx: number, tz: number) {
  const x = store.x + sx,
    z = store.z + sz;
  const y = open.supportAt(x, z, 0.3, store.y + level + 0.5);
  const body: BrBody = { x, y, z, velocityY: 0, grounded: true, crouched: false };
  const start = { ...body };
  for (let tick = 0; tick < 90; tick++)
    stepBody(
      open,
      body,
      { forward: 1, strafe: 0, yaw: Math.atan2(body.x - (store.x + tx), body.z - (store.z + tz)) },
      34,
    );
  return {
    start: start.y - store.y,
    end: body.y - store.y,
    x: body.x - store.x,
    z: body.z - store.z,
  };
}

describe("Island Superstore interior", () => {
  it("places the fit-out and the roof stairs on the store", () => {
    for (const id of ["superstore-interior", "superstore-stairs"]) {
      const p = island.layout.find((q) => q.model === id)!;
      expect(p, id).toBeTruthy();
      expect([p.x, p.z, p.turn]).toEqual([store.x, store.z, store.turn]);
    }
    expect(store.turn).toBe(0);
  });

  it.each([
    ["front doors 1", -8.25],
    ["front doors 2", -1.1],
    ["front doors 3", 12.65],
    ["front doors 4", 19.8],
  ])("walks in through the %s to the aisles", (_, x) => {
    const b = walk([
      [x, 40],
      [x, 30],
      [x, 22],
    ]);
    expect(b).not.toBeNull();
  });

  it.each([
    [
      "the west door",
      [
        [-77, -22],
        [-70, -22],
      ],
    ],
    [
      "the east doors",
      [
        [78, -10],
        [70, -10],
        [59.2, -10],
        [59.2, 20],
        [70, 20],
        [78, 20],
      ],
    ],
    [
      "the notch court door",
      [
        [-40, 8],
        [-33, 8],
      ],
    ],
    [
      "the back door",
      [
        [31.5, -40],
        [31.5, -30],
      ],
    ],
    [
      "the pharmacy door",
      [
        [-67, 38],
        [-67, 31.5],
        [-64.5, 31.5],
      ],
    ],
    [
      "the loading docks",
      [
        [-4, -40.5],
        [-4, -33],
        [3.5, -33],
        [3.5, -40.5],
      ],
    ],
  ])("walks in through %s", (_, points) => {
    expect(walk(points as number[][])).not.toBeNull();
  });

  it("climbs to the office mezzanine from the sales floor", () => {
    for (const x of [-30.8, 30.8]) {
      const b = walk([
        [x, -3],
        [x, -21],
        [x < 0 ? -26 : 26, -22],
        [x < 0 ? -26 : 26, -26],
      ])!;
      expect(b).not.toBeNull();
      expect(b.y - store.y).toBeCloseTo(4.6, 1);
    }
  });

  it("climbs onto both wing roofs", () => {
    const east = walk([
      [44, -39],
      [72.5, -39],
      [74, -39],
      [74, -30],
      [60, -20],
    ])!;
    expect(east).not.toBeNull();
    expect(east.y - store.y).toBeCloseTo(9, 1);
    const west = walk([
      [-74.4, 24],
      [-74.4, -6.6],
      [-74.4, -8],
      [-66, -8],
    ])!;
    expect(west).not.toBeNull();
    expect(west.y - store.y).toBeCloseTo(9, 1);
  });

  it.each([
    ["the mezzanine's front", 0, -22, 4.6, 0, 0],
    ["the mezzanine's front beside the west stair", -29.5, -22, 4.6, -29.5, 0],
    ["the mezzanine's front beside the east stair", 29.5, -22, 4.6, 29.5, 0],
    ["the mezzanine's west end", -28.5, -27, 4.6, -60, -27],
    ["the mezzanine's east end", 28.5, -27, 4.6, 60, -27],
    ["the west landing's inner side", -30.8, -20.2, 4.6, 0, -20.2],
    ["the west landing's outer side", -30.8, -21.5, 4.6, -60, -21.5],
    ["the east landing's inner side", 30.8, -20.2, 4.6, 0, -20.2],
    ["the west flight's inner side", -30.8, -12, 2.3, 0, -12],
    ["the west flight's outer side", -30.8, -12, 2.3, -60, -12],
    ["the east flight's inner side", 30.8, -14, 3.0, 0, -14],
    ["the east flight's outer side", 30.8, -14, 3.0, 60, -14],
    ["the east roof stair's outer side", 60, -38.85, 4.5, 60, -60],
    ["the east roof stair's wall side", 60, -38.85, 4.5, 60, -20],
    ["the east roof landing's end", 74, -38.85, 9, 100, -38.85],
    ["the west roof stair's outer side", -74.4, 8, 4.5, -100, 8],
    ["the west roof landing's end", -74.4, -9, 9, -74.4, -40],
  ] as const)("holds a player at %s", (_, sx, sz, level, tx, tz) => {
    const r = push(sx, sz, level, tx, tz);
    expect(r.start, "standing at the edge").toBeGreaterThan(level - 0.8);
    expect(r.end, `fell off at ${r.x.toFixed(1)}, ${r.z.toFixed(1)}`).toBeGreaterThan(
      r.start - 0.5,
    );
  });

  it("the landings have no hole at the partition", () => {
    for (const x of [-30.8, 30.8]) {
      const r = push(x, -23.6, 4.6, x, -23.6);
      expect(r.start).toBeCloseTo(4.6, 1);
      expect(r.end).toBeCloseTo(4.6, 1);
    }
  });

  it("climbs the stockrooms' racking ramps onto their decks", () => {
    for (const [from, to] of [
      [
        [-59.4, -26.6],
        [-66, -26.6],
      ],
      [
        [52.6, -26.6],
        [59.2, -26.6],
      ],
    ]) {
      const b = walk([from!, to!]);
      expect(b, `${from}`).not.toBeNull();
      expect(b!.y - store.y).toBeGreaterThan(1.9);
    }
  });

  it("has rooms to loot on the sales floor, in the stockroom and on the mezzanine", () => {
    const spots = modelSpots(collision, "superstore-interior", "indoor", 2.5, 600);
    expect(spots.length).toBeGreaterThan(300);
    expect(spots.filter((s) => Math.abs(s.y - 4.6) < 0.05).length).toBeGreaterThan(20);
    expect(spots.filter((s) => s.z < -24 && s.y < 0.1).length).toBeGreaterThan(20);
    // Nothing on top of shelving, freezers or walls.
    expect(spots.every((s) => s.y < 0.05 || Math.abs(s.y - 4.6) < 0.05)).toBe(true);
  });
});

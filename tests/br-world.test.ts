import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import {
  cellCentre,
  gridRef,
  mapUvToWorld,
  WORLD_HALF,
  worldToMapUv,
  type WorldMeta,
} from "@/lib/fps/br/world";

let hf: Heightfield;
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
beforeAll(async () => {
  const file = readFileSync("public/fps/br/height.v1.hf");
  hf = await decodeHeightfield(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
});
const at = (i: number, j: number) => hf.sample(i, j);

describe("Project Island coordinates", () => {
  it("maps the 10 km square onto the A–J × 1–10 grid", () => {
    expect(gridRef(-WORLD_HALF, -WORLD_HALF)).toBe("A1");
    expect(gridRef(WORLD_HALF, WORLD_HALF)).toBe("J10");
    expect(gridRef(0, 0)).toBe("F6");
    expect(gridRef(-0.01, -0.01)).toBe("E5");
    expect(gridRef(6000, 0)).toBeNull();
    expect(cellCentre("E9")).toEqual({ x: -500, z: 3500 });
    expect(cellCentre("K1")).toBeNull();
    const uv = worldToMapUv(1234, -2345),
      back = mapUvToWorld(uv.u, uv.v);
    expect(back.x).toBeCloseTo(1234, 6);
    expect(back.z).toBeCloseTo(-2345, 6);
  });

  it("places every POI in the grid cell the concept map shows", () => {
    const expected: Record<string, string> = {
      "northstar-town": "B2",
      "redstone-quarry": "I2",
      millhaven: "C4",
      crossroads: "F4",
      "central-hospital": "H4",
      "old-dam": "C5",
      "blackwater-prison": "E6",
      riverwood: "I6",
      "southern-military-base": "G7",
      "island-superstore": "F9",
      "island-airfield": "I9",
    };
    for (const [id, cell] of Object.entries(expected)) {
      const p = meta.pois.find((poi) => poi.id === id)!;
      expect(gridRef(p.x, p.z), id).toBe(cell);
    }
  });
});

describe("Project Island terrain", () => {
  it("decodes the 2561² heightfield exactly (art pipeline reference samples)", () => {
    expect([hf.width, hf.height]).toEqual([2561, 2561]);
    expect(hf.spacing).toBeCloseTo(3.90625, 5);
    expect(at(0, 0)).toBeCloseTo(-7.08, 2);
    expect(at(1280, 1280)).toBeCloseTo(17.92, 2);
    expect(at(640, 300)).toBeCloseTo(29.09, 2);
    expect(at(2000, 2100)).toBeCloseTo(6.37, 2);
    expect(at(1234, 567)).toBeCloseTo(26.31, 2);
    expect(hf.heightAt(0, 0)).toBeCloseTo(17.92, 2);
  });

  it("has the sea around the edges and the mainland and island above it", () => {
    for (const [x, z] of [
      [-4950, -4950],
      [4950, 4950],
      [0, 4950],
    ])
      expect(hf.heightAt(x!, z!)).toBeLessThan(0);
    for (const p of meta.pois)
      if (p.kind !== "quarry") expect(hf.heightAt(p.x, p.z), p.id).toBeGreaterThan(1);
    expect(meta.stats.maxHeight).toBeGreaterThan(250);
  });

  it("keeps POI building pads flat enough to build on", () => {
    for (const p of meta.pois.filter((poi) => poi.padHeight !== undefined)) {
      for (const [dx, dz] of [
        [0, 0],
        [60, 0],
        [0, 60],
        [-60, -60],
      ])
        expect(Math.abs(hf.heightAt(p.x + dx!, p.z + dz!) - p.padHeight!), p.id).toBeLessThan(1.5);
    }
  });

  it("runs the strait under both island bridges, with land at the ends", () => {
    for (const b of meta.bridges) {
      const mid = hf.heightAt((b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2);
      expect(mid, b.id).toBeLessThan(-3);
      expect(hf.heightAt(b.a[0], b.a[1]), b.id).toBeGreaterThan(0);
      expect(hf.heightAt(b.b[0], b.b[1]), b.id).toBeGreaterThan(0);
    }
  });

  it("digs Redstone Quarry as a deep pit that stays above sea level", () => {
    const q = meta.pois.find((p) => p.id === "redstone-quarry")!;
    const floor = hf.heightAt(q.x, q.z),
      rim = hf.heightAt(q.x + q.radius * 0.8, q.z);
    expect(rim - floor).toBeGreaterThan(30);
    expect(floor).toBeGreaterThan(5);
  });

  it("gives the inland lakes their own water level above the sea", () => {
    expect(meta.waterBodies.length).toBeGreaterThan(2);
    for (const w of meta.waterBodies) expect(w.level, w.id).toBeGreaterThan(0.5);
    // Old Dam's reservoir is one of them.
    const dam = meta.pois.find((p) => p.id === "old-dam")!;
    expect(
      meta.waterBodies.some(
        (w) =>
          dam.x > w.bounds[0] - 400 &&
          dam.x < w.bounds[2] + 400 &&
          dam.z > w.bounds[1] - 400 &&
          dam.z < w.bounds[3] + 400,
      ),
    ).toBe(true);
  });

  it("raycasts the ground for shots and sight lines", () => {
    const gx = 0,
      gz = 0,
      ground = hf.heightAt(gx, gz);
    const hit = hf.raycast(gx, ground + 100, gz, 0, -1, 0, 500)!;
    expect(hit.y).toBeCloseTo(ground, 1);
    expect(hit.distance).toBeCloseTo(100, 1);
    expect(hf.raycast(gx, ground + 100, gz, 0, 1, 0, 500)).toBeNull();
    // A level ray at 2 m over the sea toward the mainland coast hits the beach.
    const far = hf.raycast(-4990, 2, 0, 1, 0, 0, 3000);
    expect(far).not.toBeNull();
    expect(far!.y).toBeCloseTo(2, 3);
    const n = hf.normalAt(gx, gz);
    expect(n.y).toBeGreaterThan(0.5);
  });
});

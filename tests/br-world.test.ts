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
    // The corner: open sea (a speck of the concept's frame line there went under water,
    // build_world.py 2026-11-05).
    expect(at(0, 0)).toBeCloseTo(-25.7, 2);
    // The centre lies in the main river's valley (eased banks, build_world.py 2026-11-08).
    expect(at(1280, 1280)).toBeCloseTo(20.19, 2);
    // Northstar Town pad (0.52 m lower since the 2026-11-09 roads and map-edge rebuild; 0.09 m
    // higher with the 2026-11-11 ridge north of Pine Creek beside it).
    expect(at(640, 300)).toBeCloseTo(18.91, 2);
    expect(at(2000, 2100)).toBeCloseTo(6.37, 2);
    // (On the slopes south of Pine Ridge, raised with the rock band over the creek, 2026-11-11.)
    expect(at(1234, 567)).toBeCloseTo(35.96, 2);
    expect(hf.heightAt(0, 0)).toBeCloseTo(20.19, 2);
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
      // The fully flat core is 75 % of the pad radius; probe well inside it.
      const o = Math.min(60, p.padRadius! * 0.5);
      for (const [dx, dz] of [
        [0, 0],
        [o, 0],
        [0, o],
        [-o * 0.7, -o * 0.7],
      ])
        expect(Math.abs(hf.heightAt(p.x + dx!, p.z + dz!) - p.padHeight!), p.id).toBeLessThan(1.5);
    }
  });

  it("runs the strait under both island bridges, with land at the ends", () => {
    for (const b of meta.bridges.filter((s) => s.id === "west-bridge" || s.id === "east-bridge")) {
      const mid = hf.heightAt((b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2);
      expect(mid, b.id).toBeLessThan(-3);
      expect(hf.heightAt(b.a[0], b.a[1]), b.id).toBeGreaterThan(0);
      expect(hf.heightAt(b.b[0], b.b[1]), b.id).toBeGreaterThan(0);
    }
  });

  it("bridges every river where a road crosses it, the deck well above the water", () => {
    const rivers = meta.bridges.filter((b) => b.id.startsWith("river-bridge"));
    // The concept map's river bridges: F5, H5, E5, H7 and the main river's mouth (J4); I6 is a
    // shallow ford by the waterworks pond.
    expect(rivers.length).toBeGreaterThanOrEqual(5);
    for (const b of rivers) {
      expect(hf.heightAt(b.a[0], b.a[1]), b.id).toBeGreaterThan(0.5);
      expect(hf.heightAt(b.b[0], b.b[1]), b.id).toBeGreaterThan(0.5);
      // Somewhere under the span is the channel, at least 4 m below the deck.
      let low = Infinity;
      for (let t = 0.1; t <= 0.9; t += 0.05)
        low = Math.min(
          low,
          hf.heightAt(b.a[0] + (b.b[0] - b.a[0]) * t, b.a[1] + (b.b[1] - b.a[1]) * t),
        );
      expect(low, b.id).toBeLessThan(0);
      expect(b.deck - low, b.id).toBeGreaterThan(4);
    }
  });

  it("lays the towns on the concept map's street grids, flat, with most blocks built", () => {
    for (const id of ["northstar-town", "millhaven", "riverwood", "crossroads"]) {
      const p = meta.pois.find((q) => q.id === id)!;
      const t = p.town!;
      expect(t.blocks.filter(([, , d]) => d >= 0.08).length / t.blocks.length, id).toBeGreaterThan(
        0.6,
      );
      // The grid is flat at the pad height (streets and blocks alike).
      for (const [i, j] of t.blocks) {
        const x = (t.xs[i]! + t.xs[i + 1]!) / 2,
          z = (t.zs[j]! + t.zs[j + 1]!) / 2;
        expect(Math.abs(hf.heightAt(x, z) - p.padHeight!), `${id} ${i},${j}`).toBeLessThan(0.05);
      }
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

describe("Project Island roads", () => {
  it("reads a connected road network off the concept map", () => {
    let length = 0;
    for (const r of meta.roads)
      for (let k = 0; k + 1 < r.points.length; k++)
        length += Math.hypot(
          r.points[k + 1]![0] - r.points[k]![0],
          r.points[k + 1]![1] - r.points[k]![1],
        );
    expect(length / 1000).toBeGreaterThan(60); // km
    // Main corridors from the map: the bridge approaches and Crossroads have roads.
    const near = (x: number, z: number, d: number) =>
      meta.roads.some((r) => r.points.some(([px, pz]) => Math.hypot(px - x, pz - z) < d));
    for (const b of meta.bridges) expect(near(b.a[0], b.a[1], 150), b.id).toBe(true);
    const crossroads = meta.pois.find((p) => p.id === "crossroads")!;
    expect(near(crossroads.x, crossroads.z, 200)).toBe(true);
  });

  it("ends roads at a junction or somewhere (owner, 2026-11-08: roads ending in weird places)", () => {
    const segs: number[][] = [];
    meta.roads.forEach((r, i) => {
      for (let k = 0; k + 1 < r.points.length; k++)
        segs.push([...r.points[k]!, ...r.points[k + 1]!, i]);
    });
    const toOther = (x: number, z: number, own: number) => {
      let best = Infinity;
      for (const [ax, az, bx, bz, i] of segs) {
        if (i === own || Math.min(ax!, bx!) > x + 12 || Math.max(ax!, bx!) < x - 12) continue;
        if (Math.min(az!, bz!) > z + 12 || Math.max(az!, bz!) < z - 12) continue;
        const vx = bx! - ax!,
          vz = bz! - az!;
        const u = Math.max(
          0,
          Math.min(1, ((x - ax!) * vx + (z - az!) * vz) / (vx * vx + vz * vz || 1)),
        );
        best = Math.min(best, Math.hypot(x - ax! - vx * u, z - az! - vz * u));
      }
      return best;
    };
    const arrives = (x: number, z: number) =>
      meta.pois.some(
        (p) => Math.hypot(p.x - x, p.z - z) < (p.padRadius ? p.padRadius + 60 : 250),
      ) ||
      meta.bridges.some((b) => [b.a, b.b].some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 60)) ||
      hf.heightAt(x, z) < 6 ||
      (meta.roadEnds ?? []).some(([ex, ez]) => Math.hypot(ex - x, ez - z) < 1);
    let loose = 0,
      ends = 0;
    meta.roads.forEach((r, i) => {
      for (const [x, z] of [r.points[0]!, r.points.at(-1)!]) {
        ends++;
        if (toOther(x, z, i) > 12 && !arrives(x, z)) loose++;
      }
    });
    // Before the audit: 1,061 of ~3,200 ends stopped short of a road or ran out in a field.
    expect(loose / ends).toBeLessThan(0.01);
    // The country dead ends left are few (each gets a farm, a cabin or a campsite: layout.ts).
    expect(meta.roadEnds?.length).toBeLessThan(80);
  });

  it("keeps roads on land with drivable grades", () => {
    let steep = 0,
      wet = 0,
      samples = 0;
    for (const r of meta.roads)
      for (let k = 0; k + 1 < r.points.length; k++) {
        const [ax, az] = r.points[k]!,
          [bx, bz] = r.points[k + 1]!;
        const d = Math.hypot(bx - ax, bz - az);
        if (d < 1) continue;
        samples++;
        if (Math.abs(hf.heightAt(bx, bz) - hf.heightAt(ax, az)) / d > 0.25) steep++;
        if (hf.heightAt((ax + bx) / 2, (az + bz) / 2) < 0.3) wet++;
      }
    expect(steep / samples).toBeLessThan(0.03);
    expect(wet / samples).toBeLessThan(0.02);
  });
});

describe("rivers and lakes (owner, 2026-11-08: broken river sides)", () => {
  it("eases the land down to low banks: no slot canyon, no stepped ledge beside a river", () => {
    let samples = 0;
    for (const r of meta.rivers)
      for (let k = 1; k + 2 < r.points.length; k += 2) {
        const [ax, az] = r.points[k]!,
          [bx, bz] = r.points[k + 1]!;
        const len = Math.hypot(bx - ax, bz - az) || 1;
        const [nx, nz] = [-(bz - az) / len, (bx - ax) / len];
        for (const side of [-1, 1]) {
          let prev = NaN;
          for (let d = r.width * 0.7; d < r.width * 0.7 + 60; d += 2) {
            const h = hf.heightAt(ax + nx * d * side, az + nz * d * side);
            // A bank never stands more than a few metres above the water right beside it, and
            // never rises more than 1.2 m in 2 m (about 31°; the old ledges rose 2–3 m in one step) on the way up.
            if (d < r.width * 0.75) expect(h, `${r.id} bank`).toBeLessThan(6);
            // (Above the water: the banks a player sees and walks.)
            if (!Number.isNaN(prev) && Math.min(h, prev) > 0.3)
              expect(
                Math.abs(h - prev),
                `${r.id} slope at ${Math.round(ax + nx * d * side)},${Math.round(az + nz * d * side)}`,
              ).toBeLessThan(1.2);
            prev = h;
            samples++;
          }
        }
      }
    expect(samples).toBeGreaterThan(500);
  });
});

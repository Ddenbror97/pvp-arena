/**
 * Road audit (owner, 2026-11-11: "i see some trees on the road around quarry, no trees on the
 * roads, or a car stuck in the bridge at the dam. find issues like this and fix cross the map").
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { buildIsland } from "@/lib/fps/br/island";
import type { Placement } from "@/lib/fps/br/layout";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { cellTrees, CELLS, type VegetationWorld } from "@/lib/fps/br/vegetation";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models as Record<
  string,
  { class: string; size: number[] }
>;
let layout: Placement[], vegetation: VegetationWorld;
beforeAll(async () => {
  const hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  ({ layout, vegetation } = buildIsland(hf, cover, meta, collision));
}, 120_000);

/** How far (m) a point is inside the nearest road's surface (negative: off the road). */
const G = 50;
let segments: Map<number, number[]> | null = null;
function intoRoad(x: number, z: number) {
  if (!segments) {
    segments = new Map();
    for (const r of meta.roads)
      for (let k = 1; k < r.points.length; k++) {
        const [ax, az] = r.points[k - 1]!,
          [bx, bz] = r.points[k]!;
        const m = r.width / 2 + 2;
        for (
          let cz = Math.floor((Math.min(az, bz) - m) / G);
          cz <= Math.floor((Math.max(az, bz) + m) / G);
          cz++
        )
          for (
            let cx = Math.floor((Math.min(ax, bx) - m) / G);
            cx <= Math.floor((Math.max(ax, bx) + m) / G);
            cx++
          ) {
            const key = cz * 10_000 + cx;
            const list = segments.get(key) ?? [];
            list.push(ax, az, bx, bz, r.width / 2);
            segments.set(key, list);
          }
      }
  }
  let best = -Infinity;
  const list = segments.get(Math.floor(z / G) * 10_000 + Math.floor(x / G)) ?? [];
  for (let k = 0; k < list.length; k += 5) {
    const ax = list[k]!,
      az = list[k + 1]!,
      vx = list[k + 2]! - ax,
      vz = list[k + 3]! - az,
      l2 = vx * vx + vz * vz || 1;
    const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
    best = Math.max(best, list[k + 4]! - Math.hypot(x - ax - vx * u, z - az - vz * u));
  }
  return best;
}

describe("Project Island roads", () => {
  it("grows no tree on a road or a bridge", () => {
    const onRoad: string[] = [];
    for (let cj = 0; cj < CELLS; cj++)
      for (let ci = 0; ci < CELLS; ci++) {
        const t = cellTrees(vegetation, ci, cj);
        for (let k = 0; k < t.length; k += 6) {
          const x = t[k]!,
            z = t[k + 2]!;
          // A trunk (up to 0.6 m) clear of the road's edge.
          if (intoRoad(x, z) > -0.6) onRoad.push(`${x.toFixed(0)},${z.toFixed(0)}`);
          for (const b of meta.bridges) {
            const vx = b.b[0] - b.a[0],
              vz = b.b[1] - b.a[1],
              l2 = vx * vx + vz * vz;
            const u = ((x - b.a[0]) * vx + (z - b.a[1]) * vz) / l2;
            const d = Math.abs((x - b.a[0]) * vz - (z - b.a[1]) * vx) / Math.sqrt(l2);
            if (u > 0 && u < 1 && d < b.width / 2 + 0.6) onRoad.push(`${b.id} ${x.toFixed(0)}`);
          }
        }
      }
    expect(onRoad.slice(0, 20)).toEqual([]);
  }, 120_000);

  it("parks the bridges' abandoned cars lengthwise, inside the rails", () => {
    const cars = layout.filter((p) => p.poi === "bridges" && /^car-/.test(p.model));
    expect(cars.length).toBeGreaterThan(10);
    for (const c of cars) {
      const b = meta.bridges
        .map((b) => {
          const vx = b.b[0] - b.a[0],
            vz = b.b[1] - b.a[1],
            len = Math.hypot(vx, vz);
          return { b, d: Math.abs((c.x - b.a[0]) * vz - (c.z - b.a[1]) * vx) / len, vx, vz, len };
        })
        .sort((p, q) => p.d - q.d)[0]!;
      // A car's length is along x at turn 0: lengthwise means its long axis follows the deck.
      const long = c.turn % 2 ? [0, 1] : [1, 0];
      const along = Math.abs(long[0]! * b.vx + long[1]! * b.vz) / b.len;
      expect(along, `${c.model} on ${b.b.id}`).toBeGreaterThan(0.9);
      const [w, , d] = models[c.model]!.size as [number, number, number];
      // Its corners stay inside the rails (0.35 m thick).
      const half = Math.hypot(w, d) / 2;
      const across = Math.abs(Math.sin(Math.acos(Math.min(1, along)))) * half + Math.min(w, d) / 2;
      expect(b.d + across, `${c.model} on ${b.b.id}`).toBeLessThan(b.b.width / 2);
    }
  });

  it("runs no road through a building (in at one wall, out at the other)", () => {
    const through: string[] = [];
    const clip = (
      ax: number,
      az: number,
      bx: number,
      bz: number,
      x0: number,
      z0: number,
      x1: number,
      z1: number,
    ) => {
      let t0 = 0,
        t1 = 1;
      const dx = bx - ax,
        dz = bz - az;
      for (const [p, q] of [
        [-dx, ax - x0],
        [dx, x1 - ax],
        [-dz, az - z0],
        [dz, z1 - az],
      ] as const) {
        if (p === 0) {
          if (q < 0) return 0;
          continue;
        }
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
      return t1 > t0 ? (t1 - t0) * Math.hypot(dx, dz) : 0;
    };
    // (The airfield's three hangars stand where its apron roads were laid round them; they stay.)
    const ALLOWED = new Set(["hangar-j", "hangar"]);
    for (const p of layout) {
      const m = models[p.model];
      if (!m || m.class !== "building" || ALLOWED.has(p.model)) continue;
      let [w, d] = [m.size[0]!, m.size[2]!];
      if (p.turn % 2) [w, d] = [d, w];
      const x0 = p.x - w / 2 + 0.5,
        x1 = p.x + w / 2 - 0.5,
        z0 = p.z - d / 2 + 0.5,
        z1 = p.z + d / 2 - 0.5;
      for (const r of meta.roads) {
        let inside = 0;
        for (let k = 1; k < r.points.length; k++) {
          const [ax, az] = r.points[k - 1]!,
            [bx, bz] = r.points[k]!;
          inside += clip(ax, az, bx, bz, x0, z0, x1, z1);
        }
        if (inside < 4) continue;
        const endsInside = [r.points[0]!, r.points[r.points.length - 1]!].some(
          ([ex, ez]) => ex > x0 - 3 && ex < x1 + 3 && ez > z0 - 3 && ez < z1 + 3,
        );
        if (!endsInside) through.push(`${p.model} ${p.poi} ${p.x},${p.z}`);
      }
    }
    expect(through).toEqual([]);
  });
});

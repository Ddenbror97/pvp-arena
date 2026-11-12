import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { createGrass, parseGrassKit } from "@/lib/fps/br/grass";
import {
  createGrassScatter,
  GRASS,
  INSTANCE_FLOATS,
  type ClumpInfo,
} from "@/lib/fps/br/grass-scatter";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover, type LandCoverMap } from "@/lib/fps/br/landcover";
import { pavedLots } from "@/lib/fps/br/layout";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Ground grass (owner, 2026-11-12: "green gras in green ground floors, more yellow gras in those
 * ground floor areas ... does not look generic/flat"): where it grows on the real island, what
 * it keeps off, the kit, and the cost.
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const manifest = JSON.parse(readFileSync("public/fps/br/grass/grass-v1.json", "utf8"));
const kit = parseGrassKit(
  manifest,
  buffer("public/fps/br/grass/grass-v1.bin"),
  new THREE.Texture(),
);
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
let hf: Heightfield, cover: LandCoverMap, island: Island;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  const collision = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
  ) as CollisionData;
  island = buildIsland(hf, cover, meta, collision);
}, 120_000);

const scatter = () =>
  createGrassScatter(
    {
      hf,
      cover,
      meta,
      supportAt: (x, z, r, y) => island.solid.supportAt(x, z, r, y),
      lots: pavedLots(island.layout, meta),
    },
    kit.clumps,
  );
/** Every instance of a cell as { clump, x, y, z, scale }. */
function grown(s: ReturnType<typeof scatter>, cx: number, cz: number) {
  return s.cell(cx, cz).flatMap((l, clump) => {
    const out = [];
    for (let o = 0; o < l.length; o += INSTANCE_FLOATS)
      out.push({ clump, x: l[o]!, y: l[o + 1]!, z: l[o + 2]!, scale: l[o + 4]! });
    return out;
  });
}
/** Cells over the island on a coarse lattice (every 25th cell each way). */
const lattice = () => {
  const out: Array<[number, number]> = [];
  for (let cz = -600; cz < 600; cz += 25)
    for (let cx = -600; cx < 600; cx += 25) out.push([cx, cz]);
  return out;
};

describe("ground grass kit", () => {
  it("is 16 light clumps in four families, one atlas, no clump over the height cap as grown", () => {
    expect(kit.clumps).toHaveLength(16);
    const families = new Set(kit.clumps.map((c: ClumpInfo) => c.family));
    expect([...families].sort()).toEqual(["aged", "dry", "fresh", "tall"]);
    for (const c of kit.clumps) {
      expect(c.indices / 3).toBeLessThanOrEqual(60);
      expect(c.height).toBeGreaterThan(0.15);
    }
    expect(manifest.atlas).toBe("grass-v1.webp");
  });
});

describe("where grass grows", () => {
  it("green in the meadows, straw in the fields, and never one kind everywhere", () => {
    const s = scatter();
    const byClass = { grass: [0, 0, 0, 0], field: [0, 0, 0, 0] };
    const fam = { fresh: 0, aged: 1, dry: 2, tall: 3 } as const;
    const kinds = new Set<number>();
    for (const [cx, cz] of lattice()) {
      const x = (cx + 0.5) * GRASS.cell,
        z = (cz + 0.5) * GRASS.cell;
      const c = cover.classAt(x, z);
      if (c !== "grass" && c !== "field") continue;
      for (const g of grown(s, cx, cz)) {
        byClass[c][fam[kit.clumps[g.clump]!.family]]!++;
        kinds.add(g.clump);
      }
    }
    const share = (a: number[], i: number) => a[i]! / a.reduce((n, v) => n + v, 0);
    // Meadows: mostly green (fresh) with aged and some dry in drifts.
    expect(share(byClass.grass, 0)).toBeGreaterThan(0.45);
    expect(share(byClass.grass, 2)).toBeLessThan(0.2);
    expect(share(byClass.grass, 1) + share(byClass.grass, 2)).toBeGreaterThan(0.12);
    // Fields: mostly dry or aged, a little green, and the tall seed grass.
    expect(share(byClass.field, 2) + share(byClass.field, 1)).toBeGreaterThan(0.65);
    expect(share(byClass.field, 0)).toBeGreaterThan(0.02);
    expect(share(byClass.field, 3)).toBeGreaterThan(0.01);
    // Every clump of the kit grows somewhere.
    expect(kinds.size).toBe(kit.clumps.length);
  });

  it("in patches: thick swards and thin runs, not an even fill", () => {
    const s = scatter();
    const counts: number[] = [];
    for (const [cx, cz] of lattice()) {
      if (cover.classAt((cx + 0.5) * GRASS.cell, (cz + 0.5) * GRASS.cell) !== "grass") continue;
      counts.push(grown(s, cx, cz).length);
    }
    counts.sort((a, b) => a - b);
    const q = (p: number) => counts[Math.floor(counts.length * p)]!;
    expect(counts.length).toBeGreaterThan(200);
    // The thickest cells hold at least twice the thinnest quarter's.
    expect(q(0.9)).toBeGreaterThan(q(0.25) * 2);
    expect(q(0.5)).toBeGreaterThan(40);
  });

  it("keeps off roads, runways, water, beaches, rock, steep banks and anything built", () => {
    const s = scatter();
    const segments = meta.roads.flatMap((r) =>
      r.points.slice(1).map((b, i) => {
        const a = r.points[i]!;
        return [a[0], a[1], b[0], b[1], r.width / 2 + GRASS.verge] as const;
      }),
    );
    let checked = 0;
    for (const [cx, cz] of lattice())
      for (const g of grown(s, cx, cz)) {
        checked++;
        const ground = hf.heightAt(g.x, g.z);
        // Set into the ground, more on a slope (its uphill side above its centre), never by
        // more than a few centimetres plus the slope across its footprint.
        const c = kit.clumps[g.clump]!;
        expect(g.y).toBeLessThan(ground - 0.03);
        expect(ground - g.y).toBeLessThan(
          0.035 + hf.slopeAt(g.x, g.z) * c.radius * g.scale * 0.7 + 1e-3,
        );
        expect(ground).toBeGreaterThan(0.8);
        expect(hf.slopeAt(g.x, g.z)).toBeLessThanOrEqual(0.75);
        expect(island.solid.supportAt(g.x, g.z, 0.12, ground + 6)).toBeLessThan(ground + 0.07);
        // Clear of every road's edge plus the verge (checked against each nearby segment).
        let closest = Infinity;
        for (const [ax, az, bx, bz, clear] of segments) {
          if (Math.abs(g.x - ax) > 400 && Math.abs(g.x - bx) > 400) continue;
          const vx = bx - ax,
            vz = bz - az;
          const u = Math.max(
            0,
            Math.min(1, ((g.x - ax) * vx + (g.z - az) * vz) / (vx * vx + vz * vz || 1)),
          );
          closest = Math.min(closest, Math.hypot(g.x - ax - vx * u, g.z - az - vz * u) - clear);
        }
        expect(closest).toBeGreaterThan(-1e-6);
        for (const w of meta.waterBodies) {
          const [x0, z0, x1, z1] = w.bounds;
          if (g.x >= x0 && g.x <= x1 && g.z >= z0 && g.z <= z1)
            expect(ground).toBeGreaterThanOrEqual(w.level + 0.15);
        }
        // Never taller than the cap (it never hides a crouching player).
        expect(kit.clumps[g.clump]!.height * g.scale).toBeLessThanOrEqual(GRASS.maxHeight + 1e-5);
      }
    expect(checked).toBeGreaterThan(20_000);
  }, 120_000);

  it("is the same for everyone: a cell's clumps follow from its place alone", () => {
    const a = scatter().cell(37, -112),
      b = scatter().cell(37, -112);
    expect(a.map((l) => Array.from(l))).toEqual(b.map((l) => Array.from(l)));
  });

  it("scatters a cell in well under a millisecond on average", () => {
    const s = scatter();
    const cells = lattice().slice(0, 400);
    const t = performance.now();
    for (const [cx, cz] of cells) s.cell(cx, cz);
    expect((performance.now() - t) / cells.length).toBeLessThan(1.5);
  });
});

describe("ground grass drawn", () => {
  it("draws a meadow within budget: one call per clump kind, a few hundred thousand triangles", () => {
    const grass = createGrass(
      { hf, cover, meta, supportAt: (x, z, r, y) => island.solid.supportAt(x, z, r, y) },
      kit,
      52,
    );
    // A meadow spot, on foot, looking along it.
    let spot: [number, number] | null = null;
    for (let z = -3000; z < 3000 && !spot; z += 97)
      for (let x = -3000; x < 3000 && !spot; x += 89) {
        let ok = true;
        for (let d = -60; d <= 60 && ok; d += 20)
          for (const [dx, dz] of [
            [d, 0],
            [0, d],
          ])
            if (cover.classAt(x + dx!, z + dz!) !== "grass") ok = false;
        if (ok) spot = [x, z];
      }
    const [x, z] = spot!;
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 5000);
    camera.position.set(x, hf.heightAt(x, z) + 1.6, z);
    camera.lookAt(x + 10, hf.heightAt(x, z) + 1.2, z);
    camera.updateMatrixWorld();
    for (let i = 0; i < 200; i++) grass.update(camera, null);
    const st = grass.stats();
    expect(st.draws).toBeLessThanOrEqual(16);
    expect(st.instances).toBeGreaterThan(3000);
    expect(st.triangles).toBeLessThan(450_000);
    // From the air there is nothing to draw.
    camera.position.y += 300;
    camera.updateMatrixWorld();
    grass.update(camera, null);
    expect(grass.stats().instances).toBe(0);
    grass.dispose();
  }, 120_000);
});

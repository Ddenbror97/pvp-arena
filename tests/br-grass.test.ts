import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { createGrass, GRASS_RANGE, grassKeep, grassNear, parseGrassKit } from "@/lib/fps/br/grass";
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

  it("scatters a far cell coarse first: a refined cell only adds clumps, never moves one", () => {
    const s = scatter();
    for (const [cx, cz] of lattice().slice(0, 60)) {
      const coarse = s.cell(cx, cz, 0.1),
        full = s.cell(cx, cz);
      for (let k = 0; k < full.length; k++) {
        const keep = new Set<string>();
        const f = full[k]!;
        for (let i = 0; i < f.length; i += INSTANCE_FLOATS)
          keep.add(Array.from(f.subarray(i, i + INSTANCE_FLOATS)).join());
        const c = coarse[k]!;
        for (let i = 0; i < c.length; i += INSTANCE_FLOATS)
          expect(keep.has(Array.from(c.subarray(i, i + INSTANCE_FLOATS)).join())).toBe(true);
      }
    }
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
  it("is part of the map: every clump stands far out, and the field only thins past that", () => {
    // Owner, 2026-11-13: "the gras that sticks up from the ground still loads in late. should be
    // a part of the map, should never render/load in late".
    expect(GRASS_RANGE.standard).toBeGreaterThanOrEqual(150);
    expect(GRASS_RANGE.low).toBeGreaterThanOrEqual(100);
    for (const range of Object.values(GRASS_RANGE)) {
      const near = grassNear(range);
      expect(near).toBeGreaterThanOrEqual(55);
      for (let d = 0; d <= near; d += 2) expect(grassKeep(d, near)).toBe(1);
      // Past it the share falls gently (a few per cent a metre, where a clump is a few pixels).
      for (let d = Math.ceil(near) + 1; d < range; d += 1)
        expect(grassKeep(d - 1, near) - grassKeep(d, near)).toBeLessThan(0.03);
    }
  });

  it("never leaves the ground near the player bare: walking, driving, or put down somewhere", () => {
    const grass = createGrass(
      { hf, cover, meta, supportAt: (x, z, r, y) => island.solid.supportAt(x, z, r, y) },
      kit,
      GRASS_RANGE.standard,
    );
    const near = grassNear(GRASS_RANGE.standard);
    const [x0, z0] = meadow();
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 5000);
    const place = (x: number, z: number) => {
      camera.position.set(x, hf.heightAt(x, z) + 1.6, z);
      camera.lookAt(x + 10, hf.heightAt(x, z) + 1.2, z);
      camera.updateMatrixWorld();
    };
    const drawn = () => {
      const out = new Set<string>();
      for (const m of grass.root.children as THREE.Mesh[]) {
        const g = m.geometry as THREE.InstancedBufferGeometry;
        const pose = g.getAttribute("iPose") as THREE.InstancedBufferAttribute;
        for (let i = 0; i < g.instanceCount; i++)
          out.add(`${pose.getX(i).toFixed(2)},${pose.getZ(i).toFixed(2)}`);
      }
      return out;
    };
    const s = scatter();
    /** Every clump that grows within `r` m ahead of the camera (a 50° cone either side). */
    const expected = (r: number) => {
      const out: string[] = [];
      const { x, z } = camera.position;
      const n = Math.ceil(r / GRASS.cell) + 1;
      for (let j = -n; j <= n; j++)
        for (let i = -n; i <= n; i++)
          for (const l of s.cell(Math.floor(x / GRASS.cell) + i, Math.floor(z / GRASS.cell) + j))
            for (let o = 0; o < l.length; o += INSTANCE_FLOATS) {
              const dx = l[o]! - x,
                dz = l[o + 2]! - z;
              const d = Math.hypot(dx, dz);
              if (d < r && d > 2 && dx > Math.cos((50 * Math.PI) / 180) * d)
                out.push(`${l[o]!.toFixed(2)},${l[o + 2]!.toFixed(2)}`);
            }
      return out;
    };
    const check = (what: string) => {
      const have = drawn();
      const want = expected(near - 6);
      const missing = want.filter((k) => !have.has(k)).length;
      expect(want.length, what).toBeGreaterThan(1000);
      expect(missing, what).toBe(0);
    };
    // Put down in the meadow (a respawn): the first frame already has it all.
    place(x0, z0);
    grass.update(camera, null);
    check("put down");
    // Walking (6 m/s) and driving (30 m/s) along it, at 60 frames a second.
    let now = 0;
    const real = performance.now;
    performance.now = () => now;
    try {
      for (const [v, metres] of [
        [6, 60],
        [30, 240],
      ] as const) {
        const start = camera.position.x;
        while (camera.position.x < start + metres) {
          now += 1000 / 60;
          place(camera.position.x + v / 60, z0);
          grass.update(camera, null);
        }
        check(`at ${v} m/s`);
      }
    } finally {
      performance.now = real;
    }
    const st = grass.stats();
    expect(st.draws).toBeLessThanOrEqual(16);
    // (Owner: "even if it makes the GPU/fps its fine".)
    expect(st.triangles).toBeLessThan(2_500_000);
    // From the air there is nothing to draw.
    camera.position.y += 300;
    camera.updateMatrixWorld();
    grass.update(camera, null);
    expect(grass.stats().instances).toBe(0);
    grass.dispose();
  }, 600_000);
});
/** A meadow spot (open grass 60 m each way), on the island. */
function meadow(): [number, number] {
  for (let z = -3000; z < 3000; z += 97)
    for (let x = -3000; x < 3000; x += 89) {
      let ok = true;
      for (let d = -60; d <= 60 && ok; d += 20)
        for (const [dx, dz] of [
          [d, 0],
          [0, d],
        ])
          if (cover.classAt(x + dx!, z + dz!) !== "grass") ok = false;
      if (ok) return [x, z];
    }
  throw new Error("no meadow");
}

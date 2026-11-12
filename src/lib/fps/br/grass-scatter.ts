import { bridgeApproaches } from "./bridges";
import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import { WORLD_HALF, WORLD_SIZE, type WorldMeta } from "./world";

/**
 * Where Project Island's ground grass grows (owner, 2026-11-12: "add gras sticking up, green gras
 * in green ground floors, more yellow gras in those ground floor areas ... make sure execute this
 * good so it does not look generic/flat").
 *
 * What keeps it from looking like a carpet of one clump stamped on a grid:
 *
 * - **Patches.** Two noise fields (11 m and 3 m) set how dense it is: thick swards, thin runs and
 *   bare ground between them, as grass grows, never an even fill.
 * - **Dryness as a field, not per class.** Meadows lean green and the fields lean straw, but a
 *   25 m and a 5 m noise move each place along green → aged → dry, so a meadow has yellowing
 *   drifts and a field green hollows, and the change is gradual across a border.
 * - **Drifts of one kind.** Which clump of a family grows is picked by a 4 m noise, so a kind of
 *   grass grows in stands, as it seeds, with a quarter mixed in at random.
 * - **Ragged borders.** The land cover is a 7.8 m grid; it is read bilinearly a few metres off by
 *   noise, so a meadow's edge wanders instead of following the grid.
 * - **Each clump its own.** Size (larger where it is thick), heading, a lean, a shade: no two
 *   alike. The renderer adds the ground's colour at the root, the wind and the light.
 *
 * Kept off what is not soil: roads and their verges, runways, the roadside lots, beaches, rock,
 * water, steep banks, the snow line, and anything standing on the ground (buildings, walls,
 * rocks, props: their collision boxes). No clump is taller than `GRASS.maxHeight` (fairness: it
 * never hides a crouching player, whose eyes are at 0.95 m), and everyone grows the same grass
 * from the same seed.
 *
 * Pure and deterministic: a cell's clumps follow from its coordinates and the world.
 */
export const GRASS = {
  /** Square cells (m) the ground is scattered in, one at a time, as the camera nears them. */
  cell: 8,
  /** Candidate spacing (m) on a jittered grid. */
  spacing: 0.5,
  /** Tallest a clump may be (m). */
  maxHeight: 0.6,
  /** Base density per land class (share of candidates that grow) before the patches. */
  meadow: 0.95,
  field: 0.85,
  forest: 0.12,
  /** Clear of a road's edge (m) and a runway's. */
  verge: 1.4,
} as const;

export type GrassFamily = "fresh" | "aged" | "dry" | "tall";
export const FAMILIES: readonly GrassFamily[] = ["fresh", "aged", "dry", "tall"];

/** The kit's clumps (public/fps/br/grass/grass-v1.json): family and height (m), and its
 * footprint (radius, m): wide clumps are grown rarer and smaller (a broad card reads as a block). */
export type ClumpInfo = { family: GrassFamily; height: number; radius: number };

/** Floats per instance: x, y, z, yaw, scale, lean x, lean z, rand, tint r, g, b. */
export const INSTANCE_FLOATS = 11;

export type GrassWorld = {
  hf: Heightfield;
  cover: LandCoverMap;
  meta: WorldMeta;
  /** Highest support at x/z (StaticWorld.supportAt): a box above the ground means a structure. */
  supportAt?: (x: number, z: number, radius: number, maxY: number) => number;
  /** Paved lots (layout.ts pavedLots: quads by corners). */
  lots?: number[][];
};

// ---------------------------------------------------------------- noise and hashing

/** Integer hash of two ints and a seed, to [0, 1). */
function hash3(x: number, z: number, s: number) {
  let h =
    Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smooth value noise in [0, 1] at a feature size of `size` metres. */
export function vnoise(x: number, z: number, size: number, seed: number) {
  const fx = x / size,
    fz = z / size;
  const ix = Math.floor(fx),
    iz = Math.floor(fz);
  const tx = fx - ix,
    tz = fz - iz;
  const sx = tx * tx * (3 - 2 * tx),
    sz = tz * tz * (3 - 2 * tz);
  const a = hash3(ix, iz, seed),
    b = hash3(ix + 1, iz, seed),
    c = hash3(ix, iz + 1, seed),
    d = hash3(ix + 1, iz + 1, seed);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- what is not soil

type Segment = [number, number, number, number, number]; // ax, az, bx, bz, clearance

/** Roads (and the bridges' approaches) and runways as segments, indexed on a 32 m grid. */
function blockers(meta: WorldMeta) {
  const CELL = 32;
  const grid = new Map<number, Segment[]>();
  const add = (s: Segment) => {
    const r = s[4];
    for (
      let cz = Math.floor((Math.min(s[1], s[3]) - r) / CELL);
      cz <= Math.floor((Math.max(s[1], s[3]) + r) / CELL);
      cz++
    )
      for (
        let cx = Math.floor((Math.min(s[0], s[2]) - r) / CELL);
        cx <= Math.floor((Math.max(s[0], s[2]) + r) / CELL);
        cx++
      ) {
        const k = cz * 8192 + cx;
        const list = grid.get(k);
        if (list) list.push(s);
        else grid.set(k, [s]);
      }
  };
  for (const r of [...meta.roads, ...bridgeApproaches(meta)])
    for (let i = 0; i + 1 < r.points.length; i++) {
      const [ax, az] = r.points[i]!,
        [bx, bz] = r.points[i + 1]!;
      add([ax, az, bx, bz, r.width / 2 + GRASS.verge]);
    }
  for (const w of meta.runways ?? [])
    add([w.a[0], w.a[1], w.b[0], w.b[1], w.width / 2 + GRASS.verge]);
  return (x: number, z: number) => {
    const list = grid.get(Math.floor(z / CELL) * 8192 + Math.floor(x / CELL));
    if (!list) return false;
    for (const [ax, az, bx, bz, r] of list) {
      const vx = bx - ax,
        vz = bz - az;
      const u = Math.max(
        0,
        Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)),
      );
      const dx = x - ax - vx * u,
        dz = z - az - vz * u;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  };
}

/** Paved lots rasterised to 1 m cells. */
function lotCells(lots: number[][]) {
  const cells = new Set<number>();
  for (const q of lots) {
    const xs = [q[0]!, q[2]!, q[4]!, q[6]!],
      zs = [q[1]!, q[3]!, q[5]!, q[7]!];
    const inside = (x: number, z: number) => {
      // Convex quad: the same side of every edge.
      let sign = 0;
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const c = (xs[j]! - xs[i]!) * (z - zs[i]!) - (zs[j]! - zs[i]!) * (x - xs[i]!);
        if (c !== 0) {
          if (sign === 0) sign = Math.sign(c);
          else if (Math.sign(c) !== sign) return false;
        }
      }
      return true;
    };
    for (let z = Math.floor(Math.min(...zs)) - 1; z <= Math.ceil(Math.max(...zs)) + 1; z++)
      for (let x = Math.floor(Math.min(...xs)) - 1; x <= Math.ceil(Math.max(...xs)) + 1; x++)
        if (inside(x + 0.5, z + 0.5)) cells.add(z * 16384 + x);
  }
  return (x: number, z: number) => cells.has(Math.floor(z) * 16384 + Math.floor(x));
}

// ---------------------------------------------------------------- the scatter

export type GrassScatter = {
  /** One cell's clumps: per clump index, its instances (INSTANCE_FLOATS each). */
  cell(cx: number, cz: number): Float32Array[];
};

export function createGrassScatter(world: GrassWorld, clumps: readonly ClumpInfo[]): GrassScatter {
  const { hf, cover, meta } = world;
  const onRoad = blockers(meta);
  const onLot = lotCells(world.lots ?? []);
  const texel = WORLD_SIZE / cover.width;
  const byFamily = FAMILIES.map((f) => clumps.flatMap((c, i) => (c.family === f ? [i] : [])));
  // Each clump's share within its family: narrow tufts make the sward, wide ones are accents.
  const weight = clumps.map((c) => (c.radius > 0.45 ? 0.15 : c.radius > 0.3 ? 0.6 : 1));
  const pickFrom = (members: number[], u: number) => {
    let total = 0;
    for (const m of members) total += weight[m]!;
    let acc = u * total;
    for (const m of members) if ((acc -= weight[m]!) <= 0) return m;
    return members[members.length - 1]!;
  };
  /** Land-cover class shares at x/z, bilinear over the 7.8 m texels. */
  const shares = new Float32Array(8);
  const share = (x: number, z: number) => {
    shares.fill(0);
    const fx = (x + WORLD_HALF) / texel - 0.5,
      fz = (z + WORLD_HALF) / texel - 0.5;
    const ix = Math.floor(fx),
      iz = Math.floor(fz);
    const tx = fx - ix,
      tz = fz - iz;
    for (const [dx, dz, w] of [
      [0, 0, (1 - tx) * (1 - tz)],
      [1, 0, tx * (1 - tz)],
      [0, 1, (1 - tx) * tz],
      [1, 1, tx * tz],
    ] as const) {
      const i = Math.min(cover.width - 1, Math.max(0, ix + dx)),
        j = Math.min(cover.height - 1, Math.max(0, iz + dz));
      shares[cover.data[j * cover.width + i]!]! += w;
    }
    return shares;
  };
  return {
    cell(cx, cz) {
      const lists: number[][] = clumps.map(() => []);
      const x0 = cx * GRASS.cell,
        z0 = cz * GRASS.cell;
      const n = Math.round(GRASS.cell / GRASS.spacing);
      const step = GRASS.cell / n;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const gi = cx * n + i,
            gj = cz * n + j;
          const x = x0 + (i + hash3(gi, gj, 11)) * step,
            z = z0 + (j + hash3(gi, gj, 12)) * step;
          // Ragged borders: read the land cover a few metres off.
          const wx = x + (vnoise(x, z, 9, 21) - 0.5) * 7,
            wz = z + (vnoise(x, z, 9, 22) - 0.5) * 7;
          const s = share(wx, wz);
          const meadow = s[2]!,
            field = s[3]!,
            forest = s[4]!;
          const soil = meadow * GRASS.meadow + field * GRASS.field + forest * GRASS.forest;
          if (soil <= 0.02) continue;
          // Patches: swards, thin runs and bare ground.
          const p1 = vnoise(x, z, 11, 31),
            p2 = vnoise(x, z, 3, 32);
          const density = soil * (0.3 + 0.95 * smooth(0.25, 0.72, p1)) * (0.7 + 0.6 * p2);
          const r0 = hash3(gi, gj, 13);
          if (r0 >= density) continue;
          // Ground: not under water, on beaches, steep banks or the snow.
          const y = hf.heightAt(x, z);
          if (y < 0.8 || y > 380) continue;
          const slope = hf.slopeAt(x, z);
          if (slope > 0.75) continue;
          if (onRoad(x, z) || onLot(x, z)) continue;
          if (world.supportAt && world.supportAt(x, z, 0.12, y + 6) > y + 0.06) continue;
          if (
            meta.waterBodies.some(
              (w) =>
                x >= w.bounds[0] &&
                x <= w.bounds[2] &&
                z >= w.bounds[1] &&
                z <= w.bounds[3] &&
                y < w.level + 0.15,
            )
          )
            continue;
          // Dryness: meadows green, fields straw, moved along by two noises.
          const total = meadow + field + forest || 1;
          const lean = (meadow * 0.2 + field * 0.74 + forest * 0.3) / total;
          const dry =
            lean + 0.42 * (vnoise(x, z, 25, 41) - 0.5) + 0.2 * (vnoise(x, z, 5, 42) - 0.5);
          const r1 = hash3(gi, gj, 14);
          let family: number;
          // Tall seed grass: a few stands in the fields and the rougher meadow edges.
          const tallStand =
            smooth(0.66, 0.82, vnoise(x, z, 14, 51)) * (field / total + 0.3 * (meadow / total));
          if (r1 < tallStand * 0.45 && byFamily[3]!.length) family = 3;
          else {
            const u = dry + 0.22 * (hash3(gi, gj, 15) - 0.5);
            family = u < 0.36 ? 0 : u < 0.6 ? 1 : 2;
          }
          const members = byFamily[family]!;
          if (!members.length) continue;
          // Stands of one kind (a 4 m noise), a quarter mixed in.
          const drift = hash3(gi, gj, 16) < 0.75 ? vnoise(x, z, 4, 61 + family) : hash3(gi, gj, 17);
          const clump = pickFrom(members, drift);
          // Size: larger where the sward is thick, wide clumps smaller; the small tufts (a
          // quarter metre in their pack) grown to a meadow's ankle-to-knee height. Never over
          // the height cap.
          const { height: h, radius } = clumps[clump]!;
          let scale = (0.75 + 0.5 * hash3(gi, gj, 18)) * (0.85 + 0.35 * p1);
          if (h < 0.3) scale *= 1.7;
          if (radius > 0.45) scale *= 0.6;
          scale = Math.min(scale, GRASS.maxHeight / h);
          const yaw = hash3(gi, gj, 19) * Math.PI * 2;
          const leanX = (hash3(gi, gj, 20) - 0.5) * 0.24,
            leanZ = (hash3(gi, gj, 21) - 0.5) * 0.24;
          // Shade: brightness, and a little warmer or greener than its family as the dryness
          // runs past it.
          const b = 0.86 + 0.26 * hash3(gi, gj, 22);
          const familyDry = [0.2, 0.48, 0.78, 0.6][family]!;
          const warm = Math.max(-0.12, Math.min(0.12, (dry - familyDry) * 0.5));
          // Set into the ground: a little everywhere, more on a slope (the uphill side of the
          // footprint is higher than its centre), so no clump stands on air downhill.
          const sink = 0.035 + slope * radius * scale * 0.7;
          lists[clump]!.push(
            x,
            y - sink,
            z,
            yaw,
            scale,
            leanX,
            leanZ,
            hash3(gi, gj, 23),
            b * (1 + warm * 0.6),
            b * (1 + warm * 0.15),
            b * (1 - warm * 0.9),
          );
        }
      return lists.map((l) => Float32Array.from(l));
    },
  };
}

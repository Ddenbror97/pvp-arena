import type { Heightfield } from "./heightfield";
import { lotHeight } from "./layout";
import { createRoadGrade, ROAD_GRADE } from "./road-grade";
import { WORLD_HALF, type WorldMeta } from "./world";

/**
 * The paved surfaces' heights for what stands and drives on them (owner, 2026-11-23: "make so
 * the drivble veicles eg motorbike wheel is correctly on the asfalt road, its slightly to sink
 * down so the wheels is under the ground"): the very heights the structures renderer lays the
 * asphalt at, from the ground as the terrain draws it.
 *
 * Before, the bodies' and vehicles' road was the road grade over the terrain's bilinear height,
 * the drawn one the grade over the drawn ground (a few centimetres higher where the terrain
 * bends), and the runways (10 cm over the highest ground within 2 m) and the roadside stops'
 * lots (10 cm over the highest within half a metre, plus 2) were not in the world at all: a
 * wheel or a boot stood that far under the asphalt.
 */

/** The runways' rise over the ground they lie on (m; the renderer's PAVED_LIFT.runway). */
export const RUNWAY_LIFT = 0.1;
/** The lots' rise over their layout height (m; structures-renderer.ts lotY). */
export const LOT_LIFT = 0.02;

/** Ground samples round a point (m) for a runway's height: a 4 m square and a 2 m one. */
const STENCIL: ReadonlyArray<readonly [number, number]> = [
  [-2, -2],
  [0, -2],
  [2, -2],
  [-2, 0],
  [2, 0],
  [-2, 2],
  [0, 2],
  [2, 2],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/**
 * The ground as the terrain draws it: each cell two triangles, split either way between its
 * levels of detail; the higher of the two, which can stand a few centimetres over the bilinear
 * height. Paved surfaces are laid over this.
 */
export function drawnGround(hf: Heightfield) {
  return (x: number, z: number) => {
    const gx = (x + WORLD_HALF) / hf.spacing,
      gz = (z + WORLD_HALF) / hf.spacing;
    const i = Math.min(hf.width - 2, Math.max(0, Math.floor(gx))),
      j = Math.min(hf.height - 2, Math.max(0, Math.floor(gz)));
    const fx = gx - i,
      fz = gz - j;
    const h00 = hf.sample(i, j),
      h10 = hf.sample(i + 1, j),
      h01 = hf.sample(i, j + 1),
      h11 = hf.sample(i + 1, j + 1);
    return Math.max(
      fx + fz <= 1
        ? h00 + (h10 - h00) * fx + (h01 - h00) * fz
        : h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz),
      fx >= fz
        ? h00 + (h10 - h00) * fx + (h11 - h10) * fz
        : h00 + (h11 - h01) * fx + (h01 - h00) * fz,
    );
  };
}

/** The highest ground at and round a point, plus `lift` (runways and their aprons). */
export function pavedHeight(
  heightAt: (x: number, z: number) => number,
  x: number,
  z: number,
  lift: number,
) {
  let h = heightAt(x, z);
  for (const [dx, dz] of STENCIL) h = Math.max(h, heightAt(x + dx, z + dz));
  return h + lift;
}

/**
 * The top of the asphalt at (x, z): on a road's carriageway, a runway or a roadside lot (the
 * highest where they meet), or null off them all. `lots`: layout.ts pavedLots' cells.
 */
export function pavedSurface(meta: WorldMeta, hf: Heightfield, lots: number[][] = []) {
  const drawn = drawnGround(hf);
  const roads = createRoadGrade(meta, drawn);
  const runways = meta.runways.map((r) => {
    const [ax, az] = r.a,
      [bx, bz] = r.b;
    const length = Math.hypot(bx - ax, bz - az);
    return { ax, az, dx: (bx - ax) / length, dz: (bz - az) / length, length, half: r.width / 2 };
  });
  // The lots' cells (convex quads) by 8 m grid cell.
  const CELL = 8;
  const grid = new Map<string, number[][]>();
  for (const c of lots) {
    const xs = [c[0]!, c[2]!, c[4]!, c[6]!],
      zs = [c[1]!, c[3]!, c[5]!, c[7]!];
    for (let i = Math.floor(Math.min(...xs) / CELL); i <= Math.floor(Math.max(...xs) / CELL); i++)
      for (
        let j = Math.floor(Math.min(...zs) / CELL);
        j <= Math.floor(Math.max(...zs) / CELL);
        j++
      ) {
        const k = `${i}:${j}`;
        grid.set(k, [...(grid.get(k) ?? []), c]);
      }
  }
  /** Inside a convex quad given by its corners in order (either winding). */
  const inside = (c: number[], x: number, z: number) => {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const ax = c[i * 2]!,
        az = c[i * 2 + 1]!,
        bx = c[((i + 1) % 4) * 2]!,
        bz = c[((i + 1) % 4) * 2 + 1]!;
      const cross = (bx - ax) * (z - az) - (bz - az) * (x - ax);
      if (Math.abs(cross) < 1e-9) continue;
      const s = Math.sign(cross);
      if (sign && s !== sign) return false;
      sign = s;
    }
    return true;
  };
  return (x: number, z: number): number | null => {
    let top: number | null = null;
    const g = roads.at(x, z, true, 0);
    if (g !== null) top = g + ROAD_GRADE.lift;
    for (const r of runways) {
      const t = (x - r.ax) * r.dx + (z - r.az) * r.dz,
        o = -(x - r.ax) * r.dz + (z - r.az) * r.dx;
      if (t < 0 || t > r.length || Math.abs(o) > r.half) continue;
      const h = pavedHeight(drawn, x, z, RUNWAY_LIFT);
      if (top === null || h > top) top = h;
    }
    for (const c of grid.get(`${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`) ?? [])
      if (inside(c, x, z)) {
        // As drawn: the cell's corners at their lot height, the face between them.
        const ex = c[2]! - c[0]!,
          ez = c[3]! - c[1]!,
          fx = c[6]! - c[0]!,
          fz = c[7]! - c[1]!;
        const u = ((x - c[0]!) * ex + (z - c[1]!) * ez) / (ex * ex + ez * ez),
          v = ((x - c[0]!) * fx + (z - c[1]!) * fz) / (fx * fx + fz * fz);
        const y = (i: number) => lotHeight(drawn, c[i]!, c[i + 1]!) + LOT_LIFT;
        const h = (y(0) * (1 - u) + y(2) * u) * (1 - v) + (y(6) * (1 - u) + y(4) * u) * v;
        if (top === null || h > top) top = h;
        break;
      }
    return top;
  };
}

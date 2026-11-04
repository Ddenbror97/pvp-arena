import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import type { Placement } from "./layout";
import type { ModelManifest } from "./props-renderer";
import { WORLD_HALF, type WorldMeta } from "./world";

/**
 * The tactical map's base picture (owner's BR spec §5: "the ENTIRE playable world … generated
 * from existing map data"): drawn once per client from the very data the game runs on, so it
 * is exact by construction:
 *  - terrain: land cover colours, hill shading from the heightfield, 20 m contours, snow;
 *  - water: the sea (depth-tinted), lakes (their levels), rivers (centrelines and widths);
 *  - roads, bridges, the dam and runways (world metadata);
 *  - every building and large structure from the layout (footprints from the model manifest);
 *  - named places, the 1 km grid with its A–J / 1–10 labels.
 * Built in slices (`step`) so it never stalls a frame; the dynamic layers (zones, you, the
 * waypoint) are drawn over it by the map view. World → map: px = (x + 5000) / 10000 × size.
 */
export type MapSource = {
  hf: Heightfield;
  cover: LandCoverMap;
  meta: WorldMeta;
  layout: readonly Placement[];
  manifest: ModelManifest;
};

/** Land cover colours (RGB), by class id: water, sand, grass, field, forest, rock, urban, road. */
const COVER: Array<[number, number, number]> = [
  [34, 66, 88],
  [196, 182, 140],
  [108, 128, 78],
  [146, 140, 88],
  [62, 86, 52],
  [128, 122, 112],
  [150, 147, 138],
  [96, 94, 90],
];

export const MAP_SIZE = 2048;
const toPx = (v: number, size: number) => ((v + WORLD_HALF) / (2 * WORLD_HALF)) * size;

/** A builder: call `step()` until it returns true; `canvas` is complete then. */
export function tacticalMapBuilder(src: MapSource, size = MAP_SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(size, size);
  const m = (2 * WORLD_HALF) / size; // metres per pixel
  const heights = new Float32Array((size + 1) * 2);
  let row = 0,
    vectors = false;
  const water = (x: number, z: number, h: number): number | null => {
    if (h < 0) return 0;
    for (const w of src.meta.waterBodies) {
      const [x0, z0, x1, z1] = w.bounds;
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && h < w.level) return w.level;
    }
    return null;
  };
  /** Rasterise a band of rows (terrain); then the vector layers in one go. */
  function step(rows = 48): boolean {
    if (row < size) {
      const end = Math.min(size, row + rows);
      for (let j = row; j < end; j++) {
        const z = -WORLD_HALF + (j + 0.5) * m;
        for (let i = 0; i < size; i++) {
          const x = -WORLD_HALF + (i + 0.5) * m;
          const h = src.hf.heightAt(x, z);
          const o = (j * size + i) * 4;
          const lvl = water(x, z, h);
          if (lvl !== null) {
            // Deeper water darker; a light rim at the shore.
            const d = Math.min(1, (lvl - h) / 18);
            img.data[o] = 52 - d * 26;
            img.data[o + 1] = 92 - d * 34;
            img.data[o + 2] = 112 - d * 30;
            img.data[o + 3] = 255;
            continue;
          }
          const c = COVER[src.cover.classIdAt(x, z)] ?? COVER[2]!;
          // Hill shading: light from the north-west, 45° up.
          const dx = src.hf.heightAt(x + m, z) - src.hf.heightAt(x - m, z),
            dz = src.hf.heightAt(x, z + m) - src.hf.heightAt(x, z - m);
          const nx = -dx / (2 * m),
            nz = -dz / (2 * m);
          const len = Math.hypot(nx, nz, 1);
          const lambert = (nx * -0.5 + nz * -0.5 + 0.707) / len;
          let shade = 0.55 + lambert * 0.62;
          // Contours every 20 m (a faint dark line where a level is crossed).
          const level = Math.floor(h / 20);
          if (i > 0 && heights[i - 1] !== undefined && level !== Math.floor(heights[i - 1]! / 20))
            shade *= 0.86;
          heights[i] = h;
          let [r, gg, b] = c;
          if (h > 330) [r, gg, b] = [226, 228, 230];
          img.data[o] = Math.min(255, r * shade);
          img.data[o + 1] = Math.min(255, gg * shade);
          img.data[o + 2] = Math.min(255, b * shade);
          img.data[o + 3] = 255;
        }
      }
      row = end;
      if (row >= size) g.putImageData(img, 0, 0);
      return false;
    }
    if (!vectors) {
      drawVectors(g, src, size);
      vectors = true;
    }
    return true;
  }
  return { canvas, step, progress: () => row / size };
}

function drawVectors(g: CanvasRenderingContext2D, src: MapSource, size: number) {
  const P = (v: number) => toPx(v, size);
  const s = size / (2 * WORLD_HALF); // px per metre
  g.lineCap = g.lineJoin = "round";
  // Rivers (centrelines with their widths), over the terrain.
  g.strokeStyle = "rgb(48, 88, 108)";
  for (const r of src.meta.rivers) {
    g.lineWidth = Math.max(1.5, r.width * s);
    g.beginPath();
    r.points.forEach(([x, z], k) => (k ? g.lineTo(P(x), P(z)) : g.moveTo(P(x), P(z))));
    g.stroke();
  }
  // Runways.
  for (const rw of src.meta.runways) {
    g.strokeStyle = "rgb(70, 70, 72)";
    g.lineWidth = Math.max(3, rw.width * s);
    g.lineCap = "butt";
    g.beginPath();
    g.moveTo(P(rw.a[0]), P(rw.a[1]));
    g.lineTo(P(rw.b[0]), P(rw.b[1]));
    g.stroke();
    g.strokeStyle = "rgba(235, 235, 225, 0.7)";
    g.lineWidth = 1;
    g.setLineDash([6, 6]);
    g.stroke();
    g.setLineDash([]);
    g.lineCap = "round";
  }
  // Roads: a dark casing, then the pale surface.
  const road = (width: number, colour: string) => {
    g.strokeStyle = colour;
    g.lineWidth = width;
    for (const r of src.meta.roads) {
      if (r.points.length < 2) continue;
      g.beginPath();
      r.points.forEach(([x, z], k) => (k ? g.lineTo(P(x), P(z)) : g.moveTo(P(x), P(z))));
      g.stroke();
    }
  };
  road(Math.max(2.4, 9 * s + 1.4), "rgba(40, 38, 34, 0.55)");
  road(Math.max(1.3, 9 * s), "rgb(222, 214, 192)");
  // Buildings and large structures: their footprints, dark roofs with a light edge.
  const big = new Set(["building", "hero", "structure", "aircraft"]);
  g.fillStyle = "rgb(58, 56, 54)";
  g.strokeStyle = "rgba(235, 230, 215, 0.55)";
  g.lineWidth = 0.6;
  for (const p of src.layout) {
    const def = src.manifest.models[p.model];
    if (!def || !big.has(def.class)) continue;
    const [w, , d] = def.size as [number, number, number];
    const [fw, fd] = p.turn % 2 ? [d, w] : [w, d];
    if (Math.max(fw, fd) < 4) continue;
    const x = P(p.x - fw / 2),
      z = P(p.z - fd / 2);
    const pw = Math.max(1.2, fw * s),
      pd = Math.max(1.2, fd * s);
    g.fillRect(x, z, pw, pd);
    if (pw > 3) g.strokeRect(x, z, pw, pd);
  }
  // Bridges and the dam: bright decks with dark edges.
  for (const b of src.meta.bridges) {
    g.lineCap = "butt";
    g.strokeStyle = "rgb(30, 30, 30)";
    g.lineWidth = Math.max(4, b.width * s + 2.5);
    g.beginPath();
    g.moveTo(P(b.a[0]), P(b.a[1]));
    g.lineTo(P(b.b[0]), P(b.b[1]));
    g.stroke();
    g.strokeStyle = b.solid ? "rgb(200, 198, 190)" : "rgb(244, 240, 228)";
    g.lineWidth = Math.max(2.5, b.width * s);
    g.stroke();
  }
  g.lineCap = "round";
  // The 1 km grid and its labels (columns A–J west to east, rows 1–10 north to south).
  g.strokeStyle = "rgba(255, 255, 255, 0.16)";
  g.lineWidth = 1;
  for (let k = 1; k < 10; k++) {
    const v = (k / 10) * size;
    g.beginPath();
    g.moveTo(v, 0);
    g.lineTo(v, size);
    g.moveTo(0, v);
    g.lineTo(size, v);
    g.stroke();
  }
  const font = Math.round(size / 85);
  g.font = `600 ${font}px Inter, system-ui, sans-serif`;
  g.textBaseline = "top";
  g.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let k = 0; k < 10; k++) {
    g.fillText("ABCDEFGHIJ"[k]!, (k / 10) * size + 6, 6);
    g.fillText(String(k + 1), 6, (k / 10) * size + font + 10);
  }
  // Named places: upper case, letter-spaced, with a dark halo.
  g.textAlign = "center";
  g.textBaseline = "middle";
  const label = Math.round(size / 70);
  g.font = `700 ${label}px Inter, system-ui, sans-serif`;
  // Close places (West Point, Island Village, the Superstore) must not print over each other:
  // each name takes the first free spot of its own position, just below, above, then further.
  const taken: Array<[number, number, number, number]> = [];
  const free = (x0: number, y0: number, x1: number, y1: number) =>
    taken.every(([a, b, c, d]) => x1 < a || x0 > c || y1 < b || y0 > d);
  for (const p of src.meta.pois) {
    const text = p.name.toUpperCase().split("").join(String.fromCharCode(8202));
    const w = g.measureText(text).width / 2 + 4,
      h = label * 0.62;
    const x = P(p.x);
    let y = P(p.z);
    for (const dy of [0, 1.3, -1.3, 2.6, -2.6, 3.9]) {
      const yy = P(p.z) + dy * label;
      if (free(x - w, yy - h, x + w, yy + h)) {
        y = yy;
        break;
      }
    }
    taken.push([x - w, y - h, x + w, y + h]);
    g.lineWidth = 4;
    g.strokeStyle = "rgba(10, 12, 14, 0.75)";
    g.strokeText(text, x, y);
    g.fillStyle = "rgb(244, 241, 232)";
    g.fillText(text, x, y);
  }
  g.textAlign = "start";
  // The map's border.
  g.strokeStyle = "rgba(255, 255, 255, 0.35)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, size - 2, size - 2);
}

/** World metres → map pixels (base canvas of `size`). */
export const worldToMap = (x: number, z: number, size = MAP_SIZE): [number, number] => [
  toPx(x, size),
  toPx(z, size),
];
/** Map pixels → world metres. */
export const mapToWorld = (px: number, pz: number, size = MAP_SIZE): [number, number] => [
  (px / size) * 2 * WORLD_HALF - WORLD_HALF,
  (pz / size) * 2 * WORLD_HALF - WORLD_HALF,
];
/** The 1 km grid reference of a point, as on the map ("F9"). */
export const gridRefAt = (x: number, z: number) =>
  `${"ABCDEFGHIJ"[Math.max(0, Math.min(9, Math.floor((x + WORLD_HALF) / 1000)))]}${Math.max(1, Math.min(10, Math.floor((z + WORLD_HALF) / 1000) + 1))}`;

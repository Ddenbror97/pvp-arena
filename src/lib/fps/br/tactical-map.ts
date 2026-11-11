import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import type { Placement } from "./layout";
import type { ModelManifest } from "./props-renderer";
import { WORLD_HALF, type WorldMeta } from "./world";
import { ZIP_START, ZIPLINE } from "./zipline";

/**
 * The tactical map's base picture (owner's BR spec §5: "the ENTIRE playable world … generated
 * from existing map data"): drawn once per client from the very data the game runs on, so it
 * is exact by construction:
 *  - terrain: land cover colours textured like an aerial photograph (canopy, fields, rock on
 *    steep ground), hill shading from the heightfield, snow on the high tops (2026-11-11);
 *  - water: the sea (depth-tinted), lakes (their levels), rivers (centrelines and widths);
 *  - roads, bridges, the dam and runways (world metadata);
 *  - every building and large structure from the layout (footprints from the model manifest);
 *  - named places on dark tags, the 1 km grid with its A–J / 1–10 tabs, a 1 km scale bar;
 *  - the minimap's picture (`minimap()`): the same, without the names and the grid.
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

/**
 * Land cover colours (RGB), by class id: water, sand, grass, field, forest, rock, urban, road.
 * The look of an aerial photograph (owner, 2026-11-11: the reference map): saturated greens, a
 * dark mottled forest canopy, warm fields, grey-brown rock, pale concrete.
 */
const COVER: Array<[number, number, number]> = [
  [30, 72, 96],
  [214, 198, 150],
  [112, 138, 66],
  [156, 148, 82],
  [44, 76, 38],
  [134, 124, 108],
  [158, 156, 148],
  [118, 116, 110],
];
/** Snow on the high flat tops (as the terrain shader: 395–425 m, less on steep ground). */
const SNOW = { from: 395, to: 425, colour: [236, 240, 244] as [number, number, number] };

export const MAP_SIZE = 2048;
const toPx = (v: number, size: number) => ((v + WORLD_HALF) / (2 * WORLD_HALF)) * size;

/** Tileable value noise in [0, 1] (texture for canopy, fields and rock), deterministic. */
function noiseTile(n: number, cells: number, seed: number) {
  const lattice = new Float32Array(cells * cells);
  let s = seed >>> 0;
  for (let i = 0; i < lattice.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    lattice[i] = s / 4294967296;
  }
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const fx = (x / n) * cells,
        fy = (y / n) * cells;
      const x0 = Math.floor(fx),
        y0 = Math.floor(fy);
      const tx = fx - x0,
        ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx),
        sy = ty * ty * (3 - 2 * ty);
      const at = (i: number, j: number) => lattice[(j % cells) * cells + (i % cells)]!;
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      out[y * n + x] = a + (b - a) * sy;
    }
  return out;
}

/** A builder: call `step()` until it returns true; `canvas` is complete then. */
export function tacticalMapBuilder(src: MapSource, size = MAP_SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(size, size);
  const m = (2 * WORLD_HALF) / size; // metres per pixel
  // Texture: a fine canopy grain (a few pixels: tree crowns), a field-sized mottle and broad
  // patches, sampled by map pixel.
  const T = 256;
  const fine = noiseTile(T, 64, 7),
    mid = noiseTile(T, 16, 19),
    broad = noiseTile(T, 4, 31);
  const tex = (n: Float32Array, i: number, j: number) => n[(j % T) * T + (i % T)]!;
  let row = 0,
    vectors = false;
  /** The minimap's picture: the terrain and the vectors, without the labels and the grid. */
  let mini: HTMLCanvasElement | null = null;
  const waterLevel = (x: number, z: number, h: number): number | null => {
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
          const lvl = waterLevel(x, z, h);
          if (lvl !== null) {
            // Turquoise shallows to deep navy; a pale line of surf where it meets land.
            const d = Math.min(1, Math.max(0, (lvl - h) / 22));
            const shore =
              waterLevel(x + m * 1.5, z, src.hf.heightAt(x + m * 1.5, z)) === null ||
              waterLevel(x - m * 1.5, z, src.hf.heightAt(x - m * 1.5, z)) === null ||
              waterLevel(x, z + m * 1.5, src.hf.heightAt(x, z + m * 1.5)) === null ||
              waterLevel(x, z - m * 1.5, src.hf.heightAt(x, z - m * 1.5)) === null;
            const ripple = 0.94 + tex(mid, i, j) * 0.12;
            let r = (64 - d * 50) * ripple,
              gg = (140 - d * 92) * ripple,
              b = (150 - d * 76) * ripple;
            if (shore)
              [r, gg, b] = [r * 0.4 + 190 * 0.6, gg * 0.4 + 214 * 0.6, b * 0.4 + 210 * 0.6];
            img.data[o] = r;
            img.data[o + 1] = gg;
            img.data[o + 2] = b;
            img.data[o + 3] = 255;
            continue;
          }
          // The land cover is a grid of cells: sampled a little off the pixel (by the texture)
          // its edges read as the ragged edges of woods and fields, not as stair steps.
          const jx = (tex(mid, i, j) - 0.5) * 14 + (tex(fine, j, i) - 0.5) * 6,
            jz = (tex(mid, j, i) - 0.5) * 14 + (tex(fine, i, j) - 0.5) * 6;
          const cls = src.cover.classIdAt(x + jx, z + jz);
          let [r, gg, b] = COVER[cls] ?? COVER[2]!;
          // Hill shading: light from the north-west, 45° up, a little exaggerated (relief reads
          // like a photograph from altitude), with a soft skylight floor.
          const dx = src.hf.heightAt(x + m, z) - src.hf.heightAt(x - m, z),
            dz = src.hf.heightAt(x, z + m) - src.hf.heightAt(x, z - m);
          const nx = (-dx / (2 * m)) * 1.6,
            nz = (-dz / (2 * m)) * 1.6;
          const len = Math.hypot(nx, nz, 1);
          const lambert = Math.max(0, (nx * -0.5 + nz * -0.5 + 0.707) / len);
          const slope = Math.hypot(dx, dz) / (2 * m);
          let shade = 0.42 + lambert * 0.78;
          const f = tex(fine, i, j),
            md = tex(mid, i, j),
            br = tex(broad, i, j);
          if (cls === 4) {
            // Forest: crowns (light) and the gaps between them (dark), patches of lighter trees.
            const crown = f > 0.55 ? 1.18 : f < 0.3 ? 0.72 : 1;
            shade *= crown * (0.9 + md * 0.22);
            r += (br - 0.5) * 14;
            gg += (br - 0.5) * 22;
          } else if (cls === 2 || cls === 3) {
            // Grass and fields: broad patches of greener and drier ground.
            shade *= 0.92 + md * 0.16;
            r += (br - 0.5) * 26;
            gg += (br - 0.5) * 18;
            b += (br - 0.5) * 6;
          } else if (cls === 5) {
            // Rock: streaked, darker in the gullies.
            shade *= 0.85 + f * 0.25;
          } else shade *= 0.95 + f * 0.1;
          // Steep ground shows rock whatever grows there.
          const rocky = Math.min(1, Math.max(0, (slope - 0.7) / 0.5));
          if (rocky > 0 && cls !== 6 && cls !== 7) {
            r += (COVER[5]![0] - r) * rocky;
            gg += (COVER[5]![1] - gg) * rocky;
            b += (COVER[5]![2] - b) * rocky;
          }
          // Snow on the high tops, blue-white in the shade.
          const snow =
            Math.min(1, Math.max(0, (h + (md - 0.5) * 50 - SNOW.from) / (SNOW.to - SNOW.from))) *
            (1 - Math.min(1, Math.max(0, (slope - 0.6) / 0.6)));
          if (snow > 0) {
            r += (SNOW.colour[0] - r) * snow;
            gg += (SNOW.colour[1] - gg) * snow;
            b += (SNOW.colour[2] - b) * snow;
          }
          img.data[o] = Math.min(255, r * shade * (snow > 0.5 ? 0.98 : 1));
          img.data[o + 1] = Math.min(255, gg * shade);
          img.data[o + 2] = Math.min(255, b * shade * (snow > 0.5 ? 1.06 : 1));
          img.data[o + 3] = 255;
        }
      }
      row = end;
      if (row >= size) g.putImageData(img, 0, 0);
      return false;
    }
    if (!vectors) {
      drawVectors(g, src, size);
      mini = document.createElement("canvas");
      mini.width = mini.height = 512;
      mini.getContext("2d")!.drawImage(canvas, 0, 0, 512, 512);
      drawLabels(g, src, size);
      vectors = true;
    }
    return true;
  }
  return { canvas, step, progress: () => row / size, minimap: () => mini };
}

function drawVectors(g: CanvasRenderingContext2D, src: MapSource, size: number) {
  const P = (v: number) => toPx(v, size);
  const s = size / (2 * WORLD_HALF); // px per metre
  g.lineCap = g.lineJoin = "round";
  // Rivers (centrelines with their widths): a darker bank, then the water.
  for (const [extra, colour] of [
    [2, "rgba(30, 52, 40, 0.55)"],
    [0, "rgb(42, 104, 124)"],
  ] as const) {
    g.strokeStyle = colour;
    for (const r of src.meta.rivers) {
      g.lineWidth = Math.max(1.5, r.width * s) + extra;
      g.beginPath();
      r.points.forEach(([x, z], k) => (k ? g.lineTo(P(x), P(z)) : g.moveTo(P(x), P(z))));
      g.stroke();
    }
  }
  // Runways: dark asphalt, a pale centre line and edge stripes.
  for (const rw of src.meta.runways) {
    g.lineCap = "butt";
    g.strokeStyle = "rgb(58, 60, 62)";
    g.lineWidth = Math.max(3, rw.width * s);
    g.beginPath();
    g.moveTo(P(rw.a[0]), P(rw.a[1]));
    g.lineTo(P(rw.b[0]), P(rw.b[1]));
    g.stroke();
    g.strokeStyle = "rgba(240, 240, 232, 0.8)";
    g.lineWidth = 1;
    g.setLineDash([7, 6]);
    g.stroke();
    g.setLineDash([]);
    g.lineCap = "round";
  }
  // Roads: a soft dark casing, then the pale surface (town streets and country roads alike).
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
  road(Math.max(2.6, 9 * s + 1.6), "rgba(28, 30, 24, 0.5)");
  road(Math.max(1.4, 9 * s), "rgb(206, 202, 188)");
  // Buildings and large structures: their footprints, a shadow to the south-east (they read
  // as raised, like roofs from the air), roofs coloured by kind.
  const big = new Set(["building", "hero", "structure", "aircraft"]);
  const roofs = {
    dwelling: ["rgb(150, 82, 62)", "rgb(122, 76, 60)", "rgb(168, 160, 150)", "rgb(98, 92, 88)"],
    other: ["rgb(196, 194, 188)", "rgb(176, 178, 176)", "rgb(160, 164, 168)", "rgb(206, 202, 192)"],
  };
  const hash = (x: number, z: number) => {
    let h = Math.imul(Math.round(x) ^ 0x2545f491, 0x9e3779b1) ^ Math.round(z * 7);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    return ((h ^ (h >>> 13)) >>> 0) % 4;
  };
  const boxes: Array<[number, number, number, number, string]> = [];
  for (const p of src.layout) {
    const def = src.manifest.models[p.model];
    if (!def || !big.has(def.class)) continue;
    const [w, , d] = def.size as [number, number, number];
    const [fw, fd] = p.turn % 2 ? [d, w] : [w, d];
    if (Math.max(fw, fd) < 4) continue;
    const pw = Math.max(1.2, fw * s),
      pd = Math.max(1.2, fd * s);
    const ring = (def as { ring?: string }).ring;
    const set = ring === "dwelling" || ring === "outbuilding" ? roofs.dwelling : roofs.other;
    boxes.push([P(p.x - fw / 2), P(p.z - fd / 2), pw, pd, set[hash(p.x, p.z)]!]);
  }
  g.fillStyle = "rgba(10, 14, 10, 0.45)";
  for (const [x, z, w, d] of boxes) g.fillRect(x + 1.2, z + 1.2, w, d);
  g.lineWidth = 0.6;
  g.strokeStyle = "rgba(30, 30, 28, 0.6)";
  for (const [x, z, w, d, c] of boxes) {
    g.fillStyle = c;
    g.fillRect(x, z, w, d);
    if (w > 3) g.strokeRect(x, z, w, d);
  }
  // Bridges and the dam: bright decks with dark edges.
  for (const b of src.meta.bridges) {
    g.lineCap = "butt";
    g.strokeStyle = "rgb(28, 30, 30)";
    g.lineWidth = Math.max(4, b.width * s + 2.5);
    g.beginPath();
    g.moveTo(P(b.a[0]), P(b.a[1]));
    g.lineTo(P(b.b[0]), P(b.b[1]));
    g.stroke();
    g.strokeStyle = b.solid ? "rgb(200, 198, 190)" : "rgb(232, 230, 222)";
    g.lineWidth = Math.max(2.5, b.width * s);
    g.stroke();
  }
  g.lineCap = "round";
  // The Iron Peaks zip-line: a thin dark cable from the tower to Pine Ridge.
  g.strokeStyle = "rgba(20, 20, 20, 0.8)";
  g.lineWidth = 1.2;
  g.setLineDash([5, 3]);
  g.beginPath();
  g.moveTo(P(ZIP_START.x), P(ZIP_START.z));
  g.lineTo(P(ZIPLINE.end.x), P(ZIPLINE.end.z));
  g.stroke();
  g.setLineDash([]);
}

/** Names, the grid and its references, the scale bar and the frame, over the picture. */
function drawLabels(g: CanvasRenderingContext2D, src: MapSource, size: number) {
  const P = (v: number) => toPx(v, size);
  // The 1 km grid: fine lines, A–J along the top, 1–10 down the left, on small dark tabs.
  g.strokeStyle = "rgba(220, 235, 245, 0.14)";
  g.lineWidth = 1;
  for (let k = 1; k < 10; k++) {
    const v = Math.round((k / 10) * size) + 0.5;
    g.beginPath();
    g.moveTo(v, 0);
    g.lineTo(v, size);
    g.moveTo(0, v);
    g.lineTo(size, v);
    g.stroke();
  }
  const font = Math.round(size / 80);
  g.font = `700 ${font}px Inter, system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const tab = (text: string, x: number, y: number) => {
    const w = Math.max(font * 1.4, g.measureText(text).width + font * 0.8),
      h = font * 1.45;
    g.fillStyle = "rgba(12, 22, 32, 0.62)";
    roundRect(g, x - w / 2, y - h / 2, w, h, h * 0.25);
    g.fill();
    g.fillStyle = "rgba(235, 242, 248, 0.92)";
    g.fillText(text, x, y + 1);
  };
  for (let k = 0; k < 10; k++) {
    tab("ABCDEFGHIJ"[k]!, ((k + 0.5) / 10) * size, font * 1.2);
    tab(String(k + 1), font * 1.3, ((k + 0.5) / 10) * size);
  }
  // Named places: upper case on a dark tag (owner's reference map), letter-spaced.
  const label = Math.round(size / 68);
  g.font = `800 ${label}px Inter, system-ui, sans-serif`;
  // Close places (West Point, Island Village, the Superstore) must not print over each other:
  // each name takes the first free spot of its own position, just below, above, then further.
  const taken: Array<[number, number, number, number]> = [];
  const free = (x0: number, y0: number, x1: number, y1: number) =>
    taken.every(([a, b, c, d]) => x1 < a || x0 > c || y1 < b || y0 > d);
  for (const p of src.meta.pois) {
    const text = p.name.toUpperCase().split("").join(String.fromCharCode(8202));
    const w = g.measureText(text).width / 2 + label * 0.55,
      h = label * 0.78;
    const x = Math.min(size - w - 4, Math.max(w + 4, P(p.x)));
    let y = P(p.z);
    for (const dy of [0, 1.6, -1.6, 3.2, -3.2, 4.8]) {
      const yy = P(p.z) + dy * label;
      if (free(x - w, yy - h, x + w, yy + h)) {
        y = yy;
        break;
      }
    }
    taken.push([x - w, y - h, x + w, y + h]);
    g.fillStyle = "rgba(14, 18, 22, 0.72)";
    roundRect(g, x - w, y - h, w * 2, h * 2, h * 0.35);
    g.fill();
    g.strokeStyle = "rgba(255, 255, 255, 0.14)";
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = "rgb(246, 244, 238)";
    g.fillText(text, x, y + 1);
  }
  // Scale bar: 1 km, bottom left.
  const km = size / 10,
    sx = font * 3.6,
    sy = size - font * 2.4;
  g.fillStyle = "rgba(12, 22, 32, 0.62)";
  roundRect(g, sx - font * 0.6, sy - font * 1.9, km + font * 1.2, font * 2.8, font * 0.3);
  g.fill();
  g.strokeStyle = "rgba(240, 244, 248, 0.95)";
  g.lineWidth = 2;
  g.lineCap = "butt";
  g.beginPath();
  g.moveTo(sx, sy - 4);
  g.lineTo(sx, sy);
  g.lineTo(sx + km, sy);
  g.lineTo(sx + km, sy - 4);
  g.stroke();
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = "rgba(240, 244, 248, 0.95)";
  g.font = `700 ${font}px Inter, system-ui, sans-serif`;
  g.fillText("1 km", sx, sy - font * 0.55);
  g.textAlign = "start";
  // The map's border.
  g.strokeStyle = "rgba(200, 220, 235, 0.35)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, size - 2, size - 2);
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
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

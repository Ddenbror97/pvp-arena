import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import type { Placement } from "./layout";
import type { ModelManifest } from "./props-renderer";
import { WORLD_HALF, type WorldMeta } from "./world";
import { ZIPLINES } from "./zipline";
import { terrainRasteriser } from "./tactical-map-terrain";
import type { TerrainReply, TerrainRequest } from "./tactical-map.worker";

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

export const MAP_SIZE = 2048;
const toPx = (v: number, size: number) => ((v + WORLD_HALF) / (2 * WORLD_HALF)) * size;

/**
 * The terrain picture from a worker (tactical-map.worker.ts): `done(bitmap)` when it is drawn,
 * `done(null)` if the worker fails. Null where a worker cannot be started at all (no Worker or
 * ImageBitmap, or the script is not there, as in the single-file check harnesses).
 */
function terrainWorker(src: MapSource, size: number, done: (bitmap: ImageBitmap | null) => void) {
  if (typeof Worker === "undefined" || typeof createImageBitmap === "undefined") return null;
  try {
    const worker = new Worker(new URL("./tactical-map.worker.ts", import.meta.url), {
      type: "module",
    });
    const fail = () => {
      worker.terminate();
      done(null);
    };
    worker.onmessage = (e: MessageEvent<TerrainReply>) => {
      worker.terminate();
      done(e.data.bitmap);
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
    // Copies of the height and cover grids (the game keeps using its own).
    const request: TerrainRequest = {
      size,
      hf: {
        width: src.hf.width,
        height: src.hf.height,
        spacing: src.hf.spacing,
        data: src.hf.data,
      },
      cover: { width: src.cover.width, height: src.cover.height, data: src.cover.data },
      waterBodies: src.meta.waterBodies.map((w) => ({ level: w.level, bounds: w.bounds })),
    };
    worker.postMessage(request);
    return worker;
  } catch {
    return null;
  }
}

/**
 * A builder: call `step()` until it returns true; `canvas` is complete then. The terrain comes
 * from a worker; `step(rows, false)` stops waiting for it and rasterises here instead.
 */
export function tacticalMapBuilder(src: MapSource, size = MAP_SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  /** The pixels, when the terrain is rasterised on this thread (67 MB at 4096 px: only then). */
  let img: ImageData | null = null;
  const src3 = { hf: src.hf, cover: src.cover, waterBodies: src.meta.waterBodies };
  let rows: ReturnType<typeof terrainRasteriser> | null = null;
  let row = 0,
    vectors = false;
  /** The minimap's picture: the terrain and the vectors, without the labels and the grid. */
  let mini: HTMLCanvasElement | null = null;
  // The terrain is drawn by a worker where one starts; `step` then only waits for its picture.
  let worker = terrainWorker(src, size, (bitmap) => {
    if (!worker) return; // finished on this thread meanwhile
    worker = null;
    if (!bitmap) return; // the worker failed: `step` rasterises here instead
    g.drawImage(bitmap, 0, 0);
    bitmap.close();
    row = size;
  });
  /**
   * Advance the build: with `wait` (the default) a running worker is left to finish; without,
   * the terrain is rasterised here, `rowCount` rows a call (the map was opened before it was
   * ready). Then the vector layers in one go.
   */
  function step(rowCount = 48, wait = true): boolean {
    if (row < size) {
      if (worker) {
        if (wait) return false;
        worker.terminate();
        worker = null;
      }
      rows ??= terrainRasteriser(src3, size);
      img ??= g.createImageData(size, size);
      const end = Math.min(size, row + rowCount);
      rows(row, end, img.data);
      row = end;
      if (row >= size) {
        g.putImageData(img, 0, 0);
        img = null;
      }
      return false;
    }
    // One layer a call, so a frame that is polling pays for one of them at most.
    if (!vectors) {
      drawVectors(g, src, size);
      vectors = true;
      return false;
    }
    if (!mini) {
      mini = document.createElement("canvas");
      mini.width = mini.height = 512;
      mini.getContext("2d")!.drawImage(canvas, 0, 0, 512, 512);
      drawLabels(g, src, size);
    }
    return true;
  }
  return {
    canvas,
    step,
    /** A worker is drawing the terrain: nothing to do here until it answers. */
    waiting: () => !!worker && row < size,
    progress: () => row / size,
    minimap: () => mini,
    dispose() {
      worker?.terminate();
      worker = null;
    },
  };
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
  // The Iron Peaks zip-lines: thin dark cables (the broadcast tower to the watchtower, the
  // watchtower to Pine Ridge).
  g.strokeStyle = "rgba(20, 20, 20, 0.8)";
  g.lineWidth = 1.2;
  g.setLineDash([5, 3]);
  g.beginPath();
  for (const l of ZIPLINES) {
    g.moveTo(P(l.start.x), P(l.start.z));
    g.lineTo(P(l.end.x), P(l.end.z));
  }
  g.stroke();
  g.setLineDash([]);
}

/**
 * Landmarks named on the map by their models (one per `cluster` metres): what a player looks for
 * between the named places.
 */
const LANDMARKS: Record<string, { name: string; color: string; cluster: number }> = {
  lighthouse: { name: "Lighthouse", color: "rgb(255, 214, 102)", cluster: 500 },
  "rail-depot": { name: "Rail Depot", color: "rgb(200, 200, 200)", cluster: 500 },
  "brick-substation": { name: "Power Station", color: "rgb(255, 196, 64)", cluster: 500 },
  "lux-yacht": { name: "Super Yacht", color: "rgb(120, 200, 255)", cluster: 500 },
  "pool-villa": { name: "Villas", color: "rgb(150, 220, 140)", cluster: 600 },
  "roadside-gas": { name: "Gas", color: "rgb(255, 140, 90)", cluster: 150 },
  "roadside-motel": { name: "Motel", color: "rgb(255, 140, 90)", cluster: 150 },
  "modular-motel": { name: "Motel", color: "rgb(255, 140, 90)", cluster: 150 },
};

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
  // Named places: upper case on a dark tag (owner's reference map), letter-spaced. The towns'
  // names sit over their streets; a compact site's (the hospital, Skyline Residences, the
  // prison, the base, the works) above its pad with a pin at its middle, so the name no longer
  // hides the place (owner, 2026-11-13: "upgrade the ingame map (M) with the new citys/areas eg
  // the sky skreper location"). Small places take a smaller tag.
  const label = Math.round(size / 68);
  // Close places (West Point, Island Village, the Superstore) must not print over each other:
  // each name takes the first free spot of its own position, just below, above, then further.
  const taken: Array<[number, number, number, number]> = [];
  const free = (x0: number, y0: number, x1: number, y1: number) =>
    taken.every(([a, b, c, d]) => x1 < a || x0 > c || y1 < b || y0 > d);
  const pin = (x: number, y: number, r: number, fill: string) => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = "rgba(14, 18, 22, 0.85)";
    g.fill();
    g.beginPath();
    g.arc(x, y, r * 0.55, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  };
  // The loading screen's place names (owner, 2026-11-13: "match the style of the loading screen
  // text"): heavy upper case in white over a dark halo, no tag box.
  const FACE = (px: number) => `800 ${px}px Inter, system-ui, sans-serif`;
  const tight = (px: number) => {
    // Canvas letter spacing where supported: the loading art's names are set slightly open.
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${(0.02 * px).toFixed(2)}px`;
  };
  const tag = (text: string, x: number, y: number, px: number) => {
    g.font = FACE(px);
    tight(px);
    g.save();
    g.shadowColor = "rgba(0, 0, 0, 0.9)";
    g.shadowBlur = px * 0.6;
    g.shadowOffsetY = px * 0.06;
    g.lineJoin = "round";
    g.strokeStyle = "rgba(10, 12, 16, 0.75)";
    g.lineWidth = Math.max(2, px * 0.24);
    g.strokeText(text, x, y + 1);
    g.restore();
    g.fillStyle = "#ffffff";
    g.fillText(text, x, y + 1);
    tight(0);
  };
  for (const p of src.meta.pois) {
    const site = !/town|commercial|superstore/.test(String(p.kind)) && (p.padRadius ?? 0) > 0;
    const px = Math.round(label * ((p.radius ?? 400) < 300 ? 0.8 : 1));
    g.font = FACE(px);
    tight(px);
    const text = p.name.toUpperCase();
    const w = g.measureText(text).width / 2 + px * 0.55,
      h = px * 0.78;
    const x = Math.min(size - w - 4, Math.max(w + 4, P(p.x)));
    // A site's name above its pad (its pin marks the middle), a town's over its streets.
    const lift = site ? Math.min(p.padRadius! * 0.75 * (size / (2 * WORLD_HALF)), px * 3) + h : 0;
    const y0 = P(p.z) - lift;
    let y = y0;
    for (const dy of [0, -1.6, 1.6, -3.2, 3.2, 4.8]) {
      const yy = y0 + dy * px;
      if (free(x - w, yy - h, x + w, yy + h)) {
        y = yy;
        break;
      }
    }
    taken.push([x - w, y - h, x + w, y + h]);
    if (site) {
      g.strokeStyle = "rgba(14, 18, 22, 0.7)";
      g.lineWidth = Math.max(1.5, px * 0.08);
      g.beginPath();
      g.moveTo(P(p.x), y + h);
      g.lineTo(P(p.x), P(p.z));
      g.stroke();
      pin(P(p.x), P(p.z), px * 0.32, "rgb(246, 244, 238)");
    }
    tag(text, x, y, px);
  }
  // Landmarks off the named places: the lighthouse, the rail depot, the power station, the
  // villas and the yacht, and the roads' stops (filling stations, motels), on small tags with a
  // coloured pin; a tag that finds no room shows its pin only.
  const small = Math.round(label * 0.58);
  const marks: Array<{ name: string; x: number; z: number; color: string }> = [];
  const seen = (name: string, x: number, z: number, r: number) =>
    marks.some((m) => m.name === name && Math.hypot(m.x - x, m.z - z) < r);
  for (const p of src.layout) {
    const kind = LANDMARKS[p.model];
    if (!kind || seen(kind.name, p.x, p.z, kind.cluster)) continue;
    marks.push({ name: kind.name, x: p.x, z: p.z, color: kind.color });
  }
  for (const m of marks) {
    g.font = FACE(small);
    tight(small);
    const text = m.name.toUpperCase();
    const w = g.measureText(text).width / 2 + small * 0.5,
      h = small * 0.8;
    const x = P(m.x),
      y = P(m.z);
    pin(x, y, small * 0.42, m.color);
    for (const [dx, dy] of [
      [0, -1.9],
      [0, 1.9],
    ] as const) {
      const xx = Math.min(size - w - 4, Math.max(w + 4, x + dx * small)),
        yy = y + dy * small;
      if (!free(xx - w, yy - h, xx + w, yy + h)) continue;
      taken.push([xx - w, yy - h, xx + w, yy + h]);
      tag(text, xx, yy, small);
      break;
    }
  }
  tight(0);
  g.font = `700 ${font}px Inter, system-ui, sans-serif`;
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

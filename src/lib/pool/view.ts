import { BALL_R, CUSHION_V5, TABLE_H, TABLE_W } from "@/lib/pool/physics";

/** Overhead camera. Scale stays 1, so both ends of the table are the same size. */
export const FAR = 1;

/** Rail thickness as a fraction of the playing surface's short side. */
export const RAIL_OF_SHORT = 0.128;

export type View = {
  /** Cloth points. tableX is clamped to the playing surface. */
  project: (tableX: number, tableY: number) => { x: number; y: number; scale: number };
  /** Same camera, including points past the rails. Used for the cue. */
  projectOpen: (tableX: number, tableY: number) => { x: number; y: number; scale: number };
  unproject: (px: number, py: number) => { x: number; y: number };
  innerW: number;
  innerH: number;
  padX: number;
  padY: number;
  /** Pixel thickness of one rail. The cloth starts this far inside the cabinet. */
  rail: number;
};

/**
 * Length runs left to right. tableX 0 is the left rail, TABLE_W the right rail.
 * tableY 0 is the bottom rail. The cloth keeps the real 2:1 ratio and is letterboxed
 * inside the canvas, so a wide or tall screen does not stretch the cushions.
 * The mapping inverts exactly inside the cloth.
 */
export function viewOf(w: number, h: number): View {
  const fitW = Math.max(1, w - 2);
  const fitH = Math.max(1, h - 2);
  const lengthOverWidth = TABLE_W / TABLE_H;
  const short = Math.min(
    fitH / (1 + 2 * RAIL_OF_SHORT),
    fitW / (lengthOverWidth + 2 * RAIL_OF_SHORT),
  );
  const innerH = Math.max(1, short);
  const innerW = innerH * lengthOverWidth;
  const rail = RAIL_OF_SHORT * innerH;
  const padX = (w - innerW) / 2;
  const outerH = innerH + rail * 2;
  const slackY = h - outerH;
  // Spare height sits under the cloth. A cue aimed off the bottom rail needs
  // that room. A tall screen still keeps a short margin above the top rail.
  const originY = Math.max(0, slackY * 0.22);
  const padY = originY + rail;
  const place = (tableX: number, tableY: number) => ({
    x: padX + (tableX / TABLE_W) * innerW,
    y: padY + (1 - tableY / TABLE_H) * innerH,
    scale: FAR,
  });
  const project = (tableX: number, tableY: number) =>
    place(Math.min(TABLE_W, Math.max(0, tableX)), tableY);
  const unproject = (px: number, py: number) => ({
    x: ((px - padX) / innerW) * TABLE_W,
    y: (1 - (py - padY) / innerH) * TABLE_H,
  });
  return { project, projectOpen: place, unproject, innerW, innerH, padX, padY, rail };
}

/** Screen length of a table distance. innerW is the on-screen length of TABLE_W. */
export function spanPx(innerW: number, scale: number, tableUnits: number): number {
  return (tableUnits * innerW * scale) / TABLE_W;
}

export function ballRadiusPx(innerW: number, scale: number): number {
  return spanPx(innerW, scale, BALL_R);
}

/** Pixels from a ball on the bottom cushion to the bottom of a felt canvas. */
export function bottomRailClearance(w: number, h: number): number {
  const view = viewOf(Math.max(1, w), Math.max(1, h));
  const at = view.projectOpen(TABLE_W / 2, CUSHION_V5.bottom + BALL_R);
  return h - at.y;
}

/**
 * Extra pixels under the felt so a bottom-rail ball keeps `room` pixels of
 * screen below it. Stops once the felt would shrink under `minFeltH`.
 */
export function extraCueGutter(input: {
  feltW: number;
  feltH: number;
  baseBottom: number;
  room: number;
  minFeltH: number;
}): number {
  const feltW = Math.max(1, input.feltW);
  const feltH = Math.max(1, input.feltH);
  const minFeltH = Math.max(1, Math.min(input.minFeltH, feltH));
  const maxExtra = feltH - minFeltH;
  const clearance = (extra: number) =>
    input.baseBottom + extra + bottomRailClearance(feltW, Math.max(1, feltH - extra));
  if (clearance(0) >= input.room) return 0;
  if (maxExtra <= 0) return 0;
  if (clearance(maxExtra) < input.room) return Math.round(maxExtra);
  let lo = 0;
  let hi = maxExtra;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (clearance(mid) >= input.room) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi);
}

/** Farthest cue butt that still sits inside the screen bitmap. */
export function fitCueButt(
  tip: { x: number; y: number },
  butt: { x: number; y: number },
  width: number,
  height: number,
  margin: number,
): { x: number; y: number } {
  const dx = butt.x - tip.x;
  const dy = butt.y - tip.y;
  const hiX = Math.max(margin, width - margin);
  const hiY = Math.max(margin, height - margin);
  let t = axisExit(tip.x, dx, margin, hiX, 1);
  t = axisExit(tip.y, dy, margin, hiY, t);
  return { x: tip.x + dx * t, y: tip.y + dy * t };
}

function axisExit(origin: number, delta: number, lo: number, hi: number, tMax: number): number {
  if (Math.abs(delta) < 1e-6) return origin >= lo && origin <= hi ? tMax : 0;
  let near = (lo - origin) / delta;
  let far = (hi - origin) / delta;
  if (near > far) {
    const swap = near;
    near = far;
    far = swap;
  }
  const exit = Math.min(tMax, far);
  if (exit < 0) return 0;
  return exit;
}

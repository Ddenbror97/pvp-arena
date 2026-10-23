import { BALL_R, TABLE_H, TABLE_W } from "@/lib/pool/physics";

/** Overhead camera. Scale stays 1, so both ends of the table are the same size. */
export const FAR = 1;

/** Rail thickness as a fraction of the playing surface's short side. */
export const RAIL_OF_SHORT = 0.086;

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
  const originY = slackY > outerH * 0.45 ? slackY * 0.2 : slackY / 2;
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

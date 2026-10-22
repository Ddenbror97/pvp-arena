import { BALL_R, TABLE_H, TABLE_W } from "@/lib/pool/physics";

/** Far rail width as a fraction of the near rail. Mild, so the table still reads as a table. */
export const FAR = 0.74;

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
};

/**
 * Length runs up the screen. tableX 0 is the near rail, TABLE_W the far rail.
 * tableY 0 is the left rail. The mapping inverts exactly inside the cloth.
 */
export function viewOf(w: number, h: number): View {
  const padX = w * 0.095;
  const padY = h * 0.09;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const place = (tableX: number, tableY: number) => {
    const t = tableX / TABLE_W;
    const scale = 1 + (FAR - 1) * t;
    return {
      x: w / 2 + (tableY / TABLE_H - 0.5) * innerW * scale,
      y: padY + innerH * (1 - t),
      scale,
    };
  };
  const project = (tableX: number, tableY: number) =>
    place(Math.min(TABLE_W, Math.max(0, tableX)), tableY);
  const unproject = (px: number, py: number) => {
    const t = 1 - (py - padY) / innerH;
    const scale = 1 + (FAR - 1) * t;
    return {
      x: t * TABLE_W,
      y: ((px - w / 2) / (innerW * scale) + 0.5) * TABLE_H,
    };
  };
  return { project, projectOpen: place, unproject, innerW, innerH, padX, padY };
}

/** Screen radius of a table length, using the cloth width so balls match the rails. */
export function spanPx(innerW: number, scale: number, tableUnits: number): number {
  return (tableUnits * innerW * scale) / TABLE_H;
}

export function ballRadiusPx(innerW: number, scale: number): number {
  return spanPx(innerW, scale, BALL_R);
}

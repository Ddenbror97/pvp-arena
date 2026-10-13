import { PAYLINES, ROWS, SYMBOLS, type LineWin } from "@/lib/slott/paytable";

export const LINE_COLORS = ["#ffcf4a", "#4ad7ff", "#ff5ad1", "#7dff6a", "#c9a2ff"];
/** A payline draws across its run in LINE_DRAW_MS; the next one starts LINE_GAP_MS later. */
export const LINE_DRAW_MS = 520;
export const LINE_GAP_MS = 420;

export const lineColor = (line: number) => LINE_COLORS[(line - 1) % LINE_COLORS.length]!;

/** Weakest line first so the biggest hit lands last. */
export function orderLines(lines: LineWin[]): LineWin[] {
  return [...lines].sort((a, b) => a.score - b.score || a.line - b.line);
}

/** When the drawing line reaches reel `reel` of a run of `count`. */
export function reachMs(order: number, reel: number, count: number) {
  return order * LINE_GAP_MS + Math.round((LINE_DRAW_MS * reel) / Math.max(1, count - 1));
}

export type HitCell = { delay: number; color: string; big: boolean };

/** Every winning cell with the moment its line reaches it (earliest line wins). */
export function hitCells(lines: LineWin[], big = false): Map<number, HitCell> {
  const out = new Map<number, HitCell>();
  orderLines(lines).forEach((l, i) => {
    const rows = PAYLINES[l.line - 1];
    if (!rows) return;
    for (let reel = 0; reel < l.count; reel++) {
      const cell = reel * ROWS + rows[reel]!;
      const delay = reachMs(i, reel, l.count);
      const prev = out.get(cell);
      if (!prev || delay < prev.delay) out.set(cell, { delay, color: lineColor(l.line), big });
    }
  });
  return out;
}

/** 0 common … 4 WILD; drives chime pitch and sparkle. */
export function rarityRank(symbol: number): number {
  return ["common", "rare", "epic", "legendary", "wild"].indexOf(
    SYMBOLS[symbol]?.rarity ?? "common",
  );
}

export const NO_HITS: Map<number, HitCell> = new Map();

export type WinLevel = 0 | 1 | 2 | 3;
/** 0 nothing special, 1 line hit, 2 big win, 3 mega win or WILD bonus. */
export function winLevel(lineScore: number, bonus: boolean): WinLevel {
  if (bonus || lineScore >= 250) return 3;
  if (lineScore >= 75) return 2;
  return lineScore > 0 ? 1 : 0;
}

/** Time from landing until the last line has finished drawing. */
export function hitsDoneMs(lines: LineWin[]) {
  return lines.length ? (lines.length - 1) * LINE_GAP_MS + LINE_DRAW_MS : 0;
}

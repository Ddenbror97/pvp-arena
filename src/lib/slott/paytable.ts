/**
 * P2P Slott paytable v1. Mirrors public.slot_spin_grid / public.slot_score_v1 exactly;
 * never edit v1 — add a v2 on both sides instead.
 *
 * Grid cells are reel-major: cell = reel * 4 + row (5 reels × 4 rows).
 */

export const REELS = 5;
export const ROWS = 4;
export const CELLS = REELS * ROWS;
export const WILD = 7;

export type Rarity = "common" | "rare" | "epic" | "legendary" | "wild";

export interface SlotSymbol {
  id: number;
  key: string;
  name: string;
  rarity: Rarity;
  weight: number;
  value: number;
}

const RARITY_VALUE: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 4,
  legendary: 8,
  wild: 10,
};
const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 80,
  rare: 50,
  epic: 28,
  legendary: 18,
  wild: 16,
};

const DEFS: [key: string, name: string, rarity: Rarity][] = [
  ["glove", "Glove", "common"],
  ["pistol", "Pistol", "common"],
  ["knife", "Knife", "common"],
  ["helmet", "Helmet", "common"],
  ["vest", "Horus", "common"],
  ["chest-gold", "Gold chest", "rare"],
  ["grenade", "Grenade", "common"],
  ["wild", "WILD", "wild"],
  ["crystal", "Crystal", "epic"],
  ["lightning", "Lightning", "rare"],
  ["skull", "Skull", "rare"],
  ["crown", "Crown", "epic"],
  ["star", "Eye", "epic"],
  ["fire", "Fire", "rare"],
  ["w-coin", "W coin", "rare"],
  ["gas-mask", "Anubis", "common"],
  ["dragon-coin", "Dragon coin", "epic"],
  ["diamond", "Diamond", "legendary"],
  ["chest-purple", "Purple chest", "rare"],
  ["dragon", "Dragon", "legendary"],
];

export const SYMBOLS: SlotSymbol[] = DEFS.map(([key, name, rarity], id) => ({
  id,
  key,
  name,
  rarity,
  weight: RARITY_WEIGHT[rarity],
  value: RARITY_VALUE[rarity],
}));

export const WEIGHT_TOTAL = 1024;

/** v2 only. One cell in 513 is a bomb, so a 20-cell spin hits one about 3.8% of the time. */
export const BOMB = 20;
export const BOMB_WEIGHT = 2;
export const WEIGHT_TOTAL_V2 = WEIGHT_TOTAL + BOMB_WEIGHT;

/**
 * v3 only. v1 weights are repeated 53 times and 14 rolls out of 54286 are the bomb.
 * A full match is 6 spins each (240 cells), so the house wins about 6.0% of games.
 * A single spin is about 0.51%.
 */
export const WEIGHT_SCALE_V3 = 53;
export const BOMB_WEIGHT_V3 = 14;
export const WEIGHT_TOTAL_V3 = WEIGHT_TOTAL * WEIGHT_SCALE_V3 + BOMB_WEIGHT_V3;

/** 4 rows + a V. Each entry is the row index on reels 1..5. */
export const PAYLINES: number[][] = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  [0, 1, 2, 1, 0],
];

/** Line multiplier by run length (3, 4, 5). */
export const LINE_MULT: Record<number, number> = { 3: 5, 4: 15, 5: 50 };

export interface LineWin {
  line: number;
  symbol: number;
  count: number;
  score: number;
}

export interface SpinScore {
  wilds: number;
  base: number;
  lineScore: number;
  score: number;
  lines: LineWin[];
}

export function symbolForRoll(r: number): number {
  let acc = 0;
  for (const s of SYMBOLS) {
    acc += s.weight;
    if (r < acc) return s.id;
  }
  throw new Error("roll out of range");
}

export function hasBomb(grid: readonly number[]): boolean {
  return grid.includes(BOMB);
}

/** v2 roll is mod 1026. Rolls past the v1 weights land on the bomb. */
export function symbolForRollV2(r: number): number {
  if (r < 0 || r >= WEIGHT_TOTAL_V2) throw new Error("roll out of range");
  let acc = 0;
  for (const s of SYMBOLS) {
    acc += s.weight;
    if (r < acc) return s.id;
  }
  return BOMB;
}

/** v3 roll is mod 54286. The first 54272 values repeat the v1 table; the last 14 are bombs. */
export function symbolForRollV3(r: number): number {
  if (r < 0 || r >= WEIGHT_TOTAL_V3) throw new Error("roll out of range");
  if (r >= WEIGHT_TOTAL * WEIGHT_SCALE_V3) return BOMB;
  return symbolForRoll(r % WEIGHT_TOTAL);
}

export function scoreGrid(grid: number[]): SpinScore {
  if (grid.length !== CELLS) throw new Error("Grid must have 20 cells");
  if (hasBomb(grid)) return { wilds: 0, base: 0, lineScore: 0, score: 0, lines: [] };
  let wilds = 0;
  let base = 0;
  for (const s of grid) {
    if (s === WILD) wilds++;
    base += SYMBOLS[s]!.value;
  }
  const lines: LineWin[] = [];
  PAYLINES.forEach((rows, i) => {
    const cells = rows.map((row, reel) => grid[reel * ROWS + row]!);
    const sym = cells.find((c) => c !== WILD) ?? WILD;
    let run = 0;
    for (const c of cells) {
      if (c !== sym && c !== WILD) break;
      run++;
    }
    if (run >= 3)
      lines.push({
        line: i + 1,
        symbol: sym,
        count: run,
        score: SYMBOLS[sym]!.value * LINE_MULT[run]!,
      });
  });
  const lineScore = lines.reduce((a, l) => a + l.score, 0);
  return { wilds, base, lineScore, score: base + lineScore, lines };
}

/** Cells that belong to a winning line, for highlighting. */
export function winningCells(lines: { line: number; count: number }[]): Set<number> {
  const out = new Set<number>();
  for (const l of lines) {
    const rows = PAYLINES[l.line - 1];
    if (!rows) continue;
    for (let reel = 0; reel < l.count; reel++) out.add(reel * ROWS + rows[reel]!);
  }
  return out;
}

import type { Rarity } from "@/lib/slott/paytable";

/** How long the name and score wait after the line draw before they pop. */
export const SCORE_REVEAL_DELAY_MS = 1000;
/** The callout stays readable, then fades. The seat total does not wait on this. */
export const SCORE_BURST_MS = 2600;

export function scoreRevealAtMs(tallyStartMs: number): number {
  return tallyStartMs + SCORE_REVEAL_DELAY_MS;
}

export function scoreFxEndMs(tallyStartMs: number): number {
  return scoreRevealAtMs(tallyStartMs) + SCORE_BURST_MS;
}

/** Bolt colour for a matched symbol. Presentation only. */
export function strikeColor(rarity: Rarity | undefined): string {
  if (rarity === "wild") return "#f4e2ff";
  if (rarity === "legendary") return "#ffd056";
  if (rarity === "epic") return "#d9a6ff";
  if (rarity === "rare") return "#9ad7ff";
  return "#e7f4ff";
}

/**
 * A jagged bolt through the winning cells. The first and last points are the
 * symbol centers, so the strike lands on the matches.
 */
export function lightningPolyline(rows: number[], count: number, seed: number): string {
  const n = Math.max(0, Math.min(count, rows.length));
  if (n === 0) return "";
  const at = (reel: number) => ({ x: reel * 100 + 50, y: rows[reel]! * 100 + 50 });
  const pts: string[] = [];
  for (let reel = 0; reel < n - 1; reel++) {
    const a = at(reel);
    const b = at(reel + 1);
    pts.push(`${a.x},${a.y}`);
    const steps = 5;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const jag = ((Math.imul(seed + reel * 13 + s * 7, 1103515245) >>> 0) % 31) - 15;
      pts.push(`${Math.round(x)},${Math.round(y + (s % 2 === 0 ? jag : -jag))}`);
    }
  }
  const end = at(n - 1);
  pts.push(`${end.x},${end.y}`);
  return pts.join(" ");
}

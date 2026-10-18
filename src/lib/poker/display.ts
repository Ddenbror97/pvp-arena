import { evaluate } from "./evaluator";

/**
 * The five cards that make a published showdown hand, for highlighting only. Inputs are
 * cards the server already revealed; the winner itself always comes from the settlement.
 */
export function bestFive(cards: readonly number[]): number[] {
  if (cards.length <= 5) return [...cards];
  let best = -1;
  let pick: number[] = [];
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const five = cards.filter((_, i) => i !== a && i !== b);
      if (five.length !== 5) continue;
      const s = evaluate(five);
      if (s > best) {
        best = s;
        pick = five;
      }
    }
  return pick;
}

export type Point = { x: number; y: number };

export type SlotLayout = { seat: Point; bet: Point };

/**
 * Seat centers and bet spots (percent of the stage) by display slot, slot 0 being the
 * viewer at the bottom right. Slots run clockwise, like seat numbers at the table. The
 * wide layout shares its coordinate system with the table geometry in styles.css
 * (`.poker-table`), so seats sit on the rail at every stage size.
 */
export const SEAT_LAYOUT: Record<"wide" | "tall", SlotLayout[]> = {
  wide: [
    { seat: { x: 72, y: 70 }, bet: { x: 63, y: 63 } },
    { seat: { x: 31, y: 70 }, bet: { x: 38, y: 63 } },
    { seat: { x: 18, y: 45.5 }, bet: { x: 27, y: 49 } },
    { seat: { x: 30, y: 24.5 }, bet: { x: 33.5, y: 40.5 } },
    { seat: { x: 73, y: 24.5 }, bet: { x: 66.5, y: 40.5 } },
    { seat: { x: 86, y: 45.5 }, bet: { x: 74, y: 49 } },
  ],
  tall: [
    { seat: { x: 68, y: 86 }, bet: { x: 62, y: 72 } },
    { seat: { x: 30, y: 86 }, bet: { x: 36, y: 72 } },
    { seat: { x: 21, y: 63 }, bet: { x: 28, y: 56 } },
    { seat: { x: 23, y: 37 }, bet: { x: 30, y: 45 } },
    { seat: { x: 77, y: 37 }, bet: { x: 70, y: 45 } },
    { seat: { x: 79, y: 63 }, bet: { x: 72, y: 56 } },
  ],
};

export const displaySlot = (seat: number, anchor: number, max: number) =>
  (seat - anchor + max) % max;

import { describe, expect, it } from "vitest";
import { POCKETS } from "../src/lib/pool/physics";
import { tableArtPoint } from "../src/lib/pool/table-art";

/** Hole centres measured on the supplied table art. */
const holes = [
  { id: 3, x: 109, y: 105 },
  { id: 4, x: 859.5, y: 94 },
  { id: 5, x: 1608, y: 108 },
  { id: 0, x: 104, y: 773 },
  { id: 1, x: 860, y: 788 },
  { id: 2, x: 1614, y: 772 },
];

describe("table art", () => {
  it("puts every physics pocket on the drawn hole", () => {
    for (const hole of holes) {
      const pocket = POCKETS.find((item) => item.id === hole.id);
      expect(pocket).toBeTruthy();
      const at = tableArtPoint(pocket!.x, pocket!.y);
      expect(Math.hypot(at.x - hole.x, at.y - hole.y)).toBeLessThan(4);
    }
  });
});

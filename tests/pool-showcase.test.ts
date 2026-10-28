import { describe, expect, it } from "vitest";
import { TABLE_H, TABLE_W } from "../src/lib/pool/physics";
import { SHOWCASE_AIM, SHOWCASE_BALLS } from "../src/lib/pool/showcase";

describe("lobby showcase rack", () => {
  it("puts the cue on the right and aims it straight into the rack", () => {
    const cue = SHOWCASE_BALLS.find((ball) => ball.id === 0);
    const objects = SHOWCASE_BALLS.filter((ball) => ball.id !== 0);
    expect(cue).toBeTruthy();
    if (!cue) return;
    const nearest = objects.reduce((best, ball) =>
      Math.abs(ball.x - cue.x) < Math.abs(best.x - cue.x) ? ball : best,
    );
    expect(cue.x).toBeGreaterThan(TABLE_W / 2);
    expect(nearest.x).toBeLessThan(cue.x);
    expect(nearest.y).toBe(cue.y);
    expect(cue.y).toBe(Math.floor(TABLE_H / 2));
    expect(SHOWCASE_AIM).toBe(180_000);
    expect(SHOWCASE_BALLS).toHaveLength(16);
  });
});

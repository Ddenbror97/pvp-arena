import { describe, expect, it } from "vitest";
import { BALL_R, POCKETS, TABLE_H, TABLE_W } from "../src/lib/pool/physics";
import { ballRadiusPx, spanPx, viewOf } from "../src/lib/pool/view";

describe("pool view", () => {
  it("sends every cloth point back to itself", () => {
    const view = viewOf(1440, 800);
    let max = 0;
    for (let stepX = 0; stepX <= 24; stepX++) {
      for (let stepY = 0; stepY <= 12; stepY++) {
        const x = (TABLE_W * stepX) / 24;
        const y = (TABLE_H * stepY) / 12;
        const p = view.project(x, y);
        const back = view.unproject(p.x, p.y);
        max = Math.max(max, Math.abs(back.x - x), Math.abs(back.y - y));
      }
    }
    expect(max).toBeLessThan(1e-4);
  });

  it("draws each ball at its real width across the rails", () => {
    const view = viewOf(1200, 640);
    const near = view.project(0, TABLE_H / 2);
    const across = view.innerW / (ballRadiusPx(view.innerW, near.scale) * 2);
    expect(across).toBeCloseTo(TABLE_H / (BALL_R * 2), 6);
  });

  it("keeps pocket mouths on the physics centres", () => {
    const view = viewOf(1000, 600);
    for (const pocket of POCKETS) {
      const p = view.project(pocket.x, pocket.y);
      const back = view.unproject(p.x, p.y);
      expect(Math.abs(back.x - pocket.x)).toBeLessThan(1e-3);
      expect(Math.abs(back.y - pocket.y)).toBeLessThan(1e-3);
      expect(spanPx(view.innerW, p.scale, pocket.r)).toBeGreaterThan(
        ballRadiusPx(view.innerW, p.scale),
      );
    }
  });
});

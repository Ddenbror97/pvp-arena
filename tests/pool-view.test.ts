import { describe, expect, it } from "vitest";
import { BALL_R, POCKETS, TABLE_H, TABLE_W } from "../src/lib/pool/physics";
import { readFileSync } from "node:fs";
import { ballRadiusPx, FAR, spanPx, viewOf } from "../src/lib/pool/view";
import { nextReplayFrame, REPLAY_CATCHUP } from "../src/lib/pool/replay-pace";

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

  it("keeps a 2:1 overhead cloth with one scale for every ball", () => {
    const view = viewOf(1440, 800);
    expect(FAR).toBe(1);
    expect(view.innerW / view.innerH).toBeCloseTo(TABLE_W / TABLE_H, 6);
    expect(view.project(0, 0).scale).toBe(view.project(TABLE_W, TABLE_H).scale);
    const diameter = ballRadiusPx(view.innerW, 1) * 2;
    expect(view.innerW / diameter).toBeCloseTo(TABLE_W / (BALL_R * 2), 6);
    const bottom = view.project(TABLE_W / 2, 0);
    const top = view.project(TABLE_W / 2, BALL_R * 2);
    expect(Math.abs(bottom.y - top.y)).toBeCloseTo(diameter, 4);
    expect(view.padX).toBeGreaterThanOrEqual(view.rail - 0.01);
    expect(view.padY).toBeGreaterThanOrEqual(view.rail - 0.01);
  });

  it("maps a rightward drag toward the rack", () => {
    const view = viewOf(1200, 640);
    const cue = view.project(TABLE_W / 4, TABLE_H / 2);
    const ahead = view.unproject(cue.x + 48, cue.y);
    expect(ahead.x).toBeGreaterThan(TABLE_W / 4 + 1000);
    expect(Math.abs(ahead.y - TABLE_H / 2)).toBeLessThan(1);
  });

  it("keeps pocket mouths on the physics centres", () => {
    for (const [w, h] of [
      [1440, 800],
      [1000, 600],
      [390, 700],
    ] as const) {
      const view = viewOf(w, h);
      const clothLeft = view.padX;
      const clothRight = view.padX + view.innerW;
      const clothTop = view.padY;
      const clothBottom = view.padY + view.innerH;
      expect(POCKETS).toHaveLength(6);
      for (const pocket of POCKETS) {
        const p = view.project(pocket.x, pocket.y);
        const back = view.unproject(p.x, p.y);
        expect(Math.abs(back.x - pocket.x)).toBeLessThan(1e-3);
        expect(Math.abs(back.y - pocket.y)).toBeLessThan(1e-3);
        const mouth = spanPx(view.innerW, p.scale, pocket.r);
        expect(mouth).toBeGreaterThan(ballRadiusPx(view.innerW, p.scale));
        const inset = Math.min(pocket.x, TABLE_W - pocket.x, pocket.y, TABLE_H - pocket.y);
        const dist = Math.min(
          Math.abs(p.x - clothLeft),
          Math.abs(p.x - clothRight),
          Math.abs(p.y - clothTop),
          Math.abs(p.y - clothBottom),
        );
        expect(dist).toBeCloseTo(spanPx(view.innerW, 1, inset), 3);
        expect(p.x).toBeGreaterThan(clothLeft - view.rail);
        expect(p.x).toBeLessThan(clothRight + view.rail);
        expect(p.y).toBeGreaterThan(clothTop - view.rail);
        expect(p.y).toBeLessThan(clothBottom + view.rail);
      }
      const sideA = view.project(TABLE_W / 2, 18_000);
      const sideB = view.project(TABLE_W / 2, TABLE_H - 18_000);
      expect(sideA.x).toBeCloseTo(sideB.x, 4);
      const centerY = view.padY + view.innerH / 2;
      expect((sideA.y + sideB.y) / 2).toBeCloseTo(centerY, 3);
    }
  });

  it("centers the cloth when the felt is only a little taller than the table", () => {
    const view = viewOf(900, 520);
    const outerH = view.innerH + view.rail * 2;
    const slack = 520 - outerH;
    expect(slack).toBeGreaterThan(0);
    expect(slack).toBeLessThan(outerH * 0.45);
    expect(view.padY).toBeCloseTo(slack / 2 + view.rail, 4);
  });

  it("walks a late shot forward instead of skipping to the pocket", () => {
    expect(nextReplayFrame(0, 40, 80)).toBe(REPLAY_CATCHUP);
    expect(nextReplayFrame(10, 12, 80)).toBe(12);
    expect(nextReplayFrame(70, 90, 80)).toBe(76);
    expect(nextReplayFrame(80, 90, 80)).toBe(80);
  });

  it("keeps the full cue on the screen canvas and does not shrink the felt for it", () => {
    const table = readFileSync(
      new URL("../src/components/pool/PoolTable.tsx", import.meta.url),
      "utf8",
    );
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(table).toContain('className="pool-cue"');
    expect(table).toContain('closest(".pool-screen, .pool-stage")');
    expect(table).toContain("const length = BALL_R * 46");
    expect(table).toContain("drawPocketLamp");
    expect(table).not.toContain("pool-rgb");
    expect(css).not.toContain(".pool-rgb");
    expect(table).not.toContain("fitCueButt");
    expect(table).not.toContain("extraCueGutter");
    expect(css).not.toContain("pool-cue-gutter");
    expect(css).toContain("bottom: 1.2rem");
  });
});

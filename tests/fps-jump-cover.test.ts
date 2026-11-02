import { describe, expect, it } from "vitest";
import { BOXES, PLAYER_RADIUS } from "../src/lib/fps/map";
import { createMatch, predictMovement, TICK_MS } from "../src/lib/fps/simulation";
import type { Input } from "../src/lib/fps/protocol";
const input = (forward = 0, jump = false): Input => ({
  v: 1,
  type: "input",
  seq: 0,
  forward,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  fire: false,
  reload: false,
  weapon: "rifle",
  jump,
  sprint: false,
});
describe("jumping onto authored cover", () => {
  for (const id of ["lane-crate-w", "lane-crate-e", "south-crates-w", "south-crates-e"])
    it("lands on " + id + " without clipping or an artificial stair boost", () => {
      const box = BOXES.find((b) => b.id === id)!;
      expect(box).toBeDefined();
      const p = createMatch({ A: "a", B: "b" }, 13, 0).players.A;
      Object.assign(p, {
        x: box.x,
        y: 0,
        z: box.z + box.d / 2 + PLAYER_RADIUS + 0.35,
        velocityY: 0,
      });
      let landed = false,
        peak = 0;
      for (let i = 0; i < 45; i++) {
        const move = p.z > box.z ? 1 : 0;
        predictMovement(p, input(move, i === 0), TICK_MS);
        peak = Math.max(peak, p.y);
        if (p.y === box.y + box.h / 2 && p.velocityY === 0) landed = true;
      }
      expect(peak).toBeLessThan(1.7);
      expect(landed).toBe(true);
      expect(p.y).toBeCloseTo(box.y + box.h / 2);
    });
  it("cannot jump onto tall cover or gain another impulse while airborne", () => {
    const b = BOXES.find((b) => b.id === "side-crate-w")!;
    const p = createMatch({ A: "a", B: "b" }, 13, 0).players.A;
    Object.assign(p, { x: b.x, y: 0, z: b.z + b.d / 2 + PLAYER_RADIUS + 0.2, velocityY: 0 });
    let peak = 0;
    for (let i = 0; i < 25; i++) {
      predictMovement(p, input(1, true), TICK_MS);
      peak = Math.max(peak, p.y);
    }
    expect(peak).toBeLessThan(1.7);
    expect(p.z).toBeGreaterThanOrEqual(b.z + b.d / 2 + PLAYER_RADIUS - 1e-6);
  });
});

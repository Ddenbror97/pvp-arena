import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Gait, setLocomotion, type LocomotionClips } from "@/lib/fps/locomotion";

/** The Mixamo gait (2026-11-10): planted feet hold still in the world; standing is at rest. */
const clips = (
  JSON.parse(readFileSync("public/fps/locomotion/rifle-v1.json", "utf8")) as {
    clips: LocomotionClips;
  }
).clips;

function walk(speed: number, x: number, z: number, stance = 0) {
  setLocomotion(clips);
  const gait = new Gait(0.95, 0.1);
  const dt = 1000 / 120;
  let bodyX = 0,
    bodyZ = 0;
  const rows: Array<{ y: number; wx: number; wz: number }> = [];
  for (let i = 0; i < 480; i++) {
    bodyX += (x * speed * dt) / 1000;
    bodyZ += (z * speed * dt) / 1000;
    const p = gait.update(dt, speed, x, z, stance)!;
    // Root space has no rotation here: world = body + foot.
    rows.push({ y: p.left[1], wx: bodyX + p.left[0], wz: bodyZ + p.left[2] });
  }
  return rows.slice(120);
}

describe("Mixamo locomotion", () => {
  for (const [name, speed, x, z] of [
    ["walk", 1.4, 0, -1],
    ["run", 5, 0, -1],
    ["sprint", 7.5, 0, -1],
    ["strafe", 5, 1, 0],
    ["backward walk", 1.2, 0, 1],
  ] as const)
    it(`${name}: the planted foot does not slide`, () => {
      const rows = walk(speed, x, z);
      const floor = Math.min(...rows.map((r) => r.y));
      // Planted: within 1 cm of the lowest the ankle goes.
      let worst = 0;
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1]!,
          b = rows[i]!;
        if (a.y < floor + 0.01 && b.y < floor + 0.01)
          worst = Math.max(worst, Math.hypot(b.wx - a.wx, b.wz - a.wz) * 120);
      }
      // World speed of a planted foot (m/s), against the body's own speed.
      expect(worst).toBeLessThan(speed * 0.35);
    });

  it("standing still holds the rest height and no sway", () => {
    setLocomotion(clips);
    const gait = new Gait(0.95, 0.1);
    for (let i = 0; i < 200; i++) {
      const p = gait.update(16, 0, 0, -1, 0)!;
      expect(p.drop).toBeCloseTo(0, 6);
      expect(p.swayX).toBeCloseTo(0, 6);
      expect(p.yaw).toBeCloseTo(0, 6);
    }
  });

  it("keeps the hips within the head box at any pace", () => {
    for (const speed of [1.4, 3, 5, 7.5]) {
      setLocomotion(clips);
      const gait = new Gait(0.95, 0.1);
      for (let i = 0; i < 300; i++) {
        const p = gait.update(8, speed, 0, -1, 0)!;
        expect(p.drop).toBeGreaterThanOrEqual(-0.09);
        expect(p.drop).toBeLessThanOrEqual(0.03);
      }
    }
  });
});

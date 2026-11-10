import { describe, expect, it } from "vitest";
import { CROUCH_EYE_HEIGHT, EYE_HEIGHT } from "../src/lib/fps/map";
import { GRAVITY, JUMP_SPEED, TICK_MS } from "../src/lib/fps/simulation";
import { fallDamage, stepBody, type BrBody } from "../src/lib/fps/br/movement";
import { StaticWorld } from "../src/lib/fps/br/static-world";
import type { Heightfield } from "../src/lib/fps/br/heightfield";

const body = (): BrBody => ({
  x: -0.65,
  y: 0,
  z: 0,
  grounded: true,
  crouched: false,
  velocityY: 0,
});
function world(boxes: number[][]) {
  return new StaticWorld(
    { heightAt: () => 0 } as Heightfield,
    [],
    { voxel: 0.3, models: {} },
    null,
    boxes,
  );
}
function jump(height: number, crouch: boolean) {
  const w = world([[0, 0, -1, 2.5, height, 1]]),
    p = body();
  let landed = false;
  for (let tick = 0; tick < 40; tick++) {
    stepBody(w, p, { forward: 1, strafe: 0, yaw: -Math.PI / 2, jump: tick === 0, crouch }, TICK_MS);
    if (p.grounded && Math.abs(p.y - height) < 0.001) landed = true;
    expect(
      w.blocked(p.x, p.y + 0.0001, p.z, (p.crouched ? CROUCH_EYE_HEIGHT : EYE_HEIGHT) + 0.2, 0.35),
    ).toBe(false);
  }
  return { p, landed };
}
describe("BR jump traversal uses arena jump physics", () => {
  it("lands on a low crate without raising the established jump impulse", () => {
    expect(jump(0.7, false).landed).toBe(true);
    expect(jump(1.25, false).landed).toBe(false);
  });
  it("crouch-jumps onto taller cover, but cannot climb an unreachable wall", () => {
    expect(jump(1.25, true).landed).toBe(true);
    expect(jump(1.7, true).landed).toBe(false);
  });
  it("contracts the airborne hull around the head, preserving velocity and avoiding repeated lift", () => {
    const w = world([]),
      p = body();
    stepBody(w, p, { forward: 0, strafe: 0, yaw: 0, jump: true, crouch: true }, TICK_MS);
    expect(p.velocityY).toBeCloseTo(JUMP_SPEED - (GRAVITY * TICK_MS) / 1000);
    expect(p.airCrouchOffset).toBeCloseTo(EYE_HEIGHT - CROUCH_EYE_HEIGHT);
    const before = { ...p };
    stepBody(w, p, { forward: 0, strafe: 0, yaw: 0, crouch: true }, TICK_MS);
    expect(p.velocityY).toBeCloseTo(before.velocityY - (GRAVITY * TICK_MS) / 1000);
    expect(p.y - before.y).toBeCloseTo((p.velocityY * TICK_MS) / 1000);
    expect(p.airCrouchOffset).toBeCloseTo(EYE_HEIGHT - CROUCH_EYE_HEIGHT);
    for (let i = 0; i < 50; i++) stepBody(w, p, null, TICK_MS);
    expect(p.y).toBe(0);
    expect(p.airCrouchOffset).toBe(0);
  });
  it("does not expand the standing hull through a low ceiling", () => {
    const w = world([[-2, 1.3, -2, 2, 1.6, 2]]),
      p = body();
    p.crouched = true;
    stepBody(w, p, { forward: 0, strafe: 0, yaw: 0 }, TICK_MS);
    expect(p.crouched).toBe(true);
    expect(p.y).toBe(0);
  });
  it("from a plain jump's top, steps onto objects up to ~1.15 m (pallets, crates, tables, drums)", () => {
    // Owner, 2026-11-10: "jump up on objects without changing how the jump works". The jump
    // peaks at 0.81 m at the 30 Hz tick; the step adds AIR_STEP.
    for (const h of [0.88, 0.96, 1.1]) expect(jump(h, false).landed, `${h} m`).toBe(true);
    // The limits stay: a plain jump does not reach 1.25 m, a crouch-jump not 1.7 m.
    expect(jump(1.25, false).landed).toBe(false);
    expect(jump(1.7, true).landed).toBe(false);
  });
  it("keeps the jump itself: same apex and airtime on open ground", () => {
    const w = world([]),
      p = body();
    let apex = 0,
      ticks = 0;
    stepBody(w, p, { forward: 1, strafe: 0, yaw: 0, jump: true }, TICK_MS);
    while (!p.grounded && ticks < 100) {
      apex = Math.max(apex, p.y);
      stepBody(w, p, { forward: 1, strafe: 0, yaw: 0 }, TICK_MS);
      ticks++;
    }
    const t = (2 * JUMP_SPEED) / GRAVITY;
    expect(apex).toBeGreaterThan(0.8);
    expect(apex).toBeLessThan((JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY) + 1e-6);
    expect(ticks * (TICK_MS / 1000)).toBeCloseTo(t, 0);
    // A jump's own landing is never a damaging fall.
    expect(fallDamage(p.impact ?? 0)).toBe(0);
  });
  it("reports a landing's speed and turns long falls into damage", () => {
    for (const [height, min, max] of [
      [3, 0, 0],
      [6, 15, 28],
      [12, 50, 66],
      [25, 100, 200],
    ] as const) {
      const w = world([[-3, 0, -3, 3, height, 3]]),
        p = body();
      p.x = 2.9;
      p.y = height;
      let impact = 0;
      for (let tick = 0; tick < 200 && !(impact > 0); tick++) {
        stepBody(w, p, { forward: 1, strafe: 0, yaw: -Math.PI / 2 }, TICK_MS);
        impact = p.impact ?? 0;
      }
      const damage = fallDamage(impact);
      expect(damage, `${height} m`).toBeGreaterThanOrEqual(min);
      expect(damage, `${height} m`).toBeLessThanOrEqual(max);
    }
  });
});

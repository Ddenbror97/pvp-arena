import { describe, it, expect } from "vitest";
import { getMap, compileMap } from "../src/lib/fps/maps/registry";
import { PLAYER_RADIUS, eyeHeight } from "../src/lib/fps/map";
import {
  createMatch,
  predictMovement,
  TICK_MS,
  JUMP_SPEED,
  GRAVITY,
} from "../src/lib/fps/simulation";
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
const cover = (h: number, d = 1.4) => ({
  id: "cover",
  x: 0,
  y: h / 2,
  z: 0,
  w: 2,
  h,
  d,
  surface: "wood" as const,
});
function mapFor(boxes: ReturnType<typeof cover>[] = []) {
  return compileMap({
    ...getMap("dustfront"),
    boxes,
    walls: [],
    structures: [],
    barriers: [],
    footsteps: { floor: "concrete" },
  });
}
const player = () => ({
  ...createMatch({ A: "a", B: "b" }, 13, 0).players.A,
  x: 0,
  y: 0,
  z: 2,
  velocityY: 0,
});
describe("original jump and reachable cover", () => {
  it.each([0, 3, 6])("crouch-jumps onto 1.3 m cover with duck at tick %s", (duckAt) => {
    const b = cover(1.3),
      map = mapFor([b]),
      p = player();
    p.z = b.d / 2 + PLAYER_RADIUS + 0.2;
    let landed = false;
    for (let n = 0; n < 50; n++) {
      predictMovement(
        p,
        { ...input(p.z > 0.1 ? 1 : 0, n === 0), crouch: n >= duckAt },
        TICK_MS,
        map,
      );
      if (p.y === 1.3 && p.velocityY === 0) landed = true;
    }
    expect(landed).toBe(true);
    expect(p.y).toBeCloseTo(1.3);
    expect(p.airCrouchOffset).toBe(0);
    predictMovement(p, input(), TICK_MS, map);
    expect(p.crouched).toBe(false);
    expect(p.y).toBeCloseTo(1.3);
  });
  it("air duck raises the feet without boosting velocity or head height", () => {
    const standing = player(),
      ducked = player(),
      map = mapFor();
    for (let n = 0; n < 10; n++) {
      predictMovement(standing, input(0, n === 0), TICK_MS, map);
      predictMovement(ducked, { ...input(0, n === 0), crouch: n >= 3 }, TICK_MS, map);
      expect(ducked.velocityY).toBe(standing.velocityY);
      expect(ducked.y + eyeHeight(ducked)).toBeCloseTo(standing.y + eyeHeight(standing), 8);
    }
  });
  it("repeated air duck cannot accumulate extra height", () => {
    const p = player(),
      map = mapFor();
    const dt = TICK_MS / 1000;
    for (let n = 1; n <= 15; n++) {
      predictMovement(p, { ...input(0, n === 1), crouch: n % 2 === 0 }, TICK_MS, map);
      const ballistic = n * 5 * dt - (14 * dt * dt * n * (n + 1)) / 2;
      expect(p.y - (p.airCrouchOffset ?? 0)).toBeCloseTo(ballistic, 8);
    }
  });
  it("does not duck-jump onto cover above tucked-foot reach", () => {
    const b = cover(1.6),
      map = mapFor([b]),
      p = player();
    p.z = b.d / 2 + PLAYER_RADIUS + 0.2;
    for (let n = 0; n < 40; n++)
      predictMovement(p, { ...input(1, n === 0), crouch: true }, TICK_MS, map);
    expect(p.y).toBe(0);
    expect(p.z).toBeGreaterThanOrEqual(b.d / 2 + PLAYER_RADIUS - 1e-6);
  });
  it("supports crouching just before takeoff", () => {
    const b = cover(1.3),
      map = mapFor([b]),
      p = player();
    p.z = b.d / 2 + PLAYER_RADIUS + 0.2;
    predictMovement(p, { ...input(), crouch: true }, TICK_MS, map);
    expect(p.y).toBe(0);
    for (let n = 0; n < 50; n++)
      predictMovement(p, { ...input(p.z > 0.1 ? 1 : 0, n === 0), crouch: true }, TICK_MS, map);
    expect(p.y).toBeCloseTo(1.3);
    expect(p.velocityY).toBe(0);
  });
  it("keeps duck held when standing would expand into the ledge", () => {
    const b = cover(1.3),
      map = mapFor([b]),
      p = player();
    p.z = b.d / 2 + PLAYER_RADIUS + 0.2;
    for (let n = 0; n < 12; n++)
      predictMovement(p, { ...input(1, n === 0), crouch: true }, TICK_MS, map);
    expect(p.z).toBeLessThan(b.d / 2 + PLAYER_RADIUS);
    expect(p.y).toBeGreaterThan(1.3);
    predictMovement(p, input(), TICK_MS, map);
    expect(p.crouched).toBe(true);
    expect(p.airCrouchOffset).toBeCloseTo(0.65);
    for (let n = 0; n < 25; n++) predictMovement(p, input(), TICK_MS, map);
    expect(p.y).toBeCloseTo(1.3);
    expect(p.crouched).toBe(false);
  });
  it("cannot expand the tucked hull through a low ceiling", () => {
    const ceiling = { ...cover(0.25, 5), id: "ceiling", w: 5, y: 1.5 };
    const map = mapFor([ceiling]),
      p = player();
    p.z = 0;
    p.crouched = true;
    predictMovement(p, { ...input(0, true), crouch: true }, TICK_MS, map);
    expect(p.airCrouchOffset ?? 0).toBe(0);
    expect(p.y + eyeHeight(p) + 0.2).toBeLessThan(1.375);
  });
  it("matches the original impulse, gravity, full trajectory and landing time", () => {
    expect(JUMP_SPEED).toBe(5);
    expect(GRAVITY).toBe(14);
    const p = player(),
      map = mapFor(),
      dt = TICK_MS / 1000;
    let peak = 0,
      landedAt = 0;
    for (let n = 1; n <= 30; n++) {
      predictMovement(p, input(0, n === 1), TICK_MS, map);
      const legacy = Math.max(0, n * 5 * dt - (14 * dt * dt * n * (n + 1)) / 2);
      expect(p.y).toBeCloseTo(legacy, 8);
      peak = Math.max(peak, p.y);
      if (!landedAt && p.y === 0) landedAt = n;
    }
    expect(peak).toBeCloseTo(0.81111, 4);
    expect(landedAt).toBe(21);
  });
  for (const h of [0.4, 0.6, 0.8])
    for (const d of [0.4, 1.4])
      it("lands on reachable " + h + " m cover with depth " + d + " without boosting", () => {
        const b = cover(h, d),
          map = mapFor([b]),
          p = player();
        p.z = d / 2 + PLAYER_RADIUS + 0.35;
        let landed = false,
          peak = 0;
        for (let n = 0; n < 40; n++) {
          predictMovement(p, input(p.z > 0.1 ? 1 : 0, n === 0), TICK_MS, map);
          peak = Math.max(peak, p.y);
          if (Math.abs(p.y - h) < 1e-6 && p.velocityY === 0) landed = true;
        }
        expect(landed).toBe(true);
        expect(peak).toBeLessThan(0.85);
        expect(p.y).toBeCloseTo(h);
      });
  it.each([0.9, 1.3, 1.45, 2.2])("keeps %s m cover out of reach from ground level", (h) => {
    const b = cover(h),
      map = mapFor([b]),
      p = player();
    p.z = b.d / 2 + PLAYER_RADIUS + 0.2;
    for (let n = 0; n < 20; n++) predictMovement(p, input(1, true), TICK_MS, map);
    expect(p.y).toBeLessThan(0.85);
    expect(p.z).toBeGreaterThanOrEqual(b.d / 2 + PLAYER_RADIUS - 1e-6);
  });
  it("can reach taller cover from a raised support when its relative height is within reach", () => {
    const b = cover(1.3),
      platform = { ...cover(0.6, 1.6), id: "platform", z: 2.2 };
    const map = mapFor([b, platform]),
      p = player();
    Object.assign(p, { y: 0.6, z: 1.6 });
    let peak = 0,
      landed = false;
    for (let n = 0; n < 40; n++) {
      predictMovement(p, input(p.z > 0.1 ? 1 : 0, n === 0), TICK_MS, map);
      peak = Math.max(peak, p.y);
      if (Math.abs(p.y - 1.3) < 1e-6 && p.velocityY === 0) landed = true;
    }
    expect(landed).toBe(true);
    expect(peak - 0.6).toBeLessThan(0.85);
  });
});

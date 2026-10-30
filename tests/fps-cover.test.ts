import { describe, it, expect } from "vitest";
import {
  BOXES,
  WORLD_SOLIDS,
  SPAWNS,
  PLAYER_RADIUS,
  eyeHeight,
  STRUCTURES,
  ARENA,
} from "../src/lib/fps/map";
import { rayBox, traceWorld } from "../src/lib/fps/collision";
import {
  createMatch,
  startMatch,
  stepMatch,
  predictMovement,
  validateInput,
  TICK_MS,
  type Input,
} from "../src/lib/fps/simulation";
const idle: Input = {
  v: 1,
  type: "input",
  seq: 0,
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  fire: false,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: false,
};
function live() {
  const s = createMatch({ A: "fixture-a", B: "fixture-b" }, 5, 0);
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  return s;
}
function shoot(surface: "metal" | "wood" | "concrete") {
  const s = live(),
    b = BOXES.find((b) => b.surface === surface)!;
  Object.assign(s.players.A, { x: b.x, z: b.z + b.d / 2 + 1, crouched: surface === "wood" });
  Object.assign(s.players.B, { x: b.x, z: b.z - b.d / 2 - 1, crouched: surface === "wood" });
  stepMatch(s, { A: { ...idle, fire: true, crouch: surface === "wood" } }, 3034, TICK_MS);
  return s;
}
describe("shared tactical world", () => {
  it("keeps upper structures outside the playable floor and blocks rays against the overhead beam", () => {
    for (const b of STRUCTURES)
      expect(
        Math.abs(b.x) - b.w / 2 >= ARENA.width / 2 - 1e-7 ||
          Math.abs(b.z) - b.d / 2 >= ARENA.depth / 2 - 1e-7,
      ).toBe(true);
    const hit = traceWorld({ x: 0, y: 8.2, z: 13 }, { x: 0, y: 0, z: -1 });
    expect(hit?.solidId).toBe("end-beam--1");
    expect(hit?.surface).toBe("metal");
  });
  it("has symmetric solid envelopes and safe opposing spawns", () => {
    for (const b of BOXES) {
      expect(
        BOXES.some(
          (m) =>
            m.x === -b.x &&
            m.z === -b.z &&
            m.w === b.w &&
            m.h === b.h &&
            m.d === b.d &&
            m.surface === b.surface,
        ),
      ).toBe(true);
      expect(b.y - b.h / 2).toBeCloseTo(0);
    }
    for (const spawn of Object.values(SPAWNS))
      expect(
        BOXES.some(
          (b) =>
            Math.abs(spawn.x - b.x) < b.w / 2 + PLAYER_RADIUS &&
            Math.abs(spawn.z - b.z) < b.d / 2 + PLAYER_RADIUS,
        ),
      ).toBe(false);
    expect(traceWorld({ x: 0, y: 1.6, z: 13 }, { x: 0, y: 0, z: -1 })?.solidId).toBe(
      "blast-wall-1",
    );
    expect(traceWorld({ x: 0, y: 1.6, z: -13 }, { x: 0, y: 0, z: 1 })?.solidId).toBe(
      "blast-wall--1",
    );
    expect(new Set(WORLD_SOLIDS.map((s) => s.id)).size).toBe(WORLD_SOLIDS.length);
  });
  for (const b of BOXES)
    it(`blocks movement and a surface ray at ${b.id}`, () => {
      const p = live().players.A;
      Object.assign(p, { x: b.x, z: b.z + b.d / 2 + PLAYER_RADIUS + 0.25 });
      for (let seq = 0; seq < 60; seq++) predictMovement(p, { ...idle, seq, forward: 1 }, TICK_MS);
      expect(p.z).toBeGreaterThanOrEqual(b.z + b.d / 2 + PLAYER_RADIUS - 1e-8);
      const hit = traceWorld({ x: b.x, y: b.y, z: b.z + b.d / 2 + 1 }, { x: 0, y: 0, z: -1 })!;
      expect(hit.solidId).toBe(b.id);
      expect(hit.surface).toBe(b.surface);
      expect(hit.point.z).toBeCloseTo(b.z + b.d / 2);
      expect(hit.normal).toEqual({ x: 0, y: 0, z: 1 });
    });
  it("blocks ground and perimeter rays, including exact and parallel edges", () => {
    expect(traceWorld({ x: 9, y: 1.6, z: 13 }, { x: 0, y: -1, z: 0 })?.normal).toEqual({
      x: 0,
      y: 1,
      z: 0,
    });
    expect(traceWorld({ x: 0, y: 1.6, z: 13 }, { x: 1, y: 0, z: 0 })?.solidId).toBe("wall-x-1");
    expect(
      rayBox(
        { x: 2, y: 2, z: 2 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
      ),
    ).toBe(Infinity);
    expect(
      rayBox(
        { x: 0, y: 0, z: 2 },
        { x: 0, y: 0, z: -1 },
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
      ),
    ).toBe(1.5);
  });
  for (const surface of ["metal", "wood", "concrete"] as const)
    it(`stops authoritative damage at ${surface}, with a server-authored impact`, () => {
      const s = shoot(surface);
      expect(s.players.B.hp).toBe(100);
      expect(s.players.A.ammo).toBe(29);
      const impact = s.events.find((e) => e.type === "impact")?.impact;
      expect(impact?.surface).toBe(surface);
      expect(Number.isFinite(impact?.point.x)).toBe(true);
      expect(s.events.some((e) => e.type === "hit" || e.type === "headshot")).toBe(false);
    });
  it("protects a crouched player behind low cover but exposes a standing head", () => {
    for (const crouched of [true, false]) {
      const s = live();
      Object.assign(s.players.A, { x: 2.6, z: 3.5 });
      Object.assign(s.players.B, { x: 2.6, z: 0.6, crouched });
      const pitch = Math.atan2(eyeHeight(s.players.B) - 1.6, 2.9);
      stepMatch(s, { A: { ...idle, fire: true, pitch } }, 3034, TICK_MS);
      expect(s.players.B.hp).toBe(crouched ? 100 : 0);
    }
  });
  it("allows peeking from either side of a barrier", () => {
    for (const x of [-0.9, 5]) {
      const s = live();
      Object.assign(s.players.A, { x, z: 3.5 });
      Object.assign(s.players.B, { x, z: 0.6 });
      // Right peek uses the lane beyond this barrier, not the central container.
      if (x === 5) {
        s.players.A.x = 7.1;
        s.players.B.x = 7.1;
      }
      stepMatch(s, { A: { ...idle, fire: true } }, 3034, TICK_MS);
      expect(s.players.B.hp).toBe(0);
    }
  });
  it("slides along a wall and clears its edge without getting stuck", () => {
    const p = live().players.A;
    Object.assign(p, { x: 0, z: 6.35 });
    for (let seq = 0; seq < 25; seq++)
      predictMovement(p, { ...idle, seq, strafe: -1, forward: 1 }, TICK_MS);
    expect(p.x).toBeLessThan(-1.85);
    expect(p.z).toBeLessThan(6.35);
  });
  it("crouches authoritatively at reduced speed and rejects client hit-volume spoofing", () => {
    const p = live().players.A;
    predictMovement(p, { ...idle, crouch: true, strafe: 1, sprint: true }, TICK_MS);
    expect(p.crouched).toBe(true);
    expect(eyeHeight(p)).toBe(0.95);
    expect(p.x).toBeCloseTo((5 * 0.48 * TICK_MS) / 1000);
    expect(validateInput({ ...idle, crouch: true })?.crouch).toBe(true);
    expect(validateInput({ ...idle, crouch: "yes" })).toBeNull();
    expect(validateInput({ ...idle, crouched: true })).toBeNull();
    predictMovement(p, { ...idle, crouch: false }, TICK_MS);
    expect(eyeHeight(p)).toBe(1.6);
  });
  it("lands on a low crate, can jump off it, and falls after leaving its support", () => {
    const p = live().players.A;
    Object.assign(p, { x: 8, z: 6.5 });
    let landed = false;
    for (let n = 0; n < 70; n++) {
      predictMovement(p, { ...idle, seq: n, jump: n === 0, forward: n < 16 ? 1 : 0 }, TICK_MS);
      if (Math.abs(p.y - 0.65) < 1e-6 && (p.velocityY ?? 0) === 0) landed = true;
    }
    expect(landed).toBe(true);
    expect(p.y).toBeCloseTo(0.65);
    predictMovement(p, { ...idle, jump: true }, TICK_MS);
    expect(p.y).toBeGreaterThan(0.65);
    for (let n = 0; n < 90; n++) predictMovement(p, { ...idle, strafe: 1 }, TICK_MS);
    expect(p.y).toBe(0);
  });
});

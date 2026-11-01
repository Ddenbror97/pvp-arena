import { describe, it, expect } from "vitest";
import {
  BOXES,
  WORLD_SOLIDS,
  SPAWNS,
  PLAYER_RADIUS,
  eyeHeight,
  STRUCTURES,
  ARENA,
  STEP_HEIGHT,
} from "../src/lib/fps/map";
import { rayBox, traceWorld } from "../src/lib/fps/collision";
import {
  createMatch,
  startMatch,
  stepMatch,
  predictMovement,
  validateInput,
  isMovementBlocked,
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
const byId = (id: string) => BOXES.find((b) => b.id === id)!;
// Shots across one solid of each bullet surface: [box id, A pose, B pose, yaw toward B].
const SHOTS = {
  metal: ["lane-stack-e", { x: 12, z: -2.7 }, { x: 5.2, z: -2.7 }, Math.PI / 2],
  wood: ["tarp-stack", { x: 0, z: 2.6 }, { x: 0, z: -2.6 }, 0],
  concrete: ["spawn-shield-w", { x: -12.6, z: 0 }, { x: -15.2, z: 0 }, Math.PI / 2],
} as const;
function shoot(surface: "metal" | "wood" | "concrete") {
  const s = live(),
    [, a, b, yaw] = SHOTS[surface];
  Object.assign(s.players.A, { ...a, crouched: surface === "wood" });
  Object.assign(s.players.B, { ...b, crouched: surface === "wood" });
  stepMatch(s, { A: { ...idle, yaw, fire: true, crouch: surface === "wood" } }, 3034, TICK_MS);
  return s;
}
// The four faces a player can walk into: outward normal and the yaw that walks against it.
const FACES = [
  { n: { x: 0, z: 1 }, yaw: 0 },
  { n: { x: 0, z: -1 }, yaw: Math.PI },
  { n: { x: 1, z: 0 }, yaw: Math.PI / 2 },
  { n: { x: -1, z: 0 }, yaw: -Math.PI / 2 },
];
/** A face of `b` with free ground in front of it and a clear 1 m ray onto it, if any. */
function openFace(b: (typeof BOXES)[number]) {
  for (const f of FACES)
    for (const t of [0, -0.3, 0.3, -0.42, 0.42]) {
      const half = f.n.x ? b.w / 2 : b.d / 2;
      // Sample along the face (t is a fraction of its length) to find a free approach.
      const along = f.n.x ? { x: 0, z: t * b.d } : { x: t * b.w, z: 0 };
      const at = (gap: number) => ({
        x: b.x + along.x + f.n.x * (half + gap),
        z: b.z + along.z + f.n.z * (half + gap),
      });
      const stand = at(PLAYER_RADIUS + 0.25),
        origin = at(1);
      if (
        Math.abs(stand.x) > ARENA.width / 2 - PLAYER_RADIUS ||
        Math.abs(stand.z) > ARENA.depth / 2 - PLAYER_RADIUS
      )
        continue;
      if (isMovementBlocked(stand.x, 0, stand.z)) continue;
      const hit = traceWorld({ x: origin.x, y: b.y, z: origin.z }, { x: -f.n.x, y: 0, z: -f.n.z });
      if (hit?.solidId === b.id) return { ...f, half, stand, hit };
    }
  return undefined;
}
describe("shared tactical world", () => {
  it("keeps bullet-only structures above head and jump height and blocks rays at the arch lintels", () => {
    for (const b of STRUCTURES) expect(b.y - b.h / 2).toBeGreaterThanOrEqual(3);
    const lintel = traceWorld({ x: -8.3, y: 3.8, z: -8 }, { x: 0, y: 0, z: -1 });
    expect(lintel?.solidId).toBe("north-arch-lintel-w");
    // Under the lintel the arch is open: the same ray at eye height crosses the upper corridor.
    expect(traceWorld({ x: -8.3, y: 1.6, z: -8 }, { x: 0, y: 0, z: -1 })?.solidId).toBe(
      "north-building-0",
    );
  });
  it("has mirrored solid envelopes and shielded opposing spawns", () => {
    for (const b of BOXES) {
      expect(
        BOXES.some(
          (m) =>
            Math.abs(m.x + b.x) < 1e-9 &&
            m.z === b.z &&
            m.w === b.w &&
            m.h === b.h &&
            m.d === b.d &&
            m.y === b.y,
        ),
        b.id,
      ).toBe(true);
      expect(b.y - b.h / 2).toBeGreaterThanOrEqual(-1e-9);
    }
    for (const spawn of Object.values(SPAWNS))
      expect(isMovementBlocked(spawn.x, 0, spawn.z)).toBe(false);
    expect(
      traceWorld({ x: SPAWNS.A.x, y: 1.6, z: SPAWNS.A.z }, { x: 1, y: 0, z: 0 })?.solidId,
    ).toBe("spawn-shield-w");
    expect(
      traceWorld({ x: SPAWNS.B.x, y: 1.6, z: SPAWNS.B.z }, { x: -1, y: 0, z: 0 })?.solidId,
    ).toBe("spawn-shield-e");
    expect(new Set(WORLD_SOLIDS.map((s) => s.id)).size).toBe(WORLD_SOLIDS.length);
  });
  for (const b of BOXES)
    it(`blocks movement and a surface ray at ${b.id}`, () => {
      const top = b.y + b.h / 2;
      if (top <= STEP_HEIGHT) {
        // A first stair riser is stepped onto, not blocked.
        const p = live().players.A;
        Object.assign(p, { x: b.x, y: 0, z: b.z + b.d / 2 + PLAYER_RADIUS + 0.05 });
        for (let seq = 0; seq < 12 && p.y === 0; seq++)
          predictMovement(p, { ...idle, seq, forward: 1 }, TICK_MS);
        expect(p.y).toBeCloseTo(top);
        return;
      }
      const face = openFace(b);
      expect(face, `${b.id} has a reachable face`).toBeDefined();
      const { n, yaw, half, stand, hit } = face!;
      const p = live().players.A;
      Object.assign(p, { ...stand, y: 0 });
      for (let seq = 0; seq < 60; seq++)
        predictMovement(p, { ...idle, seq, yaw, forward: 1 }, TICK_MS);
      const coord = n.x ? (p.x - b.x) * n.x : (p.z - b.z) * n.z;
      expect(coord).toBeGreaterThanOrEqual(half + PLAYER_RADIUS - 1e-8);
      expect(p.y).toBe(0);
      expect(hit.surface).toBe(b.surface);
      expect(n.x ? hit.point.x : hit.point.z).toBeCloseTo(
        n.x ? b.x + n.x * half : b.z + n.z * half,
      );
      expect(hit.normal).toEqual({ x: n.x, y: 0, z: n.z });
    });
  it("blocks ground and perimeter rays, including exact and parallel edges", () => {
    expect(traceWorld({ x: 8.3, y: 1.6, z: 12.4 }, { x: 0, y: -1, z: 0 })?.normal).toEqual({
      x: 0,
      y: 1,
      z: 0,
    });
    expect(traceWorld({ x: 12, y: 1.6, z: 12.4 }, { x: 1, y: 0, z: 0 })?.solidId).toBe("wall-east");
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
      expect(byId(SHOTS[surface][0]).surface).toBe(surface);
      expect(Number.isFinite(impact?.point.x)).toBe(true);
      expect(s.events.some((e) => e.type === "hit" || e.type === "headshot")).toBe(false);
    });
  it("protects a crouched player behind the courtyard low wall but exposes a standing head", () => {
    for (const crouched of [true, false]) {
      const s = live();
      Object.assign(s.players.A, { x: -8.3, z: -4.5 });
      Object.assign(s.players.B, { x: -8.3, z: -8.3, crouched });
      const pitch = Math.atan2(eyeHeight(s.players.B) - 1.6, 3.8);
      stepMatch(s, { A: { ...idle, fire: true, pitch } }, 3034, TICK_MS);
      expect(s.players.B.hp).toBe(crouched ? 100 : 66);
    }
  });
  it("allows peeking from either side of the central stack", () => {
    for (const x of [-2.6, 2.6]) {
      const s = live();
      Object.assign(s.players.A, { x, z: 2.9 });
      Object.assign(s.players.B, { x, z: -2.9 });
      stepMatch(s, { A: { ...idle, fire: true } }, 3034, TICK_MS);
      expect(s.players.B.hp).toBe(66);
    }
  });
  it("slides along a wall and clears its edge without getting stuck", () => {
    const p = live().players.A;
    Object.assign(p, { x: 0, z: 1.6 + PLAYER_RADIUS });
    for (let seq = 0; seq < 25; seq++)
      predictMovement(p, { ...idle, seq, strafe: -1, forward: 1 }, TICK_MS);
    expect(p.x).toBeLessThan(-2 - PLAYER_RADIUS);
    expect(p.z).toBeLessThan(1.6 + PLAYER_RADIUS);
  });
  it("crouches authoritatively at reduced speed and rejects client hit-volume spoofing", () => {
    const p = live().players.A;
    predictMovement(p, { ...idle, crouch: true, strafe: 1, sprint: true }, TICK_MS);
    expect(p.crouched).toBe(true);
    expect(eyeHeight(p)).toBe(0.95);
    expect(p.x - SPAWNS.A.x).toBeCloseTo((5 * 0.48 * TICK_MS) / 1000);
    expect(validateInput({ ...idle, crouch: true })?.crouch).toBe(true);
    expect(validateInput({ ...idle, crouch: "yes" })).toBeNull();
    expect(validateInput({ ...idle, crouched: true })).toBeNull();
    predictMovement(p, { ...idle, crouch: false }, TICK_MS);
    expect(eyeHeight(p)).toBe(1.6);
  });
  it("stands on the platform, can jump on it, and falls after walking off its open edge", () => {
    const p = live().players.A;
    Object.assign(p, { x: -14, y: 1.5, z: -8.5, velocityY: 0 });
    predictMovement(p, idle, TICK_MS);
    expect(p.y).toBeCloseTo(1.5);
    predictMovement(p, { ...idle, jump: true }, TICK_MS);
    expect(p.y).toBeGreaterThan(1.5);
    let landed = false;
    for (let n = 0; n < 40; n++) {
      predictMovement(p, idle, TICK_MS);
      if (Math.abs(p.y - 1.5) < 1e-6 && (p.velocityY ?? 0) === 0) landed = true;
    }
    expect(landed).toBe(true);
    // The west edge is open to the spawn alley; the 1 m low wall is now within jump clearance.
    for (let n = 0; n < 90; n++) predictMovement(p, { ...idle, strafe: -1 }, TICK_MS);
    expect(p.y).toBe(0);
    expect(p.x).toBeLessThan(-16);
    const q = live().players.A;
    Object.assign(q, { x: -8.3, y: 0, z: -7.3 + PLAYER_RADIUS + 0.1 });
    for (let n = 0; n < 40; n++)
      predictMovement(q, { ...idle, seq: n, jump: true, forward: 1 }, TICK_MS);
    expect(q.z).toBeLessThan(-7.3 - PLAYER_RADIUS);
  });
});

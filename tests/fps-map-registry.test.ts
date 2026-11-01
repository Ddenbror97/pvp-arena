import { describe, expect, it, vi } from "vitest";

// Register the test map next to Dustfront (the shipped catalog contains Dustfront only).
vi.mock("../src/lib/fps/maps/catalog", async () => await import("./fixtures/test-map-catalog"));

import { DEFAULT_MAP_ID, MAP_IDS, getMap, isMapId, mapOf } from "../src/lib/fps/maps/registry";
import {
  createMatch,
  isMovementBlocked,
  predictMovement,
  startMatch,
  stepMatch,
  COUNTDOWN_MS,
  HALFTIME_MS,
  ROUND_END_MS,
  TICK_MS,
  type Input,
  type MatchState,
  type Player,
} from "../src/lib/fps/simulation";
import { traceWorld } from "../src/lib/fps/collision";
import {
  canSeeOpponent,
  revealsOpponent,
  snapshotForPlayer,
  trailForPlayer,
  trailStep,
} from "../src/lib/fps/visibility";
import { botItinerary, createPracticeBot } from "../src/lib/fps/practice-bot";
import { FrameMotion, RemotePresentation, CameraCorrection } from "../src/lib/fps/presentation";
import { deathSupport } from "../src/lib/fps/death-presentation";
import { PLAYER_RADIUS } from "../src/lib/fps/map";

const TEST = getMap("test-grid");
const DUSTFRONT = getMap("dustfront");
const EAST = -Math.PI / 2; // yaw that walks towards +x
const input = (seq: number, over: Partial<Input> = {}): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq,
  forward: 0,
  strafe: 0,
  yaw: EAST,
  pitch: 0,
  weapon: "rifle",
  fire: false,
  reload: false,
  jump: false,
  sprint: false,
  crouch: false,
  ...over,
});
/** A live match on `mapId` with the clock at `now`. */
function live(mapId?: string) {
  const state = createMatch({ A: "player-a", B: "player-b" }, 5, 0, 2, mapId);
  startMatch(state, 0);
  let now = 0;
  while (state.phase !== "live") stepMatch(state, {}, (now += TICK_MS), TICK_MS);
  return { state, now };
}
const place = (p: Player, x: number, z: number) => Object.assign(p, { x, y: 0, z, velocityY: 0 });

describe("map registry", () => {
  it("resolves ids, defaults legacy state to Dustfront and refuses unknown maps", () => {
    expect(MAP_IDS).toEqual(["dustfront", "test-grid"]);
    expect(DEFAULT_MAP_ID).toBe("dustfront");
    expect(getMap(undefined)).toBe(DUSTFRONT);
    expect(getMap(null)).toBe(DUSTFRONT);
    expect(mapOf({})).toBe(DUSTFRONT);
    expect(mapOf({ mapId: "test-grid" })).toBe(TEST);
    expect(isMapId("test-grid")).toBe(true);
    expect(isMapId("frostline")).toBe(false);
    expect(isMapId(42)).toBe(false);
    expect(() => getMap("frostline")).toThrow("UNKNOWN_MAP:frostline");
    expect(() => createMatch({ A: "a", B: "b" }, 5, 0, 2, "frostline")).toThrow();
  });

  it("derives bullet, movement and visibility sets per map", () => {
    expect(TEST.worldSolids.map((s) => s.id)).toEqual([
      "test-wall",
      "test-pillar-w",
      "test-pillar-e",
      "test-step",
      "floor",
    ]);
    // Barriers stop movement only: they are never bullet or sight solids.
    expect(TEST.movementSolids.map((s) => s.id)).toContain("test-gorge");
    expect(TEST.worldSolids.some((s) => s.id === "test-gorge")).toBe(false);
    expect(TEST.worldBounds.length).toBe(TEST.worldSolids.length);
    expect(TEST.floor).toMatchObject({ w: 30, d: 20, surface: "wood" });
  });

  it("creates matches on the selected map and keeps legacy Dustfront state unchanged", () => {
    const legacy = createMatch({ A: "a", B: "b" }, 5, 0);
    expect("mapId" in legacy).toBe(false);
    expect("mapId" in createMatch({ A: "a", B: "b" }, 5, 0, 2, "dustfront")).toBe(false);
    expect(legacy.players.A).toMatchObject({ x: DUSTFRONT.spawns.A.x, z: DUSTFRONT.spawns.A.z });
    const test = createMatch({ A: "a", B: "b" }, 5, 0, 2, "test-grid");
    expect(test.mapId).toBe("test-grid");
    expect(test.players.A).toMatchObject({ x: -12, z: 0, yaw: EAST });
    expect(test.players.B).toMatchObject({ x: 12, z: 0, yaw: Math.PI / 2 });
  });
});

describe("authoritative simulation on a non-default map", () => {
  it("collides with that map's boxes and movement-only barriers", () => {
    const { state, now } = live("test-grid");
    let t = now,
      seq = 1;
    const walk = (x: number, z: number) => {
      place(state.players.A, x, z);
      for (let i = 0; i < 60; i++)
        stepMatch(state, { A: input(seq++, { forward: 1 }) }, (t += TICK_MS), TICK_MS);
      return state.players.A.x;
    };
    // The central wall and the gorge both stop the player at the same face.
    expect(walk(-3, 0)).toBeCloseTo(-0.5 - PLAYER_RADIUS, 5);
    expect(walk(-3, -7)).toBeCloseTo(-0.5 - PLAYER_RADIUS, 5);
    // Dustfront's solids are not in the way on this map: an open lane is crossed freely.
    expect(walk(-3, 8.5)).toBeGreaterThan(3);
    // Movement occupancy agrees for both entry points.
    expect(isMovementBlocked(0, 0, -7, false, TEST)).toBe(true);
    expect(isMovementBlocked(0, 0, 8.5, false, TEST)).toBe(false);
    // The arena rectangle is the map's: x = 14.8 is outside 30 m but open ground on Dustfront.
    expect(isMovementBlocked(14.8, 0, 0, false, TEST)).toBe(true);
    expect(isMovementBlocked(14.8, 0, 0, false, DUSTFRONT)).toBe(false);
  });

  it("steps onto the map's own risers", () => {
    const p = { ...createMatch({ A: "a", B: "b" }, 5, 0, 2, "test-grid").players.A };
    place(p, -11, -3);
    // 0.5 s at 5 m/s ends on the 2 m riser (x = -10 … -8).
    for (let i = 0; i < 15; i++) predictMovement(p, input(i + 1, { forward: 1 }), TICK_MS, TEST);
    expect(p.x).toBeGreaterThan(-10);
    expect(p.y).toBeCloseTo(0.3, 6);
    // Dustfront has no riser there: the same walk stays on the floor.
    const q = { ...p, x: -11, y: 0, z: -3, velocityY: 0 };
    for (let i = 0; i < 15; i++)
      predictMovement(q, input(i + 1, { forward: 1 }), TICK_MS, DUSTFRONT);
    expect(q.y).toBe(0);
  });

  it("stops bullets at the map's wall, never at its barriers", () => {
    const shoot = (z: number) => {
      const { state, now } = live("test-grid");
      place(state.players.A, -3, z);
      place(state.players.B, 3, z);
      stepMatch(state, { A: input(1, { fire: true }) }, now + TICK_MS, TICK_MS);
      return state;
    };
    const walled = shoot(0);
    expect(walled.players.B.hp).toBe(100);
    expect(walled.events.find((e) => e.type === "impact")?.impact?.solidId).toBe("test-wall");
    expect(shoot(-7).players.B.hp).toBeLessThan(100);
    expect(traceWorld({ x: -3, y: 1.6, z: -7 }, { x: 1, y: 0, z: 0 }, 6, TEST)).toBeNull();
  });

  it("hides and reveals the opponent with the map's sight solids", () => {
    const { state } = live("test-grid");
    place(state.players.A, -3, 0);
    place(state.players.B, 3, 0);
    expect(canSeeOpponent(state, "A")).toBe(false);
    expect(revealsOpponent(state, "A")).toBe(false);
    const frame = { state: { ...state, server: undefined } };
    const redacted = snapshotForPlayer(frame, "A");
    expect(redacted.visibility).toEqual({ A: true, B: false });
    expect(redacted.state.mapId).toBe("test-grid");
    // Across the gorge (movement-only) both see each other.
    place(state.players.A, -3, -7);
    place(state.players.B, 3, -7);
    expect(canSeeOpponent(state, "A")).toBe(true);
    expect(revealsOpponent(state, "B")).toBe(true);
  });

  it("keeps the map through rounds, halftime, checkpoints and reconnect snapshots", () => {
    let { state, now } = live("test-grid");
    const finishRound = () => {
      state.players.B.hp = 0;
      stepMatch(state, {}, (now += TICK_MS), TICK_MS);
      expect(state.phase).toBe("round-end");
      now = state.phaseEndsAt;
      stepMatch(state, {}, now, TICK_MS);
      expect(state.phase).toBe("live");
    };
    finishRound(); // round 2, same sides
    expect(state.round).toBe(2);
    expect(state.mapId).toBe("test-grid");
    expect(state.players.A).toMatchObject({ x: -12, z: 0 });
    // Checkpoint round trip (Durable Object storage) and a public snapshot keep the map.
    state = JSON.parse(JSON.stringify(state)) as MatchState;
    expect(mapOf(state)).toBe(TEST);
    finishRound(); // halftime → round 3, sides switched onto the test map's spawns
    expect(state.round).toBe(3);
    expect(state.players.A).toMatchObject({ x: 12, z: 0 });
    expect(state.players.B).toMatchObject({ x: -12, z: 0 });
    expect(state.events.some((e) => e.type === "halftime")).toBe(true);
    expect(HALFTIME_MS).toBeGreaterThan(ROUND_END_MS);
    expect(COUNTDOWN_MS).toBeGreaterThan(0);
    // Trail steps carry the map for the strict sight-test fallback.
    place(state.players.A, -3, 0);
    place(state.players.B, 3, 0);
    const step = trailStep(state, now);
    expect(step.mapId).toBe("test-grid");
    expect(trailForPlayer([step], "A", now - 1, now + 1)).toEqual([{ poseAt: now }]);
    // The same poses on Dustfront are judged against Dustfront's solids, not the test wall.
    expect(trailForPlayer([{ ...step, mapId: undefined }], "A", now - 1, now + 1)[0]).toEqual(
      expect.objectContaining({ poseAt: now }),
    );
  });
});

describe("bot and presentation on a non-default map", () => {
  it("patrols the map's routes on its own navigation grid", () => {
    expect(botItinerary(TEST, "south")).toEqual([
      { x: 8, z: 8 },
      { x: 3, z: 8 },
      { x: -9, z: 4 },
      { x: -3, z: -2.5 },
      { x: 3, z: -2.5 },
      { x: 5, z: 4 },
    ]);
    let r = 7;
    const random = () => (r = (r * 16807) % 2147483647) / 2147483647;
    let { state, now } = live("test-grid");
    const bot = createPracticeBot(random);
    let travelled = 0;
    for (let i = 0; i < 450; i++) {
      const before = { ...state.players.B };
      stepMatch(state, { B: bot.input(state, (now += TICK_MS)) }, now, TICK_MS);
      const b = state.players.B;
      travelled += Math.hypot(b.x - before.x, b.z - before.z);
      expect(isMovementBlocked(b.x, b.y, b.z, !!b.crouched, TEST)).toBe(false);
      if (state.phase !== "live") ({ state, now } = live("test-grid"));
    }
    expect(travelled).toBeGreaterThan(20);
    expect(bot.plan().waypoints.every((p) => !isMovementBlocked(p.x, 0, p.z, false, TEST))).toBe(
      true,
    );
  });

  it("client prediction, opponent bridging and death poses use the mounted map", () => {
    const reference = { ...createMatch({ A: "a", B: "b" }, 5, 0, 2, "test-grid").players.A };
    place(reference, -1.0, -7);
    const motion = new FrameMotion(TEST);
    motion.sample(reference, null, 16, new CameraCorrection());
    const pose = motion.sample(reference, input(1, { forward: 1 }), 100, new CameraCorrection());
    expect(pose.x).toBeLessThanOrEqual(-0.5 - PLAYER_RADIUS + 1e-9);
    // Same reference on Dustfront: nothing at (−0.85, −7) there, so the camera moves on.
    const dust = new FrameMotion(DUSTFRONT);
    dust.sample(reference, null, 16, new CameraCorrection());
    expect(
      dust.sample(reference, input(1, { forward: 1 }), 100, new CameraCorrection()).x,
    ).toBeGreaterThan(-0.85);
    expect(new RemotePresentation(TEST)).toBeInstanceOf(RemotePresentation);
    expect(deathSupport(-9, 1, -3, TEST)).toBeCloseTo(0.3, 6);
    expect(deathSupport(-9, 1, -3, DUSTFRONT)).toBe(0);
  });
});

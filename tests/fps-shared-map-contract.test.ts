import { describe, it, expect } from "vitest";
import { MAP_IDS, getMap, compileMap } from "../src/lib/fps/maps/registry";
import { PLAYER_RADIUS } from "../src/lib/fps/map";
import {
  createMatch,
  startMatch,
  stepMatch,
  predictMovement,
  isMovementBlocked,
  TICK_MS,
  COUNTDOWN_MS,
} from "../src/lib/fps/simulation";
import { traceWorld } from "../src/lib/fps/collision";
import { footstepSurface, validateFootsteps } from "../src/lib/fps/footstep-surfaces";
import { materialFootstep } from "../src/lib/fps/footsteps";
import type { Input } from "../src/lib/fps/protocol";
const command = (seq = 1, extra: Partial<Input> = {}): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  round: 1,
  seq,
  forward: 1,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  fire: false,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: false,
  ...extra,
});
function live(id: string) {
  const s = createMatch({ A: "a", B: "b" }, 13, 0, 2, id);
  startMatch(s, 0);
  stepMatch(s, {}, COUNTDOWN_MS, TICK_MS);
  return s;
}
describe("all maps inherit the shared FPS engine", () => {
  for (const id of MAP_IDS) {
    it(
      id +
        ": client prediction agrees with the authoritative simulation through jump/duck/walk/strafe",
      () => {
        const map = getMap(id),
          s = live(id);
        for (let seq = 1; seq <= 110; seq++) {
          const input = command(seq, {
            yaw: map.spawns.A.yaw + (seq > 70 ? 0.6 : 0),
            strafe: seq % 20 < 10 ? 0.4 : -0.4,
            jump: seq === 15,
            crouch: seq > 45 && seq < 65,
            walk: seq > 80,
            sprint: seq > 25 && seq < 45,
          });
          const expected = { ...s.players.A };
          predictMovement(expected, input, TICK_MS, map);
          stepMatch(s, { A: input }, s.server!.lastStepAt + 34, TICK_MS);
          for (const k of ["x", "y", "z", "velocityY"] as const)
            expect(s.players.A[k]).toBeCloseTo(expected[k] ?? 0, 8);
          expect(s.players.A.crouched).toBe(expected.crouched);
        }
      },
    );
    it(id + ": reachable low crates use the shared jump, without changing the map solids", () => {
      const map = getMap(id),
        before = JSON.stringify(map.boxes);
      let checked = 0;
      for (const b of map.boxes.filter(
        (b) => b.h >= 1 && b.h <= 1.45 && Math.abs(b.y - b.h / 2) < 1e-6,
      )) {
        const top = b.y + b.h / 2;
        if (isMovementBlocked(b.x, top, b.z, false, map)) continue;
        let approach = false,
          landed = false;
        for (const [nx, nz, yaw] of [
          [0, 1, 0],
          [0, -1, Math.PI],
          [1, 0, Math.PI / 2],
          [-1, 0, -Math.PI / 2],
        ]) {
          const p = {
            ...live(id).players.A,
            x: b.x + nx! * ((nx ? b.w : b.d) / 2 + PLAYER_RADIUS + 0.35),
            y: 0,
            z: b.z + nz! * ((nx ? b.w : b.d) / 2 + PLAYER_RADIUS + 0.35),
            velocityY: 0,
          };
          if (isMovementBlocked(p.x, 0, p.z, false, map)) continue;
          approach = true;
          for (let n = 0; n < 45; n++) {
            const forward = (p.x - b.x) * nx! + (p.z - b.z) * nz! > 0.1 ? 1 : 0;
            predictMovement(p, command(n + 1, { yaw: yaw!, forward, jump: n === 0 }), TICK_MS, map);
            if (Math.abs(p.y - top) < 1e-6 && p.velocityY === 0) landed = true;
          }
          if (landed) break;
        }
        if (approach) {
          expect(landed, id + ":" + b.id).toBe(true);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(0);
      expect(JSON.stringify(map.boxes)).toBe(before);
    });
    it(id + ": server footsteps follow authored ground and Shift walking stays silent", () => {
      const map = getMap(id),
        s = live(id);
      s.players.A.stepDistance = 1.59;
      stepMatch(
        s,
        { A: command(1, { yaw: map.spawns.A.yaw }) },
        s.server!.lastStepAt + 34,
        TICK_MS,
      );
      expect(s.events.find((e) => e.type === "step" && e.seat === "A")?.audio?.surface).toBe(
        map.footsteps?.floor ?? map.floor.surface,
      );
      s.players.A.stepDistance = 1.59;
      stepMatch(
        s,
        { A: command(2, { yaw: map.spawns.A.yaw, walk: true }) },
        s.server!.lastStepAt + 34,
        TICK_MS,
      );
      expect(s.events.some((e) => e.type === "step" && e.seat === "A")).toBe(false);
    });
  }
  it("snow, covered concrete, capped roofs and jungle planks resolve independently of impact materials", () => {
    for (const [id, point, expected] of [
      ["frostline", { x: -18, y: 0, z: 0 }, "snow"],
      ["frostline", { x: 0, y: 0, z: 14 }, "concrete"],
      ["lost-trail", { x: -18, y: 0, z: 0 }, "dirt"],
    ] as const) {
      const map = getMap(id),
        hit = traceWorld({ ...point, y: point.y + 0.15 }, { x: 0, y: -1, z: 0 }, 0.4, map);
      expect(footstepSurface(map, point, hit)).toBe(expected);
    }
    const frost = getMap("frostline"),
      box = frost.boxes.find((b) => b.id === "generator-stack")!;
    const p = { x: box.x, y: box.y + box.h / 2, z: box.z },
      hit = traceWorld({ ...p, y: p.y + 0.15 }, { x: 0, y: -1, z: 0 }, 0.4, frost)!;
    expect(hit.surface).toBe("metal");
    expect(footstepSurface(frost, p, hit)).toBe("snow");
    const jungle = getMap("lost-trail"),
      wood = jungle.boxes.find((b) => b.surface === "wood")!;
    const wp = { x: wood.x, y: wood.y + wood.h / 2, z: wood.z };
    expect(
      footstepSurface(
        jungle,
        wp,
        traceWorld({ ...wp, y: wp.y + 0.15 }, { x: 0, y: -1, z: 0 }, 0.4, jungle),
      ),
    ).toBe("wood");
  });
  it("new maps opt into shared sounds through metadata and reject misspelled solid ids", () => {
    const base = getMap("dustfront");
    const next = compileMap({
      ...base,
      id: "fourth-map",
      footsteps: { floor: "dirt", tops: { [base.boxes[0]!.id]: "wood" } },
    });
    expect(footstepSurface(next, { x: 0, y: 0, z: 0 }, null)).toBe("dirt");
    expect(() => validateFootsteps({ ...base, footsteps: { tops: { typo: "snow" } } })).toThrow(
      "INVALID_FOOTSTEP_TOP",
    );
  });
  it("snow and dirt are distinct non-tonal buffers baked once with finite bounded samples", () => {
    const source = Float32Array.from(
      { length: 16000 },
      (_, i) => Math.sin(i * 0.08) * Math.exp(-i / 1200),
    );
    const snow = materialFootstep(source, 48000, "snow"),
      dirt = materialFootstep(source, 48000, "dirt");
    expect(snow).not.toEqual(dirt);
    expect(snow).not.toEqual(materialFootstep(source, 48000, "metal"));
    for (const b of [snow, dirt])
      for (const v of b) expect(Number.isFinite(v) && Math.abs(v) <= 0.90001).toBe(true);
  });
});

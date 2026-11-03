import { describe, it, expect } from "vitest";
import { distanceGain, distanceFilter, hearingRange } from "../src/lib/fps/spatial-audio";
import { footstepPan } from "../src/lib/fps/footsteps";
import { BombReveal, bombViewFor } from "../src/lib/fps/bomb/snapshot";
import { createBombMatch, startBombMatch } from "../src/lib/fps/bomb/match";
import { revealsBody } from "../src/lib/fps/visibility";
import { SANDGATE } from "../src/lib/fps/bomb/sandgate";

describe("Shared combat distance audio", () => {
  it("makes nearby, distant and blocked sound progressively quieter and duller", () => {
    for (const kind of ["shot", "step"] as const) {
      const range = hearingRange(kind);
      expect(distanceGain(2, range)).toBeGreaterThan(distanceGain(10, range));
      expect(distanceGain(10, range)).toBeGreaterThan(distanceGain(20, range));
      expect(distanceGain(range, range)).toBe(0);
      expect(distanceGain(10, range, true)).toBeLessThan(distanceGain(10, range));
    }
    expect(distanceFilter(5, false)).toBeGreaterThan(distanceFilter(35, false));
    expect(distanceFilter(5, true)).toBeLessThan(distanceFilter(35, false));
    expect(hearingRange("shot", true)).toBeGreaterThan(hearingRange("shot", false, true));
  });
  it("rotates left/right with the current listener, for every weapon and footstep", () => {
    expect(footstepPan(Math.PI / 2, 0)).toBeCloseTo(1);
    expect(footstepPan(Math.PI / 2, Math.PI)).toBeCloseTo(-1);
    expect(footstepPan(-Math.PI / 2, 0)).toBeCloseTo(-1);
  });
  it("keeps hidden enemy footsteps directional and material-specific without disclosing a position", () => {
    const s = createBombMatch(
      Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true })),
      0,
      7,
    );
    startBombMatch(s, 0);
    s.phase = "live";
    Object.assign(s.players[0]!, { x: 0, y: 0, z: -5 });
    Object.assign(s.players[6]!, { x: -16, y: 0, z: -5 });
    s.events = [
      {
        id: 1,
        type: "step",
        slot: 6,
        text: "step",
        at: 1000,
        audio: { kind: "step", position: { x: -16, y: 0, z: -5 }, surface: "metal", soft: true },
      },
    ];
    const v = bombViewFor(s, 0, null, new BombReveal(), 1000);
    const e = v.events.find((e) => e.type === "sound")!;
    expect(e).toMatchObject({ kind: "step", surface: "metal", soft: true, at: 1000 });
    expect(e).toHaveProperty("worldBearing");
    expect(e).toHaveProperty("distance");
    expect(e).not.toHaveProperty("slot");
    expect(e).not.toHaveProperty("audio");
    expect(e).not.toHaveProperty("position");
  });
});
describe("Bomb reveal uses the shared latency-aware envelope", () => {
  it("agrees with the core reveal rule for static and moving viewers", () => {
    const s = createBombMatch(
      Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true })),
      0,
      7,
    );
    startBombMatch(s, 0);
    let seed = 11;
    const rnd = () => ((seed = Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    for (let i = 0; i < 120; i++) {
      const p = s.players[0]!,
        q = s.players[5]!;
      Object.assign(p, { x: rnd() * 60 - 30, z: rnd() * 60 - 30, y: 0, crouched: rnd() < 0.3 });
      Object.assign(q, { x: rnd() * 60 - 30, z: rnd() * 60 - 30, y: 0, crouched: rnd() < 0.3 });
      const gate = new BombReveal();
      gate.visible(0, p, q, 1000);
      const dx = (rnd() - 0.5) * 0.25,
        dz = (rnd() - 0.5) * 0.25;
      p.x += dx;
      p.z += dz;
      const expected = revealsBody(SANDGATE, p, q, undefined, {
        vx: dx / 50,
        vz: dz / 50,
        aheadMs: 250,
      });
      // Outside the reveal hold so this compares the actual shared decision.
      const fresh = new BombReveal();
      expect(fresh.visible(0, p, q, 2000, undefined, 250)).toBe(
        revealsBody(SANDGATE, p, q, undefined, { vx: 0, vz: 0, aheadMs: 250 }),
      );
      if (expected) expect(gate.visible(0, p, q, 1050, undefined, 250)).toBe(true);
    }
  });
});

import { describe, it, expect } from "vitest";
import { footstepPan, materialFootstep } from "../src/lib/fps/footsteps";
import { createMatch } from "../src/lib/fps/simulation";
import { snapshotForPlayer } from "../src/lib/fps/visibility";
describe("audible footsteps", () => {
  it("tracks left/right as the listener turns, without server-yaw latency", () => {
    expect(footstepPan(Math.PI / 2, 0)).toBeCloseTo(1);
    expect(footstepPan(-Math.PI / 2, 0)).toBeCloseTo(-1);
    expect(footstepPan(0, Math.PI / 2)).toBeCloseTo(1);
    expect(footstepPan(Math.PI / 2, Math.PI)).toBeCloseTo(-1);
  });
  it("bakes distinct, bounded material impacts without changing duration", () => {
    const source = Float32Array.from(
      { length: 12000 },
      (_, i) => Math.sin(i * 0.08) * Math.exp(-i / 1200),
    );
    const wood = materialFootstep(source, 48000, "wood"),
      metal = materialFootstep(source, 48000, "metal");
    expect(wood.length).toBe(source.length);
    expect(metal.length).toBe(source.length);
    expect(wood).not.toEqual(metal);
    expect(wood).not.toEqual(source);
    for (const buffer of [wood, metal])
      for (const value of buffer) expect(Math.abs(value)).toBeLessThanOrEqual(0.90001);
  });
  it("sends audible direction and time, never the hidden source coordinates", () => {
    const state = createMatch({ A: "a", B: "b" }, 13, 0);
    Object.assign(state.players.A, { x: 0, z: -8, yaw: 0 });
    state.events = [
      {
        type: "step",
        text: "",
        seat: "B",
        id: 1,
        at: 1234,
        audio: { kind: "step", surface: "wood", position: { x: 2, y: 0, z: -8 } },
      },
    ];
    const frame = snapshotForPlayer({ state }, "A", false);
    expect(frame.state.events[0]?.at).toBe(1234);
    expect(frame.state.events[0]?.audio?.bearing).toBeCloseTo(Math.PI / 2);
    expect(frame.state.events[0]?.audio).not.toHaveProperty("position");
    state.events[0]!.audio!.position!.x = 100;
    expect(snapshotForPlayer({ state }, "A", false).state.events[0]?.audio).not.toHaveProperty(
      "bearing",
    );
  });
});

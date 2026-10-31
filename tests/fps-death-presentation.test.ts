import { describe, it, expect } from "vitest";
import { deathPose, deathSupport, isDefeatedView } from "../src/lib/fps/death-presentation";
import { createMatch } from "../src/lib/fps/simulation";
import { BOXES } from "../src/lib/fps/map";

describe("cosmetic elimination fall", () => {
  it("shows the screen effect only to the defeated player and clears it on respawn", () => {
    const state = createMatch({ A: "a", B: "b" }, 5, 0);
    state.players.A.hp = 0;
    state.phase = "round-end";
    expect(isDefeatedView(state, "A", false)).toBe(true);
    expect(isDefeatedView(state, "B", false)).toBe(false);
    expect(isDefeatedView(state, "A", true)).toBe(false);
    expect(isDefeatedView(state, null, false)).toBe(false);
    state.phase = "completed";
    expect(isDefeatedView(state, "A", false)).toBe(true);
    state.phase = "live";
    state.players.A.hp = 100;
    expect(isDefeatedView(state, "A", false)).toBe(false);
  });
  it("starts upright, settles on its back and stays still during the recap", () => {
    expect(deathPose(0, 0, 0)).toMatchObject({ progress: 0, pitch: 0, height: 0, backward: 0 });
    let previous = 0;
    for (let age = 0; age < 1000; age += 7) {
      const pose = deathPose(age, 0, 0);
      expect(pose.pitch).toBeGreaterThanOrEqual(previous);
      expect(pose.height).toBeGreaterThanOrEqual(0);
      previous = pose.pitch;
    }
    expect(deathPose(900, 0, 0)).toEqual(deathPose(3000, 0, 0));
    expect(deathPose(900, 0, 0).pitch).toBe(Math.PI / 2);
  });
  it("drops an airborne victim to the supporting floor and respects crate tops", () => {
    expect(deathPose(900, 1, 0).height).toBeCloseTo(0.22);
    const box = BOXES[0]!;
    const top = box.y + box.h / 2;
    expect(deathSupport(box.x, top, box.z)).toBe(top);
    expect(deathSupport(9, 1, 12)).toBe(0);
    expect(deathPose(900, top, top).height).toBeCloseTo(top + 0.22);
  });
});

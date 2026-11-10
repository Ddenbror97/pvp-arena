import { describe, expect, it } from "vitest";
import { clampPitch, mouseLook, moveAxes, PITCH_LIMIT, wrapYaw } from "../src/lib/fps/look";

describe("shared look and movement keys", () => {
  it("turns as the three clients did", () => {
    // The expressions the renderers carried before look.ts.
    const before = (yaw: number, pitch: number, dx: number, dy: number, look: number) => ({
      yaw: yaw - dx * look,
      pitch: Math.max(-1.45, Math.min(1.45, pitch - dy * look)),
    });
    for (const [yaw, pitch, dx, dy, look] of [
      [0, 0, 10, -4, 0.002],
      [3.1, 1.44, -250, -90, 0.0031],
      [-3.14, -1.4, 37, 500, 0.0007],
    ] as const)
      expect(mouseLook(yaw, pitch, dx, dy, look)).toEqual(before(yaw, pitch, dx, dy, look));
    expect(clampPitch(9)).toBe(PITCH_LIMIT);
    expect(clampPitch(-9)).toBe(-PITCH_LIMIT);
    for (const yaw of [0, 3.2, -3.2, 7, -7, Math.PI, -Math.PI])
      expect(wrapYaw(yaw)).toBe(
        ((((yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI,
      );
  });

  it("reads the movement keys, rebound or not", () => {
    expect(moveAxes(new Set(["KeyW", "KeyD"]))).toEqual({ forward: 1, strafe: 1 });
    expect(moveAxes(new Set(["KeyW", "KeyS", "KeyA"]))).toEqual({ forward: 0, strafe: -1 });
    const binds = { forward: "ArrowUp", back: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
    expect(moveAxes(new Set(["ArrowDown", "KeyW"]), binds)).toEqual({ forward: -1, strafe: 0 });
  });
});

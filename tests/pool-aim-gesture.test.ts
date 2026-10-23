import { describe, expect, it } from "vitest";
import {
  AIM_DEADZONE,
  BALL_R,
  CUE_GRAB_R,
  aimStep,
  pointerIntent,
  startAim,
  type AimGesture,
  type Point,
} from "../src/lib/pool/aim-gesture";
import { BALL_R as PHYS_R } from "../src/lib/pool/physics";

const cue: Point = { x: 635_000, y: 635_000 };

function follow(start: Point, moves: readonly Point[], fine = false, angle = 0) {
  let gesture: AimGesture = startAim(start, cue);
  let current = angle;
  const angles: Array<number | null> = [];
  const first = aimStep(gesture, start, cue, current, fine);
  gesture = first.gesture;
  angles.push(first.angle);
  if (first.angle != null) current = first.angle;
  for (const point of moves) {
    const step = aimStep(gesture, point, cue, current, fine);
    gesture = step.gesture;
    angles.push(step.angle);
    if (step.angle != null) current = step.angle;
  }
  return { angles, gesture, current };
}

describe("pointer aim", () => {
  it("uses the same ball radius as the physics", () => {
    expect(BALL_R).toBe(PHYS_R);
    expect(CUE_GRAB_R).toBe(PHYS_R);
  });

  it("does not change the angle when a press stays on the cue ball", () => {
    const start = { x: cue.x + Math.round(BALL_R * 0.4), y: cue.y };
    const played = follow(start, [start, { x: start.x + 20, y: start.y }]);
    expect(played.angles.every((angle) => angle == null)).toBe(true);
    expect(played.gesture).toMatchObject({ kind: "from-cue", armed: false });
  });

  it("aims along a drag that begins inside the cue ball", () => {
    const start = { x: cue.x - Math.round(BALL_R * 0.5), y: cue.y };
    const end = { x: start.x, y: start.y - (AIM_DEADZONE + BALL_R) };
    const played = follow(start, [end]);
    expect(played.angles[0]).toBeNull();
    expect(played.current).toBe(270_000);
    expect(played.gesture).toMatchObject({ kind: "from-cue", armed: true });
  });

  it("aims a short outward drag without snapping through the cue center", () => {
    const start = { x: cue.x + Math.round(BALL_R * 0.5), y: cue.y };
    const end = { x: start.x, y: start.y + AIM_DEADZONE + 50 };
    const played = follow(start, [end]);
    expect(played.current).toBe(90_000);
  });

  it("keeps a long fast drag on the drag direction", () => {
    const start = { x: cue.x + Math.round(BALL_R * 0.5), y: cue.y };
    const end = { x: start.x + BALL_R * 8, y: start.y - BALL_R * 8 };
    const played = follow(start, [end]);
    expect(played.current).toBeGreaterThan(300_000);
    expect(played.current).toBeLessThan(330_000);
  });

  it("sets absolute aim when the press starts outside the ball", () => {
    const start = { x: cue.x + BALL_R * 4, y: cue.y };
    const played = follow(start, []);
    expect(played.angles[0]).toBe(0);
  });

  it("does not jump when an outside drag crosses the cue ball", () => {
    const start = { x: cue.x + BALL_R * 3, y: cue.y };
    const played = follow(start, [cue, { x: cue.x + 10, y: cue.y }]);
    expect(played.angles[0]).toBe(0);
    expect(played.angles[1]).toBeNull();
    expect(played.angles[2]).toBeNull();
    expect(played.current).toBe(0);
  });

  it("shortens the change when fine aim is held", () => {
    const start = { x: cue.x + BALL_R * 4, y: cue.y + BALL_R };
    const played = follow(start, [], true, 0);
    expect(played.current).toBeGreaterThan(0);
    expect(played.current).toBeLessThan(20_000);
  });

  it("places only when ball-in-hand starts on the cue ball", () => {
    const onBall = { x: cue.x + BALL_R, y: cue.y };
    const onCloth = { x: cue.x + BALL_R * 3, y: cue.y };
    expect(pointerIntent(true, onBall, cue)).toBe("place");
    expect(pointerIntent(true, onCloth, cue)).toBe("aim");
    expect(pointerIntent(false, onBall, cue)).toBe("aim");
  });
});

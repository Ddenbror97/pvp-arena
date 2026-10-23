import { describe, expect, it } from "vitest";
import {
  AIM_LINE_CLEAR,
  AIM_LINE_GAP,
  AIM_LINE_REACH,
  shortAimLine,
} from "../src/lib/pool/aim-line";
import { BALL_R, cushionLimit } from "../src/lib/pool/physics";

function still(id: number, x: number, y: number, pocketed = false) {
  return { id, x, y, pocketed };
}

const cue = { x: 700_000, y: 635_000 };

function length(line: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  return Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y);
}

describe("short aim line", () => {
  it("marks a short shot direction and stops before a length of the table", () => {
    const line = shortAimLine([still(0, cue.x, cue.y)], cue, 0);
    expect(line).not.toBeNull();
    expect(line!.to.x).toBeGreaterThan(line!.from.x);
    expect(Math.abs(line!.to.y - cue.y)).toBeLessThan(2);
    expect(line!.from.x - cue.x).toBeGreaterThan(BALL_R);
    expect(line!.to.x - cue.x).toBeLessThan(AIM_LINE_REACH + 2);
    expect(line!.to.x - cue.x).toBeGreaterThan(AIM_LINE_REACH - 2);
    expect(length(line!)).toBeLessThan(AIM_LINE_REACH);
    expect(length(line!)).toBeGreaterThan(BALL_R * 12);
  });

  it("stops short of a nearby object ball and does not mark the contact point", () => {
    const object = still(3, cue.x + BALL_R * 10, cue.y + 40);
    const open = shortAimLine([still(0, cue.x, cue.y)], cue, 0);
    const line = shortAimLine([still(0, cue.x, cue.y), object], cue, 0);
    expect(line).not.toBeNull();
    expect(line!.to.x).toBeLessThan(open!.to.x);
    const gap = Math.hypot(object.x - line!.to.x, object.y - line!.to.y);
    expect(gap).toBeGreaterThan(BALL_R * 2 + AIM_LINE_CLEAR - 2);
    expect(gap).toBeLessThan(BALL_R * 2 + AIM_LINE_CLEAR + BALL_R);
  });

  it("keeps its length when the only ball ahead is past the reach", () => {
    const far = still(4, cue.x + AIM_LINE_REACH + BALL_R * 6, cue.y);
    const open = shortAimLine([still(0, cue.x, cue.y)], cue, 0);
    const line = shortAimLine([still(0, cue.x, cue.y), far], cue, 0);
    expect(line!.to.x).toBeCloseTo(open!.to.x, 0);
  });

  it("ignores a ball beside the shot and a pocketed ball on the line", () => {
    const beside = still(5, cue.x + BALL_R * 8, cue.y + BALL_R * 4);
    const down = still(6, cue.x + BALL_R * 8, cue.y, true);
    const open = shortAimLine([still(0, cue.x, cue.y)], cue, 0);
    const line = shortAimLine([still(0, cue.x, cue.y), beside, down], cue, 0);
    expect(line!.to.x).toBeCloseTo(open!.to.x, 0);
  });

  it("ends at the cushion instead of running through the rail", () => {
    const wall = cushionLimit();
    const near = { x: wall.maxX - BALL_R * 3, y: cue.y };
    const line = shortAimLine([still(0, near.x, near.y)], near, 0);
    expect(line).not.toBeNull();
    expect(line!.to.x).toBeLessThanOrEqual(wall.maxX + 1);
    expect(line!.to.x).toBeGreaterThan(wall.maxX - 2);
    expect(line!.to.x - near.x).toBeLessThan(AIM_LINE_REACH);
  });

  it("aims up the table on a 90 degree angle and leaves a gap off the cue", () => {
    const line = shortAimLine([still(0, cue.x, cue.y)], cue, 90_000);
    expect(line!.to.y).toBeGreaterThan(line!.from.y);
    expect(Math.abs(line!.from.x - cue.x)).toBeLessThan(2);
    expect(line!.from.y - cue.y).toBeGreaterThanOrEqual(AIM_LINE_GAP - 2);
  });

  it("draws nothing when an object ball is already against the cue", () => {
    const frozen = still(7, cue.x + BALL_R * 2, cue.y);
    expect(shortAimLine([still(0, cue.x, cue.y), frozen], cue, 0)).toBeNull();
  });
});

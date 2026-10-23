import { describe, expect, it } from "vitest";
import { identityOrientation, rollOrientation } from "../src/lib/pool/spheres";
import {
  BALL_R,
  TABLE_H,
  TABLE_W,
  simulate,
  traceAim,
  type Ball,
  type ShotInput,
} from "../src/lib/pool/physics";

const shot = (over: Partial<ShotInput> = {}): ShotInput => ({
  angleMilli: 0,
  power: 8000,
  spinX: 0,
  spinY: 0,
  placeX: null,
  placeY: null,
  calledPocket: null,
  ...over,
});

function still(id: number, x: number, y: number): Ball {
  return { id, x, y, vx: 0, vy: 0, spin: 0, pocketed: false };
}

describe("pool aim trace", () => {
  it("launches with the same integer velocity the shot will use", () => {
    const start = [still(0, 635_000, 635_000)];
    const input = shot({ angleMilli: 0, power: 5000, spinX: 40, spinY: -400 });
    const trace = traceAim(start, input);
    const played = simulate(start, input, true);
    const cue = played.frames[0]?.find((ball) => ball.id === 0);
    expect(trace).not.toBeNull();
    expect(cue).toBeTruthy();
    expect(cue!.x - start[0]!.x).toBe(trace!.launch.vx);
    expect(cue!.y - start[0]!.y).toBe(trace!.launch.vy);
    expect(trace!.launch.vy).not.toBe(0);
  });

  it("names the same first ball simulate will hit", () => {
    const start = [still(0, 400_000, 635_000), still(3, 900_000, 640_000)];
    const input = shot({ angleMilli: 0, power: 7000 });
    const trace = traceAim(start, input);
    const played = simulate(start, input);
    expect(trace?.contact?.id).toBe(played.firstContact);
    expect(trace?.contact?.id).toBe(3);
    const cue = trace!.contact!.cue;
    const object = trace!.contact!.object;
    const gap = Math.hypot(object.x - cue.x, object.y - cue.y);
    expect(gap).toBeGreaterThan(BALL_R * 2 - 80);
    expect(gap).toBeLessThan(BALL_R * 2 + 80);
    const nx = object.x - cue.x;
    const ny = object.y - cue.y;
    const speed = Math.hypot(trace!.contact!.ovx, trace!.contact!.ovy) || 1;
    const along = (trace!.contact!.ovx * nx + trace!.contact!.ovy * ny) / speed / gap;
    expect(along).toBeGreaterThan(0.9);
  });

  it("reflects an open-table cue off the far cushion and does not invent a second bank", () => {
    const start = [still(0, TABLE_W / 2, TABLE_H / 2)];
    const trace = traceAim(start, shot({ angleMilli: 0, power: 9000 }));
    expect(trace?.contact).toBeNull();
    expect(trace?.cuePocketed).toBe(false);
    expect(trace?.cueBank).not.toBeNull();
    expect(trace!.cueBank!.dir.x).toBeLessThan(0);
    expect(trace!.cueStop.x).toBeGreaterThan(TABLE_W - BALL_R * 2);
  });

  it("does not draw a bank when the cue is headed into the side pocket", () => {
    const start = [still(0, TABLE_W / 2, TABLE_H / 2)];
    const trace = traceAim(start, shot({ angleMilli: 90_000, power: 9000 }));
    expect(trace?.cueBank).toBeNull();
    expect(trace?.cuePocketed).toBe(true);
  });

  it("keeps follow off the initial direction", () => {
    const start = [still(0, 500_000, 400_000)];
    const plain = traceAim(start, shot({ spinY: 0 }));
    const follow = traceAim(start, shot({ spinY: 1000 }));
    expect(follow?.launch).toEqual(plain?.launch);
  });
});

describe("presentation roll", () => {
  it("turns the facing pole in the direction of travel", () => {
    const rolled = rollOrientation(identityOrientation(), 12, 0, BALL_R * (Math.PI / 2));
    const facingX = rolled[2] ?? 0;
    const facingZ = rolled[8] ?? 0;
    expect(facingX).toBeGreaterThan(0.8);
    expect(Math.abs(facingZ)).toBeLessThan(0.2);
  });

  it("leaves the orientation alone when the ball has not moved", () => {
    const start = identityOrientation();
    expect(rollOrientation(start, 0, 0, 0)).toEqual(start);
  });
});

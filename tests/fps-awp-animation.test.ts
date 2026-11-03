import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AWP } from "@/lib/fps/primary";
import { AWP_TIMELINE } from "@/lib/fps/awp-timeline";
import {
  AWP_EMPTY_RELOAD,
  AWP_TACTICAL_RELOAD,
  boltPose,
  clipKeys,
  RELOAD_BOLT,
  SHOT_BOLT,
} from "@/lib/fps/awp-animation";
import { AwpScope, SCOPED_SENSITIVITY, scopedFov } from "@/lib/fps/awp-scope";
import { sampleSegment } from "@/lib/fps/reload-animation";

/** The sound build's TIMES (the script writes WAVs when imported, so it is read as text). */
function audioTimes() {
  const source = readFileSync("scripts/fps/build-awp-audio.mjs", "utf8");
  const literal = source.match(/export const TIMES = (\{[\s\S]*?\n\});/)?.[1];
  if (!literal) throw new Error("TIMES not found in build-awp-audio.mjs");
  return Function(`return ${literal}`)() as {
    bolt: Record<string, number>;
    tactical: Record<string, number>;
    empty: Record<string, number>;
  };
}

describe("AWP timeline", () => {
  it("is the server's clocks: 1.463 s bolt cycle, 3.67 s reloads", () => {
    expect(AWP_TIMELINE.cycleMs).toBe(AWP.cycleMs);
    expect(AWP_TIMELINE.reloadMs).toBe(AWP.reloadMs);
    expect(AWP_TIMELINE.bolt.handToGrip[1]).toBeLessThan(AWP.cycleMs);
    expect(AWP_TIMELINE.empty.settle[1]).toBe(AWP.reloadMs);
    expect(AWP_TIMELINE.tactical.settle[1]).toBe(AWP.reloadMs);
  });

  it("puts every sound on its animation frame (build-awp-audio.mjs TIMES)", () => {
    const t = audioTimes(),
      b = AWP_TIMELINE.bolt,
      tac = AWP_TIMELINE.tactical,
      e = AWP_TIMELINE.empty;
    expect(t.bolt).toEqual({
      lift: b.lift[0],
      back: b.back[0],
      eject: b.eject,
      forward: b.forward[0],
      lower: b.lower[0],
      cycle: AWP.cycleMs,
    });
    expect(t.tactical).toMatchObject({
      release: tac.release,
      magOut: tac.magOut[0],
      seat: tac.seat,
      guard: tac.handToGuard[0],
      length: AWP.reloadMs,
    });
    expect(t.empty).toMatchObject({
      release: e.release,
      magOut: e.magOut[0],
      seat: e.seat,
      lift: e.lift[0],
      back: e.back[0],
      forward: e.forward[0],
      lower: e.lower2[0],
      length: AWP.reloadMs,
    });
  });
});

describe("AWP clips", () => {
  it("keeps every key track in time order inside 0..1", () => {
    for (const clip of [AWP_TACTICAL_RELOAD, AWP_EMPTY_RELOAD])
      for (const track of clipKeys(clip)) {
        for (let i = 1; i < track.length; i++)
          expect(track[i]!.t, clip.kind).toBeGreaterThanOrEqual(track[i - 1]!.t);
        expect(track[0]!.t).toBe(0);
        expect(track.at(-1)!.t).toBe(1);
      }
  });

  it("holds the magazine in the support hand from contact to seating", () => {
    const tac = AWP_TIMELINE.tactical;
    for (const ms of [tac.magOut[0] + 50, tac.away[0] + 400, tac.seat - 20]) {
      const s = sampleSegment(AWP_TACTICAL_RELOAD.support, ms / AWP.reloadMs);
      expect([s.a.anchor, s.b.anchor], `${ms} ms`).toEqual(["mag", "mag"]);
    }
    const end = sampleSegment(AWP_TACTICAL_RELOAD.support, 1);
    expect(end.b.anchor).toBe("guard");
  });

  it("works the bolt with the right hand after each shot and returns it to the grip", () => {
    const at = (ms: number) => boltPose(ms, SHOT_BOLT);
    expect(at(0)).toMatchObject({ hand: 0, lift: 0, back: 0 });
    // On the knob, handle up, drawn back as the case ejects.
    const eject = at(AWP_TIMELINE.bolt.eject);
    expect(eject.hand).toBe(1);
    expect(eject.lift).toBe(1);
    expect(eject.back).toBeGreaterThan(0.6);
    // Home and turned down, then the hand is back on the grip before the next shot is allowed.
    expect(at(AWP_TIMELINE.bolt.lower[1])).toMatchObject({ back: 0, lift: 0, hand: 1 });
    expect(at(AWP.cycleMs - 1)).toMatchObject({ hand: 0, lift: 0, back: 0 });
  });

  it("chambers a round with the bolt at the end of an empty reload only", () => {
    const e = AWP_TIMELINE.empty;
    expect(boltPose(e.seat, RELOAD_BOLT).hand).toBe(0);
    expect(boltPose(e.back[1], RELOAD_BOLT)).toMatchObject({ hand: 1, lift: 1, back: 1 });
    expect(boltPose(AWP.reloadMs, RELOAD_BOLT)).toMatchObject({ hand: 0, lift: 0, back: 0 });
  });
});

describe("AWP scope (client)", () => {
  it("is a true 4× zoom of the 70° camera, with a quarter of the mouse sensitivity", () => {
    const zoomed = scopedFov(70);
    const ratio = Math.tan((zoomed * Math.PI) / 360) / Math.tan((70 * Math.PI) / 360);
    expect(ratio).toBeCloseTo(0.25, 10);
    expect(zoomed).toBeCloseTo(19.86, 2);
    expect(SCOPED_SENSITIVITY).toBe(0.25);
  });

  it("predicts the server: no zoom while reloading, cycling or holding the knife", () => {
    const scope = new AwpScope();
    const p = {
      hp: 100,
      weapon: "rifle" as const,
      primary: "awp" as const,
      reloadUntil: 0,
      lastShotAt: -1e12,
    };
    scope.toggle();
    expect(scope.update(p, 16, 1000, 1000)).toBe(true);
    for (let i = 0; i < 20; i++) scope.update(p, 16, 1000, 1000);
    expect(scope.overlay).toBe(true);
    expect(scope.fov(70)).toBeCloseTo(scopedFov(70));
    // A shot drops the lens at once; the zoom comes back after the bolt (wish still held).
    scope.shot(2000);
    expect(scope.overlay).toBe(false);
    expect(scope.update(p, 16, 2100, 2100)).toBe(false);
    expect(scope.update(p, 16, 2000 + AWP.cycleMs + 1, 2000 + AWP.cycleMs + 1)).toBe(true);
    // A reload cancels the wish for good.
    expect(scope.update({ ...p, reloadUntil: 9000 }, 16, 5000, 5000)).toBe(false);
    expect(scope.wanted).toBe(false);
    expect(scope.update(p, 16, 9500, 9500)).toBe(false);
    // The rifle or the knife never zoom.
    scope.toggle();
    expect(scope.update({ ...p, weapon: "knife" }, 16, 9600, 9600)).toBe(false);
    expect(scope.wanted).toBe(false);
    expect(scope.update({ ...p, primary: "rifle" }, 16, 9700, 9700)).toBe(false);
  });
});

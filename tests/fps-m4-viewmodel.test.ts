import { describe, expect, it } from "vitest";
import {
  INSPECT_MS,
  M4_BOLT_RELEASE_AT,
  M4_EMPTY_RELOAD,
  M4_INSPECT,
  M4_RELOAD_CLIPS,
  M4_TACTICAL_RELOAD,
  RELOAD_CLIPS,
  sampleNumber,
  sampleSegment,
  sampleVec,
  type ReloadClip,
} from "@/lib/fps/reload-animation";
import { CASING_LIFETIME_MS, CASING_POOL } from "@/lib/fps/shell-casings";

const tracks = (clip: ReloadClip) => ({
  weaponPosition: clip.weaponPosition,
  weaponRotation: clip.weaponRotation,
  magPosition: clip.magPosition,
  magRotation: clip.magRotation,
});
const rest = { anchor: "guard", offset: [0, 0, 0], rotation: [0, 0, 0] };

describe.each(Object.values(M4_RELOAD_CLIPS))("Police M4A1 $kind reload", (clip) => {
  it("starts and ends exactly at rest and keeps keys ordered inside 0..1", () => {
    for (const [name, track] of Object.entries(tracks(clip))) {
      expect(sampleVec(track, 0), name).toEqual([0, 0, 0]);
      expect(sampleVec(track, 1), name).toEqual([0, 0, 0]);
      const times = track.map((k) => k.t);
      expect(times[0]).toBe(0);
      expect(times.at(-1)).toBe(1);
      for (let i = 1; i < times.length; i++) expect(times[i]!).toBeGreaterThan(times[i - 1]!);
    }
    expect(clip.support[0]!.v).toEqual(rest);
    expect(clip.support.at(-1)!.v).toEqual(rest);
  });

  it("never touches the charging handle (AR: bolt catch, not a rack)", () => {
    for (let p = 0; p <= 1; p += 0.01) expect(sampleNumber(clip.boltTravel, p)).toBe(0);
    for (const key of clip.support) expect(["handle", "racked"]).not.toContain(key.v.anchor);
  });

  it("drops the magazine straight out of the well and seats it straight up", () => {
    // Leaving the well: the first moving key translates straight down with no rotation yet.
    const firstMove = clip.magPosition.find((k) => k.v.some((v) => v !== 0))!;
    expect(firstMove.v[0]).toBe(0);
    expect(firstMove.v[2]).toBe(0);
    expect(firstMove.v[1]).toBeLessThan(0);
    expect(sampleVec(clip.magRotation, firstMove.t)).toEqual([0, 0, 0]);
    // Last approach before seating: under the well, nearly upright (< 0.1 rad), then home.
    const seat = clip.magPosition.findIndex((k, i) => i > 2 && k.v.every((v) => v === 0));
    const approach = clip.magPosition[seat - 1]!;
    expect(Math.abs(approach.v[0])).toBeLessThan(0.01);
    expect(approach.v[1]).toBeLessThan(0);
    expect(Math.max(...sampleVec(clip.magRotation, approach.t).map(Math.abs))).toBeLessThan(0.1);
  });
});

describe("tactical vs empty", () => {
  it("tactical keeps the magazine in hand; empty lets it fall free and strikes the bolt catch", () => {
    // Tactical: the support hand is on the magazine while it leaves the well.
    const out = M4_TACTICAL_RELOAD.magPosition.find((k) => k.v[1] < -0.5)!;
    expect(sampleSegment(M4_TACTICAL_RELOAD.support, out.t).a.anchor).toBe("mag");
    expect(M4_TACTICAL_RELOAD.support.some((k) => k.v.anchor === "catch")).toBe(false);
    // Empty: when the magazine is gone the hand is not holding it, and the catch is struck.
    const gone = M4_EMPTY_RELOAD.magPosition.find((k) => k.v[1] < -0.5)!;
    expect(sampleSegment(M4_EMPTY_RELOAD.support, gone.t).a.anchor).toBe("guard");
    const strike = M4_EMPTY_RELOAD.support.find(
      (k) => k.v.anchor === "catch" && k.v.offset.every((v) => v === 0),
    )!;
    expect(strike.t).toBeCloseTo(M4_BOLT_RELEASE_AT, 5);
    // The release comes after the fresh magazine is seated.
    const seated = M4_EMPTY_RELOAD.magPosition.findLast(
      (k, i, all) => k.v.every((v) => v === 0) && all[i - 1]?.v.some((v) => v !== 0),
    )!;
    expect(strike.t).toBeGreaterThan(seated.t);
  });

  it("leaves the AK's reload clips untouched", () => {
    expect(RELOAD_CLIPS.tactical).not.toBe(M4_TACTICAL_RELOAD);
    expect(RELOAD_CLIPS.empty.boltTravel.some((k) => k.v > 0)).toBe(true);
  });
});

describe("inspection and casings", () => {
  it("inspection starts and ends at rest and stays a few seconds long", () => {
    for (const track of [M4_INSPECT.position, M4_INSPECT.rotation]) {
      expect(sampleVec(track, 0)).toEqual([0, 0, 0]);
      expect(sampleVec(track, 1)).toEqual([0, 0, 0]);
    }
    expect(INSPECT_MS).toBeGreaterThanOrEqual(2500);
    expect(INSPECT_MS).toBeLessThanOrEqual(4500);
  });
  it("keeps the casing pool and lifetime bounded", () => {
    expect(CASING_POOL).toBeLessThanOrEqual(24);
    expect(CASING_LIFETIME_MS).toBeLessThanOrEqual(1500);
  });
});

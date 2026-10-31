import { describe, expect, it } from "vitest";
import {
  BOLT_TRAVEL,
  EASE,
  MAG_POSITION,
  MAG_ROTATION,
  RELOAD_PHASES,
  SUPPORT,
  WEAPON_POSITION,
  WEAPON_ROTATION,
  sampleNumber,
  sampleSegment,
  sampleVec,
} from "@/lib/fps/reload-animation";

const vecTracks = { WEAPON_POSITION, WEAPON_ROTATION, MAG_POSITION, MAG_ROTATION };

describe("first-person AK reload timeline", () => {
  it("starts and ends exactly at rest so the gun never pops after a reload", () => {
    for (const [name, track] of Object.entries(vecTracks)) {
      expect(sampleVec(track, 0), name).toEqual([0, 0, 0]);
      expect(sampleVec(track, 1), name).toEqual([0, 0, 0]);
    }
    expect(sampleNumber(BOLT_TRAVEL, 0)).toBe(0);
    expect(sampleNumber(BOLT_TRAVEL, 1)).toBe(0);
    expect(SUPPORT[0]!.v.anchor).toBe("guard");
    expect(SUPPORT.at(-1)!.v).toEqual({ anchor: "guard", offset: [0, 0, 0], rotation: [0, 0, 0] });
  });

  it("keeps every track in time order inside 0..1", () => {
    for (const track of [...Object.values(vecTracks), BOLT_TRAVEL, SUPPORT]) {
      const times = track.map((k) => k.t);
      expect(times[0]).toBe(0);
      expect(times.at(-1)).toBe(1);
      for (let i = 1; i < times.length; i++) expect(times[i]!).toBeGreaterThan(times[i - 1]!);
    }
  });

  it("breaks, inserts and chambers in order", () => {
    // Break: the old magazine is out of the well and far below by the end of the phase.
    expect(sampleVec(MAG_POSITION, RELOAD_PHASES.break[1])[1]).toBeLessThan(-0.5);
    // Support hand carries the magazine through the swap.
    expect(sampleSegment(SUPPORT, 0.3).a.anchor).toBe("mag");
    // Insert: magazine is seated before chambering starts, and the gun jolts up on the slam.
    expect(sampleVec(MAG_POSITION, RELOAD_PHASES.insert[1])).toEqual([0, 0, 0]);
    expect(sampleVec(WEAPON_POSITION, 0.545)[1]).toBeGreaterThan(
      sampleVec(WEAPON_POSITION, 0.5)[1],
    );
    // Chamber: bolt racked to the rear, then released sharply.
    const racked = sampleNumber(BOLT_TRAVEL, 0.755);
    expect(racked).toBeGreaterThan(0.1);
    expect(sampleNumber(BOLT_TRAVEL, 0.78)).toBeLessThan(racked * 0.1);
    expect(sampleSegment(SUPPORT, 0.72).b.anchor).toBe("handle");
  });

  it("produces finite, continuous poses at 144 Hz sampling", () => {
    let previous = sampleVec(WEAPON_ROTATION, 0);
    for (let i = 1; i <= 260; i++) {
      const pose = sampleVec(WEAPON_ROTATION, i / 260);
      for (let a = 0; a < 3; a++) {
        expect(Number.isFinite(pose[a]!)).toBe(true);
        expect(Math.abs(pose[a]! - previous[a]!)).toBeLessThan(0.12);
      }
      previous = pose;
    }
  });

  it("clamps outside the reload window", () => {
    expect(sampleVec(WEAPON_ROTATION, -1)).toEqual([0, 0, 0]);
    expect(sampleVec(WEAPON_ROTATION, 2)).toEqual([0, 0, 0]);
    expect(EASE.back(0)).toBeCloseTo(0);
    expect(EASE.back(1)).toBeCloseTo(1);
  });
});

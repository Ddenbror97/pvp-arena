import { describe, expect, it } from "vitest";
import {
  BOLT_RACK,
  BOLT_TRAVEL,
  EASE,
  EMPTY_RELOAD,
  MAG_POSITION,
  RELOAD_CLIPS,
  RELOAD_PHASES,
  SUPPORT,
  TACTICAL_RELOAD,
  WEAPON_POSITION,
  sampleNumber,
  sampleSegment,
  sampleVec,
  type ReloadClip,
} from "@/lib/fps/reload-animation";

const clips = Object.values(RELOAD_CLIPS);
const vecTracks = (clip: ReloadClip) => ({
  weaponPosition: clip.weaponPosition,
  weaponRotation: clip.weaponRotation,
  magPosition: clip.magPosition,
  magRotation: clip.magRotation,
});
const rest = { anchor: "guard", offset: [0, 0, 0], rotation: [0, 0, 0] };

describe.each(clips)("first-person AK $kind reload", (clip) => {
  it("starts and ends exactly at rest so the gun never pops after a reload", () => {
    for (const [name, track] of Object.entries(vecTracks(clip))) {
      expect(sampleVec(track, 0), name).toEqual([0, 0, 0]);
      expect(sampleVec(track, 1), name).toEqual([0, 0, 0]);
    }
    expect(sampleNumber(clip.boltTravel, 0)).toBe(0);
    expect(sampleNumber(clip.boltTravel, 1)).toBe(0);
    expect(clip.support[0]!.v).toEqual(rest);
    expect(clip.support.at(-1)!.v).toEqual(rest);
  });

  it("keeps every track in time order inside 0..1", () => {
    for (const track of [...Object.values(vecTracks(clip)), clip.boltTravel, clip.support]) {
      const times = track.map((k) => k.t);
      expect(times[0]).toBe(0);
      expect(times.at(-1)).toBe(1);
      for (let i = 1; i < times.length; i++) expect(times[i]!).toBeGreaterThan(times[i - 1]!);
    }
  });

  it("rocks the magazine out about its lug before stripping it, and rocks the new one in", () => {
    const rockOut = clip.magRotation.find((k) => k.v[0] > 0.2)!;
    // At the end of the rock-out the magazine has rotated but not yet translated: it pivots on
    // the front lug (the viewmodel applies rotations about that point).
    expect(sampleVec(clip.magPosition, rockOut.t)).toEqual([0, 0, 0]);
    expect(rockOut.t).toBeLessThan(clip.phases["break"]![1]);
    // Insert: the lug hooks (no offset) while the magazine is still tilted forward, then it
    // rotates back to seat.
    const away = clip.magPosition.findIndex((k) => k.v[1] < -0.5);
    const hooked = clip.magPosition.find((k, i) => i > away && k.v.every((v) => v === 0))!;
    const before = clip.magPosition[clip.magPosition.indexOf(hooked) - 1]!;
    expect(before.v.some((v) => v !== 0)).toBe(true);
    const seated = clip.magRotation.find((k) => k.t > hooked.t && k.v.every((v) => v === 0))!;
    const hookedTilt = sampleVec(clip.magRotation, hooked.t)[0];
    expect(hookedTilt).toBeGreaterThan(0.25);
    expect(seated.t).toBeGreaterThan(hooked.t);
    expect(seated.t - hooked.t).toBeLessThan(0.06);
  });

  it("carries the magazine in the support hand the whole time it is out of the well", () => {
    for (let p = 0; p <= 1; p += 0.005) {
      const offset = sampleVec(clip.magPosition, p),
        tilt = sampleVec(clip.magRotation, p);
      const out = offset.some((v) => Math.abs(v) > 1e-6) || tilt.some((v) => Math.abs(v) > 1e-6);
      if (!out) continue;
      const segment = sampleSegment(clip.support, p);
      expect([segment.a.anchor, segment.b.anchor], `p=${p.toFixed(3)}`).toEqual(["mag", "mag"]);
    }
  });

  it("produces finite, continuous poses at 144 Hz sampling", () => {
    for (const track of [clip.weaponRotation, clip.weaponPosition]) {
      let previous = sampleVec(track, 0);
      for (let i = 1; i <= 260; i++) {
        const pose = sampleVec(track, i / 260);
        for (let a = 0; a < 3; a++) {
          expect(Number.isFinite(pose[a]!)).toBe(true);
          expect(Math.abs(pose[a]! - previous[a]!)).toBeLessThan(0.12);
        }
        previous = pose;
      }
    }
  });
});

describe("empty vs tactical", () => {
  it("only the empty reload racks the charging handle", () => {
    expect(TACTICAL_RELOAD.boltTravel.every((k) => k.v === 0)).toBe(true);
    expect(TACTICAL_RELOAD.support.some((k) => k.v.anchor === "handle")).toBe(false);
    const racked = sampleNumber(EMPTY_RELOAD.boltTravel, 0.755);
    expect(racked).toBeCloseTo(BOLT_RACK);
    // Released sharply: the carrier is home within ~40 ms of letting go.
    expect(sampleNumber(EMPTY_RELOAD.boltTravel, 0.78)).toBeLessThan(racked * 0.1);
    // The hand is on the handle for the whole rack, then stays back ("racked") as it flies home.
    for (const p of [0.69, 0.72, 0.75]) {
      const s = sampleSegment(EMPTY_RELOAD.support, p);
      expect([s.a.anchor, s.b.anchor]).toEqual(["handle", "handle"]);
    }
    expect(sampleSegment(EMPTY_RELOAD.support, 0.77).b.anchor).toBe("racked");
  });

  it("keeps the back-compat exports pointing at the empty reload", () => {
    expect(WEAPON_POSITION).toBe(EMPTY_RELOAD.weaponPosition);
    expect(MAG_POSITION).toBe(EMPTY_RELOAD.magPosition);
    expect(BOLT_TRAVEL).toBe(EMPTY_RELOAD.boltTravel);
    expect(SUPPORT).toBe(EMPTY_RELOAD.support);
    expect(sampleVec(MAG_POSITION, RELOAD_PHASES.break[1])[1]).toBeLessThan(-0.5);
    expect(sampleVec(MAG_POSITION, RELOAD_PHASES.insert[1])).toEqual([0, 0, 0]);
    expect(sampleVec(WEAPON_POSITION, 0.545)[1]).toBeGreaterThan(
      sampleVec(WEAPON_POSITION, 0.5)[1],
    );
  });

  it("clamps outside the reload window", () => {
    expect(sampleVec(EMPTY_RELOAD.weaponRotation, -1)).toEqual([0, 0, 0]);
    expect(sampleVec(TACTICAL_RELOAD.weaponRotation, 2)).toEqual([0, 0, 0]);
    expect(EASE.back(0)).toBeCloseTo(0);
    expect(EASE.back(1)).toBeCloseTo(1);
  });
});

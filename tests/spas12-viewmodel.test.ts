import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ITEMS, type WeaponDef } from "@/lib/fps/br/items";
import { newTablet } from "@/lib/fps/br/perks";
import { shellStage } from "@/lib/fps/br/reload-progress";
import { BR_GUN_MODELS, WORLD_RIFLES } from "@/lib/fps/model-assets";
import {
  sampleNumber,
  sampleSegment,
  sampleVec,
  type ReloadClip,
} from "@/lib/fps/reload-animation";
import {
  SPAS12_BOLT,
  SPAS12_EQUIP_MS,
  SPAS12_INSPECT,
  SPAS12_RELOAD,
  SPAS12_RELOAD_CLIPS,
  spas12ClipTime,
  spas12Equip,
} from "@/lib/fps/spas12-animation";

/**
 * The SPAS-12's first-person clips (spas12-animation.ts): one clip holds the start, ONE shell's
 * pass and the end, and the server's stages (br/combat.ts) pick the part. So the pass has to
 * loop without a jump, the parts have to meet, and nothing may be left out of place at the end.
 */
const S = (ITEMS.spas12 as WeaponDef).shells!;
const { insertFrom: A, insertTo: B } = SPAS12_RELOAD;
const EPS = 1e-6;
/** Everything the viewmodel poses from a clip at `t`. */
function pose(clip: ReloadClip, t: number) {
  const s = sampleSegment(clip.support, t);
  return {
    weapon: [...sampleVec(clip.weaponPosition, t), ...sampleVec(clip.weaponRotation, t)],
    bolt: sampleNumber(clip.boltTravel, t),
    carrier: sampleNumber(clip.carrierTurn!, t),
    shell: [...sampleVec(clip.magPosition, t), ...sampleVec(clip.magRotation, t)],
    support: s,
  };
}
const near = (a: readonly number[], b: readonly number[], eps = 1e-3) =>
  a.every((v, i) => Math.abs(v - b[i]!) <= eps);

describe("SPAS-12 reload clip", () => {
  it("maps the server's stages onto the clip's three parts, strictly inside it", () => {
    expect(spas12ClipTime(0, 0)).toBeGreaterThan(0);
    expect(spas12ClipTime(0, 1)).toBeCloseTo(A, 6);
    expect(spas12ClipTime(1, 0)).toBeCloseTo(A, 6);
    expect(spas12ClipTime(1, 1)).toBeCloseTo(B, 6);
    expect(spas12ClipTime(2, 0)).toBeCloseTo(B, 6);
    expect(spas12ClipTime(2, 1)).toBeLessThan(1);
    // Monotonic within a stage, and clamped outside it.
    for (const stage of [0, 1, 2] as const) {
      let last = -1;
      for (let k = 0; k <= 1.0001; k += 0.05) {
        const t = spas12ClipTime(stage, k);
        expect(t).toBeGreaterThanOrEqual(last);
        last = t;
      }
      expect(spas12ClipTime(stage, -3)).toBe(spas12ClipTime(stage, 0));
      expect(spas12ClipTime(stage, 9)).toBe(spas12ClipTime(stage, 1));
    }
  });

  it("times a stage against its own length, Quick Hands included", () => {
    const at = (stage: 0 | 1 | 2, left: number, quick = false) =>
      shellStage(
        S,
        { stage },
        10_000,
        10_000 - left,
        quick ? { ...newTablet(), active: ["quick-hands", null, null] } : null,
      );
    expect(at(0, S.startMs).progress).toBeCloseTo(0, 6);
    expect(at(1, S.insertMs / 2).progress).toBeCloseTo(0.5, 6);
    expect(at(2, 0).progress).toBe(1);
    // The next stage's snapshot not here yet: the pose holds, it does not fall to rest.
    expect(at(1, -80).progress).toBe(1);
    const q = at(1, (S.insertMs * 0.85) / 2, true);
    expect(q.ms).toBeCloseTo(S.insertMs * 0.85, 6);
    expect(q.progress).toBeCloseTo(0.5, 6);
  });

  for (const kind of ["tactical", "empty"] as const) {
    const clip = SPAS12_RELOAD_CLIPS[kind];
    it(`${kind}: a shell's pass loops (the gun and the hand are where they started)`, () => {
      const a = pose(clip, A + EPS),
        b = pose(clip, B - EPS);
      expect(near(a.weapon, b.weapon)).toBe(true);
      expect(a.bolt).toBeCloseTo(b.bolt, 4);
      expect(a.carrier).toBeCloseTo(b.carrier, 4);
      // The hand: at the pass's start it holds the next shell (below the gun); at its end it
      // has let go of the seated one and is back down there. Same place: shell + hand offset.
      const hand = (p: ReturnType<typeof pose>) => {
        const k = p.support.k,
          o = p.support.a.offset.map((v, i) => v + (p.support.b.offset[i]! - v) * k);
        return p.shell.slice(0, 3).map((v, i) => v + o[i]!);
      };
      expect(a.support.a.anchor).toBe("mag");
      expect(b.support.b.anchor).toBe("mag");
      expect(near(hand(a), hand(b))).toBe(true);
      // The seated shell is at rest in the tube when the next one appears in the hand.
      expect(near(b.shell, [0, 0, 0, 0, 0, 0])).toBe(true);
    });

    it(`${kind}: starts and ends at rest, the hand back on the fore-end`, () => {
      const first = pose(clip, 0),
        last = pose(clip, 1);
      expect(near(first.weapon, [0, 0, 0, 0, 0, 0])).toBe(true);
      expect(near(last.weapon, [0, 0, 0, 0, 0, 0])).toBe(true);
      expect(first.support.a.anchor).toBe("guard");
      expect(last.support.b.anchor).toBe("guard");
      expect(last.bolt).toBe(0);
      expect(last.carrier).toBe(0);
      expect(near(last.shell, [0, 0, 0, 0, 0, 0])).toBe(true);
    });

    it(`${kind}: the gun and the shell never jump between two frames`, () => {
      // 60 Hz over the server's own timing: the start, eight passes, the end.
      const frames: number[] = [];
      for (let ms = 0; ms < S.startMs; ms += 1000 / 60)
        frames.push(spas12ClipTime(0, ms / S.startMs));
      for (let ms = 0; ms < S.insertMs; ms += 1000 / 60)
        frames.push(spas12ClipTime(1, ms / S.insertMs));
      for (let ms = 0; ms < S.endMs; ms += 1000 / 60) frames.push(spas12ClipTime(2, ms / S.endMs));
      let before = pose(clip, frames[0]!);
      for (const t of frames.slice(1)) {
        const now = pose(clip, t);
        // Root units and radians a frame: under 4 cm and 12° for the gun.
        for (let i = 0; i < 3; i++) {
          expect(Math.abs(now.weapon[i]! - before.weapon[i]!)).toBeLessThan(0.04);
          expect(Math.abs(now.weapon[i + 3]! - before.weapon[i + 3]!)).toBeLessThan(0.21);
        }
        // The shell in the hand (out of the tube on both frames): under 9 cm a frame.
        const out = (p: typeof now) => p.shell.slice(0, 3).some((v) => v !== 0);
        if (out(now) && out(before))
          for (let i = 0; i < 3; i++)
            expect(Math.abs(now.shell[i]! - before.shell[i]!)).toBeLessThan(0.18);
        before = now;
      }
    });
  }

  it("empty: the bolt stays open through the loading and runs home in the end", () => {
    const clip = SPAS12_RELOAD_CLIPS.empty;
    for (const t of [0, A / 2, A, (A + B) / 2, B])
      expect(sampleNumber(clip.boltTravel, t)).toBe(SPAS12_BOLT.travel);
    const home = B + (1 - B) * SPAS12_RELOAD.boltHomeAt;
    expect(sampleNumber(clip.boltTravel, home + 0.03)).toBe(0);
    // With a shell still chambered it never moves.
    for (let t = 0; t <= 1; t += 0.05)
      expect(sampleNumber(SPAS12_RELOAD_CLIPS.tactical.boltTravel, t)).toBe(0);
  });

  it("the carrier lifts only while a shell's nose is on it", () => {
    const clip = SPAS12_RELOAD_CLIPS.tactical;
    for (const t of [0, A * 0.5, A, B, 0.8, 1]) expect(sampleNumber(clip.carrierTurn!, t)).toBe(0);
    const seat = A + (B - A) * SPAS12_RELOAD.seatAt;
    expect(sampleNumber(clip.carrierTurn!, seat - 0.01)).toBeGreaterThan(0.2);
  });
});

describe("SPAS-12 equip and inspection", () => {
  it("the equip offset runs out, with one small overshoot", () => {
    expect(spas12Equip(0)).toBe(1);
    expect(spas12Equip(SPAS12_EQUIP_MS)).toBeCloseTo(0, 6);
    expect(spas12Equip(SPAS12_EQUIP_MS * 4)).toBeCloseTo(0, 6);
    let low = 0;
    for (let ms = 0; ms <= SPAS12_EQUIP_MS; ms += 10) low = Math.min(low, spas12Equip(ms));
    expect(low).toBeLessThan(0);
    expect(low).toBeGreaterThan(-0.15);
  });

  it("the inspection starts and ends at the ready position", () => {
    for (const track of [SPAS12_INSPECT.position, SPAS12_INSPECT.rotation]) {
      expect(sampleVec(track, 0)).toEqual([0, 0, 0]);
      expect(sampleVec(track, 1)).toEqual([0, 0, 0]);
      expect(sampleVec(track, 0.3).some((v) => v !== 0)).toBe(true);
    }
  });
});

describe("SPAS-12 assets", () => {
  it("ships the first-person and third-person models, sounds and icons", () => {
    for (const path of [
      BR_GUN_MODELS.spas12Police,
      WORLD_RIFLES.spas12,
      "/fps/audio/br-spas12-v1.wav",
      "/fps/audio/br-spas12-silenced-v1.wav",
      "/fps/audio/br-spas12-reload-v1.wav",
      "/fps/br/icons/spas12.webp",
      "/fps/br/icons/ammo-12g.webp",
    ])
      expect(existsSync(`public${path}`), path).toBe(true);
  });

  it("shares the arm textures with the other viewmodels", () => {
    const map = JSON.parse(
      readFileSync("public/fps/models/viewmodel-shared.json", "utf8"),
    ) as Record<string, Record<string, unknown>>;
    for (const material of ["arms", "arm_sleeve", "watch_face", "watch_strap", "police_sleeve"])
      expect(map["spas12-police"]?.[material], material).toEqual(map["mp5-police"]![material]);
  });
});

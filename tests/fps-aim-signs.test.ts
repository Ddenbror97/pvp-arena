import { describe, expect, it } from "vitest";
import { AimWatch, aimFamilies, type WatchPlayer } from "@/lib/fps/anticheat/aim-watch";

/**
 * The smoothing and trigger-timing signs (aim-watch.ts 5 and 6) against realistic hands, not
 * perfect bots: minimum-jerk corrections with overshoot, a second corrective movement, tremor,
 * lost and doubled inputs; very fast flickers; sprayers. And against a smoothing aimbot with
 * noise of its own, and a triggerbot riding a human's sweep.
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}
const gauss = (r: () => number) =>
  Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
const TICK = 33;
const DEG = Math.PI / 180;
/** Minimum-jerk position along a movement (0 → 1). */
const minJerk = (u: number) => {
  const t = Math.max(0, Math.min(1, u));
  return t * t * t * (10 - 15 * t + 6 * t * t);
};

type Hand =
  | { kind: "human"; moveMs: [number, number]; overshoot: number; tremorDeg: number; loss: number }
  | { kind: "smoothbot"; perFrame: number; noiseDeg: number }
  | { kind: "sprayer" }
  | { kind: "triggerbot" };

/** Ten minutes of engagements: a target appears off to one side; the hand brings the view onto
 * it and shoots (or sweeps through it). */
function session(hand: Hand, seed: number) {
  const r = rng(seed);
  const watch = new AimWatch();
  const me: WatchPlayer = { id: "me", yaw: 0, pitch: 0, x: 0, y: 0, z: 0, alive: true };
  const foe: WatchPlayer = { id: "foe", yaw: 0, pitch: 0, x: 0, y: 0, z: -30, alive: true };
  let now = 0;
  const bearingTo = () => Math.atan2(-(foe.x - me.x), -(foe.z - me.z));
  const tick = (shoot: boolean) => {
    watch.observe(now, [me], [me, foe], () => true);
    if (shoot) watch.shot("me", now);
    now += TICK;
  };
  while (now < 10 * 60_000) {
    // A new engagement: the target 12–50° away, sometimes strafing slowly.
    foe.x = (r() - 0.5) * 30;
    foe.z = -20 - r() * 40;
    const target = bearingTo();
    const off = (r() < 0.5 ? -1 : 1) * (12 + r() * 38) * DEG;
    const start = target + off;
    me.yaw = start;
    me.pitch = Math.atan2(1.25 - 1.6, Math.hypot(foe.x, foe.z));
    for (let i = 0; i < 6; i++) tick(false);
    if (hand.kind === "human") {
      // Primary movement (minimum jerk, a little over or short), then a correction.
      const T = hand.moveMs[0] + r() * (hand.moveMs[1] - hand.moveMs[0]);
      const land = 1 + (r() - 0.4) * hand.overshoot;
      const t0 = now;
      let lastSent = me.yaw;
      while (now - t0 < T + 260) {
        const u = (now - t0) / T;
        let yaw = start + (target - start) * land * minJerk(u);
        // Corrective sub-movement after the primary one.
        if (u > 1)
          yaw += (target - (start + (target - start) * land)) * minJerk((now - t0 - T) / 180);
        yaw += gauss(r) * hand.tremorDeg * DEG;
        // A lost input repeats the last view; a doubled one arrives late.
        if (r() < hand.loss) yaw = lastSent;
        me.yaw = lastSent = yaw;
        tick(now - t0 > T + 150 && now - t0 < T + 190);
      }
    } else if (hand.kind === "smoothbot") {
      // e ← k·e every 60 Hz frame (two per tick), with a little noise of its own.
      let fired = false;
      for (let i = 0; i < 25; i++) {
        let e = me.yaw - target;
        e *= hand.perFrame * hand.perFrame;
        me.yaw = target + e + gauss(r) * hand.noiseDeg * DEG;
        const on = Math.abs(me.yaw - target) < 0.4 * DEG;
        tick(on && !fired);
        if (on) fired = true;
      }
    } else if (hand.kind === "sprayer") {
      // Sweeps onto the target fast and holds the trigger: firing from before it gets there,
      // through the arrival, and while tracking.
      const speed = (180 + r() * 220) * DEG * (TICK / 1000) * Math.sign(-off);
      for (let i = 0; i < 40; i++) {
        const remaining = target - me.yaw;
        if (Math.abs(remaining) > Math.abs(speed)) me.yaw += speed;
        else me.yaw = target + gauss(r) * 0.3 * DEG;
        tick(i % 3 === 0);
      }
    } else {
      // A human sweeping across (not stopping), the bot pulling the trigger on contact.
      const speed = (150 + r() * 250) * DEG * (TICK / 1000) * Math.sign(-off);
      let fired = false;
      for (let i = 0; i < 30; i++) {
        me.yaw += speed;
        const d = Math.hypot(foe.x, foe.z);
        const on = Math.abs(me.yaw - target) <= Math.max(1, Math.atan(0.35 / d) / DEG) * DEG;
        tick(on && !fired);
        if (on) fired = true;
      }
    }
  }
  return watch.report("me")!;
}

const average = {
  kind: "human",
  moveMs: [220, 420],
  overshoot: 0.12,
  tremorDeg: 0.12,
  loss: 0.03,
} as const;
const fast = {
  kind: "human",
  moveMs: [110, 190],
  overshoot: 0.06,
  tremorDeg: 0.06,
  loss: 0.03,
} as const;

describe("FPS anti-cheat: smoothing and trigger timing", () => {
  it("honest hands, average and very fast, lossy connections, sprayers: no sign", () => {
    for (const [hand, seeds] of [
      [average, [1, 2, 3]],
      [fast, [4, 5, 6]],
      [{ kind: "sprayer" } as const, [7, 8]],
    ] as const)
      for (const seed of seeds) {
        const rep = session(hand, seed);
        expect(
          rep.smoothing.level,
          `${hand.kind} ${seed} smoothing ${JSON.stringify(rep.smoothing)}`,
        ).toBe(0);
        expect(
          rep.trigger.level,
          `${hand.kind} ${seed} trigger ${JSON.stringify(rep.trigger)}`,
        ).toBe(0);
        expect(aimFamilies(rep).aim).toBeLessThanOrEqual(1);
      }
  });

  it("a smoothing aimbot, even with noise of its own, is seen", () => {
    for (const [perFrame, noise, seed] of [
      [0.7, 0.02, 11],
      [0.8, 0.03, 12],
      [0.6, 0.02, 13],
    ] as const) {
      const rep = session({ kind: "smoothbot", perFrame, noiseDeg: noise }, seed);
      expect(rep.smoothing.acquisitions).toBeGreaterThan(50);
      expect(rep.smoothing.level, JSON.stringify(rep.smoothing)).toBe(2);
    }
  });

  it("a triggerbot is seen; one strong sign alone stays one family vote", () => {
    const rep = session({ kind: "triggerbot" }, 21);
    expect(rep.trigger.shots).toBeGreaterThan(50);
    expect(rep.trigger.level, JSON.stringify(rep.trigger)).toBe(2);
    // The aim signs are one family: a single strong sign without a second is "notable" only.
    const fam = aimFamilies(rep);
    expect(fam.aim).toBe(
      [rep.flick.level, rep.reaction.level, rep.smoothing.level].some((l) => l > 0) ? 2 : 1,
    );
  });
});

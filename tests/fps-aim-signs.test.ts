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

/** Ten minutes of sprays (12–25 shots at 600 rpm, an AK-like climbing kick): how the hand pulls. */
function sprays(
  hand: { lagMs: number; gain: number; cv: number; tremorDeg: number } | { script: number },
  seed: number,
) {
  const r = rng(seed);
  const watch = new AimWatch();
  const me: WatchPlayer = {
    id: "me",
    yaw: 0,
    pitch: 0,
    x: 0,
    y: 0,
    z: 0,
    alive: true,
    recoilPitch: 0,
  };
  const foe: WatchPlayer = { id: "foe", yaw: 0, pitch: 0, x: 0, y: 0, z: -25, alive: true };
  let now = 0;
  while (now < 10 * 60_000) {
    const shots = 12 + Math.floor(r() * 14);
    const perShot = (0.3 + r() * 0.2) * DEG;
    // The pull the hand has made so far, and its own error (grows with the movement).
    let pull = 0;
    const kicks: number[] = [];
    me.pitch = 0;
    me.recoilPitch = 0;
    let shotAt = now;
    for (let tick = 0; tick < Math.ceil((shots * 100) / TICK) + 6; tick++) {
      // Shots every 100 ms: the room adds this kick after each (the rooms watch after the step,
      // then report the step's shots).
      let fired = false;
      if (now >= shotAt && kicks.length < shots) {
        fired = true;
        kicks.push(now);
        me.recoilPitch = kicks.length * perShot;
        shotAt += 100;
      }
      const kick = me.recoilPitch!;
      if ("script" in hand) {
        me.pitch = -kick + gauss(r) * hand.script * DEG;
      } else {
        // The kick as the hand knows it: `lagMs` ago (0: it anticipates the learned pattern).
        const known = kicks.filter((k) => k <= now - hand.lagMs).length * perShot;
        const target = -known * hand.gain;
        pull += (target - pull) * 0.6;
        me.pitch = pull * (1 + gauss(r) * hand.cv) + gauss(r) * hand.tremorDeg * DEG;
      }
      watch.observe(now, [me], [me, foe], () => true);
      if (fired) watch.shot("me", now);
      now += TICK;
    }
    now += 800 + r() * 2000;
  }
  return watch.report("me")!;
}

describe("FPS anti-cheat: recoil scripts", () => {
  it("honest hands, average and elite (anticipating the pattern), are not perfect", () => {
    for (const [hand, seed] of [
      [{ lagMs: 150, gain: 0.8, cv: 0.15, tremorDeg: 0.1 }, 31],
      [{ lagMs: 110, gain: 0.95, cv: 0.1, tremorDeg: 0.06 }, 32],
      [{ lagMs: 0, gain: 0.97, cv: 0.07, tremorDeg: 0.05 }, 33],
      [{ lagMs: 0, gain: 1, cv: 0.05, tremorDeg: 0.04 }, 34],
    ] as const) {
      const rep = sprays(hand, seed);
      expect(rep.recoil.sprays).toBeGreaterThan(100);
      expect(rep.recoil.level, `${JSON.stringify(hand)} ${JSON.stringify(rep.recoil)}`).toBe(0);
    }
  });

  it("a recoil script, even with jitter of its own, is seen", () => {
    for (const [jitter, seed] of [
      [0.02, 41],
      [0.05, 42],
    ] as const) {
      const rep = sprays({ script: jitter }, seed);
      expect(rep.recoil.level, JSON.stringify(rep.recoil)).toBe(2);
    }
  });
});

describe("FPS anti-cheat: silent aim", () => {
  it("a flick that stays (or moves on) is a hand; a snap there and back on the shot is not", () => {
    const run = (silent: boolean, seed: number) => {
      const r = rng(seed);
      const watch = new AimWatch();
      const me: WatchPlayer = { id: "me", yaw: 0, pitch: 0, x: 0, y: 0, z: 0, alive: true };
      const foe: WatchPlayer = { id: "foe", yaw: 0, pitch: 0, x: 0, y: 0, z: -25, alive: true };
      let now = 0;
      const tick = (shoot: boolean) => {
        watch.observe(now, [me], [me, foe], () => true);
        if (shoot) watch.shot("me", now);
        now += TICK;
      };
      for (let k = 0; k < 400; k++) {
        const off = (r() < 0.5 ? -1 : 1) * (8 + r() * 25) * DEG;
        me.yaw = off;
        for (let i = 0; i < 5; i++) tick(false);
        if (silent) {
          // The screen stays; the aim jumps to the target for the shot tick only.
          me.yaw = gauss(r) * 0.2 * DEG;
          tick(true);
          me.yaw = off + gauss(r) * 0.3 * DEG;
          tick(false);
        } else {
          // A very fast flick (2 ticks), shot on arrival, then a little settle; sometimes the
          // hand moves on fast, in another direction, right after (checking an angle).
          me.yaw = off * 0.35;
          tick(false);
          me.yaw = gauss(r) * 0.2 * DEG;
          tick(true);
          me.yaw = r() < 0.15 ? (r() < 0.5 ? 1 : -1) * 10 * DEG : gauss(r) * 0.3 * DEG;
          tick(false);
        }
        for (let i = 0; i < 4; i++) tick(false);
      }
      return watch.report("me")!.silent;
    };
    for (const seed of [51, 52, 53]) {
      const human = run(false, seed);
      expect(human.level, JSON.stringify(human)).toBe(0);
      const cheat = run(true, seed);
      expect(cheat.level, JSON.stringify(cheat)).toBe(2);
    }
  });
});

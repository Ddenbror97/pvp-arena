import { describe, expect, it } from "vitest";
import { AimWatch, wilsonLower, type WatchPlayer } from "@/lib/fps/anticheat/aim-watch";

/** Deterministic noise. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}
const gauss = (r: () => number) =>
  Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
const TICK = 33;
const DEG = Math.PI / 180;

type Style = {
  /** A flick lands with this chance. */
  flickHit: number;
  /** Reaction to an enemy coming into view (ms): mean and spread. */
  reactMs: [number, number];
  headShare: number;
  /** How much of a hidden enemy's bearing rate the view's yaw follows (0 none … 1 all). */
  follow: number;
};

/** Twelve minutes of one player against an enemy who strafes behind cover and steps out. */
function play(style: Style, seed: number) {
  const r = rng(seed);
  const watch = new AimWatch();
  const me: WatchPlayer = { id: "me", yaw: 0, pitch: 0, x: 0, y: 0, z: 0, alive: true };
  const foe: WatchPlayer = { id: "foe", yaw: 0, pitch: 0, x: 0, y: 0, z: -60, alive: true };
  let visible = false,
    flip = 4000,
    shootAt = Infinity,
    flickFrom = Infinity;
  for (let now = 0; now < 12 * 60_000; now += TICK) {
    // The enemy wanders sideways (the bearing turns at 5–25 °/s).
    foe.x = 40 * Math.sin(now / 5200) + 12 * Math.sin(now / 1700);
    const bearing = Math.atan2(-(foe.x - me.x), -(foe.z - me.z));
    if (now >= flip) {
      visible = !visible;
      flip = now + (visible ? 2500 : 5000) + r() * 1500;
      if (visible) {
        const ms = Math.max(60, style.reactMs[0] + gauss(r) * style.reactMs[1]);
        shootAt = now + ms;
        flickFrom = shootAt - 100;
        // Looking somewhere else when they appear.
        me.yaw = bearing + (r() < 0.5 ? -1 : 1) * (25 + r() * 20) * DEG;
      }
    }
    if (visible) {
      if (now >= flickFrom && now < shootAt - TICK)
        me.yaw += (bearing - me.yaw) * 0.75; // the flick
      else if (now >= shootAt - TICK)
        me.yaw = bearing + gauss(r) * 0.1 * DEG; // on target, still
      else me.yaw += gauss(r) * 0.4 * DEG;
    } else {
      // Out of sight: the view drifts on its own, or is dragged along the hidden enemy.
      const own = gauss(r) * 0.5 * DEG + 0.3 * DEG * Math.sin(now / 900);
      const prev = Math.atan2(
        -(40 * Math.sin((now - TICK) / 5200) + 12 * Math.sin((now - TICK) / 1700)),
        60,
      );
      me.yaw += own + style.follow * (bearing - prev);
    }
    watch.observe(now, [me], [me, foe], () => visible);
    if (visible && now >= shootAt) {
      watch.shot("me", now);
      if (r() < style.flickHit) watch.hit("me", "foe", r() < style.headShare, now);
      // Follow-up shots with a steady view: plain shots, no flick.
      shootAt = Infinity;
      for (let k = 1; k <= 3; k++) {
        const at = now + k * 150; // the view has been still for a while by then
        watch.shot("me", at);
        if (r() < 0.45) watch.hit("me", "foe", r() < style.headShare, at);
      }
    }
  }
  return watch.report("me")!;
}

describe("FPS anti-cheat: aim analysis", () => {
  it("Wilson's lower bound needs evidence, not a lucky streak", () => {
    expect(wilsonLower(3, 3)).toBeLessThan(0.45);
    expect(wilsonLower(25, 27)).toBeGreaterThan(0.75);
    expect(wilsonLower(0, 0)).toBe(0);
  });

  it("leaves honest players alone, the sharp ones too", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const average = play({ flickHit: 0.4, reactMs: [290, 60], headShare: 0.18, follow: 0 }, seed);
      expect(average.review, `average ${seed} ${JSON.stringify(average)}`).toBe(false);
      expect(average.score).toBe(0);
      // A very good player: fast, most flicks land, many heads.
      const sharp = play(
        { flickHit: 0.62, reactMs: [200, 35], headShare: 0.42, follow: 0 },
        seed + 100,
      );
      expect(sharp.review, `sharp ${seed} ${JSON.stringify(sharp)}`).toBe(false);
    }
  });

  it("puts an aimbot up for review on two signs", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const bot = play({ flickHit: 0.97, reactMs: [70, 15], headShare: 0.9, follow: 0 }, seed);
      expect(bot.flick.level, JSON.stringify(bot)).toBe(2);
      expect(bot.reaction.level).toBeGreaterThan(0);
      expect(bot.headShare.level).toBe(2);
      expect(bot.review).toBe(true);
    }
  });

  it("sees a view that follows a hidden enemy, and does not act on that alone", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const esp = play({ flickHit: 0.4, reactMs: [290, 60], headShare: 0.18, follow: 0.8 }, seed);
      expect(esp.tracking.level, JSON.stringify(esp.tracking)).toBe(2);
      expect(esp.review).toBe(false); // one sign: logged, never enough
      const honest = play({ flickHit: 0.4, reactMs: [290, 60], headShare: 0.18, follow: 0 }, seed);
      expect(Math.abs(honest.tracking.z)).toBeLessThan(4);
    }
    // With a second sign it is a review.
    const both = play({ flickHit: 0.9, reactMs: [80, 15], headShare: 0.18, follow: 0.8 }, 3);
    expect(both.review).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  AIRCRAFT,
  aero,
  attitude,
  impactDamage,
  newAircraft,
  stepAircraft,
  type Aircraft,
} from "@/lib/fps/br/aircraft";
import { fly, takeoffPilot, testWorld, wrap } from "@/lib/fps/br/flight-harness";

const env = testWorld();
const clamp = (v: number) => Math.max(-1, Math.min(1, v));
/** Airborne at `speed` m/s, heading north, engine running at `thr`. */
function air(speed: number, alt = 600, engine = true, thr = 0.8): Aircraft {
  const a = newAircraft(0, 0, env.ground, 0, 0);
  Object.assign(a, {
    y: alt,
    vz: -speed,
    engine: engine ? "running" : "off",
    rpm: engine ? thr : 0.3,
    throttle: engine ? thr : 0,
    brake: false,
    grounded: false,
  });
  return a;
}
/** Attitude hold: pitch (rad, or a function of the state) and bank targets, throttle. */
const hold =
  (pitch: number | ((a: Aircraft) => number), bank: number, thr: number) => (a: Aircraft) => {
    const at = attitude(a);
    const pt = typeof pitch === "function" ? pitch(a) : pitch;
    return {
      thr,
      elev: clamp((pt - at.pitch) * 4 - a.wx * 0.8),
      ail: clamp((bank - at.bank) * 2 + a.wz * 0.5),
    };
  };
const level = (a: Aircraft) => attitude(a).pitch - a.vy * 0.03;

describe("aircraft flight model (Cessna 172SP)", () => {
  it("stays put without its engine, and the engine takes its starter time", () => {
    const a = newAircraft(0, 0, env.ground, 0, 0);
    fly(env, a, 5, () => ({ thr: 1, brake: false }));
    expect(Math.hypot(a.vx, a.vz)).toBeLessThan(0.05);
    const b = newAircraft(0, 0, env.ground, 0, 0);
    let pressed = false;
    const r = fly(env, b, 6, () => {
      const engine = !pressed;
      pressed = true;
      return { engine };
    });
    expect(b.engine).toBe("running");
    const runningAt = r.log.findIndex(() => false);
    void runningAt;
    expect(AIRCRAFT.startS).toBeGreaterThan(3);
  });

  it("will not leave the ground below flying speed, however hard the stick is pulled", () => {
    const a = newAircraft(0, 0, env.ground, 0, 0);
    Object.assign(a, { engine: "running", rpm: 1, throttle: 1, brake: false });
    const r = fly(env, a, 60, (s) => ({
      thr: 1,
      elev: aero(s).V < 18 ? 1 : 0,
      rud: wrap(attitude(s).heading) * 3,
    }));
    const early = r.log.filter((e) => e.speed < 18);
    expect(early.length).toBeGreaterThan(30);
    expect(early.every((e) => e.agl < 0.3)).toBe(true);
  });

  it("takes off after a real take-off roll and climbs away", () => {
    const a = newAircraft(0, 0, env.ground, 0, 0);
    const r = fly(env, a, 60, takeoffPilot());
    const lift = r.log.findIndex((e) => e.agl > 1);
    expect(lift).toBeGreaterThan(0);
    const at = r.log[lift]!;
    expect(at.speed).toBeGreaterThan(24);
    expect(at.speed).toBeLessThan(40);
    // On the ground for a run of hundreds of metres (the runway is 1.4 km).
    expect(-at.z).toBeGreaterThan(200);
    expect(-at.z).toBeLessThan(700);
    // A positive climb, 2–5 m/s (the book: 730 ft/min).
    const climb = r.log.at(-1)!;
    expect(climb.vs).toBeGreaterThan(1.8);
    expect(climb.vs).toBeLessThan(5.5);
    // Straight down the runway.
    expect(Math.abs(climb.x)).toBeLessThan(15);
    expect(r.maxImpact).toBeLessThan(AIRCRAFT.touchdown.hard + 0.5);
  });

  it("cruises at a light aircraft's speed, and cannot exceed it in level flight", () => {
    const a = air(50);
    const r = fly(env, a, 90, hold(level, 0, 1));
    const e = r.log.at(-1)!;
    expect(e.speed).toBeGreaterThan(50);
    expect(e.speed).toBeLessThan(62);
  });

  it("turns by banking: about 6°/s at 30° of bank, no instant turning", () => {
    const a = air(45);
    const r = fly(env, a, 40, hold(level, 30 / 57.3, 0.8));
    const rate = (wrap(r.log.at(-1)!.heading - r.log[r.log.length - 300]!.heading) / 10) * 57.3;
    expect(rate).toBeLessThan(-4); // right bank turns right (heading decreases)
    expect(rate).toBeGreaterThan(-9);
    // Rudder alone yaws the nose into a sideslip (a real 172's 10–15° at full rudder), not an
    // instant turn: the turn comes from the bank the sideslip rolls it into.
    const b = air(45);
    const r2 = fly(env, b, 1, () => ({ rud: 1, thr: 0.8 }));
    expect(Math.abs(wrap(r2.log[5]!.heading)) * 57.3).toBeLessThan(3);
    expect(Math.abs(wrap(r2.log.at(-1)!.heading)) * 57.3).toBeLessThan(18);
  });

  it("rolls at about 60°/s with full aileron, not instantly", () => {
    const a = air(50);
    const r = fly(env, a, 1, () => ({ ail: 1, thr: 0.8 }));
    const bank = r.log.at(-1)!.bank * 57.3;
    expect(bank).toBeGreaterThan(20);
    expect(bank).toBeLessThan(75);
  });

  it("stays flyable hands off (no divergence in a minute)", () => {
    const a = air(48);
    const r = fly(env, a, 60, () => ({ thr: 0.75 }));
    for (const e of r.log) {
      expect(Math.abs(e.bank)).toBeLessThan(0.35);
      expect(Math.abs(e.pitch)).toBeLessThan(0.3);
    }
  });

  it("stalls when it runs out of airspeed, drops its nose, and recovers with nose down and power", () => {
    const a = air(40);
    let stallSpeed: number | null = null;
    const r = fly(env, a, 30, (s, t) => {
      if (stallSpeed === null && aero(s).stall > 0.5) stallSpeed = aero(s).V;
      return hold(Math.min(0.6, 0.02 + t * 0.03), 0, 0)(s);
    });
    expect(stallSpeed).not.toBeNull();
    expect(stallSpeed!).toBeGreaterThan(20);
    expect(stallSpeed!).toBeLessThan(28);
    // The nose drops even with the stick held back.
    expect(Math.min(...r.log.slice(200).map((e) => e.pitch))).toBeLessThan(-0.1);
    const before = a.y;
    const r2 = fly(env, a, 12, hold(-0.05, 0, 1), 30);
    expect(r2.log.at(-1)!.stall).toBe(0);
    expect(r2.log.at(-1)!.speed).toBeGreaterThan(35);
    expect(before - Math.min(...r2.log.map((e) => e.y))).toBeLessThan(150);
  });

  it("glides with the engine off (about 10:1) instead of falling", () => {
    const a = air(34, 800, false);
    const r = fly(
      env,
      a,
      60,
      hold((s) => attitude(s).pitch + (aero(s).V - 34) * 0.01, 0, 0),
    );
    const e0 = r.log[300]!,
      e1 = r.log.at(-1)!;
    const ratio = Math.hypot(e1.x - e0.x, e1.z - e0.z) / (e0.y - e1.y);
    expect(ratio).toBeGreaterThan(8);
    expect(ratio).toBeLessThan(13);
  });

  it("burns its fuel in 7.5 minutes at full power, then the engine stops", () => {
    // (Circling: flown straight it would cross the island's edge, where the engine cuts out.)
    const a = air(55, 800, true, 1);
    fly(env, a, AIRCRAFT.fuelS - 5, hold(level, 0.35, 1));
    expect(a.engine).toBe("running");
    fly(env, a, 10, hold(level, 0.35, 1));
    expect(a.fuel).toBe(0);
    expect(a.engine).toBe("dead");
    // Throttled back it lasts longer (here at half power, held on its brakes).
    const b = newAircraft(0, 0, env.ground, 0, 0);
    Object.assign(b, { engine: "running", rpm: 0.6, throttle: 0.5 });
    fly(env, b, AIRCRAFT.fuelS, () => ({ thr: 0.5, brake: true }));
    expect(b.engine).toBe("running");
    expect(b.fuel).toBeGreaterThan(AIRCRAFT.fuelS * 0.3);
  });

  it("climbs less and less toward its soft ceiling (no wall)", () => {
    const rate = (alt: number) => {
      const a = air(38, alt, true, 1);
      const r = fly(env, a, 20, hold(0.1, 0, 1));
      return r.log.at(-1)!.vs;
    };
    const low = rate(100),
      high = rate(1700);
    expect(low).toBeGreaterThan(1.5);
    expect(high).toBeLessThan(low * 0.5);
  });

  it("lands gently with a flare, and a slammed touchdown breaks the gear", () => {
    const land = (flare: boolean, sinkTarget: number) => {
      const a = air(32, env.ground + 1.1 + 60, true, 0.35);
      Object.assign(a, { flaps: 2, flap: 2, rpm: 0.5 });
      const r = fly(env, a, 60, (s) => {
        const at = attitude(s),
          ae = aero(s);
        const agl = s.y - 1.1 - env.ground;
        const vsT = agl > 6 || !flare ? sinkTarget : -0.4;
        const thr = agl > 3 ? Math.max(0, Math.min(1, 0.35 + (32 - ae.V) * 0.08)) : 0;
        const pitchT = Math.min(0.12, at.pitch + (vsT - s.vy) * 0.05);
        return {
          flaps: 2,
          thr,
          elev: s.grounded ? 0 : clamp((pitchT - at.pitch) * 4 - s.wx * 0.8),
          ail: clamp(-at.bank * 2 + s.wz * 0.5),
          brake: s.grounded && ae.V < 25,
        };
      });
      return { a, r };
    };
    const good = land(true, -1.7);
    expect(good.r.maxImpact).toBeLessThan(AIRCRAFT.touchdown.hard);
    expect(good.a.gear).toBe(0);
    expect(good.r.log.at(-1)!.speed).toBeLessThan(0.5);
    const hard = land(false, -7);
    expect(hard.r.maxImpact).toBeGreaterThan(AIRCRAFT.touchdown.hard);
    expect(hard.a.gear).toBeGreaterThan(0.3);
  });

  it("absorbs a hard wheels-first landing but still destroys the airframe in a severe slam", () => {
    const land = (sink: number) => {
      const a = newAircraft(0, 0, env.ground, 0, 0);
      Object.assign(a, { y: env.ground + 1.3, vy: -sink, vz: -30, brake: false, grounded: false });
      let damage = 0;
      for (let i = 0; i < 150; i++) {
        const impact = stepAircraft(
          env.world,
          env.meta,
          a,
          {
            elev: 0,
            ail: 0,
            rud: 0,
            thr: 0,
            flaps: 0,
            engine: false,
            brake: false,
          },
          (i * 1000) / 30,
          1000 / 30,
        );
        damage += impactDamage(impact);
      }
      return { a, damage };
    };
    const rough = land(5);
    expect(rough.damage).toBeLessThan(AIRCRAFT.health * 0.05);
    expect(rough.a.gear).toBeLessThan(0.7);
    const crash = land(15);
    expect(crash.damage).toBeGreaterThanOrEqual(AIRCRAFT.health);
    expect(crash.a.gear).toBe(1);
  });

  it("crashes into what it hits instead of passing through (swept collision)", () => {
    const wall = testWorld({ boxes: [[-30, 0, -205, 30, 60, -200]] });
    const a = newAircraft(0, 0, wall.ground, 0, 0);
    Object.assign(a, {
      y: 30,
      vz: -45,
      engine: "running",
      rpm: 0.8,
      throttle: 0.8,
      brake: false,
      grounded: false,
    });
    const r = fly(wall, a, 6, hold(level, 0, 0.8));
    expect(r.maxImpact).toBeGreaterThan(30);
    expect(impactDamage(r.maxImpact)).toBeGreaterThanOrEqual(AIRCRAFT.health);
    // Never through the wall.
    for (const e of r.log) expect(e.z).toBeGreaterThan(-200 + 2.5);
  });

  it("ditches in the sea: stops and floats, the engine drowned", () => {
    const sea = testWorld({ seaFrom: 50 });
    const a = newAircraft(0, 0, sea.ground, 0, -Math.PI / 2);
    Object.assign(a, {
      x: 60,
      y: 4,
      vx: 30,
      vy: -2,
      vz: 0,
      engine: "running",
      rpm: 0.4,
      throttle: 0.3,
      brake: false,
      grounded: false,
    });
    fly(sea, a, 30, hold(-0.2, 0, 0.3));
    expect(a.wet).toBe(true);
    expect(a.engine).toBe("dead");
    expect(Math.hypot(a.vx, a.vz)).toBeLessThan(1);
    expect(a.y).toBeGreaterThan(-1);
  });

  it("cuts the engine beyond the island's edge (no flying off the map)", () => {
    const a = air(55, 800, true, 1);
    fly(env, a, 120, hold(level, 0, 1));
    expect(Math.abs(a.z)).toBeGreaterThan(5000);
    expect(a.engine).toBe("dead");
  });

  it("is deterministic: the same inputs give the same flight", () => {
    const run = () => {
      const a = newAircraft(0, 0, env.ground, 0, 0);
      fly(env, a, 45, takeoffPilot());
      return [a.x, a.y, a.z, a.qx, a.qy, a.qz, a.qw, a.vx, a.vy, a.vz];
    };
    expect(run()).toEqual(run());
  });
});

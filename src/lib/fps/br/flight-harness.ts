/**
 * A deterministic flight harness for aircraft.ts (tests/br-aircraft.test.ts and
 * scripts/br/flight-sim.ts): a flat test field (a runway at `ground` m, optional box obstacles,
 * the sea beyond `seaFrom` m east), and scripted pilots that fly the take-off, the climb, the
 * turns, the stall, the glide and the landing the way a player would, through the same
 * FlightInput a client sends. Nothing here is used by the game itself.
 */
import {
  AIRCRAFT,
  aero,
  attitude,
  newAircraft,
  stepAircraft,
  type Aircraft,
  type FlightInput,
} from "./aircraft";
import type { StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";

export const TICK = 33.333;

export function testWorld(o: { ground?: number; seaFrom?: number; boxes?: number[][] } = {}) {
  const g = o.ground ?? 10;
  const sea = o.seaFrom ?? Infinity;
  const heightAt = (x: number) => (x > sea ? -20 : g);
  const boxes = o.boxes ?? [];
  const world = {
    hf: { heightAt, raycast: () => null },
    supportAt: (x: number) => heightAt(x),
    raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number) {
      const len = Math.hypot(dx, dy, dz);
      const d = [dx / len, dy / len, dz / len];
      const o3 = [ox, oy, oz];
      let best: number | null = null;
      for (const b of boxes) {
        let t0 = 0,
          t1 = max;
        let ok = true;
        for (let k = 0; k < 3; k++) {
          const lo = b[k]!,
            hi = b[k + 3]!;
          if (Math.abs(d[k]!) < 1e-9) {
            if (o3[k]! < lo || o3[k]! > hi) ok = false;
            continue;
          }
          let a = (lo - o3[k]!) / d[k]!,
            c = (hi - o3[k]!) / d[k]!;
          if (a > c) [a, c] = [c, a];
          t0 = Math.max(t0, a);
          t1 = Math.min(t1, c);
        }
        if (ok && t0 <= t1 && (best === null || t0 < best)) best = t0;
      }
      return best === null ? null : { distance: best, kind: "box" as const };
    },
  } as unknown as StaticWorld;
  const meta = { waterBodies: [] } as unknown as WorldMeta;
  return { world, meta, ground: g };
}

export type Telemetry = {
  t: number;
  x: number;
  y: number;
  z: number;
  agl: number;
  speed: number;
  vs: number;
  alpha: number;
  stall: number;
  pitch: number;
  bank: number;
  heading: number;
  grounded: boolean;
  rpm: number;
};

/** Fly `seconds` with `pilot` choosing the controls each tick from the state; returns telemetry. */
export function fly(
  env: ReturnType<typeof testWorld>,
  a: Aircraft,
  seconds: number,
  pilot: (a: Aircraft, t: number) => Partial<FlightInput>,
  t0 = 0,
) {
  const out: Telemetry[] = [];
  let maxImpact = 0;
  const ticks = Math.round((seconds * 1000) / TICK);
  for (let i = 0; i < ticks; i++) {
    const t = t0 + (i * TICK) / 1000;
    const c = pilot(a, t);
    const input: FlightInput = {
      elev: c.elev ?? 0,
      ail: c.ail ?? 0,
      rud: c.rud ?? 0,
      thr: c.thr ?? a.throttle,
      flaps: c.flaps ?? a.flaps,
      engine: c.engine ?? false,
      brake: c.brake ?? false,
    };
    maxImpact = Math.max(maxImpact, stepAircraft(env.world, env.meta, a, input, t * 1000, TICK));
    const ae = aero(a);
    const at = attitude(a);
    out.push({
      t: t + TICK / 1000,
      x: a.x,
      y: a.y,
      z: a.z,
      agl: a.y + AIRCRAFT.wheels[0].at[1] - env.world.hf.heightAt(a.x, a.z),
      speed: ae.V,
      vs: a.vy,
      alpha: ae.alpha,
      stall: ae.stall,
      pitch: at.pitch,
      bank: at.bank,
      heading: at.heading,
      grounded: a.grounded,
      rpm: a.rpm,
    });
  }
  return { log: out, maxImpact };
}

/** Wrap an angle to (−π, π]. */
export const wrap = (v: number) => Math.atan2(Math.sin(v), Math.cos(v));

/**
 * A take-off pilot: starts the engine, full power with the brakes off, keeps the heading with
 * the rudder, rotates at `vr` m/s to `climbPitch` and holds it (stick by a simple attitude
 * hold), wings level. Returns the aircraft once established in the climb.
 */
export function takeoffPilot(vr = 27, climbPitch = 0.14, heading = 0) {
  let started = false;
  return (a: Aircraft, t: number): Partial<FlightInput> => {
    const at = attitude(a);
    const ae = aero(a);
    const engine = !started && a.engine === "off";
    if (engine) started = true;
    const running = a.engine === "running";
    const rud = Math.max(-1, Math.min(1, wrap(at.heading - heading) * 3));
    const ail = Math.max(-1, Math.min(1, -at.bank * 2 - -a.wz * 0.5));
    let elev = 0;
    if (!a.grounded || ae.V >= vr)
      elev = Math.max(-1, Math.min(1, (climbPitch - at.pitch) * 3 + a.wx * -0.6));
    void t;
    return { engine, thr: running ? 1 : 0, brake: !running, rud, ail, elev, flaps: 1 };
  };
}

export { newAircraft };

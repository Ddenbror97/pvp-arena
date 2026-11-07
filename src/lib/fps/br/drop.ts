import { stepBody, type BrBody, type BrMoveInput } from "./movement";
import type { StaticWorld } from "./static-world";
import { WORLD_HALF, type WorldMeta } from "./world";

/**
 * Insertion for Project Island (PLAN §7 Phase 2), shared by the server room (authority) and the
 * client (prediction): the plane route, the jump window, freefall, the parachute, landing and,
 * for a water landing, swimming to shore. Deterministic for the same seed, inputs and world; no
 * rendering state is read (fairness boundary).
 *
 * Speeds come from RESEARCH.md §1 (PUBG 2017 measurements): freefall 180 km/h neutral, glide
 * 126 km/h down and 122 km/h forward, dive 234 km/h; auto-deploy 300 m above the ground below.
 * The canopy was PUBG's (64 km/h down, 47 forward: 0.7 : 1, ≈ 220 m from 300 m) until the
 * owner's parachute spec (2026-11-04) asked for long, steerable glides: see DROP.parachute. The
 * canopy cannot be cut or left before landing (no transition out of "parachute" but the ground
 * or the water). The plane crosses every seeded route in 50 seconds; its speed depends on
 * the route length so a diagonal flight never takes longer than a straight crossing.
 */
export const DROP = {
  planeAltitude: 800, // PICK
  planeDurationMs: 50_000,
  /** The route starts and ends this far outside the playable square. */
  routeMargin: 600,
  /** The route passes within this distance of the map centre (every landing zone reachable). */
  routeCentreBand: 2500,
  /** Open before reaching the island. */
  jumpOpensMs: 2_000,
  freefall: { neutral: 50, glideDown: 35, glideForward: 33.9, diveDown: 65, diveForward: 18 },
  /**
   * The canopy (owner's parachute spec, 2026-11-04: long, easy, predictable glides; it never
   * comes off before landing). It flies along its own heading, not the camera's: W glides
   * (18 m/s forward, 3.6 m/s down: 5 : 1, ≈ 1.5 km from 300 m, ≈ 4 km from a
   * deploy at the plane's height), S brakes (3 m/s forward, 6.5 m/s down: a steep, precise
   * final), no key drifts at 11 / 4.6; A/D turn the heading at 73°/s at cruise (a little faster
   * down while turning). Mouse sets the course; right-drag looks around independently.
   * Throttle response uses a 0.33 s time constant; deliberate braking responds in 0.22 s.
   * Turn authority preserves approximately the old cruise radius despite the faster glide.
   */
  parachute: {
    neutralForward: 11,
    neutralDown: 4.6,
    glideForward: 18,
    glideDown: 3.6,
    brakeForward: 3,
    brakeDown: 6.5,
    turnRate: 1.28,
    turnDown: 0.6,
    ease: 3,
    brakeEase: 4.5,
    /**
     * Dive (owner, 2026-11-05: the canopy opens on leaving the plane, "able to dive to land
     * faster"): a steep spiral, 34 m/s down and 26 m/s forward. Vertical speed eases in and out (vertEase per
     * second); below flareAgl the canopy pulls out of the dive for a normal landing.
     */
    diveDown: 34,
    diveForward: 26,
    vertEase: 1.6,
    flareAgl: 45,
    /** Begin recovering above the final flare; cap sink speed by braking distance. */
    recoverAgl: 100,
    flareDeceleration: 12,
    /** Sink rate on leaving the plane, braked by the opening canopy. */
    exitDown: 14,
  },
  autoDeployAgl: 300,
  /** Opening by hand is refused this close to the ground (the server rejects it). */
  minDeployAgl: 30,
  swimSpeed: 2.5,
  /** Out of the water once the ground is this close below the surface (wading). */
  wadeDepth: 1.2,
} as const;

export type DropPhase = "plane" | "freefall" | "parachute" | "swim" | "ground";

export type Route = {
  /** Start and end points on the ground plane (outside the map), at planeAltitude. */
  a: [number, number];
  b: [number, number];
  /** Unit direction a → b. */
  dir: [number, number];
  length: number;
  /** Saved flight timing; omitted routes use the current default. */
  durationMs?: number;
};

export type DropBody = BrBody & {
  phase: DropPhase;
  /** Speed on the ground plane while airborne (m/s), for the client's animation. */
  vx: number;
  vz: number;
};

export type DropInput = BrMoveInput & {
  /** Leave the plane (honoured only in the plane, after the jump window opens). */
  jumpOut?: boolean;
  /** Open the parachute (honoured only in freefall, at least minDeployAgl above the ground). */
  deploy?: boolean;
  /** Dive under the canopy (Ctrl): a steep, fast descent (DROP.parachute.dive*). */
  dive?: boolean;
  /** Mouse course target; free-look yaw is independent. Turning remains rate limited. */
  canopyYaw?: number;
};

/** Small deterministic PRNG for the route (mulberry32). */
function random(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A random straight route across the island for this match's seed (PUBG: random each game).
 * With `through` (the first safe zone's centre) the line passes within 1.2 km of that point, so
 * every match's plane flies over its first circle; otherwise within the band around the centre.
 */
export function planeRoute(seed: number, through?: readonly [number, number]): Route {
  const rand = random(seed);
  const angle = rand() * Math.PI * 2;
  const dir: [number, number] = [Math.cos(angle), Math.sin(angle)];
  // Offset the line sideways from the centre (or the zone), within the band.
  const off = (rand() * 2 - 1) * (through ? 1200 : DROP.routeCentreBand);
  const cx = (through?.[0] ?? 0) - dir[1] * off,
    cz = (through?.[1] ?? 0) + dir[0] * off;
  // Where the line enters and leaves the square (plus the margin): slab intersection.
  const lim = WORLD_HALF + DROP.routeMargin;
  let t0 = -Infinity,
    t1 = Infinity;
  for (const [c, d] of [
    [cx, dir[0]],
    [cz, dir[1]],
  ] as const) {
    if (Math.abs(d) < 1e-9) continue;
    const u = (-lim - c) / d,
      v = (lim - c) / d;
    t0 = Math.max(t0, Math.min(u, v));
    t1 = Math.min(t1, Math.max(u, v));
  }
  const a2 = [cx + dir[0] * t0, cz + dir[1] * t0] as const,
    b2 = [cx + dir[0] * t1, cz + dir[1] * t1] as const;
  return {
    a: [+a2[0].toFixed(1), +a2[1].toFixed(1)],
    b: [+b2[0].toFixed(1), +b2[1].toFixed(1)],
    dir,
    length: Math.hypot(b2[0] - a2[0], b2[1] - a2[1]),
    durationMs: DROP.planeDurationMs,
  };
}

/** Plane position `ms` after it spawns (clamped at the route's end). */
export function planeAt(route: Route, ms: number): [number, number, number] {
  const d = route.length * Math.min(1, Math.max(0, ms) / routeMs(route));
  return [route.a[0] + route.dir[0] * d, DROP.planeAltitude, route.a[1] + route.dir[1] * d];
}

/** Time the plane takes to fly the whole route (ms); everyone still aboard is ejected then. */
export const routeMs = (route: Route) => route.durationMs ?? DROP.planeDurationMs;

/** Water surface height at x/z, or null where there is no water above the ground. */
export function waterSurface(meta: WorldMeta, ground: number, x: number, z: number): number | null {
  if (ground < 0) return 0; // the sea
  for (const w of meta.waterBodies) {
    const [x0, z0, x1, z1] = w.bounds;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && ground < w.level) return w.level;
  }
  return null;
}

export function newDropBody(): DropBody {
  return {
    x: 0,
    y: DROP.planeAltitude,
    z: 0,
    velocityY: 0,
    crouched: false,
    grounded: false,
    phase: "plane",
    vx: 0,
    vz: 0,
  };
}

/**
 * One fixed step (TICK_MS) for one participant. `planeMs` is the time since the plane spawned.
 * Returns the transition that happened this step, if any (the server logs and broadcasts it).
 * Every transition is decided here from the server's own state: a client can only ask to jump
 * or deploy, never set a position or a phase.
 */
export function stepDrop(
  world: StaticWorld,
  meta: WorldMeta,
  route: Route,
  body: DropBody,
  input: DropInput | null,
  planeMs: number,
  dtMs: number,
): DropPhase | null {
  const dt = dtMs / 1000;
  // Inputs are untrusted: non-finite values count as zero, and the direction is normalised by
  // its true length while the throttle is capped at 1 (so no input moves anyone faster).
  const fin = (v: number | undefined) => (Number.isFinite(v) ? (v as number) : 0);
  const fwd = fin(input?.forward),
    str = fin(input?.strafe),
    yaw = fin(input?.yaw);
  const len = Math.hypot(fwd, str);
  const move = Math.min(1, len);
  const heading = () => {
    if (len === 0) return [0, 0] as const;
    const f = fwd / len,
      s = str / len;
    return [
      -Math.sin(yaw) * f + Math.cos(yaw) * s,
      -Math.cos(yaw) * f - Math.sin(yaw) * s,
    ] as const;
  };
  switch (body.phase) {
    case "plane": {
      const [x, y, z] = planeAt(route, planeMs);
      body.x = x;
      body.y = y;
      body.z = z;
      const open = planeMs >= DROP.jumpOpensMs;
      // Everyone left aboard at the end of the route is ejected. The canopy opens at once
      // (owner, 2026-11-05: no freefall): it flies off along the plane's track.
      if ((open && input?.jumpOut) || planeMs >= routeMs(route)) {
        body.phase = "parachute";
        // Out of the door falling; the opening canopy brakes it to a glide over about two
        // seconds (the sink rate eases at vertEase), as its deployment animation shows.
        body.velocityY = -DROP.parachute.exitDown;
        body.vx = route.dir[0] * DROP.parachute.neutralForward;
        body.vz = route.dir[1] * DROP.parachute.neutralForward;
        return "parachute";
      }
      return null;
    }
    case "freefall":
    case "parachute": {
      const ground = world.supportAt(body.x, body.z, 0.35, body.y);
      const agl = body.y - ground;
      if (
        body.phase === "freefall" &&
        (agl <= DROP.autoDeployAgl || (input?.deploy && agl >= DROP.minDeployAgl))
      ) {
        body.phase = "parachute";
        return "parachute";
      }
      let down: number;
      if (body.phase === "freefall") {
        // Freefall glides where the camera looks (PUBG): WASD relative to the view.
        const [hx, hz] = heading();
        const f = DROP.freefall;
        down = input?.dive ? f.diveDown : move > 0 ? f.glideDown : f.neutral;
        const forward = (input?.dive ? f.diveForward : f.glideForward) * move;
        // Ease the horizontal velocity toward the target (no instant turns).
        const ease = Math.min(1, dt * 1.5);
        body.vx += (hx * forward - body.vx) * ease;
        body.vz += (hz * forward - body.vz) * ease;
      } else {
        // The canopy flies its own heading (the way it moves; the camera's yaw only when it
        // hangs still, e.g. right after sliding down a wall). W/S set the airspeed, A/D turn.
        const p = DROP.parachute;
        const speed = Math.hypot(body.vx, body.vz);
        let h = speed > 0.5 ? Math.atan2(-body.vx, -body.vz) : yaw;
        const throttle = Math.max(-1, Math.min(1, fwd));
        let turn = Math.max(-1, Math.min(1, str));
        // forward = (−sin h, −cos h): turning right (D) lowers h.
        const diving = !!input?.dive && agl > p.flareAgl;
        // Tighter low-speed approaches, wider high-speed dive turns. A mouse target never
        // teleports the heading; free-look yaw is not a steering command.
        const authority = Math.max(0.7, Math.min(1.2, p.glideForward / Math.max(speed, 1)));
        if (!turn && dt > 0 && Number.isFinite(input?.canopyYaw)) {
          const delta = Math.atan2(
            Math.sin(input!.canopyYaw! - h),
            Math.cos(input!.canopyYaw! - h),
          );
          turn = -Math.max(-1, Math.min(1, delta / (p.turnRate * authority * dt)));
        }
        h -= p.turnRate * authority * turn * dt;
        const recover = Math.max(0, Math.min(1, (agl - p.flareAgl) / (p.recoverAgl - p.flareAgl)));
        const diveAmount = diving ? recover * recover * (3 - 2 * recover) : 0;
        const glideTarget =
          throttle >= 0
            ? p.neutralForward + (p.glideForward - p.neutralForward) * throttle
            : p.neutralForward + (p.brakeForward - p.neutralForward) * -throttle;
        const glideDown =
          (throttle >= 0
            ? p.neutralDown + (p.glideDown - p.neutralDown) * throttle
            : p.neutralDown + (p.brakeDown - p.neutralDown) * -throttle) +
          p.turnDown * Math.abs(turn);
        const wantDown = glideDown + (p.diveDown - glideDown) * diveAmount;
        // Ease the sink rate (into and out of a dive); never slower than a glide's.
        const was = Number.isFinite(body.velocityY) ? Math.max(0, -body.velocityY) : wantDown;
        down = Math.max(p.glideDown, was + (wantDown - was) * (1 - Math.exp(-dt * p.vertEase)));
        // v² = u² + 2as: progressively recover the dive instead of suddenly changing from
        // 34 to 6.5 m/s at 45 m. Include this step's travel in the remaining braking distance.
        const remaining = Math.max(0, agl - down * dt - p.flareAgl);
        down = Math.min(down, Math.sqrt(p.brakeDown ** 2 + 2 * p.flareDeceleration * remaining));
        const airspeed = glideTarget + (p.diveForward - glideTarget) * diveAmount;
        const response = throttle < 0 && !diving ? p.brakeEase : p.ease;
        const next = speed + (airspeed - speed) * (1 - Math.exp(-dt * response));
        body.vx = -Math.sin(h) * next;
        body.vz = -Math.cos(h) * next;
      }
      // Keep inside the map.
      const lim = WORLD_HALF - 2;
      const nx = Math.max(-lim, Math.min(lim, body.x + body.vx * dt)),
        nz = Math.max(-lim, Math.min(lim, body.z + body.vz * dt));
      const ny = body.y - down * dt;
      // Canopy against a wall: stop the horizontal move (slide down it).
      if (!world.blocked(nx, ny, nz, 1.8, 0.35)) {
        body.x = nx;
        body.z = nz;
      } else {
        body.vx = 0;
        body.vz = 0;
      }
      body.velocityY = -down;
      const below = world.supportAt(body.x, body.z, 0.35, Math.max(body.y, ny));
      const water = waterSurface(meta, world.hf.heightAt(body.x, body.z), body.x, body.z);
      const floor = water !== null && water > below ? water : below;
      if (ny <= floor) {
        body.y = floor;
        body.vx = body.vz = 0;
        body.velocityY = 0;
        body.airCrouchOffset = 0;
        body.phase = water !== null && water > below ? "swim" : "ground";
        body.grounded = body.phase === "ground";
        return body.phase;
      }
      body.y = ny;
      return null;
    }
    case "swim": {
      // Paddle at the surface; out once the bottom is within wading depth.
      const [hx, hz] = heading();
      body.x = Math.max(
        -WORLD_HALF + 2,
        Math.min(WORLD_HALF - 2, body.x + hx * DROP.swimSpeed * move * dt),
      );
      body.z = Math.max(
        -WORLD_HALF + 2,
        Math.min(WORLD_HALF - 2, body.z + hz * DROP.swimSpeed * move * dt),
      );
      const bottom = world.hf.heightAt(body.x, body.z);
      const surface = waterSurface(meta, bottom, body.x, body.z);
      if (surface === null || surface - bottom <= DROP.wadeDepth) {
        body.y = bottom;
        body.phase = "ground";
        body.grounded = true;
        body.airCrouchOffset = 0;
        return "ground";
      }
      body.y = surface;
      return null;
    }
    case "ground": {
      // Walking into deep water starts swimming.
      stepBody(world, body, input && { ...input, forward: fwd, strafe: str, yaw }, dtMs);
      const bottom = world.hf.heightAt(body.x, body.z);
      const surface = waterSurface(meta, bottom, body.x, body.z);
      if (surface !== null && surface - bottom > DROP.wadeDepth + 0.2 && body.y <= surface) {
        body.y = surface;
        body.phase = "swim";
        body.grounded = false;
        body.airCrouchOffset = 0;
        return "swim";
      }
      return null;
    }
  }
}

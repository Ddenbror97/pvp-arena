import { DROP, planeAt, type DropBody, type DropInput, type Route } from "./drop";
import type { WorldMeta } from "./world";

/**
 * Bot brains for the insertion (PLAN §6.6): each bot picks a landing spot weighted toward the
 * hot drops (PLAN §3 density tiers), limited to spots it can reach from this plane route, jumps
 * once the spot is within its glide range, and steers its freefall and canopy onto it. Pure and
 * deterministic for the match seed (server-side only; bots send the same inputs players do, so
 * every rule in drop.ts applies to them too).
 */

/** Hot drops draw the most bots, quiet places the fewest (PLAN §3 "Uneven density"). */
const POI_WEIGHT: Record<string, number> = {
  "island-superstore": 6,
  "southern-military-base": 6,
  "northstar-town": 5,
  millhaven: 3,
  "central-hospital": 3,
  "blackwater-prison": 3,
  riverwood: 3,
  "east-works": 3,
  "island-airfield": 3,
  crossroads: 3,
  "redstone-quarry": 1.5,
  "old-dam": 1.5,
  "pine-ridge": 1.5,
  "murder-cabins": 1.5,
  "island-village": 1.5,
  "west-point": 1,
  "iron-peaks": 1,
};

/**
 * Horizontal distance a jumper covers from the plane to the ground when gliding the whole way
 * (freefall glide to the auto-deploy height, then the canopy), for ground at `ground` m.
 */
export function glideReach(ground: number) {
  const ff =
    Math.max(0, DROP.planeAltitude - ground - DROP.autoDeployAgl) / DROP.freefall.glideDown;
  const chute = DROP.autoDeployAgl / DROP.parachute.steerDown;
  return ff * DROP.freefall.glideForward + chute * DROP.parachute.steerForward;
}

export type DropBot = {
  target: [number, number];
  /** Landed: the bot walks around its spot until Phase 3 rules (zone) take over. */
  landed: boolean;
};

function random(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from a point to the route line, and how far along the route its foot lies. */
function toRoute(route: Route, x: number, z: number) {
  const along = (x - route.a[0]) * route.dir[0] + (z - route.a[1]) * route.dir[1];
  const side = Math.abs((x - route.a[0]) * route.dir[1] - (z - route.a[1]) * route.dir[0]);
  return { along, side };
}

/**
 * Landing spots for `count` bots: a POI chosen by weight among those within glide reach of the
 * route (a random point inside it), or one in five a spot of open country along the route.
 */
export function planDropBots(
  meta: WorldMeta,
  route: Route,
  seed: number,
  count: number,
  heightAt: (x: number, z: number) => number,
): DropBot[] {
  const rand = random(seed ^ 0x5bd1e995);
  const reachable = meta.pois
    .map((p) => {
      const { side, along } = toRoute(route, p.x, p.z);
      return { p, side, along, w: POI_WEIGHT[p.id] ?? 1 };
    })
    .filter(
      ({ p, side, along }) =>
        side < glideReach(heightAt(p.x, p.z)) * 0.8 && along > 0 && along < route.length,
    );
  const total = reachable.reduce((s, r) => s + r.w, 0);
  const bots: DropBot[] = [];
  for (let i = 0; i < count; i++) {
    let target: [number, number];
    if (!reachable.length || rand() < 0.2) {
      // Open country: a random point along the route, offset sideways within reach.
      const along = route.length * (0.1 + 0.8 * rand());
      const side = (rand() * 2 - 1) * 500;
      target = [
        route.a[0] + route.dir[0] * along - route.dir[1] * side,
        route.a[1] + route.dir[1] * along + route.dir[0] * side,
      ];
    } else {
      let pick = rand() * total;
      let chosen = reachable[0]!;
      for (const r of reachable) {
        pick -= r.w;
        if (pick <= 0) {
          chosen = r;
          break;
        }
      }
      const radius = (chosen.p.padRadius ?? 200) * 0.7;
      const a = rand() * Math.PI * 2,
        d = Math.sqrt(rand()) * radius;
      target = [chosen.p.x + Math.cos(a) * d, chosen.p.z + Math.sin(a) * d];
    }
    const lim = 4800;
    target = [Math.max(-lim, Math.min(lim, target[0])), Math.max(-lim, Math.min(lim, target[1]))];
    bots.push({ target, landed: false });
  }
  return bots;
}

/** This step's input for a bot: the same input a player could send. */
export function dropBotInput(
  bot: DropBot,
  body: DropBody,
  route: Route,
  planeMs: number,
  heightAt: (x: number, z: number) => number,
): DropInput {
  const [tx, tz] = bot.target;
  const dx = tx - body.x,
    dz = tz - body.z;
  const dist = Math.hypot(dx, dz);
  // forward = (-sin yaw, -cos yaw): face the target.
  const yaw = Math.atan2(-dx, -dz);
  switch (body.phase) {
    case "plane": {
      // Jump once the target is within 85 % of the glide reach from here (or it is behind us).
      const [px, , pz] = planeAt(route, planeMs);
      const reach = glideReach(heightAt(tx, tz)) * 0.85;
      const ahead = (tx - px) * route.dir[0] + (tz - pz) * route.dir[1];
      return {
        forward: 0,
        strafe: 0,
        yaw,
        jumpOut: Math.hypot(tx - px, tz - pz) <= reach || ahead < 0,
      };
    }
    case "freefall":
    case "parachute":
      // Glide straight at it; hold still once above it (drop vertically).
      return { forward: dist > 12 ? 1 : 0, strafe: 0, yaw };
    case "swim":
      return { forward: 1, strafe: 0, yaw };
    case "ground":
      bot.landed = true;
      return { forward: dist > 3 ? 0.6 : 0, strafe: 0, yaw, walk: true };
  }
}

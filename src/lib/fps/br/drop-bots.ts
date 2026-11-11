import { DROP, planeAt, type DropBody, type DropInput, type Route } from "./drop";
import type { WorldMeta } from "./world";

/**
 * Bot brains for the insertion (PLAN §6.6): each bot picks a landing spot weighted toward the
 * hot drops (PLAN §3 density tiers), limited to spots it can reach from this plane route, jumps
 * once the spot is within its glide range, and steers its canopy onto it (diving off spare height). Pure and
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
  bayview: 2,
  "fishers-cove": 1.5,
  northfield: 2,
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

/** Most bots one POI takes, by its size (a pad radius of 25 m per bot, 4 to 14). */
export const poiCap = (padRadius = 200) => Math.max(4, Math.min(14, Math.round(padRadius / 25)));

/**
 * Horizontal distance a jumper covers from the plane to the ground when gliding the whole way
 * under the canopy (it opens on leaving the plane), for ground at `ground` m.
 */
export function glideReach(ground: number) {
  const p = DROP.parachute;
  return (Math.max(0, DROP.planeAltitude - ground) / p.glideDown) * p.glideForward;
}

export type DropBot = {
  target: [number, number];
  /** Landed: the bot walks around its spot until Phase 3 rules (zone) take over. */
  landed: boolean;
  /** The POI it aims for (none: open country). */
  poi?: string;
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
 * route (a random point inside it), until it holds `poiCap` bots; or one in five (and every bot
 * once all are full) a gun lying outside the named places (one bot each), else open country.
 */
export function planDropBots(
  meta: WorldMeta,
  route: Route,
  seed: number,
  count: number,
  heightAt: (x: number, z: number) => number,
  /** The first safe zone: drops inside it are favoured, far outside it rarely chosen. */
  zone?: { x: number; z: number; r: number },
  /**
   * Where guns lie (the rolled loot): bots that skip the named places land at one of these
   * outside them, a farm or a cabin with a gun, rather than in empty fields.
   */
  guns: ReadonlyArray<{ x: number; z: number }> = [],
): DropBot[] {
  const rand = random(seed ^ 0x5bd1e995);
  const zoneWeight = (x: number, z: number) => {
    if (!zone) return 1;
    const d = Math.hypot(x - zone.x, z - zone.z);
    return d <= zone.r ? 4 : d <= zone.r + 800 ? 1 : 0.15;
  };
  const reachable = meta.pois
    .map((p) => {
      const { side, along } = toRoute(route, p.x, p.z);
      return { p, side, along, w: (POI_WEIGHT[p.id] ?? 1) * zoneWeight(p.x, p.z) };
    })
    .filter(
      ({ p, side, along }) =>
        side < glideReach(heightAt(p.x, p.z)) * 0.8 && along > 0 && along < route.length,
    );
  // Gun spots outside every POI within reach of the route, one bot per 120 m cell.
  const inPoi = (x: number, z: number) =>
    meta.pois.some((p) => Math.hypot(p.x - x, p.z - z) < (p.padRadius ?? 200));
  const cells = new Map<string, { x: number; z: number; w: number }>();
  for (const g of guns) {
    const { side, along } = toRoute(route, g.x, g.z);
    if (along <= 0 || along >= route.length || inPoi(g.x, g.z)) continue;
    if (side >= glideReach(heightAt(g.x, g.z)) * 0.8) continue;
    const k = `${Math.floor(g.x / 120)},${Math.floor(g.z / 120)}`;
    if (!cells.has(k)) cells.set(k, { x: g.x, z: g.z, w: zoneWeight(g.x, g.z) });
  }
  // Sorted by cell for a draw that does not depend on the loot's order.
  const spots = [...cells.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
  let spotTotal = spots.reduce((t, v) => t + v.w, 0);
  const spot = (): [number, number] | null => {
    if (spotTotal <= 1e-9) return null;
    let pick = rand() * spotTotal;
    let k = spots.findIndex((v) => v.w > 0);
    for (const [j, v] of spots.entries()) {
      if (v.w <= 0) continue;
      k = j;
      pick -= v.w;
      if (pick <= 0) break;
    }
    if (k < 0) return null;
    const v = spots[k]!;
    spotTotal -= v.w;
    v.w = 0;
    const a = rand() * Math.PI * 2;
    return [v.x + Math.cos(a) * 6, v.z + Math.sin(a) * 6];
  };
  // A full POI takes no more bots (a hot drop is a dozen-odd players, not a third of the lobby).
  const taken = reachable.map(() => 0);
  let total = reachable.reduce((s, r) => s + r.w, 0);
  const bots: DropBot[] = [];
  for (let i = 0; i < count; i++) {
    let target: [number, number];
    let poi: string | undefined;
    const free = reachable.some((r, j) => taken[j]! < poiCap(r.p.padRadius));
    if (!free || total <= 1e-9 || rand() < 0.2) {
      // Away from the named places: a gun spot, else a random point along the route.
      const along = route.length * (0.1 + 0.8 * rand());
      const side = (rand() * 2 - 1) * 500;
      target = spot() ?? [
        route.a[0] + route.dir[0] * along - route.dir[1] * side,
        route.a[1] + route.dir[1] * along + route.dir[0] * side,
      ];
    } else {
      let pick = rand() * total;
      let k = 0;
      for (const [j, r] of reachable.entries()) {
        if (taken[j]! >= poiCap(r.p.padRadius)) continue;
        k = j;
        pick -= r.w;
        if (pick <= 0) break;
      }
      const chosen = reachable[k]!;
      poi = chosen.p.id;
      if (++taken[k]! >= poiCap(chosen.p.padRadius)) total -= chosen.w;
      const radius = (chosen.p.padRadius ?? 200) * 0.7;
      const a = rand() * Math.PI * 2,
        d = Math.sqrt(rand()) * radius;
      target = [chosen.p.x + Math.cos(a) * d, chosen.p.z + Math.sin(a) * d];
    }
    const lim = 4800;
    target = [Math.max(-lim, Math.min(lim, target[0])), Math.max(-lim, Math.min(lim, target[1]))];
    bots.push({ target, landed: false, ...(poi ? { poi } : {}) });
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
      // (No longer entered: the canopy opens on leaving the plane.)
      return { forward: dist > 12 ? 1 : 0, strafe: 0, yaw };
    case "parachute": {
      // Under the canopy the keys a player has: turn (A/D) toward the target, glide (W) to it,
      // dive (Q) off the height a glide to it does not need, brake (S) once close for a
      // steep final.
      const heading = Math.hypot(body.vx, body.vz) > 0.5 ? Math.atan2(-body.vx, -body.vz) : yaw;
      const off = Math.atan2(Math.sin(yaw - heading), Math.cos(yaw - heading));
      const p = DROP.parachute;
      const agl = body.y - heightAt(body.x, body.z);
      const need = (dist / p.glideForward) * p.glideDown;
      return {
        forward: dist > 60 ? 1 : dist > 15 ? 0 : -1,
        strafe: Math.max(-1, Math.min(1, -off * 2)),
        yaw,
        dive: Math.abs(off) < 0.6 && agl > need * 1.25 + 60,
      };
    }
    case "swim":
      return { forward: 1, strafe: 0, yaw };
    case "ladder": // bots never take a ladder (they use the stairs)
    case "zip": // on the zip-line the cable carries the body (bots never take it)
      return { forward: 0, strafe: 0, yaw };
    case "ground":
      bot.landed = true;
      return { forward: dist > 3 ? 0.6 : 0, strafe: 0, yaw, walk: true };
  }
}

import { PLAYER_RADIUS, STEP_HEIGHT, eyeHeight } from "../map";
import { teamOf } from "./match";
import { SANDGATE, SANDGATE_SITES } from "./sandgate";
import {
  BOMB_RULES,
  type BombInput,
  type BombMatchState,
  type BombPlayer,
  type Bombsite,
} from "./rules";
import { canSee } from "./visibility";
import { GRENADES, type GrenadeType } from "../grenades/rules";
import { simStart, simTo, throwStart } from "../grenades/physics";

type Point = { x: number; z: number };

// ------------------------------------------------------------ height-aware navigation
/**
 * Bots walk every level players do: a 0.5 m grid where each cell knows its floor height (ground,
 * stair, catwalk, platform, dock), with the practice bot's limb clearance (0.18 m beyond the
 * player radius). Edges: 8-connected, up at most one stair riser, drops allowed.
 */
const CELL = 0.5;
type Nav = {
  x: Float32Array;
  z: Float32Array;
  y: Float32Array;
  edges: Int32Array[];
  at: Map<number, number>;
};
let nav: Nav | null = null;
const cellKey = (i: number, j: number) => i * 4096 + j;
function navGrid(): Nav {
  if (nav) return nav;
  const xs: number[] = [],
    zs: number[] = [],
    ys: number[] = [];
  const at = new Map<number, number>();
  const R = PLAYER_RADIUS + 0.18;
  const hw = MAP.arena.width / 2 - 1,
    hd = MAP.arena.depth / 2 - 1;
  for (let i = Math.ceil(-hw / CELL); i <= Math.floor(hw / CELL); i++)
    for (let j = Math.ceil(-hd / CELL); j <= Math.floor(hd / CELL); j++) {
      const x = i * CELL,
        z = j * CELL;
      let y = 0;
      for (const b of MAP.boxes) {
        const top = b.y + b.h / 2;
        if (
          top <= 1.6 &&
          top > y &&
          Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS &&
          Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS
        )
          y = top;
      }
      // Anything no more than one riser above the floor is walked onto, not around (as in
      // predictMovement), so stairs and the catwalk's top step are not obstacles.
      const clear = !MAP.movementSolids.some(
        (b) =>
          b.y + b.h / 2 - y > STEP_HEIGHT + 1e-6 &&
          y < b.y + b.h / 2 - 1e-6 &&
          y + 1.8 > b.y - b.h / 2 &&
          Math.abs(x - b.x) < b.w / 2 + R &&
          Math.abs(z - b.z) < b.d / 2 + R,
      );
      if (!clear) continue;
      at.set(cellKey(i, j), xs.length);
      xs.push(x);
      zs.push(z);
      ys.push(y);
    }
  const edges: Int32Array[] = xs.map((x, n) => {
    const i = Math.round(x / CELL),
      j = Math.round(zs[n]! / CELL);
    const out: number[] = [];
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const v = at.get(cellKey(i + di, j + dj));
      if (v === undefined || ys[v]! - ys[n]! > STEP_HEIGHT + 1e-6) continue;
      if (di && dj && (!at.has(cellKey(i + di, j)) || !at.has(cellKey(i, j + dj)))) continue;
      out.push(v);
    }
    return Int32Array.from(out);
  });
  nav = { x: Float32Array.from(xs), z: Float32Array.from(zs), y: Float32Array.from(ys), edges, at };
  return nav;
}
function nearestCell(g: Nav, p: Point & { y?: number }) {
  let best = -1,
    d = Infinity;
  const i0 = Math.round(p.x / CELL),
    j0 = Math.round(p.z / CELL);
  for (let r = 0; r <= 6 && best < 0; r++)
    for (let di = -r; di <= r; di++)
      for (let dj = -r; dj <= r; dj++) {
        const n = g.at.get(cellKey(i0 + di, j0 + dj));
        if (n === undefined) continue;
        const e =
          Math.hypot(g.x[n]! - p.x, g.z[n]! - p.z) +
          (p.y === undefined ? 0 : Math.abs(g.y[n]! - p.y));
        if (e < d) {
          d = e;
          best = n;
        }
      }
  return best;
}
/** Breadth-first route over the height-aware grid (exported for tests). */
export function bombPath(from: Point & { y?: number }, to: Point & { y?: number }): Point[] {
  const g = navGrid();
  const start = nearestCell(g, from),
    end = nearestCell(g, to);
  if (start < 0 || end < 0) return [];
  const prev = new Int32Array(g.x.length).fill(-2);
  prev[start] = -1;
  const queue = [start];
  for (let k = 0; k < queue.length && prev[end] === -2; k++)
    for (const v of g.edges[queue[k]!]!)
      if (prev[v] === -2) {
        prev[v] = queue[k]!;
        queue.push(v);
      }
  if (prev[end] === -2) return [];
  const out: Point[] = [];
  for (let c = end; c !== start; c = prev[c]!) out.push({ x: g.x[c]!, z: g.z[c]! });
  return out.reverse();
}
const MAP = SANDGATE;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (a: number, n: number) => Math.max(-n, Math.min(n, a));
/** Same moderate skill as the 1v1 practice bot. */
const SKILL = 0.6;

/**
 * Named ground points on Sandgate (all on the bots' ground graph: tests/fps-bomb-bots.test.ts).
 * The height-aware grid connects the ground, stairs, catwalk and platforms.
 */
export const BOT_POINTS = {
  plant: { A: { x: -27, z: -24 }, B: { x: 30, z: -28 } } as Record<Bombsite, Point>,
  /** Police holds: two per site and one in mid. */
  holdA: [
    { x: -25.5, z: -31.5 },
    { x: -34.5, z: -27 },
  ],
  holdB: [
    { x: 22.5, z: -28 },
    { x: 33.5, z: -25.5 },
  ],
  // Deep in Police mid, watching down the corridor: attackers must cross the plaza to reach it.
  holdMid: { x: 5, z: -24 },
  /** Where each Police hold pre-aims (the Terrorist entrance it covers): A0, A1, mid, B0, B1. */
  watch: [
    { x: -30, z: -15 },
    { x: -34, z: -14 },
    { x: 4, z: -8 },
    { x: 34, z: -17 },
    { x: 20, z: -16 },
  ],
  /** Terrorist approaches: main lane and mid for each site, and a mid lurk spot. */
  approachA: [
    { x: -34, z: 27 },
    { x: -34, z: 8 },
    { x: -35, z: -12 },
  ],
  approachB: [
    { x: 31, z: 30 },
    { x: 25, z: 9 },
    { x: 34, z: -3 },
    { x: 34, z: -15 },
  ],
  // Mid to A over the raised catwalk (A short) and down the balcony stairs.
  midA: [
    { x: 7, z: 25 },
    { x: -3, z: 6 },
    { x: -6, z: -10 },
    { x: -16.5, z: -13.5 },
    { x: -24, z: -15 },
  ],
  midB: [
    { x: 7, z: 25 },
    { x: -3, z: 6 },
    { x: 3, z: -6 },
    { x: 15, z: -15 },
  ],
  lurk: { x: -3, z: 7 },
  /** Retake staging (the Police passage into each site): regroup here, then push together. */
  stage: { A: { x: -14, z: -27.5 }, B: { x: 14, z: -21.5 } } as Record<Bombsite, Point>,
};

type Plan = { goals: Point[]; holdAt?: Point; lookAt?: Point };
type Memory = {
  style: "push" | "lurk" | "support";
  holdUntil: number;
  nextUtility: number;
  utility: { type: GrenadeType; yaw: number; pitch: number; at: number } | null;
  round: number;
  plan: Plan;
  goal: number;
  route: Point[];
  nextPlan: number;
  seq: number;
  target: number | null;
  seenAt: number;
  aimYaw: number;
  aimPitch: number;
  nextAim: number;
  burstEnd: number;
  restEnd: number;
  lastAt: number;
  /** Visibility is re-checked every 100 ms (well under the 600 ms reaction time). */
  lookAt: number;
  seen: number | null;
  /** The current target appeared where this bot was already aiming, while standing still. */
  holdingAngle: boolean;
};

/**
 * Post-plant positions for a planted bomb: walkable spots 8–12 m away that see a crouched defuser
 * at the bomb, spread by slot (cached per plant position).
 */
const spotCache = new Map<string, Point[]>();
function postPlantSpot(b: { x: number; y: number; z: number }, slot: number): Point {
  const key = `${b.x.toFixed(1)},${b.z.toFixed(1)}`;
  let spots = spotCache.get(key);
  if (!spots) {
    const g = navGrid();
    spots = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      for (const r of [10, 8, 12]) {
        const c = nearestCell(g, { x: b.x + Math.cos(a) * r, z: b.z + Math.sin(a) * r });
        if (c < 0) continue;
        const spot = { x: g.x[c]!, y: g.y[c]!, z: g.z[c]! };
        if (Math.hypot(spot.x - b.x, spot.z - b.z) < 6) continue;
        if (!canSee(MAP, spot, { x: b.x, y: b.y, z: b.z, crouched: true })) continue;
        if (!bombPath(spot, b).length) continue;
        spots.push({ x: spot.x, z: spot.z });
        break;
      }
    }
    if (!spots.length) spots.push({ x: b.x, z: b.z });
    if (spotCache.size > 64) spotCache.clear();
    spotCache.set(key, spots);
  }
  return spots[(slot * 7) % spots.length]!;
}

/** Up to ten bots for one match. Emits ordinary inputs; never changes simulation state. */
export function createBombBots(random: () => number = Math.random) {
  const memory = new Map<number, Memory>();
  let planRound = -1,
    targetSite: Bombsite = "A",
    /** Police callout: a site whose approach Police have heard Terrorists on this round. */
    alert: Bombsite | null = null;
  let roles = [0, 1, 2, 3, 4];

  function teamPlan(state: BombMatchState) {
    if (planRound === state.round) return;
    planRound = state.round;
    targetSite = random() < 0.5 ? "A" : "B";
    alert = null;
    roles = [0, 1, 2, 3, 4];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(random() * (i + 1)));
      [roles[i], roles[j]] = [roles[j]!, roles[i]!];
    }
    for (const m of memory.values()) m.round = -1;
  }

  function planFor(state: BombMatchState, p: BombPlayer, style: Memory["style"]): Plan {
    const team = teamOf(state, p);
    const mates = state.players.filter((q) => teamOf(state, q) === team);
    const k = roles[mates.findIndex((q) => q.slot === p.slot)]!;
    if (team === "police") {
      const hold = [
        BOT_POINTS.holdA[0]!,
        BOT_POINTS.holdA[1]!,
        BOT_POINTS.holdMid,
        BOT_POINTS.holdB[0]!,
        BOT_POINTS.holdB[1]!,
      ][k]!;
      return { goals: [hold], holdAt: hold, lookAt: BOT_POINTS.watch[k]! };
    }
    const carrier = state.bomb.state === "carried" ? state.bomb.carrier : -1;
    const main = targetSite === "A" ? BOT_POINTS.approachA : BOT_POINTS.approachB;
    const mid = targetSite === "A" ? BOT_POINTS.midA : BOT_POINTS.midB;
    const plant = BOT_POINTS.plant[targetSite];
    if (p.slot === carrier)
      return { goals: [...(style === "lurk" ? mid : main), plant], holdAt: plant };
    // The others: two with the carrier, one through mid, one lurking mid then joining late.
    const others = mates.filter((q) => q.slot !== carrier);
    const j = others.findIndex((q) => q.slot === p.slot);
    if (j === 3 && style === "lurk") return { goals: [BOT_POINTS.lurk, ...mid.slice(2), plant] };
    if (j === 2 || style === "support") return { goals: [...mid, plant] };
    return { goals: [...main, plant] };
  }

  /** Overrides by objective state (dropped bomb, planted bomb). */
  function objectiveGoal(state: BombMatchState, p: BombPlayer, now: number): Point | null {
    const b = state.bomb,
      team = teamOf(state, p);
    if (b.state === "dropped" && team === "terrorist") {
      // Nearest living Terrorist fetches it.
      const ts = state.players.filter((q) => q.hp > 0 && teamOf(state, q) === "terrorist");
      const nearest = ts.reduce((a, q) =>
        Math.hypot(q.x - b.x, q.z - b.z) < Math.hypot(a.x - b.x, a.z - b.z) ? q : a,
      );
      if (nearest.slot === p.slot) return { x: b.x, z: b.z };
    }
    // Late in the round without a plant, every Terrorist pushes the target site.
    if (
      team === "terrorist" &&
      (b.state === "carried" || b.state === "planting") &&
      now > state.roundEndsAt - 40_000
    )
      return BOT_POINTS.plant[targetSite];
    // Callout: the mid player and one player from the other site rotate; one anchor stays.
    if (team === "police" && alert && b.state !== "planted") {
      const mates = state.players.filter((q) => teamOf(state, q) === "police");
      const k = roles[mates.findIndex((q) => q.slot === p.slot)]!;
      const rotate = alert === "A" ? k === 2 || k === 3 : k === 2 || k === 1;
      if (rotate) return (alert === "A" ? BOT_POINTS.holdA : BOT_POINTS.holdB)[k % 2]!;
    }
    if (b.state === "planted") {
      if (team === "police") {
        // Retake together: gather at the staging point until two are there (or time is short).
        const stage = BOT_POINTS.stage[b.site];
        const police = state.players.filter((q) => q.hp > 0 && teamOf(state, q) === "police");
        const staged = police.filter((q) => Math.hypot(q.x - stage.x, q.z - stage.z) < 4).length;
        const push = staged >= Math.min(2, police.length) || now > b.explodesAt - 30_000;
        if (!push && Math.hypot(p.x - b.x, p.z - b.z) > 6) return stage;
        return { x: b.x, z: b.z };
      }
      // Post-plant: hold an angle on the bomb from 8–12 m, from a spot that can see it.
      return postPlantSpot(b, p.slot);
    }
    return null;
  }

  function control(state: BombMatchState, p: BombPlayer, now: number): BombInput {
    let m = memory.get(p.slot);
    if (!m) {
      m = {
        style: "push",
        holdUntil: 0,
        nextUtility: 0,
        utility: null,
        round: -1,
        plan: { goals: [] },
        goal: 0,
        route: [],
        nextPlan: 0,
        seq: 0,
        target: null,
        seenAt: 0,
        aimYaw: p.yaw,
        aimPitch: 0,
        nextAim: 0,
        burstEnd: 0,
        restEnd: 0,
        lastAt: now,
        lookAt: 0,
        seen: null,
        holdingAngle: false,
      };
      memory.set(p.slot, m);
    }
    if (m.round !== state.round) {
      m.round = state.round;
      m.style = (["push", "lurk", "support"] as const)[Math.min(2, Math.floor(random() * 3))]!;
      m.plan = planFor(state, p, m.style);
      m.holdUntil = now + BOMB_RULES.freezeMs + 14000 + random() * 12000;
      m.nextUtility = now + BOMB_RULES.freezeMs + 2500 + p.slot * 370;
      m.utility = null;
      m.goal = 0;
      m.route = [];
      m.nextPlan = now + p.slot * 35;
      m.target = null;
    }
    const dt = Math.min(0.1, Math.max(0, (now - m.lastAt) / 1000));
    m.lastAt = now;
    const live = state.phase === "live";
    const team = teamOf(state, p);
    // Nearest visible living enemy.
    if (live && now >= m.lookAt) {
      m.lookAt = now + 100;
      let best: BombPlayer | null = null;
      for (const q of state.players)
        if (
          q.hp > 0 &&
          teamOf(state, q) !== team &&
          (!best || Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z)) &&
          canSee(MAP, p, q, state.grenades)
        )
          best = q;
      m.seen = best?.slot ?? null;
    }
    const candidate = live && m.seen !== null ? state.players[m.seen]! : null;
    const enemy = candidate && candidate.hp > 0 ? candidate : null;
    if (enemy) {
      if (m.target !== enemy.slot) {
        m.target = enemy.slot;
        m.seenAt = now;
        // Holding an angle (standing still, crosshair within 30° of where the enemy appeared)
        // reacts faster and steadier than finding the enemy on the move: the defender's edge.
        const bearing = Math.atan2(-(enemy.x - p.x), -(enemy.z - p.z));
        m.holdingAngle = !p.moving && Math.abs(wrap(bearing - p.yaw)) < Math.PI / 6;
      }
      if (now >= m.nextAim) {
        const dx = enemy.x - p.x,
          dz = enemy.z - p.z,
          distance = Math.hypot(dx, dz);
        const steady = m.holdingAngle ? 0.5 : 1;
        m.aimYaw = Math.atan2(-dx, -dz) + (((random() - 0.5) * 0.085) / SKILL) * steady;
        m.aimPitch =
          Math.atan2(
            enemy.y + (enemy.crouched ? 0.65 : 1.1) + (random() - 0.5) * 0.5 - (p.y + eyeHeight(p)),
            distance,
          ) +
          (((random() - 0.5) * 0.035) / SKILL) * steady;
        m.nextAim = now + 125 / SKILL;
      }
    } else m.target = null;
    const reacted = !!enemy && now - m.seenAt >= (m.holdingAngle ? 250 : 360 / SKILL);
    // Destination: objective overrides, else the round plan.
    const override = live ? objectiveGoal(state, p, now) : null;
    // An unpressured defender changes angle rather than kneeling at one spot all round.
    if (live && team === "police" && !override && !enemy && now > m.holdUntil) {
      m.plan = planFor(state, p, m.style);
      const k =
        roles[
          state.players.filter((q) => teamOf(state, q) === team).findIndex((q) => q.slot === p.slot)
        ]!;
      const alternatives =
        k < 2
          ? BOT_POINTS.holdA
          : k > 2
            ? BOT_POINTS.holdB
            : [BOT_POINTS.holdMid, BOT_POINTS.stage[targetSite]];
      const at = Math.floor(now / 9000 + p.slot) % alternatives.length;
      m.plan = {
        goals: [alternatives[at]!],
        holdAt: alternatives[at]!,
        lookAt: BOT_POINTS.watch[k]!,
      };
      m.goal = 0;
      m.route = [];
      m.nextPlan = now;
      m.holdUntil = now + 7000 + random() * 7000;
    }
    let destination: Point | null = override;
    if (!destination && m.plan.goals.length) {
      const g = m.plan.goals[Math.min(m.goal, m.plan.goals.length - 1)]!;
      if (Math.hypot(p.x - g.x, p.z - g.z) < 1.2 && m.goal < m.plan.goals.length - 1) {
        m.goal++;
        m.route = [];
        m.nextPlan = now;
      }
      destination = m.plan.goals[Math.min(m.goal, m.plan.goals.length - 1)]!;
    }
    const b = state.bomb;
    const atSite = (s: Bombsite) => {
      const r = SANDGATE_SITES[s];
      return p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1;
    };
    // Plant / defuse: stand still and hold use when nobody is in sight.
    const planting =
      live &&
      !enemy &&
      (b.state === "carried" || b.state === "planting") &&
      b.carrier === p.slot &&
      (atSite("A") || atSite("B")) &&
      !!destination &&
      Math.hypot(p.x - destination.x, p.z - destination.z) < 2.5;
    const defusing =
      live &&
      !enemy &&
      b.state === "planted" &&
      team === "police" &&
      Math.hypot(p.x - b.x, p.z - b.z) <= BOMB_RULES.defuseRadius - 0.2 &&
      (b.defuser === undefined || b.defuser === p.slot);
    if (destination && now >= m.nextPlan && (live || !m.route.length)) {
      m.route = bombPath(p, destination);
      m.nextPlan = now + 650 + p.slot * 31;
    }
    while (m.route[0] && Math.hypot(m.route[0].x - p.x, m.route[0].z - p.z) < 0.3) m.route.shift();
    const next = m.route[0];
    let vx = next ? next.x - p.x : 0,
      vz = next ? next.z - p.z : 0;
    const len = Math.hypot(vx, vz) || 1;
    vx /= len;
    vz /= len;
    // Terrorists guarding a planted bomb hold an angle on it once in position.
    const guarding =
      live &&
      b.state === "planted" &&
      team === "terrorist" &&
      !!destination &&
      Math.hypot(p.x - destination.x, p.z - destination.z) < 0.8;
    const holding =
      guarding ||
      (!override &&
        !!m.plan.holdAt &&
        Math.hypot(p.x - m.plan.holdAt.x, p.z - m.plan.holdAt.z) < 0.8);
    if (!live || planting || defusing || holding || (reacted && now < m.burstEnd)) {
      vx = 0;
      vz = 0;
    }
    // Holding: pre-aim the entrance this hold covers.
    const look =
      guarding && b.state === "planted"
        ? { x: b.x, z: b.z }
        : holding && m.plan.lookAt
          ? m.plan.lookAt
          : null;
    const goalYaw =
      defusing && b.state === "planted"
        ? Math.atan2(-(b.x - p.x), -(b.z - p.z))
        : enemy
          ? m.aimYaw
          : look
            ? Math.atan2(-(look.x - p.x), -(look.z - p.z))
            : next
              ? Math.atan2(-vx || -(next.x - p.x), -vz || -(next.z - p.z))
              : p.yaw;
    let yaw = wrap(p.yaw + clamp(wrap(goalYaw - p.yaw), 3.2 * Math.max(dt, 0.033)));
    const goalPitch =
      defusing && b.state === "planted"
        ? Math.atan2(
            b.y + 0.14 - (p.y + eyeHeight(p)),
            Math.max(0.15, Math.hypot(b.x - p.x, b.z - p.z)),
          )
        : enemy
          ? m.aimPitch
          : 0;
    let pitch = p.pitch + clamp(goalPitch - p.pitch, 2 * Math.max(dt, 0.033));
    if (reacted && now >= m.restEnd) {
      m.burstEnd = now + 260 + random() * 160;
      m.restEnd = m.burstEnd + (320 + random() * 300) / SKILL;
    }
    // Utility uses normal equip/hold/release inputs and the server's collision/fuses.
    // One bounded trajectory check on a staggered cooldown; never scan hidden enemies.
    if (live && !planting && !defusing && !m.utility && now >= m.nextUtility && !p.reloadUntil) {
      m.nextUtility = now + 6500 + random() * 4000;
      const point = enemy ?? (m.style === "support" ? destination : null);
      const d = point ? Math.hypot(point.x - p.x, point.z - p.z) : 0;
      const type: GrenadeType = enemy ? (m.style === "lurk" ? "fire" : "he") : "smoke";
      if (
        point &&
        d > 7 &&
        d < 18 &&
        (p.grenades?.[type] ?? 0) > 0 &&
        !(state.grenades?.smokes.length && type === "smoke")
      ) {
        const aim = Math.atan2(-(point.x - p.x), -(point.z - p.z));
        const angle = -0.12;
        const launch = throwStart(
          { x: p.x, y: p.y + eyeHeight(p), z: p.z },
          aim,
          angle,
          { x: 0, y: 0, z: 0 },
          "over",
          MAP,
        );
        const landing = simStart(launch.origin, launch.velocity);
        simTo(landing, MAP, type === "he" ? GRENADES.he.fuseMs / 1000 : 2.5);
        const safe = state.players.every(
          (q) =>
            q.hp <= 0 ||
            teamOf(state, q) !== team ||
            Math.hypot(q.x - landing.x, q.z - landing.z) > (type === "smoke" ? 2 : 6),
        );
        if (safe && Math.hypot(landing.x - point.x, landing.z - point.z) < 5)
          m.utility = { type, yaw: aim, pitch: angle, at: now };
      }
    }
    if (m.utility && !p.nadeHold && !p.nadeThrow && !(p.grenades?.[m.utility.type] ?? 0))
      m.utility = null;
    if (m.utility && now - m.utility.at > 5000 && !p.nadeThrow) m.utility = null;
    const utility = live && !planting && !defusing ? m.utility : null;
    if (utility) {
      vx = vz = 0;
      yaw = wrap(p.yaw + clamp(wrap(utility.yaw - p.yaw), 3.2 * Math.max(dt, 0.033)));
      pitch = p.pitch + clamp(utility.pitch - p.pitch, 2 * Math.max(dt, 0.033));
    }
    return {
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: ++m.seq,
      round: state.round,
      forward: clamp(-Math.sin(yaw) * vx - Math.cos(yaw) * vz, 1),
      strafe: clamp(Math.cos(yaw) * vx - Math.sin(yaw) * vz, 1),
      yaw,
      pitch,
      weapon: utility ? "grenade" : "rifle",
      ...(utility ? { nade: utility.type } : {}),
      fire: utility
        ? !p.nadeThrow &&
          (!p.nadeHold ||
            now - p.nadeHold.since < GRENADES.primeMs + 60 ||
            Math.abs(wrap(utility.yaw - yaw)) > 0.08)
        : reacted && now < m.burstEnd && Math.abs(wrap(m.aimYaw - yaw)) < 0.16,
      reload: !utility && (p.ammo === 0 || (!enemy && p.ammo < 10)),
      jump: false,
      sprint: false,
      // Holding an angle crouched: tighter spread and a smaller target (as players do).
      crouch: !utility && (defusing || (reacted && holding && now < m.burstEnd)),
      walk:
        !enemy &&
        !utility &&
        m.style === "lurk" &&
        !!next &&
        Math.hypot(p.x - next.x, p.z - next.z) < 12,
      ...(planting || defusing ? { use: true } : {}),
    };
  }

  return {
    /** Inputs for every living bot slot. */
    inputs(state: BombMatchState, now: number): Record<number, BombInput> {
      teamPlan(state);
      // Shared callout: Police hear running Terrorists (footsteps carry ~25 m) on a site's approach
      // (within 34 m of its plant point, i.e. within earshot of the site's holders).
      if (state.phase === "live" && !alert)
        for (const e of state.players) {
          if (e.hp <= 0 || teamOf(state, e) !== "terrorist" || !e.moving || e.crouched) continue;
          const heard = state.players.some(
            (q) =>
              q.hp > 0 && teamOf(state, q) === "police" && Math.hypot(q.x - e.x, q.z - e.z) < 25,
          );
          if (!heard) continue;
          for (const site of ["A", "B"] as const) {
            const c = BOT_POINTS.plant[site];
            if (Math.hypot(e.x - c.x, e.z - c.z) < 34) alert = site;
          }
        }
      const out: Record<number, BombInput> = {};
      for (const p of state.players) if (p.bot && p.hp > 0) out[p.slot] = control(state, p, now);
      return out;
    },
    /** Forget a slot's memory (a human took it over). */
    release(slot: number) {
      memory.delete(slot);
    },
  };
}

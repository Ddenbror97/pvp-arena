import { eyeHeight } from "../map";
import { teamOf } from "./match";
import { SANDGATE } from "./sandgate";
import { bombMapOf, bombsiteIn, type BombMapId } from "./maps";
import { bombNav, navClear, navPath, nearestNode } from "./nav";
import type { GameMap } from "../maps/types";
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

type Point = { x: number; z: number; y?: number | undefined };

/**
 * Bots walk every level players do over the shared walk graph (nav.ts): stairs, ramps, the catwalk
 * and the floor under it, upper storeys, the tunnel. Exported for tests (Sandgate by default).
 */
export function bombPath(
  from: Point & { y?: number },
  to: Point & { y?: number },
  map: GameMap = SANDGATE,
): Point[] {
  return navPath(map, from, to);
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (a: number, n: number) => Math.max(-n, Math.min(n, a));
/** Same moderate skill as the 1v1 practice bot. */
const SKILL = 0.6;

/**
 * Named ground points on Sandgate (all on the bots' ground graph: tests/fps-bomb-bots.test.ts).
 * The height-aware grid connects the ground, stairs, catwalk and platforms.
 */
export const BOT_POINTS: BotPoints = {
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

type BotPoints = {
  plant: Record<Bombsite, Point>;
  holdA: Point[];
  holdB: Point[];
  holdMid: Point;
  watch: Point[];
  approachA: Point[];
  approachB: Point[];
  midA: Point[];
  midB: Point[];
  lurk: Point;
  stage: Record<Bombsite, Point>;
};
/**
 * IRON DISTRICT bot points (on the walk graph: tests/fps-iron-district.test.ts). Heights are given
 * where levels stack (catwalk over the courtyard, apartment floors), so routes pick the right one.
 */
export const IRON_DISTRICT_BOT_POINTS: BotPoints = {
  plant: { A: { x: -30, z: -33, y: 1.2 }, B: { x: 26, z: -27, y: 2.4 } },
  // Police holds: catwalk end and the press for A; CT mid; market hall door and the loading bay.
  holdA: [
    { x: -24.5, z: -34.8, y: 4.2 },
    { x: -26, z: -18, y: 1.2 },
  ],
  holdB: [
    { x: 32, z: -36.6, y: 2.4 },
    { x: 41, z: -20, y: 2.4 },
  ],
  holdMid: { x: 5, z: -22, y: 1.2 },
  watch: [
    { x: -35.5, z: -12, y: 1.2 },
    { x: -22, z: -20, y: 1.2 },
    { x: 4, z: -6.5, y: 1.2 },
    { x: 24, z: -11, y: 5.4 },
    { x: 37, z: -12, y: 2.4 },
  ],
  // A main: high street, down the loading ramp, the yard, the shipping hall, the doors.
  approachA: [
    { x: -20, z: 33, y: 5.4 },
    { x: -33, z: 28, y: 5 },
    { x: -32.5, z: 12, y: 1.2 },
    { x: -36.6, z: 3, y: 1.2 },
    { x: -36.6, z: -4, y: 1.2 },
    { x: -35.5, z: -12, y: 1.2 },
  ],
  // B: half through the apartments to the balcony, half down the market lane and the arch.
  approachB: [
    { x: 20, z: 34, y: 5.4 },
    { x: 42, z: 31, y: 5.4 },
    { x: 39, z: 9, y: 2.4 },
    { x: 37, z: -10, y: 2.4 },
  ],
  // Mid to A through the annex and the boiler house; mid to B through the arcade.
  midA: [
    { x: -4, z: 24, y: 5.4 },
    { x: -6.5, z: 8, y: 1.2 },
    { x: -6, z: -3, y: 1.2 },
    { x: -15, z: -3, y: 1.2 },
    { x: -17, z: -19, y: 1.2 },
    { x: -23.5, z: -20, y: 1.2 },
  ],
  midB: [
    { x: -4, z: 24, y: 5.4 },
    { x: -6.5, z: 8, y: 1.2 },
    { x: 11, z: -3, y: 1.2 },
    { x: 20, z: -3, y: 1.2 },
    { x: 20, z: -14, y: 2.4 },
  ],
  lurk: { x: 13.5, z: 5, y: 1.2 },
  stage: { A: { x: -24, z: -42, y: 1.2 }, B: { x: 16, z: -40.5, y: 1.2 } },
};
const POINTS_BY_MAP: Record<BombMapId, BotPoints> = {
  sandgate: BOT_POINTS,
  "iron-district": IRON_DISTRICT_BOT_POINTS,
};
const pointsOf = (state: BombMatchState) => POINTS_BY_MAP[bombMapOf(state).id];

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
  /** Sideways push away from teammates, smoothed (−1..1 of the direction of travel's right). */
  sidestep: number;
};

/**
 * Moving as a group (owner, 2026-11-12: "bots … run on each other and take same path, they run
 * laggy when you run together"). A route is a chain of half-metre steps in eight directions,
 * and every bot on it used to head for the same next step and be pushed off it by the others:
 * they zig-zagged, jostled for one cell and stood inside each other.
 *
 *  - LOOKAHEAD: a bot heads for the farthest step of its route it can walk straight to, so it
 *    runs in lines and turns once at a corner.
 *  - LANE: each bot keeps to its own side of the route (by its role this round), as far as the
 *    walk graph allows, and comes back to the line where the route narrows and at its end.
 *  - Teammates (a human's too) are given room sideways, smoothly, and a bot slows behind one
 *    it would otherwise run into, instead of pushing through.
 */
const LOOKAHEAD = 8; // route steps (4 m)
const LANE_M = 0.8;
const ROOM_M = 1.3;

/**
 * Post-plant positions for a planted bomb: walkable spots 8–12 m away that see a crouched defuser
 * at the bomb, spread by slot (cached per plant position).
 */
const spotCache = new Map<string, Point[]>();
function postPlantSpot(map: GameMap, b: { x: number; y: number; z: number }, slot: number): Point {
  const key = `${map.id}:${b.x.toFixed(1)},${b.y.toFixed(1)},${b.z.toFixed(1)}`;
  let spots = spotCache.get(key);
  if (!spots) {
    const g = bombNav(map);
    spots = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      for (const r of [10, 8, 12]) {
        const c = nearestNode(g, { x: b.x + Math.cos(a) * r, y: b.y, z: b.z + Math.sin(a) * r });
        if (c < 0) continue;
        const spot = { x: g.x[c]!, y: g.y[c]!, z: g.z[c]! };
        if (Math.hypot(spot.x - b.x, spot.z - b.z) < 6) continue;
        if (!canSee(map, spot, { x: b.x, y: b.y, z: b.z, crouched: true })) continue;
        if (!navPath(map, spot, b).length) continue;
        if (spots.some((p) => Math.hypot(p.x - spot.x, p.z - spot.z) < 2.2)) continue;
        spots.push({ x: spot.x, y: spot.y, z: spot.z });
        break;
      }
    }
    if (!spots.length) spots.push({ x: b.x, y: b.y, z: b.z });
    if (spotCache.size > 64) spotCache.clear();
    spotCache.set(key, spots);
  }
  return spots[slot % spots.length]!;
}

/** Exactly one defender approaches the device; everyone else clears and covers.
 * A human already defusing always keeps the assignment. No server input is bypassed.
 */
export function bombDefuser(state: BombMatchState): number | null {
  const b = state.bomb;
  if (b.state !== "planted") return null;
  const defenders = state.players.filter((p) => p.hp > 0 && teamOf(state, p) === "police");
  if (b.defuser !== undefined && defenders.some((p) => p.slot === b.defuser)) return b.defuser;
  const bots = defenders.filter((p) => p.bot);
  const candidates = bots.length ? bots : defenders;
  const cost = (p: BombPlayer) => Math.hypot(p.x - b.x, p.z - b.z) + (p.defuseKit ? 0 : 3);
  return candidates.sort((a, c) => cost(a) - cost(c) || a.slot - c.slot)[0]?.slot ?? null;
}

function stagingSpot(map: GameMap, origin: Point, role: number): Point {
  const g = bombNav(map);
  const offsets = [
    [-2, -1],
    [2, -1],
    [-2, 1.5],
    [2, 1.5],
    [0, 3],
  ] as const;
  const [dx, dz] = offsets[role % offsets.length]!;
  const c = nearestNode(g, { x: origin.x + dx, y: origin.y, z: origin.z + dz });
  return c < 0 ? origin : { x: g.x[c]!, y: g.y[c]!, z: g.z[c]! };
}

/** Up to ten bots for one match. Emits ordinary inputs; never changes simulation state. */
export function createBombBots(random: () => number = Math.random) {
  const memory = new Map<number, Memory>();
  let planRound = -1,
    targetSite: Bombsite = "A",
    /** Police callout: a site whose approach Police have heard Terrorists on this round. */
    alert: Bombsite | null = null;
  let designatedDefuser: number | null = null;
  let alertUntil = 0,
    retakePushed = false;
  let roles = [0, 1, 2, 3, 4];
  const roleOf = (p: BombPlayer) => roles[p.slot % BOMB_RULES.teamSize]!;

  function teamPlan(state: BombMatchState) {
    if (planRound === state.round) return;
    planRound = state.round;
    targetSite = random() < 0.5 ? "A" : "B";
    alert = null;
    alertUntil = 0;
    retakePushed = false;
    roles = [0, 1, 2, 3, 4];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(random() * (i + 1)));
      [roles[i], roles[j]] = [roles[j]!, roles[i]!];
    }
    for (const m of memory.values()) m.round = -1;
  }

  function planFor(state: BombMatchState, p: BombPlayer, style: Memory["style"]): Plan {
    const P = pointsOf(state);
    const team = teamOf(state, p);
    const mates = state.players.filter((q) => teamOf(state, q) === team);
    const k = roleOf(p);
    if (team === "police") {
      const hold = [P.holdA[0]!, P.holdA[1]!, P.holdMid, P.holdB[0]!, P.holdB[1]!][k]!;
      return { goals: [hold], holdAt: hold, lookAt: P.watch[k]! };
    }
    const carrier = state.bomb.state === "carried" ? state.bomb.carrier : -1;
    const main = targetSite === "A" ? P.approachA : P.approachB;
    const mid = targetSite === "A" ? P.midA : P.midB;
    const plant = P.plant[targetSite];
    if (p.slot === carrier)
      return { goals: [...(style === "lurk" ? mid : main), plant], holdAt: plant };
    // The others: two with the carrier, one through mid, one lurking mid then joining late.
    const others = mates.filter((q) => q.slot !== carrier);
    const j = others.findIndex((q) => q.slot === p.slot);
    if (j === 3 && style === "lurk") return { goals: [P.lurk, ...mid.slice(2), plant] };
    if (j === 2 || style === "support") return { goals: [...mid, plant] };
    return { goals: [...main, plant] };
  }

  /** Overrides by objective state (dropped bomb, planted bomb). */
  function objectiveGoal(state: BombMatchState, p: BombPlayer, now: number): Point | null {
    const P = pointsOf(state),
      map = bombMapOf(state).map;
    const b = state.bomb,
      team = teamOf(state, p);
    if (b.state === "dropped" && team === "terrorist") {
      // Nearest living Terrorist fetches it.
      const ts = state.players.filter((q) => q.hp > 0 && teamOf(state, q) === "terrorist");
      const nearest = ts.reduce((a, q) =>
        Math.hypot(q.x - b.x, q.z - b.z) < Math.hypot(a.x - b.x, a.z - b.z) ? q : a,
      );
      if (nearest.slot === p.slot) return { x: b.x, y: b.y, z: b.z };
    }
    // Late in the round without a plant, every Terrorist pushes the target site.
    if (
      team === "terrorist" &&
      (b.state === "carried" || b.state === "planting") &&
      now > state.roundEndsAt - 40_000
    )
      return P.plant[targetSite];
    // Callout: the mid player and one player from the other site rotate; one anchor stays.
    if (team === "police" && alert && b.state !== "planted") {
      const k = roleOf(p);
      const rotate = alert === "A" ? k === 2 || k === 3 : k === 2 || k === 1;
      if (rotate) return stagingSpot(map, P.stage[alert], k);
    }
    if (b.state === "planted") {
      if (team === "police") {
        // Retake together: gather at the staging point until two are there (or time is short).
        const stage = P.stage[b.site];
        const police = state.players.filter((q) => q.hp > 0 && teamOf(state, q) === "police");
        const staged = police.filter((q) => Math.hypot(q.x - stage.x, q.z - stage.z) < 4).length;
        if (
          staged >= Math.min(2, police.length) ||
          now > b.explodesAt - 30_000 ||
          police.some((q) => Math.hypot(q.x - b.x, q.z - b.z) < 6)
        )
          retakePushed = true;
        if (!retakePushed) return stagingSpot(map, stage, roleOf(p));
        if (p.slot === designatedDefuser) return { x: b.x, y: b.y, z: b.z };
        return postPlantSpot(map, b, roleOf(p));
      }
      // Post-plant: hold an angle on the bomb from 8–12 m, from a spot that can see it.
      return postPlantSpot(map, b, p.slot);
    }
    return null;
  }

  function control(state: BombMatchState, p: BombPlayer, now: number): BombInput {
    const P = pointsOf(state),
      bm = bombMapOf(state),
      map = bm.map;
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
        sidestep: 0,
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
          canSee(map, p, q, state.grenades)
        )
          best = q;
      m.seen = best?.slot ?? null;
    }
    const candidate = live && m.seen !== null ? state.players[m.seen]! : null;
    const enemy = candidate && candidate.hp > 0 ? candidate : null;
    if (enemy && team === "police") {
      const a = P.plant.A,
        b = P.plant.B;
      const site =
        Math.hypot(enemy.x - a.x, enemy.z - a.z) < Math.hypot(enemy.x - b.x, enemy.z - b.z)
          ? "A"
          : "B";
      const point = P.plant[site];
      if (Math.hypot(enemy.x - point.x, enemy.z - point.z) < 24) {
        alert = site;
        alertUntil = now + 4500;
      }
    }
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
      const k = roleOf(p);
      const alternatives =
        k < 2 ? P.holdA : k > 2 ? P.holdB : [P.holdMid, P.stage[p.slot % 2 ? "A" : "B"]];
      const at = Math.floor(now / 9000 + p.slot) % alternatives.length;
      m.plan = {
        goals: [alternatives[at]!],
        holdAt: alternatives[at]!,
        lookAt: P.watch[k]!,
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
    const atSite = (s: Bombsite) => bombsiteIn(bm, p.x, p.y, p.z) === s;
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
      (!enemy ||
        (b.state === "planted" &&
          b.explodesAt - now <=
            (p.defuseKit ? BOMB_RULES.defuseKitMs : BOMB_RULES.defuseMs) + 1800)) &&
      b.state === "planted" &&
      team === "police" &&
      designatedDefuser === p.slot &&
      Math.hypot(p.x - b.x, p.z - b.z) <= BOMB_RULES.defuseRadius - 0.2 &&
      (b.defuser === undefined || b.defuser === p.slot);
    if (destination && now >= m.nextPlan && (live || !m.route.length)) {
      m.route = navPath(map, p, destination);
      m.nextPlan = now + 650 + p.slot * 31;
    }
    while (m.route[0] && Math.hypot(m.route[0].x - p.x, m.route[0].z - p.z) < 0.3) m.route.shift();
    // Head for the farthest step ahead that can be walked to in a straight line; the steps
    // before it are done with.
    let ahead = 0;
    for (let i = Math.min(LOOKAHEAD, m.route.length) - 1; i > 0; i--)
      if (navClear(map, p, m.route[i]!)) {
        ahead = i;
        break;
      }
    if (ahead > 0) m.route.splice(0, ahead);
    const next = m.route[0];
    let vx = next ? next.x - p.x : 0,
      vz = next ? next.z - p.z : 0;
    const len = Math.hypot(vx, vz) || 1;
    vx /= len;
    vz /= len;
    // This bot's side of the route: aim beside the step, where that can be walked to, and back
    // on the line near the end of the route (holds, plant spots and stairs are single points).
    const lane = (roleOf(p) % 3) - 1;
    if (next && lane && m.route.length > 6) {
      for (const width of [LANE_M, LANE_M / 2]) {
        const side = { x: next.x - vz * lane * width, z: next.z + vx * lane * width, y: next.y };
        if (!navClear(map, p, side)) continue;
        const d = Math.hypot(side.x - p.x, side.z - p.z) || 1;
        vx = (side.x - p.x) / d;
        vz = (side.z - p.z) / d;
        break;
      }
    }
    // The way this bot is heading, before making room for anyone: what it faces.
    const headX = vx,
      headZ = vz;
    // Terrorists guarding a planted bomb hold an angle on it once in position.
    const guarding =
      live &&
      b.state === "planted" &&
      (team === "terrorist" || (retakePushed && designatedDefuser !== p.slot)) &&
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
    // Room for teammates: step aside (smoothly, never backwards) and slow behind one in the way.
    let pace = 1;
    if (live && !planting && !defusing && !holding && (vx || vz)) {
      let push = 0;
      for (const q of state.players) {
        if (q.slot === p.slot || q.hp <= 0 || teamOf(state, q) !== team) continue;
        const dx = q.x - p.x,
          dz = q.z - p.z,
          d = Math.hypot(dx, dz);
        if (d >= ROOM_M || Math.abs(q.y - p.y) > 1.5) continue;
        // Where the teammate is: in front (+) or behind, to the right (+) or the left.
        const front = d > 0.01 ? (dx * vx + dz * vz) / d : 0,
          right = d > 0.01 ? (dx * -vz + dz * vx) / d : p.slot < q.slot ? 1 : -1;
        const pressure = (ROOM_M - d) / ROOM_M;
        push -= (Math.abs(right) < 0.15 ? (p.slot < q.slot ? 1 : -1) : Math.sign(right)) * pressure;
        // Directly in front and close: follow at their pace rather than run through them.
        if (front > 0.6 && d < 1.1) pace = Math.min(pace, Math.max(0.35, (d - 0.45) / 0.65));
      }
      m.sidestep += (Math.max(-1, Math.min(1, push)) - m.sidestep) * 0.25;
      const sx = vx - vz * m.sidestep * 0.7,
        sz = vz + vx * m.sidestep * 0.7;
      const length = Math.hypot(sx, sz) || 1;
      vx = (sx / length) * pace;
      vz = (sz / length) * pace;
    } else m.sidestep *= 0.75;
    // Holding: pre-aim the entrance this hold covers.
    const look =
      guarding && b.state === "planted"
        ? team === "police"
          ? (b.site === "A"
              ? roleOf(p) % 2
                ? P.midA
                : P.approachA
              : roleOf(p) % 2
                ? P.midB
                : P.approachB
            ).at(-1)!
          : { x: b.x, z: b.z }
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
              ? Math.atan2(-headX || -(next.x - p.x), -headZ || -(next.z - p.z))
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
          map,
        );
        const landing = simStart(launch.origin, launch.velocity);
        simTo(landing, map, type === "he" ? GRENADES.he.fuseMs / 1000 : 2.5);
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
      const P = pointsOf(state);
      teamPlan(state);
      designatedDefuser = bombDefuser(state);
      // Fresh callouts use audible footstep/shot events, not hidden movement or silent walking.
      if (now > alertUntil) alert = null;
      if (state.phase === "live")
        for (const event of state.events) {
          const e = event.slot === undefined ? null : state.players[event.slot];
          if (
            !e ||
            e.hp <= 0 ||
            teamOf(state, e) !== "terrorist" ||
            !event.audio?.position ||
            (event.type !== "step" && event.type !== "shot")
          )
            continue;
          const range = event.type === "shot" ? 45 : event.audio.soft ? 8 : 25;
          if (
            !state.players.some(
              (q) =>
                q.hp > 0 &&
                teamOf(state, q) === "police" &&
                Math.hypot(q.x - e.x, q.z - e.z) < range,
            )
          )
            continue;
          const site =
            Math.hypot(e.x - P.plant.A.x, e.z - P.plant.A.z) <
            Math.hypot(e.x - P.plant.B.x, e.z - P.plant.B.z)
              ? "A"
              : "B";
          if (Math.hypot(e.x - P.plant[site].x, e.z - P.plant[site].z) < 24) {
            alert = site;
            alertUntil = now + 4500;
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

import { ARENA, BOXES, PLAYER_RADIUS, eyeHeight } from "./map";
import { canSeeOpponent } from "./visibility";
import type { Input, MatchState } from "./protocol";

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (a: number, n: number) => Math.max(-n, Math.min(n, a));
// One approachable practice opponent. Keep movement/weapon rules unchanged;
// reduce perception, tracking and firing pressure to roughly 60% of the old skill.
const PRACTICE_SKILL = 0.6;
type Point = { x: number; z: number };
const clear = (x: number, z: number) =>
  !BOXES.some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS + 0.18 &&
      Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS + 0.18,
  );
const nodes: Point[] = [];
// Half-metre ground grid over the whole arena (the aim arena's spawn exits are 1.4 m wide);
// stairs, platforms and buildings are obstacles.
const CELL = 0.5;
const spanX = Math.floor((ARENA.width / 2 - 1) / CELL),
  spanZ = Math.floor((ARENA.depth / 2 - 1) / CELL);
for (let i = -spanX; i <= spanX; i++)
  for (let j = -spanZ; j <= spanZ; j++)
    if (clear(i * CELL, j * CELL)) nodes.push({ x: i * CELL, z: j * CELL });
const key = (x: number, z: number) => `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
const byPoint = new Map(nodes.map((p, i) => [key(p.x, p.z), i]));
const edges = nodes.map((p) =>
  [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].flatMap(([x, z]) => {
    const i = byPoint.get(key(p.x + x! * CELL, p.z + z! * CELL));
    return i === undefined ? [] : [i];
  }),
);
const nearest = (p: Point) =>
  nodes.reduce(
    (best, n, i) =>
      Math.hypot(n.x - p.x, n.z - p.z) < Math.hypot(nodes[best]!.x - p.x, nodes[best]!.z - p.z)
        ? i
        : best,
    0,
  );
/** Bounded static-grid BFS. Inflated obstacles keep limbs clear of cover. */
function path(from: Point, to: Point): Point[] {
  const start = nearest(from),
    end = nearest(to),
    queue = [start],
    prev = new Map([[start, -1]]);
  for (let i = 0; i < queue.length && !prev.has(end); i++)
    for (const next of edges[queue[i]!]!)
      if (!prev.has(next)) {
        prev.set(next, queue[i]!);
        queue.push(next);
      }
  if (!prev.has(end)) return [];
  const result = [];
  let cursor = end;
  while (cursor !== start) {
    result.push(nodes[cursor]!);
    cursor = prev.get(cursor)!;
  }
  return result.reverse();
}
/**
 * Patrol for a bot spawning east (mirrored in x for a west spawn): own courtyard lane, the
 * enemy lane and spawn exit (so a camping player is found), the enemy spawn alley, then the
 * upper (north) and lower (south) routes through their arches.
 */
export type PracticeStyle = "push" | "slow" | "lurk";
type Opening = "center" | "north" | "south";
const STYLES: readonly PracticeStyle[] = ["push", "slow", "lurk"];
const OPENINGS: readonly Opening[] = ["center", "north", "south"];
const OPENING_POINTS: Record<Opening, Point[]> = {
  center: [
    { x: 14.9, z: 2.5 },
    { x: 7, z: -0.6 },
    { x: -7, z: -0.6 },
  ],
  north: [
    { x: 14.9, z: -2.5 },
    { x: 8, z: -12.4 },
    { x: -8, z: -12.4 },
  ],
  south: [
    { x: 14.9, z: 2.5 },
    { x: 8, z: 12.4 },
    { x: -8, z: 12.4 },
  ],
};

/** One moderate difficulty. Emits ordinary inputs; never changes simulation state. */
export function createPracticeBot(random: () => number = Math.random) {
  const styles: PracticeStyle[] = [],
    openings: Opening[] = [];
  function draw<T>(bag: T[], choices: readonly T[], previous: T | null): T {
    if (!bag.length) {
      bag.push(...choices);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(random() * (i + 1)));
        [bag[i], bag[j]] = [bag[j]!, bag[i]!];
      }
      if (bag.at(-1) === previous) [bag[0], bag[bag.length - 1]] = [bag.at(-1)!, bag[0]!];
    }
    return bag.pop()!;
  }
  let style: PracticeStyle = "push",
    opening: Opening = "center";
  let itinerary: Point[] = [],
    holdUntil = 0,
    progressAt = 0,
    progress: Point = { x: 0, z: 0 };
  let round = 0,
    seq = 0,
    waypoint = 0,
    side = 1,
    route: Point[] = [],
    nextPlan = 0,
    seenAt: number | null = null,
    lastSeen: Point | null = null,
    lastSeenAt = 0,
    nextAim = 0,
    aimYaw = 0,
    aimPitch = 0,
    burstEnd = 0,
    restEnd = 0,
    lastAt = 0;
  return {
    /** Read-only diagnostic plan; no difficulty or mode selector is exposed. */
    plan: () => ({ round, style, opening, waypoints: itinerary.map((p) => ({ ...p })) }),
    input(state: MatchState, now: number): Input {
      const own = state.players.B,
        enemy = state.players.A;
      if (round !== state.round) {
        round = state.round;
        route = [];
        nextPlan = 0;
        seenAt = null;
        lastSeen = null;
        style = draw(styles, STYLES, round === 1 ? null : style);
        opening = draw(openings, OPENINGS, round === 1 ? null : opening);
        side = own.x > 0 ? 1 : -1;
        // Different initial approaches, then search both the enemy spawn and the
        // opposite flank. All legs use the same collision-inflated ground graph.
        const oppositeZ = opening === "south" ? -12.4 : 12.4;
        itinerary = [
          ...OPENING_POINTS[opening],
          { x: -14.9, z: 2.5 },
          { x: -17.2, z: -8 },
          { x: -8, z: oppositeZ },
          { x: 8, z: oppositeZ },
          { x: 7, z: -0.6 },
        ].map((p) => ({ x: p.x * side, z: p.z }));
        holdUntil = 0;
        progressAt = now;
        progress = { x: own.x, z: own.z };
        waypoint = 0;
        nextAim = 0;
        burstEnd = 0;
        restEnd = 0;
        lastAt = now;
      }
      const dt = Math.min(0.1, Math.max(0, (now - lastAt) / 1000));
      lastAt = now;
      const visible = state.phase === "live" && canSeeOpponent(state, "B");
      if (visible) {
        seenAt ??= now;
        lastSeen = { x: enemy.x, z: enemy.z };
        lastSeenAt = now;
      } else seenAt = null;
      const reacted = visible && seenAt !== null && now - seenAt >= 360 / PRACTICE_SKILL;
      if (visible && now >= nextAim) {
        // Slower tracking and wider aim error give players room to dodge.
        const dx = enemy.x - own.x,
          dz = enemy.z - own.z,
          distance = Math.hypot(dx, dz);
        aimYaw = Math.atan2(-dx, -dz) + ((random() - 0.5) * 0.085) / PRACTICE_SKILL;
        aimPitch =
          Math.atan2(
            enemy.y +
              (enemy.crouched ? 0.65 : 1.1) +
              (random() - 0.5) * 0.5 -
              (own.y + eyeHeight(own)),
            distance,
          ) +
          ((random() - 0.5) * 0.035) / PRACTICE_SKILL;
        nextAim = now + 125 / PRACTICE_SKILL;
      }
      const chasing =
        !!lastSeen &&
        now - lastSeenAt < 3000 &&
        (style === "push" || (!visible && now - lastSeenAt > (style === "lurk" ? 900 : 400)));
      if (state.phase !== "live" || Math.hypot(own.x - progress.x, own.z - progress.z) > 0.25) {
        progress = { x: own.x, z: own.z };
        progressAt = now;
      }
      const reached =
        Math.hypot(own.x - itinerary[waypoint]!.x, own.z - itinerary[waypoint]!.z) < 1.2;
      const stuck =
        state.phase === "live" && !visible && now >= holdUntil && now - progressAt > 5000;
      if ((!chasing && reached) || stuck) {
        waypoint = (waypoint + 1) % itinerary.length;
        route = [];
        nextPlan = now;
        progressAt = now;
        holdUntil =
          now +
          (stuck || style === "push" || waypoint % 2 !== 0
            ? 0
            : style === "lurk"
              ? 1400 + random() * 1200
              : 450 + random() * 650);
      }
      const patrol = itinerary[waypoint]!;
      const holding = !visible && !chasing && now < holdUntil;
      const destination = chasing ? lastSeen! : patrol;
      if (!holding && now >= nextPlan) {
        route = path(own, destination);
        nextPlan = now + 800;
      }
      while (route[0] && Math.hypot(route[0].x - own.x, route[0].z - own.z) < 0.3) route.shift();
      const next = route[0];
      let vx = next ? next.x - own.x : 0,
        vz = next ? next.z - own.z : 0;
      const length = Math.hypot(vx, vz) || 1;
      vx /= length;
      vz /= length;
      if (
        holding ||
        (reacted && now < burstEnd) ||
        (visible && style === "lurk" && Math.hypot(enemy.x - own.x, enemy.z - own.z) < 12)
      ) {
        vx = 0;
        vz = 0;
      }
      const goalYaw = visible ? aimYaw : next ? Math.atan2(-vx, -vz) : own.yaw;
      const yaw = wrap(own.yaw + clamp(wrap(goalYaw - own.yaw), 3.2 * dt));
      const pitch = own.pitch + clamp((visible ? aimPitch : 0) - own.pitch, 2 * dt);
      if (reacted && now >= restEnd) {
        burstEnd = now + 260 + random() * 160;
        restEnd = burstEnd + (320 + random() * 300) / PRACTICE_SKILL;
      }
      return {
        v: 1,
        type: "input",
        combatVersion: 2,
        seq: ++seq,
        forward: clamp(-Math.sin(yaw) * vx - Math.cos(yaw) * vz, 1),
        strafe: clamp(Math.cos(yaw) * vx - Math.sin(yaw) * vz, 1),
        yaw,
        pitch,
        weapon: "rifle",
        fire: reacted && now < burstEnd && Math.abs(wrap(aimYaw - yaw)) < 0.16,
        reload: own.ammo === 0 || (!visible && own.ammo < 10),
        jump: false,
        sprint: !visible && !holding && style === "push",
        walk:
          !visible &&
          !holding &&
          style !== "push" &&
          Math.hypot(own.x - destination.x, own.z - destination.z) < 4,
        crouch: false,
      };
    },
  };
}

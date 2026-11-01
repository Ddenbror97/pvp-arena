import { ARENA, BOXES, PLAYER_RADIUS, eyeHeight } from "./map";
import { canSeeOpponent } from "./visibility";
import type { Input, MatchState } from "./protocol";

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (a: number, n: number) => Math.max(-n, Math.min(n, a));
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
const PATROL = [
  { x: 7, z: -0.6 },
  { x: -7, z: -0.6 },
  { x: -14.9, z: 2.5 },
  { x: -17.2, z: -8 },
  { x: -8, z: -12.4 },
  { x: 8, z: -12.4 },
  { x: 8, z: 12.4 },
  { x: -8, z: 12.4 },
];

/** One moderate difficulty. Emits ordinary inputs; never changes simulation state. */
export function createPracticeBot(random: () => number = Math.random) {
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
    input(state: MatchState, now: number): Input {
      const own = state.players.B,
        enemy = state.players.A;
      if (round !== state.round) {
        round = state.round;
        route = [];
        nextPlan = 0;
        seenAt = null;
        lastSeen = null;
        // Head first for the courtyard lane on this spawn's side.
        side = own.x > 0 ? 1 : -1;
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
      const reacted = visible && seenAt !== null && now - seenAt >= 360;
      if (visible && now >= nextAim) {
        // Sample the visible pose at 8 Hz with imperfect body-level aim.
        const dx = enemy.x - own.x,
          dz = enemy.z - own.z,
          distance = Math.hypot(dx, dz);
        aimYaw = Math.atan2(-dx, -dz) + (random() - 0.5) * 0.085;
        aimPitch =
          Math.atan2(
            enemy.y +
              (enemy.crouched ? 0.65 : 1.1) +
              (random() - 0.5) * 0.5 -
              (own.y + eyeHeight(own)),
            distance,
          ) +
          (random() - 0.5) * 0.035;
        nextAim = now + 125;
      }
      const patrol = { x: PATROL[waypoint]!.x * side, z: PATROL[waypoint]!.z };
      const chasing = !!lastSeen && now - lastSeenAt < 3000;
      const destination = chasing ? lastSeen! : patrol;
      if (!chasing && Math.hypot(own.x - patrol.x, own.z - patrol.z) < 1.2)
        waypoint = (waypoint + 1) % PATROL.length;
      if (now >= nextPlan) {
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
      if (reacted && now < burstEnd) {
        vx = 0;
        vz = 0;
      }
      const goalYaw = visible ? aimYaw : next ? Math.atan2(-vx, -vz) : own.yaw;
      const yaw = wrap(own.yaw + clamp(wrap(goalYaw - own.yaw), 3.2 * dt));
      const pitch = own.pitch + clamp((visible ? aimPitch : 0) - own.pitch, 2 * dt);
      if (reacted && now >= restEnd) {
        burstEnd = now + 260 + random() * 160;
        restEnd = burstEnd + 320 + random() * 300;
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
        sprint: !visible,
        crouch: false,
      };
    },
  };
}

import { BOXES, PLAYER_RADIUS, eyeHeight } from "./map";
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
for (let x = -10; x <= 10; x++)
  for (let z = -14; z <= 14; z++) if (clear(x, z)) nodes.push({ x, z });
const byPoint = new Map(nodes.map((p, i) => [`${p.x},${p.z}`, i]));
const edges = nodes.map((p) =>
  [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].flatMap(([x, z]) => {
    const i = byPoint.get(`${p.x + x!},${p.z + z!}`);
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
const PATROL = [
  { x: 9, z: 8 },
  { x: 9, z: -8 },
  { x: -9, z: -8 },
  { x: -9, z: 8 },
];

/** One moderate difficulty. Emits ordinary inputs; never changes simulation state. */
export function createPracticeBot(random: () => number = Math.random) {
  let round = 0,
    seq = 0,
    waypoint = 0,
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
        waypoint = own.z > 0 ? 1 : 0;
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
      const destination = lastSeen && now - lastSeenAt < 3000 ? lastSeen : PATROL[waypoint]!;
      if (
        Math.hypot(own.x - destination.x, own.z - destination.z) < 1.2 &&
        destination === PATROL[waypoint]
      )
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
        sprint: !visible,
        crouch: false,
      };
    },
  };
}

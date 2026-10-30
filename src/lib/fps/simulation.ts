import { ARENA, BOXES, EYE_HEIGHT, PLAYER_RADIUS, SPAWNS, eyeHeight } from "./map";
import { playerVolumes } from "./player-volumes";
import { rayBox, traceWorld, type Vector } from "./collision";
import { spreadScale } from "./handling";
import {
  validateInput,
  type Input,
  type MatchState,
  type Player,
  type Seat,
  type Weapon,
} from "./protocol";
export { validateInput } from "./protocol";
export type { Input, MatchState, Player, Seat, Weapon } from "./protocol";

export const TICK_MS = 33.333;
export const SNAPSHOT_MS = 50;
export const COUNTDOWN_MS = 3000;
export const ROUND_MS = 60000;
export const ROUND_END_MS = 2500;
export const MAX_DRAWS = 3;
export const MOVE_SPEED = 5;
export const WEAPONS = {
  rifle: {
    damage: 34,
    headshotMultiplier: 3,
    magazine: 30,
    reserve: 90,
    fireIntervalMs: 120,
    reloadMs: 1800,
    recoil: 0.004,
  },
  pistol: {
    damage: 25,
    headshotMultiplier: 4,
    magazine: 12,
    reserve: 48,
    fireIntervalMs: 260,
    reloadMs: 1200,
    recoil: 0.002,
  },
} as const;
const SEATS: readonly Seat[] = ["A", "B"];
const other = (seat: Seat): Seat => (seat === "A" ? "B" : "A");

function player(id: string, seat: Seat): Player {
  return {
    id,
    ...SPAWNS[seat],
    y: 0,
    pitch: 0,
    hp: 100,
    ammo: WEAPONS.rifle.magazine,
    reserve: WEAPONS.rifle.reserve,
    weapon: "rifle",
    reloadUntil: 0,
    lastShotAt: -1e12,
    lastSeq: -1,
    kills: 0,
    headshots: 0,
  };
}

export function createMatch(ids: { A: string; B: string }, bestOf: 5 | 9, now: number): MatchState {
  if (!Number.isFinite(now) || (bestOf !== 5 && bestOf !== 9))
    throw new Error("Invalid match configuration");
  return {
    v: 1,
    phase: "waiting",
    players: { A: player(ids.A, "A"), B: player(ids.B, "B") },
    score: { A: 0, B: 0 },
    bestOf,
    round: 1,
    phaseEndsAt: 0,
    winner: null,
    tick: 0,
    events: [],
    server: { lastStepAt: now, draws: 0 },
  };
}

export function startMatch(state: MatchState, now: number): MatchState {
  if (state.phase !== "waiting" || !Number.isFinite(now)) return state;
  state.server = { lastStepAt: now, draws: 0 };
  state.phase = "countdown";
  state.phaseEndsAt = now + COUNTDOWN_MS;
  state.events = [{ type: "countdown", text: "Match starts in 3 seconds" }];
  return state;
}

function finishRound(state: MatchState, winner: Seat | null, now: number): void {
  if (winner) state.score[winner]++;
  else if (state.server) state.server.draws++;
  state.events.push(
    winner
      ? { type: "round-end", seat: winner, text: `${winner} wins round ${state.round}` }
      : { type: "draw", text: "Round drawn" },
  );
  if (winner && state.score[winner] >= Math.floor(state.bestOf / 2) + 1) {
    state.phase = "completed";
    state.winner = winner;
    state.phaseEndsAt = 0;
  } else if ((state.server?.draws ?? 0) >= MAX_DRAWS) {
    state.phase = "cancelled";
    state.phaseEndsAt = 0;
    state.events.push({ type: "cancelled", text: "Draw limit reached" });
  } else {
    state.phase = "round-end";
    state.phaseEndsAt = now + ROUND_END_MS;
  }
}

function blocked(x: number, y: number, z: number, crouched = false): boolean {
  if (
    Math.abs(x) > ARENA.width / 2 - PLAYER_RADIUS ||
    Math.abs(z) > ARENA.depth / 2 - PLAYER_RADIUS
  )
    return true;
  return BOXES.some(
    (b) =>
      y < b.y + b.h / 2 - 1e-7 &&
      y + eyeHeight({ crouched }) + 0.2 > b.y - b.h / 2 &&
      Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS - 1e-7 &&
      Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS - 1e-7,
  );
}

type Pose = Vector & { crouched?: boolean };
/** dt is milliseconds and capped at one tick; callers predict once per fixed tick. */
export function predictMovement(p: Player, input: Input | null, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const seconds = Math.min(dt, TICK_MS) / 1000;
  if (input) {
    p.crouched = !!input.crouch || blocked(p.x, p.y, p.z, false);
    const supported =
      p.y === 0 ||
      BOXES.some(
        (b) =>
          Math.abs(p.y - (b.y + b.h / 2)) < 1e-6 &&
          Math.abs(p.x - b.x) < b.w / 2 + PLAYER_RADIUS &&
          Math.abs(p.z - b.z) < b.d / 2 + PLAYER_RADIUS,
      );
    if (input.jump && supported && (p.velocityY ?? 0) === 0) p.velocityY = 5;
    const length = Math.max(1, Math.hypot(input.forward, input.strafe));
    const speed = (MOVE_SPEED * (p.crouched ? 0.48 : input.sprint ? 1.5 : 1) * seconds) / length;
    const dx = (-Math.sin(input.yaw) * input.forward + Math.cos(input.yaw) * input.strafe) * speed;
    const dz = (-Math.cos(input.yaw) * input.forward - Math.sin(input.yaw) * input.strafe) * speed;
    for (const [axis, delta, other] of [
      ["x", dx, "z"],
      ["z", dz, "x"],
    ] as const) {
      let next = Math.max(
        -(axis === "x" ? ARENA.width : ARENA.depth) / 2 + PLAYER_RADIUS,
        Math.min((axis === "x" ? ARENA.width : ARENA.depth) / 2 - PLAYER_RADIUS, p[axis] + delta),
      );
      for (const b of BOXES) {
        if (
          p.y >= b.y + b.h / 2 ||
          p.y + eyeHeight(p) + 0.2 <= b.y - b.h / 2 ||
          Math.abs(p[other] - b[other]) >= (other === "x" ? b.w : b.d) / 2 + PLAYER_RADIUS
        )
          continue;
        const lo = b[axis] - (axis === "x" ? b.w : b.d) / 2 - PLAYER_RADIUS,
          hi = b[axis] + (axis === "x" ? b.w : b.d) / 2 + PLAYER_RADIUS;
        if (delta > 0 && p[axis] <= lo) next = Math.min(next, lo);
        if (delta < 0 && p[axis] >= hi) next = Math.max(next, hi);
      }
      p[axis] = next;
    }
  }
  const previousY = p.y;
  p.velocityY = (p.velocityY ?? 0) - 14 * seconds;
  let nextY = Math.max(0, p.y + p.velocityY * seconds);
  if (p.velocityY <= 0)
    for (const b of BOXES) {
      const top = b.y + b.h / 2;
      if (
        previousY >= top - 1e-6 &&
        nextY <= top &&
        Math.abs(p.x - b.x) < b.w / 2 + PLAYER_RADIUS &&
        Math.abs(p.z - b.z) < b.d / 2 + PLAYER_RADIUS
      ) {
        nextY = Math.max(nextY, top);
        p.velocityY = 0;
      }
    }
  p.y = nextY;
  if (blocked(p.x, p.y, p.z, !!p.crouched)) {
    p.y = previousY;
    p.velocityY = 0;
  }
  if (p.y === 0) p.velocityY = 0;
}

function shoot(
  state: MatchState,
  seat: Seat,
  now: number,
  positions: Record<Seat, Pose>,
  input: Input,
): void {
  const p = state.players[seat],
    target = state.players[other(seat)],
    stats = WEAPONS[p.weapon];
  const start = positions[seat],
    targetStart = positions[other(seat)];
  if (p.reloadUntil || !p.ammo || now - p.lastShotAt < stats.fireIntervalMs) return;
  p.sprayCount = now - p.lastShotAt > 300 ? 1 : (p.sprayCount ?? 0) + 1;
  const spread =
    stats.recoil *
    spreadScale(
      p.sprayCount,
      Math.hypot(input.forward, input.strafe) > 0.1,
      (p.velocityY ?? 0) !== 0,
    ) *
    (p.crouched ? 0.8 : 1);
  p.ammo--;
  p.lastShotAt = now;
  // Integer hash gives reproducible spread without random state or client-supplied seeds.
  const hash = (Math.imul(p.lastSeq + 1, 1664525) + Math.imul(state.tick, 1013904223)) >>> 0;
  const yaw = p.yaw + ((hash % 1001) / 500 - 1) * spread;
  const pitch = p.pitch + (((hash >>> 10) % 1001) / 500 - 1) * spread;
  const direction = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
  const origin = { x: start.x, y: start.y + eyeHeight(start), z: start.z };
  const worldHit = traceWorld(origin, direction),
    wall = worldHit?.distance ?? Infinity;
  const volumes = playerVolumes(targetStart);
  const head = rayBox(origin, direction, volumes.head.center, volumes.head.size);
  const body = rayBox(origin, direction, volumes.body.center, volumes.body.size);
  state.events.push({ type: "shot", seat, text: `${p.weapon} fired` });
  if (Math.min(head, body) >= wall || !Number.isFinite(Math.min(head, body))) {
    if (worldHit)
      state.events.push({
        type: "impact",
        seat,
        text: `${worldHit.surface} impact`,
        impact: worldHit,
      });
    return;
  }
  const headshot = head <= body;
  target.hp = Math.max(0, target.hp - stats.damage * (headshot ? stats.headshotMultiplier : 1));
  state.events.push({
    type: headshot ? "headshot" : "hit",
    seat,
    text: headshot ? "Headshot" : "Body hit",
  });
  if (target.hp === 0) {
    p.kills++;
    if (headshot) p.headshots++;
  }
}

/** Call from the trusted server scheduler. dt is intentionally ignored (milliseconds). */
export function stepMatch(
  state: MatchState,
  inputs: Partial<Record<Seat, Input>>,
  now: number,
  _dt: number,
): MatchState {
  if (
    !Number.isFinite(now) ||
    state.phase === "waiting" ||
    state.phase === "completed" ||
    state.phase === "cancelled"
  )
    return state;
  const server = state.server ?? (state.server = { lastStepAt: now - TICK_MS, draws: 0 });
  if (now - server.lastStepAt < TICK_MS - 1e-6) return state;
  server.lastStepAt = now;
  state.tick++;
  state.events = [];
  if (state.phase === "round-end" && now >= state.phaseEndsAt) {
    state.round++;
    for (const seat of SEATS) {
      const old = state.players[seat];
      state.players[seat] = {
        ...player(old.id, state.round % 2 ? seat : other(seat)),
        kills: old.kills,
        headshots: old.headshots,
        lastSeq: old.lastSeq,
      };
    }
    state.phase = "countdown";
    state.phaseEndsAt = now + COUNTDOWN_MS;
    return state;
  }
  if (state.phase === "countdown" && now >= state.phaseEndsAt) {
    state.phase = "live";
    state.phaseEndsAt = now + ROUND_MS;
  }
  if (state.phase !== "live") return state;
  if (now >= state.phaseEndsAt) {
    const a = state.players.A.hp,
      b = state.players.B.hp;
    finishRound(state, a === b ? null : a > b ? "A" : "B", now);
    return state;
  }
  const accepted: Partial<Record<Seat, Input>> = {};
  // Capture tick-start positions before either seat moves (same temporal basis).
  const positions: Record<Seat, Pose> = {
    A: {
      x: state.players.A.x,
      y: state.players.A.y,
      z: state.players.A.z,
      crouched: !!state.players.A.crouched,
    },
    B: {
      x: state.players.B.x,
      y: state.players.B.y,
      z: state.players.B.z,
      crouched: !!state.players.B.crouched,
    },
  };
  for (const seat of SEATS) {
    const p = state.players[seat],
      input = validateInput(inputs[seat]);
    if (p.reloadUntil && now >= p.reloadUntil) {
      const amount = Math.min(WEAPONS[p.weapon].magazine - p.ammo, p.reserve);
      p.ammo += amount;
      p.reserve -= amount;
      p.reloadUntil = 0;
    }
    if (input && input.seq > p.lastSeq) {
      accepted[seat] = input;
      p.lastSeq = input.seq;
      p.yaw = input.yaw;
      p.pitch = input.pitch;
      // A single shared ammo pool prevents weapon toggling from minting ammunition.
      if (p.weapon !== input.weapon && !p.reloadUntil) {
        p.weapon = input.weapon;
        const excess = Math.max(0, p.ammo - WEAPONS[p.weapon].magazine);
        p.ammo -= excess;
        p.reserve += excess;
      }
      if (input.reload && !p.reloadUntil && p.reserve > 0 && p.ammo < WEAPONS[p.weapon].magazine)
        p.reloadUntil = now + WEAPONS[p.weapon].reloadMs;
      predictMovement(p, input, TICK_MS);
    } else {
      predictMovement(p, null, TICK_MS);
    }
  }
  // Both shots use tick-start positions, even if the first is lethal.
  // Health changes cannot suppress the opponent's shot; adjudicate only afterward.
  for (const seat of SEATS) {
    const input = accepted[seat];
    if (input?.fire && (!input.sprint || state.players[seat].crouched))
      shoot(state, seat, now, positions, input);
  }
  if (state.players.A.hp <= 0 || state.players.B.hp <= 0) {
    finishRound(
      state,
      state.players.A.hp <= 0 && state.players.B.hp <= 0
        ? null
        : state.players.A.hp > 0
          ? "A"
          : "B",
      now,
    );
  }
  return state;
}

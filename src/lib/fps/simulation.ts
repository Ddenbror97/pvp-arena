import { ARENA, BOXES, PLAYER_RADIUS, SPAWNS, STEP_HEIGHT, eyeHeight } from "./map";
import {
  COMBAT_VERSION,
  HIT_DAMAGE,
  applyVestDamage,
  recoverCombatRecoil,
  advanceCombatRecoil,
  combatSpread,
  type HitZone,
} from "./combat";
import { combatVolumes, playerVolumes } from "./player-volumes";
import { rayBox, traceWorld, type Vector } from "./collision";
import { spreadScale } from "./handling";
import { validateInput, type Input, type MatchState, type Player, type Seat } from "./protocol";
export { validateInput } from "./protocol";
export type { Input, MatchState, Player, Seat, Weapon } from "./protocol";

export const TICK_MS = 33.333;
export const COUNTDOWN_MS = 3000;
export const ROUND_MS = 60000;
// Let the elimination register before the three-second winner presentation.
export const ROUND_END_MS = 3800;
export const MAX_DRAWS = 3;
export const MOVE_SPEED = 5;
export const WALK_SPEED_SCALE = 0.45;
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
const emptyRoundStats = () => ({
  A: { shots: 0, hits: 0, headHits: 0, damage: 0, health: 100 },
  B: { shots: 0, hits: 0, headHits: 0, damage: 0, health: 100 },
});

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

export function createMatch(
  ids: { A: string; B: string },
  bestOf: 5 | 9 | 13,
  now: number,
  combatVersion: 1 | 2 = COMBAT_VERSION,
): MatchState {
  if (!Number.isFinite(now) || ![5, 9, 13].includes(bestOf))
    throw new Error("Invalid match configuration");
  return {
    v: 1,
    combatVersion,
    ...(combatVersion === COMBAT_VERSION ? { armorVersion: 1 as const } : {}),
    phase: "waiting",
    players: {
      A: { ...player(ids.A, "A"), ...(combatVersion === COMBAT_VERSION ? { armor: 100 } : {}) },
      B: { ...player(ids.B, "B"), ...(combatVersion === COMBAT_VERSION ? { armor: 100 } : {}) },
    },
    score: { A: 0, B: 0 },
    bestOf,
    round: 1,
    phaseEndsAt: 0,
    winner: null,
    tick: 0,
    events: [],
    server: {
      lastStepAt: now,
      draws: 0,
      ...(combatVersion === COMBAT_VERSION
        ? { spreadSeed: crypto.getRandomValues(new Uint32Array(1))[0]! }
        : {}),
    },
  };
}

export function startMatch(state: MatchState, now: number): MatchState {
  if (state.phase !== "waiting" || !Number.isFinite(now)) return state;
  state.server = { ...state.server, lastStepAt: now, draws: 0 };
  state.phase = "countdown";
  state.phaseEndsAt = now + COUNTDOWN_MS;
  state.events = [{ type: "countdown", text: "Match starts in 3 seconds" }];
  return state;
}

function finishRound(state: MatchState, winner: Seat | null, now: number): void {
  const counters = state.server?.roundStats ?? emptyRoundStats();
  state.lastRound = {
    round: state.round,
    winner,
    players: {
      A: { ...counters.A, health: state.players.A.hp },
      B: { ...counters.B, health: state.players.B.hp },
    },
  };
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
// The cosmetic camera uses exactly the same occupancy test as movement.
export { blocked as isMovementBlocked };
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
    // Stairs are stepped onto only from the ground or a support, never mid-jump (a jump plus a
    // step would otherwise clear 1.2 m cover).
    const grounded = supported && (p.velocityY ?? 0) === 0;
    if (input.jump && grounded) p.velocityY = 5;
    const length = Math.max(1, Math.hypot(input.forward, input.strafe));
    const speed =
      (MOVE_SPEED *
        (input.walk ? WALK_SPEED_SCALE : p.crouched ? 0.48 : input.sprint ? 1.5 : 1) *
        seconds) /
      length;
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
        const top = b.y + b.h / 2;
        // A riser no taller than STEP_HEIGHT (stairs) is walked onto instead of blocking.
        if (grounded && top - p.y <= STEP_HEIGHT + 1e-9) continue;
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
    // Step up onto the highest riser now under the feet (stairs), if there is head room.
    let stepTop = p.y;
    for (const b of BOXES) {
      const top = b.y + b.h / 2;
      if (
        top > stepTop &&
        top - p.y <= STEP_HEIGHT + 1e-9 &&
        Math.abs(p.x - b.x) < b.w / 2 + PLAYER_RADIUS - 1e-7 &&
        Math.abs(p.z - b.z) < b.d / 2 + PLAYER_RADIUS - 1e-7
      )
        stepTop = top;
    }
    if (grounded && stepTop > p.y && !blocked(p.x, stepTop, p.z, !!p.crouched)) {
      p.y = stepTop;
      p.velocityY = 0;
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
  historicalTarget?: Pose,
): void {
  const p = state.players[seat],
    target = state.players[other(seat)],
    stats = WEAPONS[p.weapon];
  const start = positions[seat],
    targetStart = historicalTarget ?? positions[other(seat)];
  const modern = state.combatVersion === COMBAT_VERSION;
  if (
    p.reloadUntil ||
    !p.ammo ||
    now - p.lastShotAt < (modern && p.weapon === "rifle" ? 100 : stats.fireIntervalMs)
  )
    return;
  if (!modern) p.sprayCount = now - p.lastShotAt > 300 ? 1 : (p.sprayCount ?? 0) + 1;
  const spread = modern
    ? (p.weapon === "rifle" ? 0.0015 : 0.0025) *
      combatSpread(
        (p.sprayCount ?? 0) + 1,
        input.combatOnly ? !!p.moving : Math.hypot(input.forward, input.strafe) > 0.1,
        (p.velocityY ?? 0) !== 0,
        !!p.crouched,
      )
    : stats.recoil *
      spreadScale(
        p.sprayCount ?? 1,
        input.combatOnly ? !!p.moving : Math.hypot(input.forward, input.strafe) > 0.1,
        (p.velocityY ?? 0) !== 0,
      ) *
      (p.crouched ? 0.8 : 1);
  p.ammo--;
  const counters = state.server ? (state.server.roundStats ??= emptyRoundStats())[seat] : null;
  if (counters) counters.shots++;
  p.lastShotAt = now;
  // Integer hash gives reproducible spread without random state or client-supplied seeds.
  const hash =
    modern && state.server
      ? (state.server.spreadSeed =
          (Math.imul(state.server.spreadSeed ?? 1, 1664525) + 1013904223) >>> 0)
      : (Math.imul(p.lastSeq + 1, 1664525) + Math.imul(state.tick, 1013904223)) >>> 0;
  const yaw = input.yaw + (modern ? (p.recoilYaw ?? 0) : 0) + ((hash % 1001) / 500 - 1) * spread;
  const pitch =
    input.pitch + (modern ? (p.recoilPitch ?? 0) : 0) + (((hash >>> 10) % 1001) / 500 - 1) * spread;
  const direction = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
  const origin = { x: start.x, y: start.y + eyeHeight(start), z: start.z };
  const worldHit = traceWorld(origin, direction),
    wall = worldHit?.distance ?? Infinity;
  const volumes = modern
    ? combatVolumes(targetStart)
    : { head: playerVolumes(targetStart).head, chest: playerVolumes(targetStart).body };
  const hits = Object.entries(volumes)
    .map(([zone, volume]) => ({
      zone: zone as HitZone,
      distance: rayBox(origin, direction, volume.center, volume.size),
    }))
    .sort((a, b) => a.distance - b.distance);
  const contact = hits[0]!;
  state.events.push({
    type: "shot",
    shotSeq: input.seq,
    seat,
    text: p.weapon + " fired",
    weapon: p.weapon,
    audio: { kind: "shot", position: origin },
  });
  if (modern) advanceCombatRecoil(p);
  if (contact.distance >= wall || !Number.isFinite(contact.distance)) {
    if (worldHit)
      state.events.push({
        type: "impact",
        seat,
        text: worldHit.surface + " impact",
        impact: worldHit,
      });
    return;
  }
  const headshot = contact.zone === "head";
  const damage = modern
    ? state.armorVersion === 1
      ? applyVestDamage(target, p.weapon, contact.zone)
      : HIT_DAMAGE[p.weapon][contact.zone]
    : stats.damage * (headshot ? stats.headshotMultiplier : 1);
  if (counters) {
    counters.hits++;
    counters.headHits += Number(headshot);
    counters.damage += Math.min(target.hp, damage);
  }
  target.hp = Math.max(0, target.hp - damage);
  const point = {
    x: origin.x + direction.x * contact.distance,
    y: origin.y + direction.y * contact.distance,
    z: origin.z + direction.z * contact.distance,
  };
  const splatter =
    traceWorld(
      {
        x: point.x + direction.x * 0.015,
        y: point.y + direction.y * 0.015,
        z: point.z + direction.z * 0.015,
      },
      direction,
      3.5,
    ) ?? traceWorld({ x: point.x, y: point.y + 0.02, z: point.z }, { x: 0, y: -1, z: 0 }, 2);
  state.events.push({
    type: headshot ? "headshot" : "hit",
    seat,
    text: headshot ? "Headshot" : contact.zone[0]!.toUpperCase() + contact.zone.slice(1) + " hit",
    hit: {
      victim: other(seat),
      zone: contact.zone,
      damage,
      point,
      direction,
      ...(splatter ? { splatter } : {}),
    },
  });
  if (target.hp === 0) {
    p.kills++;
    if (headshot) p.headshots++;
  }
}

/** Call from the trusted server scheduler. dt is intentionally ignored (milliseconds). */
/** Commands a player may be behind real time before catch-up stops (≈100 ms). */
export const MAX_COMMAND_CREDIT = 3;
/**
 * Bounded command catch-up (Source-style usercmd budget). Applies one queued movement
 * command for a seat before the regular step, so a backlog formed by a network burst or a
 * slow authorization read drains instead of adding permanent delay. The caller enforces
 * the time budget: a seat earns one credit per tick (capped at MAX_COMMAND_CREDIT) and
 * every applied command spends one, so average movement never exceeds real time.
 * A repeated rifle hold may fold only when a newer authorized hold remains for the
 * normal combat step. Tap/release edges, reloads and weapon changes remain barriers.
 * Returns false when the command is not eligible.
 */
export function applyQueuedMovement(
  state: MatchState,
  seat: Seat,
  raw: Input,
  nextRaw?: Input,
): boolean {
  if (state.phase !== "live") return false;
  const input = validateInput(raw),
    p = state.players[seat];
  if (!input || input.combatOnly || input.seq <= p.lastSeq || p.hp <= 0) return false;
  if (input.reload || input.weapon !== p.weapon) return false;
  if (input.fire) {
    const next = validateInput(nextRaw);
    // A continuous automatic-rifle hold is still represented by the next command.
    // Only the normal combat tick may fire; never fold a tap/release, reload,
    // weapon change, or semi-automatic trigger edge into movement catch-up.
    if (
      state.combatVersion !== COMBAT_VERSION ||
      input.weapon !== "rifle" ||
      !next ||
      next.combatOnly ||
      next.seq <= input.seq ||
      !next.fire ||
      next.reload ||
      next.weapon !== "rifle"
    )
      return false;
  }
  p.lastSeq = input.seq;
  p.yaw = input.yaw;
  p.pitch = input.pitch;
  p.triggerHeld = input.fire;
  p.moving = Math.hypot(input.forward, input.strafe) > 0.1;
  p.sprinting = input.sprint;
  const before = { x: p.x, z: p.z, y: p.y };
  predictMovement(p, input, TICK_MS);
  // Same footstep accounting as stepMatch: Shift-walking stays silent.
  if (input.walk) p.stepDistance = 0;
  else if (p.y === before.y && !(p.velocityY ?? 0))
    p.stepDistance = (p.stepDistance ?? 0) + Math.hypot(p.x - before.x, p.z - before.z);
  return true;
}

export function stepMatch(
  state: MatchState,
  inputs: Partial<Record<Seat, Input>>,
  now: number,
  _dt: number,
  historicalTargets?: Partial<Record<Seat, Pose>>,
  triggers: Partial<Record<Seat, Input>> = {},
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
        ...(state.armorVersion === 1 ? { armor: 100 } : {}),
        kills: old.kills,
        headshots: old.headshots,
        lastSeq: old.lastSeq,
      };
    }
    server.roundStats = emptyRoundStats();
    state.phase = "live";
    state.phaseEndsAt = now + ROUND_MS;
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
  const combatInputs: Partial<Record<Seat, Input>> = {};
  for (const seat of SEATS) {
    const action = validateInput(triggers[seat]),
      p = state.players[seat];
    if (action?.combatOnly && action.seq > p.lastSeq && action.weapon === p.weapon && p.hp > 0)
      combatInputs[seat] = action;
  }
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
      candidate = validateInput(inputs[seat]),
      input = candidate?.combatOnly ? null : candidate;
    if (state.combatVersion === COMBAT_VERSION) recoverCombatRecoil(p, now);
    if (p.reloadUntil && now >= p.reloadUntil) {
      const amount = Math.min(WEAPONS[p.weapon].magazine - p.ammo, p.reserve);
      p.ammo += amount;
      p.reserve -= amount;
      p.reloadUntil = 0;
    }
    if (input && input.seq > p.lastSeq) {
      accepted[seat] = input;
      p.moving = Math.hypot(input.forward, input.strafe) > 0.1;
      p.sprinting = input.sprint;
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
      const before = { x: p.x, y: p.y, z: p.z };
      predictMovement(p, input, TICK_MS);
      if (input.walk) p.stepDistance = 0;
      if (
        state.combatVersion === COMBAT_VERSION &&
        !input.walk &&
        p.hp > 0 &&
        p.y === before.y &&
        !(p.velocityY ?? 0)
      ) {
        const distance = Math.hypot(p.x - before.x, p.z - before.z);
        p.stepDistance = (p.stepDistance ?? 0) + distance;
        const stride = p.crouched ? 1.25 : input.sprint ? 1.9 : 1.6;
        if (p.stepDistance >= stride) {
          p.stepDistance -= stride;
          const floor = traceWorld({ x: p.x, y: p.y + 0.15, z: p.z }, { x: 0, y: -1, z: 0 }, 0.4);
          state.events.push({
            type: "step",
            seat,
            text: "Footstep",
            audio: {
              kind: "step",
              position: { x: p.x, y: p.y, z: p.z },
              surface: floor?.surface ?? "concrete",
              soft: !!p.crouched,
            },
          });
        }
      }
    } else {
      predictMovement(p, null, TICK_MS);
    }
  }
  // Both shots use tick-start positions, even if the first is lethal.
  // Health changes cannot suppress the opponent's shot; adjudicate only afterward.
  for (const seat of SEATS) {
    const input = combatInputs[seat] ?? accepted[seat];
    const p = state.players[seat];
    if (combatInputs[seat]) p.lastSeq = Math.max(p.lastSeq, combatInputs[seat]!.seq);
    if (
      input?.fire &&
      (!input.combatOnly || input.weapon === p.weapon) &&
      (!(input.combatOnly ? p.sprinting : input.sprint) || p.crouched) &&
      (state.combatVersion !== COMBAT_VERSION || p.weapon === "rifle" || !p.triggerHeld)
    )
      shoot(state, seat, now, positions, input, historicalTargets?.[seat]);
    if (input) p.triggerHeld = accepted[seat]?.fire ?? input.fire;
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

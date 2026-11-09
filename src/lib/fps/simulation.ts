import { footstepSurface } from "./footstep-surfaces";
import { PLAYER_RADIUS, STEP_HEIGHT, EYE_HEIGHT, CROUCH_EYE_HEIGHT, eyeHeight } from "./map";
import { DEFAULT_MAP, getMap, mapOf, type GameMap } from "./maps/registry";
import { spawnSide, halftimeRound } from "./sides";
import {
  COMBAT_VERSION,
  HIT_DAMAGE,
  KNIFE,
  applyVestDamage,
  isBackstab,
  knifeDamage,
  recoverCombatRecoil,
  advanceCombatRecoil,
  combatSpread,
  type HitZone,
} from "./combat";
import { combatVolumes, playerVolumes } from "./player-volumes";
import { rayBox, traceWorld, type Vector } from "./collision";
import { spreadScale } from "./handling";
import {
  validateInput,
  type Input,
  type KnifeAttack,
  type MatchState,
  type Player,
  type Seat,
} from "./protocol";
import {
  AWP,
  awpDamage,
  awpSpeedFraction,
  awpSpread,
  MP5,
  mp5ShotAt,
  mp5Spread,
  primaryOf,
  vestDamage,
  scopeSettled,
  updateScope,
  weaponMoveScale,
  type Primary,
} from "./primary";
import {
  applyPurchase,
  applySidearmPurchase,
  buyWindowOpen,
  type BuyItem,
  type BuyWindow,
} from "./buy";
import { DEAGLE, deagleSpread, giveDeagle } from "./sidearm";
import { fullInventory } from "./grenades/rules";
import { heRawDamage, heVestDamage } from "./grenades/effects";
import {
  burnStep,
  clearGrenadeHandling,
  emptyGrenadeWorld,
  equipGrenade,
  grenadeSwitchLocked,
  launchGrenade,
  publicGrenadeWorld,
  stepGrenadeHandling,
  stepGrenadeWorld,
} from "./grenades/world";
export { validateInput } from "./protocol";
export type { Input, MatchState, Player } from "./protocol";

export const TICK_MS = 33.333;
export const COUNTDOWN_MS = 3000;
export const ROUND_MS = 60000;
// Let the elimination register before the three-second winner presentation.
export const ROUND_END_MS = 3800;
export const HALFTIME_MS = 5000;
export const MAX_DRAWS = 3;
export const MOVE_SPEED = 5;
export const WALK_SPEED_SCALE = 0.45;
/** Original takeoff impulse: preserve the established jump height and airtime. */
export const JUMP_SPEED = 5;
export const GRAVITY = 14;
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
} as const;
export { KNIFE } from "./combat";
const SEATS: readonly Seat[] = ["A", "B"];
const other = (seat: Seat): Seat => (seat === "A" ? "B" : "A");
const emptyRoundStats = () => ({
  A: { shots: 0, hits: 0, headHits: 0, damage: 0, health: 100 },
  B: { shots: 0, hits: 0, headHits: 0, damage: 0, health: 100 },
});

/** Magazine, reserve and reload time of the primary a player holds. */
export function primaryStats(p: Pick<Player, "primary">) {
  const primary = primaryOf(p);
  return primary === "awp"
    ? { magazine: AWP.magazine, reserve: AWP.reserve, reloadMs: AWP.reloadMs }
    : primary === "mp5"
      ? { magazine: MP5.magazine, reserve: MP5.reserve, reloadMs: MP5.reloadMs }
      : WEAPONS.rifle;
}

/**
 * The drawn gun's magazine, reserve and reload (the sidearm keeps its own), for reload and
 * firing: `ammo`/`reserve` are read and written through `take`/`fill`.
 */
export function drawnGun(
  p: Pick<
    Player,
    "weapon" | "primary" | "ammo" | "reserve" | "sidearm" | "sidearmAmmo" | "sidearmReserve"
  >,
) {
  if (p.weapon === "sidearm" && p.sidearm) {
    return {
      magazine: DEAGLE.magazine,
      reloadMs: DEAGLE.reloadMs,
      ammo: p.sidearmAmmo ?? 0,
      reserve: p.sidearmReserve ?? 0,
      take: () => void (p.sidearmAmmo = Math.max(0, (p.sidearmAmmo ?? 0) - 1)),
      fill: () => {
        const n = Math.min(DEAGLE.magazine - (p.sidearmAmmo ?? 0), p.sidearmReserve ?? 0);
        p.sidearmAmmo = (p.sidearmAmmo ?? 0) + n;
        p.sidearmReserve = (p.sidearmReserve ?? 0) - n;
      },
    };
  }
  const stats = primaryStats(p);
  return {
    magazine: stats.magazine,
    reloadMs: stats.reloadMs,
    ammo: p.ammo,
    reserve: p.reserve,
    take: () => void p.ammo--,
    fill: () => {
      const n = Math.min(stats.magazine - p.ammo, p.reserve);
      p.ammo += n;
      p.reserve -= n;
    },
  };
}

function player(id: string, seat: Seat, map: GameMap, primary: Primary = "rifle"): Player {
  const stats = primaryStats(primary === "rifle" ? {} : { primary });
  const p: Player = {
    id,
    ...map.spawns[seat],
    y: 0,
    pitch: 0,
    hp: 100,
    ammo: stats.magazine,
    reserve: stats.reserve,
    ...(primary !== "rifle" ? { primary } : {}),
    weapon: "rifle",
    reloadUntil: 0,
    lastShotAt: -1e12,
    lastSeq: -1,
    kills: 0,
    headshots: 0,
    // One HE, one smoke and one incendiary every round.
    grenades: fullInventory(),
  };
  // 1v1: both players carry the Desert Eagle as their sidearm (2), fresh every round.
  giveDeagle(p);
  return p;
}

export function createMatch(
  ids: { A: string; B: string },
  bestOf: 5 | 9 | 13,
  now: number,
  combatVersion: 1 | 2 = COMBAT_VERSION,
  mapId?: string,
): MatchState {
  if (!Number.isFinite(now) || ![5, 9, 13].includes(bestOf))
    throw new Error("Invalid match configuration");
  // Throws on an unknown id. Dustfront matches keep the field absent, exactly as before.
  const map = getMap(mapId);
  return {
    v: 1,
    ...(map === DEFAULT_MAP ? {} : { mapId: map.id }),
    sideVersion: 1,
    combatVersion,
    ...(combatVersion === COMBAT_VERSION ? { armorVersion: 1 as const } : {}),
    phase: "waiting",
    players: {
      A: {
        ...player(ids.A, "A", map),
        ...(combatVersion === COMBAT_VERSION ? { armor: 100 } : {}),
      },
      B: {
        ...player(ids.B, "B", map),
        ...(combatVersion === COMBAT_VERSION ? { armor: 100 } : {}),
      },
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
    state.phaseEndsAt =
      now +
      (state.sideVersion === 1 && state.round === halftimeRound(state)
        ? HALFTIME_MS
        : ROUND_END_MS);
  }
}

function blocked(
  x: number,
  y: number,
  z: number,
  crouched = false,
  map: GameMap = DEFAULT_MAP,
): boolean {
  if (
    Math.abs(x) > map.arena.width / 2 - PLAYER_RADIUS ||
    Math.abs(z) > map.arena.depth / 2 - PLAYER_RADIUS
  )
    return true;
  // Cover and movement-only barriers (gorges, undergrowth, organic edges).
  return map.movementSolids.some(
    (b) =>
      y < b.y + b.h / 2 - 1e-7 &&
      y + eyeHeight({ crouched }) + 0.2 > b.y - b.h / 2 &&
      Math.abs(x - b.x) < b.w / 2 + PLAYER_RADIUS - 1e-7 &&
      Math.abs(z - b.z) < b.d / 2 + PLAYER_RADIUS - 1e-7,
  );
}

type Pose = Vector & { crouched?: boolean };
// The cosmetic camera uses exactly the same occupancy test as movement (pass the match's map).
export { blocked as isMovementBlocked };
/**
 * dt is milliseconds and capped at one tick; callers predict once per fixed tick. `map` is the
 * match's map: the server, the client prediction and the bot must all pass the same one.
 */
export function predictMovement(
  p: Player,
  input: Input | null,
  dt: number,
  map: GameMap = DEFAULT_MAP,
): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const seconds = Math.min(dt, TICK_MS) / 1000;
  if (input) {
    const supported =
      p.y === 0 ||
      map.boxes.some(
        (b) =>
          Math.abs(p.y - (b.y + b.h / 2)) < 1e-6 &&
          Math.abs(p.x - b.x) < b.w / 2 + PLAYER_RADIUS &&
          Math.abs(p.z - b.z) < b.d / 2 + PLAYER_RADIUS,
      );
    // Stairs are stepped onto only from the ground or a support, never mid-jump (a jump plus a
    // step would otherwise clear 1.2 m cover).
    const grounded = supported && (p.velocityY ?? 0) === 0;
    if (input.jump && grounded) p.velocityY = JUMP_SPEED;
    const canStep = grounded && !input.jump;
    // Air-duck contracts the hull upward around the head, instead of pushing the
    // head downward. Only the stance changes: velocity and gravity are untouched.
    // Keep the offset in snapshots so client prediction cannot apply it twice.
    const oldTuck = p.airCrouchOffset ?? 0;
    const wantsCrouch = !!input.crouch;
    const tuck = wantsCrouch && (!grounded || input.jump) ? EYE_HEIGHT - CROUCH_EYE_HEIGHT : 0;
    const stanceY = p.y + tuck - oldTuck;
    if (stanceY >= 0 && !blocked(p.x, stanceY, p.z, wantsCrouch, map)) {
      p.y = stanceY;
      p.crouched = wantsCrouch;
      p.airCrouchOffset = tuck;
    } else {
      // Releasing duck against a ledge/ceiling must not expand into a solid.
      p.crouched = true;
    }
    const length = Math.max(1, Math.hypot(input.forward, input.strafe));
    const speed =
      (MOVE_SPEED *
        weaponMoveScale(p) *
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
        -(axis === "x" ? map.arena.width : map.arena.depth) / 2 + PLAYER_RADIUS,
        Math.min(
          (axis === "x" ? map.arena.width : map.arena.depth) / 2 - PLAYER_RADIUS,
          p[axis] + delta,
        ),
      );
      for (const b of map.movementSolids) {
        const top = b.y + b.h / 2;
        // A riser no taller than STEP_HEIGHT (stairs) is walked onto instead of blocking.
        if (canStep && top - p.y <= STEP_HEIGHT + 1e-9) continue;
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
    for (const b of map.boxes) {
      const top = b.y + b.h / 2;
      if (
        top > stepTop &&
        top - p.y <= STEP_HEIGHT + 1e-9 &&
        Math.abs(p.x - b.x) < b.w / 2 + PLAYER_RADIUS - 1e-7 &&
        Math.abs(p.z - b.z) < b.d / 2 + PLAYER_RADIUS - 1e-7
      )
        stepTop = top;
    }
    if (canStep && stepTop > p.y && !blocked(p.x, stepTop, p.z, !!p.crouched, map)) {
      p.y = stepTop;
      p.velocityY = 0;
    }
  }
  const previousY = p.y;
  p.velocityY = (p.velocityY ?? 0) - GRAVITY * seconds;
  let nextY = Math.max(0, p.y + p.velocityY * seconds);
  if (p.velocityY <= 0)
    for (const b of map.boxes) {
      const top = b.y + b.h / 2;
      if (
        previousY >= top - 1e-6 &&
        nextY <= top &&
        Math.abs(p.x - b.x) < b.w / 2 + PLAYER_RADIUS &&
        Math.abs(p.z - b.z) < b.d / 2 + PLAYER_RADIUS
      ) {
        nextY = Math.max(nextY, top);
        p.velocityY = 0;
        p.airCrouchOffset = 0;
      }
    }
  p.y = nextY;
  if (blocked(p.x, p.y, p.z, !!p.crouched, map)) {
    p.y = previousY;
    p.velocityY = 0;
  }
  if (p.y === 0) {
    p.velocityY = 0;
    p.airCrouchOffset = 0;
  }
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
    stats = WEAPONS.rifle;
  const start = positions[seat],
    targetStart = historicalTarget ?? positions[other(seat)];
  const modern = state.combatVersion === COMBAT_VERSION;
  const deagle = p.weapon === "sidearm" && p.sidearm === "deagle";
  const awp = !deagle && primaryOf(p) === "awp";
  const mp5 = !deagle && primaryOf(p) === "mp5";
  const gun = drawnGun(p);
  if (
    p.reloadUntil ||
    !gun.ammo ||
    now - p.lastShotAt <
      (deagle
        ? DEAGLE.cycleMs
        : awp
          ? AWP.cycleMs
          : mp5
            ? MP5.cycleMs
            : modern
              ? 100
              : stats.fireIntervalMs)
  )
    return;
  // The AWP's cone is decided by the zoom held when the trigger broke (then the zoom drops).
  const awpCone = awp
    ? awpSpread({
        scoped: scopeSettled(p, now),
        speedFraction: input.combatOnly ? (p.moving ? 1 : 0) : awpSpeedFraction(input, p),
        airborne: (p.velocityY ?? 0) !== 0,
        crouched: !!p.crouched,
      })
    : 0;
  if (!modern) p.sprayCount = now - p.lastShotAt > 300 ? 1 : (p.sprayCount ?? 0) + 1;
  const moved = input.combatOnly ? !!p.moving : Math.hypot(input.forward, input.strafe) > 0.1,
    airborne = (p.velocityY ?? 0) !== 0;
  const spread = awp
    ? awpCone
    : deagle
      ? deagleSpread((p.sprayCount ?? 0) + 1, moved, airborne, !!p.crouched)
      : mp5
        ? mp5Spread((p.sprayCount ?? 0) + 1, moved, airborne, !!p.crouched)
        : modern
          ? 0.0015 *
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
  gun.take();
  const counters = state.server ? (state.server.roundStats ??= emptyRoundStats())[seat] : null;
  if (counters) counters.shots++;
  p.lastShotAt = mp5 ? mp5ShotAt(p.lastShotAt, now, TICK_MS) : now;
  // Integer hash gives reproducible spread without random state or client-supplied seeds.
  const hash =
    modern && state.server
      ? (state.server.spreadSeed =
          (Math.imul(state.server.spreadSeed ?? 1, 1664525) + 1013904223) >>> 0)
      : (Math.imul(p.lastSeq + 1, 1664525) + Math.imul(state.tick, 1013904223)) >>> 0;
  if (awp) {
    // Bolt action: no spray pattern (the recoil settles within the cycle); the zoom drops.
    delete p.scoped;
    delete p.scopedAt;
  }
  const yaw = input.yaw + (modern ? (p.recoilYaw ?? 0) : 0) + ((hash % 1001) / 500 - 1) * spread;
  const pitch =
    input.pitch + (modern ? (p.recoilPitch ?? 0) : 0) + (((hash >>> 10) % 1001) / 500 - 1) * spread;
  const direction = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
  const origin = { x: start.x, y: start.y + eyeHeight(start), z: start.z };
  const map = mapOf(state);
  const worldHit = traceWorld(origin, direction, 100, map),
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
    text: deagle ? "Desert Eagle fired" : awp ? "AWP fired" : mp5 ? "MP5 fired" : "rifle fired",
    weapon: deagle ? "sidearm" : "rifle",
    ...(awp ? { primary: "awp" as const } : mp5 ? { primary: "mp5" as const } : {}),
    audio: { kind: "shot", position: origin },
  });
  if (modern && !awp) advanceCombatRecoil(p);
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
  const damage = awp
    ? awpDamage(target, contact.zone)
    : deagle
      ? vestDamage(target, contact.zone, DEAGLE)
      : mp5
        ? vestDamage(target, contact.zone, MP5)
        : modern
          ? state.armorVersion === 1
            ? applyVestDamage(target, "rifle", contact.zone)
            : HIT_DAMAGE.rifle[contact.zone]
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
      map,
    ) ?? traceWorld({ x: point.x, y: point.y + 0.02, z: point.z }, { x: 0, y: -1, z: 0 }, 2, map);
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

/**
 * One knife swing (slash or stab), resolved entirely on the server: draw time and cooldown gate
 * it, a short fan of traces from the eye finds the target's nearest hit volume within reach
 * (lag-compensated like a shot) and world geometry in front of it blocks the blade.
 */
function knifeAttack(
  state: MatchState,
  seat: Seat,
  now: number,
  positions: Record<Seat, Pose>,
  input: Input,
  attack: KnifeAttack,
  historicalTarget?: Pose,
): void {
  const p = state.players[seat],
    victimSeat = other(seat),
    target = state.players[victimSeat],
    spec = KNIFE[attack];
  if (now < (p.weaponReadyAt ?? 0) || now < (p.nextAttackAt ?? 0)) return;
  p.nextAttackAt = now + spec.cooldownMs;
  const start = positions[seat],
    targetStart = historicalTarget ?? positions[victimSeat];
  const origin = { x: start.x, y: start.y + eyeHeight(start), z: start.z };
  const map = mapOf(state);
  const counters = state.server ? (state.server.roundStats ??= emptyRoundStats())[seat] : null;
  if (counters) counters.shots++;
  state.events.push({
    type: "shot",
    shotSeq: input.seq,
    seat,
    text: `knife ${attack}`,
    weapon: "knife",
    attack,
    audio: { kind: "knife", position: origin },
  });
  const volumes = combatVolumes(targetStart);
  let best: { zone: HitZone; distance: number; direction: Vector } | null = null;
  for (const [dyaw, dpitch] of spec.fan) {
    const yaw = input.yaw + dyaw,
      pitch = input.pitch + dpitch;
    const direction = {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    };
    const wall = traceWorld(origin, direction, spec.range, map)?.distance ?? Infinity;
    for (const [zone, volume] of Object.entries(volumes)) {
      const distance = rayBox(origin, direction, volume.center, volume.size);
      if (distance <= spec.range && distance < wall && (!best || distance < best.distance))
        best = { zone: zone as HitZone, distance, direction };
    }
  }
  if (!best) {
    // A miss that strikes a wall within reach still sparks on it.
    const direction = {
      x: -Math.sin(input.yaw) * Math.cos(input.pitch),
      y: Math.sin(input.pitch),
      z: -Math.cos(input.yaw) * Math.cos(input.pitch),
    };
    const wall = traceWorld(origin, direction, spec.range, map);
    if (wall)
      state.events.push({
        type: "impact",
        seat,
        text: wall.surface + " impact",
        weapon: "knife",
        impact: wall,
      });
    return;
  }
  const backstab = isBackstab(start, { x: targetStart.x, z: targetStart.z, yaw: target.yaw });
  const damage = knifeDamage(target, attack, backstab);
  if (counters) {
    counters.hits++;
    counters.damage += Math.min(target.hp, damage);
  }
  target.hp = Math.max(0, target.hp - damage);
  const point = {
    x: origin.x + best.direction.x * best.distance,
    y: origin.y + best.direction.y * best.distance,
    z: origin.z + best.direction.z * best.distance,
  };
  const splatter =
    traceWorld(point, best.direction, 2, map) ??
    traceWorld({ x: point.x, y: point.y + 0.02, z: point.z }, { x: 0, y: -1, z: 0 }, 2, map);
  state.events.push({
    type: "hit",
    seat,
    text: backstab ? "Backstab" : `Knife ${attack}`,
    weapon: "knife",
    attack,
    ...(backstab ? { backstab: true } : {}),
    hit: {
      victim: victimSeat,
      zone: best.zone,
      damage,
      point,
      direction: best.direction,
      ...(splatter ? { splatter } : {}),
    },
  });
  if (target.hp === 0) p.kills++;
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
  if (
    !input ||
    (input.round !== undefined && input.round !== state.round) ||
    input.combatOnly ||
    input.seq <= p.lastSeq ||
    p.hp <= 0
  )
    return false;
  if (input.reload || input.weapon !== p.weapon) return false;
  // Grenade presses, holds and releases (and type changes) only go through the regular step.
  if (
    input.weapon === "grenade" &&
    (input.fire || input.alt || input.nade !== p.nade || p.nadeHold || p.nadeThrow)
  )
    return false;
  if (input.fire) {
    const next = validateInput(nextRaw);
    // A continuous automatic-rifle hold is still represented by the next command.
    // Only the normal combat tick may fire; never fold a tap/release, reload,
    // weapon change, or semi-automatic trigger edge into movement catch-up.
    if (
      state.combatVersion !== COMBAT_VERSION ||
      input.weapon !== "rifle" ||
      primaryOf(p) === "awp" ||
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
  predictMovement(p, input, TICK_MS, mapOf(state));
  // Same footstep accounting as stepMatch: Shift-walking stays silent.
  if (input.walk) p.stepDistance = 0;
  else if (p.y === before.y && !(p.velocityY ?? 0))
    p.stepDistance = (p.stepDistance ?? 0) + Math.hypot(p.x - before.x, p.z - before.z);
  return true;
}

/**
 * Spawn buy (B) in a 1v1: swap the primary between the side's rifle and the AWP. Allowed in the
 * countdown and between rounds (applies to the next spawn, which keeps the primary), and in the
 * first BUY_TIME_MS of a live round near the player's spawn. Returns true when applied.
 */
/** The 1v1 buy window for `seat` at server time `now` (also the client's buy-menu hint). */
export function duelBuyWindow(state: MatchState, seat: Seat, now: number): BuyWindow {
  const p = state.players[seat];
  const spawn = mapOf(state).spawns[spawnSide(state, seat)];
  return {
    preRound: state.phase === "countdown" || state.phase === "round-end",
    live: state.phase === "live",
    sinceLiveMs: now - (state.phaseEndsAt - ROUND_MS),
    fromSpawn: Math.hypot(p.x - spawn.x, p.z - spawn.z),
    alive: p.hp > 0 || state.phase === "round-end",
  };
}

export function buyPrimary(state: MatchState, seat: Seat, item: BuyItem, now: number): boolean {
  const p = state.players[seat];
  if (!p || state.phase === "completed" || state.phase === "cancelled" || state.phase === "waiting")
    return false;
  if (!buyWindowOpen(duelBuyWindow(state, seat, now))) return false;
  // The sidearm: every 1v1 spawn carries a fresh Deagle; a buy refills it now.
  if (item === "deagle") return state.phase === "round-end" ? false : applySidearmPurchase(p);
  if (state.phase === "round-end") {
    // The next spawn hands out the new primary with full ammunition.
    if (item === "rifle") delete p.primary;
    else p.primary = item;
    return true;
  }
  return applyPurchase(p, item, primaryStats(item === "rifle" ? {} : { primary: item }));
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
  const map = mapOf(state);
  server.lastStepAt = now;
  state.tick++;
  state.events = [];
  if (state.phase === "round-end" && now >= state.phaseEndsAt) {
    state.round++;
    for (const seat of SEATS) {
      const old = state.players[seat];
      state.players[seat] = {
        // The bought primary carries over to the next round (practice: no economy).
        ...player(old.id, spawnSide(state, seat), map, primaryOf(old)),
        ...(state.armorVersion === 1 ? { armor: 100 } : {}),
        kills: old.kills,
        headshots: old.headshots,
        lastSeq: old.lastSeq,
      };
    }
    server.roundStats = emptyRoundStats();
    // Last round's grenades (clouds, fires, anything still in the air) are gone.
    state.grenades = emptyGrenadeWorld(state.grenades?.next ?? 1);
    delete server.burns;
    if (state.sideVersion === 1 && state.round === halftimeRound(state) + 1)
      state.events.push({ type: "halftime", text: "Second half · sides switched" });
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
    if (
      action?.combatOnly &&
      (action.round === undefined || action.round === state.round) &&
      action.seq > p.lastSeq &&
      action.weapon === p.weapon &&
      p.hp > 0
    )
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
  const velocities: Record<Seat, Vector> = {
    A: { x: 0, y: state.players.A.velocityY ?? 0, z: 0 },
    B: { x: 0, y: state.players.B.velocityY ?? 0, z: 0 },
  };
  for (const seat of SEATS) {
    const p = state.players[seat],
      candidate = validateInput(inputs[seat]),
      input =
        candidate?.combatOnly || (candidate?.round !== undefined && candidate.round !== state.round)
          ? null
          : candidate;
    if (state.combatVersion === COMBAT_VERSION) recoverCombatRecoil(p, now);
    if (p.reloadUntil && now >= p.reloadUntil) {
      // The reload belongs to the drawn gun (a switch is refused while reloading).
      drawnGun(p).fill();
      p.reloadUntil = 0;
    }
    if (input && input.seq > p.lastSeq) {
      accepted[seat] = input;
      p.moving = Math.hypot(input.forward, input.strafe) > 0.1;
      p.sprinting = input.sprint;
      p.lastSeq = input.seq;
      p.yaw = input.yaw;
      p.pitch = input.pitch;
      // The knife carries no ammunition: the rifle's magazine and reserve are kept as they are.
      // Drawing the knife takes KNIFE.drawMs before it can swing (server clock, not the
      // first-person equip animation); the rifle draws instantly, as before.
      // Grenades (4): drawn only when carried (the server's inventory), the type from the
      // input; a grenade already released leaves the hand before anything else is drawn.
      if (input.weapon === "grenade") {
        if ((p.weapon !== "grenade" || input.nade !== p.nade) && !p.reloadUntil)
          equipGrenade(p, input.nade, now);
      } else if (
        p.weapon !== input.weapon &&
        (input.weapon !== "sidearm" || !!p.sidearm) &&
        !p.reloadUntil &&
        !grenadeSwitchLocked(p)
      ) {
        if (p.weapon === "grenade") clearGrenadeHandling(p);
        p.weapon = input.weapon;
        if (p.weapon === "knife") p.weaponReadyAt = now + KNIFE.drawMs;
        else delete p.weaponReadyAt;
      }
      const held = drawnGun(p);
      if (
        input.reload &&
        (p.weapon === "rifle" || p.weapon === "sidearm") &&
        !p.reloadUntil &&
        held.reserve > 0 &&
        held.ammo < held.magazine
      )
        p.reloadUntil = now + held.reloadMs;
      updateScope(p, !!input.scope, now);
      const before = { x: p.x, y: p.y, z: p.z };
      predictMovement(p, input, TICK_MS, map);
      velocities[seat] = {
        x: ((p.x - before.x) * 1000) / TICK_MS,
        y: p.velocityY ?? 0,
        z: ((p.z - before.z) * 1000) / TICK_MS,
      };
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
          const floor = traceWorld(
            { x: p.x, y: p.y + 0.15, z: p.z },
            { x: 0, y: -1, z: 0 },
            0.4,
            map,
          );
          state.events.push({
            type: "step",
            seat,
            text: "Footstep",
            audio: {
              kind: "step",
              position: { x: p.x, y: p.y, z: p.z },
              surface: footstepSurface(map, p, floor),
              soft: !!p.crouched,
            },
          });
        }
      }
    } else {
      predictMovement(p, null, TICK_MS, map);
    }
  }
  // Both shots use tick-start positions, even if the first is lethal.
  // Health changes cannot suppress the opponent's shot; adjudicate only afterward.
  for (const seat of SEATS) {
    const input = combatInputs[seat] ?? accepted[seat];
    const p = state.players[seat];
    if (combatInputs[seat]) p.lastSeq = Math.max(p.lastSeq, combatInputs[seat]!.seq);
    if (p.weapon === "grenade") {
      if (p.hp > 0)
        stepGrenadeHandling(
          p,
          input ? { fire: input.fire, alt: !!input.alt } : null,
          now,
          (thrower, t) => {
            const world = (state.grenades ??= emptyGrenadeWorld());
            const projectile = launchGrenade(
              world,
              map,
              SEATS.indexOf(seat),
              thrower,
              t,
              velocities[seat],
              now,
            );
            state.events.push({
              type: "nade-throw",
              seat,
              text: "grenade thrown",
              nade: t.type,
              projectile: publicProjectile(projectile),
            });
            return projectile.id;
          },
        );
      if (input) p.triggerHeld = accepted[seat]?.fire ?? input.fire;
      continue;
    }
    if (p.weapon === "knife") {
      // Melee swings are allowed while moving; holding the button repeats at the cooldown.
      if (input && (input.fire || input.alt) && (!input.combatOnly || input.weapon === p.weapon))
        knifeAttack(
          state,
          seat,
          now,
          positions,
          input,
          input.alt ? "stab" : "slash",
          historicalTargets?.[seat],
        );
      if (input) p.triggerHeld = accepted[seat]?.fire ?? input.fire;
      continue;
    }
    if (
      input?.fire &&
      (!input.combatOnly || input.weapon === p.weapon) &&
      (!(input.combatOnly ? p.sprinting : input.sprint) || p.crouched) &&
      (state.combatVersion !== COMBAT_VERSION ||
        (p.weapon === "rifle" && primaryOf(p) !== "awp") ||
        !p.triggerHeld)
    )
      shoot(state, seat, now, positions, input, historicalTargets?.[seat]);
    if (input) p.triggerHeld = accepted[seat]?.fire ?? input.fire;
  }
  stepDuelGrenades(state, now);
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
  // Both side rifles share this authoritative reload clock. Start after combat so
  // the last round fires normally, even if no further input arrives. A round-ending
  // kill must keep its death/result presentation instead of starting a reload.
  if (state.phase === "live")
    for (const seat of SEATS) {
      const p = state.players[seat];
      const held = drawnGun(p);
      if (
        p.hp > 0 &&
        (p.weapon === "rifle" || p.weapon === "sidearm") &&
        held.ammo === 0 &&
        held.reserve > 0 &&
        !p.reloadUntil
      ) {
        p.reloadUntil = now + held.reloadMs;
        updateScope(p, false, now);
      }
    }
  return state;
}

const publicProjectile = (p: import("./grenades/world").Projectile) => {
  const { sim: _s, floorN: _f, floorAt: _a, restN: _r, ...rest } = p;
  return rest;
};

/**
 * The 1v1's grenades this tick: flights and detonations, the HE blast's damage, fire damage to
 * anyone standing in flames. Damage is the server's alone; kills are credited to the thrower
 * (a player can hurt or kill themselves, as in CS, which hands the round to the opponent).
 */
function stepDuelGrenades(state: MatchState, now: number) {
  const world = state.grenades;
  if (!world || state.phase !== "live") return;
  const map = mapOf(state);
  const counters = state.server?.roundStats;
  const hurt = (owner: Seat, victim: Seat, damage: number, from: Vector, nade: "he" | "fire") => {
    const target = state.players[victim];
    if (damage <= 0 || target.hp <= 0) return;
    const dealt = Math.min(target.hp, damage);
    target.hp = Math.max(0, target.hp - damage);
    if (counters && owner !== victim) counters[owner].damage += dealt;
    const chest = { x: target.x, y: target.y + eyeHeight(target) - 0.55, z: target.z };
    const dx = chest.x - from.x,
      dy = chest.y - from.y,
      dz = chest.z - from.z,
      length = Math.hypot(dx, dy, dz) || 1;
    state.events.push({
      type: "hit",
      seat: owner,
      text: nade === "he" ? "HE damage" : "Fire damage",
      nade,
      hit: {
        victim,
        zone: "chest",
        damage,
        point: chest,
        direction: { x: dx / length, y: dy / length, z: dz / length },
      },
    });
    if (target.hp === 0 && owner !== victim) state.players[owner].kills++;
    if (target.hp === 0) clearGrenadeHandling(target);
  };
  for (const det of stepGrenadeWorld(world, map, now)) {
    const owner = SEATS[det.owner] ?? "A";
    state.events.push({
      type: "nade-detonate",
      seat: owner,
      text: det.type + " detonated",
      nade: det.type,
      detonation: det,
    });
    if (det.type !== "he") continue;
    const center = { x: det.x, y: det.y + 0.1, z: det.z };
    for (const victim of SEATS) {
      const target = state.players[victim];
      if (target.hp <= 0) continue;
      const raw = heRawDamage(center, target, map);
      hurt(owner, victim, heVestDamage(raw, target), center, "he");
    }
  }
  if (!world.fires.length && !state.server?.burns) return;
  const server = state.server!;
  const burns = (server.burns ??= {});
  for (const victim of SEATS) {
    const target = state.players[victim];
    if (target.hp <= 0) continue;
    const r = burnStep(target, burns[victim], world.fires, now);
    if (r.burn) burns[victim] = r.burn;
    else delete burns[victim];
    if (r.damage > 0)
      hurt(
        SEATS[r.owner] ?? victim,
        victim,
        r.damage,
        { x: target.x, y: target.y, z: target.z },
        "fire",
      );
  }
}

/** The world as snapshots carry it (no server-only flight state). */
export const duelGrenadeView = (state: Pick<MatchState, "grenades">) =>
  publicGrenadeWorld(state.grenades);

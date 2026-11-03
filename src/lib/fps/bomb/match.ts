import {
  advanceCombatRecoil,
  applyVestDamage,
  combatSpread,
  recoverCombatRecoil,
  type HitZone,
} from "../combat";
import { rayBox, traceWorld } from "../collision";
import { footstepSurface } from "../footstep-surfaces";
import { eyeHeight } from "../map";
import { combatVolumes } from "../player-volumes";
import { validateInput } from "../protocol";
import { predictMovement, TICK_MS, WEAPONS } from "../simulation";
import { SANDGATE, SANDGATE_SPAWNS, bombsiteAt } from "./sandgate";
import {
  BOMB_RULES,
  defuseTime,
  SLOT_COUNT,
  groupOfSlot,
  teamOfGroup,
  type BombInput,
  type BombMatchState,
  type BombPlayer,
  type Group,
  type RoundEndReason,
  type Team,
} from "./rules";

export type BombCombatPose = {
  x: number;
  y: number;
  z: number;
  crouched: boolean;
  stance?: number;
};
export type BombTargetPose = (shooter: number, target: number) => BombCombatPose | undefined;
const MAP = SANDGATE;
export const teamOf = (state: Pick<BombMatchState, "half">, p: Pick<BombPlayer, "group">): Team =>
  teamOfGroup(p.group, state.half);
const alive = (p: BombPlayer) => p.hp > 0;
const lcg = (s: number) => (Math.imul(s, 1664525) + 1013904223) >>> 0;

/** Strict input check: the shared FPS input plus an optional boolean `use`. */
export function validateBombInput(raw: unknown): BombInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { use, ...rest } = raw as Record<string, unknown>;
  if (use !== undefined && typeof use !== "boolean") return null;
  const input = validateInput(rest);
  if (!input) return null;
  // Bomb Defusal is a rifle mode: every player carries their team's rifle.
  input.weapon = "rifle";
  return use ? { ...input, use: true } : input;
}

/** Free per-round Practice equipment; no wallet or economy. */
export function equipDefuseKit(state: BombMatchState, slot: number, now: number): boolean {
  const player = state.players[slot];
  if (
    !Number.isFinite(now) ||
    state.phase !== "freeze" ||
    now >= state.phaseEndsAt ||
    !player ||
    player.bot ||
    player.hp <= 0 ||
    teamOf(state, player) !== "police"
  )
    return false;
  player.defuseKit = true;
  return true;
}

function spawnOf(state: BombMatchState, p: BombPlayer) {
  const list = teamOf(state, p) === "police" ? SANDGATE_SPAWNS.police : SANDGATE_SPAWNS.terrorist;
  return list[p.slot % BOMB_RULES.teamSize]!;
}

function freshPlayer(state: BombMatchState, base: BombPlayer): BombPlayer {
  const s = spawnOf(state, base);
  return {
    id: base.id,
    slot: base.slot,
    group: base.group,
    name: base.name,
    bot: base.bot,
    kills: base.kills,
    headshots: base.headshots,
    deaths: base.deaths,
    assists: base.assists,
    lastSeq: base.lastSeq,
    x: s.x,
    y: 0,
    z: s.z,
    yaw: s.yaw,
    pitch: 0,
    hp: 100,
    armor: 100,
    ammo: WEAPONS.rifle.magazine,
    reserve: WEAPONS.rifle.reserve,
    weapon: "rifle",
    reloadUntil: 0,
    lastShotAt: -1e12,
    damageTo: {},
  };
}

/**
 * A new practice match: ten slots (bots until humans take them), waiting in warm-up until the
 * room starts it. `ids`/`names`/`bots` are per slot.
 */
export function createBombMatch(
  slots: { id: string; name: string; bot: boolean }[],
  now: number,
  seed = crypto.getRandomValues(new Uint32Array(1))[0]!,
): BombMatchState {
  if (slots.length !== SLOT_COUNT || !Number.isFinite(now)) throw new Error("Invalid bomb match");
  const state: BombMatchState = {
    v: 1,
    mode: "bomb",
    mapId: "sandgate",
    phase: "warmup",
    phaseEndsAt: 0,
    round: 1,
    half: 1,
    score: { alpha: 0, bravo: 0 },
    players: [],
    bomb: { state: "carried", carrier: BOMB_RULES.teamSize },
    roundEndsAt: 0,
    winner: null,
    tick: 0,
    events: [],
    server: { lastStepAt: now, spreadSeed: seed, rng: lcg(seed ^ 0x9e3779b9) },
  };
  state.players = slots.map((s, slot) =>
    freshPlayer(state, {
      id: s.id,
      slot,
      group: groupOfSlot(slot),
      name: s.name,
      bot: s.bot,
      kills: 0,
      headshots: 0,
      deaths: 0,
      assists: 0,
      lastSeq: -1,
    } as BombPlayer),
  );
  return state;
}

/** Fresh round: everyone respawns with full health, armour and ammunition; a new bomb carrier. */
function startRound(state: BombMatchState, now: number) {
  state.players = state.players.map((p) => freshPlayer(state, p));
  const terrorists = state.players.filter((p) => teamOf(state, p) === "terrorist");
  state.server!.rng = lcg(state.server!.rng);
  const carrier = terrorists[state.server!.rng % terrorists.length]!;
  state.bomb = { state: "carried", carrier: carrier.slot };
  state.phase = "freeze";
  state.phaseEndsAt = now + BOMB_RULES.freezeMs;
  state.roundEndsAt = state.phaseEndsAt + BOMB_RULES.roundMs;
  state.events.push({ type: "round-start", text: `Round ${state.round}`, slot: carrier.slot });
}

export function startBombMatch(state: BombMatchState, now: number): BombMatchState {
  if (state.phase !== "warmup") return state;
  state.server!.lastStepAt = now;
  startRound(state, now);
  return state;
}

/** Swap a slot between a bot and a human without touching the round (scores, life, bomb). */
export function assignSlot(
  state: BombMatchState,
  slot: number,
  who: { id: string; name: string; bot: boolean },
) {
  const p = state.players[slot];
  if (!p) throw new Error("No such slot");
  p.id = who.id;
  p.name = who.name;
  p.bot = who.bot;
  // Fresh input sequence for the new controller; stats stay with the slot for this match.
  p.lastSeq = -1;
}

function endRound(state: BombMatchState, winner: Team, reason: RoundEndReason, now: number) {
  const group = state.players.find((p) => teamOf(state, p) === winner)!.group;
  state.score[group]++;
  state.lastRound = { round: state.round, winner, group, reason };
  state.events.push({ type: "round-end", text: `${winner} win round ${state.round} (${reason})` });
  const total = state.score.alpha + state.score.bravo;
  if (state.score[group] >= BOMB_RULES.winRounds) {
    state.phase = "completed";
    state.winner = group;
    state.phaseEndsAt = 0;
  } else if (total === BOMB_RULES.roundsPerHalf * 2) {
    state.phase = "completed";
    state.winner = "draw";
    state.phaseEndsAt = 0;
  } else if (total === BOMB_RULES.roundsPerHalf && state.half === 1) {
    state.phase = "halftime";
    state.firstHalf = { ...state.score };
    state.phaseEndsAt = now + BOMB_RULES.halftimeMs;
    state.events.push({ type: "halftime", text: "Halftime · teams switch sides" });
  } else {
    state.phase = "round-end";
    state.phaseEndsAt = now + BOMB_RULES.roundEndMs;
  }
}

/** One rifle shot, resolved against every living enemy (no friendly fire), nearest hit wins. */
function shoot(
  state: BombMatchState,
  shooter: BombPlayer,
  start: { x: number; y: number; z: number; crouched: boolean },
  input: BombInput,
  now: number,
  poses: Map<number, { x: number; y: number; z: number; crouched: boolean }>,
  targetPose?: BombTargetPose,
) {
  if (shooter.reloadUntil || !shooter.ammo || now - shooter.lastShotAt < 100) return;
  const server = state.server!;
  const spread =
    0.0015 *
    combatSpread(
      (shooter.sprayCount ?? 0) + 1,
      Math.hypot(input.forward, input.strafe) > 0.1,
      (shooter.velocityY ?? 0) !== 0,
      !!shooter.crouched,
    );
  shooter.ammo--;
  shooter.lastShotAt = now;
  const hash = (server.spreadSeed = lcg(server.spreadSeed));
  const yaw = input.yaw + (shooter.recoilYaw ?? 0) + ((hash % 1001) / 500 - 1) * spread;
  const pitch =
    input.pitch + (shooter.recoilPitch ?? 0) + (((hash >>> 10) % 1001) / 500 - 1) * spread;
  const direction = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
  const origin = { x: start.x, y: start.y + eyeHeight(start), z: start.z };
  const worldHit = traceWorld(origin, direction, 120, MAP),
    wall = worldHit?.distance ?? Infinity;
  state.events.push({
    type: "shot",
    slot: shooter.slot,
    text: "rifle fired",
    audio: { kind: "shot", position: origin },
  });
  advanceCombatRecoil(shooter);
  const team = teamOf(state, shooter);
  let best: { victim: BombPlayer; zone: HitZone; distance: number } | null = null;
  for (const victim of state.players) {
    if (victim.slot === shooter.slot || !alive(victim) || teamOf(state, victim) === team) continue;
    const pose = targetPose?.(shooter.slot, victim.slot) ?? poses.get(victim.slot)!;
    for (const [zone, volume] of Object.entries(combatVolumes(pose))) {
      const d = rayBox(origin, direction, volume.center, volume.size);
      if (Number.isFinite(d) && d < wall && (!best || d < best.distance))
        best = { victim, zone: zone as HitZone, distance: d };
    }
  }
  if (!best) {
    if (worldHit)
      state.events.push({ type: "impact", slot: shooter.slot, text: "impact", impact: worldHit });
    return;
  }
  const { victim, zone } = best;
  const damage = applyVestDamage(victim, "rifle", zone);
  const dealt = Math.min(victim.hp, damage);
  victim.hp = Math.max(0, victim.hp - damage);
  (shooter.damageTo ??= {})[victim.slot] = (shooter.damageTo[victim.slot] ?? 0) + dealt;
  const point = {
    x: origin.x + direction.x * best.distance,
    y: origin.y + direction.y * best.distance,
    z: origin.z + direction.z * best.distance,
  };
  state.events.push({
    type: zone === "head" ? "headshot" : "hit",
    slot: shooter.slot,
    victim: victim.slot,
    zone,
    damage,
    point,
    direction,
    text: zone === "head" ? "Headshot" : "Hit",
  });
  if (victim.hp === 0) kill(state, victim, shooter, zone === "head", now);
}

function kill(
  state: BombMatchState,
  victim: BombPlayer,
  killer: BombPlayer | null,
  headshot: boolean,
  now: number,
) {
  victim.dead = true;
  victim.deaths++;
  if (killer) {
    killer.kills++;
    if (headshot) killer.headshots++;
  }
  for (const p of state.players)
    if (
      p !== killer &&
      p.slot !== victim.slot &&
      (p.damageTo?.[victim.slot] ?? 0) >= BOMB_RULES.assistDamage &&
      teamOf(state, p) !== teamOf(state, victim)
    )
      p.assists++;
  state.events.push({
    type: "kill",
    ...(killer ? { slot: killer.slot } : {}),
    victim: victim.slot,
    headshot,
    text: `${killer?.name ?? "The bomb"} killed ${victim.name}`,
    at: now,
  });
  // The carrier drops the bomb where they fell (on the floor under them).
  const b = state.bomb;
  if ((b.state === "carried" || b.state === "planting") && b.carrier === victim.slot) {
    state.bomb = { state: "dropped", x: victim.x, y: victim.y, z: victim.z };
    state.events.push({ type: "bomb-dropped", slot: victim.slot, text: "Bomb dropped" });
  }
  if (b.state === "planted" && b.defuser === victim.slot) {
    delete b.defuser;
    delete b.defuseStartedAt;
    delete b.defuseMs;
  }
}

function explode(state: BombMatchState, now: number) {
  const b = state.bomb;
  if (b.state !== "planted") return;
  state.bomb = { state: "exploded", x: b.x, y: b.y, z: b.z, site: b.site };
  state.events.push({
    type: "bomb-exploded",
    text: "Bomb exploded",
    audio: { kind: "bomb", position: { x: b.x, y: b.y, z: b.z } },
  });
  const { lethal, radius, damage } = BOMB_RULES.explosion;
  const origin = { x: b.x, y: b.y + 0.5, z: b.z };
  for (const p of state.players) {
    if (!alive(p)) continue;
    const target = { x: p.x, y: p.y + 1, z: p.z };
    const dx = target.x - origin.x,
      dy = target.y - origin.y,
      dz = target.z - origin.z,
      d = Math.hypot(dx, dy, dz);
    if (d >= radius) continue;
    // Walls shelter (the blast is traced like a bullet).
    if (d > 0.01 && traceWorld(origin, { x: dx / d, y: dy / d, z: dz / d }, d, MAP)) continue;
    const hurt = d <= lethal ? damage : (damage * (radius - d)) / (radius - lethal);
    p.hp = Math.max(0, p.hp - hurt);
    if (p.hp === 0) kill(state, p, null, false, now);
  }
  endRound(state, "terrorist", "bomb", now);
}

/**
 * One authoritative tick (TICK_MS). `inputs` is keyed by slot (humans and bots alike); slots
 * without input stand still. Returns the same state.
 */
export function stepBombMatch(
  state: BombMatchState,
  inputs: Partial<Record<number, unknown>>,
  now: number,
  targetPose?: BombTargetPose,
): BombMatchState {
  if (!Number.isFinite(now) || state.phase === "warmup" || state.phase === "completed")
    return state;
  const server = state.server!;
  if (now - server.lastStepAt < TICK_MS - 1e-6) return state;
  server.lastStepAt = now;
  state.tick++;
  state.events = [];
  // ---------------------------------------------------------------- phase clock
  if (state.phase === "halftime" && now >= state.phaseEndsAt) {
    state.half = 2;
    state.round++;
    state.events.push({ type: "second-half", text: "Second half · sides switched" });
    startRound(state, now);
    return state;
  }
  if (state.phase === "round-end" && now >= state.phaseEndsAt) {
    state.round++;
    startRound(state, now);
    return state;
  }
  if (state.phase === "halftime" || state.phase === "round-end") return state;
  if (state.phase === "freeze" && now >= state.phaseEndsAt) {
    state.phase = "live";
    state.events.push({ type: "live", text: "Round live" });
  }
  const live = state.phase === "live";
  const bomb = state.bomb;
  if (live && bomb.state === "planted" && now >= bomb.explodesAt) {
    explode(state, now);
    return state;
  }
  if (live && bomb.state !== "planted" && now >= state.roundEndsAt) {
    endRound(state, "police", "time", now);
    return state;
  }
  // ---------------------------------------------------------------- movement and weapons
  const poses = new Map(
    state.players.map((p) => [p.slot, { x: p.x, y: p.y, z: p.z, crouched: !!p.crouched }]),
  );
  const accepted = new Map<number, BombInput>();
  for (const p of state.players) {
    if (!alive(p)) continue;
    const input = validateBombInput(inputs[p.slot]);
    recoverCombatRecoil(p, now);
    if (p.reloadUntil && now >= p.reloadUntil) {
      const amount = Math.min(WEAPONS.rifle.magazine - p.ammo, p.reserve);
      p.ammo += amount;
      p.reserve -= amount;
      p.reloadUntil = 0;
    }
    if (
      !input ||
      input.seq <= p.lastSeq ||
      (input.round !== undefined && input.round !== state.round)
    ) {
      predictMovement(p, null, TICK_MS, MAP);
      continue;
    }
    accepted.set(p.slot, input);
    p.lastSeq = input.seq;
    p.yaw = input.yaw;
    p.pitch = input.pitch;
    p.moving = Math.hypot(input.forward, input.strafe) > 0.1;
    p.sprinting = input.sprint;
    if (input.reload && !p.reloadUntil && p.reserve > 0 && p.ammo < WEAPONS.rifle.magazine)
      p.reloadUntil = now + WEAPONS.rifle.reloadMs;
    // Frozen during freeze time and while planting or defusing (looking around is allowed).
    const b = state.bomb;
    const busy =
      (b.state === "planting" && b.carrier === p.slot) ||
      (b.state === "planted" && b.defuser === p.slot);
    if (!live || busy) {
      // A defuser kneels (crouched, no movement): the hands reach the bomb on the ground, and a
      // defuser is the smaller target, as in Counter-Strike.
      const defusing = b.state === "planted" && b.defuser === p.slot;
      predictMovement(
        p,
        defusing && live
          ? {
              ...input,
              forward: 0,
              strafe: 0,
              jump: false,
              sprint: false,
              walk: false,
              crouch: true,
            }
          : null,
        TICK_MS,
        MAP,
      );
      continue;
    }
    const before = { x: p.x, y: p.y, z: p.z };
    predictMovement(p, input, TICK_MS, MAP);
    if (input.walk) p.stepDistance = 0;
    else if (p.y === before.y && !(p.velocityY ?? 0)) {
      p.stepDistance = (p.stepDistance ?? 0) + Math.hypot(p.x - before.x, p.z - before.z);
      const stride = p.crouched ? 1.25 : input.sprint ? 1.9 : 1.6;
      if (p.stepDistance >= stride) {
        p.stepDistance -= stride;
        const floor = traceWorld(
          { x: p.x, y: p.y + 0.15, z: p.z },
          { x: 0, y: -1, z: 0 },
          0.4,
          MAP,
        );
        state.events.push({
          type: "step",
          slot: p.slot,
          text: "Footstep",
          audio: {
            kind: "step",
            position: { x: p.x, y: p.y, z: p.z },
            surface: footstepSurface(MAP, p, floor),
            soft: !!p.crouched,
          },
        });
      }
    }
  }
  // Everyone alive at the start of the tick fires from where they stood (same temporal basis as
  // the 1v1 step): a lethal shot earlier in the slot order cannot suppress the victim's shot.
  const aliveAtStart = new Set(state.players.filter(alive).map((p) => p.slot));
  if (live)
    for (const p of state.players) {
      const input = accepted.get(p.slot);
      if (!input || !aliveAtStart.has(p.slot)) continue;
      if (input.fire && (!input.sprint || p.crouched))
        shoot(state, p, poses.get(p.slot)!, input, now, poses, targetPose);
      p.triggerHeld = input.fire;
    }
  if (live) objective(state, accepted, now);
  if (state.phase !== "live") return state;
  // ---------------------------------------------------------------- round result
  const livingTeam = (team: Team) =>
    state.players.some((p) => alive(p) && teamOf(state, p) === team);
  const planted = state.bomb.state === "planted";
  if (!livingTeam("terrorist") && !planted) endRound(state, "police", "elimination", now);
  else if (!livingTeam("police")) endRound(state, "terrorist", "elimination", now);
  if (state.phase === "live")
    for (const p of state.players)
      if (alive(p) && p.ammo === 0 && p.reserve > 0 && !p.reloadUntil)
        p.reloadUntil = now + WEAPONS.rifle.reloadMs;
  return state;
}

/** Pickup, planting and defusing (the use key), resolved after combat. */
function objective(state: BombMatchState, inputs: Map<number, BombInput>, now: number) {
  const b = state.bomb;
  if (b.state === "dropped") {
    const taker = state.players.find(
      (p) =>
        alive(p) &&
        teamOf(state, p) === "terrorist" &&
        Math.hypot(p.x - b.x, p.z - b.z) <= BOMB_RULES.pickupRadius &&
        Math.abs(p.y - b.y) < 1.2,
    );
    if (taker) {
      state.bomb = { state: "carried", carrier: taker.slot };
      state.events.push({
        type: "bomb-picked",
        slot: taker.slot,
        text: `${taker.name} has the bomb`,
      });
    }
    return;
  }
  if (b.state === "carried" || b.state === "planting") {
    const p = state.players[b.carrier]!;
    const use = !!inputs.get(p.slot)?.use;
    const grounded = (p.velocityY ?? 0) === 0;
    const site = bombsiteAt(p.x, p.z);
    if (b.state === "carried") {
      if (use && site && grounded && alive(p)) {
        state.bomb = { state: "planting", carrier: p.slot, site, startedAt: now };
        state.events.push({ type: "plant-start", slot: p.slot, text: "Planting" });
      }
      return;
    }
    if (!use || !alive(p) || site !== b.site) {
      state.bomb = { state: "carried", carrier: p.slot };
      state.events.push({ type: "plant-abort", slot: p.slot, text: "Planting interrupted" });
      return;
    }
    if (now - b.startedAt >= BOMB_RULES.plantMs) {
      state.bomb = {
        state: "planted",
        x: p.x,
        y: p.y,
        z: p.z,
        site: b.site,
        plantedAt: now,
        explodesAt: now + BOMB_RULES.bombMs,
      };
      state.events.push({
        type: "bomb-planted",
        slot: p.slot,
        text: `Bomb planted at ${b.site}`,
        audio: { kind: "bomb", position: { x: p.x, y: p.y, z: p.z } },
      });
    }
    return;
  }
  if (b.state !== "planted") return;
  const inReach = (p: BombPlayer) =>
    alive(p) &&
    teamOf(state, p) === "police" &&
    Math.hypot(p.x - b.x, p.z - b.z) <= BOMB_RULES.defuseRadius &&
    Math.abs(p.y - b.y) < 1.5;
  if (b.defuser !== undefined) {
    const d = state.players[b.defuser]!;
    if (!inReach(d) || !inputs.get(d.slot)?.use) {
      delete b.defuser;
      delete b.defuseStartedAt;
      delete b.defuseMs;
      state.events.push({ type: "defuse-abort", slot: d.slot, text: "Defuse interrupted" });
    } else if (now - b.defuseStartedAt! >= (b.defuseMs ?? BOMB_RULES.defuseMs)) {
      if (now < b.explodesAt) {
        state.bomb = { state: "defused", x: b.x, y: b.y, z: b.z, site: b.site };
        state.events.push({
          type: "bomb-defused",
          slot: d.slot,
          text: `${d.name} defused the bomb`,
        });
        endRound(state, "police", "defuse", now);
      }
      return;
    } else return;
  }
  // One defuser at a time: the first Police player in reach holding use (lowest slot on ties).
  const next = state.players.find((p) => inReach(p) && inputs.get(p.slot)?.use);
  if (next) {
    b.defuser = next.slot;
    b.defuseStartedAt = now;
    b.defuseMs = defuseTime(next);
    state.events.push({ type: "defuse-start", slot: next.slot, text: `${next.name} is defusing` });
  }
}

/** Living teammates a dead player may spectate (never enemies). */
export function spectateTargets(state: BombMatchState, slot: number): number[] {
  const me = state.players[slot];
  if (!me) return [];
  const team = teamOf(state, me);
  return state.players
    .filter((p) => p.slot !== slot && alive(p) && teamOf(state, p) === team)
    .map((p) => p.slot);
}

export type { Group };

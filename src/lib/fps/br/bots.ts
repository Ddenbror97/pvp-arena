import { eyeHeight } from "../map";
import { GRENADES } from "../grenades/rules";
import type { BrAct } from "./actions";
import { activeGun, ammoFor, capacity, countOf, type Loadout } from "./inventory";
import { ITEMS, type WeaponDef } from "./items";
import type { WorldItem } from "./loot";
import type { LootWorld } from "./loot-world";
import type { DropBody } from "./drop";
import type { StaticWorld } from "./static-world";
import type { Circle } from "./zone";

/**
 * Bots on the ground (PLAN §6.6; owner 2026-11-04: "trained to play battle royale", mixed
 * skill). They play by the same rules as humans, through the same input and actions
 * (movement, E pickups, equip, reload, heal, weapon switch, grenades, fire), so nothing a bot
 * does is out of a player's reach.
 *
 * Each bot has a skill (0 easy … 1 strong; about half easy, a third medium, a few strong, and
 * everyone sharper in the last circles). Skill sets the reaction time, aim error and how fast
 * it settles, engagement range, burst discipline, whether it backs off to heal, throws
 * grenades at players behind cover, investigates gunfire and rotates early.
 *
 * A bot loots what it lands on (a gun first, then ammunition, armour and its upgrades, plates,
 * attachments, a second gun, healing, a bigger backpack) and fits plates and attachments from
 * its bag; it turns on whoever shoots it, remembers where an enemy went behind cover, keeps
 * ahead of the gas, and fights what it can see. Decisions run at 5 Hz, staggered by seat; the
 * tuning numbers below come from bot-only matches on the real match engine
 * (scripts/br/bot-sim).
 */
export const BOT = {
  /** Global difficulty multiplier, applied to every tier and its endgame bonus. */
  skillScale: 0.5,
  decideMs: 200,
  lootRadius: 45,
  /** Without a usable gun (none, or no rounds for it): look this far for one, else sweep. */
  searchRadius: 260,
  /** Pick up from this far (horizontal m; a player's reach is 2.6 m from the eye). */
  pickupM: 2.1,
  /** From this many alive, an unarmed bot looks this far for a gun. */
  lateAlive: 25,
  lateSearchM: 1500,
  sweepM: 120,
  /** Far from the next circle (m beyond its edge): head in first, loot on the way only. */
  farM: 250,
  /** Where in the next circle a bot settles (share of its radius, from the centre). */
  spotIn: [0.15, 0.55] as const,
  /** Share of easy, medium and strong bots. */
  mix: [0.5, 0.35, 0.15] as const,
  /** Skill bands the mix draws from. */
  bands: [
    [0.1, 0.4],
    [0.45, 0.7],
    [0.75, 0.95],
  ] as const,
  /** Last circles: everyone left gets sharper (alive at most → skill bonus). */
  endgame: [
    [10, 0.15],
    [25, 0.08],
  ] as const,
  // Ranges below are [easy (skill 0), strong (skill 1)], interpolated by skill.
  /** Engage within this range (rifles); AWP bots engage further. */
  engageM: [45, 95] as const,
  awpEngageM: [150, 260] as const,
  /** First reaction to a new target, ms (uniform between the two values at that skill). */
  reactMin: [650, 230] as const,
  reactMax: [1100, 420] as const,
  /** Aim error (radians, standard deviation) at first sight and after settling. */
  aimFirst: [0.075, 0.035] as const,
  aimSettled: [0.024, 0.007] as const,
  settleMs: [3200, 1300] as const,
  /** Ticks the trigger is held per burst, then a pause. */
  burst: [6, 11] as const,
  burstPauseMs: [520, 240] as const,
  /** Heal below this health (easy → strong: better bots top up sooner). */
  healAt: [55, 85] as const,
  /** From this skill a bot stops moving while its burst flies. */
  counterStrafeSkill: 0.4,
  /** Last players standing hunt the nearest enemy within this range. */
  huntAlive: 12,
  huntM: 350,
  /** Back off to heal below this health (skill under `retreatSkill` never backs off). */
  retreatBelow: 45,
  retreatSkill: 0.3,
  retreatMs: 2600,
  /** HE grenades: from this skill, at targets this far (m), this often at most. */
  nadeSkill: 0.3,
  nadeM: [8, 21] as const,
  /** Incendiaries burn where they land, so they go further than HE (an overhand lob). */
  fireM: [8, 30] as const,
  /**
   * An enemy gone behind cover within `m` metres, beyond grenade reach: a bot of this skill and
   * health carrying HE or fire walks in on the spot until a grenade reaches, then throws.
   */
  nadePush: { skill: 0.5, hp: 60, m: 50 },
  nadeEveryMs: 7000,
  /** Chance per decision (× skill) of a grenade at a target in the open within nadeM. */
  nadeChance: 0.12,
  /** Where an enemy was last seen is worth acting on for this long. */
  seenMemoryMs: 3500,
  hurtMemoryMs: 4000,
  hearMemoryMs: 6000,
  /** Gunfire is investigated from this skill, with this much health and a vest on. */
  investigateSkill: 0.6,
  investigateHp: 70,
  /** Switch to the AWP beyond this range, back to a rifle inside the other. */
  awpBeyondM: 90,
  rifleWithinM: 45,
  /** Rotate when outside this share of the next circle (easy → strong). */
  rotateAt: [0.95, 0.7] as const,
} as const;

export type BotMind = {
  nextDecide: number;
  goalItem: number | null;
  target: number;
  targetSince: number;
  reactAt: number;
  burstLeft: number;
  pauseUntil: number;
  /** Stuck detection: where it was and when, and a detour until. */
  lastX: number;
  lastZ: number;
  lastAt: number;
  detourUntil: number;
  detourYaw: number;
  input: BotInput;
  seed: number;
  /** 0 easy … 1 strong (fixed for the match). */
  skill: number;
  strafeDir: number;
  strafeUntil: number;
  crouchUntil: number;
  retreatUntil: number;
  nadeAt: number;
  /** Who last hurt it, and when (the match fills these in, match.ts senseBots). */
  hurtBy: number;
  hurtAt: number;
  /** Gunfire it heard last (position, when). */
  heardX: number;
  heardZ: number;
  heardAt: number;
  /** The enemy it last saw, where and when (to push or grenade cover). */
  seenSeat: number;
  seenX: number;
  seenY: number;
  seenZ: number;
  seenAt: number;
  /** Its own spot in the next circle (so bots spread out, not pile on the centre). */
  spotX: number;
  spotZ: number;
  spotFor: number;
  /** Unarmed with nothing in reach: a sweep point, until then. */
  sweepX: number;
  sweepZ: number;
  sweepUntil: number;
  /** Items it could not reach (stuck on the way, or pickups refused): left alone. */
  skip: number[];
  pickId: number;
  pickTries: number;
};
export type BotInput = {
  forward: number;
  strafe: number;
  yaw: number;
  pitch: number;
  sprint: boolean;
  walk: boolean;
  crouch: boolean;
  fire: boolean;
  aim: boolean;
  reload: boolean;
  slot?: 0 | 1;
};

/** Each bot's skill, drawn from the match seed and its seat (deterministic). */
export function botSkill(seat: number, matchSeed = 0) {
  let x = (Math.imul(seat + 1, 2654435761) ^ Math.imul(matchSeed | 0, 40503)) >>> 0;
  const r = () => {
    x = (Math.imul(x ^ (x >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return x / 4294967296;
  };
  r();
  const u = r();
  const band = u < BOT.mix[0] ? 0 : u < BOT.mix[0] + BOT.mix[1] ? 1 : 2;
  const [lo, hi] = BOT.bands[band]!;
  return Math.round((lo + (hi - lo) * r()) * 100) / 100;
}

export const newBotMind = (seat: number, matchSeed = 0): BotMind => ({
  nextDecide: (seat * 37) % BOT.decideMs,
  goalItem: null,
  target: -1,
  targetSince: 0,
  reactAt: 0,
  burstLeft: 0,
  pauseUntil: 0,
  lastX: 0,
  lastZ: 0,
  lastAt: 0,
  detourUntil: 0,
  detourYaw: 0,
  input: idle(0),
  seed: (seat * 2654435761) ^ matchSeed,
  skill: botSkill(seat, matchSeed),
  strafeDir: 0,
  strafeUntil: 0,
  crouchUntil: 0,
  retreatUntil: 0,
  nadeAt: -1e9,
  hurtBy: -1,
  hurtAt: -1e9,
  heardX: 0,
  heardZ: 0,
  heardAt: -1e9,
  seenSeat: -1,
  seenX: 0,
  seenY: 0,
  seenZ: 0,
  seenAt: -1e9,
  spotX: 0,
  spotZ: 0,
  spotFor: NaN,
  sweepX: 0,
  sweepZ: 0,
  sweepUntil: 0,
  skip: [],
  pickId: -1,
  pickTries: 0,
});
const idle = (yaw: number): BotInput => ({
  forward: 0,
  strafe: 0,
  yaw,
  pitch: 0,
  sprint: false,
  walk: false,
  crouch: false,
  fire: false,
  aim: false,
  reload: false,
});

function rand(mind: BotMind) {
  mind.seed = (Math.imul(mind.seed ^ (mind.seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
  return mind.seed / 4294967296;
}
function gauss(mind: BotMind) {
  return (rand(mind) + rand(mind) + rand(mind) - 1.5) * 1.15;
}
const lerp = (r: readonly [number, number], k: number) => r[0] + (r[1] - r[0]) * k;

/** A bot's skill right now: its own, raised in the last circles. Older checkpoints: medium. */
export function effectiveSkill(mind: BotMind, alive: number) {
  let k = mind.skill ?? 0.55;
  for (const [n, bonus] of BOT.endgame)
    if (alive <= n) {
      k += bonus;
      break;
    }
  return Math.min(1, k) * BOT.skillScale;
}

/**
 * Pitch for an overhand throw that reaches a target `dist` metres away and `dy` higher: the
 * grenades' own throw formula (brThrowStart), best of a scan. HE bursts at its fuse (flown
 * flat until then); an incendiary (`lands`) burns where it comes to rest (its roll fitted to the physics).
 */
export function nadePitch(dist: number, dy: number, lands = false) {
  const P = GRENADES.physics;
  const fuse = lands ? Infinity : GRENADES.he.fuseMs / 1000;
  let best = 0.3,
    bestErr = Infinity;
  for (let pitch = -0.3; pitch <= 1.2; pitch += 0.05) {
    const down = (-pitch * 180) / Math.PI;
    const biased = down < 90 ? -10 + down * (100 / 90) : down;
    const speed =
      Math.min(P.maxSpeed, ((90 - biased) * 6 * P.maxSpeed) / 750) *
      (GRENADES.strength.over * 0.7 + 0.3);
    const up = (-biased * Math.PI) / 180;
    const vx = Math.cos(up) * speed,
      vy = Math.sin(up) * speed;
    // Where it is when it lands at the target's height, or when the fuse runs out.
    const disc = vy * vy - 2 * P.gravity * dy;
    const tLand = disc >= 0 ? (vy + Math.sqrt(disc)) / P.gravity : Math.min(fuse, 3);
    const x = lands
      ? vx * tLand + vx * vx * 0.03
      : vx * Math.min(fuse, tLand) + (tLand < fuse ? vx * 0.35 * (fuse - tLand) : 0);
    const err = Math.abs(x - dist);
    if (err < bestErr) {
      bestErr = err;
      best = pitch;
    }
  }
  return best;
}

export type BotView = {
  seat: number;
  body: DropBody;
  kit: Loadout;
  dead: boolean;
};

const levelOf = (id: string | null | undefined) =>
  id ? ((ITEMS[id as keyof typeof ITEMS] as { level?: number }).level ?? 0) : 0;

/** One bot step: the input it sends this tick and the actions (pickup, heal, equip, throw). */
export function botThink(
  mind: BotMind,
  me: BotView,
  others: readonly BotView[],
  loot: LootWorld,
  world: StaticWorld,
  zone: { now: Circle; next: Circle },
  healing: boolean,
  now: number,
  alive = 100,
): { input: BotInput; acts: BrAct[] } {
  const acts: BrAct[] = [];
  const b = me.body;
  const kit = me.kit;
  const gun = activeGun(kit);
  const gd = gun ? (ITEMS[gun.item] as WeaponDef) : null;
  const eye = { x: b.x, y: b.y + eyeHeight(b), z: b.z };
  const input = mind.input;
  const k = effectiveSkill(mind, alive);
  input.fire = false;
  input.reload = false;
  delete input.slot;
  // Keep shooting between decisions (taps in bursts).
  const t = mind.target >= 0 ? others[mind.target] : undefined;
  if (t && !t.dead && gun && now >= mind.reactAt) {
    if (now >= mind.pauseUntil && gun.mag > 0) {
      input.fire = true;
      if (--mind.burstLeft <= 0) {
        mind.burstLeft = Math.round(lerp(BOT.burst, k));
        mind.pauseUntil = now + lerp(BOT.burstPauseMs, k) + rand(mind) * 200;
      }
    }
    // Counter-strafe: better bots stand still while the burst flies (moving shots spread), and
    // move between bursts; weaker ones spray on the move.
    input.strafe = input.fire && k >= BOT.counterStrafeSkill ? 0 : mind.strafeDir;
    if (gun.mag <= 0) input.reload = true;
  }
  if (now < mind.nextDecide) return { input, acts };
  mind.nextDecide = now + BOT.decideMs;

  const awpSlot = kit.guns.findIndex((g) => g?.item === "awp");
  const rifleSlot = kit.guns.findIndex((g) => !!g && g.item !== "awp");
  // Armed but nothing in hand (or the only gun is empty): take a gun with rounds.
  if (!gun && (awpSlot >= 0 || rifleSlot >= 0))
    input.slot = (rifleSlot >= 0 ? rifleSlot : awpSlot) as 0 | 1;

  // 1. Who to fight: whoever shot it, the current target, else the nearest; first in sight.
  const range = Math.max(lerp(BOT.engageM, k), awpSlot >= 0 ? lerp(BOT.awpEngageM, k) : 0);
  const hurt = now - mind.hurtAt < BOT.hurtMemoryMs ? mind.hurtBy : -1;
  const near: Array<{ o: BotView; d: number; pri: number }> = [];
  if (gun || awpSlot >= 0 || rifleSlot >= 0)
    for (const o of others) {
      if (o.dead || o.seat === me.seat || o.body.phase === "plane") continue;
      const d = Math.hypot(o.body.x - b.x, o.body.z - b.z);
      if (d > (o.seat === hurt ? range * 1.6 : range)) continue;
      near.push({ o, d, pri: o.seat === hurt ? 0 : o.seat === mind.target ? 1 : 2 });
    }
  near.sort((x, y) => x.pri - y.pri || x.d - y.d);
  let best: BotView | null = null,
    bestD = 0,
    aimAt = { x: 0, y: 0, z: 0 };
  for (const c of near.slice(0, 3)) {
    const tx = c.o.body.x,
      ty = c.o.body.y + (c.o.body.crouched ? 0.85 : 1.15),
      tz = c.o.body.z;
    const dx = tx - eye.x,
      dy = ty - eye.y,
      dz = tz - eye.z;
    const dist = Math.hypot(dx, dy, dz);
    const hit = world.raycast(eye.x, eye.y, eye.z, dx, dy, dz, dist);
    if (!hit || hit.distance >= dist - 0.4) {
      best = c.o;
      bestD = c.d;
      aimAt = { x: tx, y: ty, z: tz };
      break;
    }
  }
  const retreating = now < mind.retreatUntil;
  if (best && !retreating) {
    mind.seenSeat = best.seat;
    mind.seenX = aimAt.x;
    mind.seenY = aimAt.y;
    mind.seenZ = aimAt.z;
    mind.seenAt = now;
    // Low and holding healing: back off out of sight first (stronger bots do).
    const heals = countOf(kit, "medkit") + countOf(kit, "bandage");
    if (kit.hp < BOT.retreatBelow && heals > 0 && k >= BOT.retreatSkill && !healing) {
      mind.retreatUntil = now + BOT.retreatMs;
      mind.target = -1;
      // Cover the way out: a smoke between it and the enemy, a few metres out.
      const dx = aimAt.x - b.x,
        dz = aimAt.z - b.z,
        d = Math.max(1, Math.hypot(dx, dz));
      const at = { x: b.x + (dx / d) * 6, y: b.y + 1, z: b.z + (dz / d) * 6 };
      if (throwAt(mind, me, at, input, acts, now, ["smoke"])) return { input, acts };
    } else {
      // The right gun for the range.
      if (awpSlot >= 0 && rifleSlot >= 0) {
        if (bestD > BOT.awpBeyondM && kit.active !== awpSlot) input.slot = awpSlot as 0 | 1;
        else if (bestD < BOT.rifleWithinM && kit.active !== rifleSlot)
          input.slot = rifleSlot as 0 | 1;
      }
      if (mind.target !== best.seat) {
        mind.target = best.seat;
        mind.targetSince = now;
        mind.reactAt = now + lerp([lerp(BOT.reactMin, k), lerp(BOT.reactMax, k)], rand(mind));
        mind.burstLeft = Math.round(lerp(BOT.burst, k));
      }
      const settle = Math.min(1, (now - mind.targetSince) / lerp(BOT.settleMs, k));
      const err =
        lerp(BOT.aimFirst, k) + (lerp(BOT.aimSettled, k) - lerp(BOT.aimFirst, k)) * settle;
      const dx = aimAt.x - eye.x,
        dy = aimAt.y - eye.y,
        dz = aimAt.z - eye.z;
      input.yaw = Math.atan2(-dx, -dz) + gauss(mind) * err;
      input.pitch = Math.atan2(dy, Math.hypot(dx, dz)) + gauss(mind) * err * 0.6;
      // Fight movement: hold a strafe direction for a moment, then change it.
      if (now >= mind.strafeUntil) {
        const still = rand(mind) < 0.45 - 0.35 * k;
        mind.strafeDir = still ? 0 : (rand(mind) < 0.5 ? -1 : 1) * (0.5 + 0.4 * rand(mind));
        mind.strafeUntil = now + 500 + rand(mind) * 900;
        if (k > 0.55 && bestD > 25 && rand(mind) < k * 0.5) mind.crouchUntil = now + 900;
      }
      input.forward = 0;
      input.strafe = mind.strafeDir;
      input.crouch = now < mind.crouchUntil;
      input.sprint = false;
      input.walk = false;
      input.aim = gd?.model === "awp" || (k > 0.6 && bestD > 40);
      // A grenade at a target in the open, now and then (stronger bots).
      const kinds = nadeKinds(bestD);
      if (k >= BOT.nadeSkill && kinds && rand(mind) < BOT.nadeChance * k)
        throwAt(mind, me, aimAt, input, acts, now, kinds);
      if (gun && gun.mag <= 0 && ammoFor(kit, gun) > 0) input.reload = true;
      return { input, acts };
    }
  }
  mind.target = -1;
  input.aim = false;
  input.crouch = false;
  input.pitch = 0;
  // 2. Backing off: away from the last enemy seen, then heal out of sight.
  if (retreating) {
    const ax = b.x - mind.seenX,
      az = b.z - mind.seenZ;
    input.yaw = Math.atan2(-ax, -az) + (rand(mind) - 0.5) * 0.6;
    input.forward = 1;
    input.strafe = 0;
    input.sprint = true;
    input.walk = false;
    if (!best && !healing) heal(kit, acts, true);
    return { input, acts };
  }
  // 3. Heal when hurt and nothing is in sight.
  if (!healing && kit.hp < lerp(BOT.healAt, k)) heal(kit, acts, false);
  // 4. Reload between fights, fit plates and attachments carried in the bag.
  if (gun && gd && gun.mag < gd.magazine / 2 && ammoFor(kit, gun) > 0) input.reload = true;
  fitFromBag(kit, acts);
  // 5. An enemy just went behind cover: a grenade there (stronger bots), and push or hold.
  const seenRecently = now - mind.seenAt < BOT.seenMemoryMs && mind.seenSeat >= 0;
  if (seenRecently && !others[mind.seenSeat]?.dead) {
    const d = Math.hypot(mind.seenX - b.x, mind.seenZ - b.z);
    const kinds = nadeKinds(d);
    if (k >= BOT.nadeSkill && kinds) {
      const at = { x: mind.seenX, y: mind.seenY, z: mind.seenZ };
      if (throwAt(mind, me, at, input, acts, now, kinds)) return { input, acts };
    }
    const fightNade = countOf(kit, "grenade-he") + countOf(kit, "grenade-fire") > 0;
    if (
      fightNade &&
      d >= BOT.fireM[1] - 2 &&
      d < BOT.nadePush.m &&
      k >= BOT.nadePush.skill &&
      kit.hp >= BOT.nadePush.hp &&
      now - mind.nadeAt >= BOT.nadeEveryMs
    ) {
      input.yaw = Math.atan2(-(mind.seenX - b.x), -(mind.seenZ - b.z));
      input.forward = 1;
      input.strafe = 0;
      input.sprint = false;
      input.walk = false;
      return { input, acts };
    }
  }
  // 6. Shot at from out of sight: face the shooter.
  if (now - mind.hurtAt < BOT.hurtMemoryMs && mind.hurtBy >= 0) {
    const o = others[mind.hurtBy];
    if (o && !o.dead) {
      input.yaw = Math.atan2(-(o.body.x - b.x), -(o.body.z - b.z));
      input.crouch = k > 0.5;
    }
  }
  // 7. Where to go: its spot in the circle, loot, gunfire worth a look, or a search for a gun.
  const goal = zone.next;
  const key = goal.x * 7 + goal.z * 13 + goal.r;
  if (mind.spotFor !== key) {
    // A spot of its own inside the next circle (older checkpoints: drawn on first use).
    const a = rand(mind) * Math.PI * 2,
      f = lerp(BOT.spotIn, rand(mind)) * (goal.r < 60 ? 0.6 : 1);
    mind.spotX = goal.x + Math.cos(a) * goal.r * f;
    mind.spotZ = goal.z + Math.sin(a) * goal.r * f;
    mind.spotFor = key;
  }
  const dNext = Math.hypot(b.x - goal.x, b.z - goal.z);
  const outNext = dNext > goal.r * lerp(BOT.rotateAt, k);
  const outNow = Math.hypot(b.x - zone.now.x, b.z - zone.now.z) > zone.now.r - 30;
  const armed = kit.guns.some((g) => !!g && (g.mag > 0 || ammoFor(kit, g) > 0));
  const far = dNext - goal.r > BOT.farM;
  let gx: number | null = null,
    gz: number | null = null;
  // The last players standing go looking for each other (a small circle carries footsteps).
  let prey: BotView | null = null;
  if (alive <= BOT.huntAlive && armed && !outNow) {
    let best: number = BOT.huntM;
    for (const o of others) {
      if (o.dead || o.seat === me.seat || o.body.phase === "plane") continue;
      const d = Math.hypot(o.body.x - b.x, o.body.z - b.z);
      if (d < best) {
        best = d;
        prey = o;
      }
    }
  }
  if (prey) {
    gx = prey.body.x;
    gz = prey.body.z;
    mind.goalItem = null;
  } else if (outNow || (armed && ((outNext && !mind.goalItem) || far))) {
    // (Unarmed, only the gas itself stops the search for a gun.)
    gx = mind.spotX;
    gz = mind.spotZ;
    mind.goalItem = null;
  } else {
    mind.skip ??= [];
    let item: WorldItem | undefined =
      mind.goalItem !== null ? loot.items.get(mind.goalItem) : undefined;
    if (!item || !want(kit, item.item)) {
      const pick: { item?: WorldItem; score: number } = { score: 0 };
      // Unarmed: the whole circle (within reason) is worth searching for a gun; in the late
      // game, the nearest gun anywhere it can still reach.
      const reach = armed
        ? BOT.lootRadius
        : alive <= BOT.lateAlive
          ? BOT.lateSearchM
          : Math.min(600, Math.max(BOT.searchRadius, zone.now.r));
      loot.near(b.x, b.z, reach, (i: WorldItem) => {
        if (Math.abs(i.y - b.y) > 6 || mind.skip.includes(i.id)) return;
        const w = want(kit, i.item);
        if (!w) return;
        const sc = w / (1 + Math.hypot(i.x - b.x, i.z - b.z));
        if (sc > pick.score) {
          pick.score = sc;
          pick.item = i;
        }
      });
      item = pick.item;
      mind.goalItem = item?.id ?? null;
    }
    if (item) {
      const d = Math.hypot(item.x - b.x, item.z - b.z);
      // Within a player's reach (the server checks reach and sight); refused a few times: skip.
      if (d < BOT.pickupM && Math.abs(item.y - b.y) < 1.6) {
        mind.pickTries = mind.pickId === item.id ? mind.pickTries + 1 : 1;
        mind.pickId = item.id;
        acts.push({ act: "pickup", id: item.id });
        if (mind.pickTries > 3) skipItem(mind, item.id);
        mind.goalItem = null;
      } else {
        gx = item.x;
        gz = item.z;
      }
    } else if (!armed) {
      // Nothing in reach: sweep the circle for a gun.
      if (now >= mind.sweepUntil || Math.hypot(mind.sweepX - b.x, mind.sweepZ - b.z) < 8) {
        const a = rand(mind) * Math.PI * 2;
        let x = b.x + Math.cos(a) * BOT.sweepM,
          z = b.z + Math.sin(a) * BOT.sweepM;
        const dc = Math.hypot(x - zone.now.x, z - zone.now.z);
        if (dc > zone.now.r * 0.8) {
          x = zone.now.x + ((x - zone.now.x) / dc) * zone.now.r * 0.6;
          z = zone.now.z + ((z - zone.now.z) / dc) * zone.now.r * 0.6;
        }
        mind.sweepX = x;
        mind.sweepZ = z;
        mind.sweepUntil = now + 40_000;
      }
      gx = mind.sweepX;
      gz = mind.sweepZ;
    } else if (
      k >= BOT.investigateSkill &&
      kit.hp >= BOT.investigateHp &&
      !!kit.armour.vest &&
      now - mind.heardAt < BOT.hearMemoryMs &&
      Math.hypot(mind.heardX - goal.x, mind.heardZ - goal.z) < goal.r
    ) {
      gx = mind.heardX;
      gz = mind.heardZ;
    } else if (outNext || Math.hypot(b.x - mind.spotX, b.z - mind.spotZ) > goal.r * 0.5) {
      gx = mind.spotX;
      gz = mind.spotZ;
    } else if (now - mind.heardAt < BOT.hearMemoryMs) {
      // Holding position: look toward the gunfire.
      input.yaw = Math.atan2(-(mind.heardX - b.x), -(mind.heardZ - b.z));
    }
  }
  // Walk to the goal; when stuck against something, take a detour for a moment.
  if (gx !== null && gz !== null) {
    if (now - mind.lastAt > 2000) {
      const moved = Math.hypot(b.x - mind.lastX, b.z - mind.lastZ);
      if (mind.lastAt && moved < 0.6 && now > mind.detourUntil) {
        mind.detourUntil = now + 1500;
        mind.detourYaw = (rand(mind) < 0.5 ? -1 : 1) * (Math.PI / 2);
        // Stuck on the way: leave that item alone from now on.
        if (mind.goalItem !== null) skipItem(mind, mind.goalItem);
        mind.goalItem = null;
      }
      mind.lastX = b.x;
      mind.lastZ = b.z;
      mind.lastAt = now;
    }
    const yaw = Math.atan2(-(gx - b.x), -(gz - b.z));
    input.yaw = yaw + (now < mind.detourUntil ? mind.detourYaw : 0);
    const far = Math.hypot(gx - b.x, gz - b.z);
    input.forward = 1;
    input.strafe = 0;
    input.sprint = far > 25;
    input.walk = far < 3;
    input.crouch = false;
  } else {
    input.forward = 0;
    input.strafe = 0;
    input.sprint = false;
  }
  return { input, acts };
}

function skipItem(mind: BotMind, id: number) {
  mind.skip ??= [];
  if (!mind.skip.includes(id)) mind.skip.push(id);
  if (mind.skip.length > 12) mind.skip.shift();
}

/** Bandages top up, a medkit when low (or when backing off with nothing else). */
function heal(kit: Loadout, acts: BrAct[], backingOff: boolean) {
  const medkits = countOf(kit, "medkit"),
    bandages = countOf(kit, "bandage");
  if (medkits > 0 && (kit.hp < 40 || (backingOff && bandages === 0)))
    acts.push({ act: "heal", item: "medkit" });
  else if (bandages > 0 && kit.hp < 75) acts.push({ act: "heal", item: "bandage" });
}

/** Plates into free plate slots (a vest worn), attachments onto guns that lack them. */
function fitFromBag(kit: Loadout, acts: BrAct[]) {
  for (let i = 0; i < kit.bag.length; i++) {
    const s = kit.bag[i]!;
    const c = ITEMS[s.item].category;
    if (c === "plate" && kit.armour.vest) {
      const free = kit.armour.plates.findIndex((p) => !p);
      if (free >= 0) {
        acts.push({ act: "equip", index: i, target: free });
        return; // indexes shift after an equip: one per decision
      }
    }
    if (c === "optic" || c === "muzzle") {
      const g = kit.guns.findIndex((g) => !!g && !g[c]);
      if (g >= 0) {
        acts.push({ act: "equip", index: i, target: g });
        return;
      }
    }
  }
}

/** How much a bot wants an item (0: not at all). A gun first, then what keeps it alive. */
function want(kit: Loadout, id: string): number {
  const d = ITEMS[id as keyof typeof ITEMS];
  const gun = activeGun(kit);
  const guns = kit.guns.filter(Boolean);
  if (!guns.length) return d.category === "weapon" ? 3 : 0;
  const free = kit.bag.length < capacity(kit);
  switch (d.category) {
    case "weapon": {
      // A second gun only where it adds something: an AWP beside a rifle, a rifle beside an
      // AWP (a second rifle would only take one from a bot that has none).
      if (guns.length >= 2) return 0;
      const hasAwp = guns.some((g) => g!.item === "awp");
      return id === "awp" ? (hasAwp ? 0 : 1.6) : hasAwp ? 1.2 : 0;
    }
    case "ammo": {
      let w = 0;
      for (const g of guns) {
        const gd = ITEMS[g!.item] as WeaponDef;
        if (gd.ammo === id)
          w = Math.max(w, ammoFor(kit, g!) < (id === "ammo-sniper" ? 20 : 90) ? 2 : 0);
      }
      return free ? w : 0;
    }
    case "helmet":
      return levelOf(id) > levelOf(kit.armour.helmet?.item) ? 2 : 0;
    case "vest":
      return levelOf(id) > levelOf(kit.armour.vest?.item) ? 2 : 0;
    case "backpack":
      return levelOf(id) > levelOf(kit.backpack) ? 1.2 : 0;
    case "plate": {
      if (!kit.armour.vest) return 0;
      if (kit.armour.plates.some((p) => !p)) return 1.5;
      return free && countOf(kit, "plate") < 2 ? 0.6 : 0;
    }
    case "heal":
      return free && countOf(kit, "bandage") + countOf(kit, "medkit") < 5 ? 1 : 0;
    case "grenade":
      // Grenades that hurt (HE and incendiary): up to two; one smoke to cover a retreat.
      if (!free) return 0;
      if (id === "grenade-smoke") return countOf(kit, "grenade-smoke") < 1 ? 0.7 : 0;
      return countOf(kit, "grenade-he") + countOf(kit, "grenade-fire") < 2 ? 1.6 : 0;
    case "optic":
      // Scopes suit the AWP, sights the rifles (either fits every gun).
      return kit.guns.some((g) => g && !g.optic)
        ? (gun?.item === "awp") === id.startsWith("scope")
          ? 0.8
          : 0.5
        : 0;
    case "muzzle":
      return kit.guns.some((g) => g && !g.muzzle) ? 0.6 : 0;
    default:
      return 0;
  }
}

/** Which grenades reach an enemy this far away: HE or fire up close, fire only further out. */
function nadeKinds(d: number): ReadonlyArray<"he" | "fire"> | null {
  if (d > BOT.nadeM[0] && d < BOT.nadeM[1]) return ["he", "fire"];
  if (d > BOT.fireM[0] && d < BOT.fireM[1]) return ["fire"];
  return null;
}

/** A grenade at a spot (HE or incendiary at an enemy, smoke to cover a retreat): face it, pitch for the distance. */
function throwAt(
  mind: BotMind,
  me: BotView,
  at: { x: number; y: number; z: number },
  input: BotInput,
  acts: BrAct[],
  now: number,
  kinds: ReadonlyArray<"he" | "fire" | "smoke"> = ["he", "fire"],
) {
  const nade = kinds.find((n) => countOf(me.kit, `grenade-${n}`) > 0) ?? null;
  if (now - mind.nadeAt < BOT.nadeEveryMs || !nade) return false;
  const b = me.body;
  const eyeY = b.y + eyeHeight(b);
  const dist = Math.hypot(at.x - b.x, at.z - b.z);
  input.yaw = Math.atan2(-(at.x - b.x), -(at.z - b.z)) + gauss(mind) * 0.05;
  input.pitch = nadePitch(dist * (0.92 + 0.16 * rand(mind)), at.y - 1 - eyeY, nade === "fire");
  input.fire = false;
  acts.push({ act: "throw", nade, kind: "over" });
  mind.nadeAt = now;
  return true;
}

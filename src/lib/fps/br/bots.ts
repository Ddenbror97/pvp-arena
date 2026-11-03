import { eyeHeight } from "../map";
import type { BrAct } from "./actions";
import { activeGun, ammoFor, countOf, type Loadout } from "./inventory";
import { ITEMS, type WeaponDef } from "./items";
import type { WorldItem } from "./loot";
import type { LootWorld } from "./loot-world";
import type { DropBody } from "./drop";
import type { StaticWorld } from "./static-world";
import type { Circle } from "./zone";

/**
 * Bots on the ground (PLAN §6.6): they play by the same rules as humans, through the same
 * input and actions (movement, E pickups, reload, heal, fire), so nothing a bot does is out of
 * a player's reach. A bot loots what it lands on (a gun first, then ammunition and armour),
 * moves into the zone, and fights what it can see within its range, with a human reaction time
 * and aim error that shrinks while it keeps the target. Decisions run at 5 Hz, staggered by seat.
 */
export const BOT = {
  decideMs: 200,
  lootRadius: 45,
  /** Engage within this range (rifles); AWP bots engage further. */
  engageM: 75,
  awpEngageM: 220,
  /** First reaction to a new target, ms (uniform in the range). */
  reactMs: [450, 850] as const,
  /** Aim error (radians, standard deviation) at first sight and after settling. */
  aimError: [0.05, 0.012] as const,
  /** Ticks the trigger is held per burst (about three rifle shots), then a pause. */
  burst: 9,
  burstPauseMs: 380,
  healBelow: 60,
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
};
export const newBotMind = (seat: number): BotMind => ({
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
  seed: seat * 2654435761,
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

export type BotView = {
  seat: number;
  body: DropBody;
  kit: Loadout;
  dead: boolean;
};

/** One bot step: the input it sends this tick and the actions (pickup, heal) it takes. */
export function botThink(
  mind: BotMind,
  me: BotView,
  others: readonly BotView[],
  loot: LootWorld,
  world: StaticWorld,
  zone: { now: Circle; next: Circle },
  healing: boolean,
  now: number,
): { input: BotInput; acts: BrAct[] } {
  const acts: BrAct[] = [];
  const b = me.body;
  const gun = activeGun(me.kit);
  const gd = gun ? (ITEMS[gun.item] as WeaponDef) : null;
  const eye = { x: b.x, y: b.y + eyeHeight(b), z: b.z };
  const input = mind.input;
  input.fire = false;
  input.reload = false;
  // Keep shooting between decisions (taps in bursts).
  const t = mind.target >= 0 ? others.find((o) => o.seat === mind.target) : undefined;
  if (t && !t.dead && gun && now >= mind.reactAt) {
    if (now >= mind.pauseUntil && gun.mag > 0) {
      input.fire = true;
      if (--mind.burstLeft <= 0) {
        mind.burstLeft = BOT.burst;
        mind.pauseUntil = now + BOT.burstPauseMs + rand(mind) * 200;
      }
    }
    if (gun.mag <= 0) input.reload = true;
  }
  if (now < mind.nextDecide) return { input, acts };
  mind.nextDecide = now + BOT.decideMs;

  // 1. A visible enemy in range: face it (with error), strafe, fire in bursts.
  const range = gd?.model === "awp" ? BOT.awpEngageM : BOT.engageM;
  let best: BotView | null = null,
    bestD = Infinity;
  if (gd)
    for (const o of others) {
      if (o.dead || o.seat === me.seat || o.body.phase === "plane") continue;
      const d = Math.hypot(o.body.x - b.x, o.body.z - b.z);
      if (d < range && d < bestD) {
        best = o;
        bestD = d;
      }
    }
  if (best) {
    const tx = best.body.x,
      ty = best.body.y + 1.15,
      tz = best.body.z;
    const dx = tx - eye.x,
      dy = ty - eye.y,
      dz = tz - eye.z;
    const dist = Math.hypot(dx, dy, dz);
    const hit = world.raycast(eye.x, eye.y, eye.z, dx, dy, dz, dist);
    if (!hit || hit.distance >= dist - 0.4) {
      if (mind.target !== best.seat) {
        mind.target = best.seat;
        mind.targetSince = now;
        mind.reactAt = now + BOT.reactMs[0] + rand(mind) * (BOT.reactMs[1] - BOT.reactMs[0]);
        mind.burstLeft = BOT.burst;
      }
      const settle = Math.min(1, (now - mind.targetSince) / 2500);
      const err = BOT.aimError[0] + (BOT.aimError[1] - BOT.aimError[0]) * settle;
      input.yaw = Math.atan2(-dx, -dz) + gauss(mind) * err;
      input.pitch = Math.atan2(dy, Math.hypot(dx, dz)) + gauss(mind) * err * 0.6;
      input.forward = 0;
      input.strafe = rand(mind) < 0.5 ? -0.6 : 0.6;
      input.sprint = false;
      input.walk = false;
      input.aim = gd?.model === "awp";
      if (gun && gun.mag <= 0 && ammoFor(me.kit, gun) > 0) input.reload = true;
      return { input, acts };
    }
  }
  mind.target = -1;
  input.aim = false;
  input.pitch = 0;
  // 2. Heal when hurt and nothing is in sight.
  if (!healing && me.kit.hp < BOT.healBelow) {
    if (countOf(me.kit, "medkit") > 0 && me.kit.hp < 40) acts.push({ act: "heal", item: "medkit" });
    else if (countOf(me.kit, "bandage") > 0 && me.kit.hp < 75)
      acts.push({ act: "heal", item: "bandage" });
  }
  // 3. Reload between fights.
  if (gun && gd && gun.mag < gd.magazine / 2 && ammoFor(me.kit, gun) > 0) input.reload = true;
  // 4. Outside the next circle: run for it.
  const goal = zone.next;
  const outNext = Math.hypot(b.x - goal.x, b.z - goal.z) > goal.r * 0.85;
  const outNow = Math.hypot(b.x - zone.now.x, b.z - zone.now.z) > zone.now.r - 30;
  let gx: number | null = null,
    gz: number | null = null;
  if (outNow || (outNext && !mind.goalItem)) {
    gx = goal.x;
    gz = goal.z;
    mind.goalItem = null;
  } else {
    // 5. Loot: a gun first, then ammunition for it, then armour, healing, a backpack.
    const want = (id: string) => {
      const d = ITEMS[id as keyof typeof ITEMS];
      if (!gun) return d.category === "weapon" ? 3 : 0;
      if (d.category === "ammo")
        return gd && d === ITEMS[gd.ammo] && ammoFor(me.kit, gun) < 60 ? 2 : 0;
      if (d.category === "helmet") return !me.kit.armour.helmet ? 2 : 0;
      if (d.category === "vest") return !me.kit.armour.vest ? 2 : 0;
      if (d.category === "plate") return me.kit.armour.plates.some((p) => !p) ? 1 : 0;
      if (d.category === "heal")
        return countOf(me.kit, "bandage") + countOf(me.kit, "medkit") < 4 ? 1 : 0;
      if (d.category === "backpack") return !me.kit.backpack ? 1 : 0;
      return 0;
    };
    let item: WorldItem | undefined =
      mind.goalItem !== null ? loot.items.get(mind.goalItem) : undefined;
    if (!item || !want(item.item)) {
      const pick: { item?: WorldItem; score: number } = { score: 0 };
      loot.near(b.x, b.z, BOT.lootRadius, (i: WorldItem) => {
        if (Math.abs(i.y - b.y) > 6) return;
        const w = want(i.item);
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
      if (d < 1.4 && Math.abs(item.y - b.y) < 1.5) {
        acts.push({ act: "pickup", id: item.id });
        mind.goalItem = null;
      } else {
        gx = item.x;
        gz = item.z;
      }
    } else if (outNext) {
      gx = goal.x;
      gz = goal.z;
    }
  }
  // Walk to the goal; when stuck against something, take a detour for a moment.
  if (gx !== null && gz !== null) {
    if (now - mind.lastAt > 2000) {
      const moved = Math.hypot(b.x - mind.lastX, b.z - mind.lastZ);
      if (mind.lastAt && moved < 0.6 && now > mind.detourUntil) {
        mind.detourUntil = now + 1500;
        mind.detourYaw = (rand(mind) < 0.5 ? -1 : 1) * (Math.PI / 2);
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
  } else {
    input.forward = 0;
    input.strafe = 0;
    input.sprint = false;
  }
  return { input, acts };
}

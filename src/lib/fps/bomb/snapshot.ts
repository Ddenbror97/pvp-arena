import { teamOf, spectateTargets } from "./match";
import { SANDGATE } from "./sandgate";
import {
  BOMB_RULES,
  type BombEvent,
  type BombMatchState,
  type BombPlayer,
  type Team,
} from "./rules";
import { canSee } from "./visibility";
import { publicGrenadeWorld, type PublicGrenadeWorld } from "../grenades/world";
import { throwKindOf, type GrenadeType, type ThrowKind } from "../grenades/rules";

/** Hearing ranges for enemy sounds (metres): shots carry far, footsteps much less. */
const HEARING = { shot: 70, step: 25, reload: 12, bomb: 200 } as const;
/** An enemy stays revealed this long after the last frame in sight (no silhouette popping). */
export const BOMB_REVEAL_HOLD_MS = 200;

/** What one recipient may know about one player. */
export type PublicPlayer = Pick<
  BombPlayer,
  "slot" | "group" | "name" | "bot" | "kills" | "deaths" | "assists" | "headshots" | "primary"
> & {
  team: Team;
  alive: boolean;
  /** Pose: present for teammates always, for enemies only while revealed. */
  pose?: Pick<BombPlayer, "x" | "y" | "z" | "yaw" | "pitch" | "crouched" | "velocityY" | "moving">;
  /** Teammates only (and yourself): health, armour, ammunition. */
  hp?: number;
  armor?: number;
  ammo?: number;
  reserve?: number;
  reloading?: boolean;
  /** Teammates only: carries the bomb. */
  carrier?: boolean;
  /** With the pose: a grenade in the hand, and its wind-up while the pin is out. */
  nade?: GrenadeType;
  nadeHold?: ThrowKind;
};

export type BombView = {
  v: 1;
  type: "bomb-snapshot";
  serverNow: number;
  you: number;
  /** The recipient's own full state (prediction, recoil, ammunition). Never another player's. */
  self: Omit<BombPlayer, "damageTo">;
  /** Dead recipients: the living teammate whose view is shown (null: no living teammates). */
  spectating: number | null;
  spectateTargets: number[];
  phase: BombMatchState["phase"];
  phaseEndsAt: number;
  roundEndsAt: number;
  round: number;
  half: 1 | 2;
  score: BombMatchState["score"];
  firstHalf?: BombMatchState["firstHalf"];
  lastRound?: BombMatchState["lastRound"];
  winner: BombMatchState["winner"];
  players: PublicPlayer[];
  /** Grenades in flight, smoke clouds and fires: public (everyone sees a grenade in the air). */
  grenades?: PublicGrenadeWorld;
  bomb:
    | { state: "carried" | "planting"; carrier?: number; plantStartedAt?: number }
    | { state: "dropped"; x?: number; y?: number; z?: number }
    | {
        state: "planted";
        site: "A" | "B";
        explodesAt: number;
        x?: number;
        y?: number;
        z?: number;
        defuser?: number;
        defuseStartedAt?: number;
        defuseMs?: number;
      }
    | { state: "defused" | "exploded"; site: "A" | "B"; x: number; y: number; z: number };
  events: Array<
    | (BombEvent & { slot?: number })
    | {
        type: "sound";
        id?: number;
        kind: string;
        bearing: number;
        gain: number;
        at?: number;
        /** An AWP report (the sound itself gives the weapon away, as in CS; never a position). */
        awp?: true;
      }
  >;
};

/** Per-recipient reveal memory (last time each enemy was in sight). */
export class BombReveal {
  private seenAt = new Map<string, number>();
  visible(
    viewer: number,
    viewerBody: BombPlayer,
    target: BombPlayer,
    now: number,
    smoke?: BombMatchState["grenades"],
  ) {
    const k = `${viewer}:${target.slot}`;
    if (canSee(SANDGATE, viewerBody, target, smoke)) {
      this.seenAt.set(k, now);
      return true;
    }
    return now - (this.seenAt.get(k) ?? -Infinity) <= BOMB_REVEAL_HOLD_MS;
  }
  forget(slot: number) {
    for (const k of [...this.seenAt.keys()])
      if (k.startsWith(`${slot}:`) || k.endsWith(`:${slot}`)) this.seenAt.delete(k);
  }
}

/** The dead player's spectate target, validated: a living teammate, else the first one, else null. */
export function resolveSpectate(state: BombMatchState, slot: number, wanted: number | null) {
  const me = state.players[slot]!;
  if (me.hp > 0) return null;
  const targets = spectateTargets(state, slot);
  if (wanted !== null && targets.includes(wanted)) return wanted;
  return targets[0] ?? null;
}

const bearing = (from: { x: number; z: number; yaw: number }, to: { x: number; z: number }) =>
  Math.atan2(
    Math.sin(Math.atan2(-(to.x - from.x), -(to.z - from.z)) - from.yaw),
    Math.cos(Math.atan2(-(to.x - from.x), -(to.z - from.z)) - from.yaw),
  );

/**
 * Everything one recipient is allowed to know this tick. Enemy poses and positions only while
 * visible (to the recipient, or to the teammate a dead recipient spectates); enemy sounds as a
 * bearing and gain only; the bomb's position to Police only once seen.
 */
export function bombViewFor(
  state: BombMatchState,
  slot: number,
  wantedSpectate: number | null,
  reveal: BombReveal,
  now: number,
): BombView {
  const me = state.players[slot]!;
  const team = teamOf(state, me);
  const spectating = resolveSpectate(state, slot, wantedSpectate);
  const eyes = me.hp > 0 ? me : spectating !== null ? state.players[spectating]! : null;
  const live = state.phase === "live";
  const players: PublicPlayer[] = state.players.map((p) => {
    const mate = teamOf(state, p) === team;
    const base: PublicPlayer = {
      slot: p.slot,
      group: p.group,
      name: p.name,
      bot: p.bot,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      headshots: p.headshots,
      // The primary is visible on the operator (and on the scoreboard), so everyone may know it.
      ...(p.primary ? { primary: p.primary } : {}),
      team: teamOf(state, p),
      alive: p.hp > 0,
    };
    const pose = {
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: p.yaw,
      pitch: p.pitch,
      crouched: !!p.crouched,
      velocityY: p.velocityY ?? 0,
      moving: !!p.moving,
    };
    // What the operator visibly holds (sent only with the pose).
    const held =
      p.weapon === "grenade" && p.nade
        ? {
            nade: p.nade,
            ...(p.nadeHold ? { nadeHold: throwKindOf(p.nadeHold.mask) } : {}),
          }
        : {};
    if (mate) {
      const b = state.bomb;
      return {
        ...base,
        pose,
        hp: p.hp,
        armor: p.armor ?? 0,
        ammo: p.ammo,
        reserve: p.reserve,
        reloading: !!p.reloadUntil,
        ...held,
        ...(team === "terrorist" &&
        (b.state === "carried" || b.state === "planting") &&
        b.carrier === p.slot
          ? { carrier: true }
          : {}),
      };
    }
    // Enemies: freeze time and round end show everyone (spawns are public); live rounds only what
    // the recipient's eyes see.
    const shown =
      p.hp > 0 &&
      (!live || (eyes !== null && reveal.visible(eyes.slot, eyes, p, now, state.grenades)));
    return shown ? { ...base, pose, ...held } : base;
  });
  // ---------------------------------------------------------------- bomb
  const b = state.bomb;
  const seesPoint = (pt: { x: number; y: number; z: number }) =>
    !!eyes &&
    canSee(SANDGATE, eyes, { x: pt.x, y: pt.y - 1.0, z: pt.z, crouched: true }, state.grenades);
  let bomb: BombView["bomb"];
  if (b.state === "carried" || b.state === "planting")
    bomb =
      team === "terrorist"
        ? {
            state: b.state,
            carrier: b.carrier,
            ...(b.state === "planting" ? { plantStartedAt: b.startedAt } : {}),
          }
        : { state: b.state };
  else if (b.state === "dropped")
    bomb = team === "terrorist" || seesPoint(b) ? { ...b } : { state: "dropped" };
  else if (b.state === "planted")
    bomb = {
      state: "planted",
      site: b.site,
      explodesAt: b.explodesAt,
      ...(team === "terrorist" || seesPoint(b) ? { x: b.x, y: b.y, z: b.z } : {}),
      ...(b.defuser !== undefined && (team === "police" || players[b.defuser]?.pose)
        ? {
            defuser: b.defuser,
            defuseStartedAt: b.defuseStartedAt!,
            defuseMs: b.defuseMs ?? BOMB_RULES.defuseMs,
          }
        : {}),
    };
  else bomb = { ...b };
  // ---------------------------------------------------------------- events
  const events: BombView["events"] = [];
  for (const e of state.events) {
    const actor = e.slot !== undefined ? state.players[e.slot] : undefined;
    const friendly = !actor || teamOf(state, actor) === team;
    const publicEvent = [
      "kill",
      "round-start",
      "round-end",
      "live",
      "halftime",
      "second-half",
      "bomb-planted",
      "bomb-defused",
      "bomb-exploded",
      "nade-throw",
      "nade-detonate",
    ].includes(e.type);
    if (friendly || (actor && players[actor.slot]?.pose)) {
      events.push(e);
      continue;
    }
    if (publicEvent) {
      // Public, but never an enemy position.
      const { point: _p, direction: _d, impact: _i, audio: _a, ...rest } = e;
      events.push(rest);
      if (e.type !== "bomb-planted" && e.type !== "bomb-exploded") continue;
    }
    // Hits on the recipient's team are shown (damage direction), without the shooter's position.
    if ((e.type === "hit" || e.type === "headshot") && e.victim !== undefined) {
      const victim = state.players[e.victim]!;
      if (teamOf(state, victim) === team) {
        const { point: _p, ...rest } = e;
        events.push(rest);
        continue;
      }
    }
    // Enemy sounds within earshot: a bearing and gain only.
    const pos = e.audio?.position;
    if (pos && eyes) {
      const range = HEARING[e.audio!.kind as keyof typeof HEARING] ?? 0;
      const d = Math.hypot(pos.x - eyes.x, pos.z - eyes.z);
      if (d < range)
        events.push({
          type: "sound",
          ...(e.id !== undefined ? { id: e.id } : {}),
          kind: e.audio!.kind,
          bearing: +bearing(eyes, pos).toFixed(2),
          gain: +(1 - d / range).toFixed(2),
          ...(e.at !== undefined ? { at: e.at } : {}),
          ...(e.type === "shot" && e.primary === "awp" ? { awp: true as const } : {}),
        });
    }
  }
  return {
    v: 1,
    type: "bomb-snapshot",
    serverNow: now,
    you: slot,
    self: (({ damageTo: _d, ...own }) => own)(me),
    spectating,
    spectateTargets: me.hp > 0 ? [] : spectateTargets(state, slot),
    phase: state.phase,
    phaseEndsAt: state.phaseEndsAt,
    roundEndsAt: state.roundEndsAt,
    round: state.round,
    half: state.half,
    score: state.score,
    ...(state.firstHalf ? { firstHalf: state.firstHalf } : {}),
    ...(state.lastRound ? { lastRound: state.lastRound } : {}),
    winner: state.winner,
    players,
    ...(state.grenades ? { grenades: publicGrenadeWorld(state.grenades)! } : {}),
    bomb,
    events,
  };
}

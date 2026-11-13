import type { BombPlayer, BombEvent } from "./rules";
import type { BombView } from "./snapshot";
import type { GrenadeView } from "../grenades/grenade-timeline";
import { GRENADES, throwKindOf } from "../grenades/rules";

const FIELDS = [
  "slot",
  "x",
  "y",
  "z",
  "yaw",
  "pitch",
  "hp",
  "armor",
  "ammo",
  "reserve",
  "weapon",
  "primary",
  "sidearm",
  "sidearmAmmo",
  "sidearmReserve",
  "reloadUntil",
  "shellStage",
  "lastShotAt",
  "sprayCount",
  "recoilPitch",
  "recoilYaw",
  "recoilUpdatedAt",
  "moving",
  "sprinting",
  "crouched",
  "velocityY",
  "airCrouchOffset",
  "scoped",
  "scopedAt",
  "weaponReadyAt",
  "nextAttackAt",
  "grenades",
  "nade",
  "nadeHold",
  "nadeThrow",
  "defuseKit",
] as const satisfies readonly (keyof BombPlayer)[];
export type SpectatorPov = Pick<BombPlayer, (typeof FIELDS)[number]>;
/** Only the selected living teammate's presentation state; no identity or damage ledger. */
export function spectatorPov(player: BombPlayer): SpectatorPov {
  return structuredClone(
    Object.fromEntries(
      FIELDS.filter((key) => player[key] !== undefined).map((key) => [key, player[key]]),
    ),
  ) as SpectatorPov;
}

/** Match first-person weapon state to the same delayed timeline used by remote movement. */
export class SpectatorPlayback {
  private slot: number | null = null;
  private frames: { at: number; pov: SpectatorPov; bomb: BombView["bomb"] }[] = [];
  private events: BombEvent[] = [];
  private seen = new Set<string>();
  clear() {
    this.slot = null;
    this.frames = [];
    this.events = [];
    this.seen.clear();
  }
  push(view: BombView) {
    if (view.self.hp > 0 || !view.pov || view.pov.slot !== view.spectating) {
      this.clear();
      return;
    }
    if (view.pov.slot !== this.slot) {
      this.clear();
      this.slot = view.pov.slot;
    }
    this.frames.push({ at: view.serverNow, pov: view.pov, bomb: view.bomb });
    if (this.frames.length > 24) this.frames.shift();
    view.events.forEach((event, index) => {
      if (event.type !== "shot" || !("slot" in event) || event.slot !== this.slot) return;
      const key = String(event.id ?? `${view.serverNow}:${index}`);
      if (this.seen.has(key)) return;
      this.seen.add(key);
      this.events.push({ ...event, at: event.at ?? view.serverNow });
    });
    if (this.seen.size > 256) this.seen = new Set([...this.seen].slice(-128));
    this.events = this.events.slice(-64);
  }
  private frame(at: number) {
    let frame = this.frames[0];
    for (const next of this.frames) {
      if (next.at > at) break;
      frame = next;
    }
    return frame;
  }
  sample(at: number): SpectatorPov | null {
    return this.frame(at)?.pov ?? null;
  }
  bomb(at: number) {
    return this.frame(at)?.bomb;
  }
  shots(at: number) {
    const due = this.events.filter((e) => e.at! <= at);
    this.events = this.events.filter((e) => e.at! > at);
    return due;
  }
}

export function spectatorGrenade(p: SpectatorPov, now: number): GrenadeView {
  if (p.weapon !== "grenade" || !p.nade || p.hp <= 0) return { kind: "hidden" };
  const t = p.nadeThrow;
  if (t && now >= t.release)
    return {
      kind: "throw",
      type: p.nade,
      t: (now - t.release) / 1000,
      throw: t.kind,
      air: !!t.air,
    };
  if (p.nadeHold || t)
    return {
      kind: "hold",
      type: p.nade,
      t: Math.max(0, now - (p.nadeHold?.since ?? t!.release - GRENADES.primeMs)) / 1000,
      throw: p.nadeHold ? throwKindOf(p.nadeHold.mask) : t!.kind,
    };
  if (now < (p.weaponReadyAt ?? 0))
    return {
      kind: "equip",
      type: p.nade,
      t: Math.max(0, now - (p.weaponReadyAt! - GRENADES.equipMs)) / 1000,
    };
  return { kind: "ready", type: p.nade, t: now / 1000, move: p.moving ? 1 : 0 };
}

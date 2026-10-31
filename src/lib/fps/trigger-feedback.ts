import type { Player, Weapon } from "./protocol";

/** Server and presentation cadence can differ by one input command. Every
 * map entry has already been presented; permit that bounded phase lead, but
 * never swallow an unrelated later prediction or change accepted fire. */
export function consumeShotPrediction(pending: Map<number, number>, seq: number | undefined) {
  if (seq === undefined) return false;
  let matched = -Infinity;
  let distance = Infinity;
  for (const key of pending.keys()) {
    const gap = Math.abs(seq - key);
    if (key <= seq + 1 && gap < distance) {
      matched = key;
      distance = gap;
    }
  }
  return pending.delete(matched);
}

/** Cosmetic first-shot prediction; never mutates ammunition, recoil or damage. */
export class TriggerFeedback {
  private last = -Infinity;
  private pending = new Map<number, number>();
  reset() {
    this.last = -Infinity;
    this.pending.clear();
  }
  request(
    player: Player,
    weapon: Weapon,
    seq: number,
    now: number,
    serverNow: number,
    interval: number,
  ) {
    for (const [key, at] of this.pending) if (now - at > 2000) this.pending.delete(key);
    if (
      weapon !== player.weapon ||
      this.pending.has(seq) ||
      player.hp <= 0 ||
      player.reloadUntil ||
      player.ammo <= this.pending.size ||
      now - this.last < interval ||
      (this.last === -Infinity && serverNow - player.lastShotAt < interval)
    )
      return false;
    this.last = now;
    this.pending.set(seq, now);
    return true;
  }
  confirm(seq: number | undefined) {
    return consumeShotPrediction(this.pending, seq);
  }
}

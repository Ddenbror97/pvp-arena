import type { Player, Weapon } from "./protocol";

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
      player.hp <= 0 ||
      player.reloadUntil ||
      player.ammo <= this.pending.size ||
      now - this.last < interval ||
      serverNow - player.lastShotAt < interval
    )
      return false;
    this.last = now;
    this.pending.set(seq, now);
    return true;
  }
  confirm(seq: number | undefined) {
    return seq !== undefined && this.pending.delete(seq);
  }
}

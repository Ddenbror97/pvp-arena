import { primaryOf, type Primary } from "./primary";
import type { Player } from "./protocol";

/**
 * The spawn buy menu (B). Practice has no economy: a purchase swaps the primary in the "rifle"
 * slot between the side's rifle (Police M4A1-S / Terrorist AK-47) and the AWP, with a full
 * magazine and reserve. The server alone applies it, only in the buy window: before the round
 * goes live (freeze / countdown / round end), or in the first BUY_TIME_MS of a live round while
 * still within BUY_RADIUS_M of the player's own spawn (CS: buy zone + buy time).
 */
export const BUY_TIME_MS = 20_000;
export const BUY_RADIUS_M = 7;

export type BuyMessage = { v: 1; type: "buy"; item: Primary };

/** Strict wire check of a buy request. */
export function validateBuy(raw: unknown): BuyMessage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  if (Object.keys(data).length !== 3 || data["v"] !== 1 || data["type"] !== "buy") return null;
  return data["item"] === "awp" || data["item"] === "rifle"
    ? { v: 1, type: "buy", item: data["item"] }
    : null;
}

export function buyWindowOpen(options: {
  /** Before the round's fighting starts (countdown / freeze / between rounds). */
  preRound: boolean;
  live: boolean;
  /** Milliseconds since the live round started. */
  sinceLiveMs: number;
  /** Metres from the player to their own spawn. */
  fromSpawn: number;
  alive: boolean;
}) {
  if (!options.alive) return false;
  if (options.preRound) return true;
  return options.live && options.sinceLiveMs <= BUY_TIME_MS && options.fromSpawn <= BUY_RADIUS_M;
}

/**
 * Hand the player a fresh `item`: full magazine and reserve, drawn in the primary slot, no
 * reload or zoom carried over. Returns false when it is already held with full ammunition.
 */
export function applyPurchase(
  p: Player,
  item: Primary,
  stats: { magazine: number; reserve: number },
): boolean {
  if (primaryOf(p) === item && p.ammo === stats.magazine && p.reserve === stats.reserve)
    return false;
  if (item === "awp") p.primary = "awp";
  else delete p.primary;
  p.ammo = stats.magazine;
  p.reserve = stats.reserve;
  p.reloadUntil = 0;
  p.weapon = "rifle";
  delete p.weaponReadyAt;
  delete p.scoped;
  delete p.scopedAt;
  // A fresh weapon fires straight away (no carried-over bolt cycle or spray).
  p.lastShotAt = -1e12;
  p.sprayCount = 0;
  p.recoilPitch = 0;
  p.recoilYaw = 0;
  return true;
}

import { primaryOf, type Primary } from "./primary";
import type { Player } from "./protocol";
import { DEAGLE, giveDeagle } from "./sidearm";

/**
 * The spawn buy menu (B). Equipment is free in both current modes, including cash 1v1 matches:
 * a purchase swaps the primary in the "rifle" slot between the side's rifle (Police M4A1-S /
 * Terrorist AK-47), the AWP, the MP5, the Hunting Rifle and the SPAS-12, with a full magazine and reserve; or (5v5) hands out
 * the Desert Eagle for the sidearm slot (1v1 players always carry one; buying refills it). The server alone applies it, only in the buy window: before the round
 * goes live (freeze / countdown / round end), or in the first BUY_TIME_MS of a live round while
 * still within BUY_RADIUS_M of the player's own spawn (CS: buy zone + buy time).
 */
export const BUY_TIME_MS = 20_000;
export const BUY_RADIUS_M = 7;

export type BuyItem = Primary | "deagle";
export type BuyMessage = { v: 1; type: "buy"; item: BuyItem };
const BUY_ITEMS: readonly BuyItem[] = ["rifle", "awp", "mp5", "hunting", "spas12", "deagle"];

/** Strict wire check of a buy request. */
export function validateBuy(raw: unknown): BuyMessage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  if (Object.keys(data).length !== 3 || data["v"] !== 1 || data["type"] !== "buy") return null;
  return BUY_ITEMS.includes(data["item"] as BuyItem)
    ? { v: 1, type: "buy", item: data["item"] as BuyItem }
    : null;
}

export type BuyWindow = {
  /** Before the round's fighting starts (countdown / freeze / between rounds). */
  preRound: boolean;
  live: boolean;
  /** Milliseconds since the live round started. */
  sinceLiveMs: number;
  /** Metres from the player to their own spawn. */
  fromSpawn: number;
  alive: boolean;
};

/** Why a purchase would be refused right now (null: the buy window is open). */
export function buyBlocked(o: BuyWindow): string | null {
  if (!o.alive) return "You can buy again after you respawn.";
  if (o.preRound) return null;
  if (!o.live) return "Buying opens at the start of the next round.";
  if (o.sinceLiveMs > BUY_TIME_MS)
    return `Buy time is over (the first ${BUY_TIME_MS / 1000} s of a round).`;
  if (o.fromSpawn > BUY_RADIUS_M) return "Go back to your spawn to buy.";
  return null;
}

export const buyWindowOpen = (o: BuyWindow) => buyBlocked(o) === null;

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
  if (item === "rifle") delete p.primary;
  else p.primary = item;
  p.ammo = stats.magazine;
  p.reserve = stats.reserve;
  p.reloadUntil = 0;
  delete p.shellStage;
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

/**
 * Hand the player a fresh Desert Eagle (7 / 35) in the sidearm slot, drawn. Returns false when
 * one is already carried with full ammunition.
 */
export function applySidearmPurchase(p: Player): boolean {
  if (
    p.sidearm === "deagle" &&
    p.sidearmAmmo === DEAGLE.magazine &&
    p.sidearmReserve === DEAGLE.reserve
  )
    return false;
  giveDeagle(p);
  if (p.weapon === "rifle" && p.reloadUntil) {
    p.reloadUntil = 0;
    delete p.shellStage;
  }
  if (p.weapon !== "grenade") {
    p.weapon = "sidearm";
    delete p.weaponReadyAt;
    delete p.scoped;
    delete p.scopedAt;
  }
  p.lastShotAt = -1e12;
  p.sprayCount = 0;
  p.recoilPitch = 0;
  p.recoilYaw = 0;
  return true;
}

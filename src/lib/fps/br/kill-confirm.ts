/**
 * The KILLED confirmation's state (owner, 2026-11-27: "when the player eliminates an enemy,
 * display a prominent blood-red KILLED confirmation ... ensure the kill distance and
 * confirmation come from authoritative game events. Prevent duplicate notifications.").
 *
 * The server's elimination event (combat.ts `elim`, its distance stamped by the match's
 * stampKillDistances) reaches the client by the fast path and in a view; the arena tells each
 * victim's elimination once (br-arena.ts), and this keeps one confirmation per victim seat too.
 */
import type { BrFeed, BrKillWeapon } from "./br-arena";

/** The KILLED confirmation on screen: the latest of the player's kills and the streak. */
export type KillConfirm = {
  /** The victim's seat (a seat is eliminated once a match: the confirmation's identity). */
  seat: number;
  at: number;
  victim: string;
  weapon: BrKillWeapon;
  /** Killer to victim (m), from the server's event; null when it has none. */
  m: number | null;
  /** Kills in a row, each within CONFIRM_STREAK_MS of the last (1: just this one). */
  streak: number;
};

/** How long the KILLED confirmation stays (ms); its CSS animation (br.css .br-kc) is as long. */
export const CONFIRM_MS = 2600;
/** A kill this soon after the last one adds to the streak (ms). */
export const CONFIRM_STREAK_MS = 4000;

/**
 * The confirmation after a "confirm" feed event, or null to leave the current one: a victim
 * seat seen before is ignored (and remembered in `seen`).
 */
export function nextConfirm(
  prev: KillConfirm | null,
  seen: Set<number>,
  e: Extract<BrFeed, { kind: "confirm" }>,
  now: number,
): KillConfirm | null {
  if (seen.has(e.seat)) return null;
  seen.add(e.seat);
  const streak = prev && now - prev.at <= CONFIRM_STREAK_MS ? prev.streak + 1 : 1;
  return { seat: e.seat, at: now, victim: e.victim, weapon: e.weapon, m: e.m, streak };
}

import { useEffect, useSyncExternalStore } from "react";

/**
 * Presentation-only: while a game's reveal animation is still running for a
 * player, balance displays keep the pre-settlement value so a credit that the
 * server has already booked doesn't announce the result before the wheel,
 * strip or coin lands. Balances themselves are never altered. Holds expire on
 * their own (hard cap) so a stalled reveal can't freeze the display.
 */
export const MAX_HOLD_MS = 30_000;

const holds = new Map<string, number>(); // key -> client-clock ms
const subs = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

export function isBalanceHeld(at = Date.now()) {
  for (const until of holds.values()) if (until > at) return true;
  return false;
}

function schedule() {
  clearTimeout(timer);
  const t = Date.now();
  let next = Infinity;
  for (const [k, until] of holds) {
    if (until <= t) holds.delete(k);
    else next = Math.min(next, until);
  }
  if (next !== Infinity)
    timer = setTimeout(
      () => {
        schedule();
        subs.forEach((f) => f());
      },
      next - t + 10,
    );
}

/** Set (or clear with null) a hold, in client-clock ms. */
export function setBalanceHold(key: string, until: number | null) {
  if (until == null) holds.delete(key);
  else holds.set(key, Math.min(until, Date.now() + MAX_HOLD_MS));
  schedule();
  subs.forEach((f) => f());
}

export function useBalanceHeld() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => isBalanceHeld(),
    () => false,
  );
}

/** Hold balance displays until `until` (client-clock ms) while mounted; null releases. */
export function useBalanceHold(key: string, until: number | null) {
  useEffect(() => {
    setBalanceHold(key, until);
    return () => setBalanceHold(key, null);
  }, [key, until]);
}

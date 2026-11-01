export const POOL_SHOT_MS = 30_000;
export const POOL_PRESENCE_MS = 15_000;
export const POOL_RECONNECT_MS = 30_000;
export type PracticeClock = { deadline: number; lastSeen: number; graceUsed: boolean };
export function startPracticeClock(now: number): PracticeClock {
  return { deadline: now + POOL_SHOT_MS, lastSeen: now, graceUsed: false };
}
/** Same presence-aware clock as cash pool: aiming at the table renews the window.
 * An absent seat gets one reconnect grace, then the existing rules handle timeouts.
 */
export function tickPracticeClock(clock: PracticeClock, now: number, present: boolean) {
  const next = { ...clock, lastSeen: present ? now : clock.lastSeen };
  if (now < next.deadline) return { clock: next, timeout: false };
  if (now - next.lastSeen < POOL_PRESENCE_MS)
    return { clock: { ...next, deadline: now + POOL_SHOT_MS }, timeout: false };
  if (!next.graceUsed)
    return {
      clock: { ...next, deadline: now + POOL_RECONNECT_MS, graceUsed: true },
      timeout: false,
    };
  return { clock: next, timeout: true };
}

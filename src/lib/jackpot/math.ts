/** Integer-only money and probability helpers. Amounts are in cents. */

export function formatUsd(cents: number | bigint): string {
  const v = BigInt(cents);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const dollars = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const c = (abs % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}$${dollars}.${c}`;
}

/** Parse a user-typed dollar amount into integer cents. Returns null if invalid. */
export function parseUsdToCents(input: string): number | null {
  const s = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d{1,9}(\.\d{0,2})?$/.test(s)) return null;
  const [d, f = ""] = s.split(".");
  const cents = Number(d) * 100 + Number((f + "00").slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Chance in basis points (1/100 of a percent), floored, from integer amounts. */
export function chanceBps(part: number | bigint, total: number | bigint): number {
  const t = BigInt(total);
  if (t <= 0n) return 0;
  return Number((BigInt(part) * 10000n) / t);
}

export function formatBps(bps: number): string {
  return `${Math.floor(bps / 100)}.${String(bps % 100).padStart(2, "0")}%`;
}

export function formatChance(part: number | bigint, total: number | bigint): string {
  return formatBps(chanceBps(part, total));
}

/** Estimated chance if the user adds `add` to their current `mine` in a pot of `pot`. */
export function estimatedChanceBps(mine: number, pot: number, add: number): number {
  return chanceBps(mine + add, pot + add);
}

/** Mirrors the server timer rule (documentation + tests; the server is authoritative). */
export function nextTimer(
  state: { playerCount: number; startedAtMs: number | null; endAtMs: number | null; maxEndAtMs: number | null },
  nowMs: number,
  isNewPlayer: boolean,
  cfg = { countdown: 60, extension: 10, maxDuration: 180 },
) {
  if (!isNewPlayer) return { ...state };
  const playerCount = state.playerCount + 1;
  if (playerCount === 2) {
    return {
      playerCount,
      startedAtMs: nowMs,
      endAtMs: nowMs + cfg.countdown * 1000,
      maxEndAtMs: nowMs + cfg.maxDuration * 1000,
    };
  }
  if (playerCount > 2 && state.endAtMs != null && state.maxEndAtMs != null) {
    return { ...state, playerCount, endAtMs: Math.min(state.endAtMs + cfg.extension * 1000, state.maxEndAtMs) };
  }
  return { ...state, playerCount };
}

export interface PlayerSlice {
  user_id: string;
  total_amount: number;
}

/** Wheel segments in degrees, proportional to contribution, ordered as given. */
export function wheelSegments<T extends PlayerSlice>(players: T[]) {
  const total = players.reduce((s, p) => s + p.total_amount, 0);
  let acc = 0;
  return players.map((p) => {
    const start = total ? (acc / total) * 360 : 0;
    acc += p.total_amount;
    const end = total ? (acc / total) * 360 : 0;
    return { ...p, start, end };
  });
}

/** Rotation that lands the wheel's top pointer on `ticket` (ticket-proportional position). */
export function landingRotation(ticket: number, pot: number, fullSpins = 6, jitter = 0.5) {
  const angle = pot > 0 ? ((ticket + jitter) / pot) * 360 : 0;
  return fullSpins * 360 + (360 - angle);
}

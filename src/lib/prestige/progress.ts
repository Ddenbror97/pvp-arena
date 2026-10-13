/** Display helpers. XP, level, and claims are decided on the server. */

export function xpFromWagerCents(cents: number): number {
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.floor(cents / 10);
}

export function dollarsFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return Math.floor(xp / 10);
}

export function levelForXp(levels: { level: number; xp_required: number }[], xp: number): number {
  let current = 1;
  for (const row of levels) {
    if (row.xp_required <= xp && row.level >= current) current = row.level;
  }
  return current;
}

export type TimelineState = "done" | "current" | "locked";

export function timelineState(level: number, current: number): TimelineState {
  if (level < current) return "done";
  if (level === current) return "current";
  return "locked";
}

export function formatXp(xp: number): string {
  return Math.max(0, Math.floor(xp)).toLocaleString("en-US");
}

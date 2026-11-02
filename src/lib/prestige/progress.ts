export function dollarsFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return Math.floor(xp / 10);
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

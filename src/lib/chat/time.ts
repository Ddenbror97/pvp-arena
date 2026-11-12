import type { ChatMessage } from "./messages";

/** Follow-up lines from the same player fold under one name and time. */
const BURST_MS = 5 * 60 * 1000;

function localDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function chatDayKey(iso: string, local = true): string {
  const date = new Date(iso);
  if (!local) return date.toISOString().slice(0, 10);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function chatClock(iso: string, local = true): string {
  if (!local) return new Date(iso).toISOString().slice(11, 16);
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function chatDayLabel(iso: string, now = new Date(), local = true): string {
  const date = new Date(iso);
  // The server and hydration render have no browser timezone or clock. Use an absolute
  // UTC label until hydration finishes, then show local days and relative labels.
  if (!local) return date.toISOString().slice(0, 10);
  const diff = Math.round((localDay(now) - localDay(date)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** True when this line continues the previous player's turn. */
export function continuesPlayerTurn(
  prev: ChatMessage | undefined,
  next: ChatMessage,
  local = true,
): boolean {
  if (!prev || prev.user_id !== next.user_id) return false;
  if (chatDayKey(prev.created_at, local) !== chatDayKey(next.created_at, local)) return false;
  const gap = new Date(next.created_at).getTime() - new Date(prev.created_at).getTime();
  return gap >= 0 && gap <= BURST_MS;
}

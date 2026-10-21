import type { ChatMessage } from "./messages";

/** Follow-up lines from the same player fold under one name and time. */
const BURST_MS = 5 * 60 * 1000;

function localDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function chatDayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function chatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function chatDayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const diff = Math.round((localDay(now) - localDay(date)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** True when this line continues the previous player's turn. */
export function continuesPlayerTurn(prev: ChatMessage | undefined, next: ChatMessage): boolean {
  if (!prev || prev.user_id !== next.user_id) return false;
  if (chatDayKey(prev.created_at) !== chatDayKey(next.created_at)) return false;
  const gap = new Date(next.created_at).getTime() - new Date(prev.created_at).getTime();
  return gap >= 0 && gap <= BURST_MS;
}

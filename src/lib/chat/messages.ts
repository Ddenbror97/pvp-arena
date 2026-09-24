import { CHAT_CONFIG, type ChatRoom } from "./config";

export interface ChatMessage {
  id: string;
  game_type: ChatRoom;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  message: string;
  created_at: string;
}

/** Deterministic server order: (created_at, id). */
export function compareMessages(a: ChatMessage, b: ChatMessage): number {
  return a.created_at < b.created_at
    ? -1
    : a.created_at > b.created_at
      ? 1
      : a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0;
}

/** Merge by id (dedupe), sort, and keep only the newest `cap` messages. */
export function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
  cap: number = CHAT_CONFIG.maxClientMessages,
  keepOldest = false,
): ChatMessage[] {
  const map = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  const all = [...map.values()].sort(compareMessages);
  if (all.length <= cap) return all;
  return keepOldest ? all.slice(0, cap) : all.slice(all.length - cap);
}

/** Validates an untrusted broadcast payload; returns null when malformed or for another room. */
export function parseBroadcast(room: ChatRoom, p: unknown): ChatMessage | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  if (o["game_type"] !== room) return null;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : null);
  const id = str("id");
  const user = str("user_id");
  const msg = str("message");
  const at = str("created_at");
  if (
    !id ||
    !user ||
    !msg ||
    !at ||
    msg.length > CHAT_CONFIG.maxLength * 2 ||
    Number.isNaN(Date.parse(at))
  )
    return null;
  return {
    id,
    game_type: room,
    user_id: user,
    display_name: str("display_name") ?? "player",
    avatar_url: str("avatar_url"),
    message: msg,
    created_at: new Date(at).toISOString(),
  };
}

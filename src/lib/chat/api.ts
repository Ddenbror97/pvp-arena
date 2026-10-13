import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { CHAT_CONFIG, CHAT_EVENTS, chatTopic, type ChatRoom } from "./config";

import { compareMessages, mergeMessages, parseBroadcast, type ChatMessage } from "./messages";
export { compareMessages, mergeMessages, parseBroadcast, type ChatMessage };

type Row = {
  id: string;
  game_type: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
};
const toMessage = (r: Row): ChatMessage => ({
  id: r.id,
  game_type: r.game_type as ChatRoom,
  user_id: r.user_id,
  display_name: r.profiles?.username ?? "player",
  avatar_url: r.profiles?.avatar_url ?? null,
  message: r.message,
  created_at: new Date(r.created_at).toISOString(),
});

/** Cursor pagination on (created_at, id), newest first from the database. */
export async function fetchChatPage(room: ChatRoom, before?: ChatMessage): Promise<ChatMessage[]> {
  let q = supabase
    .from("game_chat_messages" as never)
    .select("id, game_type, user_id, message, created_at, profiles(username, avatar_url)")
    .eq("game_type", room)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CHAT_CONFIG.pageSize);
  if (before)
    q = q.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toMessage).reverse();
}

// Last known messages per room, so returning to a page shows chat instantly
// while the server copy is re-fetched (display cache only; server stays authoritative).
const roomCache = new Map<ChatRoom, ChatMessage[]>();
// Last known online count per room, so the header doesn't pop from "Connecting..." to a number.
const onlineCache = new Map<ChatRoom, number>();
// Last connection light. Remounting the chat on another game page must not
// blink the dot gray while the same room subscribes again.
const statusCache = new Map<ChatRoom, "live" | "offline">();
// Whether older history is exhausted. Resetting this on each page hides
// "Start of chat" until the refetch finishes.
const hasMoreCache = new Map<ChatRoom, boolean>();

export function useGameChat(
  room: ChatRoom,
  userId: string | null,
  initial?: { data: ChatMessage[] } | null,
) {
  const [messages, setMessagesState] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      const cached = roomCache.get(room);
      if (cached) return cached;
    }
    return initial?.data ?? [];
  });
  const [historyLoaded, setHistoryLoaded] = useState(
    () => (typeof window !== "undefined" && roomCache.has(room)) || !!initial,
  );
  const setMessages = useCallback(
    (fn: ChatMessage[] | ((cur: ChatMessage[]) => ChatMessage[])) =>
      setMessagesState((cur) => {
        const next = typeof fn === "function" ? fn(cur) : fn;
        roomCache.set(room, next);
        return next;
      }),
    [room],
  );
  const [online, setOnlineState] = useState(() => onlineCache.get(room) ?? 0);
  const setOnline = useCallback(
    (n: number) => {
      onlineCache.set(room, n);
      setOnlineState(n);
    },
    [room],
  );
  const [status, setStatusState] = useState<"idle" | "connecting" | "live" | "offline">(
    () => statusCache.get(room) ?? "idle",
  );
  const setStatus = useCallback(
    (next: "idle" | "connecting" | "live" | "offline") => {
      if (next === "live" || next === "offline") statusCache.set(room, next);
      setStatusState(next);
    },
    [room],
  );
  const [hasMore, setHasMoreState] = useState(() => hasMoreCache.get(room) ?? true);
  const setHasMore = useCallback(
    (next: boolean) => {
      hasMoreCache.set(room, next);
      setHasMoreState(next);
    },
    [room],
  );
  const [loadingOlder, setLoadingOlder] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const reconcile = useCallback(async () => {
    try {
      const latest = await fetchChatPage(room);
      setMessages((cur) => {
        // Drop anything in the latest window that the server no longer shows (moderated while offline).
        const oldest = latest[0];
        const ids = new Set(latest.map((m) => m.id));
        const kept = oldest
          ? cur.filter((m) => compareMessages(m, oldest) < 0 || ids.has(m.id))
          : [];
        return mergeMessages(kept, latest);
      });
      if (latest.length < CHAT_CONFIG.pageSize) setHasMore(false);
      setHistoryLoaded(true);
    } catch {
      /* history is retried on the next reconnect / visibility change */
    }
  }, [room, setMessages, setHasMore]);

  useEffect(() => {
    let disposed = false;
    if (statusCache.get(room) !== "live") setStatus("connecting");
    // Keep messages already painted from the document. An empty cache must not blank them.
    setMessagesState((cur) => roomCache.get(room) ?? cur);
    setHistoryLoaded((loaded) => roomCache.has(room) || loaded);
    // Load history right away, in parallel with the live connection.
    // Logged-out visitors can read the room; only signed-in users publish.
    void reconcile();
    // Online count is computed by the server from signed-in heartbeats (one per user).
    const beat = async () => {
      if (!userId || disposed || document.visibilityState !== "visible") return;
      const { data, error } = await supabase.rpc("chat_heartbeat");
      if (!disposed && !error && typeof data === "number") setOnline(data);
    };
    void beat();
    const presenceTimer = userId ? setInterval(() => void beat(), 25_000) : undefined;

    (async () => {
      if (userId) await supabase.realtime.setAuth();
      if (disposed) return;
      const ch = supabase.channel(chatTopic(room), {
        config: { private: true },
      });
      channelRef.current = ch;
      ch.on("broadcast", { event: CHAT_EVENTS.message }, ({ payload }) => {
        const m = parseBroadcast(room, payload);
        if (m) setMessages((cur) => mergeMessages(cur, [m]));
      })
        .on("broadcast", { event: CHAT_EVENTS.removed }, ({ payload }) => {
          const id = (payload as { id?: unknown })?.id;
          if (typeof id === "string") setMessages((cur) => cur.filter((m) => m.id !== id));
        })
        .subscribe(async (s) => {
          if (disposed) return;
          if (s === "SUBSCRIBED") {
            setStatus("live");
            void reconcile();
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            setStatus("offline");
          }
        });
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void reconcile();
        void beat();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      disposed = true;
      if (presenceTimer) clearInterval(presenceTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [room, userId, reconcile, setMessages, setOnline, setStatus]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || !messages[0]) return;
    setLoadingOlder(true);
    try {
      const older = await fetchChatPage(room, messages[0]);
      if (older.length < CHAT_CONFIG.pageSize) setHasMore(false);
      setMessages((cur) => mergeMessages(cur, older, CHAT_CONFIG.maxClientMessages, true));
    } finally {
      setLoadingOlder(false);
    }
  }, [room, messages, hasMore, loadingOlder]);

  return { messages, historyLoaded, online, status, hasMore, loadingOlder, loadOlder };
}

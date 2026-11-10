import { useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { listenTopic } from "@/lib/live-channel";

/**
 * PvPStrike lobby push. The database announces "a match changed" on a private topic (no data;
 * supabase/proposed/20261110230000_fps_lobby_broadcast.sql) and the lobby reads once, instead
 * of every viewer polling every 5 s. Until that migration is applied the topic is refused:
 * the lobby then stops listening and polls exactly as before.
 */
export const LOBBY_TOPIC = "game:fps-lobby";
/** Reads after announcements are at least this far apart (a busy hour is no worse than polling). */
export const LOBBY_PUSH_MIN_MS = 5000;

/**
 * When to read after an announcement: spread over a second so viewers do not read together,
 * and never sooner than LOBBY_PUSH_MIN_MS after this viewer's last read.
 */
export function lobbyReadDelay(now: number, lastReadAt: number, unit: number) {
  return Math.max(Math.floor(unit * 1000), LOBBY_PUSH_MIN_MS - (now - lastReadAt));
}

/** True while announcements are arriving (the lobby then polls slowly, as a fallback only). */
export function useLobbyFeed(qc: QueryClient): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined,
      lastReadAt = 0,
      stopped = false;
    // listenTopic can report a status before it returns.
    const feed: { stop?: () => void } = {};
    const leave = () => {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      setLive(false);
      queueMicrotask(() => feed.stop?.());
    };
    feed.stop = listenTopic(
      LOBBY_TOPIC,
      () => {
        if (timer || stopped) return;
        timer = setTimeout(
          () => {
            timer = undefined;
            lastReadAt = Date.now();
            void qc.invalidateQueries({ queryKey: ["fps-lobby"] });
          },
          lobbyReadDelay(Date.now(), lastReadAt, Math.random()),
        );
      },
      (status) => {
        if (stopped) return;
        setLive(status === "SUBSCRIBED");
        // Refused (the topic is not set up): no retries, the lobby polls.
        if (status === "CHANNEL_ERROR") leave();
      },
    );
    return leave;
  }, [qc]);
  return live;
}

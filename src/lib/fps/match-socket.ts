/**
 * The match connection the three PvPStrike clients share (1v1, Defuse the Bomb, Battle Royale):
 * ask for a ticket, open the room's socket, answer the room's pings, hand parsed frames to the
 * mode, and reconnect with the mode's back-off until the mode says a close is final. What a
 * frame or a close code means stays with each mode, except one: an anti-cheat restriction
 * (RESTRICTED_CLOSE) is final in every mode and is announced for the fair-play notice.
 */
import { RESTRICTED_CLOSE, RESTRICTED_EVENT } from "./restriction-close";

export type MatchSocketRef = { current: WebSocket | null };

export type MatchSocketLink = {
  ws: WebSocket;
  /** The connection is good (opened, or welcomed): the next back-off starts over. */
  settled(): void;
  /** End the connection for good (version mismatch, an unsupported frame): no reconnect. */
  stop(): void;
};

export type MatchSocketOptions<Ticket> = {
  /** Where the open socket is kept for the mode's senders (null between connections). */
  ref: MatchSocketRef;
  /** `attempt` is 0 on the first connection. */
  connecting(attempt: number): void;
  /** The ticket; a rejection goes to `admitFailed`. */
  admit(): Promise<Ticket>;
  address(ticket: Ticket): string | URL;
  /** A new socket for this ticket, before it opens (per-connection state is reset here). */
  created?(ticket: Ticket): void;
  opened?(link: MatchSocketLink): void;
  /** Longest frame read, in characters. */
  maxFrame: number;
  /** A longer frame: ignored unless the mode ends the connection here. */
  oversize?(link: MatchSocketLink): void;
  /** One parsed frame (never a ping). */
  frame(data: unknown, link: MatchSocketLink, ticket: Ticket): void;
  /** A frame that is not JSON: ignored unless the mode closes the socket here. */
  invalid?(link: MatchSocketLink): void;
  failed?(): void;
  /**
   * The socket closed. The delay before the next connection in ms, or null when the close is
   * final. `attempt` counts the reconnects since the connection was last settled.
   */
  closed(event: CloseEvent, attempt: number, ticket: Ticket): number | null;
  /** No ticket. The delay before the next try (`attempt` starts at 1), or null to stop. */
  admitFailed(error: unknown, attempt: number): number | null;
  /**
   * The room refused REFUSED_LIMIT sockets in a row before any of them opened (the server
   * turns every admission away: 2026-11-14, a database grant missing). Reconnecting stops, so
   * the page does not ask for match after match behind a loading screen that never ends; the
   * mode says so and offers `again`, which starts over.
   */
  unreachable?(again: () => void): void;
};

/** Sockets refused in a row (closed before they opened) before the mode is told it is unreachable. */
export const REFUSED_LIMIT = 4;

export function openMatchSocket<Ticket>(o: MatchSocketOptions<Ticket>) {
  let stopped = false,
    left = false,
    retry: ReturnType<typeof setTimeout> | undefined,
    attempt = 0,
    refused = 0;
  const again = () => {
    if (left) return;
    stopped = false;
    attempt = 0;
    refused = 0;
    clearTimeout(retry);
    void connect();
  };
  const connect = async () => {
    if (stopped) return;
    o.connecting(attempt);
    let ticket: Ticket;
    try {
      ticket = await o.admit();
    } catch (error) {
      if (stopped) return;
      const delay = o.admitFailed(error, ++attempt);
      if (delay === null) stopped = true;
      else retry = setTimeout(() => void connect(), delay);
      return;
    }
    if (stopped) return;
    const ws = new WebSocket(o.address(ticket));
    o.ref.current = ws;
    o.created?.(ticket);
    // A socket replaced or left behind says nothing more.
    const current = () => !stopped && o.ref.current === ws;
    const link: MatchSocketLink = {
      ws,
      settled: () => void (attempt = 0),
      stop: () => void (stopped = true),
    };
    let open = false;
    ws.onopen = () => {
      open = true;
      refused = 0;
      if (current()) o.opened?.(link);
      else ws.close();
    };
    ws.onmessage = (event) => {
      if (!current() || typeof event.data !== "string") return;
      if (event.data.length > o.maxFrame) {
        o.oversize?.(link);
        return;
      }
      let data: { type?: unknown; id?: unknown } | null;
      try {
        data = JSON.parse(event.data);
      } catch {
        o.invalid?.(link);
        return;
      }
      if (!data || typeof data !== "object") {
        o.invalid?.(link);
        return;
      }
      if (data.type === "ping") {
        if (typeof data.id === "string" && data.id.length <= 64 && ws.readyState === 1)
          ws.send(JSON.stringify({ v: 1, type: "pong", id: data.id }));
        return;
      }
      o.frame(data, link, ticket);
    };
    ws.onerror = () => {
      if (current()) o.failed?.();
    };
    ws.onclose = (event) => {
      if (!current()) return;
      o.ref.current = null;
      if (event.code === RESTRICTED_CLOSE) {
        stopped = true;
        o.closed(event, attempt, ticket);
        window.dispatchEvent(new Event(RESTRICTED_EVENT));
        return;
      }
      const delay = o.closed(event, attempt, ticket);
      if (delay === null) return;
      if (!open && ++refused >= REFUSED_LIMIT && o.unreachable) {
        stopped = true;
        o.unreachable(again);
        return;
      }
      attempt++;
      retry = setTimeout(() => void connect(), delay);
    };
  };
  void connect();
  return {
    /** Leave: no reconnect, and the socket's handlers hear nothing more. */
    close(reason: string) {
      stopped = true;
      left = true;
      clearTimeout(retry);
      const ws = o.ref.current;
      o.ref.current = null;
      if (!ws) return;
      ws.onclose = ws.onmessage = ws.onerror = null;
      ws.close(1000, reason);
    },
  };
}

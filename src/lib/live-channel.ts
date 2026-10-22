import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const open = new Map<string, number>();
const lastEvent = new Map<string, number>();

/** A broadcast just arrived on this channel. Polls use it to skip a duplicate read. */
export function noteChannelEvent(name: string, at = Date.now()) {
  lastEvent.set(name, at);
}

export function channelFresh(name: string, withinMs: number, now = Date.now(), liveName = name) {
  if (!channelLive(liveName)) return false;
  const at = lastEvent.get(name);
  return at != null && now - at <= withinMs;
}

/** Reference-counted realtime subscription. Polls read this and back off while a channel is up. */
export function markChannel(name: string, up: boolean) {
  const next = Math.max(0, (open.get(name) ?? 0) + (up ? 1 : -1));
  if (next === 0) open.delete(name);
  else open.set(name, next);
}

export function channelLive(name: string) {
  return open.has(name);
}

type EventListener = (event: string, payload: Record<string, unknown>) => void;
type StatusListener = (status: string) => void;
type Topic = {
  channel: RealtimeChannel | null;
  events: Set<EventListener>;
  statuses: Set<StatusListener>;
  last: string | null;
};

const topics = new Map<string, Topic>();

/**
 * Receive database broadcasts on a private topic. The client returns the same
 * channel for a repeated topic, so every listener shares one subscription and
 * the channel closes with the last listener. Browsers have no publish policy.
 */
export function listenTopic(
  topic: string,
  onEvent: EventListener,
  onStatus?: StatusListener,
): () => void {
  let entry = topics.get(topic);
  if (!entry) {
    const created: Topic = { channel: null, events: new Set(), statuses: new Set(), last: null };
    entry = created;
    topics.set(topic, created);
    void (async () => {
      await supabase.realtime.setAuth();
      if (topics.get(topic) !== created) return;
      const ch = supabase.channel(topic, { config: { private: true } });
      created.channel = ch;
      ch.on("broadcast", { event: "*" }, (msg) => {
        const payload = (msg["payload"] ?? {}) as Record<string, unknown>;
        for (const listener of created.events) listener(String(msg.event), payload);
      }).subscribe((status) => {
        created.last = status;
        for (const listener of created.statuses) listener(status);
      });
    })();
  }
  const current = entry;
  current.events.add(onEvent);
  if (onStatus) {
    current.statuses.add(onStatus);
    if (current.last) onStatus(current.last);
  }
  return () => {
    current.events.delete(onEvent);
    if (onStatus) current.statuses.delete(onStatus);
    if (current.events.size > 0 || topics.get(topic) !== current) return;
    topics.delete(topic);
    if (current.channel) void supabase.removeChannel(current.channel);
    current.channel = null;
  };
}

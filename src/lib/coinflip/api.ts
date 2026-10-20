import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { channelLive, listenTopic, markChannel } from "@/lib/live-channel";
import type { Database } from "@/integrations/supabase/types";

export type CfGame = Database["public"]["Tables"]["coinflip_games"]["Row"];
export type CoinSide = "HEADS" | "TAILS";
type Prof = { username: string; avatar_url: string | null; is_bot?: boolean } | null;
export type CfGameView = CfGame & { creator: Prof; opponent: Prof };

const SELECT =
  "*, creator:profiles!coinflip_games_creator_id_fkey(username, avatar_url), opponent:profiles!coinflip_games_opponent_id_fkey(username, avatar_url)";
const SELECT_BOT =
  "*, creator:profiles!coinflip_games_creator_id_fkey(username, avatar_url, is_bot), opponent:profiles!coinflip_games_opponent_id_fkey(username, avatar_url, is_bot)";

const missingBotColumn = (error: { message?: string } | null) =>
  !!error && /is_bot/i.test(error.message ?? "");

/** Prefer the bot label. If that column is not deployed yet, the room still loads. */
async function loadCoinflips(
  run: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<CfGameView[]> {
  const first = await run(SELECT_BOT);
  if (!first.error) return (first.data ?? []) as CfGameView[];
  if (!missingBotColumn(first.error)) throw first.error;
  const second = await run(SELECT);
  if (second.error) throw second.error;
  return (second.data ?? []) as CfGameView[];
}

async function loadCoinflip(
  run: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<CfGameView | null> {
  const first = await run(SELECT_BOT);
  if (!first.error) return (first.data ?? null) as CfGameView | null;
  if (!missingBotColumn(first.error)) throw first.error;
  const second = await run(SELECT);
  if (second.error) throw second.error;
  return (second.data ?? null) as CfGameView | null;
}

export const opposite = (s: CoinSide): CoinSide => (s === "HEADS" ? "TAILS" : "HEADS");

export async function fetchOpenCoinflips(): Promise<CfGameView[]> {
  return loadCoinflips((columns) =>
    supabase
      .from("coinflip_games")
      .select(columns)
      .eq("status", "WAITING")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
  );
}

/** Games with both players in, so the lobby can show the flip in progress. */
export async function fetchLiveCoinflips(): Promise<CfGameView[]> {
  return loadCoinflips((columns) =>
    supabase
      .from("coinflip_games")
      .select(columns)
      .in("status", ["READY", "FLIPPING", "SETTLEMENT"])
      .order("id", { ascending: false })
      .limit(12),
  );
}

export async function fetchCoinflip(id: number): Promise<CfGameView | null> {
  return loadCoinflip((columns) =>
    supabase.from("coinflip_games").select(columns).eq("id", id).maybeSingle(),
  );
}

export async function fetchRecentCoinflips(limit = 12, offset = 0): Promise<CfGameView[]> {
  return loadCoinflips((columns) =>
    supabase
      .from("coinflip_games")
      .select(columns)
      .eq("status", "COMPLETED")
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1),
  );
}

export async function coinflipCallBot(gameId: number, key: string) {
  // coinflip_call_bot is newer than the generated Database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("coinflip_call_bot", {
    p_game_id: gameId,
    p_idempotency_key: key,
  });
  return {
    data: (data ?? null) as {
      joined?: boolean;
      reason?: string;
      opponent_id?: string;
      duplicate?: boolean;
    } | null,
    error: error as { message: string } | null,
  };
}

export function useCoinflipConfig() {
  return useQuery({
    queryKey: ["coinflip-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coinflip_config").select("*").single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

/** Realtime is only a hint; a dropped socket falls back to the room and lobby polls. */
export function useCoinflipRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    let live = false;
    const setLive = (up: boolean) => {
      if (live === up) return;
      live = up;
      markChannel("coinflip", up);
    };
    const stop = listenTopic(
      "game:coinflip",
      (_event, payload) => {
        const row = payload as { id?: number; status?: string };
        qc.invalidateQueries({ queryKey: ["coinflip-open"] });
        qc.invalidateQueries({ queryKey: ["coinflip-live"] });
        if (row?.id != null) qc.invalidateQueries({ queryKey: ["coinflip", row.id] });
        if (row?.status === "COMPLETED" || row?.status === "CANCELLED") {
          qc.invalidateQueries({ queryKey: ["coinflip-recent"] });
          qc.invalidateQueries({ queryKey: ["coinflip-mine"] });
        }
      },
      (status) => {
        setLive(status === "SUBSCRIBED");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          qc.invalidateQueries({ queryKey: ["coinflip-open"] });
          qc.invalidateQueries({ queryKey: ["coinflip-live"] });
        }
      },
    );
    return () => {
      setLive(false);
      stop();
    };
  }, [qc]);
}

/** Lobby lists already subscribe on the coinflip page. Poll only as a dropped-socket fallback. */
export function coinflipLobbyPollMs(kind: "open" | "live", realtimeUp = channelLive("coinflip")) {
  if (realtimeUp) return 8_000;
  return kind === "live" ? 1_500 : 2_000;
}

/** Start the room fetch and route load, then let navigation proceed. */
export function openRoom(
  qc: import("@tanstack/react-query").QueryClient,
  router: {
    preloadRoute: (o: { to: "/coinflip/$gameId"; params: { gameId: string } }) => Promise<unknown>;
  },
  id: number,
) {
  void qc.prefetchQuery({
    queryKey: ["coinflip", id],
    queryFn: () => fetchCoinflip(id),
    staleTime: 0,
  });
  void router
    .preloadRoute({ to: "/coinflip/$gameId", params: { gameId: String(id) } })
    .catch(() => {});
}

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { markChannel } from "@/lib/live-channel";
import type { Database } from "@/integrations/supabase/types";

export type RlColor = Database["public"]["Enums"]["roulette_color"];
export type RlGame = Database["public"]["Tables"]["roulette_games"]["Row"];
export type RlBet = Database["public"]["Tables"]["roulette_bets"]["Row"] & {
  player: { username: string; avatar_url: string | null } | null;
};
export const COLORS: RlColor[] = ["RED", "BLACK", "YELLOW", "GREEN"];

const IN_FLIGHT: readonly string[] = ["LOCKED", "SPINNING", "SETTLEMENT"];

export async function fetchCurrentRound(): Promise<RlGame | null> {
  const { data, error } = await supabase
    .from("roulette_games")
    .select("*")
    .order("id", { ascending: false })
    .limit(2);
  if (error) throw error;
  const rows = data ?? [];
  // Prefer a round that is locked/spinning over the fresh open one created right after it.
  return rows.find((g) => IN_FLIGHT.includes(g.status)) ?? rows[0] ?? null;
}

/**
 * Applies a realtime row to the cached current round with the same preference as
 * `fetchCurrentRound`, so the screen moves on the push instead of after a refetch.
 */
export function mergeRoundUpdate(cur: RlGame | null | undefined, next: RlGame): RlGame | null {
  if (!cur) return next;
  const a = Number(cur.id);
  const b = Number(next.id);
  if (b === a) return { ...cur, ...next };
  if (b > a) return IN_FLIGHT.includes(cur.status) ? cur : next;
  return IN_FLIGHT.includes(next.status) && !IN_FLIGHT.includes(cur.status) ? next : cur;
}

function isRoundRow(row: unknown): row is RlGame {
  const r = row as Partial<RlGame> | null;
  return !!r && r.id != null && typeof r.status === "string";
}

export async function fetchRoundBets(gameId: number): Promise<RlBet[]> {
  // Safe public summary: excludes internal ledger/idempotency references.
  const { data, error } = await supabase.rpc(
    "roulette_round_bets" as never,
    { p_game_id: gameId } as never,
  );
  if (error) throw error;
  return ((data as unknown) ?? []) as RlBet[];
}

export type RlHistoryRound = Pick<RlGame, "id" | "winning_color">;

export async function fetchHistory(limit = 12): Promise<RlHistoryRound[]> {
  const { data, error } = await supabase
    .from("roulette_games")
    .select("id, winning_color")
    .eq("status", "COMPLETED")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type RlRecentRound = Pick<
  RlGame,
  | "id"
  | "winning_color"
  | "pot_amount"
  | "player_count"
  | "bet_count"
  | "total_payout"
  | "completed_at"
>;

export async function fetchRecentRounds(limit = 20, offset = 0): Promise<RlRecentRound[]> {
  const { data, error } = await supabase
    .from("roulette_games")
    .select("id, winning_color, pot_amount, player_count, bet_count, total_payout, completed_at")
    .eq("status", "COMPLETED")
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRouletteSetup() {
  const [{ data: cfg, error: e1 }, { data: wheels, error: e2 }] = await Promise.all([
    supabase.from("roulette_config").select("*").single(),
    supabase.from("roulette_wheels").select("*"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { cfg, wheels: wheels ?? [] };
}

export function useRouletteSetup() {
  return useQuery({
    queryKey: ["roulette-setup"],
    staleTime: Infinity,
    queryFn: fetchRouletteSetup,
  });
}

/**
 * The pushed row is applied at once so the strip and countdown move on the push.
 * History and bets are reread when a round ends or a bet lands. A dropped socket
 * recovers by refetching when the channel subscribes again.
 */
export function useRouletteRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    let live = false;
    const setLive = (up: boolean) => {
      if (live === up) return;
      live = up;
      markChannel("roulette", up);
    };
    // Coalesce bet-list refreshes so a busy round costs each viewer one read per 2 s at most.
    let betsTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshBets = (id: number) => {
      if (betsTimer) return;
      betsTimer = setTimeout(() => {
        betsTimer = undefined;
        qc.invalidateQueries({ queryKey: ["roulette-bets", id] });
      }, 2000);
    };
    const refetch = () => {
      qc.invalidateQueries({ queryKey: ["roulette-round"] });
      qc.invalidateQueries({ queryKey: ["roulette-history"] });
      qc.invalidateQueries({ queryKey: ["roulette-bets"] });
    };
    const ch = supabase
      .channel("roulette-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "roulette_games" }, (p) => {
        if (isRoundRow(p.new)) {
          const row = p.new;
          const prev = qc.getQueryData<RlGame | null>(["roulette-round"]);
          qc.setQueryData<RlGame | null>(["roulette-round"], (cur) => mergeRoundUpdate(cur, row));
          // Every bet bumps bet_count on the round row; bet rows themselves are RLS-private.
          if (prev?.id === row.id && prev.bet_count !== row.bet_count) refreshBets(row.id);
          if (row.status === "COMPLETED" || row.status === "CANCELLED")
            qc.invalidateQueries({ queryKey: ["roulette-history"] });
        }
      })
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          refetch();
      });
    const onWake = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
      setLive(false);
      clearTimeout(betsTimer);
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

export const multiplierLabel = (bps: number) =>
  `${(bps / 10000).toFixed(bps % 10000 === 0 ? 0 : 1)}x`;

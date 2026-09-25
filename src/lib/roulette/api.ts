import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RlColor = Database["public"]["Enums"]["roulette_color"];
export type RlGame = Database["public"]["Tables"]["roulette_games"]["Row"];
export type RlBet = Database["public"]["Tables"]["roulette_bets"]["Row"] & {
  player: { username: string; avatar_url: string | null } | null;
};
export const COLORS: RlColor[] = ["RED", "BLACK", "YELLOW", "GREEN"];

export async function fetchCurrentRound(): Promise<RlGame | null> {
  const { data, error } = await supabase.from("roulette_games").select("*").order("id", { ascending: false }).limit(2);
  if (error) throw error;
  const rows = data ?? [];
  // Prefer a round that is locked/spinning over the fresh open one created right after it.
  return rows.find((g) => ["LOCKED", "SPINNING", "SETTLEMENT"].includes(g.status)) ?? rows[0] ?? null;
}

export async function fetchRoundBets(gameId: number): Promise<RlBet[]> {
  // Safe public summary: excludes internal ledger/idempotency references.
  const { data, error } = await supabase.rpc("roulette_round_bets" as never, { p_game_id: gameId } as never);
  if (error) throw error;
  return ((data as unknown) ?? []) as RlBet[];
}

export async function fetchHistory(limit = 12): Promise<RlGame[]> {
  const { data, error } = await supabase
    .from("roulette_games")
    .select("*")
    .eq("status", "COMPLETED")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type RlRecentRound = Pick<
  RlGame,
  "id" | "winning_color" | "pot_amount" | "player_count" | "bet_count" | "total_payout" | "completed_at"
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

export function useRouletteSetup() {
  return useQuery({
    queryKey: ["roulette-setup"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: cfg, error: e1 }, { data: wheels, error: e2 }] = await Promise.all([
        supabase.from("roulette_config").select("*").single(),
        supabase.from("roulette_wheels").select("*"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { cfg, wheels: wheels ?? [] };
    },
  });
}

/** Realtime is a hint only; every event refetches authoritative rows. */
export function useRouletteRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("roulette-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "roulette_games" }, () => {
        qc.invalidateQueries({ queryKey: ["roulette-round"] });
        qc.invalidateQueries({ queryKey: ["roulette-history"] });
        // Other players' bets arrive via the round's pot/bet_count update.
        qc.invalidateQueries({ queryKey: ["roulette-bets"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "roulette_bets" }, (p) => {
        const gid = (p.new as { game_id?: number }).game_id;
        if (gid != null) qc.invalidateQueries({ queryKey: ["roulette-bets", gid] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

export const multiplierLabel = (bps: number) => `${(bps / 10000).toFixed(bps % 10000 === 0 ? 0 : 1)}x`;

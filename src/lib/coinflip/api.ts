import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CfGame = Database["public"]["Tables"]["coinflip_games"]["Row"];
export type CoinSide = "HEADS" | "TAILS";
type Prof = { username: string; avatar_url: string | null } | null;
export type CfGameView = CfGame & { creator: Prof; opponent: Prof };

const SELECT = "*, creator:profiles!coinflip_games_creator_id_fkey(username, avatar_url), opponent:profiles!coinflip_games_opponent_id_fkey(username, avatar_url)";

export const opposite = (s: CoinSide): CoinSide => (s === "HEADS" ? "TAILS" : "HEADS");

export async function fetchOpenCoinflips(): Promise<CfGameView[]> {
  const { data, error } = await supabase
    .from("coinflip_games")
    .select(SELECT)
    .eq("status", "WAITING")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as CfGameView[];
}

export async function fetchCoinflip(id: number): Promise<CfGameView | null> {
  const { data, error } = await supabase.from("coinflip_games").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as CfGameView | null;
}

export async function fetchRecentCoinflips(limit = 12): Promise<CfGameView[]> {
  const { data, error } = await supabase
    .from("coinflip_games")
    .select(SELECT)
    .eq("status", "COMPLETED")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as CfGameView[];
}

export async function fetchMyCoinflips(userId: string, limit = 30): Promise<CfGameView[]> {
  const { data, error } = await supabase
    .from("coinflip_games")
    .select(SELECT)
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as CfGameView[];
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

/** Realtime is only a hint; every event triggers a refetch of authoritative rows. */
export function useCoinflipRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("coinflip-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "coinflip_games" }, (payload) => {
        const row = payload.new as { id?: number };
        qc.invalidateQueries({ queryKey: ["coinflip-open"] });
        qc.invalidateQueries({ queryKey: ["coinflip-recent"] });
        qc.invalidateQueries({ queryKey: ["coinflip-mine"] });
        if (row?.id != null) qc.invalidateQueries({ queryKey: ["coinflip", row.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

export function tickCoinflip() {
  return supabase.rpc("coinflip_tick");
}

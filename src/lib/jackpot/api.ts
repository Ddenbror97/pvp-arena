import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Game = Database["public"]["Tables"]["jackpot_games"]["Row"];
export interface PlayerRow {
  game_id: number;
  user_id: string;
  total_amount: number;
  entry_count: number;
  first_entry_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

/** Server clock offset (ms). Countdown is always computed from server timestamps. */
export function useServerClock() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t0 = Date.now();
      const { data } = await supabase.rpc("server_time");
      const t1 = Date.now();
      if (!cancelled && data) setOffset(new Date(data as string).getTime() - (t0 + t1) / 2);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const now = useCallback(() => Date.now() + offset, [offset]);
  return now;
}

export function useNow(intervalMs = 250) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((x) => x + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

export async function fetchOpenGame(): Promise<Game | null> {
  const { data, error } = await supabase
    .from("jackpot_games")
    .select("*")
    .in("status", ["WAITING", "ACTIVE", "DRAWING"])
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    await supabase.rpc("jackpot_tick");
    const r = await supabase.from("jackpot_games").select("*").in("status", ["WAITING", "ACTIVE"]).maybeSingle();
    return r.data ?? null;
  }
  return data;
}

export async function fetchGame(id: number): Promise<Game | null> {
  const { data, error } = await supabase.from("jackpot_games").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPlayers(gameId: number): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from("jackpot_players")
    .select("game_id, user_id, total_amount, entry_count, first_entry_at, profiles(username, avatar_url)")
    .eq("game_id", gameId)
    .order("first_entry_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PlayerRow[];
}

export async function fetchProfiles(ids: string[]) {
  if (!ids.length) return new Map<string, { username: string; avatar_url: string | null }>();
  const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export async function fetchRecentGames(limit = 12) {
  const { data, error } = await supabase
    .from("jackpot_games")
    .select("id, pot_amount, player_count, entry_count, winner_id, winner_total, payout_amount, completed_at")
    .eq("status", "COMPLETED")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const profiles = await fetchProfiles([...new Set((data ?? []).map((g) => g.winner_id!).filter(Boolean))]);
  return (data ?? []).map((g) => ({ ...g, winner: g.winner_id ? profiles.get(g.winner_id) ?? null : null }));
}

export const recentGamesQuery = { queryKey: ["recent-games"], queryFn: () => fetchRecentGames() };

/**
 * Live jackpot: current game + players, kept fresh with realtime. When the
 * shown game completes, `stage` holds it so the reveal can play before
 * moving on to the next open game.
 */
export function useLiveJackpot() {
  const qc = useQueryClient();
  const gameQ = useQuery({ queryKey: ["open-game"], queryFn: fetchOpenGame });
  const [stage, setStage] = useState<Game | null>(null);
  const game = stage ?? gameQ.data ?? null;
  const gameId = game?.id ?? null;
  const playersQ = useQuery({
    queryKey: ["players", gameId],
    queryFn: () => fetchPlayers(gameId!),
    enabled: gameId != null,
  });
  const shownId = useRef<number | null>(null);
  shownId.current = gameQ.data?.id ?? null;

  useEffect(() => {
    const ch = supabase
      .channel("jackpot-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "jackpot_games" }, (payload) => {
        const row = payload.new as Game;
        if (!row?.id) return;
        if (row.id === shownId.current && row.status === "COMPLETED") {
          setStage(row);
          qc.invalidateQueries({ queryKey: ["recent-games"] });
          qc.invalidateQueries({ queryKey: ["wallet"] });
          return;
        }
        if (row.status === "WAITING" || row.status === "ACTIVE" || row.status === "DRAWING") {
          qc.setQueryData(["open-game"], (old: Game | null | undefined) => (!old || row.id >= old.id ? row : old));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "jackpot_players" }, (payload) => {
        const row = payload.new as { game_id?: number };
        if (row?.game_id != null) qc.invalidateQueries({ queryKey: ["players", row.game_id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const finishReveal = useCallback(() => {
    setStage(null);
    qc.invalidateQueries({ queryKey: ["open-game"] });
  }, [qc]);

  return { game, players: playersQ.data ?? [], stage, finishReveal, loading: gameQ.isLoading };
}

export function useWallet(userId: string | null) {
  return useQuery({
    queryKey: ["wallet", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("wallet_accounts").select("id, kind, balance, asset, account_type").eq("owner_id", userId!);
      if (error) throw error;
      const available = data.find((a) => a.kind === "user_available");
      const locked = data.find((a) => a.kind === "user_locked");
      return {
        available: Number(available?.balance ?? 0),
        locked: Number(locked?.balance ?? 0),
        asset: available?.asset ?? "TEST_USD",
        accountType: (available?.account_type ?? "test_credit") as "test_credit" | "real",
        accountIds: data.map((a) => a.id),
      };
    },
  });
}

/** Keep wallet fresh from realtime (RLS limits events to the owner's rows). */
export function useWalletRealtime(userId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`wallet-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_accounts", filter: `owner_id=eq.${userId}` }, () =>
        qc.invalidateQueries({ queryKey: ["wallet", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);
}

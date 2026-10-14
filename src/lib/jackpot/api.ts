import { useCallback, useEffect, useRef, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useBalanceHeld } from "@/lib/balance-hold";
import { channelLive, markChannel } from "@/lib/live-channel";
import {
  inJackpotReveal,
  JACKPOT_SPIN_MS,
  JACKPOT_WINNER_MS,
  jackpotRevealEnds,
  preferJackpotRound,
} from "@/lib/jackpot/reveal";

export type Game = Database["public"]["Tables"]["jackpot_games"]["Row"];
export interface PlayerRow {
  game_id: number;
  user_id: string;
  total_amount: number;
  entry_count: number;
  first_entry_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

// One offset per page load, shared by every game view: remounts start from the
// synced value instead of jumping from the device clock once the RPC returns.
let clockOffset: number | null = null;
let clockSync: Promise<number> | null = null;
async function sampleClock(): Promise<{ rtt: number; offset: number } | null> {
  const t0 = Date.now();
  const { data } = await supabase.rpc("server_time");
  const t1 = Date.now();
  if (!data) return null;
  const server = new Date(data as string).getTime();
  return Number.isFinite(server) ? { rtt: t1 - t0, offset: server - (t0 + t1) / 2 } : null;
}

// The error of one sample is up to half its round trip, so a single slow request
// (cold start, busy radio) would shift every countdown and spin. Keep the fastest of a few.
function syncClock() {
  clockSync ??= (async () => {
    let best: { rtt: number; offset: number } | null = null;
    for (let i = 0; i < 3; i++) {
      const s = await sampleClock().catch(() => null);
      if (s && (!best || s.rtt < best.rtt)) best = s;
      if (best && best.rtt < 150) break;
    }
    if (best) clockOffset = best.offset;
    else clockSync = null;
    return clockOffset ?? 0;
  })();
  return clockSync;
}

/** Server clock offset (ms) in use; server ms - serverOffset() = client ms. */
export const serverOffset = () => clockOffset ?? 0;

/** Server clock offset (ms). Countdown is always computed from server timestamps. */
export function useServerClock() {
  const [offset, setOffset] = useState(serverOffset);
  useEffect(() => {
    let cancelled = false;
    void syncClock().then((o) => {
      if (!cancelled) setOffset(o);
    });
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

const OPEN_ROUND_SELECT =
  "*, jackpot_players(game_id, user_id, total_amount, entry_count, first_entry_at, profiles(username, avatar_url))";

type OpenRoundRow = Game & { jackpot_players?: PlayerRow[] | null };

function splitOpenRound(row: OpenRoundRow | null): { game: Game | null; players: PlayerRow[] } {
  if (!row) return { game: null, players: [] };
  const { jackpot_players: nested, ...game } = row;
  const players = [...(nested ?? [])].sort((a, b) => a.first_entry_at.localeCompare(b.first_entry_at));
  return { game, players };
}

/** Open round and its players in one read. Page HTML uses this and does not settle. */
export async function peekOpenRound(): Promise<{ game: Game | null; players: PlayerRow[] }> {
  const { data, error } = await supabase
    .from("jackpot_games")
    .select(OPEN_ROUND_SELECT)
    .in("status", ["WAITING", "ACTIVE", "DRAWING"])
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return splitOpenRound(data as OpenRoundRow | null);
}

/** Read the open round without settling it. Page HTML uses this; the browser still calls `fetchOpenGame`. */
export async function peekOpenGame(): Promise<Game | null> {
  return (await peekOpenRound()).game;
}

/** Latest settled round that may still be on the wheel. Does not settle anything. */
async function peekSettledRound(): Promise<{ game: Game | null; players: PlayerRow[] }> {
  const since = new Date(Date.now() - JACKPOT_SPIN_MS - JACKPOT_WINNER_MS - 5_000).toISOString();
  const { data, error } = await supabase
    .from("jackpot_games")
    .select(OPEN_ROUND_SELECT)
    .eq("status", "COMPLETED")
    .gte("completed_at", since)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return splitOpenRound(data as OpenRoundRow | null);
}

async function roundWithPlayers(round: { game: Game | null; players: PlayerRow[] }) {
  if (!round.game || round.players.length > 0 || Number(round.game.player_count) < 1) return round;
  return { game: round.game, players: await fetchPlayers(round.game.id) };
}

function chooseShownRound(
  open: { game: Game | null; players: PlayerRow[] },
  settled: { game: Game | null; players: PlayerRow[] },
) {
  const game = preferJackpotRound(open.game, settled.game);
  if (game && settled.game && game.id === settled.game.id) return settled;
  return open;
}

/**
 * The round a viewer should see. A draw that is still spinning or showing its
 * winner stays up, even though the server has already opened the next game.
 * Page HTML uses this and does not settle.
 */
export async function peekShownRound(): Promise<{ game: Game | null; players: PlayerRow[] }> {
  const [open, settled] = await Promise.all([peekOpenRound(), peekSettledRound()]);
  return roundWithPlayers(chooseShownRound(open, settled));
}

export async function fetchOpenRound(): Promise<{ game: Game | null; players: PlayerRow[] }> {
  const [open, settled] = await Promise.all([peekOpenRound(), peekSettledRound()]);
  return roundWithPlayers(chooseShownRound(open, settled));
}

/** One game row for the clock. Players are a separate read. Does not settle. */
export async function fetchLiveGame(): Promise<Game | null> {
  const since = new Date(Date.now() - JACKPOT_SPIN_MS - JACKPOT_WINNER_MS - 5_000).toISOString();
  const [openRes, settledRes] = await Promise.all([
    supabase
      .from("jackpot_games")
      .select("*")
      .in("status", ["WAITING", "ACTIVE", "DRAWING"])
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("jackpot_games")
      .select("*")
      .eq("status", "COMPLETED")
      .gte("completed_at", since)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (openRes.error) throw openRes.error;
  if (settledRes.error) throw settledRes.error;
  return preferJackpotRound(openRes.data, settledRes.data);
}

export async function fetchOpenGame(): Promise<Game | null> {
  return (await fetchOpenRound()).game;
}

export async function fetchGame(id: number): Promise<Game | null> {
  const { data, error } = await supabase
    .from("jackpot_games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPlayers(gameId: number): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from("jackpot_players")
    .select(
      "game_id, user_id, total_amount, entry_count, first_entry_at, profiles(username, avatar_url)",
    )
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

export async function fetchRecentGames(limit = 12, offset = 0) {
  const { data, error } = await supabase
    .from("jackpot_games")
    .select(
      "id, pot_amount, player_count, entry_count, winner_id, winner_total, payout_amount, completed_at",
    )
    .eq("status", "COMPLETED")
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const profiles = await fetchProfiles([
    ...new Set((data ?? []).map((g) => g.winner_id!).filter(Boolean)),
  ]);
  return (data ?? []).map((g) => ({
    ...g,
    winner: g.winner_id ? (profiles.get(g.winner_id) ?? null) : null,
  }));
}

export const recentGamesQuery = { queryKey: ["recent-games"], queryFn: () => fetchRecentGames() };

/**
 * Live jackpot: current game + players, kept fresh with realtime. When the
 * shown game completes, `stage` holds it so the reveal can play before
 * moving on to the next open game.
 */
const PHASE_RANK: Record<string, number> = { DRAWING: 3, ACTIVE: 2, WAITING: 1 };

/**
 * Keep the newer snapshot of the open game. A refetch that started before a
 * realtime update can resolve after it; it must not roll pot, players or
 * status back (updated_at is stamped by the game guard on every change).
 * A tied stamp still cannot put a waiting row back over a started countdown.
 */
export function newerGame(old: Game | null | undefined, next: Game | null): Game | null {
  if (!old || !next) return next;
  if (next.id !== old.id) {
    const now = Date.now();
    const oldOnWheel = inJackpotReveal(old, now);
    const nextOnWheel = inJackpotReveal(next, now);
    if (oldOnWheel && !nextOnWheel) return old;
    if (nextOnWheel && !oldOnWheel) return next;
    return next.id > old.id ? next : old;
  }
  const oldAt = Date.parse(old.updated_at);
  const nextAt = Date.parse(next.updated_at);
  if (Number.isFinite(oldAt) && Number.isFinite(nextAt) && oldAt !== nextAt) {
    return nextAt > oldAt ? next : old;
  }
  const oldRank = PHASE_RANK[old.status] ?? 0;
  const nextRank = PHASE_RANK[next.status] ?? 0;
  if (oldRank !== nextRank) return nextRank > oldRank ? next : old;
  if (Number(next.pot_amount) !== Number(old.pot_amount)) {
    return Number(next.pot_amount) > Number(old.pot_amount) ? next : old;
  }
  if (Number(next.player_count) !== Number(old.player_count)) {
    return Number(next.player_count) > Number(old.player_count) ? next : old;
  }
  const oldEnd = old.scheduled_end_at ? Date.parse(old.scheduled_end_at) : 0;
  const nextEnd = next.scheduled_end_at ? Date.parse(next.scheduled_end_at) : 0;
  if (oldEnd !== nextEnd) return nextEnd > oldEnd ? next : old;
  return next;
}

/**
 * The player rows are written in the same transaction as the countdown.
 * When they arrive first, the cached game row is behind and has no clock yet.
 */
export function playersAheadOfGame(
  game: Pick<Game, "status" | "player_count" | "pot_amount"> | null | undefined,
  players: { total_amount: number }[],
): boolean {
  if (!game || game.status === "COMPLETED" || game.status === "CANCELLED") return false;
  if (players.length > Number(game.player_count)) return true;
  const pot = players.reduce((sum, player) => sum + Number(player.total_amount), 0);
  return pot > Number(game.pot_amount);
}

/**
 * Fallback re-read of the game row when realtime drops the clock.
 * Tightens only while a draw is due. The one-second worker settles.
 */
export function jackpotPollMs(
  game: Pick<Game, "status" | "scheduled_end_at"> | null | undefined,
  realtimeUp = false,
): number | false {
  if (!game) return realtimeUp ? 8000 : 2000;
  if (game.status === "DRAWING") return 1000;
  if (game.status === "ACTIVE") {
    const end = game.scheduled_end_at ? Date.parse(game.scheduled_end_at) : NaN;
    if (Number.isFinite(end) && end - Date.now() <= 5_000) return 1000;
    return realtimeUp ? 8000 : 2000;
  }
  if (game.status === "WAITING") return realtimeUp ? 8000 : 2000;
  return false;
}

export function useLiveJackpot() {
  const qc = useQueryClient();
  const [stage, setStage] = useState<Game | null>(null);
  const stageRef = useRef<Game | null>(null);
  stageRef.current = stage;
  const gameQ = useQuery({
    queryKey: ["open-game"],
    queryFn: () => fetchLiveGame(),
    structuralSharing: (old, next) =>
      newerGame(old as Game | null | undefined, next as Game | null),
    refetchInterval: (q) =>
      jackpotPollMs(q.state.data as Game | null | undefined, channelLive("jackpot")),
    // Don't jump to the next game on tab focus while a draw is pending.
    refetchOnWindowFocus: (q) => {
      const g = q.state.data as Game | null | undefined;
      if (!g || stageRef.current) return false;
      if (g.status === "DRAWING") return false;
      if (g.status === "COMPLETED" && inJackpotReveal(g)) return false;
      if (
        g.status === "ACTIVE" &&
        g.scheduled_end_at &&
        new Date(g.scheduled_end_at).getTime() <= Date.now()
      )
        return false;
      return true;
    },
  });
  const shownId = useRef<number | null>(null);
  const revealed = useRef<Set<number>>(new Set());
  const queried = gameQ.data ?? null;
  // A fresh visit has no stage in memory. The completed row is still the wheel
  // until its server clock runs out, so leaving the page cannot swap in the
  // empty game the server opens at settlement.
  const showingReveal =
    !!queried && inJackpotReveal(queried) && !revealed.current.has(queried.id);
  const shownStage = stage ?? (showingReveal ? queried : null);
  const game = shownStage ?? (queried && queried.status !== "COMPLETED" ? queried : null);
  const gameId = game?.id ?? null;
  const playersQ = useQuery({
    queryKey: ["players", gameId],
    queryFn: () => fetchPlayers(gameId!),
    enabled: gameId != null,
    staleTime: 1_000,
    refetchInterval:
      game?.status === "WAITING" || game?.status === "ACTIVE" || game?.status === "DRAWING"
        ? channelLive("jackpot")
          ? 8_000
          : 4_000
        : false,
  });
  const players = playersQ.data ?? [];
  // The second player can land on the wheel before the game row that carries
  // scheduled_end_at. Re-read that row immediately so every browser shows the clock.
  const gameBehind = playersAheadOfGame(game, players);
  useEffect(() => {
    if (!gameBehind) return;
    void qc.invalidateQueries({ queryKey: ["open-game"] });
  }, [gameBehind, game?.id, game?.player_count, game?.pot_amount, qc]);

  const startReveal = useCallback(
    (row: Game) => {
      if (revealed.current.has(row.id)) return;
      revealed.current.add(row.id);
      setStage(row);
      qc.invalidateQueries({ queryKey: ["recent-games"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    [qc],
  );

  // Coming back mid-spin: the query already holds the settled round. Adopt it
  // so the wheel, the pot and the winner card share one server clock.
  useEffect(() => {
    if (!queried || !inJackpotReveal(queried)) return;
    startReveal(queried);
    const ends = jackpotRevealEnds(queried);
    if (ends == null) return;
    const left = ends - Date.now();
    if (left <= 0) return;
    const id = window.setTimeout(() => {
      setStage(null);
      qc.invalidateQueries({ queryKey: ["open-game"] });
    }, left + 40);
    return () => window.clearTimeout(id);
  }, [queried, qc, startReveal]);

  // If the open game moved on before we saw the previous one complete
  // (missed realtime event, reconnect, refetch), recover its reveal.
  useEffect(() => {
    const nextId = gameQ.data?.id ?? null;
    const prevId = shownId.current;
    shownId.current = nextId;
    if (
      prevId == null ||
      nextId == null ||
      nextId <= prevId ||
      revealed.current.has(prevId) ||
      stageRef.current
    )
      return;
    let cancelled = false;
    (async () => {
      const old = await fetchGame(prevId).catch(() => null);
      if (cancelled || !old || !inJackpotReveal(old)) return;
      const hadPlayers = old.player_count >= 2;
      if (hadPlayers) startReveal(old);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameQ.data?.id, startReveal]);

  useEffect(() => {
    let live = false;
    const setLive = (up: boolean) => {
      if (live === up) return;
      live = up;
      markChannel("jackpot", up);
    };
    const ch = supabase
      .channel("jackpot-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jackpot_games" },
        (payload) => {
          const row = payload.new as Game;
          if (!row?.id) return;
          if (row.id === shownId.current && row.status === "COMPLETED") {
            startReveal(row);
            return;
          }
          if (row.status === "WAITING" || row.status === "ACTIVE" || row.status === "DRAWING") {
            qc.setQueryData(["open-game"], (old: Game | null | undefined) => newerGame(old, row));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jackpot_players" },
        (payload) => {
          const row = payload.new as { game_id?: number };
          if (row?.game_id == null) return;
          void qc.invalidateQueries({ queryKey: ["players", row.game_id] });
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          void qc.invalidateQueries({ queryKey: ["open-game"] });
      });
    return () => {
      setLive(false);
      supabase.removeChannel(ch);
    };
  }, [qc, startReveal]);

  /** Safety net: re-read the shown game directly (in case realtime missed an update). */
  const resync = useCallback(async () => {
    const id = shownId.current;
    if (id == null || stageRef.current) return;
    const row = await fetchGame(id).catch(() => null);
    if (!row) return;
    if (row.status === "COMPLETED") startReveal(row);
    else qc.setQueryData(["open-game"], (old: Game | null | undefined) => newerGame(old, row));
  }, [qc, startReveal]);

  const finishReveal = useCallback(() => {
    setStage(null);
    qc.invalidateQueries({ queryKey: ["open-game"] });
  }, [qc]);

  return {
    game,
    players,
    playersPending: gameQ.isPending || (gameId != null && playersQ.isPending),
    stage: shownStage,
    finishReveal,
    resync,
    loading: gameQ.isLoading,
  };
}

export function useWallet(userId: string | null) {
  useWalletRealtime(userId);
  const held = useBalanceHeld();
  const q = useWalletQuery(userId);
  const shown = useRef({ userId, data: q.data });
  if (!held || shown.current.userId !== userId || shown.current.data === undefined)
    shown.current = { userId, data: q.data };
  return held && shown.current.data !== q.data ? { ...q, data: shown.current.data } : q;
}

function useWalletQuery(userId: string | null) {
  return useQuery({
    ...walletQuery(userId),
    enabled: !!userId,
    // Backup for missed realtime events (e.g. deposits credited by the watcher).
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

export function walletQuery(userId: string | null) {
  return queryOptions({
    queryKey: ["wallet", userId],
    // Lets a route loader's prefetch be reused on mount instead of fetched twice.
    staleTime: 5_000,
    queryFn: async () => {
      // Real USD only. Retired test-credit balances are never shown as money.
      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("id, kind, balance, asset, account_type")
        .eq("owner_id", userId!)
        .eq("account_type", "real");
      if (error) throw error;
      const available = data.find((a) => a.kind === "user_available");
      const locked = data.find((a) => a.kind === "user_locked");
      return {
        available: Number(available?.balance ?? 0),
        locked: Number(locked?.balance ?? 0),
        asset: "USD",
        accountType: "real" as const,
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
    // Unique channel per hook instance so header + page subscriptions don't collide.
    const ch = supabase
      .channel(`wallet-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_accounts", filter: `owner_id=eq.${userId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["wallet", userId] });
          void qc.invalidateQueries({ queryKey: ["stats", userId] });
          void qc.invalidateQueries({ queryKey: ["prestige", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);
}

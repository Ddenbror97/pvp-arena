import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TableState } from "./rules";

// pool_* is newer than the generated Database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type OpenTable = {
  id: number;
  creator_id: string;
  stake: number;
  pot: number;
  fee_bps: number;
  expires_at: string;
  username: string;
  avatar_url: string | null;
};

export type PoolLobby = {
  enabled: boolean;
  fee_bps: number;
  stakes: number[];
  shot_seconds: number;
  open: OpenTable[];
};

export type PoolEvent = {
  seq: number;
  kind: "shot" | "timeout" | "forfeit";
  seat: "A" | "B";
  input: Record<string, unknown> | null;
  state_hash: string;
  event: Record<string, unknown>;
};

export type PoolPerson = { username: string; avatar_url: string | null } | null;

export type PoolView = {
  id: number;
  status: "WAITING" | "STARTING" | "PLAYING" | "COMPLETED" | "CANCELLED";
  stake: number;
  pot: number;
  fee_bps: number;
  fee_amount: number | null;
  payout_amount: number | null;
  creator_id: string;
  opponent_id: string | null;
  server_seed_hash: string;
  server_seed: string | null;
  state: TableState | null;
  state_hash: string | null;
  turn_deadline: string | null;
  winner_id: string | null;
  win_reason: string | null;
  version: number;
  server_now: string;
  cancel_reason: string | null;
  left_by?: string | null;
  creator: PoolPerson;
  opponent: PoolPerson;
  events: PoolEvent[];
  phase_at?: string;
  stand_in?: "A" | "B" | null;
  opens_at?: string | null;
  shot_seconds?: number;
};

export type MyPool = {
  id: number;
  status: PoolView["status"];
  creator_id: string;
  opponent_id: string | null;
  opponent: { username: string } | null;
};

const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Sign in to play.",
  PROFILE_REQUIRED: "Finish your profile first.",
  SELF_EXCLUDED: "Your account is self-excluded.",
  REAL_MONEY_DISABLED: "Real-money play is paused.",
  STAKE_NOT_ALLOWED: "Enter a stake from $1 to $50.",
  INSUFFICIENT_BALANCE: "Not enough available balance.",
  CASH_ONLY_BUY_IN: "Pool uses withdrawable cash. Bonus credit is not a stake.",
  ALREADY_IN_MATCH: "Finish your current match first.",
  TOO_MANY_OPEN_GAMES: "You already have three tables waiting.",
  CANCEL_DISABLED:
    "A waiting table stays open until someone joins. An empty table refunds after 24 hours.",
  MATCH_NOT_OPEN: "That table was just taken, or it closed.",
  OWN_TABLE: "That table is yours. Open it and wait for an opponent.",
  RATE_LIMITED: "Too many new tables. Wait a few minutes.",
  NOT_YOUR_TURN: "It is the other player's shot.",
  TURN_EXPIRED: "The shot clock ran out.",
  CALL_POCKET: "Call a pocket for the 8-ball.",
  ILLEGAL_PLACEMENT: "Place the cue ball in a legal spot.",
  PLACE_CUE: "Place the cue ball first.",
  REPLAY_MISMATCH: "That shot did not replay, so nothing was paid.",
  STATE_DIVERGED: "That shot did not replay, so nothing was paid.",
  RESULT_MISMATCH: "That shot did not replay, so nothing was paid.",
  NO_PENDING_SHOT: "That shot was already settled.",
  REQUEST_FAILED: "The table could not reach the server.",
  SHOT_IN_PROGRESS: "The last shot is still settling.",
  MATCH_NOT_LIVE: "This match is not live.",
  FORBIDDEN: "You are not in this match.",
  SEED_MISMATCH: "The rack did not match the committed seed. Both stakes were refunded.",
  START_FAILED: "The table could not open. Both stakes were refunded.",
  NOT_OPEN_YET: "The rack is still waiting to open.",
  STAND_IN_CLEARED: "That player is back at the table.",
};

export function poolMessage(code: string | null | undefined): string {
  if (!code) return "Something went wrong.";
  return MESSAGES[code] ?? "Something went wrong.";
}

export function money(cents: number | null | undefined): string {
  const v = Number(cents ?? 0) / 100;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export const STAKES = [100, 200, 500, 1000, 2500, 5000] as const;

function unwrap<T>(data: unknown, error: { message: string } | null): T {
  if (error) {
    const code = error.message.match(/[A-Z][A-Z0-9_]{2,}/)?.[0] ?? "REQUEST_FAILED";
    throw new Error(code);
  }
  return data as T;
}

export async function fetchPoolLobby(): Promise<PoolLobby> {
  const { data, error } = await db.rpc("pool_lobby");
  return unwrap<PoolLobby>(data, error);
}

/** The viewer's own table that is still waiting or in progress. */
export async function fetchMyPool(uid: string): Promise<MyPool | null> {
  const { data, error } = await db
    .from("pool_matches")
    .select(
      "id, status, creator_id, opponent_id, opponent:profiles!pool_matches_opponent_id_fkey(username)",
    )
    .or(`creator_id.eq.${uid},opponent_id.eq.${uid}`)
    .in("status", ["WAITING", "STARTING", "PLAYING"])
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as MyPool | null;
}

export async function fetchPoolState(id: number): Promise<PoolView> {
  const { data, error } = await db.rpc("pool_state", { p_match: id });
  return unwrap<PoolView>(data, error);
}

export const poolLeave = (id: number) => db.rpc("pool_leave", { p_match: id });
export async function poolTouch(id: number) {
  const first = await db.rpc("pool_touch", { p_match: id });
  if (!first.error) return first;
  // A stale access token makes the presence call look anonymous. Refresh once and retry.
  if (/jwt|session|auth/i.test(first.error.message)) {
    const refreshed = await supabase.auth.refreshSession();
    if (!refreshed.error) return db.rpc("pool_touch", { p_match: id });
  }
  return first;
}
export const poolNudge = (id: number) => db.rpc("pool_nudge", { p_match: id });

export function usePoolLobby() {
  return useQuery({
    queryKey: ["pool-lobby"],
    queryFn: fetchPoolLobby,
    refetchInterval: 4_000,
  });
}

export function usePoolState(id: number) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["pool-match", id],
    queryFn: () => fetchPoolState(id),
    enabled: Number.isInteger(id) && id > 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "CANCELLED") return false;
      return 1_000;
    },
    // Presence is the 4-second touch while the tab is visible. A hidden tab is away.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) return;
    const channel = supabase
      .channel(`pool-match-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pool_matches", filter: `id=eq.${id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["pool-match", id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, qc]);
  return q;
}

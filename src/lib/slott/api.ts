import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listenTopic, markChannel } from "@/lib/live-channel";

// slot_* tables are newer than the generated Database types; rows are typed here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Prof = { username: string; avatar_url: string | null } | null;

export type SlotStatus = "WAITING" | "ACTIVE" | "SETTLEMENT" | "COMPLETED" | "CANCELLED";

export interface SlotGame {
  id: number;
  status: SlotStatus;
  asset: string;
  account_type: string;
  creator_id: string;
  opponent_id: string | null;
  stake: number;
  p2p_pot: number;
  bonus_total: number;
  bonus_cap: number;
  fee_bps: number;
  base_spins: number;
  max_spins: number;
  spin_ms: number;
  turn_seconds: number;
  protocol_version: string;
  server_seed_hash: string;
  server_seed: string | null;
  next_spin: number;
  score_a: number;
  score_b: number;
  turn_opens_at: string | null;
  turn_deadline: string | null;
  ends_at: string | null;
  created_at: string;
  expires_at: string;
  joined_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  outcome: "WIN" | "DRAW" | "BOMB" | null;
  winner_id: string | null;
  fee_amount: number | null;
  payout_amount: number | null;
}
export type SlotGameView = SlotGame & { creator: Prof; opponent: Prof };

export interface SlotSpin {
  game_id: number;
  spin_no: number;
  seat: "A" | "B";
  player_id: string;
  auto: boolean;
  grid: number[];
  wild_count: number;
  base_score: number;
  line_score: number;
  score: number;
  lines: { line: number; symbol: number; count: number; score: number }[];
  bonus_cents: number;
  created_at: string;
  reveal_at: string;
}

export interface SlotBonusEvent {
  id: string;
  game_id: number;
  spin_no: number;
  triggered_by: string;
  wild_count: number;
  tier: string;
  tier_bps: number;
  requested_cents: number;
  awarded_cents: number;
  pool_before: number;
  pool_after: number;
  status: "AWARDED" | "PAID" | "RETURNED";
  created_at: string;
}

export interface SlotConfig {
  stakes: number[];
  fee_bps: number;
  base_spins: number;
  max_spins: number;
  turn_seconds: number;
  spin_ms: number;
  match_cap_bps: number;
  max_event_bonus_cents: number;
  max_match_bonus_cents: number;
}
export interface SlotTier {
  min_wilds: number;
  tier: string;
  stake_bps: number;
}

const SELECT =
  "*, creator:profiles!slot_games_creator_id_fkey(username, avatar_url), opponent:profiles!slot_games_opponent_id_fkey(username, avatar_url)";
// Explicit columns: browsers are granted these, not idempotency keys.
const SPIN_COLS =
  "game_id, spin_no, seat, player_id, auto, grid, wild_count, base_score, line_score, score, lines, bonus_cents, created_at, reveal_at";
const EVENT_COLS =
  "id, game_id, spin_no, triggered_by, wild_count, tier, tier_bps, requested_cents, awarded_cents, pool_before, pool_after, status, created_at";

function num<T extends object>(row: T, keys: (keyof T)[]): T {
  const out = { ...row };
  for (const k of keys) if (out[k] != null) (out as Record<keyof T, unknown>)[k] = Number(out[k]);
  return out;
}
const GAME_NUM: (keyof SlotGameView)[] = [
  "id",
  "stake",
  "p2p_pot",
  "bonus_total",
  "bonus_cap",
  "fee_amount",
  "payout_amount",
];
const toGame = (r: SlotGameView) => num(r, GAME_NUM);

export async function fetchSlotGame(id: number): Promise<SlotGameView | null> {
  const { data, error } = await db.from("slot_games").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toGame(data) : null;
}

export async function fetchSlotSpins(id: number): Promise<SlotSpin[]> {
  const { data, error } = await db
    .from("slot_spins")
    .select(SPIN_COLS)
    .eq("game_id", id)
    .order("spin_no");
  if (error) throw error;
  return ((data ?? []) as SlotSpin[]).map((s) => num(s, ["game_id", "bonus_cents"]));
}

export async function fetchSlotBonuses(id: number): Promise<SlotBonusEvent[]> {
  const { data, error } = await db
    .from("slot_bonus_events")
    .select(EVENT_COLS)
    .eq("game_id", id)
    .order("spin_no");
  if (error) throw error;
  return ((data ?? []) as SlotBonusEvent[]).map((e) =>
    num(e, ["game_id", "requested_cents", "awarded_cents", "pool_before", "pool_after"]),
  );
}

export async function fetchOpenSlots(): Promise<SlotGameView[]> {
  const { data, error } = await db
    .from("slot_games")
    .select(SELECT)
    .eq("status", "WAITING")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return ((data ?? []) as SlotGameView[]).map(toGame);
}

export async function fetchLiveSlots(): Promise<SlotGameView[]> {
  const { data, error } = await db
    .from("slot_games")
    .select(SELECT)
    .in("status", ["ACTIVE", "SETTLEMENT"])
    .order("id", { ascending: false })
    .limit(12);
  if (error) throw error;
  return ((data ?? []) as SlotGameView[]).map(toGame);
}

/** The viewer's own match that is still open or in progress. */
export async function fetchMySlot(uid: string): Promise<SlotGameView | null> {
  const { data, error } = await db
    .from("slot_games")
    .select(SELECT)
    .or(`creator_id.eq.${uid},opponent_id.eq.${uid}`)
    .in("status", ["WAITING", "ACTIVE", "SETTLEMENT"])
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toGame(data) : null;
}

export async function fetchRecentSlots(limit = 12, offset = 0): Promise<SlotGameView[]> {
  const { data, error } = await db
    .from("slot_games")
    .select(SELECT)
    .eq("status", "COMPLETED")
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return ((data ?? []) as SlotGameView[]).map(toGame);
}

/** Four rows plus the pager still fit under the create card on the fixed desktop lobby. */
export const SLOT_RECENT_PAGE_SIZE = 4;

export async function fetchSlotConfig(): Promise<{ cfg: SlotConfig; tiers: SlotTier[] }> {
  const [c, t] = await Promise.all([
    db.from("slot_config").select("*").single(),
    db.from("slot_bonus_tiers").select("*").order("min_wilds"),
  ]);
  if (c.error) throw c.error;
  if (t.error) throw t.error;
  const cfg = num(c.data as SlotConfig, [
    "fee_bps",
    "max_event_bonus_cents",
    "max_match_bonus_cents",
  ]);
  cfg.stakes = (cfg.stakes ?? []).map(Number);
  return { cfg, tiers: (t.data ?? []) as SlotTier[] };
}

export function useSlotConfig() {
  return useQuery({ queryKey: ["slot-config"], queryFn: fetchSlotConfig, staleTime: 60_000 });
}

/** Realtime is a hint only. Lobby lists refresh on the event; history refreshes when a match ends. */
export function useSlotRealtime(gameId?: number) {
  const qc = useQueryClient();
  useEffect(() => {
    let live = false;
    const setLive = (up: boolean) => {
      if (live === up) return;
      live = up;
      markChannel("slot", up);
    };
    const stop = listenTopic(
      "game:slot",
      (_event, payload) => {
        const row = payload as { id?: number; status?: string };
        qc.invalidateQueries({ queryKey: ["slot-open"] });
        qc.invalidateQueries({ queryKey: ["slot-live"] });
        if (row?.id != null) {
          const id = Number(row.id);
          qc.invalidateQueries({ queryKey: ["slot", id] });
          qc.invalidateQueries({ queryKey: ["slot-spins", id] });
          qc.invalidateQueries({ queryKey: ["slot-bonus", id] });
        }
        if (row?.status === "COMPLETED" || row?.status === "CANCELLED") {
          qc.invalidateQueries({ queryKey: ["slot-recent"] });
          qc.invalidateQueries({ queryKey: ["slot-mine"] });
        }
      },
      (status) => setLive(status === "SUBSCRIBED"),
    );
    return () => {
      setLive(false);
      stop();
    };
  }, [qc, gameId]);
}

export const slotCreate = (stake: number, key: string) =>
  db.rpc("slot_create", { p_stake: stake, p_idempotency_key: key });
export const slotJoin = (id: number, key: string) =>
  db.rpc("slot_join", { p_game_id: id, p_idempotency_key: key });
export const slotSpin = (id: number, spinNo: number, key: string) =>
  db.rpc("slot_spin", { p_game_id: id, p_spin_no: spinNo, p_idempotency_key: key });
export const slotCancel = (id: number) => db.rpc("slot_cancel", { p_game_id: id });

export const seatOf = (
  g: Pick<SlotGame, "creator_id" | "opponent_id">,
  uid: string | null,
): "A" | "B" | null =>
  !uid ? null : uid === g.creator_id ? "A" : uid === g.opponent_id ? "B" : null;
export const turnSeat = (spinNo: number): "A" | "B" => (spinNo % 2 === 1 ? "A" : "B");
export const winAmount = (g: Pick<SlotGame, "p2p_pot" | "fee_bps">) =>
  g.p2p_pot - Math.floor((g.p2p_pot * g.fee_bps) / 10000);

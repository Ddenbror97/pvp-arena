import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listenTopic, markChannel } from "@/lib/live-channel";
import { rememberCommitment } from "./commitments";

export const REFETCH_COALESCE_MS = 250;

// poker_* RPCs are newer than the generated Database types; payloads are typed here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type HandStatus = "COMMIT" | "BETTING" | "SETTLEMENT" | "COMPLETED" | "VOIDED";
export type Street = "PREFLOP" | "FLOP" | "TURN" | "RIVER" | "SHOWDOWN";
export type ActionKind =
  | "POST_SB"
  | "POST_BB"
  | "POST_LIVE"
  | "FOLD"
  | "CHECK"
  | "CALL"
  | "BET"
  | "RAISE"
  | "TIMEOUT_FOLD"
  | "TIMEOUT_CHECK"
  | "BOARD"
  | "VOID";

export interface PokerAction {
  seq: number;
  seat_no: number | null;
  street: Street;
  action: ActionKind;
  amount: number;
  to_amount: number | null;
  all_in: boolean;
  cards: number[] | null;
  at: string;
}

export interface HandPlayer {
  seat_no: number;
  user_id: string;
  deal_index: number;
  start_stack: number;
  stack: number;
  street_bet: number;
  total_bet: number;
  folded: boolean;
  all_in: boolean;
  acted: boolean;
  posts_bb: boolean;
  last_action: string | null;
  link: string;
  reveal: string | null;
  shown_cards: number[] | null;
  hand_name: string | null;
  won: number | null;
  refund: number | null;
  wagered: number | null;
  end_stack: number | null;
}

export interface Pot {
  amount: number;
  fee: number;
  eligible: number[];
  winners: number[];
  shares: Record<string, number>;
}

export interface PokerHand {
  id: number;
  hand_no: number;
  status: HandStatus;
  street: Street;
  button_seat: number;
  sb_seat: number;
  bb_seat: number;
  small_blind: number;
  big_blind: number;
  fee_bps: number;
  current_bet: number;
  last_raise: number;
  to_act: number | null;
  action_deadline: string | null;
  reveal_deadline: string;
  board: number[];
  version: number;
  protocol_version: string;
  server_seed_hash: string;
  server_seed: string | null;
  entropy: string | null;
  pots: Pot[] | null;
  fee_total: number | null;
  next_hand_at: string | null;
  void_reason: string | null;
  voided_by: string[] | null;
  runout_streets: number;
  created_at: string;
  dealt_at: string | null;
  completed_at: string | null;
  players: HandPlayer[];
  actions: PokerAction[];
}

export interface PokerSeat {
  seat_id: number;
  seat_no: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_bot?: boolean;
  stack: number;
  pending: number;
  state: "ACTIVE" | "SITTING_OUT";
  leaving: boolean;
  owes_bb: boolean;
}

export interface Legal {
  seat: number;
  to_call: number;
  can_fold: boolean;
  can_check: boolean;
  can_call: boolean;
  call_amount: number;
  can_raise: boolean;
  min_raise_to: number;
  max_raise_to: number;
  current_bet: number;
}

export interface PokerMe {
  seat_id?: number;
  seat_no?: number;
  stack?: number;
  pending?: number;
  state?: "ACTIVE" | "SITTING_OUT";
  leaving?: boolean;
  chain_link?: string | null;
  owes_bb?: boolean;
  buy_in_total?: number;
  timeouts?: number;
  missed_reveals?: number;
  /** Why the seat is sitting out: the player's own choice, or the server saw them leave. */
  sat_out_reason?: "manual" | "away" | null;
  hand_id?: number;
  hand_seat?: number;
  hole_cards?: number[] | null;
  link?: string;
  revealed?: boolean;
  legal?: Legal | null;
}

export interface RecentHand {
  id: number;
  hand_no: number;
  board: number[];
  fee_total: number;
  completed_at: string;
  pot: number;
  winners: { seat_no: number; username: string; won: number; hand_name: string | null }[];
}

export interface PokerTableInfo {
  id: number;
  type_id: number;
  name: string;
  status: "OPEN" | "CLOSED";
  small_blind: number;
  big_blind: number;
  min_buy_in: number;
  max_buy_in: number;
  max_seats: number;
  fee_bps: number;
  button_seat: number | null;
  hand_count: number;
  seated: number;
  version: number;
  account_type: string;
}

export interface TableState {
  server_time: string;
  config: { enabled: boolean; fee_bps: number; action_seconds: number; reveal_seconds: number };
  table: PokerTableInfo;
  seats: PokerSeat[];
  hand: PokerHand | null;
  last_hand: PokerHand | null;
  recent: RecentHand[];
  me: PokerMe | null;
}

export interface LobbyType {
  id: number;
  label: string;
  category: "Micro" | "Low" | "Mid" | "High" | "VIP";
  small_blind: number;
  big_blind: number;
  min_buy_in: number;
  max_buy_in: number;
  max_seats: number;
  tables: number;
  players: number;
}
export interface LobbyTable {
  id: number;
  type_id: number;
  name: string;
  seated: number;
  max_seats: number;
  hand_count: number;
  live: boolean;
  players: { username: string; avatar_url: string | null; is_bot?: boolean }[];
}
export interface Lobby {
  enabled: boolean;
  fee_bps: number;
  action_seconds: number;
  types: LobbyType[];
  tables: LobbyTable[];
  /** The viewer's open seats. */
  mine?: { table_id: number; name: string; stack: number; state: "ACTIVE" | "SITTING_OUT" }[];
}

/** Lobby result when the poker schema is not deployed to this database yet. */
export const LOBBY_UNAVAILABLE: Lobby = {
  enabled: false,
  fee_bps: 500,
  action_seconds: 20,
  types: [],
  tables: [],
  mine: [],
};

const missingRpc = (e: { code?: string; message?: string } | null) =>
  !!e &&
  (e.code === "PGRST202" ||
    e.code === "42883" ||
    /could not find the function/i.test(e.message ?? ""));

export async function fetchLobby(): Promise<Lobby> {
  const { data, error } = await db.rpc("poker_lobby");
  if (missingRpc(error)) return LOBBY_UNAVAILABLE;
  if (error) throw error;
  return data as Lobby;
}

export async function fetchTableState(id: number): Promise<TableState | null> {
  const { data, error } = await db.rpc("poker_table_state", { p_table: id });
  if (missingRpc(error)) return null;
  if (error) throw error;
  return (data as TableState | null) ?? null;
}

export async function fetchHandDetail(id: number): Promise<PokerHand | null> {
  const { data, error } = await db.rpc("poker_hand_detail", { p_hand: id });
  if (error) throw error;
  return (data as PokerHand | null) ?? null;
}

export async function fetchBuyInInfo(type: number) {
  const { data, error } = await db.rpc("poker_buyin_info", { p_type: type });
  if (error) throw error;
  return data as { available: number; cash: number; min_buy_in: number; max_buy_in: number };
}

type RpcResult<T> = Promise<{ data: T | null; error: { message: string; code?: string } | null }>;

export const pokerSit = (a: {
  table: number | null;
  type: number | null;
  seat: number | null;
  buyIn: number;
  head: string;
  key: string;
}): RpcResult<{ duplicate: boolean; table_id: number; seat_no: number }> =>
  db.rpc("poker_sit", {
    p_table: a.table,
    p_type: a.type,
    p_seat: a.seat,
    p_buy_in: a.buyIn,
    p_chain_head: a.head,
    p_key: a.key,
  });
export const pokerTopUp = (
  table: number,
  amount: number,
): RpcResult<{ ok: boolean; pending: boolean }> =>
  db.rpc("poker_top_up", { p_table: table, p_amount: amount });
export const pokerReveal = (hand: number, value: string): RpcResult<{ ok: boolean }> =>
  db.rpc("poker_reveal", { p_hand: hand, p_value: value });
export const pokerCommitChain = (table: number, head: string): RpcResult<{ ok: boolean }> =>
  db.rpc("poker_commit_chain", { p_table: table, p_head: head });
export const pokerAct = (a: {
  hand: number;
  version: number;
  action: string;
  amount: number;
  key: string;
}): RpcResult<{ ok: boolean; duplicate: boolean }> =>
  db.rpc("poker_act", {
    p_hand: a.hand,
    p_version: a.version,
    p_action: a.action,
    p_amount: a.amount,
    p_key: a.key,
  });
export const pokerSitOut = (
  table: number,
  out: boolean,
  head: string | null,
): RpcResult<{ ok: boolean }> =>
  db.rpc("poker_sit_out", { p_table: table, p_out: out, p_chain_head: head });
export const pokerLeave = (table: number): RpcResult<{ ok: boolean; pending?: boolean }> =>
  db.rpc("poker_leave", { p_table: table });
export const pokerNudge = (table: number): RpcResult<string> =>
  db.rpc("poker_nudge", { p_table: table });
/** Tells the table this seat's player is still here; seats not seen for 20 s sit out before a deal. */
export const pokerHeartbeat = (table: number): RpcResult<null> =>
  db.rpc("poker_heartbeat", { p_table: table });
export const pokerCallBot = (
  table: number,
  key: string,
): RpcResult<{
  ok: boolean;
  joined: boolean;
  reason?: string;
  duplicate?: boolean;
  user_id?: string;
}> => db.rpc("poker_call_bot", { p_table: table, p_key: key });

export function useLobby() {
  return useQuery({ queryKey: ["poker-lobby"], queryFn: fetchLobby, refetchInterval: 10_000 });
}

/**
 * Authoritative table state. Realtime on the table row is a hint to refetch; a short
 * poll covers missed events. Every render comes from `poker_table_state`.
 */
export function useTableState(id: number, userId: string | null) {
  const qc = useQueryClient();
  // A seated player must answer the fairness reveal within seconds even from a background tab,
  // or the hand voids. Spectators stop polling when hidden.
  const seated = !!qc.getQueryData<TableState>(["poker-table", id, userId])?.me;
  const q = useQuery({
    queryKey: ["poker-table", id, userId],
    queryFn: () => fetchTableState(id),
    refetchInterval: (query) => (query.state.data?.hand ? 1500 : 3000),
    refetchIntervalInBackground: seated,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const lastVersion = useRef<number | null>(null);
  const current = q.data?.hand;
  useEffect(() => {
    if (current && (current.status === "COMMIT" || current.status === "BETTING"))
      rememberCommitment(current.id, current.server_seed_hash);
  }, [current]);
  useEffect(() => {
    let live = false;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const setLive = (up: boolean) => {
      if (live === up) return;
      live = up;
      markChannel("poker", up);
    };
    const stop = listenTopic(
      `poker:table:${id}`,
      (_event, payload) => {
        const v = Number((payload as { version?: number }).version);
        if (lastVersion.current !== null && v <= lastVersion.current) return;
        lastVersion.current = v;
        // Hidden tabs throttle timers to a second or more, longer than the reveal window allows.
        if (document.hidden) {
          void qc.invalidateQueries({ queryKey: ["poker-table", id] });
          return;
        }
        // One refetch per burst of version bumps.
        if (pending) return;
        pending = setTimeout(() => {
          pending = null;
          void qc.invalidateQueries({ queryKey: ["poker-table", id] });
        }, REFETCH_COALESCE_MS);
      },
      (status) => setLive(status === "SUBSCRIBED"),
    );
    return () => {
      if (pending) clearTimeout(pending);
      setLive(false);
      stop();
    };
  }, [qc, id]);
  return q;
}

/** Hand being shown: the live hand, else the last finished one until the next opens. */
export const shownHand = (s: TableState | null | undefined): PokerHand | null =>
  s?.hand ?? s?.last_hand ?? null;

export const potTotal = (h: PokerHand | null) =>
  h
    ? h.players.reduce(
        (sum, p) => sum + p.total_bet - (h.status === "COMPLETED" ? 0 : p.street_bet),
        0,
      )
    : 0;

export function money(cents: number | null | undefined) {
  const v = Number(cents ?? 0) / 100;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Sign in to play.",
  PROFILE_REQUIRED: "Finish your profile first.",
  SELF_EXCLUDED: "Your account is self-excluded.",
  POKER_DISABLED: "Poker tables are closed right now.",
  REAL_MONEY_DISABLED: "Real-money play is paused.",
  INVALID_BUY_IN: "That buy-in is outside this table's range.",
  INSUFFICIENT_BALANCE: "Not enough balance for that buy-in.",
  TOO_MANY_TABLES: "You're already seated at the maximum number of tables.",
  TABLE_CAP_REACHED: "All tables are in play right now. Join an open seat or try again shortly.",
  ALREADY_SEATED: "You're already seated at this table.",
  SEAT_TAKEN: "That seat was just taken.",
  TABLE_FULL: "This table is full.",
  TABLE_CLOSED: "This table has closed.",
  CHAIN_REUSED: "Fairness chain already used. Try again.",
  VOID_COOLDOWN:
    "Several of your recent hands were cancelled because your browser didn't respond. You can sit again within 24 hours.",
  NOT_YOUR_TURN: "It's not your turn.",
  STALE_STATE: "The table moved on. Try again.",
  ACTION_EXPIRED: "Your time ran out.",
  BELOW_MIN_RAISE: "Raise is below the minimum.",
  RAISE_NOT_ALLOWED: "Raising isn't allowed here.",
  CANNOT_CHECK: "You can't check; there's a bet to call.",
  ABOVE_MAX_BUY_IN: "That would exceed the table's maximum buy-in.",
  BELOW_MIN_BUY_IN: "Top up to at least the table minimum.",
  TOP_UP_REQUIRED: "Top up before sitting back in.",
  LEAVING: "You're leaving this table.",
  RATE_LIMITED: "Too many requests. Wait a moment and try again.",
  BOTS_DISABLED: "Automated opponents are not available right now.",
  BOT_UNFUNDED: "No automated opponent is available for that buy-in.",
  BOT_EXPOSURE_LIMIT: "No automated opponent is available for that buy-in.",
  BOT_TABLE_FULL: "This table already has the maximum number of bots.",
  BOTS_BUSY: "Every automated opponent is already seated.",
  NO_SEAT: "That seat was just taken.",
  NOT_SEATED: "Take a seat before calling a bot.",
  BOT_NOT_WITHDRAWABLE: "Bot balances can't be withdrawn.",
};

export function pokerError(e: { message?: string } | null | undefined) {
  const msg = e?.message ?? "";
  const code = Object.keys(MESSAGES).find((k) => msg.includes(k));
  return code ? MESSAGES[code]! : "Something went wrong. Try again.";
}

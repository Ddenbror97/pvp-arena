import { supabase } from "@/integrations/supabase/client";
import type { DuelLobbyData, DuelView } from "./quote";
type Rpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
};
const db = supabase as unknown as Rpc;

export async function fetchDuelLobby(): Promise<DuelLobbyData> {
  const { data, error } = await db.rpc("fps_lobby");
  if (error) throw new Error(error.code === "PGRST202" ? "FPS_NOT_CONFIGURED" : error.message);
  return data as DuelLobbyData;
}
export async function fetchDuelView(id: string): Promise<DuelView> {
  const { data, error } = await db.rpc("fps_view", { p_match: id });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("MATCH_NOT_FOUND");
  return data as DuelView;
}
export async function fetchDuelRankings(): Promise<
  Array<{ id: string; username: string; rating: number; played: number; wins: number }>
> {
  const { data, error } = await db.rpc("fps_stats");
  if (error) throw new Error(error.message);
  return data as Array<{
    id: string;
    username: string;
    rating: number;
    played: number;
    wins: number;
  }>;
}
const DUEL_ERRORS: Record<string, string> = {
  CLIENT_UPDATE_REQUIRED:
    "Reload PvPStrike to load the updated combat rules before entering a match.",
  STAKE_NOT_ALLOWED:
    "This entry is no longer offered. Refresh the lobby and choose an available entry.",
  MATCH_NOT_OPEN: "Another player joined or this room closed. Choose another open game.",
  TERMS_CHANGED: "The room terms changed. Return to the lobby to review them again.",
  RATE_LIMITED: "Too many rooms created. Please wait before creating another.",
  PRACTICE_SOLO_ONLY:
    "Practice is now solo against the arena bot. Return to the lobby and choose Practice vs bot.",
  PRACTICE_DISABLED: "Practice is temporarily unavailable.",
  FPS_NOT_CONFIGURED: "PvPStrike is awaiting its database and match-server setup.",
  FPS_RUNTIME_UNAVAILABLE: "The match server is unavailable. Please retry shortly.",
  FPS_DISABLED: "PvPStrike is closed while deployment checks finish.",
  CASH_DISABLED: "Cash duels are not enabled yet.",
  INSUFFICIENT_BALANCE: "Your available cash balance is too low for this entry.",
  ALREADY_IN_MATCH: "Finish or cancel your existing duel first.",
  FORBIDDEN: "You do not have access to this room.",
  RESTRICTED_FUNDS:
    "Some of your balance is still on hold. Use available funds or try again after the hold clears.",
  MATCH_NOT_FOUND: "This room is no longer available.",
  MATCH_EXPIRED: "This room has expired. Return to the lobby.",
  MATCH_NOT_READY: "The opponent has not joined yet.",
};
export const duelError = (error: unknown) => {
  const text = error instanceof Error ? error.message : "DUEL_REQUEST_FAILED";
  return DUEL_ERRORS[text] ?? "The duel request failed. Refresh the room and try again.";
};

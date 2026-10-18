import { supabase } from "@/integrations/supabase/client";

export type LeaderboardStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "active"
  | "closing"
  | "settling"
  | "under_review"
  | "completed"
  | "cancelled"
  | "rejected"
  | "suspended";

export type BoardRow = {
  rank: number;
  username: string;
  avatar_url: string | null;
  qualifying_cents: number;
  prize_cents: number | null;
  payout_status: "pending" | "paid" | "failed" | null;
  is_me: boolean;
};

export type PublicCampaign = {
  id: string;
  name: string;
  description?: string;
  status: LeaderboardStatus;
  visibility?: "public" | "unlisted";
  timezone: string;
  starts_at: string;
  ends_at: string;
  games?: string[];
  min_wager_cents?: number;
  prize_pool_cents: number;
  ranked_at: string | null;
  finalized_at?: string | null;
};

export type PublicBoard = {
  campaign: PublicCampaign;
  partner: { username: string; avatar_url: string | null };
  participants: number;
  rules: string[];
  tiers: { rank_start: number; rank_end: number; reward_cents: number }[];
  podium: BoardRow[];
  rows: BoardRow[];
  total: number;
  me: {
    rank: number | null;
    qualifying_cents: number;
    prize_cents: number | null;
    payout_status: BoardRow["payout_status"];
  } | null;
};

/**
 * Ranked players on one public board page. The first page puts three on the
 * podium and the other 17 in the field, and the field viewport fits those 17.
 */
export const PUBLIC_BOARD_PAGE = 20;

export type PublicListRow = {
  id: string;
  name: string;
  status: LeaderboardStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  prize_pool_cents: number;
  ranked_at: string | null;
  partner_username: string;
  participants: number;
};

const COPY: Record<string, string> = {
  AUTH_REQUIRED: "Sign in to do that.",
  NOT_A_PARTNER: "This account is not an active partner.",
  FORBIDDEN: "You don't have access to that.",
  NOT_FOUND: "That campaign is not available.",
  BAD_NAME: "Use a name between 3 and 60 characters.",
  BAD_DESCRIPTION: "That description is too long.",
  BAD_SCHEDULE: "Enter a start and an end.",
  BAD_DURATION: "That length is outside the template limits.",
  BAD_TIMEZONE: "Choose a valid timezone.",
  GAME_NOT_ALLOWED: "One of those games is not allowed on this template.",
  BAD_PRIZES: "Check the prize ranks and amounts.",
  PRIZE_OVERLAP: "Prize ranks overlap or are out of order.",
  PRIZE_CAP: "That prize pool is above the $1,500 maximum.",
  PRIZE_FLOOR: "The prize pool must be at least $1.",
  TOO_MANY_TIERS: "That is more prize tiers than the template allows.",
  NOT_EDITABLE: "This campaign can no longer be edited.",
  START_TOO_SOON: "Start at least 5 minutes from now.",
  START_PASSED: "The start time has passed. Send it back so the partner can pick a new window.",
  TEMPLATE_UNAVAILABLE: "That template is no longer active.",
  CONFLICT: "This campaign was saved somewhere else. Reload it and try again.",
  BANKROLL_SHORT:
    "The house bankroll does not cover this prize pool. Write a reason to approve it anyway. The funds are not reserved.",
  REASON_REQUIRED: "Write a reason of at least 8 characters.",
  NOT_ALLOWED: "That action is not available in the current state.",
  WINDOW_CLOSED: "The campaign window has already ended.",
  AWARDS_EXIST: "Prizes were already created, so this campaign cannot be cancelled.",
  CAMPAIGN_FROZEN: "Those rules are frozen.",
  BAD_PAGE: "That page is outside the available range.",
  BAD_INPUT: "Check the form and try again.",
  BAD_MIN_WAGER: "Minimum wager must be zero or a positive dollar amount.",
  BAD_VISIBILITY: "Visibility must be public or unlisted.",
  BAD_STATUS: "That status filter is not valid.",
  BAD_SORT: "That sort is not valid.",
  BAD_ACTION: "That action is not valid.",
  BAD_CAP: "The prize cap is outside the allowed range.",
  BAD_GAMES: "Pick at least one supported game.",
};

export function leaderboardError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (/could not find the function|schema cache|PGRST202/i.test(message))
    return "Leaderboards are not available yet.";
  for (const [code, copy] of Object.entries(COPY)) {
    if (message.includes(code)) return copy;
  }
  return fallback;
}

export async function leaderboardCall<T>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "pending_approval":
      return "Pending approval";
    case "under_review":
      return "Payout review";
    case "closing":
      return "Closing";
    default:
      return status.slice(0, 1).toUpperCase() + status.slice(1);
  }
}

export function payoutLabel(status: BoardRow["payout_status"], final: boolean): string {
  if (status === "paid") return "Paid";
  if (status === "failed") return "Not paid";
  if (status === "pending") return "Pending";
  return final ? "No prize" : "Potential";
}

import { supabase } from "@/integrations/supabase/client";

export const ADMIN_TABS = [
  "overview",
  "jackpot",
  "coinflip",
  "roulette",
  "deposits",
  "withdrawals",
  "ledger",
  "crypto",
  "signups",
  "referrals",
  "partners",
  "leaderboards",
  "promos",
  "prestige",
  "logs",
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

export function isAdminTab(value: string): value is AdminTab {
  return (ADMIN_TABS as readonly string[]).includes(value);
}

export class AdminQueryError extends Error {
  readonly denied: boolean;
  constructor(message: string) {
    super(message);
    this.denied = /FORBIDDEN|SESSION_REVOKED|SESSION_EXPIRED|permission denied|42501/i.test(
      message,
    );
  }
}

/** User-facing copy. Technical database text stays on the server. */
export function adminErrorCopy(section: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/ADMIN_STEP_UP/i.test(message)) return "Enter your admin PIN to continue.";
  if (
    error instanceof AdminQueryError
      ? error.denied
      : /FORBIDDEN|SESSION_REVOKED|SESSION_EXPIRED|permission denied|42501/i.test(message)
  ) {
    return "You don't have access to this page.";
  }
  return `Unable to load ${section}`;
}

export async function adminQuery<T>(kind: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(
    "admin_ops_query" as never,
    { p_kind: kind, p_args: args } as never,
  );
  if (error) throw new AdminQueryError(error.message);
  return data as T;
}

export interface LiveHealth {
  server_time: string;
  workers: { name: string; last_run_at: string; age_seconds: number }[];
  jobs: { name: string; last_run_at: string; age_seconds: number }[];
  integrity: {
    id: number;
    started_at: string;
    finished_at: string | null;
    incidents_found: number;
  } | null;
  crypto_cursor_at: string | null;
  roulette_error: string | null;
  latest_failure: {
    id: number;
    action: string;
    game_type: string;
    game_id: number | null;
    created_at: string;
  } | null;
  roulette: RouletteNow | null;
}

export interface RouletteNow {
  id: number;
  status: string;
  pot_amount: number;
  bet_count: number;
  player_count: number;
  created_at: string;
  betting_ends_at: string | null;
  spin_end_at: string | null;
  locked_at: string | null;
  completed_at: string | null;
  winning_color: string | null;
  total_payout: number | null;
}

export interface OverviewData {
  server_time: string;
  jackpot: {
    waiting: number;
    active: number;
    drawing: number;
    completed_today: number;
    cancelled_today: number;
    rounds_today: number;
  };
  coinflip: {
    waiting: number;
    active: number;
    completed_today: number;
    cancelled_today: number;
    open_wager: number;
  };
  roulette: { completed_today: number; cancelled_today: number };
  deposits: {
    pending: number;
    confirming: number;
    unmatched: number;
    failed_today: number;
    open_invoices?: number;
    today_count: number;
    today_cents: number;
  };
  withdrawals: {
    requested?: number;
    manual_review?: number;
    funds_locked?: number;
    approved?: number;
    queued?: number;
    signing?: number;
    broadcast?: number;
    requested_cents?: number;
    open_cents?: number;
    bitcoin_open?: number;
    completed_today: number;
    completed_today_cents: number;
    failed_today: number;
    cancelled_today: number;
  };
}

export interface Page<T> {
  rows: T[];
  next: string | { id: string; created_at: string } | null;
}

export function workerAge(live: LiveHealth | undefined, name: string): number | null {
  const row =
    live?.workers.find((w) => w.name === name) ?? live?.jobs?.find((w) => w.name === name);
  return row ? Number(row.age_seconds) : null;
}

/** Seconds before a healthy job is late, then stale. Matched to each schedule. */
export const HEALTH_BANDS: Record<string, { ok: number; late: number }> = {
  jackpot: { ok: 90, late: 180 },
  coinflip: { ok: 90, late: 180 },
  roulette: { ok: 8, late: 30 },
  deposits: { ok: 90, late: 180 },
  withdrawals: { ok: 90, late: 180 },
  btcpay: { ok: 90, late: 180 },
  // Reconcile is gated to 3000s and the cron fires every 15 minutes.
  reconcile: { ok: 4200, late: 5400 },
};

const DEFAULT_BAND = { ok: 30, late: 120 };

export function healthLabel(
  age: number | null,
  band: { ok: number; late: number } = DEFAULT_BAND,
): "ok" | "late" | "down" | "unknown" {
  if (age == null || !Number.isFinite(age)) return "unknown";
  if (age < band.ok) return "ok";
  if (age < band.late) return "late";
  return "down";
}

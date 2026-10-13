import { supabase } from "@/integrations/supabase/client";
import type { LootTier } from "./loot";

export type ChestRewardKind = "credits" | "xp" | "cosmetic" | "fee_ticket";

export type ChestCosmetic = {
  id: string;
  type: "frame" | "crown";
  name: string;
  description: string | null;
  rarity: string;
  asset_key: string;
};

export type ChestReward = {
  kind: ChestRewardKind;
  /** Cents for credits, points for XP, 1 for a ticket. */
  amount: number | null;
  cosmetic: ChestCosmetic | null;
  opened_at: string;
};

export type ChestStatus = {
  signed_in: boolean;
  available: boolean;
  /** Server time the next open unlocks; null while a chest is ready. */
  next_at: string | null;
  server_time: string;
  /** Unused fee-free win tickets. */
  tickets: number;
  last: ChestReward | null;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function parseChestStatus(raw: unknown): ChestStatus {
  const row = (raw ?? {}) as Record<string, unknown>;
  const last = row["last"] as Record<string, unknown> | null | undefined;
  const cos = last?.["cosmetic"] as Record<string, unknown> | null | undefined;
  return {
    signed_in: Boolean(row["signed_in"]),
    available: Boolean(row["available"]),
    next_at: row["next_at"] ? String(row["next_at"]) : null,
    server_time: String(row["server_time"] ?? new Date().toISOString()),
    tickets: num(row["tickets"]),
    last: last
      ? {
          kind: String(last["kind"]) as ChestRewardKind,
          amount: last["amount"] == null ? null : num(last["amount"]),
          opened_at: String(last["opened_at"] ?? ""),
          cosmetic: cos
            ? {
                id: String(cos["id"]),
                type: cos["type"] === "crown" ? "crown" : "frame",
                name: String(cos["name"] ?? ""),
                description: cos["description"] ? String(cos["description"]) : null,
                rarity: String(cos["rarity"] ?? "common"),
                asset_key: String(cos["asset_key"] ?? ""),
              }
            : null,
        }
      : null,
  };
}

export async function fetchChestStatus(): Promise<ChestStatus> {
  const { data, error } = await supabase.rpc("daily_chest_status" as never);
  if (error) throw error;
  return parseChestStatus(data);
}

/** Takes no input: the server checks the cooldown, draws and grants the reward in one transaction. */
export async function openDailyChest(): Promise<ChestStatus> {
  const { data, error } = await supabase.rpc("daily_chest_open" as never);
  if (error) throw error;
  return parseChestStatus(data);
}

export function chestError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: unknown })?.message ?? error ?? "");
  if (/CHEST_COOLDOWN/i.test(message)) return "You've already opened today's chest.";
  if (/SELF_EXCLUDED/i.test(message)) return "Rewards are paused while self-exclusion is on.";
  if (/NO_WALLET/i.test(message)) return "Your wallet is not ready for rewards yet.";
  if (/SESSION_(REVOKED|EXPIRED)|AUTH_REQUIRED|FORBIDDEN/i.test(message))
    return "Sign in again to open your chest.";
  return "The chest could not be opened. Try again.";
}

/** Reveal strength, from the prize alone. */
export function chestTier(reward: ChestReward): LootTier {
  if (reward.kind === "fee_ticket") return "epic";
  if (reward.kind === "cosmetic") {
    const r = reward.cosmetic?.rarity ?? "common";
    return r === "legendary" || r === "epic" || r === "rare" || r === "uncommon" ? r : "common";
  }
  const amount = reward.amount ?? 0;
  if (reward.kind === "xp") return amount >= 250 ? "rare" : amount >= 100 ? "uncommon" : "common";
  if (amount >= 1000) return "legendary";
  if (amount >= 200) return "epic";
  if (amount >= 50) return "rare";
  if (amount >= 25) return "uncommon";
  return "common";
}

/** "HH:MM:SS" until `ms` elapses. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

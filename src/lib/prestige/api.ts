import { supabase } from "@/integrations/supabase/client";

export type RewardType = "frame" | "crown" | "usdc" | "lootbox";

/** One loot box outcome: `amount` in cents, `weight` out of the table total. */
export type LootOdd = { amount: number; weight: number };

export type PrestigeLevel = {
  level: number;
  xp_required: number;
  tier: string;
  title: string;
  reward_id: string | null;
  reward_type: RewardType | null;
  amount: number | null;
  currency: string | null;
  cosmetic_id: string | null;
  name: string;
  description: string | null;
  rarity: string | null;
  asset_key: string | null;
  box: string | null;
  unlocked: boolean;
  claimed: boolean;
  /** Cents paid by an opened loot box. */
  won: number | null;
};

export type PrestigeState = {
  signed_in: boolean;
  xp: number;
  level: number;
  tier: string;
  xp_into: number;
  xp_span: number | null;
  xp_remaining: number;
  next_level: number | null;
  equipped_frame: string | null;
  equipped_crown: string | null;
  loot_odds: LootOdd[];
  levels: PrestigeLevel[];
  /** Owned cosmetics that are not level rewards (daily chest drops), shaped as unlocked level-0 rows. */
  extras: PrestigeLevel[];
};

export type PrestigeIdentity = {
  user_id: string;
  level: number;
  tier: string;
  frame: string | null;
  crown: string | null;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function parsePrestigeState(raw: unknown): PrestigeState {
  const row = (raw ?? {}) as Record<string, unknown>;
  const levels = Array.isArray(row["levels"]) ? row["levels"] : [];
  return {
    signed_in: Boolean(row["signed_in"]),
    xp: num(row["xp"]),
    level: num(row["level"]) || 1,
    tier: String(row["tier"] ?? "Rookie"),
    xp_into: num(row["xp_into"]),
    xp_span: row["xp_span"] == null ? null : num(row["xp_span"]),
    xp_remaining: num(row["xp_remaining"]),
    next_level: row["next_level"] == null ? null : num(row["next_level"]),
    equipped_frame: row["equipped_frame"] ? String(row["equipped_frame"]) : null,
    equipped_crown: row["equipped_crown"] ? String(row["equipped_crown"]) : null,
    loot_odds: (Array.isArray(row["loot_odds"]) ? row["loot_odds"] : []).map((item) => {
      const o = item as Record<string, unknown>;
      return { amount: num(o["amount"]), weight: num(o["weight"]) };
    }),
    levels: levels.map((item) => {
      const l = item as Record<string, unknown>;
      return {
        level: num(l["level"]),
        xp_required: num(l["xp_required"]),
        tier: String(l["tier"] ?? ""),
        title: String(l["title"] ?? ""),
        reward_id: l["reward_id"] ? String(l["reward_id"]) : null,
        reward_type: (l["reward_type"] as RewardType | null) ?? null,
        amount: l["amount"] == null ? null : num(l["amount"]),
        currency: l["currency"] ? String(l["currency"]) : null,
        cosmetic_id: l["cosmetic_id"] ? String(l["cosmetic_id"]) : null,
        name: String(l["name"] ?? ""),
        description: l["description"] ? String(l["description"]) : null,
        rarity: l["rarity"] ? String(l["rarity"]) : null,
        asset_key: l["asset_key"] ? String(l["asset_key"]) : null,
        box: l["box"] ? String(l["box"]) : null,
        unlocked: Boolean(l["unlocked"]),
        claimed: Boolean(l["claimed"]),
        won: l["won"] == null ? null : num(l["won"]),
      };
    }),
    extras: (Array.isArray(row["extra_cosmetics"]) ? row["extra_cosmetics"] : []).map((item) => {
      const c = item as Record<string, unknown>;
      return {
        level: 0,
        xp_required: 0,
        tier: "",
        title: "Daily chest",
        reward_id: null,
        reward_type: c["type"] === "crown" ? "crown" : "frame",
        amount: null,
        currency: null,
        cosmetic_id: String(c["cosmetic_id"]),
        name: String(c["name"] ?? ""),
        description: c["description"] ? String(c["description"]) : null,
        rarity: c["rarity"] ? String(c["rarity"]) : null,
        asset_key: c["asset_key"] ? String(c["asset_key"]) : null,
        box: null,
        unlocked: true,
        claimed: false,
        won: null,
      };
    }),
  };
}

/** Every row that can hold an equippable cosmetic: level rewards, then chest drops. */
export function cosmeticRows(state: PrestigeState): PrestigeLevel[] {
  return [...state.levels, ...state.extras];
}

export async function fetchPrestigeState(): Promise<PrestigeState> {
  const { data, error } = await supabase.rpc("prestige_state" as never);
  if (error) throw error;
  return parsePrestigeState(data);
}

/** Same key the player lists use, so a server payload lands in the right cache entry. */
export function identityQueryKey(ids: string[]) {
  return [...new Set(ids.filter(Boolean))].sort().slice(0, 40);
}

export async function fetchIdentities(ids: string[]): Promise<PrestigeIdentity[]> {
  const unique = identityQueryKey(ids);
  if (!unique.length) return [];
  const { data, error } = await supabase.rpc(
    "prestige_identities" as never,
    { p_ids: unique } as never,
  );
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((item) => {
    const r = item as Record<string, unknown>;
    return {
      user_id: String(r["user_id"]),
      level: num(r["level"]) || 1,
      tier: String(r["tier"] ?? "Rookie"),
      frame: r["frame"] ? String(r["frame"]) : null,
      crown: r["crown"] ? String(r["crown"]) : null,
    };
  });
}

export async function equipCosmetic(id: string): Promise<PrestigeState> {
  const { data, error } = await supabase.rpc(
    "prestige_equip" as never,
    { p_cosmetic: id } as never,
  );
  if (error) throw error;
  return parsePrestigeState(data);
}

export async function claimReward(id: string): Promise<PrestigeState> {
  const { data, error } = await supabase.rpc("prestige_claim" as never, { p_reward: id } as never);
  if (error) throw error;
  return parsePrestigeState(data);
}

export async function trackPrestigePage(): Promise<void> {
  const { error } = await supabase.rpc(
    "prestige_track" as never,
    { p_event: "prestige_page_viewed" } as never,
  );
  if (error && !/BAD_REQUEST|FORBIDDEN/i.test(error.message)) return;
}

export function prestigeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/LOCKED/i.test(message)) return "That reward is still locked.";
  if (/ALREADY_CLAIMED/i.test(message)) return "This reward is already claimed.";
  if (/NO_ODDS/i.test(message)) return "Loot boxes are being restocked. Try again shortly.";
  if (/NOT_A_REWARD/i.test(message)) return "This milestone is not a balance reward.";
  if (/NO_WALLET/i.test(message)) return "Your wallet is not ready for this reward yet.";
  if (/FORBIDDEN|AUTH/i.test(message)) return "Sign in to change your prestige.";
  return "That action could not be completed.";
}

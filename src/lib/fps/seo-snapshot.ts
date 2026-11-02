export function fpsSeoCacheKey(projectUrl: string) {
  const host = new URL(projectUrl).hostname;
  return `https://game-snapshot.internal/fps-seo/v1/${encodeURIComponent(host)}`;
}

export type FpsSeoSnapshot = {
  generatedAt: string;
  windowDays: 30;
  sampleLimit: 100;
  config: {
    enabled: boolean;
    cashEnabled: boolean;
    practiceAllowed: boolean;
    feeBps: number;
    stakes: number[];
  };
  matches: number;
  potCents: string;
  recent: {
    stake: number;
    bestOf: number;
    scoreA: number;
    scoreB: number;
    payout: number;
    fee: number;
    completedAt: string;
  }[];
};

type Field =
  | "generatedAt"
  | "windowDays"
  | "sampleLimit"
  | "matches"
  | "potCents"
  | "config"
  | "recent"
  | "enabled"
  | "cashEnabled"
  | "practiceAllowed"
  | "feeBps"
  | "stakes"
  | "stake"
  | "bestOf"
  | "scoreA"
  | "scoreB"
  | "payout"
  | "fee"
  | "completedAt";
const obj = (v: unknown): v is Partial<Record<Field, unknown>> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const date = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
/** Copy allowed fields only; never serialize RPC extras or participant IDs. */
export function parseFpsSeoSnapshot(v: unknown): FpsSeoSnapshot | null {
  if (
    !obj(v) ||
    !date(v.generatedAt) ||
    v.windowDays !== 30 ||
    v.sampleLimit !== 100 ||
    !integer(v.matches, 100) ||
    typeof v.potCents !== "string" ||
    !/^\d{1,9}$/.test(v.potCents) ||
    !obj(v.config) ||
    !Array.isArray(v.recent) ||
    v.recent.length > 8
  )
    return null;
  const c = v.config;
  if (
    typeof c.enabled !== "boolean" ||
    typeof c.cashEnabled !== "boolean" ||
    typeof c.practiceAllowed !== "boolean" ||
    c.feeBps !== 500 ||
    !Array.isArray(c.stakes) ||
    !c.stakes.length ||
    !c.stakes.every((s) => integer(s, 5000) && s >= 100)
  )
    return null;
  const recent: FpsSeoSnapshot["recent"] = [];
  for (const r of v.recent) {
    if (
      !obj(r) ||
      !integer(r.stake, 5000) ||
      r.stake < 100 ||
      ![5, 9, 13].includes(Number(r.bestOf)) ||
      !integer(r.scoreA, 7) ||
      !integer(r.scoreB, 7) ||
      !integer(r.payout, 10000) ||
      !integer(r.fee, 10000) ||
      !date(r.completedAt) ||
      r.payout + r.fee !== r.stake * 2 ||
      r.fee !== Math.floor((r.stake * 2 * 500) / 10000) ||
      Math.max(r.scoreA, r.scoreB) !== (Number(r.bestOf) + 1) / 2 ||
      r.scoreA === r.scoreB
    )
      return null;
    recent.push({
      stake: r.stake,
      bestOf: Number(r.bestOf),
      scoreA: r.scoreA,
      scoreB: r.scoreB,
      payout: r.payout,
      fee: r.fee,
      completedAt: r.completedAt,
    });
  }
  if (recent.length !== Math.min(v.matches, 8) || (v.matches === 0 && v.potCents !== "0"))
    return null;
  return {
    generatedAt: v.generatedAt,
    windowDays: 30,
    sampleLimit: 100,
    matches: v.matches,
    potCents: v.potCents,
    recent,
    config: {
      enabled: c.enabled,
      cashEnabled: c.cashEnabled,
      practiceAllowed: c.practiceAllowed,
      feeBps: 500,
      stakes: c.stakes as number[],
    },
  };
}

/** Recent results help match/fee intent, not unrelated CS2 settings or maps. */
export const FPS_ACTIVITY_GUIDES = new Set([
  "fps-for-money-hub",
  "cs2-1v1-for-money",
  "crypto-fps-game",
  "browser-fps-games",
  "cs2-tournaments-for-money",
  "earn-crypto-playing-games",
  "best-crypto-games",
  "skill-games-real-money",
  "nft-shooter-games",
]);
export const FPS_MECHANICS_GUIDES = new Set([
  "fps-1v1-strategy",
  "cs2-spray-patterns",
  "cs2-aim-training",
  "counter-strafing",
  "k-d-ratio",
  "cs2-subtick",
]);

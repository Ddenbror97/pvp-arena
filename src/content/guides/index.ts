import type { Guide, GuideCluster } from "./types";
import { guide as whatIsACryptoCasino } from "./what-is-a-crypto-casino";
import { guide as provablyFairCasino } from "./provably-fair-casino";
import { guide as pvpGambling } from "./pvp-gambling";
import { guide as cryptoJackpot } from "./crypto-jackpot";
import { guide as usdcCasino } from "./usdc-casino";
import { guide as gamblingBudget } from "./gambling-budget";
import { guide as csgoCoinflip } from "./csgo-coinflip";
import { guide as cs2Roulette } from "./cs2-roulette";
import { guide as hmacSha256 } from "./hmac-sha256-provably-fair";
import { guide as pfCalculator } from "./provably-fair-calculator";

export type { Guide, GuideCluster } from "./types";

/** Published guides. Add each new guide here once it passes scripts/check-guides.ts. */
export const GUIDES: Guide[] = [whatIsACryptoCasino, provablyFairCasino, pvpGambling, cryptoJackpot, usdcCasino, gamblingBudget, csgoCoinflip, cs2Roulette, hmacSha256, pfCalculator];

export const CLUSTERS: { name: GuideCluster; blurb: string }[] = [
  { name: "Foundations", blurb: "Start here: what crypto casinos are and how they work." },
  { name: "Provably fair", blurb: "How results are committed, revealed and checked." },
  { name: "CS:GO heritage", blurb: "Player-vs-player formats and where they came from." },
  { name: "Games & odds", blurb: "Rules, payouts and the maths behind each game." },
  { name: "Crypto payments", blurb: "Wallets, USDC, networks, deposits and withdrawals." },
  { name: "Responsible play", blurb: "Budgets, limits and staying in control." },
];

const bySlug = new Map(GUIDES.map((g) => [g.slug, g]));
export function getGuide(slug: string): Guide | undefined {
  return bySlug.get(slug);
}
export function isPublishedGuide(slug: string): boolean {
  return bySlug.has(slug);
}

/** Plain-text word count of everything a reader sees in the article body. */
export function guideText(g: Guide): string {
  return [g.h1, g.answer, ...g.facts, ...g.sections.flatMap((s) => [s.title, s.body]), ...g.faqs.flatMap((f) => [f.q, f.a])]
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*]/g, " ");
}
export function wordCount(g: Guide): number {
  return guideText(g).split(/\s+/).filter((w) => /[A-Za-z0-9$]/.test(w)).length;
}

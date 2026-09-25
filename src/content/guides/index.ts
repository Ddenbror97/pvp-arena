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
import { guide as csgoJackpot } from "./csgo-jackpot";
import { guide as metamaskCasino } from "./metamask-casino";
import { guide as buyUsdc } from "./how-to-buy-usdc";
import { guide as addBase } from "./add-base-network-metamask";
import { guide as cryptoWallet } from "./crypto-wallet-for-gambling";
import { guide as seeds } from "./server-seed-client-seed";
import { guide as pfRoulette } from "./provably-fair-roulette";
import { guide as coinOdds } from "./coin-flip-odds";
import { guide as withdrawals } from "./crypto-casino-withdrawals";
import { guide as csgoHistory } from "./csgo-gambling-history";
import { guide as commitReveal } from "./commit-reveal-scheme";
import { guide as web3Casino } from "./web3-casino";
import { guide as usdcVsUsdt } from "./usdc-vs-usdt-gambling";
import { guide as houseEdge } from "./house-edge";
import { guide as rigged } from "./are-online-casinos-rigged";
import { guide as terminology } from "./casino-terminology";
import { guide as rouletteColors } from "./roulette-colors";
import { guide as cryptoRoulette } from "./crypto-roulette";
import { guide as rngVsPf } from "./rng-vs-provably-fair";
import { guide as skinGambling } from "./skin-gambling-vs-crypto";
import { guide as martingale } from "./martingale-strategy";
import { guide as gamblersFallacy } from "./gamblers-fallacy";
import { guide as caseOpening } from "./csgo-case-opening";
import { guide as stopGambling } from "./how-to-stop-gambling";
import { guide as crash } from "./crash-gambling";
import { guide as cs2Betting } from "./cs2-betting";
import { guide as winRoulette } from "./how-to-win-at-roulette";
import { guide as seedPhrase } from "./seed-phrase";
import { guide as baseNetwork } from "./base-network";
import { guide as selfExclusion } from "./gambling-self-exclusion";

export type { Guide, GuideCluster } from "./types";

/** Published guides. Add each new guide here once it passes scripts/check-guides.ts. */
export const GUIDES: Guide[] = [whatIsACryptoCasino, provablyFairCasino, pvpGambling, cryptoJackpot, usdcCasino, gamblingBudget, csgoCoinflip, cs2Roulette, hmacSha256, pfCalculator, csgoJackpot, metamaskCasino, buyUsdc, addBase, cryptoWallet, seeds, pfRoulette, coinOdds, withdrawals, csgoHistory, commitReveal, web3Casino, usdcVsUsdt, houseEdge, rigged, terminology, rouletteColors, cryptoRoulette, rngVsPf, skinGambling, martingale, gamblersFallacy, caseOpening, stopGambling, crash, cs2Betting, winRoulette, seedPhrase, baseNetwork, selfExclusion];

export type ClusterInfo = {
  name: GuideCluster;
  slug: string;
  blurb: string;
  title: string; // 40–59 chars
  description: string; // 120–159 chars
  intro: string;
};

export const CLUSTERS: ClusterInfo[] = [
  { name: "Foundations", slug: "foundations", blurb: "Start here: what crypto casinos are and how they work.",
    title: "Crypto Casino Basics: Beginner Guides and Glossary",
    description: "Beginner guides to crypto casinos: what they are, how Web3 casinos differ, casino terminology, and how to tell whether an online casino is rigged.",
    intro: "New to crypto gaming? These guides explain what a crypto casino is, the words you will see on every game page, and how to judge whether a site can be trusted before you deposit." },
  { name: "Provably fair", slug: "provably-fair", blurb: "How results are committed, revealed and checked.",
    title: "Provably Fair Guides: Seeds, Hashes and Verification",
    description: "How provably fair games work: commit-reveal, server and client seeds, HMAC-SHA256, RNG vs provably fair, and how to verify a result with a calculator.",
    intro: "Provably fair means you can check a result yourself instead of trusting the site. Start with the overview, then go deeper into seeds, hashing and step-by-step verification." },
  { name: "CS:GO heritage", slug: "csgo-heritage", blurb: "Player-vs-player formats and where they came from.",
    title: "CS:GO Gambling Guides: Jackpot, Coinflip and Skins",
    description: "Guides to CS:GO-era player-vs-player gambling: jackpot, coinflip and roulette formats, skin gambling vs crypto, and the history behind the games.",
    intro: "Jackpot, coinflip and coloured roulette became popular on CS:GO skin sites. These guides cover how the formats work, what went wrong in the skin era and how crypto versions compare." },
  { name: "Games & odds", slug: "games-and-odds", blurb: "Rules, payouts and the maths behind each game.",
    title: "Casino Odds Guides: Jackpot, Roulette and Coin Flip",
    description: "Understand the maths behind each game: jackpot odds, roulette colors, crypto roulette, coin flip probability, house edge and why martingale fails.",
    intro: "Every bet has a probability, a payout and a cost. These guides show the numbers behind Jackpot, Coinflip and Roulette, and explain why betting systems cannot change them." },
  { name: "Crypto payments", slug: "crypto-payments", blurb: "Wallets, USDC, networks, deposits and withdrawals.",
    title: "Crypto Casino Payment Guides: USDC, Wallets and Base",
    description: "How to pay at a crypto casino: buying USDC, choosing a wallet, adding Base to MetaMask, USDC vs USDT, and how withdrawals are confirmed safely.",
    intro: "Moving money in and out is where most mistakes happen. These guides walk through wallets, stablecoins, networks, deposits and withdrawals in the order you will need them." },
  { name: "Responsible play", slug: "responsible-play", blurb: "Budgets, limits and staying in control.",
    title: "Responsible Gambling Guides: Budgets and Limits",
    description: "Practical guides to staying in control: setting a gambling budget, loss and time limits, spotting chasing losses, and where to find support if needed.",
    intro: "Gambling should stay a fixed-cost form of entertainment. These guides help you set limits before you play and recognise when it is time to stop." },
];

/** Topic pages are only published when the cluster has enough guides to be useful. */
export const MIN_TOPIC_GUIDES = 3;
export function clusterInfo(name: GuideCluster): ClusterInfo {
  return CLUSTERS.find((c) => c.name === name)!;
}
export function guidesInCluster(name: GuideCluster): Guide[] {
  return GUIDES.filter((g) => g.cluster === name).sort((a, b) => Number(!!b.pillar) - Number(!!a.pillar));
}
export function publishedTopics(): ClusterInfo[] {
  return CLUSTERS.filter((c) => guidesInCluster(c.name).length >= MIN_TOPIC_GUIDES);
}
export function getTopic(slug: string): ClusterInfo | undefined {
  return publishedTopics().find((c) => c.slug === slug);
}
export function pillarOf(name: GuideCluster): Guide | undefined {
  return GUIDES.find((g) => g.cluster === name && g.pillar);
}

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

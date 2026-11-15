import type { GuideCluster } from "@/content/guides/types";
import type { GuideSitePath } from "./site-links";

export type FpsMode = "duel" | "bomb" | "br";
export type GuideContext = { slug: string; cluster: GuideCluster };
export type GuidePromotion = { name: string; hook: string; to: GuideSitePath; label: string };

const BR = new Set([
  "battle-royale-games",
  "browser-battle-royale",
  "battle-royale-for-money-hub",
  "zombs-royale-unblocked",
  "pubg-unblocked",
  "off-the-grid-game",
]);
const TEAM = new Set([
  "cs2-game-modes",
  "tactical-shooter-games",
  "mirage-callouts",
  "dust-2-callouts",
  "mirage-smokes",
  "cs2-map-pool",
  "nuke-callouts",
  "overpass-callouts",
  "inferno-callouts",
  "anubis-ancient-callouts",
  "cs2-grenades",
  "cs2-economy",
  "cs2-practice-commands",
]);
const SKILL = new Set([
  "skill-based-gambling",
  "pvp-gambling",
  "pvp-casino-games",
  "peer-to-peer-gambling",
  "head-to-head-betting",
  "bet-with-friends-online",
]);

/** Topic ownership, not a site-wide shooter advert on unrelated articles. */
export function guideFpsMode({ slug, cluster }: GuideContext): FpsMode | null {
  if (BR.has(slug)) return "br";
  if (TEAM.has(slug)) return "bomb";
  return cluster === "FPS & aim" || SKILL.has(slug) ? "duel" : null;
}

export const FPS_PROMOTIONS: Record<FpsMode, GuidePromotion> = {
  duel: {
    name: "1v1 FPS",
    hook: "Warm up in a browser aim duel.",
    to: "/fps-1v1",
    label: "Explore",
  },
  bomb: {
    name: "5v5 Bomb Defusal",
    hook: "Practise planting and defusing.",
    to: "/fps-bomb",
    label: "Practice",
  },
  br: {
    name: "Project Island",
    hook: "Drop into browser Battle Royale.",
    to: "/fps-br",
    label: "Play",
  },
};

const CLUSTER_PROMOTIONS: Record<GuideCluster, GuidePromotion> = {
  "FPS & aim": FPS_PROMOTIONS.duel,
  Foundations: {
    to: "/",
    name: "PvP games",
    hook: "Find your next head-to-head game.",
    label: "Explore",
  },
  "Provably fair": {
    to: "/fairness",
    name: "Fairness",
    hook: "Check how results are verified.",
    label: "Check",
  },
  "CS:GO heritage": {
    to: "/coinflip",
    name: "Coinflip",
    hook: "Explore a head-to-head coinflip.",
    label: "Explore",
  },
  "Games & odds": {
    to: "/roulette",
    name: "Roulette",
    hook: "See the wheel and its odds.",
    label: "Explore",
  },
  "Crypto payments": {
    to: "/how-it-works",
    name: "How it works",
    hook: "See the games before you deposit.",
    label: "Read",
  },
  "Responsible play": {
    to: "/responsible-gambling",
    name: "Your limits",
    hook: "Set a limit before you play.",
    label: "Limits",
  },
  Sweepstakes: {
    to: "/how-it-works",
    name: "How it works",
    hook: "Compare the available game formats.",
    label: "Read",
  },
  Poker: {
    to: "/poker",
    name: "Poker",
    hook: "Find a table in the poker lobby.",
    label: "Explore",
  },
  "Esports betting": {
    to: "/",
    name: "PvP games",
    hook: "Explore our player-versus-player games.",
    label: "Explore",
  },
  "Skill wagers": {
    to: "/fps-1v1",
    name: "1v1 FPS",
    hook: "See how a skill duel works.",
    label: "Explore",
  },
  "Casino games": {
    to: "/roulette",
    name: "Roulette",
    hook: "See the wheel and its odds.",
    label: "Explore",
  },
  "Sports betting": {
    to: "/how-it-works",
    name: "PvP games",
    hook: "Compare our game formats.",
    label: "Read",
  },
  Blackjack: {
    to: "/roulette",
    name: "Roulette",
    hook: "Try a different table format.",
    label: "Explore",
  },
  Slots: {
    to: "/slott",
    name: "P2P Slott",
    hook: "Explore a head-to-head slot duel.",
    label: "Explore",
  },
  "Casino knowledge": {
    to: "/fairness",
    name: "Fairness",
    hook: "See how result verification works.",
    label: "Check",
  },
  "Game shows": {
    to: "/roulette",
    name: "Roulette",
    hook: "Explore the live wheel.",
    label: "Explore",
  },
  "Games of chance": {
    to: "/coinflip",
    name: "Coinflip",
    hook: "Explore a head-to-head coinflip.",
    label: "Explore",
  },
  Lottery: { to: "/", name: "Jackpot", hook: "See how the shared pot works.", label: "Explore" },
  "Horse racing": {
    to: "/how-it-works",
    name: "PvP games",
    hook: "Compare our game formats.",
    label: "Read",
  },
  "Prediction markets": {
    to: "/how-it-works",
    name: "PvP games",
    hook: "See how our games decide a result.",
    label: "Read",
  },
};

export function guidePromotion(guide: GuideContext): GuidePromotion {
  if (guide.slug.startsWith("8-ball-") || guide.slug === "skill-games-for-money-pool") {
    return {
      name: "8-ball pool",
      hook: "Practise a game of 8-ball pool.",
      to: "/8-ball-pool",
      label: "Explore",
    };
  }
  const mode = guideFpsMode(guide);
  return mode ? FPS_PROMOTIONS[mode] : CLUSTER_PROMOTIONS[guide.cluster];
}

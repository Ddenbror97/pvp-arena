/** One intent owner per new URL; reuses existing wager/review/skin pages. */
export const FPS_GROUPS = [
  {
    name: "Browser duels and cash-match decisions",
    slugs: [
      "fps-for-money-hub",
      "cs2-1v1-for-money",
      "crypto-fps-game",
      "browser-fps-games",
      "1v1-lol-alternatives",
      "fps-1v1-strategy",
    ],
  },
  {
    name: "Aim, controls and performance",
    slugs: [
      "cs2-crosshair-codes",
      "edpi-calculator",
      "best-cs2-settings",
      "cs2-launch-options",
      "cs2-aim-training",
      "cs2-aim-maps",
      "cs2-practice-commands",
      "cs2-spray-patterns",
      "counter-strafing",
    ],
  },
  {
    name: "Maps, utility and round decisions",
    slugs: ["mirage-callouts", "dust-2-callouts", "mirage-smokes", "cs2-map-pool", "cs2-economy"],
  },
  {
    name: "Ranks, trust and measurements",
    slugs: [
      "cs2-ranks",
      "faceit-elo",
      "cs2-anti-cheat",
      "cs2-trust-factor",
      "cs2-subtick",
      "k-d-ratio",
    ],
  },
  {
    name: "Modes, events and other shooters",
    slugs: [
      "cs2-game-modes",
      "cs2-major",
      "cs2-tournaments-for-money",
      "valorant-1v1",
      "cs2-vs-valorant",
      "is-cs2-free",
    ],
  },
];
export const FPS_GUIDE_SLUGS = FPS_GROUPS.flatMap((g) => g.slugs);

/** Consolidations from the supplied 40-row plan; unpublished aliases are not indexed. */
export const FPS_PLAN_REUSE = {
  "cs2-wager": "cs2-1v1-for-money",
  "wagr-review": "wagr-review",
  "checkmate-gaming-review": "checkmate-gaming-review",
  "fortnite-wagers": "fortnite-gambling",
  "skill-based-gaming-for-money": "skill-based-gambling",
  "cs2-pro-settings": "best-cs2-settings",
  "cs2-trade-up": "csgo-trade-up-contract",
  "get-paid-to-play-fps": "fps-for-money-hub",
};

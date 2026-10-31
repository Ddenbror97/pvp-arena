/** Each FPS guide has exactly one task group; the existing money hub remains the sole pillar. */
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
    name: "Browser shooters and permitted access",
    slugs: [
      "counter-strike-unblocked",
      "krunker-unblocked",
      "deadshot-io",
      "bullet-force",
      "venge-io",
      "war-brokers",
      "shooting-games-unblocked",
      "best-browser-games",
    ],
  },
  {
    name: "Choosing a shooter: desktop, mobile and alternatives",
    slugs: [
      "cs2-game-modes",
      "cs2-vs-valorant",
      "is-cs2-free",
      "games-like-csgo",
      "games-like-valorant",
      "tactical-shooter-games",
      "best-fps-games",
      "best-mobile-fps",
      "cs-1-6-online",
    ],
  },
  {
    name: "Aim, crosshairs and movement drills",
    slugs: [
      "cs2-crosshair-codes",
      "cs2-aim-training",
      "cs2-aim-maps",
      "cs2-spray-patterns",
      "counter-strafing",
      "valorant-1v1",
      "mouse-accuracy-test",
      "crosshair-overlay",
      "valorant-aim-trainer",
    ],
  },
  {
    name: "Hardware, settings and performance",
    slugs: [
      "edpi-calculator",
      "best-cs2-settings",
      "cs2-launch-options",
      "cs2-subtick",
      "mouse-dpi",
      "polling-rate",
      "input-lag",
      "240hz-vs-144hz",
      "cs2-stuttering-fix",
      "cs2-on-mac",
    ],
  },
  {
    name: "Map callouts and utility",
    slugs: [
      "mirage-callouts",
      "dust-2-callouts",
      "mirage-smokes",
      "cs2-map-pool",
      "nuke-callouts",
      "overpass-callouts",
      "inferno-callouts",
      "anubis-ancient-callouts",
      "cs2-grenades",
    ],
  },
  {
    name: "Weapons and round economy",
    slugs: [
      "cs2-economy",
      "cs2-weapon-tier-list",
      "cs2-pistols",
      "usp-vs-p2000",
      "m4a4-vs-m4a1-s",
      "cs2-awp-guide",
    ],
  },
  {
    name: "Weapon cosmetics and budget selection",
    slugs: ["awp-skins", "ak-47-skins", "cheap-cs2-skins"],
  },
  {
    name: "Crypto shooter projects, assets and payouts",
    slugs: [
      "off-the-grid-game",
      "shrapnel-game",
      "nft-shooter-games",
      "earn-crypto-playing-games",
      "best-crypto-games",
      "skill-games-real-money",
    ],
  },
  {
    name: "Ranks, trust and competition",
    slugs: [
      "cs2-ranks",
      "faceit-elo",
      "cs2-anti-cheat",
      "cs2-trust-factor",
      "k-d-ratio",
      "cs2-major",
      "cs2-tournaments-for-money",
    ],
  },
  {
    name: "Community maps, modes and controls",
    slugs: ["cs2-practice-commands", "cs2-surf", "cs2-binds", "cs2-workshop-maps"],
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

/**
 * Every published guide topic, linked from the site footer so each hub is one click from any
 * page (Search Console showed six hubs Google had not discovered on 2026-11-18). Kept small and
 * free of the cluster data so the footer does not pull the guide catalogue into every page;
 * tests/topic-nav.test.ts keeps it equal to the published topics.
 */
export const TOPIC_NAV: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: "foundations", label: "Crypto casino basics" },
  { slug: "provably-fair", label: "Provably fair" },
  { slug: "crypto-payments", label: "Wallets and payments" },
  { slug: "games-and-odds", label: "Odds and RTP" },
  { slug: "casino-games", label: "Casino games" },
  { slug: "slots", label: "Slots" },
  { slug: "blackjack", label: "Blackjack" },
  { slug: "poker", label: "Poker" },
  { slug: "game-shows", label: "Game shows" },
  { slug: "games-of-chance", label: "Card, dice and table games" },
  { slug: "sports-betting", label: "Sports betting" },
  { slug: "esports-betting", label: "Esports betting" },
  { slug: "horse-racing", label: "Horse racing" },
  { slug: "prediction-markets", label: "Prediction markets" },
  { slug: "lottery", label: "Lottery" },
  { slug: "sweepstakes", label: "Sweepstakes casinos" },
  { slug: "skill-wagers", label: "Skill games for money" },
  { slug: "fps-and-aim", label: "FPS and aim" },
  { slug: "csgo-heritage", label: "CS2 skins and PvP" },
  { slug: "casino-knowledge", label: "Casino history and culture" },
  { slug: "responsible-play", label: "Responsible play" },
];

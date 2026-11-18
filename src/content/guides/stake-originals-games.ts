import type { Guide } from "./types";

export const guide: Guide = {
  slug: "stake-originals-games",
  cluster: "Foundations",
  keyword: "stake originals games",
  secondary: ["stake originals", "stake dice", "stake plinko", "stake mines"],
  title: "Stake Originals Games: How In-House Games Are Priced",
  description:
    "What Stake originals games are, how their house edge and RTP work, how server seed, client seed and nonce check a result, and the cost per bet.",
  h1: "Stake originals games: how in-house games are priced",
  answer:
    "Stake originals games are the casino's own in-house titles, such as Dice, Plinko, Mines, Limbo, Crash, Keno, HiLo and Wheel, rather than slots licensed from outside studios. Each has a fixed house edge that the game's information panel states as an RTP, and each result is generated from a server seed, a client seed and a nonce that you can verify after the bet. Verification proves the result was not changed; the house edge still applies to every bet.",
  facts: [
    "Stake originals are the operator's own games, not third-party slots.",
    "Each game states an RTP; house edge = 100% − RTP.",
    "Expected loss per bet = stake × house edge, whatever the settings.",
    "Results come from a server seed, a client seed and a nonce you can check.",
    "Volatility settings change how often you win, not the long-run edge.",
  ],
  sections: [
    {
      id: "what",
      title: "What Stake originals games are",
      body: `Most online casinos license slots and table games from studios. Crypto casinos such as Stake also build their own "originals": simple, fast games where the operator controls the maths. The ones most people search for are Dice, Plinko, Mines, Limbo, Crash, Keno, HiLo and Wheel. Many crypto casinos run near-identical versions of the same games; their mechanics are explained in our [crypto dice](/guides/crypto-dice-game), [Plinko](/guides/plinko-gambling), [Mines](/guides/mines-game-casino), [Limbo](/guides/limbo-game-strategy) and [Crash](/guides/crash-gambling) guides.

All of them are house-banked: you play against the casino, which takes a fixed edge on every bet.`,
    },
    {
      id: "edge",
      title: "House edge and RTP",
      body: `Each original shows its RTP (return to player) in the game's information or fairness panel. Read it there before you play; operators can change it, and the same game name can carry a different RTP at another casino.

**House edge = 100% − RTP.** A game with a 99% RTP has a 1% house edge.

**Worked example.** At a 1% edge, 500 bets of $10 ($5,000 wagered) have an expected loss of 5,000 × 0.01 = **$50**. At a 3% edge the same play costs $150 on average. Short sessions swing far from those figures; the expected loss is what the wagered amount costs over time. [House edge](/guides/house-edge) and [RTP explained](/guides/rtp-explained) cover the calculation.

Settings such as Plinko rows and risk, the number of Mines, or a Dice target change the **volatility**: how often you win and how big the wins are. They do not remove the edge. A 99x Limbo target and a 1.5x target lose the same share of the amount wagered in the long run.`,
    },
    {
      id: "fair",
      title: "Checking a result with seeds",
      body: `Stake originals are presented as provably fair. Before you bet, the casino commits to a **server seed** by showing its hash. You supply or accept a **client seed**, and each bet increases a **nonce** (a counter). The result is computed from all three; when you rotate the server seed, the casino reveals the old one so you can recompute past results and confirm they match.

That proves the casino did not change a result after seeing your bet. It does not prove the game's RTP is good or that the casino will pay a withdrawal. [Server seed and client seed](/guides/server-seed-client-seed), [nonce and cursor](/guides/nonce-and-cursor-provably-fair) and [verify a casino bet](/guides/verify-a-casino-bet) walk through the check.`,
    },
    {
      id: "compare",
      title: "Originals versus PvP games",
      body: `| | House-banked originals | PvP pot (PVPspinArena Jackpot) |
| --- | --- | --- |
| Who you play against | The casino | Other players |
| Cost | House edge on every bet | 5% of the pot |
| Your chance | Set by the game's maths | Your share of the pot |
| Result check | Server seed, client seed, nonce | Committed seed, checked on [fairness](/fairness) |

Both can be verified; the difference is who holds the other side and how the cost is taken. More context in the [crypto casino basics topic](/guides/topics/foundations) and [Stake alternatives](/guides/stake-alternatives).`,
    },
    {
      id: "before",
      title: "Before you play",
      body: `Check the RTP in the game panel, decide your stake and loss limit first, and remember that fast games mean a lot of wagering in a short time: 500 bets can take minutes. Adults only, 18 or the higher age your law sets, and only where the casino is licensed for you. This page is not a review of Stake or a recommendation. If spending stops being a fixed, affordable amount, stop and read [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What are Stake originals?",
      a: "Stake's own in-house casino games, such as Dice, Plinko, Mines, Limbo, Crash, Keno, HiLo and Wheel, as opposed to slots from outside studios.",
    },
    {
      q: "What is the house edge on Stake originals?",
      a: "Each game states an RTP in its information panel; the house edge is 100% minus that RTP. Check the panel, because figures can change.",
    },
    {
      q: "Are Stake originals provably fair?",
      a: "They are presented as provably fair: each result comes from a server seed, a client seed and a nonce that you can verify after the server seed is revealed.",
    },
    {
      q: "Does changing the risk setting improve my odds?",
      a: "No. Risk and target settings change volatility, how often and how much you win, but not the long-run house edge.",
    },
    {
      q: "How much do Stake originals cost to play?",
      a: "Your expected loss is the amount wagered times the house edge. At a 1% edge, $5,000 wagered costs $50 on average.",
    },
  ],
  sources: [
    { label: "Stake", url: "https://stake.com/" },
    {
      label: "NIST FIPS 180-4: Secure Hash Standard",
      url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final",
    },
    { label: "GambleAware", url: "https://www.gambleaware.org/" },
  ],
  related: [
    "stake-alternatives",
    "house-edge",
    "provably-fair-casino",
    "server-seed-client-seed",
    "crypto-dice-game",
  ],
  updated: "2026-11-18",
  cta: {
    title: "Play against players, not the house",
    text: "PVPspinArena's Jackpot pays the pot to one player, minus a 5% fee; chance equals your share.",
    primary: { to: "/", label: "Jackpot" },
    secondary: { to: "/guides/house-edge", label: "House edge" },
  },
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sweet-bonanza",
  cluster: "Slots",
  keyword: "sweet bonanza",
  secondary: ["sweet bonanza rtp", "sweet bonanza max win", "sweet bonanza demo"],
  title: "Sweet Bonanza: Anywhere Pays, Tumbles and Free Spins",
  description:
    "Learn how Sweet Bonanza pays eight or more symbols anywhere, how free-spin multipliers combine, and how to distinguish the original from sequels.",
  h1: "Sweet Bonanza: Anywhere Pays, Tumbles and Free Spins",
  related: [
    "cluster-pays-slots",
    "rtp-explained",
    "slot-volatility",
    "fruit-party-slot",
    "megaways-slots",
    "sweet-bonanza-candyland",
  ],
  updated: "2026-11-26",
  answer:
    "Sweet Bonanza is Pragmatic Play’s 6×5 tumbling slot. Eight or more matching symbols pay anywhere on the screen; they do not have to touch. Four to six lollipop scatters award 10 free spins, where multiplier bombs can increase a winning tumble sequence.",
  facts: [
    "The original uses anywhere pays, rather than adjacent clusters or fixed paylines.",
    "During free spins, bomb values range from 2x to 100x and are added together.",
    "The original launch advertised potential wins up to 21,175x; check the current version’s paytable.",
  ],
  sections: [
    {
      id: "section-1",
      title: "How a spin is evaluated",
      body: "Count each symbol type across the whole grid. A qualifying group pays, disappears, and makes room for replacements. Further wins continue the same paid spin. Eight matching symbols split between opposite corners still qualify.\n\nThat differs from [cluster pays](/guides/cluster-pays-slots), where neighbouring positions matter. The [Slots topic](/guides/topics/slots) compares layouts.",
    },
    {
      id: "section-2",
      title: "Add bombs before multiplying the win",
      body: "The provider specifies 10 free spins for four to six scatters. During the feature, add the collected multiplier values at the end of a winning tumble sequence, then apply that total to its win.\n\nFor example, a hypothetical $2 tumble total with 5x and 10x bombs pays $2 × (5 + 10) = $30. Multiplying the bombs together would incorrectly produce $100. This is arithmetic, not a recorded session.",
    },
    {
      id: "section-3",
      title: "Use the original game’s figures",
      body: "Sweet Bonanza 1000, Super Scatter, and [CandyLand](/guides/sweet-bonanza-candyland) are separate releases. A sequel’s ceiling cannot price the original. The launch announcement’s 21,175x is a historical provider figure, rather than a likely result.\n\nFind the active RTP and win cap in the offered game’s information. [RTP explained](/guides/rtp-explained) covers long-run return; [volatility](/guides/slot-volatility) explains uneven outcomes.",
    },
    {
      id: "section-4",
      title: "Preview and spending limits",
      body: "The official provider page includes a demo entry, subject to regional access. Free credits have no cash value. Use practice to understand symbol counting and settlement.\n\nRead the total charge when an ante or feature purchase is enabled. Set a cash limit before spinning and stop at it, even during an appealing run of results. [Responsible gambling tools](/responsible-gambling) offer limits and breaks.",
    },
  ],
  faqs: [
    {
      q: "Do matching symbols have to touch?",
      a: "No. At least eight matching symbols count anywhere on the grid.",
    },
    {
      q: "How do two bombs combine?",
      a: "Their values add before the combined multiplier is applied to the winning tumble total.",
    },
    {
      q: "Is CandyLand the same game?",
      a: "No. CandyLand is a live wheel game with different rules.",
    },
    {
      q: "Does the demo predict paid results?",
      a: "No. It teaches controls and rules without forecasting a paid session.",
    },
  ],
  sources: [
    {
      label: "Pragmatic Play: original rules and demo",
      url: "https://www.pragmaticplay.com/en/games/sweet-bonanza-slot/",
    },
    {
      label: "Pragmatic Play: original launch and advertised potential",
      url: "https://www.pragmaticplay.com/en/news/pragmatic-play-launches-sweet-bonanza/",
    },
  ],
};

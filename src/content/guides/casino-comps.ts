import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-comps",
  cluster: "Foundations",
  keyword: "casino comps",
  secondary: ["casino comps"],
  title: "Casino Comps: Free Play, Rooms and the Real Cost",
  description:
    "Casino comps are free play, rooms, or meals priced from your play. They do not change the game's edge. Ask which formula the club uses before you chase one.",
  h1: "Casino comps: the room is priced from the play, not from the win",
  answer:
    "Casino comps are goods or credits a club gives because of your gambling: free play, a meal, a room, or an event ticket. The club is paying you back a slice of what it expects to win from you, or sometimes a slice of what you already lost. The comp does not change the price of the game. A published points ratio is the only ratio. This page does not invent one.",
  facts: [
    "A comp is an incentive. The value is the thing you receive. The cost is the extra play, if you played more to get it.",
    "Clubs price comps from theoretical loss, from actual loss, or from a points table that stands in for one of those. Ask which.",
    "Theoretical loss uses stake size, time or decisions, and the game's edge. If the club will not say the edge it used, you cannot audit the points.",
    "Free play is still stakes. It faces the same game you were already playing.",
    "UK Gambling Commission licensees must not tie subsidised travel or accommodation to the level of gambling they expect from you.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What you are actually being given",
      body: `Separate the item from the story. A room has a cash price you can look up. Free play has a face value and then a game attached to it. A meal is a meal. None of those items changes the [house edge](/guides/house-edge) of the bets that earned them.

Write two numbers before you accept. What is the comp worth if you had to buy it, and what extra did you stake to qualify? If the second number is larger than the first, and you would not have staked it otherwise, the comp cost you money even when the host called it a gift.

This is a [Foundations](/guides/topics/foundations) page. It is not a host's rate card.`,
    },
    {
      id: "formula",
      title: "Theoretical loss, actual loss, and the blank cell",
      body: `Theoretical loss is the club's estimate of what the game keeps over a stretch of play. The ingredients are familiar: how much you bet, how long or how many decisions, and the edge of that game. Actual loss is simply what left your pocket. A points program converts one of those into a balance you can spend on rooms or free play.

The ingredients are not a formula you can finish from this page. Casinos do not share one universal "dollars per point." A number copied from a forum is not that club's number. Ask the host, or read the rewards rules, and leave the cell blank until you have it.

If the game itself does not publish an edge, the theoretical figure is the club's private input. You can still compare the comp's cash value with the money you actually lost. That comparison does not need their formula.`,
    },
    {
      id: "uk-limit",
      title: "A UK limit on rooms that scale with expected play",
      body: `Social responsibility code 5.1.1 tells UK Gambling Commission licensees that incentive terms must be clear, transparent, and fair. It also tells them not to build an incentive whose benefit is free or subsidised travel or accommodation, offered to get you to a licensed premises, on terms that relate directly to how much you are expected to gamble.

That is a narrower rule than "comps are banned." A published, fair offer can still exist. A quiet deal that grows because a host thinks you will lose more is the pattern the code is aimed at. The code applies to Commission licensees. A club outside that licence is not covered by this sentence. Its own rules are.

[Expected value](/guides/expected-value-gambling) is the right tool once you have a real edge and a real comp value. [Are online casinos safe](/guides/are-online-casinos-safe) is a different question: a generous host is not a licence check.`,
    },
    {
      id: "chase",
      title: "When to stop chasing the point balance",
      body: `Chasing a tier at the end of a period is the expensive version. You stake money you did not plan to stake so a counter ticks over. The counter is the club's. The money is yours.

Adults only. [Responsible gambling](/responsible-gambling) applies when a host is complimentary and the session is not. PVPspinArena's [terms](/terms) describe fees on its own games. They do not describe a comp program, a room, or a points balance, and this page will not invent one.`,
    },
  ],
  faqs: [
    {
      q: "Do comps make the game cheaper?",
      a: "The item has a value. The game's edge is unchanged. If you bet more than you otherwise would, the extra bets are a cost.",
    },
    {
      q: "What is theoretical loss?",
      a: "The club's estimate of what the game keeps from your stakes, using bet size, time or decisions, and an edge. It is not the same figure as the cash you lost tonight.",
    },
    {
      q: "Why won't this page give a points ratio?",
      a: "There is no single ratio. The rewards rules of the club you are in are the ratio. A blank is more accurate than a borrowed number.",
    },
    {
      q: "Can a UK operator offer a free room for a promised level of play?",
      a: "Commission licensees must not tie subsidised travel or accommodation to the level of gambling they expect from you. Other offers can still be made if the terms are clear and fair.",
    },
    {
      q: "Does PVPspinArena pay comps?",
      a: "No. Its terms describe game fees, not rooms, meals, or a points club.",
    },
  ],
  sources: [
    {
      label: "UK Gambling Commission LCCP 5.1.1: rewards and bonuses",
      url: "https://www.gamblingcommission.gov.uk/licensees-and-businesses/lccp/condition/5-1-1-sr-code",
    },
    { label: "PVPspinArena terms", url: "https://pvpspinarena.com/terms" },
  ],
  related: ["house-edge", "expected-value-gambling", "are-online-casinos-safe", "what-is-a-crypto-casino"],
  updated: "2026-10-21",
};

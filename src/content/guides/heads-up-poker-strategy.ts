import type { Guide } from "./types";

export const guide: Guide = {
  slug: "heads-up-poker-strategy",
  cluster: "Poker",
  keyword: "heads up poker strategy",
  secondary: ["heads up poker strategy"],
  title: "Heads Up Poker Strategy: Ranges, Pressure and Rake",
  description:
    "Heads-up poker strategy starts with the button: it posts the small blind, acts first before the flop, and acts last after. No chart here promises a win rate.",
  h1: "Heads up poker strategy: the button posts, and it acts first preflop",
  answer:
    "Heads up poker strategy begins with a seating rule that full-ring pages do not use. With two players, the button is the small blind, is dealt the last card, acts first before the flop, and acts last on every later street. That is the Tournament Directors Association rule for heads-up play. Ranges are wider because there is no field of seven. Nothing on this page is a win-rate claim or a table of required frequencies.",
  facts: [
    "Heads-up, the small blind is the button and acts first preflop.",
    "The big blind acts last preflop and first after the flop, if both players remain.",
    "At a full table the button is last after the flop and does not post the small blind. Mixing the two models is how people open from the wrong seat.",
    "Wider ranges follow from two players, not from a printed frequency. This page does not assign percents to hands.",
    "Rake and fees change the price of seeing a flop. Read the table's rule. A hand that ends before the flop is often cheaper.",
  ],
  sections: [
    {
      id: "seats",
      title: "The two-player exception",
      body: `The Poker Tournament Directors Association rule says: heads-up, the small blind is the button, is dealt the last card, and acts first pre-flop and last on all other betting rounds. When the table first becomes heads-up, the button may have to move so that nobody posts the big blind twice in a row.

[Texas Hold'em rules](/guides/texas-holdem-rules) describe the other case. With three or more players, the button is last to act after the flop, the small blind sits to the left of the button, and the first preflop action is to the left of the big blind. That page is right for a full table. It is the wrong map for two players. Use the map that matches the number of people dealt in.

[Poker for beginners](/guides/poker-for-beginners) is the hand ranking and the betting words. Heads-up does not change what a flush is. It changes who speaks first.`,
    },
    {
      id: "ranges",
      title: "Wider ranges, without a fake chart",
      body: `You are in every hand. Folding the button preflop means you posted the small blind and gave it up. Defending the big blind means you already posted the larger blind. Both facts push rational ranges wider than a full-ring opening range. How much wider depends on stack depth and on the price of continuing. A chart that says "raise 85% of hands" is a claim about a specific stack and a specific rake. This page has not derived that claim, so it will not print it.

Pressure is the threat of further bets, not a slogan. The button acts last on the flop, the turn, and the river. That is an information advantage on those streets and a disadvantage before the flop, where the button must act first. [Poker pot odds](/guides/poker-pot-odds) is how to price a call once there is a bet and a pot. [GTO poker strategy](/guides/gto-poker-strategy) is the idea of a balanced range. Neither page, and not this one, is a solver output you can memorize in place of the stack sizes in front of you.`,
    },
    {
      id: "price",
      title: "The fee is part of the hand",
      body: `Seeing a flop costs whatever the table charges. On PVPspinArena poker the fee is 5% of the pot and only when a flop is dealt. A hand that ends before the flop pays no fee, and uncalled chips are returned before the fee. That is this site's rule, from its game data. Another site's rake, a timed collection, or a tournament fee is a different price. Do not paste 5% onto a room that posts something else.

A strategy that ignores the fee will call too often in small pots. The fee is not a reason to invent a profit. Over a short session the cards dominate. [Responsible gambling](/responsible-gambling) applies to heads-up the same way it applies to a full table, and the session is faster because you play every hand.`,
    },
    {
      id: "practice",
      title: "What to practise instead of a system",
      body: `Deal two players. Say out loud who acts. Button first before the flop, big blind first after it. Then price one decision with the pot and the bet, including the fee if a flop is out. Stop there. A system that promises a win rate from a position chart is not a strategy. It is a forecast this page will not make.

The cluster lives under [poker](/guides/topics/poker). The site's [terms](/terms) point at the same fee rule. [How it works](/how-it-works) is the product around the table, not a heads-up lesson.`,
    },
  ],
  faqs: [
    {
      q: "Who acts first heads-up?",
      a: "The button, which is also the small blind, acts first before the flop and last on every later street. The big blind acts last preflop.",
    },
    {
      q: "Is that the same as a full table?",
      a: "No. With three or more players the button does not post the small blind, and the first preflop action is left of the big blind. The button is still last after the flop.",
    },
    {
      q: "Should I raise most hands on the button?",
      a: "Ranges are wider than full-ring ranges because only two players are dealt. A specific percent depends on stacks and price. This page does not assign one.",
    },
    {
      q: "Does heads-up remove the rake?",
      a: "No. Read the table. On this site the poker fee is 5% of the pot only after a flop. Other rooms publish their own rule.",
    },
    {
      q: "Will this strategy win?",
      a: "No page here can promise that. Position and price are the decisions. The cards and the other player decide the session.",
    },
  ],
  sources: [
    {
      label: "Poker TDA rules, including the heads-up button",
      url: "https://www.pokertda.com/view-poker-tda-rules/",
    },
    { label: "PVPspinArena terms", url: "https://pvpspinarena.com/terms" },
  ],
  related: ["texas-holdem-rules", "poker-for-beginners", "poker-pot-odds", "gto-poker-strategy"],
  updated: "2026-10-21",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-many-decks-blackjack",
  cluster: "Blackjack",
  keyword: "how many decks in blackjack",
  secondary: [
    "blackjack number of decks",
    "single deck vs six deck",
    "eight deck blackjack",
    "infinite deck blackjack",
  ],
  title: "How Many Decks in Blackjack? Rules and Edge Compared",
  description:
    "Compare one, two, six and eight blackjack decks while holding the other rules fixed. See why 3:2 payouts and reshuffling matter more than a shoe label.",
  h1: "How many decks in blackjack—and what else changes the edge?",
  answer:
    "How many decks in blackjack depends on the table: common formats include one, two, six or eight decks. Compare deck count only alongside the blackjack payout, dealer soft-17 rule, doubling, splitting and shuffle procedure. Fewer decks can improve the player’s expected return with otherwise matched rules, but do not make every single-deck table better.",
  facts: [
    "One ordinary deck has 52 cards; six and eight decks begin with 312 and 416 cards respectively.",
    "Under Wizard of Odds’ stated eight-deck reference rules, double deck improves player return by 0.19 percentage points and six decks by 0.02 points.",
    "That implies a 0.17-point difference between two and six decks under that reference—not just a few hundredths.",
    "Independent card draws, a finite shoe and reshuffling a finite shoe after each hand are distinct models.",
  ],
  sections: [
    {
      id: "posted",
      title: "Read the full rule panel, not just the shoe size",
      body: "Write down the deck count, whether blackjack pays 3:2 or 6:5, whether the dealer stands or hits on soft 17, and the permitted doubling and splitting actions. The correct [blackjack strategy chart](/guides/blackjack-strategy-chart) depends on the combination.\n\nThe [blackjack guides](/guides/topics/blackjack) separate these rules. A six-deck table with favourable payout and play rules can be preferable to a single-deck table with a reduced blackjack payout; the word “single” is not a quality score.",
    },
    {
      id: "comparison",
      title: "A sourced comparison with the same reference rules",
      body: "Wizard of Odds’ rule-variation analysis uses an eight-deck baseline where the dealer stands on soft 17, doubling on any initial two cards is allowed, double after split is allowed, and players may split to four hands. Its listed player-return changes include:\n\n| Deck count | Change versus that eight-deck baseline |\n| --- | --- |\n| One | +0.48 percentage points |\n| Two | +0.19 percentage points |\n| Six | +0.02 percentage points |\n| Eight | Baseline |\n\nThese are changes, not absolute house-edge figures. Do not label a double-deck game “0.19% house edge” from this table. Altering another rule changes the comparison.",
    },
    {
      id: "arithmetic",
      title: "What the two-to-six-deck difference means in dollars",
      body: "Subtracting 0.02 from 0.19 gives 0.17 percentage points, or 0.0017 of turnover. On an illustrative $1,500 of total wagers, that difference is $2.55 in theoretical average cost. It is not a $2.55 guarantee for a session.\n\nThe same analysis puts the 6:5 blackjack payout disadvantage at roughly 1.39 percentage points relative to 3:2 under its reference. This shows why comparing only shoe size can miss a larger rule difference. [House edge](/guides/house-edge) explains percentages of turnover.",
    },
    {
      id: "shuffle",
      title: "A fresh finite shoe is not an infinite deck",
      body: "In an independent-draw model, drawing one rank does not remove it from the next draw. A finite shoe does remove dealt cards until they are returned or the shoe is shuffled. Those models have different composition effects.\n\nIf a finite shoe is fully reshuffled after every hand, information from previous hands does not carry into the next hand, but the cards already dealt within the current hand still affect its remaining composition. Do not call that identical to independent draws. A continuous shuffling procedure should also be read from the actual table’s rules, not inferred from an RNG label.",
    },
    {
      id: "scope",
      title: "Use the comparison to understand a game, not predict a win",
      body: "No deck count guarantees a profitable session. A rule-matched strategy calculation also does not establish the behaviour of a particular operator’s software. [How to calculate house edge](/guides/how-to-calculate-house-edge) describes the underlying expected-value arithmetic.\n\nPVPspinArena does not deal blackjack. This page explains published analysis rather than recommending a table or claiming a funded play test. Use [responsible gambling](/responsible-gambling) for support with paid play.",
    },
  ],
  faqs: [
    {
      q: "Is blackjack always played with six decks?",
      a: "No. One, two, six and eight decks are common formats, and software games can use other stated models. Read the rule panel.",
    },
    {
      q: "Does fewer decks always mean a better game?",
      a: "Not when other rules change. Compare the blackjack payout, soft-17 rule, doubling, splitting and shuffle procedure as well.",
    },
    {
      q: "Does +0.19% mean a double-deck game has that house edge?",
      a: "No. In the cited table it is a change in player return against a stated eight-deck reference, not an absolute edge.",
    },
    {
      q: "Is reshuffling after every hand the same as drawing each card independently?",
      a: "No. In a finite shoe, cards dealt within the current hand change its remaining composition even if the shoe is reshuffled before the next hand.",
    },
  ],
  sources: [
    {
      label:
        "Wizard of Odds: original analysis of blackjack rule variations and reference assumptions",
      url: "https://wizardofodds.com/games/blackjack/rule-variations/",
    },
    {
      label: "Wizard of Odds: why number of decks matters",
      url: "https://wizardofodds.com/games/blackjack/why-number-of-decks-matter/",
    },
    {
      label: "Wizard of Odds: blackjack rules calculator",
      url: "https://wizardofodds.com/games/blackjack/calculator/",
    },
  ],
  related: [
    "blackjack-strategy-chart",
    "house-edge",
    "how-to-calculate-house-edge",
    "crypto-blackjack",
  ],
  updated: "2026-11-15",
};

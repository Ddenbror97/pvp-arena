import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-war-game",
  cluster: "Casino games",
  keyword: "casino war",
  secondary: ["casino war"],
  title: "Casino War Rules: Odds, the Tie Bet and House Edge",
  description:
    "Casino war is one card against the dealer. A higher card wins even money. On a tie you surrender half or double and go to war. Decks change the price.",
  h1: "Casino war: the first card is almost even, and the tie is the price",
  answer:
    "Casino war deals one card to you and one to the dealer from a shoe, commonly six decks, with aces high. The higher card wins even money. The lower card loses. A tie is not a push. You surrender half the stake, or you double the stake and go to war. The house advantage sits in that tie. Published descriptions put it usually over 2%, and the exact figure depends on the decks and on any bonus.",
  facts: [
    "A standard description uses six 52-card decks. Aces are high. Suits do not matter.",
    "On six decks, each side wins the first card about 46.3% of the time. The rest are ties.",
    "Surrender costs half the stake. Going to war doubles the stake, burns three cards, and deals one more card each.",
    "If you win the war card, you win the original stake only, not the extra stake. If you lose it, you lose both. A second tie wins the doubled stake.",
    "A tie side bet is a different wager. One published payoff is 10 to 1. Confirm the felt. The main bet's edge is usually over 2%, and it moves with the rules.",
  ],
  sections: [
    {
      id: "first-card",
      title: "The first card is the simple part",
      body: `You bet. You get a card. The dealer gets a card. Higher rank wins 1 to 1. Lower rank loses the stake. There is no draw, no hit, and no skill on that card. The game feels even because, on a six-deck shoe, each side wins that first comparison about 46.3% of the time. The missing slice is the tie, and the tie is not settled like a push in baccarat.

[Baccarat rules](/guides/baccarat-rules) are a useful contrast. A baccarat tie can be a push on the main bets. A war tie is a decision that costs you something either way.`,
    },
    {
      id: "tie",
      title: "Surrender, or double and burn three",
      body: `Surrender ends the hand. You lose half the original bet and keep half. Going to war means you put up a second stake equal to the first. The dealer burns three cards, then deals one card to each of you.

If your war card is higher, you win an amount equal to the original stake only. The extra stake is returned, not paid as a profit. If the dealer's war card is higher, you lose both stakes. If the war cards tie again, you win an amount equal to the doubled stake.

That "win the original only" is why the first-card game can look fair and still carry an edge. You are paid even money on a contest that was not quite 50/50, and when the ranks match you are offered two losing prices. Wikipedia's summary of the strategy says surrender gives the house a slightly higher advantage when a bonus payout is offered, so the expectation is to go to war rather than surrender. That advice is about the posted bonus rules. If your table's war payoff differs, the choice can differ. Read it.

The same source says the house advantage is usually over 2%, rises as more decks are added, and falls when the casino adds a bonus payout. This page will not replace "usually over 2%" with a fake precise edge. Decks and bonuses are the inputs.`,
    },
    {
      id: "side",
      title: "The tie side bet is not the main bet",
      body: `A separate wager pays if the first two cards match. A commonly printed payoff is 10 to 1 on that side stake. Ten to 1 is not a generous price for a tie unless you have counted the decks. Do not treat a lit tie button as insurance. It is a high-edge proposition on many layouts, and the layout in front of you is the one to price.

[House edge](/guides/house-edge) explains how to compare a payoff with the chance of the event. [Expected value](/guides/expected-value-gambling) is the arithmetic once both numbers are known. If the rules screen hides the payoff, you do not have the second number.`,
    },
    {
      id: "where",
      title: "What this site does not deal",
      body: `PVPspinArena does not offer casino war. Nothing in the [terms](/terms) is a war paytable. Adults only. [Responsible gambling](/responsible-gambling) matters on a game that asks you to double after a tie, because the second stake is a new decision made in a hurry.

More table games are grouped under [casino games](/guides/topics/casino-games). [Sic bo online](/guides/sic-bo-online) is a different one-roll game. Do not carry war's tie rule across to it.`,
    },
  ],
  faqs: [
    {
      q: "What happens on a tie?",
      a: "You give up half the bet, or you match the bet and play one more card after three burns. It is not a push.",
    },
    {
      q: "If I win the war, do I win both stakes?",
      a: "In the standard description, a higher war card wins the original stake only. The extra stake comes back. A second tie wins the doubled amount.",
    },
    {
      q: "Should I always surrender?",
      a: "Not in the usual bonus version. Published strategy says going to war has the better expectation when that bonus is offered. A different payoff can change the answer, so read the table.",
    },
    {
      q: "What is the house edge?",
      a: "Usually over 2% in the published summary, higher with more decks and lower if the casino adds a bonus. The exact percent is a function of those rules, not a single number for every site.",
    },
    {
      q: "Is the tie bet the same as going to war?",
      a: "No. The tie bet is an optional side wager on the first two cards matching. Going to war is what you may do with the main bet after they match.",
    },
  ],
  sources: [
    { label: "Wikipedia: Casino War", url: "https://en.wikipedia.org/wiki/Casino_War" },
  ],
  related: ["house-edge", "baccarat-rules", "sic-bo-online", "expected-value-gambling"],
  updated: "2026-10-21",
};

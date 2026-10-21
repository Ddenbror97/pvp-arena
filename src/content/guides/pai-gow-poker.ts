import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pai-gow-poker",
  cluster: "Casino games",
  keyword: "pai gow poker",
  secondary: ["pai gow poker"],
  title: "Pai Gow Poker: The House Way, Ties and the Edge",
  description:
    "Pai gow poker deals seven cards into a five-card hand and a two-card hand. You must beat both. Ties go to the banker. Copy the commission from the table.",
  h1: "Pai gow poker: two hands, and a tie that belongs to the banker",
  answer:
    "Pai gow poker uses a 52-card deck plus one joker. You and the banker each get seven cards and set a five-card hand that must outrank a two-card hand. You win the bet only if both of your hands beat the banker's matching hands. One win and one loss is a push. A copy on either hand goes to the banker. Commission, when a table charges it, is part of the price.",
  facts: [
    "The five-card hand must rank above the two-card hand. A hand set the other way is a foul.",
    "The joker is a bug in the five-card hand at most tables: it completes a straight or flush, and otherwise plays as an ace. In the two-card hand it plays as an ace, except where a house says it is wild.",
    "Winning both hands wins the bet. Splitting the hands pushes. Losing both loses. Ties on a hand go to the banker.",
    "Many casinos take a commission on winnings, often described as 5%. Many California rooms charge a flat fee instead. Read the plaque.",
    "The house way is a posted setting order for the banker's cards. It is not a strategy you have to follow when you are the player, unless you are co-banking.",
  ],
  sections: [
    {
      id: "deal",
      title: "What you are setting",
      body: `Seven cards become two poker hands. The five-card hand uses ordinary poker ranks, with one common exception: at most casinos the wheel, ace-2-3-4-5, is the second-highest straight, not the lowest. California and Michigan rooms often do not use that exception. The two-card hand is only a pair or a high card. It cannot be a straight or a flush, because it has two cards.

You place the two-card hand in front. If it outranks the five-card hand, you have fouled, and the usual penalty is that the hand is lost or reset by the house rule. Check which.

The deal itself is seven piles of seven, with four cards unused. A dice roll or a random number picks which pile starts. None of that changes the ranking. [How to play poker](/guides/how-to-play-poker) is the ranking language. Pai gow is not hold'em.`,
    },
    {
      id: "joker",
      title: "The joker is usually a bug, not a wild card",
      body: `In the five-card hand the joker completes a straight or a flush when it can. If it cannot, it is an ace. That is why five aces is a possible hand and ranks above a straight flush. In the two-card hand the same card is an ace at most tables. A few southern California rooms play it wild there. "Wild" and "bug" produce different hands. The felt, not a memory of another casino, decides.

When you are unsure how a joker plays in a straight, set the five-card hand first and ask before the cards go in. A mis-set joker is a foul if the two-card hand ends up higher.`,
    },
    {
      id: "banker",
      title: "Why the banker wins the copies",
      body: `Each hand is compared on its own. Both of yours higher: you win even money, before commission. One each: push, and the stake stays. Both of the banker's higher: you lose. If one hand is a copy, the banker wins that comparison, so a lost five-card hand plus a copied two-card hand is a loss, not a push.

That copy rule is the structural edge. It is small per hand and it is real. Casino-banked games also make the dealer set cards by a printed house way, so the dealer is not playing a hidden strategy against you. If you bank, you may set as you like. If you co-bank with the house, you usually must use the house way too.

Commission is separate from the copy rule. Wikipedia's summary of casino practice says many casinos take 5% of winnings, and many California card rooms charge a flat fee whether you win or lose. Those are different prices. An online table can be different again. Copy the number off the rules you are playing. Do not import 5% into a game that posts something else.

[House edge](/guides/house-edge) is the general idea. This page does not print a single edge for every pai gow room, because the commission and the house way change it.`,
    },
    {
      id: "online",
      title: "What to read before you click deal",
      body: `Joker rule, wheel ranking, commission or flat fee, whether you can bank, and what a foul costs. Side bets, including fortune-style bets on a seven-card rank, are a second game with their own paytable. Ignore them until the main bet makes sense.

PVPspinArena does not deal pai gow. [Responsible gambling](/responsible-gambling) still applies if you play it somewhere else. The [casino games](/guides/topics/casino-games) topic collects the other tables. [Baccarat rules](/guides/baccarat-rules) are the nearest cousin only in the sense that both are banker-versus-player comparisons. The hands are not alike. [Expected value](/guides/expected-value-gambling) is how to price a commission once you have the actual percent.`,
    },
  ],
  faqs: [
    {
      q: "Do I have to win both hands?",
      a: "Yes, to win the bet. Winning one and losing one is a push. A tie on a hand is a win for the banker.",
    },
    {
      q: "Can I set the two-card hand higher than the five-card hand?",
      a: "No. That is a foul. Houses either forfeit it or rearrange it by their rule.",
    },
    {
      q: "Is the joker wild?",
      a: "In the five-card hand it is usually a bug: straight, flush, or ace. In the two-card hand it is usually an ace. A house that calls it wild will say so.",
    },
    {
      q: "Is the commission always 5%?",
      a: "No. Five percent of winnings is common in the published descriptions of many casinos, and a flat fee is common in many California rooms. Use the table you are sitting at.",
    },
    {
      q: "Does the house way apply to my cards?",
      a: "Not unless you are banking under a co-bank rule that requires it. The house way is how the banker sets. You may set a legal hand your own way.",
    },
  ],
  sources: [
    { label: "Wikipedia: Pai gow poker", url: "https://en.wikipedia.org/wiki/Pai_gow_poker" },
  ],
  related: ["house-edge", "baccarat-rules", "how-to-play-poker", "expected-value-gambling"],
  updated: "2026-10-21",
};

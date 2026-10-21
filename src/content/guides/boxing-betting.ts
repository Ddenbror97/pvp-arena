import type { Guide } from "./types";

export const guide: Guide = {
  slug: "boxing-betting",
  cluster: "Sports betting",
  keyword: "boxing betting",
  secondary: ["boxing odds", "boxing point spread", "how to bet on boxing"],
  title: "Boxing Betting: Decisions, Knockouts and Prices",
  description:
    "Boxing betting splits the winner from the method. Rounds last three minutes. Three judges use the 10-point must system. A no decision follows the slip.",
  h1: "Boxing betting: a decision and a knockout are different bets",
  answer:
    "Boxing betting prices a bout scored by three judges on the 10-point must system, unless it ends sooner. Under the Association of Boxing Commissions' Unified Rules, a round is three minutes with a one-minute rest, and the referee is the only person who can stop it. The moneyline is who wins. A method bet is whether that win is a knockout, a technical knockout, or the cards. This page does not quote a price.",
  facts: [
    "Three judges score. The winner of a round gets 10. The other gets 9 or fewer. A 10-10 round is allowed and discouraged.",
    "There is a mandatory eight-count after a knockdown. There is no standing eight-count and no three-knockdown rule in the Unified Rules.",
    "An injury from a fair blow that stops the bout is a TKO loss for the injured boxer.",
    "An accidental foul that stops the bout before four completed rounds is a no decision under those rules. After four rounds it can be a technical decision. Your book may void more than that.",
    "PVPspinArena does not book boxing.",
  ],
  sections: [
    {
      id: "cards",
      title: "What the judges are doing",
      body: `The Unified Rules, as published by the Association of Boxing Commissions, make the 10-point must system the standard. The referee does not score. Judges are told to weigh clean punching, effective aggressiveness, ring generalship, and defense. A close winning round is 10-9. A round with a knockdown, or a clearly dominant round, is scored lower for the boxer who lost it. Knockdowns count only when the referee calls them.

A decision market is a bet that the bout reaches the cards and that your boxer is ahead on them. A "to win" market is wider: it pays a knockout too. Buying the wider bet at the shorter price is the usual shape. Buying the method because the price looks bigger is a different outcome, not a bargain on the same one.

[Moneyline betting explained](/guides/moneyline-betting-explained) is the wider bet. [Prop bets explained](/guides/prop-bets-explained) is the method and the round group.`,
    },
    {
      id: "stoppage",
      title: "Knockout, technical knockout, and the foul rules",
      body: `A knockdown followed by a count the boxer does not beat is a knockout. A stoppage because a boxer is taking punishment, or because an injury from a fair blow will not let them continue, is the family of technical knockouts in these rules. The referee is the sole arbiter of the stop. A corner throwing in the towel still needs the referee to wave it off.

Fouls are where tickets get voided. The Unified Rules say an accidental foul that forces a stop before four completed rounds is a no decision, and that four rounds are complete when the bell ends the fourth. After that, the bout can become a technical decision for the boxer ahead on the cards. An intentional foul that injures and immediately ends the bout disqualifies the boxer who fouled. A sportsbook is allowed to say "void if it does not go four" or "void on any technical decision." The ABC sentence and the book sentence are both real. Grade by the book, and use the ABC text to understand what the officials just announced.

[Vig betting](/guides/vig-betting) is the margin on the two-way price. A method price that looks generous still contains one.`,
    },
    {
      id: "distance",
      title: "Distance is the scheduled length",
      body: `"Goes the distance" means the scheduled rounds are completed. A ten-round bout that ends at the bell of round ten went the distance. The same bout stopped in the tenth did not. Championship distance is whatever that sanctioning body scheduled, not a universal twelve. Read the poster, then read whether your over-under rounds market counts a technical decision as having reached that round.

A point spread is an odd fit. Boxing is not scored as a running margin you cover. If a book sells one, its rules have to define the unit. Otherwise ignore the word and bet a result the rules already name.`,
    },
    {
      id: "none-here",
      title: "No bout on this site",
      body: `PVPspinArena does not offer boxing betting. Adults only. [Responsible gambling](/responsible-gambling) applies to a pay-per-view card, where the main event is one fight and the undercard can become a list of bets. [What sports betting is](/guides/what-is-sports-betting) is the general contract. The hub is [sports betting](/guides/topics/sports-betting). The [terms](/terms) do not list a prize fight.`,
    },
  ],
  faqs: [
    {
      q: "How long is a round?",
      a: "Three minutes, with one minute of rest, under the ABC Unified Rules.",
    },
    {
      q: "Who scores the fight?",
      a: "Three judges, on the 10-point must system. The referee stops the bout and calls knockdowns. The referee does not score.",
    },
    {
      q: "Does a no decision pay the favorite?",
      a: "No. A no decision is not a win. Whether your ticket is voided or lost depends on the market rules. The Unified Rules call an early stoppage for an accidental foul a no decision.",
    },
    {
      q: "Is a technical decision the same as a unanimous decision?",
      a: "No. A technical decision is a scorecard result after a stoppage the rules send to the cards. A unanimous decision is three judges agreeing at the end of the scheduled rounds.",
    },
    {
      q: "Can I bet boxing here?",
      a: "No.",
    },
  ],
  sources: [
    {
      label: "ABC Unified Rules of Boxing",
      url: "https://abcboxing.com/unified-rules-boxing/",
    },
    {
      label: "ABC Unified Rules of Boxing, amended August 2016 (PDF)",
      url: "http://www.abcboxing.com/wp-content/uploads/2016/10/unified_rules_boxing_rev_august2016.pdf",
    },
  ],
  related: ["moneyline-betting-explained", "prop-bets-explained", "vig-betting", "what-is-sports-betting"],
  updated: "2026-10-21",
};

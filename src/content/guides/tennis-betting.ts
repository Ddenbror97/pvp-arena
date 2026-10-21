import type { Guide } from "./types";

export const guide: Guide = {
  slug: "tennis-betting",
  cluster: "Sports betting",
  keyword: "tennis betting",
  secondary: ["tennis odds", "tennis point spread", "how to bet on tennis"],
  title: "Tennis Betting: Sets, Retirements and Match Odds",
  description:
    "Tennis betting prices a best-of-three or best-of-five match. A retirement is not a walkover. How either grades your ticket is on the slip, not in the rules.",
  h1: "Tennis betting: sets first, then whatever the slip says about a retirement",
  answer:
    "Tennis betting prices a match scored in games and sets. The ITF Rules of Tennis say a set is won by the first player to six games with a margin of two, and that at six games all a tie-break is played unless the competition chose another final-set rule. A match is best of three sets or best of five, as that event states. A retirement and a walkover are not the same event. No book on this page is told how to grade them.",
  facts: [
    "A standard set is six games, by two. A tie-break at 6-6 is first to seven points, by two.",
    "Best of three means two sets win the match. Best of five means three. The event chooses.",
    "A walkover is a match that does not start. A retirement is a player stopping after play has begun. Settlement of either is a market rule.",
    "A set handicap is not the match winner. You can win the match and lose the handicap.",
    "PVPspinArena does not book tennis.",
  ],
  sections: [
    {
      id: "score",
      title: "Games, sets, and the two match lengths",
      body: `Points make games. Games make sets. The 2026 Rules of Tennis say the first player to win six games wins the set if they lead by two, and that at six games all a tie-break game is played, first to seven points by two. They also say a match can be the best of three sets or the best of five. Grand slams and other events pick one. A coupon that does not say which format you are pricing has skipped the first fact.

A final set can be a match tie-break instead of a full set. That is a competition choice the rules allow events to make. It changes what "one more set" means. Read the event, not a generic memory of Wimbledon.`,
    },
    {
      id: "markets",
      title: "Match winner is not a game spread",
      body: `The match price is who wins the required number of sets. A game handicap, often mislabeled a point spread, adds a head start in games. A player can win a best-of-three match 6-0, 0-6, 6-4 and lose a large game handicap. A set handicap is a third bet. Total games is a fourth. Each one has its own price and its own hold.

[Prop bets explained](/guides/prop-bets-explained) is the family for handicaps and totals. [Vig betting](/guides/vig-betting) is the margin inside a two-way price. [What sports betting is](/guides/what-is-sports-betting) is the contract in general. Tennis is two-way in the match market because a completed match has a winner. That fact does not survive a retirement until the slip says so.`,
    },
    {
      id: "stop",
      title: "Walkover, retirement, and the blank rule",
      body: `If a player does not appear, the opponent is advanced by walkover. If a player starts and then stops, the match is a retirement, and the score stands where it stopped. Those are descriptions of the event. They are not a universal betting grade.

Some markets void if a retirement happens before a stated number of sets. Some pay the player who is ahead. Some pay the opponent only if one set is complete. Those three sentences are three different books, and this page will not pick one for them. Open the market rules and find the retirement paragraph before you bet a player who is taped up. If the paragraph is missing, skip the bet.

A walkover that happens before the first serve is even less like a played match. Do not assume it pays the same as a retirement at 6-6 in the third.`,
    },
    {
      id: "no-card",
      title: "No tennis market on this site",
      body: `PVPspinArena does not offer tennis betting. Adults only. [Responsible gambling](/responsible-gambling) applies to a day session that can become a long night match without a fixed clock. The hub is [sports betting](/guides/topics/sports-betting). The [terms](/terms) are not a tennis rulebook.`,
    },
  ],
  faqs: [
    {
      q: "Is every match best of three?",
      a: "No. The Rules of Tennis allow best of three or best of five. The event states which.",
    },
    {
      q: "What is a tie-break?",
      a: "At six games all in a standard set, the first player to seven points with a margin of two wins the game and the set. A competition can choose a different rule for the final set.",
    },
    {
      q: "Does a retirement pay the leader?",
      a: "Only if your market says so. Walkovers and retirements are different, and books grade them differently. Read the slip.",
    },
    {
      q: "Can I win the match and lose the bet?",
      a: "Yes, if you bet a game or set handicap and the winner's margin is smaller than the handicap.",
    },
    {
      q: "Does this site book tennis?",
      a: "No.",
    },
  ],
  sources: [
    {
      label: "ITF Rules of Tennis 2026 (PDF)",
      url: "https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf",
    },
  ],
  related: ["prop-bets-explained", "vig-betting", "what-is-sports-betting", "moneyline-betting-explained"],
  updated: "2026-10-21",
};

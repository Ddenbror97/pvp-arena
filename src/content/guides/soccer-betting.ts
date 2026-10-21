import type { Guide } from "./types";

export const guide: Guide = {
  slug: "soccer-betting",
  cluster: "Sports betting",
  keyword: "soccer betting",
  secondary: ["soccer odds", "soccer point spread", "how to bet on soccer"],
  title: "Soccer Betting: 1X2 Prices, Draws and the Hold",
  description:
    "Soccer betting's 1X2 price includes the draw. Ninety minutes plus stoppage is not extra time. A handicap that removes the draw is a different market.",
  h1: "Soccer betting: three results, and a clock that adds stoppage",
  answer:
    "Soccer betting starts from a match that can finish level. Under the IFAB Laws of the Game a match is two halves of 45 minutes, and the referee adds time lost in each half. The 1X2 price is home, draw, or away over that match, unless the coupon says it includes extra time. Extra time is a separate procedure of up to two 15-minute periods, used only when the competition requires a winner. The draw is a real result. This page quotes no price.",
  facts: [
    "Ninety minutes means two halves of 45, plus the referee's allowance. It does not mean the clock stops at 90:00.",
    "A draw is a completed result. 1X2 has three ways. A two-way handicap is a different bet.",
    "Extra time and penalties exist only when the competition rules require a winner after a draw.",
    "A goal after the 90th minute of play can still be inside the match, because of added time. A goal in extra time is outside a 90-minute market.",
    "PVPspinArena does not book soccer.",
  ],
  sections: [
    {
      id: "clock",
      title: "Stoppage time is still the match",
      body: `Law 7 says a match lasts two equal halves of 45 minutes, and that the referee allows for time lost to substitutions, injuries, time-wasting, sanctions, and the other causes the law lists. The fourth official shows a minimum. The referee can add more. A goal in the third minute of added time is a goal in the match.

That is the usual subject of a 1X2 coupon labeled 90 minutes. It is not a bet on who goes through in a cup tie. [What sports betting is](/guides/what-is-sports-betting) is the general idea of a graded result. Soccer is the sport where the draw has its own column.`,
    },
    {
      id: "three-ways",
      title: "1X2 is not a point spread",
      body: `Home, draw, away. The prices add to more than 100% of fair chances because of the hold. [Vig betting](/guides/vig-betting) is that gap, and it is wider to see when there are three numbers instead of two. [Moneyline betting explained](/guides/moneyline-betting-explained) is the two-way version used in sports that do not draw.

A point spread, sometimes sold as a handicap, removes the draw by giving one team a head start in goals. A 0-0 game can win a handicap for the underdog and lose a 1X2 home bet at the same time. Asian handicaps that can void on a push are another contract. Read the words on the coupon. "Spread" copied from a football page is how people mis-grade a draw.

[Prop bets explained](/guides/prop-bets-explained) covers corners, cards, and scorers. Those settle on the statistic's own clock, which is often the same 90 minutes and sometimes is not.`,
    },
    {
      id: "extra",
      title: "Extra time is a different match segment",
      body: `Law 10 says that when a competition requires a winner after a draw, the permitted procedures are the away-goals rule, two equal periods of extra time not exceeding 15 minutes each, and a penalty shoot-out, in the combination the competition chooses. Extra time is not added to every match. A league game that ends 1-1 is over.

A bet "to qualify" includes whatever the competition uses to break the tie. A bet "90 minutes" does not. Penalties are not goals in the match unless the market says they count. If the slip is silent, do not guess. Silence is a reason to skip the bet.`,
    },
    {
      id: "no-book",
      title: "No soccer coupon here",
      body: `PVPspinArena does not offer soccer betting. Adults only. [Responsible gambling](/responsible-gambling) applies to a Saturday list that can run to dozens of matches. The hub is [sports betting](/guides/topics/sports-betting). The [terms](/terms) describe this site's games, not a 1X2 board.`,
    },
  ],
  faqs: [
    {
      q: "Does 90 minutes include stoppage time?",
      a: "Yes. The referee adds time lost in each half. A 90-minute market includes that allowance and excludes extra time, unless the coupon says otherwise.",
    },
    {
      q: "Why is there a draw price?",
      a: "Because a match can end level. 1X2 is three results. A handicap that cannot draw is a different market.",
    },
    {
      q: "Do cup games always go to extra time?",
      a: "Only if that competition's rules require a winner and specify extra time. A league draw is a finished result.",
    },
    {
      q: "Are penalty-shootout goals match goals?",
      a: "Not in the Laws, and not in a 90-minute bet. A qualify market may use the shoot-out to decide who advances. Read which bet you bought.",
    },
    {
      q: "Can I bet soccer on this site?",
      a: "No.",
    },
  ],
  sources: [
    {
      label: "IFAB Law 7: the duration of the match",
      url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/",
    },
    {
      label: "IFAB Law 10: determining the outcome of a match",
      url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/",
    },
  ],
  related: ["what-is-sports-betting", "vig-betting", "moneyline-betting-explained", "prop-bets-explained"],
  updated: "2026-10-21",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pk-in-betting",
  cluster: "Sports betting",
  keyword: "what does pk mean in betting",
  secondary: ["pick em spread", "pickem tie rule", "draw no bet difference"],
  title: "PK in Betting: Pick’em Lines and Push Rules",
  description:
    "PK means pick’em, a zero-point spread. Learn how a tied score settles, why PK differs from a moneyline and how soccer draw-no-bet markets compare.",
  h1: "What does PK mean in betting? A zero-point spread",
  answer:
    "PK in betting means pick’em: neither side gives or receives points on a zero-point spread. Your team must win the covered period to win an ordinary two-way PK bet; a tied score pushes under standard two-way handicap rules. The odds can still differ between the teams. In soccer, distinguish PK or draw no bet from a three-way result that offers a separate draw selection.",
  facts: [
    "PK, pick’em and a spread of 0 describe the same handicap.",
    "A zero spread does not imply even-money odds.",
    "The game period and tie treatment still matter.",
    "A soccer three-way moneyline can lose on a draw where draw no bet refunds.",
  ],
  sections: [
    {
      id: "meaning",
      title: "Reading PK, 0 and the price",
      body: "A hypothetical ticket reading Team A PK (-115) has two separate terms: a zero handicap and a price of -115. A $115 stake wins $100 profit if Team A wins the covered period. If Team A loses, the bet loses. A tie pushes an ordinary two-way handicap. The PK label does not say the price is +100 or that each team has exactly a 50% chance.\n\nSee [point-spread betting](/guides/point-spread-explained), [moneyline betting](/guides/moneyline-betting-explained) and the [sports betting topic](/guides/topics/sports-betting) for the surrounding definitions.",
    },
    {
      id: "ties",
      title: "Soccer draws and overtime",
      body: "At a 1–1 soccer result, an ordinary zero-goal Asian handicap or draw-no-bet selection refunds the stake. A home-team selection in a three-way home/draw/away market loses instead, because draw is a separate outcome. A two-way label and a three-way label are different contracts even when the selected team is the same.\n\nFull-time soccer markets usually cover 90 minutes plus stoppage time, excluding extra time and penalties unless specified. NFL or basketball full-game markets can include overtime. Read the sport-specific rules and period on the receipt. [Draw no bet](/guides/draw-no-bet) explains the soccer refund structure.",
    },
    {
      id: "examples",
      title: "A zero-spread settlement example",
      body: "| Covered-period result | Ordinary two-way Team A PK |\n| --- | --- |\n| Team A wins 21–20 | Win |\n| Team A loses 20–21 | Loss |\n| Score finishes level | Push: stake returned |\n\nAt the example -115 price, a win returns $215 including a $115 stake. The break-even rate among decided bets is 115 / 215 = 53.49%. The handicap determines whether the ticket wins; the odds determine how much it pays.",
    },
    {
      id: "checks",
      title: "Check the market before accepting the ticket",
      body: "Confirm the team, sport, period, zero handicap, price and tied-score treatment. A market can move from PK to -1 after your bet; the accepted PK remains your line. Keep the receipt if the app’s current board changes.\n\nA push returns the stake on a straight bet; a pushed leg in a parlay can cause the remaining legs to be repriced under the operator’s rules. Teasers can use different tie terms. Set a spending limit before the game with [responsible gambling tools](/responsible-gambling).",
    },
  ],
  faqs: [
    {
      q: "Does PK mean even money?",
      a: "No. PK is a zero-point handicap. The selection can still be priced at -115, +105 or another set of odds.",
    },
    {
      q: "What happens if a PK game is tied?",
      a: "An ordinary two-way zero spread pushes. Check the sport and period rules, particularly for regulation-only and three-way markets.",
    },
    {
      q: "Is soccer PK the same as a three-way moneyline?",
      a: "No. A zero handicap or draw-no-bet selection refunds on a draw; a team selection in a home/draw/away market loses on a draw.",
    },
    {
      q: "Does a later line move change my PK bet?",
      a: "No. Grade the accepted handicap and price on the receipt. A later -1 or +1 line applies to a different wager.",
    },
  ],
  sources: [
    {
      label: "DraftKings: betting glossary and settlement terms",
      url: "https://support.draftkings.com/dk/en-us/glossary-of-betting-terms?id=kb_article_view&sysparm_article=KB0010398",
    },
    {
      label: "FanDuel Iowa: sportsbook rules, including sport-specific settlement",
      url: "https://policies.fanduel.com/SB/IA/2026-10-29T12-02-28.html",
    },
  ],
  related: [
    "nfl-betting",
    "prop-bets-explained",
    "house-edge",
    "middling-in-betting",
    "nrfi-betting",
  ],
  updated: "2026-11-26",
};

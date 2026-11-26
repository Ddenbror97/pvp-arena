import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ats-in-betting",
  cluster: "Sports betting",
  keyword: "what does ats mean",
  secondary: ["against the spread", "ats record", "cover the spread"],
  title: "What Does ATS Mean? Spread Results and Records",
  description:
    "Learn what ATS means, how favorites and underdogs cover, when a bet pushes, how to read an ATS record and why the odds affect break-even results.",
  h1: "What does ATS mean in betting?",
  answer:
    "What does ATS mean? ATS stands for against the spread. It measures whether a team beat the point spread, rather than simply won the game. A favorite at -3 that wins by two wins the game but loses against the spread; the underdog at +3 covers. A three-point margin is a push on an ordinary two-way -3/+3 spread.",
  facts: [
    "ATS results compare a team’s scoring margin with the accepted spread.",
    "Favorites can win without covering; underdogs can cover while losing.",
    "A whole-number spread can push; a half-point spread cannot tie an integer score.",
    "An ATS record needs a line source and push convention to be comparable.",
  ],
  sections: [
    {
      id: "grade",
      title: "How to grade a spread result",
      body: "Add the signed spread to your team’s score, then compare that adjusted score with the opponent’s. A higher adjusted score wins the spread bet, a lower score loses, and equality pushes an ordinary two-way spread.\n\n| Favorite’s margin | Favorite -3 | Underdog +3 |\n| --- | --- | --- |\n| Wins by 4 | Win | Loss |\n| Wins by 3 | Push | Push |\n| Wins by 2 | Loss | Win |\n| Loses the game | Loss | Win |\n\nFor a 24–21 final score, the favorite’s adjusted score at -3 is 21, equal to the opponent’s 21. At -2.5 it is 21.5, so the favorite covers. At -3.5 it is 20.5, so the favorite fails to cover. See [point spreads](/guides/point-spread-explained), [pushes](/guides/push-in-betting) and the [sports betting topic](/guides/topics/sports-betting).",
    },
    {
      id: "records",
      title: "Reading an ATS record and cover percentage",
      body: "A hypothetical 8–6–1 ATS record means eight covers, six non-covers and one push when displayed as wins–losses–pushes. Its cover percentage excluding pushes is 8 / 14 = 57.14%. Including the push in the denominator would give a different measure; a data provider should state its convention.\n\nA team can have a strong straight-up record and a weak ATS record because the spread already asks it to win by a substantial margin. Conversely, an underdog can have a poor league record while repeatedly losing by less than the spread. Neither record alone estimates the next game’s cover probability.\n\nTwo providers can grade the same team differently if one uses an opening spread and another uses a closing spread. A 24–21 result wins -2.5 but loses -3.5. Keep the date, opponent, line source and market period with any ATS statistic.",
    },
    {
      id: "price",
      title: "The spread determines the result; odds determine the money",
      body: "In a hypothetical -110 spread bet, risking $110 earns $100 profit if the team covers. The total return is $210 including the original stake; a losing bet costs $110. The break-even win rate excluding refunded pushes is 110 / 210 = 52.38%. A 50% cover rate at that price loses money over time.\n\nA 55% cover rate at one price is not equivalent to 55% at another. Compare returns using actual stakes and accepted odds rather than treating every ATS win as equal money. [Vig and sportsbook pricing](/guides/vig-betting) explains why the break-even rate exceeds 50% at -110.",
    },
    {
      id: "settlement",
      title: "Pushes, overtime and the number on your receipt",
      body: "FanDuel’s cited rules refund ordinary whole-number point spreads when the score lands exactly on the number. Three-way handicap markets, teasers and parlays can have different tie treatment; read their specific terms instead of copying the straight-bet rule.\n\nFull-game NFL and NBA spreads commonly include overtime, while quarter and regulation-only markets can differ. The sport, period and market label determine which score to use. A revised live spread or closing line does not replace the spread already accepted on your ticket.\n\nIf you track your own bets, record pushes separately and calculate net profit from returned money minus all stakes. Use [a bet tracker](/guides/bet-tracker) and set a fixed loss limit with [responsible gambling tools](/responsible-gambling) before staking on a cover streak.",
    },
  ],
  faqs: [
    {
      q: "Can a team win the game and lose ATS?",
      a: "Yes. A favorite at -3 that wins by two has a straight-up win and an ATS loss.",
    },
    {
      q: "Can an underdog lose and cover?",
      a: "Yes. At +3, an underdog losing by two covers; losing by four does not cover.",
    },
    {
      q: "What happens when the margin equals the spread?",
      a: "An ordinary two-way whole-number spread pushes and the stake is refunded. Three-way markets, teasers and some combination bets have separate tie rules.",
    },
    {
      q: "What does an 8–6–1 ATS record mean?",
      a: "When the provider uses wins–losses–pushes, it means eight covers, six losses and one push. Check which spread source and market period were used.",
    },
    {
      q: "Does a winning ATS record guarantee profit?",
      a: "No. Odds and stake sizes matter. At -110, the break-even rate excluding pushes is about 52.38%; past covers do not guarantee future results.",
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
    "house-edge",
    "prop-bets-explained",
    "pk-in-betting",
    "middling-in-betting",
  ],
  updated: "2026-11-26",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "nrfi-betting",
  cluster: "Sports betting",
  keyword: "nrfi",
  secondary: ["yrfi", "no run first inning", "first inning run"],
  title: "NRFI Betting Explained: First-Inning Run Rules",
  description:
    "NRFI means no run in the first inning. Compare YRFI, see which runs count, calculate break-even odds and check interrupted-game settlement rules.",
  h1: "NRFI betting: both halves of the first inning matter",
  answer:
    "NRFI betting means betting on no run in the first inning of a baseball game. Both teams must finish the covered first inning without scoring for an ordinary NRFI bet to win. YRFI is the opposite selection: at least one run in that inning. Later scoring does not change a first-inning result, though incomplete-game settlement follows the sportsbook’s rules.",
  facts: [
    "NRFI covers the top and bottom of the first inning.",
    "An earned or unearned run can defeat a no-run selection.",
    "YRFI needs at least one first-inning run by either team.",
    "A scoreless interrupted inning is not automatically a winning NRFI ticket.",
  ],
  sections: [
    {
      id: "result",
      title: "Which runs count?",
      body: "The inning’s official team score is what matters. A home run, a runner scoring on an error or a bases-loaded walk can all produce a run. A run scored in the second inning is outside a first-inning market. A batter reaching base in the first inning without scoring does not itself lose NRFI.\n\n| First-inning score | NRFI | YRFI |\n| --- | --- | --- |\n| Away 0, home 0, inning completed | Win | Loss |\n| Away 1, home 0 | Loss if the result stands under house rules | Win if the result stands under house rules |\n| Away 0, home 2 | Loss | Win |\n\nSee [run lines](/guides/run-line), [totals betting](/guides/over-under-betting) and the [sports betting topic](/guides/topics/sports-betting) for other baseball markets.",
    },
    {
      id: "price",
      title: "An NRFI price is not a success rate",
      body: "At hypothetical -130 odds, a $130 stake earns $100 profit on a win and returns $230 including stake. The break-even rate among decided bets is 130 / 230 = 56.52%. A quoted favorite can still lose, and a past scoreless-inning rate below that threshold would not justify the price on its own.\n\nConvert YRFI’s actual price separately. If NRFI is -130 and YRFI is +110 in an example market, their implied probabilities are 56.52% and 47.62%, totaling 104.14%. The excess is an overround calculation, not a measured profit margin or a forecast of that game.",
    },
    {
      id: "research",
      title: "What changes the matchup?",
      body: "Check the confirmed starting pitchers and batting orders, especially the hitters likely to appear in the first inning. Walks, extra-base hits and baserunning can matter as well as strikeouts. A pitcher’s full-game earned-run average is not a direct measure of the chance both teams score zero in one inning.\n\nSmall samples of recent NRFI results are noisy. Park, weather, lineup changes and the opposing pitcher can change the relevant conditions. A strong analysis can still lose on a single error or hit; the odds determine the probability needed to offset that risk.",
    },
    {
      id: "rules",
      title: "Rain, postponements and listed pitchers",
      body: "Read the operator’s first-inning and interrupted-game rules before relying on early settlement. A completed scoreless first inning and a rain delay with two outs in the top of the first are different situations. Some already-determined markets can stand when a full game is shortened; a still-undetermined scoreless inning may be void.\n\nConfirm whether the ticket has listed-pitcher conditions or action regardless of pitching changes. Save the receipt and official inning score if a grade is disputed. [Void-bet rules](/guides/void-bet-meaning) explain the general distinction, and [responsible gambling tools](/responsible-gambling) help set a limit for markets that resolve quickly.",
    },
  ],
  faqs: [
    {
      q: "Does NRFI require both teams to score zero?",
      a: "Yes. For an ordinary first-inning NRFI market, the completed top and bottom halves must both be scoreless.",
    },
    {
      q: "Does an unearned run count against NRFI?",
      a: "Yes. NRFI concerns runs on the team scoreboard, not just earned runs charged to a pitcher.",
    },
    {
      q: "Does a second-inning run affect the bet?",
      a: "No. A first-inning market is settled on that inning, subject to the operator’s interruption and validity rules.",
    },
    {
      q: "What happens if rain interrupts the first inning?",
      a: "Check the specific house rule. An incomplete scoreless inning is not a completed winning NRFI result; the wager may be void or handled under suspension rules.",
    },
    {
      q: "What is the break-even rate at -130?",
      a: "130 / 230, or about 56.52% among decided bets. This comes from the price, not from a forecast that NRFI will occur.",
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
  related: ["prop-bets-explained", "house-edge", "ats-in-betting", "first-touchdown-scorer-bets"],
  updated: "2026-11-26",
};

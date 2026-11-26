import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hot-hand-fallacy",
  cluster: "Casino knowledge",
  keyword: "hot hand fallacy",
  secondary: [
    "hot hand fallacy explained",
    "hot hand fallacy 2026",
    "streak shooting belief",
    "positive recency",
    "independent spins",
  ],
  title: "Hot Hand Fallacy: Independent Bets and Sports Evidence",
  description:
    "When does a streak change the odds? Compare independent casino draws with changing sports performance and understand the hot-hand research debate.",
  h1: "Hot hand fallacy: when a streak does and does not matter",
  answer:
    "The hot hand fallacy is the mistaken belief that recent successes improve the next chance when the trials are independent and the probability stays fixed. Sports performance is a separate empirical question: players and conditions can change, and later research identified bias in influential streak tests. A streak alone cannot establish an advantage in either setting.",
  facts: [
    "An independent fair coin remains one-half heads after a run of heads.",
    "Human performance is not automatically a sequence of identical independent trials.",
    "The 1985 hot-hand paper and a 2018 methodological critique address different evidence and statistical issues.",
  ],
  sections: [
    {
      id: "section-1",
      title: "The independent-draw calculation",
      body: `For an independent coin with heads probability one-half, conditioning on earlier heads leaves the next probability at one-half. Betting more changes the amount exposed, not that probability. [The gambler's fallacy](/guides/gamblers-fallacy) makes the opposite mistake: expecting a reversal because a result feels overdue.`,
    },
    {
      id: "section-2",
      title: "What the research debate concerns",
      body: `Gilovich, Vallone and Tversky's 1985 paper studied beliefs and basketball shooting sequences and argued against the perceived streak dependence in its evidence. Miller and Sanjurjo's 2018 paper showed a selection bias in commonly used conditional streak statistics, challenging influential analyses. It is therefore too broad to say that all later research disproves hot hands in every sport.

Neither paper changes the arithmetic of a stipulated independent coin. Whether a player's current performance probability changes requires an appropriate model and data.`,
    },
    {
      id: "section-3",
      title: "What evidence would justify changing a forecast?",
      body: `Look for information about a changed mechanism: injury, fatigue, shot quality, opponent or another relevant condition. Distinguish an apparent pattern selected after observing the data from a prediction tested on new data. Even a better forecast must be compared with the offered price. [Expected value](/guides/expected-value-gambling) and [regression to the mean](/guides/regression-to-the-mean-gambling) explain those separate questions.`,
    },
  ],
  faqs: [
    {
      q: "Does winning three independent bets improve the fourth?",
      a: "No. Under the stated fixed-probability independence assumption, the earlier results do not change the next chance.",
    },
    {
      q: "Is a hot hand impossible in sport?",
      a: "No. Changing performance is an empirical question; independent casino draws cannot settle it.",
    },
    {
      q: "What did Miller and Sanjurjo identify?",
      a: "A selection bias in a standard method of measuring outcomes following streaks, with implications for earlier hot-hand analyses.",
    },
    {
      q: "Is betting against the streak automatically better?",
      a: "No. On independent draws, both riding a streak and expecting an overdue reversal can misread unchanged odds.",
    },
  ],
  sources: [
    {
      label: "Miller and Sanjurjo: Surprised by the Hot Hand Fallacy?, 2018",
      url: "https://marketing.wharton.upenn.edu/wp-content/uploads/2018/11/Paper-Joshua-Miller.pdf",
    },
    {
      label:
        "Gilovich, Vallone, and Tversky, Cognitive Psychology 17 (1985), University of Texas copy",
      url: "https://labs.la.utexas.edu/gilden/files/2016/04/Gilo.Vallone.Tversky.pdf",
    },
  ],
  related: [
    "gamblers-fallacy",
    "house-edge",
    "slot-volatility",
    "roulette-calculator",
    "sunk-cost-fallacy-gambling",
    "keno-odds",
  ],
  updated: "2026-11-26",
};

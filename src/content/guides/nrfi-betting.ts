import type { Guide } from "./types";

export const guide: Guide = {
  slug: "nrfi-betting",
  cluster: "Sports betting",
  keyword: "nrfi",
  secondary: ["yrfi", "no run first inning", "first inning run"],
  title: "NRFI Betting: The First Inning Is the Bet",
  description:
    "NRFI means no run in the first inning. YRFI is the other side. This page prints no odds. The bet usually settles on the first inning only.",
  h1: "NRFI in 2026: the first inning settles the bet",
  answer:
    "NRFI means no run in the first inning of a baseball game. YRFI is the other side, a run scored in that same inning. This page prints no book's odds. The bet usually settles on the first inning only, not on the final score. A minus 130 figure below is a labeled suppose for break-even math. A $19 pot is a separate example. Adults 18 and older.",
  facts: [
    "NRFI is the first inning, not the full game.",
    "YRFI is the side that wants a run in that inning.",
    "No live odds are printed. The minus 130 price is a suppose.",
    "Break-even on that suppose is 130/230, about 56.5%.",
    "The Jackpot example is a $19 pot.",
  ],
  sections: [
    {
      id: "what",
      title: "What NRFI is asking the first inning to do",
      body: `NRFI is a yes-or-no on the first inning of a baseball game. No run first inning means both teams come off that inning without a run on the board. The rest of the night can be a slugfest.

The ticket does not care, if it was written to settle on the first inning only. That "usually" matters. The ticket in your hand is the rule.

This page describes the common shape and does not reprint a book's fine print.

YRFI is the other side of the same inning. A first inning run, by either team, wins the YRFI ticket and loses the NRFI ticket under the ordinary reading. You are not betting who wins the game.

You are betting whether the first inning stays quiet.

### A first inning run is the whole argument

A first inning run is one event. A leadoff walk, a stolen base, and a single can produce it. A strikeout, a grounder, and a fly can prevent it.

The final score two hours later is a different event. People lose the NRFI side, watch their team come back, and feel the ticket "should" have waited. The ticket was not a moneyline.

It already settled.

[Side markets that are not the final score](/guides/prop-bets-explained) is the family this bet belongs to. A prop can be a player's stat or an inning's silence. The family resemblance is that the contract is narrower than the game.

[Why a quoted price is shorter than an even chance](/guides/house-edge) is why a minus price needs more than half your bets to break even. [Grading a football margin](/guides/ats-in-betting) is a different sport and a different contract, useful only as a contrast: NRFI does not ask who covered.

The cluster is [sports-betting guides](/guides/topics/sports-betting).

Editorial explainer. Not a pick on a pitcher, not a code, and not a book's board. A later link that leaves for a sportsbook should be read as advertising.`,
    },
    {
      id: "compared",
      title: "Quiet inning, noisy inning, full game",
      body: `Three contracts. Only one of them is allowed to ignore the eighth inning.

| | NRFI | YRFI | A full-game moneyline |
| --- | --- | --- | --- |
| What wins it | no run in the first inning | a run in the first inning | who wins the game |
| Later innings | ignored, under the usual rule | ignored, under the usual rule | they are the bet |
| Odds this page prints | none; the suppose is labeled | none | none |
| Sample hit rate | not printed | not printed | not printed |
| Relation to our pot | none | none | none |

No run first inning is a description, not a price. Two pitchers can make the inning look likely to stay quiet and the price can already reflect that. The likelihood you feel and the likelihood the price implies are the thing you would be betting.

This page has no price from a book, so it will not tell you the feeling is right.

Rain, a delay, or a game that never finishes the first inning is a ticket question. Some books void. Some wait.

This article does not choose a rule for them. If the first inning is incomplete, read the ticket. Do not borrow a void policy from a chat.`,
    },
    {
      id: "fees",
      title: "No board price, one classroom break-even",
      body: `The fee on a sports bet is inside the odds. Because no book's NRFI odds are printed, the fee cell stays not published. A suppose shows how to turn one American price into a break-even percent.

It does not turn into their hold.

| | fee or edge | who you play against | payout speed | provably fair | minimum bet |
| --- | --- | --- | --- | --- | --- |
| An NRFI ticket | not published; the suppose is not a book | the price you were offered | not published | not published | not published |
| House-banked casino | inside the paytable; no percent is fixed here | the house | not published | not published | not published |
| PvP Spin Arena | Jackpot keeps 5% of the pot at settlement. Winner receives 95% | other players | balance updates when the round settles | yes, seed committed before the round | shown on the bet control |

Suppose NRFI is -130. You risk $130 to win $100 of profit. The break-even rate is 130 divided by 230, because 130 plus the 100 you are trying to win is 230.

That is about 56.5%. You need the quiet inning a bit more often than 56 times in 100 identical supposes to cover the price. The figure is classroom arithmetic.

It is not an opinion that any game is 56.5% likely to stay quiet, and it is not a posted line.

The $19 pot is separate. Five percent of $19 is $0.95. The winner receives $18.05.

That percent is our Jackpot rule. It is not a conversion of -130 into a pot.

Payout speed on a first-inning ticket is not published. Grading should be quick when the inning ends, and a book can still wait on its own rules. Our balance updates when the round settles.

The bet control shows our minimum.`,
    },
    {
      id: "steps",
      title: "How to read a first-inning ticket",
      body: `Settle the contract before you settle the matchup.

1. Read whether the ticket is NRFI or YRFI. They are opposite answers to one inning.
2. Read whether both halves of the first inning must be played. This page will not guess your book's rain rule.
3. Ignore the final-score habit. Write down that later innings are outside the usual contract.
4. If you are practicing break-even, use a labeled suppose. Do not paste this page's -130 onto a live board.
5. Compute 130/230 only for that suppose, and label the 56.5% as break-even, not as a prediction.
6. If you switch to our pot, read the stake on the bet control. There is no inning.
7. Use the seed check only on our round. It does not know whether a batter scored.

No step names a pitcher. No step says the inning will be quiet.`,
    },
    {
      id: "examples",
      title: "Suppose -130, then a $19 pot",
      body: `Suppose NRFI is -130. Stake $130. If the first inning stays scoreless and the ticket grades as a win, profit is $100.

If a run scores and the ticket loses, the $130 is gone. Break-even is 130/230. Divide 130 by 230 and you get about 0.565, which is about 56.5%.

Label every number in this paragraph Suppose. This page prints no book's odds. The -130 exists so the division has an input.

It is not a quote you can show a window.

The suppose does not say YRFI is plus anything. The other side has its own price at a real book, and that price is not published here. Do not assume the two sides add to a number this article failed to compute.

A book's hold sits between the two prices. Without both prices, the hold stays unknown.

A quiet first inning followed by ten runs is still an NRFI win under the usual rule. A first-inning run followed by a shutout the rest of the way is still an NRFI loss under that same usual rule. The final score is scenery.

Scenery is why the bet feels confusing. The contract is short.

Example. Jackpot pot of $19. The fee at settlement is 5%, so $0.95.

The winner receives $18.05. There is no inning, no pitcher, and no -130. The pot is this article's example.

It is not a live pot and not a baseball ticket.

Do not average 56.5% with 5% . One is a break-even rate on a classroom price. The other is a fee on a dollar pot.

They do not share a denominator.`,
    },
    {
      id: "data",
      title: "How the pot compares with a first-inning ticket",
      body: `Open [the Jackpot](/) for the $19 example. Stakes are US dollars. Five percent stays with the site at settlement.

The winner receives 95%. A settled-round block can appear from play. It is not a box score, and this guide pastes neither.

[Fairness](/fairness) recomputes a seed committed before the round. The check matches commit to result. It does not score a baseball inning, audit a sportsbook, or store a pitcher's history.

A quiet inning is not a hash.

Funding is USDC or ETH on Base, or Bitcoin through the cashier. No treasury address is printed. A sportsbook balance is not this cashier.

Coinflip keeps 5% of its pot and cannot be canceled. Roulette takes 5% from a winning payout. Slott keeps 10% on a win.

None of them settles at the end of a first inning, because none of them has innings. A prop ticket and a pot can both be short contracts. Short does not make them the same contract.`,
    },
    {
      id: "checklist",
      title: "Checklist before you bet the first inning",
      body: `The boxes keep the full game out of a short ticket.

- [ ] I can say NRFI means no run in the first inning.
- [ ] I can say YRFI is the side that wants a run in that inning.
- [ ] I know the bet usually ignores the final score.
- [ ] I will read the ticket for a game that never finishes the inning.
- [ ] I am not quoting this page as a book's odds.
- [ ] The -130 suppose breaks even at 130/230, about 56.5%, and that percent is not a prediction.
- [ ] I did not invent a hit rate for how often first innings stay quiet.
- [ ] The $19 pot fees $0.95 and pays the winner $18.05, apart from the suppose.
- [ ] I am 18 or older.
- [ ] I am not treating this page as a pick or a code.`,
    },
    {
      id: "risks",
      title: "Flags that show up on a one-inning bet",
      body: `The final-score mix-up is the common flag. You win the game in your head and lose the ticket in the first inning, or the reverse. The feeling of injustice is the feeling of having bet a different contract than the one you remember.

Write the inning on the note before you stake.

Price amnesia is the next flag. A minus number feels like a favorite, so it feels safe. The suppose shows the cost of that feeling: you need about 56.5% just to break even at -130, and that -130 was never a live quote.

A real board can be shorter or longer. Shorter means the break-even climbs. This page will not climb it for a number it does not have.

Pitcher news is the third flag. A late scratch changes the inning and may change the price. This article prints no pitcher, so it cannot tell you the scratch was good or bad.

If your ticket depends on a named starter, read the book's rule for a scratch. It is not supplied here.

Chasing a noisy inning with a second game's NRFI is the loop. One run in the first felt unlucky. The next game is a new price and a new inning.

Unlucky is not a debt the next leadoff hitter pays.

Sample stories are the last flag. A weekend of quiet innings is not a rate. No rate is printed.

Do not let three games become a system.`,
    },
    {
      id: "legal",
      title: "Age and the limits of a one-inning explainer",
      body: `Be 18 or older. A prop that lasts twenty minutes is still a wager. A book with a higher age floor can enforce it.

This page is not a legal opinion, not tax advice, and not a financial plan. Whether you may bet baseball where you live is a local rule. This article does not cite a statute, a league policy, or a license number.

Books write their own terms for incomplete innings. Those terms are theirs.

[Responsible gambling](/responsible-gambling) fits a bet that resolves fast. Fast bets invite another one before the second inning is over. Decide the session cap in dollars before the first pitch, not after a YRFI loss stings.

The guide is editorial. It explains a contract. It does not pick a side.

Any later outbound link to a book should be read as advertising.`,
    },
  ],
  faqs: [
    {
      q: "What does NRFI mean?",
      a: "No run in the first inning. Under the usual ticket, both teams fail to score in that inning and the bet is over. The final score is not the grade.",
    },
    {
      q: "What is YRFI?",
      a: "The other side. YRFI wins if a run scores in the first inning. It is not a bet on who wins the game, and this page prints no price for it.",
    },
    {
      q: "Does this page list no run first inning odds?",
      a: "No book's odds are printed. Suppose the price is -130. Break-even is 130/230, about 56.5%. That percent is classroom math, not a prediction and not a posted line.",
    },
    {
      q: "Does the bet wait for the final score?",
      a: "Usually it does not. It settles on the first inning. If the inning never finishes, the ticket's own rule decides. This page does not supply a book's rain rule.",
    },
    {
      q: "What is the $19 pot?",
      a: "A Jackpot example. Five percent is $0.95. The winner receives $18.05. It is not a baseball price and not a translation of the -130 suppose.",
    },
    {
      q: "Is a first inning run a pick from this site?",
      a: "No. No pitcher, no team, and no live odds. The page explains the contract. A later link to a book should be read as advertising.",
    },
  ],
  sources: [],
  related: ["prop-bets-explained", "house-edge", "ats-in-betting"],
  updated: "2026-10-20",
};

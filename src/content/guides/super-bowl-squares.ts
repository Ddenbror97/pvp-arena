import type { Guide } from "./types";

export const guide: Guide = {
  slug: "super-bowl-squares",
  cluster: "Sports betting",
  keyword: "super bowl squares",
  secondary: ["football squares rules", "Super Bowl box pool", "best square numbers", "10 by 10 squares"],
  title: "Super Bowl Squares: Rules, Best Numbers and Odds",
  description:
    "How to run Super Bowl squares: rules, payout setups, the best and worst numbers by historical odds, and how to play squares with friends online.",
  h1: "Super Bowl Squares: Rules, Best Numbers and Odds",
  answer:
    "Super Bowl squares is a pool on a 10 by 10 grid. One hundred squares. Digits 0 through 9 are assigned at random to each team, usually after the squares are claimed. You win a quarter if the last digit of each team's score matches your square. If the grid is 10 by 10 and the digits are random, the chance your one square wins a given quarter is 1 in 100. Some last digits show up more often in NFL scores. That history is a tendency, not a guarantee, and it does not change the 1 in 100 when you cannot pick the digits. Adults 18+ only. Not a pick sheet.",
  facts: [
    "A full grid has 100 squares. Random digits give each square a 1 in 100 chance at each quarter.",
    "The winning pair is the last digit of one team's score and the last digit of the other's.",
    "Random assignment makes every square equal before the draw, even though score digits are not equal.",
    "Historically, 7 and 0 often lead as final digits of NFL scores. That is a tendency, not a promise.",
    "Payout weights change variance. They do not change a fair square's share if every dollar is paid out.",
    "A host cut makes the pool negative expectation. Adults 18+ only. This is not a sportsbook line.",
  ],
  sections: [
    {
      id: "rules",
      title: "How to run the grid",
      body: `Super Bowl squares need a written rule before anyone pays. Draw a 10 by 10 grid. One hundred boxes. Players take one or more boxes. After the boxes are claimed, assign the digits 0, 1, 2, 3, 4, 5, 6, 7, 8, and 9 to the columns and, separately, to the rows. One team is the rows. The other team is the columns. Pull the digits from a hat or a shuffle so nobody chooses 7 after seeing a chart.

At the end of each quarter, look at the last digit of each score. A score of 17 ends in 7. A score of 20 ends in 0. The square where those two digits meet wins that quarter. The winner does not need to know anything about the teams. That is why the pool works at a party.

Write the overtime rule. A common version folds overtime into the final score, so the fourth quarter square uses the score when the game actually ends. Another version freezes the score at the end of regulation. Both are coherent. Only one can be yours. Write it before kickoff. Also write what happens if a square is unpaid: redraw it, shrink the pot, or keep a house square. Silence becomes a fight in the fourth quarter.

[Bet with friends online](/guides/bet-with-friends-online) is the page for settling a friends' pool without pretending it is a book. [Bracket pool](/guides/bracket-pool) is a different friends' game, scored by rounds, not by last digits. [NFL betting](/guides/nfl-betting) is the sportsbook menu, spreads and totals, which this grid is not.

[Sports betting guides](/guides/topics/sports-betting) holds those explainers. Adults 18+ only. PVPspinArena does not run squares. [Fairness](/fairness) checks hashed games. [Jackpot](/) is a pot with a published fee, not a 10 by 10. [Responsible gambling](/responsible-gambling) still applies to a party pool if the stakes are money you cannot lose.`,
    },
    {
      id: "fair-math",
      title: "The 1 in 100 that you should trust",
      body: `There are 100 digit pairs. Each pair from 0–0 through 9–9 appears once if every digit is used once per axis. If those digits are assigned at random after you own a square, your square is equally likely to be any pair. Exactly one pair will match the score at the end of a quarter. Therefore the chance that your one square is the winner of that quarter is 1/100.

That sentence survives the fact that some digits happen more often in real NFL scores. Frequency would matter if you picked the digits. You did not. The popular pair and the rare pair are handed out by the shuffle. Before the shuffle, every paid square has the same chance. After the shuffle, you know which pair you hold, and then the historical tendency describes that pair. It still does not rewrite the pre-draw 1/100.

If the grid is not full, blanks can "win" a quarter unless you redraw only across paid squares. Write that rule before kickoff. Two random squares are 2/100 for one quarter on a full grid. They do not guarantee a hit across the night.

A sportsbook spread is a different product. The square does not care who covers. [Peer to peer gambling](/guides/peer-to-peer-gambling) is the nearer idea: people staking each other. A friends' pool has no hashed reveal unless you add one. Trust is the shuffle everyone watched.`,
    },
    {
      id: "numbers",
      title: "Best and worst digits, as a tendency",
      body: `NFL scores are built from touchdowns, extra points, field goals, and the occasional safety. Those chunks make some last digits more common than others across a long history of games. The tendency, not a guarantee for this Super Bowl, is that 7 and 0 often lead the list of final digits. Digits such as 2, 5, and 9 are often quieter. This page does not quote a percentage. A chart with a precise hit rate is someone else's sample. Treat it as history. The next game can end 9–6.

| Digit | Historical tendency, not a promise |
| --- | --- |
| 0 | Often among the most common final digits |
| 7 | Often among the most common final digits |
| 3 | Common enough to matter, because field goals are 3 |
| 1, 4, 6, 8 | Often in the middle of published tallies |
| 2, 5, 9 | Often among the least common final digits |

The winning result is a pair, one digit per team. A 7 with a 0 is a pair people want after the draw. A 5 with a 2 gets a groan. If the shuffle is still ahead, neither reaction changes the 1/100. Choosing a square after the digits are posted is a different game. Charge for that choice or do not allow it. A digit that led for years can miss on Sunday. Tendency is not a ticket.`,
    },
    {
      id: "payouts",
      title: "Payout setups and what they change",
      body: `The pot is whatever was paid in, minus anything the host keeps. If the host keeps something, say so in the rules. A silent cut is how friends stop playing next year. If every dollar is paid back, a full 100-square grid is a fair swap of variance. Your expected share of a quarter is 1/100 of that quarter's purse. Your expected share of the whole pot is 1/100, before anyone talks about lucky numbers.

Weights change which quarter pays more. They do not change that sum, as long as the weights add to the whole pot and every square is equally likely.

| Setup | First quarter | Halftime | Third quarter | Final |
| --- | --- | --- | --- | --- |
| Equal quarters | 25% | 25% | 25% | 25% |
| Back-loaded | 20% | 10% | 20% | 50% |
| Final only | 0% | 0% | 0% | 100% |

Equal quarters spread the cheers. A back-loaded pot makes the final the story. Final-only is one 1/100 shot at the entire pot. The fair share stays put if every dollar is paid and digits are random. Variance is what changes. Write the four shares so they add to the pot you promised. A setup that adds to 90% is a 10% cut. Name it. Screenshot the grid after the draw and before kickoff.`,
    },
    {
      id: "example-equal",
      title: "Worked example: $10 squares, equal quarters",
      body: `Illustration. One hundred squares at $10. Pot is $1,000. Nobody keeps a cut. Payouts are equal, so each quarter pays $250. Digits are assigned at random after the squares are sold.

Your one square wins a given quarter with probability 1/100. Expected cash from one quarter is 0.01 times $250, which is $2.50. Expected cash from four quarters is $10. That matches what you paid. The pool is fair in the mathematical sense. It is not a favor and not an edge.

If the host keeps $100 and pays out $900, expected return on one square is $9, not $10. You paid $10 for $9 of expectation. That is a fee. Fees are allowed if they are written. A free sheet among friends can be a zero-dollar fee. Say which one you are running.`,
    },
    {
      id: "example-weighted",
      title: "Worked example: the same pot, back-loaded",
      body: `Second illustration. Same $1,000 pot, same 100 random squares, same $10 price. Payouts are 20%, 10%, 20%, and 50%. The purses are $200, $100, $200, and $500.

Expected value is 0.01 times $200, plus 0.01 times $100, plus 0.01 times $200, plus 0.01 times $500. That is $2 + $1 + $2 + $5 = $10. The fair share did not move. What moved is the spread of outcomes. Hitting the final pays $500 instead of $250. Missing the final hurts more. The second quarter pays a small $100, which is easy to sneer at and still part of the $10.

Do not quote 1/100 for a square you picked from a chart of 7s and 0s. The 1/100 is the random-assignment result only. A chosen pair has whatever chance the score digits actually have, and this page will not invent that percentage. Weighted and equal pots are both fair at $10 when the pot is fully paid and the digits are shuffled. A cousin who picks first after the numbers are up is not playing that game.`,
    },
    {
      id: "checklist",
      title: "Checklist before anyone pays",
      body: `Read this to the group. Then take the money.

- The grid is 10 by 10, or you rewrote the 1/100 for a different size.
- Digits are shuffled after squares are claimed, unless you are openly selling chosen numbers at unequal prices.
- Row team, column team, and the overtime rule are written.
- Unpaid squares have a rule: redraw, refund, or house square.
- The four payouts add to the pot you claimed you would pay. Any cut is named.
- A copy of the filled grid exists before kickoff.
- Stakes are money the room can lose. Adults 18+ only. No one is spotting a square "just this once" from rent.

If a box is blank, stop selling. Super Bowl squares fail in the rules, not in the digits. The math you should remember is the short one: one square, random digits, full grid, 1/100 per quarter.`,
    },
  ],
  faqs: [
    {
      q: "How do Super Bowl squares work?",
      a: "Players claim boxes on a 10 by 10 grid. Digits 0 through 9 are assigned at random to each axis, one team per axis. At the end of a quarter, the last digit of each score picks the winning box. Write whether overtime counts in the final before anyone pays. A full random grid gives each single square a 1 in 100 chance at a given quarter.",
    },
    {
      q: "What are the best Super Bowl square numbers?",
      a: "As a historical tendency, not a guarantee, 7 and 0 often lead the final digits of NFL scores. Digits such as 2, 5, and 9 are often less common. That matters if you choose digits. If digits are assigned at random, every square is 1 in 100 before the draw. One Super Bowl can ignore the tendency completely. Do not treat a chart as a promise.",
    },
    {
      q: "Is every square a fair 1 in 100?",
      a: "Yes, when the grid is full, you hold one square, and the digits are assigned at random. There are 100 pairs and one winning pair per quarter, so your chance is 1/100. Uneven score digits do not break that result, because you did not pick the pair. Chosen numbers, blank squares, or a host cut are different games. Write those rules down.",
    },
    {
      q: "Do payout weights change the odds?",
      a: "They change how much each quarter pays, not the 1/100 chance under random digits. A $1,000 pot paid in full still returns $10 of expectation on a $10 square, whether quarters are equal or the final takes half. Weights change variance. A host percentage changes expectation. Name the cut or do not take one.",
    },
    {
      q: "Can I play Super Bowl squares on PVPspinArena?",
      a: "No. This site does not run a squares grid or an NFL pool. Jackpot, Coinflip and Roulette are the games, adults 18+ only. A hashed pot is not a 10 by 10 of last digits. Run squares with friends under rules you write down, or skip them.",
    },
  ],
  sources: [
    { label: "NFL", url: "https://www.nfl.com" },
    { label: "Wikipedia: Super Bowl", url: "https://en.wikipedia.org/wiki/Super_Bowl" },
    { label: "Wikipedia: Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
  ],
  related: ["bet-with-friends-online", "bracket-pool", "nfl-betting", "peer-to-peer-gambling"],
  updated: "2026-10-06",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "craps-field-bet",
  cluster: "Casino games",
  keyword: "craps field bet",
  secondary: ["craps field bet odds", "craps field bet payout", "craps field bet explained"],
  title: "Craps Field Bet Odds on Two Payoff Schedules",
  description:
    "A craps field bet wins on 2, 3, 4, 9, 10, 11 or 12. If 2 and 12 both pay 2 to 1, the edge is about 5.56%. If 12 pays 3 to 1, it is about 2.78%.",
  h1: "Craps field bet: one roll, and the payoff on 2 and 12",
  answer:
    "A craps field bet wins if the next roll totals 2, 3, 4, 9, 10, 11, or 12, and it loses on 5, 6, 7, and 8, with the edge set by how 2 and 12 are paid. If both pay 2 to 1, the edge is 2/36, about 5.56%, and if 2 pays 2 to 1 and 12 pays 3 to 1, the edge is 1/36, about 2.78%, which are the only two edges on this page. The pass line is a different bet and is not re-taught here, and you must be 18 or the higher local age.",
  facts: [
    "Winning totals are 2, 3, 4, 9, 10, 11, and 12. That is 16 of the 36 dice pairs.",
    "Losing totals are 5, 6, 7, and 8. That is 20 pairs.",
    "Schedule A: 2 and 12 both pay 2 to 1. The edge is 2/36, about 5.56%.",
    "Schedule B: 2 pays 2 to 1 and 12 pays 3 to 1. The edge is 1/36, about 2.78%.",
    "Any other payoff pair is not priced here.",
    "The field is one roll. It is not the pass line, and this page does not rebuild that lesson.",
  ],
  sections: [
    {
      id: "what",
      title: "Which totals the field accepts",
      body: `The field is a one-roll bet in the middle of a craps layout. You put the chip down, the dice leave the stick, and the total either hits the printed numbers or it does not. There is no point and no come-out phase inside this chip.

The winning totals are 2, 3, 4, 9, 10, 11, and 12. Count the ways with two dice.

A 2 can be made one way. A 3 can be made two ways.

A 4 can be made three ways. A 9 can be made four ways.

A 10 can be made three ways. An 11 can be made two ways.

A 12 can be made one way. Those add to 16 ways.

The other 20 ways lose: 5 (four ways), 6 (five), 7 (six), and 8 (five). Sixteen plus twenty is the full 36.

If every winning total paid even money, the player would be four ways behind. The extra pay on 2 and 12 exists to give some of those ways back. How many it gives back is the whole price difference on this page.

[Craps odds](/guides/craps-odds) is where the pass line is explained. This guide does not repeat that sequence.

[Online craps](/guides/online-craps) covers the table in general. The [casino games topic hub](/guides/topics/casino-games) is the index.`,
    },
    {
      id: "schedules",
      title: "Two payoff schedules, labeled",
      body: `Read the layout before you quote an edge. The field's name stays the same when the 12 changes from 2 to 1 into 3 to 1. The arithmetic does not stay the same.

Schedule A pays 2 to 1 on both 2 and 12, and even money on 3, 4, 9, 10, and 11. The two single-way totals each hand the player one extra unit compared with even money.

That returns 2 of the 4 missing ways. The edge is 2/36, about 5.56%.

Schedule B pays 2 to 1 on the 2 and 3 to 1 on the 12, with the same even money on the other winning totals. The 12 now returns one further unit.

The edge falls to 1/36, about 2.78%. Label the schedule in your notes. A bare "field edge" with no payoff is an unfinished sentence.

| Schedule | Pay on 2 | Pay on 12 | Pay on 3, 4, 9, 10, 11 | Edge |
| --- | --- | --- | --- | --- |
| A | 2 to 1 | 2 to 1 | even money | 2/36, about 5.56% |
| B | 2 to 1 | 3 to 1 | even money | 1/36, about 2.78% |
| Any other pair of pays | not published | not published | not published | not published |

Per $1 bet over 36 equally likely pairs, Schedule A loses $2 in total. Schedule B loses $1 in total.

Divide by 36 and you have the edges above. Do not average the two schedules into a third number. The layout uses one of them.`,
    },
    {
      id: "fees",
      title: "Craps field bet odds next to a pot fee",
      body: `Craps field bet odds on this page means Schedule A or Schedule B, nothing else. A layout that pays 2 to 1 on the 2 and even money on the 12 is a different bet.

Its edge is not published here. Ask the box or read the help screen, then write the words you actually see.

The house keeps the edge inside the payoff. You do not see a separate commission when the dice win.

A winning even-money total returns the stake plus the same amount. A winning 2 on either schedule returns two units of profit plus the stake. Only the 12 changes between A and B.

Peer games publish a different kind of price. Jackpot and Coinflip take 5% of the pot.

That 5% is not 5.56% and it is not 2.78%. It is a cut of a pot between players, taken when the round is settled.

How the peer pot compares: open [coinflip](/coinflip) for the two-person game and [fairness](/fairness) to check a settled result. The live block, where a game page has one, tracks settled results. This article does not paste a recent roll or a recent coin.

Balances are US dollars, funded with Bitcoin, or with USDC or ETH on Base. No treasury address is printed in this guide.

| Item | Field, Schedule A or B | House-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| Price | 2/36 or 1/36, as labeled | not published if the payoff differs | 5% of a Jackpot or Coinflip pot |
| Who you face | the payoff schedule | the house | other players |
| When you are paid | not published as a cashier time | not published | when the round settles |
| Promo code | we do not list a promo code | not published | we do not list a promo code |`,
    },
    {
      id: "examples",
      title: "A $36 chip on Schedule A, an $18 chip on Schedule B",
      body: `The dice examples use the fractions above. The peer examples use our fee. They are labeled so they are not one blended percentage.

Schedule A dollars. You bet $36 on a field where 2 and 12 both pay 2 to 1.

The edge is 2/36. Two thirty-sixths of $36 is $2.

Across many bets of this size, the average loss is $2 a decision. One decision still wins or loses in full.

A 9 pays even money, profit $36. A 12 pays 2 to 1, profit $72.

A 7 loses the $36. The $2 is the average, not a fee skimmed off the win.

Same $36 compared with a Jackpot, which is not dice. Four players each stake $36.

The pot is $144. Five percent is $7.20.

The winner receives $136.80. The $7.20 comes out of a shared pot. It is not the field's $2 average.

Schedule B dollars, different amount. You bet $18 where 12 pays 3 to 1 and 2 pays 2 to 1.

The edge is 1/36. One thirty-sixth of $18 is $0.50 of average loss.

A 12 on this schedule pays 3 to 1, profit $54 on the $18. That fatter 12 is why the average loss is smaller than Schedule A, and it is still a loss on average.

Coin comparison at $18 a side. The Coinflip pot is $36.

Five percent is $1.80. The winner receives $34.20. The craps field bet payout never enters that coin.`,
    },
    {
      id: "checklist",
      title: "Checks before the field chip lands",
      body: `The layout's printed pays are the contract. Your memory of another casino is not.

- Read the pay next to the 2. Write 2 to 1 only if you see it.
- Read the pay next to the 12. Decide whether you are on Schedule A or Schedule B.
- If the pays match neither schedule, mark the edge not published and skip this page's percentages.
- Confirm the winning totals are 2, 3, 4, 9, 10, 11, and 12.
- Keep this chip off the pass line. They are different bets.
- Bet a unit you can multiply by 2/36 or 1/36 without shrugging.
- You are 18 or the higher local age.
- Set a one-roll budget. The field resolves every throw, so the budget can vanish quickly.
- Do not press the bet because the last three rolls were 9s.
- Stop at the budget even if the next roll "should" be a 12.`,
    },
    {
      id: "risks",
      title: "One-roll habits that raise the bill",
      body: `The field resolves on every throw. A pass-line player might wait through a point.

A field player pays the edge on roll after roll. That speed is the practical risk. A 5.56% edge sampled thirty times in an hour is a different evening from a line bet that resolves twice.

Players also blur Schedule A into Schedule B after they move tables. The 12 looks similar on the felt.

The multiple is a small mark beside the number. Missing it means you quoted 2.78% on a 5.56% game, or the reverse. Quote the mark you see.

A winning streak of 4s and 9s is sixteen-way noise, not a hot field. The next roll is still 36 pairs.

[The house edge idea](/guides/house-edge) is the general warning against turning a short run into a new price. We do not list a promo code that changes these multiples.`,
    },
    {
      id: "legal",
      title: "Age and walking off a fast bet",
      body: `Craps is for adults. Eighteen is the minimum in this guide.

A higher local age replaces it. This is not legal advice and not a claim that every jurisdiction offers a dice table.

Online layouts must be offered by an operator who is allowed to take your bet. A crypto deposit is not a workaround. If the help screen will not name the payoff on 12, do not guess Schedule B because it is the friendlier one.

Because the field can be bet every roll, the session clock runs hot. Open [a hard stop for table play](/responsible-gambling) before the chip becomes automatic. The next toss is not owed to you.`,
    },
    {
      id: "closer",
      title: "Name the schedule, then the fraction",
      body: `A craps field bet wins on 2, 3, 4, 9, 10, 11, or 12. Schedule A, with 2 and 12 both at 2 to 1, keeps 2/36, about 5.56%.

Schedule B, with 12 at 3 to 1 and 2 at 2 to 1, keeps 1/36, about 2.78%. Other payoffs stay unpublished on this page.

The pass line is a different chip with a different article. Do not borrow this edge for that chip, and do not borrow the pass edge for the field.

When you want a fee written in dollars before the outcome, use a Jackpot or a Coinflip and take 5% of the pot as the price. Leave the dice when the one-roll budget is spent. The layout will still be there tomorrow, on whatever schedule that casino printed.`,
    },
  ],
  faqs: [
    {
      q: "What are craps field bet odds if 2 and 12 both pay 2 to 1?",
      a: "That is Schedule A. The edge is 2/36, about 5.56%. Sixteen ways win and twenty lose, and the double pay on 2 and 12 gives back two of the four missing ways.",
    },
    {
      q: "What is the craps field bet payout if 12 pays 3 to 1?",
      a: "That is Schedule B when the 2 still pays 2 to 1. A $18 winner on 12 pays $54 profit. The edge on that schedule is 1/36, about 2.78%.",
    },
    {
      q: "How is a craps field bet explained in one sentence?",
      a: "It is a one-roll bet on 2, 3, 4, 9, 10, 11, or 12, priced by the multiples on 2 and 12. It is not the pass line.",
    },
    {
      q: "Does the field lose on 7?",
      a: "Yes. A 7 is one of the 20 losing ways, along with 5, 6, and 8. The field does not win just because the table is loud.",
    },
    {
      q: "Can I use these edges on a weird payoff?",
      a: "No. If 2 or 12 pays something other than the two schedules above, the edge is not published here. Read the layout and do not average Schedule A with Schedule B.",
    },
    {
      q: "Is the field the same price as a Coinflip pot?",
      a: "No. Coinflip takes 5% of the pot between two players, while the field keeps about 5.56% or about 2.78% of the stake, depending on the labeled schedule, and the bases are different.",
    },
  ],
  sources: [],
  related: ["craps-odds", "online-craps", "house-edge", "sic-bo-online"],
  updated: "2026-10-20",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "roulette-calculator",
  cluster: "Casino games",
  keyword: "roulette calculator",
  secondary: [
    "roulette calculator rules",
    "roulette calculator odds",
    "roulette calculator payout",
    "single-zero wheel arithmetic",
    "33-slot wheel edge",
  ],
  title: "Roulette Calculator: Hand Math for Three Wheels",
  description:
    "A roulette calculator you can finish on paper: 1/37 and 2.70% single-zero, 1/38 and 5.26% double-zero, then a 33-slot wheel near 7.88%.",
  h1: "Roulette calculator: the arithmetic, worked by hand",
  answer:
    "A roulette calculator here is pencil arithmetic from pockets and a payout. Single-zero straight-up pays 35 to 1 on 37 pockets, an edge of 1/37, about 2.70%. Double-zero is 2/38, about 5.26%. On a 33-slot wheel, Purple or Silver is about 7.88% after the 5% win fee.",
  facts: [
    "Last tested 20 October 2026.",
    "Nevada's roulette rules of play describe 36 numbers plus a 0 and/or a 00, and a straight-up wager pays 35 to 1.",
    "The 2.70% and 5.26% figures below are the arithmetic from that sheet. Nevada does not print those percents on the page.",
    "PVPspinArena roulette is 33 slots: 16 Purple, 16 Silver, 1 Green. Purple and Silver pay 2x, Green pays 14x, then 5% comes off a winning payout.",
    "A roulette calculator does not make a negative edge positive.",
  ],
  sections: [
    {
      id: "rules",
      title: "Roulette calculator rules you can finish on paper",
      body: `You need three inputs: the pockets, the profit if it hits, and the average of one unit bet.

The Nevada Gaming Control Board sheet opened for this page says the wheel has 36 numbers from 1 to 36, plus a 0 and/or a 00. Zero pockets are green. The payoffs on that sheet are:

- Straight-up pays 35 to 1.
- A split pays 17 to 1, a street 11 to 1, a corner 8 to 1, and six numbers 5 to 1.
- A dozen or a column pays 2 to 1.
- Red, black, odd, even, 1 to 18, and 19 to 36 pay 1 to 1.

"35 to 1" means a winning $1 bet profits $35, and a miss loses the $1. The sheet we opened says "to 1." A screen that says "36 for 1" is a different contract.

This page is a [casino games](/guides/topics/casino-games) worksheet. It is not a tour of every side bet in a lobby. Adults 18+ only.

[The price built into a payout](/guides/house-edge) is the same idea with the algebra named once. Use that essay for the vocabulary. Use this page to finish three wheels with a pencil.`,
    },
    {
      id: "single",
      title: "Single-zero wheel, one unit at a time",
      body: `A wheel with 0 and no 00 has 37 pockets. A straight-up bet wins on 1 pocket and loses on 36.

Expected value of a $1 straight-up bet:

(1/37) × (+35) + (36/37) × (−1) = (35 − 36) / 37 = −1/37.

−1/37 is about −0.027027, an edge of about 2.70%. One spin still wins $35 or loses $1. The percent is the average across many bets.

An even-money bet covers 18 pockets and pays 1 to 1. It loses on the other 18 numbers and on 0, so it loses on 19 pockets.

(18/37) × (+1) + (19/37) × (−1) = −1/37.

Same edge. The payout changed and the number of winning pockets changed, and the gap stayed one pocket. That is the useful surprise in the arithmetic.

The Nevada sheet does not print a rule that returns half an even-money bet when the ball falls on zero. Do not import that rule from memory. If your felt has it, the edge on those bets is a different fraction, and this worksheet does not price it.

Roulette calculator odds for this wheel are the pocket counts above. They are not a forecast that red is due after a row of black.`,
    },
    {
      id: "double",
      title: "Double-zero wheel and the five-number line",
      body: `A wheel with both 0 and 00 has 38 pockets. The straight-up payout on the sheet is still 35 to 1.

(1/38) × (+35) + (37/38) × (−1) = (35 − 37) / 38 = −2/38 = −1/19.

−1/19 is about −0.052632, an edge of about 5.26%. The extra green pocket is the whole change. The payout table did not grow to match it.

Even money covers 18 of 38 pockets and loses on 20.

(18/38) × (+1) + (20/38) × (−1) = −2/38.

Same 5.26% edge. A dozen covers 12 pockets and pays 2 to 1: (12/38) × (+2) + (26/38) × (−1) = (24 − 26) / 38 = −2/38. Again the same edge.

The sheet also lists a five-number bet on 0, 00, 1, 2, and 3, paying 6 to 1.

(5/38) × (+6) + (33/38) × (−1) = (30 − 33) / 38 = −3/38.

−3/38 is about −0.07895, an edge of about 7.89%. That line is worse than straight-up on the same wheel.

A roulette calculator payout is allowed to come out ugly. The point of the pencil is to see that line before you buy it.

A courtesy line on 0 or 00 pays 17 to 1, two pockets. (2/38) × (+17) + (36/38) × (−1) = −2/38. It matches the ordinary double-zero edge.`,
    },
    {
      id: "thirty-three",
      title: "A 33-slot wheel after a win fee",
      body: `PVPspinArena roulette uses a different wheel from the Nevada sheet. It has 33 slots: 16 Purple, 16 Silver, and 1 Green.

Purple and Silver pay 2x. Green pays 14x. A 5% fee comes off a winning payout, and a losing bet is not charged that fee.

Other players may share the round. Their bets do not change your payout. The wheel is house-banked.

Write the product into the roulette calculator before you compare the colors.

Take a $1 Purple bet. The chance is 16/33. A win pays 2x, so the payout before the fee is $2.

The fee is 5% of that payout, $0.10. You receive $1.90.

Expected return = (16/33) × 1.90 = 30.4/33 ≈ 0.9212.

Edge = 1 − 30.4/33 = 2.6/33 ≈ 0.0788, about 7.88%.

Before the fee, the same bet returns (16/33) × 2 = 32/33 of the stake. The fee moves that figure to about 92.12% returned. Silver uses the same arithmetic.

Green is 1/33 and pays 14x. After the fee you receive 14 × 0.95 = 13.3 units when it hits.

Expected return = 13.3/33 ≈ 0.4030. Edge ≈ 59.70%.

Green's sticker is large because the pocket is rare. The edge is still larger than Purple.

[A draw with a posted prize list](/guides/keno-odds) can look generous for the same reason. Read the return.

The minimum stake on this wheel is not published in the rules summary used here. The bet control on the table is the place that number lives. Do not treat $1 in an example as a floor.`,
    },
    {
      id: "dollars",
      title: "Three labeled dollar examples",
      body: `Example A, single-zero straight-up. You plan 37 bets of $1 on one number. The arithmetic says one win (+$35) and 36 losses (−$36), a net of −$1.

That −$1 is 1/37 of the $37 staked. A real session will not hit exactly once. The dollar is the average.

Example B, double-zero straight-up. Thirty-eight bets of $1 give one expected win (+$35) and 37 losses (−$37). Net: −$2, which is 2/38, about 5.26%.

The five-number line on $38 of bets averages a $3 loss, 3/38, about 7.89%.

Example C, Purple on the 33-slot wheel. Stake $33. A hit pays $66 before the fee, the fee is $3.30, and the credit is $62.70.

It hits 16 times in 33 on average, so the expected credit is $30.40. Expected loss: $2.60, about 7.88%. One spin returns $62.70 or $0.

None of these examples is a system. Repeating a color, waiting for Green, or raising after a loss leaves the fraction in place. [Dice on a posted layout](/guides/online-craps) is the same kind of object: a price you can write down, and a session that will not match the price on Tuesday.`,
    },
    {
      id: "compare",
      title: "Three wheels, side by side",
      body: `Use the rows as prices. A blank percent is a percent we did not print because the opened page did not print it.

| | Single-zero felt | Double-zero felt | PVPspinArena roulette |
| --- | --- | --- | --- |
| Fee or edge | About 2.70% (1/37) on standard bets | About 5.26% (2/38); five-number about 7.89% | About 7.88% Purple or Silver after the win fee; Green about 59.70% |
| Who you play against | The house | The house | The house |
| Payout speed | When the spin is settled | When the spin is settled | US-dollar balance when the round settles |
| Provably fair | No | No | Yes |
| Minimum bet | Not published | Not published | Not published |

The second table is the unit bet, so you can check the pencil.

| Wheel and bet | Winning pockets | Profit if it hits | Edge on a $1 bet |
| --- | --- | --- | --- |
| Single-zero straight-up | 1 of 37 | $35 | 1/37, about 2.70% |
| Double-zero straight-up | 1 of 38 | $35 | 2/38, about 5.26% |
| Double-zero five-number | 5 of 38 | $6 | 3/38, about 7.89% |
| 33-slot Purple or Silver | 16 of 33 | $0.90 after the 5% fee on a 2x payout | 2.6/33, about 7.88% |
| 33-slot Green | 1 of 33 | $12.30 after the fee on a 14x payout | about 59.70% |

### How PvP compares

[Roulette](/roulette) is the 33-slot wheel. [Fairness](/fairness) recomputes the slot from a seed committed before the spin.

A matching hash shows the seed was not swapped. It leaves the 7.88% edge where it was.

A reserved felt in a US pit is a different purchase from this worksheet. [How a strategy card treats the same seat](/guides/blackjack-basic-strategy) is a decision aid, not a nightly rate. The calculator does not set a room charge.

[A streak does not heat the next pocket](/guides/hot-hand-fallacy). The fraction on row one is the fraction on row fifty.`,
    },
    {
      id: "checklist",
      title: "Checklist before you trust a percent",
      body: `Tick these on paper. Run the roulette calculator again if a felt posts a new payout.

A percent without the fraction under it is a slogan. Keep this roulette calculator on paper so a lobby graphic cannot replace the fraction.

- [ ] I counted pockets from a rules sheet I opened, not from a thumbnail.
- [ ] I read "to 1" as profit, and I did not add the stake a second time.
- [ ] Single-zero straight-up is −1/37, about 2.70%, when the whole stake loses on zero.
- [ ] Double-zero straight-up is −2/38, about 5.26%.
- [ ] The five-number line is −3/38, about 7.89%, and I will not call it a hedge.
- [ ] Purple or Silver after the 5% win fee is 2.6/33, about 7.88%.
- [ ] Green after that fee is the large edge, about 59.70%.
- [ ] I did not invent a table minimum. Unpublished means not published.
- [ ] I am not raising the stake because a color "has not hit."
- [ ] The money is spare. Rent and bills are not in the stack.

Roulette calculator payout checks are done when you can reproduce the row without the article open. If you cannot, you are trusting a memory of a percent.`,
    },
    {
      id: "skip",
      title: "Who should not use the worksheet as a reason to bet",
      body: `Do not bet if you are under 18, or under the age required where you live. Wynn Las Vegas, on the casino page opened the same day, says you must be 21 or older to gamble there.

This site's rule is 18+ and only money you can afford to lose. The doors are different.

Do not bet rent, wages you need, or money you already promised to a bill. A cleaner fraction does not make the loss smaller than the fraction. It only tells you the average price.

If spins are how you try to get even, stop. Use [responsible gambling](/responsible-gambling) and 1-800-GAMBLER in the US and Canada.

The worksheet will still be here after you close the table. A bill will not wait on a color.`,
    },
  ],
  faqs: [
    {
      q: "What does this roulette calculator actually compute?",
      a: "It computes the average loss on one bet from pockets and a payout. Single-zero straight-up is −1/37, about 2.70%. Double-zero straight-up is −2/38, about 5.26%. Purple or Silver on the 33-slot wheel, after a 5% fee on the 2x payout, is about 7.88%. The result is an average over many bets. One spin still pays the full win or the full loss.",
    },
    {
      q: "Why is the five-number bet worse?",
      a: "Nevada's sheet pays that bet 6 to 1 and it covers five pockets on a 38-pocket wheel. The average is −3/38, about 7.89%. Ordinary double-zero bets sit at −2/38, about 5.26%. The extra loss is one more unit per 38 bets in the formula. Skip the line if you are comparing prices.",
    },
    {
      q: "Does a hashed spin remove the edge?",
      a: "No. A hash committed before the spin lets you recompute the slot afterward. That check is about whether the seed changed. Purple still wins 16 of 33 times, and the 5% fee still comes off a winning payout. The edge stays about 7.88% on Purple or Silver. Verification is not a refund.",
    },
    {
      q: "Is $1 the minimum on the 33-slot wheel?",
      a: "Not published in the rules summary used for this worksheet. The examples use $1, $33, $37, and $38 so the fractions land on whole dollars. Those stakes are labels. Read the bet control for the floor, and do not treat an example as a rule.",
    },
    {
      q: "Should I wait for Green because it pays 14x?",
      a: "No. Green is 1 pocket in 33 on every spin, including after a long gap. After the 5% fee the expected return is about 40.30% of the stake, an edge near 59.70%. The sticker is large because the pocket is rare. Waiting does not change the pocket count.",
    },
    {
      q: "Can I apply the single-zero percent to every casino?",
      a: "Only when that casino's wheel has 37 pockets, the bet pays 35 to 1, and a miss loses the whole stake. The Nevada sheet allows 0 and/or 00, so a floor can be either wheel. If a half-back rule on zero is posted, recompute. If the payout is missing, the percent is not published.",
    },
  ],
  sources: [
    {
      label: "Nevada Gaming Control Board, Roulette rules of play",
      url: "https://www.gaming.nv.gov/siteassets/content/divisions/enforcement/rules-of-play/Roulette.pdf",
    },
    {
      label: "Wynn Las Vegas casino page (age and floor description)",
      url: "https://www.wynnlasvegas.com/casino",
    },
  ],
  related: [
    "house-edge",
    "keno-odds",
    "online-craps",
    "hot-hand-fallacy",
    "blackjack-basic-strategy",
    "gamblers-fallacy",
  ],
  updated: "2026-10-20",
};

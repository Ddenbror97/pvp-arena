import type { Guide } from "./types";

export const guide: Guide = {
  slug: "rtp-explained",
  cluster: "Games & odds",
  keyword: "rtp explained",
  secondary: ["what is rtp", "rtp vs house edge", "casino rtp", "return to player"],
  title: "RTP Explained: Return to Player Versus House Edge",
  description:
    "RTP explained in plain numbers: how return to player relates to house edge, sample size, and why 96% RTP is not a 96% chance to win.",
  h1: "RTP explained: return to player, house edge and sample size",
  answer:
    "RTP explained simply: return to player is the long-run share of stakes a game pays back. A 96% RTP means that across a huge sample, players receive about $96 for every $100 wagered, so the house edge is 4%. That 96% is an average, not a 96% chance that you will win a given session or spin. Sample size decides how close your results get to the published figure; a short night can land far above or far below it.",
  facts: [
    "RTP (return to player) = 100% − house edge.",
    "A 96% RTP is a long-run average on total wagered, not a 96% chance to win.",
    "European roulette RTP is about 97.30%; American roulette about 94.74%.",
    "PVPspinArena Purple and Silver return about 92% after the fee. Green returns about 40%.",
    "PvP Jackpot and Coinflip with a 0% fee have 100% RTP between players.",
  ],
  sections: [
    {
      id: "what-rtp",
      title: "What RTP actually measures",
      body: `Return to player is a percentage attached to a game, a paytable or a single bet. It answers one question: if this bet were placed a very large number of times, what share of the money staked would be paid back to players as a group?

If a slot lists 96% RTP, the model says that of every $10,000 wagered across all players, about $9,600 comes back as prizes and about $400 stays with the house. The same idea applies to a roulette colour, a blackjack hand or a PvP pot. RTP is not a promise to you personally. It is a property of the probabilities and payouts.

### RTP applies to turnover

The percentage is taken on total wagered, not on your deposit. Deposit $50 and place one hundred $2 bets and you have wagered $200. At 96% RTP the average return on that $200 is $192, so the average cost is $8, even though you only brought $50 to the table. Fast games inflate turnover and therefore inflate the dollar cost of a given RTP.

### Theoretical versus observed

Published RTP is theoretical: it is calculated from the rules, or estimated from a huge simulation. Observed RTP is what a sample of real rounds actually paid. Those two numbers only converge when the sample is large enough for variance to settle. A weekend of play is not that sample.

This guide sits in the [Games and odds topic](/guides/topics/games-and-odds) with the rest of the pricing maths. If you want the cost stated as a keep-rate instead of a payback-rate, read [house edge](/guides/house-edge). PVPspinArena is for adults aged 18 and over.`,
    },
    {
      id: "vs-edge",
      title: "RTP versus house edge",
      body: `RTP and house edge are the same measurement written from opposite sides.

- **RTP** = expected return per $1 staked, as a percentage.
- **House edge** = 1 − expected return, as a percentage.
- **Identity**: RTP + house edge = 100%.

A 96% RTP is a 4% house edge. A 97.30% RTP is a 2.70% house edge. A 100% RTP is a 0% house edge. There is no third number hiding between them. Marketing that quotes a high RTP and a low edge as if they were independent facts is repeating one statistic twice.

### Where you see each label

Slots and video games usually advertise RTP because a larger number sounds friendlier. Table-game guides usually quote house edge. Sports books talk about margin or overround, which is the same family of idea: the price is set so the book keeps a share. Our [casino terminology](/guides/casino-terminology) glossary defines stake, payout and turnover if those words are still loose.

### Variable published RTP

Some online games ship several RTP settings, and the operator chooses which one to run. A title advertised at “up to 96.5%” may be configured at 94% on the site you actually play. Always read the information panel for the instance in front of you. On a simple wheel with fixed slots and fixed multipliers, there is nothing to configure: the RTP is the arithmetic of the wheel.`,
    },
    {
      id: "not-win-chance",
      title: "Why 96% RTP is not a 96% chance to win",
      body: `This is the most common misreading, and it is worth stating in numbers.

RTP is an expected-value statement about money. It is not the probability that a spin, a session or a player finishes ahead. A game can have a 96% RTP and a 20% chance of a winning spin, or a 96% RTP and a 70% chance of a winning spin, depending on how often it hits and how large the hits are.

### A tiny worked contrast

Imagine two $1 bets, each with 96% RTP.

- **Bet A** wins 96% of the time and pays $1 (your stake back, no profit). Expected return = 0.96 × $1 = $0.96. You almost always “win” the spin and almost never make money.
- **Bet B** wins 4% of the time and pays $24. Expected return = 0.04 × $24 = $0.96. You almost always lose the spin, and a rare hit more than covers the listed RTP.

Same RTP, opposite session feel. Hit rate and payout size are separate from return to player. That split is why a 96% slot can empty a small balance in twenty spins or double it in one bonus. Neither result contradicts the published figure.

### Session win chance is a different question

The chance that a finite session ends above starting balance depends on stake size, number of bets, hit rate and the shape of the paytable. It is not equal to the RTP. For the formula that prices a single bet in dollars, see [expected value gambling](/guides/expected-value-gambling).`,
    },
    {
      id: "sample-size",
      title: "Sample size: how many bets before RTP shows",
      body: `[Law of large numbers](/guides/law-of-large-numbers-gambling) is the reason casinos publish RTP at all. Independent bets with a fixed expected return drift toward that return as the count grows. The drift is slow when variance is high.

### A numerical sketch

Suppose you bet $1 each time on a 96% RTP, low-volatility game whose results have a standard deviation of about $1 per bet (even-money style). After n bets the average result per bet has a standard error near 1/√n dollars.

- After 100 bets, a typical deviation from 96% is a few percentage points. A session returning 80% or 110% is ordinary.
- After 10,000 bets, the same noise is about ten times smaller. Observed RTP usually sits much closer to 96%.
- After 1,000,000 bets, the house’s books look like the model. A single player almost never places that many bets in a hobby session.

High-volatility games, including slots with rare bonuses and long-shot colours like Green on a 33-slot wheel, need a much larger n before the average settles. That is why a night of Green bets can look nothing like its 42.42% return before the win fee and still be consistent with it.

### What sample size is not

Sample size does not create an edge. Playing longer does not “unlock” the 96%. Playing longer applies the 4% keep-rate to more turnover. If your goal is to spend less, you want fewer bets or a higher RTP, not a bigger sample.`,
    },
    {
      id: "examples",
      title: "Worked RTP examples",
      body: `Here is the same arithmetic on bets you can count by hand. Expected return per $1 = probability of a win × total payout if you win (plus any return on other outcomes). RTP is that figure as a percentage.

| Bet | Win chance | Payout | RTP | House edge |
| --- | --- | --- | --- | --- |
| European red | 18/37 ≈ 48.65% | 2x | 97.30% | 2.70% |
| American red | 18/38 ≈ 47.37% | 2x | 94.74% | 5.26% |
| PVPspinArena Purple | 16/33 ≈ 48.48% | 2x | 96.97% | 3.03% |
| PVPspinArena Green | 1/33 ≈ 3.03% | 14x | 42.42% | 57.58% |
| Fair coinflip, 0% fee | 50% | 2x | 100% | 0% |
| Coinflip, 5% fee | 50% | 1.90x of combined pot to winner | 95% | 5% |

Purple: 16/33 × 2 = 0.9697, so RTP = 96.97% before the 5% win fee. Green: 1/33 × 14 = 0.4242. The hit rates differ, and Green costs much more. You can count the 33 slots on the live [Roulette](/roulette) wheel and repeat the multiplication yourself.

On a 0% fee PvP [Coinflip](/coinflip) or [Jackpot](/), players fund the pot and the site does not take the other side, so RTP between players is 100%. Individual players still finish up or down; the group as a whole is not charged a keep-rate. Add a fee and RTP falls by that fee.

A scratch ticket prints its return on the back. [Scratch off odds](/guides/scratch-off-odds) is that label, not a slot RTP.`,
    },
    {
      id: "pvp-and-slots",
      title: "RTP on PVPspinArena and on slots",
      body: `Slots hide the paytable behind thousands of symbol combinations and bonus states. You cannot usually derive RTP with a napkin. You rely on the published figure, and you still need a huge sample before your personal return resembles it. Slot volatility also means a 96% game can return 30% or 250% in a short sitting. That is the point of [variance in gambling](/guides/variance-in-gambling).

PVPspinArena’s three games are simple enough to price without a lab report.

### Roulette

The coloured wheel is house-banked. Purple and Silver return 96.97% before the 5% win fee and about 92.12% after it. Green returns 42.42% before the fee and about 40.30% after it. Rounds run on a server clock, so a short session can still produce a large turnover. Treat the 7.88% Purple or Silver edge, or the much larger Green edge, as a cost per dollar spun, then decide how many dollars you are willing to spin.

### Coinflip

Two equal stakes, one 50/50 result. With the default 0% house fee, RTP is 100% between the two players. You can still lose the entire stake in one flip. Fairness of the result is a separate question from RTP; check a finished round on the [fairness](/fairness) page.

### Jackpot

Your chance equals your share of the pot. With no fee, expected return is 100% of your stake in expectation, because you are buying a proportional ticket on a player-funded pot. A small share of a large pot is a long-shot ticket: high variance, same 100% RTP before fees.

### 18+ and cost

None of these figures is a reason to play more. They are a reason to know the price. If the entertainment is not worth the expected cost, do not buy it. PVPspinArena is 18+ only.`,
    },
    {
      id: "use-rtp",
      title: "How to use RTP without being misled",
      body: `Use return to player as a comparison tool and a session-cost estimator, not as a forecast of tonight’s result.

1. **Convert to edge.** Subtract RTP from 100% so you can think in dollars kept per $100 wagered.
2. **Estimate turnover.** Stake × number of bets is the figure the percentage applies to.
3. **Compare like with like.** A 96% slot, Purple at 96.97% before the win fee, and Green at 42.42% are different prices. A 100% fee-free PvP pot is a different price again, but it is still a transfer between players.
4. **Ignore “96% chance” talk.** Ask about hit rate and payout size if you care how bumpy the ride is.
5. **Read the instance.** If a game offers several RTPs, believe the one on the info screen.
6. **Stop on your budget, not on the sample.** More play moves you toward the average by charging the edge more times.

A worked cost: 40 minutes of $2 Purple bets at one spin every 20 seconds is 120 bets and $240 wagered. At 96.97% RTP before the win fee the average return is about $233, so the average cost is about $7. After the fee the cost is about $19. You might finish +$80 or −$240. That average is the centre the results scatter around, not a fee taken from every session.

If you want the dollar formula for one bet, continue with expected value. If you want the keep-rate language used in table-game guides, stay with house edge. Both describe the same price.`,
    },
  ],
  faqs: [
    {
      q: "What does RTP mean in a casino?",
      a: "RTP means return to player: the long-run percentage of total stakes paid back as prizes. A 96% RTP means players as a group get about $96 back per $100 wagered.",
    },
    {
      q: "Is RTP the same as house edge?",
      a: "They are complements. House edge = 100% − RTP. A 96% RTP is a 4% house edge. Casinos pick whichever label sounds better for the product.",
    },
    {
      q: "Does 96% RTP mean I have a 96% chance to win?",
      a: "No. RTP is an average return on money, not a win probability. A 96% game can have a low hit rate and rare big prizes, or a high hit rate and tiny prizes.",
    },
    {
      q: "How many spins until RTP is accurate?",
      a: "There is no switch that flips on. Low-variance bets move toward the published RTP sooner; high-variance slots and long shots need far more trials. A single session is almost never enough.",
    },
    {
      q: "What is the RTP on PVPspinArena Roulette?",
      a: "Before the fee, Purple and Silver return 96.97% and Green returns 42.42%. After the 5% win fee, those figures are about 92.12% and 40.30%.",
    },
    {
      q: "Can PvP games have 100% RTP?",
      a: "Yes, when players bet against each other and the site fee is 0%. The group is not charged a keep-rate, but each player can still lose. Fees, if added, become the edge.",
    },
  ],
  sources: [
    { label: "Wikipedia: Return to player", url: "https://en.wikipedia.org/wiki/Return_to_player" },
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
    {
      label: "UK Gambling Commission: return to player and house edge",
      url: "https://www.gamblingcommission.gov.uk/",
    },
  ],
  related: [
    "crypto-jackpot",
    "rtp-calculator",
    "expected-value-gambling",
    "variance-in-gambling",
    "odds-converter",
    "best-payout-online-casinos",
    "law-of-large-numbers-gambling",
  ],
  updated: "2026-09-26",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "kelly-criterion",
  cluster: "Games & odds",
  keyword: "kelly criterion",
  secondary: [
    "kelly criterion formula",
    "fractional kelly",
    "kelly betting",
    "kelly criterion gambling",
  ],
  title: "Kelly Criterion: Bet Sizing Maths and Why It Fails",
  description:
    "The Kelly criterion for bet sizing: the formula, fractional Kelly, why casino minus-EV games make full Kelly a path to ruin, and safer fixed stakes.",
  h1: "Kelly criterion: the formula, fractional Kelly and casino limits",
  answer:
    "The Kelly criterion is a bet-sizing rule that maximises the long-run growth rate of a bankroll when you have a genuine positive edge. For a even-money bet it says to stake edge divided by odds. In a casino the typical bet is minus-EV, so full Kelly is not a growth engine: the formula returns a non-positive fraction, and forcing a large stake anyway is a path to ruin. Fractional Kelly and fixed stakes exist because variance, not optimism, sizes the bet.",
  facts: [
    "Kelly fraction for a 2x bet is 2p − 1, where p is your true win probability.",
    "If p = 0.50 on a 2x payout, Kelly is 0%: you should not bet to grow a bankroll.",
    "If the edge is negative, Kelly says bet nothing; it does not say “bet smaller”.",
    "Fractional Kelly (half or quarter) cuts variance at the cost of slower growth on plus-EV bets.",
    "Casino table limits and minus-EV paytables make full Kelly the wrong tool for house games.",
  ],
  sections: [
    {
      id: "what",
      title: "What the Kelly criterion is for",
      body: `John Kelly’s 1956 paper asked how to size bets when you know the probabilities and you can reinvest, so that the logarithm of wealth grows as fast as possible in the long run. It is a formula for a repeated investment with an edge, not a system for extracting money from a wheel that keeps about 3.03% of every Purple dollar before the win fee.

The Kelly criterion belongs with bankroll maths, not with miracle progressions. It assumes:

- you can estimate the true probability better than the price implies, or the price is better than the true risk;
- you can keep playing with the updated bankroll;
- you care about long-run growth, not about a smooth week.

If those assumptions fail — and they fail on standard casino colours — Kelly is a warning light, not a staking plan. This page sits in the [Games and odds topic](/guides/topics/games-and-odds). For the definition of the edge Kelly is trying to exploit, read [expected value](/guides/expected-value-gambling). Worked stake numbers for the same formula are on the [Kelly criterion calculator](/guides/kelly-criterion-calculator). PVPspinArena is 18+.`,
    },
    {
      id: "formula",
      title: "The Kelly formula, with a worked number",
      body: `For a bet that pays net odds b to 1 (you profit b units per unit risked if you win, and lose 1 if you lose), the Kelly fraction of current bankroll is:

f* = (b p − q) / b

where p is the true probability of winning and q = 1 − p.

On a 2x total payout, net odds b = 1 (even money). Then f* = 2p − 1.

### Worked plus-EV example

Suppose a coin is slightly biased and you somehow know p = 0.55 of heads, while a counterparty still pays 2x. Then f* = 2 × 0.55 − 1 = 0.10. Kelly says bet 10% of the bankroll on heads. A $1,000 bankroll bets $100. After a win you have $1,100 and the next bet is $110. After a loss you have $900 and the next bet is $90.

That 10% is large. The ride is violent. The formula maximises log-growth, not comfort, and not the chance of surviving a 20-loss week.

### Worked casino example

Purple on PVPspinArena [Roulette](/roulette) pays 2x with p = 16/33 ≈ 0.4848. Then f* = 2 × 0.4848 − 1 ≈ −0.0303. The minus sign means “do not bet this for growth”. The magnitude matches the 3.03% edge before the win fee, which is not a coincidence: on even money, Kelly’s f* is exactly that edge, signed. The 7.88% figure is the edge after the 5% win fee, which changes the payout. A negative edge produces a negative stake, which in the real world means stay in your pocket.

| Situation | p | b (net) | Kelly f* | Meaning |
| --- | --- | --- | --- | --- |
| Fair coin, 2x | 0.50 | 1 | 0% | No growth bet |
| Biased coin 55%, 2x | 0.55 | 1 | 10% | Aggressive plus-EV size |
| European red, 2x | 18/37 ≈ 0.4865 | 1 | −2.70% | Do not bet to grow |
| Purple, 2x | 16/33 ≈ 0.4848 | 1 | −3.03% | Do not bet to grow |
| Green, 14x | 1/33 ≈ 0.0303 | 13 | (13×0.0303 − 0.9697)/13 ≈ −4.43% | Still negative |

Green’s f* is also negative. A long-shot multiplier does not create a Kelly bet when the paytable already embeds the edge.`,
    },
    {
      id: "fractional",
      title: "Fractional Kelly and why people use it",
      body: `Full Kelly has unpleasant properties even when the edge is real.

- **Estimation error.** If you think p = 0.55 and the truth is 0.51, you are betting several times too large. Overbetting Kelly is worse for log-growth than underbetting by the same fraction.
- **Variance.** Full Kelly has a material chance of large drawdowns. Many professional bettors use half Kelly or quarter Kelly: take the formula’s f* and multiply by 1/2 or 1/4.
- **Utility.** Most people do not have log utility. They would rather grow slower than live through a 50% drawdown.

Fractional Kelly is still a plus-EV tool. It does not turn a minus-EV roulette colour into a growth asset. Half of a negative number is still a signal to bet nothing for bankroll growth.

If you came here from sports-betting blogs, this is the context they assume: a priced market you think is wrong. A house-banked wheel that returns about 96.97% on Purple before the win fee is not that market.

### A size comparison on a $1,000 roll

Suppose three players each start with $1,000 and face a true 55% coin at 2x (the plus-EV toy). Full Kelly bets $100, half Kelly $50, quarter Kelly $25. After a loss they have $900, $950 and $975. After a second loss, $810, $902.50 and $950.63. The full-Kelly path is already down 19% after two misses; the quarter path is down 5%. That is why people fractionally Kelly a real edge. Now put the same $1,000 on Purple at a reckless 10% unit: after two losses you have $810 and you still have about a −3.03% price before the win fee. There is no later sample that pays you for the courage.`,
    },
    {
      id: "minus-ev",
      title: "Why full Kelly fails on casino minus-EV games",
      body: `Apply the formula honestly and casino games fall out of the “size this” category. Players who still want a Kelly-shaped rule sometimes invert it: they bet a percentage of bankroll on every spin because “that is what Kelly does”. That is not Kelly. That is a fixed-fraction heuristic with a negative drift.

### Negative drift plus proportional betting

If each bet has expected value −e × stake, and you always bet fraction f of current wealth, then expected log-wealth declines. You can have long winning runs. The product of many 0.9697-ish multipliers, weighted by the win/loss sequence, still tends to shrink the bankroll. [Variance](/guides/variance-in-gambling) decides how bumpy the path is; the [house edge](/guides/house-edge) decides the direction.

### Ruin is not a rare bug

Full-sized fractions on a negative-edge game raise the chance you hit zero or a stop-out before you “get it back”. There is no later sample that refunds the edge. Playing until the average appears is how the house earns the average.

### Table limits

Kelly assumes you can bet f* of a growing bankroll without a cap. Casinos cap bets. So do PvP rooms: someone has to match you on [Coinflip](/coinflip). A formula that wants 10% of a lucky $20,000 stack may not have a market.

### Worked ruin sketch on minus-EV

Start with $200 and stubbornly bet 10% of current wealth on Purple. Expected multiplier per bet is 0.9697 on the money at risk, but you only risk 10% each time, so most of the stack sits out. The stack still has a downward drift, and a cluster of losses — six out of eight, which is ordinary — takes 10% six times on a shrinking base and a couple of 10% wins do not restore it. Players read that path as “Kelly failed me”. The formula never asked for a 10% bet on a negative edge. It asked for zero.`,
    },
    {
      id: "safer",
      title: "Safer fixed stakes and entertainment Kelly",
      body: `If you are playing a minus-EV game for entertainment, the honest sizing rule is not Kelly. It is a budget.

- **Fixed unit.** Pick a stake small enough that a long losing run does not finish the session in three minutes. A common entertainment range is 1–2% of the session budget per bet, not 1–2% of lifetime savings.
- **Session cap.** Decide the most you will lose tonight. Stop there. Do not resize upward after a loss to “stay on Kelly”.
- **No recovery fraction.** Kelly is not a licence to raise after you are down. That is chase behaviour wearing a formula.

A worked entertainment size: session budget $40, even-money colour, target at least 20 bets of room. That is a $2 unit, 5% of the session, not 5% of your monthly pay. If you prefer one long-shot Green, budget for a dozen misses: a $2 Green unit against $40 is already tight. Write the number before the first spin.

Our [gambling budget](/guides/gambling-budget) guide is the practical document. If raising the stake to win it back is already happening, use the [responsible gambling](/responsible-gambling) page and stop the session. PVPspinArena is for adults 18 and over.`,
    },
    {
      id: "pvp",
      title: "Kelly on PvP Jackpot and Coinflip",
      body: `With a 0% fee, a fair [Coinflip](/coinflip) has p = 0.50 and b = 1, so f* = 0. Kelly says there is nothing to grow. You can still flip for fun; you cannot expect the bankroll’s log to climb.

A 0% fee [Jackpot](/) ticket has expectation equal to your share of the pot before variance. If the pot is only other players’ money and the fee is zero, EV is about zero, so Kelly is again ~0%. A fee makes EV negative and Kelly more negative.

### What people get wrong

They treat a win as evidence they now have p > 0.5, then size the next entry with a positive f*. That is the gambler’s fallacy plus Kelly, which is two mistakes stacked. Past flips do not raise p. The [fairness](/fairness) page will confirm the last result was honest; it will not confirm the next one is due.

### If you ever had a real edge

The only honest use of Kelly in this building is hypothetical: if you somehow faced a mispriced 2x with p = 0.55, the formula would say 10%, and a sensible person would still use 2–5% because estimates are noisy. House-banked Purple is not that bet. Do not dress about a 7.88% Purple or Silver edge after the win fee in Kelly language.`,
    },
    {
      id: "limits",
      title: "What the criterion cannot do",
      body: `The Kelly criterion cannot:

- cancel a house edge;
- tell you which colour is due;
- make a short sample look like a long-run growth path;
- replace a written budget;
- justify staking money you need for rent.

It can:

- show that a minus-EV 2x bet has a negative growth fraction;
- remind plus-EV bettors that full Kelly is aggressive;
- explain why fractional Kelly exists.

If you take one number from this page, take f* ≈ −3.03% on Purple. That is the formula telling you the growth-optimal stake is empty. Treat any stake you do place as the price of a night out, sized from a budget, not from a growth criterion that does not apply.

A last arithmetic check you can do in the lobby: write p, write b, write 2p − 1 for a 2x colour. If the sign is minus, Kelly is finished and the rest of the night is entertainment accounting. If you cannot write p, you do not have a Kelly problem — you have a pricing problem, and you should not be sizing a growth bet at all.

The person who brought Kelly from the lab to the blackjack table is [Edward Thorp](/guides/edward-thorp).`,
    },
  ],
  faqs: [
    {
      q: "What is the Kelly criterion formula?",
      a: "For net odds b to 1, f* = (b p − q) / b, with q = 1 − p. On even money, that simplifies to 2p − 1. A negative result means do not bet for growth.",
    },
    {
      q: "What is fractional Kelly?",
      a: "A reduced stake: commonly half or quarter of the full Kelly fraction. It lowers drawdowns when you have a real plus-EV bet. It does not repair a minus-EV casino price.",
    },
    {
      q: "Does Kelly work in a casino?",
      a: "Not as a way to grow a bankroll. Standard casino bets are minus-EV, so Kelly’s growth-optimal fraction is zero or negative. Using a large percent of bankroll anyway raises ruin risk.",
    },
    {
      q: "Why do people say full Kelly is too aggressive?",
      a: "Even with a true edge, full Kelly accepts deep drawdowns and punishes probability errors. Professionals often use a fraction of Kelly to trade growth for a smoother path.",
    },
    {
      q: "Should I bet 10% of my bankroll on roulette?",
      a: "No. That figure is a plus-EV example with p = 0.55 on a fair 2x, not a roulette rule. Purple’s Kelly fraction is negative. Use a small fixed entertainment stake instead.",
    },
    {
      q: "Is Kelly the same as a betting system?",
      a: "No. Progressions change the stake after wins or losses to chase a pattern. Kelly sizes from edge and odds. On a house game with no edge, both still lose on average, but they are different ideas.",
    },
  ],
  sources: [
    {
      label: "Kelly, J. L. (1956): A new interpretation of information rate",
      url: "https://ieeexplore.ieee.org/document/6771227",
    },
    { label: "Wikipedia: Kelly criterion", url: "https://en.wikipedia.org/wiki/Kelly_criterion" },
    {
      label: "Wizard of Odds: betting systems",
      url: "https://wizardofodds.com/gambling/betting-systems/",
    },
  ],
  related: [
    "crypto-jackpot",
    "blackjack-basic-strategy",
    "card-counting",
    "gamblers-fallacy",
    "martingale-strategy",
    "edward-thorp",
  ],
  updated: "2026-09-26",
};

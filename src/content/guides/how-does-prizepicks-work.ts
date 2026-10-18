import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-does-prizepicks-work",
  cluster: "Prediction markets",
  keyword: "prizepicks",
  secondary: ["prizepicks payouts", "power play", "flex play", "more or less picks"],
  title: "How Does PrizePicks Work? Power vs Flex Plays Explained",
  description:
    "How PrizePicks works: more or less picks, Power vs Flex payouts, break-even win rates, legal states and how it compares to sportsbook props.",
  h1: "How does PrizePicks work for a more-or-less entry",
  answer:
    "PrizePicks works by posting a line on a player statistic and letting you take more or less. You combine those legs into one entry. A Power entry pays the posted multiplier only when every leg is right. A Flex entry can pay a smaller multiplier when you miss a leg, if that entry type offers a miss. The multiplier on the slip is the price. This page shows the break-even arithmetic for a 3-pick Power that pays 5x including the stake, and it labels that figure as an assumption. Adults 18+ only. This is education, not financial, legal, or tax advice.",
  facts: [
    "A PrizePicks leg is more or less than a posted player stat, not a team moneyline.",
    "Power entries need every leg. Flex entries can pay less when one leg misses, if the board says so.",
    "A 5x label can mean total return including the stake. This page uses that assumption and shows the math.",
    "The break-even leg rate for a 3-pick at 5x including stake is the cube root of 0.20, about 58.5%, if legs are independent.",
    "Which states can open the app changes. The app's own location check is the current list.",
    "A PrizePicks entry is a different product from a hashed player-versus-player pot.",
  ],
  sections: [
    {
      id: "what-an-entry-is",
      title: "What a PrizePicks entry is pricing",
      body: `PrizePicks posts a number on a player statistic such as points, rebounds, strikeouts, or receiving yards. You take more or less. Several of those choices become one entry with one stake and one multiplier. A correct call on one player pays nothing when another required leg misses. The slip names the stats, the lines, and the multiplier. A number from a video is not the contract.

Settlement follows the app's rules for the stat source, overtime, a player who does not play, and a postponed game. [Prop bets](/guides/prop-bets-explained) explains a single side market. PrizePicks bundles several opinions into one payout table. The wording on the entry still decides the grade.

Adults 18+ only. This page is education, not financial, legal, or tax advice, and not a list of players. If the stake stops being money you can lose, use [responsible gambling](/responsible-gambling). More in this cluster sits on [Prediction market guides](/guides/topics/prediction-markets). The copy inside the app on the day you play outranks any table here.`,
    },
    {
      id: "power-versus-flex",
      title: "Power versus Flex, and a teaching payout table",
      body: `Power and Flex attach different multipliers to the same kind of legs. Power pays only when every leg hits. Flex can still return something when you miss, at a smaller multiplier, and only for the miss count the slip allows. The slip is the definition.

The table is a teaching schedule for the arithmetic below, not a screenshot of today's board. The cell that the math uses is the 3-pick Power at 5x. Treat 5x as total return including the stake: a winning $10 entry returns $30, and $10 of that was your stake. If the app ever meant 5x as profit on top of the stake, the return would be 6x and the break-even rate would fall. Read which version you are holding.

| Picks | Power, all must hit | Flex if all hit | Flex if one misses |
| --- | --- | --- | --- |
| 2 | 3x including stake | not in this teaching board | not in this teaching board |
| 3 | 5x including stake | 3x including stake | 1x, stake returned |
| 4 | 10x including stake | 6x including stake | 1.5x including stake |
| 5 | 20x including stake | 10x including stake | 2x including stake |

The other cells are a familiar shape so Flex is visible. They are not a promise that the app still posts those figures. Flex looks gentler because a miss can survive, and the all-correct multiplier is lower than Power for the same pick count. You pay for the right to miss by accepting a smaller payday when you do not miss. A neighboring board is covered in the [Underdog Fantasy review](/guides/underdog-fantasy-review). Compare the slips. Shared wording does not mean a shared multiplier.`,
    },
    {
      id: "break-even-rate",
      title: "The break-even win rate for a 5x 3-pick",
      body: `Assumption, fixed for this section: a 3-pick Power pays 5x including the stake. Each leg wins with probability p. If the legs are independent, all three win with probability p³. The entry returns $5 per $1 staked when that happens, and $0 otherwise. Expected return per $1 is 5 × p³. Break-even sets that equal to 1.

5 × p³ = 1, so p³ = 0.20, and p is the cube root of 0.20.

Check it. 0.584 × 0.584 = 0.341056, and 0.341056 × 0.584 = 0.199177, just under 0.20. 0.585 × 0.585 = 0.342225, and 0.342225 × 0.585 = 0.200202, just over 0.20. The break-even leg rate is between 58.4% and 58.5%. Use about 58.5%.

That figure is a rate on each leg. The entry itself still hits about one time in five at break-even, because 5 × 0.20 = 1. The 5x label is a long shot that is fairly priced only when each leg clears about 58.5% and the legs really are separate events.

Players in the same game share pace and minutes. If the legs move together, p³ is the wrong joint probability. Treat the cube root as a benchmark, then ask whether you bought the same script three times. [Expected value](/guides/expected-value-gambling) is the general form: probability times payout, minus the stake.

If 5x ever means profit excluding the stake, replace 5 with 6. Then p³ = 1/6 ≈ 0.1667, and the cube root is near 55%. The slip decides which sentence you are in.`,
    },
    {
      id: "twenty-dollar-entry",
      title: "A $20 entry under the same assumption",
      body: `Second example, same assumption: 3-pick Power, 5x includes the stake, $20 on the entry.

If all three legs hit, the return is 5 × $20 = $100. Profit is $100 − $20 = $80. Twenty dollars of the $100 was the stake. If any leg misses, the return is $0 and the loss is $20.

Put a 50% chance on each leg and keep independence. All three hit with probability 0.50 × 0.50 × 0.50 = 0.125. Expected return is 0.125 × $100 = $12.50. Expected profit is $12.50 − $20 = −$7.50 per entry. A ticket can win and still come from a price that loses money on average.

The gap from 50% to about 58.5% is the lesson. A coin-flip leg is too weak for this 5x board. You need each leg right about 58.5% of the time before the multiplier is a fair price under independence. At coin-flip legs the entry hits 12.5% of the time, so most tickets miss.

A $10 entry at those same 50% legs has expected return 0.125 × $50 = $6.25 and expected profit −$3.75. Doubling the stake doubles the average loss. If all three legs need the same game script, 0.125 is the wrong probability. One night that returns $100 is a single draw, not the average.`,
    },
    {
      id: "where-it-is-offered",
      title: "Legal states change, so check the app",
      body: `PrizePicks does not offer the same product in every state. Gaming rules, fantasy statutes, and the company's own choices move the map. This page will not print a state list. A list published here would go stale the next time a regulator acted.

Open the app where you actually are. If it accepts an entry, you still read the payout board and the void rules. If it blocks the location, that block is the answer for today. This guide does not describe a way around a block.

Eighteen is the floor for this page. The app may require 18, 19, or 21. The age on the signup screen controls the account. A payout can also be taxable when the app never mentioned a form. That question belongs with [reporting gambling winnings](/guides/report-gambling-winnings) and current IRS pages. It does not change the break-even math.

Checklist before you confirm an entry:

- Read the multiplier and note whether it includes the stake.
- Count the legs and mark Power or Flex.
- Read the void rule for a player who never plays.
- Confirm the app accepts your state on its own screen.
- Stake an amount you can lose if every leg misses.
- Stop if you are raising the stake to get back to even.

The list is a pause. A completed list can still be a losing price.`,
    },
    {
      id: "sportsbook-props",
      title: "How the price compares with a sportsbook prop",
      body: `A sportsbook prop is one opinion at one American price. At −110 you risk 110 to win 100, so you need to win 110/210 of those bets, about 52.4%, before you have broken even. [Implied probability](/guides/implied-probability) turns that price into a percent. [Prop bets](/guides/prop-bets-explained) covers the single market: stat source, overtime, and voids.

A 3-pick Power at 5x including stake is stricter. Every leg must hit, and the fair per-leg rate under independence is about 58.5%, not 52.4%. Flex can survive a miss only because the all-correct multiplier is smaller. The bundle is its own price. The operator sets the line. You are not meeting another fan at a mid price you both wrote. Two apps posting different numbers on the same stat is the shopping. One app posting the number is a single counterparty.

| Question | PrizePicks entry | Sportsbook prop | Hashed PvP pot |
| --- | --- | --- | --- |
| What is priced | Several stats versus lines | One stat or side | A share of a player-funded pot |
| Who pays a winner | The app, via the multiplier | The book, via the odds | Other players, minus the fee |
| What you can recompute | Slip multiplier and void rules | Implied percent of the odds | The hash after the seed is published |

Use the column for the product you opened. A 5x label is not a coin flip, and a prop price is not a pot.`,
    },
    {
      id: "hashed-pot",
      title: "A hashed player-versus-player pot is a different product",
      body: `PrizePicks pays a multiplier on outside statistics. A hashed player-versus-player pot pays from money the players put in. On [Jackpot](/), entrants buy into one pot. The platform runs the round, takes a fee when it settles, and maps a committed random seed onto a winning ticket. Ticket share is the chance. A box score cannot move the pot, and the hash cannot tell you to take more or less on a stat.

After settlement the seed is published. [Fairness](/fairness) recomputes the hash and the result in the browser. That check is about the draw. It does not grade a league feed. PrizePicks does not publish a server seed for an entry, because the entry is not that draw. Jackpot does not grade a player stat, because the pot is not that contract.

PVPspinArena does not offer a more-or-less board. It offers Jackpot, Coinflip, and Roulette, funded with USDC or ETH on Base. This guide cites no user counts and no fee percent. The fee on a round is the fee that round shows. If you wanted a stat line, use the app's slip and its state check. If you wanted a shared pot you can recompute, Jackpot is the product. Adults 18+ only. This is not financial, legal, or tax advice.`,
    },
  ],
  faqs: [
    {
      q: "Does a 3-pick Power at 5x include the stake?",
      a: "This page assumes it does. A $10 entry that wins returns $30, so profit is $20 and the 5x is the total return. PrizePicks can label a multiplier differently, and the board can change. Read the slip. If 5x ever means profit on top of the stake, the return is 6x and the break-even rate falls.",
    },
    {
      q: "What win rate breaks even on that 3-pick Power?",
      a: "Under independence, each leg must win about 58.5% of the time. That is the cube root of 0.20, because 5 times 0.20 equals 1. The entry itself still hits only about one time in five at that break-even point. Correlation between legs makes the cube root a benchmark, not a promise.",
    },
    {
      q: "How is Flex different from Power?",
      a: "Power pays only when every leg hits. Flex can pay a reduced multiplier when you miss a leg, if the slip offers that miss. The teaching table uses 3x for a clean 3-pick Flex and 1x if one leg misses. Those cells are illustrations. The in-app board is the payout that binds.",
    },
    {
      q: "Is PrizePicks legal in every state?",
      a: "No. This page will not give you a state list, because availability changes when rules or the company change. Open the app where you live. If it blocks the location, that is the answer for today. Eighteen is the floor to read this guide. The app may require an older age in your state.",
    },
    {
      q: "Is a PrizePicks entry the same as Jackpot?",
      a: "No. PrizePicks grades player statistics against lines and pays a multiplier. Jackpot is a hashed player-versus-player pot: players fund it, a committed seed decides the ticket, and Fairness lets you recompute the draw. A box score does not settle Jackpot. A hash does not settle a stat line. Adults 18+ only.",
    },
  ],
  sources: [
    { label: "PrizePicks", url: "https://www.prizepicks.com/" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
    {
      label: "IRS Topic 419, Gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
  ],
  related: [
    "prop-bets-explained",
    "implied-probability",
    "underdog-fantasy-review",
    "expected-value-gambling",
  ],
  updated: "2026-10-06",
};

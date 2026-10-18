import type { Guide } from "./types";

export const guide: Guide = {
  slug: "underdog-fantasy-review",
  cluster: "Prediction markets",
  keyword: "underdog fantasy",
  secondary: ["underdog pick em", "underdog best ball", "underdog payouts"],
  title: "Underdog Fantasy Review: Pick Em, Drafts and Payouts",
  description:
    "Underdog Fantasy review: how pick em and best ball drafts work, payout multipliers, legal states and how Underdog stacks up against PrizePicks.",
  h1: "Underdog Fantasy review of pick'em entries and best ball",
  answer:
    "Underdog Fantasy is two products under one name. Pick'em entries take more or less on player stats and pay a multiplier from a board. Best ball drafts build a roster whose scoring uses each player's best games, so you usually do not set a lineup every week. This review explains both, including how to read a payout table, and it does not list bonus codes. Adults 18+ only. This is education, not financial, legal, or tax advice.",
  facts: [
    "Underdog Fantasy pick'em entries are more-or-less stat lines bundled into one multiplier.",
    "Best ball drafts score a roster from each player's best games under that contest's rules.",
    "Multipliers and insured miss rules change. The slip in the app is the price.",
    "A teaching 6x that includes the stake breaks even near a 55% leg rate if three legs are independent.",
    "State availability changes. Check the app rather than a printed list.",
    "Neither product is a hashed player-versus-player pot.",
  ],
  sections: [
    {
      id: "what-this-review-is",
      title: "What this Underdog Fantasy review will and will not do",
      body: `Underdog Fantasy sells player-stat opinions and draft contests. This review explains how those products are built, how a multiplier should be read, and how the result differs from a shared pot. It is not a coupon page. A bonus code does not appear here, and a code would not change the break-even math on the slip.

Pick'em is the more-or-less board. Best ball is the draft. People mix the names because both live in the same app and both can pay from a contest prize or a posted multiple. They are different contracts. One grades a handful of stats against lines. The other grades a roster over a longer scoring window.

Adults 18+ only. You can lose the entry fee. This page is not financial advice, legal advice, or tax advice. If spending on the app stops being affordable, use [responsible gambling](/responsible-gambling). The cluster home is [Prediction market guides](/guides/topics/prediction-markets).

The neighboring more-or-less app is explained in [how PrizePicks works](/guides/how-does-prizepicks-work). Read that payout arithmetic next to this one. Similar screens are not the same board.`,
    },
    {
      id: "pick-em",
      title: "How Underdog pick'em entries are graded",
      body: `A pick'em leg posts a line on a counting stat. You take the over side or the under side. The app combines the legs you selected into one entry. Power-style entries, whatever the current label is, pay the larger multiplier only when every leg hits. Insured-style entries can return a smaller amount when you miss one leg, if the slip says a miss still pays.

The grade follows the app's stat source. A player who sits, a game that is postponed, and overtime can void or reprice a leg. Those rules are part of the product, in the same family as a sportsbook [prop bet](/guides/prop-bets-explained). Read them before the entry is fun, because they decide the argument after it is not.

You are taking the app's number. You are not negotiating a line with another user. If the line looks soft, the app may be wrong, or you may be missing a usage change the line already reflects. One entry cannot tell those apart. [Implied probability](/guides/implied-probability) is how a single price becomes a percent. A bundle of legs is a joint event, so the percent on one leg is not the percent on the ticket.

Keep the entry size inside money you can lose on a miss. Insured payouts feel like a safety net. The net is a lower all-correct multiplier. You pay for the miss in the price of the clean ticket.`,
    },
    {
      id: "best-ball",
      title: "How best ball drafts score a roster",
      body: `Best ball is a draft, not a more-or-less slip. You draft a roster, often in a snake draft against other entrants or against a contest field. During the scoring window the contest counts each player's better games and drops the rest, under rules that say how many weeks count and which roster spots start. You typically do not swap players on Sunday morning. The draft is the decision.

That design changes the skill. You are drafting for a distribution of outcomes across weeks, including injury and bye weeks, because a zero in one week can be the week the rules ignore. You are also drafting against the rooms you are actually in. A player who is right for a season-long roster can be wrong for a three-week contest with a different scoring window.

Payouts are contest math, not a universal multiplier. A best-ball contest publishes an entry fee, a field size, and a prize table. Read those three. A larger field with a top-heavy table pays the winner a lot and pays most entrants nothing. A smaller, flatter table pays more entrants a smaller profit. [DFS strategy](/guides/dfs-strategy) is the general version of that cash-versus-tournament choice. This review will not hand you a draft for a named contest.

No player names belong in a strategy paragraph here. Rankings move, injuries hit, and a guide that listed a roster would be stale and would pretend to know your room. The skill is reading the contest page you are about to enter.`,
    },
    {
      id: "payout-math",
      title: "A teaching multiplier and a contest fee",
      body: `Example 1 uses a pick'em assumption, not a live Underdog board. Suppose a 3-pick entry pays 6x including the stake, every leg must hit, and the legs are independent. Expected return per $1 is 6 × p³. Break-even sets that equal to 1, so p³ = 1/6 ≈ 0.1667. The cube root of 0.1667 is about 0.55, because 0.55 × 0.55 = 0.3025 and 0.3025 × 0.55 = 0.166375, just under one sixth. Each leg needs to be right about 55% of the time. The ticket itself still hits only about one time in six.

If the slip's 6x means profit on top of the stake, the total return is 7x and the break-even leg rate is lower. Write down which reading the help text uses. Then open the app and replace 6 with the multiplier you actually see.

Example 2 is a best-ball fee, also teaching numbers. One hundred people pay $25. The pool is $2,500. Suppose the contest keeps 10% and pays out $2,250. If everyone is equally skilled, the average return is $2,250 / 100 = $22.50. The average entrant is short $2.50 before skill. You need a larger share of the prize table than a random seat just to get back to $25. A real contest will not be a flat 10% story. Read its payout table and do the same division: prizes paid, divided by entries, compared with the fee you wrote.

| Object | Teaching price | What break-even requires |
| --- | --- | --- |
| 3-pick at 6x including stake | $1 returns $6 only if all hit | Each leg near 55% if independent |
| 100-person draft, 10% withheld | $25 entry, $22.50 average return | A better-than-average share of the prizes |

Both rows are illustrations so the method is visible. The app's board replaces row one. The contest page replaces row two.`,
    },
    {
      id: "states",
      title: "Legal states, age, and a short checklist",
      body: `Underdog Fantasy is not offered on the same terms in every state. Fantasy statutes, gaming regulators, and the company all change who can deposit. This review will not freeze a state list into a paragraph. Open the app in the state where you are. If the screen accepts you, you still have the contest rules to read. If the screen blocks you, that block is today's answer. This page does not describe a bypass.

The age on the account can be 18 or 21 depending on the product and the state. Eighteen is only the floor for reading this guide. A winning entry can also be taxable income whether or not a code was involved. That is a filing question, not a reason to treat a promotion as free money.

Checklist before you enter:

- Name the product: pick'em slip or best-ball contest.
- Copy the multiplier or the prize table from the screen, with today's date.
- Note whether a miss still pays, and at what reduced figure.
- Confirm the app accepts your state on its own screen.
- Ignore bonus codes. They are not part of this review and they do not fix a short price.
- Stake money you can lose if the entry misses.

A finished checklist is not an edge. It is a way to avoid playing a different product from the one you priced.`,
    },
    {
      id: "versus-prizepicks",
      title: "How Underdog stacks up against PrizePicks",
      body: `Both apps will sell you a more-or-less stat entry. That overlap is why people search them together. The differences that matter are on the slip and in the second product. Underdog's best ball drafts have no twin on a pure more-or-less board. PrizePicks is explained as a Power-versus-Flex payout problem in [how PrizePicks works](/guides/how-does-prizepicks-work). Use that page's 5x assumption only for PrizePicks. Use this page's 6x assumption only as a teaching stand-in for a slip you still have to open.

Compare three things and stop. The multiplier, including whether the stake is inside it. The rule for a player who does not play. The states the app accepts today. A longer comparison becomes a ranking, and this review is not a ranking. Neither app is "safer" because its marketing says skill. The price is the multiplier and the prize table.

| Question | Underdog pick'em | Underdog best ball | PrizePicks-style entry |
| --- | --- | --- | --- |
| Decision | More or less on stats | A draft, then the rules score it | More or less on stats |
| Price | A multiplier on the slip | Entry fee versus the prize table | A multiplier on that app's slip |
| A miss | May pay less if insured | A bad week may be dropped by the rules | Power misses pay zero; Flex may pay less |
| What to recheck | Today's board and your state | That contest's payout page | That app's board and your state |

Stacks of entries across both apps multiply the same opinions. Two tickets on the same players are one bet with two fees. If you want lineup theory for large draft fields, use the cash-versus-tournament split in [DFS strategy](/guides/dfs-strategy) rather than a bonus banner.`,
    },
    {
      id: "hashed-pot",
      title: "A hashed player-versus-player pot is a different object",
      body: `Underdog grades a stat line or a draft against contest rules. A hashed player-versus-player pot grades a committed draw against tickets the players bought. On [Jackpot](/), the pot is the entrants' money. A fee comes out when the round settles. A random seed that was committed before the result maps onto a winning ticket. Your chance follows your share of the tickets. No wide receiver, no draft slot, and no insured miss is involved.

When the round ends, the seed is published. [Fairness](/fairness) recomputes the hash in the browser so the published result can be checked against the commit. That check does not audit a fantasy stat feed, and Underdog does not publish a Jackpot seed, because a pick'em entry is not a ticket in that pot.

PVPspinArena does not offer Underdog, best ball, or a more-or-less board. Jackpot, Coinflip, and Roulette are the games, funded with USDC or ETH on Base. This review invents no user total and no fee percent for those games. If you wanted a draft or a stat multiplier, stay in the app and read its board. If you wanted a shared pot and a result you can recompute, Jackpot is the product. Adults 18+ only. Not financial, legal, or tax advice.`,
    },
  ],
  faqs: [
    {
      q: "Is this Underdog Fantasy review a bonus code page?",
      a: "No. It explains pick'em multipliers and best ball drafts. A promo code is not listed, and a code would not change the break-even arithmetic on a slip or the fee inside a contest prize pool. Read the price on the screen you are about to confirm.",
    },
    {
      q: "What is the difference between pick'em and best ball?",
      a: "Pick'em grades more-or-less stat legs against a multiplier. Best ball grades a drafted roster, usually by counting each player's better games and ignoring a set lineup each week. The contest page states how many weeks count and how prizes are split.",
    },
    {
      q: "What win rate does a 6x three-pick need?",
      a: "Only under this page's teaching assumption that 6x includes the stake and the legs are independent. Then each leg must be right about 55% of the time, because the cube root of one sixth is near 0.55. Replace 6x with the multiplier on your slip before you use the figure.",
    },
    {
      q: "Is Underdog Fantasy legal in every state?",
      a: "This review will not say that. Availability changes with state rules and with the company. Open the app where you live. A block is the answer for that session. Eighteen is the floor for this page. The app may require 21.",
    },
    {
      q: "Is an Underdog entry the same as Jackpot?",
      a: "No. Underdog pays a stat entry or a draft contest. Jackpot is a hashed player-versus-player pot funded by the players, settled from a committed seed, and checked on the Fairness page. A box score does not settle that pot. Adults 18+ only.",
    },
  ],
  sources: [
    { label: "Underdog Fantasy", url: "https://underdogfantasy.com/" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
    {
      label: "IRS Topic 419, Gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
  ],
  related: [
    "how-does-prizepicks-work",
    "prop-bets-explained",
    "dfs-strategy",
    "implied-probability",
  ],
  updated: "2026-10-06",
};

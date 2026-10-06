import type { Guide } from "./types";

export const guide: Guide = {
  slug: "arbitrage-betting",
  cluster: "Sports betting",
  keyword: "arbitrage betting",
  secondary: ["sure bet", "arb calculator", "two book arb"],
  title: "Arbitrage Betting: How Sure Bets Work and Real Risks",
  description:
    "Arbitrage betting explained: how sure bets work, a free arbitrage calculator, why books limit arbers and how arbitrage differs from matched betting.",
  h1: "Arbitrage betting: a price gap is not a paycheck",
  answer:
    "Arbitrage betting is staking both outcomes of the same event at two prices whose implied probabilities add up to less than 100 percent, so every result returns more than the combined stake if both bets are accepted and both are graded. That if is the product. Books limit accounts, void one side, and move the second price before you arrive. A calculator can show the gap. It cannot promise the gap survives contact with two betting accounts. This is not betting advice. Adults 18+.",
  facts: [
    "A sure bet in this sense is two prices on opposite outcomes that sum to less than a full book.",
    "The stake on each side follows that side's share of the combined implied probability.",
    "Equal prices at +110 and +110 on $500 each return $1,050 either way, which is $50 before anything breaks.",
    "If the second bet is not filled, you hold a normal bet that can lose the entire first stake.",
    "Books limit or close accounts that only show up for mispriced lines.",
    "Matched betting targets a promotion, while arbitrage targets a price gap, and neither one is a salary.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What arbitrage betting is",
      body: `Arbitrage betting, sometimes called a sure bet, compares two prices on outcomes that cannot all lose. In a two-way market that means one book on one side and another book on the other side. Convert each American price to an implied probability. A plus price uses 100 / (price + 100). A minus price uses the absolute price divided by that absolute price plus 100. Add the two probabilities. If the sum is under 1, the gap is the theoretical edge, and it exists only on paper until both wagers are in.

The edge is not a tip on who wins. You do not have a side. You have a pair of fills. [Odds converter](/guides/odds-converter) is the conversion step if you would rather work in decimal. Decimal prices make the stake obvious: each stake is proportional to 1 divided by its decimal price, which is the same implied probability. [Sports betting guides](/guides/topics/sports-betting) cover the single-book version of this arithmetic, where the two sides usually sum to more than 1. That extra is vig. An arb is a moment when two books, read together, sum to less.

This page will not tell you how to hide the pattern, open extra accounts, or dodge a limit. Those are ways to break the rules of the account you were given. The explanation stops at the math and at the ways the math fails in public.`,
    },
    {
      id: "two-book-example",
      title: "A two-book example with the stakes",
      body: `Worked case, invented prices, not a board you can bet. Book A posts Team Home at +110. Book B posts Team Away at +110 at the same moment. Each implied probability is 100/210, about 47.62 percent. The sum is about 95.24 percent, which is under 100, so a gap exists on these inputs. Because the prices match, the stakes match. Put $500 on Home at Book A and $500 on Away at Book B. Total outlay $1,000.

+110 in decimal is 2.10. Each $500 returns 500 × 2.10 = $1,050 if that side wins. The other $500 loses. Net profit is $50 either way, which is 5 percent of the $1,000 before any void, limit, or price change. The calculator's check is the sum of the implied probabilities. Under 1 means a gap. The dollar profit on equal stakes at +110 is the $50 in the table, not a rate you should expect next Sunday.

| Result | Book A +110 | Book B +110 | Net on $1,000 |
| --- | --- | --- | --- |
| Home wins | +$550 | −$500 | +$50 |
| Away wins | −$500 | +$550 | +$50 |

Second worked case, unequal prices, so the split is not half. Book A posts +150, implied probability 40 percent. Book B posts the other side at −120, implied probability 120/220, about 54.55 percent. The sum is about 94.55 percent, still under 1. On a $1,000 outlay, stake in proportion to those shares: about $423 on the +150 and about $577 on the −120. Each side returns about $1,058. Profit is about $58 if both fills stick. Recompute if either price changes by a single tick. The $423 figure is not a constant.`,
    },
    {
      id: "second-bet",
      title: "Why the second bet is the hard part",
      body: `The table assumes both bets exist. The usual failure is that the first bet is accepted and the second price is gone. Suppose you filled $500 at +110 on Home, and Away has moved from +110 to −110 before you stake it. If you still bet $500 at −110 on Away, the position is no longer the arb.

| Result | $500 at +110 already in | $500 at −110 taken late | Net |
| --- | --- | --- | --- |
| Home wins | +$550 | −$500 | +$50 |
| Away wins | −$500 | about +$455 | about −$45 |

Away at −110 on $500 profits about $455, not $550. You can win $50 or lose about $45. That is an ordinary bet with a small cushion, not a sure bet. Walking away leaves the naked $500 at +110, which can lose all $500. Both choices are real risks. The calculator does not get a vote after the second button fails.

Staggered fills also die when the two books disagree on settlement. One book can void a postponed game and the other can keep the bet. One book can call a palpable error and cancel a price the other book honored. You then hold one live side. "Both or nothing" is the rule you wanted. It is not the rule two separate houses owe you.`,
    },
    {
      id: "account-limits",
      title: "Account limits and the other ways it dies",
      body: `Books limit arbers. An account that only bets obvious misprices gets a lower max, a slower acceptance, or a closed market. A $50 theoretical edge on $1,000 is a $1 edge if the max bet is $20. The percentage did not vanish. The dollars you are allowed to use did. This page does not treat a limit as a puzzle to route around. A limit is the book refusing the trade.

Different maximums on the two sides unbalance the stake the formula asked for. If Book A takes $423 and Book B takes $100, you are not flat. You are long the Book A side for the difference. Rounding, bonus funds that are not cash, and odds that change between the quote and the acceptance do the same thing in smaller bites. Commission on an exchange, if one leg is a lay, comes off the winning side and can eat a thin gap entirely. [Betting exchange](/guides/betting-exchange-explained) is that commission, explained as a product rather than as a trick.

Nothing here is a promise of profit. A gap on a screenshot is not money. Two accepted bets at those prices, graded the same way, are money, and the path between the screenshot and the grade is where accounts get limited. Adults 18+. This is not betting advice and not a method for multiplying accounts.`,
    },
    {
      id: "versus-matched",
      title: "How arbitrage differs from matched betting",
      body: `[Matched betting](/guides/matched-betting) uses a back and a lay so a promotion, not the match, is the target. You often want the prices to be close, and you accept a small qualifying loss to unlock a bonus under that book's terms. Arbitrage does not need a bonus. It needs the implied probabilities to sum to less than one. If there is no gap and no promotion, neither activity has anything to do.

People blend the words because both can involve two accounts and both attract limits. The cashflows differ. A matched-betting loop can lose on the qualifying bets and still come out ahead only if the bonus is paid under the rules. An arb has no bonus to save it. If the gap closes, you are done, and if you forced the second bet anyway you may be in the lopsided table above. Terms that forbid bonus abuse are a matched-betting problem. Max-bet cuts are both problems.

[Line shopping](/guides/line-shopping) is the tame relative. Shopping takes the best single price and leaves the other side alone. Arbitrage takes both sides at two books. Shopping still pays vig, just less of it. Arbitrage tries to pay negative vig and, in practice, pays for the privilege with limits and with naked positions when the second click misses. Do not describe a shopped −105 as a sure bet. It is a better price on one side.`,
    },
    {
      id: "checklist",
      title: "A checklist before you call anything sure",
      body: `A gap is a hypothesis until both bets exist. Read it that way.

- Convert both prices to implied probability and add them. Stop if the sum is 1 or more.
- Split the outlay in proportion to each side's implied probability, and write both stakes.
- Confirm the two markets are true opposites under both books' settlement rules.
- If the second price moves, throw out the first calculation and decide again, including the option to stop.
- Treat a max-bet cut as the end of the size you planned, not as a prompt to evade it.
- Never use rent or bill money. Adults 18+. This is not betting advice, and it is not a promise of profit.

The [responsible gambling](/responsible-gambling) page is the stop if chasing missed arbs has turned into ordinary betting with a calculator beside it.`,
    },
    {
      id: "pvp-contrast",
      title: "A book's vig versus a pot that is shared",
      body: `Sportsbooks charge vig by posting two sides that usually sum to more than a fair book. Arbitrage is the hunt for the opposite accident across two books. The accident is not a business model the books intend to keep selling you. When they notice, the account limit is the correction. You do not "beat the vig" as a career by screenshot. You find a crack that the book can close.

A PvP pot is shared among the players in the pot. There is no second book to arb against, and there is no juice hidden in a pair of American prices. [Fairness](/fairness) explains how this site's rounds can be checked. [Jackpot](/) is the pot, not a sure-bet ticket. This page states no player counts, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice.`,
    },
  ],
  faqs: [
    {
      q: "What is a sure bet in arbitrage betting?",
      a: "It is a pair of prices on opposite outcomes whose implied probabilities add to less than 100 percent. Stake both sides in proportion to those shares. If both bets are accepted and graded, every result returns more than the combined stake. The $500 and $500 case at +110 profits $50 either way only while those prices hold. A moved line, a void, or a rejected second bet removes the word sure. This is not a promise of profit.",
    },
    {
      q: "How do you split the stakes?",
      a: "Turn each price into an implied probability, then divide each probability by the sum of the two. Multiply those shares by the total you are willing to lay out. Equal prices get equal stakes. A +150 against a −120 on $1,000 is about $423 and $577, not $500 and $500. If either price changes, the shares change. The split is a calculator, not a fixed recipe, and it assumes both books actually take the bet.",
    },
    {
      q: "Why do sportsbooks limit arbers?",
      a: "Because the gap is a misprice the book does not want to keep offering. Accounts that bet only those prices get lower limits, delayed acceptance, or closed markets. A large theoretical percentage on a tiny max bet is a tiny amount of money. This page does not explain how to avoid a limit. A limit means that book is finished with the trade. Moving the action under another name breaks the account rules.",
    },
    {
      q: "How is arbitrage different from matched betting?",
      a: "Matched betting lays a back so a bonus is the target, and it often accepts a small qualifying loss to get there. Arbitrage needs no promotion. It needs the two implied probabilities to sum to less than one. Both can use two accounts, and both can be limited. An arb with no remaining gap has nothing to fall back on, because there is no bonus to collect. Read the matched-betting page before mixing the two labels.",
    },
    {
      q: "Can the arb lose money?",
      a: "Yes. If only one side is filled, that side can lose the whole stake. If you take a worse second price, the net can be negative on one result, as in the late −110 example. If one book voids and the other grades, you are exposed. Limits can shrink the win to almost nothing while the operational risk stays. A calculator output is not cash. Adults 18+. This is not betting advice.",
    },
  ],
  sources: [
    { label: "Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    {
      label: "National Council on Problem Gambling — help and treatment",
      url: "https://www.ncpgambling.org/help-treatment/",
    },
  ],
  related: [
    "matched-betting",
    "betting-exchange-explained",
    "odds-converter",
    "house-edge",
  ],
  widget: "arbitrage",
  updated: "2026-10-06",
};

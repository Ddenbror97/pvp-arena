import type { Guide } from "./types";

export const guide: Guide = {
  slug: "round-robin-bet",
  cluster: "Sports betting",
  keyword: "round robin bet",
  secondary: ["round robin parlay", "round robin cost", "robin combinations"],
  title: "Round Robin Bet: How It Works and Is It Worth It?",
  description:
    "Round robin bets explained with examples: how many parlays you create, total cost, payout scenarios and when a round robin beats a straight parlay.",
  h1: "Round robin bet: how many parlays you actually buy",
  answer:
    "Round robin bet is one list of teams turned into every smaller parlay of a size you pick, so each combination is its own ticket with its own stake. Three teams in two-team parlays make three bets, not one. The card can cash a piece when a full parlay would have lost, and it costs more because you pay for the combinations that miss. This page does the count and the payouts. It is not betting advice. Adults 18+.",
  facts: [
    "A round robin builds every parlay of a chosen size from one list of teams.",
    "Three teams taken two at a time make three parlays, and four teams taken two at a time make six.",
    "Total cost is the stake on each parlay multiplied by how many parlays the list creates.",
    "Two winners on a three-team card cash only the one parlay that pairs those winners.",
    "A straight parlay of the full list is cheaper and pays only if every leg wins.",
    "Each small parlay still includes vig, and a shorter price can erase the partial cash.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a round robin bet is",
      body: `A round robin bet starts with a list of selections and a parlay size. The book then writes every parlay of that size that can be made from the list. You are not buying one ticket that survives a loss. You are buying a stack of tickets that share legs. If the size is two, every pair is a parlay. If the size is three, every trio is a parlay. Some menus let you run both sizes at once, and then you pay for both stacks.

The stake box is easy to misread. A "$10 round robin" often means $10 on each parlay, not $10 for the whole card. Three parlays at $10 cost $30. Six parlays at $10 cost $60. The confirmation screen is the bill. If it shows a total you did not expect, the size or the per-parlay stake is not what you pictured.

[Parlay betting](/guides/parlay-betting-explained) is the single ticket this product slices up. A straight parlay needs every leg. A round robin needs every leg only inside each small parlay, which is a different contract and a larger outlay. [Sports betting guides](/guides/topics/sports-betting) hold the rest of the pricing language, including the juice on each leg before it is combined.

A teaser is not a round robin. A [teaser bet](/guides/teaser-bet) moves the number and then still needs every teased leg on one ticket. A round robin keeps the original numbers and multiplies the count of tickets. If the slip does not list the combinations, ask the bet slip to expand them before you accept the total.`,
    },
    {
      id: "how-many",
      title: "How many parlays the list creates",
      body: `The count is the number of ways to choose the parlay size from the list. You do not need a formula beyond small numbers. For two-team parlays, pair each team with each teammate once. Three teams make three pairs. Four teams make six pairs, because the fourth team pairs with each of the other three and the original three already made three pairs: 3 + 3 = 6. Five teams make ten pairs.

Three-team parlays from four teams make four tickets, one for each way to leave a team out. From five teams they make ten. A menu that sells "by 2s and by 3s" adds the stacks. Four teams by twos and by threes is 6 + 4 = 10 parlays. At $10 each, that card costs $100, which surprises people who thought they were staking $10.

| List | Parlay size | Parlays created | Cost at $10 each |
| --- | --- | --- | --- |
| 3 teams | 2 | 3 | $30 |
| 4 teams | 2 | 6 | $60 |
| 4 teams | 3 | 4 | $40 |
| 4 teams | 2s and 3s | 10 | $100 |

The table is arithmetic, not a suggestion to build the largest card. Books sometimes cap the combinations or refuse correlated legs inside one parlay. A same-game pair may be blocked or priced on a different product. This page stays with parlays of separate events. If a leg is a moneyline rather than a spread, the pair still counts as one parlay. [Moneyline betting](/guides/moneyline-betting-explained) only changes the price of that leg, not the number of tickets.

Write the count on paper and multiply by the stake before you look at the potential payout. The payout graphic assumes a sweep you have not earned yet. The cost is already real.`,
    },
    {
      id: "three-team-dollars",
      title: "Three teams and what each result pays",
      body: `Worked case, using an illustrative two-team parlay price of +260, not a live board. Teams A, B, and C. The robin is AB, AC, and BC. Each parlay is $10, so the card costs $30. At +260, a $10 winner returns $36, which is $26 of profit plus the stake. A book that multiplies two -110 prices instead of using a fixed chart pays a slightly different number. [Odds converter](/guides/odds-converter) is how you turn the slip's American price into a return. Use the slip if it disagrees with +260.

If A, B, and C all win, all three parlays win. You receive 3 × $36 = $108. Profit on the $30 card is $78. If only A and B win, and C loses, only AB wins. AC and BC both contain C. You receive $36 against a $30 cost, so the card profits $6. If only one team wins, every parlay contains a loser and the card loses $30.

| Winners among A, B, C | Parlays that cash | Money back | Net on $30 |
| --- | --- | --- | --- |
| All three | 3 | $108 | +$78 |
| Exactly two | 1 | $36 | +$6 |
| Exactly one | 0 | $0 | −$30 |
| None | 0 | $0 | −$30 |

The thin row is the one people remember wrong. Two winners do not cash two parlays. They cash the single pair of those winners. On this price the card is still ahead by $6. Change the two-team price to +180 and a $10 winner returns $28. One cashing parlay then returns $28 against a $30 cost, and two winners produce a $2 loss. The same "I only needed two" story is a loser if the small-parlay price is short. That is the second lesson inside the first example: partial credit is not profit until you subtract the dead tickets.`,
    },
    {
      id: "four-team-case",
      title: "Four teams, and the straight parlay beside it",
      body: `Second worked case. Four teams, two-team parlays only, six tickets at $10, cost $60. Keep the illustrative +260 price, so each winner returns $36. If all four win, all six parlays win and you receive 6 × $36 = $216. Profit is $156 on $60. If exactly three win, the winning pairs are the three ways to pair those three winners. You receive 3 × $36 = $108. Profit is $48. If exactly two win, only one parlay cashes. You receive $36 against $60 and lose $24.

A straight four-team parlay is a different purchase. One $10 ticket, not six. If the book multiplies four legs priced at -110, each leg is about 1.909 in decimal, and four of them multiply to about 13.3. A $10 stake would return about $133 if every leg won, and $0 otherwise. The robin costs $60 to get paid on partial sweeps. The straight parlay costs $10 and pays nothing unless the sweep is complete. When all four win, the cheap parlay's profit on $10 can look "better" only if you ignore that you risked less. Compare them on the same total stake if you want a fair reading, or compare them as the actual products: one small ticket versus a stack.

The robin beats the straight parlay in the cases where some legs lose and enough pairs still cash to cover the stack. In the four-team illustration, three winners do that (+$48) and two winners do not (−$24). The straight parlay loses the $10 in both of those cases. So the robin is ahead of the straight parlay when exactly three of four hit, and it is behind when all four hit if you only stare at profit per winning story without counting the extra $50 you staked. "Worth it" is that comparison, done with your prices, not a slogan. Adults 18+. This is not a recommendation to prefer either ticket.`,
    },
    {
      id: "when-it-wins",
      title: "When a round robin beats a straight parlay",
      body: `It beats a straight parlay of the full list when the result you actually get is a partial sweep that still cashes enough small parlays to clear the higher cost. It loses to the straight parlay when every leg wins, because you funded combinations you did not need. It loses to betting nothing when the small-parlay price is so short that the cashing tickets do not cover the dead ones. The +260 illustration cleared a two-winner, three-team card by $6. The +180 version of that same card did not clear it.

There is no threshold that makes the product good. More teams raise the count faster than they raise your comfort. Five teams by twos is ten parlays. At $10 that is $100 for a card people describe as "a few picks." One loss does not zero the card, and it does zero every parlay that included the loser. The survivors still have to pay for the corpses.

Correlated legs and blocked pairs change the count the book will actually sell. A void or a push on one team drops that team from every parlay that held it, under the book's parlay rules, and the cost of those parlays may return. That is settlement, not a bonus. Read it on the ticket. If you cannot list the parlays and the total stake from memory, the card is too large for the decision you think you made.`,
    },
    {
      id: "checklist",
      title: "A checklist before you multiply the stake",
      body: `Read the card. Do not treat the list as a system.

- Count the parlays from the list and the size, then multiply by the stake per parlay.
- Write the return of one small parlay from the price on the slip, not from a remembered chart.
- Mark which result (all win, one loss, two losses) still covers the total cost.
- Compare that card with one straight parlay of the same teams at the same book.
- Reject the card if the confirmation total is not the total you calculated.
- Stop if the stack is money you cannot lose. Adults 18+. This is not betting advice.

The [responsible gambling](/responsible-gambling) page is the stop if a losing robin becomes a reason to add teams. More teams add parlays. They do not repair the price.`,
    },
    {
      id: "pvp-contrast",
      title: "Vig on every parlay, and a pot that is shared",
      body: `Sportsbooks charge vig inside each leg, and a parlay multiplies those short prices. A round robin does not shop that vig away. It buys the short price several times. The book is paid on the combinations that lose, which on a normal card is most of them. Partial cashouts of winning pairs are not the book sharing anything with you. They are the pairs you paid for in advance.

A PvP pot is shared among the players who entered it. There is no parlay menu and no stack of juiced combinations. [Fairness](/fairness) is how this site's rounds can be checked. [Jackpot](/) is that pot, not a round robin ticket. This page states no site totals, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice or a nudge toward either product.`,
    },
  ],
  faqs: [
    {
      q: "How many parlays are in a three-team round robin?",
      a: "A three-team round robin of two-team parlays creates three parlays, one for each pair. If the stake is $10 per parlay, the card costs $30, not $10. All three pairs cash only if every team wins. Exactly two winners cash only the pair of those two, and the other two parlays lose. The count is the bill. Confirm it on the slip before you accept the total. Adults 18+.",
    },
    {
      q: "Does a round robin win if one leg loses?",
      a: "It can cash the parlays that do not contain the losing leg, and it still loses the parlays that do. On a three-team, two-team card, one loss leaves a single winning parlay if the other two legs win. Whether the card shows a profit depends on the price and on the total cost of all three parlays. One surviving ticket often does not cover the stack. Check the return against the full outlay.",
    },
    {
      q: "Is a round robin cheaper than a straight parlay?",
      a: "No. A straight parlay is one stake. A round robin is one stake for every combination, so three pairs cost three stakes and six pairs cost six. The straight parlay pays only if every leg wins. The robin can pay something when a subset wins, because you already bought those subsets. You are paying for insurance by staking more, not by receiving a discount from the book.",
    },
    {
      q: "When does a round robin beat a straight parlay?",
      a: "When enough of the small parlays cash to clear the higher total stake, which is usually a partial sweep rather than a full one. When every leg wins, the straight parlay did the job with one stake and the robin paid for extra tickets. When the small-parlay price is short, even a partial sweep can lose money. The comparison needs your prices. It is not a standing rule, and it is not betting advice.",
    },
    {
      q: "What does by 2s and by 3s mean?",
      a: "It means two stacks. By 2s is every pair. By 3s is every trio. Four teams produce six pairs and four trios, ten parlays in all. At $10 each, the card is $100. Each stack has its own price, because a three-team parlay pays differently from a two-team parlay. Read both prices. Do not assume the headline payout applies to every ticket in the stack.",
    },
  ],
  sources: [
    { label: "Parlay", url: "https://en.wikipedia.org/wiki/Parlay_(gambling)" },
    {
      label: "National Council on Problem Gambling — help and treatment",
      url: "https://www.ncpgambling.org/help-treatment/",
    },
  ],
  related: [
    "parlay-betting-explained",
    "moneyline-betting-explained",
    "odds-converter",
    "how-to-win-at-sports-betting",
  ],
  updated: "2026-10-06",
};

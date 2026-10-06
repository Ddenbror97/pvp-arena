import type { Guide } from "./types";

export const guide: Guide = {
  slug: "superfecta-bet",
  cluster: "Horse racing",
  keyword: "superfecta",
  secondary: ["superfecta box", "10 cent superfecta", "superfecta payout", "boxed superfecta cost"],
  title: "Superfecta Bet: Costs, Box Combos and How Payouts Work",
  description:
    "Superfecta bets explained: picking the first four finishers, box and key cost tables, 10-cent superfectas and why payouts can be so huge.",
  h1: "Superfecta bet: four-horse orders, box costs and 10-cent tickets",
  answer:
    "Superfecta tickets cash when you name the first four finishers in the correct order. A straight ticket is one line of four. A box of n horses costs n × (n − 1) × (n − 2) × (n − 3) × the base stake. Ten-cent superfectas exist so a modest box is affordable, and the payoff is still the pool minus takeout. Huge prices show up because most orders get almost no money. You must be 18+ or the local legal age.",
  facts: [
    "Four horses boxed make 4 × 3 × 2 × 1 = 24 superfecta combinations.",
    "Five horses boxed make 5 × 4 × 3 × 2 = 120 combinations. At $0.10 that box costs $12.",
    "Six horses boxed make 6 × 5 × 4 × 3 = 360 combinations. At $0.10 that box costs $36.",
    "A 10-cent ticket is worth 1/20 of a payoff quoted for $2, or 1/10 of a payoff quoted for $1.",
    "The superfecta pool is separate from the trifecta pool. Hitting third correctly does not pay this bet.",
    "A large payoff means little money was on that exact order after takeout, not that the track posted a bonus.",
  ],
  sections: [
    {
      id: "what",
      title: "What a superfecta makes you get right",
      body: `A superfecta is the first four in order. Miss the winner, the second, the third or the fourth and a straight ticket is dead. A box survives only if the real order was one of the orders you bought. Fourth place is the extra slot beyond a trifecta. Being right about the top three does not pay a superfecta. Those are different pools.

That extra slot is why the combination count jumps. The trifecta box formula stops at three factors. The superfecta multiplies by one more declining term. [Trifecta bet](/guides/trifecta-bet) is the place to learn n × (n − 1) × (n − 2) before you add the fourth horse. [Exacta bet](/guides/exacta-bet) is the two-horse version. If those bills already feel large, a superfecta box will feel larger.

The pool is pari-mutuel. Superfecta stakes go into the superfecta pool, takeout comes off, and the net is split by the tickets that held the winning order. Breakage rounds the price down. There is no fixed book price sitting under the big number on the screen. You must be 18+ or the local legal age. A fat score is still gambling. Set the stop with [responsible gambling](/responsible-gambling) before you start covering fourth place. More pool bets are collected under [Horse racing guides](/guides/topics/horse-racing).`,
    },
    {
      id: "box",
      title: "Box combinations and what they cost",
      body: `Every horse in the box can finish first, each remaining horse second, each remaining horse third, and each remaining horse fourth. The count is n × (n − 1) × (n − 2) × (n − 3). Multiply by the base. Tracks often open this pool at $0.10 or $1. The dime base is the only reason a five-horse box is a common ticket rather than a luxury.

| Horses boxed | Combinations | Cost at $0.10 | Cost at $1 |
| --- | --- | --- | --- |
| 4 | 24 | $2.40 | $24 |
| 5 | 120 | $12 | $120 |
| 6 | 360 | $36 | $360 |
| 7 | 840 | $84 | $840 |
| 8 | 1,680 | $168 | $1,680 |

Worked example 1. Five horses at ten cents: 5 × 4 × 3 × 2 = 120, and 120 × $0.10 = $12. One of those 120 lines can win. If the $1 payoff on that order is $90, your dime ticket returns $9 and the box loses $3. You hit the superfecta and lost money. If the $1 payoff is $400, the dime ticket returns $40 and the profit on a $12 box is $28.

Worked example 2. Four horses at $1: 24 × $1 = $24. Same 24 orders a dime box would have sold for $2.40. The richer base pays ten times as much on a hit and costs ten times as much in the meantime. Choose the base on purpose. A key is the cheaper cousin of a full box: one horse is locked in a slot and the others rotate through the remaining places. The count is smaller than n × (n − 1) × (n − 2) × (n − 3) because one slot is no longer free. Ask which key the track sells before you assume the formula. A $12 dime box and a $12 key are not the same set of orders, and only the ticket in your hand is the one the pool will pay.`,
    },
    {
      id: "dime",
      title: "How a 10-cent superfecta payout is sliced",
      body: `The board's headline number is easy to misread. Tracks quote superfecta prices for a stated base, often $1 or $2. Your ticket is worth that quote times (your base ÷ the quoted base).

A payoff of $2,000 for $1 returns $200 on a 10-cent ticket, because $0.10 is one-tenth of $1. A payoff of $2,000 for $2 returns $100 on a 10-cent ticket, because $0.10 is one-twentieth of $2. The same digits, two different tickets. Look at the words beside the number before you divide.

| Quoted payoff | Quoted base | 10-cent ticket returns | $1 ticket returns |
| --- | --- | --- | --- |
| $200 | $1 | $20 | $200 |
| $2,000 | $1 | $200 | $2,000 |
| $2,000 | $2 | $100 | $1,000 |
| $10,000 | $2 | $500 | $5,000 |

Work the slice once on paper before you celebrate a board price. A $1 quote of $500 is $50 on a dime, $250 on fifty cents, and $500 on a dollar. A $2 quote of $500 is $25 on a dime, because the dime is 0.10/2 = 1/20 of the quoted base. Mixing those two headers is how a $25 ticket gets described as a $50 ticket in the parking lot.

The return includes the way the track posts the stake. Profit is that return minus every combination you bought, not minus one dime. A $12 box that returns $20 is an $8 profit. A $12 box that returns $9 is a loss with a winning combination in the middle. Tell those apart at the cashier, not in the stretch.`,
    },
    {
      id: "key",
      title: "Keys and partial wheels for fourth place",
      body: `A full box uses horses you would not actually put on top. A key refuses those orders. Pin one horse to win, and let four others fill second, third and fourth. The count is 4 × 3 × 2 = 24 combinations. At $0.10 that is $2.40. Boxing all five would have been 120 combinations and $12. You saved $9.60 by refusing every line in which the key horse does not win.

A tighter wheel names a pair that may win and a small group that may fill the next three slots. Write it as four blanks and fill them without repeating a horse. If you cannot count the lines on paper, the ticket is too wide to buy. Machines will count it for you, and they will also sell you the lines you meant to cross out.

Fourth place is where boxes get sloppy. Players add "live" longshots underneath because fourth feels like a lottery slot. Each added horse multiplies every line above it. Going from five horses to six in a dime box moves the cost from $12 to $36. That extra $24 is not a saver. It is thirty dollars of orders in which the new horse occupies one of the four slots. [How to bet on horse racing](/guides/how-to-bet-on-horse-racing) is the habit of multiplying before you confirm. It matters most on this pool.`,
    },
    {
      id: "why-huge",
      title: "Why superfecta payouts can look enormous",
      body: `There are many possible orders and only one winner. In a ten-horse field the number of ways to finish the first four, with no repeats, is 10 × 9 × 8 × 7 = 5,040. The public does not spread money evenly across 5,040 lines. Most of the pool sits on a few sensible orders. An order that uses two longshots can hold a tiny fraction of the net pool and therefore pay a large multiple.

Takeout still comes off the top. A $100,000 superfecta pool with a 25% take, using 25% only as a round teaching rate, leaves $75,000. If $150 landed on the winning order, each dollar of that $150 claims $75,000 / $150 = $500. A 10-cent ticket returns $50. Change the $150 and you change the price. The track did not decide that this order "should" pay $500. The crowd's neglect, after the take, did.

The teaching rate is not your track's rate. Read the takeout in the program. Exotic takes are commonly higher than the win take. A huge price can still be a negative-expectation ticket. The size of the poster is the size of the unpopularity, divided into what remained after the cut. [Kentucky Derby betting](/guides/kentucky-derby-betting) is where a twenty-horse field makes this arithmetic loudest.`,
    },
    {
      id: "checklist",
      title: "A checklist before you buy the fourth slot",
      body: `Ask whether you have an opinion about fourth. If the answer is "whoever," you are about to buy a box to hide that.

- Name the base: $0.10 or $1. Write the quote base you will use to read the payoff.
- Four horses boxed is 24 lines. Five is 120. Six is 360. Do not guess.
- A five-horse dime box costs $12. Profit starts above a $12 return, not above a dime.
- Key a horse you need on top instead of boxing horses you need to lose.
- A 10-cent ticket takes one-tenth of a $1 quote and one-twentieth of a $2 quote.
- You are 18+. The day's loss limit includes this box, not just the win bets.
- After a scratch, recount live lines. A refund of scratched lines is not a refund of the box.

Say the fourth horse out loud. If the name you say is "the field," you do not have a fourth-place opinion, and the box is a donation to the takeout. A key that stops at three live horses for the last slot is a smaller donation and a clearer sentence.

If the checklist fails on the third line, switch to a trifecta or a win bet. Fourth place is optional. The pool will accept your money either way, and it will remove the takeout either way. Optional is the part you control.`,
    },
    {
      id: "fit",
      title: "When a superfecta fits a card and when it does not",
      body: `A superfecta fits when the field is large enough that fourth is a real argument, and when your groups for each slot multiply to a cost inside the day's limit. A stakes race with a standout and a messy underneath is a key-on-top shape. A short field of six is usually a bad superfecta field: you are paying to order horses the public can also order, and the takeout is still the exotic rate.

It does not fit as a rescue. A losing exacta is not a reason to "go deeper" in the next race. The next superfecta does not remember the exacta. It also does not fit as a substitute for a win opinion. If you cannot name who can win, adding three more slots makes the ticket worse, not more clever.

[Handicapping horses](/guides/handicapping-horses) can sort the top of the field. It will not price 5,040 orders by hand, and you should not try. Price the structure you can say in one sentence, use the dime base when the sentence is still wide, and leave the other orders to the people who want them. Their neglect is what makes a rare hit large. Your job is to notice that "rare" applies to you as well.`,
    },
  ],
  faqs: [
    {
      q: "How much is a five-horse superfecta box at 10 cents?",
      a: "It costs $12. Five horses make 5 × 4 × 3 × 2 = 120 combinations, and 120 × $0.10 = $12. One order cashes in a normal race.",
    },
    {
      q: "Why can a superfecta pay thousands?",
      a: "The net pool, after takeout, is divided by the small amount bet on one exact order. Unpopular orders pay large multiples. The multiple is not a bonus the track adds on.",
    },
    {
      q: "Is a 10-cent superfecta one-tenth of the posted price?",
      a: "Only when the posted price is for $1. If the board quotes a $2 payoff, a dime ticket is one-twentieth of that quote. Read the base on the price.",
    },
    {
      q: "Does hitting the trifecta pay my superfecta?",
      a: "No. The trifecta pool and the superfecta pool are separate. A superfecta also needs the fourth-place horse in the right slot.",
    },
    {
      q: "What is a straight superfecta?",
      a: "One ordered line of four horses. It costs a single base unit, such as $0.10 or $1. Every other order of those horses loses.",
    },
  ],
  sources: [
    { label: "Superfecta", url: "https://en.wikipedia.org/wiki/Superfecta" },
    { label: "Parimutuel betting", url: "https://en.wikipedia.org/wiki/Parimutuel_betting" },
    { label: "Equibase", url: "https://www.equibase.com/" },
  ],
  related: ["trifecta-bet", "exacta-bet", "kentucky-derby-betting", "how-to-bet-on-horse-racing"],
  updated: "2026-10-06",
};

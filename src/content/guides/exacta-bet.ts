import type { Guide } from "./types";

export const guide: Guide = {
  slug: "exacta-bet",
  cluster: "Horse racing",
  keyword: "exacta bet",
  secondary: ["exacta box", "boxed exacta cost", "exacta key", "straight exacta", "exacta wheel"],
  title: "Exacta Bet Explained: Straight, Box and Key Costs",
  description:
    "What an exacta bet is, how straight, boxed and keyed exactas work, what they cost and how payouts are calculated, with worked race examples.",
  h1: "Exacta bet: straight, box and key, and what each one costs",
  answer:
    "Exacta bet tickets cash when you name the first two finishers in the correct order. A straight exacta is one ordered pair. A box covers every order of the horses you name, at a cost of n × (n − 1) × the base stake. A key nails one horse to a slot and wheels the rest around it. The payoff comes from the exacta pool after takeout, not from a fixed book price. You must be 18+ or the local legal age.",
  facts: [
    "A straight exacta is one combination: horse A first and horse B second, and no other order.",
    "An n-horse exacta box has n × (n − 1) combinations. Three horses make 6. Four horses make 12.",
    "A four-horse exacta box at a $1 base costs 4 × 3 × $1 = $12.",
    "A three-horse exacta box at a $2 base costs 3 × 2 × $2 = $12.",
    "Keying one horse on top of three others is 3 combinations, not a full box of four.",
    "The exacta pool is separate from win, place and show. Takeout on exotics is often higher than on win.",
  ],
  sections: [
    {
      id: "what",
      title: "What an exacta bet pays you for",
      body: `An exacta bet is an order, not a band. You need the winner and the runner-up in the sequence on the ticket. If you boxed them, both sequences were on the ticket and either cash. If you bought only A over B, then B over A is a loss even though you named both horses.

That is the whole contract. Third place does not appear. A horse that runs third cannot save an exacta that missed the top two. Win, place and show, by contrast, each follow one horse into a finishing band. Those rules are on [win place show betting](/guides/win-place-show-betting). Use them when you do not have an opinion about who runs second.

The exacta pool holds only exacta money. After takeout, that net pool is split by the winning combinations. A straight ticket that is the only winner takes a large share. A boxed ticket that hits pays the same per winning combination as a straight ticket would have, but you bought the losing orders as well, so the profit is the payout minus the whole box. Adults 18+ or the local legal age. Session limits belong with [responsible gambling](/responsible-gambling). More racing guides sit under [Horse racing guides](/guides/topics/horse-racing).`,
    },
    {
      id: "straight",
      title: "Straight exacta: one pair, one base stake",
      body: `A straight exacta names one horse to win and a different horse to run second. At a $1 base you pay $1. At a $2 base you pay $2. There is nothing to multiply. The ticket either matches the photo or it does not.

People like the straight ticket because the cost stays honest. The cost of being wrong about the order is the entire stake. If you are confident that A beats B and that nobody else beats both, a straight A over B is the ticket that matches the sentence you just said. If you would be annoyed to lose with B over A, you do not hold that opinion, and a straight ticket is you arguing with yourself.

Worked example. You buy a $2 straight exacta, 4 over 7. The official exacta payoff is $48 for a $2 ticket. The 4 wins and the 7 runs second. The ticket returns $48, which is $46 of profit. If the 7 wins and the 4 runs second, the ticket returns $0. The $48 figure was a pool result for that ordered pair. It was not a price the track promised when you walked up. Late exacta money can move it before the off. [Horse racing odds explained](/guides/horse-racing-odds-explained) covers the same idea on the win tote: the board is an estimate until the pool closes.`,
    },
    {
      id: "box",
      title: "Boxed exacta cost: n times n minus 1",
      body: `A box tells the pool you will take the horses you named in any order. Every horse can finish first, and each of the others can finish second. The combination count is n × (n − 1). The cost is that count times the base stake.

| Horses in the box | Combinations n × (n − 1) | Cost at $1 | Cost at $2 |
| --- | --- | --- | --- |
| 2 | 2 | $2 | $4 |
| 3 | 6 | $6 | $12 |
| 4 | 12 | $12 | $24 |
| 5 | 20 | $20 | $40 |
| 6 | 30 | $30 | $60 |

Worked example 1. Four horses at a $1 base: 4 × 3 × $1 = $12. Twelve ordered pairs. If the top two both come from those four, in either order, one pair cashes and eleven lose. The payout has to clear $12 before the box shows a profit.

Worked example 2. Three horses at a $2 base: 3 × 2 × $2 = $12. Six ordered pairs. Same dollars as the four-horse $1 box, fewer horses, richer base. If the payoff on the winning pair is $40 for $2, the box returns $40 against a $12 cost, profit $28. If the payoff is $9 for $2, the box returns $9 and loses $3 even though you "hit" the exacta.

Hitting is not the same as winning money. Price the box first. A two-horse box is just both straight orders, and it is the only box that does not grow a surprising bill.`,
    },
    {
      id: "key",
      title: "Keys and wheels: fewer combinations on purpose",
      body: `A key pins one horse to a job. The common shape is "A on top" with several horses underneath for second. If A must win and any of three others may run second, you buy 3 combinations, not a four-horse box of 12. At $1 that key costs $3. You lose if A runs second and one of those three wins. You saved $9 against the box and you gave up those reverse orders.

A key underneath is the mirror: several horses to win, A locked to second. Three on top of A is again 3 combinations. You need A to run second specifically. If A wins, this ticket is dead.

A part-wheel, sometimes just called a wheel, can put the key in either slot: A over three others, and those three over A. That is 6 combinations, which is the same count as boxing A with those three. Once the key is allowed both jobs and the others fill both jobs, you have rebuilt the box. The saving appears only when you refuse some orders.

| Key shape | Horses besides the key | Combinations | Cost at $1 |
| --- | --- | --- | --- |
| Key on top only | 3 underneath | 3 | $3 |
| Key on top only | 4 underneath | 4 | $4 |
| Key on top and underneath | 3 others, both ways | 6 | $6 |
| Full box of the same four | key plus 3 | 12 | $12 |

Say the refused orders out loud. "I do not want the 6 to win" is a key with the 6 only underneath. "I will take any order among these four" is a box, and the box table above is the bill. The key table is the bill only when you can point at the row you meant. [How to bet on horse racing](/guides/how-to-bet-on-horse-racing) puts that sentence at the window so the clerk punches what you refused.`,
    },
    {
      id: "payout",
      title: "How the exacta payout is calculated",
      body: `The exacta payoff is pari-mutuel. Every exacta dollar on that race goes into the exacta pool. Takeout is removed. The net pool is divided by the dollars that landed on the winning ordered pair. Breakage rounds the result down under the track's rule. The number posted is usually for a $1 or $2 base. A $1 ticket on a payoff quoted for $2 is worth half the posted number.

Only the winning combination is paid. The other combinations in your box are losing bets that you already paid for. If you spent $12 on a four-horse $1 box and the winning pair pays $31 for $1, you receive $31, not $31 times the number of horses you used. Profit is $19. If two combinations could somehow both be winners, you would be in a dead-heat rule, and the chart will show a split. Ordinary races have one ordered pair.

A scratch collapses combinations that needed the scratched horse. The track's exacta scratch rule says whether those combinations are refunded or replaced. Read it when a short-priced horse is on your ticket, because a refund of one pair inside a $12 box does not refund the other eleven. The pool that remains is still minus takeout. There is no side door into a fixed price.`,
    },
    {
      id: "choose",
      title: "A checklist for straight, box or key",
      body: `Pick the structure from the opinion, then accept the cost. The reverse habit, picking a cost and then inventing an opinion that fits, is how boxes get horses you do not like.

- Write the order you believe. If it is one order, buy a straight exacta.
- If either order of two horses is fine, buy the two-horse box and stop.
- If one horse must win, key that horse on top. Count the unders as the bill.
- If you box three or more, compute n × (n − 1) × base before you confirm.
- Compare that cost with a win bet on your top horse. Sometimes the win bet was the opinion.
- You are 18+. Keep the box inside the day's loss limit.
- After a scratch, re-count live combinations. Do not assume the ticket was refunded in full.

A useful test: if the box costs more than you would bet to win on your best horse, you are paying for insurance you may not believe. Insurance is allowed. It should be a number you chose, not a number the keyboard produced. The [trifecta bet](/guides/trifecta-bet) page is the same discipline with one more finishing slot, and the bill grows faster.`,
    },
    {
      id: "mistakes",
      title: "Exacta mistakes that survive a correct top pick",
      body: `You can be right about the winner and still tear up the exacta. The usual ways: the second horse was a hope, not an opinion, so you boxed four others and the real runner-up was a fifth. The base was $2 when you were thinking in $1 units, so the box cost double. The payoff was quoted for $2 and you held a $1 ticket. The favorite you keyed ran second, which your ticket had refused.

Another leak is treating a big exacta payoff as a signal to raise the next base. The pool does not owe you a sequel. Takeout will be there in the next race at the track's published rate, which on exotics is commonly higher than on win bets. Check the program for the rate instead of borrowing one from memory.

Straight tickets teach the pool with the least arithmetic. Boxes teach multiplication. Keys teach you what you are willing to lose on purpose. Most players need all three words, and they need them before the race, not during the photo. If the opinion is only "I like the 4," that is a win bet. An exacta bet begins when you can name who finishes behind the 4, or honestly say that several horses might.`,
    },
  ],
  faqs: [
    {
      q: "How much does a four-horse exacta box cost?",
      a: "At a $1 base it costs $12, because 4 × 3 × $1 = $12. At a $2 base it costs $24. You cover 12 ordered pairs and only one of them can win a normal race.",
    },
    {
      q: "Does a boxed exacta pay more than a straight exacta?",
      a: "The winning combination pays the same per base unit. The box costs more because you also bought the losing orders. Profit is the one payoff minus the whole box.",
    },
    {
      q: "What is an exacta key?",
      a: "A key locks one horse to first or to second and pairs it with the other horses you name. Three horses under a single key on top is 3 combinations, not a 12-combination box.",
    },
    {
      q: "Is the exacta price fixed when I bet?",
      a: "No. The payoff is the exacta pool minus takeout, divided by the money on the winning order, then breakage. The probable on the screen can change until the pools close.",
    },
    {
      q: "Can I cash an exacta if my horse runs third?",
      a: "Only if your ticket's two horses still finished first and second. The third-place horse is not part of an exacta. A show bet is the ticket that uses third.",
    },
  ],
  sources: [
    { label: "Exacta", url: "https://en.wikipedia.org/wiki/Exacta" },
    { label: "Parimutuel betting", url: "https://en.wikipedia.org/wiki/Parimutuel_betting" },
    { label: "Equibase", url: "https://www.equibase.com/" },
  ],
  related: [
    "trifecta-bet",
    "how-to-bet-on-horse-racing",
    "win-place-show-betting",
    "horse-racing-odds-explained",
  ],
  updated: "2026-10-06",
};

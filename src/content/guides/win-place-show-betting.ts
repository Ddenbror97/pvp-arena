import type { Guide } from "./types";

export const guide: Guide = {
  slug: "win-place-show-betting",
  cluster: "Horse racing",
  keyword: "win place show",
  secondary: [
    "place bet horse racing",
    "show bet payout",
    "across the board bet",
    "win place show payouts",
  ],
  title: "Win Place Show Betting: Payouts and When Each Bet Wins",
  description:
    "Win, place and show bets explained with payout examples, across-the-board math and when each straight bet makes the most sense at the track.",
  h1: "Win, place and show: three pools and when each ticket cashes",
  answer:
    "Win place show is the straight-bet menu at a thoroughbred track. A win ticket cashes only if your horse finishes first. A place ticket cashes for first or second. A show ticket cashes for first, second or third. Each pool is separate. The payoff is that pool minus takeout, divided by the winning tickets, not half or a third of the win price. You must be 18+ or the local legal age.",
  facts: [
    "A $2 win bet at 5-1 pays $12 including the stake: $10 of profit and the $2 stake returned.",
    "Across the board puts the same stake on win, place and show. A $2 across-the-board costs $6.",
    "The place pool is split between the two horses that finish first and second, after takeout.",
    "The show pool is split among the three horses that finish first, second and third, after takeout.",
    "A heavy favorite can pay the minimum to place or show, often $2.10 or $2.20 on a $2 ticket.",
    "Show still loses if your horse finishes fourth. The extra chances are not a refund policy.",
  ],
  sections: [
    {
      id: "three-rules",
      title: "What win, place and show each require",
      body: `Win place show names three rules for one horse. You are not ranking the field. You are buying a finish band.

Win: the horse must finish first. Second pays nothing on a win ticket, however close the photo was.

Place: the horse must finish first or second. Both of those finishes cash the place ticket. Third does not.

Show: the horse must finish first, second or third. Fourth is a loss. A horse that "almost showed" is a losing show ticket.

The rest of the card can be ignored once you know which band you bought. Dead heats change the split: if two horses dead-heat for win, both are winners in the win pool, and the place pool has to account for a crowded top. The track's rulebook, not a guess at the window, decides the division. Ask, or read the posted rule, before you build a story around a photo.

These are straight bets. An exacta, which names two horses in order, is a different pool and a different page: [exacta bet](/guides/exacta-bet). The full path from program to window is [how to bet on horse racing](/guides/how-to-bet-on-horse-racing). Adults only, 18+ or the age where you bet. The cluster home is [Horse racing guides](/guides/topics/horse-racing).`,
    },
    {
      id: "pools",
      title: "Why the three payouts are not fractions of each other",
      body: `Each bet has its own pool. Win money never moves over to pay place tickets. Place money never tops up show. Takeout comes off the pool you actually bet, and the survivors in that pool share what is left.

In the win pool there is one survivor, unless a dead heat says otherwise: the tickets on the winner. In the place pool there are two survivors: tickets on the first-place horse and tickets on the second-place horse. The net place pool is divided so that each of those two interests gets a share, and then that share is divided by the dollars bet on that interest. A longshot that runs second, with little place money on it, can pay more to place than a favorite pays to win. A favorite with a mountain of place money can pay the legal minimum.

Show works the same way with three survivors. That is why a show price near $2.10 on a $2 ticket is ordinary for a short-priced horse, and why a 20-1 horse can still pay a healthy show figure if the public left it alone in the show pool. [Horse racing odds explained](/guides/horse-racing-odds-explained) is the win-odds conversion. Place and show odds on the board, where they are shown, are estimates of those multi-horse splits, and they move when any of the contenders takes a late bet.`,
    },
    {
      id: "worked",
      title: "Worked win price and an across-the-board ticket",
      body: `Worked example 1. The win pool closes with your horse at 5-1. A $2 win bet pays $12 including the stake. Profit is 5 × $2 = $10. The stake comes back as well, so the ticket is worth $12. A $6 win bet at the same price is worth $36, because you bought three $2 units. The 5-1 figure already reflects takeout and breakage. You do not subtract another commission from the $12.

Worked example 2. You bet $2 across the board. The cost is $2 win + $2 place + $2 show = $6. Suppose the official prices on that horse, for illustration only, print as Win $12.00, Place $5.80, Show $3.40. If the horse wins, all three tickets cash and the return is $12.00 + $5.80 + $3.40 = $21.20. Profit on the $6 outlay is $15.20. If the horse runs second, the win ticket loses and the return is $5.80 + $3.40 = $9.20, a $3.20 profit on $6. If the horse runs third, only show cashes: $3.40 back, a $2.60 loss on the $6. If the horse runs fourth, the return is $0.

| Finish | Tickets that cash | Illustrative return | Result on the $6 cost |
| --- | --- | --- | --- |
| 1st | Win, place and show | $21.20 | $15.20 profit |
| 2nd | Place and show | $9.20 | $3.20 profit |
| 3rd | Show only | $3.40 | $2.60 loss |
| 4th or worse | None | $0 | $6 loss |

Those place and show figures are a teaching sketch of three pools. They are not a formula you can apply to the next race by halving $12. The next place price depends on who runs second and how much place money sits on each of them.`,
    },
    {
      id: "when",
      title: "When each straight bet is the one you meant",
      body: `Use the band that matches the opinion you actually hold.

Win fits a horse you think hits the front of the order, at a tote price that is longer than your own chance. You are paid only for being right about first. The pool is usually the deepest, and the price is the easiest to read.

Place fits a horse you trust to hit the first two, including a horse you think is a fair second behind one standout. You give up the fat win price and you buy one extra finishing slot. You still need the place pool to be kind. A second-place finish behind a horse that the public also hammered to place can pay close to the minimum.

Show fits a horse you trust to hit the board in a messy race, or a longshot you want at a smaller return because fourth through last is a large set. Show is a poor home for a 4-5 favorite. The minimum payoff leaves almost no profit, and fourth still loses the whole stake. Saving a short-priced horse "to show, just in case" often buys a $2.20 ticket that needed a disaster to lose and pays twenty cents when it wins.

| Your opinion | Ticket that matches | Finish that still loses |
| --- | --- | --- |
| First, at a fat price | Win | 2nd or worse |
| First or second | Place | 3rd or worse |
| On the board | Show | 4th or worse |
| All three bands | Across the board | 4th or worse, and win loses if 2nd |

Match the row before you talk yourself into a cheaper-sounding pool.`,
    },
    {
      id: "minimums",
      title: "Minimum payoffs, breakage and the board",
      body: `Tracks post a minimum payoff. On a $2 ticket it is often $2.10 or $2.20, which means a dime or two of profit after the stake returns. A horse bet down to 1-5 can still pay that floor to place or show even when a pure split would have been lower. The floor is a rule, not a value bet. You risked $2 to make ten or twenty cents, and a scratch or a stumble still takes the $2.

Breakage rounds the calculated price down, commonly to the nearest ten cents per dollar. A raw $4.19 for $1 may print as $4.10, so a $2 ticket pays $8.20 rather than $8.38. The rounded number is what the cashier has. Arguing the extra pennies does not change the rule.

Read the board as three columns, not one. Win odds are the familiar 5-1 style fraction or a dollar line, depending on the track. Place and show may show a probable payout for $2 that already assumes the current top contenders. Those probables are estimates. A horse you did not expect to run second can collapse the place probable in one photo. Collect from the official prices after the race is declared official, not from the flash you saw at the top of the stretch.`,
    },
    {
      id: "checklist",
      title: "A checklist before you say win, place or show",
      body: `Say the pool name and stop. A lot of losing tickets were a place opinion punched as a win, or a show saver punched on a horse that could not pay enough to matter.

- Name one horse and one pool. Across the board is three pools, so say that on purpose.
- Cost a $2 across-the-board as $6 before you hand it over.
- Treat a 5-1 win price as a $12 return on $2, stake included, and stop there.
- Do not invent a place price by dividing the win price.
- Check the minimum. If show profit is twenty cents, decide whether that is the bet.
- You are 18+. Leave the window if the race is already off.
- Keep the day's loss limit in [responsible gambling](/responsible-gambling) terms: a number, not a mood.

Scratches refund a straight ticket on that horse. They do not refund the rest of your card. If the 4 scratches and you liked the 4 to place, you are holding cash again, not a duty to bet the 5. [Handicapping horses](/guides/handicapping-horses) is about whether the 5 is a real opinion. The pool name is still yours to choose.`,
    },
    {
      id: "limits",
      title: "What straight bets do not cover",
      body: `Win place show never pays you for naming the order of two horses. If you want first and second in that sequence, you are in the exacta pool, and you should price it as combinations rather than as a safer place bet. People slide from show into exactas because the exacta "uses the same horses." It does not use the same rule. One pays for a band. The other pays for a permutation.

Straight bets also do not remove takeout. A horse that wins 40% of the time is a bad win bet at 6-5 after the pool's cut, and a boring show bet at the minimum. The job is the price against your chance, inside the band you bought. [How to bet on horse racing](/guides/how-to-bet-on-horse-racing) keeps the session rules: unit size, combination cost, and a stop.

Coupled entries and dead heats are the edge cases worth five minutes in the program notes. So is the difference between a "probable" payout and the official one. None of that is a system. It is the contract on a straight ticket. Bet the band you mean, keep the stake inside a limit you set while you were calm, and let the other pools stay closed until you can say what they demand.`,
    },
  ],
  faqs: [
    {
      q: "Does place pay half of the win odds?",
      a: "No. Place is a separate pool split between the first two finishers after takeout. A 5-1 winner that pays $12 to win might pay near the minimum to place, or much more, depending on who runs second and how much was bet.",
    },
    {
      q: "How much does $2 across the board cost?",
      a: "It costs $6: $2 to win, $2 to place and $2 to show. You cash whichever of those bands the finish hits. Fourth or worse cashes none of them.",
    },
    {
      q: "What does a $2 win bet at 5-1 return?",
      a: "It returns $12 including the stake. Ten dollars is profit. Two dollars is your stake coming back. The board's $12 figure is the gross ticket value on a $2 win.",
    },
    {
      q: "Can a show bet lose if my horse runs third?",
      a: "Third cashes a show bet. Fourth loses it. First and second also cash show. The ticket is alive for the top three and dead after that.",
    },
    {
      q: "Why is the show payoff sometimes $2.10?",
      a: "That is the minimum many tracks pay on a $2 show ticket. A heavily bet horse can hit that floor because the show pool is split three ways and most of the money was on that horse.",
    },
  ],
  sources: [
    { label: "Parimutuel betting", url: "https://en.wikipedia.org/wiki/Parimutuel_betting" },
    {
      label: "Glossary of North American horse racing",
      url: "https://en.wikipedia.org/wiki/Glossary_of_North_American_horse_racing",
    },
    { label: "Equibase", url: "https://www.equibase.com/" },
  ],
  related: [
    "how-to-bet-on-horse-racing",
    "horse-racing-odds-explained",
    "exacta-bet",
    "handicapping-horses",
  ],
  updated: "2026-10-06",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "horse-racing-odds-explained",
  cluster: "Horse racing",
  keyword: "horse racing odds explained",
  secondary: ["morning line odds", "tote board odds", "pari-mutuel odds", "horse racing payouts"],
  title: "Horse Racing Odds Explained: Morning Line to Payout",
  description:
    "How horse racing odds work: morning line vs tote odds, converting odds to payouts, pari-mutuel pools and the track take that shapes every bet.",
  h1: "Horse racing odds explained, from the morning line to the payoff",
  answer:
    "Horse racing odds explained in one line: the morning line is a forecast, and the tote odds are a live share of a pari-mutuel pool. A $2 win bet at 5-1 pays $12 including the stake, because you get $10 of profit plus the $2 back. That price already has the takeout removed. It is not a fixed quote from a book that you lock by betting early. You must be 18+ or the local legal age.",
  facts: [
    "US win odds of A-B mean A dollars of profit for every B dollars staked, plus the stake returned.",
    "A $2 ticket at 5-1 returns $12. A $2 ticket at 5-2 returns $7. A $2 ticket at even money returns $4.",
    "Implied chance before the take is 1 / (odds + 1). At 5-1 that is 1/6, about 16.7%.",
    "Because of takeout, the implied chances of every horse in the race add up to more than 100%.",
    "Breakage rounds the calculated payoff down, often to the nearest 10 cents on the $1 price.",
    "Place and show prices come from their own pools. They are not a fraction of the win odds.",
  ],
  sections: [
    {
      id: "two-prices",
      title: "Morning line and tote odds are different objects",
      body: `Horse racing odds come in two public forms, and only one of them cashes.

The morning line is written by the track's oddsmaker and printed in the program. It is an opinion about where the public might bet, published before most of the money is in. A morning-line 4-1 horse can go off at 8-5 or at 10-1. You cannot ask the cashier to pay the program.

Tote odds are the pool talking. Each bet updates an estimate of the payoff. The estimate is imperfect in the last minute because money is still arriving and the board can lag. When the pools close, the official price replaces the estimate. That official price is what a winning ticket is worth.

[How to bet on horse racing](/guides/how-to-bet-on-horse-racing) is the sequence around these numbers: which pool, which horse, which base. This page is the number itself. Adults only, 18+ or the local legal age. If the prices are starting to feel like a rescue plan, stop and read [responsible gambling](/responsible-gambling). The guides in this cluster live at [Horse racing guides](/guides/topics/horse-racing). Virtual races with a random draw are not this tote; they are [crypto horse racing betting](/guides/crypto-horse-racing-betting).`,
    },
    {
      id: "convert",
      title: "Convert win odds into a payout that includes the stake",
      body: `North American win odds are a profit ratio. At 5-1 you profit five dollars for each dollar staked, and you also receive the stake back. On the usual $2 ticket the profit is 5 × $2 = $10, so the ticket pays $12. Say "$12 including the stake" so you do not spend the $12 and then remember the $2 was yours.

The general line for a $2 win ticket at A-1 is $2 × (A + 1). At 8-1 that is $2 × 9 = $18. At even money, 1-1, it is $2 × 2 = $4. Odds that are not to 1 need the fraction. At 5-2 the profit per dollar is 5/2 = 2.5, so a $2 ticket profits $5 and pays $7 total. At 7-2 a $2 ticket pays $9.

| Odds | Profit on $2 | $2 ticket pays, stake included |
| --- | --- | --- |
| 1-1 | $2 | $4 |
| 5-2 | $5 | $7 |
| 3-1 | $6 | $8 |
| 7-2 | $7 | $9 |
| 4-1 | $8 | $10 |
| 5-1 | $10 | $12 |
| 10-1 | $20 | $22 |

Worked example 1. Your horse closes at 5-1 and you hold a $10 win bet. A $10 bet is five $2 units. The ticket pays 5 × $12 = $60, which is $50 of profit plus the $10 stake. Worked example 2 is the pool version in the next section. Both can be true of the same race: the fraction is how the pool's result gets printed.

Read the official price, not the morning-line guess, when you check what the cashier will pay. If the tote flashes 6-1 in the last minute and the official price comes back 9-2, the 9-2 is the contract. Late money writes that number. The program is a forecast the pool is allowed to ignore.`,
    },
    {
      id: "pool",
      title: "The payoff is the pool minus takeout",
      body: `Picture a win pool of $100,000. Use 18% as a round teaching takeout, not as your track's rate. The take removes $18,000 and leaves $82,000 for the winning tickets. Suppose $16,400 of the pool was bet on the winner. Each dollar of those winning bets claims 82,000 / 16,400 = $5. A $2 ticket therefore pays $10, which prints as 4-1: $8 profit plus the $2 stake.

Change one input and the odds change. If $20,500 had been bet on the winner, the dollar return would be 82,000 / 20,500 = $4, and a $2 ticket would pay $8, which is 3-1. The horses did not change. The crowd did. That is the sense in which tote odds are explained by division, not by a bookmaker shading a line in a back office.

Your track prints the real takeout, and it often differs by pool. Win, place and show commonly sit in the mid-teens. Exactas, trifectas and superfectas commonly sit higher. Breakage then shaves the raw division down to a tick the cashier can pay, often the nearest dime on a $1 price. A raw $4.19 may pay $4.10. The missing nine cents is part of the cost of the bet. It is not a mistake on your ticket.`,
    },
    {
      id: "implied",
      title: "Implied probability and the overround from the take",
      body: `You can turn a price into a chance, and you should, so a 5-1 quote does not feel like a personality. At A-1 the quick implied chance, before you think about the take, is 1 / (A + 1). At 5-1 that is 1/6, about 16.7%. At 1-1 it is 1/2. At 5-2 it is 1 / (2.5 + 1) = 1/3.5, about 28.6%. [Implied probability](/guides/implied-probability) is the longer form of this step. [Odds converter](/guides/odds-converter) moves the same price among fractional, decimal and American formats if you are comparing a tote with a sportsbook.

Add those implied chances for every horse in a real race and you will clear 100%. The surplus is the overround. It is how takeout and breakage show up in the odds. A horse whose tote price implies 20% is not a gift if your own figure says 20% and the overround is sitting on top. You need the price to be longer than your chance by enough to cover the cut.

| Win odds | Quick implied chance | What that chance is not |
| --- | --- | --- |
| 1-1 | 1/2, about 50% | A promise the horse wins half the time |
| 5-2 | 1/3.5, about 28.6% | The place chance |
| 4-1 | 1/5, about 20% | A price with the take removed from the sum |
| 5-1 | 1/6, about 16.7% | The morning line, unless the tote says so |
| 10-1 | 1/11, about 9.1% | A show price in disguise |

This is also why shopping the morning line against the tote is the whole game for a handicapper. [Handicapping horses](/guides/handicapping-horses) produces a chance. The tote produces a price. A bet exists in the gap, when there is one. No gap, no bet. The takeout does not pause because you did the homework.`,
    },
    {
      id: "place-show",
      title: "Win odds do not set the place and show prices",
      body: `The board's win fraction is the win pool only. Place and show are separate pools with more than one winning horse. The net place pool is shared by the first two finishers. The net show pool is shared by the first three. A 5-1 winner that pays $12 to win might pay $3.40 to show or $8.00 to show. Both can happen. Halving $12 is not a method.

A quick dollar check keeps the columns apart. A $2 win at 5-1 returns $12. A place probable of $4.80 on that same horse is not "half of 5-1." It is the place pool's current guess about a two-horse split. If the probable disappears because the board only shows win odds, you still do not invent the missing number.

[Win place show betting](/guides/win-place-show-betting) walks those splits. The practical reading skill is to look at three columns and believe all three. Probable place and show payoffs, where the track displays them, are estimates that assume which horses finish in the money. A surprise second choice changes the probable in one jump.

Exotic probables are a further pool. An exacta probable assumes an ordered pair. It can look generous because the pair is unpopular, which is the same mechanism as a long win price, with a higher takeout underneath. Do not convert an exacta probable into a win-odds story. They are neighbors on the screen and strangers in the ledger.`,
    },
    {
      id: "checklist",
      title: "A checklist for reading a price before you bet it",
      body: `Read the price as dollars, as a chance, and as a pool. Then decide.

- Find the win odds and compute the $2 ticket: at 5-1 it is $12 including the stake.
- If the odds are 5-2 or 7-2, use the fraction. Do not round them to 2-1 or 3-1 in your head.
- Turn the price into a chance with 1 / (profit-per-dollar + 1).
- Remember the field's chances sum to more than 100% because of takeout.
- Check place and show as their own columns. Do not divide the win price.
- Check whether the payoff you are staring at is for $1, $2 or your dime ticket.
- You are 18+. The morning line is not a contract you can cash.

Late money is normal. A horse that shortens from 6-1 to 3-1 in two minutes has new information or a lot of enthusiasm. You do not have to follow it. You do have to throw away the morning-line 6-1 if you are about to be paid 3-1. Recalculate. The pool will not honour the number you preferred.`,
    },
    {
      id: "breakage-live",
      title: "What changes between the flash and the official price",
      body: `The last tote flash is a forecast of a division that is not finished. Bets are still being accepted. The board may be a cycle behind. After the off, the association calculates the pools, applies takeout, divides by the winning dollars and breaks the result. Inquiries and photo finishes delay the word "official." They can also change which tickets are winning, which changes nothing about the formula and everything about who is in the numerator's company.

Coupled entries, if the race still uses them, combine two horses into one betting interest and one price. A scratch refunds straight bets on that horse and rebuilds exotics under a posted rule. The odds of the remaining horses lengthen or shorten as that refunded and shifted money finds a new home. None of this is a signal that the tote "knows" the winner. It is arithmetic catching up to who is actually running.

Keep the three sentences that matter. The morning line is a guess. The tote is the crowd after the take. A $2 win at 5-1 pays $12 including the stake, and it pays that only if 5-1 is still the official number when the race is official. Everything else on the card is a variation of those sentences.`,
    },
  ],
  faqs: [
    {
      q: "What does 5-1 pay on a $2 win bet?",
      a: "It pays $12 including the stake. Profit is 5 × $2 = $10. The extra $2 is your stake returned. US tracks quote the gross return this way.",
    },
    {
      q: "Is the morning line the odds I get?",
      a: "No. The morning line is a forecast in the program. Your price is the official tote payoff after the pool closes, takeout is removed and breakage is applied.",
    },
    {
      q: "Why do the odds add up to more than 100%?",
      a: "Takeout and breakage. Each horse's price implies a chance, and those chances sum to more than one because the track removed a cut before winners were paid.",
    },
    {
      q: "Are place odds half the win odds?",
      a: "No. Place and show are separate pools split among more than one finisher. A 5-1 win price does not imply a 2-1 place price.",
    },
    {
      q: "What is breakage?",
      a: "Breakage is the rounding down of a calculated payoff, often to the nearest 10 cents per dollar. The posted price is the broken price, and it is the one the cashier pays.",
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
    "win-place-show-betting",
    "odds-converter",
    "implied-probability",
  ],
  updated: "2026-10-06",
};

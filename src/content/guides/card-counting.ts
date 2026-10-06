import type { Guide } from "./types";

export const guide: Guide = {
  slug: "card-counting",
  cluster: "Games & odds",
  keyword: "card counting",
  secondary: [
    "how to count cards",
    "hi lo count",
    "does card counting work",
    "online card counting",
  ],
  title: "Card Counting Guide: How It Works and Why Online Fails",
  description:
    "How card counting works in blackjack, why continuous shufflers and online shoes break it, and why it is not a crypto-casino strategy.",
  h1: "Card counting: the maths, the casino response and why online fails",
  answer:
    "Card counting is a way to track the remaining mix in a depleting blackjack shoe so that you raise the bet only when that mix is rich in tens and aces. In a live, deeply dealt shoe with good rules, a skilled counter can flip a small leftover house edge into a small player edge. Continuous shufflers, per-hand RNG shoes and most crypto tables destroy the information, so counting is not an online or crypto-casino strategy.",
  facts: [
    "Hi-Lo assigns +1 to 2–6, 0 to 7–9, and −1 to 10s and aces; the running count is their sum.",
    "True count is running count divided by remaining decks; each +1 true count is often worth about 0.5% of extra player EV.",
    "You still need a bet spread, deep penetration and clean rules; the count alone does not print money.",
    "Continuous shuffle machines and per-hand online shoes reset composition every round, so the count has nothing to track.",
    "Casinos may bar or limit suspected counters; keeping a count in your head is not a crime in most jurisdictions, but it is unwelcome.",
  ],
  sections: [
    {
      id: "maths",
      title: "The maths of a depleting shoe",
      body: `Blackjack cards are not independent if they are dealt from a finite shoe that is not reshuffled every hand. Tens and aces help the player (naturals pay 3:2, dealer busts more when stiff). Small cards help the dealer (they turn stiffs into standing totals).

If more small cards have already come out, the remainder is rich in tens. That remainder is a different game from the average shoe that [blackjack basic strategy](/guides/blackjack-basic-strategy) assumes. The house edge of the next hand can be a bit higher or a bit lower than the published 0.5%.

### Hi-Lo in one paragraph

Start at 0 after a shuffle. See a 2, 3, 4, 5 or 6: add 1. See a 7, 8 or 9: add 0. See a 10, face or ace: subtract 1. That running count estimates the imbalance. Divide by remaining decks to get a true count you can compare across a six-deck and an eight-deck shoe.

### Worked true-count sketch

Six decks, two decks dealt, running count +8. Remaining decks ≈ 4. True count = +2. A common rule of thumb prices that at roughly +1% relative to the base game. If the base house edge was 0.5%, this hand sits near +0.5% player EV before spreads, errors and cuts. That sliver is the entire prize. It is not a licence to bet the rent.`,
    },
    {
      id: "spread",
      title: "Why the count is useless without a spread",
      body: `If you bet the same unit on every hand, a count that is sometimes +2 and sometimes −3 averages back toward the basic-strategy edge. The extra EV is harvested by betting more when the true count is high and the table minimum when it is low or negative.

### A toy spread

| True count | Bet | Comment |
| --- | --- | --- |
| ≤ 0 | 1 unit | You are still paying the house; stay small |
| +1 | 2 units | Barely worth a bump |
| +2 | 4 units | Where a modest edge may appear |
| +3 | 6–8 units | Variance jumps with the stake |
| +4+ | 8–12 units | Heat and ruin risk rise together |

The average bet is much larger than one unit, so a 0.5% player edge on the high counts has to overcome all the minimum-bet hands you still lost. Professional write-ups talk about hundreds of hours and large bankrolls for a thin hourly rate. This is the opposite of a crypto-slots mindset.

### Errors eat the sliver

A missed rank, a wrong remaining-deck estimate, or a play deviation you do not actually know can give the half-percent back. Counting is a job with a small mean and a large variance, not a trick.`,
    },
    {
      id: "casino",
      title: "How live casinos answered",
      body: `Casinos know the maths. They did not need to outlaw mental arithmetic. They changed the product.

- **More decks.** Eight-deck shoes dilute the count.
- **Shallower penetration.** If the cut card arrives after two decks of six, you rarely see high true counts.
- **Continuous shuffle machines.** Cards go back in; there is no remainder.
- **6:5 blackjack.** The extra ~1.4% house edge drowns a Hi-Lo sliver. See [crypto blackjack](/guides/crypto-blackjack) for the same felt in an app.
- **Bet-spread heat.** Sudden jumps from $15 to $150 are a signal. Pit staff may flatten your max or ask you to leave.

Keeping a count in your head is legal in many places. Using a device is often not. Being asked to stop playing is part of the business. None of this is a how-to for bypassing a casino. It is why the online version is a fantasy.`,
    },
    {
      id: "online",
      title: "Why online and crypto counting fails",
      body: `Instant tables draw from an RNG or a hashed list that is commonly rebuilt every hand. There is no depleting remainder. The true count returns to zero, every time, before you can raise a bet.

### Continuous shuffle, software edition

If each card is independent, or the shoe is reshuffled after every round, Hi-Lo is a ritual. You can still tap +1 and −1 for fun. You cannot get a pricing edge. This is the same independence lesson as the [gambler's fallacy](/guides/gamblers-fallacy): the next card does not owe you a ten because the last five were small, unless those small cards actually left a physical shoe.

### Hashed shoes that look promising

A provably fair shoe you can rebuild after the fact is an audit, not a forecast. If the next hand uses a new seed, yesterday’s count is trivia. [RNG versus provably fair](/guides/rng-vs-provably-fair) is about verifying a result, not about obtaining composition data you can bet into.

### Live-dealer streams

Some streams use a real shoe. Then you still face cameras, delay, tight penetration, table limits and terms that forbid advantage play. Treat any “count this stream from home” pitch as a product that has already been priced against you.

Card counting is not a crypto-casino strategy. If a lobby suggests otherwise, the table is almost certainly uncountable, or the edge is already gone in the rules.`,
    },
    {
      id: "responsible",
      title: "Do not turn a thin live edge into a belief system",
      body: `Even in the rare live conditions where Hi-Lo can show a small positive expectation, most people who “try counting” lose. They under-capitalise, they err, they get barred at the moment the shoe is good, or they invent a count on an app that has no shoe.

Do not raise stakes because a YouTube video called counting a skill game. Do not use it as a reason to sit longer. If you play blackjack at all, keep a hard budget and a hard stop.

If the chase is already bigger than the maths, open [responsible gambling](/responsible-gambling) and [how to stop gambling](/guides/how-to-stop-gambling). A running count is not a coping tool.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena has no shoe to count",
      body: `There is no blackjack table here. The live games are Jackpot, Coinflip and Roulette. Their odds do not depend on cards left in a tray.

- [Jackpot](/) — probability is stake / pot, every round.
- [Coinflip](/coinflip) — a 50/50 bit, no memory.
- [Roulette](/roulette) — 33 slots, with a higher edge on Green than on Purple or Silver.
- [Fairness](/fairness) — verify the seed, not a count.

The [games and odds topic](/guides/topics/games-and-odds) is the right cluster for those prices. Use this guide only to understand why a live shoe can, in narrow conditions, move EV — and why your phone lobby is not that shoe.

If a friend wants to “try counting tonight” on an app, ask three questions: When is the shoe rebuilt? How many decks? What does blackjack pay? If the answers are “every hand”, “eight or infinite”, and “6:5”, there is no project. Buy them this explanation instead of a bankroll. The kindness is the maths, not a pep talk about skill. A practice app that reshuffles every hand can still teach you to assign Hi-Lo tags quickly. That is typing practice. It is not shoe practice. Do not confuse fluency with an edge.`,
    },
    {
      id: "worked-shoe",
      title: "A worked six-deck shoe, then an online reset",
      body: `Walk a live shoe far enough to see why the same arithmetic dies on a phone.

### Live, after two decks

Six decks, 312 cards. Two decks have been dealt (104 cards). Suppose the running count is +10 because extra small cards came out. Remaining decks ≈ 4.0. True count = +2.5. A Hi-Lo betting ramp might now put out 4–6 units instead of 1. A few play deviations may flip (for example, standing a 16 versus 10 at a high true count). The extra EV on this hand is on the order of a percent. You still lose plenty of these hands. The edge is a drift, not a stamp.

### Same running count, online

The site reshuffles after every hand, or draws each card from a fresh infinite deck. The “running count” you kept from the previous hand refers to cards that have been put back. True count is undefined because remaining decks did not shrink. Raising the next bet is superstition. A hash reveal that lists the last hand’s cards is a receipt for that hand. It does not change the next hand’s composition.

### Why streamers still sell it

Counting looks like work, and work feels like it should be paid. On an uncountable product the work is unpaid. If you want a game whose probability is on the screen without a tray of cards, use a pot or a colour wheel. If you want to practise Hi-Lo, you need a live shoe with penetration, not a crypto lobby.

The honest end state: learn the maths so you are not fooled by an app that borrowed the vocabulary. Do not deposit into that app because you can tap +1 on a 5.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Card counting tracks a depleting blackjack shoe so that bets rise when tens and aces remain. Hi-Lo plus a true count plus a spread can, on a live deep shoe with 3:2 rules, create a small player edge. Casinos answered with more decks, shallow cuts, shufflers and 6:5 paytables. Online and crypto tables usually shuffle every hand or draw RNG cards, which leaves nothing to count.

A hashed deal can prove which card was next. It cannot manufacture a remainder. PVPspinArena does not offer blackjack, and none of its live games has a countable memory. Do not import a live-shoe technique into a product that reset the deck before you clicked.

Other counts exist — Knock-Out, Omega II, hi-opt — with different tag sets and extra side counts for aces. They change how fast you estimate the remainder. They do not resurrect a remainder that the software threw back into the shoe. If a course spends more time on tag variants than on shuffle rules, it is teaching you to decorate an uncountable product. Ask “when is the shoe rebuilt?” before you ask “should I use an imbalance count?”.

Whether a count is a crime, and what casinos can legally do about it, is [is card counting illegal](/guides/is-card-counting-illegal).

The modern count starts with [Edward Thorp](/guides/edward-thorp).

Team play at casino scale is the [MIT blackjack team](/guides/mit-blackjack-team).

See also [hole carding](/guides/hole-carding).`,
    },
  ],
  faqs: [
    {
      q: "Does card counting work?",
      a: "It can create a small player edge in a live, deeply dealt shoe with strong rules and a real bet spread. It does not work on continuous shufflers or typical online and crypto tables.",
    },
    {
      q: "What is the Hi-Lo count?",
      a: "Low cards 2–6 count +1, 7–9 count 0, and tens and aces count −1. Divide the running total by remaining decks to get a true count used for betting and a few play deviations.",
    },
    {
      q: "Can I count cards on a crypto casino?",
      a: "Almost never. Per-hand shuffles and RNG draws destroy the remainder. A hash you verify after the hand is an audit of the past, not a count of the future.",
    },
    {
      q: "Is card counting illegal?",
      a: "Using your brain at a live table is legal in many places. Casinos may still bar or limit you. Hidden devices are a different, often illegal, matter. This guide is not advice to break house rules.",
    },
    {
      q: "Is counting the same as basic strategy?",
      a: "No. Basic strategy is the best average play. Counting tracks how this shoe differs from average and changes bets, and sometimes plays, when it does.",
    },
    {
      q: "Does PVPspinArena have a countable blackjack game?",
      a: "No. PVPspinArena does not offer blackjack. Jackpot, Coinflip and Roulette have no depleting shoe.",
    },
  ],
  sources: [
    { label: "Wikipedia: Card counting", url: "https://en.wikipedia.org/wiki/Card_counting" },
    {
      label: "Wizard of Odds: card counting",
      url: "https://wizardofodds.com/games/blackjack/card-counting/",
    },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
  ],
  related: [
    "crypto-jackpot",
    "gamblers-fallacy",
    "martingale-strategy",
    "martingale-calculator",
    "paroli-system",
    "is-card-counting-illegal",
    "edward-thorp",
    "mit-blackjack-team",
    "hole-carding",
  ],
  updated: "2026-09-26",
};

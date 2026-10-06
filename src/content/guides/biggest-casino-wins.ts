import type { Guide } from "./types";

export const guide: Guide = {
  slug: "biggest-casino-wins",
  cluster: "Casino knowledge",
  keyword: "biggest casino wins",
  secondary: [
    "largest slot jackpot",
    "biggest jackpot ever won",
    "megabucks record",
    "record casino win",
  ],
  title: "Biggest Casino Wins: Record Jackpots and What They Hide",
  description:
    "Biggest casino wins on record: the 2003 Megabucks jackpot, other documented slot and table wins, the odds behind them, and the survivorship bias they create.",
  h1: "Biggest casino wins: documented records and the survivorship lesson",
  answer:
    "The biggest casino wins on record are dominated by progressive slot jackpots. The most cited is the $39.7 million Megabucks jackpot won at the Excalibur in Las Vegas in March 2003 by an anonymous 25-year-old. Table-game records are smaller and rarer. Every one of these wins was paid for by millions of losing spins, which is why record lists teach more about survivorship bias than about strategy.",
  facts: [
    "The March 2003 Megabucks jackpot at the Excalibur paid $39,713,982.25 and is widely reported as the largest slot jackpot on record.",
    "Megabucks is a wide-area progressive: many linked machines across Nevada feed one jackpot.",
    "Analyses of Megabucks put the top-award odds on a max-coin spin at roughly 1 in 50 million.",
    "Ashley Revell bet $135,300 on red at the Plaza in Las Vegas in 2004, won and walked away with $270,600.",
    "Record lists show only winners; the losing players who funded each jackpot are invisible.",
  ],
  sections: [
    {
      id: "megabucks",
      title: "The Megabucks records: the biggest slot jackpots",
      body: `Megabucks is a **wide-area progressive** slot network made by IGT. Hundreds of linked machines in many Nevada casinos each add a small slice of every bet to one shared jackpot. Because the pool is fed by so much play, the top prize resets to a multimillion-dollar base and grows until someone hits it. That design produced the largest documented casino wins.

| Year | Venue | Amount | Notes |
| --- | --- | --- | --- |
| 2003 | Excalibur, Las Vegas | $39,713,982.25 | Anonymous 25-year-old software engineer from Los Angeles |
| 2000 | Desert Inn, Las Vegas | about $34.9 million | Won by Cynthia Jay-Brennan |
| 2005 | Cannery, Las Vegas | about $21 million | Elmer Sherwin's second Megabucks win |
| 1989 | The Mirage, Las Vegas | about $4.6 million | Elmer Sherwin's first Megabucks win |

### The 2003 Excalibur jackpot

On 21 March 2003 a player at the Excalibur hit a Megabucks jackpot of $39,713,982.25. The winner was reported to be a 25-year-old software engineer from Los Angeles who chose to stay anonymous. It is widely cited as the largest slot machine jackpot on record, and more than two decades later it is still the figure most record lists put at the top.

### Elmer Sherwin's two jackpots

Elmer Sherwin, a World War II veteran, reportedly won about $4.6 million on Megabucks at the Mirage in 1989, shortly after it opened, and then about $21 million on Megabucks at the Cannery in 2005, when he was in his nineties. He reportedly gave a large share of the second win to charity. Two top prizes on a game with odds this long is extraordinary; it is also exactly the kind of story a network of millions of spins will eventually produce for someone.

### A win followed by tragedy

Cynthia Jay-Brennan, a cocktail waitress, won about $34.9 million at the Desert Inn in January 2000. Weeks later she was in a car crash caused by a drunk driver; her sister was killed and she was left paralysed. Her story is often retold as a reminder that a jackpot changes finances, not fate.

This page sits in the [Casino knowledge topic](/guides/topics/casino-knowledge).`,
    },
    {
      id: "odds",
      title: "The odds behind a record jackpot",
      body: `Megabucks does not publish its reel strips, but independent analyses of the game have estimated the chance of hitting the top award on a max-coin spin at roughly **1 in 50 million**. Treat that as an order of magnitude rather than an exact figure.

### What 1 in 50 million means in practice

Suppose a player spins 600 times an hour, which is fast but possible on a slot machine. At that pace:

- 50,000,000 ÷ 600 ≈ 83,000 hours of play for one expected hit.
- At 8 hours a day, every day, that is roughly 28 years.
- The probability of hitting at least once in a year of that play is about 1 − e^(−(600 × 8 × 365) / 50,000,000) ≈ 1 − e^(−0.035) ≈ **3.4%**.

So even an extreme full-time player would, on these assumptions, have about a 1-in-30 chance of hitting in a year. Most players spin a tiny fraction of that.

### How much of each bet goes to the top prize

The top prize's contribution to the return is prize ÷ odds per spin. With purely illustrative round numbers, a $20 million jackpot at 1 in 50 million on a $3 spin contributes $20,000,000 ÷ 50,000,000 = **$0.40 per spin**, or about 13% of the stake. That portion is paid back only to the one person who hits; everyone else receives the lower base return from smaller prizes. That is why progressive slots often feel stingier than ordinary slots in normal play. The mechanics are covered in [progressive jackpot odds](/guides/progressive-jackpot-odds) and [slot machine odds](/guides/slot-machine-odds).

### Why jackpots grow so large

A wide-area network pools bets from many casinos, so the jackpot climbs quickly between hits. A long gap between hits makes the prize bigger and the headlines louder, but it does not make the next spin more likely to win. Each spin has the same odds; the [gambler's fallacy](/guides/gamblers-fallacy) guide explains why "due" jackpots are a myth.`,
    },
    {
      id: "tables",
      title: "Record wins at table games",
      body: `Table games cannot produce slot-sized jackpots, because each bet pays at fixed odds from the table's bankroll. The famous table wins are about the size of the bet, not the multiplier.

### Ashley Revell's double or nothing

In April 2004 a Londoner named Ashley Revell sold almost everything he owned, raised $135,300 and bet it all on one spin of roulette at the Plaza Hotel in Las Vegas, in a stunt filmed for television. He chose red. The ball landed on red 7, and he walked away with $270,600. On a double-zero wheel, red wins 18 times out of 38, about **47.4%**, so he took a slightly worse-than-even chance with everything he had. It worked. The same bet loses more often than it wins.

### High-roller runs

Some of the largest documented table-game wins come from high rollers who negotiated special terms:

- **Don Johnson** reportedly won about $15 million playing blackjack at three Atlantic City casinos in 2011, helped by negotiated rules and loss rebates. The details are in [Don Johnson blackjack](/guides/don-johnson-blackjack).
- **Kerry Packer**, the Australian media owner, is the subject of many high-stakes stories, some well documented and others anecdotal; see [Kerry Packer](/guides/kerry-packer).
- **Phil Ivey's** baccarat wins at Crockfords in London and the Borgata in Atlantic City ended in court cases over edge sorting; see [Phil Ivey](/guides/phil-ivey).

### Runs that ended badly

The most famous table-game winning streak, Archie Karas's run in Las Vegas in the early 1990s, reportedly turned about $50 into tens of millions of dollars and was then lost almost entirely. It is covered in [Archie Karas](/guides/archie-karas), and it is a better lesson in risk of ruin than any record list.`,
    },
    {
      id: "online",
      title: "Online jackpots and lotteries",
      body: `Online progressive slots link players across many sites, so their jackpots can also reach eight figures.

### Mega Moolah and the online records

Microgaming's Mega Moolah progressive network has paid several record online jackpots. In October 2015 Jon Heywood, a British soldier, reportedly won about £13.2 million on it, which was recognised at the time as the largest online slot jackpot. Later Mega Moolah wins have been reported larger still. Because online jackpots are announced by operators and game studios, check the provider's own announcement before trusting a figure you see on a list.

### Lotteries are a different category

Lottery jackpots dwarf casino wins; a single Powerball ticket sold in California won a $2.04 billion jackpot in November 2022, the largest in lottery history at the time. But lotteries are not casinos. Their jackpots are funded by tens of millions of tickets per draw, and headline figures are usually the total of annual payments, with the cash option substantially lower. Comparing a lottery jackpot with a slot jackpot mixes two different products.

### Taxes and payment

Large wins trigger tax paperwork in many countries, and in the US casinos issue a tax form for slot wins above a threshold. Big progressive jackpots have often been offered as annual instalments or a smaller lump sum. How winnings are reported is covered in [report gambling winnings](/guides/report-gambling-winnings); local rules vary by country.

### Why anonymity is common

Many record winners, including the 2003 Excalibur winner, stay anonymous where the law allows. Sudden public wealth attracts requests, scams and pressure from strangers, and winners are often advised by lawyers to keep a low profile.`,
    },
    {
      id: "bias",
      title: "The survivorship bias in record lists",
      body: `A list of the biggest casino wins is a list of survivors. It shows the handful of people who hit and hides the millions of players who funded the prize.

### The classic example

During World War II, statistician Abraham Wald worked on where to add armour to bombers. The commonly told version is that engineers wanted to reinforce the areas where returning planes showed bullet holes. Wald pointed out that those planes survived; the planes hit in other areas, such as the engines, did not come back. The damage you can see is the damage that did not matter. Winning stories work the same way: you hear from the winners because the losers do not have a story.

### Applying it to jackpots

For every Megabucks winner there were tens of millions of spins that paid nothing toward the top prize. If a network pays one $20 million jackpot funded by, say, 60 million spins, the average spin contributed about $0.33 and received $0.33 back only in expectation. One person received $20 million; everyone else received nothing from the jackpot pool.

### What record lists do to decisions

- **They inflate perceived odds.** Seeing many winners in headlines makes a jackpot feel reachable.
- **They suggest methods.** Stories mention the machine, the time or the "feeling". None of those change the odds.
- **They hide cost.** No list shows how much the winner lost before the win.

The [law of large numbers](/guides/law-of-large-numbers-gambling) is the other half of the story: across all players, results converge on the house edge, and the record winner is a small, loud exception.`,
    },
    {
      id: "pvp",
      title: "Big wins on PVPspinArena and how to think about them",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network. Its largest single-round wins come from [Jackpot](/), where players add wagers to one pot and the winner takes the pot minus any fee shown before entry.

### Why Jackpot odds are easy to read

Your chance of winning a Jackpot round equals your share of the pot. If the pot is $1,000 and you put in $50, your chance is 50 ÷ 1,000 = **5%**. A small entry into a large pot is a long shot that pays a lot; a large share of a small pot is close to a coin flip that pays little. Nothing is hidden in a reel strip, and there is no network pooling spins from millions of strangers.

### Checking the result

Each round draws from committed seeds, and anyone can verify a settled round on the [fairness](/fairness) page. On Roulette the numbers are equally plain: Green pays 14x and comes up 1 time in 33. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee.

### Keep the survivorship lesson

A big Jackpot win is real, and so are the many small entries that did not win. Set a budget before playing, not after a big win or a loss. Play is 18+, and limit tools and support links are on the [responsible gambling](/responsible-gambling) page.

In the same cluster, see also [is gambling a sin](/guides/is-gambling-a-sin), [gambling in islam](/guides/gambling-in-islam), and [casino royale poker](/guides/casino-royale-poker).`,
    },
  ],
  faqs: [
    {
      q: "What is the biggest casino win ever?",
      a: "The most cited is the $39,713,982.25 Megabucks slot jackpot won at the Excalibur in Las Vegas in March 2003. It is widely reported as the largest slot jackpot on record.",
    },
    {
      q: "What are the odds of hitting Megabucks?",
      a: "IGT does not publish them, but independent analyses estimate roughly 1 in 50 million for the top award on a max-coin spin. Treat that as an approximate figure.",
    },
    {
      q: "What is the biggest roulette win?",
      a: "One of the best documented is Ashley Revell's 2004 bet of $135,300 on red at the Plaza in Las Vegas. He won and left with $270,600.",
    },
    {
      q: "Do casinos pay out huge jackpots?",
      a: "Regulated casinos pay verified jackpots, often after an inspection of the machine. Large progressives have often been offered as instalments or a smaller lump sum, and tax paperwork applies in many countries.",
    },
    {
      q: "Why do big casino wins make gambling seem easier than it is?",
      a: "Because of survivorship bias. You hear about the few winners and not the millions of losing bets that paid for their prizes.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Excalibur Hotel and Casino",
      url: "https://en.wikipedia.org/wiki/Excalibur_Hotel_and_Casino",
    },
    {
      label: "Wikipedia: Survivorship bias",
      url: "https://en.wikipedia.org/wiki/Survivorship_bias",
    },
    {
      label: "Encyclopaedia Britannica: gambling",
      url: "https://www.britannica.com/topic/gambling",
    },
  ],
  related: [
    "archie-karas",
    "don-johnson-blackjack",
    "progressive-jackpot-odds",
    "casino-royale-poker",
    "law-of-large-numbers-gambling",
    "is-gambling-a-sin",
    "gambling-in-islam",
  ],
  updated: "2026-09-27",
};

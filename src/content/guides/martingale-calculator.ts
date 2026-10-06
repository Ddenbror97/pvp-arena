import type { Guide } from "./types";

export const guide: Guide = {
  slug: "martingale-calculator",
  cluster: "Games & odds",
  keyword: "martingale calculator",
  secondary: [
    "martingale bet calculator",
    "doubling calculator",
    "martingale bankroll",
    "martingale roulette calculator",
  ],
  title: "Martingale Calculator: Sequence, Bankroll and Ruin",
  description:
    "A martingale calculator for stake sequences, bankroll and table-max stops, and the chance of a losing run. Strategy explainer lives on the martingale guide.",
  h1: "Martingale calculator: doubling sequence, bankroll and stop points",
  answer:
    "A martingale calculator turns a starting stake, a bankroll, a table or site maximum, and a win chance into the doubling sequence you can actually place. It lists each next bet, cash at risk after n losses, and the chance of that losing run. It does not invent an edge. For why the system fails, use the martingale strategy guide; this page stays on the numbers.",
  facts: [
    "The next martingale stake is twice the last losing stake; cash at risk after n losses is starting stake × (2^n − 1).",
    "The sequence stops when the next double exceeds your remaining bankroll or the table / site max.",
    "P(n losses) = (1 − p)^n, where p is the win chance you typed.",
    "Default 48.65% in the widget is European even-money; 48.48% is Purple or Silver on PVPspinArena’s 33-slot wheel.",
    "This tool sizes bets. It does not change the house edge. Why that matters is on the strategy guide.",
  ],
  sections: [
    {
      id: "calculator",
      title: "How to use the live martingale calculator",
      body: `The live tool is at the [top of this page](#calculator). Four inputs. One table. Nothing else.

### Inputs

1. **Starting stake $** — the first bet, and the size you return to after a win.
2. **Bankroll $** — the whole roll you will not top up mid-sequence.
3. **Table / site max $** — the largest single bet the game will take.
4. **Win chance %** — the chance one bet wins. European red/black is about 48.65. Purple or Silver on our wheel is 48.48. A fair coin is 50.

### What you read back

- How many consecutive losses fit before the next double is illegal or unaffordable.
- Stake and total-at-risk on each row.
- P(this many losses) on each row.

Open [#calculator](#calculator), type your four numbers, and stop reading the table as a profit plan. It is a stop map.

Adults 18+ only. If you are already doubling to chase a hole, leave the tool and use [responsible gambling](/responsible-gambling). The longer “why it fails” write-up is [martingale strategy](/guides/martingale-strategy).`,
    },
    {
      id: "sequence",
      title: "The doubling sequence the table prints",
      body: `A martingale bet calculator only needs one recurrence: after a loss, double. After a win, reset to the start.

### Worked $1 start

| Loss # | Stake $ | Total at risk $ |
| --- | --- | --- |
| 1 | 1 | 1 |
| 2 | 2 | 3 |
| 3 | 4 | 7 |
| 4 | 8 | 15 |
| 5 | 16 | 31 |
| 6 | 32 | 63 |
| 7 | 64 | 127 |
| 8 | 128 | 255 |
| 9 | 256 | 511 |
| 10 | 512 | 1023 |

Total at risk after n losses is **S × (2^n − 1)**. After 10 losses a $1 start has $1,023 on the table just to have lost that many; the next ask is $1,024.

### How the widget builds rows

It starts at your stake. Each loop adds that stake to “spent,” writes a row, doubles, and stops if the next stake would exceed remaining bankroll or the max. The last row is the last legal losing bet, not a suggestion to take it.

If you came here for a **doubling calculator** without the strategy essay, that table is the product.

### Scaling the start

A $5 start is the $1 table times five: after 8 losses you have $1,275 at risk and the next ask is $1,280. The widget does that multiply for you. People who type $1 to “see the shape” and then play $5 without re-reading remaining bankroll are using the wrong map. Re-run the four inputs at the stake you will actually click.`,
    },
    {
      id: "bankroll",
      title: "Martingale bankroll: how far a roll reaches",
      body: `**Martingale bankroll** is not “how much you hope to win.” It is how many doubles you can fund.

### The closed form

To place the bet after n losses you need the next stake,  S × 2^n , sitting unused. To have survived the n losses already you needed  S × (2^n − 1)  spent. Together that is  S × (2^{n+1} − 1)  if you want to attempt the following double as well. In the widget, remaining bankroll is checked against the next stake only: once  next > bank − spent , the row list ends.

### Worked $100 roll, $1 start, huge table max

- Losses 1–6 spend $63. Next ask $64. $37 left. Row 7 is allowed.
- After 7 losses spent is $127, but you only had $100, so the widget never prints a $64 row you cannot pay. It stops earlier: after 6 losses spent is $63, next is $64, $37 left — $64 > $37, so six rows is the map.

Type 1 / 100 / 500 in the calculator and count the rows. That count is your ruin depth for those inputs, not a lucky number.

### A $250 roll at $5

Start $5, bank $250, max $500. Spent after n losses: 5, 15, 35, 75, 155, 315. Row 6 wants $160 more (the sixth stake is $160) but 155 already spent leaves $95, so the sixth double does not fit. Depth is five printable losses, hole $155, next illegal stake $160. Write those three numbers before you sit down. They are the whole **martingale bankroll** answer for this clip.

### Do not refill the box mid-run

The math assumes a fixed roll. Adding money after five losses is a new calculator problem with a smaller remaining depth, not a continuation of the old one.`,
    },
    {
      id: "table-max",
      title: "Table max and site max stop the sequence",
      body: `Casinos and crypto tables cap a single chip. The calculator treats that cap as a hard wall.

### Which limit hits first

The sequence ends at the **earlier** of:

- next stake > remaining bankroll
- next stake > table / site max

A $500 max with a $10,000 roll still dies when the double crosses $500. A $50 roll with a $10,000 max dies on money first.

Write which wall you expect before you open the widget. If you guessed “bankroll” and the table stops on max, you were about to size a bet the cashier will reject. That rejected click is the ruin event even if the roll still shows cash.

### Worked $1 start, $500 max, large roll

Doubles: 1, 2, 4, 8, 16, 32, 64, 128, 256. The next ask is $512, which the max refuses. You get **nine** printable losses if the roll can fund $511 spent. A win on the $256 bet is the last recovery the table allows.

### Roulette labelling

A **martingale roulette calculator** is this same tool with p set to the even-money chance on that wheel. European even money ≈ 48.65%. American ≈ 47.37%. PVPspinArena Purple/Silver = 16/33 ≈ 48.48%. Green at 14x is the wrong p for this sequence; do not type 3.03% unless you really mean Green's win chance.

Payout multiples live on the [roulette odds chart](/guides/roulette-odds-chart). This page only needs p and the two money caps.`,
    },
    {
      id: "lose-n",
      title: "Probability of N losses in a row",
      body: `Each row’s last column is **(1 − p)^n**.

### Worked at 48.65% win (European even money)

Lose chance q ≈ 0.5135.

| n | P(n losses) | About 1 in |
| --- | --- | --- |
| 5 | 0.5135^5 ≈ 3.6% | 28 |
| 7 | ≈ 0.94% | 106 |
| 8 | ≈ 0.48% | 207 |
| 10 | ≈ 0.13% | 780 |

### Worked at 48.48% win (Purple / Silver here)

q = 17/33 ≈ 0.5333.

| n | P(n losses) | About 1 in |
| --- | --- | --- |
| 5 | ≈ 4.3% | 23 |
| 7 | ≈ 1.2% | 81 |
| 10 | ≈ 0.19% | 540 |

### Fair 50% (a matched 2x with no fee)

q = 0.50.

| n | P(n losses) | About 1 in |
| --- | --- | --- |
| 5 | 3.125% | 32 |
| 7 | 0.781% | 128 |
| 8 | 0.391% | 256 |
| 10 | 0.098% | 1024 |

A fair coin’s tail is thinner than Purple at the same n, but the stake column is identical. The widget only changes the last column when you change p.

These are chances for **one** sequence of n, not for a night of many resets. More sequences mean more chances to hit the tail. The widget does not simulate a night; it prices one run’s depth.

Independence: the fifth loss is not less likely because four already happened. The column is the chance of a whole prefix of n misses from a fresh start. After four losses the next miss is still q, not a smaller leftover. The table does not update p between rows.

[House edge](/guides/house-edge) is a different number (what each dollar costs on average). Do not paste edge into the win-chance box.`,
    },
    {
      id: "read-output",
      title: "How to read a finished table without fooling yourself",
      body: `After you click through the inputs, write three facts on paper. If you cannot, you are not using a calculator; you are looking for permission.

1. **Depth.** How many losses does this roll-plus-max survive?
2. **Hole.** What is total-at-risk on the last legal row?
3. **Tail.** What is P(that many losses) at your p?

Example: $2 start, $200 bank, $100 max, p = 48.48%. Doubles: 2, 4, 8, 16, 32, 64. Next is $128, blocked by the $100 max even though $126 is still in the roll after five losses… check remaining: spent after 6 is $126, next $128 > $74 left and > $100. Count the rows the widget actually prints; that pair of walls is the point.

### What not to type

- Do not put “required profit” in any box. There is no such input.
- Do not raise p because you “feel due.”
- Do not raise bankroll to a number you cannot lose this week.

Session size belongs in a [gambling budget](/guides/gambling-budget), not as a hidden extra in the max field.

You can watch a 2x colour without staking it on [Roulette](/roulette). The calculator will not place the bet for you.

If you change p mid-session because “this wheel is cold,” you are no longer using the tool. Re-run at the true pocket chance or close the tab. The sequence math does not care about your last colour.`,
    },
    {
      id: "limits",
      title: "What this page will not do",
      body: `This is a sizing tool. It will not argue the system into an edge. One sentence is enough: changing stake after a result does not change p or the payout, so it cannot remove a house edge. The full autopsy, variants and streak essays live on [martingale strategy](/guides/martingale-strategy).

It also will not:

- pick Purple versus Silver versus red
- model a refill, a “stop at +$50,” or a reverse (Paroli) run
- promise that a 0.2% tail “will not happen tonight”

If the table already looks like a chase, stop. Help and limits: [responsible gambling](/responsible-gambling). This cluster sits in [Games and odds](/guides/topics/games-and-odds). If you want a session cap in dollars rather than a doubling map, that is the budget guide. The two pages do different jobs: one sizes a dangerous sequence, the other decides whether you sit down at all.

PVPspinArena is 18+ crypto PvP on Base (USDC / ETH), not a Steam market, case site, or streamer house. The widget’s 48.48% preset is for our 33-slot wheel only. Type a different p when you are sizing someone else’s table.

A page that only rolls practice spins, and does not change the edge, is the [roulette simulator](/guides/roulette-simulator).`,
    },
  ],
  faqs: [
    {
      q: "What does a martingale calculator show?",
      a: "The doubling stakes you can still place given a start, bankroll and max, plus the chance of each losing-run length at the win chance you entered.",
    },
    {
      q: "How much bankroll do I need to survive n losses?",
      a: "Spent after n losses is start × (2^n − 1), and you still need the next double in unused cash if you want to continue. The widget stops when the next stake does not fit.",
    },
    {
      q: "What win chance should I type for roulette?",
      a: "European even money is about 48.65%. American is about 47.37%. Purple or Silver on PVPspinArena is 48.48%. Do not type house edge into that box.",
    },
    {
      q: "Why does my sequence stop before I run out of money?",
      a: "The table or site maximum blocked the next double. Remaining bankroll does not matter once the next stake is illegal.",
    },
    {
      q: "Does this calculator prove martingale works?",
      a: "No. It only maps stakes, walls and tail probabilities. Why the system fails long-term is on the martingale strategy guide.",
    },
    {
      q: "Is this for Coinflip too?",
      a: "You can type 50% for a fair 2x if you have an opponent at each size. PvP matching is not modelled here. Still use a written budget and the responsible gambling page if you are chasing.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Martingale betting system",
      url: "https://wizardofodds.com/gambling/betting-systems/martingale/",
    },
    {
      label: "Encyclopaedia Britannica: Martingale (probability)",
      url: "https://www.britannica.com/science/martingale",
    },
    {
      label: "Wikipedia: Martingale (betting system)",
      url: "https://en.wikipedia.org/wiki/Martingale_(betting_system)",
    },
  ],
  related: [
    "crypto-jackpot",
    "paroli-system",
    "dalembert-strategy",
    "fibonacci-betting-system",
    "kelly-criterion",
  ],
  updated: "2026-09-26",
  howTo: true,
  widget: "martingale",
};

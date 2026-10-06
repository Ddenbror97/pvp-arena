import type { Guide } from "./types";

export const guide: Guide = {
  slug: "rtp-calculator",
  cluster: "Games & odds",
  keyword: "rtp calculator",
  secondary: [
    "rtp to house edge",
    "house edge calculator",
    "return to player calculator",
    "slot rtp calculator",
  ],
  title: "RTP Calculator: Convert Return Into Expected Loss",
  description:
    "An RTP calculator: convert return-to-player into house edge and expected loss from bet size and number of bets. The full explainer is on RTP explained.",
  h1: "RTP calculator: turn a percentage into expected loss",
  answer:
    "An RTP calculator converts a return-to-player percentage into house edge and expected loss. Type RTP, bet size and number of bets. House edge is 100% minus RTP. Amount wagered is bet size times number of bets. Expected loss is wagered times the edge. The tool does not say you will lose that exact dollar amount tonight. For definitions, sample size and why 96% is not a win chance, use the RTP explained guide; this page stays on the arithmetic.",
  facts: [
    "House edge = 100% − RTP. A 96% RTP is a 4% edge.",
    "Amount wagered = bet size × number of bets, not the size of your deposit.",
    "Expected loss = amount wagered × (1 − RTP).",
    "PVPspinArena Purple and Silver return about 92% after the fee. Green returns about 40%.",
    "A 0% fee PvP Jackpot or Coinflip is 100% RTP between players; type 100 to see a $0 expected leak.",
  ],
  sections: [
    {
      id: "calculator",
      title: "How to use the live RTP calculator",
      body: `The live tool is at the [top of this page](#calculator). Three inputs. Three outputs. Nothing else.

### Inputs

1. **RTP %** — the published return-to-player of the bet you will actually place.
2. **Bet size $** — one stake, in the same unit as your balance.
3. **Number of bets** — how many times you will place that stake. Spins, drops, hands or colours all count as one bet each.

### What you read back

- **House edge** — 100 minus the RTP you typed.
- **Wagered** — bet size times number of bets.
- **Expected loss** — wagered times the edge.

Open [#calculator](#calculator), type the three numbers, and stop reading the loss box as a promise. It is a mean.

Adults 18+ only. If you are already chasing a hole, leave the tool and use [responsible gambling](/responsible-gambling). The longer “what RTP means” write-up is [RTP explained](/guides/rtp-explained).`,
    },
    {
      id: "identities",
      title: "The three identities the widget uses",
      body: `An **rtp calculator** only needs three school identities. It does not simulate a paytable. The same box is a house edge calculator and a return to player calculator: type RTP, read 100 minus that number. A slot rtp calculator is not a third tool — it is this identity with a slot’s published RTP in the first field.

### 1. Edge from RTP

edge = 1 − RTP  (as a decimal)

Type 96 and the widget shows 4.00%. Type 93.33 and it shows 6.67%. Type 100 and it shows 0.00%. There is no fourth number hiding between them. Marketing that quotes a high RTP and a low edge as if they were independent facts is repeating one statistic twice. [House edge](/guides/house-edge) is the keep-rate spelling of the same line.

### 2. Turnover from stake and count

wagered = stake × n

Deposit $50 and place fifty $2 bets and you have wagered $100. Fast games inflate n and therefore inflate the dollar cost of a given RTP.

### 3. Expected loss from turnover and edge

expected loss = wagered × edge

That is also −EV for a flat stake, which [expected value gambling](/guides/expected-value-gambling) writes as (RTP − 1) × stake per bet, then times n.

The widget multiplies. It does not add hit rate, volatility or a “chance you finish ahead.” Those belong on the explainer and on [slot machine odds](/guides/slot-machine-odds), not in this box.

### Algebra you can run without the widget

expected loss = stake × n × (1 − RTP/100)

expected return = stake × n × (RTP/100)

Those two add to wagered. If they do not, you swapped a percent for a decimal. Type 96, not 0.96, in this widget. Type 96.97 for Purple or Silver before the win fee, not the edge. Putting the edge in the RTP box inverts the story and prints about a 96.97% “loss,” which is nonsense.`,
    },
    {
      id: "turnover",
      title: "Deposit versus amount wagered",
      body: `The most common mis-type is putting the deposit in the bet-size box and 1 in the count box.

That prices a single bet equal to the whole roll. It does not price a session.

### Worked $50 roll

- Twenty-five $2 Purple bets: wagered $50. At 96.97% RTP before the win fee, expected loss ≈ $1.52.
- One hundred $2 Purple bets after recycling wins: wagered $200. Expected loss ≈ $6.06 before the win fee.
- Five hundred $1 slot spins at 96% RTP: wagered $500. Expected loss = $20.

The roll was $50 in every story. The leak followed turnover.

### How to pick n

Count the bets you will actually click, not the bets you hope will happen. If you do not know n, you do not have a session plan. Write n first, then type it. Raising n in the box after a win streak is a new problem, not a continuation of the old one.

PvP pots are a different n: one Jackpot entry is one bet against that pot, not a hundred recycled colours. Type 1 and the stake you put in. At a 0% fee, RTP is 100% between players and expected loss is $0 before anyone talks about fun.

Autoplay is just a large n with a short clock. If a slot page offers “100 spins” as a button, that button is the third input. Type 100. Do not type 10 because you “might stop.” The leak box should scare you before the button does. If it does not, your stake is too small to feel and n will grow in silence.`,
    },
    {
      id: "worked",
      title: "Worked outputs you can check by hand",
      body: `Use these rows to confirm the widget. If your paper disagrees, you typed a different RTP.

| RTP | Edge | Stake | n | Wagered | Expected loss |
| --- | --- | --- | --- | --- | --- |
| 96% | 4% | $1 | 100 | $100 | $4.00 |
| 96% | 4% | $2 | 250 | $500 | $20.00 |
| 99% | 1% | $1 | 200 | $200 | $2.00 |
| 93.33% | 6.67% | $5 | 40 | $200 | $13.34 |
| 97.30% | 2.70% | $10 | 20 | $200 | $5.40 |
| 100% | 0% | $20 | 1 | $20 | $0.00 |

### PVPspinArena presets

- **Purple or Silver:** type **96.97** for the wheel before the win fee, or **92.12** after it. **Green:** type **42.42** before the fee, or **40.30** after it. You can watch the slots on [Roulette](/roulette) without staking.
- **Jackpot or Coinflip at 0% fee:** type **100**, stake = your buy-in, n = 1. The leak box should read $0.00. A posted 1% fee is 99% RTP on that pot: $20 in, expected leak $0.20.

European even-money roulette is about 97.30%. American is about 94.74%. Do not type those on this site’s wheel.

### A $1 slot night

Type 96 / 1 / 400. Wagered $400. Expected loss $16. That $16 is the mean of a wide distribution. A bonus can finish the night +$80. A drought can finish it −$120. The calculator is not a forecast of which path you get.

### Same leak, three speeds

Hold RTP at 96% and the roll at $40.

| Stake | n that spends ~$40 of first-pass cash | Wagered if wins recycle to 3× | Expected leak at 3× turnover |
| --- | --- | --- | --- |
| $1 | 40 | $120 | $4.80 |
| $2 | 20 | $120 | $4.80 |
| $4 | 10 | $120 | $4.80 |

Stake size does not change the percentage. It changes how fast you reach n. Recycle is what inflates wagered above the cash you brought. If you never recycle, n is “how many bets until the roll is gone or you walk.” If you recycle, n is larger and the leak box grows. Write which world you are in before you type n.`,
    },
    {
      id: "read-output",
      title: "How to read the three boxes without fooling yourself",
      body: `After you click through the inputs, write three facts on paper. If you cannot, you are not using a calculator; you are looking for permission.

1. **Edge.** What keep-rate did you just accept?
2. **Turnover.** How many dollars will actually go through the game?
3. **Mean leak.** What is expected loss at that pair?

Example: $3 stake, 80 bets, 96% RTP. Wagered $240. Edge 4%. Mean leak $9.60. If $9.60 is more than you wanted the night to cost, shrink stake or n — not the RTP box.

### What not to type

- Do not raise RTP because you “feel due.”
- Do not put house edge in the RTP box (typing 3.03 when you meant 96.97).
- Do not put “required profit” anywhere. There is no such input.
- Do not raise n to a number you cannot sit through just to make the leak look like a rounding error per bet.

Session size belongs in a written budget. The leak box is the cost of that budget if the published RTP is true.

If you change RTP mid-session because “this machine is hot,” you are no longer using the tool. Re-run at the published figure or close the tab.

### Two people, same RTP, different leak

Alex types 96 / 1 / 50. Mean leak $2. Blair types 96 / 5 / 200. Mean leak $40. They are on the same advertised title. They are not in the same session. The calculator exists so those two numbers stay distinct. A stream that shows Blair’s bonus and Alex’s RTP badge is mixing the rows on purpose.`,
    },
    {
      id: "limits",
      title: "What this page will not do",
      body: `This is a conversion tool. It will not teach RTP from scratch. One sentence is enough: RTP is the long-run share of stakes paid back, not a 96% chance to win a session. The full definition, the hit-rate contrast and the sample-size essay live on [RTP explained](/guides/rtp-explained).

It also will not:

- pick a slot, a colour or a row count for you
- model a bonus feature, a progressive skim or a variable RTP skin
- turn a negative edge into a system
- promise that a $4 mean leak “will not be $40 tonight”

Variance around the mean is a different page. If the leak already looks like a chase, stop. Help and limits: [responsible gambling](/responsible-gambling). This cluster sits in [Games and odds](/guides/topics/games-and-odds).

PVPspinArena is 18+ crypto PvP on Base (USDC / ETH), not a slot floor. The widget’s 96% default is a common slot advertisement, not this site’s wheel. Type 96.97 for Purple or Silver before the win fee, or 42.42 for Green.`,
    },
    {
      id: "checklist",
      title: "A one-minute checklist before you sit down",
      body: `1. Read the published RTP for the exact bet, not the “up to” banner.
2. Open the [calculator](#calculator). Type that RTP, the stake you will click, and the n you can afford.
3. If expected loss is larger than the entertainment budget, change stake or n until it fits — or do not play.
4. If you cannot find a published RTP, you cannot use this tool. Skip the game.
5. If you are converting a keep-rate you already know, type 100 minus that keep-rate. Example: 2.70% European edge → 97.30 RTP.

That is the whole product: a percentage in, a dollar mean out. No overlay, no “hot” flag, no implied win chance.

If you came from a stream that flashed a 96% badge next to a $10,000 bonus, the badge is the mean of a huge sample. The bonus is one sample. This tool will not reconcile them, and it should not.

Cost per hour is just this formula with n = bets per hour. A 600-spin hour at $0.50 and 96% RTP is $300 wagered and $12 expected. That $12 is the price of the hour if the published RTP is true. If $12 is fine, play. If $12 is rent, do not open the game. The widget will not moralise. It will multiply.

Print or screenshot the three outputs before you sit down. If you cannot show someone the edge, the turnover and the mean leak, you did not use an RTP calculator. You glanced at a percentage.`,
    },
  ],
  faqs: [
    {
      q: "What does an RTP calculator show?",
      a: "House edge, total amount wagered, and expected loss from the RTP, bet size and number of bets you typed. It does not show the chance a session finishes ahead.",
    },
    {
      q: "How do I convert RTP to expected loss?",
      a: "Subtract RTP from 100% to get house edge. Multiply bet size by number of bets to get amount wagered. Expected loss is wagered times the edge.",
    },
    {
      q: "What RTP should I type for PVPspinArena Roulette?",
      a: "Type 96.97 for Purple or Silver before the win fee, or 92.12 after it. Type 42.42 for Green before the fee, or 40.30 after it. Do not type European 97.30% on this wheel.",
    },
    {
      q: "Why is expected loss bigger than my deposit?",
      a: "Because you typed more bets than one pass through the deposit. The leak follows turnover. Recycled wins increase n.",
    },
    {
      q: "Does this replace the RTP explained guide?",
      a: "No. This page is the arithmetic tool. Definitions, sample size and the 96%-is-not-a-win-chance essay live on RTP explained.",
    },
    {
      q: "What do I type for a 0% fee Coinflip?",
      a: "RTP 100, bet size equal to your side of the pot, number of bets 1. Expected loss should read $0.00 before anyone talks about matching.",
    },
  ],
  sources: [
    { label: "Wikipedia: Return to player", url: "https://en.wikipedia.org/wiki/Return_to_player" },
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
    {
      label: "UK Gambling Commission — Understanding house edge",
      url: "https://www.gamblingcommission.gov.uk/",
    },
  ],
  related: ["rtp-explained", "house-edge", "expected-value-gambling", "slot-machine-odds"],
  updated: "2026-09-26",
  howTo: true,
  widget: "rtp",
};

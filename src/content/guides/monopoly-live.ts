import type { Guide } from "./types";

export const guide: Guide = {
  slug: "monopoly-live",
  cluster: "Game shows",
  keyword: "monopoly live",
  secondary: [
    "monopoly live rtp",
    "monopoly live 2 rolls",
    "monopoly live 4 rolls",
    "monopoly live bonus",
    "monopoly live wheel",
  ],
  title: "Monopoly Live: Wheel Odds, 2 Rolls, 4 Rolls and RTP",
  description:
    "Monopoly Live explained: the 54-segment wheel, Chance cards, the 2 Rolls and 4 Rolls bonus with Mr Monopoly, dice odds, and RTP by bet spot.",
  h1: "Monopoly Live: the wheel, the 2 Rolls and 4 Rolls bonus, and RTP",
  answer:
    "Monopoly Live is Evolution's live money wheel built on the board game. A host spins a 54-segment wheel with numbers 1, 2, 5 and 10, Chance segments, and 2 Rolls and 4 Rolls bonus segments. The bonus sends Mr Monopoly around a 3D board collecting multipliers with each dice roll. Published RTPs vary by bet spot, roughly 91% to 96%.",
  facts: [
    "The wheel has 54 segments: 22 × 1, 15 × 2, 7 × 5, 4 × 10, 2 × Chance, 3 × 2 Rolls and 1 × 4 Rolls.",
    "There are six bet spots: 1, 2, 5, 10, 2 Rolls and 4 Rolls. Chance has no bet spot of its own.",
    "The bonus lands on 4 of 54 spins (about 7.4%); 4 Rolls alone is 1 in 54 (about 1.85%).",
    "Two dice give a double 1 time in 6, and a double earns an extra roll in the bonus.",
    "RTP is listed per bet spot in the help screen and differs by several percentage points between spots.",
  ],
  sections: [
    {
      id: "what",
      title: "What Monopoly Live is",
      body: `Monopoly Live is a live-dealer game show from Evolution, released in 2019 under licence from Hasbro, the owner of the Monopoly brand. It combines two parts. The first is a presenter-run money wheel, close in design to [Dream Catcher](/guides/dream-catcher-game). The second is an animated bonus round in which a 3D Mr Monopoly walks around a Monopoly board while real dice are rolled in the studio.

A round runs like this:

1. **Betting window.** You place chips on 1, 2, 5, 10, 2 Rolls or 4 Rolls.
2. **Wheel spin.** The host spins the wheel and the flapper picks a segment.
3. **Settlement.** A number pays its value to 1 (a $1 bet on 5 returns $6). A Chance segment reveals a card. A 2 Rolls or 4 Rolls segment starts the board bonus for players who bet on that spot.

Only bets on the matching bonus spot enter the bonus. A player who backed 2 Rolls watches but does not share in a 4 Rolls bonus. Monopoly Live sits with [Crazy Time](/guides/crazy-time), [Funky Time](/guides/funky-time) and [Lightning Roulette](/guides/lightning-roulette) in the [Game shows topic](/guides/topics/game-shows). Real-money play is for adults 18+ (or the local legal age) through operators licensed to carry the stream.`,
    },
    {
      id: "wheel",
      title: "Wheel segments and base odds",
      body: `| Segment | Count | Chance per spin | Pays |
| --- | --- | --- | --- |
| 1 | 22 | 40.7% | 1 to 1 |
| 2 | 15 | 27.8% | 2 to 1 |
| 5 | 7 | 13.0% | 5 to 1 |
| 10 | 4 | 7.4% | 10 to 1 |
| Chance | 2 | 3.7% | card: cash prize or multiplier |
| 2 Rolls | 3 | 5.6% | board bonus, 2 dice rolls |
| 4 Rolls | 1 | 1.9% | board bonus, 4 dice rolls |

### Base return before Chance

Multiply chance by total return to see what a number spot pays back from its own segments alone:

- 1: 22/54 × 2 ≈ 81.5%
- 2: 15/54 × 3 ≈ 83.3%
- 5: 7/54 × 6 ≈ 77.8%
- 10: 4/54 × 11 ≈ 81.5%

Those figures are well below the published RTPs. The difference comes from the Chance segments, which can award an instant prize or a multiplier that boosts the next spin. As with the Top Slot in Crazy Time, a meaningful share of the value on number bets sits in rare boosted rounds rather than in ordinary wins.

### How Chance works

When Chance lands, the host reveals a card. In the standard rules it is either an instant cash prize or a multiplier; if it is a multiplier, the wheel is spun again and the multiplier applies to that spin's winning bets. The exact prize ranges and how they relate to your stake are set out in the game's help screen, which is the version to follow for your table.`,
    },
    {
      id: "bonus",
      title: "The 2 Rolls and 4 Rolls bonus",
      body: `When 2 Rolls or 4 Rolls lands, the game switches to a 3D Monopoly board. Mr Monopoly stands on GO, and a mechanical shaker in the studio rolls two real dice. He moves forward by the total, and the square he lands on decides the prize.

### What the squares do

- **Property squares** carry multipliers. Landing on one adds that multiplier to your running total.
- **Chance and Community Chest** squares draw a card, typically a cash multiplier or a move to another square.
- **Corner squares** such as GO, Jail, Free Parking and Go to Jail have their own effects. In the current version, completing laps can upgrade properties with houses and hotels, which raises their multipliers; the help screen lists the exact upgrade values.
- **Doubles** earn an extra roll on top of the 2 or 4 you started with.

At the end, your bonus-spot stake is paid at the total multiplier collected.

### Dice maths that matters

Two dice produce 36 equally likely combinations, so the first roll from GO lands on some squares far more often than others:

| Total | Ways | Chance | Total | Ways | Chance |
| --- | --- | --- | --- | --- | --- |
| 2 | 1 | 2.8% | 8 | 5 | 13.9% |
| 3 | 2 | 5.6% | 9 | 4 | 11.1% |
| 4 | 3 | 8.3% | 10 | 3 | 8.3% |
| 5 | 4 | 11.1% | 11 | 2 | 5.6% |
| 6 | 5 | 13.9% | 12 | 1 | 2.8% |
| 7 | 6 | 16.7% | | | |

Squares 6, 7 and 8 steps from GO together catch 16 of 36 first rolls, about 44%. The board's multipliers are set with those frequencies in mind, so a square that looks generous is usually one that is hard to reach. The full dice breakdown is on [dice roll probability](/guides/dice-roll-probability).

A double comes up 6 times in 36, or 1 in 6. If every double granted one more roll with no limit, the expected number of rolls would be 2 ÷ (5/6) = 2.4 for 2 Rolls and 4 ÷ (5/6) = 4.8 for 4 Rolls. Real rules include Jail and other stops, so treat those numbers as an upper guide, not a promise.

### 2 Rolls vs 4 Rolls

2 Rolls lands three times as often (3 segments vs 1), but each bonus is shorter. 4 Rolls is rarer and carries higher average multipliers because more rolls mean more squares and more chances to lap the board. Neither is "better value" in a way that beats the edge; they are different variance profiles priced by Evolution's published RTPs.`,
    },
    {
      id: "rtp",
      title: "Monopoly Live RTP by bet spot",
      body: `Evolution publishes the RTP of every bet spot in the Monopoly Live help menu. Widely reported figures sit in a band of roughly 91% to 96%, and the gap between the best and worst spot is large enough to matter. Because the values can change between game versions and operators, read the figure for your table rather than relying on a list copied from elsewhere.

### Turning RTP into cost

| RTP | Average cost per $100 wagered | Cost of 300 spins at $1 |
| --- | --- | --- |
| 96% | $4.00 | $12 |
| 94% | $6.00 | $18 |
| 91% | $9.00 | $27 |

A five-point RTP gap more than doubles the expected cost of the same session. That is a bigger difference than any betting pattern can make.

### Spreading across spots

Covering all six spots so every spin "does something" does not dilute the edge. The return is the stake-weighted average of each spot's RTP, and the lower-RTP spots drag it down. See [RTP explained](/guides/rtp-explained) and [house edge](/guides/house-edge) for how to combine bets correctly.

### Reading the help screen before you bet

Open the game's info panel and check four things:

1. The RTP listed for each of the six spots.
2. The table's minimum and maximum stake per spot.
3. The maximum payout per round, which operators cap and which can cut a very large bonus.
4. The current Chance card and board rules, since Evolution has updated the game's presentation over time.

Two minutes spent there tells you more about your expected cost than any stats site.

### Variance on the bonus spots

A 4 Rolls bet wins nothing on 53 of every 54 spins. The chance of going 100 spins without a 4 Rolls is (53/54)^100 ≈ 15%, and 150 spins without one is about 6%. A 2 Rolls bet misses on 51 of every 54 spins; a 50-spin drought happens about (51/54)^50 ≈ 5.7% of the time. Size stakes for those gaps, and use a [gambling budget](/guides/gambling-budget) set before the session.`,
    },
    {
      id: "myths",
      title: "Myths, stats sites and signals",
      body: `Monopoly Live has an active community of stats trackers, streamers and chat groups. Most of the advice circulating is built on one misunderstanding: that recent results change the next spin.

### "4 Rolls is due"

Stats sites show how many spins have passed since the last 4 Rolls. After 120 spins, the chance on the next one is still 1/54. The average gap is 54 spins, but the wheel does not track gaps. This is the [gambler's fallacy](/guides/gamblers-fallacy) with a counter attached.

### "The host controls the spin"

Hosts spin by hand, and the wheel is large and heavy, but spin speed varies enough that the landing segment is not something a presenter can aim. Studios run under licensing conditions that include equipment and procedure checks.

### "Bet only on 2 Rolls after a Chance"

There is no link between a Chance card and the next segment. Each spin is independent of the one before, whether or not a multiplier is pending.

### "Streamers win big on 4 Rolls all the time"

Clips of 4 Rolls bonuses paying hundreds of times the stake travel well, and the thousands of spins that paid nothing do not. A streamer betting large amounts across many hours will produce highlight moments even on a negative-RTP game. What you see is a filtered sample, which is survivorship bias rather than evidence of a better bet.

### Paid signals

Groups selling "Monopoly Live signals" repackage public history. If a stranger could predict the wheel, the most profitable move would be to bet quietly, not to sell a subscription.`,
    },
    {
      id: "pvp",
      title: "The same wheel maths on a PvP table",
      body: `Monopoly Live's value is spread unevenly: small base returns, with a large share of the RTP arriving through Chance cards and rare bonuses. A plain wheel shows the maths more directly. PVPspinArena's [Roulette](/roulette) has 33 slots: 16 Purple and 16 Silver pay 2x, and 1 Green pays 14x. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. There are no hidden bonus mechanics carrying part of the return.

Every settled round comes from committed seeds that you can check on the [fairness](/fairness) page. If a session is running longer than planned, the [responsible gambling](/responsible-gambling) page has limits and support links.`,
    },
  ],
  faqs: [
    {
      q: "What are the odds of 4 Rolls in Monopoly Live?",
      a: "4 Rolls has 1 of the 54 wheel segments, so it lands about 1.85% of the time, or once every 54 spins on average. Droughts of 100 spins happen roughly 15% of the time.",
    },
    {
      q: "What is the difference between 2 Rolls and 4 Rolls?",
      a: "2 Rolls has three segments and gives two dice rolls on the bonus board. 4 Rolls has one segment and gives four rolls, so it is rarer but usually pays higher multipliers.",
    },
    {
      q: "What does Chance do in Monopoly Live?",
      a: "Chance reveals a card that is either an instant cash prize or a multiplier applied to a respin. There is no Chance bet spot; the help screen explains how prizes relate to your stake.",
    },
    {
      q: "What is the RTP of Monopoly Live?",
      a: "It depends on the bet spot. Widely reported figures range from about 91% to 96%. The in-game help screen lists the exact RTP for each spot at your table.",
    },
    {
      q: "Do doubles matter in the Monopoly Live bonus?",
      a: "Yes. Rolling a double earns an extra roll, which means more squares and more multipliers. Doubles come up 1 time in 6 with two fair dice.",
    },
    {
      q: "Is Monopoly Live rigged?",
      a: "It is a physical wheel and real dice streamed from a licensed studio. The house edge is built into the published RTP of each spot rather than hidden in the spin, and long-run results track the segment counts.",
    },
  ],
  sources: [
    { label: "Evolution: official site", url: "https://www.evolution.com/" },
    { label: "Wikipedia: Monopoly (game)", url: "https://en.wikipedia.org/wiki/Monopoly_(game)" },
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
  ],
  related: [
    "crazy-time",
    "dream-catcher-game",
    "funky-time",
    "lightning-roulette",
    "dice-roll-probability",
    "wheel-of-fortune-odds",
  ],
  updated: "2026-09-27",
};

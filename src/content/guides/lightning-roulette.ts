import type { Guide } from "./types";

export const guide: Guide = {
  slug: "lightning-roulette",
  cluster: "Game shows",
  keyword: "lightning roulette",
  secondary: [
    "lightning roulette rtp",
    "lightning roulette multipliers",
    "lightning roulette lucky numbers",
    "evolution lightning roulette",
  ],
  title: "Lightning Roulette: Multipliers, 29:1 Pay and RTP",
  description:
    "Lightning Roulette: 1 to 5 Lucky Numbers with 50x–500x multipliers, why straight-ups pay 29:1, the 97.10% and 97.30% RTP and what those figures mean for bets.",
  h1: "Lightning Roulette: Lucky Numbers, the 29:1 straight and RTP",
  answer:
    "Lightning Roulette is Evolution's live single-zero roulette with a random multiplier stage. After betting closes, one to five Lucky Numbers get multipliers from 50x to 500x, which apply only to straight-up bets. To fund them, an ordinary straight-up win pays 29:1 instead of 35:1. Evolution publishes an RTP of 97.10% for straight-ups and 97.30% for every other bet.",
  facts: [
    "Standard single-zero wheel: 37 pockets, 0 to 36.",
    "1 to 5 Lucky Numbers per round, with multipliers of 50x, 100x, 200x, 300x, 400x or 500x.",
    "Multipliers are gross: 50x returns 50 units for 1 staked, a 49:1 net win.",
    "A straight-up win on a non-Lucky number pays 29:1.",
    "RTP: 97.10% on straight-ups (2.90% edge), 97.30% on all other bets (2.70% edge).",
    "Splits, streets, corners, dozens and even-money bets pay exactly as in European roulette.",
  ],
  sections: [
    {
      id: "what",
      title: "What Lightning Roulette is",
      body: `Lightning Roulette is a live-dealer game from Evolution, launched in 2018 and now one of the best-known titles in the live [game shows](/guides/topics/game-shows) category. It pairs a physical automatic roulette wheel with a random number generator (RNG) that adds multipliers before each spin, all presented in a black-and-gold Art Deco studio.

A round runs like this:

1. Betting opens. You place any standard roulette bet on a European layout.
2. Betting closes. The presenter triggers the "lightning" sequence, and the RNG strikes one to five numbers, each with a Lucky Payout of 50x, 100x, 200x, 300x, 400x or 500x.
3. The ball is launched and lands in a pocket.
4. If that pocket is a Lucky Number and you had a straight-up bet on it, you are paid at its multiplier. Every other winning bet is paid normally.

Two points confuse new players. First, the multipliers are gross: 50x means a $1 bet returns $50 in total, which is a 49:1 profit. Second, the multipliers only touch straight-up bets. A split covering a Lucky Number still pays 17:1, and red still pays 1:1.

Standard European roulette payouts and probabilities are in the [roulette odds chart](/guides/roulette-odds-chart). This page covers what Lightning changes. Evolution's other game shows, such as [Crazy Time](/guides/crazy-time) and [Monopoly Live](/guides/monopoly-live), use the same trade of lower base pays for random multipliers, applied to money wheels instead.`,
    },
    {
      id: "payouts",
      title: "The paytable and the 29:1 trade",
      body: `| Bet | Numbers covered | Lightning Roulette pays | European roulette pays |
| --- | --- | --- | --- |
| Straight up, not Lucky | 1 | 29 to 1 | 35 to 1 |
| Straight up, Lucky Number | 1 | 49 to 1 up to 499 to 1 (50x–500x) | 35 to 1 |
| Split | 2 | 17 to 1 | 17 to 1 |
| Street | 3 | 11 to 1 | 11 to 1 |
| Corner | 4 | 8 to 1 | 8 to 1 |
| Six line | 6 | 5 to 1 | 5 to 1 |
| Dozen or column | 12 | 2 to 1 | 2 to 1 |
| Red/black, odd/even, high/low | 18 | 1 to 1 | 1 to 1 |

Everything below the first two rows is plain European roulette, so those bets carry the familiar 1/37 ≈ 2.70% edge and a 97.30% RTP.

### What 29:1 costs on its own

In European roulette a straight-up returns 36 units (35 plus the stake) on 1 of 37 spins: 36/37 ≈ 97.30%. At 29:1, a straight returns 30 units: 30/37 ≈ 81.08%. If there were no lightning, straight-ups would carry an edge near 19%.

### What the lightning adds back

Evolution states the straight-up RTP is 97.10%. So the Lucky Payouts must add 97.10% − 81.08% ≈ 16.02 percentage points. Put another way, each time your straight-up number hits, the average gross return must be 0.971 × 37 ≈ 35.93 units: 30 from the base pay and about 5.93 from the chance that your number was Lucky.

That is the entire design. Lightning takes about 6 units from every ordinary straight-up win and redistributes them, plus a little extra edge, into rare large wins. Your long-run cost on straight-ups rises from 2.70% to 2.90%.

### Hourly cost at a live pace

A typical live Lightning table deals about 40 to 50 spins an hour. Use 45 as a working figure:

| Bet | Stake | Edge | Expected cost per spin | Per hour (45 spins) |
| --- | --- | --- | --- | --- |
| Red | $10 | 2.70% | $0.27 | about $12.15 |
| Dozen | $10 | 2.70% | $0.27 | about $12.15 |
| Straight-up | $10 | 2.90% | $0.29 | about $13.05 |
| Straight-up | $2 | 2.90% | $0.058 | about $2.61 |

The lightning does not make even-money play cheaper. It only changes the shape of straight-up results. If you want a lower even-money price, a French table with la partage is the comparison, not the lightning sequence.`,
    },
    {
      id: "multipliers",
      title: "How the multipliers average out",
      body: `The RTP tells you the average value of the lightning without knowing exactly how often each multiplier appears. You can still build intuition.

### An illustrative calculation

Reviewers who track the game report about three Lucky Numbers per round on average, with 50x and 100x the most common and 500x rare. Treat that as an assumption, not an official figure. If three of 37 numbers are Lucky, the chance that your winning straight-up is one of them is about 3/37 ≈ 8.1%. For the lightning to add 5.93 units per hit:

0.081 × (M − 30) ≈ 5.93, so M ≈ 103

In other words, an average Lucky hit would be worth roughly 100x. That fits a mix dominated by 50x and 100x with occasional 200x to 500x. If the true average count of Lucky Numbers is different, M shifts accordingly, but the product is pinned by the RTP.

### How rare the big ones are

For a single straight-up bet, you need your number to be both hit (1 in 37) and Lucky. Using the same three-per-round assumption, a Lucky hit on your number is roughly 1 in 450 spins. A specific 500x on your number is rarer still. Most straight-up players will see several ordinary 29:1 wins for every multiplied one.

### Does covering more numbers help?

Covering all 37 numbers with straight-ups costs 37 units. One of them always wins, returning 30 units, or a multiplier if the winning number is Lucky. On average you get back 35.93 units, a loss of about 1.07 units per round, which is exactly the 2.90% edge on 37 units. Spreading bets changes variance, never the percentage.`,
    },
    {
      id: "variance",
      title: "Variance: the real product",
      body: `Lightning Roulette's straight-up bet is a lottery ticket attached to a roulette bet. The edge barely moves, but the shape of results changes a lot.

### Two players, same edge

- **Player A** bets $1 on red for 1,000 spins. Expected loss about $27. Results cluster: most finish somewhere between −$90 and +$35.
- **Player B** bets $1 straight-up on a favourite number for 1,000 spins. Expected loss about $29. Results scatter widely: without a multiplied hit, B is likely to be well behind, because ordinary wins pay only 29:1; one 500x hit can turn the session strongly positive.

B's median result is worse than A's even though the averages are close, because the average is lifted by rare large wins that most sessions do not include. This is the same skew explained in [variance in gambling](/guides/variance-in-gambling), and why [RTP](/guides/rtp-explained) alone does not describe what a session feels like.

### A 200-spin worked session

Player B bets $1 on 17 for 200 spins, $200 wagered. Expected hits: 200/37 ≈ 5.4. Expected loss: 200 × 2.90% ≈ $5.80.

Most of those hits, if they come, pay $29 profit. Suppose B hits five times and none is Lucky: +$145 from wins, −$195 from the other 195 spins, net −$50. That is a common-looking session. One 100x Lucky hit on 17 instead of a 29:1 pay turns that same five-hit night into +$20 (replace one +$29 with +$99). One 500x hit turns it into +$420. The edge did not change; the sample included or excluded the tail.

That is why a short Lightning session is a poor way to “test” whether the game is fair. Two hundred spins cannot distinguish 97.10% from 97.30%, and they cannot tell you the true mix of 50x and 500x strikes.

### Maximum payout caps

Operators set a maximum win per round. If a multiplied straight-up would exceed it, the payout is capped, which lowers the effective RTP for high stakes. Check the limits in the game's help screen before placing large straight-ups.

### How much of the 500x you actually see

Evolution does not publish the exact mix of 50x versus 500x strikes. You can still bound the story. One to five Lucky Numbers land each round. If the studio always struck five numbers and always paid 500x, the game would be a gift; it does not. Most Lucky hits you will remember from a night of watching are 50x and 100x. Treat 400x and 500x as the far tail, the same way Green is the far tail on a 33-slot wheel.

A $1 straight-up that hits an ordinary pocket returns $30 including stake (29:1). A $1 straight-up that hits a 50x Lucky Number returns $50. The extra $20 is the product you paid the 6-unit haircut to buy. Over a long sample that extra is supposed to come back, on average, as the 0.20 percentage-point gap between 2.90% and 2.70%. In a short sample it usually does not.`,
    },
    {
      id: "strategy",
      title: "Playing Lightning Roulette with clear eyes",
      body: `There is no way to predict which numbers will be struck or where the ball will land. Both are independent every round. Stats trackers that show "hot" Lucky Numbers describe the past; relying on them is the [gambler's fallacy](/guides/gamblers-fallacy).

What you can control:

1. **Know which bet you are making.** Outside and inside bets other than straight-ups are standard European roulette at 2.70%. If that is all you play, the lightning is decoration.
2. **Compare with French rules.** On even-money bets, a [French roulette](/guides/french-roulette) table with la partage costs about 1.35%, half the price of Lightning Roulette's 2.70%.
3. **Size straight-ups for long droughts.** Budget for many spins without a multiplied hit. A unit of 1/200 of the session bankroll or smaller is reasonable for straight-up play.
4. **Watch the pace.** A live wheel runs a fixed schedule, and a $5 straight-up every round adds up: at 2.90% it costs about $0.15 per spin in expectation.
5. **Read variant rules separately.** Evolution has released other Lightning-branded titles with different mechanics and RTPs. Do not assume the numbers on this page carry over.

### What is not Lightning Roulette

Lightning Dice, Lightning Blackjack and later “XXXtreme” or dual-play roulette titles reuse the brand and the idea of random multipliers. They do not share this paytable. A dual-play table that lets you cover two wheels, or a dice game that pays a different base, can move the edge by whole percentage points. Open the in-game help and read the RTP line for that product. If it does not say 97.10% / 97.30%, you are not playing the game this page prices.

Also ignore overlay apps that colour “hot” Lightning numbers. The RNG draw of Lucky Numbers is independent of the physical ball, and both are independent of the last round. Painting 17 gold because it was Lucky twice in an hour does not change 1/37.

The [live dealer casino](/guides/live-dealer-casino) guide covers how streamed studio games work more generally.`,
    },
    {
      id: "pvp",
      title: "Multipliers, edges and a hashed PvP wheel",
      body: `Lightning Roulette shows that a game can move value between common and rare outcomes while keeping nearly the same edge. PVPspinArena [Roulette](/roulette) does not. Its 33-slot wheel has 16 Purple and 16 Silver slots paying 2x and 1 Green paying 14x. Purple and Silver return 32/33 before the 5% win fee, about a 7.88% edge after it. Green returns 14/33 before the fee, so it costs much more per dollar and swings harder.

The difference is how the result is produced. Lightning's Lucky Numbers come from a studio RNG you cannot inspect. PVPspinArena results come from committed seeds, and any settled round can be checked on the [fairness](/fairness) page.

Gambling is 18+ (or the local legal age). If multiplier chasing is pushing stakes up, the [responsible gambling](/responsible-gambling) page has tools to set limits.`,
    },
  ],
  faqs: [
    {
      q: "What is the RTP of Lightning Roulette?",
      a: "Evolution publishes 97.10% for straight-up bets and 97.30% for all other bets. That is a 2.90% and 2.70% house edge respectively.",
    },
    {
      q: "Why does a straight-up only pay 29:1 in Lightning Roulette?",
      a: "The six units cut from every ordinary straight-up win fund the 50x to 500x Lucky Payouts. The trade raises the straight-up edge slightly, from 2.70% to 2.90%.",
    },
    {
      q: "Do Lightning multipliers apply to red, black or split bets?",
      a: "No. Multipliers apply only to straight-up bets on a Lucky Number. Splits, corners, dozens and even-money bets pay standard European roulette odds.",
    },
    {
      q: "How many Lucky Numbers are there per round?",
      a: "Between one and five, chosen by an RNG after betting closes. Each gets a multiplier of 50x, 100x, 200x, 300x, 400x or 500x.",
    },
    {
      q: "Is there a Lightning Roulette strategy that works?",
      a: "No strategy changes the edge. You can choose outside bets for lower variance or straight-ups for multiplier chances, and size your bets for the swings.",
    },
  ],
  sources: [
    {
      label: "Evolution: Lightning Roulette",
      url: "https://games.evolution.com/live-casino/live-roulette/lightning-roulette/",
    },
    { label: "Wikipedia: Roulette", url: "https://en.wikipedia.org/wiki/Roulette" },
    { label: "Wizard of Odds: roulette", url: "https://wizardofodds.com/games/roulette/" },
  ],
  related: [
    "crazy-time",
    "monopoly-live",
    "dream-catcher-game",
    "funky-time",
    "french-roulette",
    "roulette-odds-chart",
  ],
  updated: "2026-09-27",
};

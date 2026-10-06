import type { Guide } from "./types";

export const guide: Guide = {
  slug: "jetx-game",
  cluster: "Game shows",
  keyword: "jetx",
  secondary: ["jetx game", "jetx rtp", "jetx auto cashout", "jetx strategy", "smartsoft jetx"],
  title: "JetX Game: RTP, Auto Cashout and Real Crash Odds",
  description:
    "JetX by SmartSoft explained: how a round works, the 97% RTP, the real chance of reaching each multiplier, auto cashout, two-bet play and myths.",
  h1: "JetX: how the jet crash game works, its RTP and auto cashout",
  answer:
    "JetX is a crash game from SmartSoft Gaming. A jet takes off, a multiplier climbs from 1.00x, and you must cash out before the jet explodes. Cash out in time and you win stake × multiplier; miss it and the stake is lost. JetX is commonly listed at 97% RTP, so every cashout target costs about 3% of the amount staked over time.",
  facts: [
    "JetX is made by SmartSoft Gaming and is commonly listed with a 97% RTP.",
    "With 97% RTP, the chance of reaching a multiplier m is about 0.97 ÷ m: roughly 48.5% for 2x and 9.7% for 10x.",
    "Every cashout target has the same expected return, about $0.97 per $1 staked.",
    "Auto cashout fires at a preset multiplier, removing reaction-time risk but not the edge.",
    "Two bets can run in the same round, usually one low target and one high target.",
  ],
  sections: [
    {
      id: "what",
      title: "What JetX is and how a round works",
      body: `JetX is a branded crash game from SmartSoft Gaming, a studio based in Tbilisi, Georgia. It is one of the best-known crash titles alongside [Aviator](/guides/aviator-game-guide) and [Spaceman](/guides/spaceman-game). The generic mechanics of the genre, including how crash points are generated and how the edge is built in, are on [crash gambling](/guides/crash-gambling). This page covers what is specific to JetX.

A round runs in four stages:

1. **Betting phase.** A countdown runs while players place stakes. You can place one or two bets and set an auto cashout on each.
2. **Take-off.** The jet launches and the multiplier starts at 1.00x and rises.
3. **Cashout.** At any moment you can press cash out on each bet. The bet settles at stake × the multiplier showing when the server accepts the request.
4. **Explosion.** At a crash point hidden until it happens, the jet explodes. Any bet not cashed out loses its stake.

The crash point is decided when the round is generated, not by how many players are still in. A round can end at 1.00x before anyone has a chance to click, and it can also run to very high multipliers. The history bar at the top shows recent crash points; it is a record of finished rounds and has no bearing on the next one.

JetX is offered through licensed casino operators, and real-money play is for adults 18+ (or the local legal age). It sits in the crash section of the [Game shows topic](/guides/topics/game-shows).`,
    },
    {
      id: "odds",
      title: "JetX RTP and the real chance of each multiplier",
      body: `JetX is commonly listed at 97% RTP. Check the game rules at your operator, because studios can offer more than one configuration. In a crash game built to a fixed RTP r, the probability that the round reaches at least multiplier m is close to r ÷ m. With r = 0.97:

| Cashout target | Chance to reach it | Profit on $1 if it hits | Expected return |
| --- | --- | --- | --- |
| 1.20x | 80.8% | $0.20 | $0.97 |
| 1.50x | 64.7% | $0.50 | $0.97 |
| 2x | 48.5% | $1 | $0.97 |
| 5x | 19.4% | $4 | $0.97 |
| 10x | 9.7% | $9 | $0.97 |
| 100x | 0.97% | $99 | $0.97 |

The last column is the key point. Every target has the same expected return, because the chance of reaching it falls in exact proportion to the payout. Picking a low target does not make JetX safer in the sense of cheaper; it makes it smoother. Picking a high target does not make it more profitable; it makes it lumpier.

### Where the 3% comes from

If the r ÷ m rule holds all the way down, the chance of reaching 1.00x is only 97%. In other words, about 3% of rounds are worth nothing to anyone, however quickly they click, which is one intuitive way to see the edge. Real games round crash points and may apply limits, so treat this as a model that matches the published RTP rather than a line from the studio's source code.

### What 3% means in money

At 97% RTP, $1,000 of total stakes costs about $30 on average. If you play 200 rounds at $5, that is $1,000 wagered and roughly $30 expected loss, whatever targets you chose. The realised result can differ a lot from $30, especially with high targets, but the average does not move.

### Streaks at a 2x target

A 2x target wins 48.5% of rounds. The chance of losing 5 in a row is 0.515^5 ≈ 3.6%, and of losing 8 in a row about 0.5%. In a few hundred rounds you should expect at least one run of six or seven losses. That is ordinary variance, not a sign the game has changed.`,
    },
    {
      id: "auto",
      title: "Auto cashout and auto bet",
      body: `JetX lets you set an auto cashout on each bet before the round starts. You type a multiplier, and if the jet reaches it, the bet cashes out automatically at that value.

### Why auto cashout helps

- **It removes reaction time.** A manual click has to travel from your device to the server before the crash. On a fast climb or a laggy connection, you can press at 2.05x and be settled at a higher number or lose outright if the jet explodes first.
- **It removes in-round temptation.** The most common costly habit in crash games is raising the target mid-flight. A preset cashout takes that decision away.
- **It makes results predictable.** With a fixed target you know your hit rate in advance, which makes budgeting easier.

### What it does not do

Auto cashout does not raise the RTP. A 2x auto cashout still wins about 48.5% of the time and returns $0.97 per $1 on average.

### Auto bet

Auto bet repeats your stake for a chosen number of rounds. Combined with auto cashout it turns JetX into a fixed-rate machine: same stake, same target, many rounds. That can be sensible for a budgeted session, but it also speeds up turnover, and speed is what makes a 3% edge add up. Use a round limit and a loss limit. The [crash cashout calculator](/guides/crash-cashout-calculator) page shows how targets and round counts translate into expected cost and swing.`,
    },
    {
      id: "two-bets",
      title: "Two bets in one round",
      body: `Many players run one low-target bet and one high-target bet in the same round. It feels like a hedge. It is really two separate bets that share a crash point.

### Worked example: $1 at 1.5x and $1 at 5x

| Where the jet explodes | Chance | Result |
| --- | --- | --- |
| Below 1.5x | 35.3% | −$2 |
| Between 1.5x and 5x | 45.3% | +$0.50 − $1 = −$0.50 |
| 5x or higher | 19.4% | +$0.50 + $4 = +$4.50 |

Expected result = 0.353 × (−2) + 0.453 × (−0.50) + 0.194 × 4.50 ≈ −$0.06, which is 3% of the $2 staked. The low bet does not protect the high bet; it simply adds a second 3% bet.

### What the split does change

It changes the shape of results. Almost half the time you finish slightly down rather than fully down, and about one round in five pays well. Some players prefer that pattern. That is a legitimate preference about variance, but it should not be mistaken for an edge. A full treatment of targets and bankroll is on [crash game strategy](/guides/crash-game-strategy).`,
    },
    {
      id: "bankroll",
      title: "Planning a JetX session: swing, not just cost",
      body: `The edge tells you the average cost. The target you pick tells you how far a session can swing around that average. Both matter for a budget.

### Same cost, different swing

Take 100 rounds at $1 with a fixed auto cashout:

| Target | Expected result | Typical swing (one standard deviation) | Rough range for most sessions |
| --- | --- | --- | --- |
| 2x | −$3 | about $10 | −$23 to +$17 |
| 10x | −$3 | about $30 | −$63 to +$57 |

The 2x player wins or loses a dollar each round, so results cluster near the average. The 10x player loses most rounds and occasionally collects $9, so the spread is about three times wider. Both pay the same $3 on average.

### Losing runs at high targets

At 10x, each round misses about 90.3% of the time. The chance of 20 misses in a row is 0.903^20 ≈ 13%, so a long empty stretch is routine. A budget for a 10x plan needs to survive those stretches without raising the stake to "catch up".

### A simple session plan

1. Pick one target and one stake before you start.
2. Set auto cashout and a round limit.
3. Set a loss limit, for example 20 stakes at a 2x target or 40 stakes at a 10x target.
4. Stop when either limit is reached, and do not reopen the session the same day.

The general approach is covered in [gambling budget](/guides/gambling-budget) and, for the theory of running out of money before the average shows up, [risk of ruin](/guides/risk-of-ruin).`,
    },
    {
      id: "myths",
      title: "JetX predictors, signals and patterns",
      body: `Search "JetX" and you will find predictor apps, "hack" tools and Telegram groups promising the next crash point. They share one flaw: the crash point is generated by the game server, and the information needed to predict it is not on your screen.

### Common claims

- **"The history bar shows a pattern."** Recent crash points are independent draws. A run of low crashes does not make a high one due. That is the [gambler's fallacy](/guides/gamblers-fallacy).
- **"Our app reads the server."** Legitimate games do not leak future results to the client. Apps that claim otherwise either guess or harvest your login and wallet details.
- **"Follow our signals for 90% wins."** A 90% hit rate is achievable at a 1.08x target (0.97 ÷ 1.08 ≈ 90%). It pays 8% per win and still costs 3% on average. High hit rates are cheap to advertise and prove nothing.

### How to judge a JetX site

Play only on operators you can verify, read the rules page for the RTP and the maximum win, and check how the site describes its fairness method. [Fake casino sites](/guides/fake-casino-sites) often clone popular crash games, and a clone does not have to honour the published maths.`,
    },
    {
      id: "pvp",
      title: "JetX odds next to PvP games",
      body: `JetX's 97% RTP means a 3% house edge on every dollar, whatever the target. PVPspinArena runs three player-vs-player games with different shapes. [Coinflip](/coinflip) is a straight 50/50 between two players, and the winner takes the pot minus any fee shown before entry. Jackpot pays one winner, with a win chance equal to your share of the pot. Roulette is a 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee.

Results on PVPspinArena come from committed seeds, and any settled round can be checked on [fairness](/fairness). None of that makes a streak predictable. If crash sessions are running longer than planned, the [responsible gambling](/responsible-gambling) page has limits and support.

In the same cluster, see also [mines predictor](/guides/mines-predictor).`,
    },
  ],
  faqs: [
    {
      q: "What is the RTP of JetX?",
      a: "JetX is commonly listed at 97% RTP, a 3% house edge. Check the rules page at your casino, because operators can run different configurations.",
    },
    {
      q: "What is the best JetX strategy?",
      a: "No target beats the edge; every cashout returns about $0.97 per $1 on average. The practical choices are a fixed auto cashout, a stake you can afford to lose many times, and a round limit.",
    },
    {
      q: "What are the chances of JetX reaching 2x?",
      a: "With a 97% RTP, about 0.97 ÷ 2 = 48.5%. For 10x the chance is about 9.7%, and for 100x about 0.97%.",
    },
    {
      q: "Do JetX predictor apps work?",
      a: "No. The crash point is generated by the game server and is not visible to your device in advance. Predictor apps either guess or are designed to steal logins or money.",
    },
    {
      q: "Can JetX crash at 1.00x?",
      a: "Yes. Some rounds end at or near the start, before any cashout is possible, and bets in those rounds lose. That is part of how the game reaches its published RTP.",
    },
    {
      q: "Is auto cashout better than manual cashout in JetX?",
      a: "It is more reliable, because it removes reaction time and network lag, and it stops you raising the target mid-round. It does not change the RTP.",
    },
  ],
  sources: [
    { label: "SmartSoft Gaming: official site", url: "https://www.smartsoftgaming.com/" },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "spaceman-game",
    "chicken-road-game",
    "crash-gambling",
    "crash-game-strategy",
    "aviator-game-guide",
    "crash-cashout-calculator",
    "mines-predictor",
  ],
  updated: "2026-09-27",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "video-poker-paytables",
  cluster: "Poker",
  keyword: "video poker strategy",
  secondary: [
    "video poker paytables",
    "jacks or better",
    "video poker house edge",
    "9/6 jacks or better",
    "video poker rtp",
  ],
  title: "Video Poker Strategy: Paytables and House Edge",
  description:
    "Video poker strategy is a house-game paytable problem: 9/6 versus 8/5 Jacks or Better, house edge, and why this is not Hold'em.",
  h1: "Video poker strategy: paytables, house edge, not Hold'em",
  answer:
    "Video poker strategy means matching a hold/discard chart to a posted paytable so you lose the least against the house. It is not Texas Hold'em. There is no button and no opponent range. Full-pay 9/6 Jacks or Better returns about 99.54% with perfect play; shorter pays drop that number by whole percentage points. PVPspinArena does not offer video poker.",
  facts: [
    "Video poker is a house-banked machine or app, not a player-versus-player pot.",
    "The paytable is the game; two machines labelled Jacks or Better can have different edges.",
    "9/6 Jacks or Better is about 99.54% RTP with a matching strategy chart; 8/5 is about 97.30%.",
    "Perfect play cannot turn a short-pay table into a wage. The leftover edge is still minus-EV.",
    "This is not Hold'em. Position tips and GTO mixes do not apply.",
  ],
  sections: [
    {
      id: "house-game",
      title: "Say it first: this is a house game",
      body: `Video poker looks like five-card draw. You are dealt five, you hold some, you draw replacements, and a paytable pays pairs of jacks or better, two pair, and so on. The opponent is the schedule, not a person on the button.

This [poker](/guides/topics/poker) page is for adults 18+. Video poker strategy is damage control: pick a better paytable, play the matching chart, and treat the leftover [house edge](/guides/house-edge) as the price. The hold groups for the common Jacks or Better game are on [jacks or better strategy](/guides/jacks-or-better-strategy). It is not a secret winning system. It is not [how to play poker](/guides/how-to-play-poker) in a casino cabinet.

PVPspinArena does not have these machines. If you want a posted colour price, use [Roulette](/roulette). If you want a PvP pot, use [Jackpot](/). Neither is Jacks or Better.

### Draw poker costume, casino maths

You are not competing with the person on the next stool. Their royal does not take your pot. The machine pays a schedule that was built to keep a slice. That is why “I outplayed the last hand” is the wrong sentence. You either followed the chart or you did not. The cabinet does not fold a full house because you represented strength.

If a floor person calls it “skill”. Yes: skill at matching a chart. No: skill at reading a human. Keep those words apart so you do not sit a short-pay glass with a Hold'em ego.`,
    },
    {
      id: "paytable",
      title: "The paytable is the strategy",
      body: `Jacks or Better is named by the flush and full-house pays per coin (with a royal usually 800 for five coins at max credit). “9/6” means a flush pays 6-for-1 and a full house pays 9-for-1. “8/5” pays 8 and 5. Those two numbers move RTP by more than most players’ discipline.

| Hand (per 1 coin) | 9/6 Jacks or Better | 8/5 Jacks or Better |
| --- | --- | --- |
| Royal flush (typically 5-coin max) | 800 for 5 | 800 for 5 |
| Straight flush | 50 | 50 |
| Four of a kind | 25 | 25 |
| Full house | 9 | 8 |
| Flush | 6 | 5 |
| Straight | 4 | 4 |
| Three of a kind | 3 | 3 |
| Two pair | 2 | 2 |
| Jacks or better | 1 | 1 |
| Approx. RTP, perfect play | ~99.54% | ~97.30% |

Figures are the widely published full-pay and common short-pay pair. Always read the glass. Some “9/6” games cut two pair to 1-for-1 and collapse the RTP. The label is not a certificate.

[RTP explained](/guides/rtp-explained) is 100% minus house edge. 9/6 ≈ 0.46% edge. 8/5 ≈ 2.70% edge. That gap is larger than the leftover edge on many blackjack charts. Shopping the table matters more than memorising a cute hold on a bad glass.

### Other families, same rule

Deuces Wild, Bonus Poker, Double Double Bonus, and Joker games each have their own full-pay and short-pay sheets. A Deuces Wild “full pay” is not 9/6. A Bonus Poker that pays extra on aces can still be a worse RTP than 9/6 Jacks if the lower rungs are cut. Learn one family first. Jacks or Better is the usual teaching family because the chart is smaller and the paytable language is simple.

Progressives add a meter to the royal. When the meter is high enough, published RTPs can cross 100% *with perfect play and the posted base pays*. Casinos know this. They change the base, cap the bet, or the meter is never actually there on the machine you found. Do the glass, not the flyer.`,
    },
    {
      id: "example",
      title: "Worked example: $1.25 a hand, 400 hands",
      body: `This is the only numeric example on this page.

You play five-coin Jacks or Better at $0.25 coins: $1.25 a hand. You play 400 hands. Turnover = 400 × $1.25 = **$500**.

1. On a 9/6 machine at ~99.54% RTP, expected return ≈ $497.70. Expected cost ≈ **$2.30**.
2. On an 8/5 machine at ~97.30% RTP, expected return ≈ $486.50. Expected cost ≈ **$13.50**.
3. The same 400-hand sitting costs about **$11 more** in expectation on the short-pay glass. That is the “strategy” that actually moves money: walking to the better paytable.
4. Variance is wide. Royals are rare (on the order of one per 40,000+ hands with typical play). A session of 400 hands can finish +$80 or −$80 around either mean. The mean is still the price.

[Expected value](/guides/expected-value-gambling) is this paragraph in one line: p × pay summed over the paytable, minus 1, times stake. You do not need to derive it at the machine if you trust a published RTP *and* you actually use the matching chart.`,
    },
    {
      id: "chart",
      title: "What a hold/discard chart actually does",
      body: `A video poker strategy chart lists which cards to hold for this paytable. It is computed, like blackjack basic strategy, by enumerating draws. A 9/6 chart and an 8/5 chart disagree on some holds because a flush or full house is worth different amounts.

### High-value ideas (not a full chart)

- Hold a made paying pair (jacks or better) over a four-card flush that would require breaking the pair — unless the paytable says otherwise; check the chart.
- Four to a royal is usually held over almost everything except a made royal or a paying straight flush.
- High-card combinations (A-K-J, suited connectors to a royal) have an order. Guessing that order is how people turn 99.54% into 98%.
- Never invent “I keep a kicker because it feels lucky”. Kickers are Hold'em language. This is a paytable.

### Perfect play is not a wage

The leftover 0.46% on 9/6 still applies every hand. Play $500 through and the expected cost is a couple of dollars plus a royal-sized variance tail. Treating a hot hour as proof you beat the machine is the same error as treating a hot [Roulette](/roulette) colour as plus-EV.

If you will not follow the chart, you do not have 99.54%. You have a worse number you have not measured.

### Max coins and the royal

Many schedules pay a discontinuous royal at five coins (800-for-1 on the five-coin unit, not 250 × 5). Playing one coin to “make it last” can throw away the only line that made the RTP number you read. If you cannot afford five coins on this denomination, drop the denomination. Do not “save money” by starving the royal. That is how a 99.54% article becomes a worse game in your hand.

This is still not a reason to raise the denomination after a loss. Max-coin on a stake you cannot repeat is how a machine session becomes a problem. The chart assumes you can play the next hand the same way.`,
    },
    {
      id: "not-holdem",
      title: "Why Hold'em tips fail here",
      body: `There is no position. There is no bluff. The machine cannot fold. [GTO poker strategy](/guides/gto-poker-strategy) does not apply. [Poker hand rankings](/guides/poker-hand-rankings) still tell you what a flush is, but the *order you hold* is dictated by expected pay, not by beating another seat.

Three Card Poker is also a house game; it is a different paytable and a different decision (Q-6-4). Do not mix the charts.

Progressives and “100%+” variants exist. Some Deuces Wild full-pay games have been published above 100% with perfect play. Those machines are rare, often capped, and still variance monsters. A blog screenshot is not the glass in front of you. If the royal does not pay what the article assumed, the RTP is fiction.`,
    },
    {
      id: "budget",
      title: "Bankroll language for a minus-EV machine",
      body: `You are not grinding a win rate versus weaker seats. You are buying a high-variance paytable. Size the session as entertainment. A [gambling budget](/guides/gambling-budget) is the right tool, not a 30-buy-in cash-game roll — unless you insist on treating $1.25 hands like a job, in which case the maths still says you are paying a mean cost.

[Kelly](/guides/kelly-criterion) on a 99.54% game is still a non-positive growth fraction. Do not bet a percent of wealth because a video said “almost 100% RTP”. Almost 100% is still minus.

If you came from this site’s PvP games, remember: a 0% fee [Coinflip](/coinflip) is about 0-EV between players. Video poker is minus-EV against a cabinet. Different products.

### Penalty cards and “I would have hit”

A hold that keeps a penalty card (a deuce that wrecks a royal draw, a paired low card that blocks two pair) is why the chart looks fussy. After the draw misses, it is easy to say the other hold would have hit. That is results. The chart maximises the mean of all draws, including the ones that look stupid after the fact. Do not rewrite the hold because this royal would have needed the card you threw. Next hand, follow the same chart.

If you cannot stand that, you do not want video poker strategy. You want a story. The cabinet will sell you one either way. Pay less for it by sitting the better glass.

### Multi-play and speed

Some cabinets deal dozens of hands at once. The paytable is the same. The hourly turnover is not. Forty lines of $1.25 is $50 a click. The expected cost scales with the clicks, not with how clever the hold felt. If you use multi-play, shrink the denomination so the hourly mean cost still fits the budget. Speed is not a strategy. It is a multiplier on the leftover edge.

The same warning applies to bonus credits and “choice” games that add a second decision after the draw. Each extra button is another schedule. If you cannot name the RTP of that extra, skip it. A mystery button is how 99.54% becomes a slogan on a game you are not playing.`,
    },
    {
      id: "summary",
      title: "Summary: shop the glass, play the matching chart, pay the leftover",
      body: `Video poker strategy is a house-game discipline. Read the paytable. Prefer 9/6 (or better) over 8/5. Use the chart for that glass. The leftover edge is still a cost. This is not Hold'em and it is not a winning system.

PVPspinArena does not offer video poker. If a machine — or any other game — is taking money you cannot spare, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Adults 18+ only.

Shop the glass every time you sit, even on a machine you think you know. Paytables get swapped. A 9/6 cabinet that became 8/5 overnight is a different product with the same theme music. If you cannot see the flush and full-house rungs, walk. A hidden schedule is not a strategy problem. It is a reason not to play.

The other video-poker family with its own full-pay chart is [Deuces Wild](/guides/deuces-wild).`,
    },
  ],
  faqs: [
    {
      q: "Is video poker the same as Texas Hold'em?",
      a: "No. Video poker is a house-banked paytable game. Hold'em is player-versus-player with rake. Strategy does not transfer.",
    },
    {
      q: "What is 9/6 Jacks or Better?",
      a: "A common full-pay schedule: full house 9-for-1, flush 6-for-1. With perfect play the RTP is about 99.54%. Read the rest of the glass too.",
    },
    {
      q: "Does video poker strategy beat the house?",
      a: "Not on standard Jacks or Better. It minimises the edge. The leftover is still negative expected value.",
    },
    {
      q: "Why does the paytable matter more than the holds?",
      a: "Moving from 9/6 to 8/5 drops RTP by about two percentage points. A few mistaken holds hurt; sitting the wrong glass hurts more, every hand.",
    },
    {
      q: "Can I use Hold'em pot odds on video poker?",
      a: "No. There is no contested pot. You are buying a draw against a posted schedule.",
    },
    {
      q: "Does PVPspinArena have video poker?",
      a: "No. It is not a casino floor and not a poker room. It offers Jackpot, Coinflip and Roulette.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Jacks or Better",
      url: "https://wizardofodds.com/games/video-poker/strategy/jacks-or-better/9-6/generic/",
    },
    { label: "Wizard of Odds: video poker", url: "https://wizardofodds.com/games/video-poker/" },
    { label: "Wikipedia: Video poker", url: "https://en.wikipedia.org/wiki/Video_poker" },
  ],
  related: [
    "house-edge",
    "rtp-explained",
    "three-card-poker-strategy",
    "expected-value-gambling",
    "poker-hand-rankings",
    "deuces-wild",
  ],
  updated: "2026-09-26",
};

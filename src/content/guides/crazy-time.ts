import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crazy-time",
  cluster: "Game shows",
  keyword: "crazy time",
  secondary: [
    "crazy time stats",
    "crazy time rtp",
    "crazy time wheel",
    "crazy time bonus games",
    "crazy time top slot",
  ],
  title: "Crazy Time: Wheel Odds, Bonus Games, RTP and Stats",
  description:
    "Crazy Time explained: the 54-segment wheel, Top Slot, four bonus games, RTP by bet spot, and what stats trackers can and cannot tell you.",
  h1: "Crazy Time: the wheel, the bonus games, RTP and what the stats mean",
  answer:
    "Crazy Time is Evolution's live money-wheel game show. A host spins a 54-segment wheel with four number spots (1, 2, 5, 10) and four bonus games (Coin Flip, Cash Hunt, Pachinko, Crazy Time). A Top Slot can multiply the winning spot before the spin. Published returns sit roughly between 94% and 96% depending on the spot, and spin history does not predict the next result.",
  facts: [
    "The main wheel has 54 segments: 21 × 1, 13 × 2, 7 × 5, 4 × 10, 4 × Coin Flip, 2 × Cash Hunt, 2 × Pachinko and 1 × Crazy Time.",
    "The Crazy Time bonus segment lands 1 time in 54, about 1.85% of spins, or roughly 18 to 19 times per 1,000 spins.",
    "Without the Top Slot, the 1 spot returns only 21/54 × 2 ≈ 77.8%; the multipliers supply the rest of the published return.",
    "Evolution's help screen lists a separate RTP for each bet spot, commonly in a band of about 94% to 96%.",
    "Stats sites record past spins; each spin is independent, so a long gap does not make a bonus due.",
  ],
  sections: [
    {
      id: "what",
      title: "What Crazy Time is and how a round runs",
      body: `Crazy Time is a live-dealer game show from Evolution, launched in 2020 as a bigger follow-up to its earlier money wheel, [Dream Catcher](/guides/dream-catcher-game). It is streamed from a studio with a presenter, a large vertical wheel, a slot-style device on top of the wheel, and four separate bonus sets. It belongs to the same family as [Monopoly Live](/guides/monopoly-live), [Funky Time](/guides/funky-time) and [Lightning Roulette](/guides/lightning-roulette), all collected in the [Game shows topic](/guides/topics/game-shows).

A round follows the same order every time:

1. **Betting window.** You place chips on any of eight spots: 1, 2, 5, 10, Coin Flip, Cash Hunt, Pachinko or Crazy Time. You can cover several at once.
2. **Top Slot spin.** Two reels above the wheel spin. The left reel shows a bet spot, the right reel a multiplier. If they align on the payline, that spot's payout is multiplied for this round only.
3. **Wheel spin.** The host spins the main wheel. A flapper at the top stops on the winning segment.
4. **Settlement or bonus.** A number segment pays its stated odds (1 pays 1 to 1, 2 pays 2 to 1, 5 pays 5 to 1, 10 pays 10 to 1). A bonus segment launches that bonus game for players who bet on it.

Only players with a stake on the bonus spot that landed take part in that bonus. Everyone else watches. The game is 18+ (or the local legal age) wherever real money is involved, and it is offered only through licensed operators that carry Evolution's studio feed.`,
    },
    {
      id: "wheel",
      title: "The 54-segment wheel and its odds",
      body: `Everything in Crazy Time starts with the segment count, because the chance of a spot winning is simply its number of segments divided by 54.

| Spot | Segments | Chance per spin | Base payout | Base return (no Top Slot) |
| --- | --- | --- | --- | --- |
| 1 | 21 | 38.89% | 1 to 1 | 77.8% |
| 2 | 13 | 24.07% | 2 to 1 | 72.2% |
| 5 | 7 | 12.96% | 5 to 1 | 77.8% |
| 10 | 4 | 7.41% | 10 to 1 | 81.5% |
| Coin Flip | 4 | 7.41% | bonus | — |
| Cash Hunt | 2 | 3.70% | bonus | — |
| Pachinko | 2 | 3.70% | bonus | — |
| Crazy Time | 1 | 1.85% | bonus | — |

The "base return" column is the useful surprise. A $1 bet on 1 wins back $2 with probability 21/54, so its expected return is 21/54 × $2 ≈ $0.778. The 2 spot is 13/54 × $3 ≈ $0.722. None of the number spots gets anywhere near 96% on its own.

### Where the missing return comes from

The gap is filled by the Top Slot. On a share of rounds the Top Slot lands on your spot with a multiplier, and a 1 that normally pays 1 to 1 might pay many times that. Those rare boosted rounds carry roughly the last 14 to 23 percentage points of return on each number spot. That has a practical meaning: a player betting only on 1 is mostly collecting small, frequent wins that lose about 22% on average, and relying on occasional multiplied rounds to bring the long-run average back up toward the published figure.

This is why Crazy Time feels like it bleeds slowly between highlights. The structure is designed that way. The same "most of the value lives in the rare outcome" pattern is explained more generally in [variance in gambling](/guides/variance-in-gambling).`,
    },
    {
      id: "bonus-games",
      title: "The four bonus games",
      body: `Each bonus segment opens a separate mini-game. The multipliers in all four are generated randomly for that round, and any Top Slot multiplier that matched the bonus spot is applied on top.

### Coin Flip

The most common bonus (4 segments). A red side and a blue side are each given a multiplier, then a mechanical device flips a large coin. Whichever side faces up sets the payout for every participant. It is a 50/50 between two multipliers, so the value depends on how generous the two numbers are.

### Cash Hunt

A wall of 108 multipliers is shown briefly, then covered with symbols and shuffled. Each player aims at one symbol on their own screen. You win the multiplier behind the target you picked. Your choice cannot improve the expected result, because the multipliers are shuffled after you see them; picking is an [illusion of control](/guides/illusion-of-control) moment built into the show.

### Pachinko

The host drops a puck from the top of a tall pegged wall. It bounces down and lands in a slot at the bottom that holds a multiplier. If it lands on a DOUBLE slot, all bottom multipliers double and the puck is dropped again. The physics is the same idea as a [plinko board](/guides/plinko-board): many small random deflections produce a result that is hard to call.

### Crazy Time

The rarest bonus (1 segment). The host walks through a red door to a giant second wheel. Before it spins, each player chooses one of three coloured flappers (green, blue or yellow). Segments carry multipliers, and DOUBLE or TRIPLE segments multiply every value on the wheel and trigger a respin. Because each flapper points at a different segment, players watching the same spin can receive different results. This is where the largest wins in the game happen, and it is also why the Crazy Time spot is usually listed with one of the lowest RTPs: you are paying for exposure to a long tail.`,
    },
    {
      id: "rtp",
      title: "Crazy Time RTP by bet spot",
      body: `Return to player (RTP) is the long-run percentage of stakes a bet spot pays back. Evolution publishes a separate figure for each spot in the game's help menu, and that menu is the version to trust for the table you are actually playing. Across widely reported versions of the game the figures fall in a band of roughly 94% to 96%:

- The **1** spot is usually listed highest, at about 96%.
- The **2**, **5** and **10** spots and **Coin Flip** usually sit in the mid-95% range.
- **Cash Hunt** tends to sit a little lower.
- **Pachinko** and **Crazy Time** are usually the lowest, around 94% to 94.5%.

Convert RTP to cost by subtracting from 100%. At 96% you lose about $4 per $100 wagered on average; at 94.4% it is about $5.60. Over 200 spins at $1 on the 1 spot, expected loss is about $8, but the realised result will swing far more than that because of the Top Slot.

### Covering several spots does not blend the edge away

Some players bet on every bonus at once so they "always get into something". Your overall return is simply the stake-weighted average of each spot's RTP. If you put $1 on each of the four bonuses, three-quarters of your action sits at the lower end of the RTP band. Covering more spots raises how often you see a feature, not how much you get back. The mechanics of converting RTP into an edge are covered in [RTP explained](/guides/rtp-explained) and [house edge](/guides/house-edge).`,
    },
    {
      id: "stats",
      title: "Crazy Time stats trackers: what they show and what they cannot",
      body: `Third-party stats sites log every Crazy Time spin from the live stream: which segment landed, the Top Slot result, and the multipliers paid in bonuses. They show hot and cold charts, "spins since last Crazy Time" counters and big-win feeds. Used properly, the data is a check on the published odds. Used as a signal, it is the [gambler's fallacy](/guides/gamblers-fallacy) with a nicer interface.

### What a fair wheel should look like over 1,000 spins

| Spot | Expected hits | Typical range (±2 standard deviations) |
| --- | --- | --- |
| 1 | 389 | about 358–420 |
| 2 | 241 | about 214–268 |
| 10 | 74 | about 58–90 |
| Crazy Time | 18.5 | about 10–27 |

If a tracker shows 13 Crazy Time bonuses in 1,000 spins, that is inside normal variation, not evidence the wheel is "tight".

### Gaps between bonuses

Waiting for a 1-in-54 event follows a geometric pattern. The average gap is 54 spins, but the median is only about 37, because short gaps are common and a few long ones pull the average up. The chance of no Crazy Time in 100 spins is (53/54)^100 ≈ 15%. In 200 spins it is about 2.4%. Those long droughts are rare but they do happen on a busy live table every week, and they are exactly what the "it's due" posts are made of.

The wheel has no memory. After a 150-spin drought, the chance on the next spin is still 1/54. Trackers are fine for curiosity and for confirming the frequencies match the segment count. They are useless for timing a bet.`,
    },
    {
      id: "playing",
      title: "Bankroll, limits and playing sensibly",
      body: `Crazy Time is fast and social, with a chat, a host and constant near-misses. A few habits keep it in proportion:

- **Set the session budget first.** Decide the total you are prepared to lose and the number of spins. A [gambling budget](/guides/gambling-budget) works better when written down before the stream starts.
- **Size stakes for drought.** If you back only bonuses, plan for 30 to 50 spins without a big feature. At $2 a spin across four bonus spots, that is $60 to $100 of exposure before the fun part arrives.
- **Know the max-win cap.** Operators cap the maximum payout per round, and the cap varies by casino. A huge multiplier can be cut to the cap.
- **Ignore signals.** Telegram "Crazy Time signal" groups sell the same stats you can see for free, with the same zero predictive value.

If chasing a bonus has stopped being entertainment, use the tools on the [responsible gambling](/responsible-gambling) page.`,
    },
    {
      id: "pvp",
      title: "Crazy Time maths next to a PvP wheel",
      body: `The simplest lesson from Crazy Time is that a wheel's odds are just segment counts. PVPspinArena's [Roulette](/roulette) uses the same idea with far fewer moving parts: 33 slots, 16 Purple and 16 Silver paying 2x, and 1 Green paying 14x. You can do the whole RTP calculation in your head. Purple returns 16/33 × 2 = 32/33 ≈ 96.97%, and Green returns 1/33 × 14 = 14/33, 14/33. After the 5% win fee, Purple and Silver return about 92.12% and Green about 40.30%.

There is no Top Slot shifting value into rare rounds, so the published number and the per-spin number are the same thing. Settled rounds can be checked against committed seeds on the [fairness](/fairness) page. That transparency does not make the edge disappear; it only means you can see exactly what you are paying.`,
    },
  ],
  faqs: [
    {
      q: "What is the best bet in Crazy Time?",
      a: "By published RTP, the 1 spot is usually listed highest at about 96%. It is not a winning bet; it simply loses the least on average. Bonus spots have lower RTPs but bigger possible wins.",
    },
    {
      q: "How often does the Crazy Time bonus land?",
      a: "It has 1 of the 54 segments, so about 1.85% of spins. The average gap is 54 spins, the median about 37, and droughts past 150 spins happen occasionally.",
    },
    {
      q: "Can Crazy Time stats predict the next spin?",
      a: "No. Each spin is independent. Stats trackers are useful for checking that long-run frequencies match the segment counts, but a long gap does not make any segment due.",
    },
    {
      q: "What is the Top Slot in Crazy Time?",
      a: "Two reels above the wheel spin before each round. If the left reel's bet spot lines up with a multiplier on the right, that spot's win is multiplied for that round only.",
    },
    {
      q: "Is Crazy Time rigged?",
      a: "It is a physical wheel streamed live by a licensed studio, and tracker data broadly matches the segment counts. The house edge is built into the published RTP, not hidden in the spin.",
    },
  ],
  sources: [
    { label: "Evolution: official site", url: "https://www.evolution.com/" },
    { label: "Wizard of Odds: Crazy Time", url: "https://wizardofodds.com/games/crazy-time/" },
    {
      label: "Wikipedia: Geometric distribution",
      url: "https://en.wikipedia.org/wiki/Geometric_distribution",
    },
  ],
  related: [
    "dream-catcher-game",
    "monopoly-live",
    "funky-time",
    "lightning-roulette",
    "wheel-of-fortune-odds",
    "gamblers-fallacy",
  ],
  updated: "2026-09-27",
};

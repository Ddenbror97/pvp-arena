import type { Guide } from "./types";

export const guide: Guide = {
  slug: "martingale-strategy",
  cluster: "Games & odds",
  keyword: "martingale strategy",
  secondary: ["martingale betting system", "martingale roulette", "does martingale work", "reverse martingale"],
  title: "Martingale Strategy: Why Doubling Bets Fails Long-Term",
  description:
    "How the martingale strategy works, roulette and coinflip examples, losing streak maths, table limits, variants and why it cannot beat the edge.",
  h1: "Martingale strategy: why doubling your bet fails long-term",
  answer:
    "The martingale strategy is a betting system where you double your stake after every loss and return to your starting stake after a win. The idea is that one win recovers all previous losses plus a profit equal to the first bet. In practice, losing streaks grow the required stake so fast that a bankroll or table limit is hit long before the system pays off, and it never changes the house edge.",
  facts: [
    "Martingale doubles the stake after each loss and resets after a win.",
    "After 10 losses in a row, a $1 starting bet grows to $1,024.",
    "A system that changes bet size cannot change the house edge of the game.",
    "On a 46.67% chance bet, 10 losses in a row happen about once in 500 sequences.",
    "Martingale produces many small wins and rare, very large losses.",
  ],
  sections: [
    {
      id: "what",
      title: "What is the martingale strategy?",
      body: `The martingale is one of the oldest and best-known betting systems. It is usually applied to even-money bets, which pay 2x and win close to half the time, such as red or black in roulette, or Purple and Silver on a coloured wheel.

### The rules

1. Choose a starting stake, for example $1.
2. If you win, take the profit and bet the starting stake again.
3. If you lose, double your previous stake.
4. Keep doubling until you win, then return to the starting stake.

### Why it seems to work

When you finally win, the payout covers every loss in the streak plus one starting stake. Lose $1, $2 and $4, then win $8, and you are $1 up overall. Because a win will eventually come, the system looks like it guarantees profit.

The catch is in the word "eventually". Your bankroll and the site's limits are finite; a losing streak is not. If you are new to terms like stake, payout and edge, see our [casino terminology guide](/guides/casino-terminology).`,
    },
    {
      id: "example",
      title: "A worked martingale example",
      body: `Here is a martingale sequence with a $1 starting stake on a 2x bet.

- Bet 1: $1, lose. Total lost: $1.
- Bet 2: $2, lose. Total lost: $3.
- Bet 3: $4, lose. Total lost: $7.
- Bet 4: $8, lose. Total lost: $15.
- Bet 5: $16, win. Payout $32. Net result: +$1.

Five bets, $31 put at risk, and a profit of $1. That is the trade the martingale makes every time.

### How the stake grows

- After 5 losses: next bet $32, total lost $31.
- After 7 losses: next bet $128, total lost $127.
- After 10 losses: next bet $1,024, total lost $1,023.
- After 12 losses: next bet $4,096, total lost $4,095.

The required stake doubles each time. To survive n losses in a row you need a bankroll of 2^n − 1 times your starting bet, just to place the next bet. A $100 bankroll with $1 bets survives only 6 losses in a row.`,
    },
    {
      id: "streaks",
      title: "How likely are long losing streaks?",
      body: `Losing streaks feel rare, but they are a normal part of random results. The probability of losing n bets in a row is (1 − p)^n, where p is the chance of winning one bet.

### On a 46.67% bet (Purple or Silver on PVPspinArena Roulette)

The chance of losing one bet is 8/15, about 53.3%.

- 5 losses in a row: about 4.3%, roughly 1 in 23.
- 7 losses in a row: about 1.2%, roughly 1 in 81.
- 10 losses in a row: about 0.19%, roughly 1 in 540.

### Over a session

Those numbers apply to one sequence. Over hundreds of bets, you get many chances to hit a long streak. In 200 bets on a 46.67% chance, the probability of seeing at least one run of 7 losses is well over 50%.

### Why the gambler's fallacy makes it worse

After five losses, many players feel a win is "due". It is not. Each round is independent, and the next bet has the same chance as the first. Our [roulette colors guide](/guides/roulette-colors) explains why past colors do not predict future spins.`,
    },
    {
      id: "edge",
      title: "Why martingale cannot beat the house edge",
      body: `A betting system changes how much you bet and when. It cannot change the probability of winning or the payout of each bet. Because the house edge is a property of each bet, it applies to every dollar you wager, whatever pattern you use.

### The expected value of a martingale session

On a bet with a 6.67% edge, every $1 wagered returns about $0.933 on average. Martingale increases your total amount wagered, since losing streaks push stakes up, so your expected loss actually grows compared with flat betting.

### The shape of the results

Martingale does not remove losses; it reshapes them.

- Most sessions end with small wins.
- A few sessions end with a catastrophic loss that wipes out many small wins.

Averaged across all sessions, the result matches the house edge. Our [house edge guide](/guides/house-edge) walks through the formula.

### A simple way to see it

If martingale beat the edge, casinos would lose money on every even-money bet. They do not, because the rare large losses fully pay for the frequent small wins.`,
    },
    {
      id: "limits",
      title: "Table limits and bankroll limits",
      body: `Two practical limits stop the martingale well before an infinite streak.

### Bankroll limit

You can only double as long as you have the money. Once the next required bet is bigger than your balance, the system breaks and you take the full loss of the streak.

### Table or maximum bet limit

Most games cap the size of a single bet. If the minimum is $1 and the maximum is $500, you can double at most 8 times ($1 to $256) before the next bet ($512) is not allowed.

### Combined effect

With a $1 start, a cap of $256 and a bankroll of $511, one run of 9 losses costs you $511, while each successful sequence wins $1. You would need about 511 successful sequences just to break even after one bad streak, and the streak comes on average far sooner than that on a 46.67% bet.

### Withdrawal and daily limits

On crypto sites, daily withdrawal caps and review thresholds also shape how you manage money. They exist for safety, not to stop strategies, but they are worth knowing. Our [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) covers them.`,
    },
    {
      id: "roulette",
      title: "Martingale on roulette",
      body: `Roulette is where the martingale is most often tried, because it offers even-money bets.

### European roulette

Red or black wins 18/37, about 48.65%. The house edge is 2.70%. Losing streaks are slightly less likely than on a coloured wheel, but still common.

### American roulette

Red or black wins 18/38, about 47.37%, with a 5.26% edge. The extra green pocket makes streaks more likely.

### PVPspinArena coloured wheel

Purple or Silver wins 7/15, about 46.67%, pays 2x, with a 6.67% edge. Rounds are fast and run continuously, which means a martingale sequence can escalate within minutes.

### Green martingale

Some players try doubling on the 14x Green. Because Green only hits 1 in 15 times, streaks of 20 or more misses are common (about a 25% chance), so a doubling system on Green grows stakes to impossible levels. Players who chase Green usually increase stakes more slowly, but the edge is still 6.67% on every bet.

For the full details of the wheel, see our [crypto roulette guide](/guides/crypto-roulette). You can watch rounds on the [Roulette page](/roulette) without betting.`,
    },
    {
      id: "coinflip",
      title: "Martingale on coinflip and PvP games",
      body: `In a PvP coinflip, two players stake the same amount and one wins both stakes. With a 0% fee, each player has exactly a 50% chance and the game has no house edge.

### Does martingale work without an edge?

It still does not create profit. With a fair 50% bet, martingale produces the same pattern: many small wins and a rare large loss. On average the result is zero, before any fees. The bankroll and bet size limits still end the system eventually.

### Finding opponents

In a PvP game, each doubled stake needs an opponent willing to match it. On [Coinflip](/coinflip), you create or join rooms at a set amount, so a large doubled bet may take longer to be matched.

### Jackpot

In a [Jackpot](/) pot, your chance equals your share of the pot, so doubling your entry also doubles your chance but not your odds of profit. Our [coin flip odds guide](/guides/coin-flip-odds) and [PvP gambling guide](/guides/pvp-gambling) explain why fair PvP games are zero-sum between players.`,
    },
    {
      id: "variants",
      title: "Martingale variants",
      body: `Several systems modify the martingale. None change the edge.

### Reverse martingale (Paroli)

Double your stake after each win and reset after a loss, usually stopping after three wins. It risks small amounts and aims to ride winning streaks. Most sequences lose a little; a few win more.

### Grand martingale

Double after each loss and add one extra unit. It recovers losses faster but grows stakes even faster.

### Mini martingale

Cap the number of doublings, for example at four, and accept the loss if the streak continues. It limits the worst case but still loses on average.

### D'Alembert

Increase the stake by one unit after a loss and decrease by one after a win. Stakes grow slowly, so losses build more gradually.

### Fibonacci

Follow the Fibonacci sequence (1, 1, 2, 3, 5, 8 and so on) after losses. It grows more slowly than doubling but still escalates quickly on long streaks.

All of these rearrange when you win and lose. Averaged over time, each one returns what the house edge says it will.`,
    },
    {
      id: "simulation",
      title: "What a simulation shows",
      body: `Imagine 1,000 players each running a martingale on Purple, with a $1 start, a $255 bankroll and a goal of winning $50.

- Each player needs about 50 successful sequences to hit the goal.
- Each sequence ends in failure if 8 losses in a row occur, a chance of about 0.66% per sequence.
- Over 50 sequences, the chance of at least one failure is roughly 28%.

So around 72% of players finish $50 up, and around 28% lose most or all of their $255. On average, the group loses money, and the average loss matches the house edge on everything they wagered.

This is why martingale feels effective. Most people who try it win for a while. The losses are concentrated in fewer, bigger events that are easy to dismiss as bad luck.

These figures are rounded estimates for illustration and assume every round is independent and fair, as they are on PVPspinArena. You can verify any round on the [fairness page](/fairness).`,
    },
    {
      id: "safer",
      title: "Safer ways to manage your bets",
      body: `If you want structure in your play, use rules that limit risk rather than rules that chase losses.

- **Flat betting.** Bet the same small amount every round. Your cost stays close to the edge times what you wager.
- **Loss limit.** Decide in advance how much you can lose in a session, then stop.
- **Win goal.** Decide when you will stop if you are ahead. It does not change the maths, but it protects wins from being played back.
- **Time limit.** Fast rounds make time disappear; set a timer.
- **Percentage bets.** Stake a small share of your balance, such as 1–2%, so a losing run cannot empty it quickly.

### Warning signs

Doubling after losses is close to chasing losses, one of the most common signs of problem gambling. If you find yourself raising bets to win back money, take a break. Our [gambling budget guide](/guides/gambling-budget) explains how to set limits, and the [responsible gambling page](/responsible-gambling) lists where to get help.`,
    },
  ],
  faqs: [
    {
      q: "Does the martingale strategy work?",
      a: "In the short term it often produces small wins, but over time losing streaks and bet limits cause large losses that match or exceed the house edge. It cannot give a long-term profit.",
    },
    {
      q: "How much bankroll do I need for martingale?",
      a: "To survive n losses in a row you need 2^n − 1 times your starting bet. Surviving 10 losses with a $1 start needs $1,023, and longer streaks still happen.",
    },
    {
      q: "Is martingale illegal?",
      a: "No. It is just a way of choosing stakes. Casinos do not need to ban it because it does not change the odds or the house edge.",
    },
    {
      q: "What is the reverse martingale?",
      a: "The reverse martingale, or Paroli, doubles the stake after wins instead of losses and resets after a loss. It has smaller losses but still has the same edge.",
    },
    {
      q: "Can martingale work on a fair 50/50 game?",
      a: "No. On a fair game the average result is zero. Martingale only reshapes results into many small wins and occasional large losses.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: Martingale betting system", url: "https://wizardofodds.com/gambling/betting-systems/martingale/" },
    { label: "Encyclopaedia Britannica: Martingale (probability)", url: "https://www.britannica.com/science/martingale" },
  ],
  related: ["house-edge", "roulette-colors", "crypto-roulette", "gambling-budget"],
  updated: "2026-09-25",
};

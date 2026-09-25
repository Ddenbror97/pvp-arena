import type { Guide } from "./types";

export const guide: Guide = {
  slug: "house-edge",
  cluster: "Games & odds",
  keyword: "house edge",
  secondary: ["what is house edge", "house edge vs rtp", "casino house edge by game", "lowest house edge games"],
  title: "House Edge Explained: What It Costs You Per Bet",
  description:
    "What house edge means, how to calculate it, how it relates to RTP, typical house edges by game, and why PvP games with low fees work differently.",
  h1: "House edge explained: what it costs you per bet",
  answer:
    "The house edge is the average share of each bet a casino game keeps over the long run. A 5% house edge means that for every $100 wagered, players get back about $95 on average. It comes from paying winners slightly less than the true odds. RTP, or return to player, is the same idea from the other side: 100% minus the house edge.",
  facts: [
    "House edge = 1 − (probability of winning × total payout), summed over all outcomes.",
    "RTP (return to player) = 100% − house edge.",
    "European roulette has a house edge of about 2.70%; American roulette about 5.26%.",
    "The house edge is an average; short-term results can be far above or below it.",
    "In PvP games the house does not bet; its only take is the fee, which on PVPspinArena defaults to 0%.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What is the house edge?",
      body: `Every casino game against the house is designed so that, over a very large number of bets, the casino keeps a small percentage of the money wagered. That percentage is the house edge.

It does not mean you lose that percentage every time. Individual bets win or lose in full. But if you could average across millions of bets, the result would settle very close to the house edge.

### Where it comes from

A casino creates its edge by paying winning bets slightly less than the true odds would justify. On a fair coin, the true payout for a win is 2x your stake. If a casino paid 1.9x instead, the missing 0.1 per win would become its edge.

### Why it matters

The house edge is the price of playing. It tells you how much, on average, a session will cost relative to how much you bet in total. Two games can feel similar but have very different costs.

### A key distinction

The edge applies to the total amount wagered, not to your deposit. If you deposit $50 and place a hundred $5 bets, you have wagered $500. At a 5% edge, the average cost is $25, not $2.50. Fast games with many bets turn a small edge into a bigger cost.`,
    },
    {
      id: "calculate",
      title: "How to calculate the house edge",
      body: `You can work out the house edge of any game if you know the probabilities and payouts.

### The formula

Expected return per $1 = sum of (probability of each outcome × total amount returned for that outcome).

House edge = 1 − expected return.

### Example: coloured roulette

PVPspinArena's wheel has 15 slots: 7 Purple (pays 2x), 7 Silver (pays 2x) and 1 Green (pays 14x).

- Bet on Purple: expected return = 7/15 × 2 = 0.9333. House edge = 6.67%.
- Bet on Green: expected return = 1/15 × 14 = 0.9333. House edge = 6.67%.

### Example: European roulette

A single-zero wheel has 37 pockets. A bet on red pays 2x and wins on 18 pockets.

- Expected return = 18/37 × 2 = 0.9730. House edge = 2.70%.

### Example: American roulette

A double-zero wheel has 38 pockets.

- Expected return = 18/38 × 2 = 0.9474. House edge = 5.26%.

### Using the result

Multiply the house edge by your total wagered to estimate the average cost. Wagering $200 at 2.70% costs about $5.40 on average. Our [CS2 roulette guide](/guides/cs2-roulette) walks through colour-wheel odds in more detail.`,
    },
    {
      id: "rtp",
      title: "House edge vs RTP",
      body: `RTP stands for return to player. It is the same measurement from the player's side.

- **RTP** = the average percentage of wagers returned to players.
- **House edge** = 100% − RTP.

A slot machine with an RTP of 96% has a house edge of 4%. A roulette bet with an RTP of 97.30% has a house edge of 2.70%.

### Where you see each

- Slot machines and online slots usually advertise RTP.
- Table games and betting guides usually quote house edge.

### Theoretical vs actual

RTP and house edge are theoretical averages over enormous numbers of bets. In a single session, the actual return can be far higher or lower. A slot with 96% RTP can pay back 200% in one session and 20% in another.

### Variable RTP

Some online games offer several versions with different RTPs, and operators may choose which to use. Always check the RTP shown in the game's information panel rather than assuming the highest possible value.`,
    },
    {
      id: "by-game",
      title: "Typical house edge by game",
      body: `House edges vary widely. These are commonly cited figures for standard rules; actual values depend on the exact rules and, for some games, how you play.

- **Blackjack with basic strategy**: around 0.5%, depending on rules. Playing without strategy raises it significantly.
- **Baccarat, banker bet**: about 1.06%. Player bet: about 1.24%. Tie bet: about 14.4%.
- **Craps, pass line**: about 1.41%.
- **European roulette**: 2.70%.
- **French roulette with la partage on even-money bets**: about 1.35%.
- **American roulette**: 5.26%.
- **Slots**: typically 2% to 15%, varying by game and venue.
- **Keno**: often 20% or more.
- **Lotteries**: often around 50%.

### Patterns

- Games where skill matters, like blackjack, can have low edges for players who play correctly.
- Side bets and novelty bets usually carry much higher edges.
- Games with huge jackpots, like lotteries, fund them with large edges.

Knowing these numbers helps you understand what each game costs, not how to win. No bet with a positive house edge can be beaten over the long run.`,
    },
    {
      id: "pvp",
      title: "House edge in PvP games",
      body: `Player-versus-player games work differently. The house does not take the other side of your bet. Players bet against each other, and the site takes a fee at most.

### Jackpot

All stakes form one pot, and one player wins it. With no fee, every player's expected return is exactly 100%. With a 5% fee, it is 95%. See our [crypto jackpot guide](/guides/crypto-jackpot).

### Coinflip

Two equal stakes form a pot, and a 50/50 flip decides the winner. With no fee, the expected return is 100%. See our [coin flip odds guide](/guides/coin-flip-odds).

### The fee is the edge

In PvP games, the fee plays the role of the house edge. It is usually a percentage of the pot. PVPspinArena's house fee is configurable and defaults to 0%, meaning the pot is returned to players in full.

### Why this matters

A PvP game with a low fee can cost players much less on average than a house-banked game. But it is still gambling: individual players win and lose, and variance can be large. Roulette on PVPspinArena is a house-banked colour wheel with its own edge of about 6.67%, calculated above.`,
    },
    {
      id: "variance",
      title: "House edge vs variance",
      body: `The house edge tells you the average cost. Variance tells you how wildly results swing around that average.

### Low variance

Bets that win often with small payouts, like Purple or Silver on a colour wheel, give steadier results. Your balance tends to drift slowly in line with the edge.

### High variance

Bets that win rarely with big payouts, like Green at 14x, give long losing runs broken by occasional big wins. The average cost is the same, but the path is much bumpier.

### Why both matter

- A low edge with high variance can still empty a small budget quickly.
- A high edge with low variance loses steadily.
- Neither changes the long-run cost per dollar wagered.

### Practical impact

If your budget is small, high-variance bets make it more likely you will lose everything before any big win. Lower-variance bets tend to make a session last longer. Neither approach beats the edge. Our [gambling budget guide](/guides/gambling-budget) shows how to size sessions for this.`,
    },
    {
      id: "myths",
      title: "Myths about the house edge",
      body: `- **"I can beat the edge with a betting system."** No. Progressive systems like the [Martingale strategy](/guides/martingale-strategy) change the pattern of wins and losses, not the average cost per bet.
- **"A hot streak means the edge is off."** Short-term results vary. The edge only shows over many bets.
- **"The house edge is what I will lose per session."** Only on average, and only as a share of total wagered.
- **"Higher payouts mean a better game."** Not necessarily. What matters is payout relative to probability.
- **"Online games have a higher edge than they show."** On a provably fair game, you can verify each result follows the published method, so the stated odds are the real odds. See our [provably fair casino guide](/guides/provably-fair-casino).
- **"The casino changes the edge when I am winning."** With published rules and verifiable results, it cannot do so without detection.`,
    },
    {
      id: "use",
      title: "Using the house edge to play smarter",
      body: `You cannot beat the house edge, but you can use it to make informed choices.

1. **Compare games.** Choose games and bets with lower edges if cost matters to you.
2. **Avoid high-edge side bets.** They look exciting but usually cost much more.
3. **Count total wagered.** Multiply your stake, bets per hour and hours played, then apply the edge to estimate the cost of a session.
4. **Prefer low-fee PvP.** Where fees are low, the average cost of play is lower.
5. **Set limits.** Use the estimated cost to set a budget and time limit.
6. **Check the rules.** Small rule changes, like single vs double zero, can double the edge.

For example, 30 minutes of $1 roulette bets at one bet every 30 seconds is 60 bets, or $60 wagered. At 6.67%, the average cost is about $4. At 2.70%, it is about $1.62. The session feels similar, but the costs are different.`,
    },
    {
      id: "next",
      title: "See it on PVPspinArena",
      body: `You can check how each PVPspinArena game works, including its fee and payout rules, on [how it works](/how-it-works). The [Roulette page](/roulette) shows the wheel layout so you can count slots and calculate the edge yourself, and the [Fairness page](/fairness) lets you verify that each result followed the published method. Try working out the edge before your next session: it takes a minute and tells you more about what you are paying for than any promotion ever will.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `The house edge is the average share of each bet a game keeps over the long run, created by paying winners slightly less than true odds. RTP is 100% minus the edge. You can calculate it from probabilities and payouts, and it applies to total wagered, not to your deposit.

Edges range from about 0.5% for blackjack with good strategy to 50% for many lotteries. European roulette sits at 2.70% and American at 5.26%. In PvP games, the house does not bet, so the fee is the edge, and on PVPspinArena that fee defaults to 0%.

Variance decides how bumpy results are, but no system changes the edge. Use it to compare games, estimate session costs and set a sensible budget.`,
    },
  ],
  faqs: [
    {
      q: "What does house edge mean?",
      a: "It is the average percentage of each bet a casino game keeps over many bets. A 3% edge means players get back about $97 for every $100 wagered on average.",
    },
    {
      q: "What is the difference between house edge and RTP?",
      a: "They are two sides of the same number. RTP is the average share returned to players; house edge is 100% minus RTP.",
    },
    {
      q: "Which casino game has the lowest house edge?",
      a: "Blackjack with correct basic strategy is usually lowest, around 0.5%. Baccarat's banker bet and craps' pass line are also low, at about 1% to 1.5%.",
    },
    {
      q: "Do PvP games have a house edge?",
      a: "Not in the traditional sense. Players bet against each other, so the site's only take is its fee. On PVPspinArena, the default house fee is 0%.",
    },
    {
      q: "Can I beat the house edge?",
      a: "Not over the long run. Betting systems change how results are distributed but not the average cost per bet. Only a lower edge or fee reduces that cost.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: house edge of casino games", url: "https://wizardofodds.com/gambling/house-edge/" },
    { label: "Wikipedia: Casino game (house advantage)", url: "https://en.wikipedia.org/wiki/Casino_game#House_advantage" },
    { label: "Wikipedia: Return to player", url: "https://en.wikipedia.org/wiki/Return_to_player" },
  ],
  related: ["martingale-strategy", "roulette-colors", "coin-flip-odds", "crypto-jackpot"],
  updated: "2026-09-25",
};

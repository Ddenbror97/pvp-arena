import type { Guide } from "./types";

export const guide: Guide = {
  slug: "roulette-colors",
  cluster: "Games & odds",
  keyword: "roulette colors",
  secondary: [
    "roulette wheel colors",
    "red and black roulette",
    "green in roulette",
    "roulette color odds",
  ],
  title: "Roulette Colors Explained: Red, Black, Green and Odds",
  description:
    "What roulette colors mean on classic and coloured crypto wheels, the odds and payouts of each color, why green exists, and common color betting myths.",
  h1: "Roulette colors explained: red, black, green and the odds",
  answer:
    "Roulette colors split the wheel into groups you can bet on. On a classic wheel, 18 pockets are red, 18 are black and one (European) or two (American) are green zeros. Red and black pay 2x; green pays much more but hits rarely. The green pockets are what give the house its edge. Coloured crypto wheels, like PVPspinArena's 16 Purple, 16 Silver and 1 Green, use the same idea with fewer slots.",
  facts: [
    "A European wheel has 37 pockets: 18 red, 18 black and 1 green zero.",
    "An American wheel has 38 pockets: 18 red, 18 black and 2 green (0 and 00).",
    "On a European wheel, red wins with probability 18/37, about 48.65%.",
    "PVPspinArena's wheel has 33 slots: 16 Purple (2x), 16 Silver (2x), 1 Green (14x).",
    "Previous colors never change the probability of the next spin.",
  ],
  sections: [
    {
      id: "classic",
      title: "The colors on a classic roulette wheel",
      body: `A traditional roulette wheel has numbered pockets, and each number has a color. Numbers 1 to 36 alternate between red and black around the wheel, and the zero pocket is green. American wheels add a second green pocket, marked 00.

The colors are not decoration. They create the simplest bets in the game. Instead of choosing one of 37 numbers, you can choose a color and win on almost half the wheel.

### Why the colors alternate

The layout spreads red and black evenly so that neither color clusters in one area. The order of numbers is also arranged so that high and low, odd and even, are mixed around the wheel. This makes the wheel look balanced, but the balance is only visual. What matters for the odds is how many pockets each color has.

### Color counts at a glance

- **European (single zero)**: 18 red, 18 black, 1 green.
- **American (double zero)**: 18 red, 18 black, 2 green.
- **Some novelty wheels** add extra green or special pockets, which raises the house edge further.

If you are new to casino words like pocket, payout and edge, our [casino terminology guide](/guides/casino-terminology) explains them.

Where those colors sit on the felt, including the outside bets, is the [roulette table layout](/guides/roulette-table-layout).`,
    },
    {
      id: "green",
      title: "Why green exists: the house edge",
      body: `If a wheel had only 18 red and 18 black pockets, a bet on red would win exactly half the time. Paying 2x on a 50% chance is a fair bet: over time, nobody would win or lose.

The green pocket breaks that balance. On a European wheel, red wins on 18 of 37 pockets, not 18 of 36. The payout stays at 2x, so the expected return per $1 is 18/37 × 2 = $0.973. The missing 2.7 cents is the house edge.

On an American wheel, two green pockets make it worse: 18/38 × 2 = $0.947, a 5.26% edge.

### Green as a bet

On a classic wheel you can bet on zero directly. It is a single number, so it pays 36x on European and American wheels. The chance is 1/37 or 1/38.

### The green rules

Some European tables apply "la partage" or "en prison" rules when zero hits, returning half of even-money bets or holding them for another spin. These rules lower the edge on color bets to about 1.35%. They are uncommon online, so check the rules first.

For the full maths behind these numbers, read our [house edge guide](/guides/house-edge).`,
    },
    {
      id: "odds-table",
      title: "Roulette color odds and payouts",
      body: `Here are the numbers for the most common color bets.

### European roulette

- Red: 18/37 = 48.65%, pays 2x, house edge 2.70%.
- Black: 18/37 = 48.65%, pays 2x, house edge 2.70%.
- Green (0): 1/37 = 2.70%, pays 36x, house edge 2.70%.

### American roulette

- Red: 18/38 = 47.37%, pays 2x, house edge 5.26%.
- Black: 18/38 = 47.37%, pays 2x, house edge 5.26%.
- Green (0 or 00 single number): 1/38 = 2.63%, pays 36x, house edge 5.26%.

### PVPspinArena coloured wheel

- Purple: 16/33 = 48.48%, pays 2x, about 96.97% before the win fee.
- Silver: 16/33 = 48.48%, pays 2x, about 96.97% before the win fee.
- Green: 1/33 ≈ 3.03%, pays 14x, about 42.42% before the win fee.

Purple and Silver cost the same. Green costs much more. The difference is both price and variance. Green hits rarely and pays a lot; red, black, Purple and Silver hit often and pay little. You can compare this with a pure [coin flip's odds](/guides/coin-flip-odds), where there is no green at all.`,
    },
    {
      id: "crypto-wheels",
      title: "Coloured wheels on crypto and CS2 sites",
      body: `Crypto and CS2-style roulette usually drops the numbers and uses a smaller wheel with two main colors and one rare color. The format became popular on skin sites during the CS:GO era, as covered in our [CS2 roulette guide](/guides/cs2-roulette).

### How PVPspinArena's wheel works

The [Roulette](/roulette) wheel has 33 slots: 16 Purple, 16 Silver and 1 Green. Purple and Silver pay 2x. Green pays 14x. Each round runs on a fixed cycle: betting opens, bets lock, the wheel spins for about seven seconds and the result is settled on the server.

### Why fewer slots

A 33-slot wheel is easy to read at a glance and suits fast rounds. It also makes the rare color more frequent than zero on a classic wheel: Green hits about once in 33 spins on average, compared with once in 37 on a European wheel.

### What stays the same

The logic is the classic one. Two common colors pay roughly even money, and one rare color gives the house its edge. After the 5% win fee, Purple and Silver return about 92.12% and Green about 40.30%. Purple and Silver are the same price, and Green is a much more expensive long shot.

### Checking the result

Each round is provably fair. You can check any round number on the [fairness page](/fairness), as explained in our [provably fair roulette guide](/guides/provably-fair-roulette).`,
    },
    {
      id: "myths",
      title: "Roulette color myths",
      body: `Colors attract more superstition than any other bet. These are the most common myths.

### "Red is due after a run of black"

This is the gambler's fallacy. Each spin is independent. After ten black results in a row, red has exactly the same chance as always. The wheel has no memory.

### "Green hasn't hit in a while, so it is coming"

Same fallacy. On a 33-slot wheel, going 30 spins without Green is not unusual. The probability of no Green in 30 spins is (32/33)^30, about 13%.

### "Following the trend works"

Betting on whatever color hit last does not change your odds either. Streaks are normal in random sequences.

### "History boards show patterns"

Result history is useful for checking that a game is running, not for predicting it. Any pattern you see is random clustering.

### "Doubling on a color guarantees a win"

The Martingale system doubles your stake after each loss. It turns many small wins into rare, very large losses and runs into table limits or empty bankrolls. We cover it in detail in our [martingale strategy guide](/guides/martingale-strategy).

Understanding these myths is also a good way to spot when play is turning into chasing losses.`,
    },
    {
      id: "choosing",
      title: "Which roulette color should you bet on?",
      body: `Mathematically, it does not matter on a single wheel. Every color bet has the same house edge. What changes is the shape of your results.

### Common colors (red, black, Purple, Silver)

- Win often, roughly half of the time.
- Small wins that equal your stake.
- Balance moves slowly, and sessions last longer on the same budget.

### Rare colors (green)

- Win rarely.
- Big wins when they hit.
- Long losing runs are normal.

### A simple example

Imagine 150 bets of $1 each on PVPspinArena's wheel.

- On Purple, you would expect about 70 wins of $2 each, returning about $140.
- On Green, you would expect about 10 wins of $14 each, also returning about $140.

The average is the same. But on Green, it is quite possible to hit only 5 times (returning $70) or 15 times (returning $210). On Purple, the spread is much narrower.

### The real choice

Choose based on how much variance you are comfortable with and how long you want your budget to last. Then decide on a loss limit before you start. Our [gambling budget guide](/guides/gambling-budget) has a simple method.`,
    },
    {
      id: "comparison",
      title: "Classic vs coloured wheels compared",
      body: `If you are used to casino roulette, here is how a crypto coloured wheel compares.

### Number of outcomes

A classic wheel has 37 or 38 pockets and dozens of bet types: single numbers, splits, streets, dozens, columns and more. A coloured wheel usually has only three bets: two common colors and one rare color.

### Cost

European roulette is the cheapest at 2.70%. American is 5.26%. PVPspinArena's coloured wheel has about a 7.88% Purple or Silver edge after the win fee, which funds the game because the house banks Roulette bets. Jackpot and Coinflip are different: they are player vs player, so the house does not bet and only takes a fee, which defaults to 0%.

### Speed

Coloured wheels run on a fixed timer with short rounds. That makes them fast, and fast games raise the total you wager per hour. A lower edge on a slow game can cost less per hour than a higher edge on a fast one, and vice versa.

### Transparency

Many land-based and online wheels rely on trust in physical equipment or a certified RNG. Provably fair wheels let you check each round with the seeds. Our [RNG vs provably fair guide](/guides/rng-vs-provably-fair) compares both models.

### Currency

Crypto wheels usually settle in stablecoins like USDC. On PVPspinArena, all amounts are held and shown in USD. See our [crypto roulette guide](/guides/crypto-roulette) for the payment side.`,
    },
    {
      id: "summary",
      title: "Key takeaways",
      body: `- Roulette colors group the wheel into simple bets.
- Red and black each cover 18 pockets; green covers one or two.
- Green is what gives classic roulette its house edge.
- On a classic single-zero wheel, red, black and a straight-up zero share one edge; colour choice only changes variance.
- PVPspinArena's wheel uses 16 Purple, 16 Silver and 1 Green, with 2x, 2x and 14x payouts. Purple and Silver return 32/33. Green returns 14/33.
- Past colors do not predict future spins.
- Betting systems like Martingale do not change the edge.

If you want to try the wheel, set a limit first, keep bets small relative to your balance and check a round or two on the fairness page so you know how verification works. The [How it works](/how-it-works) page covers the round cycle in detail.`,
    },
    {
      id: "history",
      title: "Where roulette colors came from",
      body: `Roulette developed in France in the 18th century, and the red and black layout has been part of the game for most of its history. The single green zero became the standard in Europe in the 19th century, while many American casinos kept the double zero, which gives the house a bigger edge.

The coloured wheels used on crypto sites are a much newer idea. They keep the red and black logic but swap in brand colors and cut the wheel down to a handful of slots, so a round can be read in a second. The rare color keeps the classic role of the green zero: it is the pocket that pays the most and gives the house its edge.

More games & odds reading lives in our [Games & odds guides](/guides/topics/games-and-odds).

European and French layouts use the same colours; the rule that changes the price is [French roulette](/guides/french-roulette).`,
    },
  ],
  faqs: [
    {
      q: "How many red and black numbers are on a roulette wheel?",
      a: "There are 18 red and 18 black numbers on both European and American wheels. The difference is the green: one zero in European, two in American.",
    },
    {
      q: "What are the odds of green in roulette?",
      a: "On a European wheel, 1 in 37 (about 2.70%). On an American wheel, 1 in 38 per green number. On PVPspinArena's 33-slot wheel, 1 in 33 (about 3.03%).",
    },
    {
      q: "Is it better to bet on red or black?",
      a: "Neither. They have the same number of pockets, the same payout and the same house edge. Past results do not change the next spin.",
    },
    {
      q: "Why does green pay 14x on crypto roulette?",
      a: "On a 33-slot wheel, green wins once in 33 spins. Paying 14x instead of a fair 33x is why Green returns 14/33. Purple and Silver return 32/33.",
    },
    {
      q: "Can I predict the next roulette color from history?",
      a: "No. Each spin is independent. History shows what happened, not what will happen next.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: Roulette", url: "https://wizardofodds.com/games/roulette/" },
    {
      label: "Encyclopaedia Britannica: Roulette",
      url: "https://www.britannica.com/topic/roulette",
    },
  ],
  related: [
    "crypto-jackpot",
    "how-to-win-at-roulette",
    "house-edge",
    "coin-flip-odds",
    "crypto-roulette",
    "french-roulette",
  ],
  updated: "2026-09-25",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "gamblers-fallacy",
  cluster: "Games & odds",
  keyword: "gambler's fallacy",
  secondary: ["gamblers fallacy examples", "monte carlo fallacy", "hot hand fallacy", "gambler's fallacy roulette"],
  title: "Gambler's Fallacy: Why Past Results Don't Matter",
  description:
    "What the gambler's fallacy is, why our brains fall for it, examples from roulette and coin flips, the hot-hand fallacy, and how to stop it shaping your bets.",
  h1: "Gambler's fallacy: why past results don't change the next one",
  answer:
    "The gambler's fallacy is the mistaken belief that a random outcome becomes more or less likely because of what happened before. After five reds in a row, many players feel black is \"due\". It is not. Each spin, flip or draw is independent, so the chance on the next round is exactly the same as on the first. Recognising the fallacy is one of the simplest ways to avoid chasing losses.",
  facts: [
    "Independent events have no memory: past results do not change future probabilities.",
    "It is also called the Monte Carlo fallacy, after a famous 1913 roulette streak.",
    "The opposite belief, that a streak will continue, is called the hot-hand fallacy.",
    "On a 15-slot wheel, going 30 spins without Green happens about 13% of the time.",
    "The fallacy often leads to raising bets after losses, a common warning sign of problem gambling.",
  ],
  sections: [
    {
      id: "what",
      title: "What is the gambler's fallacy?",
      body: `The gambler's fallacy is a thinking error about randomness. It is the belief that if something has happened more often than expected recently, it will happen less often in the future, or the reverse. The error is treating separate random events as if they were connected.

### A simple example

You flip a fair coin five times and get heads every time. What is the chance the sixth flip is tails?

The intuitive answer is "more than 50%". The correct answer is exactly 50%. The coin does not know what happened before. Each flip is a fresh event with the same two outcomes and the same odds.

### Where the name comes from

The best-known example happened at the Monte Carlo Casino in 1913, when black is reported to have come up 26 times in a row on a roulette wheel. Players are said to have lost large sums betting on red, convinced it was overdue. That is why the error is also called the Monte Carlo fallacy.

### Why it matters

The fallacy is not just a curiosity. It changes how people bet. If you think a result is due, you are more likely to bet bigger on it, and bigger bets on a false belief cost more. If terms like probability and independence are new, our [casino terminology guide](/guides/casino-terminology) covers them.`,
    },
    {
      id: "why-brain",
      title: "Why our brains fall for it",
      body: `The gambler's fallacy is extremely common, including among people who know the maths. There are good reasons for that.

### We expect small samples to look balanced

Over millions of coin flips, heads and tails come out very close to 50/50. People expect that balance to show up in short runs too. So a run of five heads feels wrong, and our brain predicts a correction. In reality, short sequences are lumpy. Balance only appears over very large numbers of trials.

### We see patterns everywhere

Humans are pattern-seeking by nature. Spotting patterns helped our ancestors survive, but it also makes us see meaning in random noise. A streak on a result board looks like a trend, even when it is pure chance.

### Many real-life events are not independent

In daily life, things often do balance out. If it has rained for a week, a dry day may well be closer. If a card has been dealt from a small deck, it cannot be dealt again. Our intuition is trained on these dependent situations and wrongly applies them to independent ones like a roulette spin.

### Losses feel personal

After a string of losses, it can feel like you have "earned" a win. The wheel does not keep score. That feeling is emotion, not probability.`,
    },
    {
      id: "roulette",
      title: "The gambler's fallacy in roulette",
      body: `Roulette is where the fallacy is most visible, because tables display the last results.

### Colour streaks

On PVPspinArena's [Roulette](/roulette) wheel, there are 7 Purple, 7 Silver and 1 Green slot. Purple wins 7 out of 15 spins, about 46.67%, on every single spin. That is true after one Purple, after ten Purples and after ten Silvers.

### Waiting for Green

Green has a 1 in 15 chance each spin. Many players watch the history and wait for Green to be "due". Here is how often long gaps happen purely by chance:

- No Green in 15 spins: about 36%.
- No Green in 30 spins: about 13%.
- No Green in 45 spins: about 4.5%.

Long droughts are normal. After a 30-spin gap, the chance of Green on the next spin is still 1 in 15.

### What the history board is for

A result history is useful for seeing that rounds are running and for checking specific rounds on the [fairness page](/fairness). It is not a forecast. Our [roulette colors guide](/guides/roulette-colors) explains why every colour bet on the same wheel has the same edge.`,
    },
    {
      id: "coin-flips",
      title: "The gambler's fallacy with coin flips",
      body: `Coin flips are the purest example because there are only two outcomes.

### Streaks are more common than people think

In 100 fair flips, you are very likely to see at least one run of six or more heads or tails in a row. Many people, asked to write a "random-looking" sequence, avoid streaks that long. Real randomness is streakier than our intuition.

### The probability of a streak versus the next flip

These are two different questions:

- The chance of getting 6 heads in a row, before you start, is 1/64, about 1.6%.
- The chance of the 6th flip being heads, after 5 heads have already happened, is 1/2.

The rare part has already happened. It does not affect the final flip.

### PvP coinflip

On PVPspinArena [Coinflip](/coinflip), two players stake the same amount and one flip decides the winner. Whether you won or lost your last five flips, your chance on the next one is 50%. Our [coin flip odds guide](/guides/coin-flip-odds) goes through the numbers and variance in more detail.`,
    },
    {
      id: "hot-hand",
      title: "The hot-hand fallacy: the opposite mistake",
      body: `The gambler's fallacy predicts a streak will reverse. The hot-hand fallacy predicts a streak will continue.

### What it looks like

- "Silver has hit four times, so I will keep betting Silver."
- "I have won three flips in a row, I am on a heater."
- "This wheel is running hot on Green today."

In independent games, none of these change the odds. Winning streaks and losing streaks are both just random clustering.

### Is the hot hand ever real?

In skill-based activities, such as sport, research has debated whether players can genuinely have streaks of better performance. Some studies suggest a small real effect. But gambling results on fair games do not depend on skill or momentum, so there is no hot hand to ride.

### Why both fallacies are dangerous

Both beliefs encourage bigger bets based on something that is not real. The gambler's fallacy tends to raise bets after losses. The hot-hand fallacy tends to raise bets after wins. Either way, you end up wagering more, and the more you wager, the more the house edge costs you. See our [house edge guide](/guides/house-edge).`,
    },
    {
      id: "betting-systems",
      title: "How the fallacy powers betting systems",
      body: `Many popular betting systems are built on the gambler's fallacy, openly or quietly.

### The martingale

The martingale doubles your stake after each loss, on the logic that a win must come soon. A win will eventually come, but a long losing streak can push the required stake past your bankroll first. Our [martingale strategy guide](/guides/martingale-strategy) shows the maths.

### "Due number" systems

Some players track which outcome has not appeared for longest and bet on it. This is the gambler's fallacy in its purest form.

### Trend following

Betting on whatever hit last is the hot-hand fallacy as a system. It feels different but has the same expected result as betting at random.

### What every system has in common

A system changes bet sizes and timing. It cannot change the probability of any single result or the payout for it. So no system can change the house edge. In a PvP game with a 0% fee, no system can give you an edge over other players either, because each round is still a fair coin or a fair share of a pot.`,
    },
    {
      id: "chasing",
      title: "The gambler's fallacy and chasing losses",
      body: `Chasing losses means gambling more, or betting bigger, to win back money you have already lost. It is one of the clearest warning signs of problem gambling, and the gambler's fallacy often sits behind it.

### How they connect

After a losing run, the fallacy says a win is due. That makes it feel sensible to keep going, or to bet more so the expected win covers the losses. In reality, the next bet has the same odds as always, and bigger bets only increase the potential loss.

### Signs you are falling into it

- You feel you "can't stop now" because the luck must turn.
- You raise your stake after each loss.
- You break your own time or money limits.
- You tell yourself a result is overdue.

### What to do instead

Stop when you hit a loss limit you set before you started. Take a break. Treat money already lost as the cost of entertainment, not a debt the game owes you. Our [gambling budget guide](/guides/gambling-budget) explains how to set limits, and our [how to stop gambling guide](/guides/how-to-stop-gambling) has practical steps if it is becoming hard to stop.`,
    },
    {
      id: "avoid",
      title: "How to avoid the gambler's fallacy",
      body: `Knowing about the fallacy does not make you immune. These habits help.

1. **Say it out loud.** Before a bet, remind yourself: "This round has the same odds as every other round."
2. **Ignore the history board when betting.** Use it for checking fairness, not for choosing bets.
3. **Decide bets before the session.** Choose your stake size and stop rules in advance, not in the moment.
4. **Use flat stakes.** Betting the same amount every round takes away the urge to "catch up".
5. **Set a hard loss limit.** When you reach it, stop, however "due" a win feels.
6. **Check that the game is independent.** On provably fair games, each result comes from its own committed seed. Our [provably fair casino guide](/guides/provably-fair-casino) explains how that works.

### A final thought

Randomness does not balance out in the short run, and it never owes you anything. The more comfortable you are with long streaks being normal, the less power the fallacy has over your decisions. If you want to see the rules for each game written plainly, the [How it works](/how-it-works) page covers all three.`,
    },
  ],
  faqs: [
    {
      q: "What is the gambler's fallacy in simple terms?",
      a: "It is the false belief that a random outcome is more likely because it has not happened recently, or less likely because it has. Independent events have no memory.",
    },
    {
      q: "Why is it called the Monte Carlo fallacy?",
      a: "It is named after a well-known 1913 night at the Monte Carlo Casino, when black reportedly came up 26 times in a row and players lost heavily betting on red.",
    },
    {
      q: "Is the gambler's fallacy the same as the hot-hand fallacy?",
      a: "They are opposites. The gambler's fallacy expects a streak to reverse; the hot-hand fallacy expects a streak to continue. Both are wrong for independent games.",
    },
    {
      q: "Does a long streak mean a roulette wheel is rigged?",
      a: "Not on its own. Long streaks are normal in random results. On a provably fair wheel, you can check each round's result yourself instead of guessing.",
    },
    {
      q: "How does the gambler's fallacy affect betting?",
      a: "It encourages raising bets after losses in the belief that a win is due, which increases total wagered and often leads to chasing losses.",
    },
  ],
  sources: [
    { label: "Encyclopaedia Britannica: Gambler's fallacy", url: "https://www.britannica.com/topic/gamblers-fallacy" },
    { label: "Tversky & Kahneman (1974), Judgment under Uncertainty", url: "https://www.science.org/doi/10.1126/science.185.4157.1124" },
  ],
  related: ["gambling-self-exclusion", "martingale-strategy", "roulette-colors", "coin-flip-odds", "gambling-budget"],
  updated: "2026-09-25",
};

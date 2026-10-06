import type { Guide } from "./types";

export const guide: Guide = {
  slug: "dalembert-strategy",
  cluster: "Games & odds",
  keyword: "d'alembert strategy",
  secondary: [
    "dalembert betting system",
    "d alembert roulette",
    "labouchere vs dalembert",
    "negative progression",
  ],
  title: "D'Alembert Strategy: How It Works and Why It Fails",
  description:
    "The d'alembert strategy: raise one unit after a loss, drop one after a win, worked sequences, and why unit size still dies against the edge.",
  h1: "D'Alembert strategy: one-unit steps and why the edge still wins",
  answer:
    "The d'alembert strategy is a negative progression that moves the stake one unit at a time: up one after a loss, down one after a win, never below the base. It feels safer than doubling because the climb is slow. The failure is the same family as Martingale. Each extra unit still faces the same short payout, so the edge keeps a share of every dollar. A long enough cold run still pushes the stake and the hole past what a normal bankroll can stand.",
  facts: [
    "D’Alembert: +1 unit after a loss, −1 unit after a win, floor at one unit.",
    "It is a negative progression, like Martingale, but linear instead of exponential.",
    "A win does not always clear the prior losses, unlike a completed Martingale.",
    "On a 48.48% colour the system spends more dollars after losses, which is when you are already behind.",
    "Unit size still dies against the edge: more units times minus-EV is a bigger expected hole.",
  ],
  sections: [
    {
      id: "how",
      title: "How the d'Alembert strategy works",
      body: `Jean le Rond d’Alembert’s name is attached to an 18th-century idea that errors cancel: after a miss you were “due” a hit, so you add a unit; after a hit you remove a unit. Modern probability discarded the “due” part. The staking rule survived as folklore.

The operational d'alembert strategy is only the ladder:

1. Choose a unit, say $1, and a starting stake of one unit.
2. If the even-money bet loses, next stake is one unit higher.
3. If it wins, next stake is one unit lower, but not below one unit.
4. Repeat until you stop for a budget or a time limit.

It is meant for 2x bets. It is not meant for Green, parlays or jackpot shares. The [Games and odds topic](/guides/topics/games-and-odds) collects the other progressions. Compare the climb with [Martingale](/guides/martingale-strategy) (doubling) and [Paroli](/guides/paroli-system) (raise on wins). PVPspinArena is 18+.

The name does extra work. An Enlightenment mathematician on the label makes a one-unit ladder sound like a theorem. It is a schedule. Schedules do not move p. If the appeal is “I will not double”, you can not-double with a flat unit and skip the climb that still leaves a hole after the next win.`,
    },
    {
      id: "sequence",
      title: "Worked sequences",
      body: `Base unit $1, Purple-style 2x bet. Start at $1.

### Sequence A — mild chop

| Bet | Stake | Result | Running P/L | Next stake |
| --- | --- | --- | --- | --- |
| 1 | $1 | L | −$1 | $2 |
| 2 | $2 | W | +$1 | $1 |
| 3 | $1 | W | +$2 | $1 |
| 4 | $1 | L | +$1 | $2 |
| 5 | $2 | W | +$3 | $1 |

Five bets, three wins, two losses, +$3. This is the brochure. Notice you needed the $2 win to climb out of the first hole. A flat $1 player with the same W/L string would be +$1 (WWWLL is not this string — here it was L, W, W, L, W: three wins, two losses, +$3 versus flat +$1). The extra $2 came from staking more on a win that happened to follow a loss. That is luck of order, not a theorem.

### Sequence B — six losses then a win

Stakes: $1, $2, $3, $4, $5, $6, then $7 to try to recover. Losses total $21 before the seventh bet. A $7 win pays $14 back, so you are still −$14 after the “recovery” win. D’Alembert does not promise that one win clears the slate. That is the trade versus Martingale: slower growth, incomplete repair.

If the seventh also loses, you are −$28 and looking at an $8 stake. Linear is not the same as small.

### Sequence C — win first, then a slide

Start $1, win (+$1, next $1), lose (0, next $2), lose (−$2, next $3), lose (−$5, next $4), win (−$1, next $3). You have three losses and two wins and you are still minus. The extra units after the first miss did the damage. Flat $1 on the same WLLLW tape is −$1 (two wins, three losses). D’Alembert turned a −$1 tape into a deeper number because the losses arrived in a clump while the stake was climbing. Order matters for the path; it does not matter for p on the next spin.`,
    },
    {
      id: "units",
      title: "Unit size, bankroll and the quiet hole",
      body: `Because the step is $1, people pick a unit that is already large: $5 or $10, thinking they have avoided Martingale insanity. Ten losses in a row then take 1+2+…+10 = 55 units. At $5 that is $275 down, with an 11-unit ($55) bet still to come that will not even fill the hole.

On Purple, 10 losses in a row have probability (17/33)^10 ≈ 0.17%, about 1 in 580 isolated starts — and you get many starts in a long sitting. On a fair coin it would be about 1 in 1,024. The extra slots make the ugly path more common, which is the opposite of what a “balanced” story claims.

### Floor at one unit

The floor matters. After a win at $1 you stay at $1. Winning streaks do not build a reserve the way Paroli tries to. You grind at the base until a loss starts the climb again. The system is almost designed to be at minimum stake when you are winning and above minimum when you are losing. That is the wrong way round if you believed independence, and independence is the truth. A flat unit accepts that truth in the stake. D’Alembert argues with it in the stake and then agrees with it in the result. Save the argument.`,
    },
    {
      id: "edge",
      title: "Why the edge still wins",
      body: `Write EV on each stake: −0.0303 × stake on Purple before the win fee. The d’Alembert path puts larger stakes after losses. Those larger stakes have the same percentage leak. Expected loss on a cycle is the edge times the dollars actually wagered on that cycle, which is larger than the edge times “I only meant to bet one unit”.

A betting system cannot change p or the 2x payout. It can only choose a stake process. Any process that increases exposure after losses concentrates money on the worse half of the sample path. [House edge](/guides/house-edge) is collected on exposure.

### Expected units on a 20-bet sitting

There is no closed cancel identity. A rough sense: if you start at 1 and the walk is an integer random walk with a downward drift (because q > p on Purple), the stake process spends a lot of time above 1. Average stake of 2 to 3 units over 20 bets is ordinary. That is $40 to $60 turned over at a $1 unit, expected leak about $2.70 to $4.00, plus a left tail if the walk goes to 8 or 10. Flat $1 for 20 bets turns over $20 and leaks about $1.33. The strategy costs more because it wagers more, not because the wheel changed.

### Labouchere versus d’Alembert

Labouchere (cancellation) uses a list of numbers and bets the sum of the ends; you cross out numbers after wins and add the lost stake after losses. It is another negative progression with a different schedule. It fails for the same reason: the list blows up on a cold run, and each line is still minus-EV. If a page sells “Labouchere vs d’Alembert” as a skill matchup, both sides are paying the wheel. [Fibonacci](/guides/fibonacci-betting-system) is the same family with a slower, named sequence.`,
    },
    {
      id: "roulette",
      title: "D’Alembert on roulette and even-money PvP",
      body: `### Coloured wheel

Purple or Silver: 16/33, 2x, about a 7.88% edge after the win fee. Rounds are fast, so a linear climb can still eat a stack in a single sitting. Watch the tempo on [Roulette](/roulette) before you decide a unit.

### European and American

Red/black inherits 2.70% or 5.26%. The ladder is unchanged. The leak per dollar is smaller on European, larger on American. D’Alembert does not close the double-zero.

### Coinflip

A 0% fee [Coinflip](/coinflip) is ~0-EV. The strategy then “fails” in a different sense: it does not create profit, it only correlates larger bets with recent losses. Average P/L tends to zero; the path is choppier than [flat betting](/guides/flat-betting). You also need an opponent to match the new unit each time.

### Jackpot

Do not run d’Alembert on [Jackpot](/) tickets. Hit rate is your share of the pot, not ~50%. Adding a unit after a miss is just buying a bigger long shot while tilted.`,
    },
    {
      id: "compare",
      title: "Compared with Martingale, Paroli and Fibonacci",
      body: `| System | After loss | After win | Growth | Typical bust mode |
| --- | --- | --- | --- | --- |
| Martingale | Double | Reset to 1 | Exponential | Table max / ruin on a streak |
| D’Alembert | +1 unit | −1 unit | Linear | Slow hole that one win does not fill |
| Fibonacci | Next number | Step back two | Faster than linear, slower than ×2 | Long losing sequence |
| Paroli | Reset to 1 | Raise (often ×2) | Pyramid on wins | Many −1 unit cycles |

None of the four rewrites p. Pick among them only if you are choosing a *distribution shape* you already understand is minus-EV. The grown-up choice is flat units and a stop.

If you still want a d’Alembert-shaped night for folklore reasons, cap the pointer: never go above 3 units, and treat hitting 3 as a session warning, not as “the system is working”. That cap is a budget in disguise. Be honest that the disguise is doing the useful work.`,
    },
    {
      id: "safer",
      title: "Limits and safer play",
      body: `If you want the psychological comfort of “I have a rule”, use rules that shrink risk:

- one unit, never increased after a loss;
- a session loss cap in dollars, not in “I’ll stop when the ladder comes back”;
- a time cap, because linear systems invite “just one more step”;
- no borrowed units.

The d'alembert strategy fails because unit size still dies against the edge. A slower death is not a win. If you are already stepping the unit to recover a mood, that is chase. Stop and read the [responsible gambling](/responsible-gambling) page. Verify past rounds on [fairness](/fairness) if you need to see that the Ls were real; then leave the ladder in the 18th century. Gambling is 18+. If you want one number to keep: a linear climb still multiplies the edge by extra units, and one win does not settle the account. Write the running hole in dollars, not in “steps back to one”. When the hole is larger than the session cap, the strategy is over, whether the pointer says 3 or 9. Linear steps feel civilised right up until you add them. Add them on paper first.

Labouchere is the cancellation cousin of d'Alembert; see the [Labouchere system](/guides/labouchere-system).`,
    },
  ],
  faqs: [
    {
      q: "How does the d'Alembert strategy work?",
      a: "You raise the even-money stake by one unit after a loss and lower it by one unit after a win, with a floor at one unit. It is a linear negative progression.",
    },
    {
      q: "Does the d'Alembert strategy work on roulette?",
      a: "No. It changes the size of bets, not the 2.70%, 5.26% or that colour's own edge you are playing. Long losing runs still open a hole one win will not close.",
    },
    {
      q: "Is d’Alembert safer than Martingale?",
      a: "The stake grows more slowly, so you hit the table max later. You also fail to recover a streak with a single win. Safer growth is not a long-run profit.",
    },
    {
      q: "How is Labouchere different from d’Alembert?",
      a: "Labouchere uses a cancellation list and bets the sum of the end numbers. Both are negative progressions that expand after losses and stay minus-EV per dollar.",
    },
    {
      q: "What unit should I use?",
      a: "If you play at all, pick a unit you can lose dozens of times without touching rent money. The system does not make a large unit safe. Prefer flat betting that unit.",
    },
    {
      q: "Can d’Alembert beat a 0% fee coinflip?",
      a: "It cannot create an edge. On a fair 50/50 the average is about zero, with lumpier swings than a constant stake. Matching opponents may refuse the stepped size.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: betting systems",
      url: "https://wizardofodds.com/gambling/betting-systems/",
    },
    {
      label: "Wikipedia: D'Alembert system",
      url: "https://en.wikipedia.org/wiki/D%27Alembert_system",
    },
    {
      label: "Encyclopaedia Britannica: probability",
      url: "https://www.britannica.com/science/probability-theory",
    },
  ],
  related: [
    "crypto-jackpot",
    "fibonacci-betting-system",
    "kelly-criterion",
    "blackjack-basic-strategy",
    "card-counting",
    "labouchere-system",
    "flat-betting",
  ],
  updated: "2026-09-26",
};

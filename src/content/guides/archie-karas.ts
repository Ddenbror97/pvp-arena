import type { Guide } from "./types";

export const guide: Guide = {
  slug: "archie-karas",
  cluster: "Casino knowledge",
  keyword: "archie karas",
  secondary: [
    "archie karas the run",
    "biggest gambling streak",
    "archie karas craps",
    "archie karas $40 million",
  ],
  title: "Archie Karas: The Run From $50 to $40M and Back to Zero",
  description:
    "Archie Karas reportedly ran $50 into about $40 million in Las Vegas from 1992 to 1995, then lost it at dice and baccarat. The story and the risk-of-ruin maths.",
  h1: "Archie Karas: the Run from $50 to $40 million, and the fall",
  answer:
    "Archie Karas is a Greek-American gambler known for 'the Run', a reported winning streak in Las Vegas from late 1992 to 1995 in which he turned about $50 into roughly $40 million through pool, high-stakes poker and dice. In 1995 he lost almost all of it within weeks, mostly at craps and baccarat. The figures are reported, not audited, but the arc is a textbook risk-of-ruin lesson.",
  facts: [
    "Born Anargyros Karabourniotis in Greece in 1950.",
    "Arrived in Las Vegas in December 1992 with about $50, according to the usual account.",
    "Reported peak of around $40 million by early 1995, built through pool, poker and dice.",
    "Lost nearly all of it in 1995, mostly at craps and baccarat at Binion's Horseshoe.",
    "Going from $50 to $40 million is about 19.6 doublings; twenty straight fair doublings have odds of about 1 in a million.",
  ],
  sections: [
    {
      id: "background",
      title: "Who Archie Karas is",
      body: `Archie Karas was born Anargyros Karabourniotis in 1950 in Greece. The commonly told biography says he grew up poor, left home as a teenager to work on ships, and eventually settled in Los Angeles, where he worked as a waiter and found he could make more money playing pool and cards than serving tables. Most of this detail comes from interviews Karas gave years later, so treat it as his account.

By the early 1990s he was a high-stakes poker player in the Los Angeles card rooms. In the usual version of the story, he lost almost all of his money there in late 1992 and drove to Las Vegas with around $50.

### Why this story is hard to verify

There is no ledger of the Run. The numbers come from Karas himself, from people who played against him, and from journalists who reconstructed events years later. Casinos did not publish his results, and several of the key opponents are named only as "a wealthy player". The broad shape is well attested by people who saw it: a gambler who built an enormous bankroll very fast and lost it faster. The exact figures should always be read as "reported".

That makes Karas a slightly different entry from the other profiles in the [famous gamblers overview](/guides/famous-gamblers) and the wider [casino knowledge topic hub](/guides/topics/casino-knowledge). Players like [Stu Ungar](/guides/stu-ungar) left tournament records. Karas left a story, and the lesson in it is mathematical rather than biographical.`,
    },
    {
      id: "the-run",
      title: "The Run, stage by stage",
      body: `Accounts of the Run differ in detail. The version most often repeated goes like this.

| Stage | Reported period | What happened | Reported bankroll after |
| --- | --- | --- | --- |
| Arrival | December 1992 | Arrives in Las Vegas with about $50 | ~$50 |
| Stake | Soon after | Borrows $10,000 from a poker acquaintance | ~$10,000 |
| Pool | Early 1993 | Wins high-stakes pool games against a wealthy player, reportedly up to $40,000 a game | ~$1.2 million |
| Poker | 1993 | Beats the same player at poker, then plays top professionals at razz and seven-card stud | several million |
| Dice | 1993–1995 | Bets heavily at craps at Binion's Horseshoe | ~$40 million |
| Collapse | 1995 | Loses nearly everything at craps and baccarat within weeks | near zero |

The poker opponents named in retellings include some of the best high-stakes players of the era. Because those matches were private, results cannot be checked; the claim that he beat several famous professionals is widely repeated but not documented.

### The Binion's chips

One of the most repeated details is that at his peak Karas held all of Binion's Horseshoe's $5,000 chips, reportedly so many that the casino had to deal with him in cash or other denominations. It is a vivid image and is consistent with his bets being among the largest the casino took. It is also exactly the kind of detail that grows in retelling.

### How it ended

In 1995 Karas moved heavily into craps and baccarat, games where the house has an edge on every bet. Accounts describe him losing around $11 million at baccarat and most of the rest at dice in about three weeks. He reportedly tried to rebuild several times afterward and lost those bankrolls too.`,
    },
    {
      id: "doubling",
      title: "What $50 to $40 million means in doublings",
      body: `The fastest way to understand the Run is to count doublings.

$40,000,000 / $50 = 800,000. Since 2^19 = 524,288 and 2^20 = 1,048,576, going from $50 to $40 million takes about log2(800,000) ≈ 19.6 doublings.

### A thought experiment

Suppose you tried to copy the Run on a perfectly fair coin, betting everything each time.

- P(win 1 in a row) = 1/2
- P(win 10 in a row) = 1/1,024
- P(win 20 in a row) = 1/1,048,576

Twenty straight fair doublings happen about once in a million attempts. On games with a house edge, the odds are worse. Karas did not literally bet everything on twenty coin flips, and some of his early stages were games of skill where he may have had a real edge. But the order of magnitude explains why stories like his are so rare and why they tend to end the way his did.

### Even a real edge does not save an all-in ladder

Suppose Karas really did have a strong edge in the early skill stages, say a 55% chance of winning each contest. If he had staked everything on each of twenty consecutive doublings, his chance of surviving all twenty would be 0.55^20 ≈ 0.0000064, about 1 in 156,000. A big edge improves the odds by a factor of about seven compared with a fair coin, and still leaves the full ladder almost impossible. Real bankroll growth by skilled players happens through many smaller bets, each a fraction of the bankroll, which is exactly what an all-or-nothing run does not do.

### Survivor bias

For every gambler who strings together an improbable run, many more attempt it and lose early. Those players do not become stories. When a run like the Run is retold, the audience sees one survivor out of an unknown number of attempts. The [law of large numbers](/guides/law-of-large-numbers-gambling) is the other half of the picture: over enough bets, results converge on the expected value, and the expected value of a casino bet is negative.`,
    },
    {
      id: "ruin",
      title: "The risk-of-ruin lesson at the craps table",
      body: `Karas's collapse happened on games with a small, fixed house edge. That edge is exactly what makes long play fatal.

| Bet | Win probability | House edge | Expected loss per $1 million wagered |
| --- | --- | --- | --- |
| Craps pass line | 244/495 ≈ 49.29% | 1.41% | about $14,100 |
| Baccarat banker | about 45.9% win, 44.6% loss, rest ties | 1.06% | about $10,600 |
| Baccarat player | about 44.6% win, 45.9% loss, rest ties | 1.24% | about $12,400 |

Those are among the best bets in a casino. At the size Karas was betting, reportedly hundreds of thousands of dollars per roll or hand, even these edges cost large amounts per hour. Over thousands of decisions, the expected loss compounds into most of a bankroll.

### Gambler's ruin with a small edge against you

The classic gambler's ruin formula shows how the house edge interacts with bet size. On the pass line, p ≈ 0.4929 and q ≈ 0.5071, so r = q/p ≈ 1.0287. The probability of going broke before doubling a bankroll of n units, betting one unit at a time, is (r^n − r^2n) / (1 − r^2n).

- Bankroll of 1 unit (one bet for everything): ruin ≈ 50.7%.
- Bankroll of 10 units: ruin before doubling ≈ 57%.
- Bankroll of 100 units: ruin before doubling ≈ 94%.

On a negative-edge game, small bets and long play make doubling less likely, not more. And a player who never stops, who keeps playing after doubling, is ruined with probability that approaches 100%. The [risk of ruin guide](/guides/risk-of-ruin) covers the formula, and [craps odds](/guides/craps-odds) lists the edge on every bet.

### The Kelly view

The [Kelly criterion](/guides/kelly-criterion) says the optimal bet on a negative-EV proposition is zero. Karas's early stages may have had an edge; the dice stage did not.`,
    },
    {
      id: "after",
      title: "Life after the Run",
      body: `After 1995, Karas continued to gamble, according to people who knew him, and reportedly built and lost smaller bankrolls several times. He never approached his 1995 peak again.

Later press coverage reported legal trouble. In 2013 he was arrested in California over allegations of marking cards at a casino blackjack table, and news reports say the case ended with a plea. Nevada later added him to its List of Excluded Persons, the register often called the Black Book, which bars listed people from entering licensed casinos in the state. These details are drawn from news reports rather than a court record reviewed here, so treat them as reported.

### How to read his story fairly

It is easy to tell the Run as a morality play. A more useful reading is technical:

- **He may have had a real edge early.** Pool and poker are games where a strong player can win consistently. That is how a bankroll can grow quickly from a stake.
- **He moved to games where no edge was possible.** Craps and baccarat outcomes cannot be influenced by skill. Every dollar there has negative expectation.
- **Scale made the edge bite faster.** The house edge is a percentage; bet millions and it costs tens of thousands per hour.
- **There was no stopping rule.** A player who plans to quit after doubling has a chance to keep money. A player who keeps playing gives the edge unlimited time.

Nothing in that list is unique to Karas. It describes what happens to anyone who treats a lucky run as proof of skill on a game that has none. For the psychology behind that, see [gambler's fallacy](/guides/gamblers-fallacy).`,
    },
    {
      id: "pvp",
      title: "The Run and a hashed PvP round",
      body: `PVPspinArena runs three player-vs-player games, and the same arithmetic governs all of them.

- **Coinflip**: two players, 50/50. The winner takes the pot minus any fee shown before entry. A string of flips is a string of independent coin tosses; twenty in a row is about 1 in a million.
- **Jackpot**: your win chance equals your share of the pot. A 5% share wins about 1 time in 20.
- **Roulette**: a 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. That edge is larger than the craps and baccarat edges that consumed Karas's bankroll, so the same risk-of-ruin logic applies faster.

Each result comes from seeds committed before the round and revealed after settlement. You can check any settled round on the [fairness](/fairness) page, which confirms the result was not changed. It does not change the odds.

If a run of wins on [Roulette](/roulette) or Coinflip is making bigger stakes feel safe, the Run is the counterexample. Decide a stopping point before you start, keep stakes small relative to what you can afford, and use the [responsible gambling](/responsible-gambling) tools if you need a hard limit. Gambling is 18+.`,
    },
  ],
  faqs: [
    {
      q: "How much did Archie Karas win?",
      a: "The commonly reported peak is about $40 million, built from around $50 between late 1992 and early 1995. The figures come from his and others' accounts rather than audited records.",
    },
    {
      q: "How did Archie Karas lose his money?",
      a: "Mostly at craps and baccarat in 1995, reportedly within about three weeks. Both games carry a house edge on every bet, which is fatal at very large stakes over long play.",
    },
    {
      q: "Is the Archie Karas story true?",
      a: "The broad arc is attested by people who witnessed it, but the stage-by-stage figures and some opponents' identities are not documented. Treat the numbers as reported.",
    },
    {
      q: "What is the lesson of the Run?",
      a: "Risk of ruin. On a game with a house edge, long play at large stakes loses on average, and a player with no stopping rule eventually loses everything.",
    },
    {
      q: "How unlikely is turning $50 into $40 million?",
      a: "It is about 19.6 doublings. Twenty consecutive fair doublings occur roughly once in 1,048,576 attempts, and house-edge games make it less likely still.",
    },
  ],
  sources: [
    { label: "Wikipedia: Archie Karas", url: "https://en.wikipedia.org/wiki/Archie_Karas" },
    { label: "Wikipedia: Gambler's ruin", url: "https://en.wikipedia.org/wiki/Gambler%27s_ruin" },
    { label: "Wizard of Odds: craps", url: "https://wizardofodds.com/games/craps/" },
  ],
  related: [
    "famous-gamblers",
    "stu-ungar",
    "risk-of-ruin",
    "kelly-criterion",
    "billy-walters",
    "kerry-packer",
  ],
  updated: "2026-09-27",
};

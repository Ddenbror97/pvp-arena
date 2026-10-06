import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ken-uston",
  cluster: "Casino knowledge",
  keyword: "ken uston",
  secondary: [
    "uston v resorts international",
    "ken uston blackjack",
    "the big player uston",
    "uston card counting",
  ],
  title: "Ken Uston: Blackjack Teams and Uston v. Resorts",
  description:
    "Ken Uston's life explained: big-player blackjack teams, his books, Griffin Investigations, and the 1982 Uston v. Resorts ruling on barring card counters.",
  h1: "Ken Uston: the big player who took card counting to court",
  answer:
    'Ken Uston was an American blackjack player, author and former stock-exchange executive who became the most public face of team card counting in the 1970s and 1980s. He played as the "big player" on Al Francesco\'s teams, exposed their methods in The Big Player (1977), and won Uston v. Resorts International, a 1982 New Jersey Supreme Court case on barring counters.',
  facts: [
    "Born Kenneth Senzo Usui in New York in 1935; died in Paris in 1987, aged 52.",
    "Held a Harvard MBA and was a senior vice president of the Pacific Stock Exchange.",
    "The Big Player (1977) revealed how counting teams used spotters and a big bettor.",
    "In Uston v. Resorts International (1982) the New Jersey Supreme Court held Atlantic City casinos could not bar him for counting alone.",
    "One of the first inductees into the Blackjack Hall of Fame in 2002.",
  ],
  sections: [
    {
      id: "early",
      title: "From Wall Street to the blackjack table",
      body: `Ken Uston was born Kenneth Senzo Usui in New York in 1935; his father was Japanese. He entered Yale young, later earned an MBA at Harvard, and built a conventional business career that took him to the Pacific Stock Exchange in San Francisco, where he became a senior vice president.

In the early 1970s he met Al Francesco, a gambler who had worked out that the weakest point of solo card counting was the bet spread. A counter who bets $10 at a bad count and $500 at a good one is easy for a pit boss to spot. Francesco's answer was to separate counting from big betting.

Uston joined Francesco's team, proved a talented player, and eventually left the stock exchange to gamble full time. His business background made him an effective organiser and, later, a natural public spokesman.

This profile belongs to the [famous gamblers](/guides/famous-gamblers) series in the [Casino knowledge topic](/guides/topics/casino-knowledge). For the counting maths itself, start with [card counting](/guides/card-counting); for the man who first published it, see [Edward Thorp](/guides/edward-thorp).`,
    },
    {
      id: "big-player",
      title: "The big-player method",
      body: `Francesco's system, which Uston made famous, split the team into two jobs.

1. **Counters** sat at separate tables betting small, flat amounts and keeping a count. Because their bets never changed, they looked like ordinary low-stakes players.
2. **The big player** wandered the casino, often playing the part of a loud, slightly drunk high roller. When a counter's table became favourable, the counter signalled, and the big player sat down and bet near the table maximum.
3. When the count fell, the big player left, often with a show of bad temper, and waited for the next signal.

### Why it beat surveillance

Casino staff in that era looked for players whose bets rose with the count. On a big-player team, no single person did that. The counter never varied, and the big player bet big every time he sat down; he simply chose when to sit. From the pit's point of view, he looked like a whale with good luck.

### The value of choosing when to play

Suppose a six-deck shoe starts with the player about 0.5% behind, and each point of true count adds about 0.5%. A solo counter plays every hand, including the many negative ones. A big player who joins only at a true count of +3 or better plays at roughly +1% or more and skips the rest. If he bets $1,000 a hand at an average edge of 1.5%, his expected value is about $15 a hand, while the counters' $5 flat bets at bad counts cost pennies. That structure was later copied by the [MIT blackjack team](/guides/mit-blackjack-team).`,
    },
    {
      id: "books",
      title: "The Big Player and Uston's other books",
      body: `In 1977 Uston published *The Big Player*, written with Roger Rapoport, which described the team's methods, money and adventures in detail. The book made him famous and made team play public knowledge, which did not please everyone who had been on the team; casinos now knew what to look for.

He followed it with several blackjack books, including *Million Dollar Blackjack* (1981), which taught his own counting systems and a detailed guide to team play. The Uston Advanced Point Count is a multi-level system that weights cards more finely than the simpler Hi-Lo, trading ease of use for accuracy. Most modern players choose a simpler count because the extra accuracy is small compared with the cost of errors.

Uston also wrote outside gambling. His 1981 book *Mastering Pac-Man* was a bestseller during the arcade boom, and he wrote about home computers in the early 1980s.

### Disguises

Once his face was known, Uston became equally famous for disguises: wigs, beards, false teeth and changes of clothing, sometimes elaborate enough to fool pit staff who had barred him days earlier. He treated it as part of the game and wrote about it openly.`,
    },
    {
      id: "court",
      title: "Uston v. Resorts International (1982)",
      body: `Casino gambling opened in Atlantic City in May 1978 with Resorts International. New Jersey's model was very different from Nevada's: every aspect of the licensed games, including the rules of blackjack, was set by the state's Casino Control Commission rather than by each casino.

Resorts barred Uston from its blackjack tables in 1979 because he counted cards. Uston challenged the exclusion, and in 1982 the case reached the New Jersey Supreme Court.

### What the court decided

The court held that Resorts could not exclude Uston simply for counting. Its reasoning rested on two points:

- Casinos open to the public do not have an unlimited right to exclude people; exclusion has to be reasonable.
- In New Jersey, the Casino Control Act gave the Commission exclusive authority over the rules of the games. Because the Commission had not adopted a rule allowing counters to be barred, a casino could not effectively add one of its own.

### What happened next

The ruling did not make counting profitable in Atlantic City. Casinos gained Commission-approved countermeasures instead, such as shuffling early when a player raised his bet and using more decks. The result was a jurisdiction where counters could play but were systematically made to play worse games.

### Why a shuffle-up works so well

A counter's profit comes almost entirely from the minority of hands dealt deep in the shoe at high counts. If the dealer shuffles every time the player raises his bet, the big bet always lands on the first round of a fresh shoe, where the true count is zero and the player's edge is about −0.5%. The counter is left betting big at a small disadvantage and small at whatever the count happens to be. His expected value drops from positive to slightly negative, without anyone being barred. A single rule change, applied only to suspected counters, removes the edge entirely. That is why the legal victory had a limited practical effect on Uston's earnings: the right to sit down is worth little if every good shoe is shuffled away before it arrives.

| | Nevada | New Jersey after Uston |
| --- | --- | --- |
| Can a casino bar a counter? | Yes, private property | No, not for counting alone |
| Typical response | Backoff or trespass | Shuffle-ups, bet limits, more decks |
| Who sets game rules? | Each casino, within regulation | The state commission |

For how this compares with other places today, see [is card counting illegal](/guides/is-card-counting-illegal).`,
    },
    {
      id: "griffin",
      title: "Griffin Investigations and the barring culture",
      body: `The main opponent of Uston's generation was not a single casino but a detective agency. Griffin Investigations, founded in Las Vegas in the late 1960s, compiled the "Griffin Book", a catalogue of photographs and descriptions of suspected cheats and card counters that it sold to casinos.

The book was effective because casinos shared it. A counter barred in one city could be recognised in another within days. Uston criticised the practice publicly, and his disguises were largely a response to it.

### The agency's decline

Griffin's approach eventually drew legal trouble. Advantage players who had been labelled as cheats, rather than just counters, sued for defamation, and after losing litigation the agency filed for bankruptcy protection in 2005. Casino surveillance did not go away; it moved to in-house teams, shared databases and, later, facial recognition.

### Devices and the law

Uston's era also tested hidden computers. According to accounts of the period, a team connected to him used concealed computers in the late 1970s that authorities examined and did not treat as illegal at the time. Nevada later made it a crime to use or possess a device to count cards or predict outcomes in a casino, a law that remains in force.`,
    },
    {
      id: "legacy",
      title: "Uston's legacy and what it teaches",
      body: `Uston died in Paris in September 1987, aged 52. In 2002 he was among the first players inducted into the Blackjack Hall of Fame, alongside figures such as Thorp and Francesco.

### Lessons for players

- **The edge was structural, not emotional.** Uston won by choosing when to bet, based on a count. Nothing about the method involved streaks or hunches.
- **Being known ends the edge.** Most of Uston's later career was a contest with surveillance, not with the cards.
- **Legal rights do not guarantee a good game.** Winning in court changed who could sit down, not the odds on offer.
- **Variance is large.** Even a team with an edge had losing trips. See [variance in gambling](/guides/variance-in-gambling) and [risk of ruin](/guides/risk-of-ruin).

### Why the case still matters

*Uston v. Resorts* is still cited whenever the question of barring skilled players comes up, including in online gambling, where operators can limit or close accounts with a click. It frames the question every advantage player eventually faces: the maths may be on your side, but the house decides whether you play.`,
    },
    {
      id: "pvp",
      title: "No counting needed in a PvP round",
      body: `Uston's method depended on a shoe that remembers which cards are gone. PVPspinArena's three player-vs-player games, Jackpot, Coinflip and Roulette in USDC or ETH on Base, have no memory at all. Each round comes from fresh committed seeds, so there is no running count to track and no favourable moment to wait for.

- On [Roulette](/roulette), a 33-slot wheel with 16 Purple and 16 Silver slots paying 2x and 1 Green paying 14x, Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee on every spin.
- [Coinflip](/coinflip) is a 50/50 between two players; the winner takes the pot minus any fee shown before entry.
- In Jackpot, your win chance is your share of the pot.

Instead of watching for the house to change the game, you can check any settled round yourself on the [fairness](/fairness) page. Play is 18+ only; set limits on the [responsible gambling](/responsible-gambling) page.`,
    },
  ],
  faqs: [
    {
      q: "Who was Ken Uston?",
      a: "An American blackjack player, author and former senior vice president of the Pacific Stock Exchange who became famous as the big player on 1970s counting teams and for suing Atlantic City's Resorts International over being barred.",
    },
    {
      q: "What was Uston v. Resorts International?",
      a: "A 1982 New Jersey Supreme Court case. The court held that Atlantic City casinos could not bar a player just for counting cards, because the state commission, not the casino, controlled the rules of the games.",
    },
    {
      q: "Can Atlantic City casinos still bar card counters?",
      a: "Since the Uston ruling, New Jersey casinos generally cannot exclude players for counting alone, but they can use approved countermeasures such as shuffling early, adding decks and limiting bets.",
    },
    {
      q: "How did Ken Uston die?",
      a: "He died in Paris in September 1987, aged 52; published accounts attribute his death to a heart attack.",
    },
    {
      q: "What books did Ken Uston write?",
      a: "His best-known gambling books are The Big Player (1977, with Roger Rapoport) and Million Dollar Blackjack (1981). He also wrote Mastering Pac-Man (1981), a bestseller of the arcade era.",
    },
  ],
  sources: [
    { label: "Wikipedia: Ken Uston", url: "https://en.wikipedia.org/wiki/Ken_Uston" },
    {
      label: "Wikipedia: Griffin Investigations",
      url: "https://en.wikipedia.org/wiki/Griffin_Investigations",
    },
    { label: "Wikipedia: Card counting", url: "https://en.wikipedia.org/wiki/Card_counting" },
  ],
  related: [
    "famous-gamblers",
    "mit-blackjack-team",
    "edward-thorp",
    "card-counting",
    "is-card-counting-illegal",
    "don-johnson-blackjack",
  ],
  updated: "2026-09-27",
};

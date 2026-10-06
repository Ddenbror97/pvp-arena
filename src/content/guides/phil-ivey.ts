import type { Guide } from "./types";

export const guide: Guide = {
  slug: "phil-ivey",
  cluster: "Casino knowledge",
  keyword: "phil ivey",
  secondary: ["phil ivey edge sorting", "ivey v genting", "phil ivey borgata", "phil ivey poker"],
  title: "Phil Ivey: Poker Career and the Edge-Sorting Cases",
  description:
    "Phil Ivey's career explained: ten WSOP bracelets, how edge sorting works, the Crockfords and Borgata court cases, and what the rulings mean for players.",
  h1: "Phil Ivey: ten bracelets, edge sorting and two landmark court cases",
  answer:
    "Phil Ivey is an American poker professional, born in 1977, with ten World Series of Poker bracelets and a 2017 Poker Hall of Fame induction. Outside poker he is known for edge sorting at baccarat: in 2012 he won about £7.7 million at Crockfords in London and about $9.6 million at the Borgata in Atlantic City, and both casinos won in court.",
  facts: [
    "Born 1 February 1977 in Riverside, California; raised in New Jersey.",
    "Won his first WSOP bracelet in 2000 and his tenth in 2014.",
    "Inducted into the Poker Hall of Fame in 2017.",
    "The UK Supreme Court ruled against him in Ivey v Genting Casinos (UK) Ltd [2017] UKSC 67.",
    "A US federal court ordered him and his partner to repay the Borgata about $10.1 million; the parties settled in 2020.",
  ],
  sections: [
    {
      id: "career",
      title: "Who Phil Ivey is",
      body: `Phillip Dennis Ivey Jr. was born in Riverside, California, in 1977 and grew up in New Jersey, close to Atlantic City. He began playing in Atlantic City card rooms as a young man; the commonly told story is that he played there before he was legally old enough, under a borrowed identity, though that detail comes from interviews rather than records.

He won his first World Series of Poker (WSOP) bracelet in 2000, in pot-limit Omaha, won three more in 2002, and reached ten bracelets in 2014. He has final-tabled the Main Event and has large results in the high-stakes cash games and "super high roller" tournaments of the 2010s. He was inducted into the Poker Hall of Fame in 2017.

What sets Ivey apart in poker history is breadth. Many players specialise in no-limit hold'em. Ivey's bracelets span mixed games, Omaha and stud as well, and he was a fixture in the biggest mixed games in Las Vegas for years.

This profile sits in the [famous gamblers](/guides/famous-gamblers) series within the [Casino knowledge topic](/guides/topics/casino-knowledge). The rest of the page focuses on the part of his story that matters most to casino players: edge sorting, and why two courts decided it crossed the line.`,
    },
    {
      id: "poker",
      title: "Poker record and playing reputation",
      body: `Ivey's reputation among professionals rests on three things.

- **Reads and aggression.** He became known for applying pressure in spots where opponents expected caution, and for folding strong hands when the story did not add up.
- **Mixed-game skill.** Winning bracelets in several formats is harder than winning several in one, because each game has different hand values and betting structures. See [poker hand rankings](/guides/poker-hand-rankings) for why a hand that is strong in hold'em can be weak in lowball.
- **Stakes.** He played in the largest regular games of the era and in private games reported to run at stakes most players never see.

### Full Tilt and Black Friday

Ivey was one of the best-known sponsored professionals at Full Tilt Poker. After the US government's action against major online poker sites on 15 April 2011, known as Black Friday, Full Tilt could not repay player balances. Ivey sued the company and sat out the 2011 WSOP in protest, a public break with the site that carried his name. Player balances were later repaid through a settlement process run by the US Department of Justice.

### Skill versus house games

Poker is a game against other players; the house earns a rake. A strong professional can win long term if the skill gap beats the rake, which is why [how to win at poker](/guides/how-to-win-at-poker) is a real question. Baccarat is a house-banked game with a fixed edge on every hand. That difference is why Ivey needed something other than skill to beat it.`,
    },
    {
      id: "edge-sorting",
      title: "How edge sorting works",
      body: `Edge sorting is a way of reading which cards are coming by exploiting a manufacturing flaw. Some playing cards have a back pattern that is not perfectly symmetrical: one long edge looks slightly different from the other. If certain cards can be turned 180 degrees relative to the rest, a player who knows the difference can recognise those cards face down.

### The baccarat version

In baccarat, the most valuable cards for the first-dealt hand are 7s, 8s and 9s, because they push a two-card total towards a natural 8 or 9. The method reported in both cases worked like this:

1. Ask for a particular brand of card with an asymmetric pattern.
2. Ask the dealer, in Mandarin, to turn certain cards as they were revealed, framed as a superstition about luck.
3. Ask for the same shoe to be reused, and for an automatic shuffler, which mixes cards without rotating them.
4. Over the next shoes, the 7s, 8s and 9s now face the "other" way, so the first card out of the shoe can be identified as high or not before the bet is placed.

Ivey's partner, Cheung Yin Sun, was the one who could spot the edge differences. Ivey supplied the bankroll and made the requests.

### Why it creates an edge

Baccarat normally has no decisions that matter. Banker wins about 45.86% of hands, Player about 44.62%, and ties about 9.52%, giving banker a house edge of about 1.06% after commission and player about 1.24%. See [baccarat rules](/guides/baccarat-rules). If you know the first card is a 7, 8 or 9, Player's chances jump, because that card goes to the Player hand. Knowing that before betting turns a negative-expectation game into a positive one. Coverage of the cases estimated the resulting player advantage at several percent; the exact figure depended on how often the first card could be read.`,
    },
    {
      id: "crockfords",
      title: "Crockfords and the UK Supreme Court",
      body: `In August 2012 Ivey played punto banco at Crockfords, a Mayfair casino owned by Genting, over two days and won about £7.7 million. Crockfords investigated, concluded edge sorting had been used, returned his original £1 million stake and refused to pay the winnings.

Ivey sued. His case was that he had not touched the cards, that the casino had agreed to every request, and that using information in plain sight was legitimate advantage play, like counting cards.

### How the courts ruled

- **High Court, 2014:** found against Ivey. The judge accepted Ivey was a truthful witness who genuinely believed he was not cheating, but held that what he did was cheating.
- **Court of Appeal, 2016:** dismissed his appeal.
- **Supreme Court, 2017:** dismissed his appeal unanimously in *Ivey v Genting Casinos (UK) Ltd*.

The key reasoning: Ivey had not simply observed the game; he had arranged for the dealer to rearrange the cards in a way that gave him information the game was designed to hide. That was interference with the game, and it was cheating whether or not he believed it was honest.

The judgment also had a wide legal effect. It restated the test for dishonesty in English law, replacing the older *Ghosh* test with an objective standard. It is now cited in criminal and civil cases that have nothing to do with gambling.`,
    },
    {
      id: "borgata",
      title: "The Borgata case in New Jersey",
      body: `Between April and October 2012, Ivey and Sun played mini-baccarat at the Borgata in Atlantic City across four sessions and won about $9.6 million, with the same set of requests: a specific purple card brand, a Mandarin-speaking dealer, card rotations and a shuffler.

The Borgata paid. After the Crockfords story became public, it sued in 2014 to recover the money.

In 2016 a federal judge in New Jersey held that Ivey and Sun had breached their contract with the casino by violating the state's rules on the integrity of the game, though the court rejected the casino's fraud claim. In 2017 the court ordered repayment of about $10.1 million, which included about $504,000 Ivey had won at craps using money from the baccarat sessions. The parties reached a confidential settlement in 2020.

| | Crockfords (London) | Borgata (Atlantic City) |
| --- | --- | --- |
| Year played | 2012 | 2012 |
| Amount | About £7.7 million | About $9.6 million |
| Paid at the time? | No | Yes |
| Outcome | Cheating under the Gambling Act 2005; Supreme Court 2017 | Breach of contract; repayment ordered 2017; settled 2020 |`,
    },
    {
      id: "lessons",
      title: "Where advantage play ends",
      body: `Ivey's cases draw a line that the card-counting cases did not.

- **Counting** uses only what every player can see, with no change to how the game is run. It is generally legal, though private casinos may bar counters. See [is card counting illegal](/guides/is-card-counting-illegal).
- **Edge sorting as Ivey did it** required the house to handle the cards differently at his request, so that hidden information became visible. Courts in two countries treated that as crossing from observation into interference.
- **Devices and marking** are outlawed almost everywhere.

The practical lessons for ordinary players are simpler. Baccarat has a fixed [house edge](/guides/house-edge) on every standard bet, and no pattern chart or card "trend" changes it. The only documented way Ivey beat it involved information the game was designed to hide, and it cost him years of litigation and most of the money.

### What casinos changed

The cases pushed the industry towards simple, cheap fixes. Casinos check that card backs are symmetrical, or use designs with a white border so any printing drift is invisible. Dealers are trained to refuse requests to turn cards, and shoes are not reused after a session. Automatic shufflers that rotate or randomise orientation make any rotated card meaningless. High-limit hosts now treat an unusual list of equipment requests from a whale as a warning sign rather than a harmless superstition, even when it is presented as one. The same pattern followed Thorp and the card counters decades earlier: once a leak is public, the house closes it quickly, and the players who used it become case studies rather than a template.

He also illustrates a point that runs through the whole famous-gambler list: elite skill at a game against people does not transfer to games against the house.`,
    },
    {
      id: "pvp",
      title: "Hidden information and PvP rounds",
      body: `Edge sorting worked because a physical deck can leak information about what comes next. PVPspinArena's three player-vs-player games, Jackpot, Coinflip and Roulette in USDC or ETH on Base, are designed so that no one can see the outcome early. Results come from seeds that are committed before the round and revealed afterwards, and any settled round can be checked on the [fairness](/fairness) page.

- [Roulette](/roulette) runs on a 33-slot wheel: 16 Purple and 16 Silver pay 2x, 1 Green pays 14x. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee.
- [Coinflip](/coinflip) is a 50/50 between two players; the winner takes the pot minus any fee shown before entry.
- In Jackpot, your win chance equals your share of the pot.

Play is 18+ only, and budgets and time limits are on the [responsible gambling](/responsible-gambling) page.

In the same cluster, see also [edward thorp](/guides/edward-thorp) and [mit blackjack team](/guides/mit-blackjack-team).`,
    },
  ],
  faqs: [
    {
      q: "How many WSOP bracelets does Phil Ivey have?",
      a: "Ten. He won his first in 2000 and his tenth in 2014, across pot-limit Omaha, stud, mixed games and hold'em events.",
    },
    {
      q: "What is edge sorting?",
      a: "A technique that uses tiny asymmetries in the printed back pattern of cards. If key cards are rotated relative to the others, a player can identify them face down and bet with knowledge of the next card.",
    },
    {
      q: "Did Phil Ivey cheat?",
      a: "The UK Supreme Court held in 2017 that his edge sorting at Crockfords was cheating, even though it accepted he believed it was legitimate. A US federal court found he breached his contract with the Borgata but rejected the fraud claim.",
    },
    {
      q: "Did Phil Ivey get his money from Crockfords?",
      a: "No. Crockfords returned his £1 million stake and withheld about £7.7 million in winnings, and the courts upheld that decision.",
    },
    {
      q: "Is edge sorting illegal?",
      a: "It depends on how it is done and where. Asking the dealer to rotate cards so you can read them was held to be cheating in England. Merely noticing a flaw without influencing the game is a greyer area, and casinos can still refuse your play.",
    },
  ],
  sources: [
    { label: "Wikipedia: Phil Ivey", url: "https://en.wikipedia.org/wiki/Phil_Ivey" },
    { label: "Wikipedia: Edge sorting", url: "https://en.wikipedia.org/wiki/Edge_sorting" },
    {
      label: "UK Supreme Court: Ivey v Genting Casinos (UK) Ltd",
      url: "https://www.supremecourt.uk/cases/uksc-2016-0213.html",
    },
  ],
  related: [
    "famous-gamblers",
    "don-johnson-blackjack",
    "edward-thorp",
    "baccarat-rules",
    "how-to-win-at-poker",
    "ken-uston",
    "mit-blackjack-team",
  ],
  updated: "2026-09-27",
};

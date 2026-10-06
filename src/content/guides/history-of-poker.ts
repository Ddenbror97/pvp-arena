import type { Guide } from "./types";

export const guide: Guide = {
  slug: "history-of-poker",
  cluster: "Casino knowledge",
  keyword: "history of poker",
  secondary: ["poker history", "origin of poker", "who invented poker", "history of texas holdem"],
  title: "History of Poker: Poque, Riverboats, WSOP, Online",
  description:
    "The history of poker from poque and 20-card riverboat games to draw, stud, Texas hold'em, the WSOP, the Moneymaker boom, Black Friday and poker AI.",
  h1: "History of poker: from riverboat games to the online boom",
  answer:
    "The history of poker starts in the early 1800s in the Mississippi valley, where a 20-card betting game was played in New Orleans and on riverboats. It likely borrowed from the French game poque and older bluffing games such as primero and brag. The full 52-card deck, draw and stud followed. Texas hold'em reached Las Vegas in 1967, the WSOP began in 1970, and online poker exploded after 2003.",
  facts: [
    "The earliest detailed accounts of poker describe a 20-card, four-player game around New Orleans in the late 1820s and 1830s.",
    "The Persian game As-Nas is often named as an ancestor, but many card historians now dispute that link.",
    "Texas hold'em is linked to Robstown, Texas, in the early 1900s and reached Las Vegas in 1967.",
    "The first WSOP in 1970 at Binion's Horseshoe crowned Johnny Moss by a vote of the players.",
    "The WSOP Main Event grew from 839 entrants in 2003 to 8,773 in 2006 after Chris Moneymaker's win.",
  ],
  sections: [
    {
      id: "origins",
      title: "Origins: poque, primero, brag and a disputed Persian link",
      body: `No one invented poker on a single night. It grew from a family of European vying games, games where players bet on who holds the best hand and can win by making everyone else fold.

- **Primero** (Spanish and Italian, 1500s): players were dealt a few cards, and bluffing was part of the game.
- **Brag** (English): a three-card game with betting and bluffing that is still played in Britain.
- **Pochen** (German): a game with a betting phase, which the French adapted as **poque**.
- **As-Nas** (Persian): a five-card game with a 20- or 25-card deck.

French settlers brought poque to Louisiana, and the name "poker" is usually traced to it. As-Nas was once treated as the direct ancestor because it used five-card hands and a small deck. Later card historians, including David Parlett, pointed out that the documentation for As-Nas is later than the first American poker and that the rules may have been influenced by poker, not the other way round. The fair summary is that poker is an American game with European roots, and that the Persian link is possible but unproven.

### The first written accounts

The English actor Joe Cowell wrote about a game on a Mississippi steamboat in 1829 in which four players each got five cards from a 20-card deck (aces through tens) and bet on who held the best hand. There was no draw and no straights, and with 20 cards dealt to four players every card was in play. Jonathan H. Green’s 1840s exposé of riverboat gambling called poker "the cheating game", a sign of how often it was used to fleece travellers. The [famous gamblers](/guides/famous-gamblers) guide covers the card sharps who followed.`,
    },
    {
      id: "deck-variants",
      title: "The 52-card deck, draw, stud and new hands",
      body: `Four players can share a 20-card deck, but more players cannot. By the 1830s and 1840s poker was switching to the full [52 card deck](/guides/52-card-deck). That made the flush possible and eventually the straight. Card rulebooks were printing draw poker by the 1850s, and stud poker is associated with the Civil War era. The joker as a wild card came into use around 1875, and split-pot and lowball forms around 1900. Community-card games, where players share cards in the middle, appeared in the early 1900s.

### Why the hand order is what it is

Once the deck was fixed at 52 cards, the ranking of hands matched how rare each hand was. There are C(52,5) = 2,598,960 possible five-card hands:

| Hand | Number of hands | Chance per deal |
| --- | --- | --- |
| Straight flush (including royal) | 40 | about 1 in 65,000 |
| Four of a kind | 624 | about 1 in 4,165 |
| Full house | 3,744 | about 1 in 694 |
| Flush (not straight) | 5,108 | about 1 in 509 |
| Straight (not flush) | 10,200 | about 1 in 255 |
| Three of a kind | 54,912 | about 1 in 47 |

A flush is more common than a full house in five cards, which is why the full house beats it. Straights were not recognised everywhere at first, which is why old rulebooks disagree. The [poker hand rankings](/guides/poker-hand-rankings) guide lists the full modern order.

### The dead man’s hand

Wild Bill Hickok was shot in the back during a poker game in Deadwood, Dakota Territory, on 2 August 1876. The story says he held two black aces and two black eights, now called the dead man’s hand. The killing is well documented. The exact cards are not, so treat the hand as legend.

The face-up stud deal that grew out of that deck is [seven card stud](/guides/seven-card-stud).`,
    },
    {
      id: "hold-em-vegas",
      title: "Texas hold'em and the World Series of Poker",
      body: `Texas hold'em gives each player two private cards and five shared cards. It is traditionally traced to Robstown, Texas, in the early 1900s, and the Texas legislature formally recognised Robstown as its birthplace in 2007. For decades it was a game of Texas road gamblers who travelled a circuit of private games.

In 1967 a group of Texans, including Crandell Addington, Doyle Brunson and Amarillo Slim, brought hold'em to Las Vegas. It spread from downtown to the Strip over the next few years. Its structure, several betting rounds with information coming out gradually, suited big no-limit games. The [Texas hold'em rules](/guides/texas-holdem-rules) guide explains the streets.

### The first series

Benny Binion hosted the first World Series of Poker at his Horseshoe casino in downtown Las Vegas in 1970. There was no freezeout. The players voted Johnny Moss champion. In 1971 the Main Event became a winner-take-all no-limit hold'em tournament, and Moss won again. The early winners were almost all professional gamblers from the Texas circuit:

1. Amarillo Slim (1972), who then promoted poker on television talk shows.
2. [Doyle Brunson](/guides/doyle-brunson), back-to-back in 1976 and 1977. His 1978 book Super/System was the first widely read serious strategy manual.
3. [Stu Ungar](/guides/stu-ungar) in 1980, 1981 and 1997. Johnny Moss is the only other three-time Main Event champion, counting his 1970 vote.
4. Johnny Chan in 1987 and 1988.

### Legal card rooms

Outside Nevada, poker survived in licensed card clubs. California’s old gambling law named "stud-horse poker" as illegal, so clubs in Gardena spread draw poker for decades. A 1987 court decision held that hold'em was not stud, and hold'em spread across California card rooms after that.`,
    },
    {
      id: "tv-online",
      title: "Hole cameras, online poker and the Moneymaker boom",
      body: `Poker was hard to televise because viewers could not see the cards. Britain’s Late Night Poker (1999) used cameras under glass tables to show players' hole cards. The World Poker Tour, which launched on US television in 2003, and ESPN’s 2003 WSOP coverage used the same idea. Suddenly a fold, a bluff or a slow-played monster made sense to someone watching at home.

### The first online rooms

Planet Poker dealt the first real-money online poker game on 1 January 1998. Paradise Poker, PartyPoker and PokerStars followed within a few years. Online rooms dealt far more hands per hour than live tables and let people play small stakes from home.

### 2003

[Chris Moneymaker](/guides/chris-moneymaker), an accountant from Tennessee, won a seat to the 2003 Main Event through an online satellite that is usually reported as costing $86. He beat a field of 839 and won $2.5 million. His win, broadcast with hole cards, gave every online player a believable story. Main Event fields grew fast:

| Year | Main Event entrants |
| --- | --- |
| 2003 | 839 |
| 2004 | 2,576 |
| 2005 | 5,619 |
| 2006 | 8,773 |

Harrah’s bought the WSOP in 2004 and moved it to the Rio in 2005. The Main Event later moved to the Horseshoe and Paris resorts on the Strip, and in 2023 the field passed 10,000 for the first time.`,
    },
    {
      id: "crackdown-ai",
      title: "UIGEA, Black Friday and the solver era",
      body: `The boom hit US law in 2006, when the Unlawful Internet Gambling Enforcement Act targeted payments to online gambling sites. Some large operators left the US market; others stayed. On 15 April 2011, a day players now call Black Friday, US prosecutors unsealed indictments against the founders of PokerStars, Full Tilt Poker and Absolute Poker and seized their US domain names. Full Tilt could not repay player balances, and prosecutors later described it as operating like a Ponzi scheme. US players waited years for refunds through a Justice Department process. Regulated online poker returned state by state from 2013, starting with Nevada, Delaware and New Jersey.

### Computers change the game

Poker became a research problem for computer science because it involves hidden information and bluffing.

- In 2015 the University of Alberta’s Cepheus program was reported in Science as having essentially solved heads-up limit hold'em.
- In 2017 Carnegie Mellon’s Libratus beat four top professionals over 120,000 hands of heads-up no-limit hold'em.
- In 2019 Pluribus, from Carnegie Mellon and Facebook AI, beat elite players in six-player no-limit games.

Commercial solvers let human players study near-equilibrium strategies, which is why modern poker talk is full of ranges, frequencies and bet sizes. See [GTO poker strategy](/guides/gto-poker-strategy) for what "game theory optimal" means in practice.`,
    },
    {
      id: "lessons",
      title: "What poker history says about skill, rake and PvP play",
      body: `Poker has always been player vs player. The house does not play a hand. It earns money from the rake, a small cut of each pot, or from tournament fees. That is the key difference from roulette or slots, where you bet against the house’s edge. In poker a strong player can win over time, but only if their edge over the table is bigger than the rake. The [how to win at poker](/guides/how-to-win-at-poker) guide covers win rates and rake, and [crypto poker](/guides/crypto-poker) covers poker played for crypto.

Three things repeat through two centuries of poker:

1. **Cheating came first and fairness came later.** The riverboat "cheating game" became a regulated game with shuffled, audited decks and, online, certified random number generators.
2. **Media drives the booms.** Talk shows in the 1970s, hole-card TV in 1999–2003 and streaming since then brought in new players.
3. **Law shapes the map.** Stud bans in California, UIGEA and Black Friday all moved where and how people played.

More history sits in the [Casino knowledge topic](/guides/topics/casino-knowledge), alongside the broader [history of gambling](/guides/history-of-gambling).

### PvP on PVPspinArena

PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network. They are pure chance, not poker. In [Coinflip](/coinflip) two players take a 50/50, and in [Jackpot](/) your win chance equals your share of the pot. In both, the winner takes the pot minus any fee shown before entry, which is the same idea as a poker room’s rake. Results come from committed seeds you can check on [fairness](/fairness). Play is 18+ only.

In the same cluster, see also [las vegas history](/guides/las-vegas-history) and [stardust casino](/guides/stardust-casino).`,
    },
  ],
  faqs: [
    {
      q: "Where did poker originate?",
      a: "In the Mississippi valley of the United States in the early 1800s, especially around New Orleans. It grew from European betting games such as the French poque, the German pochen, primero and brag.",
    },
    {
      q: "Did poker come from the Persian game As-Nas?",
      a: "That claim was popular for a long time, but the evidence is weak. The documentation for As-Nas comes later than early American poker, and many card historians now think the resemblance runs the other way or is a coincidence.",
    },
    {
      q: "When was Texas hold'em invented?",
      a: "It is traditionally dated to the early 1900s in Robstown, Texas, which the Texas legislature recognised as the game's birthplace in 2007. Texas players brought it to Las Vegas in 1967.",
    },
    {
      q: "When did the World Series of Poker start?",
      a: "In 1970 at Binion's Horseshoe in Las Vegas. That year Johnny Moss was voted champion by the other players. The Main Event became a no-limit hold'em freezeout in 1971.",
    },
    {
      q: "What caused the poker boom?",
      a: "Online poker rooms, hole-card cameras on TV and Chris Moneymaker's 2003 Main Event win after qualifying online. Main Event entries rose from 839 in 2003 to 8,773 in 2006.",
    },
  ],
  sources: [
    { label: "Wikipedia: History of poker", url: "https://en.wikipedia.org/wiki/History_of_poker" },
    {
      label: "Wikipedia: World Series of Poker",
      url: "https://en.wikipedia.org/wiki/World_Series_of_Poker",
    },
    {
      label: "Encyclopaedia Britannica: poker",
      url: "https://www.britannica.com/topic/poker-card-game",
    },
  ],
  related: [
    "history-of-gambling",
    "doyle-brunson",
    "chris-moneymaker",
    "texas-holdem-rules",
    "poker-hand-rankings",
    "las-vegas-history",
    "stardust-casino",
  ],
  updated: "2026-09-27",
};

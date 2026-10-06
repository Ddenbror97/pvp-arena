import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-royale-poker",
  cluster: "Casino knowledge",
  keyword: "casino royale poker",
  secondary: [
    "casino royale final hand",
    "casino royale poker scene",
    "james bond poker",
    "casino royale baccarat",
  ],
  title: "Casino Royale Poker: The Hands, the Maths and the Novel",
  description:
    "Casino Royale poker explained: the 2006 film's Texas hold'em game, the final hand and its odds, what is realistic, and why Fleming's novel used baccarat.",
  h1: "Casino Royale poker: the film's hands, their realism and the baccarat original",
  answer:
    "Casino Royale poker refers to the high-stakes no-limit Texas hold'em game at the centre of the 2006 James Bond film. Bond plays Le Chiffre in a $10 million buy-in game, loses his stake to a faked tell, is re-staked and wins with a straight flush in a four-way all-in. Ian Fleming's 1953 novel used baccarat instead; the film switched games during the poker boom.",
  facts: [
    "The 2006 film, directed by Martin Campbell, was Daniel Craig's first outing as Bond, with Mads Mikkelsen as Le Chiffre.",
    "The game's buy-in is $10 million with a $5 million rebuy; Bond's stake is backed by the British Treasury.",
    "Bond wins the final hand with a straight flush, 5♠ 7♠ on a board containing the 4♠, 6♠ and 8♠.",
    "A straight flush occurs in roughly 0.03% of seven-card hold'em hands.",
    "Fleming's novel, and the 1954 and 1967 adaptations, used baccarat rather than poker.",
  ],
  sections: [
    {
      id: "setup",
      title: "The setup: why Bond is at the poker table",
      body: `In the 2006 film, Le Chiffre is a private banker who manages money for terrorist clients. He gambles their funds on a short position in an aerospace company's stock and plans an attack to make it pay. Bond stops the attack, the bet collapses, and Le Chiffre needs to win the money back quickly. He organises a high-stakes poker game at the Casino Royale in Montenegro.

MI6 enters Bond in the game to make sure Le Chiffre loses. If he is ruined, the reasoning goes, he will have to seek protection from British intelligence in exchange for information. The British Treasury puts up Bond's money, and Vesper Lynd, played by Eva Green, is the Treasury official sent to watch it.

### The format

- **Game:** no-limit Texas hold'em.
- **Buy-in:** $10 million, with a $5 million rebuy allowed.
- **Players:** ten at the start, including Bond and Le Chiffre.
- **Prize:** winner takes all.

In real poker terms this is a hybrid. The winner-take-all structure and rebuy resemble a rebuy tournament, while the huge cash stacks and the way players talk about money resemble a private cash game. Films take this licence all the time, and it is one of several things poker players noticed. The rules of the game itself are covered in [Texas hold'em rules](/guides/texas-holdem-rules).

### Why hold'em, not baccarat

The film was released three years after an amateur, Chris Moneymaker, won the 2003 World Series of Poker Main Event after qualifying online, which helped trigger a worldwide poker boom; see [Chris Moneymaker](/guides/chris-moneymaker). No-limit hold'em was the game audiences were watching on television. Its betting rounds create tension and bluffing, which baccarat's near-automatic drawing rules cannot. This guide sits in the [Casino knowledge topic](/guides/topics/casino-knowledge).`,
    },
    {
      id: "hands",
      title: "The key poker scenes, in order",
      body: `The game is shown in stages rather than hand by hand, but a few moments carry the plot.

1. **The tell.** Early on, Bond notices Le Chiffre touching the scar near his eye when he bluffs. He uses it to win a pot, and the audience learns that the villain has a readable weakness.
2. **The trap.** Later, Le Chiffre fakes the tell. Bond, holding a strong hand, puts his remaining chips in, believing Le Chiffre is bluffing. Le Chiffre has the better hand, and Bond is out of chips.
3. **The rebuy.** Vesper refuses to fund the $5 million rebuy, judging that Bond's ego lost the stack. Felix Leiter, a CIA agent also playing in the game, stakes Bond in exchange for the Americans taking custody of Le Chiffre afterwards.
4. **The poisoning.** Le Chiffre's girlfriend poisons Bond's drink. Bond collapses in his car, uses a defibrillator with Vesper's help, and returns to the table.
5. **The final hand.** Four players remain in a huge pot and all go all-in. Each shows a monster, and Bond's straight flush wins everything.

### The final hand as usually transcribed

The board contains the 4♠, 6♠ and 8♠ along with a pair of aces. One player shows a flush. Two players have full houses, with Le Chiffre's aces full being the larger. Bond turns over 5♠ 7♠ for a straight flush, eight high, and wins the pot. Transcriptions of the exact hole cards of the other players vary slightly, so this page gives only the structure that all versions agree on.

Hand strength order, from [poker hand rankings](/guides/poker-hand-rankings): straight flush beats four of a kind, which beats a full house, which beats a flush. A bigger full house beats a smaller one by the three-of-a-kind part first.`,
    },
    {
      id: "odds",
      title: "How unlikely is that final hand?",
      body: `Poker players loved the scene and laughed at it, and the maths explains both reactions.

### Single-hand frequencies

For any one player's best five cards out of seven in hold'em, the approximate probabilities are:

| Hand | Probability (7 cards) | Roughly 1 in |
| --- | --- | --- |
| Straight flush (not royal) | 0.028% | 3,600 |
| Four of a kind | 0.17% | 600 |
| Full house | 2.6% | 38 |
| Flush | 3.0% | 33 |

So a straight flush is already rare: a regular player might see a handful in a year of play, and win with one even less often.

### Four monsters at once

What makes the scene cinematic is not Bond's hand alone but that three opponents all hold hands strong enough to go all-in. The events are not independent, because everyone shares the same five board cards; a paired, three-spade board makes flushes and full houses more likely for everyone. Even so, a four-way all-in where a flush, two full houses and a straight flush all appear at showdown is far rarer than a straight flush alone, and in many lifetimes of live play most players would never see one. Poker players call hands where strong holdings collide a **cooler**; this is a cooler built for a cinema screen.

### What Bond actually risked

Bond's 5♠ 7♠ is a modest starting hand. Before the flop, a suited connector like this wins against a random hand roughly half the time, and against a big pair such as aces or kings it is a heavy underdog. The film glosses over how he got to the river with it; the drama is in the reveal, not the pre-flop decision. How players actually evaluate whether to call is covered in [pot odds](/guides/poker-pot-odds).`,
    },
    {
      id: "realism",
      title: "What the film gets right and wrong about poker",
      body: `The poker in Casino Royale is more careful than most films, and it still bends reality for the story.

### What it gets right

- **Hold'em mechanics.** Blinds, betting rounds, the flop, turn and river, and the showdown order are broadly correct.
- **Bankroll and staking.** Being staked by a backer, as Leiter does, is a real practice in high-stakes poker.
- **Tilt.** Bond losing his stack because his ego wants to punish Le Chiffre is a realistic picture of emotional play.
- **Table security.** Supervisors, a dealer handling chips and money in a separate cage are all plausible features.

### What it bends

- **Tells.** Reading a single physical habit exists, but at high stakes players guard against obvious tells and focus on betting patterns and ranges. Modern strategy leans on balanced play; see [GTO poker strategy](/guides/gto-poker-strategy).
- **The final hand.** As shown above, four monsters at once is extreme.
- **Pace.** Poker is slow; the film compresses hours of play into minutes.
- **Leaving the table.** A real game would normally pause for a break rather than wait while a player collapses and recovers in the car park.

### The house's role

In poker the casino is not a party to the pot. It earns a rake or a fee for hosting, and players win and lose against each other. That is a basic feature of poker and is why a player can have a long-term edge in poker that is impossible against a fixed-odds game. [How to win at poker](/guides/how-to-win-at-poker) explains how skill and the rake interact.`,
    },
    {
      id: "novel",
      title: "Baccarat in the novel and earlier adaptations",
      body: `Ian Fleming's *Casino Royale*, published in 1953, was the first James Bond novel, and its big game is baccarat, not poker.

### The novel's game

In the novel, Le Chiffre is the paymaster of a French trade union secretly controlled by the Soviet agency SMERSH. He has lost the union's money on a failed business venture and plans to win it back at the casino in Royale-les-Eaux, a fictional French resort town. Fleming's game is a high-stakes form of baccarat in which Le Chiffre holds the bank and Bond plays against it. Bond loses his stake, receives an envelope of money from Felix Leiter, and returns to beat Le Chiffre.

### Earlier screen versions

| Version | Year | Game |
| --- | --- | --- |
| Climax! TV episode, with Barry Nelson and Peter Lorre | 1954 | Baccarat |
| *Casino Royale* spoof with Peter Sellers and Orson Welles | 1967 | Baccarat |
| *Casino Royale* with Daniel Craig and Mads Mikkelsen | 2006 | No-limit Texas hold'em |

### Why baccarat suited Fleming

Baccarat was the prestige game of European casinos in Fleming's era, played by wealthy gamblers for enormous stakes. Its rules leave players very few decisions: whether to take on the bank and, in some forms, whether to draw on 5. That made it a pure test of nerve and luck, which fit a spy novel about courage and fate. The [baccarat rules](/guides/baccarat-rules) guide explains the drawing rules and the edges: about 1.06% on Banker, 1.24% on Player and over 14% on a Tie paying 8 to 1 in eight-deck games.

Poker gave the 2006 film something baccarat could not: decisions, bluffs and reads that a modern audience could follow and argue about. The [history of poker](/guides/history-of-poker) guide covers how hold'em became that game.`,
    },
    {
      id: "pvp",
      title: "Player-vs-player games and the PvP connection",
      body: `The most realistic thing about Casino Royale's poker is that Bond is playing against people, not against the house. That player-vs-player structure is the one PVPspinArena uses.

### How PVPspinArena works

PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network. In [Coinflip](/coinflip), two players take opposite sides of a 50/50 flip, and the winner takes the pot minus any fee shown before entry. In [Jackpot](/), each player's win chance equals their share of the pot. Roulette runs shared rounds on a 33-slot wheel where Purple and Silver pay 2x and Green pays 14x, about a 7.88% house edge on Purple or Silver after the 5% win fee.

### No tells, no faked tells

Unlike the film, nothing on PVPspinArena involves reading an opponent. Results come from committed seeds that are revealed after the round, and anyone can check a settled round on the [fairness](/fairness) page. A coin flip has no skill edge to find, so the right way to approach it is as entertainment with a fixed budget.

### A note on film gambling

Films show winners because winning makes a better ending. The [gambling movies](/guides/gambling-movies) guide looks at what other films get right and wrong about odds. In real play, stakes should be money you can afford to lose. Play is 18+, and limits and support links are on the [responsible gambling](/responsible-gambling) page.

In the same cluster, see also [is gambling a sin](/guides/is-gambling-a-sin), [gambling in islam](/guides/gambling-in-islam), and [biggest casino wins](/guides/biggest-casino-wins).`,
    },
  ],
  faqs: [
    {
      q: "What poker game is played in Casino Royale?",
      a: "No-limit Texas hold'em. The 2006 film shows a winner-take-all game with a $10 million buy-in and a $5 million rebuy between Bond, Le Chiffre and other high-stakes players.",
    },
    {
      q: "What hand did Bond win with in Casino Royale?",
      a: "A straight flush. Bond held 5♠ 7♠, and the board contained the 4♠, 6♠ and 8♠, giving him an eight-high straight flush that beat a flush and two full houses.",
    },
    {
      q: "How realistic is the Casino Royale final hand?",
      a: "The mechanics are correct, but four very strong hands colliding in one all-in is extremely rare. A straight flush alone appears in about 0.03% of seven-card hands.",
    },
    {
      q: "Is Casino Royale poker in the book?",
      a: "No. Ian Fleming's 1953 novel uses baccarat, with Le Chiffre holding the bank. The 1954 television version and the 1967 spoof also used baccarat.",
    },
    {
      q: "What was Le Chiffre's tell?",
      a: "He touched the scar near his eye when bluffing. Later in the game he fakes the tell to trap Bond into going all-in with a weaker hand.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Casino Royale (2006 film)",
      url: "https://en.wikipedia.org/wiki/Casino_Royale_(2006_film)",
    },
    {
      label: "Wikipedia: Casino Royale (novel)",
      url: "https://en.wikipedia.org/wiki/Casino_Royale_(novel)",
    },
    {
      label: "Wikipedia: Poker probability",
      url: "https://en.wikipedia.org/wiki/Poker_probability",
    },
  ],
  related: [
    "gambling-movies",
    "biggest-casino-wins",
    "poker-hand-rankings",
    "history-of-poker",
    "baccarat-rules",
    "is-gambling-a-sin",
    "gambling-in-islam",
  ],
  updated: "2026-09-27",
};

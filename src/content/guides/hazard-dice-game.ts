import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hazard-dice-game",
  cluster: "Games of chance",
  keyword: "hazard dice game",
  secondary: [
    "hazard game rules",
    "medieval dice game hazard",
    "hazard main and chance",
    "hazard and craps",
  ],
  title: "Hazard Dice Game: Medieval Rules and Road to Craps",
  description:
    "The hazard dice game explained: how the main and the chance work, nicks and outs, the caster's odds for each main, and how hazard was simplified into craps.",
  h1: "Hazard dice game: medieval rules, main and chance, and how it became craps",
  answer:
    "The hazard dice game is an old English two-dice game. The caster calls a number from 5 to 9 as the main, then throws. Throwing the main (or certain matching numbers) wins at once, throwing 2 or 3 loses, and anything else becomes the chance: the caster keeps throwing until the chance comes (a win) or the main comes (a loss). Fixing the main at 7 turns hazard into craps.",
  facts: [
    "The caster chooses a main of 5, 6, 7, 8 or 9 before throwing.",
    "2 and 3 (called crabs) lose on the first throw for every main.",
    "With main 7, the caster wins 244/495 ≈ 49.29% of the time: exactly the modern craps pass line.",
    "Main 5 or 9 wins about 49.24%; main 6 or 8 about 48.83%.",
    "Chaucer's Pardoner's Tale, written in the late fourteenth century, condemns hazard by name.",
  ],
  sections: [
    {
      id: "history",
      title: "What hazard was and where it came from",
      body: `Hazard was the leading dice game of England for several centuries. It appears in Chaucer's Canterbury Tales, where the Pardoner preaches against "hasardrye", and it was still the signature game of fashionable London gaming clubs in the early nineteenth century, most famously William Crockford's club in St James's.

The origin of the name is disputed. One common suggestion links it to the Arabic "az-zahr", often glossed as "the die". Another story, reported by the medieval chronicler William of Tyre, connects it to a castle called Hazart where the game was supposedly played during the Crusades. Neither is settled, so treat both as traditions rather than facts. What is well documented is that the English word "hazard", meaning risk, took its general sense from the game.

Hazard is a two-dice game with a two-stage structure that will look familiar to anyone who has stood at a craps table. It belongs in the [Games of chance topic](/guides/topics/games-of-chance), and for the wider story of dice and gaming houses, see [history of gambling](/guides/history-of-gambling).`,
    },
    {
      id: "rules",
      title: "Rules: the main, nicks and outs",
      body: `One player, the caster, throws the dice. The caster's opponent is the setter, and other players can bet on either side.

1. The caster calls a main: any number from 5 to 9.
2. The caster throws two dice.
3. If the throw is a **nick**, the caster wins immediately.
4. If the throw is an **out**, the caster loses immediately.
5. Any other total becomes the caster's **chance**, and the second stage begins.

Which totals nick and which throw out depends on the main:

| Main | Nicks (caster wins) | Outs (caster loses) | Becomes the chance |
| --- | --- | --- | --- |
| 5 | 5 | 2, 3, 11, 12 | 4, 6, 7, 8, 9, 10 |
| 6 | 6, 12 | 2, 3, 11 | 4, 5, 7, 8, 9, 10 |
| 7 | 7, 11 | 2, 3, 12 | 4, 5, 6, 8, 9, 10 |
| 8 | 8, 12 | 2, 3, 11 | 4, 5, 6, 7, 9, 10 |
| 9 | 9 | 2, 3, 11, 12 | 4, 5, 6, 7, 8, 10 |

Two and three, the "crabs", always lose on the first throw. Eleven and twelve are each a nick for one or two mains and an out for the others.

### The chance stage

Once a chance is set, the caster throws repeatedly. If the chance comes up first, the caster wins. If the main comes up first, the caster loses. Every other total is ignored.

### A worked hand

The caster calls 6 and throws 9. Nine is not a nick or an out for main 6, so 9 becomes the chance. The caster now needs a 9 before a 6. There are 4 ways to throw 9 and 5 ways to throw 6, so the caster wins this stage 4/9 ≈ 44.4% of the time. Fair odds against the caster are 5 to 4, which is what an informed side bettor would ask.`,
    },
    {
      id: "odds",
      title: "Odds for every main",
      body: `Two dice give 36 outcomes. The number of ways to throw each total is 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1 for totals 2 through 12. In the chance stage, a chance with c ways against a main with m ways wins with probability c / (c + m), because only those two totals matter.

### Main 7, step by step

- Nicks: 7 (6 ways) + 11 (2 ways) = 8/36 ≈ 22.2%.
- Outs: 2, 3, 12 = 4/36 ≈ 11.1%.
- Chance 4 or 10: each 3/36 × 3/9 ≈ 2.78%.
- Chance 5 or 9: each 4/36 × 4/10 ≈ 4.44%.
- Chance 6 or 8: each 5/36 × 5/11 ≈ 6.31%.

Total caster win = 0.2222 + 2 × (0.0278 + 0.0444 + 0.0631) ≈ 0.4929, which is exactly 244/495.

### Main 5, for comparison

- Nick: 5 only, 4/36 ≈ 11.1%.
- Outs: 2, 3, 11, 12 = 6/36 ≈ 16.7%.
- Chance 7 is the most common chance and the best one to hold: 6/36 × 6/10 = 10.0%.
- Chances 6 and 8: each 5/36 × 5/9 ≈ 7.72%. Chances 4 and 10: each 3/36 × 3/7 ≈ 3.57%. Chance 9: 4/36 × 4/8 ≈ 5.56%.

Total ≈ 0.1111 + 0.1000 + 0.1543 + 0.0714 + 0.0556 ≈ 0.4924. Main 5 gives fewer instant wins than main 7, but once in the chance stage the main of 5 is hard to throw, so most chances are favourites.

| Main | Immediate win | Immediate loss | Caster wins overall | Edge for the setter |
| --- | --- | --- | --- | --- |
| 5 or 9 | 4/36 | 6/36 | ≈ 49.24% | ≈ 1.52% |
| 6 or 8 | 6/36 | 5/36 | ≈ 48.83% | ≈ 2.34% |
| 7 | 8/36 | 4/36 | ≈ 49.29% | ≈ 1.41% |

At even money, calling 7 is the best choice for the caster, 5 and 9 are close behind, and 6 or 8 is the weakest despite having the most nicks with 12 added. The main of 6 or 8 is itself easy to throw in the chance stage, which hurts the caster more than the extra nick helps.

### Why this matters

These are close to fair. Hazard was mostly bet between players and side bettors at odds, and the real money was in the chance-stage bets: chance 4 against main 7 is 2 to 1 against, chance 8 against main 6 is even. A gaming house that offered even slightly shorter odds than the true ones had an edge. For the method behind numbers like these, see [dice roll probability](/guides/dice-roll-probability) and [expected value](/guides/expected-value-gambling).`,
    },
    {
      id: "craps",
      title: "How hazard became craps",
      body: `Hazard crossed the Atlantic with English and French players. The commonly told story credits Bernard de Marigny, a New Orleans aristocrat, with popularising a simplified version in the early nineteenth century. The name "craps" is usually traced to "crabs", hazard's losing 2 and 3, possibly by way of the French "crapaud" (toad). Both derivations are traditional rather than proven.

The key simplification was to fix the main at 7. That removes the caster's choice, makes 7 the permanent main, and leaves exactly the structure of the modern pass line.

| Hazard term | Modern craps term | Rule with main fixed at 7 |
| --- | --- | --- |
| Main | Seven | Always 7 |
| Nick | Natural | 7 or 11 wins on the come-out |
| Out (crabs) | Craps | 2, 3 or 12 loses on the come-out |
| Chance | Point | 4, 5, 6, 8, 9 or 10 |
| Throwing out on the main | Seven out | 7 before the point loses |

The caster's 244/495 in hazard is the pass-line bettor's 244/495 in craps, a 1.41% house edge.

### From street game to casino table

Early craps was played player against player, much as hazard was. A casino version needed a way for the house to book both sides without losing money, and the "don't pass" bet solved it: betting with the dice to lose, with 12 on the come-out treated as a push so the house keeps a small edge on both sides. John H. Winn is commonly credited with introducing this in the early twentieth century. The result is the bank craps layout you find today; [craps odds](/guides/craps-odds) covers every bet on it, and [craps strategy](/guides/craps-strategy) explains which ones to use.`,
    },
    {
      id: "play-today",
      title: "Playing hazard today",
      body: `Hazard is easy to revive at a games night. You need two dice, a cup and a surface with a backstop. A simple modern format:

- Rotate the caster clockwise after each loss, so everyone gets turns with the dice.
- The setter matches the caster's stake at even money on the overall result.
- Other players may bet on the chance stage at agreed fair odds (2 to 1 against on a 4 or 10 against a 7, 3 to 2 against on a 5 or 9, and 6 to 5 against on a 6 or 8, all against main 7).
- Keep a card with the nick and out table visible, because 11 and 12 cause most arguments.

Played this way, nobody has a built-in edge beyond the small amount the setter gains when the caster calls a weaker main. That makes hazard a good teaching game: players can see how the choice of main nudges the numbers, and how a fixed main turns a social game into a house game.

### Mistakes that come up when reviving hazard

- **Treating 11 and 12 the same for every main.** Check the table: 12 is a nick for 6 and 8 but an out for 5, 7 and 9.
- **Letting the caster change the main mid-hand.** The main is fixed once the first throw is made.
- **Paying chance bets at even money.** A chance of 4 against a main of 7 wins only one time in three. Even-money pay gives the other side a large edge.
- **Forgetting that the main is a losing number in the chance stage.** New players often cheer when the main appears after a chance is set. At that point it loses.

### Grand hazard

A separate three-dice banking game called grand hazard used a layout of bets on the dice. It is usually described as an ancestor of [chuck a luck](/guides/chuck-a-luck) and sic bo rather than of craps. The shared name reflects the old general meaning of hazard as a game of dice.

If money is involved, hazard is an 18+ game (or your local legal age), and a small fixed stake keeps it a pastime.`,
    },
    {
      id: "pvp",
      title: "Hazard's lesson for a hashed PvP round",
      body: `Hazard shows how small rule choices set an edge. Letting the caster pick a main made the game nearly even; fixing the main and letting a house book both sides produced a permanent 1.41% edge on the pass line. Every modern game makes a similar choice, and it is worth knowing where each one lands.

PVPspinArena runs three player-vs-player games. [Coinflip](/coinflip) is the setter-and-caster idea in its simplest form: two players, 50/50, winner takes the pot minus any fee shown before entry. Jackpot pools many players' wagers, and your win chance equals your share of the pot. [Roulette](/roulette) is the house-style game: a 33-slot wheel where Purple and Silver pay 2x and Green pays 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee.

In old gaming houses, players watched for loaded dice. Online, every result comes from seeds committed before the round, and any settled round can be checked on the [fairness](/fairness) page. That confirms the throw was honest; it does not change the maths. Keep stakes to what you can afford, and use the [responsible gambling](/responsible-gambling) page if play stops being a choice.

In the same cluster, see also [farkle rules](/guides/farkle-rules) and [yahtzee rules](/guides/yahtzee-rules).

See also [the history of dice](/guides/history-of-dice).`,
    },
  ],
  faqs: [
    {
      q: "How do you play the hazard dice game?",
      a: "The caster calls a main from 5 to 9 and throws two dice. A nick wins, an out loses, and any other total becomes the chance. The caster then throws until the chance (win) or the main (loss) appears.",
    },
    {
      q: "What is the difference between hazard and craps?",
      a: "In hazard the caster chooses the main from 5 to 9. In craps the main is always 7. With main 7, hazard's rules and odds are the same as the craps pass line.",
    },
    {
      q: "What is the best main to call in hazard?",
      a: "Seven. It gives the caster about 49.29% at even money. Five and nine are close at about 49.24%, while six and eight fall to about 48.83%.",
    },
    {
      q: "What does 'crabs' mean in hazard?",
      a: "Crabs are throws of 2 or 3, which lose on the first throw for every main. The word is the usual explanation for the name craps.",
    },
    {
      q: "How old is the game of hazard?",
      a: "It was well established in England by the fourteenth century, when Chaucer named it in the Canterbury Tales, and it stayed popular into the nineteenth century.",
    },
  ],
  sources: [
    { label: "Wikipedia: Hazard (game)", url: "https://en.wikipedia.org/wiki/Hazard_(game)" },
    { label: "Wikipedia: Craps", url: "https://en.wikipedia.org/wiki/Craps" },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
  ],
  related: [
    "craps-odds",
    "craps-strategy",
    "chuck-a-luck",
    "history-of-gambling",
    "dice-roll-probability",
    "cee-lo-rules",
    "farkle-rules",
    "yahtzee-rules",
    "history-of-dice",
  ],
  updated: "2026-09-27",
};

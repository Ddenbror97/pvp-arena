import type { Guide } from "./types";

export const guide: Guide = {
  slug: "skins-game-golf",
  cluster: "Sports betting",
  keyword: "skins game golf",
  secondary: ["golf skins carryover", "unique low score", "skin payout foursome"],
  title: "Skins Game Golf: Rules, Carryovers and Payout Math",
  description:
    "Skins game golf payout math for friends: a $2 skin, how a tie carries, who pays whom, and an 18-hole foursome with every skin paid.",
  h1: "Skins game golf: one low score takes the hole, and a tie carries",
  answer:
    "A skins game golf bet pays the player with the single lowest score on a hole. If two or more share that low score, the skin carries and the next hole is worth more. Adults 18+. This page uses $2 a skin in a foursome, walks all 18 holes, and settles every dollar. A skin here is cash for a hole. It is the outdoor game, and it has nothing to do with a cosmetic item in a video game. PVPspinArena does not run golf bets.",
  facts: [
    "Four players, gross scores, $2 per skin, paid by each of the other players to the winner.",
    "A skin needs a unique low score. A tie carries the full value onto the next hole.",
    "The carry adds one skin. Two tied holes in a row put three skins on the hole after that.",
    "This card pays all 18 skins. Ana 7, Dee 6, Ben 3, Cal 2.",
    "If hole 18 had tied, the tied players would have split that skin. It did not tie.",
    "The card moves $108. There is no house cut unless the group adds one.",
  ],
  sections: [
    {
      id: "what-a-skin-is",
      title: "What a skin pays",
      body: `A skins game golf hole is a small purse. The purse starts at one skin. The player who posts a score nobody else matches, and that score is the lowest on the hole, takes the purse. Everyone else had a higher number. Second place pays the same as last place: both missed the skin.

In this foursome the unit is $2. The winner collects $2 for that one skin from each of the other three players, so $6 moves. A hole worth three skins moves $6 times 3, which is $18. The multiplier is the carry, not a bonus for how low the score was. A lone 4 and a lone 3 both take whatever is sitting on the hole.

Par is not on this card. The numbers below are strokes. A 5 that nobody else matches beats three 6s. You do not have to beat par, and you do not get extra skins for a low number. Groups that require a par to "validate" a skin are playing a different rule. It is off here.

The money comes from the other golfers. [PvP gambling](/guides/pvp-gambling) is that shape. [Sports betting](/guides/topics/sports-betting) on this site explains prices and pots. Neighboring cards are [wolf](/guides/wolf-golf-game), a [Nassau](/guides/nassau-bet), [side bets](/guides/golf-side-bets), and [bingo bango bongo](/guides/bingo-bango-bongo-golf). Adults 18+. This is arithmetic, not a tip and not legal advice.

A skin in this bet is the cash attached to a hole. The same word shows up in video games for a cosmetic item. Leave that meaning behind. Nothing on this page is a weapon finish, a trade, or an inventory.`,
    },
    {
      id: "carryovers",
      title: "Ties, carryovers, and the 18th",
      body: `A tie for the low score carries the skin. The next hole is worth one more. Hole 2 on the card below is a tie with one skin in play, so hole 3 opens with two. Hole 3 ties as well, so hole 4 opens with three. Ana's 4 on hole 4 is alone, and she takes all three.

The carry is the whole purse, not a leftover coin. You do not pay half a skin to each of the tied players. They get nothing for that hole, and the next tee is heavier. That is why a quiet stretch of halves can turn one swing into the expensive hole of the day.

Hole 18 needs a rule before you start, because there is no hole 19. This card says: if the last hole ties, the players who tied split that skin's cash equally, and the players who were higher each pay their $2 times the skins in play, with the split going to the tied players. Fractions of a dollar get rounded to the cent and checked so the pays still sum to zero. The example never uses the rule. Dee's 4 on 18 is alone, with two skins in play, so she takes them.

A playoff hole, or a carry that dies on 18, is a different agreement. This card uses the split.

[Peer to peer sports betting](/guides/peer-to-peer-sports-betting) needs the tie rule before the event, or the last hole is an argument with cash still on it.`,
    },
    {
      id: "reading-the-card",
      title: "How to read one hole before the full card",
      body: `Scores are gross. No strokes, no pops, no "I get one here." If you want net skins, list the holes that receive a stroke and subtract it before you look for a unique low. Do not borrow a course rating you have not written down.

Walk hole 4, because the carry is the whole lesson. Ana 4, Ben 5, Cal 6, Dee 5. Three skins are in play. Ana is the only 4. She collects $2 times 3, which is $6, from Ben, from Cal, and from Dee. She is up $18 on that hole alone. Each of the others is down $6. Then the next hole resets to one skin.

A push-looking hole is hole 9: 5, 5, 5, 5. One skin was in play. Nobody is unique. That skin joins hole 10, which opens at two. Ana's 4 there is alone. She takes two.

Mark the card on the green. The four scores, the skins in play, and the name of the winner or the word "carry" are enough. A remembered birdie from the cart is how a skin gets paid twice. [Betting with friends online](/guides/bet-with-friends-online) has the same failure mode when the record is a message sent after everyone has left.

A [50-50 raffle](/guides/50-50-raffle) pays whoever holds the drawn ticket. A skin pays a score. If the hole tied, you carry it. You do not draw a name to break the tie unless the first tee said so, and this card did not.`,
    },
    {
      id: "full-card",
      title: "Eighteen holes at $2, with every carry",
      body: `Ana, Ben, Cal, and Dee. One skin is $2 from each of the other three players. "Skins" in the table is how many are in play when the hole starts. "Carry" means the low score was shared and the next hole adds one.

| Hole | Ana | Ben | Cal | Dee | Skins | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 5 | 5 | 4 | 5 | 1 | Cal |
| 2 | 4 | 4 | 5 | 5 | 1 | carry |
| 3 | 6 | 5 | 5 | 5 | 2 | carry |
| 4 | 4 | 5 | 6 | 5 | 3 | Ana |
| 5 | 5 | 4 | 5 | 5 | 1 | Ben |
| 6 | 4 | 5 | 4 | 4 | 1 | carry |
| 7 | 5 | 5 | 5 | 4 | 2 | Dee |
| 8 | 3 | 5 | 4 | 5 | 1 | Ana |
| 9 | 5 | 5 | 5 | 5 | 1 | carry |
| 10 | 4 | 6 | 5 | 5 | 2 | Ana |
| 11 | 5 | 4 | 4 | 6 | 1 | carry |
| 12 | 5 | 5 | 5 | 4 | 2 | Dee |
| 13 | 6 | 5 | 4 | 5 | 1 | Cal |
| 14 | 4 | 4 | 5 | 4 | 1 | carry |
| 15 | 5 | 3 | 5 | 6 | 2 | Ben |
| 16 | 4 | 5 | 5 | 5 | 1 | Ana |
| 17 | 5 | 5 | 4 | 4 | 1 | carry |
| 18 | 5 | 6 | 5 | 4 | 2 | Dee |

Count the skins taken. Ana 3 plus 1 plus 2 plus 1 is 7. Ben 1 plus 2 is 3. Cal 1 plus 1 is 2. Dee 2 plus 2 plus 2 is 6. Seven plus 3 plus 2 plus 6 is 18. Nothing is left sitting on a 19th hole.

Each skin pays $6 in total, because three players each hand over $2. Eighteen skins move 18 times $6, which is $108. Ana's 7 skins mean she collects $14 from each of the other three, $42 in all. Ben collects $6 from each, $18. Cal collects $4 from each, $12. Dee collects $12 from each, $36. Those collections sum to $108.

Each player also pays $2 for every skin they did not win. Ana pays for 11 skins, $22. Ben pays for 15, $30. Cal pays for 16, $32. Dee pays for 12, $24. Nets are collection minus payment. Ana $42 minus $22 is up $20. Ben $18 minus $30 is down $12. Cal $12 minus $32 is down $20. Dee $36 minus $24 is up $12. Up $20, down $12, down $20, and up $12 sum to zero. Cal owes the group $20. Ben owes $12. Ana and Dee are the ones who receive it.`,
    },
    {
      id: "checklist",
      title: "A checklist before the first tee",
      body: `If a line is blank, do not invent it on the 10th tee.

- Names, gross or net, and the holes that get a stroke if you chose net.
- The unit. This card is $2 a skin, paid by each other player, not one shared $2 pot.
- A tie carries the whole skin. Say it.
- Hole 18: split among the players who tied. A playoff is a different card.
- No "must make par" validation. The unique low score is enough, whatever the number is.
- Who writes the four scores before anyone picks up a ball.
- A ceiling. Three skins is $6 from each other player, $18 into one pocket, and a long carry can be heavier than that.
- The ceiling fits a [gambling budget](/guides/gambling-budget) chosen before the round.
- Adults 18+. [Responsible gambling](/responsible-gambling) still applies when the unit is two dollars and the carry makes it feel like a different game.

A press, a junk bet, or a new unit added after a carry gets big is a new contract. It is not part of the skins you already started.`,
    },
    {
      id: "keep-it-one-game",
      title: "Junk, validation, and one card",
      body: `Friendly groups often bolt greenies, sandies, and a snake onto a skins round. Each of those is its own price. They do not change who won the skin. If you want them, list them at $1 or $2 and settle them on a second line. Mixing a sandy into the skin column is how the $108 stops adding up.

Validation is the rule most likely to be "remembered" only when it helps. On this card a skin does not need a par, a green in regulation, or a fairway. The lone low score is the whole test. If your group wants validation, write the sentence "a skin counts only if that score is par or better" and then rebuild the card. Several holes above would change. Do not apply it at the car.

One person keeps the numbers. Read the winner and the skins in play before you walk off. A carry that is forgotten becomes a $2 hole when it should have been a $4 or $6 hole, and the nets above depend on every carry in the table.

The scores are a made-up friendly card so the arithmetic can be checked. They are not a course record and not a tour round. Your group will tie on different holes. The method is what travels: unique low score, carry the rest, pay $2 times the skins from each other player, and make the four nets sum to zero.`,
    },
    {
      id: "fee",
      title: "Who pays, and a 5% fee on the same dollars",
      body: `No house takes a share of this skins game golf card. The $108 moves among the four players, and the players who won skins receive all of it. A fee exists only if your group wrote one down. This group did not.

Jackpot and Coinflip take 5% of the pot. The equivalent pot is the dollars that actually moved. One skin moves $6, and 5% of $6 is $0.30. Ana's seven skins move $42, and 5% of $42 is $2.10. The round moves $108, and 5% of $108 is $5.40. The golfers do not pay that $5.40. A pot of $108 would.

| Stake | Who pays | Equivalent pot | 5% fee on that pot |
| --- | --- | --- | --- |
| One skin | each of the other three pays $2 | $6 | $0.30 |
| Ana's 7 skins | Ben, Cal, and Dee pay her $14 each | $42 | $2.10 |
| All 18 skins | nets: Ana up $20, Dee up $12, Ben down $12, Cal down $20 | $108 | $5.40 |

[House edge](/guides/house-edge) is what you call a game that keeps a percentage. [Coinflip](/coinflip) is a hashed coin between two stakes, and the 5% comes off that pot. It does not know who made the 4. Roulette on this site is a 33-slot house game. The counterparty is the wheel.

PVPspinArena does not run a skins game, does not carry a tie, and does not pay a low score. Adults 18+.`,
    },
  ],
  faqs: [
    {
      q: "What happens when two players tie the low score?",
      a: "The skin carries. Nobody is paid for that hole. The next hole is worth one skin more, on top of its own skin. Three players tying the low score is the same event as two players tying it. You need one name alone at the bottom.",
    },
    {
      q: "How much is a $2 skin in a foursome?",
      a: "The winner collects $2 from each of the other three players, so $6 moves for one skin. A hole with three skins in play moves $18. The $2 is not a single pot shared by the group. If you meant a $2 pot, write that sentence instead. It is a smaller game.",
    },
    {
      q: "What if the 18th hole ties?",
      a: "On this card the players who tied split that skin's money, and the higher scores still pay. A playoff hole, or a rule that the carry dies, has to be chosen before the round. This example does not need the rule, because hole 18 has one winner.",
    },
    {
      q: "Do you have to make par to win the skin?",
      a: "Not on this card. The unique low score wins, even if that score is over par. A validation rule is a different game. Add it before the first tee or leave it off. Do not discover it after someone has already been paid.",
    },
    {
      q: "Is there a house cut?",
      a: "No, unless your group charges one. This card moves $108 and the winners receive it. A 5% fee on an equivalent $108 pot would remove $5.40. Jackpot and Coinflip take 5% of the pot. PVPspinArena does not run golf skins. Adults 18+.",
    },
  ],
  sources: [
    { label: "Wikipedia: Golf", url: "https://en.wikipedia.org/wiki/Golf" },
    { label: "Wikipedia: Match play", url: "https://en.wikipedia.org/wiki/Match_play" },
  ],
  related: [
    "wolf-golf-game",
    "nassau-bet",
    "golf-side-bets",
    "bingo-bango-bongo-golf",
  ],
  updated: "2026-10-07",
};

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
    "A skins game golf contest awards a hole’s skin to a player with the sole lowest gross or net score, according to the agreed format. Tied low scores can carry the skin forward if the rules use carryovers. Decide the stake, handicap treatment, validation rule and final-hole tie procedure before play.",
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
      body: 'A skins game golf hole is a small purse. The purse starts at one skin. The player who posts a score nobody else matches, and that score is the lowest on the hole, takes the purse. Everyone else had a higher number. Second place pays the same as last place: both missed the skin.\n\nIn this foursome the unit is $2. The winner collects $2 for that one skin from each of the other three players, so $6 moves. A hole worth three skins moves $6 times 3, which is $18. The multiplier is the carry, not a bonus for how low the score was. A lone 4 and a lone 3 both take whatever is sitting on the hole.\n\nPar is not on this card. The numbers below are strokes. A 5 that nobody else matches beats three 6s. You do not have to beat par, and you do not get extra skins for a low number. Groups that require a par to "validate" a skin are playing a different rule. It is off here.\n\nA skin in this bet is the cash attached to a hole. The same word shows up in video games for a cosmetic item. Leave that meaning behind. Nothing on this page is a weapon finish, a trade, or an inventory.',
    },
    {
      id: "carryovers",
      title: "Ties, carryovers, and the 18th",
      body: "A tie for the low score carries the skin. The next hole is worth one more. Hole 2 on the card below is a tie with one skin in play, so hole 3 opens with two. Hole 3 ties as well, so hole 4 opens with three. Ana's 4 on hole 4 is alone, and she takes all three.\n\nThe carry is the whole purse, not a leftover coin. You do not pay half a skin to each of the tied players. They get nothing for that hole, and the next tee is heavier. That is why a quiet stretch of halves can turn one swing into the expensive hole of the day.\n\nHole 18 needs a rule before you start, because there is no hole 19. This card says: if the last hole ties, the players who tied split that skin's cash equally, and the players who were higher each pay their $2 times the skins in play, with the split going to the tied players. Fractions of a dollar get rounded to the cent and checked so the pays still sum to zero. The example never uses the rule. Dee's 4 on 18 is alone, with two skins in play, so she takes them.\n\nA playoff hole, or a carry that dies on 18, is a different agreement. This card uses the split.\n\n[Peer to peer sports betting](/guides/peer-to-peer-sports-betting) needs the tie rule before the event, or the last hole is an argument with cash still on it.",
    },
    {
      id: "reading-the-card",
      title: "How to read one hole before the full card",
      body: 'Scores are gross. No strokes, no pops, no "I get one here." If you want net skins, list the holes that receive a stroke and subtract it before you look for a unique low. Do not borrow a course rating you have not written down.\n\nWalk hole 4, because the carry is the whole lesson. Ana 4, Ben 5, Cal 6, Dee 5. Three skins are in play. Ana is the only 4. She collects $2 times 3, which is $6, from Ben, from Cal, and from Dee. She is up $18 on that hole alone. Each of the others is down $6. Then the next hole resets to one skin.\n\nA push-looking hole is hole 9: 5, 5, 5, 5. One skin was in play. Nobody is unique. That skin joins hole 10, which opens at two. Ana\'s 4 there is alone. She takes two.\n\nMark the card on the green. The four scores, the skins in play, and the name of the winner or the word "carry" are enough. A remembered birdie from the cart is how a skin gets paid twice. [Betting with friends online](/guides/bet-with-friends-online) has the same failure mode when the record is a message sent after everyone has left.\n\nA [50-50 raffle](/guides/50-50-raffle) pays whoever holds the drawn ticket. A skin pays a score. If the hole tied, you carry it. You do not draw a name to break the tie unless the first tee said so, and this card did not.',
    },
    {
      id: "full-card",
      title: "Eighteen holes at $2, with every carry",
      body: 'Ana, Ben, Cal, and Dee. One skin is $2 from each of the other three players. "Skins" in the table is how many are in play when the hole starts. "Carry" means the low score was shared and the next hole adds one.\n\n| Hole | Ana | Ben | Cal | Dee | Skins | Result |\n| --- | --- | --- | --- | --- | --- | --- |\n| 1 | 5 | 5 | 4 | 5 | 1 | Cal |\n| 2 | 4 | 4 | 5 | 5 | 1 | carry |\n| 3 | 6 | 5 | 5 | 5 | 2 | carry |\n| 4 | 4 | 5 | 6 | 5 | 3 | Ana |\n| 5 | 5 | 4 | 5 | 5 | 1 | Ben |\n| 6 | 4 | 5 | 4 | 4 | 1 | carry |\n| 7 | 5 | 5 | 5 | 4 | 2 | Dee |\n| 8 | 3 | 5 | 4 | 5 | 1 | Ana |\n| 9 | 5 | 5 | 5 | 5 | 1 | carry |\n| 10 | 4 | 6 | 5 | 5 | 2 | Ana |\n| 11 | 5 | 4 | 4 | 6 | 1 | carry |\n| 12 | 5 | 5 | 5 | 4 | 2 | Dee |\n| 13 | 6 | 5 | 4 | 5 | 1 | Cal |\n| 14 | 4 | 4 | 5 | 4 | 1 | carry |\n| 15 | 5 | 3 | 5 | 6 | 2 | Ben |\n| 16 | 4 | 5 | 5 | 5 | 1 | Ana |\n| 17 | 5 | 5 | 4 | 4 | 1 | carry |\n| 18 | 5 | 6 | 5 | 4 | 2 | Dee |\n\nCount the skins taken. Ana 3 plus 1 plus 2 plus 1 is 7. Ben 1 plus 2 is 3. Cal 1 plus 1 is 2. Dee 2 plus 2 plus 2 is 6. Seven plus 3 plus 2 plus 6 is 18. Nothing is left sitting on a 19th hole.\n\nEach skin pays $6 in total, because three players each hand over $2. Eighteen skins move 18 times $6, which is $108. Ana\'s 7 skins mean she collects $14 from each of the other three, $42 in all. Ben collects $6 from each, $18. Cal collects $4 from each, $12. Dee collects $12 from each, $36. Those collections sum to $108.\n\nEach player also pays $2 for every skin they did not win. Ana pays for 11 skins, $22. Ben pays for 15, $30. Cal pays for 16, $32. Dee pays for 12, $24. Nets are collection minus payment. Ana $42 minus $22 is up $20. Ben $18 minus $30 is down $12. Cal $12 minus $32 is down $20. Dee $36 minus $24 is up $12. Up $20, down $12, down $20, and up $12 sum to zero. Cal owes the group $20. Ben owes $12. Ana and Dee are the ones who receive it.',
    },
    {
      id: "checklist",
      title: "A checklist before the first tee",
      body: 'If a line is blank, do not invent it on the 10th tee.\n\n- Names, gross or net, and the holes that get a stroke if you chose net.\n- The unit. This card is $2 a skin, paid by each other player, not one shared $2 pot.\n- A tie carries the whole skin. Say it.\n- Hole 18: split among the players who tied. A playoff is a different card.\n- No "must make par" validation. The unique low score is enough, whatever the number is.\n- Who writes the four scores before anyone picks up a ball.\n- A ceiling. Three skins is $6 from each other player, $18 into one pocket, and a long carry can be heavier than that.\n- The ceiling fits a [gambling budget](/guides/gambling-budget) chosen before the round.\n- Adults 18+. [Responsible gambling](/responsible-gambling) still applies when the unit is two dollars and the carry makes it feel like a different game.\n\nA press, a junk bet, or a new unit added after a carry gets big is a new contract. It is not part of the skins you already started.',
    },
    {
      id: "keep-it-one-game",
      title: "Junk, validation, and one card",
      body: 'Friendly groups often bolt greenies, sandies, and a snake onto a skins round. Each of those is its own price. They do not change who won the skin. If you want them, list them at $1 or $2 and settle them on a second line. Mixing a sandy into the skin column is how the $108 stops adding up.\n\nValidation is the rule most likely to be "remembered" only when it helps. On this card a skin does not need a par, a green in regulation, or a fairway. The lone low score is the whole test. If your group wants validation, write the sentence "a skin counts only if that score is par or better" and then rebuild the card. Several holes above would change. Do not apply it at the car.\n\nOne person keeps the numbers. Read the winner and the skins in play before you walk off. A carry that is forgotten becomes a $2 hole when it should have been a $4 or $6 hole, and the nets above depend on every carry in the table.\n\nThe scores are a made-up friendly card so the arithmetic can be checked. They are not a course record and not a tour round. Your group will tie on different holes. The method is what travels: unique low score, carry the rest, pay $2 times the skins from each other player, and make the four nets sum to zero.',
    },
    {
      id: "agreed-format",
      title: "Gross and net skins are different competitions",
      body: "The cited club guide uses a lowest-net-score skin. In a gross game, handicap strokes do not change that comparison. Decide which score wins, whether ties carry the skin forward and what happens if the last hole ties. A pooled entry-fee skins contest and a per-opponent payment game need different settlement arithmetic; state who contributes and who is paid before the round.\n\nExplore the [sports betting topic](/guides/topics/sports-betting) for related rules and examples.",
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
  ],
  sources: [
    {
      label: "Talisker Club: golf guide, Nassau and net skins formats",
      url: "https://www.taliskerclub.com/wp-content/uploads/2025/03/GOLF-GUIDE-2025-7.pdf",
    },
    {
      label: "USGA: amateur-status guidance on optional wagering",
      url: "https://www.usga.org/content/usga/home-page/rules-hub/amateur-status/amateur-status-modernization/general-guidance-notes.html",
    },
  ],
  related: ["wolf-golf-game", "nassau-bet", "golf-side-bets", "bingo-bango-bongo-golf"],
  updated: "2026-11-26",
};

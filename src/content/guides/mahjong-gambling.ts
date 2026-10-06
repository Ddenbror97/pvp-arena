import type { Guide } from "./types";

export const guide: Guide = {
  slug: "mahjong-gambling",
  cluster: "Games of chance",
  keyword: "mahjong gambling",
  secondary: [
    "mahjong for money",
    "mahjong parlour",
    "hong kong mahjong scoring",
    "mahjong stakes",
    "fan scoring mahjong",
  ],
  title: "Mahjong Gambling: Fan Stakes, Parlours and Pay Rules",
  description:
    "Mahjong gambling: Hong Kong fan tables, who pays on a discard, Macau and HK parlours, Japanese riichi sticks, and how adults set a unit.",
  h1: "Mahjong gambling: stakes, fan scoring, parlours and who pays",
  answer:
    "Mahjong gambling is the tile game played for money. Players agree a cash unit per scoring point, convert a winning hand's fan into that unit, and settle after each hand or at the end of a session. In Hong Kong and Macau the usual ladder is fan on a published table; the discarder often pays the whole win. Licensed parlours rent tables. Adults only, 18+ or the local legal age.",
  facts: [
    "Hong Kong-style tables convert fan (番) into points on a half-spicy or full-spicy ladder, then multiply by an agreed cash unit.",
    "A common minimum is 3 fan to win; a cap of 8, 10 or 13 fan stops a single rare hand from emptying a night's bankroll.",
    "Discarder-pays-all (全銃) makes one player settle the whole converted score; a self-draw usually charges all three opponents.",
    "Commercial mahjong in Macau is reserved to licensed gaming concessionaires; Hong Kong parlours typically charge table rent rather than a rake on each win.",
    "Japanese riichi money games settle in point sticks with uma and oka bonuses at the end of a hanchan, not a per-hand cash fan table.",
  ],
  sections: [
    {
      id: "what",
      title: "What mahjong gambling actually is",
      body: `Mahjong gambling is not a different game from social mahjong. It is the same draw-and-discard contest, with a written price on each scoring unit. Four adults sit, agree a unit, a minimum fan, a cap and who pays whom, then play. The tiles, walls and melds belong on the [mahjong tiles](/guides/mahjong-tiles) page. This page is the money layer: how a hand becomes cash, how parlours charge for a seat, and why two tables that look identical can have very different risk.

The game sits in the [Games of chance topic](/guides/topics/games-of-chance) with other tile games that people stake. Skill is real. Counting remaining copies, choosing a wait and deciding whether to discard a dangerous tile all move results over a long night. The wall is still random. A single expensive discard can cost more than an hour of careful play.

Agree the following before the first wall goes up:

1. **Unit.** The cash value of one scoring point after fan is converted.
2. **Minimum fan.** Often 3. A cheap "chicken" hand is illegal at many money tables.
3. **Cap.** 8, 10 or 13 fan. Above the cap, the hand pays as if it hit the cap.
4. **Who pays.** Discarder-pays-all, a 2-1-1 split, or self-draw multiples.
5. **Table fee.** Hourly rent, a per-hand "water" charge, or nothing at a private home.

Write those five items down. Most kitchen-table arguments are about a rule that was never said aloud. Anyone playing for money must be 18+ or the local legal age; use [responsible gambling](/responsible-gambling) tools if a regular game starts to chase.`,
    },
    {
      id: "fan",
      title: "Fan, spicy tables and a worked cash settlement",
      body: `Hong Kong and Cantonese money games score in two steps. First you count **fan** for patterns: a dragon pung, a seat-wind pung, a self-draw, a half flush, all pungs, a full flush and so on. Then you convert fan into **points** on a table the group has chosen. Those points times the unit are cash.

Two conversion tables dominate. **Half spicy** (半辣上) is the older ladder and the one used in many club and association rules: it doubles only on some steps, so a 10-fan hand is 128 points, not 1,024. **Full spicy** (辣辣上) doubles every extra fan after the base, so the same 10-fan hand is 1,024 points. That is an eight-fold difference at the top of a 10-fan cap. Pick the table before you pick the unit.

| Fan | Half spicy (common club ladder) | Full spicy |
| --- | --- | --- |
| 3 | 8 | 8 |
| 4 | 16 | 16 |
| 5 | 24 | 32 |
| 6 | 32 | 64 |
| 7 | 48 | 128 |
| 8 | 64 | 256 |
| 10 | 128 | 1,024 |

### Worked example

Unit = $2 per point. Winner has 3 fan. Discarder-pays-all. Half spicy or full spicy both pay 8 points at 3 fan, so the discarder pays 8 × $2 = $16. The other two opponents pay nothing on that hand.

Same hand, self-draw, house rule "each of the other three pays the table amount": each opponent pays $16, winner collects $48. That is why self-draw is worth chasing at money tables, and why a player sitting on a cheap ready hand will often refuse a dangerous discard even when it completes a low-value chow.

Same 3-fan discard win at a $10 unit is $80 from one person. Raise the unit and you have not changed the skill of the game; you have changed how large one mistake is. If $80 is a problem, the unit is too large, not the fan table.

A 10-fan cap on half spicy at $2 is a $256 ceiling (128 × $2). On full spicy it is $2,048. Groups that want lively play without a ruinous hand choose half spicy, a lower cap, or both. That is the same bankroll idea as [risk of ruin](/guides/risk-of-ruin): one tail event should not empty the session.`,
    },
    {
      id: "who-pays",
      title: "Who pays: discarder, split and self-draw",
      body: `The pay rule changes behaviour more than the fan list does.

### Discarder-pays-all

The player who threw the winning tile settles the whole converted score. The other two are spectators on that hand. This is the rule that makes "safe discards" a money skill. Throwing into a visible half flush, or into a player who has already punged two dragons, is how a careful night becomes a short one.

### Split payments

Some tables charge the discarder half and the other two a quarter each, or use a 2-1-1 split of the table amount. The winner still receives the same total; the pain is shared. That lowers the cost of a single bad discard and also lowers the incentive to defend.

### Self-draw

A win from the wall usually bills every opponent. Whether each pays the full table amount or half of it is a house rule. Either way, a self-draw is worth more than the same fan off a discard. Players who can wait for a self-draw on a large hand will do so when the unit is high.

### Bao and responsibility

Some groups add **bao** rules: if you deal into an obvious expensive hand — four concealed pungs waiting, or a player who has exposed three kongs — you may be solely liable even at a split table. These rules are local. Agree them. Do not invent them after the win is declared.

The expected cost of a night is not the unit. It is unit × average points you pay minus average points you collect. Over many sessions, stronger players collect. Over one session, the wall dominates. That mix is the same skill-and-chance split described in [skill-based gambling](/guides/skill-based-gambling).`,
    },
    {
      id: "parlours",
      title: "Parlours in Hong Kong, Macau and elsewhere",
      body: `A private home game has no house. A parlour does. The parlour's income is usually **table rent** (an hourly fee per table or per seat) and sometimes a small **water** charge on wins. The operator is not taking a percentage of every pot the way a poker room rakes a flop. You are paying for space, tiles, tea and a seat.

Hong Kong has long had licensed mahjong parlours (麻雀館). They are social rooms with posted hours and table fees. Macau's gaming law is stricter on the commercial form: running a mahjong business for profit is reserved to the city's licensed casino concessionaires. Unlicensed rooms that charge hourly table rent have been treated as illegal gambling operations; local reporting of police actions describes exactly that charge. Playing at a friend's flat for a modest unit is a different legal question in every jurisdiction, and this page is not legal advice. Check local law.

Mainland China generally prohibits gambling. Japan allows private play and has a large riichi club culture; public gambling is tightly restricted. In North America, American mahjong under the National Mah Jongg League card is more often a club and charity pastime than a high-unit cash game, though any group can attach a stake if local law allows.

### What the rent does to the maths

Suppose four players pay $15 an hour for a table and play three hours. That is $45 of rent in the room, $11.25 each before a tile is scored. If the unit is $1 and net transfers among the four after three hours are a few tens of dollars, rent can be the largest "house" anyone paid. Size the unit so that skill can still show through the rent, or play at home.

[Pai gow tiles](/guides/pai-gow-tiles) is the other Chinese tile game that casinos actually bank. Mahjong in a licensed casino is less common than pai gow or baccarat; most mahjong money still sits in parlours and private rooms.`,
    },
    {
      id: "riichi",
      title: "Japanese riichi sticks, uma and a different cash shape",
      body: `Riichi mahjong for money does not use a Hong Kong fan table. It uses the Japanese point system (fu and han), then settles with **point sticks**. A typical starting score is 25,000 points. After an east-south hanchan (two winds), players compare scores.

End-of-game payments usually include:

- **Oka:** a first-place bonus built from the leftover points above 25,000 × 4 (often 20,000 points of oka).
- **Uma:** a placement bonus such as +15 / +5 / −5 / −15, or +20 / +10 / −10 / −20, in units of 1,000 points.

A cheap dealer tsumo (self-draw) of 1 han 30 fu charges 500 from each opponent under standard Japanese payments. A non-dealer ron (win on a discard) of the same hand is 1,000 from the discarder. Those numbers are in points, not currency. The table agrees how many yen, dollars or chips equal 1,000 points.

Because uma rewards finishing first, a player who is far ahead will take fewer risks late, and a player who is fourth will force. That is a different incentive from a Hong Kong table that settles every hand in cash and then stands up. Do not mix the two rule sets mid-session.

Riichi clubs in Japan often charge a table fee and keep play social. High-unit games exist, but they are not the public face of the clubs. If you sit down in a new city, ask whether the table is Japanese scoring or Hong Kong scoring before you agree a unit. The same 144-tile set can hide two incompatible economies.`,
    },
    {
      id: "session",
      title: "Session structure, variance and a hashed PvP parallel",
      body: `A money mahjong session is a sequence of negatively or positively correlated hands: the same four people, the same unit, and a wall that is reshuffled. Over one night the deal can drown skill. Over dozens of nights, discard discipline and efficiency show up. That is [expected value](/guides/expected-value-gambling) applied to a skill game: the mean is slightly in the better player's favour; the variance of a single evening is large.

### A simple session budget

1. Decide the maximum you will lose tonight, including rent.
2. Set the unit so that a 10-fan cap hit against you is a fraction of that maximum, not the whole thing.
3. Stop at the loss cap. Do not raise the unit to "get even."
4. Settle in full before anyone leaves. IOUs are how friendly games become ugly.

PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network: Jackpot, [Coinflip](/coinflip) and Roulette. There is no tile skill. A Coinflip is a fair 50/50. Roulette's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee. Results come from committed seeds, and any settled round can be checked on [fairness](/fairness). The parallel with a mahjong table is trust in the shuffle: at a physical table you watch the wash and the cut; on a hashed PvP round you check the reveal.

If the unit has already climbed past what you wrote down, the game is no longer priced entertainment. Stop. Gambling is 18+ and optional.

In the same cluster, see also [dominoes rules](/guides/dominoes-rules) and [mexican train rules](/guides/mexican-train-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do you score mahjong when playing for money?",
      a: "Count the winning hand in fan, convert fan to points on the agreed table (half spicy or full spicy in Hong Kong style), then multiply by the cash unit. Who pays depends on discarder-pays-all, a split, or a self-draw rule.",
    },
    {
      q: "What is a typical mahjong gambling stake?",
      a: "There is no universal stake. Home games may use a unit of a few dollars per point; parlour games can be higher. Size the unit so a capped hand is affordable, and include table rent in the budget.",
    },
    {
      q: "Is mahjong gambling legal?",
      a: "It depends on the country and the venue. Macau restricts commercial mahjong businesses to licensed concessionaires. Hong Kong has licensed parlours. Many places treat private play differently from a charged public room. Check local law.",
    },
    {
      q: "What does discarder-pays-all mean?",
      a: "The player who discarded the winning tile pays the entire converted score. The other two opponents pay nothing on that hand. It makes dangerous discards expensive.",
    },
    {
      q: "How is Japanese riichi gambling different from Hong Kong mahjong?",
      a: "Riichi uses fu and han, point sticks, and end-of-hanchan uma and oka bonuses. Hong Kong money games usually convert fan to cash after each winning hand on a spicy table.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Hong Kong Mahjong scoring rules",
      url: "https://en.wikipedia.org/wiki/Hong_Kong_Mahjong_scoring_rules",
    },
    {
      label: "Wikipedia: Japanese mahjong scoring rules",
      url: "https://en.wikipedia.org/wiki/Japanese_Mahjong_scoring_rules",
    },
    { label: "Pagat: Mahjong", url: "https://www.pagat.com/tile/mahj/" },
  ],
  related: [
    "mahjong-tiles",
    "pai-gow-tiles",
    "dominoes-rules",
    "skill-based-gambling",
    "expected-value-gambling",
    "mexican-train-rules",
  ],
  updated: "2026-09-27",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bad-beat-jackpot",
  cluster: "Poker",
  keyword: "bad beat jackpot",
  secondary: [
    "bad beat qualifier",
    "jackpot drop",
    "aces full beaten",
    "poker jackpot rake",
  ],
  title: "Bad Beat Jackpot: How the Drop Is Funded",
  description:
    "A bad beat jackpot pays a loser who held a very strong hand. A glossary says the money comes out with the rake. A live pool total is not printed.",
  h1: "Bad beat jackpot: who gets paid, and where the money is taken from",
  answer:
    "A bad beat jackpot pays the player who loses with a very strong hand. The PokerStars glossary, opened 20 October 2026, says the prize is funded by money taken with the rake, and that a losing Hold'em hand is typically aces full or better. A live pool and a named room's extra qualifier are not on that page.",
  facts: [
    "Last tested 20 October 2026 on the PokerStars poker glossary and on the Natural8 house rules.",
    "The glossary calls the prize a bonus for the loser of a very strong hand, funded by money removed with the rake.",
    "In Hold'em, it says the loser must typically have aces full or better beaten. A both-hole-cards rule is not on that page.",
    "The same glossary mentions some California clubs passing $50,000. That line is not a live meter.",
    "Natural8 house rules opened the same day do not print a qualifier or a pool. Both stay not published for that room.",
    "This site's 5% flop fee is not a jackpot drop. No side prize is added.",
  ],
  sections: [
    {
      id: "pays",
      title: "When a bad beat jackpot is supposed to pay",
      body: `A bad beat jackpot is not the pot. The pot still goes to the best hand that was shown, or to the last bettor if everyone else folded.

The side prize, when a room has one, goes to the player who lost while holding a hand the room calls strong enough. The PokerStars glossary, opened 20 October 2026, says it is a special bonus paid to the loser of a hand who gets a very good hand beaten.

In Hold'em, that glossary says the loser must typically get aces full or better beaten. "Typically" is the word on the page. It is not a rule for every room.

Aces full means a full house with aces as the three of a kind. Quads and a straight flush are higher, so they also sit above that line. The page does not print a chart of every pair of hands.

If the favorite wins, there is no loser who was beaten, and the side prize does not trigger. Folding before showdown does not table the loser the glossary describes.

The [poker topic](/guides/topics/poker) is the hub. [Street order for the board](/guides/texas-holdem-rules) is how the hand got to showdown.`,
    },
    {
      id: "funded",
      title: "The drop is taken with the rake, not at showdown",
      body: `The glossary says the prize is funded with money removed from the game as part of the rake. Players do not pass a hat when quads lose. The money was taken earlier, from pots, under the room's drop rule.

That page does not print a percent, a cap, or a minimum pot. A $100 pot therefore has no jackpot dollar you can subtract from the glossary alone. The amount stays not published.

Some rooms take the drop only after the flop, or only above a pot size. Neither condition is on the glossary, so both stay not published.

The prize pool is a sum of those drops over time, minus whatever the room has already paid. The glossary does not show a current total for PokerStars, so a live PokerStars figure stays not published.

Natural8 house rules, opened the same day, explain cash-game commission and a dated tournament fee. They do not mention this side prize. A qualifier for that room stays not published.

[The operator review](/guides/natural8-review) records that rake gap. It does not fill it with a jackpot percent.`,
    },
    {
      id: "typical",
      title: "Aces full is a glossary line, not every room's line",
      body: `The typical Hold'em loser on the glossary is aces full or better. A losing kings-full is a bad beat in conversation, and it is below that typical line.

The winner must have the better hand, or there is nothing to pay. The glossary does not say the winner also needs aces full. It says the loser must typically have that hand beaten.

Both players using both hole cards is a rule many card rooms add. It is not a sentence on the glossary page we opened, so that extra test stays not published.

A requirement that the hand be played to showdown, or that a certain number of players saw the flop, is also absent. Leave those tests unpublished until a room card you opened prints them.

Do not promote the word "typically" into a promise. If your room's glass says queens full, the glass wins. If your room's glass is silent, you do not have a published qualifier.`,
    },
    {
      id: "figure",
      title: "A club total on the page is not today's meter",
      body: `The glossary says that in some of the large southern California card clubs, jackpots have gotten over $50,000. That sentence sits in a definition credited to a book. It is not a screenshot of a meter on 20 October 2026.

Dollar example 1 refuses to spend that number. Over $50,000 is the glossary's club remark. It is not the prize you are owed tonight, and it is not a Natural8 pool.

A current dollar figure for any named online room was not on the pages we opened. The live total stays not published.

Sharing rules are also missing. Some prizes pay the loser a large share, the winner a smaller share, and the table a slice. Those percents are not on the glossary, so they stay not published.

Do not invent a 40% loser share to make the story concrete. An unpublished split is unpublished.`,
    },
    {
      id: "notpot",
      title: "The side prize is not the pot you already won",
      body: `Winning the hand and winning the side prize are different events. The best hand takes the pot, under ordinary rankings. The side prize, if it hits, is an extra payment the room defined.

You can win a huge pot and receive nothing from the side prize, because you were the winner. The glossary pays the loser.

You can lose with aces full and still receive nothing, if the room has no such prize, or if its qualifier is higher, or if an unpublished extra test fails. Silence is not a yes.

[A bluff that folds the field](/guides/bluffing-in-poker) never tables two monsters. No showdown, no beaten full house, no side prize under the glossary's picture.

[Three-card discards](/guides/pineapple-poker) can change which full houses appear. They do not, by themselves, create a funded prize.`,
    },
    {
      id: "compare",
      title: "A side prize beside a house game and a player pot",
      body: `Three products can all show a full house. Only one of them, on the pages we opened, describes this extra payment.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| Glossary side prize | Funded from the rake. Drop percent not published | Other players, plus a room that holds the prize | Not published. No cash-out time is printed | Not published | Not published |
| House-banked casino | Not published | The house | Not published | Not published | Not published |
| PVPspinArena | 5% of the pot only after a flop, on six-max No-Limit Hold'em | Other players | Balance updates when the hand settles | Yes, seed committed before the hand | Shown on the table |

How PvP compares: the side prize is an extra pool taken with the rake. [Poker](/poker) here charges 5% of the pot only after a flop, and that fee is the whole posted price.

The lobby [Jackpot](/) is a different pot. Every cent is one ticket, so a $10 entry in a $100 pot is 1,000 tickets out of 10,000. The winner receives the pot minus 5%, and a $200 pot pays $190.

Entries lock when the timer ends. A 3-2-1 countdown plays, then the wheel shows the ticket the committed seed already picked. That draw does not pay a beaten full house.

There is no second prize when aces full loses. A settled hand can be recomputed on the [fairness page](/fairness). That check does not audit a card-club meter.

| Question | Glossary page | Natural8 house rules | This site |
| --- | --- | --- | --- |
| Is there a side prize? | Described in general | Not printed | No |
| Losing hand in Hold'em | Typically aces full or better | Not published | Not applicable |
| Both hole cards required | Not published | Not published | Not applicable |
| Drop percent | Not published | Not published | No drop. 5% flop fee only |
| Live dollar pool | Not a current meter. Clubs over $50,000 are a definition | Not published | None |

[Ring-game money](/guides/cash-game-poker) is where a session fee belongs. A side prize is optional furniture, not part of the ranking.`,
    },
    {
      id: "dollars",
      title: "Two more dollar lines, one of them a fee we can recompute",
      body: `Dollar example 2 stays unpublished on purpose. Take a $100 cash pot.

The glossary says some money may leave with the rake for the prize, and it does not say how many dollars. The jackpot piece of that $100 is not published.

Dollar example 3 uses this site. A $100 pot that has seen a flop is charged 5%, which is $5. The winner keeps $95.

No further dollar is peeled off for a beaten full house. The $5 is the fee, and the $95 is the pot that remains. We did not time a cash-out.

Cash-out minimum here is $20 in BTC, USDC, or ETH. That minimum is not a jackpot qualifier.`,
    },
    {
      id: "checks",
      title: "Checks before you count a side prize as yours",
      body: `Read the glass in the room. A bad beat jackpot you cannot find in writing is not a debt the dealer owes you.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] Find the room's own qualifier before you celebrate a loss.
- [ ] Treat "aces full or better" as the glossary's typical line, not as every room's line.
- [ ] Leave a both-hole-cards test unpublished if the card omits it.
- [ ] Leave the drop percent unpublished if the card omits it.
- [ ] Do not use a $50,000 club remark as tonight's meter.
- [ ] Do not invent a winner share, a loser share, or a table share.
- [ ] Remember the pot still belongs to the best hand shown.
- [ ] Do not add this site's 5% flop fee on top of a club drop.
- [ ] If chasing the side prize replaces the session limit, call 1-800-GAMBLER.`,
    },
    {
      id: "limits",
      title: "Who should not play in order to hit the prize",
      body: `Do not play for money if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake rent, savings, or money with a due date.

Do not take a seat because a poster shows a large number. The only large number on the glossary is a remark about some clubs, and it is not your balance. A room that does not publish a pool has not promised you one.

Losing with a monster is still a loss of the pot. The side prize, even when it pays, is not a reason to call off a stack you cannot afford. Most hands never get near aces full.

This page is an editorial note. It is not a claim ticket and not a promise that quads are due. The deck does not owe the table a bad beat.

If play stops being a bounded spend, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How is a bad beat jackpot funded?",
      a: "The PokerStars glossary says the prize is funded with money removed from the game as part of the rake. It does not print a percent, a cap, or a minimum pot, so the dollars taken from any one pot stay not published. Players are not asked to pass a hat at showdown under that definition. A room card can be more specific. If the card you opened is silent, leave the drop unpublished.",
    },
    {
      q: "What losing hand does the glossary mention for Hold'em?",
      a: "It says the loser must typically get aces full or better beaten. Aces full is a full house with aces on top. Quads and straight flushes are stronger than that line. The word typically means the glossary is describing a common pattern, not certifying your room. Kings full is not that line. If your glass prints a different minimum, follow the glass.",
    },
    {
      q: "Does the winner also need a monster?",
      a: "The glossary ties the prize to the loser being beaten with a very good hand. It does not print a separate minimum for the winner beyond having the better hand. Extra tests, including both players using both hole cards, are not on that page and stay not published. Showdown rules that require a set number of players are also absent. Do not add them from memory.",
    },
    {
      q: "Is $50,000 the current prize?",
      a: "No. The glossary says some large southern California clubs have had jackpots over $50,000, inside a definition, not as a live meter dated 20 October 2026. A current pool for PokerStars is not on that page. Natural8 house rules do not print a pool either. Both live totals stay not published. Do not treat the club remark as money you are about to be paid.",
    },
    {
      q: "Does every poker room offer this prize?",
      a: "No. The glossary describes the prize as a special bonus, which means a room has to be running one. Natural8 house rules we opened do not mention it, so that room's version stays not published. A home game with no drop has no pool. Winning the pot never requires a side prize to exist. Ask for the card, and stop if there is no card.",
    },
    {
      q: "Does this site add the prize on top of the pot?",
      a: "No. Poker here is six-max No-Limit Hold'em between players. The fee is 5% of the pot only after a flop, and nothing extra is taken when a full house loses. A $100 pot that saw a flop pays the winner $95. You can recompute the hand on the fairness page. That check does not audit a card-club meter.",
    },
  ],
  sources: [
    {
      label: "PokerStars poker glossary — jackpot entry",
      url: "https://www.pokerstars.com/poker/terms/",
    },
    {
      label: "Natural8 house rules",
      url: "https://www.natural8.com/en/house-rules",
    },
  ],
  related: [
    "cash-game-poker",
    "texas-holdem-rules",
    "bluffing-in-poker",
    "natural8-review",
    "pineapple-poker",
    "poker-bankroll-management",
  ],
  updated: "2026-10-21",
};

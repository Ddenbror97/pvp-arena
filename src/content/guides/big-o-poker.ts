import type { Guide } from "./types";

export const guide: Guide = {
  slug: "big-o-poker",
  cluster: "Poker",
  keyword: "big o poker",
  secondary: ["big o poker rules", "big o poker strategy", "big o poker tips"],
  title: "Big O Poker Rules: Five-Card Pot-Limit Omaha Hi-Lo",
  description:
    "Big O poker rules for five-card pot-limit Omaha: pick two hole cards from five, why equity is harder than four-card PLO, and the Hold'em this site deals.",
  h1: "Big O poker: five hole cards, and you still play exactly two",
  answer: `Big O poker deals five hole cards in a pot-limit Omaha game, usually high-low with an eight-or-better low. You still build each five-card hand from exactly two of those hole cards and three community cards. Ten pairs hide inside five cards, so a pretty hand can be dominated on the high, the low, or both.

PVPspinArena does not deal Big O. The poker page is six-max No-Limit Hold'em.`,
  facts: [
    "Big O is five-card pot-limit Omaha, commonly played high-low for eight or better.",
    "Each side of the pot still uses exactly two hole cards and three board cards.",
    "Five cards give ten two-card combinations, against six combinations in four-card Omaha.",
    "A solved starting-hand chart is not printed here, because the combinations are not a chart you can memorize in an evening.",
    "PVPspinArena does not deal Big O. Open poker for six-max No-Limit Hold'em.",
    "The fee on that Hold'em is 5% of the pot only after a flop is dealt.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "Five cards on the felt, two of them in the hand",
      body: `Big O poker starts like Omaha and then adds a card. Each player gets five hole cards. Five community cards arrive on a flop, a turn, and a river.

At showdown you choose exactly two hole cards. The board supplies the other three. The spare three hole cards are dead for that five-card hand, even when they look connected.

The usual game is high-low. The high side uses ordinary poker rankings. The low side needs five unpaired cards of eight or lower, and an ace counts low on that side.

You may use one pair of hole cards for the high and a different pair for the low. If nobody qualifies low, the high takes the whole pot.

Four-card pot-limit Omaha is the cousin, and the must-use-two lesson lives on [Omaha poker rules](/guides/omaha-poker-rules). Big O does not relax that rule. It only gives you more pairs to choose from, which is why a hand that looks enormous can still be second best.

Count the pairs before you fall in love with the fan. Five cards make ten ways to choose two. Four cards make six.

Equity is harder because the two cards you must use are one of those ten, and several of the ten can be strong in opposite directions.`,
    },
    {
      id: "rules-compare",
      title: "Big O poker rules next to four-card Omaha",
      body: `### Big O poker rules

Write the constraints down before the first pot. Five hole cards. Pot-limit betting, so the largest bet is the size of the pot.

Exactly two hole cards in every made hand. A low only when it qualifies. Different rooms spell the low qualifier and the kill or half-kill extras on a house card.

If the card is silent, ask. A kill-pot rule applies only if the room explicitly adopts it.

[Texas Hold'em rules](/guides/texas-holdem-rules) are the street order most guests already know: blinds, then flop, turn, and river. Big O borrows that order and changes the private hand.

You cannot play one hole card. You cannot play the board alone.

| Piece | Big O | Four-card Omaha | Hold'em |
| --- | --- | --- | --- |
| Hole cards | 5 | 4 | 2 |
| Cards used from the hand | exactly 2 | exactly 2 | any 0, 1, or 2 |
| Two-card pairs available | 10 | 6 | 1 |
| Usual betting | pot limit | pot limit | often no-limit |
| Low half | commonly 8 or better | only in Hi-Lo games | none in high-only |

The [poker topic](/guides/topics/poker) collects the four-card and Hold'em pages. Use them when a guest argues from the wrong game.`,
    },
    {
      id: "fee-table",
      title: "Fees and the risk of sharing only part of the pot",
      body: `Big O rooms set their own rake or time charge. Read that fee with the game’s split-pot rules: a quartered low can return less than the amount you contributed even when you share a winning hand.

PVPspinArena does not deal Big O. Its [poker table](/poker) is six-max No-Limit Hold’em with a 5% pot fee only after a flop; that fee does not describe a different room’s Big O game.`,
    },
    {
      id: "dollars",
      title: "Two pots: a no-rake kitchen hand and a post-flop fee",
      body: `Dollar example 1, a home Big O pot. Three friends play $0.50/$1 and wrote down that the house takes nothing. On the flop the pot is $18.

The next player bets the pot, $18. Two opponents call. The pot becomes $18 plus three times $18, which is $72.

The winner drags $72. Nobody skims a chip for hosting. If your group wrote a different rake, throw this zero out and use the number on the card.

Dollar example 2, Hold'em on this site, as the contrast. A six-max pot reaches $36 and the flop is dealt. The fee is 5% of $36, so $1.80.

The winner is credited $34.20. A different hand that folds out before any flop pays $0 in poker fee. The $72 kitchen pot and the $36 Hold'em pot are separate scenes.

Do not subtract $1.80 from the friends' game.

The price of a call, once a bet is already in the middle, is [pot odds](/guides/poker-pot-odds). Include the call amount and the final pot, then consider whether you can win the high, low or both. In Big O the fraction is only useful after you know which two cards you are actually playing.`,
    },
    {
      id: "checklist",
      title: "Big O poker tips you can tick before you act",
      body: `### Big O poker tips

Use the list until the two-card rule feels dull.

- Fan five hole cards and count ten pairs before you call.
- Name the exact two cards you will use for the high.
- Name a different pair if you are also playing a low.
- Fold a hand whose only glory is one ace with four rags.
- Confirm the low must be eight or better before you scoop in your head.
- Say "pot" only when you mean a pot-sized bet.
- Read the house card for any kill, half-kill, or rake.
- Refuse a chart that claims to be a solved Big O range.
- Keep the session money separate from rent.
- Stop when a quartered pot makes you chase the next one.

[Poker bankroll management](/guides/poker-bankroll-management) is the cushion discussion. Five-card high-low swings harder than a tight Hold'em table, so a short roll gets loud fast.`,
    },
    {
      id: "risks",
      title: "Where five-card equity goes wrong",
      body: `### Big O poker strategy

Big O poker strategy starts with humility about equity. You are not "ahead" because you can see a straight and a low in the same fan. Those hands may require different pairs of hole cards, and only one pair is legal for each side.

A draw that uses three hole cards is a mirage.

Quartering is the expensive pattern. You win half of one side and none of the other, so you put in a full call and drag a quarter of the pot. Chasing the non-nut low, or a flush that is missing the ace, is how that happens.

The extra hole card adds more of those second-best holdings.

Pot limit lets the pot grow into a stack by the turn. A call that looks small against the whole fan can commit you to a hand you would fold if you named the two cards out loud. There is no hand chart on this page that pretends those spots are solved.

Freewheeling bluffs run into the same math. Someone at the table often has a wrap, a nut low draw, or both.

Bet when your two cards are the nuts or a draw to them. Check your pride when the hand is only pretty.`,
    },
    {
      id: "legal",
      title: "Agree the variant and eligibility first",
      body: `Meet the local minimum age and legal requirements before any money game. A private home game and operating a public cardroom can have different rules. Agree five-card dealing, the two-hole-card requirement, pot limit, low qualification and fees before starting.

Use [responsible gambling](/responsible-gambling) to set an affordable loss and time limit.`,
    },
    {
      id: "closer",
      title: "Choose the correct two-card combination",
      body: `Five hole cards create ten possible pairs, but each final hand still uses exactly two hole cards and three board cards. Study the high and low separately rather than treating every attractive draw as a scoop.

Compare [Omaha rules](/guides/omaha-poker-rules), [cash-game structure](/guides/cash-game-poker) and [short-deck poker](/guides/short-deck-poker); short deck changes the deck instead of adding a fifth hole card.`,
    },
  ],
  faqs: [
    {
      q: "What are the big o poker rules in one pass?",
      a: `You receive five hole cards and five community cards. Every high or low hand uses exactly two hole cards and three from the board. Betting is pot limit.

The common form is high-low, and the low must be eight or better. Rooms add kill pots and rake on their own card. Those extras are not a single global rule.`,
    },
    {
      q: "How is Big O different from four-card Omaha?",
      a: `Four-card Omaha gives you six ways to choose two hole cards. Big O gives you ten. The must-use-two rule does not change.

The extra card adds more dominated draws and more ways to be quartered in a high-low pot. Read the four-card cousin page for the shared showdown rule, then add the fifth card yourself.`,
    },
    {
      q: "Does big o poker strategy include a solved hand chart?",
      a: `No chart on this page pretends to be solved. Ten combinations do not collapse into a night-one grid that is honest against every stack depth. Prefer hands where several pairs work together, and fold fans that depend on one card.

Equity is harder precisely because you must use two cards from five.`,
    },
    {
      q: "Is Big O dealt on PVPspinArena?",
      a: `No. The poker lobby is six-max No-Limit Hold'em. Its charge on a flopped pot is 5%.

A $36 pot that sees a flop pays $1.80, and the winner receives $34.20. Big O remains a rules topic, not a button in that lobby.`,
    },
    {
      q: "What does a quartered pot mean?",
      a: `You win only half of one side of a split pot. A $72 pot pays you $18 if you are quartered and nobody rakes. You can lose money on a hand you partly won.

That is why nut lows and nut highs matter more than a hand that looks involved.`,
    },
    {
      q: "Where do big o poker tips stop and pot odds start?",
      a: `Tips here are about naming the two cards and refusing second-best draws. The price of calling a bet that is already out is pot odds, on its own page.

Do not treat a fan of five cards as five free chances. Only the legal pairs count.`,
    },
  ],
  sources: [
    {
      label: "Pagat — public card-game rules",
      url: "https://www.pagat.com/",
    },
    {
      label: "World Series of Poker",
      url: "https://www.wsop.com/",
    },
  ],
  related: [
    "omaha-poker-rules",
    "texas-holdem-rules",
    "poker-pot-odds",
    "cash-game-poker",
    "short-deck-poker",
  ],
  updated: "2026-11-26",
};

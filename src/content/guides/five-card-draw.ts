import type { Guide } from "./types";

export const guide: Guide = {
  slug: "five-card-draw",
  cluster: "Poker",
  keyword: "5 card draw",
  secondary: ["draw poker ante", "jacks or better draw", "one draw betting"],
  title: "5 Card Draw Rules, Ante, and Two Bet Rounds",
  description:
    "5 card draw deals five cards, an agreed ante, and two betting rounds on the Pagat page. A dollar ante example is arithmetic. It is not a profit plan.",
  h1: "5 card draw deals five private cards before a single exchange",
  answer:
    "5 card draw, on the Pagat page opened on 20 October 2026, deals five private cards, an agreed ante, and two betting rounds around one draw. If everyone checks first, the hands are thrown in and the pot stays. Robert's Rules version 11 allows a wider exchange than Pagat. Those are two sheets. The dollar ante below is an illustration.",
  facts: [
    "Last tested 20 October 2026. Opened Pagat's draw page, Robert's Rules of Poker version 11, and the National Council on Problem Gambling helpline page.",
    "Pagat's basic 5 card draw uses a 52-card pack, an agreed ante, five cards each, and one draw of zero to three cards.",
    "If everyone checks on the first round, Pagat says to throw the hands in, pass the deal, keep the pot, and ante again.",
    "Robert's Rules draw-high section allows a draw of up to four cards, and a fifth under a stated procedure. That cap is not Pagat's.",
    "Neither page prints a rake. A $1 ante on this note is an illustration, not a figure from either sheet.",
    "Jacks or better is a separate Pagat variation. It is not the basic game.",
  ],
  sections: [
    {
      id: "deal",
      title: "What 5 card draw deals before anyone bets",
      body: `Pagat's basic game uses a standard 52-card pack. Two to six players are the range it prefers, and it says six is probably the best game.

Seven or eight can sit, with the warning that the deck may run out during the draw. The page does not print a house rule that forbids the seventh seat. It prints the disadvantage.

Each player gets five cards, face down, clockwise, one at a time. Players may look. There is no community board.

The [Poker](/guides/topics/poker) hub collects the other deals. [The beginner deal](/guides/how-to-play-poker) is the wider start. [Hold'em streets](/guides/texas-holdem-rules) are a different shape, with shared cards and no discard.`,
    },
    {
      id: "ante",
      title: "The ante, and the redeal if everyone checks",
      body: `Before the deal, each player puts an agreed ante into the pot. Pagat says the ante is usually the same amount as the minimum bet, and it does not print that amount in dollars.

That posting is how 5 card draw starts on this sheet. The dollar figure is still unpublished.

Betting on the first round starts with the player to the dealer's left. If everyone passes, the cards are thrown in, the deal passes left, the pot remains, and everyone adds another ante.

There is no draw on that deal. The pot is simply larger for the next one. Standing up from the table does not cash that pot under the sentence Pagat prints.

A blind, instead of or in addition to an ante, is a variation on the same page. The basic game this section describes is the ante.`,
    },
    {
      id: "draw",
      title: "How many cards Pagat lets you throw",
      body: `If more than one player remains after the first betting round, each active player may draw once. Pagat's basic cap is zero to three cards.

You announce the count, discard that many face down, and the dealer waits until those cards are down before pitching replacements. Discarding none is standing pat. The page says it is in your interest not to announce early.

Until the second round of betting begins, any player may ask how many cards another drew and must get an honest answer. After that round starts, the page does not repeat the right.

The second betting round starts with the player who opened the first round, or the nearest active player to that opener's left if the opener folded. Limits on the second round are normally higher, and Pagat says typically double.

In a fixed or spread limit game, Pagat says the second round, like the first, is normally limited to a bet and four raises. Showdown starts with the last aggressor. If everyone checked, the opener shows first.`,
    },
    {
      id: "jacks",
      title: "Jacks or better is a different game",
      body: `Pagat treats jacks or better as its own variation, also called jack pots. Before anyone has bet, a player who lacks a pair of jacks or better must pass.

Any hand that beats a pair of tens qualifies, so two pair can open and a pair of tens cannot. Once someone opens, others may call or raise with anything.

If the opener discards part of the qualifying hand, that must be announced, and those discards stay separate. Pagat calls that splitting openers. At the award, the opener must show enough to prove the open, even if everyone else folded.

If the opener cannot show a qualifying hand, the hand is dead and cannot win the pot. If nobody opens, the cards are thrown in and the deal passes. Progressive jack pots, which raise the open to queens and then kings, are another variation on the same page.`,
    },
    {
      id: "roberts",
      title: "Robert's Rules lets you draw more",
      body: `Robert's Rules of Poker, version 11, section on draw high, is not a copy of Pagat's basic cap. It says a player may draw up to four consecutive cards.

A player who wants five new cards receives four at once, and the fifth after everyone else has drawn. If that player is last, a card is burned before the fifth. Check-raise, in that section's spelling, is permitted both before and after the draw.

Five cards constitute a playing hand. Fewer than five for a player other than the button, before action, is a misdeal. More or fewer than five after the draw is a fouled hand.

The betting limit after the draw is twice the limit before the draw. Some games let you open on anything, and others require jacks or better.

The sheet says both exist, and it does not pick a dollar ante. A picture of 5 card draw with a $1 ante is still only an illustration.

[Deuce-to-seven lowball](/guides/2-7-triple-draw) is a different draw family, with three draws and a low target. Do not paste this page's one-draw cap onto that game. [The four-card low game](/guides/badugi-poker) uses four cards and three draws.`,
    },
    {
      id: "dollars",
      title: "Dollar antes on a four-player table",
      body: `Pagat does not print $1. These pictures only show the ante rule with a number you can add.

Example 1: four players each ante $1, so the pot is $4 before any bet. If everyone checks, Pagat says the hands are thrown in and each player adds another ante. The pot is then $8, and still nobody has won it.

Example 2: someone opens for $2 into that $4, and two players call. The pot becomes $10. Each caller may then draw under the cap the table adopted, which is zero to three on Pagat's basic sheet and a wider draw under Robert's Rules.

Example 3: two $50 Coinflip stakes on this site make a $100 pot, the fee is $5, and the winner receives $95. That fee is not a draw rake, neither sheet prints a collection, and we did not time a cash-out.`,
    },
    {
      id: "compare",
      title: "Draw high beside a house bank and a player pot",
      body: `The two sheets price the players against each other. They do not print a house percentage.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| This draw on the sheets we opened | rake not published | other players | not published | not published | ante is agreed, dollar amount not published |
| House-banked casino | not published | the house | not published | not published | not published |
| PVPspinArena | Coinflip and Jackpot take 5% of the pot | other players | balance updates when the round settles | yes, where a seed is committed before the round | Coinflip minimum is $1 |

How PvP compares: [Poker](/poker) on this site is a player table, and it is not this draw. [Fairness](/fairness) recomputes a settled round that publishes a seed. The check does not audit Pagat, and it does not choose between a three-card cap and a four-card cap.

| Choice the table must make | Pagat basic | Robert's Rules draw high |
| --- | --- | --- |
| Forced money | agreed ante, usually the minimum bet | button and an ante |
| Cards exchanged | zero to three | up to four, or five with the stated procedure |
| If the first round checks through | redeal, pot stays, ante again | not the same sentence |
| Second-round limit | typically double | twice the earlier limit |
| Rake | not published | not published |

[How many buy-ins to keep aside](/guides/poker-bankroll-management) is a separate decision from the ante. A $1 illustration is not a bankroll plan.`,
    },
    {
      id: "list",
      title: "A list before the first discard",
      body: `Agree the sheet out loud. The two pages do not match on the draw cap.

- [ ] Name whether the table uses Pagat's zero-to-three cap or the wider draw.
- [ ] Post the agreed ante before the cards are pitched.
- [ ] If everyone checks, keep the pot and ante again, on the Pagat basic rule.
- [ ] Announce the draw count only on your turn.
- [ ] Answer honestly if asked how many you drew, before the second betting round, on Pagat.
- [ ] In jacks or better, do not open without a hand that beats tens.
- [ ] Split openers only with the discards kept separate.
- [ ] Do not invent a rake either sheet left blank.
- [ ] Set a loss stop before the first ante.
- [ ] If the redeals become a chase, call 1-800-GAMBLER.

The helpline page prints 1-800-MY-RESET and says that number is not a crisis line. A crisis is 911 or 988.`,
    },
    {
      id: "stop",
      title: "Who should not sit the draw",
      body: `Do not play if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not ante rent or money with a due date.

A check-through does not pay you. It grows a pot you can still lose on the next deal. Nothing on either sheet stores a debt the deck must repay.

This page is an editorial note. We did not open a card-room account.

Cash-out minimum on this site is $20 in BTC, USDC, or ETH. If the hour stops being optional, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How many betting rounds does the basic game have?",
      a: "Pagat's basic 5 card draw has two betting rounds, one before the draw and one after, if the first round was opened. If everyone checks on the first round, there is no draw and no second round. The hands are thrown in, the deal passes, the pot stays, and each player antes again. Jacks or better and a two-draw variation are separate games on the same page. Do not mix their streets into the basic deal.",
    },
    {
      q: "How many cards can you exchange?",
      a: "Pagat's basic game allows zero to three. Robert's Rules of Poker version 11 allows up to four, and a fifth with four dealt immediately and the last card after the other draws. Those are different published procedures. A table has to pick one. Standing pat means exchanging zero. The pages do not print a single worldwide cap, so a cap you cannot point to on the card in use is not published.",
    },
    {
      q: "What is the ante in dollars?",
      a: "Pagat says each player posts an agreed ante, usually equal to the minimum bet, and it does not print a dollar figure. The $1 picture on this page is an illustration of four players posting, a $4 pot, and a second ante if everyone checks. It is not a house minimum. Neither sheet prints a rake to subtract from that pot. If your card names a different ante, the card wins.",
    },
    {
      q: "What does jacks or better change?",
      a: "Before the pot is opened, you need a hand that beats a pair of tens. A pair of jacks qualifies, and so does any better hand, including two pair. A pair of tens does not. After the open, other players may call with anything. If you discard part of the qualifying hand, Pagat says you must announce the split and keep those discards apart, then show them if you win. If you cannot prove the open, the hand is dead.",
    },
    {
      q: "Who should skip the game?",
      a: "Anyone under 18, anyone under a higher local age, and anyone playing where the game is illegal. Anyone staking rent or money with a due date should not ante. Anyone who needs a check-through pot to pay them back is chasing, and the sheet does not owe the next deal. Call 1-800-GAMBLER if the session is no longer optional. The helpline page we opened also prints 1-800-MY-RESET and says it is not a crisis line.",
    },
    {
      q: "Does this site deal the game?",
      a: "This note does not put the draw on a PVPspinArena table. The poker room here is a player game with its own card, and we did not sit a hand. Coinflip takes 5% of the pot, which is a different product. Two $50 stakes make a $100 pot, the fee is $5, and the winner receives $95. Fairness recomputes a settled round that publishes a seed. That check does not choose a draw cap.",
    },
  ],
  sources: [
    {
      label: "Pagat — Five Card Draw",
      url: "https://www.pagat.com/poker/variants/5draw.html",
    },
    {
      label: "Robert's Rules of Poker, version 11",
      url: "https://homepokertourney.org/roberts-rules-of-poker.htm",
    },
    {
      label: "National Council on Problem Gambling helpline",
      url: "https://www.ncpgambling.org/help-treatment/about-the-national-problem-gambling-helpline/",
    },
  ],
  related: [
    "texas-holdem-rules",
    "how-to-play-poker",
    "2-7-triple-draw",
    "badugi-poker",
    "poker-bankroll-management",
    "omaha-poker-rules",
  ],
  updated: "2026-10-20",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "2-7-triple-draw",
  cluster: "Poker",
  keyword: "2-7 triple draw",
  secondary: ["2-7 triple draw rules", "2-7 triple draw strategy", "2-7 triple draw tips"],
  title: "2-7 Triple Draw: Rules for Deuce-to-Seven Low",
  description:
    "2-7 triple draw rules: the best low is 7-5-4-3-2, aces play high, you get three draws, and this lowball game is not razz or our Hold'em.",
  h1: "2-7 triple draw: the nuts is 7-5-4-3-2, and aces are high",
  answer: `2-7 triple draw is lowball draw poker. Each player starts with five cards, there are three draws, and the lowest hand wins.

The best hand is 7-5-4-3-2, not a straight and not a flush. Aces are high, so ace-2-3-4-5 is a terrible ace-high hand.

Straights and flushes count against you. That is a different game from razz, which uses an ace-to-five low.

PVPspinArena does not deal 2-7.`,
  facts: [
    "You draw up to three times after the initial five-card deal.",
    "The wheel of this game is 7-5-4-3-2, often called the number.",
    "Aces are high. A pair, a straight, or a flush makes the hand worse.",
    "Razz is stud, not draw, and its best hand is ace-2-3-4-5.",
    "Limit or pot-limit betting both exist. One universal bet size is not published here.",
    "The site deals six-max No-Limit Hold'em, not triple draw.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "Lowball with three chances to break a pair",
      body: `2-7 triple draw deals five cards face down. There is a betting round.

Each player still in may discard any number and draw replacements. That happens three times, with a betting round after each draw.

Then you show the best five-card low under deuce-to-seven rules.

Low means you want small, unpaired, unconnected cards in different suits. The perfect holding is 7, 5, 4, 3, 2, with more than one suit so it is not a flush, and with a gap so it is not a straight. Seven-six-five-four-three is a straight, so it is a high hand and it loses to a rough eight.

Standing pat means you draw zero. You may pat a made seven or a smooth eight. You may also pat a hand that is secretly a straight, which is a disaster you should catch before you tap the table.

[How to play poker](/guides/how-to-play-poker) will not teach these draws. It teaches Hold'em. Use it only if someone at the table has confused the two games.

Compare two made lows after you sort each one from high card to low card. The lower high card wins.

If those match, walk down until a rank differs, and the smaller rank wins that test. Eight-six-five-four-two beats eight-seven-six-five-four because, after the shared eight, the six is lower than the seven.

A smooth draw dumps the brick and keeps the tiny cards. A rough draw keeps a seven or an eight beside several middle ranks and hopes.

Fixed-limit play may sell the next card for a small known price. Pot-limit play can charge the size of the pot for the same card.

Your card sets that price. This page does not.

Opponents see how many cards you drew, not which ranks you threw. Drawing three announces a mess.

Standing pat announces a made low. Patting a hidden pair means you will pay later streets for a hand that cannot win.

Count the five ranks before your hand taps the felt.

The nuts is 7-5-4-3-2. The next hands are still seven-high, with side cards as low as they can sit without a pair, a straight, or a flush.

You do not need a poster of every low. You need a target for the one-card draw.

If that target contains an ace, you brought the wrong game's nuts.`,
    },
    {
      id: "versus-razz",
      title: "2-7 triple draw rules beside an ace-to-five low",
      body: `### 2-7 triple draw rules

Aces are high. A wheel that looks pretty in another game, ace-2-3-4-5, is an ace-high straight here and it is close to the worst hand you can table.

The ace does not play low. Say that before a new player scoops what they think is the nuts.

Razz uses an ace-to-five low. Its best hand is ace-2-3-4-5.

Straights and flushes do not hurt a razz hand. Razz is also seven-card stud, with upcards, antes, and a bring-in, not a draw.

This page will not teach that street order. The one line you need is that the games want opposite aces.

| Idea | 2-7 triple draw | Razz | Hold'em |
| --- | --- | --- | --- |
| Best hand | 7-5-4-3-2 | A-2-3-4-5 | a royal flush |
| Ace | high only | low | high, or low in a straight |
| Straights and flushes | they hurt your low | they do not hurt | they are high hands |
| Deal | five cards, three draws | seven-card stud | two hole cards, five on the board |
| Dealt here | no | no | yes, six-max no-limit |

The [poker topic](/guides/topics/poker) can point a stud player to [seven-card stud](/guides/seven-card-stud) for the high stud parent. Do not deal stud cards and then score them as 2-7.`,
    },
    {
      id: "fees",
      title: "A draw game we do not spread, and a Hold'em fee we publish",
      body: `A card room's 2-7 game may be fixed limit or pot limit, with a rake or a time charge. Those dollars are the room's card.

They are not published here as a universal structure. A house-banked casino game is a bet against the house, and any edge is not published here.

PVPspinArena does not deal 2-7 triple draw. Poker in the lobby is six-max No-Limit Hold'em.

Once a Hold'em flop is dealt, the site keeps 5% of that pot. We do not list a promo code for a lowball room.

| | 2-7 table | House-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| Game | triple-draw lowball, ace high | not published | six-max No-Limit Hold'em |
| Bet size | limit or pot-limit, not one global number | not published | no-limit |
| Fee | not published | not published | 5% of the pot only after a flop |
| Promo code | not published | not published | we do not list a promo code |
| Funding | not published | not published | US dollars from Bitcoin, or USDC or ETH on Base |

[Cash game poker](/guides/cash-game-poker) talks about ring-game money in Hold'em. Borrow the session idea, not the hand rankings.`,
    },
    {
      id: "dollars",
      title: "A kitchen lowball pot and a post-flop Hold'em charge",
      body: `Dollar example 1, friends playing $0.50/$1 triple draw. They wrote that the house takes nothing, and they did not pretend a Las Vegas limit schedule applies.

Three players put $6 each into the pot across the draws. The pot is $18.

The winner shows 7-5-4-3-2 and takes $18. Second place shows 8-6-5-4-2 and wins nothing.

An ace in either hand would have made it worse, not better.

Dollar example 2, Hold'em on this site. A six-max pot reaches $30 and the flop is dealt.

The fee is 5% of $30, so $1.50. The winner receives $28.50.

There is no draw and no 7-5 low in that pot. Leave before the flop and the Hold'em charge is $0.

Keep the $1.50 out of the kitchen $18.

If your home game uses pot-limit instead of a small fixed bet, the $18 can become a much larger number. That choice belongs on your card. It is not a figure this page can assign to every 2-7 game.`,
    },
    {
      id: "checklist",
      title: "2-7 triple draw tips before you stand pat",
      body: `### 2-7 triple draw tips

- Sort your five cards and look for a pair first.
- Break pairs. A pair cannot be a winning low.
- Check for a straight before you pat a "smooth" run.
- Check for a flush before you pat a one-suit hand.
- Remember the ace is a brick, not a wheel card.
- Name 7-5-4-3-2 as the nuts so the table agrees.
- Draw the cards that move you toward a seven or a smooth eight.
- Do not chase a pat ten when the draws are still cheap and the hand is rough.
- Announce the betting form, limit or pot-limit, before the first deal.
- Keep razz talk off the table so ace-to-five does not sneak in.
- Stop the session when a rough eight starts feeling like a mandatory call.

[Poker bankroll management](/guides/poker-bankroll-management) is the page for how many buy-ins you can lose while you learn to spot a flush you almost patted.`,
    },
    {
      id: "risks",
      title: "Patting too early, and treating an ace like a friend",
      body: `### 2-7 triple draw strategy

2-7 triple draw strategy is discard discipline. The classic leak is standing pat on a hand that looks low and is actually a straight or a flush.

Seven-six-four-three-two in one suit is a flush. It loses to any real low.

Spread the cards and name the hand out loud the first dozen sessions.

The second leak is keeping an ace because other lowball games loved it. In 2-7 the ace is high.

Drawing to ace-3-4-5-7 is drawing to a hand that still has an ace in it. Break the ace unless you are already in a spot where the card is the only brick and you understand you hold ace-high.

New players should just break it.

The third leak is borrowing razz instincts. A razz player wants ace-2-3-4-5 and ignores suits.

Importing that target into triple draw makes you pat the worst shape in the game. One sentence is enough razz: different deck presentation, different ace, different nuts.

Then come back to the draw.

Betting form changes the cost of a rough draw. A fixed-limit game lets you see another card for a known price.

A pot-limit game can charge you the pot to draw one card to a nine. Neither price is printed here as the official one.

Read the card, then decide whether a one-card draw to a jack is vanity.`,
    },
    {
      id: "legal",
      title: "Adults only, and a lowball night is not a cardroom plan",
      body: `Play 2-7 for money only with adults. Where the law sets an age above 18, use the higher age.

This is not legal advice. A home lowball game is still subject to local rules.

Read the regulator rather than a draw chart.

This article will not help you open a public draw room, rake strangers, or advertise a seat. Friends, a written betting form, and a stop time are the whole product.

PVPspinArena does not deal 2-7 triple draw. Tell that to anyone who searches the lobby for deuce-to-seven. Send them to Hold'em if they want a table that exists.

The [responsible gambling](/responsible-gambling) page belongs in the plan because triple draw lets you pay three streets of draws on a hand that never gets smooth. Set a loss stop before the first pat-or-draw decision.`,
    },
    {
      id: "closer",
      title: "Hold'em is the poker this lobby actually deals",
      body: `How PvP compares: 2-7 is a draw for the lowest non-straight, non-flush hand, with aces high. [Poker](/poker) is six-max No-Limit Hold'em, high hand wins, full deck, no draws.

[Fairness](/fairness) covers the seed committed for that Hold'em. When the page shows a live block, the block updates from settled play.

No triple-draw result is pasted here.

Big O, short deck, razz, and open-face Chinese are not dealt either. Razz gets its own guide if you need the ace-to-five stud low. This page stays on the draw.

Sort to 7-5-4-3-2. Break aces, pairs, straights, and flushes. Then, if you wanted a site table, play the Hold'em whose fee is 5% only after a flop.

A draw with a wheel that is a bad hand is not stud. [Ace-to-five stud low](/guides/razz-poker) wants the opposite wheel.`,
    },
  ],
  faqs: [
    {
      q: "What are the 2-7 triple draw rules for the best hand?",
      a: `The best hand is 7-5-4-3-2 with mixed suits, so it is not a flush, and with a gap, so it is not a straight. Aces are high.

Any pair loses to any non-pair low. You receive five cards and may draw three times.`,
    },
    {
      q: "How is this different from razz?",
      a: `Razz is seven-card stud for an ace-to-five low, and ace-2-3-4-5 is its nuts. Straights and flushes do not count against razz.

2-7 is draw poker, the ace is high, and straights and flushes ruin the low. Do not use one game's target in the other.`,
    },
    {
      q: "Is the betting always fixed limit?",
      a: `No. Fixed limit is common in some tournaments, and pot-limit 2-7 is a real form too.

The dollar size is whatever the table wrote down. This page does not publish one structure as universal.`,
    },
    {
      q: "Does PVPspinArena deal triple draw?",
      a: `No. The poker game is six-max No-Limit Hold'em.

On a flopped pot the charge is 5%. A $30 pot that sees a flop pays $1.50, and the winner receives $28.50.

Deuce-to-seven is a rules topic only.`,
    },
    {
      q: "Why is ace-2-3-4-5 bad here?",
      a: `Because aces are high and that holding is a straight. It is a strong low in razz and a near-worst hand in 2-7.

If a player celebrates it, they are in the wrong game. Show them 7-5-4-3-2 instead.`,
    },
    {
      q: "What 2-7 triple draw tips stop a bad pat?",
      a: `Look for pairs, then straights, then flushes, then aces. Pat only when the five cards are a real low.

Draw when one card can break a pair or a straight. Keep the betting form on the card so a one-card draw has a known price.`,
    },
  ],
  sources: [
    {
      label: "Robert's Rules of Poker (Pagat copy)",
      url: "https://www.pagat.com/docs/RobsPkrRules11.pdf",
    },
    { label: "World Series of Poker", url: "https://www.wsop.com/" },
  ],
  related: [
    "seven-card-stud",
    "how-to-play-poker",
    "cash-game-poker",
    "poker-bankroll-management",
    "razz-poker",
  ],
  updated: "2026-10-20",
};

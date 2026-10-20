import type { Guide } from "./types";

export const guide: Guide = {
  slug: "razz-poker",
  cluster: "Poker",
  keyword: "razz poker",
  secondary: ["razz poker rules", "razz poker strategy", "razz poker tips"],
  title: "Razz Poker Rules: Ace-to-Five Stud Lowball",
  description:
    "Razz poker rules for seven-card stud low: ace-to-five, the nuts is A-2-3-4-5, bring-in and antes exist, and the dollars are not one universal limit.",
  h1: "Razz poker: seven-card stud for the lowest ace-to-five hand",
  answer: `Razz poker is seven-card stud played for low. Aces are low.

Straights and flushes do not hurt you. The best hand is A-2-3-4-5.

You use the best five cards out of seven. Antes and a bring-in exist, and many rooms use fixed limits, but the dollar amounts are not one universal structure.

This is not 2-7 triple draw. PVPspinArena does not deal razz.`,
  facts: [
    "Razz is stud low, with three down cards and four up cards by the end.",
    "The nuts is the wheel, A-2-3-4-5, also called the best razz hand.",
    "A pair is bad. High cards are bad. Suits and straights do not count against the low.",
    "The bring-in is a forced bet from an upcard the house designates, commonly the highest card, with the ace counting low.",
    "Limit sizes, ante size, and bring-in size belong to the room's card.",
    "Our poker lobby is six-max No-Limit Hold'em, not stud.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "Stud, scored from the ace downward",
      body: `Razz poker borrows the skeleton of seven-card stud and flips the goal. Everyone posts an ante.

You receive two cards down and one up. That is third street.

Later streets add upcards, and the last card comes down. [Seven-card stud](/guides/seven-card-stud) is the high-hand parent, including the idea of exposed cards and dead cards.

Razz keeps that shape and wants the low.

Your best five cards matter, not all seven. A king in the muck of your own hand does not spoil a wheel if the other five cards are A-2-3-4-5.

A pair anywhere in the five you play does spoil a low. You are looking for five different low ranks.

A-2-3-4-5 is the nuts. A-2-3-4-6 is the next smooth wheel-neighbor.

A hand is named by its highest card, then the next, so a ten-low loses to a nine-low even when the ten-low looks prettier in the small cards. Eight-seven-six-five-four beats jack-two-three-four-five because eight is lower than jack.

There is no community board. If you wanted a flop, you wanted a different game.

Fourth street is where the boards start to talk. Two upcards on a live hand tell you whether they caught another low card or paired the door.

A wheel draw that needs a deuce is thinner when the deuces are already folded or staring at you from across the table. Memory is the whole skill.

Suits do not improve a razz low. A suited ace-deuce-trey is three low cards, not a bonus flush.

Rooms that break a bring-in tie with suits are using suits only for that tie. Say so to the Hold'em player who wants to be paid for a flush that this game ignores.`,
    },
    {
      id: "rules",
      title: "Razz poker rules: ace-to-five, bring-in, and antes",
      body: `### Razz poker rules

Antes come first. The amount is whatever the game posted.

This page will not print a bring-in as a fraction of a bet and pretend every casino uses it. Many rulebooks then force a bring-in from the highest upcard, with the ace low, so a king is the worst door and often starts the action.

Suits break ties in those books, and the suit order is part of the same card. After third street, the lowest board usually acts first.

Confirm that line. Do not invent a second version at the table.

Fixed-limit play is common: a smaller bet on the early streets and a larger bet later. An open pair does not raise the limit the way it can in some high stud games.

Those patterns are widespread and still not a single dollar chart. A home game can choose other betting.

Write the choice down.

| Piece | Razz | 2-7 triple draw | Seven-card stud high |
| --- | --- | --- | --- |
| Best hand | A-2-3-4-5 | 7-5-4-3-2 | royal flush |
| Ace | low | high | high |
| Straights and flushes | ignored for low | they hurt | they win high |
| Upcards | yes | no | yes |
| Ante and bring-in | yes, amounts not universal | usually blinds or antes the host sets | yes, on the stud page |

The [poker topic](/guides/topics/poker) collects the stud page and the Hold'em pages. Razz is the low branch, not a footnote that changes Hold'em rankings.`,
    },
    {
      id: "fees",
      title: "A stud-low game we do not deal, beside a Hold'em fee",
      body: `Card-room razz has a rake or a time charge on that room's sheet. The number is not published here.

A house-banked casino might offer a different low game against the house. Any edge on that product is not published here.

We do not list a promo code, and we are not an affiliate of a stud site.

PVPspinArena does not deal razz poker. The poker you can open is six-max No-Limit Hold'em.

Hold'em on this site is charged 5% only when the flop arrives. Antes and bring-ins from razz do not transfer onto that table.

| | Razz | House-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| Game | seven-card stud, ace-to-five low | not published | six-max No-Limit Hold'em |
| Forced bets | ante and bring-in, amounts not published as universal | not published | blinds in Hold'em, no razz bring-in |
| Fee | not published | not published | 5% of the pot only after a flop |
| Promo code | not published | not published | we do not list a promo code |
| Funding | not published | not published | US dollars from Bitcoin, or USDC or ETH on Base |

[Crypto poker](/guides/crypto-poker) is the Hold'em fee discussion for this site. It will not deal you a door card.`,
    },
    {
      id: "dollars",
      title: "A kitchen ante the host chose, then a Hold'em flop fee",
      body: `Dollar example 1, a home razz pot. Six adults each post a $0.25 ante, which is $1.50, because that is the ante this kitchen wrote on the card.

The highest door card posts a $1 bring-in, also written by this kitchen and not offered as a universal limit. Other players fold or call until the final pot is $27.

The house takes nothing, per the same card. The winner shows A-2-3-4-6 and takes $27.

A player who tabled a pair takes nothing, even with an ace beside the pair.

Dollar example 2, the contrast. Our six-max Hold'em pot reaches $18 and sees a flop.

The fee is 5% of $18, so $0.90. The winner receives $17.10.

There is no ante, no bring-in, and no ace-to-five ranking in that fee. A preflop fold-out pays $0.

Do not pull $0.90 out of the kitchen $27.

[Poker bankroll management](/guides/poker-bankroll-management) is worth reading before you copy a televised limit into a home game. The structure you did not write down is not the structure you are playing.`,
    },
    {
      id: "checklist",
      title: "Razz poker tips while the upcards are still visible",
      body: `### Razz poker tips

- Post the ante the card names, and no other ante.
- Identify who brings it in before you act.
- Remember the ace is low, so a king is a rough door.
- Fold high door cards when the bring-in has already made the pot someone else's.
- Track folded upcards. A dead ace or deuce changes your draw.
- Name your hand by its highest card first.
- Do not celebrate a straight or a flush. They do not help.
- Do not celebrate a pair. It is a high hand in disguise.
- Keep 2-7 talk off the felt so nobody pats an ace-high draw by mistake.
- Ask the bet size for the street you are on. Do not assume it doubled.
- Scoop dead cards into the muck face up long enough to remember them, if the house allows.

[How to play poker](/guides/how-to-play-poker) is the wrong primer for door cards. Use the stud page, then score the low.`,
    },
    {
      id: "risks",
      title: "Invented limits, stolen deuces, and a 2-7 habit",
      body: `### Razz poker strategy

Razz poker strategy is card removal plus honesty about high cards. The best draw in a vacuum wants ace, two, three, four, and five, and it wants the copies of those ranks to be gone from other boards.

If two aces and a deuce are already folded or showing, your "smooth" draw is drawing dead more often than your memory of a full deck suggests. Watch the upcards.

That is the skill stud actually demands.

The leak this page will not decorate is a made-up limit. Saying "razz is always $2 and $4 with a $0.50 bring-in" is how a home argument starts.

Many rooms do use a small bet early and a big bet later. The dollars differ.

Write yours. If you are in a casino, read the plaque.

If the plaque and a blog disagree, the plaque wins, and this blog refuses to be the plaque.

A second leak is importing 2-7. In triple draw the ace is high and 7-5-4-3-2 is perfect.

In razz that 7-5 hand is a seven, and the ace is the card you want. One evening of mixing them is enough to mis-muck the winner.

Keep the games in different sentences.

Chasing a rough jack because you already paid the ante is the ordinary sunk-cost leak. The ante is gone.

Your live cards are the decision. High cards paired with other high cards do not become a low because you have seen four streets.`,
    },
    {
      id: "legal",
      title: "Adults, a lowball stud night, and a lobby without it",
      body: `Razz for money is for adults. If the local age is higher than 18, follow the higher age.

This is not legal advice. Antes do not change whether a public game is allowed where you live.

Read the regulator. No statute number is printed here.

This page will not help you run a stud business, set a hidden rake, or fill a table with strangers. A kitchen ante you all agreed to is the limit of the dollar example above.

PVPspinArena does not deal razz. Anyone looking for a door-card game should be told that plainly, then pointed at Hold'em if they still want to play here.

Read the [responsible gambling](/responsible-gambling) notes before a fixed-limit structure tempts you to call every street because each bet looks small. Small bets across five streets are still a buy-in. Set the stop before third street of the first hand.`,
    },
    {
      id: "closer",
      title: "Leave the wheel on the stud page and open Hold'em here",
      body: `How PvP compares: razz is ace-to-five stud low, with antes and a bring-in whose sizes you must read from the room. [Poker](/poker) is six-max No-Limit Hold'em.

[Fairness](/fairness) explains the committed seed for hands that site deals. If a live block is showing, it updates from settled play.

This article does not list recent razz results or recent Hold'em pots.

Big O, short deck, 2-7, and open-face Chinese are not in that lobby either. The stud high cousin remains [seven-card stud](/guides/seven-card-stud) for anyone who wants the upcards without the low.

Chase A-2-3-4-5. Ignore flushes.

Refuse any limit structure this page did not attribute to a specific kitchen card. Then play Hold'em, if you want our table, under a 5% fee that applies only after the flop.

Ace-to-five stud low is not draw. [Deuce-to-seven draw](/guides/2-7-triple-draw) uses a different best hand and three draws.`,
    },
  ],
  faqs: [
    {
      q: "What are the razz poker rules for the best hand?",
      a: `The best hand is A-2-3-4-5. Aces are low, and straights and flushes do not count against you.

You make the best five-card low out of seven stud cards. A pair loses to any unpaired low.

A jack-low loses to a ten-low.`,
    },
    {
      q: "How do antes and the bring-in work?",
      a: `Players post an ante before cards are dealt. A bring-in is a forced bet from an upcard, commonly the highest door card, with the ace treated as low.

Dollar amounts and the exact tie-break are the room's rules. They are not one schedule printed here as universal.`,
    },
    {
      q: "Is razz the same as 2-7?",
      a: `No. 2-7 triple draw is a draw game where aces are high and 7-5-4-3-2 is best.

Razz is stud, ace-to-five, and A-2-3-4-5 is best. Straights and flushes hurt a 2-7 hand and do not hurt a razz hand.`,
    },
    {
      q: "Does PVPspinArena deal razz?",
      a: `No. Poker there is six-max No-Limit Hold'em.

A flopped pot is charged 5%. An $18 pot that sees a flop pays $0.90, and the winner receives $17.10.

Razz is explained here and dealt somewhere else, if at all.`,
    },
    {
      q: "Does an open pair change the bet size?",
      a: `In many razz rulebooks, an open pair does not increase the limit. That is a common pattern, not a dollar amount.

Your room can still write something else. Read its card rather than assuming a high-stud rule carried over.`,
    },
    {
      q: "Which razz poker tips matter with upcards?",
      a: `Track folded and showing aces, deuces, and treys. Name your hand by its top card.

Fold rough doors when you are drawing live into a board that already stole your outs. Keep 2-7 targets out of your head for the evening.`,
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
    "texas-holdem-rules",
    "poker-bankroll-management",
    "2-7-triple-draw",
  ],
  updated: "2026-10-20",
};

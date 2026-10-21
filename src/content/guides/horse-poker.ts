import type { Guide } from "./types";

export const guide: Guide = {
  slug: "horse-poker",
  cluster: "Poker",
  keyword: "horse poker",
  secondary: [
    "H.O.R.S.E. rotation",
    "limit hold'em",
    "omaha eight or better",
    "stud eight or better",
  ],
  title: "Horse Poker: Five Limit Games in Rotation",
  description:
    "Horse poker rotates limit Hold'em, Omaha eight-or-better, Razz, stud, and stud eight-or-better. A 2025 WSOP page lists them. Hand count is not printed.",
  h1: "Horse poker: five limit games in a row, and not a race",
  answer:
    "Horse poker is a limit rotation of five card games: Hold'em, Omaha eight-or-better, Razz, seven-card stud, and stud eight-or-better. The 2025 WSOP news page lists those games for a $1,500 event and does not print how many hands pass before the game changes. This name is not an animal sport. The page invents no cash-game rake.",
  facts: [
    "Last tested 20 October 2026 on the WSOP news note for 2025 mixed-game events, and on the Pagat Hold'em page for a limit-bet example.",
    "The 2025 list for the $1,500 event names limit Hold'em, Omaha hi-lo eight or better, Razz, seven-card stud, and stud hi-lo eight or better.",
    "That news page does not print blinds, antes, or how many hands are dealt before the rotation moves.",
    "Pagat's limit Hold'em example is a $10-$20 game with $5 and $10 blinds, then $10 bets and later $20 bets. That is an illustration, not the WSOP structure.",
    "This site deals six-max No-Limit Hold'em only. It does not rotate these five games.",
  ],
  sections: [
    {
      id: "five",
      title: "What horse poker rotates, from the 2025 list",
      body: `Horse poker is a mixed game, meaning the variant changes on a schedule while the chips stay in front of you. The WSOP news page opened on 20 October 2026 describes the 2025 $1,500 event in those terms.

The featured games are limit Hold'em, Omaha hi-lo eight or better, Razz, seven-card stud, and seven-card stud hi-lo eight or better. Those five names are the whole rotation on that page.

The same note is about card games in a poker room. It is not a race card, and this article does not link a track.

The [poker topic](/guides/topics/poker) is the hub for the pieces. [The two-card limit round](/guides/texas-holdem-rules) is only the first letter.

A buy-in of $1,500 is what that news page prints for the 2025 event. It is an entry price, not a blind.`,
    },
    {
      id: "letters",
      title: "The five names, and what each one asks you to hold",
      body: `The first letter of horse poker is Hold'em: two hole cards and five community cards. In this rotation the betting is limit, so you cannot move all-in for an arbitrary size.

Omaha eight-or-better deals four hole cards, and the high-low name on the WSOP list includes the eight-or-better low. [The must-use-two rule](/guides/omaha-poker-rules) is the reading problem. This page does not restate a full Omaha chart.

Razz is seven-card stud played for the low. The news page names it and does not print a bring-in or an ante, so those amounts stay not published.

Seven-card stud is the high game with upcards. Stud eight-or-better splits a pot between a high and a qualifying low. Again, the ante is not on the news page.

You do not get to pick the next game in this rotation. Dealers choice, which the same WSOP note also lists as a different event, is a wider menu. Do not merge the two.`,
    },
    {
      id: "changes",
      title: "What actually changes when the game changes",
      body: `In horse poker the button matters in the flop games, then stops being the actor's cue in stud. Someone brings in on an upcard instead. If your card does not say who acts, ask before the first stud hand.

High games want big pairs, straights, and flushes. Razz wants a rough low, and an ace is a strong low card there rather than a high kicker.

Split-pot rounds can pay you half. Winning the high and losing the low is a real result, not a misdeal.

The WSOP names say eight or better. A nine-low does not qualify under that name.

Limit betting caps the size. You cannot "price them in" with a pot-sized shove the way no-limit Hold'em allows. The number of raises a room allows is not on the 2025 news page, so that cap stays not published.

[Deuce-to-seven draw](/guides/2-7-triple-draw) is a lowball draw game. It appears in some other mixes. It is not one of the five names on this event's list.`,
    },
    {
      id: "limit",
      title: "A limit picture from Pagat, not from the WSOP sheet",
      body: `The 2025 news page does not print a blind or a stud ante. Leaving those cells blank is the honest reading.

Pagat's Hold'em page, also opened that day, gives a typical limit picture. A $10-$20 game would usually use blinds of $5 and $10, bets of $10 on the first two rounds, and bets of $20 on the last two.

That paragraph is about limit Hold'em in general. It is not labeled as this rotation, and it is not the 2025 event. Use it only as a worked picture of fixed bets.

Dollar example 1 uses those Pagat numbers and nothing else. One $10 flop bet called by one player adds $20 to the pot. There is no rake in that sentence, because Pagat did not print one.

If your structure card shows different numbers, the card wins. Do not correct a dealer with this paragraph.`,
    },
    {
      id: "length",
      title: "How long each game lasts is not on the news page",
      body: `Players often expect horse poker to change after a fixed number of hands, or one full orbit. The 2025 WSOP news page we opened does not print that number.

So the hand count stays not published. An old structure sheet that is not this event is not a substitute, and it is not cited here.

When you sit, read the board in the room. If a player is moved, the news page does not say which game the new table is on. Ask.

The chips usually carry over. You are not cashing out and buying in again at each letter. Nothing on the news page says otherwise, and nothing on it prints a rebuy rule for this event.

A mixed round punishes a player who knows one game. That is a skill fact, not a promise that the other four are beatable for a living.`,
    },
    {
      id: "compare",
      title: "This rotation beside a house game and a single cash table",
      body: `Five games share one chip stack in the rotation. A house game has one paytable. This site has one variant.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| This five-game rotation | Rake not published on the 2025 news page. Entry listed at $1,500 for that event | Other players in the event | Tournament prizes, not a cash cashier | Not published on that page | Not published. Limits were not printed |
| House-banked casino | Not published | The house | Not published | Not published | Not published |
| PVPspinArena | 5% of the pot only after a flop, on six-max No-Limit Hold'em | Other players | Balance updates when the hand settles | Yes, seed committed before the hand | Shown on the table |

How PvP compares: the rotation changes the rules every few hands. [Poker](/poker) here stays on six-max No-Limit Hold'em, and the fee is 5% of the pot only after a flop.

A settled hand can be recomputed on the [fairness page](/fairness). That check does not audit a WSOP event, and it does not deal Razz.

| Letter | Game on the 2025 list | High, low, or split | What the news page left blank |
| --- | --- | --- | --- |
| H | Limit Hold'em | High | Blinds and bet sizes |
| O | Omaha hi-lo, eight or better | Split | The full must-use-two chart |
| R | Razz | Low | Ante and bring-in |
| S | Seven-card stud | High | Ante and bring-in |
| E | Stud hi-lo, eight or better | Split | Ante and bring-in |

[Three-card discard Hold'em](/guides/pineapple-poker) is not a letter in that table. [Bubble pricing](/guides/icm-poker) is a tournament sum, not a change of variant.`,
    },
    {
      id: "dollars",
      title: "Two further dollar lines that stay inside opened pages",
      body: `Dollar example 2 is the entry, not a bet. The news page prints a $1,500 buy-in for the 2025 event. It does not print the fee taken out of that $1,500, so the staff charge stays not published.

Dollar example 3 is this site. Suppose a pot reaches $40 and has seen a flop. Five percent is $2, and the winner keeps $38.

That hand is No-Limit Hold'em with two hole cards. It will not become Razz on the next deal. The $2 is not a mixed-game rake.

The 2024 result named on the same news page is someone else's prize. It is not a forecast for the next field, and this article does not treat it as one.`,
    },
    {
      id: "checks",
      title: "Checks before you sit the rotation",
      body: `Read the five names out loud once. Horse poker sessions go wrong when a player uses Hold'em rankings in Razz.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] Confirm the list is the five games, not a wider dealers-choice menu.
- [ ] Read the live structure for blinds, antes, and bring-ins.
- [ ] Leave the hand count unpublished if the board does not print it.
- [ ] Switch rankings when the game switches, especially ace-to-five low against high.
- [ ] In the eight-or-better games, do not award a low to a nine.
- [ ] Do not treat a draw game as part of this list unless the card adds it.
- [ ] Do not follow a link to an animal sport. This page is cards.
- [ ] Keep this site's 5% flop fee off the tournament entry.
- [ ] If the rotation becomes a chase, call 1-800-GAMBLER.`,
    },
    {
      id: "limits",
      title: "Who should not enter the five-game line",
      body: `Do not play for money if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake rent, savings, or money with a due date.

Do not sit a horse poker game because the name sounded like a different sport. The 2025 page is a card rotation. If you wanted a race, you are in the wrong article, and this site does not book one.

Knowing only Hold'em is a reason to pass, or to risk only money you can lose while you learn the other four. Limit bets add up across streets. Small does not mean cheap.

This page is an editorial note. It is not a bracket and not a promise of profit. A printed buy-in is the price of entry, not an expected return.

If play stops being a bounded spend, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "Which five games does horse poker rotate?",
      a: "The 2025 WSOP news page lists limit Hold'em, Omaha hi-lo eight or better, Razz, seven-card stud, and seven-card stud hi-lo eight or better for its $1,500 event. That is the rotation this article means. Dealers choice on the same page is a longer menu and a different event. A draw lowball game is not on this event's list. Read the card in the room before you add a sixth game.",
    },
    {
      q: "Is this the same thing as a race?",
      a: "No. The name is five poker games played in order. The WSOP page we opened is a card-room schedule, and this article does not describe an animal sport or link a track. If a search result shows odds on a race, it is a different product. This site does not book that product either. Stay with the five card games or leave the page.",
    },
    {
      q: "How many hands are dealt before the game changes?",
      a: "The 2025 news page does not say. The hand count stays not published. Some rooms use an orbit and some use a fixed number, and neither figure is printed on the page we opened. Read the structure board where you sit. Do not import a number from a different year's sheet and call it this event.",
    },
    {
      q: "What bet sizes does the news page print?",
      a: "It prints a $1,500 buy-in and does not print blinds, stud antes, or bring-ins. Those sizes stay not published for that event. Pagat's separate Hold'em page illustrates a $10-$20 limit game with $5 and $10 blinds, $10 bets early, and $20 bets later. That illustration is not the WSOP structure. Your card wins if the numbers differ.",
    },
    {
      q: "Does Omaha in this mix use two hole cards only?",
      a: "The event names Omaha hi-lo eight or better, which is the four-card game with a low that must be eight or better. You still have to build the hand the way that game requires, including using the right number of private cards. This page points at the Omaha rules note for that constraint. It does not invent a new counting rule. A nine-low does not qualify.",
    },
    {
      q: "Does this site run the rotation?",
      a: "No. Poker here is six-max No-Limit Hold'em, one variant, with a 5% fee only after a flop. A $40 pot that has seen a flop pays the winner $38. The next hand is the same game. You can recompute a settled hand on the fairness page. That check does not deal stud or Razz and does not audit a WSOP event.",
    },
  ],
  sources: [
    {
      label: "WSOP — mixed-game events at the 2025 series, including H.O.R.S.E.",
      url: "https://www.wsop.com/news/5-exciting-mixed-game-events-at-the-2025-wsop/",
    },
    {
      label: "Pagat — Texas Hold'em, including a limit-bet example",
      url: "https://www.pagat.com/poker/variants/texasholdem.html",
    },
  ],
  related: [
    "texas-holdem-rules",
    "omaha-poker-rules",
    "2-7-triple-draw",
    "pineapple-poker",
    "icm-poker",
    "how-to-play-poker",
  ],
  updated: "2026-10-20",
};

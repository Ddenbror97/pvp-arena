import type { Guide } from "./types";

export const guide: Guide = {
  slug: "badugi-poker",
  cluster: "Poker",
  keyword: "badugi",
  secondary: ["four-card low draw", "A-2-3-4 wheel", "three-draw lowball"],
  title: "Badugi: Four-Card Low and the A-2-3-4 Nuts",
  description:
    "Badugi is a four-card low draw. Pagat prints A-2-3-4 in four suits as the best hand. The Washington sheet prints no rake. A session can still lose.",
  h1: "Badugi is four low cards of different suits, and Pagat's best hand is A-2-3-4",
  answer:
    "Badugi is a four-card low draw for two to eight players. Pagat, opened on 20 October 2026, prints A-2-3-4 in four suits as the best hand. The Washington sheet prints the same low idea, three draws, and four betting rounds, and it prints no rake. That ranking is a rule, not a promise that the next draw pays you.",
  facts: [
    "Last tested 20 October 2026. Opened Pagat's four-card low page, the Washington State Gambling Commission sheet dated 5-25-23, and the National Council on Problem Gambling helpline page.",
    "The best badugi on the Pagat page is A-2-3-4 in four different suits, sometimes called the wheel.",
    "Both sheets use one 52-card pack, ace low, three draws, and up to four betting rounds. The Washington sheet says jokers are not used.",
    "A four-card legal hand beats any three-card hand. Duplicate ranks or suits are discarded until the hand is valid.",
    "Neither page prints a rake, a buy-in, or a dollar ante. WAC 230-15-135 is named on the Washington sheet and was not opened, so those limit numbers are not published.",
    "We did not sit a hand. This site does not deal the game.",
  ],
  sections: [
    {
      id: "deal",
      title: "How a badugi is dealt and drawn",
      body: `A badugi uses a 52-card pack. Pagat allows two to eight players, and the Washington sheet says the same, with no joker.

The dealer pitches four cards face down. There is a betting round, then a draw, and that pair repeats until three draws are done. Four betting rounds is the count both sheets print.

Pagat says you may exchange any number from zero to four. Exchanging zero is standing pat in badugi, which means you keep the four cards you were dealt. The Washington sheet says each player may discard any number and receive replacements.

Draws start with the first active player to the dealer's left. If a button is used, the Washington sheet starts the draw to the button's left. Replacements are face down.

The [Poker](/guides/topics/poker) hub collects the other low games. [Deuce-to-seven with three draws](/guides/2-7-triple-draw) is a five-card low, not this four-card pattern. [The face-up Chinese layout](/guides/open-face-chinese-poker) is a different way to set thirteen cards.`,
    },
    {
      id: "nuts",
      title: "Ace low, four suits, and the wheel",
      body: `Ace is low on both sheets. King is high. Straights do not count on the Washington sheet, and Pagat never uses high-poker ranks to score the hand.

The best hand Pagat prints is A-2-3-4 with one card of each suit. Pagat's nickname for that best badugi is the wheel, and the nickname is not a second ranking.

The Washington extract we read does not print the characters A-2-3-4. It does print that the ace is always low and that the lowest high card wins among four-card hands.

That is the same direction. The spelled nuts stay attributed to Pagat.

Suits do not break a tie on Pagat. If the ranks match, the hands split. The Washington sheet says discounted cards are never used to break a tie.

[Four hole cards that must use two](/guides/omaha-poker-rules) is a high game with a board. Do not read a flush on this low sheet. A flush is a problem here, because two cards of one suit cannot both count.`,
    },
    {
      id: "reduce",
      title: "Hands that shrink before they are ranked",
      body: `Every card in the counted hand must differ in suit and in rank. Pairs and repeated suits are removed until that is true.

Any four-card badugi beats any three-card hand. A three-card hand beats a two-card hand, and a two-card hand beats a one-card hand. Both sheets say this.

Among hands with the same count, compare the highest card, and the lower one wins. If those tie, compare the next card, then the next.

Pagat's examples include 8-7-5-4 beating 9-4-3-2, because 8 is lower than 9. They also include 10-7-5-4 beating 10-7-6-A, because 5 is lower than 6.

K-Q-J-8 beats 3-2-A on Pagat because four cards beat three. A hand that looks pretty and still has a pair is not four live cards.

The Washington sheet is explicit that only the lowest card of a duplicated suit counts, and only one card of a pair counts. Its tie example is an 8-5-2 three-card hand beating 8-5-3. The unused cards do not save the higher hand.

| Reduced hand | Why it is that size | Who it beats |
| --- | --- | --- |
| A-2-3-4, four suits | four live cards, lowest possible top | every other hand on the Pagat page |
| 8-7-5-4 | four live cards, top card 8 | a four-card hand whose top card is 9 |
| K-Q-J-8 | four live cards | any three-card hand, including 3-2-A |
| 8-5-2 | three live cards | 8-5-3, on the Washington example |
| Two hands that both reduce to 5-3 | same ranks | they split, suits ignored |`,
    },
    {
      id: "money",
      title: "Blinds, antes, and a rake that is missing",
      body: `Pagat uses blinds when more than two play. The player left of the dealer posts a small blind, and the next player posts a big blind, normally twice as large. Heads-up, the dealer posts the small blind.

Betting starts left of the big blind, and the minimum bet is normally the big blind. If nobody raises, the big blind may still bet.

After each draw, the first active player left of the dealer starts the next round.

In a fixed-limit game, Pagat says the bet doubles after the second draw, so the third and fourth rounds are the big bet. Pot limit and half-pot badugi are named on that page. The half-pot formula sits on a betting page we did not open, so the formula is not published here.

The Washington sheet allows forced antes for everyone, or a blind structure. Wagering must follow WAC 230-15-135, which we did not open, so the legal limit numbers are not published.

The sheet calls the game nonhouse-banked. It does not print a percentage taken from the pot.

The Washington sheet names a four-suit hand a badugi and prints no rake. Do not invent a collection, a time charge, or a drop. If a room card adds one, that card is the source, and this note does not have it.

[A ring game that keeps running](/guides/cash-game-poker) is a different seat. [Showing the undealt board](/guides/rabbit-hunting-poker) is a different argument, and it does not create a rake either.`,
    },
    {
      id: "show",
      title: "Showdown, pat hands, and a buy price left blank",
      body: `If only one player remains at any point, that player takes the pot without showing, on the Pagat page. If two or more reach the end, they show in turn, starting with the last player who bet or raised, or with the first active player left of the dealer if the last round checked.

Players show all four cards even when the live badugi is shorter than four. The cards speak, and the holder of the best reduced hand wins.

Equal hands divide the pot. Suits do not rank one badugi over another.

Pagat also describes a progressive variation, with a limit set in advance, for example a four-card hand with nothing higher than a 9. If nobody qualifies, the pot stays and the deal repeats.

That 9 is Pagat's example, not a law for every table. Another table can name a different ceiling, and this note does not pick one.

A buy variation asks the dealer to name a price, paid to the pot, for exchanging a card near the end. Pagat says the exact buying procedure was not explained.

No single price is printed. Leave it unpublished.

[The ante draw game](/guides/five-card-draw) exchanges cards once, under a cap that depends on which sheet you adopt. This game draws three times.`,
    },
    {
      id: "dollars",
      title: "Dollar antes the sheets do not print",
      body: `Neither sheet prints $1. The pictures only make the ante rule addable. They are not a win.

Example 1: four players each post $1 before the deal, so the pot is $4. No rake is subtracted, because no rake is printed. The $1 posts are an illustration, not a badugi collection.

Example 2: after the first betting round the pot is $20, and you draw two cards. The $20 does not grow because the new cards look low. It grows only if somebody bets on a later round.

Example 3: two $50 Coinflip stakes on this site make a $100 pot, the fee is $5, and the winner receives $95. That fee belongs to Coinflip, it is not a drop on this lowball game, and we did not time a cash-out.`,
    },
    {
      id: "compare",
      title: "This lowball game beside a house casino",
      body: `The sheets we opened put players against players. A house percentage is not on them.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| This four-card low | rake not published | other players | not published | not published | ante or blinds, dollars not published |
| House-banked casino | not published | the house | not published | not published | not published |
| PVPspinArena | Coinflip and Jackpot take 5% of the pot | other players | balance updates when the round settles | yes, where a seed is committed before the round | Coinflip minimum is $1 |

How PvP compares: [Poker](/poker) on this site is a player table, and this note does not put the four-card low on it. [Fairness](/fairness) recomputes a settled round that publishes a seed. That check does not audit Pagat, and it does not audit the Washington commission.

This site does not deal badugi. Slott takes 10% of a winning pot, which is a different game. Purple and Silver roulette keep about a 7.88% edge after the 5% win fee.`,
    },
    {
      id: "list",
      title: "A list for the first lowball session",
      body: `Say the reduced hand before you call a large bet.

- [ ] Count four cards before the first bet.
- [ ] Drop pairs and repeated suits before you name the hand.
- [ ] Remember that any four-card legal hand beats any three-card hand.
- [ ] Compare from the top card down, and prefer the lower top.
- [ ] Treat A-2-3-4 in four suits as Pagat's best hand, not as a promise.
- [ ] Leave the Washington rake blank, because the sheet prints none.
- [ ] Leave the half-pot formula blank unless you open the betting page.
- [ ] Do not pay a buy price this note does not print.
- [ ] Set a loss stop before the first blind or ante.
- [ ] If the draws become a chase, call 1-800-GAMBLER.

The helpline page prints 1-800-MY-RESET and says that line is not a crisis service. A crisis is 911 or 988.`,
    },
    {
      id: "stop",
      title: "Who should leave the lowball table",
      body: `Do not play if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake rent or money with a due date.

Three draws feel like three chances to fix a hand. They are three chances to put more money in a pot you can still lose. The sheets do not store a debt the next card must repay.

This page is an editorial note. We did not open a card-room account, and we did not time a cash-out.

Cash-out minimum on this site is $20 in BTC, USDC, or ETH. If the session stops being optional, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What hand does Pagat print as the best?",
      a: "Pagat prints A-2-3-4 in four different suits as the best hand, and it sometimes calls that badugi the wheel. Ace is low. A four-card legal hand beats any hand with fewer live cards, so a king-high four-card hand beats a pretty three-card hand. The Washington sheet agrees on ace-low and on four beating three, and the extract we read does not print the characters A-2-3-4. Use Pagat for that spelled nuts.",
    },
    {
      q: "How many draws and betting rounds does badugi have?",
      a: "Both sheets print three draws and four betting rounds: one round before the first draw, and one after each draw. You may discard any number of the four cards, including zero or all four, on the pages we opened. Fixed-limit play on Pagat doubles the bet after the second draw. The Washington sheet does not print that double. It points wagering limits at WAC 230-15-135, which we did not open.",
    },
    {
      q: "Does either sheet print a rake?",
      a: "No. A rake for badugi is not on Pagat and not on the Washington sheet. The commission sheet calls the game nonhouse-banked and tells operators to document irregularities in their internal controls. It does not print a percentage, a drop, or a time charge. Do not borrow a number from a different game. If the card in your room adds a collection, that card is the source.",
    },
    {
      q: "What happens in badugi when two reduced hands match?",
      a: "They split. Pagat says suits do not rank, and a pair of hands that both reduce to the same ranks are equal even if the discarded cards differ. The Washington sheet says discounted cards never break a tie. Its example gives the pot to 8-5-2 over 8-5-3 because the third live card is lower. Show all four cards anyway, so the table can see what was discarded.",
    },
    {
      q: "Who should not play badugi?",
      a: "Anyone under 18, anyone under a higher local age, and anyone playing where the game is illegal. Anyone staking rent or money with a due date should stay out. Anyone who needs the third draw to repay the first two is chasing, and neither sheet owes that card. Call 1-800-GAMBLER if the session is no longer optional. The helpline page also prints 1-800-MY-RESET and says it is not a crisis line.",
    },
    {
      q: "Is badugi dealt on this site?",
      a: "No. This site does not deal the four-card low, and we did not sit a hand. Poker here is a separate player table. Coinflip takes 5% of the pot, so two $50 stakes leave the winner $95, which is not a rake borrowed from the Washington sheet. Fairness recomputes a settled round that publishes a seed. That check does not audit Pagat.",
    },
  ],
  sources: [
    {
      label: "Pagat — Badugi",
      url: "https://www.pagat.com/poker/variants/badugi.html",
    },
    {
      label: "Washington State Gambling Commission, Badugi game rules, 5-25-23",
      url: "https://wsgc.wa.gov/sites/default/files/2023-11/Badugi%20Game%20Rules%205-25-23.pdf",
    },
    {
      label: "National Council on Problem Gambling helpline",
      url: "https://www.ncpgambling.org/help-treatment/about-the-national-problem-gambling-helpline/",
    },
  ],
  related: [
    "2-7-triple-draw",
    "omaha-poker-rules",
    "five-card-draw",
    "open-face-chinese-poker",
    "how-to-play-poker",
    "rabbit-hunting-poker",
  ],
  updated: "2026-10-20",
};

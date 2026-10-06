import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ultimate-texas-holdem",
  cluster: "Casino games",
  keyword: "ultimate texas holdem",
  secondary: [
    "ultimate texas holdem rules",
    "ultimate texas holdem ante and blind",
    "ultimate texas holdem trips bet",
    "ultimate texas holdem play bet",
  ],
  title: "Ultimate Texas Hold'em: Ante, Play and Raises",
  description:
    "Ultimate Texas Hold'em is a house-banked poker variant. See the ante, the blind, the play bets, and why the paytable on the felt wins.",
  h1: "Ultimate texas holdem: ante, blind, and the play bets",
  answer:
    "Ultimate texas holdem is a house-banked poker variant: you post an ante and an equal blind, then check or place a play bet as the community cards arrive. The dealer needs a pair for the ante to be live. The blind pays from a posted bonus schedule. A commonly published figure for one standard layout, played with a known basic strategy, is about 2.2% of the ante, and the felt in front of the player controls the schedules.",
  facts: [
    "You post an equal ante and blind before the deal, and you may add an optional trips chip.",
    "The common play structure is 3x or 4x the ante before the flop, 2x after the flop, or 1x on the river.",
    "If you never make a play bet, the river decision is to bet 1x or fold and lose the ante and the blind.",
    "The dealer needs a pair or better or the ante pushes when you win; the blind uses its own posted bonus.",
    "A commonly published figure for one standard layout is about 2.2% of the ante. The felt controls the blind and trips schedules.",
    "Adults 18+ only. PVPspinArena does not deal this game.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "A house hand, not a poker pot",
      body: `Ultimate Texas Hold'em borrows five-card ranks and community cards from a cash game, then sells them as a house product. You and the dealer each receive two hole cards. Five community cards are shared. Each side plays the best five. There is no button, no raise war, and no pot built by the other seats. The casino is the bank. The name on the layout is the label. The contract is the ante, the blind, and one play bet, plus whatever bonus columns are printed in front of you. You are buying a priced comparison. The earlier you commit the play bet, the larger the multiple the common rules allow, because fewer cards are showing.

### What you are comparing

[Texas Hold'em rules](/guides/texas-holdem-rules) describe a player-versus-player game with blinds that open a pot. This table uses an ante and a blind that both belong to the house contract. [Casino holdem](/guides/casino-hold-em) is a cousin with a different call size and a different qualify rule. [Mississippi Stud](/guides/mississippi-stud) is the street-and-paytable cousin, with no dealer hand to beat. Hand order still follows [poker hand rankings](/guides/poker-hand-rankings): high card through royal flush. The price does not. It lives in how the ante, the blind, and the play bet settle.

This page sits in [Casino games](/guides/topics/casino-games). Adults 18+ only. If the session starts to feel like a chase, stop on [responsible gambling](/responsible-gambling) before the next ante.

A single 52-card deck is the usual deal. Ties push the ante, the blind, and the play bet. The trips chip, if you posted one, is a separate schedule on your hand alone.`,
    },
    {
      id: "ante-blind-trips",
      title: "Ante, blind, and the trips chip",
      body: `Before any card is shown you place two equal bets: the ante and the blind. They are mandatory on the common layout. The trips circle is optional. It is not required to see the hand, and it is not a substitute for the play bet later.

### What each chip is for

The ante is the base comparison bet. It wins even money when your five-card hand beats a dealer who holds a pair or better. If the dealer has less than a pair and you win the comparison, the ante pushes. If you lose to a better dealer hand, the ante loses, except that an ante against a dealer who never made a pair still pushes.

The blind is the bonus bet that shares the same stake size. It does not simply pay even money for any win. On the common sheet it pays a posted multiple when you beat the dealer with a strong hand, often a straight or better, and it pushes when you win with a weaker hand. A losing comparison loses the blind, including when the dealer wins with less than a pair.

Trips looks only at your final five-card hand. The dealer does not have to qualify, and many sheets still pay trips if you fold once the board is complete. Casinos swap that second table. Read both columns before you buy the optional chip. Folding, a qualify miss, and a strong hand pay the three circles differently. The optional chip can be the expensive part of the hand even when the ante rules look familiar.`,
    },
    {
      id: "play-bets",
      title: "Check, or bet 4x, 2x, and 1x",
      body: `After you see your two hole cards, and before any community card is turned, you check or make a play bet of 3x or 4x the ante. That is the aggressive street. A larger multiple is available because you are acting with the least information.

### The streets in order

- Preflop: check, or bet 3x or 4x the ante.
- Flop: if you checked, three community cards are turned. Check again, or bet 2x the ante.
- River: if you checked twice, the last two community cards are turned together. Bet 1x the ante, or fold. A fold loses the ante and the blind.
- One play bet only. If you already raised, you do not add another bet on a later street.

The turn is not its own decision on this common structure. The last two cards arrive together, so the river bet is the smallest multiple.

Checking spends the chance to put more money in while you are ahead. Folding at the end gives up the ante and the blind. A published basic strategy maps hands onto these choices. That chart belongs to one paytable, and this guide does not reprint it. Use a chart written for the felt in front of you.

The play bet itself pays even money when your hand beats the dealer, whether or not the dealer holds a pair. It loses when the dealer wins the comparison. It pushes on a tie. Even money is the simple part. The street decides how large a bet you were allowed to post.`,
    },
    {
      id: "qualify-and-pay",
      title: "When the dealer qualifies",
      body: `Qualification is a gate on the ante, not a mystery card the dealer may hide. After you have either made a play bet or folded, the dealer turns two hole cards and makes the best five. A pair or better qualifies. Less than a pair does not.

### How a finished hand settles

| Bet | If you beat the dealer | If the dealer wins | If you tie |
| --- | --- | --- | --- |
| Ante | Pays 1:1 when the dealer has a pair or better; pushes when the dealer has less | Loses against a pair or better; pushes against less than a pair | Pushes |
| Blind | Pays the posted bonus on a strong hand; often pushes below a straight | Loses | Pushes |
| Play | Pays 1:1 whether or not the dealer paired | Loses | Pushes |

Folding before a play bet skips this table. The ante and the blind are taken, and there is no play bet to win. Trips, if posted, still follows its own column once your five cards exist.

A win with one pair can push the blind while the ante and the play bet pay. A straight or better can pay a blind multiple while the ante pays even money. Those multiples are on the layout. Look down.

Qualification does not change rank order. It changes which bets may win. A dealer who misses a pair can still hold the higher high-card hand. Then the play bet loses and the ante pushes. That is not a push of every circle. If you compare two rooms, check the blind column. The ante rule can match while that column does not.`,
    },
    {
      id: "felt-price",
      title: "Why the felt paytable wins",
      body: `The [house edge](/guides/house-edge) on this game is a property of the printed schedules plus the decisions you make. A commonly published figure for one standard layout, using a known basic strategy, is about 2.2% of the ante. That sentence has two locks on it. The figure belongs to one standard layout. The felt in front of the player controls the blind bonuses and the trips schedule, so a different printout is a different price.

### What the 2.2% is measuring

Writers usually divide the expected loss by the ante, not by every chip that ends up in the circles. You also posted a blind equal to the ante, and an optimal player still adds a play bet on many hands. The average amount in action is several times the ante. The loss per ante can therefore look larger than the loss per chip actually risked. Neither view is a promise about tonight. Both are long-run averages.

Trips sits outside that 2.2% quote. Published trips schedules differ by several percentage points. A room can keep the ante rules and change the trips column. If those multiples are not on the felt, leave the circle empty.

A chart written for a different blind table moves the cost, and so does betting 4x on hands that chart would check. You cannot bluff the dealer off a pair. You choose a multiple the rules allow, or you fold. Bring the question back to the glass: which blind multiples, which trips multiples, and which preflop menu are printed.`,
    },
    {
      id: "session",
      title: "Pace, units, and when to stand up",
      body: `Hands are fast once the dealer knows the layout. A 2.2% quote on the ante becomes an hourly cost when you post many antes. If the ante is $10, you have also posted a $10 blind, and some hands add $20, $30, or $40 more. Size the ante against the whole circle, not against the number painted in the ante spot alone.

### A simple session frame

- Pick an ante you can lose twenty times without raising the stake.
- Skip trips unless you have read that table and accepted its separate price.
- Use one chart that matches this felt. Do not mix in a casino holdem call rule.
- Stop at a loss number written before the first hand, or at a time limit.
- A bad run is not a signal that the next 4x is "due."

Blind multiples are rare, which is why ordinary wins often push that bet. Raising every preflop hand to chase one adds money on hands that lose.

Adults 18+ only. This page explains a house game. It is not a license where the game is barred, and it is not a tax opinion. If you cannot leave after the stop number, leave before the next ante. A clock works beside the loss number, because fast hands make an open session longer than it feels.

PVPspinArena does not offer Ultimate Texas Hold'em. The live games here are Jackpot, Coinflip, and Roulette, settled in USDC or ETH on Base. A guide about a pit poker variant is not a deposit path into those games.`,
    },
    {
      id: "keep",
      title: "What to check before you sit",
      body: `Use a short note. If any line is blank, you are guessing, and guessing is how side bets get bought.

### The six lines

The game is house-banked Ultimate Texas Hold'em, one deck, two hole cards, five community cards. The required stakes are an equal ante and blind. Trips is optional and uses a second paytable. The play menu is 3x or 4x preflop, 2x on the flop, and 1x or fold on the river, with only one play bet allowed. The dealer qualifies with a pair for the ante. The blind pays from the column on this felt, not from a column you remember. A commonly published ante figure for one standard layout is about 2.2% with a known basic strategy, and this felt can differ.

Write the date you read the layout. If the room uses a smaller preflop multiple, or an extra push on the blind, the published 2.2% no longer describes it.

Then write a loss limit in ante units. Twenty antes is a different pile of money once the blind and the play bets are included. Ranks tell you who won the comparison. The felt tells you what that win pays. A chart for this paytable is a list of decisions. It does not remove the house price. Community cards that look like a cash game do not turn the pit into a cash game. If the play menu is not 3x or 4x before the flop, 2x on the flop, and 1x on the river, the commonly published figure does not apply until you read the new rules.`,
    },
  ],
  faqs: [
    {
      q: "Is ultimate texas holdem the same as cash Texas Hold'em?",
      a: "It uses the same five-card ranks and community cards. The bets are an ante, a blind, and one play bet against the house. There is no shared pot and no rake.",
    },
    {
      q: "What does the dealer need to qualify?",
      a: "A pair or better. If the dealer has less than a pair, a winning player's ante pushes. The play bet still wins or loses on the comparison. The blind follows its own posted column.",
    },
    {
      q: "Can I check all the way and then fold?",
      a: "Yes. After two checks you must bet 1x the ante or fold. A fold loses the ante and the blind. You cannot add a second play bet if you already raised.",
    },
    {
      q: "What house edge should I expect?",
      a: "A commonly published figure for one standard layout, with a known basic strategy, is about 2.2% of the ante. The felt in front of you controls the blind and trips schedules, so confirm both columns.",
    },
    {
      q: "Does PVPspinArena deal this game?",
      a: "No. This site offers Jackpot, Coinflip, and Roulette. The guide is for adults 18+ reading a house poker variant dealt elsewhere.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Ultimate Texas Hold'em",
      url: "https://wizardofodds.com/games/ultimate-texas-hold-em/",
    },
    {
      label: "Atlantic Lottery: Ultimate Texas Hold'em how to play",
      url: "https://www.alc.ca/content/dam/alc/images/casino/ultimate-texas-holdem/Ultimate%20Texas%20Hold%20em%20-%20English%20-%20How%20to%20Play.pdf",
    },
    {
      label: "Wikipedia: Ultimate Texas Hold 'em",
      url: "https://en.wikipedia.org/wiki/Ultimate_Texas_Hold_%27em",
    },
  ],
  related: ["casino-hold-em", "mississippi-stud", "texas-holdem-rules", "poker-hand-rankings"],
  updated: "2026-09-29",
};

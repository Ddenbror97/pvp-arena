import type { Guide } from "./types";

export const guide: Guide = {
  slug: "three-card-poker-strategy",
  cluster: "Poker",
  keyword: "3 card poker strategy",
  secondary: [
    "three card poker",
    "three card poker house edge",
    "ante play strategy",
    "pair plus poker",
    "q64 poker",
  ],
  title: "3 Card Poker Strategy: Ante, Play and Pair Plus",
  description:
    "3 card poker strategy for a casino side game: Q-6-4 Ante/Play, Pair Plus paytables, house edge, and why this is not Hold'em.",
  h1: "3 card poker strategy: Q-6-4, Pair Plus and house edge",
  answer:
    "3 card poker strategy is a house-game chart, not Hold'em. On Ante/Play you raise with Queen-6-4 or better and fold worse; that is the well-known Q-6-4 rule. Pair Plus is a separate side bet with a posted paytable and its own edge. Both bets are minus-EV. PVPspinArena does not offer Three Card Poker.",
  facts: [
    "Three Card Poker is a casino side game against a dealer paytable, not a cash-game pot.",
    "Ante/Play basic strategy is Q-6-4: raise with that hand or better, fold worse.",
    "House edge on Ante/Play is about 3.37% of the ante (standard bonus), not zero.",
    "Pair Plus edges range from about 2.3% to well over 7% depending on the paytable.",
    "This is not Texas Hold'em. Button ranges and pot odds do not apply.",
  ],
  sections: [
    {
      id: "house-side-game",
      title: "A casino side game, not a poker room",
      body: `Three Card Poker deals three cards to you and three to the dealer. You decide whether to fold the ante or raise a Play bet equal to the ante. The dealer needs Queen-high or better to “qualify” on the common rule sheet. Bonuses pay certain made hands. Pair Plus pays your three cards against a schedule, dealer or not.

This [poker](/guides/topics/poker) guide is for adults 18+. 3 card poker strategy will not make you plus-EV. It will stop the extra leak of raising junk and folding queens. The leftover [house edge](/guides/house-edge) is the product.

Do not import [Texas holdem strategy](/guides/texas-holdem-strategy). There is no button. PVPspinArena does not deal this game. Use [Roulette](/roulette) if you wanted a posted colour, or [Jackpot](/) if you wanted a PvP pot.

### Why casinos like this felt

Decisions are fast. The raise is a single extra unit. Pair Plus is a one-button side bet. Hands last seconds. A 3.37% edge on a game you can play 60 times an hour is a different product from a slow Hold'em orbit. Speed is how a “small” edge becomes an hourly cost. If you came from cash-game hours, reset your clock. This pit does not wait for your tank.`,
    },
    {
      id: "ante-play",
      title: "Ante/Play and the Q-6-4 rule",
      body: `You post an Ante. You see three cards. You may fold (lose the Ante) or post Play equal to the Ante.

### Dealer qualify (standard)

If the dealer does not have Queen-high or better, Ante pays 1:1 and Play pushes. If the dealer qualifies, hands compare. You win both if you beat the dealer; you lose both if you lose. Ties push.

### Ante bonus (common)

A separate bonus on the Ante pays regardless of the dealer’s cards on many layouts: straight 1:1, three of a kind 4:1, straight flush 5:1. Confirm the felt. Bonus changes are why “the” house edge is a family of numbers.

### Q-6-4

Raise with Queen-6-4 or better. Fold worse. That is the basic strategy for the standard game. Q-6-3 is a fold. Q-7-2 is a raise. You do not need a solver. You need to follow the cutoff when the hand is ugly.

The house edge with this strategy on the common Ante-bonus sheet is about **3.37% of the Ante**. If you also count the Play chips you put in, the percent of total money handled is lower because Play is not always posted — but you still do not have a plus game. [Expected value](/guides/expected-value-gambling) stays negative.

### Dealer qualify, in slow motion

Beginners see “dealer does not qualify” and think they have a hedge. You still risked the Ante. When they miss Queen, you get even money on Ante and your Play back. When they hit Queen and beat you, you lose both. The qualify rule shapes the Q-6-4 cutoff; it does not give you a plus-EV button. Folding a trash hand is how you avoid putting Play on a loser that the dealer will often beat *when they do qualify*.

Some rule sheets change qualify (King, or no qualify). Those sheets need a different raise cutoff. If the felt does not say Queen, do not recite Q-6-4 like a spell. Ask. Then sit only if you still accept the posted edge.`,
    },
    {
      id: "pair-plus-table",
      title: "Pair Plus is a different bet with its own edge",
      body: `Pair Plus does not care about the dealer. It pays your three-card hand on a posted ladder. That ladder *is* the strategy: you cannot hold or discard. You can only take the bet or skip it.

| Three-card hand | Common “low edge” pay | Poorer common pay |
| --- | --- | --- |
| Straight flush | 40 to 1 | 40 to 1 |
| Three of a kind | 30 to 1 | 30 to 1 |
| Straight | 6 to 1 | 5 or 6 to 1 |
| Flush | 3 to 1 | 4 to 1 (watch this swap) |
| Pair | 1 to 1 | 1 to 1 |
| Approx. house edge | ~2.32% | often 5–7%+ |

Read the glass. A flush that pays 4 to 1 instead of 3 to 1 is not automatically better; rooms move other rungs when they “improve” one line. Published edges for common Pair Plus schedules cluster around **2.3%** on the 40-30-6-3-1 list and climb past **7%** on stingy lists. Wizard of Odds keeps the catalogue; this table is a warning label, not every variant.

Pair Plus is optional. Skipping it is a strategy. Playing it because the name says poker is how people add a second minus-EV bet to a first minus-EV bet.

### Progressive Pair Plus and “the jackpot”

A meter on Pair Plus or a six-card bonus can look like a reason to ignore the base edge. Sometimes a published analysis says the side bet is less bad when the meter is huge. Sometimes the base ladder is worse to fund the meter. You cannot see that from a glowing number. If you cannot find a current paytable-plus-meter analysis from a source you trust, treat the extra bet as a worse house game, not as a skill test.

You also cannot “play the meter down”. Other stools share it. Your $10 does not buy you a unique claim. That is the opposite of a Hold'em pot you built.`,
    },
    {
      id: "example",
      title: "Worked example: $10 Ante, Q-6-4, 50 hands",
      body: `This is the only numeric example on this page.

Ante $10. When you raise, Play is another $10. You follow Q-6-4. Ignore Pair Plus for the mean.

1. House edge ≈ 3.37% of the Ante. Expected cost per hand ≈ 0.0337 × $10 ≈ **$0.34**, whether you raise or fold, as an average across the strategy mix.
2. Over 50 hands, expected cost ≈ **$17** on $500 of Ante, plus the Play chips you put in on the hands you raise. Those Play chips are extra turnover; they are already baked into how the 3.37%-of-ante figure is defined on the standard sheet.
3. If you also bet $10 Pair Plus at a 7% edge each hand, that is another **$0.70** expected per hand, **$35** over 50 hands, on top of Ante/Play.
4. A lucky straight flush on Pair Plus can make the night. That is variance around a negative mean, not evidence the felt is plus. [Variance in gambling](/guides/variance-in-gambling) is the width.

If you raise every hand “for action”, you add a leak on top of 3.37%. The Q-6-4 cutoff exists because some three-card hands are too weak even against a dealer who often misses Queen.`,
    },
    {
      id: "not-holdem",
      title: "What does not transfer from Hold'em",
      body: `[Poker hand rankings](/guides/poker-hand-rankings) for five-card Hold'em are the wrong order here. In three-card poker, a straight outranks a flush on the usual house ranking. That shock is how Hold'em players misread the felt. Learn the three-card order the layout uses.

[Pot odds](/guides/poker-pot-odds) do not apply. There is no contested pot. You are buying a posted schedule. [GTO poker strategy](/guides/gto-poker-strategy) does not apply. The dealer’s cards are not a balanced range you are mixing against; they are a random three from a shoe or RNG with a qualify rule.

[Video poker](/guides/video-poker-paytables) is also a house game, but it is five-card draw with holds. Do not use a Jacks-or-Better chart at a Three Card table.`,
    },
    {
      id: "other-bets",
      title: "Six-card bonuses and other extras",
      body: `Layouts add six-card bonuses (your three plus the dealer’s three), progressive jackpots, and pair-plus variants. Each is a new paytable with its own edge, often worse than Ante/Play. If you cannot find a published edge, you do not have a strategy. You have a sticker.

RNG casino apps can offer the same bets with a software shoe. A lab logo is not a reason the edge vanished. [Crypto poker](/guides/crypto-poker) is still Hold'em-with-rake when it is real poker; Three Card on a casino lobby is this page, even if the cashier is USDT.

On this site there is no Ante button. A hashed [Coinflip](/coinflip) is a different contract: two players, a pot, a reveal. Do not call it 3 card poker strategy.

### Live dealer versus RNG

A studio dealer does not change Q-6-4. An RNG shoe does not change Q-6-4. Both still charge the edge. Collusion and card-counting stories from Hold'em do not port: you get three cards and a raise-or-fold. There is no multi-street information to exploit beyond the three ranks you already see. If a host says “the dealer is due to qualify”, that is folklore. The qualify rate is a constant on a fair shoe. Play the cutoff or walk.

### What a “strategy card” is allowed to say

Casinos sometimes hand out a card that restates Q-6-4. That card is not a coupon. It is the house telling you how to lose more slowly. Take it. Follow it. Do not add Pair Plus because the card made you feel prepared. Prepared is Q-6-4 and a written cap on the number of hands. Unprepared is raising 10-high “because I have been folding too much”. Folding too much is the strategy. Raising 10-high is how the 3.37% becomes a worse number nobody published.`,
    },
    {
      id: "summary",
      title: "Summary: Q-6-4, skip stingy Pair Plus, pay the edge",
      body: `3 card poker strategy: raise Queen-6-4 or better on Ante/Play, fold worse, read the Pair Plus ladder before you buy it, and accept a house edge on every hand. This is a casino side game. It is not Hold'em and it is not a winning system.

PVPspinArena does not offer Three Card Poker. If this game — or any other — is taking money you cannot spare, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Adults 18+ only.

Write the number of hands before you post the first Ante. Speed will eat an uncounted night. Forty hands at $10 Ante is already a $400 turnover before Pair Plus. The edge is a percent of that river of antes, not a percent of “what I meant to spend”. If the felt is fun, keep the fun inside the written count. If the felt is a chase, the cutoff will not save you. The stop will.`,
    },
  ],
  faqs: [
    {
      q: "What is the basic 3 card poker strategy?",
      a: "On Ante/Play, raise with Queen-6-4 or better and fold worse. That is Q-6-4. Pair Plus has no hold decision; the paytable is the whole bet.",
    },
    {
      q: "Does Q-6-4 beat the house?",
      a: "No. It minimises the Ante/Play edge to about 3.37% of the ante on the common bonus sheet. The game stays minus-EV.",
    },
    {
      q: "Should I play Pair Plus?",
      a: "Only if you accept that side bet’s posted edge, which can be 2.3% or much worse. Skipping Pair Plus is a valid strategy.",
    },
    {
      q: "Does a flush beat a straight in Three Card Poker?",
      a: "On the usual house ranking, a straight beats a flush. That is the opposite of five-card Hold'em. Read the layout.",
    },
    {
      q: "Is Three Card Poker the same as Hold'em?",
      a: "No. It is a house-banked casino game with three cards and a dealer qualify rule. There is no button and no rake on a shared pot.",
    },
    {
      q: "Does PVPspinArena offer Three Card Poker?",
      a: "No. It is not a poker room and not a side-game pit. It offers Jackpot, Coinflip and Roulette.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Three Card Poker",
      url: "https://wizardofodds.com/games/three-card-poker/",
    },
    { label: "Wikipedia: Three Card Poker", url: "https://en.wikipedia.org/wiki/Three_Card_Poker" },
    { label: "Wizard of Odds: house edge", url: "https://wizardofodds.com/gambling/house-edge/" },
  ],
  related: [
    "video-poker-paytables",
    "house-edge",
    "poker-hand-rankings",
    "expected-value-gambling",
    "how-to-play-poker",
  ],
  updated: "2026-09-26",
};

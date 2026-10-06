import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hi-lo-card-game",
  cluster: "Casino games",
  keyword: "hi lo card game",
  secondary: ["acey deucey", "in between poker", "red dog", "higher or lower casino"],
  title: "Hi Lo Card Game: Acey-Deucey Versus Casino",
  description:
    "Hi lo card game explained: Acey-Deucey / in-between versus casino higher-lower, how the spread sets the price, and typical house-edge shapes.",
  h1: "Hi lo card game: Acey-Deucey, in-between and casino higher-lower",
  answer:
    "A hi lo card game is not one ruleset. Acey-Deucey and in-between ask whether the next card falls strictly between two up-cards. Casino higher-lower asks whether the next card is above or below one up-card. Those are different sample spaces and different edges. Red Dog is a casino cousin of the spread bet. PVPspinArena does not offer hi-lo — only Jackpot, Coinflip and Roulette.",
  facts: [
    "Acey-Deucey / in-between: two cards define a spread; you bet the third sits strictly inside.",
    "Casino higher-lower: one card is shown; you pick higher or lower for the next card.",
    "A consecutive pair has no inside ranks; a 3–king spread is a very different ticket.",
    "Ties (same rank) are the usual leak: they may lose, push, or trigger a special pay.",
    "PVPspinArena does not offer a hi lo card game; Jackpot, Coinflip and Roulette are the live games.",
  ],
  sections: [
    {
      id: "two-games",
      title: "Two games that share a nickname",
      body: `Search “hi lo” and you will get a home-game, a carnival ticket and a casino button. Separate them before you price anything.

### Acey-Deucey / in-between

Two cards are dealt face up. You may pass or put a stake that the **next** card is **strictly between** them in rank. Example: 5 and 9. Inside ranks are 6, 7, 8. A 5 or 9 is not inside. Suits do not matter unless the house wrote a pair rule.

Home games often let the pot pay even money on any spread, which is a terrible price on tight spreads and a steal on 3-to-king if nobody can refuse. Casino versions post a pay by spread or take a rake on the pot.

### Casino higher-lower

One card is up. You choose **higher** or **lower**. The next card resolves. Ace is usually high only — confirm. A tie on rank may lose (fat edge), push (kinder), or pay a side table.

These are not the same hi lo card game. One is a spread bet. One is a one-sided comparison. This page is in the [casino games topic](/guides/topics/casino-games). Adults 18+. No operator rankings.`,
    },
    {
      id: "table",
      title: "Inside ranks versus higher-lower: an odds table",
      body: `Assume a single 52-card deck, two up-cards removed, Ace high, third card from the remaining 50. “Spread” here means the number of **ranks strictly between** the two up-cards.

| Product | Situation | Approx. true win chance | Fair total pay | Typical house leak |
| --- | --- | --- | --- | --- |
| In-between | 0 inside ranks (consecutive) | 0% | n/a | Must pass; some charge a fee to play |
| In-between | 1 inside rank (4 ranks left) | 4/50 = 8% | 12.5x | Even money is a donation |
| In-between | 3 inside (e.g. 5–9) | 12/50 = 24% | 4.17x | Even money is still short |
| In-between | 6 inside | 24/50 = 48% | 2.08x | Even money is close |
| In-between | 11 inside (3–king) | 44/50 = 88% | 1.14x | Even money favours you if you may pass the rest |
| Higher-lower | Up-card 7, pick either | 24/51 ≈ 47.1% | 2.12x | Even money; ties 3/51 |
| Higher-lower | Up-card 7, ties lose | 24/51, lose on 3 ties | — | EV = 48/51 ≈ 0.941; edge ~5.9% |
| Higher-lower | Up-card ace, must pick | Lower is 48/51 if ace-high | — | Forced “higher” is a near-sure loss |

Red Dog (three-card, raise on the spread) is a casino packaging of the in-between idea. Published house edges under common Red Dog rules sit around 2.5% to 3.5% with a sensible raise chart — far kinder than even-money on a 1-rank spread, far worse than a pass-line.

[House edge](/guides/house-edge) is still p × r. The nickname “hi-lo” does not pick the row for you.`,
    },
    {
      id: "worked",
      title: "Worked example: $10 on 5–9 versus $10 on a 7",
      body: `**In-between, 5 and 9 showing, even money.** Inside: 6,7,8 × 4 suits = 12 cards. p = 12/50 = 0.24. Pay 2x. EV = 0.48. Edge **52%**. A $10 chip has expected return $4.80. That is keno-shaped, not blackjack-shaped.

If the casino pays 4:1 (5x total) on a 3-rank spread, EV = 0.24 × 5 = 1.20 — now *you* have the edge on this specific deal, which is why real casinos do **not** post a flat 4:1 on every spread. They either pay even money (and you should pass tight spreads) or they post a spread-dependent table that keeps a few percent.

**Higher-lower, 7 up, ties lose, even money.** p(win) = 24/51. EV = 48/51 ≈ 0.941. $10 chip, expected cost about $0.59. One hundred such $10 bets: $1,000 wagered, expected cost about $59.

Same English word. Opposite tickets. If the UI says “hi-lo” and shows one card, you are in the second row, not Acey-Deucey.`,
    },
    {
      id: "rules",
      title: "Rules that quietly rewrite both games",
      body: `**Ace high, low, or both.** In some in-between games A-4 is a wide spread (A as 1). In others Ace is only high and A-4 is tight. Ask.

**Pairs.** Two 8s: no inside ranks. Some pots pay a pair bonus on the third 8; some take a vig and redeal.

**Multi-deck / continuous shuffle.** Removes the tiny composition effects. The spread still dominates.

**Raise or fold (Red Dog).** You see the spread, then raise 1× or 2×. A correct chart passes or min-bets the tight spreads and raises the wide ones. Guessing “always raise” donates extra.

**Instant crypto hi-lo.** Often a higher-lower button with a posted multiplier that already includes an edge, closer to a [crypto dice](/guides/crypto-dice-game) slider than to a home Acey-Deucey pot. Read r, then compute p from the remaining ranks.

Do not confuse this with [crypto blackjack](/guides/crypto-blackjack). Hi-lo does not use a 21 total or a dealer stand rule.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer hi-lo",
      body: `There is no in-between table and no higher-lower button. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/) — pot share, not a spread.
- [Coinflip](/coinflip) — 50/50 without leftover ranks.
- [Roulette](/roulette) — 33 slots, about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee.
- [online casino games](/guides/online-casino-games) — where a “hi-lo” tile usually sits: instant original.

If you want a 50/50 that pays 2x on a player pot, use Coinflip. If you want a spread bet, demand a pay-by-spread table or the right to pass. Even money on a 1-rank hole is not a game. It is a tip.

A home game that forces every player to fade every spread will transfer money to whoever sits out the 7–9 holes. If you cannot pass, leave the rotation. A casino tile that auto-deals the next three cards and pays 1.90x on “inside” without showing the two ranks first is not Acey-Deucey. It is a hidden-p slider. Ask to see the two cards before the stake locks. If you cannot, you do not have a hi lo card game. You have a trailer.`,
    },
    {
      id: "pass",
      title: "When passing is the only strategy",
      body: `In Acey-Deucey, the only real decision is **which spreads to play** at the posted pay. If every spread pays even money, pass anything with a true p under 50% (roughly fewer than 6–7 inside ranks, depending on ace rules and cards left). Playing every deal is how a home game transfers money to whoever never folds a 7–9.

In higher-lower, if you may choose the side, pick the larger remaining set. If the game forces a call on a queen, compute p(lower) before you call it “almost sure.” If ties lose, even a 7 is a ~6% keep.

None of that creates a long-run advantage against a posted casino table that already baked the keep into r. It only stops you from donating extra.`,
    },
    {
      id: "reddog",
      title: "Red Dog raises and why the third card is not a coin",
      body: `Red Dog is the casino packaging of in-between. Two cards, you may raise, third card. A typical raise is 1× or 2× the ante. Pays often run: 1:1 on a 3+ spread, 2:1 on a 2-rank spread, 5:1 on a 1-rank spread, plus a pair-raise rule when the first two match.

### Why the pay ladder exists

A 1-rank hole is rare and should pay a lot. A 7-rank hole is common and should pay little. If both paid even money, you would raise only the wide ones and pass the rest — and the house would go broke on the wide ones. The ladder tries to make every raise you *should* take still a small keep.

Published Red Dog edges under common six-deck rules sit around 2.5% to 3.5% **if you use the raise chart**. Always-raising is worse. Never-raising (ante only) can also be worse because the ante is already in and the good raises are the only way to get a fair-ish price on wide spreads.

### Higher-lower is still the other game

If the tile shows **one** card and two buttons, you are not in Red Dog. You are in casino higher-lower. A 7 with ties lose is ~5.9%. A queen with a forced “higher” is nearly a sure loss. An ace-high “lower” button is a strong favourite if they allow the choice — which is why many instant games do **not** let you pick the side on extremes, or they insert a joker lose.

### Multi-deck

Eight decks thicken ties and pairs. In-between inside-rank counts scale with remaining cards of those ranks (32 eights in eight decks, not 4). The *percentage* inside a 5–9 spread stays in the same neighbourhood (three ranks over thirteen), so the story does not flip. Continuous shuffle just kills any leftover composition you were not using anyway.

### Worked Red Dog-style raise

Ante $10, two cards show 4 and jack (6 inside ranks). Remaining 50 cards, 24 inside if single-deck and no suits special. p ≈ 0.48. If you raise $10 and the 6-rank pay is 1:1 on the raise plus ante even money, you have two even-money chips at ~48% — still a small keep, not a coin. If you pass the raise, you only risk the ante at that same ~48%. The chart’s job is to tell you when the posted 5:1 on a 1-rank hole is worth the raise and when a 0-rank pair should be a special action, not a blind even-money click.

Home Acey-Deucey with a pot and even money on every spread remains the trap: you must pass tight holes. Casino Red Dog at least *admits* the ladder. Instant “hi-lo” that pays 1.95x on a forced colour is a slider in a card skin.`,
    },
    {
      id: "limits",
      title: "Streaks of “easy” spreads and when to stop",
      body: `Wide spreads feel like free money. They are the hands the house uses to keep you in the chair for the 5–9 even-money disasters. If you are raising after a miss or treating every deal as mandatory, stop.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page lists tools on this site.

This site is 18+. Naming Acey-Deucey correctly is not a reason to click a hi-lo tile.

If you play in-between at all, write the pass line on a card: even money only above N inside ranks, else sit out. If the house will not let you sit out, you do not have a decision — you have a donation schedule. Higher-lower: pick the larger side when allowed, skip forced extremes, skip joker-lose colours you have not priced. One hundred $5 higher-lower chips on a 7 with ties lose is $500 through ~5.9%, about $30 expected. That is the cheap version of this nickname. The 5–9 even-money in-between chip is the expensive one. Know which button you pressed.

The next card still has a price. [Hi-Lo strategy](/guides/hi-lo-strategy) is the guesswork people add on top of the deck.`,
    },
  ],
  faqs: [
    {
      q: "What is a hi lo card game?",
      a: "Two different products share the name. Acey-Deucey / in-between bets that the next card sits between two ranks. Casino higher-lower bets that the next card is above or below one rank.",
    },
    {
      q: "Is Acey-Deucey the same as Red Dog?",
      a: "Same family: a spread, then a third card. Red Dog is a casino version with a raise step and a posted pay. Home Acey-Deucey is often even money on every spread.",
    },
    {
      q: "Why is even money on in-between so bad?",
      a: "Most random two-card spreads have well under 50% inside cards. Even money needs p > 50% to be fair. Tight spreads are the problem; you must be allowed to pass them.",
    },
    {
      q: "What is the house edge on higher-lower?",
      a: "On a 7 with ties losing and even money, about 5.9%. Extreme up-cards are better if you choose the side, and disastrous if the game forces the wrong side.",
    },
    {
      q: "Does PVPspinArena have a hi lo card game?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This guide distinguishes the two hi-lo families you will see elsewhere.",
    },
    {
      q: "Does a pair pay in Acey-Deucey?",
      a: "Only if the house wrote that rule. Two of a rank have zero inside cards. Some games redeal, take a vig, or pay a rare third-of-a-kind. Ask before you stake.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: Red Dog", url: "https://wizardofodds.com/games/red-dog/" },
    {
      label: "Wikipedia: Acey Deucey (card game)",
      url: "https://en.wikipedia.org/wiki/Acey_Deucey_(card_game)",
    },
    {
      label: "Wikipedia: Red Dog (card game)",
      url: "https://en.wikipedia.org/wiki/Red_Dog_(card_game)",
    },
  ],
  related: [
    "online-casino-games",
    "baccarat-rules",
    "crypto-blackjack",
    "house-edge",
    "double-or-nothing-game",
    "hi-lo-strategy",
  ],
  updated: "2026-09-26",
};

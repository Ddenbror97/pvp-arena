import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-pot-odds",
  cluster: "Poker",
  keyword: "pot odds",
  secondary: [
    "poker pot odds",
    "pot odds formula",
    "pot odds calculator",
    "outs and pot odds",
    "implied odds",
  ],
  title: "Poker Pot Odds: Fractions, Outs and Break-Even",
  description:
    "Pot odds with worked fractions: price of a call, outs to equity, break-even percent, and when implied odds are just a hope.",
  h1: "Pot odds: the fraction that tells you whether a call is priced",
  answer:
    "Pot odds are the price of a call compared with the pot you can win: call divided by (pot plus call). If your chance of winning is higher than that fraction, the call is plus-EV on this street, all else equal. If it is lower, the call is a leak. Pot odds are arithmetic, not a system. They do not print money after rake.",
  facts: [
    "Break-even percent ≈ call / (pot + call).",
    "Equity from outs is an estimate: on the turn, outs/46 is the usual one-card shortcut.",
    "Implied odds add money you hope to win later; hope is not a chip in the pot now.",
    "Pot odds do not care that you already put money in. Sunk cost is not a fraction.",
    "A house colour bet has a posted price; pot odds are for contested pots between players.",
  ],
  sections: [
    {
      id: "formula",
      title: "The fraction",
      body: `Pot odds ask a mean question: is the slice of the pot you must buy cheaper than the chance you finish with the best hand?

Break-even percent = amount to call ÷ (current pot + amount to call).

If you must call $20 into a $80 pot, you are calling $20 to win $100. 20/100 = 20%. You need about 20% equity if no more money goes in and you always win when you hit.

This [poker](/guides/topics/poker) page is for adults 18+. [Expected value](/guides/expected-value-gambling) is the same idea with a dollar sign: EV ≈ (equity × new pot) − call. Pot odds are the break-even version of that line.

PVPspinArena pots on [Jackpot](/) use share-of-pot, not a drawing hand. Do not import a flush-draw fraction onto a ticket.

### Odds versus probability

People say “I have 4 to 1 pot odds”. That is a ratio: four parts pot to one part call, which is the same as a 20% break-even if the pot is four times the call. People also say “I have 4 to 1 to hit”. That is a different 4 to 1: the miss-to-hit ratio of the draw. Mixing the two sentences is how a gutshot becomes a call. Write percent for equity and percent for price, then compare the percents. Convert to ratios only if you like them. Do not switch mid-hand without noticing.

A 19.6% draw is about 4.1 to 1 against. A 20% price is 4 to 1 on. Close, not identical. Close is where implied odds and dirty outs decide. Pretending they are the same number is how thin folds and thin calls get swapped.`,
    },
    {
      id: "odds-table",
      title: "Outs, fractions and the usual shortcuts",
      body: `An “out” is a card that you believe makes you the winner. The estimate is only as good as that belief. A flush draw is not nine clean outs if the board pairs and they have a boat.

| Draw (turn, one card) | Outs | Raw hit % | Break-even call / (pot+call) |
| --- | --- | --- | --- |
| Flush draw | 9 | 9/46 ≈ 19.6% | about 1 to 4 (need ~20%) |
| Open-ended straight | 8 | 8/46 ≈ 17.4% | about 1 to 4.7 |
| Gutshot | 4 | 4/46 ≈ 8.7% | about 1 to 10.5 |
| Two overcards (if they are clean) | 6 | 6/46 ≈ 13.0% | about 1 to 6.7 |
| Set-mining pair on the flop* | 2 | 2/48 ≈ 4.2% to hit on turn | needs fat implied odds |

\\*Set-mining is usually a flop decision with two cards to come; the row is a warning, not a full tree.

The “rule of 2 and 4” (outs × 2 on the turn, × 4 on the flop) is a shortcut for hit percent, not a substitute for the pot-odds fraction. Do both: estimate equity, then compare to call/(pot+call).

[Texas holdem strategy](/guides/texas-holdem-strategy) decides whether you should have this draw in the first place. Pot odds only price the draw you already have.

### Dirty outs and blockers

An out is dirty if it makes you a hand and makes them a better one, or if it pairs the board and they were already ahead with a pair that becomes two pair or trips. Count fewer outs when the texture is paired or four to a higher flush is possible. A “nine-out flush” on a two-tone paired board is not nine clean outs.

Blockers are the reverse story: you hold a card they need. Useful for bluff planning. Dangerous as an excuse to call with no pair because “they can’t have the ace of clubs” — they can have a different winner. Price the hand you beat, not the hand you blocked in a daydream.`,
    },
    {
      id: "example",
      title: "Worked fractions: $20 into $80, nine outs",
      body: `This is the only numeric example on this page. Do it on paper once.

Pot = $80. Opponent bets $20. You have a flush draw on the turn. Assume nine clean outs. One card to come.

1. **Price of the call.** You put in $20. The pot becomes $100 if you call and they check it down. Break-even = 20 / (80+20) = 20/100 = **1/5 = 20%**.
2. **Chance to hit.** 9/46 = **9 ÷ 46**. 9/45 would be 20%; 46 is a bit worse, so **≈ 19.6%**.
3. **Compare.** 19.6% < 20%. On a strict, no-implied-odds, winner-takes-all assumption, this is a **thin fold**.
4. **Change the bet.** Same $80 pot, they bet $10. Break-even = 10/90 ≈ **11.1%**. 19.6% > 11.1%. **Call** on odds alone.
5. **Change the outs.** Same $20 into $80, but you only have a gutshot (4 outs): 4/46 ≈ 8.7% versus 20%. **Fold** unless you have a strong reason they will pay a lot more when you hit.

That is pot odds. Four numbers: pot, call, outs, remaining cards. If you cannot name them, you are guessing.

Say the compare out loud: “nineteen-six versus twenty, fold if no extra money.” The sentence is the habit. The river that hits after you fold is not a refund. The river that misses after you call is not proof the fraction failed. Both are samples. Keep the sentence.

[How to win at poker](/guides/how-to-win-at-poker) still applies: a correctly priced call can lose. A correctly folded draw can watch the flush hit. The fraction is the process. The river is the sample.`,
    },
    {
      id: "implied",
      title: "Implied odds and reverse implied odds",
      body: `### Implied odds

Sometimes the pot now is too small, but you expect to win extra if you hit. Set-mining a small pair is the classic story: 12% or so to hit a set by the river, so you need to win a large multiple of the call. That only works if they will pay you when the set arrives and if stacks are deep enough.

Write the extra you need. If you need them to put in $150 more and they have $40 behind, you do not have implied odds. You have a wish.

### Reverse implied odds

Sometimes you hit and still lose. A flush on a paired board. A straight when the fourth flush card also came. Then your “outs” were not outs. Subtract some. Conservative counts beat optimistic ones at low stakes, where people do stack the nuts.

### Sunk cost

Money you already put in is not in the denominator as a reason to continue. The pot is already there for both of you. Only the next chips are a decision. “I have so much in already” is how pots get worse.`,
    },
    {
      id: "rake-and-errors",
      title: "Rake, multiway pots and common errors",
      body: `### Rake

If the room takes $3 out of your $80 pot, the pot you can actually win is $77. The break-even percent moves. At micro-stakes the cap is a real slice. Price the pot after fees when the cap matters. [House edge](/guides/house-edge) is the casino analogue; rake is the poker one.

### Multiway

Three players to the flop changes equity. Your flush draw may be live and still lose to a bigger flush. Pot odds use *your* equity, not a heads-up cartoon.

### Common errors

- Using flop odds (two cards to come) when you are facing a turn bet (one card).
- Counting 15 outs because you counted the same card twice.
- Calling a river bet with “pot odds” and a hand that cannot win often enough — on the river, outs are zero unless they can fold, which they cannot after a call.

[GTO poker strategy](/guides/gto-poker-strategy) mixes some calls that look slightly worse than pot odds because of future streets and balance. That is a later layer. Get the fraction right first.

### Two streets, one price at a time

On the flop you may face a bet with two cards to come. The shortcut “outs × 4” estimates the chance you hit by the river *if you see both cards for free*. You do not see both cards for free if they bet the turn again. Price this street’s call with this street’s remaining cards, then decide whether you can stand a second barrel. Calling flop “because 36%” and folding turn every time is how you pay to miss.

If you will call flop and fold turn to any bet, your real equity is closer to one-card equity, not two. Be honest about that plan before you click. A draw you cannot afford on the turn was a fold on the flop.`,
    },
    {
      id: "not-a-system",
      title: "Pot odds are not a winning system",
      body: `Correct prices stop some of the worst calls. They do not create an edge if you play too many hands, ignore position, or sit a high-rake game you cannot beat. They do not apply to [video poker](/guides/video-poker-paytables): that product pays a schedule, not a contested pot.

On this site, a [Coinflip](/coinflip) at 0% fee is about 50% to win a known pot. That is a posted price, not a draw. You do not need outs. You need a budget.

### Calculators and the tank

A pot-odds widget is fine in review. At the table, if you need thirty seconds of arithmetic every street, simplify: “is the call less than about one-fifth of the new pot for a nine-out turn draw?” That is the 20% line. Gutshots need a much cheaper price. You will be slightly off. Slightly off is still better than “I came this far”.

Do not let a calculator become a stall weapon. Rooms time you. Learn the common fractions — 1/4, 1/5, 1/3 — so you can act. Review the exact sum later. The tip is fluency, not a screenshot in the chat.

A bluff still has to be the right price. [Bluffing in poker](/guides/bluffing-in-poker) is the bet. This page is only the fraction.`,
    },
    {
      id: "summary",
      title: "Summary: call ÷ (pot + call), then be honest about outs",
      body: `Pot odds are a fraction. Compare it to equity. Use 9/46, not a vibe. Implied odds need leftover stacks, not hope. Rake shrinks the pot you can win.

If you are calling every draw “because pot odds” without doing the sum, stop and write the numbers — or stop playing. If stopping is already hard, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). PVPspinArena is 18+ and is not a poker room.

Carry one shortcut if you hate arithmetic: a nine-out turn draw wants a call of about one-fifth of the new pot or less. A gutshot wants far less, or implied odds you can actually point at. If you cannot point, fold. The shortcut is not a system. It is the 20% line in street clothes. Use it, then leave when the note says leave.

Pot odds are one slice of [poker math](/guides/poker-math).`,
    },
  ],
  faqs: [
    {
      q: "How do you calculate pot odds?",
      a: "Divide the amount you must call by the pot after you call: call / (pot + call). That is your break-even equity if no more money goes in.",
    },
    {
      q: "How do outs turn into a percent?",
      a: "On the turn, divide outs by 46. On the flop, a rough shortcut is outs × 4 for two cards to come, then still compare to the price of this street’s call.",
    },
    {
      q: "What are implied pot odds?",
      a: "Credit for money you expect to win on later streets if you hit. Only count it if stacks and opponent tendencies make that extra money realistic.",
    },
    {
      q: "Do pot odds guarantee a profit?",
      a: "No. A plus-EV call can lose. A minus-EV fold can watch the card hit. The fraction is the mean, not the next card.",
    },
    {
      q: "Should I include money I already bet?",
      a: "The pot includes it. Your reason to continue is only the next chips versus the new pot. Sunk chips are not a separate argument to call.",
    },
    {
      q: "Does PVPspinArena use pot odds?",
      a: "Not in the Hold'em sense. Jackpot uses share of pot; Coinflip is a posted 50/50. There is no flush draw to price.",
    },
  ],
  sources: [
    { label: "Wikipedia: Pot odds", url: "https://en.wikipedia.org/wiki/Pot_odds" },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    { label: "Wizard of Odds: house edge", url: "https://wizardofodds.com/gambling/house-edge/" },
  ],
  related: [
    "expected-value-gambling",
    "texas-holdem-strategy",
    "gto-poker-strategy",
    "how-to-win-at-poker",
    "house-edge",
    "how-to-play-poker",
    "poker-math",
  ],
  updated: "2026-09-26",
};

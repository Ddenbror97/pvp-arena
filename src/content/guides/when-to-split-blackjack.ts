import type { Guide } from "./types";

export const guide: Guide = {
  slug: "when-to-split-blackjack",
  cluster: "Blackjack",
  keyword: "when to split in blackjack",
  secondary: [
    "split aces blackjack",
    "split 8s blackjack",
    "never split 10s",
    "DAS blackjack pairs",
  ],
  title: "When to Split in Blackjack: Aces, Eights, Tens",
  description:
    "When to split in blackjack: always aces and eights, never tens, how DAS moves 2s 3s 6s 7s, and why a second stake shrinks leak instead of creating plus-EV.",
  h1: "When to split in blackjack: aces, eights, and the pairs you should not",
  answer:
    "When to split in blackjack is charted, not vibed: you put out a second stake and play two hands from a pair when that pair is worse as a total than as two starts. Always split aces and 8s on a standard chart. Never split 10s. Pairs of 4s and 5s are usually totals. DAS rewrites several small pairs. The extra box shrinks leak. It does not create plus-EV. PVPspinArena does not deal blackjack.",
  facts: [
    "A split requires a second stake equal to the first; each new hand is played on its own.",
    "Always split aces and 8s on common multi-deck charts; standing on 16 made of 8-8 versus 10 is a famous leak.",
    "Never split 10s: 20 is already a strong total.",
    "DAS (double after split) makes some splits of 2s, 3s, 6s and 7s worthwhile that are hits without DAS.",
    "Adults 18+: two boxes are not two edges. PVPspinArena does not deal blackjack.",
  ],
  sections: [
    {
      id: "what",
      title: "What a split costs and why it exists",
      body: `A pair can be played as one total or as two hands. A split is the second choice: another unit, two boxes, each receiving at least one new card. You split when the expected value of two starts beats the expected value of the combined total.

16 made of 8-8 versus a dealer 10 is a wreck as one hand. Two hands that start with 8 are still weak, and they lose less on average than one doomed 16. That is the whole idea. It is not “more action is more skill”.

### After the split

Each hand follows the [blackjack chart](/guides/blackjack-strategy-chart) on its own. If DAS exists, a 10 or 11 on one of those hands can be doubled. If DAS does not exist, you hit. Some tables give one card only on split aces and forbid a further hit. Read the sheet in [blackjack rules](/guides/blackjack-rules).

### Not a raise button

You needed the second unit because the pair cell demanded it, not because the last hand won. [When to double down in blackjack](/guides/when-to-double-down-blackjack) is the other extra-stake family. The loop around both is [how to play blackjack](/guides/how-to-play-blackjack). The hub is [blackjack guides](/guides/topics/blackjack).`,
    },
    {
      id: "always",
      title: "Always: aces and eights",
      body: `These two rows are the ones recreational players still argue with, and they are the expensive arguments.

### Aces

A pair of aces as a hard 12 (or a soft 12) is a poor total. Two hands that start with an ace can become 21 with one ten. Most tables give exactly one card to each ace and do not allow a further hit. You still split. Resplit-aces rules change the leftover edge by hundredths; they do not change the “always” for the first split.

### Eights

Hard 16 is one of the worst totals in the game. Two 8s versus 9, 10 or ace look suicidal as splits and are still the charted play on standard multi-deck sheets. Versus 2–8 the split is more comfortable and still correct. Late surrender of 16 versus 9–ace can beat a split on some captions if you have 8-8 and surrender is offered — check the labelled grid. Do not invent “I will just stand this 16”.

[Blackjack basic strategy](/guides/blackjack-basic-strategy) lists these as high-value cells people ignore.

### “I never split aces because I only get one card”

That house rule is already priced into the leftover edge. The one-card constraint is why resplit-aces and draw-to-split-aces matter on a sheet. It is not a reason to play 12. Two one-card ace hands still beat one 12 on average. If the table forbids splitting aces entirely — rare, and a loud tax — you are not in the standard game this page describes. Walk or treat it as a different product.`,
    },
    {
      id: "never",
      title: "Never: tens, and usually fives and fours",
      body: `### Tens

20 is a strong total. Splitting 10s to “get closer to 21 twice” throws away a hand that already beats most dealer finishes. Never split 10s on a basic-strategy chart. Counting deviations that split 10s in extreme live shoes are a different, fragile project — see [card counting](/guides/card-counting) — and they do not apply to per-hand shuffles.

### Fives

A pair of 5s is a 10. Treat it as a 10: double versus 2–9 on most multi-deck charts, hit versus 10 or ace. Splitting 5s starts two terrible 5s.

### Fours

A pair of 4s is an 8. Most multi-deck no-DAS charts hit. Some DAS charts split 4s versus 5–6 only. Default: it is a total unless your caption says otherwise.

### Face cards that are not a pair

King-queen is 20, not a pair, even if both are tens. You cannot split unlike ranks.

### Face-ten pairs are still tens

Jack-jack, queen-queen, king-ten if the table treats ranks, and 10-10 are all the “never split 20” family on a normal rank-pair rule. Some novelty tables let you split unlike tens; the chart still says stand. Splitting 20 to “make two 21s” is how a leftover 0.5% illustration becomes a highlight-reel leak. You will win some of those splits. The mean is still the stand.`,
    },
    {
      id: "small",
      title: "Twos, threes, sixes, sevens, nines and DAS",
      body: `These rows move when DAS disappears, when decks change, and when the dealer’s up-card is strong.

### Illustration family, multi-deck S17 with DAS

- 2s and 3s: split versus 2–7; hit versus 8–ace.
- 6s: split versus 2–6; hit versus 7–ace.
- 7s: split versus 2–7; hit versus 8–ace (some captions stand 7s versus 10 as a 14 — check, do not vibe).
- 9s: split versus 2–6, 8–9; stand versus 7, 10, ace. Standing 18 versus 7 is the cell people skip.

### Without DAS

Several 2s, 3s and 6s revert to hit because you cannot double a 10 or 11 that appears on the new hand. If you memorised a DAS wallpaper and the app hid the double-after-split button, you are leaking.

### Deck count

[How many decks in blackjack](/guides/how-many-decks-blackjack) moves a few pair cells at the single-deck end. Do not copy a single-deck 6s-versus-7 split onto an eight-deck RNG table.

### Sevens versus a ten

Some players stand 14 made of 7-7 versus 10 because “the dealer has a ten”. Most multi-deck charts hit or split according to the pair row, not a folkloric stand. Check the caption. A 14 versus 10 is a poor total; standing it as a pair because it looks tidy is not a strategy. If late surrender of 14 is not offered (it usually is not), you are in hit-or-split country, not stand country.`,
    },
    {
      id: "table",
      title: "A small table of split cells",
      body: `Teaching illustrations for a common six-deck S17 3:2 DAS sheet. Not a 300-cell dump.

| Pair | Versus 5–6 | Versus 10 | Versus ace | Note |
| --- | --- | --- | --- | --- |
| Aces | Split | Split | Split | Usually one card each |
| 8s | Split | Split (or surrender if labelled) | Split (or surrender if labelled) | Do not stand the 16 |
| 10s | Stand | Stand | Stand | Never split |
| 5s | Double as 10 | Hit as 10 | Hit as 10 | Not a split |
| 9s | Split | Stand | Stand | Stand vs 7 as well |
| 2s | Split | Hit | Hit | Needs DAS for some weaker columns |

If you only remember four pair rules tonight: split aces, split 8s, never split 10s, treat 5s as a 10.

Then learn 9s versus 7 (stand the 18) and the DAS question for 2s and 3s. Those two extras prevent the next layer of folklore: “always split nines” and “always split small pairs because more hands”. More hands are only correct when the cell says so. Extra boxes on a pair of 5s are a self-inflicted tax.`,
    },
    {
      id: "numeric",
      title: "A numeric example of refusing eights",
      body: `Illustration, not your lobby quote.

### Worked clip

$10 units, six-deck S17 3:2, matching chart except pair of 8s. Suppose 8-8 versus 10 appears four times in 200 hands.

| Habit | What happens | Teaching cost |
| --- | --- | --- |
| Split as charted | Two $10 hands, ugly but least-bad | leftover edge stays near 0.5% on the session |
| Stand the 16 | One $10 hand that the dealer 10 beats often | can add on the order of a percent of handle across a night if repeated |
| Hit the 16 as if it were 10-6 | Better than standing, still worse than the pair cell if the chart wanted a split | mixed leak |
| Split and then refuse DAS doubles | Pays the pair cell, then leaks the double cells | smaller leak than standing |

Session scale: 200 hands × $10 = $2,000 handled. A 0.5% leftover is about $10 expected cost. Refusing 8s all year is how Player B in the [basic strategy](/guides/blackjack-basic-strategy) table sits at 2.5%+. Two boxes on a correct split also mean you handled more money that round — the percentage is still a tax, just applied to a larger handle.

A [blackjack simulator](/guides/blackjack-simulator) would smear those means with variance. This site has no shoe simulator.

### Two boxes and the budget

A correct split raises handle for that round. If your written stop is “leave at −$60” and you split 8s twice in a cold clip, you can hit the stop faster without playing “worse”. That is not a reason to refuse the cell. It is a reason to size the unit so two boxes still fit the note. Adults who shrink the unit after learning splits are using the chart. Adults who keep a $25 unit they cannot afford to double are using the chart as a story.

[What is insurance in blackjack](/guides/blackjack-insurance) is a second-stake offer you should usually refuse. A split is a second-stake offer the chart sometimes requires. The difference is the price, not the adrenaline. Do not treat every extra chip as the same decision.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena has no pairs to split",
      body: `There is no 21 table here. [Roulette](/roulette) has no 8s. [Jackpot](/) chance is stake over pot. [Coinflip](/coinflip) is a bit. [Fairness](/fairness) verifies a seed, not a pair row.

[Crypto blackjack](/guides/crypto-blackjack) is the checklist if another lobby offers DAS in a footnote. Adults 18+: two hands are two wagers. They are not a plus-EV factory.

Pair cells also do not license a side bet. Perfect pairs is a different contract with a typical several-percent edge. You already know you were dealt a pair; buying a side ticket that pays for that fact is usually a worse price than playing the pair row. Keep the main-box split and skip the sticker.`,
    },
    {
      id: "stop",
      title: "Two boxes are not a reason to sit longer",
      body: `Learning to split 8s feels like competence. Competence is not plus-EV. Do not raise the unit because you finally stopped standing 16.

Keep a written [gambling budget](/guides/gambling-budget). If pair decisions are an excuse to chase, stop. Competence on 8s is still a leftover tax. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page is the on-site start.`,
    },
  ],
  faqs: [
    {
      q: "When should I split in blackjack?",
      a: "When a matching chart says so. Always split aces and 8s on standard sheets. Never split 10s. Check DAS before you split 2s, 3s or 6s.",
    },
    {
      q: "Why split 8s versus a dealer 10?",
      a: "Because one 16 is worse, on average, than two hands that start with 8. Both options lose often. The split loses less.",
    },
    {
      q: "Should I split 10s if I have a feeling?",
      a: "No. 20 is a strong total. Feelings are how leftover edge grows.",
    },
    {
      q: "What does DAS change?",
      a: "Double after split makes some small-pair splits more valuable because a 10 or 11 on the new hand can take a second unit.",
    },
    {
      q: "Does splitting create plus-EV?",
      a: "No. It is the least-bad use of a second stake on a still-negative game.",
    },
    {
      q: "Does PVPspinArena have splits?",
      a: "No. PVPspinArena does not deal blackjack.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: blackjack basic strategy",
      url: "https://wizardofodds.com/games/blackjack/strategy/4-decks/",
    },
    {
      label: "Wizard of Odds: blackjack house edge calculator",
      url: "https://wizardofodds.com/games/blackjack/calculator/",
    },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
  ],
  related: [
    "when-to-double-down-blackjack",
    "blackjack-strategy-chart",
    "blackjack-basic-strategy",
    "blackjack-rules",
    "how-to-play-blackjack",
    "how-many-decks-blackjack",
  ],
  updated: "2026-09-26",
};

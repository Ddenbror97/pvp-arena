import type { Guide } from "./types";

export const guide: Guide = {
  slug: "when-to-double-down-blackjack",
  cluster: "Blackjack",
  keyword: "when to double down in blackjack",
  secondary: [
    "blackjack double down",
    "soft double blackjack",
    "hard 11 double",
    "double after split",
  ],
  title: "When to Double Down in Blackjack: Hard and Soft",
  description:
    "When to double down in blackjack: hard 9–11, soft 13–18, DAS, rule captions that move cells, and why extra stake is leftover-edge math — not plus-EV.",
  h1: "When to double down in blackjack: hard totals, soft totals, leftover cost",
  answer:
    "When to double down in blackjack is a chart question, not a hunch: you add a second stake and take exactly one card when that extra unit has higher expected value than hitting for one and stopping later. Common multi-deck S17 cells include hard 10–11 versus weak-to-medium up-cards and several soft 13–18 doubles versus 5 or 6. The extra stake shrinks leak on those cells. It does not create plus-EV. PVPspinArena does not deal blackjack.",
  facts: [
    "Double means one extra unit and exactly one more card; you cannot hit after.",
    "Hard 11 versus 2–10 is a double on most multi-deck S17 charts; ace and H17 captions move the cell.",
    "Soft doubles (ace plus a small card) exist because you cannot bust on the one card.",
    "If the table allows double only on 10–11, many soft cells revert to hit — illustration: that restriction often adds about 0.18% house edge.",
    "Adults 18+: doubling is not a licence to raise the session. PVPspinArena does not deal blackjack.",
  ],
  sections: [
    {
      id: "what",
      title: "What doubling does to the stake",
      body: `A double is a second, equal stake and a promise: you will take one card and stand. You want that extra unit out when the one card is likely to finish a strong total and the dealer is likely to bust or finish weak.

You do not double because you are “due”. You do not double to press a heater. You double when a [blackjack chart](/guides/blackjack-strategy-chart) for these rules paints the cell.

### Compared with a hit

Hitting lets you take more than one card if you are still short. Doubling forbids that. That is why hard 12 is not a double and why some stiffs stay hits. The extra unit is valuable only when one card is enough.

### Compared with a split

A split opens two hands. A double stays one hand with twice the money. Pair decisions live in [when to split in blackjack](/guides/when-to-split-blackjack). DAS — double after split — means the double button can appear on each new hand. [Blackjack rules](/guides/blackjack-rules) name that lever.

The walkthrough of the rest of the loop is [how to play blackjack](/guides/how-to-play-blackjack). The full grid philosophy is [blackjack basic strategy](/guides/blackjack-basic-strategy). The hub is [blackjack guides](/guides/topics/blackjack).`,
    },
    {
      id: "hard",
      title: "Hard doubles: 9, 10 and 11",
      body: `Hard totals have no ace counted as 11.

### Hard 11

On most multi-deck S17 3:2 charts you double 11 versus dealer 2 through 10. Versus an ace the cell is more conservative: many multi-deck charts hit instead, especially H17. Single-deck charts are freer versus the ace. Read the caption.

### Hard 10

Usually double versus 2 through 9. Versus 10 or ace, most multi-deck charts hit. You already have a ten-value; the dealer’s ten or ace is too strong to put a second unit in the way of a likely finish.

### Hard 9

Often double versus 3 through 6. Versus 2 the cell can move with decks. Versus 7 or higher you hit. A 9 wants a 10 and a dealer who is still in bust country.

### Hard 8 and below

Not doubles on standard charts. Take the hit. Putting a second unit on 8 versus 6 is a common streamer flourish and a leak.

[Expected value](/guides/expected-value-gambling) is why 11 versus 6 wants the extra unit and 11 versus ace often does not: the dealer’s finishing distribution changes the value of that second stake.

### Hard 11 is not “always”

Streamer folklore says double 11 against anything. Multi-deck H17 versus an ace is the cell that folklore gets wrong. The dealer’s ace is a strong up-card; putting a second unit out when a hole ten is still possible (or after a peek that already cleared blackjack) is a different price than 11 versus 6. If you only remember one hard double, remember 11 versus 5–6. Then learn 11 versus 2–10 on a matching caption. Then stop inventing 11 versus ace from a wallpaper that did not name decks.`,
    },
    {
      id: "soft",
      title: "Soft doubles",
      body: `A soft total uses an ace as 11. One more card cannot bust you. That is why soft 13–18 have their own double rows.

### Typical multi-deck S17 illustrations

- Soft 13–14 (A,2–A,3): double versus 5–6, otherwise hit.
- Soft 15–16 (A,4–A,5): double versus 4–6, otherwise hit.
- Soft 17 (A,6): double versus 3–6, otherwise hit.
- Soft 18 (A,7): double versus 3–6; stand versus 2, 7, 8; hit versus 9, 10, ace on many multi-deck charts.

Players who “always stand on 18” donate the soft-18 versus 9–ace cells. Soft 18 versus a 6 is a double, not a polite stand, on those same charts.

### H17 moves some soft cells

When the dealer hits soft 17, a few extra doubles appear or tighten because the dealer finishes stronger. Using an S17 soft-double row on an H17 table is a small, real leak.

### Soft 19 and 20 are not doubles

A,8 and A,9 are stands against almost every up-card on standard charts, with a few single-deck double-versus-6 curiosities. Do not “press” a 19 because it is soft. Soft means you could hit without busting, not that you should put a second unit on a total that already wins often. The extra stake on soft 13–18 versus a bust card is buying a ten that makes 18–21 while the dealer is fragile. Soft 19 already is that finish.`,
    },
    {
      id: "rules",
      title: "Rule captions that erase or add doubles",
      body: `If the felt says double only on 10 and 11, the entire soft-double family becomes hits. Illustration: that restriction often adds about 0.18% to the leftover house edge. The chart shrinks. You do not invent doubles the table forbids.

### DAS

After a split, DAS lets you double a 10 or 11 (and soft totals if allowed) on the new hand. Without DAS you hit those totals. That is why some pair cells are only splits when DAS exists.

### Peek

If the dealer peeks for blackjack under a ten or ace, you will not double extra money into a waiting natural. If there is no peek, a few double-versus-ace or ten cells become less attractive because the extra unit can vanish to a hole ten.

### 6:5 does not change the colour — it changes the bill

You still double the same 11 versus 5. The leftover edge on the whole game is just worse. A perfect double on a 6:5 table is not plus-EV.

### Late surrender is not a double

If the chart wants surrender of 16 versus 10, that is a half-unit exit, not a double. Mixing the buttons — doubling a 16 “to get it over with” — is the opposite of the cell. [Blackjack rules](/guides/blackjack-rules) keep surrender and double on different lines of the sheet for a reason.`,
    },
    {
      id: "table",
      title: "A small table of common double cells",
      body: `Teaching illustrations for a common six-deck S17 3:2 DAS sheet. Not a full chart. Cells move.

| Your total | Dealer 5–6 | Dealer 9 | Dealer 10 | Dealer ace |
| --- | --- | --- | --- | --- |
| Hard 11 | Double | Double | Double | Often hit (check caption) |
| Hard 10 | Double | Double | Hit | Hit |
| Hard 9 | Double | Hit | Hit | Hit |
| Soft 18 | Double | Hit | Hit | Hit |
| Soft 17 | Double | Hit | Hit | Hit |
| Hard 16 | Stand (not a double) | Hit or surrender | Hit or surrender | Hit or surrender |

If you only remember three doubles tonight: 11 versus 2–10, 10 versus 2–9, and soft 18 versus 6. Then load the real grid.`,
    },
    {
      id: "numeric",
      title: "A numeric leftover-edge illustration",
      body: `Suppose two adults play the same six-deck S17 3:2 table with a matching chart except for doubles.

### Worked 200-hand clip, $10 units

| Player | Double habit | Illustration | Expected extra leak |
| --- | --- | --- | --- |
| A | Takes every matching double | leftover ~0.5% on $2,000 handled ≈ $10 | baseline |
| B | Never doubles (hits instead) | several tenths of a percent extra | often $6–$15 extra on this clip |
| C | Doubles 8 versus 6 “for fun” and skips 11 versus 10 | own-goal plus missed cell | can exceed B |
| D | Perfect doubles on a 6:5 felt | leftover ~2% | ≈ $40 on the same $2,000 |

The extra unit on a correct 11 versus 6 is the point of the cell: you are buying more action at a still-negative but better price than hitting. The extra unit on an 8 versus 6 is a larger tax.

A [blackjack simulator](/guides/blackjack-simulator) would show wide tails around those means. This site has no shoe simulator. [House edge](/guides/house-edge) still applies to every doubled dollar — you handled more money, so the same percentage is a larger bill if you double wildly.

### Why the extra unit can still be correct on a negative game

Think of the second stake as a second ticket on a still-bad play that is less bad than the one-ticket version. Illustration: if hitting 11 versus 6 has a slightly negative EV and doubling has a less-negative EV per original unit — or a better EV on the combined stake after you account for the extra dollar — the chart takes the double. You will still lose plenty of these. A dealer 6 becomes 21 often enough to humble anyone who thought “double means lock”. The cell is a mean, not a stamp.

Stretch Player B across a month. Never doubling on a clean six-deck S17 table is a quiet leak: you keep missing the extra unit on the best dealer-bust cards. It will not feel like a mistake because you also avoid the doubled losses. The mean still moved against you. That is why “I only bet one unit, I’m safer” is only true for ruin, not for the leftover percentage on the hands the chart wanted to enlarge.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena has no double button",
      body: `There is no 21 table here. You cannot double a colour on [Roulette](/roulette); you can read 33 slots and about a 7.88% Purple or Silver edge after the win fee. [Jackpot](/) and [Coinflip](/coinflip) publish chance without a soft-17 row. [Fairness](/fairness) verifies a committed result.

[How many decks in blackjack](/guides/how-many-decks-blackjack) explains why a single-deck double-versus-ace cell does not belong on an eight-deck RNG app. [Crypto blackjack](/guides/crypto-blackjack) is the felt checklist if you sit elsewhere.

Adults 18+: a correct double is still a wager with a leftover tax. Meaningful decisions are compatible with a negative expectation.

If you came from slots, the double button feels like a bonus buy: more money, more drama. It is not a bonus buy. There is no extra reel. There is one card and a dealer rule. [What is insurance in blackjack](/guides/blackjack-insurance) is the other extra-money offer that usually deserves a no; doubles deserve a chart, not a yes-to-everything. Keep the two buttons in different mental boxes.`,
    },
    {
      id: "stop",
      title: "A correct double is not a reason to stay",
      body: `People who learn the soft-double rows sometimes raise the unit because the hand “uses skill”. Skill here means picking the least-bad extra stake. It is not a wage.

Keep the same [gambling budget](/guides/gambling-budget). If you are doubling to chase, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page is the on-site start.`,
    },
  ],
  faqs: [
    {
      q: "When should I double down in blackjack?",
      a: "When a chart that matches your rules says so — typically hard 10–11 versus weaker up-cards and several soft totals versus 4–6. Always read S17/H17 and double restrictions first.",
    },
    {
      q: "Can I hit after I double?",
      a: "No. Double is one extra unit and exactly one card.",
    },
    {
      q: "Should I double 11 versus a dealer ace?",
      a: "Many multi-deck charts say hit, especially H17. Single-deck captions can differ. Do not invent the cell.",
    },
    {
      q: "Does doubling create plus-EV?",
      a: "No. A correct double can be the least-bad way to put a second unit on a still-negative hand. The leftover house edge remains.",
    },
    {
      q: "What if the table only allows double on 10 and 11?",
      a: "Then skip every soft double. Illustration: that rule often adds about 0.18% house edge.",
    },
    {
      q: "Does PVPspinArena allow doubles?",
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
    "blackjack-strategy-chart",
    "blackjack-basic-strategy",
    "when-to-split-blackjack",
    "blackjack-rules",
    "how-to-play-blackjack",
    "expected-value-gambling",
  ],
  updated: "2026-09-26",
};

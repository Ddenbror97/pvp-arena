import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blackjack-rules",
  cluster: "Blackjack",
  keyword: "blackjack rules",
  secondary: ["s17 vs h17", "blackjack 3:2 vs 6:5", "double after split", "blackjack surrender"],
  title: "Blackjack Rules: S17, H17, 3:2, DAS, Surrender",
  description:
    "Blackjack rules that move the edge: S17 versus H17, 3:2 versus 6:5, DAS, surrender, peek, and why a chart cannot repair a bad felt.",
  h1: "Blackjack rules: S17, H17, 3:2 versus 6:5, DAS and surrender",
  answer:
    "Blackjack rules are the posted levers that set the leftover house edge before you touch a chart: whether the dealer hits or stands on soft 17, whether a natural pays 3:2 or 6:5, whether you may double after split, whether late surrender exists, and how many decks are in the shoe. A matching chart shrinks leak. It does not create plus-EV on a 6:5 H17 table. PVPspinArena does not deal blackjack.",
  facts: [
    "Illustration: dealer hits soft 17 (H17) instead of stands (S17) often adds about 0.20% house edge.",
    "Illustration: paying 6:5 on blackjack instead of 3:2 often adds about 1.40% — more than many charts save versus sloppy play.",
    "DAS (double after split) typically subtracts about 0.14% when it is present.",
    "Late surrender typically subtracts about 0.07% if you actually use the posted cells.",
    "Adults 18+: read the felt before you sit; PVPspinArena does not deal blackjack.",
  ],
  sections: [
    {
      id: "core",
      title: "The core rules every blackjack table still shares",
      body: `Strip the marketing and you still have the same skeleton. You stake a main box. You receive two cards. The dealer shows one. You act first. Totals closer to 21 without busting beat the dealer. Aces are 1 or 11. Tens and faces are 10. You bust, you lose, even if the dealer later busts.

That skeleton is the walkthrough in [how to play blackjack](/guides/how-to-play-blackjack). This page is the variant sheet — the words on the felt that turn a “low edge” story into a 0.4% illustration or a 2% product.

### Four facts you write down

1. Blackjack payout: 3:2 or 6:5?
2. Soft 17: S17 or H17?
3. DAS, doubling limits, resplit aces?
4. Decks and shuffle: six, eight, single, infinite, per-hand?

If a lobby will not state those four, you cannot load a chart and you cannot price the game. [Crypto blackjack](/guides/crypto-blackjack) is the same checklist with a wallet. [How many decks in blackjack](/guides/how-many-decks-blackjack) expands fact four.

### House-banked

Other boxes are not your pot. The studio is the bank. Compare that to a published PvP share on [Jackpot](/) only as a contrast, not as a substitute payoff.

The [blackjack topic](/guides/topics/blackjack) collects the siblings. [Blackjack basic strategy](/guides/blackjack-basic-strategy) is the grid that assumes a named sheet like this one.

### Rules are not “how to win”

A complete sheet still leaves a leftover house edge. The words on the felt set the size of that leftover; they do not flip the sign. Adults 18+ should treat a clean S17 3:2 DAS table as cheaper entertainment, not as a job. If a lobby will not publish the sheet, assume the missing line is the expensive one — 6:5, H17, no DAS — until proven otherwise.

Write the four facts on paper before the first hand. Memory after a win is how people “remember” 3:2 on a 6:5 app. The paper does not care about the last natural.`,
    },
    {
      id: "soft-17",
      title: "S17 versus H17",
      body: `Soft 17 is ace-6. S17 means the dealer stands. H17 means the dealer hits.

When the dealer hits soft 17, some dealer busts disappear and some dealer 18–21 finishes appear instead. Player doubles and stands against weak up-cards lose a little more often. The chart moves a few cells. Using an S17 grid on an H17 table is a measurable leak.

### Why the marketing number lies if you skip this word

A banner that says “0.5% house edge” almost always assumes S17 plus 3:2 plus a matching chart. Flip only the soft-17 line and the leftover edge is a different number. Illustration: H17 adds about two-tenths of a percent on a common six-deck sheet. That is smaller than 6:5 and larger than “I will just remember the same wallpaper”.

### Composition still sits on average

H17 does not create a countable remainder. It changes dealer finishing totals from a full or average shoe. [Card counting](/guides/card-counting) is a different project and usually dies on per-hand shuffles.

### A dealer who hits soft 17 is not “playing badly”

The rule is posted because it earns. Some dealer 17s that would have stood become 18–21. Some still bust. The net is a small, reliable tax. You do not “outplay” H17 by standing more often on hunches. You load an H17 chart or you walk. Mixing S17 stands into an H17 game is how a 0.2% illustration becomes a larger leak plus a story about intuition.`,
    },
    {
      id: "payout",
      title: "3:2 versus 6:5 naturals",
      body: `A natural is ace plus ten-value on the first two cards. The fair-looking price that blackjack’s reputation was built on is 3:2. Many apps pay 6:5 because the words still say “blackjack” and the extra edge is huge.

### Worked $10 natural

- 3:2: $15 profit. Stake plus win = $25 back.
- 6:5: $12 profit. Stake plus win = $22 back.

The missing $3 is not a rounding error. Naturals are common enough that this payline often adds about 1.4 percentage points of house edge. That can more than double the cost of a clean 0.5% illustration.

### A chart cannot repair the payline

You can play every cell perfectly and still sit in slot-adjacent territory. Shopping tables — or walking — moves more money than colouring a 6:5 grid. If both tables in the lobby are 6:5, you do not have a strategy problem. You have a product problem.

### How often the payline fires

Naturals are not rare. Teaching illustrations often put a player blackjack near 4.7% of hands in a six-deck shoe. That is often enough for a $3 shortfall on a $10 box to dominate every other rule tweak on this page. If you only remember one blackjack rule, remember the payout printed next to the word blackjack. Everything else is secondary.`,
    },
    {
      id: "das",
      title: "DAS, doubling limits and resplits",
      body: `DAS means you may double after you split a pair. That option makes some splits of 2s, 3s, 6s and 7s worth taking on multi-deck charts. Without DAS those cells often revert to hit. See [when to split in blackjack](/guides/when-to-split-blackjack) and [when to double down in blackjack](/guides/when-to-double-down-blackjack).

### Double only on 10–11

Some tables let you double only those two hard totals. Soft doubles disappear. Illustration: restricting doubles to 10–11 often adds about 0.18%. The chart shrinks; the leftover edge grows.

### Resplit aces

After you split aces, many tables give one card each and forbid a further split if another ace arrives. Allowing resplit aces is a small gift. Forbidding it is a small tax. Neither one creates plus-EV.

### Peek

If the dealer peeks under a ten or ace for blackjack before you play, you do not double or split extra money into a waiting natural. Peek details belong on the sheet. Sheets that skip peek are incomplete.`,
    },
    {
      id: "surrender",
      title: "Late surrender and the cells people refuse",
      body: `Late surrender lets you forfeit half the stake after you see your first two cards and the up-card, once the dealer has checked for blackjack. Early surrender (before the peek) is more valuable and almost never offered.

### Typical late-surrender cells

Many multi-deck charts surrender hard 16 versus 9, 10 and ace, and hard 15 versus 10. Those exits are the point of the rule. Declining them keeps a full unit in a hand already priced as a half-unit loss.

### Insurance is not surrender

Insurance is a side bet on a ten in the hole. It is usually a bad price. [What is insurance in blackjack](/guides/blackjack-insurance) is the sibling. Do not confuse “I will protect this hand” with a posted surrender button.`,
    },
    {
      id: "table",
      title: "Rule-cost illustrations in one table",
      body: `Every figure below is a teaching illustration for a common six-deck baseline, not a lab quote for every app.

| Rule change versus a clean S17 3:2 DAS sheet | Typical effect on house edge |
| --- | --- |
| H17 instead of S17 | Adds about 0.20% |
| 6:5 instead of 3:2 | Adds about 1.40% |
| DAS allowed | Subtracts about 0.14% |
| Double only on 10–11 | Adds about 0.18% |
| Late surrender offered and used | Subtracts about 0.07% |
| Eight decks versus six | Adds about 0.02% |
| Continuous or per-hand shuffle | Removes countability; leftover edge versus a matching chart stays similar |

### Worked two-table clip

Table A: six-deck S17 3:2 DAS late surrender, matching chart → about 0.4% leftover edge. 100 hands at $15 is $1,500 wagered, expected cost about $6.

Table B: eight-deck H17 6:5 no DAS no surrender, matching chart → about 2.0% leftover edge. Same $1,500 wagered, expected cost about $30.

Both ads can say “blackjack”. The cashier can be identical. The felt is not. Five minutes of rule reading is the only move that reliably changes the price, and it changes it by walking.

Stretch the same comparison to a longer clip. 400 hands at $25 is $10,000 handled. Table A’s 0.4% illustration is about $40 of expected cost. Table B’s 2.0% illustration is about $200. The difference is not a lucky double. It is the sheet. People remember the one 6:5 natural that “almost paid 3:2” and forget the other nineteen that did not.

[House edge](/guides/house-edge) is the arithmetic without the ranks. [RTP explained](/guides/rtp-explained) is the same number from the other side. [Expected value](/guides/expected-value-gambling) is how those percentages become a session bill.`,
    },
    {
      id: "felt",
      title: "Reading a live felt or a crypto overlay",
      body: `Live pits print the words. Apps hide them behind an “i” icon or a rules tab. Open that tab before the first $10.

### What “Las Vegas rules” does not mean

There is no single Las Vegas sheet. Downtown, Strip, and two tables in the same room can disagree on H17 and 6:5. A streamer saying “Vegas rules” is not a specification.

### Hashed shoes are audits

A commit-reveal list can prove which card was next. It does not rewrite S17 or 3:2. Verify on [Fairness](/fairness) for this site’s live games; on a house 21 table a hash is a receipt, not a better paytable. See [crypto blackjack](/guides/crypto-blackjack) for RNG versus hashed shoes.

### Side bets are extra rules

Perfect pairs, 21+3 and lucky ladies are separate contracts with their own edges, often several percent. They are not covered by the leftover-edge story on the main box.

PVPspinArena does not deal blackjack. If you want a price you can count without a variant sheet, use [Roulette](/roulette): 33 slots, about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee.

### A one-minute felt script

Open the rules tab. Screenshot the four facts. If surrender is listed, find the button before you need it. If insurance is listed, decide now that it is a no — [what is insurance in blackjack](/guides/blackjack-insurance) is the math. If the overlay will not name decks, treat the game as many-deck or infinite and use a multi-deck chart, not a single-deck wallpaper. Then sit or leave. Do not “try a few hands” to infer S17 from vibes. You cannot see whether a hole ace-6 stood or hit after the fact on most streams.`,
    },
    {
      id: "stop",
      title: "A cleaner sheet is not a reason to raise",
      body: `Finding S17 and 3:2 feels like winning before you play. It is not. You found a cheaper leak. A cheaper leak on a larger unit or a longer night can still cost more.

Keep the session inside a written budget. If you are shopping rules as a way to justify one more hour, stop.

If blackjack or any game is already hard to put down, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Rule fluency is not a coping tool. The [responsible gambling](/responsible-gambling) page is the on-site start for limits.

A common rule variant that removes the tens is [Spanish 21](/guides/spanish-21).

Insurance is not the only extra wager; [blackjack side bets](/guides/blackjack-side-bets) price Perfect Pairs, 21+3 and the rest.`,
    },
  ],
  faqs: [
    {
      q: "Which blackjack rules matter most?",
      a: "Payout on a natural (3:2 versus 6:5), S17 versus H17, DAS, surrender, and deck count. 6:5 alone often adds more edge than the other common tweaks combined.",
    },
    {
      q: "What does S17 mean in blackjack rules?",
      a: "The dealer stands on soft 17 (ace-6). H17 means the dealer hits that total. H17 is worse for the player on typical sheets.",
    },
    {
      q: "Is 6:5 blackjack the same game as 3:2?",
      a: "Same buttons, different price. Illustration: 6:5 often adds about 1.4% house edge. A perfect chart does not erase that.",
    },
    {
      q: "What is DAS?",
      a: "Double after split. It lets you double one or both hands after splitting a pair. Several pair cells on a chart assume DAS exists.",
    },
    {
      q: "Does PVPspinArena use these blackjack rules?",
      a: "No. PVPspinArena does not deal blackjack. This page is for reading tables elsewhere.",
    },
    {
      q: "Can a chart fix bad blackjack rules?",
      a: "No. A matching chart shrinks extra leak. It cannot turn a 6:5 H17 no-DAS table into a plus-EV game.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: blackjack house edge calculator",
      url: "https://wizardofodds.com/games/blackjack/calculator/",
    },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
    {
      label: "Wizard of Odds: blackjack rules",
      url: "https://wizardofodds.com/games/blackjack/rule-variations/",
    },
  ],
  related: [
    "how-to-play-blackjack",
    "how-many-decks-blackjack",
    "crypto-blackjack",
    "blackjack-basic-strategy",
    "blackjack-insurance",
    "house-edge",
    "spanish-21",
    "blackjack-side-bets",
  ],
  updated: "2026-09-26",
};

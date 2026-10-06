import type { Guide } from "./types";

export const guide: Guide = {
  slug: "farkle-rules",
  cluster: "Games of chance",
  keyword: "farkle rules",
  secondary: [
    "how to play farkle",
    "farkle scoring",
    "farkle odds",
    "farkle strategy",
    "hot dice farkle",
  ],
  title: "Farkle Rules: Scoring Table, Odds and Strategy",
  description:
    "Farkle rules in plain English: the scoring table, hot dice, the exact odds of farkling with 1 to 6 dice, and when to bank points versus roll again.",
  h1: "Farkle rules: scoring, farkle odds and when to bank",
  answer:
    "Farkle rules are simple: roll six dice, set aside at least one scoring die (a 1, a 5, or a scoring combination), then either bank your turn total or roll the rest. If a roll shows nothing that scores, you farkle and lose every point from that turn. Score all six dice and you get hot dice and roll all six again. First to 10,000 usually wins.",
  facts: [
    "Standard scoring: single 1 = 100, single 5 = 50, three of a kind = face × 100, three 1s = 1,000.",
    "Chance of farkling: 2.31% with six dice, 7.72% with five, 15.74% with four, 27.78% with three, 44.44% with two, 66.67% with one.",
    "Hot dice: if all six dice score, you pick all six up and keep rolling on the same turn.",
    "Many tables require an opening score of 500 (sometimes 350 or 1,000) before your first bank.",
    "Scoring tables vary by house and by boxed edition, so agree on the sheet before anyone rolls.",
  ],
  sections: [
    {
      id: "how-to-play",
      title: "How to play Farkle, turn by turn",
      body: `Farkle is a push-your-luck dice game for two or more players. You need six standard dice, a pencil and a score sheet. It goes by other names too, including Zilch, 10,000 and Hot Dice. The rules below are the most common version. Boxed editions and family tables change the details, especially the scoring for four of a kind and three pairs.

A turn works like this:

1. Roll all six dice.
2. Set aside at least one scoring die or combination. You may set aside more.
3. Decide: **bank** the running total for this turn and pass the dice, or **roll again** with the dice you did not set aside.
4. If any roll shows no scoring dice at all, that is a **farkle**. Your turn ends and you score zero for the turn, however much you had built up.
5. If you manage to set aside all six dice, you have **hot dice**. Pick all six back up and keep rolling, and your running total carries on.

Two rules trip up new players. First, combinations only count when they appear in a single roll. A 5 set aside on one roll and two more 5s on the next roll are three separate 50s, not a triple worth 500. Second, you must set aside at least one scoring die every time you roll. You can't reroll all your dice just because you don't like the result.

Most groups play to 10,000 points. When someone passes the target, every other player gets one last turn to beat them. Many tables also make each player's first bank reach a minimum, usually 500. Until you get on the board, small safe banks don't count.

Farkle is one of the kitchen-table games in the [games of chance hub](/guides/topics/games-of-chance). Its maths is the same dice arithmetic behind [dice roll probability](/guides/dice-roll-probability). The difference is that you choose when to stop.`,
    },
    {
      id: "scoring",
      title: "Farkle scoring table",
      body: `This is the table most house rules start from. The rows marked "varies" are where editions disagree. Write your group's version on the score sheet before you start.

| Combination (in one roll) | Common score | Notes |
| --- | --- | --- |
| Single 1 | 100 | Always scores |
| Single 5 | 50 | Always scores |
| Three 1s | 1,000 | Some tables use 300 |
| Three 2s / 3s / 4s / 5s / 6s | 200 / 300 / 400 / 500 / 600 | Face value × 100 |
| Four of a kind | 1,000 | Varies: some tables double the triple instead |
| Five of a kind | 2,000 | Varies |
| Six of a kind | 3,000 | Varies |
| Straight 1–2–3–4–5–6 | 1,500 | Six dice only |
| Three pairs | 1,500 | Some tables use 750 or do not score it |
| Four of a kind + a pair | 1,500 | Common in boxed rules |
| Two triplets | 2,500 | Common in boxed rules |

### Worked scoring examples

- Roll 1, 1, 1, 5, 3, 6. You can take the triple 1s (1,000) and the 5 (50), bank 1,050 or roll two dice. Or you can take just the triple 1s and roll three dice.
- Roll 2, 2, 2, 4, 6, 3. Only the triple 2s score (200). You must take them and roll three, or bank 200 if you're already on the board.
- Roll 1, 2, 3, 4, 5, 6. That's a straight worth 1,500, and it uses all six dice, so you also get hot dice.

### Why you should not always take every scoring die

Taking every 1 and 5 feels safe, but it shrinks the number of dice you roll next. Say you roll 1, 5, 2, 3, 3, 6. Taking both gives you 150 and leaves four dice. Taking only the 1 gives you 100 and leaves five dice, which farkle about half as often (7.72% against 15.74%). A spare 5 is often worth throwing back.`,
    },
    {
      id: "odds",
      title: "Odds of farkling with 1 to 6 dice",
      body: `A roll is a farkle when it shows no 1, no 5 and no scoring combination. With the scoring table above, here are the exact chances. They count triples, and with six dice they also count straights and three pairs.

| Dice rolled | Non-scoring outcomes | Total outcomes | Chance of farkle | Roughly |
| --- | --- | --- | --- | --- |
| 6 | 1,080 | 46,656 | 2.31% | 1 in 43 |
| 5 | 600 | 7,776 | 7.72% | 1 in 13 |
| 4 | 204 | 1,296 | 15.74% | 1 in 6 |
| 3 | 60 | 216 | 27.78% | 1 in 3.6 |
| 2 | 16 | 36 | 44.44% | 1 in 2.25 |
| 1 | 4 | 6 | 66.67% | 2 in 3 |

### Where those numbers come from

A die avoids 1 and 5 with probability 4/6. For small numbers of dice you just count:

- **One die:** 4 of 6 faces fail, so 66.67%.
- **Two dice:** 4 × 4 = 16 failing outcomes out of 36, or 44.44%.
- **Three dice:** 4³ = 64 outcomes use only 2, 3, 4 and 6. The four triples (2-2-2, 3-3-3, 4-4-4, 6-6-6) score, so 60 of 216 fail. That's 27.78%.
- **Four dice:** 4⁴ = 256 outcomes avoid 1 and 5. For each of the four faces, 13 of them contain three or four of that face (12 with exactly three, 1 with four), so 52 score. That leaves 204 of 1,296.
- **Five dice:** of the 1,024 outcomes that avoid 1 and 5, a farkle can't have any face three times. That leaves the patterns two-two-one (360 outcomes) and two-one-one-one (240 outcomes), for 600 of 7,776.
- **Six dice:** with only four faces available and no triples, the dice must fall as two pairs plus two singles (1,080 outcomes). Three pairs would score. So 1,080 of 46,656 fail.

If your table doesn't score three pairs, the six-dice farkle rate rises to (1,080 + 360) / 46,656 ≈ 3.09%. The 360 extra outcomes are three pairs drawn from 2, 3, 4 and 6 (4 ways to pick the faces × 90 arrangements).`,
    },
    {
      id: "strategy",
      title: "Farkle strategy: when to bank and when to roll",
      body: `Every roll in Farkle trades the points already on the table against what you might add. A quick one-roll check helps. Keep rolling while the chance of losing your turn total, multiplied by that total, is smaller than the points you expect to add.

### A quick breakeven check

Say you have T points this turn and are about to roll n dice with farkle chance f.

- You lose T with probability f.
- With probability 1 − f you add something, and with fewer dice that's often only 50 to 150 points on the next roll.

With three dice, f = 27.78%. If you'd typically add about 150, rolling costs 0.2778 × T and gains about 0.7222 × 150 ≈ 108. That breaks even near T ≈ 390, so with three dice and 400+ on the table, banking starts to win. With two dice (f = 44.44%) the breakeven drops to roughly 100 to 200 points. With six dice, f is only 2.31%, and rolling is right at almost any total you would realistically hold.

This check is simpler than true optimal play. It ignores the chance of later hot dice, and it ignores the score race. Computer studies that solve Farkle exactly, such as work by Todd Neller and Clifton Presser, find that the best stopping point shifts with the game score. Treat the check as a rule of thumb.

### Practical rules of thumb

- **Six or five dice left:** roll. Farkle risk is under 8%.
- **Four dice:** roll unless the turn is already big (roughly 1,000 or more).
- **Three dice:** bank from about 350 to 500 points.
- **Two dice:** bank at almost anything above the opening minimum.
- **One die:** only roll when the turn total is tiny. Remember that a 1 or 5 gives you hot dice.

### Score changes everything

If an opponent sits at 9,500 and you're at 6,000, banking 400 just loses slowly. Being behind late in the game justifies rolling on with three or even two dice. Being far ahead justifies banking early. This is the same idea as [variance in gambling](/guides/variance-in-gambling): when you are behind, you want more spread in your outcomes, and when you are ahead, you want less.`,
    },
    {
      id: "variants",
      title: "House rules and variants worth agreeing first",
      body: `Most Farkle arguments are really about rules nobody agreed on. Settle these before the first roll:

- **Opening minimum:** 500 is common. 350 and 1,000 also appear.
- **Three farkles in a row:** many tables take away 500 or 1,000 points as a penalty.
- **Scoring for four, five and six of a kind:** fixed values (1,000 / 2,000 / 3,000) or doubling from the triple.
- **Three pairs and straights:** full value, reduced value, or not scored.
- **Piggybacking:** some groups let the next player take over your leftover dice and turn total instead of starting fresh.
- **End game:** whether everyone gets a final turn once someone passes 10,000.

These choices change the odds. If three pairs don't score, six-dice farkles rise from 2.31% to about 3.09%. Doubling rules make four of a kind worth far more and reward rolling on with four dice.

### Playing Farkle for money

Among adults, Farkle is sometimes played for a small stake per game, or per 1,000 points of margin. Where money is involved, gambling is for adults only (18+, or the legal age where you live). Agree the stake in advance, and keep it to an amount everyone at the table can lose without it hurting. Farkle is mostly luck with a thin layer of decision-making. Better stopping rules help a little over many games, but they won't save a bad night of rolls.`,
    },
    {
      id: "pvp",
      title: "Farkle maths and a hashed PvP round",
      body: `The farkle table is just a list of probabilities, and the same kind of arithmetic prices every dice-style bet. Read it next to [crypto dice](/guides/crypto-dice-game) or a two-player [dice duel](/guides/dice-duel-game) and you'll see the same pattern. You count outcomes, divide by the total, then compare that probability with what you're paid.

PVPspinArena runs three player-vs-player games, all in USDC or ETH on Base. [Coinflip](/coinflip) is a straight 50/50 between two players. Roulette uses a 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Jackpot gives you a win chance equal to your share of the pot. There's no push-your-luck choice in these games, so the maths is even simpler than Farkle's. Every round comes from committed seeds, and you can check any settled round on the [fairness page](/fairness).

One Farkle habit carries over well: decide your stopping rule before emotion starts making it for you. The [responsible gambling](/responsible-gambling) page has limits and tools. Play is 18+ only.

In the same cluster, see also [yahtzee rules](/guides/yahtzee-rules), [liars dice](/guides/liars-dice), and [poker dice](/guides/poker-dice).

See also [pig](/guides/pig-dice-game).`,
    },
  ],
  faqs: [
    {
      q: "What are the basic Farkle rules?",
      a: "Roll six dice, set aside at least one scoring die, then bank or roll the rest. A roll with nothing that scores is a farkle and wipes that turn's points. Scoring all six dice gives hot dice. First to 10,000 usually wins.",
    },
    {
      q: "What are the odds of farkling with six dice?",
      a: "About 2.31%, or 1,080 of 46,656 outcomes, when three pairs and straights score. If your table does not count three pairs, it rises to roughly 3.09%.",
    },
    {
      q: "How many points is three pairs in Farkle?",
      a: "Commonly 1,500, but some tables use 750 and some do not score it at all. Check the house sheet before you play.",
    },
    {
      q: "When should you stop rolling in Farkle?",
      a: "A useful rule of thumb: bank around 350 to 500 with three dice left, bank almost always with two, and keep rolling with five or six. Shift toward more risk when you are far behind late in the game.",
    },
    {
      q: "Do you have to take every scoring die in Farkle?",
      a: "No. You must set aside at least one scoring die per roll, but you may put spare 5s or 1s back to roll more dice, which lowers your farkle risk on the next roll.",
    },
  ],
  sources: [
    { label: "Wikipedia: Farkle", url: "https://en.wikipedia.org/wiki/Farkle" },
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
  ],
  related: [
    "yahtzee-rules",
    "shut-the-box",
    "liars-dice",
    "dice-roll-probability",
    "variance-in-gambling",
    "crypto-dice-game",
    "poker-dice",
    "pig-dice-game",
  ],
  updated: "2026-09-27",
};

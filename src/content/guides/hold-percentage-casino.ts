import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hold-percentage-casino",
  cluster: "Games & odds",
  keyword: "hold percentage casino",
  secondary: ["casino hold", "win divided by drop", "actual hold", "theoretical hold"],
  title: "Hold Percentage Casino: Edge the House Keeps",
  description:
    "Hold percentage at a casino is money kept divided by money wagered. See how it differs from theoretical house edge, and why one night lies.",
  h1: `Hold percentage casino: money kept divided by money wagered`,
  answer: `Hold percentage casino math is money the house kept divided by the money wagered in a defined window. That realized hold is a result. Theoretical house edge is a different number, built from the rules and the payouts. A single night can land far from the theory. This page defines hold and points the formula work elsewhere. Adults only, 18+.`,
  facts: [
    `Hold percentage is win divided by a named base, such as amount wagered or drop.`,
    `Without the base and the time window, a hold percentage cannot be compared.`,
    `Theoretical house edge comes from probabilities and payouts, not from one shift.`,
    `A quiet hour and a busy night can show very different holds on the same game.`,
    `Slot reports and table reports often use different denominators. Do not mash them.`,
    `One night does not reveal the edge. Gambling is 18+.`,
  ],
  sections: [
    {
      id: "what-hold-is",
      title: `What hold percentage means`,
      body: `Hold percentage at a casino is a realized ratio. Take the money the house kept in a window. Divide by the activity base you named for that window. Multiply by one hundred if you want a percent. If the base is the amount wagered, hold is kept money divided by money wagered. If the base is something else, such as drop at a table, the percent answers a different question and needs a different label. The words hold percentage casino only make sense after the base and the clock are filled in.

Win here means gaming win for that window: what the house kept after paying players, not a player's winning session. A player can leave up while the table's hold is positive, because other players' results are in the same pot of numbers. Hold is a property of a defined pile of action. It is not a diary of one seat.

### The ratio, in words

- Numerator: amount kept, for that game and that window.
- Denominator: the base you named, and no other base.
- Window: an hour, a shift, a day, a month, written down.
- Sign: if players finish ahead as a group, win can be negative and so can hold.

The [games and odds topic](/guides/topics/games-and-odds) is where the math pages live. This guide stays on the realized ratio. If someone quotes a hold with no base and no dates, ask for both before you repeat the number. A bare percent is not yet a fact. Adults, 18+.`,
    },
    {
      id: "hold-versus-edge",
      title: `Realized hold versus theoretical edge`,
      body: `Theoretical house edge is the average share of each bet the rules take over a very long run. It is computed from the ways the game can land and from what those ways pay. Realized hold is what a particular window actually kept, divided by that window's base. They wear similar percent signs. They are not the same measurement. A game can have a modest theoretical edge and a wild hold on Tuesday, then a different wild hold on Wednesday. The edge did not change when the dice did.

Do not treat a good night for players as proof the edge is zero. Do not treat a brutal night as proof the edge jumped. The edge is in the paytable and the probabilities. The night is a sample. [House edge](/guides/house-edge) is the page that defines that theoretical cost per bet. This page will not rebuild that definition. Use it when you want the formula, and use hold when you are looking at a result that already happened.

### Side by side

[RTP](/guides/rtp-explained) is the return-to-player side of the theoretical conversation for games that speak that way. It is not a hold report. If a screen shows an RTP, it is not telling you what the last hour kept. If a floor report shows a hold, it is not recomputing the paytable.

[How to calculate house edge](/guides/how-to-calculate-house-edge) is the worksheet for the theory. Follow it when you have outcomes and payouts. Follow this page when you have a win figure and a base. Mixing the worksheets produces a number that looks precise and answers neither question.`,
    },
    {
      id: "small-table",
      title: `A small table of made-up windows`,
      body: `The rows below are arithmetic examples, not a reported night at any casino and not a study. They exist to show the division. Suppose a game sees one thousand dollars wagered in an hour and the house keeps four hundred of those dollars. Hold for that hour, on amount wagered, is forty percent. Suppose the next window has twenty thousand dollars wagered and the house keeps eight hundred dollars. Hold on amount wagered is four percent. Both divisions can be correct. Neither one is the theoretical edge. They are two results.

The busy window kept more dollars and showed a smaller percent. The quiet window kept fewer dollars and showed a larger percent. If you rank games by percent alone, the quiet hour looks hungrier. If you rank by dollars kept, the busy window kept more. Hold percentage without the dollars, and dollars without the base, each hide half the sentence.

### Illustration only

| Window | Amount wagered | Amount kept | Hold on wagers |
| --- | --- | --- | --- |
| Short hour | $1,000 | $400 | 40% |
| Longer sitting | $20,000 | $800 | 4% |
| Another hour | $5,000 | $0 | 0% |
| Players ahead | $5,000 | -$200 | -4% |

The last row is allowed. A window can go against the house. That does not rewrite the rules. It means the results in that window favored the players as a group. The next window can go the other way. Nothing in the table estimates how often any row happens. There is no sample behind it.

Use the same base in every row when you compare. If one row is amount wagered and the next row is drop, you built two ratios and gave them one name. Label them apart. Then, if you want the number the rules imply rather than the number the window produced, leave this table and open the house-edge worksheet. The illustration has done its job when the division is obvious.`,
    },
    {
      id: "why-a-night-swings",
      title: `Why one night's hold swings`,
      body: `A night is a short list of bets. Short lists wander. A few large wagers can dominate an hour. A jackpot, a long run of one color, or a table that happens to be one-sided will move the realized hold without anyone editing the rules. The theoretical edge is an average over a huge imaginary repetition of the same bet. Tuesday is not that repetition. Calling Tuesday's hold the edge is how a single shift gets promoted into a law.

The longer the window and the more independent bets it contains, the less one streak can yank the percent. That is the spirit of the [law of large numbers](/guides/law-of-large-numbers-gambling) page, which is the right place for the averaging argument. This guide only needs the practical warning: a night lies if you treat it as the edge. It does not lie about itself. The night really kept what it kept. The mistake is the promotion.

### What can shove a short window

- A handful of big bets instead of many small ones.
- A streak that a long run would dilute.
- A change in which side or which bet players chose, if those bets do not share one edge.
- A denominator that changed meaning halfway through the sheet.

The third point matters. If players move from a bet with one theoretical edge to a bet with another, the mix changes the average you should even expect. A hold shift can be a mix shift. It can also be luck on an unchanged mix. You cannot tell from the percent alone. You need the mix.`,
    },
    {
      id: "drop-versus-handle",
      title: `Drop, handle, and amount played`,
      body: `Amount wagered, handle, coin-in, and drop are not nicknames for one pile. Amount wagered or handle, in the careful sense, counts action: the bets placed. Coin-in on a machine is the amount played through the meter the report uses. Drop at a table is closer to buy-in: chips or cash purchased at that table, not every chip pushed into the circle on a later decision. A player can buy in once and wager that stack several times. Handle can then be much larger than drop. A hold on drop and a hold on handle are different percents even when the dollars kept are the same.

That is why a table hold and a slot hold from a public report should not be compared as if both meant the share of each bet. Nevada's monthly notes, mentioned above, already split the definitions: slot win percent uses amount played, and game win percent is its own ratio. If a headline says the hold was a certain percent, the honest next sentence is the base. Without it, the headline is unfinished.

### Same dollars kept, different bases

[House edge](/guides/house-edge) stays in the language of the wager, because the theoretical edge is a share of the bet. When you cross from theory to a floor report, check whether the report is in that same language. If it is in drop, say drop. The [games and odds topic](/guides/topics/games-and-odds) links the pages that keep these words apart.`,
    },
    {
      id: "send-theory-away",
      title: `Where the theoretical number lives`,
      body: `This page stops at the realized ratio on purpose. The theoretical edge is already explained, with the formula and the relationship to return to player, on the house-edge guide. Calculating it from outcomes and payouts has its own worksheet. RTP has its own page for the return side of that theory. Repeating those derivations here would blur the thing hold actually is: a result divided by a base.

When you want theory, go there with the rules in hand. You need the bets, the probabilities, and the payouts. You do not need last night's drop. When you want hold, go to the window with the win and the base in hand. You do not need to re-derive the wheel. The two errands use different inputs. Treating them as one errand is why people argue past each other with two correct percents.

### Which page for which job

- Realized hold for a window: stay here, and name the base.
- What the rules cost per bet in theory: [house edge](/guides/house-edge).
- The arithmetic from probabilities and payouts: [how to calculate house edge](/guides/how-to-calculate-house-edge).
- Return to player as the other face of that theory: [RTP](/guides/rtp-explained).
- Why a short window wanders: [law of large numbers](/guides/law-of-large-numbers-gambling).

If a casino advertises a hold, ask whether they mean theory or a report, and for which game. A weekend result is a sample, not a new edge. The casino's percent is not your personal result, and a gap between them is normal.`,
    },
    {
      id: "roulette-example",
      title: `A roulette session is a sample`,
      body: `PvPspinArena includes a roulette game. You can open it at [Roulette](/roulette). It is a product example, and it is 18+. One session at that table is a realized window: the stakes you placed, the payouts you received, and the difference. That difference, divided by the amount you wagered, is a personal hold for your session with the sign flipped if you want the player's view. It is not the theoretical edge of the wheel, and it is not a forecast of the next session.

The theoretical cost of the bets lives on the house-edge page, not in the last ten spins. A run of one color can make a short session look generous or brutal. Lengthen the session and the wander usually shrinks toward the rules, which is the averaging idea on the law of large numbers page. Shrink is not a schedule you can set your watch by. You can still end a long visit on the lucky side of the edge, or on the unlucky side. The edge does not settle each night in cash.

### What to write down if you are curious

- Amount wagered, not the deposit alone. A deposit can be bet more than once.
- Net result for the session.
- Your result divided by amount wagered, labeled as yours.
- A note that the theoretical edge is a different number, read from the rules page.

[Responsible gambling](/responsible-gambling) is the page for limits and help. A hold percentage is not a target to chase and not a debt the game owes you after a cold hour. If the session stops being optional, stop. The ratio will still be there tomorrow, and it will still not be a plan. Adults, 18+.`,
    },
  ],
  faqs: [
    {
      q: `What is hold percentage at a casino?`,
      a: `It is money kept divided by a named base, often amount wagered, over a stated window. Name the base and the dates or the percent is not comparable to another quote.`,
    },
    {
      q: `Is hold the same as house edge?`,
      a: `No. House edge is the theoretical share built into the rules. Hold is what a real window kept. A single night can sit far from the edge in either direction.`,
    },
    {
      q: `Why can one night look extreme?`,
      a: `A night is a short sample. Large bets and streaks move the realized percent. A longer run usually sits closer to the theoretical edge, and your own seat can still differ.`,
    },
    {
      q: `Why do table hold and slot hold disagree?`,
      a: `They often divide by different bases. Slots are commonly tied to amount played. Table reports are often tied to drop, which is buy-in, not every chip wagered.`,
    },
    {
      q: `Does a bad hold mean the game changed?`,
      a: `Not by itself. Check whether the rules and paytable changed. If they did not, the swing is the window, the bet mix, or both. Theory stays on the house-edge page.`,
    },
  ],
  sources: [
    { label: "Nevada Gaming Control Board", url: "https://www.gaming.nv.gov/" },
    { label: "Roulette", url: "https://en.wikipedia.org/wiki/Roulette" },
    { label: "Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
  ],
  related: [
    "house-edge",
    "how-to-calculate-house-edge",
    "rtp-explained",
    "law-of-large-numbers-gambling",
  ],
  updated: "2026-09-29",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bet-tracker",
  cluster: "Sports betting",
  keyword: "bet tracker",
  secondary: ["betting spreadsheet", "wager log", "ROI tracker", "closing line log"],
  title: "Bet Tracker: Free Template to Track Every Wager and ROI",
  description:
    "Free bet tracker template plus how to log wagers, measure ROI and closing line value, and spot leaks in your sports betting before they cost you.",
  h1: "Bet Tracker: Free Template to Track Every Wager and ROI",
  answer:
    "Bet tracker means a written log of every wager: the date, the sport, the odds you took, the stake, the result, and the closing line. ROI is net profit divided by the amount you staked. Closing line value is whether your price beat the price at close on the same side. The template below is a table you can copy. It is not a pick sheet and not a staking system. Adults 18+ only. PVPspinArena does not book sports.",
  facts: [
    "A useful log has date, sport, odds, stake, result, and the closing line on that same side.",
    "ROI equals net profit divided by total stake. A push is a scratch, not a win.",
    "You beat the close when your number was better than the closing number, not when the bet won.",
    "One good week is a sample. The log is there so a story cannot replace the sum.",
    "Leaks show up as repeated prices you did not convert, or markets you cannot explain.",
    "This page is a log, not a bankroll plan. Adults 18+ only. No picks.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a bet tracker is for",
      body: `A bet tracker is a record you fill before the memory rewrites the ticket. Sportsbook history screens hide the price you could have had at close, and they bury voids inside a profit graph. Your sheet should be boring enough that a bad Saturday still fits on one row.

The point is not motivation. The point is arithmetic you can audit. Net profit without the stake is a mood. A closing number you did not write down becomes "I knew it" after the game. [Closing line value](/guides/closing-line-value) is the habit of storing that number. [Implied probability](/guides/implied-probability) is how you turn the odds into a percent before you decide the row was a price you understood.

This is not a bankroll-management guide. It does not tell you what fraction of a roll to put on a spread. Sizing is a different subject. Here the stake column is a fact about a ticket you already placed, or are about to place. The loss limit you refuse to cross lives on [gambling budget](/guides/gambling-budget). Use that page for the ceiling. Use this page for the rows under it.

[Sports betting guides](/guides/topics/sports-betting) is the cluster if the markets themselves are still fuzzy. Adults 18+ only. PVPspinArena is not a sportsbook, so it will not fill this sheet for you. [Fairness](/fairness) checks Jackpot, Coinflip and Roulette. [Jackpot](/) is a pot with a different kind of record. [Responsible gambling](/responsible-gambling) matters more than a perfect spreadsheet if you are logging to justify the next deposit.`,
    },
    {
      id: "columns",
      title: "The template: six columns",
      body: `Copy this header into a sheet. One wager, one row. Parlays get their own rows only if you also store each leg somewhere else. A parlay that you cannot decompose will teach you nothing except that the payout was large or zero.

| Column | What to write |
| --- | --- |
| Date | The day you placed the wager, not the day it settled |
| Sport | League and the event, in words you will recognize in a month |
| Odds | The price you accepted, American or decimal, exactly as printed |
| Stake | Cash at risk. A bonus token is not cash. Mark it if the stake is not yours |
| Result | Win, loss, push, or void. Pushes and voids are not wins |
| Closing line | The price on that same side as close as you can get to the start |

Add a notes cell if you want the market name, the book, or a one-line reason. Do not add a cell for how the bet "felt." Feelings do not sum. If the closing line is blank because the market was a tiny prop with no close, write "no close" instead of inventing a number. A blank that looks like a zero will corrupt the average later.

Grade the result from the rule, not from the highlight. A one-goal hockey win can lose a puck line. A draw can refund draw no bet. The result column should match the settlement, or the ROI is a fiction. Profit on the row is a formula: American minus 110 on a win pays stake times 100/110. A loss is minus the stake. A push is zero profit and, in the ROI below, the stake is removed from the denominator so a refund is not punished as volume. Be consistent. Write the choice at the top of the sheet.`,
    },
    {
      id: "roi",
      title: "How to measure ROI without a story",
      body: `ROI is net profit divided by total stake, expressed as a percent. Profit of $10 on $100 staked is 10% ROI. Profit of −$10 on $100 is −10% ROI. Winning six bets out of ten does not tell you the ROI until you know the prices. A bettor who wins often at very short odds can still be down. A bettor who wins rarely at long odds can be up. The sheet is the only place those patterns stay honest.

[Closing line value](/guides/closing-line-value) sits in the last column so you can separate "the ticket won" from "the price was good." You beat the close when you took a better number than the market's last number on that side. Plus 150 beaten by a close of plus 130 is a win on price, whether the club wins or not. Minus 110 that closes minus 105 is a worse price than the close. The bet can still win. The log should say you did not beat the number.

Leaks are rows that repeat. The same market you cannot explain. Live bets after a loss, with worse prices than your pre-game rows. Stakes that jump after a void because the refund felt like a start. A month of those rows is more useful than a tip. You do not need a model. You need the sort function.

Do not drop losing rows because the book voided a different bet, and do not add imaginary clv. If you forget the close, the cell stays "no close." Pretending every win beat the market is how a tracker becomes advertising.

A small sample will bounce. Twenty bets can show a shiny ROI that ten more bets erase. Report the count next to the percent. ROI of 15% over 12 wagers is a story with a denominator. ROI of 2% over 400 wagers is a different kind of sentence. This page will not tell you which of those you "should" have. It will tell you not to hide the count.`,
    },
    {
      id: "example-roi",
      title: "Worked example: four rows and the ROI",
      body: `Illustration only. None of these events is a recommendation. Stakes are cash. Pushes are left out so the denominator is obvious. American profit is rounded to the cent.

| Date | Sport | Odds | Stake | Result | Closing line |
| --- | --- | --- | --- | --- | --- |
| 2026-10-01 | NHL moneyline | +100 | $25 | Win, +$25 | −105 |
| 2026-10-02 | MLB run line | −150 | $25 | Loss, −$25 | −140 |
| 2026-10-03 | Soccer BTTS | +100 | $25 | Loss, −$25 | +110 |
| 2026-10-04 | NBA total | −110 | $25 | Win, +$22.73 | −110 |

Net profit is 25 − 25 − 25 + 22.73 = −$2.27. Total stake is $100. ROI is −2.27%. You won two bets and lost two, and you are down, because the total win paid less than a full $25 after juice.

Read the closes without being romantic. The NHL row won the bet and did not beat the close: you took plus 100 and the side closed minus 105, a shorter price you missed. The MLB row lost the bet and also failed the close if minus 150 is worse than a close of minus 140. The soccer row lost, and the close of plus 110 was a better price than the plus 100 you took, so you missed the close there too. The NBA row won and matched the close. Matching is not beating. The week is a small loss with three prices that were worse than, or only equal to, the close. That is a leak you can see. "I went 2 and 2" hides it.

If the NBA row had pushed, profit on that row would be $0 and, under the rule at the top of this guide, you would drop that $25 from the denominator. Net would be −$25 on $75 staked. Write the rule once so next month's push does not get counted as a win.`,
    },
    {
      id: "example-clv",
      title: "Worked example: one row of closing line value",
      body: `Second illustration. You bet an underdog at plus 150. Decimal odds are 2.50. Implied probability is 100/250, which is 40%. At close the same side is plus 130. Decimal 2.30. Implied about 43.5%.

You held the longer number. A simple price gap is 2.50 / 2.30 − 1, about 8.7% more decimal than the close. Record "beat close" on that row even if the underdog loses. Closing line value is a quality check on the number, not a second result column. One beaten close is not a career. It is a row. Fifty rows that beat the close, with the count written beside them, are the start of a question about whether your prices are early. Fifty rows that lose to the close are a leak, even if a few longshots paid for a loud weekend.

The stake on this illustration does not change the percent gap. A $10 bet and a $200 bet at the same plus 150 against the same plus 130 have the same price gap and very different damage. The tracker shows both. If the $200 rows are always the live bets after a loss, the leak is the timing, and [gambling budget](/guides/gambling-budget) is the ceiling you already set or failed to set. This sheet will not invent a unit size to repair that.

Voids stay in the log with result "void" and profit zero. Deleting them makes the next month look cleaner than the year you lived. Bonus stakes get marked, because a payout that does not return stake will overstate ROI if you pretend the token was cash. That trap has its own guide. Do not hide it inside an ordinary win.`,
    },
    {
      id: "checklist",
      title: "Checklist for a row you can trust",
      body: `Fill this before you look at the profit color.

- Date, sport, odds, stake, result, and closing line are all present, or the close says "no close."
- The result matches the market rule, including pushes and refunds.
- Profit is a formula from the odds and the stake, not a number you remember.
- ROI uses net profit over total stake, and the bet count is written next to the percent.
- Beating the close is marked separately from winning the bet.
- Bonus tokens are labeled so stake-not-returned does not pretend to be cash ROI.
- You are 18+. The sheet is not a reason to deposit. A loss limit already exists outside the grid.

Spotting leaks is sorting, not a new strategy. Sort by market. Sort by live versus pre-game. Sort by whether you beat the close. The clump that loses money at bad prices is the leak. You do not need to name it after a system. You need to stop repeating the row.`,
    },
    {
      id: "not-a-book",
      title: "A spreadsheet is not a sportsbook",
      body: `PVPspinArena will not store your hockey prices or compute a closing line. The games here are Jackpot, Coinflip and Roulette. [Fairness](/fairness) lets you check a reveal. It does not grade a run line. [Jackpot](/) is a pot you can watch settle. It is not a wager log for a league.

Keep the template small so you will actually fill it. Six columns beat a dashboard you abandon on Sunday. Adults 18+ only. If the sheet becomes a way to argue yourself into a larger stake, close it and keep the loss limit instead.`,
    },
  ],
  faqs: [
    {
      q: "What columns should a bet tracker include?",
      a: "Date, sport, odds, stake, result, and closing line. Date is when you bet. Odds are the price you took. Result is win, loss, push, or void. The closing line is the last price on that same side. Notes can hold the book and the market. Leave the close as \"no close\" if the market never had one. Do not invent it.",
    },
    {
      q: "How do you calculate betting ROI?",
      a: "Divide net profit by total stake. A $10 profit on $100 staked is 10% ROI. A $10 loss on $100 is −10%. Win rate is not ROI, because the odds change the profit on each row. Write the number of bets beside the percent. A push returns stake. Do not record it as a win. Say whether returned stakes stay in the denominator.",
    },
    {
      q: "What is closing line value in a log?",
      a: "It is a mark for whether your price beat the closing price on the same side. Plus 150 against a close of plus 130 beat the close. Minus 110 against a close of minus 105 did not. The bet can win or lose either way. One beaten close is a row, not proof of an edge. Keep the count.",
    },
    {
      q: "Will a tracker fix losing sports betting?",
      a: "It will show the leak if you fill every row, including losses and voids. It will not pick games, size a bankroll, or remove the book's margin. Repeated bad prices and stakes that jump after losses are the patterns worth stopping. A ceiling on losses belongs on a budget, not in a new unit system on this page.",
    },
    {
      q: "Does PVPspinArena track sportsbook bets?",
      a: "No. This site is not a sportsbook and does not log team prices. Jackpot, Coinflip and Roulette are the games, adults 18+ only. Use your own sheet for sports wagers placed somewhere else. Fairness tools here check hashed rounds, not a closing line.",
    },
  ],
  sources: [
    { label: "Wikipedia: Return on investment", url: "https://en.wikipedia.org/wiki/Return_on_investment" },
    { label: "Wikipedia: Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    { label: "Wikipedia: Fixed-odds betting", url: "https://en.wikipedia.org/wiki/Fixed-odds_betting" },
  ],
  related: ["closing-line-value", "gambling-budget", "implied-probability", "moneyline-betting-explained"],
  widget: "bet-tracker",
  updated: "2026-10-06",
};

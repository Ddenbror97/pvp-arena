import type { Guide } from "./types";

export const guide: Guide = {
  slug: "closing-line-value",
  cluster: "Sports betting",
  keyword: "closing line value",
  secondary: ["CLV", "closing line", "beat the close", "closing odds"],
  title: "Closing Line Value: Why the Closing Price Matters",
  description:
    "Closing line value is the gap between the price you took and the market's last price. See why bettors track CLV, and what it does not prove.",
  h1: `Closing line value: the gap between your price and the close`,
  answer: `Closing line value is the gap between the price you took and the market's last widely posted price before the event. Bettors record it to see whether they beat that close. It is not the same thing as winning the bet, and it does not guarantee a profit. You cannot see the close before you bet. Adults only, 18+.`,
  facts: [
    `Closing line value compares your price with the closing price on the same side.`,
    `The close is treated as a sharp public price because late money and news have moved it.`,
    `Beating the close is not the same as cashing the ticket.`,
    `A short sample of CLV can look brilliant or awful by chance.`,
    `You do not know the close at the moment you bet. Waiting until the close means betting the close.`,
    `Positive CLV is not a promise of profit. Wagering is 18+.`,
  ],
  sections: [
    {
      id: "definition",
      title: `What closing line value means`,
      body: `Closing line value is a comparison, not a trophy. You write down the price you accepted. When the market is about to start, you write down the last widely posted price on that same side. The gap between those two prices is the closing line value, often shortened to CLV. If your price was better than the close, people say you beat the close. If the close was better than the price you took, you did not.

Better depends on the side. Laying a favorite at shorter juice than the close, or taking an underdog at a longer plus number than the close, is the usual description of beating the close. The comparison is about the number, not the final score.

### What you need in the log

- The side you bet, including the line if it is a [point spread](/guides/point-spread-explained) or a [total](/guides/over-under-betting).
- The price you took, in one odds format.
- The closing price on that same side, in the same format.
- The book or the consensus you are using as the close, named in the header.

Without the fourth line, one person may mean a single book's last number and another a market average. Pick a definition and keep it. [How to bet on sports](/guides/how-to-bet-on-sports) is the wider page for placing a wager. This page starts after the price is in your log.

Do not mix odds formats in one column. The [odds converter](/guides/odds-converter) is the conversion tool. A gap computed from mismatched formats is a unit error, not CLV. A few cents of juice is still a gap, and it is a description of prices, not a receipt. Adults, 18+.`,
    },
    {
      id: "why-the-close",
      title: `Why bettors treat the close as sharp`,
      body: `The closing price is the last public number before the event, after more information and more wagers have had a chance to move it. Early lines are opinions posted with less of that pile behind them. By the close, injuries are more often known, lineups are more often known, and bettors who waited have either joined or stayed out. That is why the close is treated as the sharpest public price: it is the price that survived the longest argument.

Sharpest public price does not mean true probability. The close can be wrong. News can break after it. One-sided action can push it. Closing line value uses that yardstick because you can see it. It does not prove the yardstick is perfect.

### What moves a number

- Information that changes how people estimate the game.
- Money that forces a book to adjust a side.
- A difference between books that later converges.
- Nothing you can schedule. The move is the market's, not yours.

If the number never moves, CLV on that bet is flat. Flat means the last public price matched what you took, under the definition you chose.

[Implied probability](/guides/implied-probability) turns a price into a percent, which lets different odds formats share one column. A percent gap is still a price gap, not a measured win rate. The [sports betting topic](/guides/topics/sports-betting) holds the neighboring price pages. You can audit the gap without knowing who won. A checkable gap is not a bank balance.`,
    },
    {
      id: "not-the-same-as-winning",
      title: `CLV is not the same as winning the bet`,
      body: `You can beat the close and lose the game. You can take a worse price than the close and win the game. Closing line value never settles the ticket. The rules of the market settle the ticket: the score, the total, the prop stat. CLV settles a different question, which is whether the price you took was better or worse than the last public price on that side.

A cashed ticket shows the result matched the side. The price could still have been poor. A lost ticket shows the result went the other way. The price could still have beaten the close.

### A price log is not a win log

| You bet | Close on that side | Price reading | Ticket |
| --- | --- | --- | --- |
| Favorite -110 | Favorite -130 | Your juice was shorter than the close | Can still lose |
| Underdog +150 | Underdog +130 | Your plus number was longer than the close | Can still lose |
| Underdog +140 | Underdog +160 | The close was longer than your price | Can still win |
| Total 45 -110 | Total 45 -110 | No gap versus that close | Can still win or lose |

[Expected value](/guides/expected-value-gambling) is the page for pricing a bet from a probability and a payout. CLV is narrower. It compares two posted prices. It does not compute your edge by itself, because you still need a probability you trust. Beating a close that was itself a bad number is possible. Losing to a close that was an excellent number is possible. Keep the words apart: result, price, close.`,
    },
    {
      id: "small-samples",
      title: `Small samples of CLV lie`,
      body: `A handful of bets can show a pretty CLV number by chance. They can show an ugly one by chance too. One weekend is not a verdict on a process. The close moves for reasons that are not your skill: a late injury, a lineup leak, a run of public money, a book shading a side. If you bet before that news, your gap includes luck about the clock. If you bet after it, the gap is smaller because the news is already in the number.

Ten bets is a short list. The sign of the average gap can flip when the next ten are written down. Closing line value becomes a steadier description only as the list gets long, and even then it does not guarantee that the bankroll rises.

### How not to read a short log

- Do not promote a weekend of positive CLV into a claim of profit.
- Do not scrap a process after a weekend of negative CLV alone.
- Do not drop the bets that lost and average the rest.
- Do not change the definition of the close after you see which definition flatters you.

If you track CLV, choose the close you will record before you talk about an average. That choice is your own discipline, not a sample size quoted from a study. You can beat the close and still finish down, because results bounce and the book charges a price.`,
    },
    {
      id: "cannot-see-the-close",
      title: `You cannot see the close before you bet`,
      body: `The close is defined by being last. At the moment you bet, it does not exist yet. Any number on the screen is a current price, and it can still move. Closing line value is always computed afterward. That sounds obvious, and it removes a fantasy: you cannot reach for a future close and lock it in early. If you wait until the market is about to start, you are betting whatever is left, which is the close or something very near it. The gap you hoped to capture has already shrunk to whatever difference remains between books at the gun.

Taking a new price because you missed the old one does not award you the old gap. The log stores the price you actually got. Memory will store the number you wish you had pressed, and those two ledgers diverge quickly.

### What is knowable at placement

- The price on the screen now.
- Prices at other books now, if you have them.
- News that is already public.
- Your own estimate, if you have one you can write as a number.

What is not knowable is the closing number, a scratch that has not been announced, and the result. Write an estimate before you copy a fresh move and call it your opinion. Shopping the current screen is execution. Comparing that price with the close later is CLV. If books still disagree at the gun, say which close you mean. Adults, 18+.`,
    },
    {
      id: "how-to-record",
      title: `How to record the gap without fooling yourself`,
      body: `Pick one odds format for the notebook. Pick one definition of the close. Record every bet you agreed to track, including losses and voids. A void has no fair CLV story if the market never closed in the way you meant, so note void and leave the gap blank rather than inventing a close. For graded bets, store your price and the close. If you want a single column, convert both prices to implied probability and subtract. Keep the subtraction's sign consistent: positive when your price was the better one, negative when the close was better.

Record the close for every tracked bet, win or lose. A missing row is usually the row that would have hurt the average.

### A column list that stays honest

- Date and event.
- Side and line.
- Price taken.
- Closing price, same format, source named.
- Optional: implied probability of each price.
- Result, in a separate column from the CLV note.

The result column does not edit the CLV column. [Implied probability](/guides/implied-probability) shows the conversion. [Expected value](/guides/expected-value-gambling) uses a probability you believe. CLV only hands you the last public number. Score a half-point the same way all season. A half-point on a spread is not the same object as a small change in juice, so write the convention down before the season. Changing it midseason to improve the average is not measurement. If the log becomes a reason to bet more, it has stopped being a mirror.

Comparing the number at more than one book before you bet is [line shopping](/guides/line-shopping). Writing the close down next to the ticket is what a [bet tracker](/guides/bet-tracker) is for. When the number moves against the tickets, that pattern is [reverse line movement](/guides/reverse-line-movement).`,
    },
    {
      id: "what-it-does-not-prove",
      title: `What closing line value does not prove`,
      body: `Closing line value does not prove you will profit. Beating the close can sit next to a losing record, because results bounce and the price includes the book's charge. CLV does not prove the close was correct, that a short sample will repeat, or that you could see the close in advance.

What it can show is whether your prices were better or worse than a last public price you defined. Over a long log, that is information about timing and number, not a scoreboard. A good pattern can still lose.

### Claims to retire

- Beating the close guarantees winnings.
- A short sample proved a skill.
- A cashed bet was a good price because it cashed.
- The close is a perfect probability.
- You can know the close and then bet earlier than the close.

The [responsible gambling](/responsible-gambling) page covers limits and help when the log becomes a chase. Tracking CLV is optional homework. It is not a reason to add units, and the next game does not owe you a win. A losing ticket is not proof the price was bad, and a cashed ticket is not proof the price was good.

The [sports betting topic](/guides/topics/sports-betting) is where the price pages sit. CLV is one column: a gap between two numbers. The gap can be real without paying the rent. It also does not prove the close was a true probability, and it does not let you bet the close before it exists. Adults, 18+.`,
    },
  ],
  faqs: [
    {
      q: `What is closing line value?`,
      a: `Closing line value is the gap between the price you took and the closing price on the same side. If your price was better than that close, you beat the close. The final score is a separate fact.`,
    },
    {
      q: `Does beating the close mean the bet wins?`,
      a: `No. You can beat the close and lose the game, or miss the close and win the game. CLV grades the price against the close. The rules of the market grade the ticket.`,
    },
    {
      q: `Can a few bets prove my CLV skill?`,
      a: `No. Short samples move around by chance, including luck about late news. A long log is a calmer description, and even then CLV does not guarantee profit.`,
    },
    {
      q: `Can I know the closing line before I bet?`,
      a: `No. The close is the last price. When you bet, that last price has not happened yet. If you wait for it, you are betting the close, and the earlier gap is gone.`,
    },
    {
      q: `Is positive CLV the same as positive expected value?`,
      a: `No. CLV compares your price with the close. Expected value compares a price with a probability you believe. They can disagree, and neither one promises a winning night.`,
    },
  ],
  sources: [
    { label: "Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    { label: "Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    { label: "Vigorish", url: "https://en.wikipedia.org/wiki/Vigorish" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
  ],
  related: [
    "implied-probability",
    "odds-converter",
    "how-to-bet-on-sports",
    "expected-value-gambling",
  ],
  updated: "2026-09-29",
};

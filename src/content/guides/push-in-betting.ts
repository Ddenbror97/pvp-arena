import type { Guide } from "./types";

export const guide: Guide = {
  slug: "push-in-betting",
  cluster: "Sports betting",
  keyword: "push in betting",
  secondary: ["spread ends tied", "half point hook", "total lands on the number"],
  title: "Push in Betting: What Happens When a Bet Ties",
  description:
    "What a push means in betting, how pushes work on spreads, totals and parlays, and how half-point lines and buying points avoid them.",
  h1: "Push in betting: the tie that sends the stake back",
  answer:
    "Push in betting is the grade where the event finishes exactly on the number, so the bet neither wins nor loses and the stake comes back. A favorite −3 that wins by three pushes. A total of 45 that lands on 45 pushes. The event was played. A void is a different ending: the bet is cancelled. Do not merge those words. This page separates them. It is not betting advice. Adults 18+.",
  facts: [
    "A push returns the stake because the result landed on the number, and profit on that ticket is zero.",
    "Whole-number spreads and totals can push, while half-point numbers cannot tie an integer score.",
    "A moneyline pushes on a tie only when the ticket has no separate price for the draw.",
    "A common parlay rule drops a pushed leg and grades the rest at the reduced parlay.",
    "Buying a half point can turn a push into a win or a loss, and the book charges for it.",
    "A void cancels the bet, a push grades a finished tie, and the stake can return in both cases for different reasons.",
  ],
  sections: [
    {
      id: "what-a-push-is",
      title: "What a push means",
      body: `A push is a tie between your number and the result. The book does not pay the odds, and it does not keep the stake as a loss. You get the stake back. On a statement the grade may say push, tie, or refund. The dollars match a cancelled bet often enough that people use one word for both. The reason is the difference. A push means the event produced the number on the ticket. There was a result, and the result was a tie with the line.

Profit is zero. Getting $110 back on an $110 stake is not a win, and logging it as a win will make a flat month look skilled. It is also not a loss. The ticket used a number that neither side covered. [Point spread](/guides/point-spread-explained) is where that number usually lives. A spread of −3 covers only if the favorite wins by four or more, loses if the favorite wins by two or fewer or loses the game, and pushes if the favorite wins by three.

[Sports betting guides](/guides/topics/sports-betting) include the void page on purpose, because the next mistake is treating every refund as the same event. Read the grade label. If it says the margin tied, you had a push. If it says the bet was cancelled, you did not.`,
    },
    {
      id: "spreads-and-totals",
      title: "Pushes on spreads and totals",
      body: `Worked spread. You bet $110 at −110 on a favorite of −3, so a win would profit $100. The favorite wins by four. You win $100. The favorite wins by three. The stake $110 comes back and the profit is $0. The favorite wins by two. You lose $110. The middle row is the entire idea of a push. Nothing about the price changed. The margin matched the line.

| Favorite's margin | Grade on −3 at −110 | Result on a $110 stake |
| --- | --- | --- |
| Wins by 4 or more | Win | +$100 |
| Wins by exactly 3 | Push | $110 back, profit $0 |
| Wins by 2 or fewer, or loses | Loss | −$110 |

A total works the same way. Second worked number. You bet $110 at −110 on a total of 45, either side. The game lands on 45. That ticket pushes and the $110 returns. A total of 45.5 cannot land exactly, because 45.5 is not a football or basketball score. If the game lands on 45, the under 45.5 wins and the over 45.5 loses. The half point did not refund anyone. It assigned the tie case to one side. [Over under betting](/guides/over-under-betting) is that market. The hook is the half point that removes the push.

Whole numbers are where pushes live. 3, 7, and 45 can match a final score. 3.5, 7.5, and 45.5 cannot. Buying or selling that half point is a different price, covered below. Do not assume every sport uses integer scoring in the same way. A market priced in half-runs or games has its own tie rules on the slip. The slip wins arguments with this page.`,
    },
    {
      id: "half-points",
      title: "Half points and buying off the tie",
      body: `A half-point line avoids the push by making a tie with the whole number impossible. −3.5 loses when the favorite wins by three, which is the case −3 would have pushed. −2.5 wins when the favorite wins by three, which is the case −3 would have pushed. You are not removing risk. You are choosing which side of the old tie you want to be on, and paying a price to move there.

Illustrative prices, not a board. −3 at −110 risks $110 to win $100, and a three-point win pushes. −2.5 at −130 risks $130 to win $100, and a three-point win cashes. The extra $20 of risk is the cost of turning that one margin from a push into a win. Every other margin was already a win or a loss at −3, except that you now risk $20 more on all of them. Books usually charge more to cross a common football margin such as 3 than to cross a rare one. This page does not invent how often games land on 3. It only says the price of the hook is the thing to read, because the book already put its opinion in the juice.

Selling the hook runs the other way. Moving from −3 to −3.5 at a plus price, if the book offers it, means a three-point win becomes a loss and you were paid to accept that. [Point spread](/guides/point-spread-explained) is the menu those numbers sit on. Buying points to "avoid pushes" is a purchase. It is not free insurance. If the new price is −130 and you only wanted to dodge a refund, you paid $20 per $100 of profit for a result that used to give the stake back.`,
    },
    {
      id: "parlay-leg",
      title: "How a push leg hits a parlay",
      body: `A parlay is several legs and one stake. When one leg pushes, the common rule drops that leg and grades what remains. A two-leg parlay with one push becomes a straight bet at the remaining leg's price, not at the parlay price. A three-leg parlay with one push becomes a two-leg parlay. If every leg pushes, the stake returns. If a remaining leg loses, the parlay loses. That pattern is common and it is not universal. The house rules on the ticket are the rules.

The reduced ticket is why a push is not "half a win." You lost the parlay odds on the leg that tied. You kept the other legs, repriced. People who remember only the refund forget that the payout they wanted required the pushed leg to win, which it did not. It tied.

Do not apply a void story here by accident. A pushed spread finished on the number. A voided leg was cancelled, often because a game did not start or a player did not play. Some books use a similar "drop the leg" mechanic for both, and the cash can look alike. The label in your log should still say push or void. [Parlay betting](/guides/parlay-betting-explained) is the product. Read its settlement sentence next to this one before you assume a tied total saves the longshot price.`,
    },
    {
      id: "push-versus-void",
      title: "A push returns stake. A void cancels the bet.",
      body: `Keep the sentences apart. A push returns the stake because the result tied the number. A void returns the stake because the book cancelled the wager. [Void bet meaning](/guides/void-bet-meaning) is the cancellation. Merging them hides whether the game was played. A played game that lands on 3 is a push on −3. A game that never starts is not a push, even if the app says refund.

| Ending | What the event did | Stake | What it is not |
| --- | --- | --- | --- |
| Push | Finished on the number | Returned | Not a win, and not a void |
| Void | Cancelled or not graded | Returned | Not a push |
| Loss | Finished against the bet | Kept | Not a refund |
| Win | Finished for the bet | Paid at the price | Not a tie |

A moneyline is the case that causes extra arguments. If the book offered only two ways and the sport can tie, a tie often pushes the moneyline. If the book offered a draw price, the tie can lose both sides and pay the draw. Those are different markets. NFL regular-season games can end tied. Your ticket says whether a tie pushes the moneyline or is graded some other way. Soccer tickets that include the draw do not push on 1–1. They lose the side and may win the draw if you bought it.

Write the word the slip uses. If you cannot point at a finished score that equals the line, do not call it a push.`,
    },
    {
      id: "checklist",
      title: "A checklist when the number ties",
      body: `Settle the ticket from the rules, then log the right word.

- Read the margin or total and see whether it equals the number on the slip.
- If it equals a whole number, expect a push unless a half point was on the ticket.
- If the stake returns, record profit as zero, not as a win.
- On a parlay, see whether the pushed leg drops and the rest are repriced.
- If the game was not played, use the void rules instead of this page.
- Do not buy a half point just to avoid a refund unless the new price is one you accept. Adults 18+. This is not betting advice.

The [responsible gambling](/responsible-gambling) page is the stop if a push feels like a loss you have to win back. The stake came back. That is not a debt the next game owes you.`,
    },
    {
      id: "pvp-contrast",
      title: "A refund is not a shared pot",
      body: `Sportsbooks charge vig on the price around the number that can push. The −110 on a −3 line is juice, and the push is a separate rule about the tie. A refund does not pay the juice back as a favor. It returns the stake because nobody covered. The book kept the vig on every ticket that did not tie. Half-point prices fold the tie into a win or a loss and charge more juice for the fold.

A PvP pot is shared among the players in the pot. There is no spread to land on, and a tie with a bookmaker's number is not the settlement. [Fairness](/fairness) explains how this site's rounds can be checked. [Jackpot](/) is the pot, not a pushed ticket. This page states no player counts, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice.`,
    },
  ],
  faqs: [
    {
      q: "What happens to your stake on a push?",
      a: "The stake comes back, and the odds are not paid. A $110 bet at −110 that pushes returns $110. Profit is zero. It is not a win and not a loss. Log it as a push so ties do not look like skill. The event finished on the number. If the stake does not return, you may have a loss, an open bet, or a different grade. Adults 18+. This is not betting advice.",
    },
    {
      q: "When does a point spread push?",
      a: "When the favorite's margin equals the whole number on the spread. A −3 line pushes if the favorite wins by three, wins if the margin is four or more, and loses if the margin is two or fewer. A −3.5 line cannot push on an integer score. Totals push the same way: a total of 45 pushes when the combined score is 45, and 45.5 does not have a tying score. The slip's number is the one that matters.",
    },
    {
      q: "Does a push kill a parlay?",
      a: "A common rule drops the pushed leg and grades the remaining legs at the smaller parlay price. A two-leg parlay with one push often becomes a straight bet. A loss on any remaining leg still loses the ticket. If every leg pushes, the stake returns. Some books void the whole parlay instead. The house rule you accepted is the rule. A push is not a winning leg, so you do not keep the original longshot price.",
    },
    {
      q: "Is a push the same as a void?",
      a: "No. A push returns the stake because the finished result tied the number. A void returns the stake because the bet was cancelled, for example when a game is not played. The wallet can look the same. The reason is not. Parlays and logs should keep the words apart even when a book drops a leg in both cases. Use the void page for cancellations. Use this page for ties. Do not merge them into one refund.",
    },
    {
      q: "Do half points and bought points avoid pushes?",
      a: "A half-point number cannot tie an integer score, so that line does not push. Buying from −3 at −110 to −2.5 at an illustrative −130 turns a three-point win from a push into a win, and you risk $130 instead of $110 to win the same $100. The extra $20 is the price of that one margin. Avoiding the refund is a purchase. It is not a free hook, and it is not advice to buy it.",
    },
  ],
  sources: [
    { label: "Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    { label: "National Football League", url: "https://www.nfl.com" },
  ],
  related: [
    "void-bet-meaning",
    "point-spread-explained",
    "over-under-betting",
    "parlay-betting-explained",
  ],
  updated: "2026-10-06",
};

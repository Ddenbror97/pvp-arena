import type { Guide } from "./types";

export const guide: Guide = {
  slug: "teaser-bet",
  cluster: "Sports betting",
  keyword: "teaser bet",
  secondary: ["6 point teaser", "wong teaser rules", "teaser payout"],
  title: "Teaser Bet Explained: 6-Point Teasers and When They Win",
  description:
    "What a teaser bet is, how 6, 6.5 and 7-point teasers move the line, teaser vs parlay math and the Wong teaser rules sharp NFL bettors still use.",
  h1: "Teaser bet: six points, a shorter price, and when it wins",
  answer:
    "Teaser bet is a multi-leg sports wager that moves each spread or total by a fixed number of points in the bettor's favor, then pays only if every teased leg wins at the new number. A 6-point teaser is the common NFL version. The points make each leg easier than the original line, and the book charges for that ease with a much shorter payout than a straight parlay of the same sides. This page explains the product. It is not a pick and not betting advice. Adults 18+.",
  facts: [
    "A teaser moves every chosen spread or total by the same point amount, then needs every leg to win.",
    "Six, 6.5 and 7-point menus buy more points only by shortening the price.",
    "A two-team teaser near even money is a different contract from a two-leg parlay that pays plus money.",
    "The Wong screen looks for 6-point NFL sides that cross both 3 and 7, and it is a filter rather than a promise.",
    "A teased number that lands exactly is a push on that leg, while a half-point landing cannot tie.",
    "Sportsbooks charge vig on the teaser price, and moving the number does not remove it.",
  ],
  sections: [
    {
      id: "what-a-teaser-is",
      title: "What a teaser bet changes",
      body: `A teaser bet starts from the same objects as a normal side or total: a point spread or a game total. You pick at least two of them. The book then slides each number by the teaser length. A favorite of -7.5 on a 6-point teaser is graded at -1.5. An underdog of +2.5 becomes +8.5. An over of 44.5 becomes a number six points easier for the over, which means the total you need is lower, not higher. The under moves the other way. Every leg uses the same point gift. You do not get to tease one leg six points and another leg three.

The ticket wins only when every teased leg covers. One miss loses the teaser, the same all-or-nothing shape as a parlay. The difference is the number being graded and the price attached to that easier number. [Parlay betting](/guides/parlay-betting-explained) keeps the original line and multiplies the odds. A teaser keeps the all-legs rule and replaces that multiplied price with a menu price that already includes the cost of the points. This page is not a guide to combining several markets from a single game.

Two-team teasers are the usual menu. Three-team teasers add a leg and change the payout. If the slip does not name the point amount, you do not have a teaser yet. The [point spread](/guides/point-spread-explained) page is the base language. A teaser sells a shorter price for a friendlier number. [Sports betting guides](/guides/topics/sports-betting) collect the rest, including moneylines, which teasers usually cannot move because a moneyline has no points to give.`,
    },
    {
      id: "six-six-and-seven",
      title: "How 6, 6.5 and 7 points reprice the line",
      body: `The point amount is the product. A 6-point teaser moves each leg six points. A 6.5-point teaser moves each leg six and a half. A 7-point teaser moves each leg seven. More points means an easier cover, so a serious book posts a shorter price as the gift grows. The menu is not a law. The figures below are an illustration of a shape many football menus have used, not a quote from a book you can bet today.

| Teaser | Points bought | Illustrative two-team price | What you risk to win $100 |
| --- | --- | --- | --- |
| 6-point | 6 | -110 | $110 |
| 6.5-point | 6.5 | -120 | $120 |
| 7-point | 7 | -130 | $130 |

Read the row as a trade, not as a recommendation. At the 6-point illustration you risk $110 to win $100. At the 7-point illustration you risk $130 to win the same $100. The extra point costs $20 more risk on this made-up menu. A real board can be tighter or wider. If a book posts a 6-point teaser at -130, you are paying the illustrated 7-point juice for only six points of help.

Football scores are integers, so a half-point landing cannot push. A 6-point tease of -7.5 lands on -1.5. A 7-point tease of the same favorite lands on -0.5 and also covers a one-point win. You pay for that extra case in the price. [NFL betting](/guides/nfl-betting) is where 6-point teasers are discussed most, because margins bunch around field goals and touchdowns. College football uses the same object. The NCAA runs that game. It does not set teaser prices.

Three-team teasers often flip to plus money because a third leg is harder to sweep. Plus money is not a gift. The price still has vig in it. Compare it with the parlay price of the same legs before you call the points a bargain.`,
    },
    {
      id: "teaser-versus-parlay",
      title: "Teaser math versus a straight parlay",
      body: `Worked case, arithmetic on American odds, not a prediction. Take two NFL favorites, each -7.5 at -110. A straight parlay keeps -7.5 on both. If the book multiplies prices, each -110 is about 1.909 in decimal. Two legs multiply to about 3.645. A $100 parlay returns about $364.50 if both cover, about $264.50 of profit. If either favorite misses -7.5, the $100 is lost. Fixed parlay charts can pay less. Use the chart on the ticket.

Now tease both favorites six points, so each is graded at -1.5. Using the illustrative two-team 6-point price of -110, you risk $110 to win $100. Both teams only need to win by two or more. The cover is easier. The payout collapsed from about +264 on the parlay to -110 on the teaser. That collapse is the whole product. You sold a large payout to buy twelve total points of line movement, six on each leg.

| Ticket | Number graded | Illustrative price | $100 of profit requires |
| --- | --- | --- | --- |
| Two-leg parlay at -110 and -110 | both -7.5 | about +264 if prices multiply | about $37.80 of stake |
| Two-team 6-point teaser | both -1.5 | -110 | $110 of stake |
| Two-team 7-point teaser | both -0.5 | -130 | $130 of stake |

The second worked number is the stake required to win $100. The parlay illustration needs about $37.80 at risk to win $100, and it loses unless both teams cover -7.5. The 6-point teaser needs $110 at risk to win that same $100, unless both cover -1.5. The 7-point row needs $130 at risk for the same $100. None of these rows is a suggestion to bet. They are the exchange rate between points and price.

A teaser matches a belief that the sides win by less than the full spread. It is a bad match if you wanted the long parlay price and only noticed the teaser button. The points look free in the preview. The price is where they are paid for.`,
    },
    {
      id: "wong-rules",
      title: "Wong teaser rules, without a promise",
      body: `Sharp NFL writing has a named screen for 6-point teasers, often called the Wong teaser after the author who published it. Margins of 3 and 7 are key numbers because scores are built from field goals and from touchdowns with an extra point. A 6-point move that starts on one side of both keys and ends on the other crosses the margins books argue about most. The screen throws out teasers that skip those keys or land on a push number.

The sides people still quote are small. A favorite from -7.5 to -8.5, teased six points, is graded from -1.5 to -2.5. That path crosses 7 and 3. An underdog from +1.5 to +2.5 is graded from +7.5 to +8.5, crossing 3 and 7 the other way. The original discussion cared about that screen at a short price, around -110 or better, not after the menu had already taxed the points. Totals were a separate question. This page does not turn them into a system.

Crossing the keys does not pay you. It names which numbers the six points buy. A -3 favorite teased six points lands on +3, and +3 can push. That is a different trade. If you cannot point at the open number and the teased number and see both 3 and 7 between them, you are not looking at the screen.

No win rate belongs here. A published filter is not a coupon. At -130 you are paying a steep tax for a screen that was discussed at a much shorter price. Use the rules to throw out teasers that miss the keys, not as a reason to bet the ones that hit them. Adults 18+. This is not betting advice.`,
    },
    {
      id: "pushes-and-ties",
      title: "When a teased leg ties",
      body: `A teaser leg pushes when the final margin or total lands exactly on the teased number. The stake treatment then follows the teaser rules, which often resemble parlay rules. A common pattern drops the pushed leg and grades what remains. A two-team teaser with one push becomes a straight bet at the teaser's reduced price, or it voids the whole ticket, depending on the book. Those are different outcomes. Read the rule before you need it. A three-team teaser with one push often becomes a two-team teaser at the two-team price, not at the three-team price you liked when you bet.

Half points are how teasers avoid that tie. The 6-point move from -7.5 to -1.5 cannot push on an integer score. The 6-point move from -7 to -1 can push, because -1 is a whole number and a one-point win by the favorite ties the teased spread. Buying the extra half point to 6.5 moves -7 to -0.5 and removes the push, and the menu charges for it. That charge is the same idea as buying a hook on a straight spread, which [point spread](/guides/point-spread-explained) covers without the parlay wrapper.

Do not record a push as a win. The leg tied. If the rules return stake, profit on that piece is zero. If they reduce the teaser, the payout shrinks, and a loss on any remaining leg still loses the ticket. The [over under](/guides/over-under-betting) page is the same tie on a total: land on the number and it pushes, unless the line was a half point. Overtime versus regulation is whatever sentence the slip uses. That sentence wins.`,
    },
    {
      id: "checklist",
      title: "A checklist before you take the points",
      body: `Use this as a reading list, not as a sequence that creates an edge. If any line fails, you do not understand the ticket yet.

- Name the point amount, 6, 6.5 or 7, and write the teased number next to the original number.
- Write the teaser price and the straight parlay price of the same legs, so the payout you gave up is visible.
- Check whether each NFL side crosses 3 and 7, and ignore that screen if you are not betting NFL sides.
- Read the push rule for a tied leg, including what a two-team teaser becomes.
- Confirm the legs are different games if that is the product you meant to buy.
- Stop if the stake is money you cannot lose. Adults 18+. This is not betting advice.

A checklist does not turn a -130 teaser into a -110 teaser. If the session becomes chasing, the [responsible gambling](/responsible-gambling) page is the stop. Adding a leg to get the points back adds vig. It does not remove it.`,
    },
    {
      id: "pvp-contrast",
      title: "Vig on the teaser, and a pot that is shared",
      body: `A sportsbook charges vig on a teaser the same way it charges vig on a straight spread. The menu price is shorter than a fair price for the chance that every teased leg covers. That gap is how the book is paid. Six points of movement is the thing being sold, not a deleted hold. Shopping can change the price you accept. It does not make the ticket a fair coin.

A PvP pot is shared among the players in it. You are not taking a teased spread against a book. [Fairness](/fairness) explains how this site's rounds can be checked. [Jackpot](/) is the pot, not a football ticket. This site does not post teasers, and this page states no player counts, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice.`,
    },
  ],
  faqs: [
    {
      q: "What is a 6-point teaser bet?",
      a: "A 6-point teaser moves each selected spread or total six points in your favor and then pays only if every leg covers the new number. The payout is much shorter than a parlay of the original prices, because the book charges for the easier lines. A common illustration is a two-team teaser near -110, against a two-leg parlay that pays plus money. Your slip's menu is the price that counts. This is not a pick. Adults 18+.",
    },
    {
      q: "How is a teaser different from a parlay?",
      a: "A parlay grades each leg at the original number and multiplies the odds, so two standard prices pay several times the stake if both win. A teaser grades each leg at a friendlier number and replaces that long price with a short menu price. Both tickets lose if any leg misses. The teaser is the points-for-price trade. It is not a parlay that kept its payout and also received free points.",
    },
    {
      q: "What are the Wong teaser rules?",
      a: "The screen people still quote is a 6-point NFL teaser that crosses both key numbers, 3 and 7. Favorites from -7.5 to -8.5 tease down through those keys. Underdogs from +1.5 to +2.5 tease up through them. The discussion assumed a short price, around -110 or better, not a heavily juiced menu. Crossing the keys is a filter. It is not a system and it does not promise a profit.",
    },
    {
      q: "Does a 6.5 or 7-point teaser pay the same?",
      a: "No. Extra points are easier covers, so the menu price gets shorter as the gift grows. An illustration is -110 for six points, -120 for 6.5, and -130 for seven, each to win the same $100 on a two-team ticket. Real menus differ. A half point also changes whether the landing number can push. Pay for the points only if the slip's price is the trade you meant.",
    },
    {
      q: "What happens if a teased leg ties?",
      a: "If the margin or total lands exactly on the teased number, that leg pushes. A common rule drops the pushed leg and grades the rest at a smaller teaser, but some books void the ticket instead. A half-point number cannot tie an integer score. Read the push sentence before you bet, and do not book a push as a win. The stake result is a refund or a reduced bet, not a cover.",
    },
  ],
  sources: [
    { label: "Parlay", url: "https://en.wikipedia.org/wiki/Parlay_(gambling)" },
    { label: "National Football League", url: "https://www.nfl.com" },
  ],
  related: [
    "parlay-betting-explained",
    "point-spread-explained",
    "nfl-betting",
    "over-under-betting",
  ],
  updated: "2026-10-06",
};

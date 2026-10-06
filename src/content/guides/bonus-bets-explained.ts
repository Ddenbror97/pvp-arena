import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bonus-bets-explained",
  cluster: "Sports betting",
  keyword: "bonus bet",
  secondary: ["free bet payout", "stake not returned", "bonus bet conversion", "sportsbook free bet"],
  title: "Bonus Bets Explained: How Free Bets Really Pay Out",
  description:
    "How sportsbook bonus bets and free bets work, why stake is not returned, conversion math and the best way to turn bonus bets into real cash.",
  h1: "Bonus Bets Explained: How Free Bets Really Pay Out",
  answer:
    "Bonus bet tokens, often called free bets, pay the profit only if they win. The stake is not returned. A $100 bonus bet at plus 200 pays $200 if it wins, not $300. If it loses, a true bonus token costs none of your withdrawable cash. The face value is not cash. Conversion math shows why longer odds keep more of that face value when you can hedge, and why juice keeps you under the fair number. Adults 18+ only. Not a pick.",
  facts: [
    "A winning bonus bet returns profit only. You do not get the stake back with it.",
    "A $100 token at even money pays about $100 of profit, not $200 of cash back.",
    "At fair odds with no commission, a free bet is worth stake times (1 minus 1/decimal).",
    "Longer decimals keep a larger share of the face value. Short prices waste more of the token.",
    "Vig and exchange commission mean a real hedge converts less than the fair sketch.",
    "This is a sportsbook token, not a casino welcome bonus. Adults 18+ only.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a bonus bet actually is",
      body: `A bonus bet is a token the sportsbook lets you place as if it were stake. It is not a chip you can withdraw. If the selection loses, the token disappears and your cash balance does not drop, assuming the token was truly free and not your own deposit in disguise. If the selection wins, the book pays the winnings and keeps the token. Stake is not returned. That sentence is the whole product.

People read "free $100" and picture $100 in the cashier. The cashier picture is wrong until a bet wins, and even then the credit is the profit. [Matched betting](/guides/matched-betting) is the practice of hedging that profit so both outcomes leave a smaller, more certain cash amount. [Casino bonuses explained](/guides/casino-bonuses-explained) is a different animal: wagering requirements on casino credits, playthrough, and game weighting. Do not use a slot playthrough rule to grade a football token, and do not use this page as a welcome-bonus guide.

Read the label. Some credits are site credit that does return stake and then locks you into rollover. Some are bonus bets that never return stake and might still be tied to a deposit you made with cash. The deposit is yours and can be lost on other bets. The token is not. Mixing those two in your head is how "free" becomes a deposit you chase.

[Sports betting guides](/guides/topics/sports-betting) holds the market pages. Adults 18+ only. PVPspinArena does not issue sportsbook bonus bets. [Fairness](/fairness) checks Jackpot, Coinflip and Roulette. [Jackpot](/) is a pot, not a free-bet token. [Responsible gambling](/responsible-gambling) applies when a token is the excuse for a deposit you did not plan. [Gambling budget](/guides/gambling-budget) is the ceiling. A token does not raise it.`,
    },
    {
      id: "payout",
      title: "Why the stake is not returned",
      body: `Ordinary cash bet at plus 200, decimal 3.0: stake $100 of your money. If it wins, profit is $200 and you also receive the $100 stake back. Return is $300. If it loses, you are down $100 cash.

Bonus bet at the same plus 200: the $100 is the book's token. If it wins, profit is still $200, and that $200 is what you can usually withdraw, subject to the terms. You do not also withdraw the $100 token. If it loses, cash profit is $0 and cash loss is $0. The token is gone either way. It was never cash.

That missing stake-back is why a bonus bet at short odds is a poor shape. At decimal 1.50, a cash bet risks stake to win half the stake. A bonus bet at 1.50 wins a profit of half the token and still does not return the token. You burned $100 of face value to extract $50. At decimal 4.0 the profit is three times the token. The stake that is not returned is a smaller slice of a larger payout. The token was going to vanish anyway. You want the win, if it happens, to be large relative to the face.

Terms still govern. Minimum odds, expiry, sports that are excluded, and whether a push kills the token or returns it to your bonus balance are in the offer. A push on a cash bet returns cash. A push on a bonus bet might return the token or might void the promotion. Read that line before you place a number that can land exactly. This page cannot see your book's PDF. The PDF grades the argument, not a forum post.`,
    },
    {
      id: "conversion",
      title: "Conversion math at fair odds",
      body: `If a bonus bet of stake S could be hedged at fair decimal odds D, with no vig and no commission, the locked cash is S times (1 − 1/D). That is the share of face value a perfect hedge keeps. The rest is the stake the book never returns, spread across the outcomes.

| Decimal odds | American sketch | Fair share of face value kept |
| --- | --- | --- |
| 1.50 | −200 | 33% |
| 2.00 | +100 | 50% |
| 3.00 | +200 | 67% |
| 4.00 | +300 | 75% |
| 6.00 | +500 | 83% |

The formula is not a promise from a book. Real prices include a hold, and an exchange lay includes commission. Both eat the share. A token you "should" convert at 75% might clear 60% or less once both sides are juiced, or it might not be hedgeable at all if the market is thin. Thin markets are also where the terms sometimes forbid the bet. Read the exclusion list.

Short prices are where bonus bets go to shrink. Laying a heavy favorite with a token feels safe and extracts the smallest slice of the face value in the table. Longer prices extract more, and they swing harder if you do not hedge. Hedging is optional. It is the way to turn the token into cash without needing the selection to win. It is not a way to print the full face value. Nobody is paying you the $100 and the profit. The math refuses that.

[Implied probability](/guides/implied-probability) is the conversion from a price to a percent if you want to see the hold before you hedge. [Matched betting](/guides/matched-betting) walks through backing and laying as a method. This section is only the fair sketch so the stake-not-returned point has a number.`,
    },
    {
      id: "example-payout",
      title: "Worked example: $100 token at plus 200",
      body: `Illustration, not a selection. You have a $100 bonus bet. You place it at plus 200. Decimal odds are 3.0. Profit if the selection wins is $100 times 2, which is $200. You do not receive $300.

- Selection wins: cash credit about $200. The $100 token is not added. Stake was not returned.
- Selection loses: cash credit $0. You did not lose $100 of withdrawable money, if the token was free.
- You had instead staked $100 cash at plus 200 and won: return $300, because stake comes back on a cash bet.

The $100 gap between $200 and $300 is the stake. It is the point of the product. Calling the payout "a $100 free bet that hit for three hundred" is how logs lie. Your [bet tracker](/guides/bet-tracker) should mark the row as a bonus stake so ROI on cash is not inflated by a token you never owned.

Fair value of this token, if you could hedge at decimal 3.0 with no commission, is $100 times (1 − 1/3), about $66.67. You will not see $66.67 written on the token. You might lock something near it if both prices are tight, or something worse if they are not. The $200 win is the unhedged upside. The $0 loss is the unhedged downside. The hedge trades both for a smaller sure thing. Choose with the terms open. Do not choose because a banner said "free."`,
    },
    {
      id: "example-hedge",
      title: "Worked example: hedging a $50 token at 4.0",
      body: `Second illustration. Bonus bet $50 at decimal 4.0. If it wins, profit is $50 times 3, which is $150, and the stake is not returned. Suppose you can lay the same result at decimal 4.0 with zero commission. That zero is a teaching assumption. Real exchanges charge a commission, and real books shade the other side. The clean number shows the ceiling.

You want both outcomes to pay the same cash. Let L be the lay liability, the amount you lose on the lay if the bonus selection wins. If the bonus wins, cash is $150 minus L. If the bonus loses, the lay wins. At decimal 4.0 the layer's profit is L / 3, because the backer's profit multiple is 3.

Set them equal: 150 − L = L / 3. Then 150 = L + L/3 = 4L/3, so L = 150 times 3/4 = $112.50. Layer profit if the bonus loses is 112.50 / 3 = $37.50. If the bonus wins, 150 − 112.50 = $37.50. Both sides lock $37.50.

| Outcome | Bonus bet cash | Lay cash | Net |
| --- | --- | --- | --- |
| Selection wins | +$150 profit | −$112.50 liability | +$37.50 |
| Selection loses | $0 | +$37.50 lay profit | +$37.50 |

$37.50 is 75% of the $50 face, which matches 1 − 1/4. That is the best case in a zero-commission fairy tale at a fair 4.0. Add 5% commission or a shaded lay and the locked cash falls. If you cannot lay at all, you do not have this table. You have a $150-or-zero ticket. Taking a short price instead, because a hedge looks like work, can cut the fair share toward the 33% row. The best way to turn the token into cash is the hedge at the longest price the terms allow, after you subtract real commission. It is not a parlay that tries to "maximize" a banner.`,
    },
    {
      id: "checklist",
      title: "Checklist before you use a bonus bet",
      body: `Read the offer once. Then the slip.

- The token is a bonus bet, stake not returned, not site credit with rollover.
- You know what a win pays in profit only. You wrote the dollars.
- Expiry, minimum odds, and excluded markets are lines you found.
- A push either returns the token or kills it. You know which.
- If you hedge, the other price and the commission are in the net, not ignored.
- Your own deposit, if the offer required one, is still cash you can lose. The token does not insure it.
- You are 18+. You are not depositing only to unlock a token you convert for less than the deposit.

Casino welcome bonuses with wagering requirements are explained elsewhere. Do not import a playthrough multiple into this checklist. A sportsbook bonus bet is graded when the selection wins or loses, subject to the terms, not after you spin a slot forty times.`,
    },
    {
      id: "not-a-book",
      title: "This site does not issue that token",
      body: `PVPspinArena will not hand you a $50 sportsbook bonus bet or lay the other side of it. There is no conversion desk. Jackpot, Coinflip and Roulette are the games. [Fairness](/fairness) verifies a reveal. It does not verify a free-bet term.

If the token's terms are opaque, skip the offer. Opaque is expensive. Adults 18+ only. A banner is not cash, and stake not returned is the reason the banner can say a big number.`,
    },
  ],
  faqs: [
    {
      q: "Do bonus bets return the stake?",
      a: "No. A winning bonus bet pays the profit and does not return the stake. A $100 token at plus 200 credits about $200, not $300. A cash bet at the same price would return stake plus profit. If the token loses, you usually lose the token and not withdrawable cash. Read the terms, because some credits are not bonus bets at all.",
    },
    {
      q: "How much is a free bet worth?",
      a: "At fair odds with no commission, value is face value times (1 minus 1 divided by the decimal odds). That is about 50% at even money and about 75% at decimal 4.0. Longer prices keep more of the face because the missing stake is a smaller share of the payout. Juice and commission reduce the amount you can actually lock.",
    },
    {
      q: "What is the best way to convert a bonus bet to cash?",
      a: "Hedge it. Back with the token at a long price the terms allow, and lay the other side if you can, then subtract commission. The fair sketch at decimal 4.0 keeps about 75% of face value. Real prices keep less. A short favorite extracts a smaller slice. A parlay is not a converter. It is a longer shot with more juice.",
    },
    {
      q: "Is a sportsbook bonus bet the same as a casino bonus?",
      a: "No. A bonus bet is a stake token that pays profit only. A casino welcome bonus is often cash or credits you must wager many times before withdrawing. The rules, the games, and the way value disappears are different. Use the casino page for playthrough. Use this page for stake not returned.",
    },
    {
      q: "Does PVPspinArena offer sportsbook free bets?",
      a: "No. This site is not a sportsbook and does not issue bonus bet tokens on teams. Jackpot, Coinflip and Roulette are the games, adults 18+ only. A hashed pot does not pay profit-only on a football price or convert a free-bet face value.",
    },
  ],
  sources: [
    { label: "Wikipedia: Matched betting", url: "https://en.wikipedia.org/wiki/Matched_betting" },
    { label: "Wikipedia: Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    { label: "GambleAware", url: "https://www.gambleaware.org/" },
  ],
  related: ["matched-betting", "casino-bonuses-explained", "gambling-budget", "implied-probability"],
  updated: "2026-10-06",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cash-out-betting",
  cluster: "Sports betting",
  keyword: "cash out betting",
  secondary: ["what is cash out", "partial cash out", "cash out value", "should i cash out"],
  title: "Cash Out Betting: How the Offer Is Priced and When to Use",
  description:
    "What cash out betting is, how a sportsbook prices the offer from live odds, partial cash out, the margin you give up, and when taking it makes sense.",
  h1: "Cash out betting: how the offer is priced",
  answer:
    "Cash out betting lets you settle a bet before the event finishes for an amount the sportsbook offers now. The offer is roughly your potential return divided by the current odds of the same selection, minus a margin for the book. Cashing out removes the remaining risk, but on average it costs a little more than letting the bet run, so it is a risk decision rather than a way to win more.",
  facts: [
    "A cash-out offer tracks the live price of your selection.",
    "Fair value ≈ stake × your odds ÷ current odds; the book's offer is usually below that.",
    "Partial cash out settles part of the stake and leaves the rest running.",
    "Books can suspend cash out at any moment, for example after a goal or a red card.",
    "Cash out is a hedge: it trades expected value for less variance.",
  ],
  sections: [
    {
      id: "what",
      title: "What cash out betting is",
      body: "Cash out betting is an offer from the sportsbook to close your bet early. If you accept, the bet is settled at that amount and the result of the event no longer matters to you. Most US and UK sportsbooks show a cash-out button on open bets in eligible markets; FanDuel's [cash out page](https://www.fanduel.com/sportsbook-cash-out) is a typical description of the feature. Not every market or bet type is eligible, and the button can disappear temporarily while the price is moving.\n\nCash out is the bookmaker's version of a [hedge bet](/guides/hedge-betting): instead of placing an opposite bet yourself, the book offers to buy your position back. On a betting exchange you can do the same by laying your selection; see [betting exchanges explained](/guides/betting-exchange-explained).",
    },
    {
      id: "pricing",
      title: "How the cash-out amount is priced",
      body: "A simple model reproduces most offers. Your bet's **potential return** is stake × odds. If the same selection is now priced at new odds, the fair value of your ticket is:\n\n**Fair cash out ≈ stake × your odds ÷ current odds**\n\n**Worked example.** You bet $10 on a team at 3.00 before kick-off. Potential return: $30. At half time they lead and their price has shortened to 1.50.\n\n- Fair value = 10 × 3.00 ÷ 1.50 = **$20.00**.\n- A sportsbook might offer, say, $18.50. The $1.50 gap is the book's margin on the cash-out trade; the exact figure depends on the book.\n\nIf the price had drifted to 6.00 instead, fair value would be 10 × 3 ÷ 6 = $5, and the offer would be below that.\n\nThe current odds already include the bookmaker's [vig](/guides/vig-betting), and the cash-out offer usually adds another deduction. That is why, on average, taking cash out returns less than letting bets run. [Implied probability](/guides/implied-probability) converts the live price into the chance the market gives your selection.",
    },
    {
      id: "partial",
      title: "Partial cash out",
      body: "Many books let you cash out part of a bet. Using the example above, cashing out half of the $10 stake at an offer of $18.50 for the whole bet gives you $9.25 now and leaves $5 at 3.00 running (a $15 potential return). The two halves are independent: the cashed part is settled, the rest wins or loses normally.\n\nSome books also offer **auto cash out**: you set a value and the bet is cashed out automatically if an offer reaches it. Auto cash out is still subject to suspension. If the market is suspended when your trigger is hit, the cash out may not happen.",
    },
    {
      id: "when",
      title: "When cashing out makes sense",
      body: "Cash out does not change the probability of the result. It changes how much risk you carry. Reasonable reasons to take it:\n\n- **The stake has grown too large for your budget.** A parlay with one leg left can be worth more than you are comfortable losing. Locking part of it in is a budget decision; see [parlay betting explained](/guides/parlay-betting-explained).\n- **New information.** If an injury or lineup change makes your bet worse and the price has not adjusted yet, an offer can be worth taking. Often the price adjusts first.\n\nPoor reasons: panic during normal swings in a game, or cashing out every winning bet early. Over many bets, systematic early cash outs mean paying the margin repeatedly. Track it: the [bet tracker](/guides/bet-tracker) helps you compare what cash outs cost against letting bets settle.\n\nMore sports betting basics are in the [sports betting topic](/guides/topics/sports-betting).",
    },
    {
      id: "rules",
      title: "Rules to read first",
      body: "- **Eligibility.** Free bets, some promotions and some markets are excluded.\n- **Suspension.** Cash out is unavailable while the market is suspended and can be withdrawn without notice.\n- **Settlement.** Once accepted, the cash out is final, even if your selection then wins.\n- **Errors.** Books reserve the right to void an offer made at an obvious wrong price; the terms define this.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "Is cash out a good idea?",
      a: "On average it returns slightly less than letting the bet run, because the offer includes a margin. It can still be the right choice when the remaining risk is more than you want to carry.",
    },
    {
      q: "How is a cash-out value calculated?",
      a: "Approximately stake × your odds ÷ the current odds of the same selection, minus the book's margin. A $10 bet at 3.00 now priced at 1.50 has a fair value of about $20.",
    },
    {
      q: "Why did the cash-out button disappear?",
      a: "The market was suspended, usually after a goal, a big play or a price change. It may return when the market reopens, or it may not.",
    },
    {
      q: "Can I cancel a cash out?",
      a: "No. An accepted cash out is settled. If your selection then wins, the original potential return is not paid.",
    },
    {
      q: "Is cash out the same as hedging?",
      a: "It has the same effect as a hedge: you give up some expected value to reduce risk. The difference is that the book sets the price instead of you placing an opposite bet.",
    },
  ],
  sources: [
    {
      label: "FanDuel Sportsbook: cash out",
      url: "https://www.fanduel.com/sportsbook-cash-out",
    },
    {
      label: "BetVictor help: cash out FAQs",
      url: "https://betvictorhelp.zendesk.com/hc/en-gb/articles/360005044457-Cash-Out-FAQs",
    },
    {
      label: "GambleAware",
      url: "https://www.gambleaware.org/",
    },
  ],
  related: [
    "hedge-betting",
    "parlay-betting-explained",
    "live-betting-strategy",
    "implied-probability",
    "vig-betting",
  ],
  updated: "2026-11-26",
};

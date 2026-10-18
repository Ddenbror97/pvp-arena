import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hedge-betting",
  cluster: "Sports betting",
  keyword: "hedge betting",
  secondary: ["hedge calculator", "lock a profit", "hedge a parlay"],
  title: "Hedge Betting: When to Hedge and a Free Hedge Calculator",
  description:
    "Hedge betting explained with a free hedge calculator: how to lock in profit on parlays and futures, when hedging is smart and when it costs you.",
  h1: "Hedge betting: the stake that locks a number",
  answer:
    "Hedge betting is a second wager on the other side of a ticket you already hold, sized so the two results land near the same profit or the same loss. The hedge calculator below is that size in arithmetic, and it is not a promise. Locking a profit is possible only when the original ticket has enough value left to pay for the new stake. Often the locked number is negative, and then the hedge bought certainty of a loss. This is not betting advice. Adults 18+.",
  facts: [
    "A hedge is a new bet against a position you already have, not a change to the original price.",
    "Equal profit on both outcomes is a stake you can solve before you click.",
    "If that stake locks a negative number, the hedge is paying juice to stop watching.",
    "A parlay hedge usually waits until one leg is left, because earlier you are betting against yourself twice.",
    "A futures hedge can tie up far more cash than the original stake in order to lock a smaller win.",
    "Cash out is a different contract: the book names a new price and closes the ticket.",
  ],
  sections: [
    {
      id: "what-a-hedge-is",
      title: "What hedge betting is",
      body: `Hedge betting means you already have a bet, and you place another bet that wins when the first one loses. The point is the pair. You are not picking a new side from a blank page. You are choosing a net number across two tickets. If the original wins, you collect its profit and lose the hedge stake. If the hedge wins, you collect the hedge profit and lose the original stake. The calculator asks what hedge stake makes those two nets match.

The original price does not improve because you hedged. You accepted it earlier. The hedge is filled at today's price, which can be worse than the price you would have wanted. [Implied probability](/guides/implied-probability) is how to read that new price as a percentage before you decide the certainty is worth it. A hedge is not a void and not a push. Both bets can still lose if you hedge the wrong market, such as a different spread from the one on the ticket.

[Sports betting guides](/guides/topics/sports-betting) separate this from products that only look similar. A [parlay](/guides/parlay-betting-explained) is one stake that needs several legs. Hedging the last leg is a second stake. [Cash out](/guides/cash-out-betting) is the book buying your ticket back at a number it chooses. You can compare that offer with the hedge stake. They are not the same button.`,
    },
    {
      id: "calculator",
      title: "A hedge calculator that locks a profit",
      body: `Use one equation. Let P be the profit if the original ticket wins, not counting the hedge. Let S0 be the original stake you lose if the hedge wins. Let f be the hedge's net odds: for a minus American price, f = 100 / |price|, and for a plus price, f = price / 100. The hedge stake S that matches both outcomes is (P + S0) / (1 + f). The locked profit is P − S. If that number is below zero, you are locking a loss.

Worked profit lock. Original ticket: $100 at +300, so P = $300 and S0 = $100. The other side is now −150, so f = 100/150 = 2/3. S = (300 + 100) / (1 + 2/3) = 400 / (5/3) = $240. Stake $240 at −150. That hedge wins $160 if it hits, because 240 × 2/3 = 160.

| Outcome | Original ticket | Hedge of $240 at −150 | Net |
| --- | --- | --- | --- |
| Original wins | +$300 | −$240 | +$60 |
| Hedge wins | −$100 | +$160 | +$60 |

The locked profit is $60 either way, before any extra fee the book actually charges. You gave up $240 of the $300 upside to remove the chance of losing the original $100. That trade is the whole calculator. It is not a finding that +300 was a good bet, and it is not an instruction to hedge live games. Prices on the other side move. If −150 becomes −180 before the hedge is accepted, recompute f. Do not reuse $240.`,
    },
    {
      id: "locks-a-loss",
      title: "When the same math locks a loss",
      body: `Second worked case. You bet $110 at −110, so a win profits $100 and a loss costs $110. The other side is also −110, which is the ordinary two-way price. Hedge $110 on that side. If the original wins, you make $100 and lose the $110 hedge, net −$10. If the hedge wins, you make $100 and lose the original $110, net −$10. The calculator did not malfunction. (P + S0) / (1 + f) = (100 + 110) / (1 + 100/110) = 210 / (210/110) = $110. Locked result = 100 − 110 = −$10.

| Outcome | Original −110 stake | Hedge of $110 at −110 | Net |
| --- | --- | --- | --- |
| Original wins | +$100 | −$110 | −$10 |
| Hedge wins | −$110 | +$100 | −$10 |

You locked the juice. Both prices were short of even money, and holding both is a paid-up loss. This is the case people still hedge because the game became uncomfortable. Comfort has a price. Here it is $10 on a $110 decision, and the $10 does not swing with the score. Hedging two standard spreads against each other does not create a clever position. It closes the position by paying the book twice.

If the locked number is a loss you would not accept as a single bet, do not accept it as a pair. Recalculate when the hedge price is plus money. A plus price raises f, which lowers the stake required and can turn a lock positive. The sign of the result is the decision. The story about nerves is not.`,
    },
    {
      id: "parlays-and-futures",
      title: "Parlays, futures, and the last leg",
      body: `A parlay hedge is usually the last leg. You have two legs already won, and one game left, and the parlay will pay a known profit if that game hits. Plug that profit in as P and the original parlay stake as S0. Then price the opposite side of the remaining game, not a different spread and not a player prop that can win while your leg loses. If you hedge before the last leg, you can win the hedge and still lose the parlay to an earlier game, or win the parlay and lose a hedge you did not need. That is two risks, not a lock.

A futures hedge has the same equation and a harsher scale. A small longshot stake can require a large hedge once the team is close, because P is large and the opponent's price is short. A long-priced [moneyline](/guides/moneyline-betting-explained) is the same shape of ticket when the market is a single game rather than a title. Bring the equation to it. Do not hedge a futures price with a regular-season side that does not settle the title. The markets have to be opposites of the same outcome, or the "lock" has a hole where both lose.

Partial hedges are allowed by the arithmetic. Stake half of S and you keep more upside and more downside. The table will not show one number. It will show two nets, and you pick the pair you can stand. There is no correct fraction. There is only a pair of nets you computed before the game, instead of during it.`,
    },
    {
      id: "when-it-costs",
      title: "When a hedge is smart and when it costs you",
      body: `A hedge is the rational description of a preference only when the locked number is a profit you actually want more than the original upside, and the hedge market truly opposes the ticket. The +300 example locks +$60. Someone who needs the $60 more than the chance at $300 can say that in a sentence. Someone who hedges every ticket by habit is paying for a feeling. The −110 example is the feeling priced at a guaranteed −$10.

It costs you in three ordinary ways. The locked number is negative. The hedge price moves after you looked, and you fill a worse f without redoing the division. The hedge is the wrong market, so both bets lose when the score lands between them. A fourth cost is tying up the hedge stake. The $240 in the first table has to sit in the account. If that cash was the bankroll for other bets, the lock spent it.

None of this beats the vig. You are paying the hedge price's juice on the way out of a ticket that already had juice on the way in. Shopping the hedge across books can improve f. It cannot make (P − S) larger than P. Adults 18+. This is not betting advice, and a positive lock on a hypothetical ticket is not a claim you should have bet the original.`,
    },
    {
      id: "checklist",
      title: "A checklist before you bet the other side",
      body: `Compute the net, then decide. The order matters.

- Write P, the profit if the original wins, and S0, the original stake.
- Write the hedge price and convert it to f, the profit per dollar staked.
- Divide (P + S0) by (1 + f) and call that S.
- Subtract S from P. If the result is negative, the hedge locks a loss.
- Confirm the hedge market loses when the original wins, with no score that loses both.
- Stop if you are hedging to chase a feeling. Adults 18+. This is not betting advice.

If the arithmetic and the mood disagree, keep the mood off the slip. The [responsible gambling](/responsible-gambling) page is the right tab when hedging has become a way to stay in action after you meant to be done.`,
    },
    {
      id: "pvp-contrast",
      title: "Juice on both tickets, and a pot that is shared",
      body: `Sportsbooks charge vig on the original price and again on the hedge. A locked profit is what remains after both charges, when anything remains. A locked loss is both charges with nothing left. The book does not refund the juice because you were "responsible" and took the other side. Middle outcomes, where the number lands between two different spreads, can even make both bets win, and those are a different bet, not the hedge in the table.

A PvP pot is shared among the players in the pot. You are not laying a second price against a book to exit a first price. [Fairness](/fairness) explains how this site's rounds can be checked. [Jackpot](/) is the pot, not a hedge ticket. This page invents no player counts, no rake, and no jackpot size. Adults 18+. Nothing here is betting advice.`,
    },
  ],
  faqs: [
    {
      q: "How do you calculate a hedge stake?",
      a: "Add the original profit if that ticket wins to the original stake. Divide by one plus the hedge's net odds. For a minus price, net odds are 100 divided by the absolute price. For a plus price, net odds are the price divided by 100. The result is the stake that makes both outcomes pay the same net. Subtract that stake from the original profit. A negative answer means you locked a loss, not a win.",
    },
    {
      q: "Can a hedge guarantee a profit?",
      a: "Only in the arithmetic sense that both outcomes show the same positive net, and only if the hedge is filled at the price you used and truly opposes the ticket. The +300 example against −150 locks $60 on those inputs. Change the hedge price and the $60 moves. If the locked net is negative, nothing was guaranteed except the loss. This is not a promise that a live ticket can be hedged for profit.",
    },
    {
      q: "When is hedging a parlay worth it?",
      a: "When one leg remains, you know the profit if it hits, and the opposite price locks a net you prefer to the full swing. Hedging earlier can win the hedge and still lose the parlay to another leg. Worth it is a comparison of two nets you wrote down. It is not a rule that every parlay should be hedged on the last game, and it is not betting advice. Adults 18+.",
    },
    {
      q: "Is cash out the same as a hedge?",
      a: "No. Cash out is the book closing your ticket at a new price it offers. A hedge leaves the original ticket up and adds a second bet you size yourself. The cash-out offer can be compared with the locked net from the calculator. If the offer is worse than the hedge you can actually fill, the offer is the expensive exit. If you cannot fill the hedge, the offer may be the only exit. They are different contracts.",
    },
    {
      q: "Why do some hedges lock a loss?",
      a: "Because both prices contain juice. Two bets at −110, one on each side, lock about the vig and nothing else. The original ticket did not have enough profit left to pay for a short hedge price. Fear of the result does not change the division. If P minus the hedge stake is below zero, you are buying certainty of a loss. Leaving the original ticket alone is also a choice.",
    },
  ],
  sources: [
    { label: "Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    {
      label: "National Council on Problem Gambling — help and treatment",
      url: "https://www.ncpgambling.org/help-treatment/",
    },
  ],
  related: [
    "cash-out-betting",
    "parlay-betting-explained",
    "implied-probability",
    "moneyline-betting-explained",
  ],
  widget: "hedge",
  updated: "2026-10-06",
};

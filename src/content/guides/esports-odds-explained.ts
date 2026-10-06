import type { Guide } from "./types";

export const guide: Guide = {
  slug: "esports-odds-explained",
  cluster: "Esports betting",
  keyword: "esports odds",
  secondary: [
    "esports decimal odds",
    "esports implied probability",
    "esports overround",
    "esports betting odds",
  ],
  title: "Esports Odds Explained: Prices, Margin, Chance",
  description:
    "Esports odds explained: decimal, fractional and American prices, implied probability, overround, and why a posted line is not the true chance.",
  h1: "Esports odds: how prices, implied chance and margin work",
  answer:
    "Esports odds are the book's posted price on a match, map or prop. Decimal odds are total return per $1 staked. Implied probability is 1 divided by that decimal. When both sides of a market add to more than 100%, the extra is the book's margin. The percent on the ticket is what the payout assumes, not a measurement of who will actually win. PVPspinArena does not post esports odds.",
  facts: [
    "Decimal odds D mean a $1 stake returns $D in total if the selection wins.",
    "Implied probability from decimal odds is 1 ÷ D, before you ask whether that matches reality.",
    "A two-way market whose implied chances sum above 100% is showing overround.",
    "American, decimal and fractional labels are formats; they do not change the contract.",
    "PVPspinArena does not price teams; it runs hashed PvP Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "what",
      title: "What esports odds actually are",
      body: `A posted price is a sentence about payout, not a weather report. If a book will pay decimal 2.50 when Team B wins the series, it is treating that result as a 40% shot for pricing purposes. That 40% is implied by the odds. It is not measured from a patch note, a VOD review or a coach's timeout.

Esports odds look like any other sports price: a number next to a name, a stake box, a live board that ticks. The underlying contest is still a human match. Form, stand-ins and rare integrity problems can all move the result after you click. That is why this page sits in the [esports betting topic](/guides/topics/esports-betting) next to the product explainer on [esports betting](/guides/esports-betting).

This guide is for adults aged 18 or over. It teaches the arithmetic. It will not tell you who to back. Teaching numbers below are labelled illustrations, not today's board and not a tip.

PVPspinArena is not an esports book. It does not publish team lines. It runs hashed [Jackpot](/) pots, [Coinflip](/coinflip) and Roulette. A 2.00 coinflip payout on a true 50% ticket is a different contract from a 1.80 favourite on a best-of-three.`,
    },
    {
      id: "formats",
      title: "Decimal, fractional and American labels",
      body: `Books, apps and forums do not share one language. Europe and most crypto cashiers write decimal. The UK still writes fractions. US state books write American plus and minus. The contract can be identical.

- **Decimal D:** total return per $1, including stake. Profit is stake × (D − 1).
- **Fractional a/b:** profit a on stake b. Decimal equivalent is (a ÷ b) + 1.
- **American +A:** profit A on a $100 stake. American −A: you risk A to profit $100.

Illustration (formats only, not a live line): decimal 2.50 = fractional 6/4 = American +150. All three imply 40%. Decimal 1.80 = fractional 4/5 = about −125. All three imply about 55.6%.

If a streamer says "it's 2 to 1" they might mean fractional 2/1 (decimal 3.00) or they might mean "about even". Ask which format. The [odds converter](/guides/odds-converter) is the unit-change page. This page is the esports-shaped version of the same habit: convert first, then argue about the match.

None of these formats improves the price. A "crypto exclusive" written as 1.83 is the same contract as −120 once you convert. Shop the implied percent, not the costume.

A third drill (still not a live line): fractional 5/2 is decimal 3.50, American +250, implied about 28.6%. Fractional 1/4 is decimal 1.25, about −400, implied 80%. If a streamer mixes "plus money" with "four to one on" in the same sentence, stop and convert. Format confusion is how people think they found a bargain that was never there.`,
    },
    {
      id: "implied",
      title: "Implied probability and a worked two-way line",
      body: `The conversion you will use every session:

implied probability = 1 ÷ decimal odds

Or, as a percent: 100 ÷ D.

Illustration (not a live price): a best-of-three moneyline at 1.70 and 2.20.

- Team A: 1 ÷ 1.70 ≈ 58.8%.
- Team B: 1 ÷ 2.20 ≈ 45.5%.
- Sum: 104.3%. Overround ≈ 4.3%.

A $20 stake on A returns $34.00 if A wins, including stake, for $14.00 profit. A $20 stake on B returns $44.00. Those cash figures look attractive until you remember the book needs you to be wrong often enough to cover the extra 4.3 points and then some.

The longer maths lesson is [implied probability](/guides/implied-probability). The short version for an esports slip: converting every price you consider into a percentage stops you treating 1.40 favourites as "nearly free". A 1.40 price implies about 71.4% before you even ask whether the book is sharp.

### Removing overround, roughly

A simple proportional method: divide each implied chance by the sum. On the 1.70 / 2.20 illustration, 58.8 / 104.3 ≈ 56.4% and 45.5 / 104.3 ≈ 43.6%. That is a fair-split guess if the book is balanced. Other methods exist. You still have to bring your own view of the match, and most casual bettors do not have one that beats the market.`,
    },
    {
      id: "margin",
      title: "Overround, vig and why props cost more",
      body: `Overround is how far the implied chances in a market add up above 100%. Books also call the hold juice or vig. It is the book's analogue of a [house edge](/guides/house-edge). You can see it if you add. You can ignore it if you only look at one side.

Simple two-way moneylines on well-covered matches usually carry a tighter overround than a correct-score grid, a first-dragon prop or a seven-way tournament winner. That is not because props are "more skill". It is because the book needs a wider cushion when many outcomes can happen and the public loves a story.

| Market type (illustration) | Example prices | Implied sum | Extra over 100% |
| --- | --- | --- | --- |
| Two-way moneyline | 1.91 / 1.91 | 104.7% | 4.7 pts |
| Two-way, wider | 1.80 / 2.10 | 103.2% | 3.2 pts |
| Three-way map score 2–0 / 2–1 / other | 3.20 / 3.40 / 2.10 | ~119% | ~19 pts |

Those rows are teaching arithmetic. They are not a quote from a named book and they are not a suggestion to bet the tighter line. The habit is: add the market before you fall in love with one number.

Parlays stack vig. Four short-priced legs can look like a "safe" 5.00 while each price already has juice and the joint chance is the product of already-shaded numbers. Crypto settlement does not unstack that. If you cannot compute the combined implied probability, you are buying a story.`,
    },
    {
      id: "live",
      title: "Live prices move. The formula does not.",
      body: `In-play esports odds update after pistols, barons, leftover economy and pause time. The board can look like a skill test. The conversion stays the same: 1 ÷ D, then add the other side if you can still see it.

Live books often suspend. A freeze is not a lock. A price that reappears after a hidden round may already include information you did not see. Latency between the stream and the feed is a feature of the product, not a bug you can "beat" with a faster VPN. The dedicated [live esports betting](/guides/live-esports-betting) page covers that risk without pretending delay is an edge.

Cash-out buttons are just another shaded price. Compute the implied chance of the cash-out offer and compare it with the remaining market. A button that saves you from watching is often the book buying your ticket back at a worse number than the fair remainder.

Do not invent a "true" live percent from a health bar or a round score unless you can write the model. If you cannot write it, treat the live click as paid entertainment with an unknown extra cost.

A live 1.25 favourite implies 80% before you ask whether the book is sharp. That is still a full-stake loss when the favourite throws the next map. Short live prices feel like "locking it up". They are not locks. They are expensive tickets with less room for being slightly wrong.`,
    },
    {
      id: "vs-pvp",
      title: "A book price versus a hashed PvP payout",
      body: `A sports or esports ticket is a contract on an external event. You cannot recompute a map from a server seed. Your checks are: is the price good after vig, are the rules clear, can you withdraw?

A PvP round on this site is a contract on an internal random result. Your chance on [Coinflip](/coinflip) with a 0% fee is 50% at decimal 2.00. Your chance in Jackpot is your share of the pot. You can check the commit-reveal on the [fairness page](/fairness). Nobody is pricing an injury report.

Do not use a jackpot pot as a same-game parlay. Do not use a League moneyline as a coin. They fail in different ways. The book can be honest and you can still lose to the overround. The hashed game can be honest and you can still lose the flip.

If you opened this guide because a search mixed "esports odds" with this brand, that is the contrast to keep: we do not take your team. We take a hashed pot.`,
    },
    {
      id: "habits",
      title: "Habits that keep the arithmetic honest — and when to stop",
      body: `Write four columns before you click: posted decimal, implied %, your guess if you have one, and stake. If you cannot fill the implied column, you are not reading the price. If you cannot explain the market in one sentence, skip it.

- Convert every format to decimal, then to a percent.
- Add both sides of a two-way market. Write the surplus as a fee.
- Prefer markets whose rules you have read, especially handicaps and totals.
- Treat 1.40 favourites as ~71% shots, not as free money.
- Do not update implied chance after a streak of wins or losses. Past tickets do not rewrite 1/D.
- Do not treat a smaller probability gap as a smaller fee. A prop that looks "only 2 points wide" on a long shot can still be expensive in dollars.

Title pages in this cluster — League of Legends, Valorant, CS2, Dota 2, Rocket League — apply the same conversion to different props. The [esports betting sites](/guides/esports-betting-sites) checklist is how you judge the shop that printed the number. The [how to bet on esports](/guides/how-to-bet-on-esports) walkthrough is when to convert in the click sequence: after you can say the market in a sentence, before you type a stake.

Keep a four-column note for a week: posted decimal, implied %, overround if you can see the other side, stake. The sports rows will show juice. That note is a mirror, not a system for beating a book. If you will not fill the implied column, you should not click.

A long broadcast day will tempt you to skip the note. That is when the conversion matters most. One converted series winner is enough. A dozen unconverted props is how a $40 plan becomes a fog. Close the calculator when the budget is gone. The next price will be there tomorrow.

If the slip is the only reason the match is interesting, that is a warning sign. If converting odds has become a way to stay in the session, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). A calculator is a translation tool. It is not a reason to raise a stake.`,
    },
  ],
  faqs: [
    {
      q: "How do esports odds work?",
      a: "They are a bookmaker payout. Decimal odds show total return per $1. Implied probability is 1 divided by the decimal. When a market's implied chances add to more than 100%, the extra is the book's margin.",
    },
    {
      q: "What is a good esports odds format to learn first?",
      a: "Decimal. Convert American or fractional into decimal, then take the reciprocal. Formats do not change the bet; they only change the label.",
    },
    {
      q: "Are shorter prices safer?",
      a: "No. A 1.40 favourite implies about 71.4% before margin. You still lose the stake when the favourite loses, and you are paid a shaded price when it wins.",
    },
    {
      q: "Does PVPspinArena publish esports odds?",
      a: "No. It is not a sportsbook. It offers hashed player-versus-player Jackpot, Coinflip and Roulette.",
    },
    {
      q: "Why do prop odds look juicier than the moneyline?",
      a: "Because they usually carry a larger overround. More outcomes and a story-friendly market let the book shade each price further from a fair percent.",
    },
    {
      q: "Can I verify an esports price like a provably fair game?",
      a: "You can verify the arithmetic of 1/D. You cannot recompute the match from a casino seed. The event lives outside the book.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Odds (implied probability)",
      url: "https://en.wikipedia.org/wiki/Odds#Implied_probabilities",
    },
    {
      label: "Wikipedia: Mathematics of bookmaking",
      url: "https://en.wikipedia.org/wiki/Mathematics_of_bookmaking",
    },
    { label: "Esports Integrity Commission (ESIC)", url: "https://esic.gg/" },
  ],
  related: [
    "implied-probability",
    "odds-converter",
    "house-edge",
    "esports-betting",
    "esports-betting-sites",
    "live-esports-betting",
  ],
  updated: "2026-09-26",
  cta: {
    title: "This site is not a book",
    text: "PVPspinArena runs hashed PvP Jackpot, Coinflip and Roulette. It does not post team odds.",
    primary: { to: "/fairness", label: "Fairness" },
    secondary: { to: "/coinflip", label: "Coinflip" },
  },
};

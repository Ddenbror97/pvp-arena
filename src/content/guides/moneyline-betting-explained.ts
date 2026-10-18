import type { Guide } from "./types";

export const guide: Guide = {
  slug: "moneyline-betting-explained",
  cluster: "Sports betting",
  keyword: "moneyline betting explained",
  secondary: [
    "what is a moneyline",
    "plus minus odds",
    "moneyline vs spread",
    "American odds betting",
  ],
  title: "Moneyline Betting Explained: Plus and Minus",
  description:
    "Moneyline betting explained in American odds: plus and minus prices, implied chance, juice on both sides, and a worked $20 favourite versus underdog.",
  h1: "Moneyline betting explained: who wins, at plus or minus odds",
  answer:
    "Moneyline betting explained simply: you bet which side wins the game or listed period, at American plus or minus odds. Minus means a favorite you must risk more to win $100. Plus means an underdog that pays more than even money. The pair is juiced. PVPspinArena is not a sportsbook and does not post moneylines.",
  facts: [
    "A moneyline is a bet on who wins, not on a point handicap.",
    "American −150 means risk $150 to win $100. American +150 means a $100 stake wins $150.",
    "Implied chance is A/(A+100) on a minus price and 100/(A+100) on a plus price.",
    "Both sides together usually imply more than 100%. That surplus is vig.",
    "PVPspinArena does not take moneylines. It runs hashed PvP games and a wheel.",
  ],
  sections: [
    {
      id: "what",
      title: "What a moneyline is",
      body: `A moneyline is the oldest sports ticket in American slang: pick the winner, take the number next to the name. There is no 3.5 to cover. A one-point win cashes. A one-point loss does not. Overtime rules sit in the house text; read them once.

This [sports betting topic](/guides/topics/sports-betting) page is moneyline betting explained for adults 18+. No picks. [What is sports betting](/guides/what-is-sports-betting) is the pillar. [Point spread](/guides/point-spread-explained) is the handicap cousin.

Books also quote the same contract as decimal or fractional odds. The [odds converter](/guides/odds-converter) is the dictionary. American plus/minus is the costume this page stays in, because that is the keyword people type.

A listed period matters. Moneyline on the full game is not moneyline on the first half. A first-five-innings baseball ticket is not the final score. If the slip says “60 minutes” or “including overtime,” believe the slip. Moneyline betting explained badly is when someone cashed a mental full-game bet on a half ticket.`,
    },
    {
      id: "plus-minus",
      title: "Plus and minus American odds",
      body: `**Minus (favorite).** −A means you risk $A to win $100. Decimal = 100/A + 1.

- −110 ≈ decimal 1.909. Risk $110 to win $100.
- −150 ≈ decimal 1.667. Risk $150 to win $100.
- −300 ≈ decimal 1.333. Risk $300 to win $100.

**Plus (underdog).** +A means a $100 stake wins $A. Decimal = A/100 + 1.

- +100 is even money, decimal 2.00.
- +150 is decimal 2.50.
- +250 is decimal 3.50.

The sign is not a vibe. People blow first tickets by treating −150 as “plus money because it is a big number.” −150 is a favorite. You are laying a price.

Draw markets (soccer) add a third price. Three implied chances, still a sum over 100%. Do not price a three-way board as if it were a two-way coin.

Pick’em or “draw no bet” products are still moneylines with a different void rule. Read the rule. A voided draw is not a win. It is a refund or a reduction, depending on the book. People who say “moneyline is simple” usually skipped that sentence in soccer.`,
    },
    {
      id: "implied",
      title: "Convert the moneyline to a percent",
      body: `[Implied probability](/guides/implied-probability) from American odds:

- Minus A: A / (A + 100)
- Plus A: 100 / (A + 100)

**Illustration (not a pick):** Home −150, Away +130.

- Home implied: 150/250 = 60.00%.
- Away implied: 100/230 ≈ 43.48%.
- Sum: 103.48%. Overround ≈ 3.48%.

If you think Home is “about 60%,” you have matched the book’s minus price before juice removal — you have not found an edge. If you think Home is 55%, you are buying a short favorite you do not actually believe in. [Expected value](/guides/expected-value-gambling) is that comparison with dollars attached.

A fair two-way split would divide each implied chance by the sum. Rough fair Home ≈ 60 / 1.0348 ≈ 58.0%. That adjustment is a teaching tool, not a true chance from film study.

Write the percent on a sticky note next to the American number until you can do −130 and +110 in your head. −130 is 56.5%. +110 is 47.6%. If those two numbers do not appear before you tap, you are betting a font size. Moneyline betting explained is that habit, repeated.`,
    },
    {
      id: "worked",
      title: "Worked $20 favorite versus underdog",
      body: `**Illustration (not a pick):** you have $20 to put on one moneyline, Home −150 or Away +130.

| Choice | American | $20 stake returns if win | Profit if win | Loss if lose | Implied |
| --- | --- | --- | --- | --- | --- |
| Home | −150 | $33.33 | $13.33 | $20 | 60.00% |
| Away | +130 | $46.00 | $26.00 | $20 | 43.48% |

Home pays less because the book thinks Home wins more often. Away pays more because the book thinks Away wins less often. Neither column is a recommendation. Both already include juice in the pair.

If you split $10 and $10 on both sides “to be safe,” you have bought a Dutch that loses by construction: $10 at −150 returns $16.67 if Home wins (and the +130 ticket dies), or $10 at +130 returns $23 if Away wins (and the −150 ticket dies). You cannot lock a profit on a juiced two-way without a misprice. That is the hold working.

Do not run the same $20 through a hashed [Coinflip](/coinflip) and call it a moneyline hedge. A 2x flip is a different contract.

A second illustration: you want $20 profit on Home −150. Stake required = 20 × 150/100 = $30. Total return if you win = $50. If you instead put $30 on Away +130, profit if you win = $39. Same $30 risk, different payout, different listed result. Pick the result, then the stake. Do not pick the stake because $20 “fits the deposit.”`,
    },
    {
      id: "juice",
      title: "Juice on a two-way moneyline",
      body: `Heavy favorites hide juice in a short minus. Long underdogs hide juice in a plus that is not plus enough. The test is always the sum of implied chances, or a comparison with a sharp close.

**Illustration (not a pick):** −200 / +170.

- −200 implies 66.67%.
- +170 implies 37.04%.
- Sum 103.71%.

The favorite looks “safe.” Safe is not free. You are risking $2 to win $1 at a price that still embeds a fee. [How to win at sports betting](/guides/how-to-win-at-sports-betting) will not tell you to fade the favorite. It will tell you that most people who live on −200 tickets still lose because they do not win two of three forever.

[House edge](/guides/house-edge) is the casino vocabulary. Moneyline vig is the book vocabulary. Crypto cashiers do not delete it — [sports betting with crypto](/guides/sports-betting-with-crypto) is still a book.

Huge minus prices on mismatches are where recreational money goes to feel safe. −800 implies 88.9%. If the true chance is 85%, you are paying a short price for a story about a blowout. You can win that ticket ten times and still have a minus-EV process. [How to win at sports betting](/guides/how-to-win-at-sports-betting) will not tell you to fade the mismatch. It will tell you that “cannot lose” is juice bait.`,
    },
    {
      id: "when",
      title: "When people choose moneyline over spread or total",
      body: `Choose a moneyline when the listed result you want is “this side wins,” not “this side covers 3.5” or “they combine for 45.” 

Reasons that are about the contract, not a pick:

- You think a favorite wins ugly. The spread loses; the moneyline cashes.
- You want plus-money on an underdog outright, not +3.5 at −110.
- The sport has few points (soccer, baseball) and spreads are −1.5 run lines that are really a different product.

Reasons that are usually bad process:

- The moneyline is the first tile on the screen.
- You are stacking the same team’s moneyline and spread in a [parlay](/guides/parlay-betting-explained) without pricing correlation.
- You are laying −400 because “they cannot lose,” which is how juice harvests certainty.

[Over/under](/guides/over-under-betting) is the right ticket only if your opinion is about the total. Do not use a moneyline to express a totals opinion.

Live moneylines after a red card or an early injury are new prices. The pre-game −150 is gone. If you did not like −150, you may like +120 live, or you may be buying a panic number the book is happy to sell. Either way, convert it. A live plus is not automatically an underdog gift.

Hockey prices a 1.5-goal handicap off that moneyline. That handicap is the [puck line](/guides/puck-line). Baseball uses the same idea as the [run line](/guides/run-line).`,
    },
    {
      id: "contrast",
      title: "A moneyline is not a 2x coinflip",
      body: `| Contract | What must happen | Typical price | Verifiable from a seed? |
| --- | --- | --- | --- |
| Moneyline | Listed side wins | Juiced plus/minus | No |
| 0% fee Coinflip | Your committed side | 2.00 on 50% | Yes after reveal |
| Purple on this wheel | Colour hits | 2.00 on 48.48% | Wheel rules, not a team |

PVPspinArena will not take your moneyline. Watch [Roulette](/roulette) if you wanted a posted multiplier. Check [fairness](/fairness) if you wanted a reveal. Those are not “who wins the game” tickets.

Moneyline betting explained, on this site, is literacy. The book still has to exist somewhere else, where it is legal for you.

If you only wanted a 50/50 ticket with no stadium, that is a 0% fee flip between two players, not a −110 favorite. Do not force a moneyline vocabulary onto a hashed pot. The words plus and minus do not apply to a committed bit.

If you want even money on a true 50% event, that is a 0% fee flip, not a −110 side. If you want a favorite, you are buying a short price and you should be able to say why the implied 60% at −150 is too low. If you cannot say why, you are laying juice on a logo.

A last drill you can do without a book open: convert −110, −130, −150, +120, +150, +200 to implied percents. If any of those takes you more than a few seconds, you are not ready to shop two apps. Moneyline betting explained is finished when those six numbers are boring.

Answers for that drill, so you can check yourself: −110 ≈ 52.4%, −130 ≈ 56.5%, −150 = 60.0%, +120 ≈ 45.5%, +150 = 40.0%, +200 ≈ 33.3%. If you were off by more than a point, do the arithmetic again before the next slip.

Shop the same side on two legal books when you can. −140 and −155 are not “basically the same favorite.” Break-even moves from 58.3% to 60.8%. That gap is process. A logo is not process.

A moneyline is finished when you can say the listed result, the implied percent, and the dollars at risk in one breath. If any of those three is missing, close the slip. Literacy is the product on this page. The book is somewhere else. PVPspinArena will not print a plus or a minus on a team, and it will not turn a 2x colour into a moneyline just because the search mixed the words.`,
    },
    {
      id: "stop",
      title: "If minus prices are already a habit you cannot break",
      body: `Laying −200 every night because favorites “should win” is a fast way to turn over a bankroll at a hidden fee. If you cannot skip a slate, stop using strategy language.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Use the [responsible gambling](/responsible-gambling) page for tools and helplines.

Plus and minus are just how the price is printed. They are not a promise that the favorite is due.

If you cannot skip a minus-200 favorite three nights in a row, you do not have a moneyline process. You have a habit of laying juice on the logo you recognize. Break the habit or break the account.

Some cards are almost only moneylines. [UFC betting](/guides/ufc-betting), [boxing betting](/guides/boxing-betting) and [tennis betting](/guides/tennis-betting) price a winner, then hang method, round or retirement rules off that price.`,
    },
  ],
  faqs: [
    {
      q: "What is moneyline betting?",
      a: "A bet on which side wins, priced with American plus or minus odds (or the decimal equivalent). No point handicap.",
    },
    {
      q: "What does −150 mean on a moneyline?",
      a: "You must risk $150 to win $100, or $15 to win $10. It is a favorite price, not a plus-money price.",
    },
    {
      q: "What does +150 mean on a moneyline?",
      a: "A $100 stake wins $150 if that underdog wins. Decimal 2.50. Implied chance 40% before you ask whether that is fair.",
    },
    {
      q: "Why do both moneylines imply more than 100% together?",
      a: "Vig. The book shades both numbers. A fair pair would sum to 100%.",
    },
    {
      q: "Does PVPspinArena take moneyline bets?",
      a: "No. It is not a sportsbook.",
    },
    {
      q: "Is a moneyline better than a spread?",
      a: "Neither is better. One asks who wins; the other asks who covers a handicap. Pick the listed result that matches your opinion, then convert the price.",
    },
  ],
  sources: [
    { label: "Wikipedia: Moneyline odds", url: "https://en.wikipedia.org/wiki/Moneyline_odds" },
    {
      label: "Wikipedia: Mathematics of bookmaking",
      url: "https://en.wikipedia.org/wiki/Mathematics_of_bookmaking",
    },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "what-is-sports-betting",
    "point-spread-explained",
    "odds-converter",
    "implied-probability",
    "how-to-bet-on-sports",
    "house-edge",
    "head-to-head-betting",
  ],
  updated: "2026-09-26",
};

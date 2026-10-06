import type { Guide } from "./types";

export const guide: Guide = {
  slug: "parlay-betting-explained",
  cluster: "Sports betting",
  keyword: "parlay betting explained",
  secondary: ["what is a parlay", "accumulator bet", "same game parlay", "parlay odds vig"],
  title: "Parlay Betting Explained: Why the Vig Stacks",
  description:
    "Parlay betting explained: every leg already has juice, and the book compounds it. A three-leg illustration, same-game parlays, and why boosts are still prices.",
  h1: "Parlay betting explained: several legs, compounded juice",
  answer:
    "Parlay betting explained: you combine two or more bets on one ticket, and every leg must hit or the ticket loses. The posted payout looks large because the joint chance is small — and because each leg already had vig, which compounds when you multiply shaded prices. PVPspinArena is not a sportsbook and does not sell parlays.",
  facts: [
    "A parlay (accumulator) pays only if every leg wins. One miss voids the profit.",
    "Each leg is already juiced. Multiplying those prices stacks the hold.",
    "Same-game parlays add correlation the posted number may not pay you for.",
    "A boost is a new price with a sticker, not a waiver of compounded vig.",
    "PVPspinArena does not offer parlays. A Jackpot pot is not a four-leg ticket.",
  ],
  sections: [
    {
      id: "what",
      title: "What a parlay is",
      body: `A parlay is one stake on several listed results. All of them must happen. If any leg fails, the stake is gone (unless a leg voids under house rules, which usually reduces the ticket to the remaining legs).

This [sports betting topic](/guides/topics/sports-betting) page is parlay betting explained for adults 18+. No picks. [What is sports betting](/guides/what-is-sports-betting) is the menu. [How to bet on sports](/guides/how-to-bet-on-sports) still wants a first ticket to be one market you can say in a sentence. A four-leg same-game parlay is the opposite of that advice.

Books love parlays because they are easy to advertise and hard to price casually. The graphic shows a big decimal. The implied joint chance is 1 divided by that decimal — already worse than a fair multiply of fair singles.

Two legs is already a parlay. You do not need five. A two-leg ticket is easier to price and still compounds juice. If you cannot multiply two decimals, you cannot price six. Start at two or stay at singles. Parlay betting explained for beginners is permission to stop at one market.`,
    },
    {
      id: "looks-big",
      title: "Why the price looks generous",
      body: `Independent fair coins at 2.00 each, three of them, would pay 8.00 on a parlay. That is 7/1 profit, implied 12.5%. Real legs are not fair coins. They are −110 sides, −150 favorites, juiced totals. The book multiplies *its* prices, then often shades again.

If you multiply three 1.91 prices you get about 6.97. Implied joint chance ≈ 14.3%. Three fair 52.38% events would already be a different story than three 50% coins. You are not being paid 8.00. You are being paid the product of short numbers.

People read 6.97 and think “almost 7 to 1.” Decimal 6.97 is profit 5.97 to 1. The [odds converter](/guides/odds-converter) stops that mix-up. [Implied probability](/guides/implied-probability) stops the next one: 1/6.97 is the chance the *price* assumes, not the chance the games will cooperate.`,
    },
    {
      id: "compounds",
      title: "How vig compounds across legs",
      body: `This is the section the keyword is for.

**Illustration (not a pick):** three two-way sides, each −110 (decimal 1.909, implied 52.38%).

Fair-ish multiply if each were truly 50% and paid 2.00: 8.00.

Book multiply of the posted 1.909: 1.909³ ≈ 6.96.

| Ticket | Decimal | Implied joint | Versus 8.00 fair coins |
| --- | --- | --- | --- |
| Three fair 2.00 coins | 8.00 | 12.50% | baseline toy |
| Three −110 legs multiplied | 6.96 | 14.37% | you are paid as if the joint were *more* likely |
| Same three at a “boost” to 8.00 | 8.00 | 12.50% | still not three true 50% coins |

The 14.37% implied on 6.96 is higher than 12.50%. That means the payout is shorter than the fair-coin toy. You needed a *higher* joint chance for the price to be fair. Each 52.38% was already a juiced “almost coin.” Cubing it is how vig compounds.

If the true chance of each side is 50%, true joint (independent) is 12.5%, and you are paid 6.96, EV per $1 = 0.125 × 6.96 − 1 ≈ −$0.13, about −13%. That is much worse than the ~4.5% hold on a single −110. [Expected value](/guides/expected-value-gambling) is that multiplication. [House edge](/guides/house-edge) is the casino name. Parlays are how a small single-bet fee becomes a large ticket fee.

Independence was an assumption in the toy. Real games in one slate are not independent. That usually makes the posted number even less of a gift.

A second compound illustration: four −110 legs. Product ≈ 1.909^4 ≈ 13.3. Implied joint ≈ 7.5%. Four fair 50% coins would pay 16.00 and imply 6.25%. You are again being paid a shorter number than the fair-coin toy while the true joint, if each side is really 50%, is 6.25% — EV ≈ 0.0625 × 13.3 − 1 ≈ −$0.17 per dollar, about −17%. Adding a “free” fourth leg made the ticket worse, not more exciting in any dollar sense.`,
    },
    {
      id: "sgp",
      title: "Same-game parlays and correlation",
      body: `A same-game parlay (SGP) ties legs from one contest: a team [moneyline](/guides/moneyline-betting-explained), an [over](/guides/over-under-betting) and a player [prop](/guides/prop-bets-explained). Those legs move together. A blowout helps a favorite and a points over. A rainout wrecks a total and a passing prop.

Books use a pricing engine that tries to charge for that correlation. Recreational screens still show a tempting decimal. If you cannot write *why* the legs are worth more together than the engine thinks, you are the customer the engine was built for.

**Illustration (not a pick):** favorite moneyline + team over. When the favorite covers a large lead, the over is more likely. Paying you as if those were two random −110 tickets would be a gift. The book will not give that gift often. Compare the SGP price to the product of the singles. If the SGP is only a little worse than the product, you may be underpaid for correlation. If you cannot do that comparison, skip the tile.

[Esports betting](/guides/esports-betting) has the same SGP pattern on maps and totals. The vig logic does not change because the sport is on a server. Moving the number and taking a shorter price is a [teaser bet](/guides/teaser-bet), a different ticket from the parlay on this page.

If the SGP builder auto-adds a player prop you did not ask for, delete it. Those extras exist to raise the decimal on the graphic and to raise the miss rate. Parlay betting explained in product-design terms: the builder is a sales tool. Your job is to remove legs until you can multiply what remains.`,
    },
    {
      id: "worked",
      title: "Worked three-leg $10 illustration",
      body: `**Illustration (not a pick):** $10 parlay, three legs at decimal 1.83, 1.91 and 2.10.

1. Product: 1.83 × 1.91 × 2.10 ≈ 7.34.
2. If all hit, return ≈ $73.40, profit ≈ $63.40.
3. Implied joint: 1/7.34 ≈ 13.6%.
4. Single implieds: 54.6%, 52.4%, 47.6%. Product of implieds ≈ 13.6% — that identity is how the multiply works. It does **not** mean the true joint is 13.6%. Each implied was already high because of juice.
5. If any leg loses, −$10.

| Outcome | Result |
| --- | --- |
| All three hit | about +$63.40 |
| Any one miss | −$10 |
| One void, two hit | usually pays the two-leg product, not 7.34 |

That $63 is the ad. The −$10 on any miss is the process. Most three-leg tickets miss. That is not bad luck in a mystical sense. That is multiplication.

Do not “save” a two-of-three miss on [Roulette](/roulette). A 14x Green is not a consolation parlay.

If two of three hit and you are staring at the missed leg, that is the product working. The ticket required three. Grief about the miss is how the next slip gets a fourth leg “to make up for it.” Log the −$10 and stop. Consolation parlays are still parlays.`,
    },
    {
      id: "boosts",
      title: "Boosts are still prices",
      body: `Profit boosts, “50% more on this parlay,” and featured SGPs are marketing around a number. Compute the boosted decimal, then 1/D, then ask whether your honest joint chance is higher than that percent.

A boost from 6.00 to 7.50 looks kind. Implied moves from 16.7% to 13.3%. You still need a true joint above 13.3% after correlation and juice. [How to win at sports betting](/guides/how-to-win-at-sports-betting) will not treat a sticker as an edge.

If the boost requires extra legs, the book may have given you a higher decimal and a harder joint. Read the small print: which legs are frozen, whether ties void, whether live changes cancel the boost.

Insurance and “get one leg back” promotions have a price too. Sometimes the price is a worse decimal on the original ticket. Sometimes it is a max-payout cap. Convert the actual paid number, not the number in the commercial.`,
    },
    {
      id: "not-jackpot",
      title: "A parlay is not a Jackpot pot",
      body: `On PVPspinArena a [Jackpot](/) ticket is your share of a pot. Your chance is stake/pot. A 0% fee pot is about 0-EV between players. That is not a four-leg multiply. You cannot “parlay” colours into a jackpot and you cannot park an SGP on this domain.

| Product | How you get paid | Where the fee lives |
| --- | --- | --- |
| Parlay | All listed legs hit | Compounded vig in the product |
| Jackpot | You win the draw | Fee on the pot, if any |
| Coinflip | Your bit hits | Fee on the pot, if any |

[Sports betting with crypto](/guides/sports-betting-with-crypto) does not unstack a parlay. USDC settlement does not turn 6.96 into 8.00.

Round-robin tickets are parlays in a grid. You still pay compounded juice on every two-leg or three-leg combination. A round robin is not insurance. It is more tickets. Count the stakes before you admire the “coverage.”

Parlay betting explained, here, is why the big number is expensive. We will not take the ticket.

If a friend texts a five-leg “lock,” ask for five implied percents and the product. If they cannot produce the product, they sent a graphic. Graphics are not prices.

A last count-the-stakes illustration: a three-leg round robin of $5 two-leg parlays is three tickets, $15 total risk, not one $5 ticket. People miss that and think they “insured” a $5 opinion. They bought three juiced products. Write the sum of the slip before you confirm.

If you still want a parlay after that sum, keep it at two legs you can multiply on paper. Three and four are advertisements. Two is already compounded juice. That is the ceiling this page will endorse, and it is not an endorsement of plus-EV. A hashed Jackpot share is still not a two-leg. If you wanted a pot, use the pot. If you wanted legs, price the product. The graphic will always want one more leg. The math will not. Stop at the product you can multiply.

A leg that lands on the number and returns the stake is a [push](/guides/push-in-betting). A parlay does not treat that the same way a single does. Splitting the same legs into every smaller parlay is a [round robin bet](/guides/round-robin-bet).`,
    },
    {
      id: "stop",
      title: "If the next slip is always “one more leg”",
      body: `Adding a leg to raise the payout is the most common way parlays get worse. If you cannot place a single and walk away, the problem is not the converter.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Use the [responsible gambling](/responsible-gambling) page for helplines.

Vig compounds. So does chase behaviour. Only one of those is a maths lesson.

If you only remember one row from this page, remember the three −110 legs at 6.96 versus three fair coins at 8.00. That gap is the product. A sticker that says 8.00 does not make your legs fair coins.`,
    },
  ],
  faqs: [
    {
      q: "What is a parlay bet?",
      a: "One stake on two or more legs. Every leg must win or the ticket loses. The posted payout is the product of the leg prices, often with extra shade.",
    },
    {
      q: "Why do parlays have more vig?",
      a: "Each leg is already juiced. Multiplying juiced prices makes the joint payout shorter than a fair multiply of fair prices. A −13% toy EV on three −110 legs is the illustration, not a promise of your number.",
    },
    {
      q: "What is a same-game parlay?",
      a: "Legs from one contest on one ticket. Correlation is the extra issue. The engine tries to charge you for legs that move together.",
    },
    {
      q: "Do parlay boosts remove the juice?",
      a: "No. A boost is another posted decimal. Convert it to implied chance and compare it with an honest joint chance.",
    },
    {
      q: "Can I place a parlay on PVPspinArena?",
      a: "No. This site is not a sportsbook. A Jackpot share is not a multi-leg sports ticket.",
    },
    {
      q: "Is a two-leg parlay safer than a five-leg?",
      a: "It is easier to price and usually cheaper in compounded vig, but it is still a multiplied juiced ticket. Safer is the wrong word. Simpler is accurate.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Parlay (gambling)",
      url: "https://en.wikipedia.org/wiki/Parlay_(gambling)",
    },
    {
      label: "Wikipedia: Mathematics of bookmaking",
      url: "https://en.wikipedia.org/wiki/Mathematics_of_bookmaking",
    },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "what-is-sports-betting",
    "how-to-win-at-sports-betting",
    "moneyline-betting-explained",
    "expected-value-gambling",
    "implied-probability",
    "house-edge",
  ],
  updated: "2026-09-26",
};

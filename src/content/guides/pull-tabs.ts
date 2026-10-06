import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pull-tabs",
  cluster: "Games of chance",
  keyword: "pull tabs",
  secondary: [
    "pull tab tickets",
    "break opens",
    "charitable pull tabs",
    "pull tab odds",
    "pickle cards",
  ],
  title: "Pull Tabs: How Deals Are Printed, Odds and Payouts",
  description:
    "Pull tabs explained: how a deal is printed with fixed winners, typical 70–85% payouts, flares and leftover prizes, and how they differ from scratch cards.",
  h1: "Pull tabs: printed deals, payout percentages and how to read a flare",
  answer:
    "Pull tabs are instant tickets from a printed deal. Every winner is already in the box when the manufacturer seals it. You buy a ticket, pull the tabs, and match the flare. Payouts commonly return about 70 to 85 percent of sales as prizes, with the rest for the organiser. A late ticket in a depleted deal is a worse buy than an early one.",
  facts: [
    "A deal (or box) is a finite set of tickets printed with a known prize list; the flare on the jar shows that list.",
    "Also called break-opens, pickle cards, cherry bells or instant bingo, depending on the region.",
    "Charitable paper deals often target payouts in the 70–85% range; Minnesota's FY2024 charitable-gambling prize payout averaged 85.6% across game types, with pull-tabs the bulk of receipts.",
    "Unlike an independent RNG scratch, pulling a ticket from a thinning box changes the odds if big prizes are already gone.",
    "Electronic pull-tabs use a licensed cabinet and a digital deal; they are still a prize table, not a skill game.",
  ],
  sections: [
    {
      id: "what",
      title: "What pull tabs are",
      body: `Pull tabs are small paper tickets with perforated windows. You pay the posted price — often $0.25, $0.50 or $1 — peel or pull the tabs, and compare the symbols to the **flare**, the manufacturer's poster on the jar or dispenser. Matching a winning combination pays the amount printed for that combination. Most tickets pay nothing.

The product is a **deal**: a counted batch, sometimes a few hundred tickets, sometimes a few thousand, with a fixed number of each prize. When the deal is sold out, the prizes paid should match the flare. That is the whole design. It is closer to a sealed raffle than to a slot.

Names vary. Break-opens, pickle cards, cherry bells, Lucky 7s and instant bingo all point at the same family. Charity halls, veterans' clubs, some bars and some tribal venues sell them where the local charitable-gaming law allows. This page is the paper (and electronic) ticket. [Crypto scratch cards](/guides/crypto-scratch-cards) are the online foil skin; do not import a club-jar payout onto a bitcoin animation.

Pull tabs sit in the [Games of chance topic](/guides/topics/games-of-chance) with other priced tickets such as [quick pick](/guides/quick-pick-lottery) lottery draws and [bingo patterns](/guides/bingo-patterns). Adults only, 18+ or the local legal age.`,
    },
    {
      id: "deal",
      title: "How a deal is printed and why the flare matters",
      body: `A licensed printer produces the deal as a complete set. Serial numbers, ticket counts and the prize board are printed so a regulator can audit the box. The flare is not decoration. It is the paytable and the inventory:

- ticket price;
- number of tickets in the deal;
- each prize amount and how many tickets win that amount;
- sometimes a seal-card or progressive add-on with its own rules.

Because the winners are printed in advance, the organiser knows the **maximum prize out** and the **guaranteed hold** if the deal sells out. That is why charities like the product: the profit is on the flare before the first tab is pulled.

### Worked deal

A $1 deal of 3,980 tickets. The flare lists $3,000 in prizes. If every ticket sells:

- Gross receipts = $3,980
- Prizes = $3,000
- Payout percentage = 3,000 / 3,980 ≈ 75.4%
- Organiser remainder = $980 before rent, taxes and the cost of the deal itself

A manufacturer example in the 75% region is typical marketing for charity paper. Live deals vary. Some jurisdictions push payouts higher; some paper deals sit closer to 60–70%. The flare in front of you is the only honest number.

### Seal cards and last-sale prizes

Some deals add a seal or a "last ticket" bonus. Those prizes are still part of the printed economy. They change *when* a chunk of the prize budget is paid, not whether the box was minus-EV. A last-sale prize makes the final tickets more valuable if the seal is still unopened — which is the opposite of a deal whose top prize is already gone.`,
    },
    {
      id: "depletion",
      title: "Depletion: why the next ticket is not the same bet",
      body: `An independent RNG ticket is the same bet every time. A pull-tab deal is a **without-replacement** draw from a shrinking urn.

### Worked depletion

Start: 4,000 tickets, one $500 prize, 199 × $10, and 3,800 blanks. Price $1.

- Chance the first ticket is the $500: 1/4,000 = 0.025%. Contribution to EV from that prize: 0.00025 × $500 = $0.125.
- Suppose 2,000 tickets have been sold and the $500 is still in the jar. Chance the next ticket is $500: 1/2,000 = 0.05%, twice as high.
- Suppose the $500 has already been paid. Chance the next ticket is $500: 0. The remaining $10 winners, if 80 of 199 are left in 2,000 tickets, are 80/2,000 = 4%, versus the original 199/4,000 ≈ 5.0%.

Honest halls post which major prizes remain on a tally sheet, or they empty a deal in the open so you can see the board. Wikipedia's account of club practice matches that: when several large winners remain in a thin box, players buy; when the majors are gone, the organisation often retires the deal. If the top prize is gone and nobody updates the sign, you are buying a worse table than the flare implied at the start.

This is the opposite of "the big one is due." The big one is either still in the urn or it is not. There is no due. There is only inventory.

Electronic cabinets that shuffle a digital deal can be honest without-replacement machines, or they can refill. If the help screen says the game is a finite deal, ask how remaining prizes are displayed. If it is an independent draw each time, price it like a slot or a scratch, not like a jar.`,
    },
    {
      id: "payouts",
      title: "Payout percentages, charity maths and electronic tabs",
      body: `Paper charity pull-tabs are not trying to match a 96% casino slot. They are trying to leave a reliable remainder for the organisation after prizes. Published charity examples often sit near **75%** prizes. Arrow International has marketed charity pull-tabs around a 75% average payout. State reports can run higher when the mix includes high-pay electronic games.

Minnesota's Gambling Control Board reported FY2024 charitable-gambling **gross receipts of about $4.94 billion** and an **average prize payout of 85.6%** across permitted forms. Pull-tabs were about **95% of those receipts**. Paper pull-tab prize payout in that year was reported near **85.9%**. Those figures are statewide averages, not the flare on the jar in front of you, and they include electronic volume. Use them as a scale, not as your ticket's RTP.

### What 80% means in cash

$100 of tickets at an 80% prize rate returns $80 on average if you buy a representative slice of a sold-out deal. Buy only the last quarter of a deal whose $500 is gone and your slice can be much worse than 80%.

Compare that with PVPspinArena Roulette, where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. A charity tab is a donation machine with a lottery skin. That is a legitimate way to support a hall. It is a poor way to "invest."

### Electronic pull-tabs

States that allow them put the same idea on a screen: a licensed deal, a prize board, a faster tap. Expense ratios differ (cabinets cost more than paper), and some legislatures cap what a vendor may charge the charity as a share of net receipts. The player's price is still the prize board, not the cabinet art.

[Keno](/guides/keno-odds) is the other hall game with a published paytable and a house hold. Bingo's hold depends on the pattern and the prize board for the session. Pull tabs are faster and have no calling.

Paper and electronic tabs can sit in the same room and still be different prices. A paper jar with a 75% sold-out flare and a cabinet advertised at a higher prize rate are not interchangeable. Ask for the prize board on the cabinet the same way you read a flare. If staff cannot show it, you are buying a mood.`,
    },
    {
      id: "how-to-read",
      title: "How to read a jar before you buy",
      body: `1. **Read the flare.** Ticket price, ticket count, prize list. If any of those is missing, walk away.
2. **Check remaining large prizes.** If the hall tracks them, believe the board. If it does not, assume the worst prizes may already be gone.
3. **Compute a sold-out payout.** Sum of prizes ÷ (tickets × price). That is the deal's RTP if it sells out and you bought a random ticket at the start.
4. **Decide a dollar cap** before the first pull. Instant tickets exist to sell the next one while the last window is still in your hand.
5. **Do not chase a seal.** A seal-card bonus is one more printed prize, not a debt the jar owes you.

Buying ten tickets at once does not change the urn maths except by sampling ten draws without replacement. It is not a system. It is speed.

### Worked remaining EV

A $1 deal, 1,000 tickets left, one $250 and twenty $10 still unpaid, rest blanks. Expected prize on the next ticket = (250 + 200) / 1,000 = $0.45. You are paying $1 for 45 cents of average prize because most of the prize budget is already gone. The opening flare may have said 75%. This jar is no longer that jar.

Same 1,000 tickets left, but one $250 and eighty $10 still unpaid: EV = (250 + 800) / 1,000 = $1.05. That late slice is plus-EV relative to a $1 price — which is why halls that post remaining prizes see people buy when the board is fat and walk when it is empty. The deal as a whole is still minus-EV if it started that way; the remaining tickets are a different bet. You cannot run this calculation if the board is not public.

Counterfeit or leftover deals from an unknown seller are a separate fraud problem. Licensed charitable gaming uses serials and invoicing. A suitcase of tabs at a private party has no flare you can trust.`,
    },
    {
      id: "pvp",
      title: "Printed odds next to a hashed PvP round",
      body: `A pull-tab deal is honest when the printer, the flare and the remaining-prize board all match. The hold is still large. PVPspinArena runs three player-vs-player games in USDC or ETH on Base: Jackpot, [Coinflip](/coinflip) and [Roulette](/roulette). Coinflip is 50/50. Roulette returns 32/33, about a 7.88% Purple or Silver edge after the win fee. Jackpot chance equals your share of the pot. There is no printed urn of winners. Each result comes from committed seeds, and a settled round can be checked on [fairness](/fairness).

If the jar is already "one more, the red tab was close," the RTP discussion is finished. Use [responsible gambling](/responsible-gambling). Tickets are 18+ where the law requires it.

See also [punchboards](/guides/punch-board-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How do pull tabs work?",
      a: "You buy a ticket from a printed deal, pull the windows, and match the flare. Winning combinations and their counts are fixed when the deal is manufactured.",
    },
    {
      q: "What is the payout percentage on pull tabs?",
      a: "Charity paper deals often return about 70–85% of sales as prizes if the deal sells out. Some state averages, mixing paper and electronic games, sit near the mid-80s. Read the flare for the box you are in.",
    },
    {
      q: "Are pull tabs the same as scratch cards?",
      a: "Both are instant tickets. Pull tabs usually come from a finite printed deal whose remaining prizes can change the next-ticket odds. Many online scratchers are independent RNG rolls that do not deplete.",
    },
    {
      q: "Can you tell if the big prize is still in the jar?",
      a: "Only if the seller tracks remaining major prizes or you watched the deal from the first ticket. If the top prize is gone, later tickets are a worse bet than the opening flare implied.",
    },
    {
      q: "What is a pull-tab flare?",
      a: "The manufacturer's poster for that deal: price, ticket count and the full prize list. Sales and payouts are supposed to follow it.",
    },
  ],
  sources: [
    { label: "Wikipedia: Pull-tab", url: "https://en.wikipedia.org/wiki/Pull-tab" },
    {
      label: "Minnesota Gambling Control Board FY2024 annual report",
      url: "https://www.lrl.mn.gov/docs/2024/mandated/241658.pdf",
    },
    {
      label: "Arrow International: pull-tab tickets",
      url: "https://popp-opens.arrowinternational.com/pull-tabs",
    },
  ],
  related: [
    "crypto-scratch-cards",
    "bingo-patterns",
    "quick-pick-lottery",
    "keno-odds",
    "bingo-caller",
    "lucky-numbers-gambling",
    "punch-board-gambling",
  ],
  updated: "2026-09-27",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "scratch-off-odds",
  cluster: "Lottery",
  keyword: "scratch off odds",
  secondary: [
    "scratch off probability",
    "scratch ticket odds",
    "best scratch off tickets",
    "overall odds scratch off",
  ],
  title: "Scratch Off Odds: How to Pick Tickets That Pay Better",
  description:
    "How scratch off odds work, why price matters, how to read overall odds on the back and which scratch-off tickets give you the best real chance to win.",
  h1: "Scratch off odds are printed, and they are easy to misread",
  answer:
    "Scratch off odds are two different numbers printed around a ticket. Overall odds, such as 1 in 4, are the chance of winning any prize, including a prize that barely returns the price. Top-prize odds are a much longer count, often hundreds of thousands or millions of tickets per grand prize. A higher price often buys shorter overall odds and a larger top prize, and it still usually buys a negative expected value. The examples below are labeled illustrations, not a live game’s official card. Adults only. This is not a system.",
  facts: [
    "Overall odds count every winning ticket, including break-even prizes.",
    "Top-prize odds are prizes in the print run divided into tickets in the print run.",
    "You cannot recover expected value from overall odds alone. You need the prize mix.",
    "Prizes already claimed make the remaining game worse if the big prizes are gone.",
    "A crypto scratch card is a different product from a state scratch-off ticket.",
  ],
  sections: [
    {
      id: "two-numbers",
      title: "Overall odds and top-prize odds are not synonyms",
      body: `Scratch off odds on the back of a ticket usually lead with overall odds. If the line says 1 in 4.2, the lottery is saying that about 1 ticket in 4.2 in the original print run wins a prize of some size. The prizes include free tickets and small cash. The line does not say you have a 1-in-4.2 chance at the car or the six-figure prize.

### Where the top prize hides

The top prize has its own odds, sometimes on the back and always, in a better form, on the state lottery’s game page: how many top prizes were printed and how many remain. Those two integers are the combination count for that prize. If you only remember the overall number, you remember the easy win and forget the rare one.

These [Lottery guides](/guides/topics/lottery) rank scratch-offs against Powerball and Pick 3 on the [which lottery has the best odds](/guides/which-lottery-has-the-best-odds) page. Scratch-offs win the “any prize” column and lose the “this will change your life” column. Return to player, the share of sales a prize table sends back, is the idea on the [RTP](/guides/rtp-explained) page. State tickets rarely publish RTP in casino language. You rebuild it from prizes and tickets, or you accept that you do not know it.`,
    },
    {
      id: "worked-print-run",
      title: "Worked example: a labeled $10 ticket and a 3-prize run",
      body: `This game is an example so the division is visible. It is not a ticket in a store. Do not search for it by name.

Print run: 3,600,000 tickets. Top prizes: 3, each $200,000. Price: $10.

Top-prize combinations: 3 winning tickets out of 3,600,000.

Odds = 3,600,000 / 3 = 1 in 1,200,000.

Expected value of the top prize alone = 200,000 / 1,200,000 ≈ $0.17.

A $10 ticket that offers about $0.17 of top-prize value needs the rest of the prize table to do a lot of work. Suppose the back also says overall odds of 1 in 4. That means about 3,600,000 / 4 = 900,000 tickets win something. Almost all of those 900,000 are not the $200,000 prize. If you do not have the list of those prizes, you cannot add them up. Overall odds without a prize list are a frequency, not a value.

### What “pay better” can mean

A ticket pays better, in the only sense that survives arithmetic, when the sum of remaining prizes divided by remaining tickets is higher relative to the price. “I win something more often” is the overall-odds sense. Both phrases get used at the counter. Only the first one talks about money.`,
    },
    {
      id: "worked-remaining",
      title: "Worked example: claimed top prizes change the count",
      body: `Start a second example game. Print run 2,000,000 tickets. Top prizes at launch: 4. Launch odds of the top prize: 2,000,000 / 4 = 1 in 500,000.

Later, the state site says 3 of the 4 top prizes are claimed. Suppose half the tickets are still unsold, which is an assumption you would replace with whatever the site actually discloses. Remaining tickets in this sketch: 1,000,000. Remaining top prizes: 1.

Updated top-prize odds = 1,000,000 / 1 = 1 in 1,000,000.

The ticket got worse on the only prize that made the poster interesting, even if the overall-odds line on the back is still the original print. The back often does not update. The prize-remaining page does, when the lottery maintains one.

| Moment | Top prizes left | Tickets in the sketch | Top-prize odds |
| --- | --- | --- | --- |
| Launch | 4 | 2,000,000 | 1 in 500,000 |
| After the sketch | 1 | 1,000,000 | 1 in 1,000,000 |

| Figure on the ticket | What it counts | What it does not count |
| --- | --- | --- |
| Overall odds 1 in 4 | Any original winning ticket | The top prize by itself |
| Top prize 1 in 500,000 | The grand prizes at launch | Prizes already cashed later |

Unsold tickets are not proven to be a random half. A lottery may not even publish unsold counts, only prizes remaining. Use the integers they publish, say what you had to assume, and skip the game when the top prizes are gone and the price is still the launch price. That is the practical reading of scratch off odds.`,
    },
    {
      id: "price",
      title: "Why the price on the front changes the decision",
      body: `Higher-priced scratch-offs, the $20 and $30 cards, often print shorter overall odds than a $1 card. They also lock up more money per ticket and advertise larger top prizes. Shorter overall odds are a real improvement in how often some prize hits. They are not a real improvement you can bank until you compare prize money with price.

A $1 ticket at 1 in 5 overall odds risks $1. A $30 ticket at 1 in 3 risks $30. You can lose the $30 in a second, and the “better” overall odds mostly refer to small prizes, some of which equal the ticket price and return your stake with no gain. Break-even prizes make overall odds look friendly and do nothing for profit.

Ten $1 tickets cost $10. Ten $30 tickets cost $300. If both games print overall odds near 1 in 4, you are buying a similar hit rate and thirty times the stake. The expensive stack can lose $300 before the cheap stack has lost $10. “Better odds” that ignore the price are a slogan. Write both numbers, then decide what losing the stack would feel like.

Compare two games only after you write price, overall odds, top-prize odds, top prizes remaining, and the approximate prize fund if the site shows one. The game with the best overall odds can be the worst purchase per dollar. The game with the best top-prize odds can be a terrible overall ticket. Rank the column you mean.

Casino return percentages are a cousin of this arithmetic, not a scratch-off. The edge language is on the [house edge](/guides/house-edge) page. A state scratch-off is still a lottery product with a large built-in keep.`,
    },
    {
      id: "how-to-read",
      title: "How to read the back of the card",
      body: `Turn the ticket over before you treat the front as information.

Find the overall odds sentence and write the number down. Find any sentence that gives top-prize odds separately. Then open the state lottery’s page for that game number. Match the game number. A different $10 ticket is a different print run.

Look for prizes remaining, not just prizes at launch. If every grand prize is claimed, the ticket you are holding is the leftover prize table. Small prizes may remain in bulk. That can mean you still hit something and still lose money across a stack of tickets.

Ignore “due” racks and lucky clerks. Tickets in a stack are a shuffled print, not a sequence that owes the store a winner. Buying the last ticket in a roll is not a count. The count is prizes left and tickets left, and you rarely know tickets left exactly. When you do not know, you do not have a secret edge. You have a partial public report.

Crypto versions of a scratch card, with a different cashier and no state print run, are explained on the [crypto scratch cards](/guides/crypto-scratch-cards) page. Do not apply a state “1 in 4” line to a token game that never published a print run.`,
    },
    {
      id: "checklist",
      title: "Checklist for a better scratch-off purchase",
      body: `Better means less confused, not positive value. Most of these tickets are negative-value on purpose. The lottery keeps the rest to run the game and fund whatever the state assigned.

- Read overall odds and say out loud which prizes they include.
- Read top-prize odds as printed prizes divided by printed tickets.
- Open the official game page and note prizes remaining.
- If the top prizes are gone, decide again. The poster is stale.
- Write the price next to the overall odds. A shorter odds line at triple the price is not automatically better.
- Skip any method that uses past scratches to predict the next card.
- Buy at most the stack you already decided to lose.
- Do not “chase a due winner” with a second price tier.

Adults 18 and older. A 1-in-4 overall line is still a price for entertainment. It is not wages.`,
    },
    {
      id: "pvp-not-a-scratch",
      title: "A PvP pot is not a scratch-off print run",
      body: `PVPspinArena does not sell state scratch-off tickets and does not have a print run of grand prizes. Scratch off odds are a statement about a fixed pile of cards. A PvP Jackpot is a statement about a pot: your chance equals your contribution divided by that pot.

### No overall-odds line to misuse

There is no “1 in 4” printed on a player pot, and there should not be. If you put in 25 percent of the pot, you have 25 percent of that pot, not a 1-in-4 chance at an outside prize fund. When the round ends, the result is the pot, not a ticket you mail to a lottery. A posted fee, if the game lists one, is the cost. It is not a scratch-off prize table.

Check the round on [Fairness](/fairness). The pot is [Jackpot](/). The national combination games are a third thing again, with lists in the hundreds of millions. None of the three becomes a system because you learned to read a ticket back.

If scratching is a habit you hide, the next page is [responsible gambling](/responsible-gambling), not a more expensive ticket with friendlier overall odds.`,
    },
  ],
  faqs: [
    {
      q: "What do overall scratch off odds mean?",
      a: "Overall odds are the chance of winning any prize in the original print run. A line that says 1 in 4 means about one ticket in four wins something, and that something can be a free ticket or a prize equal to the price. It is not the chance of winning the top prize. Read the top-prize line separately.",
    },
    {
      q: "Do more expensive scratch-offs have better odds?",
      a: "They often have shorter overall odds and larger top prizes. A $30 ticket at 1 in 3 hits some prize more often than a $1 ticket at 1 in 5, and it risks thirty times the money. Better hit rate is not better expected value. Compare remaining prizes with the price before you call the expensive ticket the smart one.",
    },
    {
      q: "Should I buy a game after the top prizes are claimed?",
      a: "Only if you still like the leftover prize table at that price. If 3 of 4 top prizes are gone and half the tickets remain, a launch odds line of 1 in 500,000 can become something like 1 in 1,000,000 on the prize that mattered. The back of the ticket may still show the launch number. Check the state site.",
    },
    {
      q: "Can I calculate the value from overall odds alone?",
      a: "No. Overall odds tell you how often a ticket wins, not how much it wins. Expected value needs each prize amount times how many of those prizes were printed, divided by the number of tickets, then compared with the price. Without the prize mix, a 1-in-3 ticket can be a worse buy than a 1-in-5 ticket.",
    },
    {
      q: "Are scratch-off results due after a cold streak?",
      a: "No. A stack of tickets is not a sequence that owes the next buyer a winner. Past scratches at one store do not change the prizes left in the print run. The public facts that matter are prizes remaining and, when the lottery shows it, some measure of tickets left. Anything else is a story.",
    },
  ],
  sources: [
    { label: "North American Association of State and Provincial Lotteries", url: "https://www.naspl.org/" },
    { label: "Mega Millions", url: "https://www.megamillions.com/" },
    { label: "Powerball", url: "https://www.powerball.com/" },
  ],
  related: [
    "which-lottery-has-the-best-odds",
    "crypto-scratch-cards",
    "rtp-explained",
    "odds-of-winning-the-lottery",
    "house-edge",
  ],
  updated: "2026-10-06",
};

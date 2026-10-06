import type { Guide } from "./types";

export const guide: Guide = {
  slug: "keno-vs-bingo",
  cluster: "Casino games",
  keyword: "keno vs bingo",
  secondary: ["keno or bingo", "bingo vs keno odds", "keno house edge", "bingo card cost"],
  title: "Keno vs Bingo: Draw, Pace, Edge and Cost",
  description:
    "Keno vs bingo: both draw numbers, but the ticket, the pace, and the house edge are different products. See which cost you are actually paying.",
  h1: "Keno vs bingo: draw, pace, edge and cost",
  answer:
    "Keno vs bingo compares two number draws that are sold as different products. Keno is a ticket you mark, settled against a fixed draw and a paytable. Bingo is a printed card, settled when a pattern hits, and paid from the pool of card sales. The pace and the house edge do not match, so the cost you feel is not the same cost.",
  facts: [
    "Classic casino keno draws 20 numbers from 80. You mark spots on a ticket, and a paytable pays the catch.",
    "A common American bingo card is a 75-ball, 5 by 5 grid with a free center. Calls continue until a card completes the pattern.",
    "Some bingo variants use 80 or 90 balls. Sharing a pool of 80 numbers does not turn that game into keno.",
    "Many casino keno paytables keep on the order of 20 percent to 40 percent of the stake. The exact edge is on the sheet in front of you.",
    "Bingo's cost is the hall's hold on card sales. Prize fund divided by sales is the figure that matters, and it is not a keno paytable.",
    "Video keno can settle in seconds. A bingo coverall waits through many calls. Speed multiplies whatever edge the product already has.",
  ],
  sections: [
    {
      id: "products",
      title: "Two draws that are not the same product",
      body: `### Two contracts

Both games draw numbers in public and pay if your paper matches. The purchase is different, and the purchase is the game.

In keno you buy a ticket and choose how many spots to mark on a field that is classically 1 to 80. The house draws a fixed set, classically 20 numbers. Your result is how many of your spots sit inside that set. A printed paytable turns each catch into a payout. You are betting against that table.

In bingo you buy a card whose numbers are already printed. You do not build the card spot by spot, unless a house is selling a player-selected variant it advertised as such. Someone calls numbers until at least one card completes the pattern for that session. The prize is a share of what the room paid for cards, after the hall or the charity takes its cut. You are betting against the other cards, inside a pool.

This comparison lives in the [casino games topic](/guides/topics/casino-games). It does not pick a winner for you. It separates the draw, the pace, and the price so you can see which bill you are paying. Adults only. Set a limit before you buy the first ticket or the first card, and treat money you cannot lose as already spent on something else.`,
    },
    {
      id: "draw",
      title: "A fixed keno draw versus calls until a pattern",
      body: `Keno's draw has a known length before the first ball. Twenty numbers out of eighty is the classic casino card. When the twentieth number is up, every ticket on that game is finished. A ticket that caught nothing loses. A ticket that caught the count its row requires is paid at the price on the sheet. There is no extra ball because the room is bored, and there is no early stop because someone yelled.

Bingo's draw has a stopping rule instead of a fixed length. The caller keeps going until the pattern appears on a card in play. A single line on a 75-ball card ends sooner than a coverall on the same card. A room with hundreds of cards ends sooner than a room with twenty, because more cards are racing the same calls. The draw is still random. The length is a function of the pattern and the number of cards.

The catch math for a keno ticket is a hypergeometric count: how many ways to catch k of your n spots inside a 20-ball draw from 80. That arithmetic, and the way a paytable short-pays it, is the subject of [keno odds](/guides/keno-odds). This page does not repeat the table. What matters for the comparison is that the keno draw is finished on a schedule, and the bingo draw is finished by a pattern.`,
    },
    {
      id: "ticket",
      title: "The ticket you mark versus the card you are given",
      body: `A keno ticket is a list of spots and a stake. You choose the spot count. One spot, four spots, and ten spots are different wagers because the paytable rows are different, not because the draw becomes kinder. Marking a birthday is allowed. It does not change the chance of any particular catch relative to any other set of the same size. The house is paid through the payouts, not through a tax on which numbers you prefer.

A bingo card is a grid you accept. The common American card is 5 by 5 under the letters B-I-N-G-O, with the center free, so 24 numbers sit on the paper. Columns are sliced out of 1 to 75. You daub when your number is called. You do not get to swap a 12 for a 40 after the caller starts. The pattern in force, a line, a postage stamp, a coverall, is chosen by the session, not by you mid-call.

That is as far as this page goes into shapes. The menu of patterns, and how long each kind of shape tends to take, is [bingo patterns](/guides/bingo-patterns). Buying more cards raises your chance of holding the card that hits first. It also raises the amount you paid into the pool. It does not change the caller's draw.`,
    },
    {
      id: "pace",
      title: "Pace: a closed draw versus a waiting room",
      body: `Pace is how often you pay the edge. It is not a mood.

A live keno game that draws 20 numbers can still cycle several times an hour. Video keno and instant keno remove the wait. A ticket every few seconds is a different purchase from a ticket every few minutes, even when the paytable is identical. The edge is a percentage of stake. Stake per hour is the dial you turn when you speed the game up. Players feel this as "I was only betting a dollar." The machine counts dollars per minute.

Bingo is slower because the product waits for a pattern. A line game with a full room is a handful of calls and a short gap while cards are sold for the next game. A coverall is a long draw by comparison. You cannot make a coverall finish in the time of a four-spot keno ticket without changing the pattern or filling the room with cards. Session bingo is often organized as a sitting: a set of games, a break, another set. You buy in for the sitting more than for a single six-second decision.

The practical difference is the number of decisions. Keno asks you to mark, stake, and accept a paytable many times. Bingo asks you to buy cards and then daub. There is little to decide once the caller starts, other than whether you missed a number. Missed daubs are a real way to lose a bingo you had. They are not a strategy. They are attention.`,
    },
    {
      id: "edge",
      title: "Where the house edge actually sits",
      body: `Keno's edge is inside the **paytable**. Each catch has a true chance. A fair payout would return the stake divided by that chance. Commercial sheets pay less than fair on the rows players actually hit, and they advertise the rare row. Many casino sheets land around a 20 percent to 40 percent keep. A simple honesty check, worked on the keno odds page, is the one-spot ticket: the true hit rate is 20 out of 80, which is 25 percent, so a fair payout is 4 times the stake. A sheet that pays 3 times on that hit keeps 25 percent on the simplest ticket in the game. Your sheet may differ. Read the row. Do not import a number from a different casino and call it yours.

Bingo's edge is the hall's hold: prizes divided by card sales. A session that sells 1,000 dollars in cards and pays 700 dollars in prizes keeps 30 percent. A hall that pays 900 on the same sales keeps 10 percent. Charity rules in many places push a large share toward prizes or the charity. That split is local. There is no national bingo edge to memorize.

| | Keno | Bingo |
| --- | --- | --- |
| What you buy | Spots you mark, paid by a catch chart | A printed card in a shared pool |
| When it ends | After a fixed draw, often 20 of 80 | When a card completes the pattern |
| Where the price sits | Payouts below fair catch odds | Prizes as a share of card sales |

Eighty-ball bingo still ends on a pattern. The shared number 80 does not make it keno.`,
    },
    {
      id: "cost",
      title: "Which cost you are actually paying",
      body: `Write the cost in money per session, not in feelings about numbers.

For keno, cost is about stake times edge, times the number of tickets. At a 25 percent edge, a dollar ticket costs about 25 cents in expectation. Forty of those tickets are about 10 dollars of expected loss. Expected loss is the average, not a receipt for one night. Birthdays do not change it. Spot-count choice, which row of the paytable you buy, is covered on [keno strategy](/guides/keno-strategy). This page does not restate a betting system.

For bingo, cost is card price times how many cards you buy, times the hold, with prize splits on top. A door fee plus a card price is two bills, so add them. A one-dollar card in a room that returns most of the sales as prizes costs less, in expectation, than a one-dollar card in a room that keeps a third. Buying twenty cards multiplies the outlay and your claim on the prize, until two of your own cards split it. Read whether the prize is a guaranteed amount or a percentage of sales. If the counter cannot show the paytable or the prize total, skip the buy. A jackpot in large type does not replace the hold. Video keno hides the price because each stake looks small, so write tickets per hour beside the edge before you sit down.`,
    },
    {
      id: "choose",
      title: "How to tell the games apart in the room",
      body: `Use a short checklist at the counter.

- Paper with spots you select and a catch chart: keno. The draw length is fixed. The edge is the paytable.
- Paper with a printed grid and a pattern on the wall: bingo. The draw length follows the pattern and the crowd. The edge is the prize split.
- A screen that lets you click spots every few seconds: keno at video pace. Multiply the edge by how many clicks you intend to make, and then cut that number to what you can lose.
- A caller and a stack of cards for a sitting: bingo at session pace. Your decision is how many cards, and whether the printed prizes justify them.
- A game that uses 80 numbers and still ends when someone completes a shape: bingo, even if the ball count reminds you of keno.

[Crypto bingo](/guides/crypto-bingo) is a payment and venue variant of bingo, not a third draw. If the card, the pattern, and the prize pool are bingo, a crypto cashier does not turn the hold into a keno paytable. Read the prize rule in the same way you would on paper.

If gambling is no longer a planned spend, stop and use the limits, time-outs, and help links on the [responsible gambling](/responsible-gambling) page. Switching from keno to bingo, or the other way, does not reset a loss. It buys a different product with a different clock. The clock is the part people underestimate. Name it, name the hold, and buy only the paper whose price you just calculated.`,
    },
  ],
  faqs: [
    {
      q: "Do you pick your own numbers in both keno and bingo?",
      a: "In classic keno, yes. You mark spots on a ticket and the house draws a fixed set, often 20 from 80. In classic bingo, no. The card is printed, and you daub numbers as they are called until a pattern is complete. A variant that lets you build a card should say so before you pay.",
    },
    {
      q: "Why does keno often cost more than it looks?",
      a: "The price is in the paytable. True catch rates are often paid below fair odds, and many casino sheets keep roughly 20 percent to 40 percent of the stake. A one-spot that pays 3 times on a 25 percent hit keeps 25 percent by itself. Read your sheet. A different casino's poster is not your edge.",
    },
    {
      q: "Is bingo always slower than keno?",
      a: "Bingo lasts until the pattern hits, so a coverall takes many more calls than a single line. Live keno still finishes after a fixed draw. Video keno is faster than either, because you can buy the next ticket in seconds. The percentage edge applies to every one of those tickets.",
    },
    {
      q: "Do extra bingo cards change the draw?",
      a: "They change how many cards you have in a shared draw. They do not change the caller's procedure. More cards raise your chance of holding the winner and raise what you paid. They can also split a prize. Extra keno tickets are separate bets against the paytable, not a bigger share of one pool.",
    },
    {
      q: "If both games use 80 numbers, are they the same?",
      a: "No. Keno pays a ticket you marked, using a catch chart, after a fixed draw. Eighty-ball bingo still uses printed cards and ends when a pattern or full house hits, with the prize coming from card sales. The ball count is not the product. The paper and the payout rule are the product.",
    },
  ],
  sources: [
    { label: "Wikipedia: Keno", url: "https://en.wikipedia.org/wiki/Keno" },
    {
      label: "Wikipedia: Bingo (American version)",
      url: "https://en.wikipedia.org/wiki/Bingo_(American_version)",
    },
    { label: "Wikipedia: Bingo", url: "https://en.wikipedia.org/wiki/Bingo" },
  ],
  related: ["keno-odds", "keno-strategy", "bingo-patterns", "crypto-bingo"],
  updated: "2026-09-29",
  howTo: false,
};

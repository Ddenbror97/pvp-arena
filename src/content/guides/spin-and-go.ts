import type { Guide } from "./types";

export const guide: Guide = {
  slug: "spin-and-go",
  cluster: "Poker",
  keyword: "spin and go",
  secondary: [
    "spin and go multiplier",
    "jackpot sit and go",
    "three handed hyper turbo",
    "spin poker prize",
    "spin and go strategy",
  ],
  title: "Spin and Go Poker: Multipliers, Rake and Strategy",
  description:
    "Spin and go poker draws a multiplier, then deals a short table. How fees, prize math, and push-fold decisions fit on one three-handed sheet.",
  h1: "Spin and go poker: multipliers, rake, and strategy",
  answer:
    "Spin and go poker is a three-handed sit and go that draws a prize multiplier before the cards, then plays a fast blind structure until the places are paid. The common low multiplier often pays the winner a small multiple of one buy-in. Rare high multipliers pay much more. The gap between money collected and prizes returned is the cost of the format, whether the client shows it as rake or hides it in the table. Read that table. This page does not copy a live frequency list.",
  facts: [
    "A spin format draws the prize first, then deals. You cannot choose the multiplier after you see your cards.",
    "Three players is the usual field. When one busts, the rest is heads-up.",
    "A 2× line often means the winner gets twice one buy-in, not twice the whole pot. Confirm the wording.",
    "High multipliers are rare by design. The posted table, not a highlight clip, is the distribution.",
    "PVPspinArena does not run spin and go events. Its roulette wheel is a different 33-slot game.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "A multiplier, then a very short tournament",
      body: `Spin and go is a brand name players also meet as jackpot sit and goes, spin and gold, or twister, depending on the room. The shared shape is small. Three players register. A random draw sets the prize. Blinds rise quickly. Someone wins the posted prize, and sometimes second place is paid when the multiplier is large enough that the lobby says so.

You learn the prize before you play a hand, or as the first animation finishes, and you cannot redraw it because your cards were bad. The poker is real: blinds, position, and folds. The lottery is also real: most results cluster on the small multipliers, and the screenshot people post is the rare one.

This [poker](/guides/topics/poker) article is for adults 18 or older. Format neighbors are [sit and go poker](/guides/sit-and-go-poker), [cash game poker](/guides/cash-game-poker), and [poker staking](/guides/poker-staking). It is not legal advice. Rooms offer this format under their own terms. This guide will not say where it is legal, and it will not print today's odds from a named client. Open the multiplier table in the software you use. If a line on that table disagrees with a sentence here, the table wins.

[Texas Hold'em strategy](/guides/texas-holdem-strategy) is the grammar of the streets. Spin formats compress it. You may see twenty hands, not two hundred. Push-or-fold decisions show up early because the blinds climb while the stacks stay small. Studying an hour-long cash session and then sitting a spin is how people call off too light "to see a flop" that costs the tournament.

The format is still player versus player. You are not spinning a slot that deals no cards. You are playing two opponents for a prize the draw already set.`,
    },
    {
      id: "multipliers",
      title: "Read the multiplier table before you care about aces",
      body: `Every serious client posts a list: each multiplier, what it pays, and whether second place gets anything. Some lists also show how often each line is drawn. If yours shows frequencies, copy them into your notes. If it does not, you do not know the distribution, and no article can honestly invent one for you.

Wording is a trap. "2×" can mean the winner receives twice their own buy-in. It can, on a badly worded screen, be misread as twice the three buy-ins combined. Those are different prizes. Suppose the entry is $10. Twice one buy-in is $20 to the winner. Twice the combined $30 is $60. You must know which sentence your client uses before you judge whether a win was good or merely small.

Higher lines change the payout shape. A line that pays only the winner makes second place worth zero. A line that pays second makes busting in third much more expensive than losing heads-up. Look at the drawn multiplier every time. Playing a 2× winner-take-all the same way you play a multiplier that pays two places ignores the lobby.

If the table is hidden behind an animation and never listed as numbers, the price is missing. Do not buy a spin seat with a blank ladder.`,
    },
    {
      id: "fee",
      title: "Where the rake sits in the spin",
      body: `Three players pay an entry. The prizes they can win are set by the multiplier table. Across many games, the operator keeps the difference between entries collected and prizes paid. That difference is the hold. Some lobbies also peel an explicit fee off each entry and then apply the multiplier to what remains. Some quote a single buy-in and bury the hold inside the ladder. Both are prices. The label "rake" may or may not appear. Your job is to see the price, not to win an argument about the word.

Suppose the client is explicit. Entry $10. A 2× result pays $20 to the winner and nothing to second. Three players have paid $30. The winner receives $20. On that common spin, $10 does not go back to the table. A rare 10× result that pays $100 sends out more than the $30 collected. The frequent small results fund the rare large ones, and the operator's hold is whatever is left after the whole distribution, not the leftover on one 2× game alone. This Suppose is a picture of the shape. It is not PokerStars', GG's, or anyone else's current percentage. If your 2× line pays a different amount, use that amount.

[Rakeback explained](/guides/rakeback-explained) matters if the room rebates part of the hold. A rebate on spins can differ from a rebate on cash games. Read the deal. A percent without a base is not a number you can spend.

[House edge](/guides/house-edge) is the cousin idea for games where you face a pay table instead of two people. In a spin, you face both: a posted prize ladder you cannot outplay, and two opponents you can. Your edge, if you have one, is winning more than your share of the games. You do not have an edge on the draw itself. Everyone in the seat gets the same ladder.`,
    },
    {
      id: "two-dollars",
      title: "Two Suppose dollars, then stop forecasting",
      body: `Dollar example 1, one spin. Suppose the entry is $15 and the drawn line says winner takes $30, which is 2× one entry. You win. Profit = $30 − $15 = $15. You lose. Loss = $15. There is no second-place consolation in this Suppose. The other two players also paid $15. Together the table paid $45 and the winner took $30. Do not generalize the $15 leftover on this one spin into "the rake is one third." The leftover on a 2× spin is not the long-run hold, because other multipliers pay more. Read the full table for the hold. Use this example only to see a single result in dollars.

Dollar example 2, a short log you should not worship. Suppose you play 12 entries at $15. Suppose the client paid $30 on each win, and you won 4 of the 12. Money back = 4 × $30 = $120. Money spent = 12 × $15 = $180. You are down $60. Suppose instead you won 5. Money back = $150. You are down $30. Suppose you won 6. Money back = $180. You are even before any higher multiplier appeared. Four, five, and six wins in twelve games are all ordinary noise on a three-handed table. None of them is your win rate. The exercise stops you from calling four wins "I run good at spins."

| Suppose result | Paid in | Paid out to you | Net |
| --- | --- | --- | --- |
| Win a 2× at $15 entry | $15 | $30 | +$15 |
| Lose that same spin | $15 | $0 | −$15 |
| Four wins in twelve spins | $180 | $120 | −$60 |
| Six wins in twelve spins | $180 | $180 | $0 |

| Question | Where the answer is |
| --- | --- |
| What does 2× pay? | The multiplier row, in money |
| Does second get paid? | That same row |
| How often is each row? | The posted frequency, if they publish one |
| Is there a separate fee? | The buy-in breakdown in the lobby |`,
    },
    {
      id: "strategy",
      title: "Push, fold, and the heads-up that arrives fast",
      body: `With three players and rising blinds, many decisions are all-in or fold. A small raise that commits you if someone reshoves is an all-in that leaked information. Decide first whether you are willing to play for the tournament. If you are, put the chips in. If you are not, fold. Limping a short stack is donating the blind structure.

Ranges are wider than a full ring because fewer players remain and the blinds are a large fraction of the stack. That does not mean you shove every button. A caller who never folds punishes junk. One spin is not a read.

The moment one player busts, you are heads-up. [Heads-up poker strategy](/guides/heads-up-poker-strategy) earns its keep here more than in a slow nine-max. The button is powerful, stacks are shallow, and giving up the blind every orbit is how a chip lead dies. If the multiplier pays only first, you are playing for the whole prize. If it pays second, you already locked something when the third player busted, and crazy flips give some of that lock back. Look at the drawn prize before you celebrate the bust.

Position, stack in big blinds, and the payout row. Those three beat a memorized hand chart that ignored the multiplier. Charts can still help for jam-or-fold spots if you know the chart's assumptions. A chart built for a 2× winner-take-all is the wrong chart for a prize that pays a ladder. Check the assumptions the way you check the lobby.`,
    },
    {
      id: "wheel",
      title: "A prize ladder is not a 33-slot wheel",
      body: `People hear "spin" and think of a wheel. PVPspinArena's roulette is a wheel. It has 33 slots: 16 Purple, 16 Silver that pay 2x, and 1 Green that pays 14x. Five percent is taken from winning payouts. After that fee, a Purple or Silver bet faces about a 7.88% edge. You are betting against the house. There is no opponent to fold out, and there is no three-handed poker after the ball drops. See it on [Roulette](/roulette) if that is the game you meant.

A spin and go multiplier is a prize list glued to a poker tournament. The draw is shared by the three players. Then Hold'em decides who takes the list. The hold may be large. It is still not the same math as a 33-slot wheel, and practicing one does not train the other. Jackpot and Coinflip on this site take 5% of the pot once and finish. They do not climb blinds. They do not draw a 10× ladder. Do not deposit on a poker client because you liked a wheel, or on a wheel because you liked three-handed poker.

Separate three columns: entry paid, poker result, and the multiplier that was drawn. Remembering only the jackpot makes the next entry feel owed. It is not. The last 2× does not entitle you to a different draw.`,
    },
    {
      id: "checklist",
      title: "Checklist before you buy the entry",
      body: `Read this checklist against the open lobby.

- I am 18 or older. This article is not legal advice and not a frequency chart.
- I can say what the drawn multiplier pays in dollars, including second place if it pays.
- I know whether 2× means twice one buy-in or something else, because I read the row.
- I can see a separate fee if the client prints one. If it does not, I still know the hold lives in the ladder.
- The entry is an amount I can lose for a long run of small multipliers.
- My plan for three-handed play is push or fold when stacks are short, not a slow cash-game line.
- I will look again when it becomes heads-up, and I will not treat a house wheel as practice for this.

Spin and go poker is a fast three-handed tournament with a random prize on the front. Multipliers set the dollars. The rake or hold is the price of those dollars. Strategy is shallow-stack poker against two people, then one.

If the table of multipliers is not on your screen, you are not ready to pay. Wait until it is. The animation can keep spinning for someone else.`,
    },
  ],
  faqs: [
    {
      q: "What is a spin and go multiplier?",
      a: "It is a prize factor drawn before or as the game starts. A low multiplier usually pays a small multiple of the buy-in to the winner. High ones pay more and are less common. Read the posted table rather than a clip of a jackpot.",
    },
    {
      q: "Does 2× mean I win twice the whole pot?",
      a: "Often 2× means twice one player's buy-in, so three people pay in and the winner receives two buy-ins. Some screens word this badly. Read the dollar amount on the row, not just the little x.",
    },
    {
      q: "Where is the rake in a spin and go?",
      a: "Either as a printed fee, or inside the gap between entries collected and prizes paid across the multiplier table. This page will not quote a room's current percent. Use the lobby.",
    },
    {
      q: "What strategy fits three-handed spins?",
      a: "Short stacks should shove or fold instead of making small raises that commit them anyway. When one player busts, switch to heads-up ranges. Check whether second place is paid before you flip for the rest.",
    },
    {
      q: "Is PVPspinArena roulette a spin and go?",
      a: "No. Roulette here is a 33-slot house wheel, 16 Purple, 16 Silver at 2x, 1 Green at 14x, with 5% taken from winning payouts. There are no hole cards and no multiplier ladder.",
    },
  ],
  sources: [
    { label: "Wikipedia — Poker tournament", url: "https://en.wikipedia.org/wiki/Poker_tournament" },
    { label: "Wikipedia — Poker", url: "https://en.wikipedia.org/wiki/Poker" },
  ],
  related: [
    "sit-and-go-poker",
    "cash-game-poker",
    "poker-staking",
    "heads-up-poker-strategy",
  ],
  updated: "2026-10-07",
};

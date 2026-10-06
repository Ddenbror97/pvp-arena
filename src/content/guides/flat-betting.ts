import type { Guide } from "./types";

export const guide: Guide = {
  slug: "flat-betting",
  cluster: "Games & odds",
  keyword: "flat betting",
  secondary: ["flat betting system", "constant stake", "level stakes", "flat betting roulette"],
  title: "Flat Betting: Constant Stakes Versus Progressions",
  description:
    "Flat betting means a constant stake every decision. Compare it to Martingale and Labouchere, see bankroll longevity, and why the house edge still applies.",
  h1: "Flat betting: a constant stake, longer sessions and the same edge",
  answer:
    "Flat betting is the simplest staking rule: the same amount on every decision, win or lose. It is a system in the sense that it removes mid-session invention. It is not an edge. Expected loss tracks house edge times dollars wagered. The practical gain versus progressions is longevity and a result distribution you can actually budget, because the next stake never explodes.",
  facts: [
    "Flat betting keeps the stake constant; only the number of bets and the stop rules change.",
    "On a minus-EV game, expected loss ≈ edge × total amount wagered, progression or not.",
    "A 100-unit bankroll at 1 unit a bet survives far more decisions than the same roll under Martingale.",
    "Kelly sizing applies when you have a positive edge; it is not a licence to vary a minus-EV stake.",
    "The useful part of any named system is usually the stop, not the raise.",
  ],
  sections: [
    {
      id: "what",
      title: "What flat betting is",
      body: `Flat betting means you pick a unit before the session and you do not change it because the last result was a win or a loss. If the unit is $2, the next bet is $2 after a miss and $2 after a hit. You may still stop. You may still walk. You do not let the notepad, the Fibonacci step or a “due” feeling pick the next number.

That is the whole rule. It looks too plain to be a system, which is why brochures skip it. It is the baseline every progression should be scored against. If a ladder cannot beat a constant unit on the same total dollars, the ladder is entertainment, not arithmetic.

### What it is not

- It is not a claim that the next spin is independent — though that claim is true, and [gambler’s fallacy](/guides/gamblers-fallacy) is the usual argument against it.
- It is not the [Kelly criterion](/guides/kelly-criterion). Kelly changes the fraction of bankroll as the estimated edge and the bankroll change. On a house game the estimated edge is negative, so full Kelly says bet nothing.
- It is not “betting small”. A flat $200 is still flat. Longevity is measured in units, not in the sticker on the chip.

The [Games and odds topic](/guides/topics/games-and-odds) is full of named ladders. Flat betting is the control group. PVPspinArena is 18+.`,
    },
    {
      id: "compare",
      title: "Constant stake versus the named progressions",
      body: `Write the same 2x bet, same p, same dollars of action. Only the *order* of stake sizes changes.

| Plan | After a loss | After a win | Typical shape |
| --- | --- | --- | --- |
| Flat | same unit | same unit | many moderate results |
| [Martingale](/guides/martingale-strategy) | double | reset | many small pluses, rare wipeout |
| [Paroli](/guides/paroli-system) | reset | raise, often to a 3-win cap | many −1 unit cycles, rare pyramid |
| [d’Alembert](/guides/dalembert-strategy) | +1 unit | −1 unit | slow climb, incomplete repair |
| [Labouchere](/guides/labouchere-system) | append the loss | cancel two numbers | booked small targets, fat unfinished lines |

None of these plans changes p or the payout. They allocate the same taxed dollars to different moments. Negative progressions put extra dollars on the table after you are already losing. Positive progressions put extra dollars on the table after you are already winning. Flat betting refuses the argument and pays the edge at a constant size.

### Worked order effect

Five-bet tape on a 2x colour, unit $1: L, L, W, L, W.

- Flat: −1 −1 +1 −1 +1 = −$1. Five dollars of action.
- Martingale starting at $1: −1, −2, +4, −1, +2 = +$2 on $10 of action — this particular order paid. Swap the last W for an L and the same plan is already in a hole looking at $2, $4, $8.
- Labouchere 1-2-3: first stake is $4, so this five-bet window is a different experiment entirely.

Order luck is not a theorem. The brochure always shows the order that flatters the ladder. Flat betting makes the brochure boring, which is the point.`,
    },
    {
      id: "longevity",
      title: "Bankroll longevity and risk of ruin",
      body: `Longevity is how many decisions a bankroll can fund before it can no longer place the next bet. Progressions spend that budget on a few large tickets. Flat betting spends it on many small ones.

### Units, not dollars

$200 at $10 a bet is 20 units. $200 at $2 a bet is 100 units. Ruin talk is in units. The [risk of ruin](/guides/risk-of-ruin) guide is the formula page; this page is the staking consequence.

On a fair even-money bet, starting with i units and aiming for N, P(ruin) = 1 − i/N. Twenty units aiming to double (N = 40) has a 50% chance of dying first. The same 20 units under a Martingale that doubles from 1 can die in a handful of losses: 1+2+4+8+16 = 31 already exceeds 20, so five misses ruin you. Probability of five opening misses on a fair coin is 1/32 ≈ 3.1% *per start*, and you take many starts.

On Purple, q = 17/33. Five opening misses: (17/33)^5 ≈ 3.6%. The extra slots make the Martingale wreck more common. Flat $1 on the same 20-unit roll is still slowly leaking about 3.03% per dollar before the win fee, but the session usually ends because you chose a time or loss cap, not because five reds ate the stack.

### Expected leak versus time at the table

A 100-bet flat session at $1 on Purple has expected loss ≈ $3.03 before the win fee and a standard deviation around $10 (even-money variance is order 1 per bet, so √100 = 10). Finishing +$10 or −$20 is ordinary. A Martingale session that “wins $1 eight times then dies” can print +$8 then −$20 on the ninth start. Same edge per dollar; different chance you are still in the room after an hour.

If the goal is a long sitting with a known hourly cost, flat is the plan that makes the hourly cost visible. If the goal is a small advertised plus with a hidden tail, that is Martingale marketing.`,
    },
    {
      id: "edge",
      title: "The edge does not care that the stake is flat",
      body: `House edge is a percentage of amount wagered. Flat, ladder or pyramid, the mean is edge × turnover.

On [Roulette](/roulette), Purple and Silver pay 2x with 16/33 hits. Return is 32/33 ≈ 96.97%, edge 3.03% before the win fee. One hundred flat $2 bets turn over $200 and expect to leak about $6.06. One hundred messy Labouchere dollars expect to leak the same $6.06. The Labouchere path may finish +$6 on a completed line or −$80 on a wreck; the average of those stories still tracks the $13.

### Why people still raise

Raising after a loss is usually an attempt to get even in one bet. Raising after a win is usually an attempt to “press a streak”. Both treat the next independent trial as if it had a memory. A constant stake is the behaviour that matches the maths: the next trial is the same price as the last one.

A positive-edge player is a different animal. A card counter or a plus-EV sports bettor *should* vary the stake with the edge and the bankroll. That is Kelly or a fraction of Kelly, and it is not what this page is about. On a posted house game the edge is against you on every posted bet, so varying the stake is varying how fast you pay it.

### Stops are not raises

The useful “system” hiding inside flat betting is a pair of written stops:

1. a loss cap in units (for example, 20 units);
2. a time or decision cap (for example, 50 bets or 40 minutes).

Those stops cut exposure. They do not create an edge. They are the same stops a progression player should have written and usually did not.`,
    },
    {
      id: "size",
      title: "How to pick the unit",
      body: `Pick the unit from the bankroll, not from the last win.

- **Session bankroll**, not net worth. The money on the table is the money you can lose tonight without touching rent.
- **Units of comfort.** A common entertainment range is 50–100 units in the session stack, so a $100 sitting implies $1–$2. Twenty units is already a short fuse on a Purple or Silver bet.
- **Match reality.** On [Coinflip](/coinflip) the other player has to accept the size. A “flat” $50 that nobody will fade is a sitting-out rule, not a staking plan.
- **Jackpot shares** are not even-money units. A [Jackpot](/) ticket’s win chance equals your share of the pot. Flat-staking jackpot entries means repeating a chosen ticket size, not pretending each entry is a 2x coin.

The [bankroll calculator](/guides/bankroll-calculator) is the tool page for sizing. This page is the reason the tool asks for a constant unit.

If a $2 unit already feels like it must be recovered tonight, the unit is too large. Flattening the stake does not flatten the mood. Use the limits and help links on the [responsible gambling](/responsible-gambling) page. Gambling is 18+ and optional.`,
    },
    {
      id: "pvp",
      title: "Flat units on hashed PvP rounds",
      body: `PVPspinArena runs three player-vs-player games. The same constant-stake idea maps cleanly onto two of them and loosely onto the third.

- **Roulette.** Purple or Silver is the even-money canvas. Write $X a spin, write a 20-unit stop, and let the 7.88% Purple or Silver edge be the visible hourly price. Green is a 14x long shot; a “flat” green unit is a different variance product, not a colour-betting system.
- **Coinflip.** Two players, 50/50, winner takes the pot minus any fee shown before entry. Flat means repeating a size you can lose several times, not pressing after a miss because “it has to flip”.
- **Jackpot.** Win chance equals your share of the pot. Repeating a ticket size is honest. Building a cancellation line on ticket sizes is not.

Results come from committed seeds. After a sitting, any settled round can be checked on [fairness](/fairness). Verification answers “was this tape honest?” It does not answer “should I have raised?” The honest tape plus a constant unit is the clean experiment: count how many units left after 30 decisions. That number, not a brochure pyramid, is what a Purple or Silver bet costs.

Prestige XP on [prestige](/prestige) tracks wager volume. A flat unit still writes XP as you play; it just refuses to let volume spike because the last spin missed. If you want a rule because it stops you inventing stakes, keep the rule and skip the folklore ladder.

A last comparison in units: thirty flat $1 Purple bets expect to leak about $2.00. Thirty dollars put through a 1-2-3 Labouchere line can finish as five booked $6 targets or as one wreck. The mean is still the edge on the dollars that actually went down. Flat betting is the plan that makes that sentence visible before you sit.`,
    },
  ],
  faqs: [
    {
      q: "What is flat betting?",
      a: "A constant stake on every decision, chosen before the session. Wins and losses do not change the next amount. Stops still apply; raises do not.",
    },
    {
      q: "Is flat betting a winning system?",
      a: "No. On a house game the expected result is still minus the edge times dollars wagered. Flat betting only keeps that cost visible and stops the stake exploding.",
    },
    {
      q: "Why do progressions feel more exciting?",
      a: "They cluster large bets on short sequences, so you see either a quick recovery or a pyramid. That lumpier path is variance, not a better mean.",
    },
    {
      q: "How many units should I bring?",
      a: "For entertainment on a minus-EV even-money bet, 50–100 units in the session stack is a common range. Twenty units is a short fuse, especially on a Purple or Silver bet.",
    },
    {
      q: "Is Kelly the same as flat betting?",
      a: "No. Kelly varies the fraction of bankroll with a positive estimated edge. On a posted house game the edge is against you, so Kelly’s answer is not to bet.",
    },
    {
      q: "Can I flat-bet Green on PVPspinArena Roulette?",
      a: "You can repeat a constant Green stake. That is a 14x long shot at 1 in 33, not an even-money system. The edge on that dollar is about 57.6% before the win fee.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: betting systems",
      url: "https://wizardofodds.com/gambling/betting-systems/",
    },
    {
      label: "Wikipedia: Martingale (betting system)",
      url: "https://en.wikipedia.org/wiki/Martingale_(betting_system)",
    },
    {
      label: "Encyclopaedia Britannica: gambling",
      url: "https://www.britannica.com/topic/gambling",
    },
  ],
  related: [
    "labouchere-system",
    "paroli-system",
    "martingale-strategy",
    "risk-of-ruin",
    "bankroll-calculator",
    "kelly-criterion",
  ],
  updated: "2026-09-27",
};

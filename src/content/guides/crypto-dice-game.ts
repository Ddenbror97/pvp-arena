import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-dice-game",
  cluster: "Games & odds",
  keyword: "dice game crypto",
  secondary: ["crypto dice", "dice bitcoin", "roll under dice", "dice rtp"],
  title: "Dice Game Crypto Guide: Odds, Edge and Verification",
  description:
    "How a dice game crypto bet works: roll-under odds, house edge, over/under, and how to check a provably fair result after the roll.",
  h1: "Dice game crypto: roll-under odds, edge and verification",
  answer:
    "A dice game crypto bet is a house-banked roll against a number you choose. You pick roll-under or roll-over, the site quotes a win chance and a payout, and a generator returns a value on a 0 to 100 scale. The payout is set a little below the true odds so every target carries the same house edge. After the roll you can, on a serious site, recompute the result from the seeds.",
  facts: [
    "Most crypto dice games produce a number from 0.00 to 99.99 and let you bet roll-under or roll-over a target.",
    "A common house edge is 1%, which means a 50% target pays about 1.98x instead of 2.00x.",
    "Win chance and payout move together: raise the target payout and the quoted chance falls by the same factor.",
    "Provably fair dice mix a server seed, a client seed and a nonce, then map the hash onto the roll.",
    "PVPspinArena does not offer a dice game; it runs Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "what",
      title: "How a crypto dice bet is built",
      body: `Forget two physical cubes. Instant dice on a crypto casino is a slider. You choose a number, choose whether the roll must land under or over it, and stake.

### The usual scale

The generator returns a value in [0, 100), often shown to two decimals. Roll-under 50 means you win if the result is 0.00 to 49.99. Roll-over 50 wins on 50.00 to 99.99. Some UIs use 0 to 10,000 internally and display a percentage. The idea is the same.

### Why the slider exists

Changing the target is how the game offers every payout from a hair over 1x up to thousands. You are not unlocking a better bet. You are sliding along one house-edge curve. That curve is the same trade as crash targets in our [crash gambling guide](/guides/crash-gambling), except the result is instant instead of a rising multiplier.

### House-banked, not PvP

The site is the bank. Other players’ rolls do not fund your win. That is the opposite of [Coinflip](/coinflip), where two stakes form a pot and a 50/50 bit decides the winner. Dice can look like a coin flip when you park the slider at 50, but the payout is not 2.00x if an edge is built in.`,
    },
    {
      id: "odds",
      title: "Roll-under odds and a worked payout table",
      body: `Start from a fair game, then put the edge in.

On a 0–100 scale, a fair roll-under t would win with probability t/100 and pay 100/t. Roll-under 25 would pay 4x. Roll-under 50 would pay 2x.

A house edge e reduces the payout (or shrinks the winning range) so that:

expected return ≈ 1 − e

A common design keeps the win chance equal to the slider and short-pays:

payout ≈ (1 − e) / p

where p is the win probability.

### Worked 1% edge table

| Roll-under | Win chance | Fair payout | Paid at 1% edge | EV per $1 |
| --- | --- | --- | --- | --- |
| 2 | 2% | 50.00x | 49.50x | $0.99 |
| 10 | 10% | 10.00x | 9.90x | $0.99 |
| 25 | 25% | 4.00x | 3.96x | $0.99 |
| 49.5 | 49.5% | 2.020x | 2.00x | $0.99 |
| 75 | 75% | 1.333x | 1.320x | $0.99 |
| 90 | 90% | 1.111x | 1.100x | $0.99 |

Every row returns 99 cents on the dollar. The 90% line wins constantly and still leaks 1%. The 2% line looks like a jackpot and still leaks 1%. That identity is [expected value](/guides/expected-value-gambling) in one table.

### Roll-over is the mirror

Roll-over (100 − t) has the same chance as roll-under t if the scale is symmetric. Sites sometimes display a 0.01 gap so both sides cannot cover the whole range; that gap is another way to collect the edge. Read the quoted chance, not the poetry of “over” versus “under”.`,
    },
    {
      id: "edge",
      title: "Where the house edge hides",
      body: `Operators advertise “1% house edge” because the number is easy to sell. It is still a cost on every roll, and dice is one of the fastest games ever built.

### Total wagered, not deposit

One hundred $1 rolls are $100 of action. Auto-roll at ten bets a second can turn a $20 balance into thousands of dollars wagered before you notice the clock. At 1%, $2,000 wagered has an expected cost of $20, which is the whole deposit. Our [house edge guide](/guides/house-edge) is blunt about this: the edge multiplies by volume.

### Edges that are not 1%

Some skins use 2%, 3% or a “bonus dice” with a worse curve. Some pay a pretty 2.00x on a chance that is 49% rather than 50%. Always invert the quote:

implied return = quoted chance × quoted payout

If that product is 0.97, you are on a 3% game no matter what the banner says.

### Limits cap the tail

A 1,000x slider setting is worthless if the max profit is $100 and you staked $1. Read max profit the way you would read a table limit. It is part of the price.`,
    },
    {
      id: "verify",
      title: "How to verify a provably fair roll",
      body: `Dice is the easiest house game to verify, which is why it became the demo for [provably fair casino](/guides/provably-fair-casino) design.

### The usual recipe

1. The site commits to a server seed by showing you its hash before you bet.
2. You set a client seed, or accept a default.
3. Each roll increments a nonce.
4. The site computes HMAC-SHA256(server seed, client seed:nonce) and turns the digest into a number in range.
5. After you rotate the server seed, the raw seed is revealed. You recompute the HMAC and the mapping.

If the recomputed roll matches the history, that roll was not swapped after you clicked. Our [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) shows the building blocks.

### What verification does not do

It does not raise RTP. It does not prove the next roll is “due”. It does not turn dice into a PvP pot. It answers one question: did this published function produce this published number?

### When the verifier is theatre

If you cannot change the client seed, cannot see the nonce, or cannot run the function outside the site, treat the badge as marketing. Check a few historical rolls with an independent script before you trust a lobby.`,
    },
    {
      id: "strategy",
      title: "Dice “strategy” is just a variance slider",
      body: `Forums fill with roll-under 2 scripts, martingale-on-49.5 scripts, and “wait for a red streak then flip to over”. None of those change the product in the table above.

### Low chance, high payout

You will see long losing runs. That is the binomial tail, not a broken generator. Our [dice roll probability guide](/guides/dice-roll-probability) is the combination-count version of the same idea.

### High chance, low payout

You will win most rolls and still bleed. A 90% shot at 1.10x feels safe and is still 1% negative if that is the edge.

### Martingale on the 50 line

Doubling after a loss on a 2x-ish dice bet is the same ruined martingale as on red. A finite balance meets a finite limit. See [martingale strategy](/guides/martingale-strategy).

If you play dice elsewhere, set a roll count and a loss limit first. If stopping is already hard, use the [responsible gambling](/responsible-gambling) tools and our [how to stop gambling guide](/guides/how-to-stop-gambling).

### Scripts and “conditionals”

A bot that rolls under 2 until three misses, then flips to over 98, is still picking two rows from the same 1% table. Conditions on past rolls do not change the next expectation. They only change how the screenshot looks when a tail hit finally lands. If a vendor sells a script with a win-rate graph, ask for the product of chance and payout on every branch. If they cannot write it, they do not have an edge. They have a filter on lucky clips.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer dice",
      body: `There is no roll-under slider on this site. The live games are Jackpot, Coinflip and Roulette.

That is not because dice is mysterious. It is because we already publish a 50/50 PvP duel and a colour wheel whose edge you can count from the slots. Dice would be another house-banked RNG curve.

### Closest live substitutes

- Want a 50/50 you can explain in one sentence? Use [Coinflip](/coinflip). Two equal stakes, one HMAC bit, fee shown, default 0%.
- Want a published payout row? Use [Roulette](/roulette). Seven purple, seven silver, one green.
- Want to recompute a result? Use the [Fairness page](/fairness).

The [games and odds topic](/guides/topics/games-and-odds) collects the maths for those live games. Use this page only to price a dice slider you meet on another cashier.

A 50/50 PvP flip that pays the pot at a 0% fee is a different object from a 49.5% slider that pays 2.00x. Both can be verified with HMAC. Only one of them returns 100 cents on the dollar in expectation. If you came to dice because it looked like a coin, use the actual coin. The slider is a house curve wearing a cube icon.`,
    },
    {
      id: "session",
      title: "A worked 200-roll session",
      body: `Numbers beat slogans. Take a 1% edge slider and a $1 stake for 200 rolls.

### Slider at 49.5 under (about 2.00x)

- Expected hits: about 99.
- Expected return: about $198.
- Typical path: clusters of wins and a few four- or five-loss dips. A martingale through those dips needs $16 after four losses and $32 after five, which is how a $40 balance dies on a “safe” line.

### Slider at 10 under (about 9.90x)

- Expected hits: about 20.
- Expected return: still about $198.
- Typical path: a dozen misses in a row is ordinary (0.90^12 ≈ 28%). The session can sit at $40 for a long time and then print two hits.

### Slider at 90 under (about 1.10x)

- Expected hits: about 180.
- Expected return: still about $198.
- Typical path: you win constantly and still finish near the same $198, unless a short miss streak plus a raised stake punches a hole.

Three personalities, one price. If you cannot name the slider and the roll cap before the first click, you are not running a session. You are feeding volume to a 1% pump. Speed is not a feature; it is how a small edge becomes a deposit. If you need a number on the note besides the slider, write rolls per minute times minutes times stake times edge. Ten rolls a second is not a flex. It is a cost formula with the seconds filled in.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `A dice game crypto bet is a roll against a target on a 0–100 scale. Payout and win chance move in lockstep so that every slider position carries the same house edge, often 1%. Fast auto-roll applies that edge to a huge turnover. Provably fair dice lets you replay the HMAC after a seed rotate; it does not make the bet +EV.

PVPspinArena does not offer dice. If you want a result you can check and a stake that sits in a player pot or a counted wheel, use Coinflip, Jackpot or Roulette instead of a slider.

A scored five-dice game with the same pips is [Farkle](/guides/farkle-rules).`,
    },
  ],
  faqs: [
    {
      q: "How does a crypto dice game work?",
      a: "You pick roll-under or roll-over and a target. The site quotes a win chance and a payout below true odds, then generates a number on a 0 to 100 scale. If the number lands on your side, you are paid the quote.",
    },
    {
      q: "What is a typical dice RTP?",
      a: "A 1% house edge is a 99% RTP. Some skins are worse. Multiply the quoted chance by the quoted payout; that product is the RTP of the slider position you are using.",
    },
    {
      q: "Does changing the target beat the edge?",
      a: "No. A higher payout is a lower win chance. On a well-built table every target returns the same expected amount per dollar.",
    },
    {
      q: "How do I verify a dice roll?",
      a: "After the server seed is revealed, recompute HMAC-SHA256 with your client seed and the nonce, map the digest to the 0–100 range, and compare it with the recorded roll.",
    },
    {
      q: "Does PVPspinArena have a dice game?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This guide explains dice so you can check a roll-under game elsewhere.",
    },
    {
      q: "Is crypto dice the same as craps?",
      a: "No. Instant crypto dice is a single number against a slider. Craps is a two-dice table game with its own bets and edges. See the combination counts in the dice roll probability guide.",
    },
  ],
  sources: [
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
  ],
  related: [
    "crypto-jackpot",
    "dice-roll-probability",
    "mines-game-casino",
    "limbo-game-strategy",
    "crash-gambling",
    "farkle-rules",
  ],
  updated: "2026-09-26",
};

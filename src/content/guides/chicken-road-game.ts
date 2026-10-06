import type { Guide } from "./types";

export const guide: Guide = {
  slug: "chicken-road-game",
  cluster: "Game shows",
  keyword: "chicken road game",
  secondary: [
    "chicken road casino",
    "chicken road rtp",
    "chicken road difficulty",
    "inout chicken road",
    "chicken road predictor",
  ],
  title: "Chicken Road Game: Levels, RTP and Scam Apps",
  description:
    "Chicken Road game by InOut Games: Easy to Hardcore difficulty, the 98% RTP claim, per-step odds, cashout maths and why predictor apps are a scam.",
  h1: "Chicken Road game: difficulty levels, RTP and scam-app warnings",
  answer:
    "The Chicken Road game is a step game from InOut Games. You pick Easy, Medium, Hard or Hardcore, then walk a chicken along a road of hidden traps and cash out after any safe step. Each extra step raises the multiplier and the chance of dying. Many operators list a 98% RTP; always read the in-game panel. Predictor apps do not work.",
  facts: [
    "Chicken Road is an InOut Games title from 2024: a solo step ladder, not a shared crash flight.",
    "Four difficulties — Easy, Medium, Hard, Hardcore — change step count, per-step death chance and the multiplier curve.",
    "Commonly published mode parameters use 24, 22, 20 and 15 steps with roughly 1, 3, 5 and 10 traps in a 25-cell model.",
    "Marketing copy often quotes a 98% RTP; some writeups claim harder modes pay less. Trust the live help screen.",
    "Telegram and APK 'Chicken Road predictors' cannot see the next trap. They are scams or malware.",
  ],
  sections: [
    {
      id: "what",
      title: "What the Chicken Road game is",
      body: `Chicken Road is a cartoon step game: you stake, you choose a difficulty, and you tap to send a chicken one tile further along a road. A safe tile multiplies the stake. A trap ends the round at zero. You may cash out after any safe step. There is no shared flight and no public crash point climbing in real time the way [Spaceman](/guides/spaceman-game) or [JetX](/guides/jetx-game) do. The genre neighbour is [crash gambling](/guides/crash-gambling) plus ladder games such as mines: one hidden layout, many optional stops.

The studio is InOut Games. The title spread through crypto and instant-win lobbies in 2024. Operators often show a demo. Real-money play is for adults, 18+ or the local legal age. The game sits in the [Game shows topic](/guides/topics/game-shows). If you already play mines, the decision is the same shape: stop on a known multiplier or tap one more hidden cell. Mines hides bombs on a grid; Chicken Road hides traps on a line. Neither layout is visible in advance.

A round, in order:

1. Choose a stake and a difficulty.
2. The server (or the client seed pair, if the operator exposes one) fixes which tiles are traps.
3. Each tap reveals the next tile. Survive and the multiplier on screen updates.
4. Cash out to lock stake × current multiplier, or tap again.
5. Hit a trap and the stake is gone.

You cannot see remaining traps. You only see how far you have already walked. That is the whole product.`,
    },
    {
      id: "levels",
      title: "Easy, Medium, Hard, Hardcore: what actually changes",
      body: `Difficulty is not a cosmetic skin. It changes three numbers: how many steps sit on the road, how likely each step is to kill you, and how fast the multiplier grows.

Reviews and operator help screens commonly describe a 25-cell model:

| Difficulty | Steps on the road | Common trap model | Approx. death chance per step | Published max multiplier (order of) |
| --- | --- | --- | --- | --- |
| Easy | 24 | 1 trap in 25 | 4% | about 24x |
| Medium | 22 | 3 in 25 | 12% | thousands |
| Hard | 20 | 5 in 25 | 20% | tens of thousands |
| Hardcore | 15 | 10 in 25 | 40% | millions before a cash cap |

Treat the trap fractions as the widely repeated model, not as a line from a leaked source file. Your operator's help page is the authority if it disagrees.

### Worked survival odds (independent-step model)

If each step dies with probability q and you need k successful steps to cash at that depth:

P(survive k steps) = (1 − q)^k

Easy, q = 0.04:

- 5 steps: 0.96^5 ≈ 81.5%
- 10 steps: 0.96^10 ≈ 66.5%
- 24 steps: 0.96^24 ≈ 37.5%

Hard, q = 0.20:

- 5 steps: 0.80^5 ≈ 32.8%
- 10 steps: 0.80^10 ≈ 10.7%
- 20 steps: 0.80^20 ≈ 1.2%

Hardcore, q = 0.40:

- 5 steps: 0.60^5 ≈ 7.8%
- 10 steps: 0.60^10 ≈ 0.6%
- 15 steps: 0.60^15 ≈ 0.05%

The Hardcore max multiplier is advertising. A $20,000 operator cap makes a "millions-x" line a lottery ticket the cash table will not pay in full. Price the mode by the cap and the per-step death rate, not by the poster number.

If the game is built so that every cashout depth returns the same RTP, harder modes only change variance: more zeros, rarer large hits. That is the honest version of "pick your risk." If a mode quietly uses a lower RTP, harder is also more expensive. You cannot tell from the cartoon.

### Expected multiplier if every depth is priced to 98%

On a constant-RTP ladder, the cashout after k safe steps should pay about 0.98 / P(survive k). Using the independent-step model:

| Mode | P(survive 5) | Fair-ish 98% cashout at 5 steps |
| --- | --- | --- |
| Easy, q=0.04 | 81.5% | about 1.20x |
| Medium, q=0.12 | 0.88^5 ≈ 52.8% | about 1.86x |
| Hard, q=0.20 | 32.8% | about 3.0x |
| Hardcore, q=0.40 | 7.8% | about 12.6x |

Those are model prices, not a copied paytable. If the number on screen after five Hardcore steps is far above 12x, either later steps are much deadlier than a flat 40%, or the RTP is not 98% at that depth, or both. If it is far below, the mode is charging extra. Compare the screen to 0.98 / (1 − q)^k before you decide the cartoon is generous.`,
    },
    {
      id: "rtp",
      title: "The 98% RTP claim and how to read it",
      body: `Many lobby cards print **98% RTP** for Chicken Road, a 2% house edge. That is a strong number next to a 4–5% crash build. It is also a number you must confirm in the running game, because:

- studios and aggregators ship more than one math file;
- some secondary articles claim Easy stays near 98% while Hard and Hardcore sit much lower;
- a cash-win cap clips the tail that the theoretical RTP assumed.

If the panel says 98% and every depth is priced to that return, then cashing at step 3 on Easy and cashing at step 12 on Hard have the same expected cost per dollar staked. Easy is then the smoother way to donate 2%. Hardcore is the lumpier way. Neither is plus-EV.

### Worked session cost

100 rounds at $1, 98% RTP: expected result −$2. At 90% RTP the same 100 rounds expect −$10. The cartoon does not change. The panel does.

$1,000 of turnover at 2% is about $20 expected loss; at 10% it is $100. People remember the one Hardcore clip that paid 80x and forget the forty dead chickens that funded it. That is ordinary variance, not a hot machine.

If you want the crash-style formula for a single cashout target, [crash cashout calculator](/guides/crash-cashout-calculator) shows the same r ÷ m logic. Chicken Road just hides the "m" behind a step index.`,
    },
    {
      id: "cashout",
      title: "When to cash out: a plan, not a feeling",
      body: `The chicken does not get "due" a safe tile. Each unseen tile is a fresh draw from whatever trap density the mode uses.

### A written plan

1. Pick one difficulty for the session. Do not hop to Hardcore after three Easy deaths.
2. Pick a cashout step before the first tap, or an auto cashout multiplier if the build has one.
3. Stake small enough that ten dead rounds in a row are boring, not urgent.
4. Stop at a round limit.

### Why "one more step" is the product

The multiplier after a safe tile is designed to look only a little higher than the last one at first, then steeper later. That curve sells the extra tap. The extra tap is where Hard and Hardcore harvest the stake. If your plan was five Easy steps, cash at five. The golden egg at the end of the road is a jackpot skin on a long losing sequence.

Autoplay that walks a fixed number of steps is only as good as the number you typed. It is still 2% (or worse) on every dollar.

### Bankroll by difficulty

Same $1 stake, 50 planned rounds, 98% RTP: expected loss is $1. The path is not the same.

- Easy, cash at 5 steps (~81.5% survive): you expect about 41 cashed rounds and 9 deaths. Results hug the mean.
- Hard, cash at 5 steps (~33% survive): about 16 cashed rounds and 34 deaths. You need the ~3x hits to offset the pile of zeros.
- Hardcore, cash at 5 steps (~8% survive): about 4 cashed rounds. Four 12x hits on $1 would return $48 against $50 staked if the model holds. Binomial chance of two or fewer hits in 50 independent 8% trials is high (mean is only 4), so a night with one hit or none is ordinary. Size the stake so that two or three hits in 50 rounds still leave you able to stop.

Do not raise the stake after a Hardcore death. The next tile is not cheaper. See [risk of ruin](/guides/risk-of-ruin) if the plan is already "one big walk."`,
    },
    {
      id: "scams",
      title: "Predictor apps, clone APKs and fake Chicken Road",
      body: `Search the Chicken Road game and you will find APKs, Telegram bots and browser extensions that promise the next safe tile. They share the same lie as a [mines predictor](/guides/mines-predictor): the layout is generated where you cannot read it. A legitimate hashed game reveals a seed after the round so you can verify the past, not so you can peek at the future.

### Common pitches

- **"Our bot reads the hash."** If the hash is a commitment, it hides the result until reveal. An app that claims to invert it in live time is inventing output.
- **"70% win rate signals."** A 70% hit rate is easy if you cash out on Easy after one or two steps. It does not prove a leak.
- **"Official Chicken Road app."** InOut's game is distributed through casino aggregators, not a random sideload. An APK that asks for wallet permissions is a thief.

Clone websites copy the chicken art and run their own RTP, or they never pay. [Fake casino sites](/guides/fake-casino-sites) use familiar instant games as bait. Stay on operators you can identify, and never paste a seed phrase into a "verifier" the casino did not ship.

If a friend sent a download because "this version always lands the egg," delete it.

Sequel titles and reskins (later Chicken Road versions advertised in 2025) are separate math files. A 98% sticker on the first game does not travel. Read the new panel. A "chicken" theme is not a brand guarantee.`,
    },
    {
      id: "pvp",
      title: "Step-game edge next to PvP rounds",
      body: `Chicken Road charges a house edge on every completed walk. PVPspinArena runs three player-vs-player games in USDC or ETH on Base: Jackpot, [Coinflip](/coinflip) and Roulette. Coinflip is 50/50. Roulette's 33-slot wheel returns 32/33, about a 7.88% Purple or Silver edge after the win fee. Jackpot win chance equals your share of the pot. Settled rounds use committed seeds you can check on [fairness](/fairness).

A hashed coin flip will not tell you which Chicken Road tile is safe either. Different products, same rule: if you cannot verify the claim, do not pay for the claim. If the taps are already past the budget, use [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What is the Chicken Road game?",
      a: "An InOut Games step game. You choose a difficulty, walk a chicken across hidden traps, and cash out after a safe step or lose the stake on a trap.",
    },
    {
      q: "What is the RTP of Chicken Road?",
      a: "Lobbies often advertise 98%. Some articles say harder modes pay less. Open the in-game information panel at your operator and use that figure.",
    },
    {
      q: "Do Chicken Road difficulty levels change the house edge?",
      a: "They always change variance and the multiplier curve. They change the edge only if the operator's math file prices modes differently. The help screen is the check.",
    },
    {
      q: "Do Chicken Road predictor apps work?",
      a: "No. The trap layout is not on your phone in advance. Predictor APKs and Telegram bots are scams or malware.",
    },
    {
      q: "Is Chicken Road the same as a crash game?",
      a: "It is a cousin: you choose when to stop on a rising payout. The presentation is a step ladder with difficulty modes, not a shared rising multiplier in a public round.",
    },
  ],
  sources: [
    { label: "InOut Games", url: "https://inout.games/" },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "spaceman-game",
    "jetx-game",
    "mines-predictor",
    "crash-gambling",
    "crash-game-strategy",
    "fake-casino-sites",
  ],
  updated: "2026-09-27",
};

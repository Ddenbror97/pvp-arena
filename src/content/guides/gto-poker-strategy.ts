import type { Guide } from "./types";

export const guide: Guide = {
  slug: "gto-poker-strategy",
  cluster: "Poker",
  keyword: "gto poker strategy",
  secondary: [
    "what is gto poker",
    "gto vs exploitative",
    "game theory optimal poker",
    "poker equilibrium",
    "solver poker",
  ],
  title: "GTO Poker Strategy: Versus Exploitative Play",
  description:
    "GTO poker strategy in plain language: equilibrium versus exploitation, why mixed frequencies exist, and why this is not a solver tutorial.",
  h1: "GTO poker strategy: equilibrium versus exploitation, simply",
  answer:
    "GTO poker strategy means playing toward a game-theory equilibrium: a mix of bets and folds that cannot be exploited even if the opponent knows your plan. Exploitative strategy abandons that mix to attack a specific leak. GTO is a reference, not a salary and not a solver tutorial. Rake still applies. PVPspinArena is not a poker room.",
  facts: [
    "GTO is an unexploitable mix, not a promise that every hand wins.",
    "Exploitative play prints more against a known leak and loses more if you guessed the leak wrong.",
    "Solvers approximate equilibrium; they are not a night-one checklist.",
    "A mixed strategy (sometimes bet, sometimes check) exists to keep opponents indifferent.",
    "GTO does not cancel rake or variance, and it does not apply to this site’s PvP games.",
  ],
  sections: [
    {
      id: "what-gto-is",
      title: "What GTO is trying to be",
      body: `GTO stands for game-theory optimal. In poker talk it means: choose frequencies so a perfectly informed opponent cannot find a profitable deviation. You will still lose pots. You will still have downswings. You are aiming at a strategy that does not leak against someone who knows exactly what you do.

This [poker](/guides/topics/poker) page is for adults 18+. It will not teach you to run a solver, import a database, or lock a river node. If that is what you wanted, you want software documentation, not a cluster article.

[How to play poker](/guides/how-to-play-poker) is the streets. [Texas holdem strategy](/guides/texas-holdem-strategy) is the practical levers. This page is the vocabulary that sits above those levers.

PVPspinArena does not deal nodes. [Fairness](/fairness) verifies a hashed PvP result. That is not GTO.

### Where the phrase came from

Game theory studies choices when your payoff depends on someone else’s choice. Poker is that: hidden cards, sequential bets, a shared pot. “Optimal” here means equilibrium, not “best possible income against every human”. Against a human who folds too much, the income-maximising plan is to bluff more than the mix. That plan is exploitable if they adjust. GTO is the mix that still works if they do adjust. It is a floor, not a ceiling.

People say “GTO” the way they say “quantum”: as seasoning. If the next sentence is not about frequencies, indifference, or a named node, they meant “I thought about it”. Thinking is good. The label is optional.

A bet meant to fold out a better hand is [bluffing in poker](/guides/bluffing-in-poker), and a mixed strategy is one way to size that bet.`,
    },
    {
      id: "compare-table",
      title: "GTO versus exploitative, side by side",
      body: `One table. That is the contrast.

| | GTO-ish default | Exploitative default |
| --- | --- | --- |
| Goal | Do not be exploitable | Maximise EV versus *this* opponent |
| Bluff frequency | Mixed so they are indifferent | More if they fold too much; less if they call too much |
| Needs | A model of a balanced foe | A read (or a leak you have actually seen) |
| Risk | Leaves money on the table versus fish | Gets punished if the read is wrong |
| Tooling | Solvers, theory articles | HUD stats, notes, live tells |

Neither column is a moral ranking. Against a player who folds every flop c-bet, a GTO mix that checks some strong hands and bluffs some air is slower money than “bet every flop”. Against a player who never folds, the same mix is better than bluffing them for sport.

[Expected value](/guides/expected-value-gambling) is the scoreboard for both. GTO is a particular EV maximum: the one that works even in the worst case of being fully understood.`,
    },
    {
      id: "indifference",
      title: "Indifference, in one idea",
      body: `Equilibrium often makes the opponent *indifferent* between two actions. If your river bluff frequency is right, calling and folding have the same EV for them. They cannot pick a side that prints.

You do not need a solver to understand the sentence. You do need it to compute a precise mix on a specific river with a specific range. This page will not compute that mix. If a streamer says “GTO is 32% bluffs here”, they are quoting a model with assumptions you cannot see: rake, stacks, and the ranges they fed the tool.

### Why mixes feel fake

Humans like “always” and “never”. Equilibrium likes “often” and “sometimes”. That is why GTO poker strategy sounds slippery. The slipperiness is the point. If you *always* bluff a missed flush, a good opponent calls you down with a wider set. If you *never* bluff it, they fold correctly every time.

[Poker pot odds](/guides/poker-pot-odds) are what the caller uses to price that river. Your mix is trying to make both their call and their fold acceptable — not fun, acceptable.

### Ranges have to be in the model

A solver output is only as honest as the ranges you fed it. If you told the tool you never have junk on this river, it will bluff a different mix than if you arrive with every missed draw. Humans arrive with the ranges they actually played, not the ranges in a popular preflop chart. Copying a river frequency from a video while limping junk preflop is two strategies taped together. They will not add up.

That is why this is not a solver tutorial. The button that says “lock node” will not fix a preflop leak. Fix the leak. Then, if you still care, look at a node.`,
    },
    {
      id: "example",
      title: "Worked example: a 70/30 teaching mix, not a solver output",
      body: `This is the only numeric example on this page. It is a cartoon so you can see indifference, not a recipe for a real river.

Pot is $100. You bet $100 (pot-sized). Opponent must call $100 to win $200. Break-even call = 100/200 = 50% equity if they always win when they are good. Suppose when they call they beat your bluffs and lose to your value.

If you arrive at this river with 10 value combos and you want them indifferent to calling with a bluff-catcher, a simple (and incomplete) teaching ratio is to pair value with bluffs so their call does not print. A pot-sized bet that needs 50% to be right is a different algebra from a half-pot bet. **Do not memorise 70/30 as GTO.** It is a label for “sometimes yes, sometimes no”.

Imagine you decide, as a study habit, to fire this bet with all your value and with 30% of your missed draws (a 70/30 split of *the draw pile*, not of the whole range). Over 10 similar rivers you might bluff 3 and check 7 of those missed draws. A solver will give a different percent for a different tree. Your job as a human is to accept that the third bluff is not a betrayal of the seven checks.

If you notice this opponent folds 80% of the time to that bet, exploitation says: bluff more than the mix. If they call 80%, exploitation says: bluff less, value more thinly. That override is not “leaving GTO because GTO is fake”. It is using GTO as the baseline and walking toward the leak. [How to win at poker](/guides/how-to-win-at-poker) still requires that the extra EV beat rake over a sample.`,
    },
    {
      id: "what-amateurs-take",
      title: "What to take away without a solver",
      body: `### Useful

- Do not pick a plan that is 100% obvious in both directions (never bluff a missed flush *and* never check a strong flush).
- When you have no read, a boring, somewhat balanced default leaks less than a cartoon (always c-bet, never fold top pair).
- Study *spots*, not “GTO as a personality”. One river node is enough homework for a week.

### Not useful

- Reciting “GTO” as a reason you called off a stack with seven-high.
- Buying a software seat before you can price [pot odds](/guides/poker-pot-odds) on the turn.
- Copying a colour chart from a different stack depth and rake.

### Rake and node lock

Solvers often assume a rake model. Your $0.05/$0.10 table may not match the node you watched on YouTube. A mix that is unexploitable pre-rake can still be a losing product after fees. Strategy is not a refund.

### Exploitative loops

If they adjust to your adjustment, you are in a loop. GTO is one way to step off the loop: return to a mix that does not care. Another way is to keep watching and keep moving. Both are allowed. The failure mode is to pick one exploit on Monday and run it until Friday after they already stopped folding. Frequency without observation is just a new leak.

Live, observation is slower. Online, HUDs make some leaks obvious and invent others from tiny samples. Do not “exploit” a 20-hand fold-to-cbet of 80%. Do exploit a 500-hand fold-to-cbet of 80% if the pool is real. Sample size is part of GTO-versus-exploit, even if the solver never asked you for it.`,
    },
    {
      id: "not-here",
      title: "Where GTO does not apply",
      body: `GTO poker strategy is for contested, multi-street games with hidden cards. It is not how you play [video poker](/guides/video-poker-paytables) or [Three Card Poker](/guides/three-card-poker-strategy). Those are house paytables. The “strategy” there is matching a chart to posted payouts so you lose the least.

It is not how you play Purple on [Roulette](/roulette). There is no opponent range. There is about a 7.88% Purple or Silver edge after the win fee. [Kelly](/guides/kelly-criterion) will tell you the growth bet is empty.

If someone sells “GTO guaranteed profit”, they are confusing a definition with a wage. Equilibrium is a defence. It is not a printing press.

### Implementation error

You will not hit 31.7% in your head. You will bet “often” or “rarely”. That is fine. Implementation error is why people use simpler defaults: c-bet most dry heads-up flops, check more multiway, bluff some missed draws and not all of them. Those defaults are GTO-shaped, not GTO-certified. They leak less than cartoons. They still leak. Pay rake on the leftover like everyone else.

If you notice you never check a strong hand, you are unbalanced toward value and people will stop paying you. If you notice you never fold a pair, you are unbalanced toward calling and people will print bluffs. Those two sentences are the amateur version of the whole article. Use them at the table. Save the node lock for homework.

If a training site sells “GTO for micros” as a personality, ask what rake model they used and whether the pool folds too much. A mix built for a 5% rake, tough pool will look timid in a 2% rake, loose pool. The label on the folder is not the table. Open the table first. Then decide whether you even need the folder tonight.`,
    },
    {
      id: "summary",
      title: "Summary: a baseline, then a read, then a budget",
      body: `GTO poker strategy is an unexploitable mix. Exploitative strategy is a deliberate leak-hunt. Use the first when you have no read; use the second when you have a real one. Do not treat a solver screenshot as a personality. Do not treat either as a promise.

If theory study is keeping you at tables you cannot afford, stop. Read [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). PVPspinArena is 18+ and is not a poker room.

Remember the two-column table: balance when you have no read, attack when you have a real one. That is the whole amateur version of GTO poker strategy. Everything else is homework. Homework does not get to spend the rent. The budget does. If the folder is more exciting than the cap, close the folder. The mix will wait. The bills will not.

Solvers sit on top of the same [poker math](/guides/poker-math).`,
    },
  ],
  faqs: [
    {
      q: "What does GTO mean in poker?",
      a: "Game-theory optimal: a strategy mix that an opponent cannot profitably exploit even if they know your frequencies. It is a reference point, not a guaranteed win.",
    },
    {
      q: "Is GTO better than exploitative play?",
      a: "Against unknown or strong opponents, a balanced default leaks less. Against a clear leak, exploitation can earn more. Wrong reads get punished.",
    },
    {
      q: "Do I need a solver to use GTO poker strategy?",
      a: "No. You need the idea of mixed frequencies and indifference. Solvers compute precise mixes; they are optional homework, not a requirement to sit.",
    },
    {
      q: "Does GTO guarantee profit?",
      a: "No. Rake, implementation error and variance remain. GTO is not a secret winning system.",
    },
    {
      q: "Should beginners study GTO first?",
      a: "No. Learn streets, rankings, pot odds and a tight filter first. GTO vocabulary helps after those are automatic.",
    },
    {
      q: "Does PVPspinArena use GTO?",
      a: "No. It does not offer poker. There is no multi-street range to balance on Jackpot, Coinflip or Roulette.",
    },
  ],
  sources: [
    { label: "Wikipedia: Game theory", url: "https://en.wikipedia.org/wiki/Game_theory" },
    { label: "Wikipedia: Nash equilibrium", url: "https://en.wikipedia.org/wiki/Nash_equilibrium" },
    { label: "Wikipedia: Poker strategy", url: "https://en.wikipedia.org/wiki/Poker_strategy" },
  ],
  related: [
    "texas-holdem-strategy",
    "poker-pot-odds",
    "how-to-win-at-poker",
    "expected-value-gambling",
    "kelly-criterion",
    "poker-math",
  ],
  updated: "2026-09-26",
};

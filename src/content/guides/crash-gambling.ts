import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crash-gambling",
  cluster: "Games & odds",
  keyword: "crash gambling",
  secondary: ["crash game", "crypto crash game", "crash gambling strategy", "provably fair crash"],
  title: "Crash Gambling: How Crash Games Work and Their Odds",
  description:
    "How crash gambling works: the rising multiplier, cash-out odds, house edge, provably fair crash results, strategy myths, and how it compares with PvP games.",
  h1: "Crash gambling: how crash games work and what the odds are",
  answer:
    "Crash gambling is a game where a multiplier starts at 1x and rises until it suddenly \"crashes\" at a random point. You place a bet before the round and cash out at any time; if you cash out before the crash, you win your stake times the multiplier, and if you wait too long you lose it. The crash point is set before the round, and a built-in house edge means every cash-out target has the same average cost.",
  facts: [
    "A crash round's multiplier starts at 1x and rises until a random crash point.",
    "Cashing out before the crash pays stake × multiplier; staying past the crash loses the stake.",
    "On a typical design, the chance of reaching multiplier m is about (1 − edge) ÷ m.",
    "Crash became popular on CS:GO skin sites and later crypto casinos.",
    "Provably fair crash games commit to the crash point with a hash before the round.",
  ],
  sections: [
    {
      id: "what",
      title: "What is crash gambling?",
      body: `Crash is a fast, simple game built around one number: a multiplier that climbs from 1.00x and can stop at any moment.

### The basic idea

1. Before the round, you place a bet.
2. The round starts and the multiplier begins rising: 1.10x, 1.50x, 2.00x and so on.
3. At any moment you can cash out and lock in your stake times the current multiplier.
4. At a random point, the multiplier "crashes". Anyone who has not cashed out loses their stake.

Some rounds crash almost instantly at 1.00x. Others run to 10x, 100x or higher. You never know in advance.

### Where it came from

Crash games grew popular on CS:GO skin sites in the mid-2010s, alongside [jackpot](/guides/csgo-jackpot), [coinflip](/guides/csgo-coinflip) and coloured roulette. Today they are common on crypto casinos. PVPspinArena does not currently offer crash; this guide explains how the format works so you can judge it anywhere.

### Why it feels different

Crash feels like a skill game because you choose when to cash out. In reality, the crash point is already fixed when the round begins. Your timing changes the size and frequency of wins, not the long-term cost.`,
    },
    {
      id: "multiplier",
      title: "How the crash point is decided",
      body: `On a well-designed crash game, the crash point is generated before betting closes, from random seeds, and cannot be changed during the round.

### The usual distribution

Most crash games use a distribution where the chance of the multiplier reaching at least m is roughly:

P(reach m) ≈ (1 − house edge) ÷ m

With a 1% house edge:

- Reach 2x: about 49.5%.
- Reach 5x: about 19.8%.
- Reach 10x: about 9.9%.
- Reach 100x: about 0.99%.

### Instant crashes

Many designs include a small chance of crashing immediately at 1.00x. This is one common way the house edge is built in. Everyone in that round loses, whatever their target.

### Why this matters

This shape means low targets win often but pay little, while high targets win rarely but pay a lot. It is the same trade you see with colour bets in roulette, which our [roulette colors guide](/guides/roulette-colors) covers.`,
    },
    {
      id: "house-edge",
      title: "The house edge in crash",
      body: `Using the formula above, the expected return of any cash-out target works out the same.

### A worked example with a 1% edge

- Target 2x: win chance 49.5% × 2 = 0.99 per $1 bet.
- Target 10x: win chance 9.9% × 10 = 0.99 per $1 bet.
- Target 100x: win chance 0.99% × 100 = 0.99 per $1 bet.

Every target returns about 99 cents per dollar on average. The house edge is 1% whatever you choose. What changes is variance.

### Edges vary by site

Crash edges differ between operators. Some advertise 1%, others use higher values. The edge is the most important number to know, and a trustworthy site states it clearly. Our [house edge guide](/guides/house-edge) explains how to calculate edges yourself.

### Speed multiplies the cost

Crash rounds are short, often under a minute. A small edge on many rounds adds up. Total wagered, not deposit size, is what the edge applies to.`,
    },
    {
      id: "cash-out",
      title: "Cash-out targets and variance",
      body: `Most crash games offer auto cash-out: you set a target, and the game cashes out for you if the multiplier reaches it.

### Low targets (1.2x to 2x)

- Win most rounds.
- Small profits per win.
- Occasional instant crashes or early crashes wipe out several wins.

### Middle targets (2x to 5x)

- Win less than half the time.
- Balance between frequency and size.

### High targets (10x and above)

- Win rarely.
- Big payouts when they hit.
- Long losing runs are normal. At 10x, going 20 rounds without a hit happens about 12% of the time.

### Manual cash-out

Cashing out by hand adds emotion. Players often hold on "one more second" after seeing high multipliers in previous rounds. Previous rounds do not affect the next one, as our [gambler's fallacy guide](/guides/gamblers-fallacy) explains.`,
    },
    {
      id: "fair",
      title: "Provably fair crash",
      body: `Because the crash point is decided in advance, crash is well suited to provably fair verification.

### How it usually works

1. The site generates a server seed and publishes its hash before the round.
2. The crash point is derived from the seed, often combined with a client seed or public value, using HMAC-SHA256.
3. After the round, the seed is revealed and you can recompute the crash point.

Some crash games use a hash chain: a long sequence of seeds is generated in advance, and each round reveals the next one. This proves that no round's result was chosen after bets arrived.

### What to check

- Is the hash shown before you bet?
- Is the formula for turning a hash into a crash point published?
- Can you verify with an independent tool?

Our [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) and [provably fair casino guide](/guides/provably-fair-casino) explain these ideas step by step.`,
    },
    {
      id: "strategy",
      title: "Crash gambling strategy myths",
      body: `Search for crash strategy and you will find many systems. None change the edge.

### "Always cash out at 1.5x"

Low targets win often, but instant and early crashes still cost you. Over time, the result matches the edge.

### "Wait for a low streak, then bet high"

After several low crashes, some players expect a high one. Each round is independent. This is the gambler's fallacy.

### Martingale in crash

Doubling your stake after each loss at a 2x target is a martingale. It creates many small wins and occasional large losses. Our [martingale strategy guide](/guides/martingale-strategy) shows the maths.

### Pattern reading

Crash history charts often look like they have waves or cycles. They are random. Patterns in past results do not predict future ones.

### The only real levers

You control your stake size, your target, how many rounds you play and when you stop. Smaller stakes, fewer rounds and firm limits reduce what the edge can cost you.`,
    },
    {
      id: "vs-pvp",
      title: "Crash vs PvP games",
      body: `Crash is a house-banked game: you play against the operator's multiplier. PvP games work differently.

### Who takes the other side

- **Crash**: the house pays winners and keeps losing stakes, with a built-in edge.
- **[Jackpot](/)** and **[Coinflip](/coinflip)** on PVPspinArena: players play each other. The house does not bet and only takes a fee, which defaults to 0%.

### Pace

- **Crash**: fast, continuous rounds with instant decisions.
- **Jackpot**: rounds build as players join, then a single draw.
- **Coinflip**: one-on-one duels at a set stake.

### Emotional pressure

Crash's rising number is designed to be exciting, and it rewards quick reactions. That makes it easy to play many rounds. PvP formats have natural pauses between rounds.

Read our [PvP gambling guide](/guides/pvp-gambling) for a fuller comparison of player-vs-player and house-banked games.`,
    },
    {
      id: "safer",
      title: "Playing crash more safely",
      body: `If you play crash anywhere, a few rules keep it under control.

- **Know the edge.** If a site does not state it, be cautious.
- **Use auto cash-out.** It removes in-the-moment decisions.
- **Use flat stakes.** Do not increase bets to recover losses.
- **Set a round limit and a loss limit.** Stop when you reach either.
- **Take breaks.** Fast games make time slip.
- **Verify a few rounds.** Make sure the provably fair system actually works.

If crash or any other game is becoming hard to stop, our [how to stop gambling guide](/guides/how-to-stop-gambling) and the [responsible gambling page](/responsible-gambling) have practical next steps.`,
    },
  ],
  faqs: [
    {
      q: "How does crash gambling work?",
      a: "A multiplier rises from 1x until it crashes at a random point. You win your stake times the multiplier if you cash out before the crash, and lose your stake if you do not.",
    },
    {
      q: "What is the best crash gambling strategy?",
      a: "No strategy beats the house edge. You can choose low targets for frequent small wins or high targets for rare big wins, but the average cost stays the same.",
    },
    {
      q: "Is crash gambling rigged?",
      a: "Not necessarily. Provably fair crash games publish a hash of each crash point in advance so you can verify results. Check that a site offers a working verifier.",
    },
    {
      q: "What are the odds of hitting 2x in crash?",
      a: "With a 1% house edge and a typical design, the chance of reaching 2x is about 49.5%. The exact figure depends on the site's edge.",
    },
    {
      q: "Does PVPspinArena have a crash game?",
      a: "No. PVPspinArena currently offers Jackpot, Coinflip and Roulette. This guide explains crash so you can understand it wherever you see it.",
    },
  ],
  sources: [
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST: Secure Hash Standard (FIPS 180-4)", url: "https://csrc.nist.gov/publications/detail/fips/180/4/final" },
  ],
  related: ["house-edge", "provably-fair-casino", "martingale-strategy", "hmac-sha256-provably-fair"],
  updated: "2026-09-25",
};

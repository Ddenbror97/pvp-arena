import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-do-slot-machines-work",
  cluster: "Slots",
  keyword: "how do online slots work",
  secondary: [
    "how slot machines work",
    "online slot rng",
    "virtual reel strips",
    "slot game engine",
  ],
  title: "How Do Online Slots Work: RNG, Strips and Pays",
  description:
    "How do online slots work: a generator draws a stop, virtual strips weight the symbols, and a paytable pays. Artwork is not the odds.",
  h1: "How do online slots work: generator, virtual strips, paytable",
  answer:
    "How do online slots work in one chain: you buy a spin, a random-number generator draws one or more values, those values map onto weighted virtual reel strips, the visible grid is the artwork of that mapping, and the paytable pays matching lines, ways or features. The cherries looking common on the glass does not mean they are common in the virtual strip. You almost never see the weights. PVPspinArena does not offer slots.",
  facts: [
    "The result is drawn when you bet; the reel animation is a replay of a mapping, not a physical stop you can time.",
    "Virtual strips are weighted: a jackpot symbol can occupy one stop among hundreds.",
    "Most studio slots are certified RNG products, not commit-reveal games you can recompute.",
    "Bonus states hold a large share of RTP on many titles; the base game can be lean on purpose.",
    "PVPspinArena has no slots; Jackpot, Coinflip and Roulette are the live games.",
  ],
  sections: [
    {
      id: "chain",
      title: "The spin chain from click to paytable",
      body: `How do online slots work is easier if you ignore the glass. The glass is a skin.

1. You send a stake.
2. The game server (or a certified remote game server) draws random values.
3. Those values index into virtual reel strips — lists of symbols with repeats that set the weights.
4. The client animates a stop that matches the chosen indices.
5. The engine evaluates lines, ways, clusters, scatters and any feature trigger.
6. Credits move. The next spin starts from a clean draw. It does not remember this one.

This [slots topic](/guides/topics/slots) page is for adults 18+. For the button order, use [how to play online slots](/guides/how-to-play-slots). For the cost rate, use [slot machine odds](/guides/slot-machine-odds) and [RTP explained](/guides/rtp-explained).

[How random number generators work](/guides/how-random-number-generators-work) is the generator chapter. This page is the mapping chapter: how a number becomes a grid you can lose money on.

### One draw, many skins

The same chain runs under a three-reel fruit skin, a five-reel video title and a six-reel ways engine. Artists change. Weights change. The steps do not: random index → strip position → evaluate → pay. If a lobby sells “skill bonus” as if you were aiming a reel, read the help file. Most “skill” moments are already-determined pick-me screens or timing games whose prize set was drawn before the tap. A tap that chooses among three boxes the RNG already filled is not skill in the blackjack sense. It is a delayed reveal.

PVPspinArena has no reel mapping to show you. The comparable chain on [Roulette](/roulette) is hash → pocket 1–15 → colour paytable. You can count the pockets. You cannot count a studio’s virtual stops.`,
    },
    {
      id: "strips",
      title: "Virtual strips and why artwork lies",
      body: `Mechanical three-reel machines had a physical stop count. If you knew the number of stops and the number of jackpot bars, you could divide. Video slots broke that. Designers use **virtual reels**: a long list where the jackpot symbol appears once and a low symbol appears forty times. The RNG picks a position on that list. The glass still shows five pretty rows.

### Illustration, not a live strip

Imagine one reel with 128 virtual stops.

| Symbol | Virtual stops | Chance this reel lands it | What the glass suggests |
| --- | --- | --- | --- |
| Low 10 | 36 | 36/128 = 28.1% | “Common” |
| Low A | 24 | 18.8% | Common |
| Mid fruit | 16 | 12.5% | Medium |
| High face | 8 | 6.3% | Rare-ish |
| Wild | 3 | 2.3% | Rare |
| Jackpot | 1 | 0.78% | “I see it every few spins on the glass” |

Five reels with independent weights multiply. A five-jackpot line at 0.78% per reel is 0.0078⁵ — a tiny number — even though the symbol is painted on every reel. That is why you cannot price a symbol from the art. The table is an illustration of weighting, not a studio file.

[Progressive jackpot odds](/guides/progressive-jackpot-odds) is the same idea with a skim and a billboard. The weight is still hidden.`,
    },
    {
      id: "features",
      title: "Bonus states, hold-and-spin and extra RNGs",
      body: `Many titles put a large slice of RTP inside a second state: free spins, respins, pick-me, hold-and-spin. The base game can be a 60% RTP product that only looks complete. The feature brings the mix up to the advertised 96%. If you never see the feature, you sampled the lean part. That is expected.

### Extra draws

A feature often draws again: sticky wilds, incrementing multipliers, locked coins. Each draw is another mapping. Slamming stop does not change those draws if they were already queued. If they are live draws, tapping faster still does not improve the weights.

### Buy features

Paying to jump into the bonus is a second ticket with its own RTP sheet. [Bonus buy slots](/guides/bonus-buy-slots) covers the price. It is not a peek at the strips. It is a larger stake on the same hidden weights.

### Ways and clusters

“243 ways” or a cluster engine changes how the grid is *evaluated*, not how the weights were *drawn*. [Slot paylines explained](/guides/slot-paylines-explained) is the evaluation page. The RNG chapter does not get easier because more ways paid 0.4×.

### Cascades and extra evaluations

Avalanche or tumble engines pay a cluster, remove those symbols, drop new ones, and evaluate again. Each cascade may be a new draw or a continuation of a pre-rolled set. Either way, the extra banners are extra evaluations of a house model, not extra honesty. A 96% RTP avalanche title has already priced those cascades into the 96%. You do not “get more RTP” because four tumbles landed. You got the path that title uses to deliver its mix. [Slot volatility](/guides/slot-volatility) is usually higher when a large share of return sits in long cascade chains. A single-tumble clip can look like the game is “dead.” It is waiting for a chain you may not see tonight.

### Illustration, not a studio file

Suppose a cascade state has a 12% chance to continue after a win and the average continue adds 0.6× more. That is a teaching sketch, not a par sheet. The point is that the advertised RTP already includes those continues. Sitting through empty base spins to “build toward” a cascade is not how the memoryless draw works. There is no build. There is a new index.`,
    },
    {
      id: "rng-vs-pf",
      title: "Certified RNG versus a hash you can replay",
      body: `Most branded slots are lab-certified RNG games. A test house saw a math model and a generator. You still cannot recompute yesterday’s grid from a public seed.

A real commit-reveal spin would publish a server-seed hash before you bet, mix it with your client seed and a nonce, then reveal the seed so you can map it onto the same stops. Very few studio titles work that way. [RNG versus provably fair](/guides/rng-vs-provably-fair) is the difference. A certificate is not a replay.

### Crypto wrappers

[Crypto slots](/guides/crypto-slots) often stamp “fair” on an RNG title because the same lobby also has a dice game with seeds. If you cannot turn the revealed seed into the exact symbol grid, you have decoration. Paying in bitcoin does not publish the strips.

### Independence

Each spin is a new draw. The machine is not “holding” a bonus for the next player. It is not cooling down. [How to win online slots](/guides/how-to-win-at-slots) exists because that folklore is the product’s favourite lie.`,
    },
    {
      id: "old-vs-new",
      title: "Land-based cabinets versus the browser",
      body: `A modern land-based video slot is the same family: certified RNG, virtual strips, paytable. The handle is a button. “I know this cabinet” is a familiarity claim, not a strip claim.

Older mechanical steppers with a published stop count were, in principle, countable. Online studios do not ship that count. Treat any “I counted the cherries” story on a video title as fiction unless the studio published the par sheet.

Near-miss lighting — two jackpot symbols and a third that *looks* close — is a presentation choice. The third reel already decided. The teaser is not extra information. It is extra dopamine.

### Weighted stops versus “I watched it”

Watching 50 spins and tallying symbols is not a par sheet. High-volatility titles hide the expensive symbols on purpose. Your tally will overweight the lows you saw and underweight the jackpot you did not. That sampling error is the point of virtual strips. [How to win online slots](/guides/how-to-win-at-slots) refuses to turn a tally into a system for the same reason.

A [bonus buy](/guides/bonus-buy-slots) does not publish the feature’s inner weights either. It only changes which state you pay to enter. The RNG chain is the same chain with a larger ticket on the second state.`,
    },
    {
      id: "not-here",
      title: "What you can actually inspect on PVPspinArena",
      body: `There are no virtual reel strips here. The live games expose the sample space.

- [Jackpot](/) — chance = stake / pot.
- [Coinflip](/coinflip) — 1/2, fee published.
- [Roulette](/roulette) — 16/33, 16/33, 1/33.
- [Fairness](/fairness) — replay the committed result.

If you needed this page to understand a lobby elsewhere, take the lesson: the glass is not the odds. If you wanted a mapping you can recompute, use the PvP set, not a studio slot.`,
    },
    {
      id: "labs",
      title: "What a lab certificate is — and is not",
      body: `A test lab simulates a huge number of spins, checks that observed RTP sits near the claimed model, and signs a report. That is useful. It is not a replay of *your* spin.

### What the report usually covers

- The math model’s theoretical RTP.
- That the generator’s output looked unbiased in the test window.
- That the implementation matched the submitted build.

### What it does not cover

- Which RTP build this operator installed this week.
- Whether the bonus-buy sheet matches the base sheet.
- A virtual-strip listing you can audit at home.
- Tomorrow’s session result.

Always open the in-game info panel. A PDF from 2023 for a 96.2% build is not a 94.0% lobby tile. [RTP explained](/guides/rtp-explained) is the number that applies to **this** instance.

### Illustration, not a lab file

Suppose a certificate says 96.12% over 100 million simulated spins. Your 150-spin sitting is 0.00015% of that sample. Finishing at 40% or 180% return does not contradict the certificate. It contradicts the idea that you can “see” the RTP by playing. [Slot volatility](/guides/slot-volatility) is the width that makes the sitting silent.

### How to play versus how it works

[How to play online slots](/guides/how-to-play-slots) is the control loop. This page is why those controls cannot aim. If you want a mapping you can recompute, you want commit-reveal, not a studio cabinet. [Free slots](/guides/free-slots) demos use the same family of mapping with fake credits. The glass still is not the strip.`,
    },
    {
      id: "when-to-stop",
      title: "When knowing the machine is not enough",
      body: `Understanding the chain does not make the next spin safer. It only removes the excuse that you were tricked by a handle.

If you are opening titles to “see the strips” you will never be shown, or chasing a near-miss as if it were data, step away. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). [Responsible gambling](/responsible-gambling) lists limits and helplines. A mechanics page is not a reason to keep mapping losses.

Why a reel is built to feel “almost” is the [Skinner box](/guides/skinner-box-slot-machines).`,
    },
  ],
  faqs: [
    {
      q: "How do online slots decide a spin?",
      a: "A random-number generator draws values that index into weighted virtual reel strips. The paytable then pays the resulting grid. The animation is not a physical stop you can time.",
    },
    {
      q: "Can I see the reel weights?",
      a: "Almost never. Studios keep virtual strips private. Without them you cannot turn artwork into a probability table. RTP is the public summary.",
    },
    {
      q: "Are online slots rigged?",
      a: "A licensed, certified model is built to a published RTP, which is already a house edge. That is not the same as a game that ignores its own paytable. You still cannot recompute a typical studio spin.",
    },
    {
      q: "Does stopping the reels early change the result?",
      a: "Usually no. The result is drawn when you bet. Slam-stop only skips animation. It does not improve weights.",
    },
    {
      q: "Does PVPspinArena run slot machines?",
      a: "No. This site offers Jackpot, Coinflip and Roulette. Those results can be checked on the fairness page. There are no reel strips.",
    },
    {
      q: "Is a crypto slot a different machine?",
      a: "The cashier is different. The mapping is still RNG plus a paytable unless the title is a real commit-reveal slot you can replay.",
    },
  ],
  sources: [
    { label: "Wikipedia: Slot machine", url: "https://en.wikipedia.org/wiki/Slot_machine" },
    {
      label: "Wikipedia: Pseudorandom number generator",
      url: "https://en.wikipedia.org/wiki/Pseudorandom_number_generator",
    },
    {
      label: "UK Gambling Commission: gaming machine technical standards",
      url: "https://www.gamblingcommission.gov.uk/",
    },
  ],
  related: [
    "free-slots",
    "how-to-play-slots",
    "how-random-number-generators-work",
    "slot-machine-odds",
    "rng-vs-provably-fair",
    "crypto-slots",
    "skinner-box-slot-machines",
  ],
  updated: "2026-09-26",
};

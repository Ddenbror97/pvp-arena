import type { Guide } from "./types";

export const guide: Guide = {
  slug: "rng-vs-provably-fair",
  cluster: "Provably fair",
  keyword: "rng casino",
  secondary: ["rng vs provably fair", "what is rng in casino", "casino random number generator", "certified rng"],
  title: "RNG Casino vs Provably Fair: Which Can You Trust?",
  description:
    "How an RNG casino generates results, how certified RNG audits work, how provably fair differs, and which model lets you verify each bet yourself.",
  h1: "RNG casino vs provably fair: which can you trust?",
  answer:
    "An RNG casino uses a random number generator, software that produces unpredictable results, to decide each game. Players trust that the RNG works because an independent lab has tested and certified it. Provably fair games also use randomness, but add a cryptographic commitment so you can check each individual result yourself. Certified RNG relies on trusting auditors; provably fair relies on maths you can verify.",
  facts: [
    "RNG stands for random number generator.",
    "Online casinos typically use a pseudo-random number generator (PRNG) seeded from a secure source.",
    "Certified RNG is tested by labs that analyse large samples of output for bias.",
    "Provably fair games publish a hash of the secret seed before each bet or round.",
    "You can check PVPspinArena rounds yourself on the fairness page.",
  ],
  sections: [
    {
      id: "what-rng",
      title: "What is an RNG in a casino?",
      body: `A random number generator is a piece of software, or sometimes hardware, that produces numbers with no predictable pattern. Casinos use it to decide slot reels, card shuffles, dice rolls and wheel spins in online games.

### True random vs pseudo-random

- **True random number generators (TRNGs)** measure unpredictable physical processes, such as electrical noise.
- **Pseudo-random number generators (PRNGs)** use a mathematical formula that turns a starting value, the seed, into a long sequence that looks random.

Most online casinos use a cryptographically secure PRNG seeded from a true random source. This is fast and, when implemented well, unpredictable in practice.

### How the RNG becomes a game result

The RNG produces a number. The game maps it to an outcome, such as a slot symbol or a roulette pocket. If the mapping is done carelessly, some outcomes can become slightly more likely than others, so correct mapping matters as much as good randomness.

If casino terms like seed or payout are new to you, keep our [casino terminology guide](/guides/casino-terminology) open while reading.`,
    },
    {
      id: "certification",
      title: "How RNG certification works",
      body: `Because players cannot see inside an RNG casino's servers, the industry relies on independent testing labs.

### What labs check

- **Statistical randomness.** Millions of outputs are analysed for patterns, bias and repetition.
- **Game maths.** Payout tables are checked to confirm the stated RTP.
- **Source code and seeding.** Labs may review how the RNG is seeded and how results are mapped.
- **Change control.** Some regulators require that certified software cannot be changed without re-testing.

### What a certificate tells you

A valid certificate says the tested version of the software behaved correctly during testing. Regulators in some jurisdictions also run ongoing checks.

### What it cannot tell you

- Whether the software running today is the same version that was tested.
- Whether any single result you received was produced honestly.
- Whether the operator changed settings after the audit.

In well-regulated markets these risks are handled by licensing rules, inspections and penalties. The system works, but it is based on trust in institutions rather than on something you can check yourself.`,
    },
    {
      id: "what-pf",
      title: "What provably fair adds",
      body: `Provably fair games still need randomness. The difference is that they make each result checkable after the fact.

### The commit-reveal pattern

1. Before a bet or round, the platform generates a secret server seed.
2. It publishes a hash of that seed, a fingerprint that cannot be reversed.
3. The result is computed from the server seed plus other inputs, such as a client seed and a nonce or round number.
4. After the round, the server seed is revealed.
5. Anyone can hash the revealed seed, check it matches the fingerprint and recompute the result.

Because the fingerprint was published first, the platform cannot swap the seed after seeing bets without being caught. Our [commit-reveal scheme guide](/guides/commit-reveal-scheme) explains why this works.

### Adding player input

A client seed lets players, or something outside the operator's control, contribute to the result. This stops the operator from choosing a favourable seed in advance. See [server seed vs client seed](/guides/server-seed-client-seed).

### The maths behind it

Most provably fair systems use HMAC-SHA256 to combine the inputs. The details are in our [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair).`,
    },
    {
      id: "compare",
      title: "RNG casino vs provably fair: side by side",
      body: `### Who you trust

- **Certified RNG**: the operator, the testing lab and the regulator.
- **Provably fair**: the published maths, which you can run yourself.

### What you can check

- **Certified RNG**: that a certificate exists and which lab issued it.
- **Provably fair**: every individual result, using the revealed seeds.

### Timing of checks

- **Certified RNG**: periodic audits.
- **Provably fair**: after every round, by anyone.

### What neither guarantees

- Neither changes the house edge. A perfectly fair game can still cost you money on average. Read our [house edge guide](/guides/house-edge).
- Neither protects your balance if the operator is dishonest about withdrawals or accounting.
- Neither prevents problem gambling.

### Where each fits

Certified RNG is the norm in regulated online casinos, especially for slots and complex games where full provably fair verification is impractical. Provably fair is common in crypto casinos and simple games like dice, coinflip, jackpot and coloured roulette.

For a general overview of provably fair sites, read our [provably fair casino guide](/guides/provably-fair-casino).`,
    },
    {
      id: "weaknesses",
      title: "Weak spots in both models",
      body: `No system is perfect. Knowing the weak spots helps you judge a site.

### RNG casino risks

- **Unverifiable results.** You cannot prove any single result was honest.
- **Configuration drift.** Settings can change after an audit if oversight is weak.
- **Unlicensed sites.** A site may display a certificate logo that is expired, fake or for different software.

### Provably fair risks

- **Weak client seed.** If the operator controls every input, it could pick a seed in advance that favours the house. A proper design mixes in input the operator cannot control.
- **Biased mapping.** Converting a hash to an outcome with a simple modulo can create tiny biases. Good systems use rejection sampling, which PVPspinArena does.
- **No verifier or hidden data.** If the seeds are not revealed or the tool is missing, "provably fair" is just a label.
- **Only the result is proven.** Balances, payouts and withdrawals still depend on the operator's accounting.

### Questions to ask

- Is the hash shown before I bet?
- Is the seed revealed after the round?
- Can I verify with an independent tool, not just the site's own page?
- How is the hash converted into a result?

Our [are online casinos rigged guide](/guides/are-online-casinos-rigged) has a longer checklist.`,
    },
    {
      id: "pvpspinarena",
      title: "How PVPspinArena handles randomness",
      body: `PVPspinArena uses a provably fair commit-reveal protocol for all three games.

### Jackpot and Coinflip

For player-vs-player games, the server seed is committed before the round, and the winner is calculated from the seed and round data once the round locks. Because the house does not bet in these games, it has no stake in who wins. The only take is a fee, which defaults to 0%. Try [Jackpot](/) or [Coinflip](/coinflip).

### Roulette

Each [Roulette](/roulette) round commits a seed hash before betting opens. After the spin, the seed is revealed, and the result maps to one of 15 slots using rejection sampling so each slot is equally likely.

### Server-authoritative

All game and money logic runs in the database on the server. Your browser never decides a result or a balance.

### Verify it yourself

Open the [fairness page](/fairness), choose a game and enter the round. The check runs in your browser, so you do not have to trust our servers to tell you the answer. The [provably fair calculator guide](/guides/provably-fair-calculator) shows how to repeat it with your own code.`,
    },
    {
      id: "which",
      title: "Which should you choose?",
      body: `Both models can be fair. The question is what kind of trust you prefer.

### Choose a certified RNG casino if

- You want a wide game library, including slots and live tables.
- You value licensing and a regulator you can complain to.
- You are comfortable trusting audits.

### Choose provably fair if

- You want to check results yourself.
- You mainly play simple games.
- You prefer maths to paperwork.

### In either case

- Understand the house edge or fee before you bet.
- Check how deposits and withdrawals work. Our [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) covers what to look for.
- Set a budget and stick to it. See the [gambling budget guide](/guides/gambling-budget).

Fairness is about whether results are honest. It does not make gambling a way to earn money. Every game still has risk, and the only reliable way to stay in control is to decide your limits in advance. The [responsible gambling page](/responsible-gambling) has practical tools and help lines.`,
    },
    {
      id: "example",
      title: "A simple verification example",
      body: `Here is what verifying a provably fair round looks like in practice, without the full maths.

1. Before the round, the site shows a hash such as a long string of letters and numbers. You note it down or screenshot it.
2. The round runs and a result appears, for example Silver on the roulette wheel.
3. After the round, the site reveals the server seed.
4. You hash the revealed seed with SHA-256. If the output matches the hash from step 1, the seed was not changed.
5. You run the result calculation with the seed and the round data. If it produces Silver, the result was genuine.

With a certified RNG casino, the equivalent check does not exist. You would see the result and a certificate from a lab, but nothing that ties this particular result to an honest process.

### Doing it without the site

The strongest check uses a tool the site does not control, such as a short script or an open-source calculator. PVPspinArena's verifier runs in your browser, and the method is documented so it can be repeated independently. Our [provably fair calculator guide](/guides/provably-fair-calculator) walks through it.`,
    },
    {
      id: "regulation",
      title: "Regulation and provably fair",
      body: `Regulated markets usually require certified RNG testing regardless of whether a game is also provably fair. The two are not mutually exclusive. A game can be both certified by a lab and verifiable by players.

Provably fair does not replace licensing, consumer protection or complaint processes. It adds a layer of transparency on top. When judging any site, look at both sides: how results are produced and verified, and how the business handles your money, your data and disputes. The [terms](/terms) and [privacy](/privacy) pages are where a site should explain the second part clearly.`,
    },
  ],
  faqs: [
    {
      q: "What does RNG mean in a casino?",
      a: "RNG means random number generator: software that produces unpredictable numbers used to decide game results such as slot reels or roulette spins.",
    },
    {
      q: "Are RNG casinos rigged?",
      a: "Licensed RNG casinos with certified software are generally fair, but you cannot verify individual results yourself. You rely on audits and regulation.",
    },
    {
      q: "Is provably fair better than RNG?",
      a: "Provably fair lets you check each result, which RNG certification cannot. It is best suited to simple games, and neither removes the house edge.",
    },
    {
      q: "Do provably fair games use an RNG?",
      a: "Yes. They still need randomness to create the server seed. The difference is the commitment and reveal that let you verify the result afterwards.",
    },
    {
      q: "How do I verify a PVPspinArena round?",
      a: "Open the fairness page, choose the game, enter the round number and run the check. It recomputes the result in your browser from the revealed seed.",
    },
  ],
  sources: [
    { label: "NIST SP 800-90A: Random number generation", url: "https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final" },
    { label: "NIST: Secure Hash Standard (FIPS 180-4)", url: "https://csrc.nist.gov/publications/detail/fips/180/4/final" },
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
  ],
  related: ["provably-fair-casino", "commit-reveal-scheme", "are-online-casinos-rigged", "server-seed-client-seed"],
  updated: "2026-09-25",
};

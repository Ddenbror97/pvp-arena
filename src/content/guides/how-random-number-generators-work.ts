import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-random-number-generators-work",
  cluster: "Provably fair",
  keyword: "how random number generators work",
  secondary: ["casino rng", "prng explained", "random number generator casino", "hardware rng"],
  title: "How Random Number Generators Work in Casino Games",
  description:
    "How random number generators work in casinos: PRNG versus hardware RNG, seeding, and how provably fair hashes give you a check the RNG box does not.",
  h1: "How random number generators work in casino games",
  answer:
    "How random number generators work in a casino is straightforward at the surface: the game needs an unpredictable number, then it maps that number onto a reel, a card, a flip or a wheel slot. Online sites usually use a pseudo-random generator seeded from a secret source; some mix in hardware noise. A lab certificate says the tested software looked unbiased. A provably fair hash lets you check that this round’s seed was locked before bets, which an RNG logo cannot show.",
  facts: [
    "RNG means random number generator: software or hardware that produces unpredictable numbers.",
    "Most online casinos use a cryptographically secure PRNG, not a physical wheel or shuffled deck.",
    "The seed is the secret starting value; if you know the seed and the algorithm, you can replay the stream.",
    "Mapping the raw number onto outcomes must be unbiased; a naive modulo can tilt the table.",
    "Provably fair systems still use an RNG for the server seed; they add a public hash you can verify.",
  ],
  sections: [
    {
      id: "what-rng",
      title: "What an RNG does in a casino game",
      body: `Every digital casino result that is not a live dealer camera feed is decided by a number. The generator’s job is to produce that number so that nobody — not the player, not a colluding dealer, and ideally not a rogue operator — can predict or steer it in time to place a better bet.

The rest of the game is mapping. A 32-bit or 256-bit value is turned into “heads”, “pocket 17”, “Purple”, or a five-reel grid. If the mapping is honest and the number is unpredictable, the published probabilities hold. If either step is sloppy, the paytable on the help screen is no longer the game you are playing.

### Where the RNG sits

On a licensed slot site the RNG lives in certified server software. On a crypto PvP site it usually lives in the step that creates a server seed, then in the hash that turns seeds into a winner. PVPspinArena uses the second model for [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette). Your browser never picks the result.

### What “random” has to mean here

Casino randomness is not “feels mixed”. It has to be unpredictable to insiders, uniformly distributed after mapping, and independent from one round to the next. A pretty shuffle animation that is driven by a clock you can read is not an RNG. This article sits with the [provably fair topic](/guides/topics/provably-fair) because the interesting question is not whether a computer can output noise — it is whether you can check the noise that decided your bet. Adults 18+ only.`,
    },
    {
      id: "prng-vs-hardware",
      title: "PRNG versus hardware RNG",
      body: `Two families of generator show up in casino engineering.

### Hardware / true RNG

A hardware RNG (sometimes called a TRNG) measures a physical process that is hard to predict: thermal noise, photon arrival times, clock jitter. The output is not a mathematical sequence. It is a stream of bits extracted from the world. Good hardware RNGs pass statistical tests and include health checks so a stuck sensor cannot quietly emit a constant.

Casinos and lotteries have used hardware noise for decades, especially to seed something else. Hardware is slower than a CPU formula and needs careful electronics. It also gives you no transcript. After the bit is consumed, there is nothing to republish so a player can recompute last Tuesday’s spin.

### Pseudo-random generators

A PRNG is an algorithm. It starts from a seed and applies a deterministic function to produce a long sequence that looks random. Anyone who has the seed and the algorithm can reproduce the exact sequence. That is a flaw if the seed leaks. It is a feature if you want later verification.

Online casinos almost always use a cryptographically secure PRNG (CSPRNG), such as a generator based on a block cipher or a hash, not a toy linear congruential generator from a programming textbook. A CSPRNG is designed so that seeing a stretch of output does not let you cheaply recover the seed or predict the next block.

### What operators actually do

The common production pattern is hybrid: hardware or operating-system entropy seeds a CSPRNG, and the CSPRNG produces the numbers used in games. That is fast, and it avoids burning a hardware device on every spin. Our [RNG versus provably fair](/guides/rng-vs-provably-fair) guide compares the trust model that follows from this design.

| Property | Hardware RNG | PRNG / CSPRNG | Provably fair seed |
| --- | --- | --- | --- |
| Source | Physical noise | Algorithm + seed | CSPRNG seed, then hash |
| Replayable | No | Yes, if you have the seed | Yes, after reveal |
| Player check | Certificate / trust | Usually none | Hash match + remapping |
| Speed | Slower | Fast | Fast |
| Failure mode | Sensor stuck on a constant | Weak or leaked seed | Commitment missing or biased map |`,
    },
    {
      id: "seeding",
      title: "Seeding and why the seed is the secret",
      body: `A PRNG without a secret seed is a movie you can rewind. Seeding is the step that injects uncertainty.

### What a seed is

The seed is the starting state. Typical sources include the operating system’s entropy pool, a hardware noise chip, high-resolution clocks mixed with other events, and, in provably fair designs, a server secret that is hashed in public before use. Weak seeds are a classic failure: using only the current Unix time, a sequential round ID, or a player-visible value lets a sophisticated attacker precompute outcomes.

### Forward secrecy and rotation

Even a strong CSPRNG should be reseeded or have its game-level secret rotated. Provably fair sites rotate the server seed on a schedule or after a nonce range so that a later leak does not rewrite the entire history in a useful way. The [server seed and client seed](/guides/server-seed-client-seed) guide explains how player input is mixed in so the operator cannot cherry-pick a seed after seeing the bets.

### Client seeds

A client seed is entropy the player (or the player’s browser) contributes. Combined with the server seed and a nonce, it stops the house from computing “which server seed would make this player lose” after the bet is known — provided the server seed was committed first. HMAC constructions in our [HMAC-SHA256](/guides/hmac-sha256-provably-fair) guide are the usual mixer.`,
    },
    {
      id: "mapping",
      title: "From random bits to a game result",
      body: `Unpredictable bits are not enough. The conversion into a wheel slot or a coin side must give each legal outcome its stated probability.

### Fair mapping

Suppose you need one of 15 equally likely roulette slots. Taking a huge integer modulo 15 is tempting and slightly wrong if the integer range is not a multiple of 15: the low residues appear a little more often. The unbiased fix is rejection sampling: draw a number, throw it away if it sits in the incomplete last bucket, draw again. PVPspinArena Roulette uses rejection sampling so each of the 33 slots is equally likely.

For a coin, one bit of a hash is enough: 0 is one side, 1 is the other. That is an exact 50/50 if the hash behaves like random bits.

### Biased mapping is a silent edge

A sloppy modulo, a dropped high bit, or a “shuffle” that picks cards with a nested loop can move probability by fractions of a percent. That is enough to change the real RTP from the help-screen RTP. Certification labs look for this. Provably fair pages should document the mapping so you can reproduce it.

### Independence

Each round should use a fresh nonce or a fresh draw so yesterday’s result does not leak today’s. Independent rounds are also why streaks do not “correct themselves”. The generator does not owe you a Green after fourteen Purples.`,
    },
    {
      id: "certificates",
      title: "What an RNG certificate does not prove",
      body: `Independent labs take millions of outputs, run statistical batteries, review source or configuration, and issue a report that the tested build looked unbiased and matched the stated RTP. That is useful. It is not a per-bet receipt.

A certificate does not prove that the binary on the server tonight is the binary that was tested. It does not prove that your particular spin used the certified path. It does not prove the operator left the RTP setting where the brochure said. In a well-regulated market, licensing and change control reduce those risks. They still ask you to trust institutions.

An RNG box in the footer also does not let you recompute a result at home. There is no published pre-commitment. If you want that property, you need a hash published before betting, then a seed reveal after. That is the gap a provably fair design fills, as described in the [provably fair casino](/guides/provably-fair-casino) overview.`,
    },
    {
      id: "provably-fair-check",
      title: "How a hash gives you a check the RNG box does not",
      body: `Provably fair games still need an RNG. Someone has to create a secret server seed. The extra machinery is commit-reveal.

1. The server samples a seed (RNG or CSPRNG).
2. It publishes SHA-256(seed) or an HMAC commitment before bets lock.
3. Players may contribute a client seed.
4. The result is a documented function of server seed, client seed and nonce.
5. After the round, the server seed is revealed. You hash it. If the digest matches the commitment, the seed was not swapped after seeing the bets. You then recompute the mapping.

That is a check an audit logo cannot offer: a binding statement about this round, verifiable in your browser. It does not change the house edge. It does not prove the cashier will pay. It proves the committed seed produced the published outcome.

### Worked outline, no full hash

Before a roulette round you see a 64-character hex commitment. After the spin you are shown the server seed. You SHA-256 the seed; it matches the commitment. You run the documented rejection-sampling map; it lands on Silver, which is what the wheel showed. If either check fails, the round is not the round that was promised. You can run the same steps on the [fairness](/fairness) page without trusting our servers to grade the homework.`,
    },
    {
      id: "pvp",
      title: "How PVPspinArena generates each result",
      body: `All three games are server-authoritative and provably fair.

### Roulette

A seed hash is published before the betting window. After lock, HMAC-SHA256 material is mapped onto 33 slots with rejection sampling: 16 Purple, 16 Silver, 1 Green. The animation is display. The slot is maths. Watch a cycle on [Roulette](/roulette) and then verify it.

### Coinflip

Two matched stakes. One bit (or equivalent) of the hash picks the winner. With a 0% default fee the game is even between the two players; the RNG is only choosing who takes the pot.

### Jackpot

The committed seed plus round data pick a point on the pot line. Tickets are proportional to stake. The generator does not “owe” the player who just lost; it owes a uniform draw over the pot.

### What to remember

How random number generators work is the easy half: seed, expand, map. The hard half is whether you are asked to trust a lab, or whether you are given a hash you can check. PVPspinArena chooses the second. Gambling is still 18+ and still has a cost on house-banked bets. Use the verifier; do not treat a fair draw as a reason to raise the stake.

A physical shuffle is a different randomness problem; see [how to shuffle cards](/guides/how-to-shuffle-cards).`,
    },
  ],
  faqs: [
    {
      q: "How do random number generators work in online casinos?",
      a: "A CSPRNG, often seeded from hardware or OS entropy, produces an unpredictable number. The game maps that number onto an outcome. You usually cannot see the seed.",
    },
    {
      q: "What is the difference between a PRNG and a hardware RNG?",
      a: "A hardware RNG samples physical noise. A PRNG is an algorithm driven by a seed. Online casinos typically seed a cryptographic PRNG and use that stream for speed.",
    },
    {
      q: "Can a casino predict its own RNG?",
      a: "If it knows the seed and algorithm, a PRNG is reproducible. That is why seeds must stay secret until after the bet, and why provably fair sites commit to a hash first.",
    },
    {
      q: "Does a certified RNG mean each spin is checkable?",
      a: "No. Certification is a lab opinion about a tested build. It is not a per-round transcript. Provably fair hashes are the per-round check.",
    },
    {
      q: "Do provably fair games still use an RNG?",
      a: "Yes. They use one to create the server seed. The hash and reveal let you verify that the seed you were shown is the seed that was committed.",
    },
    {
      q: "How do I verify a PVPspinArena result?",
      a: "Open the fairness page, enter the round, and recompute the hash and mapping in your browser. The method is the same idea as an independent script.",
    },
  ],
  sources: [
    {
      label: "NIST SP 800-90A: Random number generation",
      url: "https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final",
    },
    {
      label: "NIST: Secure Hash Standard (FIPS 180-4)",
      url: "https://csrc.nist.gov/publications/detail/fips/180-4/final",
    },
    {
      label: "Wikipedia: Pseudorandom number generator",
      url: "https://en.wikipedia.org/wiki/Pseudorandom_number_generator",
    },
  ],
  related: [
    "provably-fair-casino",
    "rng-vs-provably-fair",
    "hmac-sha256-provably-fair",
    "provably-fair-calculator",
    "server-seed-client-seed",
    "how-to-shuffle-cards",
  ],
  updated: "2026-09-26",
};

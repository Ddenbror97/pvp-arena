import type { Guide } from "./types";

export const guide: Guide = {
  slug: "provably-fair-roulette",
  cluster: "Provably fair",
  keyword: "provably fair roulette",
  secondary: ["verify roulette spin", "crypto roulette fairness", "roulette rejection sampling", "roulette seed"],
  title: "Provably Fair Roulette: How Every Spin Is Verified",
  description:
    "How provably fair roulette works: seed commitments, HMAC-SHA256, rejection sampling for an unbiased wheel, and how to verify any spin step by step yourself.",
  h1: "Provably fair roulette: how every spin is verified",
  answer:
    "Provably fair roulette is online roulette where each spin's result is fixed by a secret seed whose hash is published before betting closes. After the spin, the seed is revealed and anyone can recompute the result. On PVPspinArena, the slot is drawn with HMAC-SHA256 and rejection sampling, so every one of the 15 slots is exactly equally likely.",
  facts: [
    "Each round has its own 32-byte server seed, committed with SHA-256 before bets lock.",
    "The slot comes from HMAC-SHA256 over PVPCasino:roulette:v1:{round}:{draw_version}:{counter}.",
    "Rejection sampling removes the tiny bias a plain modulo would cause.",
    "PVPspinArena's wheel has 15 slots: 7 Purple (2x), 7 Silver (2x), 1 Green (14x).",
    "Any finished round can be verified in your browser on the Fairness page.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What makes roulette provably fair?",
      body: `In a physical casino, you can watch the ball and the wheel. Online, the result comes from software, and you normally have no way to check it. Provably fair roulette changes that by making every spin checkable with cryptography.

The idea has three parts:

1. **Commit before bets lock.** The site generates a secret seed for the round and publishes its SHA-256 hash.
2. **Compute from the seed.** The winning slot is calculated from that seed with a published formula.
3. **Reveal after the spin.** The seed is published, so anyone can hash it, check the commitment and repeat the calculation.

If the revealed seed matches the commitment and the formula gives the same slot, the spin was decided before bets locked and was not changed. The wheel animation is just a display of that pre-decided result.

This guide walks through PVPspinArena's roulette formula in detail. For the game itself, including colours, payouts and odds, see our [CS2 roulette guide](/guides/cs2-roulette). For the general principles, see the [provably fair casino guide](/guides/provably-fair-casino).`,
    },
    {
      id: "round",
      title: "The round lifecycle",
      body: `PVPspinArena roulette runs continuously. A timed worker advances rounds every second on the server, so rounds keep cycling whether or not anyone is betting and whether or not anyone has the page open.

### Each round

1. **Open.** A new round is created with a fresh random 32-byte server seed. Its SHA-256 hash is stored and shown.
2. **Betting.** Players place bets on Purple, Silver or Green.
3. **Locked.** Betting closes. The seed was committed well before this moment.
4. **Draw.** The server computes the winning slot from the seed.
5. **Spin.** The wheel animates for about seven seconds and lands on the drawn slot.
6. **Settle and reveal.** Winning bets are paid, and the seed becomes public.

### Why the timing matters

The critical property is that the commitment exists before bets are known and before betting closes. If a site published the hash only after the spin, it could have chosen the seed with full knowledge of the bets. On PVPspinArena, the hash is created at round creation, before the first bet can be placed.

You can see the live wheel and recent round numbers on the [Roulette page](/roulette).`,
    },
    {
      id: "formula",
      title: "The formula, step by step",
      body: `Here is exactly how a PVPspinArena roulette slot is drawn.

1. **Build the message**: \`PVPCasino:roulette:v1:\` + round number + \`:\` + draw version + \`:\` + counter. The counter starts at 0.
2. **Compute h** = HMAC-SHA256(key = server seed bytes, data = message as UTF-8 text).
3. **Take the first 8 bytes** of h and read them as a big-endian unsigned 64-bit number r. That gives a number between 0 and 18,446,744,073,709,551,615.
4. **Compute the limit**: the largest multiple of 15 that is less than or equal to 2^64. In formula form, limit = floor(2^64 / 15) × 15.
5. **Check r against the limit.** If r is below the limit, continue. If not, add 1 to the counter and go back to step 1.
6. **Slot** = r mod 15.
7. **Colour** = the colour at that slot in the round's published layout.

### Why a counter

The counter lets the draw produce a new candidate number from the same seed without any new input. It is fixed in the formula, so nobody can use it to choose a result.

### Why the draw version

If a round ever had to be redrawn for a technical reason, the draw version would increase. That makes redraws visible and keeps the original commitment valid. The [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) explains the underlying function.`,
    },
    {
      id: "rejection",
      title: "Rejection sampling: why it matters",
      body: `Step 5 is what separates a careful roulette implementation from a sloppy one.

### The modulo bias problem

A 64-bit number has 2^64 possible values. That number does not divide evenly by 15. If you simply took r mod 15, the remainder values 0 up to 2^64 mod 15 minus 1 would each appear one extra time across the whole range. Those slots would be very slightly more likely than the others.

For 15 slots the bias is astronomically small, on the order of one part in a billion billion. But the principle matters: a fair wheel should give every slot exactly the same probability, not almost the same.

### How rejection sampling fixes it

By discarding any r at or above the largest multiple of 15, the remaining range divides perfectly into 15 equal groups. Each slot then corresponds to exactly the same number of possible r values. When a value is rejected, the counter increases and a fresh HMAC is computed.

### How often does it happen?

Almost never. The rejected range is tiny compared with 2^64, so in practice the counter is nearly always 0. It is there so the maths is exact, not approximately right.

This same technique is used for PVPspinArena's Jackpot draw, where the number of tickets can be any size. See the [crypto jackpot guide](/guides/crypto-jackpot).`,
    },
    {
      id: "layout",
      title: "The wheel layout and its odds",
      body: `The formula produces a slot number from 0 to 14. The round's layout maps each slot to a colour.

- **Purple**: 7 slots, pays 2x.
- **Silver**: 7 slots, pays 2x.
- **Green**: 1 slot, pays 14x.

### Probabilities

Because every slot is exactly equally likely, the chance of each colour is its slot count divided by 15:

- Purple: 7/15 ≈ 46.67%
- Silver: 7/15 ≈ 46.67%
- Green: 1/15 ≈ 6.67%

### Expected return

Each colour returns about 93.3% of stakes on average: 7/15 × 2 = 0.933 and 1/15 × 14 = 0.933. The house edge is therefore about 6.7% on every colour.

### Why the layout is part of verification

A verifier must use the same layout the round used. PVPspinArena stores the layout with each round and the verifier loads it. If a site changes its wheel, older rounds should still be verified against their own layout, not the new one. Being able to count slots yourself is also how you know the stated odds are true.`,
    },
    {
      id: "verify",
      title: "How to verify a spin",
      body: `### Using the built-in verifier

1. Note the round number from the recent results strip on the Roulette page, for example #389.
2. Open the [Fairness page](/fairness) and choose the Roulette tab.
3. Enter the round number. You can include the # symbol or leave it out.
4. The page loads the revealed seed, the commitment, the draw version and the layout.
5. Your browser checks that SHA-256 of the seed equals the commitment.
6. It runs the formula with rejection sampling and shows the slot, colour and counter used.
7. Compare the colour with the result shown when the wheel stopped.

### Using independent tools

1. Hash the seed with a SHA-256 tool that accepts hex input, and compare with the commitment.
2. Compute HMAC-SHA256 with the seed as a hex key and the message as plain text, for example \`PVPCasino:roulette:v1:389:1:0\`.
3. Take the first 16 hex characters of the output and convert them to a number, using a tool that supports 64-bit integers.
4. Check it is below 18,446,744,073,709,551,610, which is floor(2^64 / 15) × 15.
5. Take the remainder after dividing by 15. That is the slot.

The [provably fair calculator guide](/guides/provably-fair-calculator) covers common mistakes.`,
    },
    {
      id: "limits",
      title: "What verification proves, and what it does not",
      body: `A successful check tells you:

- The seed was committed before betting closed.
- The slot follows exactly from that seed and the published formula.
- Every slot had exactly the same probability.

It does not tell you, on its own:

- **That your bet was settled correctly.** Check your balance history for that.
- **That the payouts are generous.** The house edge is set by the layout, which you can read, but verification does not change it.
- **That the site's seed generation is random.** The commitment prevents the site choosing a seed after seeing bets. Seeds are generated server-side with a cryptographic random generator before the round opens.

### Spot checks are enough

You do not need to verify every spin. A few random checks, particularly after a surprising result, are enough to hold a site to account, because any cheating would be visible to anyone who checked that round.`,
    },
    {
      id: "comparison",
      title: "Provably fair vs traditional online roulette",
      body: `Traditional online casino roulette usually relies on a random number generator certified by an independent testing lab. You trust the lab's audit and the operator's licence, but you cannot check an individual spin.

### Certified RNG

- **Checked by**: third-party labs periodically.
- **Individual spins**: not verifiable by players.
- **Trust in**: the auditor, the regulator and the operator.

### Provably fair

- **Checked by**: anyone, at any time.
- **Individual spins**: every one verifiable.
- **Trust in**: published maths and standard cryptography.

Both can be legitimate. Some players value regulated oversight; others value the ability to verify every result themselves. Our upcoming [RNG vs provably fair guide](/guides/rng-vs-provably-fair) compares them in more depth. For how PVPspinArena operates overall, see [how it works](/how-it-works).`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Provably fair roulette commits to a secret seed before bets lock, computes the spin from that seed with a published formula, and reveals the seed afterwards so anyone can check it.

On PVPspinArena, each round has its own 32-byte seed. The slot comes from HMAC-SHA256 over a message containing the round number, draw version and a counter, followed by rejection sampling so all 15 slots are exactly equally likely. The layout of 7 Purple, 7 Silver and 1 Green gives each colour an expected return of about 93.3%.

You can verify any finished round in your browser on the Fairness page or with independent tools. Verification proves the result, not the payout, so check both when you want complete peace of mind.`,
    },
  ],
  faqs: [
    {
      q: "How do I know a roulette spin was not changed?",
      a: "The seed's SHA-256 hash is published before bets lock. After the spin, the revealed seed must hash to that value and produce the same slot through the published formula.",
    },
    {
      q: "What is rejection sampling in roulette?",
      a: "A step that discards the rare random numbers that would make some slots slightly more likely, and draws again. It makes every slot exactly equally likely.",
    },
    {
      q: "Is the roulette animation the real result?",
      a: "The animation displays the result already computed from the committed seed. The outcome is decided by the formula, not by the animation.",
    },
    {
      q: "Can I verify a round from weeks ago?",
      a: "Yes. Settled rounds keep their seed, commitment and layout, so you can enter any finished round number on the Fairness page.",
    },
    {
      q: "Does the counter let the site pick a result?",
      a: "No. The counter only increases when a value is rejected, following a fixed rule. Anyone verifying can see which counter was used and why.",
    },
  ],
  sources: [
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST FIPS 180-4: Secure Hash Standard", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
    { label: "Wikipedia: Rejection sampling", url: "https://en.wikipedia.org/wiki/Rejection_sampling" },
  ],
  related: ["cs2-roulette", "provably-fair-calculator", "hmac-sha256-provably-fair"],
  updated: "2026-09-25",
};

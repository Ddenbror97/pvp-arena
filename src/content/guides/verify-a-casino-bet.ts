import type { Guide } from "./types";

export const guide: Guide = {
  slug: "verify-a-casino-bet",
  cluster: "Provably fair",
  keyword: "verify casino fairness",
  secondary: ["how to verify a bet", "check bet fairness", "verification walkthrough"],
  title: "How to Verify a Casino Bet (Step by Step)",
  description:
    "A complete walkthrough for verifying a single bet: gathering seed data, running the check, reading the output and escalating a mismatch.",
  h1: "How to Verify a Casino Bet, Step by Step",
  answer:
    "To verify casino fairness for one wager, collect the public inputs the operator promised before settlement: the pre-bet server seed hash, the revealed server seed, any client seed, nonce or round id, and the recorded result. Recompute the commitment hash, then run the published HMAC or formula and compare. A match shows the outcome followed the stated maths; a mismatch means you stop playing, document everything, and escalate with evidence rather than accepting chat reassurances. You do not need advanced maths: copy-paste discipline and the operator doc matter more than calculus. Build the habit on small bets so verification feels routine before stakes grow. Verification is the closest thing to a receipt for randomness: without it, you are trusting animation and chat tone alone. Treat the first verified bet as onboarding: repeat the steps until muscle memory makes checks boring, because boring checks are what keep you honest when stakes rise. Save your checklist in the same folder as bank statements so financial and fairness reviews happen together.",
  facts: [
    "Verification always starts with the commitment shown before the bet, not only the revealed seed afterwards; missing hashes cannot be reconstructed.",
    "Separator order in HMAC messages is part of the protocol; swapping client seed and nonce breaks honest checks even on honest sites.",
    "Round-based PvP games may omit a personal nonce and instead publish one server seed per pot shared by all tickets.",
    "A passing check proves consistency with published rules, not that the rules favour the player or remove house edge.",
    "PVPspinArena reveals server seeds after Jackpot, Coinflip and Roulette settle so you can rerun the same HMAC path shown on Fairness.",
  ],
  sections: [
    {
      id: "what-you-need-before-verifying",
      title: "What you need before verifying",
      body: `Fairness checking is bookkeeping. Gather fields first so you do not chase ghosts.

### Mindset

You are testing whether the operator kept a promise: results come from seeds that were locked early. This is how you **verify casino fairness** without trusting animations.

### Core fields

Most provably fair systems need:

1. Server seed hash shown before the bet
2. Revealed server seed after settlement
3. Client seed if the player contributes one
4. Nonce, cursor or round id for that exact wager
5. Game id or version string if docs require it
6. The outcome recorded on the slip

### Tools

A local script, notebook, or trusted [provably fair calculator](/guides/provably-fair-calculator) beats a black-box widget that only works while logged in.

### Time limit

Grab screenshots when seeds rotate. Some sites hide old commitments after a few days.

### Topic map

This walkthrough sits in the [provably fair guides](/guides/topics/provably-fair) cluster alongside [commit-reveal](/guides/commit-reveal-scheme) theory and [server seed and client seed](/guides/server-seed-client-seed) pairing rules.

### Record keeping template

Create a spreadsheet with columns for date, game, stake, server seed hash, revealed seed, client seed, nonce, result and pass/fail. One row per verified bet builds evidence if patterns shift later.

### Trust tiers

After five clean checks on different days, you might trust the operator for routine play while spot-checking monthly. After one failure, drop to zero trust until resolved. Verification is not a one-time badge; it is ongoing sampling. Keep a dedicated folder for fairness screenshots synced to cloud storage so a lost phone does not erase your only copy of a pre-bet hash.`,
    },
    {
      id: "finding-your-bets-seed-data",
      title: "Finding your bet's seed data",
      body: `UI layouts differ, but the data lives in predictable places.

### During the bet

Before you confirm a wager, open the fairness panel. Copy the server seed hash exactly. Note the client seed value and whether you can change it for the next round.

### After settlement

Fairness history lists revealed server seeds tied to round ids or nonces. Match the timestamp and stake to your bet slip.

### PvP rounds

Shared pots may show one server seed hash for everyone in a Jackpot or [Coinflip](/coinflip) round. Your personal bet id still maps to that round on [how it works](/how-it-works).

### Mobile truncation

Long hex strings sometimes truncate in mobile views. Expand or export full values before verifying.

### Missing data

If the site never showed a pre-bet hash, you cannot verify retroactively. That alone is a stop sign discussed in [fake casino sites](/guides/fake-casino-sites) patterns.

### Export habits

Download CSV history when offered. Store hashes outside the chat log so support cannot argue about what you saw.

### Live versus history tabs

Some sites show the active seed hash on a live tab but move revealed seeds to a history tab with different formatting. Match bet ids carefully so you do not verify the wrong round after a long session on [Coinflip](/coinflip) or similar fast games.`,
    },
    {
      id: "running-the-verification",
      title: "Running the verification",
      body: `Follow the operator recipe literally.

### Step 1 — commitment

Hash the revealed server seed with SHA-256 (unless docs specify another function). Compare to the hash you saved from before the bet. If this fails, the seed is not the one that was committed.

### Step 2 — message format

Build the HMAC message exactly as documented, for example clientSeed:nonce with the right separator. Our [HMAC-SHA256 provably fair](/guides/hmac-sha256-provably-fair) page explains common templates.

### Step 3 — digest to outcome

Convert HMAC bytes to a float or integer using the published rejection or modulo rules. Different games consume different slices of the digest.

### Step 4 — compare

The recomputed value should equal the recorded result. Off-by-one usually means a cursor indexing mistake, not necessarily malice.

### Independent rerun

Run the same inputs in two tools. Agreement between tools isolates typos from site bugs.

### Chain bets

If the wager settled on-chain, also confirm the explorer payout matches the recomputed winner even when seeds are off-chain.

### Version tags

If the operator ships fairness v2, note the version string in your spreadsheet. Mixing v1 formulas with v2 bets creates false mismatches that waste support time.`,
    },
    {
      id: "reading-the-output",
      title: "Reading the output",
      body: `Learn what success and failure imply before you accuse anyone.

### Full pass

Commitment matches and outcome matches. The bet was consistent with the published algorithm at the moment of settlement.

### Commitment fail

The revealed seed does not hash to the earlier commitment. That is serious: either you copied wrong, the site rotated incorrectly, or the operator lied about the lock.

### Outcome fail with good commitment

The seed was locked, but the result does not follow the formula. Possible bugs, wrong game version in your message, or fraud.

### Partial checks

Some sites let you verify only the hash step online while hiding HMAC details. Demand full transparency.

### Edge reminder

Passing checks do not change house edge. They address trust in execution, not profitability. Pair verification with [gambling budget](/guides/gambling-budget) limits on the [responsible gambling](/responsible-gambling) page.

### Share responsibly

When posting verification results publicly, redact client seeds if the operator treats them as session secrets, but keep full values in private notes for your own recomputation.`,
    },
    {
      id: "verifying-each-game-type",
      title: "Verifying each game type",
      body: `Game families reuse patterns but differ in details.

### Dice and limbo

Usually one HMAC per bet with a nonce. Map digest to a range with documented precision bits.

### Crash and multipliers

Often derive a single crash point from the first bytes. Confirm whether the displayed curve is cosmetic only.

### Roulette and wheel games

Map the digest to a pocket index with a fixed wheel layout. PVPspinArena publishes winning slot and colour at lock so the strip matches; recompute with the round seed after settlement on [Roulette](/roulette).

### Coinflip and binary pots

Binary outcomes still need the same HMAC path. Shared pots use round seeds, not per-player nonces.

### Slots and multi-reel

May advance an internal cursor several times per spin. Read whether one nonce consumes multiple HMAC calls.

### House versus PvP

Compare round-based verification in [provably fair games](/guides/provably-fair-games) with nonce streams in long-lived seed pairs from [RNG versus provably fair](/guides/rng-vs-provably-fair) explanations.

### Bonus rounds

Free spins and bonus buys sometimes draw from a secondary seed stream. Verify using the bonus-specific fields in the bet detail modal, not the base-game seed still shown in the header.`,
    },
    {
      id: "what-a-mismatch-means",
      title: "What a mismatch means",
      body: `Do not panic, but do not deposit again until you understand the gap.

### Innocent causes

Typo in a 64-character seed, wrong nonce because the UI shows the next cursor, using SHA-256 where HMAC is required, or verifying a bonus-buy round with the base-game formula.

### Serious causes

Late commitment, undisclosed seed changes, or results drawn before the hash was shown to players.

### Sample size

One failure deserves a pause. Repeated failures across independent recomputations are evidence.

### Document

Save URLs, timestamps, full hex strings, and wallet addresses. Hash your screenshots if you need integrity later.

### Stop playing

Continue only after the operator explains reproducibly or you independently confirm a fix. Chasing losses while fairness is unresolved is how bankrolls die.

### Community verification

If others independently reproduce your mismatch with the same inputs, treat that as stronger evidence than a solo forum post. If only you fail while dozens pass, revisit typos first.`,
    },
    {
      id: "escalating-a-failed-check",
      title: "Escalating a failed check",
      body: `Escalation is structured communication, not rage tickets.

### First contact

Open support with bet id, round id, both seeds, nonce, your recomputation steps, and expected versus actual outcome. Ask which doc version applies.

### Public forums

Some communities host fairness threads. Post redacted evidence; never share live session tokens.

### Regulators and ADRs

Licensed operators may answer formal complaints. Offshore-only sites may ignore them. Know that limit before you deposit large sums.

### Chargebacks rarely help crypto

On-chain deposits usually cannot be reversed. Prevention beats dispute.

### When to walk away

If support hand-waves, changes docs retroactively, or refuses to show the pre-bet hash archive, leave and warn others with facts.

### Keep learning

After one successful verification, batch-check a few older bets whenever seeds rotate. That habit catches drift early and complements reading [provably fair casino](/guides/provably-fair-casino) fundamentals before your next session.

### Automating checks

Power users script HMAC steps in Python or JavaScript. Start manually until you trust the operator format; automation comes after you have verified ten bets by hand without errors. Scripts should live in your repo with comments linking to the operator doc version so you notice when their message format changes between deployments.

### Closing checklist

Before you trust a site long term, verify at least three bets you did not win, not only jackpots. Confirm the pre-bet hash archive is reachable without support. Save the operator formula URL with a date stamp. If any step requires login-only widgets, downgrade your trust tier. Verification is a skill: the first bet takes twenty minutes; the tenth takes two. That time investment is cheaper than a single deposit to a dishonest operator you never tested. Teach a friend the same steps on a free demo bet if the site offers one, so you both agree the procedure is reproducible before either of you funds real money.`,
    },
  ],
  faqs: [
    {
      q: "How long do I have to verify a bet?",
      a: "Until you still have the pre-bet hash and the revealed seed. Some sites delete old rounds quickly, so verify soon after settlement. Export history the same day if the product allows downloads.",
    },
    {
      q: "Do I need programming skills?",
      a: "No. Calculators and copy-paste notebooks work if you follow the published message format exactly.",
    },
    {
      q: "Does verification prove the casino is licensed?",
      a: "No. It proves maths consistency for that wager. Licensing is a separate question.",
    },
    {
      q: "Can I verify PVPspinArena roulette?",
      a: "Yes. After the round settles, use the revealed server seed and the documented HMAC steps on the Fairness page to match the published result.",
    },
    {
      q: "What if support says my tool is wrong?",
      a: "Ask for a worked example with the same inputs, including separators and hash output. Recompute their example independently. If their official sample fails in your tool and theirs, treat fairness as unresolved and stop depositing until they fix documentation or code.",
    },
  ],
  sources: [
    {
      label: "NIST FIPS 180-4 — Secure Hash Standard",
      url: "https://csrc.nist.gov/publications/detail/fips/180/4/final",
    },
    { label: "IETF RFC 2104 — HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
  ],
  related: [
    "provably-fair-calculator",
    "hmac-sha256-provably-fair",
    "commit-reveal-scheme",
    "server-seed-client-seed",
    "provably-fair-casino",
  ],
  updated: "2026-09-26",
  howTo: true,
};

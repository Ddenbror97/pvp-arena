import type { Guide } from "./types";

export const guide: Guide = {
  slug: "seed-rotation-provably-fair",
  cluster: "Provably fair",
  keyword: "seed rotation provably fair",
  secondary: ["rotate server seed", "seed reveal", "new seed pair"],
  title: "Seed Rotation in Provably Fair Casinos | PvP Spin Arena",
  description:
    "Rotating a server seed is how you close the book on past bets. When to rotate, how to verify the reveal, and what rotation cannot prove.",
  h1: "Seed Rotation: When and Why to Reveal a Server Seed",
  answer:
    "Seed rotation provably fair practice means ending one committed server seed, revealing it so past bets can be checked, then starting a new seed with a fresh public hash. Rotation closes the book on a seed pair so a later leak cannot rewrite history you already verified. It does not remove the house edge, and it does not prove the next seed is “luckier” than the last.",
  facts: [
    "Rotation reveals the old server seed and publishes a hash of the new one before further bets.",
    "You should verify that the revealed seed hashes to the commitment shown during that seed’s life.",
    "Changing only the client seed without revealing the server seed is not a full rotation.",
    "Per-round games rotate automatically because each round gets its own seed.",
    "PVPspinArena reveals the round seed after settlement; you do not manage a long-lived pair yourself.",
  ],
  sections: [
    {
      id: "lifecycle",
      title: "The seed lifecycle",
      body: `A long-lived [server seed and client seed](/guides/server-seed-client-seed) pair moves through a fixed lifecycle.

### Create and commit

The server draws a secret seed and shows you its hash. That hash is the commitment. Until reveal, nobody should be able to read the seed, and the operator should not be able to swap it without breaking the hash.

### Play

Bets under that pair use the seed plus a rising nonce or cursor. Results can be checked only after reveal, so during play you are trusting the commitment, not yet verifying outcomes.

### Reveal and rotate

When you click rotate (or the site forces a rotate after N bets), the old seed is published. You hash it and compare with the old commitment. Then a new seed is committed and the counter resets.

### Round-based shortcut

Shared arenas often skip the long-lived pair. Each Jackpot or [Coinflip](/coinflip) round is its own miniature lifecycle: commit, play, reveal. That is still seed rotation, just at round frequency. See the [commit-reveal scheme](/guides/commit-reveal-scheme) for the cryptographic pattern.`,
    },
    {
      id: "why",
      title: "Why rotation matters",
      body: `Rotation is how you convert a promise into a checkable record.

### Close the audit window

While a seed stays secret, you cannot prove past results. Reveal lets you recompute every nonce from that era. Without rotation, a compromise of the live seed is harder to bound in time.

### Limit damage from leaks

If a server seed leaks while still active, anyone who also knows the client seed can predict upcoming nonces. Rotating after sessions shrinks that window. It is hygiene, not magic.

### Separate eras in your records

Screenshots and exports make more sense when each seed era has a clear start hash, end reveal and nonce range. That helps if you later dispute a bet.

### Hub context

Rotation sits beside nonce and HMAC pages in the [provably fair guides](/guides/topics/provably-fair) topic. Read those before treating rotation as a luck ritual.`,
    },
    {
      id: "when",
      title: "When to rotate manually",
      body: `Sites differ on defaults. Use these triggers as a practical baseline.

### After a session

Rotate when you stop for the day so tonight’s seed cannot be reused tomorrow without a fresh commitment.

### After a big win or loss streak

Streaks do not prove bias, but they are a natural moment to close the book and verify a sample of nonces before continuing.

### After changing devices or sharing a screen

If a client seed was visible to someone else, rotate so future nonces are not predictable from a leaked pair.

### When the site prompts you

Some operators rotate for you after a fixed bet count. Accept the reveal, verify the hash, then confirm the new commitment before the next wager.

### Why the order matters

People sometimes rotate out of superstition after a cold run. The useful motive is narrower: you want a finished era you can audit, and a fresh commitment you can see before risking more money. Superstition does not change expected value; verification does change what you can prove.

### Interaction with auto-bettors

Bots that fire hundreds of bets a minute make manual rotation painful. Prefer sites that auto-rotate on a cap, or pause the bot, rotate, verify, then resume. Leaving a bot running across a reveal can create ambiguous nonce logs if the UI resets mid-flight.`,
    },
    {
      id: "verify-reveal",
      title: "Verifying the revealed seed hash",
      body: `The only mandatory check at rotation time is the commitment match.

### Steps

1. Copy the seed hash that was displayed while the old seed was active.
2. Copy the revealed server seed in full.
3. Compute SHA-256 of the revealed seed (encoding as the docs specify).
4. Compare digests. Any difference means the revealed value is not what was committed.

### Then sample results

With the seed in hand, recompute a few nonces using the published HMAC or hash formula. A [provably fair calculator](/guides/provably-fair-calculator) helps when the operator follows a common template. Details of keyed hashing are in the [HMAC-SHA256](/guides/hmac-sha256-provably-fair) guide.

### On PVPspinArena

Open [Fairness](/fairness), pick the game, enter the round id, and let the checker confirm the revealed seed against the commitment and the recorded land. You can also recompute offline from the printed formulas.`,
    },
    {
      id: "limits",
      title: "What rotation does not protect",
      body: `Players sometimes oversell rotation. Keep the limits clear.

### Not proof of randomness quality

A matching reveal proves the seed was not swapped. It does not prove the seed was drawn from a strong entropy source. Client seeds and external randomness reduce that concern; they do not disappear because you rotated.

### Not a payout guarantee

Fair draws still lose. Withdrawal policy, custody and fees are separate questions from seed lifecycle.

### Not a substitute for reading the formula

Rotating on a site that never publishes the message format still leaves you blind. Prefer operators covered by a clear [provably fair casino](/guides/provably-fair-casino) process.

### Not the same as an audit seal

Laboratory certificates and seed rotation answer different questions. Compare [RNG versus provably fair](/guides/rng-vs-provably-fair) before treating either as complete safety.`,
    },
    {
      id: "habits",
      title: "Rotation habits for regular players",
      body: `Build a short routine so rotation stays useful.

### Log the essentials

Keep date, old hash, revealed seed, new hash, and the last nonce used. A spreadsheet is enough.

### Verify before you trust the new pair

Never place a large bet on a new commitment you have not even glanced at. Confirm the hash is visible in the UI before staking.

### Prefer per-round designs for shared pots

When you play multiplayer, automatic per-round reveal is usually cleaner than managing a personal pair. That is the model on PVPspinArena’s arena games described under [how it works](/how-it-works).

### Stay within a budget

Technical hygiene does not replace money limits. Use a [gambling budget](/guides/gambling-budget) and the site [responsible gambling](/responsible-gambling) tools.`,
    },
    {
      id: "walkthrough",
      title: "Step-by-step rotation walkthrough",
      body: `A concrete sequence for a typical house-game UI:

1. Note the current server seed hash and client seed.
2. Stop auto-bet scripts so no wager lands during the rotate.
3. Click “rotate” or “reveal seed”.
4. Save the revealed server seed.
5. Hash it; confirm it matches the old commitment.
6. Pick three nonces from your history and recompute results.
7. Confirm the new seed hash is showing before the next bet.
8. Reset or note the nonce counter at zero (or whatever the UI uses).

### If the hash fails

Do not keep playing. Export evidence, contact support in writing, and move funds off the site if you can. Cross-check the domain against [fake casino sites](/guides/fake-casino-sites) patterns.

### If recomputed results fail but the hash matches

You likely used the wrong message format or nonce. Re-read the docs once. Persistent failures after a careful recheck are a serious integrity issue.

### Closing note

**Seed rotation provably fair** practice is bookkeeping for cryptographic promises. Do it on purpose, verify every reveal, and treat the next seed as untrusted until its commitment is visible.

### Extended example: closing a 200-bet seed pair

Imagine you played dice with one pair from nonce 0 to nonce 199. At rotation:

1. Export the full bet CSV if the site offers one.
2. Reveal the server seed and confirm the SHA-256 commitment.
3. Recompute nonce 0, nonce 100 and nonce 199.
4. Spot-check two losing bets and one winning bet so you are not only verifying favourable rows.
5. Store the revealed seed with the date; only then accept the new hash.

If any of the three recompute checks fail after you confirm the message format, treat the site as unsafe for further deposits. Integrity failures are not “variance.”

### Client seed changes versus true rotation

Some UIs let you edit the client seed without revealing the server seed. That changes future outputs but leaves past bets uncheckable and leaves the same secret in force. Label that a client refresh, not rotation. True **seed rotation** always includes a reveal of the retiring server seed and a new commitment hash before the next wagering era begins.

### Operator-forced rotations

Fair operators sometimes rotate for everyone on a schedule to limit the blast radius of a leaked seed. When that happens, you may not click a button, but you should still receive a reveal. If the site rotates silently without publishing the old seed, you lose the ability to audit that era — a serious transparency failure even if future commits look fine.`,
    },
    {
      id: "misconceptions",
      title: "Common misconceptions about rotating seeds",
      body: `A few myths waste time and money.

### “A new seed breaks a cold streak”

Outcomes under a fair formula are independent of your narrative about the last hour. Rotation changes the secret, not the expected value of the next bet.

### “I should rotate after every win”

Verifying wins is healthy; rotating after every win is optional. What matters is that each era you care about has a reveal you actually checked.

### “Client seed rotation is enough”

Without a server seed reveal, you cannot close the cryptographic book. Change the client seed for preference if you like, but schedule true reveals separately.

### “Per-round games never rotate”

They rotate constantly — once per round. The button is just missing because the lifecycle is automatic. Check each finished round on [Fairness](/fairness) the same way you would check a manual reveal.

### “Rotation replaces responsible play”

It does not. Pair technical checks with deposit limits and breaks on the [responsible gambling](/responsible-gambling) page. Adults 18+ only.

### How this page fits the hub

Use this guide with the [provably fair casino](/guides/provably-fair-casino) overview when you evaluate a new operator’s seed UI. If they cannot explain rotation in plain language, assume the rest of their fairness story is incomplete.

Keep notes in plain language: “Seed A active from Monday 18:00, revealed Tuesday 09:10, last nonce 84, hash matched.” Future you will thank present you when a dispute appears weeks later.

Rotation discipline is easiest when you treat it like closing a shop till: count the drawer, print the tape, lock the door, open a new till in the morning. The revealed seed is the tape. The new hash is the locked door on tomorrow’s drawer. Skipping the tape because you are tired is how disputed bets become unprovable stories. If a friend asks whether a site is honest, being able to show two matched reveals is more persuasive than any slogan on the homepage. Practice on small stakes until the motions are automatic, then keep the same motions when the numbers get larger.`,
    },
  ],
  faqs: [
    {
      q: "What does seed rotation mean on a casino?",
      a: "It means revealing the current server seed so you can verify past bets, then committing to a new seed hash before further play.",
    },
    {
      q: "Should I rotate after every bet?",
      a: "Usually no. Per-bet rotation is slow and unnecessary if nonces already separate outcomes. Rotate per session or when the site’s bet limit for a pair is reached.",
    },
    {
      q: "Does rotating improve my odds?",
      a: "No. Rotation changes which secret is in force. It does not change multipliers, fees or the house edge.",
    },
    {
      q: "How does PVPspinArena handle rotation?",
      a: "Each Jackpot, Coinflip and Roulette round uses its own committed seed that is revealed after settlement, so you are not managing a long-lived pair.",
    },
    {
      q: "What if the revealed seed does not match the hash?",
      a: "Stop playing, keep records, and contact support. A failed commitment match is a fundamental break in the fairness promise.",
    },
  ],
  sources: [
    {
      label: "NIST — SHA-256 (FIPS 180-4)",
      url: "https://csrc.nist.gov/publications/detail/fips/180/4/final",
    },
    { label: "IETF RFC 2104 — HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
  ],
  related: [
    "server-seed-client-seed",
    "provably-fair-casino",
    "commit-reveal-scheme",
    "hmac-sha256-provably-fair",
  ],
  updated: "2026-09-26",
};

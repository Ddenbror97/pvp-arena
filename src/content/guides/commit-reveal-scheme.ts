import type { Guide } from "./types";

export const guide: Guide = {
  slug: "commit-reveal-scheme",
  cluster: "Provably fair",
  keyword: "commit reveal scheme",
  secondary: ["commitment scheme", "hash commitment", "commit reveal cryptography", "sealed envelope proof"],
  title: "Commit Reveal Scheme: The Idea Behind Provably Fair",
  description:
    "What a commit reveal scheme is, why hiding and binding matter, how hash commitments work, and how games, auctions and blockchains use them to prove fairness.",
  h1: "Commit reveal scheme: the idea behind provably fair",
  answer:
    "A commit reveal scheme is a two-step cryptographic method. First you commit to a secret value by publishing a fingerprint of it, usually a hash, without revealing the value itself. Later you reveal the value, and anyone can check that it matches the commitment. It proves a choice was fixed in advance and not changed afterwards.",
  facts: [
    "A good commitment is hiding (it reveals nothing) and binding (it cannot be changed).",
    "The simplest commitment is a cryptographic hash such as SHA-256 of the secret.",
    "Commit reveal is used in games, sealed-bid auctions, voting and blockchain randomness.",
    "Provably fair casinos commit to a server seed before play and reveal it after.",
    "PVPspinArena commits a SHA-256 hash of each round's 32-byte seed before entries open.",
  ],
  sections: [
    {
      id: "idea",
      title: "The sealed envelope idea",
      body: `Imagine you want to predict the winner of a match without influencing anyone, but you also want to prove afterwards that you called it. You write your prediction on a card, seal it in an envelope and give the envelope to a friend. After the match, you open it together. Your friend could not read it early, and you could not change it once sealed.

That is a commit reveal scheme. It has two phases:

1. **Commit.** You lock in a value and publish something that proves you have locked it in, without revealing it.
2. **Reveal.** Later, you disclose the value, and anyone can check it matches what you committed to.

In the digital world, the envelope is replaced by cryptography. Instead of paper, you publish a short fingerprint of your secret. The fingerprint reveals nothing about the secret, but it can only match one value.

This simple idea is the foundation of every [provably fair casino](/guides/provably-fair-casino). It lets a site prove that it chose a game's secret before any bets were placed, and that it did not swap the secret afterwards.`,
    },
    {
      id: "properties",
      title: "Hiding and binding",
      body: `Cryptographers describe a commitment scheme with two properties.

### Hiding

A commitment is **hiding** if nobody can learn anything about the secret from the commitment itself. In the envelope analogy, the envelope is opaque. In a game, this means players cannot see the result before it happens.

### Binding

A commitment is **binding** if the person who made it cannot later reveal a different value that also matches. The envelope is sealed. In a game, this means the site cannot change the result after seeing bets.

### Why both matter

- If a commitment is not hiding, players could see the result early and only bet when they would win.
- If it is not binding, the site could pick a new secret after bets are placed to make the house or a favoured player win.

A scheme needs both properties at once. In practice, the strength of each depends on the cryptography used. With a modern hash function and a long random secret, both hold to a level where breaking them would take far more computing power than exists.`,
    },
    {
      id: "hash",
      title: "Hash-based commitments",
      body: `The most common way to build a commitment is with a cryptographic hash function such as SHA-256.

### How it works

1. Choose a secret value s, for example 32 random bytes.
2. Compute c = SHA-256(s).
3. Publish c. This is the commitment.
4. Later, publish s. Anyone can compute SHA-256(s) and check it equals c.

### Why it is binding

SHA-256 is collision-resistant: nobody knows how to find two different inputs with the same output. So once c is published, only one value can open it.

### Why it is hiding

SHA-256 is one-way: given c, there is no practical way to work out s. But this only holds if s is hard to guess. If the secret were just "heads" or "tails", anyone could hash both words and compare. That is why the secret must be long and random, or combined with a random value called a salt or nonce.

### Why 32 bytes

A 32-byte random secret has 2^256 possibilities, far too many to try. PVPspinArena uses exactly this: a random 32-byte server seed for each round, committed with SHA-256. The [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) explains the related function used to compute results from that seed.`,
    },
    {
      id: "games",
      title: "Commit reveal in provably fair games",
      body: `In a provably fair game, the site is the one committing, and the players are the ones checking.

### The flow

1. **Commit.** Before a round accepts entries, the site generates a random server seed and publishes its SHA-256 hash.
2. **Play.** Players bet or join. Nobody can see the seed.
3. **Compute.** The result is calculated from the seed and public round details using a published formula.
4. **Reveal.** After the round settles, the site publishes the seed.
5. **Verify.** Anyone hashes the seed, checks it equals the commitment, and repeats the formula to get the same result.

### What it rules out

- The site cannot change the seed after seeing bets, because the commitment is binding.
- Players cannot foresee the result, because the commitment is hiding.
- The site cannot quietly use a different formula, because anyone can recompute the result.

### Adding player input

Single-player games often add a client seed from the player so the site cannot choose a seed that happens to work badly against a particular player. Shared rounds use one committed seed for everyone. Our [server seed vs client seed guide](/guides/server-seed-client-seed) compares the two.`,
    },
    {
      id: "other-uses",
      title: "Other uses of commit reveal",
      body: `Commit reveal is not just for games. It solves any problem where people must make choices independently and then prove what they chose.

### Sealed-bid auctions

Each bidder commits to a bid. Once all bids are in, everyone reveals. Nobody can adjust their bid after seeing others. Some blockchain auctions, such as early versions of the Ethereum Name Service, used this pattern.

### Rock, paper, scissors online

If two players play over the internet, whoever moves second could cheat by waiting to see the first move. With commit reveal, both commit first, then both reveal.

### Voting

Some voting protocols have voters commit to their votes during the voting period and reveal them afterwards, preventing late voters from being influenced by early results.

### Blockchain randomness

Some blockchains and smart contracts generate randomness by having many participants commit to secret values and then reveal them, combining the results so no single participant controls the outcome. Ethereum's proof-of-stake randomness, RANDAO, is built on a related idea.

### Predictions and research

Researchers sometimes publish a hash of their predictions or analysis plan in advance, proving later that they did not change their hypothesis after seeing the data.`,
    },
    {
      id: "attacks",
      title: "Weaknesses and how to avoid them",
      body: `Commit reveal is strong, but it can be undermined by poor implementation.

### Guessable secrets

If the secret is short or predictable, the commitment is not hiding. Always use a long random value from a cryptographic random number generator.

### Late commitments

A commitment only proves something if it was published before the relevant event. A site that shows the hash only after the game proves nothing. Always check that the commitment is visible before bets lock.

### Refusing to reveal

The committing party could simply refuse to reveal if the result is bad for them. In games, this is handled by always revealing after settlement and by making results computable only from the committed seed. In multi-party protocols, penalties are used.

### Last-revealer advantage

When many people each commit and reveal, the last person to reveal can see everyone else's values and decide whether to reveal their own. Protocols counter this with deadlines, deposits or cryptographic techniques. Shared-seed PvP games avoid it by having only one committed secret per round.

### Weak hash functions

Old hash functions like MD5 are broken for collisions. Modern systems use SHA-256 or stronger.`,
    },
    {
      id: "check",
      title: "How to check a commitment yourself",
      body: `Checking a hash commitment takes seconds.

1. **Record the commitment** before the game, or find it on the round's record. It will be 64 hex characters for SHA-256.
2. **Wait for the reveal.** After settlement, the seed is published.
3. **Hash the seed.** Use a SHA-256 tool that accepts hex input. The seed is bytes written in hex, so choose hex, not text.
4. **Compare.** The result must match the commitment exactly.

### On PVPspinArena

The [Fairness page](/fairness) does this automatically for Jackpot, Coinflip and Roulette. Enter a finished round number, and your browser hashes the revealed seed and compares it with the stored commitment before recomputing the result.

### What to do if it does not match

First check you entered the seed as hex and copied it fully. If it still does not match, the result is not proven fair. Keep the round number and the values, and contact support. The [provably fair calculator guide](/guides/provably-fair-calculator) lists common mistakes.`,
    },
    {
      id: "pvp",
      title: "Commit reveal on PVPspinArena",
      body: `Every game on PVPspinArena uses the same commit reveal structure.

- **Seed generation.** A random 32-byte server seed is created for each round.
- **Commitment.** SHA-256(seed) is stored and shown before the round accepts entries or bets.
- **Result.** HMAC-SHA256 with the seed as key and a message containing the game name, round number and draw version, plus a counter for Jackpot and Roulette.
- **Mapping.** Coinflip uses one bit; Roulette and Jackpot use rejection sampling to pick a slot or ticket without bias.
- **Reveal.** The seed is published when the round settles.
- **Verification.** Any round can be checked in your browser.

Because every round has its own seed, results in one round reveal nothing about the next. And because the commitment exists before any stakes are known, the site could not choose a seed to favour anyone. For the game rules, see our guides to [crypto jackpot](/guides/crypto-jackpot), [coinflip](/guides/csgo-coinflip) and [roulette](/guides/provably-fair-roulette).`,
    },
    {
      id: "next",
      title: "Learn more",
      body: `Commit reveal is only one part of how PVPspinArena works. Read [how it works](/how-it-works) for an overview of balances, rounds and payouts, and try verifying a finished game on the Fairness page. Once you have seen a commitment match its revealed seed with your own eyes, the idea becomes intuitive, and you will be able to evaluate any site's fairness claims in the same way. A useful habit is to note a round's commitment before it starts, then check it after settlement: that way you know the commitment you verify is the one that was actually shown in advance, not one added later.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `A commit reveal scheme lets someone lock in a secret value, prove they have done so without revealing it, and later disclose it so anyone can check nothing changed. A good commitment is hiding and binding, and the simplest version is a SHA-256 hash of a long random secret.

The idea is used in auctions, voting, blockchain randomness and, most visibly for players, in provably fair games. There, the site commits to a seed before play, computes results from it and reveals it afterwards. The main pitfalls are guessable secrets and commitments published too late.

On PVPspinArena every round commits a 32-byte seed with SHA-256 before entries open, and you can verify any settled round in your browser.`,
    },
  ],
  faqs: [
    {
      q: "What is a commit reveal scheme?",
      a: "A method where you first publish a commitment, such as a hash, to a secret value, and later reveal the value so anyone can check it matches the commitment.",
    },
    {
      q: "Why use a hash for a commitment?",
      a: "A cryptographic hash is one-way, so it hides the secret, and collision-resistant, so only one value can match. That gives both hiding and binding.",
    },
    {
      q: "Can a site cheat with commit reveal?",
      a: "Not by changing the secret after the commitment. It could only cheat by publishing the commitment late or using a guessable secret, which is why those points should be checked.",
    },
    {
      q: "What is the difference between commit reveal and provably fair?",
      a: "Commit reveal is the underlying technique. Provably fair is a system that uses commit reveal plus a published formula so players can verify each game result.",
    },
    {
      q: "Where can I check a PVPspinArena commitment?",
      a: "On the Fairness page. Enter a finished round number and your browser compares the revealed seed's SHA-256 hash with the stored commitment.",
    },
  ],
  sources: [
    { label: "Wikipedia: Commitment scheme", url: "https://en.wikipedia.org/wiki/Commitment_scheme" },
    { label: "NIST FIPS 180-4: Secure Hash Standard", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
    { label: "Ethereum.org: block proposal and RANDAO", url: "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/block-proposal/" },
  ],
  related: ["provably-fair-casino", "server-seed-client-seed", "hmac-sha256-provably-fair"],
  updated: "2026-09-25",
};

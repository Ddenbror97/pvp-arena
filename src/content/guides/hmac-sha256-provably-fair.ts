import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hmac-sha256-provably-fair",
  cluster: "Provably fair",
  keyword: "hmac sha256",
  secondary: ["hmac sha256 provably fair", "what is hmac", "sha256 hash", "hmac vs sha256"],
  title: "HMAC-SHA256 Explained: How It Powers Provably Fair",
  description:
    "What HMAC-SHA256 is, how it differs from a plain SHA-256 hash, and how provably fair games use it with a committed server seed to make results checkable.",
  h1: "HMAC-SHA256 explained: how it powers provably fair games",
  answer:
    "HMAC SHA256, usually written HMAC-SHA256, is a standard way to combine a secret key with a message and produce a 256-bit fingerprint using the SHA-256 hash function. Without the key, nobody can predict or forge the output. Provably fair games use it with a secret server seed as the key: the seed's hash is published first, and after the game anyone can recompute the result.",
  facts: [
    "SHA-256 is a hash function standardised by NIST in FIPS 180-4; it outputs 256 bits (32 bytes).",
    "HMAC is defined in RFC 2104 and turns any hash function into a keyed message authentication code.",
    "The same key and message always produce the same HMAC; changing either changes the output completely.",
    "Provably fair games publish SHA-256(server seed) before play and reveal the seed afterwards.",
    "PVPspinArena uses HMAC-SHA256 with the server seed as key for Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "sha256",
      title: "First, what is SHA-256?",
      body: `To understand HMAC-SHA256 you first need SHA-256. SHA-256 is a cryptographic hash function: it takes any input, from a single letter to a large file, and produces a fixed 256-bit output, usually written as 64 hexadecimal characters.

It was published by the US National Institute of Standards and Technology as part of the SHA-2 family, and it is used everywhere: in TLS certificates that secure websites, in software downloads, and in Bitcoin mining.

### Three properties that matter

- **Deterministic.** The same input always gives the same output.
- **One-way.** Given an output, there is no practical way to find the input.
- **Avalanche effect.** Changing one character of the input changes the output completely and unpredictably.

### Example

The SHA-256 of the word \`hello\` always begins \`2cf24dba…\`. The SHA-256 of \`Hello\`, with a capital H, looks entirely different. There is no pattern linking the two.

These properties make SHA-256 perfect for **commitments**. If a site publishes the hash of a secret before a game, it cannot later swap the secret without the hash no longer matching. That is the first half of how [provably fair casinos](/guides/provably-fair-casino) work.`,
    },
    {
      id: "hmac",
      title: "What is HMAC?",
      body: `HMAC stands for hash-based message authentication code. It was defined in 1997 in RFC 2104 and is one of the most widely used cryptographic building blocks in the world.

A plain hash takes one input. HMAC takes two: a **secret key** and a **message**. It mixes them together using the hash function in a specific, carefully designed way, and outputs a result of the same size as the hash. With SHA-256 inside, that is 256 bits.

### What it guarantees

- Anyone who knows the key and the message can compute the same output.
- Anyone who does not know the key cannot predict the output for any message, even if they have seen outputs for many other messages.
- Nobody can find a different key that produces the same output for a message in any practical amount of time.

### Where it is used

HMAC-SHA256 secures API requests at payment providers and cloud services, signs JSON Web Tokens with the HS256 algorithm, and protects data in many network protocols. When you use it for a provably fair game, you are relying on the same maths that protects billions of everyday transactions.`,
    },
    {
      id: "how",
      title: "How HMAC-SHA256 works under the hood",
      body: `You do not need to know the internals to verify a game, but a quick look shows why HMAC is safer than just hashing a key and message together.

### The construction

HMAC uses two fixed padding constants, called ipad and opad. In simple terms:

1. The key is padded to the hash's block size, 64 bytes for SHA-256.
2. The padded key is combined with ipad, the message is appended, and the result is hashed. This is the **inner hash**.
3. The padded key is combined with opad, the inner hash is appended, and that is hashed again. This is the **outer hash**, and it is the HMAC.

Written compactly: HMAC(K, m) = SHA-256((K ⊕ opad) ‖ SHA-256((K ⊕ ipad) ‖ m)).

### Why two hashes

A simple construction like SHA-256(key + message) is vulnerable to a known weakness of SHA-256 called length extension: someone who sees the output can compute a valid output for a longer message without the key. The nested design of HMAC blocks this.

### In practice

Every modern programming language and browser includes HMAC-SHA256. In browsers it is part of the Web Crypto API, which is what the PVPspinArena [fairness page](/fairness) uses to verify games locally.`,
    },
    {
      id: "hmac-vs-sha256",
      title: "HMAC vs SHA-256: what is the difference?",
      body: `People often search "HMAC vs SHA-256" as if they were competitors. They are not. SHA-256 is an ingredient; HMAC is a recipe that uses it.

### Quick comparison

- **Inputs**: SHA-256 takes one input. HMAC-SHA256 takes a key and a message.
- **Secret**: SHA-256 has no secret; anyone can compute it. HMAC-SHA256 depends on a secret key.
- **Purpose**: SHA-256 proves data has not changed and creates commitments. HMAC-SHA256 proves a message came from someone holding the key and produces key-dependent outputs.
- **Output size**: both produce 256 bits.

### How provably fair uses both

A provably fair game uses the two together, each for its own job:

- **SHA-256** makes the commitment. The site publishes SHA-256(server seed) before the game.
- **HMAC-SHA256** produces the result. The site computes HMAC-SHA256(server seed, message) where the message identifies the game.

The commitment stops the site changing the seed. The HMAC ensures the result cannot be predicted by players before the seed is revealed, and can be recomputed by everyone after.`,
    },
    {
      id: "provably-fair",
      title: "How provably fair games use HMAC-SHA256",
      body: `Here is the complete flow, using PVPspinArena's Coinflip as an example.

1. **Generate.** When a game is created, the server generates a random 32-byte server seed.
2. **Commit.** It publishes SHA-256(server seed), the commitment, on the game page.
3. **Play.** Players join. Nobody, including the second player, can see the seed.
4. **Compute.** The result is HMAC-SHA256 with the seed as key and the message \`PVPCasino:coinflip:v1:{game}:{draw_version}\`.
5. **Map.** The output bytes are turned into a game result. For Coinflip, the lowest bit of the first byte decides heads or tails.
6. **Reveal.** After settlement, the seed is published so anyone can verify steps 2, 4 and 5.

### Why the message includes the game number

Putting the game number and a version into the message means the same seed can never be reused to produce the same result for another game. It also ties each result to exactly one game, so results cannot be swapped.

### Other games

Jackpot and Roulette use the same idea with a counter in the message, so they can draw new values if needed. Our [CS2 roulette guide](/guides/cs2-roulette) and [crypto jackpot guide](/guides/crypto-jackpot) show how each maps the output to a result.`,
    },
    {
      id: "mapping",
      title: "Turning a hash into a fair result",
      body: `An HMAC output is just 32 random-looking bytes. The last step is converting it into a game outcome without introducing bias.

### Two outcomes

For a coin, only one bit is needed. Each bit of a good HMAC output is equally likely to be 0 or 1, so taking the lowest bit of the first byte gives an exact 50/50.

### Many outcomes

For a roulette wheel with 15 slots, you need a number between 0 and 14. A naive approach takes a large number from the hash and uses the remainder after dividing by 15. The problem is that most large ranges do not divide evenly by 15, so a few slots would be very slightly more likely.

### Rejection sampling

PVPspinArena avoids this with rejection sampling:

1. Read the first 8 bytes as a number r between 0 and 2^64 − 1.
2. Compute the largest multiple of 15 below 2^64.
3. If r is at or above that limit, increase a counter in the message and compute a new HMAC.
4. Otherwise, the slot is r mod 15.

Rejection almost never happens, but when it does it keeps every slot exactly equally likely. This is the kind of detail worth checking when you compare provably fair sites.`,
    },
    {
      id: "verify",
      title: "Verify an HMAC-SHA256 result yourself",
      body: `Because HMAC-SHA256 is standard, you can check a game with tools that have nothing to do with the casino.

### On PVPspinArena

1. Open the [Fairness page](/fairness) and pick Jackpot, Coinflip or Roulette.
2. Enter the game or round number.
3. The page shows the revealed seed, the commitment, the message and the HMAC output, all computed in your browser.

### With an independent tool

1. Copy the server seed. It is 64 hex characters, representing 32 bytes.
2. Hash it with any SHA-256 tool, making sure the tool treats the input as hex bytes, not as text. Compare the result to the published commitment.
3. Open an HMAC-SHA256 tool. Set the key to the seed, again as hex, and the message to the exact text shown, such as \`PVPCasino:coinflip:v1:1234:1\`.
4. Compare the output to the HMAC shown on the fairness page.

The most common mistake is entering the seed as text instead of hex. Our [provably fair calculator guide](/guides/provably-fair-calculator) walks through this with examples.`,
    },
    {
      id: "limits",
      title: "What HMAC-SHA256 can and cannot prove",
      body: `HMAC-SHA256 is strong, but it is worth being precise about what a provably fair system proves.

### What it proves

- The result was fixed as soon as the seed was committed.
- The site did not change the seed after seeing bets.
- The result was computed exactly by the published method.

### What it does not prove on its own

- **That the seed was random.** A commitment proves the seed did not change, not how it was chosen. Some systems add a player-provided client seed so no single party controls the input. PVPspinArena's current protocol commits the seed before the opposing player joins or betting closes, which prevents it being chosen with knowledge of bets.
- **That payouts were correct.** Verifying the result is separate from checking your balance was credited. Your wallet history shows that.
- **That the site is solvent or licensed.** Cryptography cannot tell you about custody, regulation or support quality.

Understanding these limits is part of using provably fair properly. See [how it works](/how-it-works) for how PVPspinArena handles the rest.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `SHA-256 is a one-way hash function that creates fixed fingerprints and commitments. HMAC-SHA256 combines a secret key with a message using SHA-256 twice, producing an output nobody can predict without the key.

Provably fair games use both: SHA-256 to commit to a server seed before play, and HMAC-SHA256 with that seed as the key to produce each result. After the game the seed is revealed, and anyone can hash it, recompute the HMAC and map it to the outcome. Careful mapping, such as rejection sampling, keeps every outcome equally likely.

You can check PVPspinArena results in your browser on the Fairness page, or with any independent tool, as long as you enter the seed as hex.`,
    },
  ],
  faqs: [
    {
      q: "Is HMAC-SHA256 secure?",
      a: "Yes. HMAC-SHA256 is a long-standing standard with no known practical attacks. It is used to secure APIs, tokens and network traffic worldwide.",
    },
    {
      q: "What is the difference between HMAC and SHA-256?",
      a: "SHA-256 hashes a single input with no secret. HMAC-SHA256 uses SHA-256 with a secret key and a message, so only someone with the key can produce or predict the output.",
    },
    {
      q: "Can someone predict a provably fair result from the HMAC?",
      a: "No. Without the server seed, the HMAC output cannot be predicted. The seed stays secret until after the game, and only its SHA-256 hash is shown beforehand.",
    },
    {
      q: "Why does my HMAC not match when I check it?",
      a: "Usually the seed was entered as text instead of hex bytes, or the message has an extra space. Enter the seed as hex and copy the message exactly.",
    },
    {
      q: "Which PVPspinArena games use HMAC-SHA256?",
      a: "All of them. Jackpot, Coinflip and Roulette each compute results with HMAC-SHA256 keyed by a server seed committed before the game.",
    },
  ],
  sources: [
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST FIPS 180-4: Secure Hash Standard", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
    { label: "NIST FIPS 198-1: The Keyed-Hash Message Authentication Code", url: "https://csrc.nist.gov/pubs/fips/198-1/final" },
    { label: "MDN: SubtleCrypto.sign() (HMAC)", url: "https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign" },
  ],
  related: ["provably-fair-casino", "provably-fair-calculator", "csgo-coinflip"],
  updated: "2026-09-25",
};

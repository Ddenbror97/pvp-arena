import type { Guide } from "./types";

export const guide: Guide = {
  slug: "nonce-and-cursor-provably-fair",
  cluster: "Provably fair",
  keyword: "nonce provably fair",
  secondary: ["nonce gambling", "cursor provably fair", "bet index verification"],
  title: "Nonce and Cursor in Provably Fair Games | PvP Spin Arena",
  description:
    "One seed pair produces thousands of results through the nonce and cursor. How each bet is derived, with a verification example you can repeat.",
  h1: "Nonce and Cursor: How Each Bet Gets Its Own Result",
  answer:
    "A nonce provably fair system reuses one committed seed pair across many bets by feeding a rising counter into the result formula. The nonce (and on some sites a cursor or bet index) makes each wager produce a different output without rotating the seed after every spin. If you recompute HMAC or the published hash with the same seeds and the same counter, you should land on the recorded outcome.",
  facts: [
    "A nonce is usually an integer that increments once per bet or per draw under the same seed pair.",
    "Some operators call the same idea a cursor, round index or bet index; the job is identical.",
    "Without a changing counter, two bets with the same seeds would always produce the same result.",
    "Verification needs the revealed server seed, the client seed if used, and the exact nonce from that bet.",
    "PVPspinArena commits a fresh server seed per Jackpot, Coinflip or Roulette round rather than a long-lived seed plus nonce stream.",
  ],
  sections: [
    {
      id: "why-seed-not-enough",
      title: "Why a seed alone is not enough",
      body: `A [server seed and client seed](/guides/server-seed-client-seed) pair is only half of a multi-bet fairness design. The pair locks the randomness source. It does not, by itself, say which bet you are talking about.

### Same seeds, many outcomes

If the formula were only HMAC(serverSeed, clientSeed), every wager under that pair would repeat. Casinos that let you keep one seed pair for hundreds of dice rolls therefore mix in a counter. That counter is the nonce.

### Commitment still comes first

The important order does not change. The operator publishes a hash of the server seed before you bet. You may set or accept a client seed. Only after settlement is the server seed revealed so you can check both the hash and the maths. The [commit-reveal scheme](/guides/commit-reveal-scheme) is the lock; the nonce is the page number inside the book.

### Round-based alternatives

Not every game uses a long-lived seed plus nonce. Player-vs-player rounds often commit one seed for that round alone, then reveal it when the pot settles. PVPspinArena follows that pattern on Jackpot, Coinflip and [Roulette](/roulette). The idea is the same: the inputs that decide the result are fixed before the outcome is shown, and you can recompute them later on the [Fairness](/fairness) page.`,
    },
    {
      id: "definitions",
      title: "Nonce, cursor and bet index defined",
      body: `Different sites use different labels for the same counter. Reading the fairness docs carefully avoids verifying the wrong number.

### Nonce

In cryptography a nonce is a number used once. In casino fairness docs it is almost always a non-negative integer that starts at zero or one when a seed pair is created and rises by one after each bet. When people search for **nonce provably fair**, this counter is what they mean.

### Cursor

Some UIs show a "cursor" next to the seeds. Treat it as the next nonce that will be used, or the last nonce that was used, depending on the site. Check whether the fairness page says the cursor increments before or after the draw.

### Bet index / round id

Shared games may publish a round number instead of a personal nonce. The round id is still a public input to the formula. You verify with that id, not with a personal bet counter from another product.

### What to copy from the UI

When you verify, copy:

1. Revealed server seed
2. Client seed (if any)
3. Exact nonce or cursor shown for that bet
4. Any game-specific string the docs list (game name, version, table id)

Missing one character of any field will fail the check even when the casino behaved correctly.`,
    },
    {
      id: "many-results",
      title: "Generating many results from one seed",
      body: `The usual construction is a keyed hash over a message that includes the nonce.

### Typical formula shape

Many house games use HMAC-SHA256 with the server seed as the key and a message such as \`clientSeed:nonce\` or \`clientSeed-nonce-game\`. The digest becomes bytes, then those bytes become a float or an integer in the game's range. Rejection sampling or modular reduction turns the bits into a dice roll, a crash multiplier or a card. Our [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) walks through that conversion.

### Why the counter must be public

If the casino could silently skip nonces, it could search for a friendly outcome. Publishing the nonce with the bet, and requiring sequential use, closes that gap. A gap in the sequence is a red flag.

### Streams vs single draws

Slots-style games may consume several HMAC outputs per spin (one per reel, or a cursor that advances inside the spin). Crash and dice usually consume one. Always follow the site's published algorithm rather than assuming one hash equals one bet.

### Limits of reuse

Keeping one seed pair forever is convenient but concentrates risk if the server seed leaks early. Sensible players rotate after a session. The [provably fair casino](/guides/provably-fair-casino) overview covers that habit in context.`,
    },
    {
      id: "worked-example",
      title: "Worked verification example",
      body: `Here is a generic walkthrough you can adapt to any nonce-based checker.

### Inputs

Suppose a dice site shows:

- Server seed (revealed): \`a3f9…\` (full value from the UI)
- Client seed: \`player-chosen-42\`
- Nonce: \`17\`
- Result recorded: \`42\` on a 0–99 roll

### Steps

1. Confirm the SHA-256 of the revealed server seed matches the hash that was shown before you bet.
2. Compute HMAC-SHA256(serverSeed, \`player-chosen-42:17\`) exactly as the docs specify (separator and order matter).
3. Convert the digest to an integer with the published method.
4. Compare with 42.

If the hash matches and the recomputed roll matches, the result was determined by those inputs. You can also paste the same values into a [provably fair calculator](/guides/provably-fair-calculator) when the operator formula matches a common template.

### What success does not mean

A matching check does not change the house edge. It only proves the draw was not swapped after the commitment.

### Common mistakes that create false failures

- Copying a truncated seed from a mobile layout that hides the middle of the string
- Using nonce 17 when the UI meant the next cursor would be 18
- Hashing with SHA-256 of the concatenated seeds when the docs require HMAC
- Forgetting a game id prefix that the operator adds to every message

When a check fails, re-read the message format once before accusing the site. Many mismatches are transcription errors. If the hash of the revealed seed already fails against the pre-bet commitment, the problem is not the nonce — the seed itself does not match what was locked.`,
    },
    {
      id: "differences",
      title: "Where implementations differ",
      body: `Small protocol choices change what you must type into a verifier.

### Separators and encoding

Colon versus hyphen, UTF-8 versus hex seeds, and whether the nonce is decimal or padded all matter. Two sites can both be honest and still reject each other's strings.

### Who increments the nonce

Some wallets increment only on settled bets. Cancelled bets may or may not consume a number. Read the FAQ before claiming a mismatch.

### Multiplayer seeds

In a pot shared by many players, a personal client seed for each person would let the last joiner bias the outcome if they could see others' seeds. Round-based server seeds avoid that. That is why PVPspinArena's multiplayer games commit per round on [how it works](/how-it-works) rather than exposing a personal nonce stream.

### Topic map

This page sits inside the [provably fair guides](/guides/topics/provably-fair) hub next to seed pairing, HMAC and verification tools.`,
    },
    {
      id: "broken",
      title: "Spotting a broken implementation",
      body: `A few failure modes show up often when people audit sites.

### Commitment after the bet

If the seed hash only appears after you wager, the commitment is useless. Demand a pre-bet hash.

### Editable nonce

If you can freely set the nonce without the site locking previous values, the operator (or a compromised account) could hunt for outcomes. The counter should be assigned by the system.

### Hidden formula

"Trust our proprietary RNG" with no public message format is not nonce-based fairness. Compare that to [RNG versus provably fair](/guides/rng-vs-provably-fair).

### Checker that only works while logged in

An independent check should be possible with public inputs. A black-box "verified" badge alone is weak evidence.

### Fake seal next to a nonce UI

Some phishing skins paste a fairness widget while the backend ignores it. Cross-check with [fake casino sites](/guides/fake-casino-sites) patterns if the domain looks off.`,
    },
    {
      id: "history",
      title: "Verifying your own bet history",
      body: `Build a habit so checks are cheap.

### Keep records

Screenshot or export: seed hash before play, revealed seed after, client seed, nonce, and the shown result. Without the nonce, history is hard to reconstruct.

### Batch checks

After a seed rotation, verify a sample of nonces across the range, not only winners. A biased implementation might still pass on lucky bets.

### Independent tooling

Prefer running the algorithm in your own notebook or a trusted open calculator. Operator-hosted checkers are convenient but not the final authority.

### Responsible close

Fairness tooling does not manage bankroll risk. Pair technical checks with the habits on our [responsible gambling](/responsible-gambling) page and a written [gambling budget](/guides/gambling-budget). Adults 18+ only.

### Practical checklist before you leave a seed pair

1. Note the starting nonce when you first see the commitment hash.
2. After ten to twenty bets, verify one early, one middle and one late nonce.
3. If any check fails, stop wagering and rotate or leave the site.
4. When you rotate, confirm the old server seed hashes to the old commitment before you accept a new pair.

That routine takes a few minutes and catches most broken or misleading implementations without needing to recompute every spin.`,
    },
    {
      id: "pvp-vs-house",
      title: "Nonce streams versus per-round seeds",
      body: `House dice and crash products love long-lived seed pairs because they make auto-betting simple. Shared pots do not.

### Why multiplayer resists personal nonces

If Alice and Bob both join a jackpot, and Alice could choose a client seed after seeing Bob's tickets, she could search nonces for a favourable slice of the pot. Sites either freeze client influence before tickets lock, or they drop personal seeds entirely and commit one server seed for the round.

### How PVPspinArena settles this

On PVPspinArena the commitment is tied to the round. Players see the hash while betting is open. After the draw, the seed is revealed and anyone can recompute the same land on [Coinflip](/coinflip) or Roulette without needing a personal nonce history. The [provably fair games](/guides/provably-fair-games) guide contrasts that model with single-player streams.

### When you still see a nonce on a PvP brand

Some brands bolt house games onto a PvP lobby. Those house tabs may still show nonce counters even if the arena games do not. Verify each product with its own docs. Do not assume the jackpot formula equals the dice formula.

### Takeaway

**Nonce provably fair** designs are excellent for repeating single-player bets. Round commitments are excellent for shared outcomes. Both are valid; both fail if the commitment is late, the formula is secret, or the counter can be chosen adversarially after stakes are known.`,
    },
  ],
  faqs: [
    {
      q: "What is a nonce in provably fair gambling?",
      a: "It is a counter mixed into the result formula so each bet under the same seed pair produces a different outcome. Without it, identical seeds would always roll the same number.",
    },
    {
      q: "Is a cursor the same as a nonce?",
      a: "Often yes. Many UIs label the next or last counter as a cursor. Always read whether the number you see is about to be used or was already used.",
    },
    {
      q: "Do I need the nonce to verify a bet?",
      a: "Yes for nonce-based games. The revealed server seed and client seed are not enough if the formula includes a counter you omit or mistype.",
    },
    {
      q: "Does PVPspinArena use a personal nonce stream?",
      a: "Jackpot, Coinflip and Roulette commit a server seed per round and reveal it after settlement. That is round-based commit-reveal rather than a long-lived seed with a player nonce.",
    },
    {
      q: "Can a casino skip nonces to cheat?",
      a: "If nonces are not published and sequential, skipping becomes a risk. Honest designs show the counter with each bet and do not let the operator pick an arbitrary unused value after seeing the stake.",
    },
  ],
  sources: [
    {
      label: "NIST — SHA-256 in FIPS 180-4",
      url: "https://csrc.nist.gov/publications/detail/fips/180/4/final",
    },
    { label: "IETF RFC 2104 — HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
  ],
  related: [
    "server-seed-client-seed",
    "hmac-sha256-provably-fair",
    "provably-fair-calculator",
    "commit-reveal-scheme",
    "provably-fair-casino",
  ],
  updated: "2026-09-26",
};

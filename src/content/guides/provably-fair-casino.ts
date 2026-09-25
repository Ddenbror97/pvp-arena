import type { Guide } from "./types";

export const guide: Guide = {
  slug: "provably-fair-casino",
  cluster: "Provably fair",
  pillar: true,
  keyword: "provably fair casino",
  secondary: ["provably fair games", "how to check provably fair", "is provably fair legit", "what does provably fair mean", "how to choose a provably fair casino"],
  title: "Provably Fair Casino Guide: How to Check Every Result",
  description:
    "What makes a casino provably fair, how seeds, hashes and HMAC prove a result, how to check one yourself and which red flags to watch out for.",
  h1: "Provably fair casino guide: how to check every result",
  answer:
    "A provably fair casino publishes a cryptographic commitment to each game's random seed before you bet, then reveals the seed after the game. Because anyone can recompute the result from the revealed seed and confirm it matches the earlier commitment, you do not have to trust the operator's word that the result was not changed.",
  facts: [
    "The commitment is usually a SHA-256 hash of a secret server seed, published before bets are placed.",
    "The result is derived from the seed with a deterministic formula such as HMAC-SHA256.",
    "After the game the seed is revealed so anyone can recompute the hash and the result.",
    "Provably fair proves the draw was not altered. It does not remove the house edge or fee.",
    "On PVPspinArena you can check Jackpot, Coinflip and Roulette results on the Fairness page.",
  ],
  sections: [
    {
      id: "meaning",
      title: "What does provably fair mean?",
      body: `"Provably fair" describes a game where the player can mathematically check that the result was decided honestly. The word "provably" matters: it is not a promise or a badge, it is a method you can run yourself.

In a normal online casino, you trust that the random number generator was fair because an auditor tested it at some point. In a provably fair casino you can check each individual game. The operator commits to the randomness before the game, and reveals enough afterwards for you to repeat the calculation. If the numbers match, the result was fixed before you played and was not changed in response to your bet.

This idea came out of early Bitcoin gambling sites and spread to the CS:GO skin sites of 2015 and later. Today it is common on crypto casinos, especially for games the site builds itself. The [Fairness page](/fairness) on PVPspinArena contains our exact formulas and an in-browser checker.`,
    },
    {
      id: "how-it-works",
      title: "How a provably fair casino works",
      body: `Every provably fair system is built from the same three parts: a secret, a commitment and a reveal.

### 1. The secret seed

Before a round opens, the server generates a long random value called the server seed. It is kept secret until the round is over, because anyone who knew it in advance could predict the result.

### 2. The commitment

The server publishes a hash of the seed, usually with SHA-256. A hash is a fingerprint: it is easy to compute from the seed, but practically impossible to reverse, and changing even one character of the seed produces a completely different hash. Publishing the hash locks the server in. It can no longer swap the seed without everyone noticing. This pattern is called a [commit-reveal scheme](/guides/commit-reveal-scheme).

### 3. The result formula

The result is computed from the seed with a fixed, published formula. PVPspinArena uses HMAC-SHA256, keyed with the server seed, over a message that includes the game and round identifiers. The output is turned into a number in the right range using rejection sampling, which avoids the small bias that simple division would introduce. The [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) shows the maths.

### 4. The reveal

Once the round is settled, the server seed is published. Now anyone can hash it and confirm it matches the commitment, then run the formula and confirm it produces the recorded result.

Some casinos also add a **client seed** that you choose, so the result depends on randomness from both sides. The [server seed vs client seed guide](/guides/server-seed-client-seed) explains when this matters and why player-vs-player games often use a round-based seed instead.`,
    },
    {
      id: "check",
      title: "How to check provably fair results yourself",
      body: `Checking a result takes a minute once you know where to look. Here is the process on PVPspinArena.

1. **Find the round.** Every completed game has an identifier. Roulette rounds are numbered, for example #389, and Jackpot games have their own audit page.
2. **Note the commitment.** Before the round, the page showed the seed hash. On Jackpot it appears under the wheel as the "seed commitment".
3. **Open the Fairness page.** Go to [Fairness](/fairness), pick the game tab and enter the round number. You can type "389" or "#389".
4. **Let the checker recompute.** The page loads the revealed seed and the public round data, hashes the seed, compares it with the commitment and recomputes the result in your browser.
5. **Compare.** If the hash matches and the recomputed result equals the recorded one, the round was decided by the committed seed.

You do not need to trust our checker. The formulas are printed on the Fairness page so you can repeat them in any programming language. That independence is what separates a provably fair casino from one that simply says it is fair.`,
    },
    {
      id: "what-it-proves",
      title: "What provably fair proves, and what it doesn't",
      body: `Provably fair is powerful, but it is often oversold. Being clear about its limits helps you use it well.

### What it proves

- The result was fixed by a seed chosen before the round, not after seeing your bet.
- The formula converting the seed into a result was applied correctly.
- The same inputs always produce the same output, so the result cannot be quietly edited.

### What it does not prove

- **That the game favours you.** A provably fair roulette still has a house edge. The [house edge guide](/guides/house-edge) explains how to calculate it.
- **That the payout table is generous.** You still need to read the multipliers and fees.
- **That the site will pay you.** Fairness of the draw is separate from the operator's honesty about withdrawals.
- **That the seed was random.** A commitment proves the seed was not changed, not how it was generated. Mixing in randomness from sources the operator does not control, such as a client seed, reduces this concern.

Treat provably fair as one strong signal among several, alongside clear terms, visible withdrawal rules and responsible gambling tools.`,
    },
    {
      id: "choose",
      title: "How to choose a provably fair casino",
      body: `Many sites use the phrase. Fewer let you actually check anything. Use these questions to tell the difference.

1. **Is the commitment shown before you bet?** If the hash only appears after the game, it proves nothing.
2. **Is the formula published in full?** You should be able to reproduce the result without the site's help.
3. **Is there a checker, and can you check without an account?** On PVPspinArena the Fairness checker works without signing in.
4. **Are all games covered?** Some sites make only their original games provably fair and use third-party games that are not.
5. **Is bias handled?** Look for rejection sampling or an equivalent method, not a simple remainder.
6. **Are past rounds available?** You should be able to check any round, not only the latest one.

A site that passes all six is giving you real transparency. A site that fails the first two is using "provably fair" as a label.`,
    },
    {
      id: "red-flags",
      title: "Red flags and common myths",
      body: `A few patterns come up often in discussions of whether provably fair is legit.

- **"You can crack provably fair."** A properly used SHA-256 commitment cannot be reversed to reveal the seed in advance. Guides claiming to predict results are either wrong or scams.
- **"Provably fair means I can't lose."** It means the draw was honest. Honest draws still produce losing streaks.
- **"The checker says verified, so I'm safe."** A checker hosted by the operator is convenient, but the real proof is that the formula is public and you could run it elsewhere.
- **Bonuses tied to fairness claims.** Fairness is not a promotion. Be wary of sites that pair it with "risk-free" offers.

If you are curious about the broader question of whether online casinos manipulate results, our guide [are online casinos rigged?](/guides/are-online-casinos-rigged) looks at the evidence calmly.`,
    },
    {
      id: "example",
      title: "Worked example: checking a Roulette round",
      body: `Say you watched Roulette round #389 land on Purple. Here is how the check would go.

Before the round opened, the server generated its seed and published the SHA-256 hash. When betting closed, the wheel spun and landed on a slot. After settlement, the seed was revealed.

You open the Fairness page, choose the Roulette tab and type "#389". The checker fetches the revealed seed and the round data, hashes the seed and confirms the hash equals the one published earlier. It then computes HMAC-SHA256 with the seed as the key, turns the output into a slot number between 0 and 14 using rejection sampling, and maps that slot onto the wheel. If it lands on the same Purple slot, the round is verified.

Because the wheel has seven Purple, seven Silver and one Green slot, the [provably fair roulette guide](/guides/provably-fair-roulette) walks through the exact slot mapping.`,
    },
    {
      id: "vs-rng",
      title: "Provably fair vs certified RNG",
      body: "Traditional online casinos rely on certified random number generators. An independent testing lab examines the software, runs statistical tests on millions of outputs and issues a certificate. Regulators then accept that certificate as evidence of fairness. This approach is useful: it catches broken generators and it covers games where a per-round proof would be impractical.\n\nIts weakness is that it is a snapshot. The certificate tells you the software was fair when it was tested. It does not let you check the specific spin you just lost, and it depends on the operator running the same software that was tested.\n\nA provably fair casino moves the check to the individual round. Instead of trusting that the generator is fair in general, you confirm that this result came from this seed, committed at this time. The two approaches are not mutually exclusive, and the strongest setups combine them. Our comparison of [RNG vs provably fair](/guides/rng-vs-provably-fair) goes into more depth.\n\n### Why commitments must come first\n\nThe order of events is the whole point. If a site shows you the seed hash only after the game, it could have chosen any seed that produces the result it wanted and then hashed it. Always confirm the commitment was visible before betting closed. On PVPspinArena the Jackpot seed commitment is on screen under the wheel for the whole round, and Roulette and Coinflip commitments are published before bets are accepted.",
    },
    {
      id: "summary",
      title: "Summary",
      body: `A provably fair casino gives you a way to check that every result was decided by a seed committed before you played. Look for a visible commitment, a published formula, bias-free sampling and a checker that anyone can use. Remember that fairness of the draw does not change the odds, and always gamble within a budget you set in advance.

To go deeper, try the [provably fair calculator guide](/guides/provably-fair-calculator), or open the [Fairness page](/fairness) and check a real round now.`,
    },
  ],
  faqs: [
    {
      q: "Is provably fair legit?",
      a: "The method is legitimate cryptography. Whether a particular casino uses it properly is something you can check: the seed hash must be shown before you bet, the formula must be public, and recomputing a result must match what the site recorded.",
    },
    {
      q: "How do I check a provably fair result?",
      a: "Find the round's identifier, open the site's fairness checker or your own script, confirm the revealed seed hashes to the earlier commitment, then run the published formula and compare the output with the recorded result.",
    },
    {
      q: "Does provably fair mean the house has no edge?",
      a: "No. Provably fair proves the draw was honest. The payout table still decides the expected cost of each game, and player-vs-player games may include a fee shown before you enter.",
    },
    {
      q: "Can I check PVPspinArena results without an account?",
      a: "Yes. The Fairness page works for anyone and runs the calculation in your browser using public round data.",
    },
    {
      q: "Why does PVPspinArena use rejection sampling?",
      a: "Dividing a large random number by the number of outcomes and taking the remainder slightly favours some outcomes. Rejection sampling discards values that would cause that bias, so every outcome is exactly equally likely.",
    },
  ],
  sources: [
    { label: "NIST FIPS 180-4 — Secure Hash Standard (SHA-256)", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
    { label: "RFC 2104 — HMAC: Keyed-Hashing for Message Authentication", url: "https://www.rfc-editor.org/rfc/rfc2104" },
  ],
  related: ["provably-fair-games", "commit-reveal-scheme", "server-seed-client-seed", "rng-vs-provably-fair", "provably-fair-calculator"],
  updated: "2026-09-25",
};

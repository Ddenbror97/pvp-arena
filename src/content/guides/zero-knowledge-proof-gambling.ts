import type { Guide } from "./types";

export const guide: Guide = {
  slug: "zero-knowledge-proof-gambling",
  cluster: "Provably fair",
  keyword: "zero knowledge proof",
  secondary: [
    "zk proof",
    "zero knowledge proof explained",
    "zk snark",
    "zero knowledge proof gambling",
    "zk gaming",
  ],
  title: "Zero Knowledge Proof Explained for Privacy and Games",
  description:
    "Zero knowledge proof explained: the cave example, SNARKs vs STARKs, uses in privacy coins, rollups and card games, and how ZK compares to commit-reveal.",
  h1: "Zero knowledge proof explained: privacy, rollups and fair games",
  answer:
    "A zero knowledge proof lets one party prove a statement is true without revealing why it is true. You can prove you know a password, are over 18, or computed a result correctly, while the verifier learns nothing except that the claim holds. Crypto uses ZK proofs for private payments and for rollups that scale Ethereum. In gaming they can prove a shuffle or outcome was honest without exposing hidden cards or seeds.",
  facts: [
    "Zero-knowledge proofs were introduced by Goldwasser, Micali and Rackoff in a 1985 paper.",
    "A valid ZK proof must be complete, sound and zero-knowledge.",
    "Repeating a 50/50 challenge 20 times leaves a cheater about a 1 in 1,048,576 chance.",
    "zk-SNARKs are small and fast to verify; zk-STARKs avoid a trusted setup at the cost of larger proofs.",
    "Commit-reveal proves fairness after the fact by revealing the seed; ZK can prove it without revealing.",
  ],
  sections: [
    {
      id: "what",
      title: "What a zero knowledge proof is, in plain terms",
      body: `Most proofs work by showing your evidence. To prove you know a password, you type it. To prove you are over 18, you show an ID card that also reveals your name, address and exact birthday. A zero knowledge proof removes the evidence from the exchange. The verifier ends up convinced the statement is true and learns **nothing else**.

Every zero knowledge proof system must satisfy three properties:

1. **Completeness.** If the statement is true and both sides follow the protocol, the verifier accepts.
2. **Soundness.** If the statement is false, a cheating prover can convince the verifier only with negligible probability.
3. **Zero knowledge.** The verifier could have produced a transcript that looks the same without talking to the prover, which means the conversation leaked no usable information about the secret.

The third property is the unusual one. It says the verifier gains confidence but no data that could be reused, sold or leaked later.

### Where the idea came from

Shafi Goldwasser, Silvio Micali and Charles Rackoff introduced zero-knowledge proofs in their 1985 paper on the knowledge complexity of interactive proof systems. Goldwasser and Micali later received the 2012 Turing Award, partly for this line of work. For decades ZK was mostly theory. Efficient constructions developed over the 2010s turned it into production cryptography, first in privacy coins and then in Ethereum scaling.

ZK sits alongside the hashing and commitment tools in the [Provably fair topic](/guides/topics/provably-fair). If hash functions are new to you, start with [SHA-256 explained](/guides/sha256-explained).`,
    },
    {
      id: "cave",
      title: "The cave example and the probability behind it",
      body: `The standard teaching example is a ring-shaped cave with one entrance and a magic door blocking the far side, published by Jean-Jacques Quisquater and colleagues in 1989 as a way to explain ZK to children. Peggy claims she knows the password to the door. Victor wants proof without hearing the password.

1. Victor waits outside. Peggy walks into the cave and takes either the left path (A) or the right path (B).
2. Victor walks to the fork and shouts which side Peggy should come out of, A or B, chosen at random.
3. If Peggy knows the password she can always comply, passing through the door if needed. If she does not, she can only comply when Victor happens to call the side she already chose.

A single round proves little: a bluffer passes half the time. Repeat it and the bluffer's odds collapse.

| Rounds | Chance a bluffer passes every round |
| --- | --- |
| 1 | 1/2 = 50% |
| 10 | 1/1,024 ≈ 0.098% |
| 20 | 1/1,048,576 ≈ 0.0001% |
| 40 | about 1 in 1.1 trillion |

The formula is (1/2)^k for k rounds. Victor never learns the password, only that Peggy almost certainly knows it. And a video of the session would not convince a third party, because Peggy and Victor could have agreed the calls in advance. That is the zero-knowledge property in miniature.

### Non-interactive proofs

Real systems cannot run forty rounds of shouting. The **Fiat–Shamir heuristic**, published in 1986, replaces the verifier's random challenges with the output of a hash function over the prover's messages. The prover can then produce a single proof that anyone can check later, which is what blockchains need.`,
    },
    {
      id: "types",
      title: "zk-SNARKs, zk-STARKs and trusted setups",
      body: `Two families dominate practical use.

| | zk-SNARK | zk-STARK |
| --- | --- | --- |
| Name | Succinct Non-interactive ARgument of Knowledge | Scalable Transparent ARgument of Knowledge |
| Proof size | Very small, often a few hundred bytes | Larger, often tens to hundreds of kilobytes |
| Verification | Very fast | Fast |
| Trusted setup | Many schemes require one | None (transparent) |
| Cryptographic basis | Elliptic-curve pairings in common schemes | Hash functions |

### What a trusted setup is

Many SNARK schemes need public parameters generated from secret randomness. If anyone kept that randomness, often called toxic waste, they could forge proofs. Projects address this with multi-party ceremonies in which many participants each contribute randomness; the setup is safe as long as at least one participant destroyed their share. Zcash ran such a ceremony before its 2016 launch, and later ceremonies expanded to thousands of contributors. Newer SNARK systems reduce or remove the need for per-application setups.

### Why STARKs matter

STARKs rely on hash functions rather than elliptic-curve assumptions, so they need no trusted setup and are considered more resistant to future quantum attacks. The cost is larger proofs, which matters when every byte posted on-chain costs gas.

### The cost of proving

In both families, verifying is cheap and proving is expensive. Generating a proof can take seconds to minutes of heavy computation, which is why ZK is used where one expensive proof replaces many expensive checks.`,
    },
    {
      id: "uses",
      title: "Where zero knowledge proofs are used today",
      body: `### Private payments

Zcash, launched in 2016, uses zk-SNARKs for shielded transactions. A shielded transfer proves that inputs equal outputs, that the sender owns the funds and that nothing was double-spent, without revealing sender, receiver or amount on the public chain.

### Rollups that scale Ethereum

A **zk-rollup** executes thousands of transactions off the main chain and posts a single validity proof that they were all processed correctly. Ethereum verifies the proof rather than re-running every transaction. zkSync, Starknet, Scroll and Linea are examples. Base, the network PVPspinArena uses, is an **optimistic** rollup built on the OP Stack: it assumes batches are valid and allows a challenge window for fraud proofs, a different approach to the same scaling problem. The [base network guide](/guides/base-network) explains that model.

### Identity without oversharing

ZK credentials can prove “over 18”, “resident of this country” or “not on a sanctions list” without revealing a date of birth or passport number. Several governments and standards bodies have explored this for digital identity wallets. For gambling sites, this could eventually mean proving legal age without uploading an ID scan, though mainstream adoption is still limited.

### Solvency proofs

Exchanges publishing [proof of reserves](/guides/proof-of-reserves) face a dilemma: proving liabilities without exposing every customer's balance. Some have added ZK proofs showing that the sum of balances is covered and no balance is negative, without publishing the balances themselves.`,
    },
    {
      id: "gaming",
      title: "Zero knowledge proofs in games and gambling",
      body: `Games with hidden information are a natural fit, because the whole point is that players must not see certain data, yet everyone needs to trust the result.

### Card games and shuffles

Cryptographers have studied **mental poker**, playing fair card games without a trusted dealer, since the late 1970s. Modern designs let players jointly shuffle an encrypted deck and use ZK proofs to show each shuffle was a valid permutation, without revealing the order. Each player can later prove the card they reveal is the one they were dealt. No server can peek at hole cards, and no player can swap one in.

### Hidden-map strategy games

Dark Forest, an Ethereum game released in 2020, used zk-SNARKs so players could make moves on a map whose layout stayed hidden, proving each move was legal without revealing coordinates. It is often cited as the first well-known ZK game.

### Casino outcomes

In a hashed casino round, a ZK proof could show that a published result was computed correctly from a committed seed, without ever revealing the seed. That would let an operator reuse a seed across many rounds while still proving each one.

### The limits

ZK proves that a computation was done correctly; it does not prove the inputs were fair. If the operator chooses the seed after seeing your bet, a perfect proof of the calculation proves nothing useful. Commitment timing and unpredictable inputs still matter, which is why ZK is usually combined with the commit and reveal steps rather than replacing them.`,
    },
    {
      id: "compare",
      title: "Zero knowledge proofs vs commit-reveal and VRFs",
      body: `Three tools show up in provably fair systems. Each proves something different.

| Method | What it proves | What gets revealed | Typical cost |
| --- | --- | --- | --- |
| Commit-reveal | The seed was fixed before bets closed | The seed, after settlement | A hash per round; very cheap |
| VRF | A random value came from a known key and input | The value and a short proof | One proof and on-chain check |
| ZK proof | A computation over hidden data was correct | Only the result | Expensive to prove, cheap to verify |

The [commit-reveal scheme](/guides/commit-reveal-scheme) is the workhorse: the operator publishes a hash of a secret seed, takes bets, then reveals the seed so anyone can recompute the hash and the result. It is simple, auditable with a few lines of code, and sufficient when revealing the seed afterwards is acceptable.

A verifiable random function, such as [Chainlink VRF](/guides/chainlink-vrf-gambling), proves a random output was generated correctly from a key and an input, which is useful for on-chain contracts that cannot keep secrets.

ZK earns its cost when you need to keep something hidden permanently: a card deck, a player's hand, a private balance. For a single public wheel spin where the seed can be shown after the fact, commit-reveal gives the same assurance with far less machinery. The [provably fair casino guide](/guides/provably-fair-casino) covers how to verify those rounds yourself.`,
    },
    {
      id: "pvp",
      title: "How this relates to PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, Jackpot, [Coinflip](/coinflip) and [Roulette](/roulette), on the Base network. Results come from committed seeds using commit-reveal: the seed's hash is fixed before the round, and after settlement the seed is revealed so anyone can recompute the outcome on [fairness](/fairness). Nothing about a Roulette spin needs to stay secret afterwards, so revealing the seed is the simplest honest proof.

The maths the proof protects is plain. A 33-slot wheel pays 2x on Purple or Silver and 14x on Green, returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee on every bet. A Coinflip is a 50/50 between two players. A proof, ZK or otherwise, confirms those odds were applied; it cannot improve them.

Play is 18+. The [responsible gambling](/responsible-gambling) page has limits and support if you need them.`,
    },
  ],
  faqs: [
    {
      q: "What is a zero knowledge proof in simple terms?",
      a: "A way to prove a statement is true without revealing the information that makes it true, such as proving you know a password without saying it, or proving you are over 18 without showing your birthday.",
    },
    {
      q: "What is the difference between zk-SNARKs and zk-STARKs?",
      a: "SNARKs produce very small proofs but many schemes need a trusted setup. STARKs need no trusted setup and rely on hash functions, but their proofs are larger.",
    },
    {
      q: "Are zero knowledge proofs used in gambling?",
      a: "Mostly in research and a few experimental games, such as encrypted card shuffles and hidden-information strategy games. Most provably fair casinos use commit-reveal hashing instead, which is simpler.",
    },
    {
      q: "Is a zk-rollup the same as Base?",
      a: "No. Base is an optimistic rollup that relies on fraud proofs and a challenge window. zk-rollups such as zkSync and Starknet post validity proofs for each batch.",
    },
    {
      q: "Can a zero knowledge proof be faked?",
      a: "A sound system makes faking negligibly unlikely, but only if it is implemented correctly and any trusted setup was honest. Bugs in circuits or code can break guarantees.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Zero-knowledge proof",
      url: "https://en.wikipedia.org/wiki/Zero-knowledge_proof",
    },
    {
      label: "ethereum.org: Zero-knowledge proofs",
      url: "https://ethereum.org/en/zero-knowledge-proofs/",
    },
    { label: "Wikipedia: Zcash", url: "https://en.wikipedia.org/wiki/Zcash" },
  ],
  related: [
    "commit-reveal-scheme",
    "provably-fair-casino",
    "chainlink-vrf-gambling",
    "sha256-explained",
    "proof-of-reserves",
    "smart-contract-casino",
  ],
  updated: "2026-09-27",
};

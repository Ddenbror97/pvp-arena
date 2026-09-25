import type { Guide } from "./types";

export const guide: Guide = {
  slug: "provably-fair-games",
  cluster: "Provably fair",
  keyword: "provably fair games",
  secondary: ["provably fair crypto casino", "provably fair verification", "provably fair coinflip"],
  title: "Provably Fair Games: Which Games Can Be Verified?",
  description:
    "Provably fair games explained: how coinflip, jackpot, roulette, dice, crash and cases are verified, what to check on each, and a worked PVPspinArena example.",
  h1: "Provably fair games: how each type is verified",
  answer:
    "Provably fair games are games where the site commits to a secret seed before you play and reveals it afterwards, so you can recompute the result yourself. Coinflip, jackpot, roulette, dice, crash and case openings can all be made provably fair. What changes between games is how a random number is turned into an outcome, so each game type has its own checks.",
  facts: [
    "Every provably fair game starts with a committed seed and ends with a reveal.",
    "The game formula turns the seed into an outcome anyone can recompute.",
    "Mapping numbers to outcomes must avoid bias, for example with rejection sampling.",
    "Provably fair proves the result was not changed, not that the game is profitable.",
    "PVPspinArena Jackpot, Coinflip and Roulette can all be verified on the Fairness page.",
  ],
  sections: [
    {
      id: "core-idea",
      title: "The idea shared by every provably fair game",
      body: `All provably fair games follow the same three steps, whatever is on screen:

1. **Commit.** Before the round, the site picks a secret server seed and publishes its hash. The hash is like a sealed envelope: it proves the seed exists without showing it.
2. **Play.** The round happens. Sometimes players add their own input, such as a client seed.
3. **Reveal.** After the round, the site publishes the seed. Anyone can hash it, confirm it matches the commitment and rerun the formula to get the same result.

Because the seed was locked in before the round, the site cannot pick a different one after seeing the bets. Our [commit-reveal scheme guide](/guides/commit-reveal-scheme) explains the idea in depth, and [server seed vs client seed](/guides/server-seed-client-seed) covers who supplies which input.

The formula usually uses HMAC-SHA256 to turn the seed into a long random-looking number. Our [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) shows how that works.

What differs between games is the last step: turning that number into heads or tails, a winning ticket, a wheel slot or a crash point.`,
    },
    {
      id: "coinflip",
      title: "Provably fair coinflip",
      body: `Coinflip is the simplest case. The formula needs one of two outcomes.

**How it is verified:** take the committed seed and the round details, compute the HMAC, turn part of it into a number, and map it to heads or tails.

**What to check:** that the mapping is exactly 50/50. A naive method can give one side a tiny advantage. Sound designs use rejection sampling, discarding the rare values that would cause bias.

On PVPspinArena, a finished [Coinflip](/coinflip) room can be checked on the Fairness page, which recomputes the side in your browser. Our [coin flip odds guide](/guides/coin-flip-odds) explains why the odds stay 50/50 every time.`,
    },
    {
      id: "jackpot",
      title: "Provably fair jackpot",
      body: `In jackpot, players add stakes to one pot and each cent is effectively a ticket. The formula picks one winning ticket.

**How it is verified:** list every entry in order with its ticket range, compute the random number from the seed, and find which range the winning ticket falls into.

**What to check:**

- That the entry list, including amounts and order, is published and fixed before the draw.
- That the winning ticket is chosen uniformly across the whole pot, without bias toward low or high numbers.
- That your chance equals your share of the pot.

PVPspinArena stores stakes as whole cents, so the ticket count equals the pot in cents. The draw uses rejection sampling so every ticket is equally likely. Our [crypto jackpot guide](/guides/crypto-jackpot) walks through the odds.`,
    },
    {
      id: "roulette",
      title: "Provably fair roulette",
      body: `Roulette maps the random number to one slot on the wheel.

**How it is verified:** compute the number from the seed, map it to a slot, and check the slot's colour and payout.

**What to check:** that every slot is equally likely and that the payout table matches the number of slots. The house edge comes from the payouts, not from hidden weighting.

PVPspinArena Roulette has 15 slots: 7 purple paying 2x, 7 silver paying 2x and 1 green paying 14x. Each slot is equally likely, so the return is 14 in 15 and the edge is about 6.67%. Our [provably fair roulette guide](/guides/provably-fair-roulette) shows how to verify a spin, and you can check any round by number on the [Fairness page](/fairness).`,
    },
    {
      id: "dice-crash-cases",
      title: "Dice, crash and case openings",
      body: `PVPspinArena does not offer these games, but many other sites do, so it helps to know what to check.

### Dice

The formula turns the seed into a number, often between 0 and 99.99. You win if it lands above or below your target. Check that the payout for each target matches its true chance minus the stated edge.

### Crash

The formula produces a crash multiplier. Most designs make a small share of rounds crash instantly, which is where the edge comes from. Check that the formula is published and that each round's crash point can be recomputed from the revealed seed. Our [crash gambling guide](/guides/crash-gambling) explains how crash maths works.

### Case openings

The formula picks an item from a list with published odds. Check that the full odds table is published and fixed, and that the item values used by the site are ones you can actually receive. See our [CS:GO case opening guide](/guides/csgo-case-opening).`,
    },
    {
      id: "limits",
      title: "What provably fair does not prove",
      body: `Provably fair is a strong guarantee, but a narrow one. It proves the result came from the committed seed and the published formula. It does not prove:

- **That the game is good value.** A provably fair game can still have a large house edge. Check the [house edge](/guides/house-edge) separately.
- **That the payouts are honest.** The site could compute a fair result and then pay the wrong amount. Check your balance history.
- **That the seed was random.** A commitment shows the seed was not changed, not how it was picked. Player-supplied input reduces this concern.
- **That anyone checked.** Verification only helps if someone does it. Check a few rounds yourself now and then.

For a full comparison with traditional casino systems, read [RNG vs provably fair](/guides/rng-vs-provably-fair).`,
    },
    {
      id: "example",
      title: "Worked example: verifying a PVPspinArena round",
      body: `Here is how you would check a Roulette round on PVPspinArena:

1. **Note the round number.** Recent rounds are listed under the wheel, for example #389.
2. **Open the Fairness page** and choose the Roulette tab.
3. **Enter the round number.** You can type it with or without the # sign.
4. **Read the result.** The verifier fetches the revealed seed, confirms it matches the published hash, recomputes the slot in your browser and shows the colour.
5. **Compare.** The slot should match what the wheel showed and what was paid.

Jackpot and Coinflip work the same way from their own tabs. If you prefer to do the maths yourself, our [provably fair calculator guide](/guides/provably-fair-calculator) shows each step with the same formula.`,
    },
  ],
  faqs: [
    { q: "What are provably fair games?", a: "Games where the site commits to a secret seed before the round and reveals it afterwards, so anyone can recompute the result and confirm it was not changed." },
    { q: "Which games can be provably fair?", a: "Any game whose result comes from random numbers: coinflip, jackpot, roulette, dice, crash, plinko, case openings and more. Each uses its own formula to turn the random number into an outcome." },
    { q: "Does provably fair mean I will win?", a: "No. It only proves the result was not changed. The game can still have a house edge, and every result is still random." },
    { q: "How do I verify a provably fair game?", a: "Get the revealed seed and round details, confirm the seed matches the hash published before the round, and rerun the published formula. Many sites, including PVPspinArena, provide a verifier page that does this for you." },
    { q: "Which PVPspinArena games are provably fair?", a: "Jackpot, Coinflip and Roulette. Every round of each can be checked on the Fairness page." },
  ],
  sources: [
    { label: "RFC 2104 — HMAC: Keyed-Hashing for Message Authentication", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST FIPS 180-4 — Secure Hash Standard (SHA-256)", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
    { label: "NIST SP 800-90A — Random number generation using deterministic RBGs", url: "https://csrc.nist.gov/pubs/sp/800/90/a/r1/final" },
  ],
  related: ["provably-fair-casino", "commit-reveal-scheme", "rng-vs-provably-fair", "provably-fair-roulette", "hmac-sha256-provably-fair"],
  updated: "2026-09-25",
  cta: {
    title: "Verify a round yourself",
    text: "Create a free account to play Jackpot, Coinflip and Roulette, and check any round on the Fairness page.",
    primary: { to: "/auth", label: "Create your free account" },
    secondary: { to: "/fairness", label: "Check a result" },
  },
};

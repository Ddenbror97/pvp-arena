import type { Guide } from "./types";

export const guide: Guide = {
  slug: "provably-fair-calculator",
  cluster: "Provably fair",
  keyword: "provably fair calculator",
  secondary: ["provably fair checker", "verify provably fair", "provably fair verifier", "server seed checker"],
  title: "Provably Fair Calculator: How to Check Any Game Result",
  description:
    "Use a provably fair calculator to check a game result: verify the seed hash, recompute HMAC-SHA256 and map it to the outcome, with worked examples.",
  h1: "Provably fair calculator: how to check any game result",
  answer:
    "A provably fair calculator is a tool that takes a game's revealed server seed and game details, checks the seed against the hash published before the game, recomputes the result with the same algorithm the site uses, and shows whether it matches. You can use the site's own verifier, an independent tool, or a few lines of code.",
  facts: [
    "Every provably fair check has three steps: verify the commitment, recompute the hash, map it to a result.",
    "A calculator is only useful if it uses the exact algorithm and message format the site publishes.",
    "Seeds are usually shown as hex; entering them as plain text is the most common checking mistake.",
    "PVPspinArena's calculator runs in your browser on the Fairness page for Jackpot, Coinflip and Roulette.",
    "You can reproduce any PVPspinArena result with standard SHA-256 and HMAC-SHA256 tools.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What is a provably fair calculator?",
      body: `A provably fair calculator, sometimes called a verifier or checker, is a tool that repeats a game's result calculation so you can confirm it independently. It exists because a provably fair system is only valuable if players actually can check it.

Every provably fair game follows the same pattern. Before play, the site commits to a secret by publishing its hash. After play, it reveals the secret. The calculator takes that revealed secret and the game's details and does two things:

- **Confirms the commitment**: hashing the revealed seed must give exactly the hash shown before the game.
- **Recomputes the result**: running the published algorithm on the seed and game details must give exactly the result you saw.

If both match, the result was fixed before the game and computed honestly. If either fails, something is wrong.

Calculators come in three forms: the site's own verifier, independent third-party tools, and your own code. Each has trade-offs, which this guide covers. If you are new to the idea, start with our [provably fair casino guide](/guides/provably-fair-casino).`,
    },
    {
      id: "inputs",
      title: "What you need before you start",
      body: `Every calculator needs the same core inputs. Collect them from the finished game before you begin.

- **Server seed (revealed)**: the secret used to produce the result, shown after the game. On PVPspinArena it is 32 bytes, written as 64 hex characters.
- **Server seed hash (commitment)**: the SHA-256 hash that was published before the game.
- **Game identifier**: the game or round number.
- **Any extra inputs**: some sites use a client seed and a nonce. PVPspinArena's messages use the game number, a draw version and, for Jackpot and Roulette, a counter.
- **The algorithm**: the exact recipe for turning these inputs into a result. A good site documents it publicly.

### Where to find them on PVPspinArena

The finished game or round shows its number. The [Fairness page](/fairness) loads the seed, commitment and draw version automatically once you enter that number, and shows the message text used.

### Check the documentation first

If a site does not publish its algorithm in enough detail to reproduce it, no calculator can help. That alone is a warning sign.`,
    },
    {
      id: "steps",
      title: "Step-by-step: checking a result",
      body: `Here is the general process any calculator follows. Doing it once by hand makes it much easier to trust the automated tools.

1. **Hash the revealed seed.** Compute SHA-256 of the seed bytes.
2. **Compare with the commitment.** The output must match the pre-game hash character for character.
3. **Build the message.** Assemble the exact text the site uses, for example \`PVPCasino:coinflip:v1:1234:1\`.
4. **Compute the HMAC.** Run HMAC-SHA256 with the seed as the key and the message as the data.
5. **Map to a result.** Apply the site's rule for turning the output into an outcome.
6. **Compare with the game.** The computed outcome must match what the game showed.

### The mapping rules on PVPspinArena

- **Coinflip**: look at the first byte of the HMAC. If it is even, the result is heads; if odd, tails.
- **Roulette**: read the first 8 bytes as a big number r. If r is below the largest multiple of 15 under 2^64, the slot is r mod 15. Otherwise increase the counter and try again.
- **Jackpot**: the same rejection sampling picks a winning ticket from the total number of tickets in the pot.

The [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) explains why these steps are safe.`,
    },
    {
      id: "site-verifier",
      title: "Using PVPspinArena's built-in calculator",
      body: `The easiest way to check a PVPspinArena game is the built-in verifier.

1. Open [Fairness](/fairness).
2. Choose the tab for the game: Jackpot, Coinflip or Roulette.
3. Enter the game or round number. For Roulette you can type it with or without the # symbol, such as #389.
4. Press verify.

The page then shows:

- The revealed server seed and the published commitment.
- Whether SHA-256 of the seed matches the commitment.
- The exact message text used.
- The HMAC-SHA256 output.
- The mapped result and whether it matches the recorded outcome.

### Why it runs in your browser

The calculation uses your browser's built-in Web Crypto API. The site sends the stored data, but your device does the maths. That means the verifier cannot simply display "match" without the numbers actually matching.

### Test vectors

PVPspinArena also checks its fairness code against fixed test vectors, known inputs with known outputs, before changes go live. That helps make sure the verifier and the game use identical logic.`,
    },
    {
      id: "independent",
      title: "Checking with an independent tool",
      body: `A site's own verifier is convenient, but checking with a tool the site does not control is stronger evidence. Any reliable SHA-256 and HMAC-SHA256 calculator will do.

### Check the commitment

1. Copy the revealed server seed.
2. Open a SHA-256 tool that accepts **hex input**.
3. Paste the seed, choose hex as the input format and compute.
4. Compare with the commitment.

### Recompute the HMAC

1. Open an HMAC-SHA256 tool.
2. Set the key to the server seed and choose **hex** as the key format.
3. Set the message to the exact text, as plain text, for example \`PVPCasino:roulette:v1:389:1:0\`.
4. Compute and compare with the HMAC shown on the Fairness page.

### Map the result

For Coinflip, look at the first two hex characters of the output. Convert them to a number: if it is even, heads; if odd, tails. For example, \`65\` in hex is 101, which is odd, so tails.

For Roulette, convert the first 16 hex characters to a number and take the remainder after dividing by 15. Spreadsheet or calculator apps that handle big numbers can do this.`,
    },
    {
      id: "code",
      title: "Writing your own calculator",
      body: `If you are comfortable with a little code, a few lines are enough. This JavaScript runs in any modern browser console.

### Coinflip check in the browser

- Convert the hex seed to bytes.
- Import it as an HMAC key with \`crypto.subtle.importKey("raw", seedBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])\`.
- Sign the message with \`crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))\`.
- Read the first byte of the result: \`(bytes[0] & 1) === 0\` means heads.

To check the commitment, pass the seed bytes to \`crypto.subtle.digest("SHA-256", seedBytes)\` and compare the hex output.

### Other languages

- **Python**: \`hmac.new(bytes.fromhex(seed), message.encode(), hashlib.sha256).hexdigest()\`.
- **Node.js**: \`crypto.createHmac("sha256", Buffer.from(seed, "hex")).update(message).digest("hex")\`.

### Why write your own

Your own code has no dependency on the site or any third party. It also forces you to understand every step, which makes it easier to spot a site whose documentation does not match its behaviour.`,
    },
    {
      id: "mistakes",
      title: "Common mistakes and how to fix them",
      body: `If your calculation does not match, it is almost always one of these.

- **Seed entered as text.** The seed \`ab12…\` must be treated as hex bytes. As text it gives a completely different hash.
- **Wrong message format.** A missing colon, extra space or wrong version number changes everything. Copy the message exactly.
- **Wrong draw version or counter.** If a game was redrawn for a technical reason, its draw version increases. Roulette and Jackpot may use a counter above zero after rejection sampling.
- **Uppercase vs lowercase hex.** Most tools accept both for input, but compare outputs case-insensitively.
- **Using the wrong game number.** Double-check the round or game you are verifying.
- **Tool truncating big numbers.** When mapping 8 bytes to a number, use a tool that supports 64-bit integers. Ordinary spreadsheet cells lose precision.

If you have ruled all of these out and the result still does not match, keep a record of the game number, seed and your calculation, and contact the site's support.`,
    },
    {
      id: "trust",
      title: "What a matching result really tells you",
      body: `A successful check is strong evidence, but it is worth knowing its scope.

### It tells you

- The site committed to this seed before the game.
- The result follows exactly from that seed and the published algorithm.
- The site could not have changed the result after seeing bets or players.

### It does not tell you

- Whether your balance was credited correctly. Check your wallet history for that.
- Whether the site processes withdrawals promptly or holds funds securely.
- Whether gambling is legal where you are.

### Spot checks are enough

You do not need to verify every game. Checking a few at random, especially large or surprising results, is enough to keep a site honest, because a site that cheated even occasionally would risk being caught by anyone at any time.

Explore the rest of our guides on the [guides page](/guides), or read [how it works](/how-it-works) for the full picture of PVPspinArena.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `A provably fair calculator repeats a game's result calculation: hash the revealed seed and compare it with the commitment, recompute HMAC-SHA256 with the exact message, and map the output to an outcome. If everything matches, the result was fixed before the game.

On PVPspinArena you can use the built-in verifier on the Fairness page, which runs in your browser, or any independent SHA-256 and HMAC-SHA256 tool. Enter the seed as hex, copy the message exactly and use 64-bit maths for Roulette and Jackpot.

Spot-checking a few games is enough to hold a site to account. A match proves fairness of the result, not solvency or payouts, so check those separately.`,
    },
  ],
  faqs: [
    {
      q: "Is a site's own provably fair calculator trustworthy?",
      a: "It can be, especially if it runs in your browser. For stronger evidence, repeat the check with an independent SHA-256 and HMAC-SHA256 tool or your own code.",
    },
    {
      q: "Why does my seed hash not match the commitment?",
      a: "The most likely cause is entering the seed as text instead of hex. Choose hex input in your SHA-256 tool and try again.",
    },
    {
      q: "Can I verify a game before it finishes?",
      a: "No. The server seed is revealed only after the game settles. Before that you can only see its hash, which is what keeps the result unpredictable.",
    },
    {
      q: "Do I need a client seed to verify PVPspinArena games?",
      a: "No. PVPspinArena messages use the game number, draw version and, for Jackpot and Roulette, a counter. The Fairness page shows the exact message for each game.",
    },
    {
      q: "How many games should I verify?",
      a: "A few random spot checks are enough. Because any result can be checked by anyone, a site cannot safely cheat even occasionally.",
    },
  ],
  sources: [
    { label: "MDN: SubtleCrypto.sign() (HMAC)", url: "https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign" },
    { label: "MDN: SubtleCrypto.digest()", url: "https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest" },
    { label: "Python docs: hmac module", url: "https://docs.python.org/3/library/hmac.html" },
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
  ],
  related: ["hmac-sha256-provably-fair", "provably-fair-casino", "cs2-roulette"],
  updated: "2026-09-25",
  howTo: true,
};

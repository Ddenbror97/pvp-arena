import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-roulette",
  cluster: "Games & odds",
  keyword: "crypto roulette",
  secondary: ["bitcoin roulette", "usdc roulette", "online crypto roulette", "provably fair crypto roulette"],
  title: "Crypto Roulette: How It Works, Odds and Fair Play",
  description:
    "How crypto roulette works: wheel formats, odds and payouts, provably fair results, USDC deposits and withdrawals, and what to check before you play.",
  h1: "Crypto roulette: how it works, odds and fair play",
  answer:
    "Crypto roulette is roulette played with cryptocurrency, usually stablecoins like USDC, instead of bank money. You deposit from a wallet, bet on colors or numbers, and winnings are credited to your balance. The best versions are provably fair, meaning each spin's result is committed in advance and can be verified. The odds work the same as normal roulette: every bet has a built-in house edge.",
  facts: [
    "Crypto roulette settles bets in crypto, commonly USDC or other stablecoins.",
    "Provably fair roulette publishes a hash of the result seed before betting opens.",
    "PVPspinArena's wheel has 7 Purple (2x), 7 Silver (2x) and 1 Green (14x) slot.",
    "The house edge on PVPspinArena Roulette is 6.67% on every bet.",
    "Stablecoins avoid the price swings of Bitcoin or ETH while you play.",
  ],
  sections: [
    {
      id: "what",
      title: "What is crypto roulette?",
      body: `Crypto roulette is the familiar wheel game, run online, with balances funded by cryptocurrency. The game itself is roulette: players bet on where the wheel stops and are paid according to fixed multipliers. What changes is how money moves in and out, and often how fairness is proven.

### Two broad styles

- **Classic numbered roulette**: a 37-pocket European or 38-pocket American wheel with red, black and green, and all the usual inside and outside bets.
- **Coloured wheel roulette**: a smaller wheel with two common colors and one rare color. This style grew out of the CS:GO skin sites, as covered in our [CS2 roulette guide](/guides/cs2-roulette).

PVPspinArena runs the coloured style. You can see it live on the [Roulette page](/roulette).

### Why players use crypto

Crypto deposits arrive in minutes, work across borders and do not require card details. Stablecoins like USDC hold a steady dollar value, so your balance does not rise and fall with the market while you play. Our [what is a crypto casino guide](/guides/what-is-a-crypto-casino) covers the general model.`,
    },
    {
      id: "how-round",
      title: "How a crypto roulette round works",
      body: `On PVPspinArena, Roulette runs continuously on a fixed cycle, whether or not anyone is betting. Each round has four stages.

1. **Commit.** Before betting opens, the server creates a secret seed and publishes its SHA-256 hash. This locks the result in advance without revealing it.
2. **Betting.** Players place bets on Purple, Silver or Green from their USD balance.
3. **Lock and spin.** Betting closes, the result is calculated from the seeds and the wheel spins for about seven seconds.
4. **Settle and reveal.** Winning bets are credited on the server, and the seed is revealed so anyone can check the result.

### Server-authoritative

Every value, from the result to your new balance, is decided by the server's database, not your browser. The browser only displays what happened. This stops tampering from the client side and means a refresh or dropped connection cannot change a result.

### Continuous rounds

Because rounds run on the server's clock, the wheel keeps cycling even when nobody is watching. You can join any round during its betting window. The full cycle is described on the [How it works](/how-it-works) page.`,
    },
    {
      id: "odds",
      title: "Crypto roulette odds and payouts",
      body: `The odds depend on the wheel, not the currency. Here are the three formats you will meet most often.

### PVPspinArena coloured wheel (15 slots)

- Purple: 7/15 = 46.67%, pays 2x.
- Silver: 7/15 = 46.67%, pays 2x.
- Green: 1/15 = 6.67%, pays 14x.
- House edge on every bet: 6.67%.

### European roulette (37 pockets)

- Red or black: 18/37 = 48.65%, pays 2x.
- Single number: 1/37 = 2.70%, pays 36x.
- House edge on every standard bet: 2.70%.

### American roulette (38 pockets)

- Red or black: 18/38 = 47.37%, pays 2x.
- Single number: 1/38 = 2.63%, pays 36x.
- House edge on most bets: 5.26%.

### Reading the edge

The edge is the average cost per dollar wagered, not per session. Ten $1 bets cost the same on average as one $10 bet. Because crypto roulette rounds are quick, the total you wager per hour can climb fast. Our [house edge guide](/guides/house-edge) explains how to estimate your real cost, and the [roulette colors guide](/guides/roulette-colors) goes deeper into each color.`,
    },
    {
      id: "fairness",
      title: "Provably fair crypto roulette",
      body: `Traditional online roulette asks you to trust that a certified random number generator is working correctly. Provably fair roulette lets you check each result yourself.

### The basic idea

1. The server generates a secret server seed and publishes its hash before bets open.
2. The result is calculated from the server seed combined with other inputs, such as a client seed and round number, using HMAC-SHA256.
3. After the round, the server seed is revealed.
4. You hash the revealed seed and confirm it matches the published hash, then repeat the calculation to get the same result.

If the platform had changed the seed after seeing bets, the hash would not match.

### On PVPspinArena

Each Roulette round shows its number and fairness data. Enter the round number on the [fairness page](/fairness) and the check runs in your browser. The result is mapped to a slot using rejection sampling, so every slot is equally likely and there is no bias from rounding.

For a step-by-step walkthrough, read our [provably fair roulette guide](/guides/provably-fair-roulette). If you want to understand the cryptography, see the [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair).`,
    },
    {
      id: "deposits",
      title: "Depositing for crypto roulette",
      body: `To play with crypto, you first need funds in a wallet and a balance on the site.

### What you need

- A self-custody wallet such as MetaMask. See our [MetaMask casino guide](/guides/metamask-casino).
- USDC on the right network. PVPspinArena accepts USDC on Base.
- A small amount of ETH on Base in your wallet to pay network fees when you send.

If you do not own USDC yet, our [how to buy USDC guide](/guides/how-to-buy-usdc) covers the usual options, and [how to add Base to MetaMask](/guides/add-base-network-metamask) shows the network setup.

### How deposits are matched

On PVPspinArena, you verify your wallet address on your profile. Deposits from that verified address to the platform's deposit address are detected on Base, checked and credited to your USD balance automatically. Amounts are recorded in cents in a double-entry ledger, so every credit has a matching record.

### Common mistakes

- Sending on the wrong network.
- Sending from an exchange address that you have not verified.
- Sending a token other than USDC.

Always send a small test amount first if you are unsure. The [wallet page](/wallet) shows the exact address and network.`,
    },
    {
      id: "withdrawals",
      title: "Withdrawing roulette winnings",
      body: `Withdrawals move your USD balance back to your wallet as USDC.

### How it works on PVPspinArena

1. Request a withdrawal from the [wallet page](/wallet).
2. The amount is held immediately, so it cannot be spent while the payout is processed.
3. The payout is signed and sent on Base.
4. The withdrawal is marked finished only once the transaction is in a safe block and two separate network providers agree it succeeded.

This design prevents double payouts and avoids marking a payment finished too early. Daily limits apply, and larger requests may be reviewed first.

### Timing

Most withdrawals complete in minutes. Delays usually come from review, high network load or provider disagreements, in which case the funds stay held until the result is clear.

Read our [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) for more detail on safe blocks, fees and what to check.`,
    },
    {
      id: "vs-fiat",
      title: "Crypto roulette vs regular online roulette",
      body: `### Speed of payments

Crypto deposits and withdrawals usually settle in minutes. Card and bank payments can take days.

### Privacy

Crypto payments do not require card details. Transactions are, however, public on the blockchain, so they are pseudonymous rather than anonymous.

### Transparency

Provably fair crypto roulette lets you verify results. Most regular sites rely on third-party audits of their RNG, which you cannot check yourself. Our [RNG vs provably fair guide](/guides/rng-vs-provably-fair) compares the two.

### Price risk

Using volatile coins like Bitcoin means your balance can change value while you play. Stablecoins remove most of that risk. See [USDC vs USDT](/guides/usdc-vs-usdt-gambling) for the differences between the main stablecoins.

### Mistakes are harder to undo

Blockchain transfers cannot be reversed by a bank. Sending to the wrong address or network may mean losing the funds. Double-check every transfer.

### Regulation

Rules on online gambling vary by country. Check what applies where you live and read the site's [terms](/terms) before depositing.`,
    },
    {
      id: "checklist",
      title: "What to check before playing crypto roulette",
      body: `Use this checklist on any crypto roulette site.

- **Is the wheel layout and payout shown clearly?** You should be able to calculate the house edge yourself.
- **Is it provably fair, with a working verifier?** Try checking a past round before you bet.
- **Which tokens and networks are supported?** Make sure your funds match.
- **How are deposits credited?** Look for automatic crediting and clear status updates.
- **How are withdrawals handled?** Check limits, review thresholds and typical timing.
- **Are there responsible gambling tools?** A trustworthy site explains limits and where to get help.

### Play sensibly

Set a loss limit and a time limit before you start. Roulette is fast, and a 6.67% edge on many quick rounds adds up. Never chase losses with bigger bets. The [responsible gambling page](/responsible-gambling) lists practical steps and support options.

Betting systems like Martingale do not change the maths. Our [martingale strategy guide](/guides/martingale-strategy) explains why.`,
    },
    {
      id: "session-example",
      title: "A worked session example",
      body: `Numbers make the cost of crypto roulette easier to picture. Imagine a player with a $20 budget who bets $1 per round on Silver for 60 rounds.

- Total wagered: $60, three times the starting budget, because winnings are re-bet.
- Expected cost at a 6.67% edge: about $4.
- Expected wins: about 28 of the 60 rounds.

In practice the result could easily be anywhere from a $15 loss to a small profit. That spread is variance. If the same player bet on Green instead, the average cost would be the same, but the range would be much wider: several Green hits could double the budget, and no hits at all in 60 rounds is possible (about a 1.6% chance).

### What to take from it

The edge sets the average. Your bet size and the number of rounds set how much you actually wager. Smaller bets over fewer rounds keep the cost down, whatever color you choose. Stopping at a set loss limit is the single most effective way to keep a session under control.`,
    },
    {
      id: "stablecoins",
      title: "Why stablecoins suit roulette",
      body: `Many early crypto casinos used Bitcoin. That meant a player could win a round and still lose money if the price of Bitcoin fell before they withdrew. It also made it hard to know what a bet was really worth.

Stablecoins solve most of this. USDC is designed to track the US dollar, so a $5 bet is a $5 bet from deposit to withdrawal. Balances are easier to track, and budgets mean what they say. Stablecoins still carry their own small risks, such as the issuer's reserves and rare short-lived price dips, which our [USDC vs USDT guide](/guides/usdc-vs-usdt-gambling) discusses.`,
    },
  ],
  faqs: [
    {
      q: "Is crypto roulette fair?",
      a: "It depends on the site. Provably fair crypto roulette publishes a hash of each result seed in advance and lets you verify the outcome after the round, which a standard RNG cannot offer.",
    },
    {
      q: "What crypto can I use for roulette on PVPspinArena?",
      a: "PVPspinArena accepts USDC on the Base network. Balances are shown and settled in USD.",
    },
    {
      q: "What is the house edge on crypto roulette?",
      a: "It depends on the wheel. European roulette has 2.70%, American 5.26%, and PVPspinArena's 15-slot coloured wheel has 6.67% on every bet.",
    },
    {
      q: "How long do crypto roulette withdrawals take?",
      a: "Usually minutes. On PVPspinArena, a payout is finished once it is in a safe block and two providers agree, and larger requests may be reviewed first.",
    },
    {
      q: "Can I verify a crypto roulette spin myself?",
      a: "Yes, on provably fair sites. On PVPspinArena, enter the round number on the fairness page and the check runs in your browser.",
    },
  ],
  sources: [
    { label: "Base documentation", url: "https://docs.base.org/" },
    { label: "Circle: USDC overview", url: "https://www.circle.com/usdc" },
    { label: "Wizard of Odds: Roulette", url: "https://wizardofodds.com/games/roulette/" },
  ],
  related: ["how-to-win-at-roulette", "crash-gambling", "provably-fair-roulette", "roulette-colors", "cs2-roulette"],
  updated: "2026-09-25",
};

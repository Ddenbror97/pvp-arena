import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-terminology",
  cluster: "Foundations",
  keyword: "casino terminology",
  secondary: ["casino terms", "gambling terms glossary", "crypto casino terms", "casino slang"],
  title: "Casino Terminology: A Plain-English Gambling Glossary",
  description:
    "Casino terminology explained in plain English: odds, payouts, house edge, RTP, provably fair seeds, wallets, jackpots, PvP formats and responsible play terms.",
  h1: "Casino terminology: a plain-English glossary",
  answer:
    "Casino terminology is the set of words players use for bets, odds, payouts and the rules behind each game. Knowing the core terms, such as stake, multiplier, house edge, RTP, pot and seed, makes it much easier to judge what a game really costs and whether its results can be checked. This glossary groups the terms by topic, with examples from real games.",
  facts: [
    "A stake (or wager) is the amount you put on a single bet.",
    "A 2x multiplier returns twice your stake, including the stake itself.",
    "House edge and RTP describe the same cost from opposite sides: RTP = 100% − house edge.",
    "In player-vs-player games, the pot is funded by players and the house only takes a fee.",
    "Provably fair terms like server seed, client seed and nonce describe how a result can be verified.",
  ],
  sections: [
    {
      id: "why",
      title: "Why casino terminology matters",
      body: `Gambling has its own vocabulary, and much of it hides important details. A game that "pays 2x" and one that "pays 2 to 1" sound identical but return different amounts. A site that promises "high RTP" might still charge a meaningful edge on the games you actually play.

Learning the words is not about sounding like a regular. It is about reading rules correctly, comparing games fairly and spotting when something is vague on purpose.

This glossary is organised into groups: betting basics, odds and payouts, game formats, provably fair terms, crypto payment terms and responsible play. Where it helps, each term uses an example from the games on PVPspinArena: [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette).

If you are completely new, start with our guide on [what a crypto casino is](/guides/what-is-a-crypto-casino), then come back here whenever a word is unclear.`,
    },
    {
      id: "betting-basics",
      title: "Betting basics",
      body: `### Stake (or wager)

The amount of money you commit to one bet. If you place $5 on Silver in Roulette, your stake is $5.

### Bankroll

The total amount of money you have set aside for gambling. It should be money you can afford to lose. Our [gambling budget guide](/guides/gambling-budget) explains how to set one.

### Session

A continuous period of play. Many players set a time and money limit per session rather than per day.

### Total wagered (or turnover)

The sum of all stakes you place, not your deposit. If you deposit $20 and place forty $1 bets, you have wagered $40. Costs like the house edge apply to this total.

### Balance

The money currently available in your account. On PVPspinArena, balances are held in USD cents and every change is recorded in a server-side ledger.

### Round

One complete cycle of a game, from accepting bets to settling the result. A Roulette round, for example, includes betting, locking, spinning and paying out.

### Settlement

The moment a result is applied to balances. Winnings are credited and losing stakes are finalised.`,
    },
    {
      id: "odds-payouts",
      title: "Odds, payouts and probability",
      body: `### Probability

The chance an outcome happens, from 0% to 100%. On a 15-slot wheel with one Green slot, the probability of Green is 1/15, about 6.67%.

### Odds

Another way of expressing probability. "Odds of 14 to 1 against" means 14 losing outcomes for every winning one. Odds formats differ between countries, which is a common source of confusion.

### Multiplier

The total amount returned per unit staked, including the stake. A 14x multiplier on a $1 bet returns $14. Most crypto games use multipliers because they are unambiguous.

### Payout

The actual amount credited when you win. With a multiplier, payout = stake × multiplier.

### "X to 1" versus "X for 1"

"2 to 1" returns your stake plus two times your stake (3x in total). "2 for 1" returns 2x in total. Always check which one a game means.

### Expected value (EV)

The average result of a bet if it were repeated many times. A bet with negative EV loses money on average. Almost all house-banked casino bets have negative EV.

### Variance

How widely individual results swing around the average. A 14x bet has much higher variance than a 2x bet, even if both have the same expected value. Our [coin flip odds guide](/guides/coin-flip-odds) shows variance with simple examples.`,
    },
    {
      id: "house-edge-rtp",
      title: "House edge, RTP and fees",
      body: `### House edge

The average share of total wagers a house-banked game keeps over the long run. A full explanation, with worked examples, is in our [house edge guide](/guides/house-edge).

### RTP (return to player)

The same measure from the player's side: RTP = 100% − house edge. A game with a 96% RTP has a 4% house edge.

### Rake or fee

A cut taken from a pot rather than a built-in edge. Poker rooms and player-vs-player games usually charge a rake or fee. On PVPspinArena the house fee is configurable and defaults to 0%.

### House-banked

A game where you play against the operator, who pays winners from its own money. Classic roulette and slots are house-banked.

### Peer-to-peer (PvP)

A game where players play against each other, and the winner receives money put in by other players. The operator does not take the other side of the bet. See our [PvP gambling guide](/guides/pvp-gambling).

### Hit rate

How often a bet wins, regardless of payout size. A high hit rate does not mean a bet is good value.

### Break-even

The point at which total returns equal total stakes. Because of the house edge, house-banked games do not break even on average.`,
    },
    {
      id: "game-formats",
      title: "Game formats and terms",
      body: `### Jackpot (pot game)

Players add money to a shared pot. Each player's chance of winning equals their share of the pot. One winner takes the pot, minus any fee. Details are in our [crypto jackpot guide](/guides/crypto-jackpot).

### Ticket

In pot games, a unit that represents your share. More money in means more tickets, which means a higher chance of winning.

### Coinflip

A two-player game where each side stakes the same amount and one coin toss decides who takes both stakes. Read the [CS:GO coinflip guide](/guides/csgo-coinflip) for the history.

### Room or lobby

A game that has been created and is waiting for an opponent or more players.

### Roulette

A wheel game where players bet on which segment the wheel stops on. PVPspinArena uses a coloured wheel with 7 Purple, 7 Silver and 1 Green slot.

### Countdown

The time left before a round locks. In Jackpot, the countdown starts once enough players have joined.

### Lock

The moment a round stops accepting bets. After lock, the result is determined and nothing can be added or removed.

### Draw

The step where the winning outcome is calculated from the committed seeds.`,
    },
    {
      id: "provably-fair",
      title: "Provably fair terms",
      body: `### Provably fair

A method that lets players check that a result was fixed in advance and not changed after bets were placed. Our [provably fair casino guide](/guides/provably-fair-casino) covers it in depth.

### Server seed

A secret random value created by the platform before a round. It stays hidden until the round ends.

### Hash (or commitment)

A fingerprint of the server seed published before the round. Anyone can later check that the revealed seed matches it. The idea is explained in our [commit-reveal scheme guide](/guides/commit-reveal-scheme).

### Client seed

A value that players or the round contribute, so the platform cannot pick a result on its own. See [server seed vs client seed](/guides/server-seed-client-seed).

### Nonce

A counter that changes for each bet or round, so the same seeds never produce the same result twice.

### HMAC-SHA256

The cryptographic function commonly used to turn seeds into a result. We explain it in the [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair).

### Reveal

Publishing the server seed after the round so players can verify the result.

### Verifier

A tool that repeats the calculation. You can use the [fairness page](/fairness) to check any round in your browser.

### RNG (random number generator)

Software that produces random results. Traditional RNG games ask you to trust an auditor, while provably fair games let you check yourself.`,
    },
    {
      id: "crypto-terms",
      title: "Crypto payment terms",
      body: `### Wallet

Software that holds the keys to your crypto. MetaMask is a common browser wallet. See our [MetaMask casino guide](/guides/metamask-casino).

### Wallet address

A public identifier, starting with 0x on Ethereum-style networks, where funds can be sent.

### Stablecoin

A token designed to track a fiat currency. USDC aims to stay at $1. Read [USDC vs USDT](/guides/usdc-vs-usdt-gambling) for the differences.

### Network (or chain)

The blockchain a transaction runs on. PVPspinArena accepts USDC on Base. Sending on the wrong network can lose funds, so read [how to add Base to MetaMask](/guides/add-base-network-metamask) first.

### Gas

The network fee paid to process a transaction, usually in the network's native token (ETH on Base).

### Confirmation

When a transaction has been included in a block. More confirmations mean it is harder to reverse.

### Deposit and withdrawal

Moving money into and out of your casino balance. Our [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) explains timing and checks.

### Transaction hash

A unique ID for a blockchain transaction that anyone can look up on a block explorer.`,
    },
    {
      id: "responsible",
      title: "Responsible play terms",
      body: `### Loss limit

A maximum amount you allow yourself to lose in a set period. Once reached, you stop.

### Time limit

A maximum session length. Fast games make time slip by, so a timer helps.

### Chasing losses

Raising bets to win back money already lost. It is one of the most common signs that play is getting out of control.

### Self-exclusion

A voluntary block on your account for a set period.

### Cool-off

A shorter break than self-exclusion, often a day to a few weeks.

### Problem gambling

Gambling that causes harm to money, relationships, work or health. If this sounds familiar, the [responsible gambling page](/responsible-gambling) lists steps and places to get help.

Knowing these words is the first step to using the tools behind them. Setting limits before you start is far easier than stopping in the middle of a losing streak.`,
    },
    {
      id: "slang",
      title: "Common casino slang",
      body: `Players also use informal words. Some come from land-based casinos, and some from the CS:GO skin era.

- **High roller or whale**: a player who bets large amounts.
- **Degen**: short for degenerate; online slang for a player who takes big risks. It is often used jokingly, but the behaviour behind it is worth taking seriously.
- **Bust**: losing your whole bankroll for a session.
- **Heater**: a run of wins. It does not change the odds of the next bet.
- **Tilt**: playing emotionally after a loss, usually with bigger bets.
- **Snipe**: joining a pot late with a large amount.
- **All in**: staking everything you have left.
- **GG**: good game, said in chat after a round.

A lot of this slang comes from the CS:GO skin scene, where jackpot and coinflip sites first became popular. Our [CS:GO gambling history guide](/guides/csgo-gambling-history) covers that era.

### How to use this glossary

Keep it open when you read a game's rules for the first time. If a term appears that is not here, look for a plain explanation before you bet. A trustworthy site explains its rules in clear words, and you should never have to guess how a payout works. Our [How it works](/how-it-works) page describes each PVPspinArena game step by step.`,
    },
  ],
  faqs: [
    {
      q: "What is the difference between odds and probability?",
      a: "Probability is the chance an outcome happens, such as 1/15. Odds express the same chance as a ratio of losing to winning outcomes, such as 14 to 1 against.",
    },
    {
      q: "What does a 2x payout mean?",
      a: "A 2x payout returns twice your stake in total, including your original stake. A $5 winning bet at 2x returns $10.",
    },
    {
      q: "Is RTP the same as house edge?",
      a: "They measure the same thing from opposite sides. RTP is the share returned to players on average, and house edge is the share kept. They always add up to 100%.",
    },
    {
      q: "What does provably fair mean in simple terms?",
      a: "It means the result was locked in before you bet, using a hidden seed whose fingerprint was published in advance, and you can check the result yourself afterwards.",
    },
    {
      q: "What is a rake in gambling?",
      a: "A rake is a fee taken from a pot in games where players play each other. It replaces the built-in house edge used in house-banked games.",
    },
  ],
  sources: [
    { label: "NIST: Secure Hash Standard (FIPS 180-4)", url: "https://csrc.nist.gov/publications/detail/fips/180/4/final" },
    { label: "Circle: USDC overview", url: "https://www.circle.com/usdc" },
  ],
  related: ["best-crypto-gambling-sites", "house-edge", "provably-fair-casino", "what-is-a-crypto-casino", "coin-flip-odds"],
  updated: "2026-09-25",
};

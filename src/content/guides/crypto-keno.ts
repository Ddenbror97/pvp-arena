import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-keno",
  cluster: "Games & odds",
  keyword: "crypto keno",
  secondary: ["bitcoin keno", "keno crypto casino", "provably fair keno", "usdc keno"],
  title: "Crypto Keno: How to Play Keno with Bitcoin or USDC",
  description:
    "Crypto keno guide: 80-ball video keno, draw-style games and 40-number originals, how to fund play with crypto, reading RTP, risk levels and costs to avoid.",
  h1: "Crypto keno: formats, funding and what to check before you play",
  answer:
    "Crypto keno is keno played at a casino that uses cryptocurrency such as BTC, ETH or USDC for deposits, bets and withdrawals. It comes as classic 80-number video keno, draw-style games and in-house originals, often on a 40-number board with 10 draws and adjustable risk levels. Keno's return varies more by paytable than almost any game, so the format and RTP matter more than the coin.",
  facts: [
    "Classic keno draws 20 numbers from 80; many crypto originals draw 10 from 40.",
    "Catching 5 of 5 picks is about 1 in 1,551 on an 80/20 board but about 1 in 2,611 on a 40/10 board, so paytables are not comparable across formats.",
    "Keno RTP ranges from the high 90s on some online originals to well under 80% on many traditional draw games.",
    "Autoplay makes keno one of the fastest games per hour, which multiplies the cost of any edge.",
    "Stablecoins keep a keno bankroll in dollar terms; volatile coins add price risk on top.",
  ],
  sections: [
    {
      id: "what",
      title: "What crypto keno is",
      body: `Keno is a lottery-style casino game. You pick numbers, the game draws numbers, and you are paid according to how many of your picks were drawn, using a paytable that depends on how many numbers you chose. There are no decisions after you pick and bet.

Crypto keno is the same game at a casino that runs on cryptocurrency. You fund an account or connect a wallet, play in coin or a stablecoin such as USDC, and withdraw back to your wallet. The payment rail does not change the game, but crypto casinos tend to offer faster formats, adjustable risk settings and provably fair versions that are rare elsewhere.

The detailed probability tables and paytable maths live in [keno odds](/guides/keno-odds), and choosing spot counts is covered in [keno strategy](/guides/keno-strategy). This page covers where and how to play with crypto, and how to judge a version before you deposit. Related lottery-style games are grouped in the [games and odds topic hub](/guides/topics/games-and-odds). Keno for money is for adults 18+ or the local legal age.`,
    },
    {
      id: "formats",
      title: "The main formats of crypto keno",
      body: `| Format | Board | Draw | Typical pace | Fairness check |
| --- | --- | --- | --- | --- |
| Video keno (RNG) | 80 numbers | 20 drawn | Seconds per game, autoplay | Studio certification and licence |
| Draw-style keno | 80 numbers | 20 drawn | Scheduled draws | Operator and regulator oversight |
| Crypto original | Often 40 numbers | Often 10 drawn | Instant, autoplay | Provably fair seed verification |

### Classic 80-number keno

Video keno follows the traditional layout: pick from 1 to 10 or more spots out of 80, and 20 balls are drawn. Paytables are set by the game supplier or the casino and can differ a lot between two games that look identical.

### Crypto originals on smaller boards

Many crypto casinos build their own keno on a 40-number board with 10 numbers drawn. You usually pick up to 10 numbers and choose a risk level, such as low, medium or high. Higher risk shifts the paytable toward big pays on many hits and nothing for few hits. The average return is often similar across risk levels, but the variance is very different.

A typical 8-spot original might look like this in spirit, even if exact pays differ by studio:

| Hits | Low risk (illustrative) | High risk (illustrative) |
| --- | --- | --- |
| 0–3 | small return or push on some lines | zero |
| 4 | about 1x–2x | zero or a token pay |
| 5–6 | modest multiples | large multiples |
| 7–8 | high but not extreme | jackpot-style multiples |

Low risk produces many small results and a smoother graph. High risk produces long zeros punctuated by a rare spike. If you cannot name the stake you can lose on 50 blank tickets in a row, you are too high on the risk slider.

### Why boards are not comparable

Catching 5 of 5 on an 80/20 board has probability C(20,5) ÷ C(80,5) = 15,504 ÷ 24,040,016, about 1 in 1,551. On a 40/10 board it is C(10,5) ÷ C(40,5) = 252 ÷ 658,008, about 1 in 2,611. A "5 of 5 pays 500x" line means something different on each. Always compare RTP, not individual pay lines.

### Same headline pay, different price

Suppose two games both advertise “5 of 5 pays 800x” and you stake $1.

| Board | Chance of 5/5 | Fair price of that line alone | If the line pays 800x |
| --- | --- | --- | --- |
| 80 drawn 20 | 1 in 1,551 | about $0.52 of EV | slightly rich on that one line |
| 40 drawn 10 | 1 in 2,611 | about $0.31 of EV | cheap for the casino on that line |

The 40-number game can still have a high overall RTP if it pays well on 3- and 4-hit tickets. The reverse is also true: a generous top prize on video keno can sit on a table that pays nothing until you catch most of your spots. Read the whole paytable, not the banner multiplier.`,
    },
    {
      id: "how-to",
      title: "How to play keno with crypto, step by step",
      body: `1. **Choose the coin.** USDC or another stablecoin keeps results in dollars. BTC or ETH adds price risk during the session.
2. **Match the network.** Deposit on exactly the network the casino lists. A token sent on the wrong chain can be lost; [sent crypto to wrong network](/guides/sent-crypto-to-wrong-network) explains why.
3. **Fund from your own wallet.** Buy on an exchange, withdraw to a wallet you control, then deposit. [Crypto wallet for gambling](/guides/crypto-wallet-for-gambling) compares options.
4. **Open the game info.** Find the RTP, the paytable for your number of picks and, for originals, the risk levels.
5. **Set the stake and autoplay limits.** Pick a stake, a number of rounds and a stop-loss before starting. Autoplay without limits is the fastest way to lose track.
6. **Withdraw a test amount early.** Learn the processing time and fees before you have a large balance on the site.

### Reading a keno paytable quickly

- Check the RTP printed for that exact pick count. Some games vary RTP by pick count.
- Look at how many hits return your stake or more. On many tables, catching fewer than a third of your picks pays nothing.
- Look at the top pay and any cap on total winnings per round. A cap can quietly lower the real RTP of high-pick bets.

### A 200-ticket session in dollars

You play 200 tickets at $2 each ($400 wagered) on a 94% RTP video keno game. Expected return is $376, expected cost $24. Switch to a 99% original at the same stake and the expected cost drops to $4. Switch instead to a 75% draw-style game at 12 tickets an hour and you need more than eight hours to wager the same $400, at an expected cost of $100. The coin (BTC, ETH or USDC) does not change those percentages. It only changes whether your remaining balance also moves with the market.`,
    },
    {
      id: "rtp",
      title: "Keno RTP across formats",
      body: `Keno has the widest spread of returns of any common casino game, which is why the format matters more than the coin.

| Format | Commonly quoted return range |
| --- | --- |
| Traditional draw keno, land-based or lottery-run | often well under 80% |
| Video keno from game studios | commonly around 90% to 95%, varies by paytable |
| Crypto originals with provably fair draws | often advertised in the high 90s |

Treat those as ranges, not guarantees. The only number that applies to a specific game is the one in its own info panel or paytable, and for provably fair games you can check that the paytable was applied correctly to each round.

### What a lower RTP costs

Take $1 per game and 300 games an hour, which is easy with autoplay.

- At 99% RTP: 300 × $1 × 1% = $3 expected cost per hour.
- At 94% RTP: 300 × $1 × 6% = $18 per hour.
- At 75% RTP, a traditional-style return, but only 12 draws an hour: 12 × $1 × 25% = $3 per hour.

Slow games with high edges and fast games with low edges can cost the same per hour. The combination of edge and speed is what empties a bankroll. The principle is covered in [house edge](/guides/house-edge) and [RTP explained](/guides/rtp-explained).`,
    },
    {
      id: "fairness",
      title: "Provably fair keno and how to check a draw",
      body: `In a provably fair keno game, the casino commits to a server seed by publishing its hash before you play. Your client seed and a nonce are combined with it to generate the drawn numbers. After you rotate the seed, the casino reveals the server seed and you can recompute every draw.

### What to verify

1. The revealed server seed hashes to the commitment you saw before playing.
2. Recomputing the draw with your client seed and nonce gives the same numbers you were shown.
3. The payout matches the posted paytable for your picks, hits and risk level.

The general method is explained in [provably fair casino](/guides/provably-fair-casino), and [commit reveal scheme](/guides/commit-reveal-scheme) covers why a hash commitment stops a server from changing results after the bet.

### What verification does not tell you

Verification proves the draw was not altered. It does not make a poor paytable good. A provably fair game with a low RTP is honestly low. Check both the fairness and the price.`,
    },
    {
      id: "choosing",
      title: "Choosing where to play crypto keno",
      body: `### Checklist

- **Licence:** check the licence number on the regulator's site; [crypto casino license](/guides/crypto-casino-license) explains what different licences mean.
- **Published RTP:** the game info should state it. If it does not, assume the worst.
- **Fairness method:** provably fair seeds for originals, studio certification for RNG games.
- **Withdrawal terms:** minimums, fees, processing time and any identity checks at higher amounts; see [crypto casino withdrawals](/guides/crypto-casino-withdrawals).
- **Win caps:** some games limit the maximum payout per round, which matters for 10-pick tickets.
- **Bonus terms:** keno is sometimes weighted differently for wagering; read which games count.

### Costs outside the game

Network fees, exchange fees and currency conversion all come on top of the edge. On a low-fee layer-2 network such as Base they are usually small, but small bankrolls feel them. Batch deposits and withdrawals instead of moving small amounts often. [Crypto casino deposit fees](/guides/crypto-casino-deposit-fees) breaks the layers down.

### Scams to avoid

Keno "predictor" tools and number-pattern systems do not work on a random draw; every combination of picks has the same chance on a fair board. Clone casino sites also target crypto players; [fake casino sites](/guides/fake-casino-sites) shows how to spot them.`,
    },
    {
      id: "pvp",
      title: "Lottery odds and a shared pot at PVPspinArena",
      body: `Keno is a lottery with a paytable. PVPspinArena takes a different route to a lottery-style game. In the [Jackpot](/), players add wagers to one pot and each player's chance of winning equals their share of the pot, with the winner taking the pot minus any fee shown before entry. There is no paytable to decode: a 10% share is a 10% chance. [Coinflip](/coinflip) is a 50/50 between two players, and [Roulette](/roulette) returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee.

Play is in USDC or ETH on the Base network, and every settled round can be verified on the [fairness](/fairness) page from its committed seeds. For more lottery-style games in crypto, see [crypto lottery](/guides/crypto-lottery). PVPspinArena is for adults 18+, and limits and time-out tools are on the [responsible gambling](/responsible-gambling) page.

In the same cluster, see also [crypto baccarat](/guides/crypto-baccarat).`,
    },
  ],
  faqs: [
    {
      q: "What is crypto keno?",
      a: "Keno played at a casino that uses cryptocurrency for deposits, bets and withdrawals. It includes classic 80-number video keno and crypto originals, often on a 40-number board with 10 draws.",
    },
    {
      q: "Is crypto keno rigged?",
      a: "It depends on the site. Provably fair keno lets you recompute every draw from the revealed seed. RNG keno relies on studio certification and licensing. Neither guarantees a good paytable, so check the RTP too.",
    },
    {
      q: "What is the RTP of crypto keno?",
      a: "It varies by game. Some crypto originals advertise returns in the high 90s, many video keno games sit around 90% to 95%, and traditional draw keno is often well below that. Use the figure in the game's own info panel.",
    },
    {
      q: "What coin is best for keno?",
      a: "A stablecoin such as USDC keeps your bankroll in dollar terms. Volatile coins like BTC or ETH add price swings on top of game results. Pick a network with low transfer fees that the casino supports.",
    },
    {
      q: "Do keno risk levels change the odds?",
      a: "They change the paytable, not the chance of each number being drawn. Higher risk pays more for many hits and nothing for few hits, so variance rises. The average return is often similar.",
    },
  ],
  sources: [
    { label: "Wikipedia: Keno", url: "https://en.wikipedia.org/wiki/Keno" },
    { label: "Wizard of Odds: Keno", url: "https://wizardofodds.com/games/keno/" },
    { label: "Circle: USDC", url: "https://www.circle.com/usdc" },
  ],
  related: [
    "keno-odds",
    "keno-strategy",
    "crypto-baccarat",
    "crypto-lottery",
    "crypto-bingo",
    "provably-fair-games",
  ],
  updated: "2026-09-27",
};

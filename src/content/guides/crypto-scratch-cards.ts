import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-scratch-cards",
  cluster: "Games & odds",
  keyword: "crypto scratch cards",
  secondary: [
    "crypto scratch card",
    "bitcoin scratch off",
    "instant win crypto",
    "scratch card rtp",
  ],
  title: "Crypto Scratch Cards: Odds, RTP and Fairness",
  description:
    "How crypto scratch cards work: instant-win odds, RTP, RNG versus hashed results, and why the reveal is usually just a skin on a house game.",
  h1: "Crypto scratch cards: instant-win odds, RTP and fairness claims",
  answer:
    "Crypto scratch cards are instant-win tickets: you pay, a result is already chosen or drawn at click, and a scratch animation reveals it. RTP is 100% minus the house edge baked into the prize table. The foil is a skin. Unless the result was hashed before you bought the card, 'fair scratch' is a slogan on a house game. Bitcoin scratch off does not change the table.",
  facts: [
    "A scratch card is an instant-win ticket with a published (or hidden) prize table and a price per card.",
    "RTP equals the long-run share of card prices returned as prizes; house edge is 100% minus RTP.",
    "Physical lottery scratchers often return well under 80% of sales as prizes; online cards vary and must be read per title.",
    "The scratch animation does not generate the result; the RNG or a pre-printed prize does.",
    "PVPspinArena does not sell scratch cards. It runs Jackpot, Coinflip and Roulette in USDC and ETH on Base.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a crypto scratch card is",
      body: `A crypto scratch card is the lottery kiosk ticket moved to a wallet. You pay 0.001 BTC or $2 in USDT, you scratch digital foil, you see symbols, you are paid a multiple or nothing. Instant win crypto pages sell the same adrenaline as a newsagent row: small price, fast reveal, hope of a top prize.

The product belongs with other priced tickets in the [games and odds](/guides/topics/games-and-odds) topic, beside [crypto bingo](/guides/crypto-bingo). It is a house game. The operator sold you a distribution of prizes.

Two implementations exist:

- **Pre-weighted ticket.** The server assigns a prize from a finite pool (one $500, twenty $10, thousands of $0) when you buy, or when the pack is created.
- **Independent RNG.** Each card is a fresh roll against a probability table. The "pack" never runs out of top prizes because there was no pack.

Both can be honest. Both are minus-EV if the table says so. The animation is not a third kind.

PVPspinArena is not a scratch-card vendor. No foil, no instant ticket. Jackpot and Coinflip are other players' cash. Roulette is a wheel you can count.

If a lobby mixes scratch, bingo and a virtual horse in one "instant" row, price each title separately. A shared cashier does not mean a shared RTP. The pretty row is a storefront.`,
    },
    {
      id: "odds-rtp",
      title: "Instant-win odds and scratch card RTP",
      body: `You only need the prize table and the card price. Everything else is theatre.

Expected return per card = sum over prizes of (probability × prize amount).

RTP = expected return ÷ card price. House edge = 1 − RTP. Same identities as [RTP explained](/guides/rtp-explained) and [house edge](/guides/house-edge).

If the site will not show probabilities, you cannot compute RTP. "Up to 10,000×" is a top prize, not a return. A 10,000× that hits one in 500,000 cards on a $2 ticket is a $0.04 contribution to expected return.

### Physical versus online

State lottery scratchers often publish overall odds and a prize structure in a PDF. Many return 60–75% of sales as prizes; the rest funds the lottery and the state. Online casino "scratch" titles sometimes advertise 90–96% RTP like a slot, because they are slots with a foil skin. Sometimes they are worse and silent.

Do not import a state-lottery PDF onto a bitcoin scratch off. Different operator, different table.

A useful habit: write the expected prize per card before you scratch the first one. If you cannot write it, you are buying a mood. Casino lobbies hide the table behind an information icon; lottery sites hide it behind a PDF. Both are still tables. Instant win crypto ads that only show a gold coin and "up to" a multiplier are hiding the only number that matters.

Paper tickets from a state lottery print a different price list. [Scratch off odds](/guides/scratch-off-odds) is the overall figure on the back of the card.`,
    },
    {
      id: "pack-myths",
      title: "Pack depletion, slot skins and the next-card loop",
      body: `Physical packs run out of top prizes. That is why a late ticket in a paper box can be a worse buy if the big one is gone — and why some paper games publish remaining prizes. Online independent RNG cards do not deplete. The top prize is not "due." Each $2 is a fresh roll against the same table.

Sites blur this on purpose. They show a "limited edition pack" progress bar that is either cosmetic or a finite prize pool they can refill at will. If they can refill, you do not have a shrinking box. You have a slot with a progress skin.

### Scratch that is a slot

Many studio titles labelled scratch are slot math: reel weights, feature buys, a 94% RTP sheet, and a foil animation. Price them as slots. Our [RTP](/guides/rtp-explained) vocabulary still applies. The finger motion does not make it a lottery.

### The next-card loop

Instant products exist to sell the next one while the last reveal is still on screen. "One more, the gold was close" is the entire retention design. Decide a card count in fiat before the first click: ten $2 cards is a $20 session, not ten chances to feel unlucky. When the count is done, close the tab. If you cannot, the RTP discussion is no longer the useful one — use [responsible gambling](/responsible-gambling).

Buying two cards at once does not change RTP. It only changes how fast the table samples you.

You must be 18 or older. A cartoon ticket in a crypto cashier is still a bet.`,
    },
    {
      id: "worked-example",
      title: "Worked example: a $2 card with a pretty top prize",
      body: `A site sells a $2 crypto scratch card. Published table:

| Prize | Count in 100,000 cards | Probability | Contribution to EV |
| --- | --- | --- | --- |
| $2,000 | 2 | 0.002% | $0.040 |
| $20 | 800 | 0.80% | $0.160 |
| $4 | 8,000 | 8.00% | $0.320 |
| $2 (break-even) | 12,000 | 12.00% | $0.240 |
| $0 | 79,198 | 79.198% | $0.000 |

Expected prize = $0.76. RTP = 0.76 / 2.00 = 38%. Edge = 62%.

That table is harsher than most advertised casino scratches and in the neighbourhood of a mean lottery pack. I picked ugly numbers so the top prize does not hypnotise you. If the site shows only "$2,000 top prize" and hides the counts, assume you are buying a mystery pack.

Change the 2,000-count to 40 ($2,000 prizes) and RTP jumps by $0.80 per card — 40 × 2000 / 100000 = $0.80 — and the product becomes a different game. **The counts are the game.** The foil is not.

"Near misses" (two matching symbols and a teaser) are artwork. They do not change the table.`,
    },
    {
      id: "fairness",
      title: "RNG versus hashed results",
      body: `A fair instant ticket can still be minus-EV. Fair means the prize you got is the prize the published method assigned. It does not mean the ticket is a good buy.

### What hashed scratch would look like

The server commits to a seed (or to a pack permutation) **before** you pay. You provide or see a client seed. After the reveal you can replay the mapping from seeds to prize, as in [RNG vs provably fair](/guides/rng-vs-provably-fair). If the animation showed $20, the maths shows $20.

### What you usually get

A play button, a canvas scratch, and a lab seal from last year. You cannot prove this card used that generator. You cannot prove the top prize still exists in a "limited pack."

If they hash *after* you scratch, they hashed a result they already knew you saw. That is a receipt, not a commitment.

A honest finite pack would commit to the entire permutation of prizes before the first sale, then peel tickets in a checkable order. Almost nobody does that, because it is extra engineering and it lets you compute remaining RTP as the pack empties. Operators prefer a quiet independent roll.

Do not buy a card from an unlicensed Telegram bot that "reveals" in a chat. That is a DM with a GIF. The reveal is not a verifier.`,
    },
    {
      id: "just-a-skin",
      title: "Why the reveal is usually a skin on a house game",
      body: `Slots, mines, plinko and scratch cards are the same family: pay, RNG, prize table, optional animation. Scratch is the animation that feels like agency because your finger moves. Agency over foil is not agency over the roll.

On PVPspinArena you can count Roulette slots on the [Roulette](/roulette) page and check a hash on [fairness](/fairness). There is no digital ticket to rub. Jackpot is a share. That is a different contract from "maybe the gold symbol is under the silver."

Instant win crypto marketing likes words like "provably instant." Instant is easy. Provable is a commit you can replay. Demand the second word.

A house game can be honest and still be a poor buy. An 38% RTP pack is honest if those counts are real and you still should not sit in it for an hour. A 96% scratch-slot is a better price and still costs you on volume. Price first, then decide whether the foil is worth that price as entertainment. Do not invert the order because the gold symbol almost lined up.

You must be 18 or older. A cartoon ticket does not make this a toy.`,
    },
    {
      id: "safer",
      title: "How to buy an instant ticket without lying to yourself",
      body: `1. **Find the prize table and the counts**, not only the top prize.
2. **Compute RTP** or walk away. If they hide the table, you are the table.
3. **Decide a card count before the first scratch.** Instant products exist to sell the next one.
4. **Do not 'make back' a $2 loser with ten more $2 cards.** That is a $20 decision.
5. **Prefer a commit-reveal** if you play at all.
6. **Cap the night in fiat.** See [gambling budget](/guides/gambling-budget).

If you cannot stop scratching, that is the problem, not the RTP. Use [responsible gambling](/responsible-gambling).

Keep a one-line log if you play more than once: date, title, cards bought, amount in, amount out. Ten minutes of arithmetic will tell you more than a week of memory. Memory drops the losers and keeps the $20 teaser. The log does not.

This is not legal advice. Some places treat instant-win as lottery, others as casino. A crypto cashier does not choose for you.`,
    },
    {
      id: "summary",
      title: "Rub the foil. Price the table",
      body: `Crypto scratch cards are instant-win house tickets. RTP lives in the prize counts. The animation is a skin. Hashed results are optional and rare; a lab logo is not a per-card proof.

PVPspinArena does not sell scratch cards, bingo strips or horse tickets. It is cash PvP plus a colour wheel, USDC and ETH on Base. If you want foil, go to a licensed instant-win product you are allowed to use and read the PDF. If you want a pot you can measure, do not buy a card.

The foil is allowed to be fun. It is not allowed to be a mystery table. If the counts are missing, the fun is you paying to not know.`,
    },
  ],
  faqs: [
    {
      q: "How do crypto scratch cards work?",
      a: "You pay for a ticket, a prize is assigned from a table or an RNG, and an animation reveals it. The foil does not create the outcome.",
    },
    {
      q: "What is a typical scratch card RTP?",
      a: "It depends on the title. Lottery-style packs can sit well below 80%. Casino-style scratches sometimes advertise slot-like RTP. Read that game's table.",
    },
    {
      q: "Is a bitcoin scratch off fairer than a paper ticket?",
      a: "Only if you can replay a commitment to the prize. The asset used to pay does not change the prize table.",
    },
    {
      q: "Does PVPspinArena sell scratch cards?",
      a: "No. It offers Jackpot, Coinflip and Roulette. There is no instant-win foil product.",
    },
    {
      q: "Does scratching slowly change the odds?",
      a: "No. Speed of reveal is cosmetic. The result is already determined or drawn at purchase.",
    },
    {
      q: "What should I ask for if a site says the scratch is provably fair?",
      a: "A pre-purchase hash of the server seed or pack, a client seed, and a published mapping you can rerun to the same prize.",
    },
  ],
  sources: [
    { label: "Wizard of Odds — house edge", url: "https://wizardofodds.com/gambling/house-edge/" },
    {
      label: "Wikipedia — Return to player",
      url: "https://en.wikipedia.org/wiki/Return_to_player",
    },
    { label: "Wikipedia — Scratchcard", url: "https://en.wikipedia.org/wiki/Scratchcard" },
    {
      label: "UK Gambling Commission — instant win / society lotteries info",
      url: "https://www.gamblingcommission.gov.uk/",
    },
  ],
  related: [
    "crypto-jackpot",
    "crypto-horse-racing-betting",
    "sports-betting-with-crypto",
    "plinko-gambling",
    "plinko-odds",
  ],
  updated: "2026-09-26",
};

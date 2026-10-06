import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-bingo",
  cluster: "Games & odds",
  keyword: "crypto bingo",
  secondary: ["bitcoin bingo", "crypto bingo sites", "bingo rtp", "75 ball bingo odds"],
  title: "Crypto Bingo Guide: Odds, Patterns and House Edge",
  description:
    "How crypto bingo works: card odds, pattern payouts, RNG draws, house edge, and why a bingo card is not a verifiable PvP pot.",
  h1: "Crypto bingo: card odds, patterns and the house edge",
  answer:
    "Crypto bingo is the old hall game with a crypto cashier: you buy one or more cards, an RNG draws numbers, and you are paid if your card completes a published pattern. The house edge sits in the price of the card versus the prize table, not in a shared pot you can audit by share. A bingo card is not a verifiable PvP stake. Bitcoin bingo does not change the combinatorics.",
  facts: [
    "US 75-ball bingo uses a 5×5 card with a free centre; 24 numbers are drawn from 1–75.",
    "UK-style 90-ball bingo uses a 9×3 ticket with 15 numbers drawn from 1–90, often paying 1-line, 2-line and full house.",
    "Bingo RTP is set by card price and the prize table, not by 'feeling lucky' on a pattern.",
    "Online crypto bingo almost always uses a software RNG for the draw, not a mechanical blower.",
    "PVPspinArena is not a bingo hall. It runs Jackpot, Coinflip and Roulette in USDC and ETH on Base.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What crypto bingo is selling",
      body: `Crypto bingo is bingo with a wallet. You buy cards in BTC, ETH or a stablecoin, sit in a timed room, and watch numbers appear. The room may look like a church hall or a neon lobby. The draw is almost always a random number generator. The prize is almost always paid by the house from a table, or from a pool the house still skins with a fee.

That is enough to place it. It is a house game with a social skin. It belongs with other priced products in the [games and odds](/guides/topics/games-and-odds) topic, next to [crypto scratch cards](/guides/crypto-scratch-cards).

Two traditions show up on crypto bingo sites:

- **75-ball**: 5×5 card, free centre, patterns (line, X, blackout, "crazy" shapes). Common in US-style rooms.
- **90-ball**: 15 numbers on a 9×3 ticket, three winning stages (one line, two lines, full house). Common in UK-style rooms.

30-ball "speed bingo" also appears. Smaller card, faster game, same structure: you paid for a ticket, the prize is a multiple or a pool slice.

PVPspinArena does not sell cards. Jackpot is a pot of player cash. Coinflip is two stakes. Roulette is a 33-slot wheel. None of those is a bingo pattern.`,
    },
    {
      id: "card-odds",
      title: "Card odds: 75-ball and 90-ball",
      body: `The card is a sample of the number range. The draw is a permutation of that range, stopped when someone wins or when the pattern logic says the game ends.

### 75-ball

You have 24 live numbers plus a free centre. The caller draws without replacement from 75. A horizontal line on a typical card is five squares, one of which may be the free space, so you need four or five hits depending on the row. A full blackout needs all 24. Exact probabilities depend on the pattern and on whether the room is **competitive** (first card to finish wins a pool) or **fixed-payout** (every card that completes in N calls is paid a multiple).

"75 ball bingo odds" search results that quote a single percentage without naming the pattern and the prize rule are not usable. A line in 20 calls is a different bet from blackout in 50.

### 90-ball

Each ticket has 15 numbers. A one-line win needs five numbers in one row. Full house needs all 15. In a large commercial room the prize for early lines is smaller than the full house because they land more often. The house still takes a share of ticket sales before the rest is put in the prizes.

### Multiple cards

Buying four cards raises your chance of being on a winning pattern. It also raises your spend by 4×. It does not raise RTP. It is the same ticket, more times. Rooms that sell 50-card strips are selling volume, not a better price.

A rough 75-ball illustration, not a universal constant: a single horizontal line that needs five specific numbers from 75, with one free space so four hits finish the row, is still a combinatorics problem that depends on when the room ends. If the room is "first line wins a $40 pool" and 80 cards are in play, your four-card strip is 4/80 of the tickets, not a 4× RTP. You paid 4× for 4× of the ticket mass. The pool, after rake, is what it is.

The combination count behind a card, without the crypto cashier, is [bingo odds](/guides/bingo-odds).`,
    },
    {
      id: "social-skin",
      title: "The social skin: chat, daubers and 'community pots'",
      body: `Bingo's brand is friendly. Chat rooms, daubers, themed patterns, a caller voice. Crypto rooms copy that so the ticket feels like a night out. The voice does not change the table.

### Competitive rooms

Everyone buys cards. First completed pattern takes a pool. That looks like Jackpot until you list the differences: you cannot independently add the other cards' numbers, the operator can sell more strips after you, and the rake may be taken before the prize is shown. A "community winner" banner is marketing. Ask whether the prize equals card sales minus a published percent.

### Link rooms and shared draws

Some sites sell many card packs against one RNG stream. That is efficient for them. It also means your $1 card is in a stadium, not a kitchen table. More cards in play make "first to blackout" harder for you and easier for the room to crown someone quickly, which sells the next round.

### Bonuses that are extra tickets

"Free cards" after a deposit are usually extra volume at the same RTP, sometimes with a wagering wrap. They are not a rebate of the edge. If you would not buy those cards with cash, do not let the word free decide.

Treat chat wins as someone else's tickets. A stranger's full house is not information about your next strip. If the room's culture is to nag you into one more pack, that is the product working.

You must be 18 or older. A colourful dauber is not a kids' app.`,
    },
    {
      id: "worked-edge",
      title: "Worked example: card price versus prize table",
      body: `A 75-ball "blackout" mini-room sells cards at $1. The published table pays $12 if your card blackouts in 48 or fewer calls, $4 if it blackouts in 49–54, and $0 after that. Ignore other players for a moment — this is a fixed-payout ticket, which is how a lot of instant crypto bingo is built.

You would need the true probabilities p48 and p54 from the RNG mapping to compute expected return:

Expected return per $1 = (p48 × 12) + (p54 × 4) + ((1 − p48 − p54) × 0).

House edge = 1 − expected return. That is the same identity as [RTP explained](/guides/rtp-explained): RTP is 100% minus the edge.

If the operator set p48 = 0.04 and p54 = 0.10, expected return is 0.48 + 0.40 = 0.88. RTP 88%, edge 12%. Those p values are illustrative. The real ones live in the game math sheet, if they published one.

| Ticket | You pay | You win if | What you need to compute edge |
| --- | --- | --- | --- |
| Fixed blackout | $1 | Listed multiples | Probabilities for each band |
| Pool 90-ball | $2 | Share of a pot after rake | Rake % and how ties split |
| Pattern race | $0.50 | First completed pattern | Cards in play and pattern |

A pool game looks more like Jackpot until you read the rake and the extra tickets the house can issue. If the operator can add "free" cards or change the prize mid-room, it is not a closed pot.

[House edge](/guides/house-edge) is the right vocabulary even when the lobby says "community winner."`,
    },
    {
      id: "rng",
      title: "How the draw is generated — and what you can check",
      body: `A physical hall uses a blower and visible balls. Online crypto bingo uses software. The fair version of that is a published RNG mapping you can verify per round, as in [RNG vs provably fair](/guides/rng-vs-provably-fair). The common version is a lab certificate on a generator you never see, plus a colourful ball tray.

### What "provably fair bingo" would require

A commitment to the shuffle of 1–75 (or 1–90) **before** cards are sold, or a commit-reveal that you can replay after the room closes. Then a published rule that turns that shuffle into calls. Without both, "fair bingo" is a slogan.

### What you usually get

A replay of the last numbers, a "certified RNG" badge, and no way to prove this room used that generator. That is enough for some players. It is not a transcript.

Daubing is cosmetic. Auto-daub does not change whether a number was drawn. Anyone selling a "daub strategy" for RNG bingo is selling superstition.

You must be 18 or older. Bingo's friendly tone does not lower the age line.`,
    },
    {
      id: "not-a-pot",
      title: "Why a bingo card is not a verifiable PvP pot",
      body: `On PVPspinArena, Jackpot is simple: players add USD, the draw picks a winner with probability equal to share, and you can check the result on the [fairness](/fairness) page. Coinflip is two equal stakes. The house fee defaults to 0% on those PvP games. Roulette is house-banked with a countable edge on the 33-slot wheel.

A bingo card fails that simplicity:

- You do not know the other tickets' numbers in a way you can independently total.
- The prize may be a table, not the sum of card sales.
- The operator can be the bank.
- The draw is usually an opaque RNG.

Bitcoin bingo does not fix this. The rail is public; the card inventory and the shuffle usually are not.

If you want a room of people and a shared stake, play a pot that publishes shares. If you want a pattern game, price the table and assume the edge is the entertainment cost.`,
    },
    {
      id: "safer",
      title: "How to sit in a bingo room without kidding yourself",
      body: `1. **Name the rule.** Fixed payout or pool, 75 or 90, which patterns pay.
2. **Find RTP or reconstruct it** from card price and prizes. If neither exists, you are buying a mystery ticket.
3. **Cap the number of cards and rooms** before you buy the first. Speed rooms exist to stack volume.
4. **Do not chase a full house** after missing the early lines. That is a new ticket, not a continuation discount.
5. **Ignore chat luck.** Other players' wins are their tickets.
6. **Leave if the cashier is a Telegram bot.** Unlicensed bots are a drain risk, not a hall.

Set a budget in fiat, the way you would for any other game. If bingo is the thing you cannot close, use [responsible gambling](/responsible-gambling) and stop.

This is not legal advice. Some countries treat online bingo as licensed gambling. A crypto cashier does not put you outside that.`,
    },
    {
      id: "summary",
      title: "Patterns are pretty. The ticket still has a price",
      body: `Crypto bingo is a priced ticket: 75-ball patterns or 90-ball lines, an RNG draw, and a prize table or a raked pool. Multiple cards raise spend, not RTP. A card is not a hashed PvP share.

PVPspinArena is not a bingo hall and not a scratch-card vendor. It is cash PvP plus Roulette, USDC and ETH on Base. If you came for a dauber, go to a licensed hall you are allowed to use. If you came for a pot you can measure, buy a share, not a pattern.`,
    },
  ],
  faqs: [
    {
      q: "How does crypto bingo work?",
      a: "You buy cards with crypto, an RNG draws numbers, and you are paid if your card completes the room's pattern or stage. The edge is in the ticket price versus the prizes.",
    },
    {
      q: "What is the difference between 75-ball and 90-ball?",
      a: "75-ball uses a 5×5 card and published patterns. 90-ball uses a 15-number ticket and usually pays one line, two lines, then full house.",
    },
    {
      q: "Does buying more cards improve bingo RTP?",
      a: "No. More cards raise your chance of a hit and raise your spend by the same factor. RTP is a property of the prize table, not of strip size.",
    },
    {
      q: "Is bitcoin bingo fairer than regular online bingo?",
      a: "Only the cashier is different. Unless the shuffle is committed and checkable, the draw is still an operator RNG.",
    },
    {
      q: "Does PVPspinArena offer bingo?",
      a: "No. It offers Jackpot, Coinflip and Roulette. A bingo card is not a PvP pot on this site.",
    },
    {
      q: "Where is the house edge in a pool bingo game?",
      a: "In the rake and in any tickets or prizes the operator controls. A pool that is not the sum of player card sales is not a closed pot.",
    },
  ],
  sources: [
    {
      label: "Wikipedia — Bingo (British version)",
      url: "https://en.wikipedia.org/wiki/Bingo_(British_version)",
    },
    {
      label: "Wikipedia — Bingo (American version)",
      url: "https://en.wikipedia.org/wiki/Bingo_(American_version)",
    },
    { label: "Wizard of Odds — house edge", url: "https://wizardofodds.com/gambling/house-edge/" },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "crypto-jackpot",
    "crypto-scratch-cards",
    "crypto-horse-racing-betting",
    "sports-betting-with-crypto",
    "plinko-gambling",
  ],
  updated: "2026-09-26",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-poker",
  cluster: "Games & odds",
  keyword: "crypto poker",
  secondary: ["bitcoin poker", "crypto poker sites", "provably fair poker", "poker rake"],
  title: "Crypto Poker Guide: Rake, Fairness and Real Table Data",
  description:
    "How crypto poker works: RNG decks, rake and what you can verify, plus real data from the first hands at PVPspinArena's six-max Hold'em tables.",
  h1: "Crypto poker: rake, fairness and what our first tables showed",
  answer:
    "Crypto poker is online poker funded with Bitcoin, ETH or a stablecoin instead of a card. Most rooms deal cards from a site-run random number generator and take rake from each pot. PVPspinArena runs six-max No-Limit Hold'em where every player dealt in adds a secret to the shuffle, the fee is 5% of a pot only after a flop, and each finished hand can be rebuilt from its revealed seed.",
  facts: [
    "Most crypto poker sites deal software cards with an RNG, not a physical deck you can see.",
    "Rake is the room's cut of the pot or a timed fee; it is how the room is paid.",
    "A lab certificate says an RNG was tested, not that tonight's hand was honest.",
    "PVPspinArena poker: six-max NL Hold'em, $0.02/$0.05 to $5/$10, 5% of a pot only if a flop was dealt.",
    "First night of real-money hands: 6 dealt, 3 completed, 3 voided before any card, $0.02 total fees.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What crypto poker is — and what it is not",
      body: `Crypto poker is the familiar game of hole cards, streets and showdown, with deposits in digital assets. Bitcoin poker was the early brand. Today many rooms also take USDT or USDC. The rules at the table are still poker. The payment rail is crypto. The fairness story depends on how the cards are chosen.

This is a [games and odds](/guides/topics/games-and-odds) guide for adults aged 18 or over. It explains how rooms usually run, then shows how [PVPspinArena poker](/poker) works and what its first real-money hands looked like. The site funds one US-dollar balance with Bitcoin, or with USDC or ETH on Base, and that balance is used at the poker tables as well as in Jackpot, Coinflip, Roulette and P2P Slott.

Marketing pages collapse "crypto," "provably fair" and "poker" into one phrase. Those are three separate claims: how you pay, what you can check, and which game you play. Judge each one on its own.`,
    },
    {
      id: "rng-live",
      title: "RNG tables versus live studio tables",
      body: `Online poker rooms almost never shuffle a physical deck for each cash-game hand. They use software.

### RNG tables

An RNG table asks a random number generator for card order. The generator may be a well-known library, a hardware source or a custom service. You do not see the shuffle. You see the cards the server says you have. Skill still matters after the deal — position, ranges, bet sizing — but the deal itself is a trust problem unless the room publishes something you can recompute.

A testing lab can certify that a generator passed statistical tests at a point in time. That is useful and incomplete. It does not prove the operator used that generator on your hand, or that the client did not leak hole cards to a colluding player.

### Live tables

Live crypto poker, where it exists, is closer to live-dealer casino poker: a studio, a shuffler and cameras. You can watch cards come off a deck, but you cannot audit the studio's security from a browser. Collusion and delayed streams remain risks.

### Why the split matters

RNG scale is why crypto poker can run thousands of tables. Live scale is why it feels like "real cards." Neither automatically equals a [provably fair casino](/guides/provably-fair-casino) commitment published before you act.`,
    },
    {
      id: "rake",
      title: "Poker rake: the real house take",
      body: `Poker rooms do not need a house edge on the cards if they take rake. Rake is a percentage of the pot, usually capped, or a fee per time unit at the table. Over a long session, rake is why a break-even player still shrinks.

Typical cash-game rake in online rooms sits around a few percent of each pot, up to a dollar cap that depends on stakes. Exact numbers belong on the room's posted fee page, not on a blog that guesses. Tournament fees are a percentage of the buy-in.

Rake is not cheating. Hidden extra rake is. Read the fee table. If a bonus requires a huge number of hands, the rake during that grind is part of the price of the bonus.

PVPspinArena's poker fee is written in one line: 5% of each pot, charged only if the flop was dealt. A hand that ends preflop pays nothing. Uncalled chips — the part of a bet nobody matched — go back to the bettor before the fee and are never charged. There is no cap, which matters at higher stakes: a $400 pot pays $20. The [house edge](/guides/house-edge) guide covers the against-the-house version of the same idea. Rake is closer to a tax on pots than to a roulette edge, but both are costs you should be able to state per hundred hands.`,
    },
    {
      id: "fairness",
      title: "What you can actually verify",
      body: `Poker fairness has several layers that people blur together.

1. **Rules and payouts.** You can read whether a flush beats a straight and how side pots split. That is documentation, not cryptography.
2. **RNG lab letters.** You can read a PDF that says a generator was tested. You cannot recompute last night's river from that PDF.
3. **Commit-and-reveal decks.** Some rooms publish a hash of the deck before the deal and reveal it after. The protocol has to cover burn cards, disconnects and multi-street action. Many "provably fair poker" pages stop at a slogan.
4. **Collusion and bots.** Cryptography on the shuffle does not stop two accounts sharing hole cards or a script playing many tables.

Here is what layer 3 looks like at PVPspinArena. When you sit down, your browser commits to the head of a secret hash chain. When a hand opens, the server publishes the hash of its own seed, then every dealt player's browser reveals the next link of their chain within 5 seconds. The deck is shuffled from the server seed mixed with all of those reveals, so the server could not have chosen it alone. After the hand the seed is published, and the table's Hands tab rebuilds the whole deck in your browser. The full recipe is on the [Fairness](/fairness) page.

The limits are stated too. A player can refuse to reveal, which voids the hand before any card or blind is dealt: a re-deal, never a payout. The server deals the cards, so it cannot prove nobody looked at them. Collusion is a separate problem, covered in [collusion in poker](/guides/collusion-in-poker). The [RNG versus provably fair](/guides/rng-vs-provably-fair) guide explains why a recomputable deck is a stronger check than a lab letter.`,
    },
    {
      id: "bonuses",
      title: "Bonuses, rakeback and why they change the maths",
      body: `Crypto poker rooms advertise deposit matches, ticket drops and rakeback. None of those are free money. A match usually requires playthrough. Rakeback returns part of the rake you already paid. If you play badly to "clear" a bonus, the extra losses can exceed the headline.

Work the bonus as an expected-value problem. How many big blinds will you put in the middle? What is the posted rake? What is your honest win rate before rake? If you cannot estimate those, skip the offer.

Rakeback also changes table selection. A 30% deal on a high-rake micro stake can still be a worse dollar-per-hour than a 5% deal on a cheaper table if you are a winning player. If you are a losing player, rakeback is a rebate on a leak.

PVPspinArena treats promo and partner credit at the poker table exactly as it does in every other game. You can buy in with it. Deposited or won money is used first, then bonus. Bonus you lose to another player stays bonus for them and cannot be cashed out as if it were a deposit. Only hands that reach the flop count toward a promo's playthrough, because blinds alone would let two accounts clear wagering cheaply. Read the offer's terms before you sit; the poker rules do not change because the chips came from a promotion.`,
    },
    {
      id: "first-hands",
      title: "Real data: the first real-money hands at our tables",
      body: `Real-money poker opened on PVPspinArena on 15 October 2026. These are the numbers from the first evening, read straight from the hand records, with no player names. A sample this small proves nothing about odds. It does show how the tables behave in practice, and what needed fixing.

| Measure | First evening |
| --- | --- |
| Hands dealt | 6, at $0.02/$0.05 blinds, on 2 tables |
| Players | 3, every hand heads-up |
| Completed | 3 |
| Voided before any card | 3 (a player did not reveal in time) |
| Ended preflop | 2, no fee |
| Reached the flop | 1, pot $0.40, fee $0.02 |
| Showdowns | 0 |
| Average completed hand | 32 seconds |

The one hand that reached the flop is a clean example of the fee rule. Both players put 20 cents in preflop after three raises, building a 40-cent pot. The flop came. One player's check was made for them when their 20-second clock ran out, and the other player folded. The winner was paid 38 cents and the fee was 2 cents: 5% of 40 cents, rounded down to whole cents. The two hands that ended preflop paid no fee at all.

### What the data says needs fixing

Two patterns stand out. First, a clock touched every one of the six hands: two preflop folds and one flop check were made by the 20-second timer, and three hands voided when a player's browser missed the 5-second reveal. Voids are safe — no blinds are posted and no money moves — but they waste time. Second, a timeout fold preflop hands the blinds to the other player, which is exactly what a player who stepped away does not want.

We traced the voids to background tabs. Browsers slow timers in hidden tabs, and the table stopped polling when you looked away, so a player in another tab could miss the reveal window. Seated players now keep receiving updates while the tab is hidden, a new hand is picked up at once so the reveal goes out inside the window, and the tab title shows "Your turn" when the action is on you. We will publish the next sample once there are enough hands to compare. If you play, keep the table tab open and set a [gambling budget](/guides/gambling-budget) before you sit.`,
    },
    {
      id: "summary",
      title: "Summary: judge the deck, the fee and the room",
      body: `Crypto poker is poker plus a crypto cashier. Most tables are RNG decks paid for by rake. Certificates and deck-hash schemes give you partial checks, and collusion sits outside both. Ask any room three questions: what was committed before the deal, what can I recompute afterwards, and what is the fee in one sentence.

At PVPspinArena the answers are short. The server seed hash is published before the deal and every dealt player adds a reveal. The Hands tab recomputes the deck. The fee is 5% of a pot, only after a flop. The [how to play poker](/guides/how-to-play-poker) guide covers the rules if you are new. Play only if you are 18 or over and can afford the downswings, and stop when the budget says stop.

Room brands are not this explanation of rake. The [Replay cashier](/guides/replay-poker-review), the [Black Chip rake gap](/guides/black-chip-poker-review) and the [PokerStars casino tab](/guides/pokerstars-casino-review) leave the other room's schedule unpublished.

Crypto poker is a category. [One crypto-funded room brand](/guides/coinpoker-review) is a single cashier, not these six-max tables.`,
    },
  ],
  faqs: [
    {
      q: "Is crypto poker legal?",
      a: "It depends on where you live. Crypto settlement does not create a licence. Check local law before you deposit.",
    },
    {
      q: "Are crypto poker sites provably fair?",
      a: "Some publish a deck-hash or player entropy scheme. Many only show an RNG certificate. Ask what you can recompute for a finished hand, not what the banner says.",
    },
    {
      q: "What is poker rake?",
      a: "Rake is the room's fee, usually a percentage of the pot with a cap, or a time charge. It is the cost of sitting, separate from whether you won the pot.",
    },
    {
      q: "Does PVPspinArena offer Texas Hold'em?",
      a: "Yes. It runs six-max No-Limit Texas Hold'em cash tables from $0.02/$0.05 to $5/$10 blinds, funded from the same US-dollar balance as its other games. The fee is 5% of a pot and only applies if a flop was dealt.",
    },
    {
      q: "Can I verify a PVPspinArena poker hand?",
      a: "Yes. Open the Hands tab at the table and press Verify on a finished hand. Your browser checks the seed against its published hash, checks each player's reveal, and recomputes the shuffle.",
    },
    {
      q: "Why was my hand voided?",
      a: "A hand voids when a dealt player does not reveal their shuffle secret within 5 seconds. It happens before any card or blind, so no money moves, and a new hand starts.",
    },
  ],
  sources: [
    { label: "UK Gambling Commission — Poker", url: "https://www.gamblingcommission.gov.uk/" },
    { label: "ethereum.org — What is a wallet?", url: "https://ethereum.org/en/wallets/" },
    { label: "GLI — Gaming testing standards", url: "https://gaminglabs.com/" },
  ],
  related: [
    "how-to-play-poker",
    "rigged-poker-sites",
    "collusion-in-poker",
    "rakeback-explained",
    "crypto-jackpot",
    "replay-poker-review",
    "black-chip-poker-review",
    "coinpoker-review",
  ],
  updated: "2026-10-15",
};

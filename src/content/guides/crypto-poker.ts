import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-poker",
  cluster: "Games & odds",
  keyword: "crypto poker",
  secondary: ["bitcoin poker", "crypto poker sites", "provably fair poker", "poker rake"],
  title: "Crypto Poker Guide: RNG Tables, Rake and Fairness",
  description:
    "How crypto poker works: RNG versus live tables, rake, bonuses, and what you can verify compared with a hashed PvP game today.",
  h1: "Crypto poker: RNG tables, rake and what you can actually check",
  answer:
    "Crypto poker is online poker funded with Bitcoin, ETH or a stablecoin instead of a card. Most tables deal cards with a site-run random number generator; a smaller set uses a studio camera. The operator takes rake from pots or a time charge. You can sometimes audit an RNG certificate or a card-hash scheme, but that is a different check from a single hashed PvP round.",
  facts: [
    "Most crypto poker sites deal software cards with an RNG, not a physical deck you can see.",
    "Rake is the site's cut of the pot or a timed fee; it is how the room is paid.",
    "A lab certificate says an RNG was tested, not that tonight's hand was honest.",
    "Provably fair poker is harder than a one-shot game because cards are dealt across streets.",
    "PVPspinArena is not a poker room. It runs Jackpot, Coinflip and Roulette only.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What crypto poker is — and what it is not",
      body: `Crypto poker is the familiar game of hole cards, streets and showdown, with deposits in digital assets. Bitcoin poker was the early brand. Today many rooms also take USDT or USDC. The rules at the table are still poker. The payment rail is crypto. The fairness story depends on how cards are chosen.

This is a [games and odds](/guides/topics/games-and-odds) guide for adults aged 18 or over. It teaches how rooms actually run, then contrasts that with PVPspinArena. This site is player-versus-player Jackpot, Coinflip and Roulette, funded with USDC and ETH on Base. It is not a poker room, not a sportsbook and not a lottery.

If you came here looking for Texas Hold'em with a hashed deck, read the whole article before you deposit anywhere. Marketing pages collapse "crypto," "provably fair" and "poker" into one phrase. Those are three products.`,
    },
    {
      id: "rng-live",
      title: "RNG tables versus live studio tables",
      body: `Online poker rooms almost never shuffle a deck in a warehouse for each cash-game hand. They use software.

### RNG tables

An RNG table asks a random number generator for card order. The generator may be a well-known library, a hardware source, or a custom service. You do not see the shuffle. You see the cards the server says you have. Skill still matters after the deal — position, ranges, bet sizing — but the deal itself is a trust or verify problem.

A testing lab can certify that a generator passed statistical tests at a point in time. That is useful and incomplete. It does not prove the operator used that generator on your hand, or that the client did not leak hole cards to a colluding player.

### Live tables

Live crypto poker, where it exists, is closer to live-dealer casino poker: a studio, a shoe or shuffler, cameras. You still cannot audit the full security of the studio from a browser. You can watch cards come off a deck. Collusion and delayed streams remain risks.

### Why the split matters

RNG scale is why crypto poker can run thousands of tables. Live scale is why it feels like "real cards." Neither automatically equals a [provably fair casino](/guides/provably-fair-casino) commitment published before you act.`,
    },
    {
      id: "rake",
      title: "Poker rake: the real house take",
      body: `Poker rooms do not need a house edge on the cards if they take rake. Rake is a percentage of the pot, usually capped, or a fee per time unit at the table. Over a long session, rake is why a break-even player still shrinks.

Typical cash-game rake in online rooms sits in a band around a few percent of each pot up to a dollar cap that depends on stakes. Exact numbers belong on the room's posted fees, not on a blog that guesses. Tournament fees are a percentage of the buy-in.

Rake is not cheating. Hidden extra rake is. Read the fee table. If a bonus requires you to play a huge number of hands, the rake during that grind is part of the price of the bonus.

Jackpot-sit-and-gos and "crypto spin-ups" blur the line further. Those products may use poker streets while the prize is a lottery-like ladder. You then pay rake *and* a prize-pool hold. Read both fee lines.

Compare that with a posted pot fee on a PvP jackpot or coinflip. The fee is taken from a single pot with a known size. There are no streets of extra rake. The [house edge](/guides/house-edge) guide explains the against-the-house version of the same idea: a built-in cost per unit wagered. Poker rake is closer to a tax on pots than to a 5.26% American-roulette edge, but both are costs you should be able to state in dollars per hour or per hundred hands.`,
    },
    {
      id: "fairness",
      title: "What you can actually verify",
      body: `Poker fairness has several layers people blur together.

1. **Rules and payouts.** You can read whether a flush beats a straight and how the prize pool pays. That is documentation, not cryptography.
2. **RNG lab letters.** You can read a PDF that says a generator was tested. You cannot recompute last night's river from that PDF.
3. **Card-hash or commit-reveal decks.** Some rooms publish hashes of a shuffled deck or let players contribute entropy. In principle you can check that the revealed deck matches the hash. In practice the protocol has to cover burn cards, misdeals, disconnects and multi-street action. Many "provably fair poker" pages stop at a slogan.
4. **Collusion and bots.** Cryptography on the shuffle does not stop two accounts sharing hole cards or a script playing 12 tables.

A hashed PvP game on this site is a smaller object. Before a Coinflip or Jackpot result, the server publishes a commitment. After the round, you can recompute the result on the [Fairness](/fairness) page. That check answers "was this draw swapped after I joined?" It does not make you a poker player and it does not apply to community-card games this site does not offer.

Hand histories and unique club IDs help after a dispute. They do not prove the unseen deck. If a room lets you export a hand, keep it. If a room deletes history after an hour, assume you will lose any argument about a mis-deal.

The [RNG versus provably fair](/guides/rng-vs-provably-fair) guide is the right next read if you want the lab-certificate model versus the hash-then-reveal model. Bring that vocabulary to any "bitcoin poker" landing page: ask what was committed, when, and what you recompute. If the answer is a logo, you have an RNG room with a crypto cashier.`,
    },
    {
      id: "bonuses",
      title: "Bonuses, rakeback and why they change the maths",
      body: `Crypto poker rooms advertise deposit matches, ticket drops and rakeback. None of those are free money in the sense of a no-cost session. A match usually requires playthrough. Rakeback returns part of the rake you already paid. If you play badly to "clear" a bonus, the extra losses can exceed the headline.

Work the bonus as an expected-value problem, not as a gift. How many big blinds will you put in the middle? What is the posted rake? What is your honest win rate before rake? If you cannot estimate those, skip the offer.

Rakeback deals also change table selection. A 30% deal on a high-rake micro stake can still be a worse dollar-per-hour than a 5% deal on a fairer cap if you are a winning player. If you are a losing player, rakeback is a rebate on a leak.

PVPspinArena does not sell poker bonuses because it does not sell poker. If you use this site, the cost to see is the posted game fee, defaulting to 0% unless a pot says otherwise, plus the variance of the round. There is no playthrough meter and no "clear 40x" clause. That absence is not a secret bonus; it is a different product.`,
    },
    {
      id: "example",
      title: "Worked example: $50 of rake over a weekend",
      body: `Imagine an adult who buys in for $100 at a crypto NL Hold'em table and plays 400 hands over a weekend.

1. Average pot that goes to showdown or a large turn bet is $18. Many hands never pay full rake.
2. Suppose, after the cap, the room effectively takes about $0.12 of rake per hand you see through. That is a teaching figure, not a quote from a named room.
3. 400 × $0.12 = $48 of rake. Your stack can still be up if you won pots. The $48 is gone to the room either way.
4. A 10% rakeback deal returns $4.80. You "got a bonus" and still paid $43.20 to sit.
5. Contrast a $2 PvP Coinflip with a 0% fee: the only expected cost is the 50/50 variance, not a drip of rake. That is a different game with different skill. It is not better poker. It is not poker.

Use the example to read fee pages, not to pick a strategy. Set a [gambling budget](/guides/gambling-budget) before either product.`,
    },
    {
      id: "contrast",
      title: "How a hashed PvP round differs from a poker session",
      body: `Poker is multi-street, incomplete information and player-versus-player skill. A room's product is the matching engine, the software deck or studio, and rake. A hashed jackpot or coin flip is a single commitment, a single reveal and a pot. Skill after the cards are out does not apply.

If you want poker, use a poker room and judge it on rake, software, payout speed and collusion controls. If you want a verifiable one-shot pot, use a site that publishes seeds. Do not expect one product to satisfy the other checklist.

Identity and table selection also differ. A poker room lives or dies on traffic at your stake, software stability and how it handles disconnected hands. A hashed PvP site lives or dies on pot matching, published fees and a reveal you can recompute. Bringing a poker HUD mindset to a coinflip will not help. Bringing a seed-check mindset to a 6-max cash table will not detect a colluding pair.

Bankroll language transfers. A poker downswing of 20 buy-ins is a known shape. A string of lost coinflips is variance without streets of decisions. Both can empty a hot wallet if you did not cap the session. The [gambling budget](/guides/gambling-budget) habit belongs on both products.

PVPspinArena will not deal you a flop. That is a limit, not a feature hidden in the footer. If a banner on another domain says "poker + jackpot + sports" in one lobby, read each game's fairness story separately. A good cashier does not make a good deck.`,
    },
    {
      id: "summary",
      title: "Summary: pay rake for poker, or verify a different game",
      body: `Crypto poker is poker plus a crypto cashier. Most tables are RNG. Rake is the business model. Certificates and rare deck-hash schemes give you partial checks; collusion sits outside those checks. A hashed PvP round is easier to recompute and is not Hold'em.

Play only if you are 18 or over, can afford the rake and the downswings, and have read the room's fee table. If you wanted this site's games instead, they are Jackpot, Coinflip and Roulette — not a poker client.`,
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
      a: "No. It is not a poker room. It offers player-versus-player Jackpot, Coinflip and Roulette.",
    },
    {
      q: "Is bitcoin poker different from USDT poker?",
      a: "The cards and rake can be the same. The cashier and price risk differ. A BTC stack moves in dollars between sessions; a USDT stack is meant not to.",
    },
    {
      q: "Can I verify a poker hand the way I verify a Coinflip?",
      a: "Only if the room publishes a full commit-and-reveal for that deal. Most do not. PVPspinArena's Fairness page applies to its PvP games, not to poker.",
    },
  ],
  sources: [
    { label: "UK Gambling Commission — Poker", url: "https://www.gamblingcommission.gov.uk/" },
    { label: "ethereum.org — What is a wallet?", url: "https://ethereum.org/en/wallets/" },
    { label: "GLI — Gaming testing standards", url: "https://gaminglabs.com/" },
  ],
  related: [
    "crypto-jackpot",
    "crypto-lottery",
    "bitcoin-lottery",
    "crypto-bingo",
    "crypto-scratch-cards",
  ],
  updated: "2026-09-26",
};

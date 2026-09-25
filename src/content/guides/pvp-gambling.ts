import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pvp-gambling",
  cluster: "CS:GO heritage",
  pillar: true,
  keyword: "peer to peer gambling",
  secondary: ["pvp gambling", "p2p casino", "pvp casino", "player vs player gambling"],
  title: "PvP Gambling: How Player vs Player Games Actually Work",
  description:
    "Player versus player gambling explained: who you play against, where the fee comes from, why the house takes no side, and how pots are settled.",
  h1: "PvP gambling: how peer to peer gambling actually works",
  answer:
    "PvP gambling, also called peer to peer gambling, means you play against other players instead of against the casino. Everyone's stakes form a pot, one player or side wins it, and the site earns money from a fee rather than from your losses. The house has no reason to want any particular player to lose.",
  facts: [
    "In PvP games, the pot comes from players' stakes, not from the operator's bankroll.",
    "The operator's income is a fee shown before you enter, not the house edge on a payout table.",
    "Jackpot and Coinflip on PVPspinArena are player vs player; Roulette is a shared house-paid round.",
    "Your chance to win depends on your share of the pot or the game's fixed odds, never on who you are.",
    "PvP formats became popular on CS:GO skin sites from around 2015.",
  ],
  sections: [
    {
      id: "definition",
      title: "What is peer to peer gambling?",
      body: `In most casino games you play against the house. When you bet on roulette at a traditional casino, the casino pays you if you win and keeps your stake if you lose. Its profit comes from the payout table being slightly worse than the true odds, which is called the [house edge](/guides/house-edge).

Peer to peer gambling flips that. You play against other people. The stakes from every player go into a shared pot, the game decides a winner, and the winner receives the pot. The operator's job is to run the game fairly, hold the money safely and settle the pot correctly. Its income comes from a fee, typically a percentage of the pot, which should be shown before you join.

The same idea is sometimes called a P2P casino or a PvP casino. Poker rooms have worked this way for decades, taking a small "rake" from each pot. What is newer is applying the model to simple, fast games like jackpots and coinflips.`,
    },
    {
      id: "vs-house",
      title: "PvP vs house-banked games",
      body: `The difference changes the incentives on both sides of the table.

### Who pays the winner

In a house-banked game, the casino pays winners from its own bankroll. In a PvP game, the losers' stakes pay the winner. The operator never needs to cover a big win from its own funds.

### Where the operator's money comes from

A house-banked casino earns from the house edge built into the payouts. A PvP operator earns from the fee. If the fee is zero, the game is a straight transfer between players.

### Why this matters for trust

Because the operator's income doesn't depend on who wins, it has no direct motive to favour one player. That is a structural benefit, but it is not a guarantee. You still want to be able to check results, which is why PvP sites commonly use [provably fair](/guides/provably-fair-casino) draws.

### What stays the same

It is still gambling. Over many games, the fee means players as a group get back less than they put in. Individual players still win and lose by chance, and nothing about the PvP model makes winning more likely.`,
    },
    {
      id: "formats",
      title: "Common PvP game formats",
      body: `A few formats dominate player-vs-player gambling.

### Jackpot

Players add stakes to a shared pot during a countdown. Each unit of stake is a ticket, so your chance to win equals your share of the pot. When the timer ends, one ticket is drawn and its owner wins the whole pot, minus any fee. On PVPspinArena every cent is one ticket. The [crypto jackpot guide](/guides/crypto-jackpot) works through the odds.

### Coinflip

Two players, one flip. One player creates a game, chooses a side and sets the stake. Another player matches it. A single random result decides the winner, who takes both stakes minus any fee. Before fees, each side has exactly a 50% chance. See [coin flip odds](/guides/coin-flip-odds) for the maths.

### Versus modes and battles

Some sites offer case battles or other head-to-head modes where several players' results are compared. The principle is the same: players' stakes fund the prize.

### Shared rounds that are not PvP

Some games look social but are actually house-banked. PVPspinArena's [Roulette](/roulette) is one: everyone bets on the same spin, but each bet is paid at a fixed multiplier by the platform, not from other players' stakes. We describe it separately so the two models are never confused.`,
    },
    {
      id: "fees",
      title: "Where the fee comes from, with an example",
      body: `Fees are the most important number in any PvP game, because they decide the long-run cost of playing.

Imagine a Coinflip where both players stake $5.00, making a $10.00 pot. With a 5% fee, the winner receives $9.50 and the site keeps $0.50. With a 0% fee, the winner receives the full $10.00.

For a player, the expected result of one game is:

- 50% chance of receiving the pot after fee
- 50% chance of receiving nothing
- minus your own $5.00 stake

With a 5% fee that works out to an average of -$0.25 per game. With no fee it is exactly $0.00. That average is not a prediction for any single game; it is the long-run cost.

On PVPspinArena the fee is configurable by the operator and is shown before you enter a game. Always read it before you play. A PvP site that hides its fee, or changes it after you join, is a red flag.`,
    },
    {
      id: "history",
      title: "Where PvP gambling came from",
      body: `Player-vs-player formats became widely known through the CS:GO skin economy. From around 2015, community sites let players stake cosmetic weapon skins in jackpot pots and coinflips, and rounds were watched live by crowds of players. The pace, the chat and the shared tension of watching a wheel spin were a big part of the appeal.

That era also showed the problems: underage players, undisclosed sponsorships and sites with unclear fairness. In 2016 Valve took action against third-party gambling sites using its trading system. Our [history of CS:GO gambling](/guides/csgo-gambling-history) covers the timeline in detail, and the [CS:GO coinflip](/guides/csgo-coinflip) and [CS:GO jackpot](/guides/csgo-jackpot) guides explain those formats.

PVPspinArena is inspired by the speed and competitiveness of that period, but it is independent, uses US-dollar balances funded with USDC or ETH instead of skins, and is not affiliated with Valve, Counter-Strike or Steam.`,
    },
    {
      id: "safety",
      title: "How to judge a PvP gambling site",
      body: `Because players fund each other's wins, the operator's main responsibilities are fairness, settlement and custody. Check each one.

1. **Fairness.** Is each draw provably fair, with a commitment shown before the round?
2. **Settlement.** Are pots paid out automatically and exactly once? Can you see a record of past games?
3. **Custody.** Are balances kept separate from game pots while a round is running? On PVPspinArena, stakes move into an escrow account during a round and are paid out from there, in a double-entry ledger where every transaction balances.
4. **Fees.** Is the fee clearly shown before you join?
5. **Limits and protection.** Are there minimum and maximum stakes, and responsible gambling tools such as self-exclusion?

A site that explains all five openly is behaving like a platform. A site that is vague about them is asking for blind trust.`,
    },
    {
      id: "example",
      title: "Worked example: a three-player Jackpot",
      body: `Here is a PvP pot from start to finish.

Alex adds $6.00, Sam adds $3.00 and Jo adds $1.00, making a $10.00 pot. On PVPspinArena every cent is one ticket, so Alex holds tickets 1 to 600, Sam holds 601 to 900 and Jo holds 901 to 1,000. Their chances are 60%, 30% and 10%.

The seed hash for this game was shown under the wheel before anyone joined. When the countdown ends, entries close, the wheel shows a short countdown and then spins. The server has already drawn ticket 742 with HMAC-SHA256 and rejection sampling, so Sam wins. With a 0% fee Sam receives $10.00; with a fee, the amount shown before entry is deducted.

After settlement the seed is revealed. Anyone can open the game's audit page, confirm the seed matches the commitment and recompute ticket 742.`,
    },
    {
      id: "glossary",
      title: "Key PvP gambling terms",
      body: "A few terms come up again and again in player-vs-player games. Knowing them makes rules pages much easier to read.\n\n- **Pot.** The total of all stakes in a round. In PvP games, this is what the winner receives before fees.\n- **Rake or fee.** The operator's share of the pot. In poker it is called rake; on jackpot and coinflip sites it is usually called a fee or commission.\n- **Escrow.** Money held aside while a round is running, so it can't be spent elsewhere. On PVPspinArena stakes move into an escrow account when you enter and leave it only at settlement or refund.\n- **Ticket.** In jackpot games, the unit your stake is divided into. On PVPspinArena one cent is one ticket.\n- **Seed commitment.** The published hash of the secret seed that will decide the round.\n- **Settlement.** The moment the pot is paid to the winner and any fee is collected.\n- **Cancelled round.** A round that ends without a draw, for example because too few players joined. Stakes are returned.\n\n### Why terminology matters for trust\n\nClear terms usually signal clear rules. When a site explains exactly what happens to your stake from the moment you enter until settlement, you can check each step. When a site uses vague words like \"bonus pool\" or \"house share\" without numbers, you can't. For a wider list of definitions, see the [casino and crypto gambling glossary](/guides/casino-terminology).\n\n### Is PvP gambling legal?\n\nLaws on gambling, including peer to peer formats, vary by country and sometimes by region. Player-vs-player structure does not create a legal exemption. Always check what applies where you live before playing.",
    },
    {
      id: "social",
      title: "Why PvP games feel different",
      body: "Player-vs-player rounds are social by design. You see who joined, how much they put in and when the round closes, and everyone watches the same result at the same moment. Chat runs alongside the games. That shared experience is a big part of why the format grew so quickly on community sites.\n\nIt is also worth being aware of. Watching other players win can make a game feel more winnable than it is, and fast rounds make it easy to keep going. Decide in advance how many rounds or how much money you will play, and stop when you reach it.",
    },
    {
      id: "summary",
      title: "Summary",
      body: `PvP gambling means your opponent is another player, not the casino. The operator earns a fee, the pot is funded by players' stakes, and fair draws can be checked with provably fair methods. That makes the incentives cleaner than in house-banked games, but it doesn't make gambling a way to earn money. Read the fee, check a few results and set a budget before you play.

Ready to see it in action? Watch a live [Jackpot](/) round, or open [Coinflip](/coinflip) to see open games.`,
    },
  ],
  faqs: [
    {
      q: "What does PvP mean in gambling?",
      a: "PvP stands for player versus player. You compete against other players for a pot made of everyone's stakes, instead of betting against the casino's bankroll.",
    },
    {
      q: "Is PvP gambling better than playing against the house?",
      a: "It is structurally different rather than better. The operator doesn't profit from any particular player losing, but the fee still makes the game cost money on average over time.",
    },
    {
      q: "How do PvP gambling sites make money?",
      a: "They take a fee from each pot or game, similar to the rake in poker. The fee should be displayed before you enter.",
    },
    {
      q: "Is PVPspinArena Roulette player vs player?",
      a: "No. Roulette is a shared round where every bet is paid at a fixed multiplier by the platform. Jackpot and Coinflip are the player-vs-player games.",
    },
    {
      q: "Can I play PvP games with crypto?",
      a: "Yes. On PVPspinArena you deposit USDC or ETH on Base and your balance is held in US dollars, which you then use to join Jackpot pots or Coinflip games.",
    },
  ],
  sources: [
    { label: "Valve — Statement on CS:GO gambling sites (2016)", url: "https://blog.counter-strike.net/index.php/2016/07/15109/" },
    { label: "RFC 2104 — HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
  ],
  related: ["crypto-jackpot", "csgo-coinflip", "csgo-jackpot", "skin-gambling-vs-crypto", "csgo-gambling-history"],
  updated: "2026-09-25",
};

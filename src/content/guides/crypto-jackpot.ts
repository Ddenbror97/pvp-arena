import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-jackpot",
  cluster: "Games & odds",
  pillar: true,
  keyword: "crypto jackpot",
  secondary: ["jackpot game", "jackpot odds", "csgo jackpot", "jackpot gambling"],
  title: "Crypto Jackpot Games: How the Pot and Odds Work",
  description:
    "How crypto jackpot games build a pot, how your share sets your win chance, what the fee is and how to verify the winner of every round.",
  h1: "Crypto jackpot games: how the pot and odds work",
  answer:
    "A crypto jackpot is a player-vs-player game where everyone adds stakes to one shared pot and a single winner takes it. Your chance of winning equals your share of the pot: add 20% of the money and you hold 20% of the tickets. When the round ends, a provably fair draw picks one ticket, and its owner receives the pot minus any fee.",
  facts: [
    "Win chance = your stake ÷ total pot. On PVPspinArena, every cent is one ticket.",
    "The pot is funded by players, so the house does not bet against you.",
    "Any fee is taken from the pot and shown before you enter.",
    "The seed commitment for each game is shown under the wheel before anyone joins.",
    "A bigger stake raises your chance of winning, but it also raises what you can lose.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What is a crypto jackpot game?",
      body: `The word "jackpot" normally makes people think of slot machines and huge progressive prizes. A crypto jackpot game is something different. It is a simple player-vs-player pot: several players add stakes during a countdown, the pot grows, and at the end one player wins everything in it.

The format became famous on CS:GO skin sites, where players threw weapon skins into a pot and watched a wheel decide the winner. The [CS:GO jackpot guide](/guides/csgo-jackpot) covers that history. Crypto jackpots keep the same mechanics but use digital assets instead of skins. On PVPspinArena you fund your balance with USDC or ETH on Base, the balance is held in US dollars, and you add dollars and cents to the pot.

Because it is a [peer to peer game](/guides/pvp-gambling), the site does not pay winners from its own money. The losers' stakes pay the winner, and the operator's income is a fee.`,
    },
    {
      id: "how-it-works",
      title: "How a jackpot round works",
      body: `Every round on PVPspinArena follows the same timeline, and every screen shows it at the same moment.

1. **Commitment.** Before the round opens, the server creates a secret seed and shows its SHA-256 hash under the wheel as the seed commitment.
2. **Open.** The pot waits for players. The countdown starts once there is enough activity for a real round.
3. **Entries.** Players add stakes. Each cent becomes one ticket, in order, so the first player holds the first block of tickets.
4. **Close.** When the timer reaches zero, entries are locked and the screen shows a short 3-2-1 countdown while the wheel prepares to spin.
5. **Draw.** The server draws a winning ticket using HMAC-SHA256 with rejection sampling. The wheel spins to that ticket's position, and every viewer's wheel stops on the same spot at the same time.
6. **Settle and reveal.** The pot, minus any fee, is paid to the winner in one ledger transaction, and the seed is revealed so the draw can be checked.

You can watch this live on the [Jackpot page](/), even without signing in.`,
    },
    {
      id: "odds",
      title: "Jackpot odds: how your chance is calculated",
      body: `Jackpot odds are the most intuitive in gambling: your chance is exactly your share of the pot.

### The formula

Win chance = your total stake ÷ total pot

If the pot is $50.00 and you added $5.00, your chance is 10%. If you add another $5.00 and nobody else joins, your chance becomes $10.00 ÷ $55.00, about 18.2%.

### Tickets make it exact

On PVPspinArena every cent is a ticket, so a $5.00 stake is 500 tickets. The winning ticket is drawn uniformly from every ticket in the pot. Rejection sampling makes sure no ticket number is slightly more likely than another, which a simple remainder calculation would cause.

### Expected value

With no fee, a jackpot is a zero-sum game between players. If your chance is 10% and the pot is $50.00, your expected return is 10% × $50.00 = $5.00, exactly what you put in. With a fee, your expected return is lower than your stake by your share of the fee. That is the long-run cost of playing, and it doesn't depend on how lucky you feel.

### What doesn't change your odds

Entering early or late, the order of tickets, or which colour you get on the wheel make no difference. Only your share of the pot matters.`,
    },
    {
      id: "strategy",
      title: "Stake size, risk and the myth of jackpot strategy",
      body: `Searches for jackpot strategy are common, so it is worth being direct: there is no way to beat a fair jackpot over time. What you can control is risk.

- **Bigger stake, higher chance, higher exposure.** Putting in 80% of the pot gives you an 80% chance to win, but the 20% case costs you a lot more.
- **Smaller stake, lower chance, bigger upside.** A 2% share rarely wins, but when it does, you win many times your stake.
- **Both have the same expected value.** Before fees, every share size has an expected return equal to your stake. After fees, every share size loses the same proportion on average.

Betting systems that tell you to chase losses, such as the [Martingale strategy](/guides/martingale-strategy), don't change this maths. They only change how quickly and how badly things go wrong. The useful strategy is a [gambling budget](/guides/gambling-budget) decided before you start.`,
    },
    {
      id: "fees",
      title: "Jackpot fees and how they are shown",
      body: `The fee is the operator's share of each pot. It is the one number that decides whether playing costs you money over time.

On PVPspinArena the house fee is configurable by the operator and is shown before you enter. If a pot of $40.00 has a 5% fee, the winner receives $38.00 and $2.00 goes to the platform. With a 0% fee, the winner receives the full $40.00.

Settlement happens in a single ledger transaction: stakes move from escrow to the winner, and any fee moves to the house revenue account. Every transaction must balance to zero, so money cannot appear or vanish during settlement. If a round is cancelled before a draw, for example because only one player joined, stakes are returned rather than kept.`,
    },
    {
      id: "verify",
      title: "How to verify a jackpot winner",
      body: `Every completed jackpot game has a public audit page. To check a winner:

1. Note the seed commitment shown under the wheel before the round.
2. After the round, open the game from the recent games list, or go to the [Fairness page](/fairness).
3. Confirm the revealed seed's SHA-256 hash matches the commitment.
4. Recompute the winning ticket with the published HMAC-SHA256 formula and rejection sampling.
5. Check that ticket falls inside the winner's ticket range.

The same logic is explained step by step in the [provably fair casino guide](/guides/provably-fair-casino).`,
    },
    {
      id: "example",
      title: "Worked example: a four-player pot",
      body: `Four players join a round.

- Mia adds $2.00: tickets 1 to 200
- Leo adds $5.00: tickets 201 to 700
- Ana adds $2.50: tickets 701 to 950
- Kai adds $0.50: tickets 951 to 1,000

The pot is $10.00, or 1,000 tickets. Chances are 20%, 50%, 25% and 5%.

The countdown ends, entries close, and the wheel spins. The server draws ticket 963, so Kai wins despite holding the smallest share. With a 0% fee Kai receives $10.00, twenty times the stake. Over many rounds, Kai's 5% share will win about one round in twenty, which is exactly why the expected value stays the same whatever size you choose.

After settlement, anyone can open the audit page, confirm the seed matches the commitment and recompute ticket 963.`,
    },
    {
      id: "vs-lottery",
      title: "Crypto jackpot vs lottery vs progressive slot",
      body: "Three very different games share the word \"jackpot\", and mixing them up leads to wrong expectations.\n\n### Lottery jackpot\n\nA lottery sells a huge number of tickets with fixed prices. The chance of winning the top prize is tiny and fixed by the number combinations, not by how much other people spend. A large share of ticket sales goes to the organiser and good causes, so the expected return per ticket is well below its price.\n\n### Progressive slot jackpot\n\nA progressive slot adds a small part of each spin to a growing prize, which is won when a rare symbol combination appears. The chance of hitting it on any spin is very small and set by the game's design. You can't see how many other players are contributing or what your exact chance is.\n\n### Crypto jackpot pot\n\nA crypto jackpot like PVPspinArena's is transparent by comparison. You can see every player's stake, the total pot and your exact chance before the draw. A round lasts minutes, not weeks, and there is always a winner. The only difference between the pot and what the winner receives is the fee shown before entry.\n\n### Which is \"better\"?\n\nNone of them is a way to make money. The jackpot pot simply shows you all of its numbers, which makes it easier to understand exactly what you are risking. Use that clarity to decide your stake calmly.\n\n### Watching vs playing\n\nOne of the appeals of the format is that rounds are social. You can watch the pot fill up, see who joined and follow the spin together with everyone else on the page, all without an account. There is no pressure to play just because a round is running. Watching a few rounds first is a good way to see how the timeline and odds behave.\n\n### Minimums and maximums\n\nEvery jackpot game has a minimum and maximum stake per entry. They keep rounds fair for smaller players and limit how much anyone can put at risk in one go. The current limits are shown next to the entry form on the Jackpot page.",
    },
    {
      id: "timing",
      title: "Does timing matter in a jackpot?",
      body: "A common question is whether it helps to join early, join late or wait for a big pot. It doesn't change your odds. Your chance depends only on your share of the final pot, and the winning ticket is drawn uniformly across all tickets once entries close. Joining late only means you know more about the pot size before deciding your stake, which can help you stay within budget but won't make a win more likely.",
    },
    {
      id: "summary",
      title: "Summary",
      body: `A crypto jackpot is one shared pot, many players and one winner. Your chance equals your share, the pot is funded by players rather than the house, and the operator earns a fee that should be shown before you enter. Every draw on PVPspinArena can be checked against a seed committed before the round. Enjoy the tension of the wheel, but decide your budget first.

Watch a live round on the [Jackpot page](/), or compare it with the one-on-one format in the [coin flip odds guide](/guides/coin-flip-odds).`,
    },
  ],
  faqs: [
    {
      q: "What are the odds of winning a crypto jackpot?",
      a: "Your odds equal your share of the pot. If you contribute $3 to a $30 pot, you have a 10% chance of winning that round.",
    },
    {
      q: "Is there a jackpot strategy that works?",
      a: "No strategy changes the expected value of a fair jackpot. Larger shares win more often but lose more when they lose; smaller shares win less often but pay more when they win.",
    },
    {
      q: "What happens if only one player joins?",
      a: "A round with a single player can't produce a real contest, so the round does not draw a winner and the stake is returned according to the game rules.",
    },
    {
      q: "Can I verify who won a jackpot?",
      a: "Yes. Each completed game has an audit page with the revealed seed. You can check it matches the commitment shown before the round and recompute the winning ticket.",
    },
    {
      q: "Do I need to sign in to watch jackpot rounds?",
      a: "No. Anyone can watch the live wheel, the pot, the player list and recent games. You need an account and a funded balance to enter.",
    },
  ],
  sources: [
    { label: "RFC 2104 — HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST FIPS 180-4 — SHA-256", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
  ],
  related: ["pvp-gambling", "csgo-jackpot", "coin-flip-odds", "house-edge", "provably-fair-casino"],
  updated: "2026-09-25",
};

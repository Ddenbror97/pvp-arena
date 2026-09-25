import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-coinflip",
  cluster: "CS:GO heritage",
  keyword: "csgo coinflip",
  secondary: ["cs2 coinflip", "coinflip gambling", "crypto coinflip", "provably fair coinflip"],
  title: "CS:GO Coinflip Explained: Rules, Odds and Crypto",
  description:
    "How CS:GO coinflip worked, why it was a 50/50 player duel, what changed after skin gambling, and how a provably fair crypto coinflip works today.",
  h1: "CS:GO coinflip explained: rules, odds and the crypto version",
  answer:
    "CSGO coinflip, written CS:GO coinflip, was a two-player game where each side put in skins of similar value and a random coin toss decided who took both stakes. Today the same duel format runs with crypto: two players stake equal amounts, a provably fair flip picks heads or tails, and the winner receives the pot minus any site fee.",
  facts: [
    "Coinflip is a player-versus-player game: you play against another person, not against the house.",
    "Each flip has two outcomes, so a fair flip gives each player a 50% chance.",
    "In the skin era, stakes were CS:GO items; crypto coinflip uses equal dollar stakes instead.",
    "On PVPspinArena the result comes from HMAC-SHA256 over a server seed committed before the game.",
    "The site takes only the configured house fee from the pot; it does not bet against you.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What was CS:GO coinflip?",
      body: `CS:GO coinflip was one of the simplest game modes on skin gambling sites that grew up around Counter-Strike: Global Offensive in the mid-2010s. Players used cosmetic weapon skins, items that could be traded through Steam, as stakes.

A player would create a coinflip room and put in a set of skins. Another player would join by putting in skins of roughly matching value. The site then flipped a virtual coin. Whoever's side came up took every skin in the pot, usually minus a small cut kept by the site.

The appeal was obvious. There was no dealer, no complicated rules and no long wait. Two players, one flip, one winner. It fitted the fast culture of CS:GO communities, where streamers and viewers would open rooms and flip between rounds.

Coinflip also mattered because of who it put you against. In classic casino games you play against the house. In coinflip you play against another player, and the site acts as the referee. That same idea is at the heart of modern [PvP gambling](/guides/pvp-gambling), and it is why PVPspinArena is built around player duels and shared pots.`,
    },
    {
      id: "rules",
      title: "How coinflip works, step by step",
      body: `The rules of coinflip have barely changed since the skin era. Only the stakes and the fairness method have moved on.

1. **Create a room.** One player chooses a stake and a side, heads or tails.
2. **Wait for an opponent.** The room appears in a lobby where anyone can see the stake and the side still open.
3. **Join.** A second player takes the other side by matching the stake.
4. **Lock.** Once both stakes are in, the room locks. Nobody can cancel or change sides.
5. **Flip.** The site produces the result from its fairness protocol and shows the coin animation.
6. **Payout.** The winner's balance is credited with the pot, minus any site fee.

### Room and stake matching

In skin coinflip, matching was approximate, because items had market prices that moved. Sites usually allowed the joining player's items to fall within a small percentage of the creator's value. That created small edges and arguments over prices.

Crypto coinflip removes that problem. On PVPspinArena both players stake exactly the same dollar amount, held in integer cents, so the pot is always exactly double the stake. You can see the room and its stake before joining on the [Coinflip page](/coinflip).`,
    },
    {
      id: "odds",
      title: "Coinflip odds and expected value",
      body: `A fair coin has two sides and each is equally likely. That means each player in a fair coinflip has a 50% chance of winning, no matter which side they pick and no matter what happened in previous flips.

### The effect of a fee

Suppose two players each stake $10, making a $20 pot.

- **With no fee**, the winner gets $20. Your expected result is 50% × $20 − $10 = $0. Over many flips you break even on average.
- **With a 5% fee**, the pot pays out $19. Your expected result is 50% × $19 − $10 = −$0.50 per flip.

So the fee is the entire cost of playing. Nothing about picking heads or tails, or waiting for a "hot" room, changes that. PVPspinArena shows its configured house fee, and the default is 0%.

### Streaks are normal

In a run of 100 fair flips, a streak of six or seven in a row on one side is common. This does not mean the next flip is more likely to go the other way. Each flip is independent. Doubling your stake after a loss does not beat the maths; it just makes an unlucky streak cost more, which is why a clear [gambling budget](/guides/gambling-budget) matters in fast games like this.`,
    },
    {
      id: "history",
      title: "What happened to skin coinflip sites",
      body: `Skin gambling grew quickly and with little oversight. Players could deposit items without proving their age, and many sites did not publish how results were produced.

### The 2016 crackdown

In 2016, investigations and lawsuits in the US drew attention to undisclosed promotions and underage players on skin sites. Valve, the company behind CS:GO and Steam, publicly stated that using Steam trading for gambling broke its terms and sent cease-and-desist letters to many operators. Numerous sites closed or moved away from Steam-based deposits.

### Trust problems

Two problems stood out:

- **Opaque results.** Many sites never proved that flips were random, so players simply had to trust them.
- **Conflicts of interest.** Some promoters were revealed to be connected to the sites they promoted, without telling viewers.

### Why it still matters

The coinflip format survived because it is simple and genuinely player versus player. What changed is how serious sites handle trust: publishing the fairness method, committing to results before the game, and letting players verify outcomes themselves. With Counter-Strike 2 replacing CS:GO in 2023, many players now search for CS2 coinflip, but the same lessons apply.`,
    },
    {
      id: "provably-fair",
      title: "How a provably fair coinflip works",
      body: `Provably fair means you can check that a result was fixed before the game started and was not changed afterwards. The method used on PVPspinArena is a commit-reveal scheme built on standard cryptography.

### Before the flip: commit

When a coinflip game is created, the server generates a random 32-byte secret called the **server seed**. It publishes the SHA-256 hash of that seed. The hash acts like a sealed envelope: it proves the seed already exists, but reveals nothing about it.

### The flip

The result is computed as:

- message = \`PVPCasino:coinflip:v1:\` + game number + \`:\` + draw version
- h = HMAC-SHA256(key = server seed, message)
- If the lowest bit of the first byte of h is 0, the result is heads; if it is 1, tails.

### After the flip: reveal

When the game settles, the server seed is revealed. Anyone can hash it and confirm it matches the published commitment, then recompute the HMAC and check the side.

Because the seed was locked before the second player joined, the site cannot choose a seed that makes a particular player win. You can learn more in our [provably fair casino guide](/guides/provably-fair-casino), and the [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) explains the function itself.`,
    },
    {
      id: "verify",
      title: "How to verify a coinflip result yourself",
      body: `You do not need to trust anyone's word that a flip was fair. Here is how to check a finished PVPspinArena coinflip.

1. **Open the finished game** and note its game number.
2. **Go to the fairness page** and choose the Coinflip tab on [Fairness](/fairness).
3. **Enter the game number.** The page loads the revealed server seed and the commitment that was published before the flip.
4. **Check the commitment.** Your browser hashes the seed with SHA-256 and compares it to the published hash. They must be identical.
5. **Recompute the result.** Your browser builds the message, runs HMAC-SHA256 and reads the first byte. Even means heads, odd means tails.
6. **Compare.** The computed side must match the side shown in the game.

The check runs in your own browser, not on our servers, so the site cannot change what it shows you. You can also copy the seed and message into any independent HMAC-SHA256 tool and get the same result. Our [provably fair calculator guide](/guides/provably-fair-calculator) shows how to do this with common tools.

If any step does not match, the result is not proven fair. Keep the game number and contact support.`,
    },
    {
      id: "crypto-vs-skins",
      title: "Crypto coinflip vs skin coinflip",
      body: `The two versions share the same game but differ in almost everything around it.

### Stakes

- **Skins**: item values changed with the Steam market, so matching was approximate and cashing out meant selling items.
- **Crypto**: stakes are exact dollar amounts. On PVPspinArena balances are held in US dollar cents and funded with USDC or ETH on Base.

### Deposits and withdrawals

Skin sites relied on trade bots and Steam trade holds. Crypto sites use blockchain transfers that anyone can look up. Our [USDC casino guide](/guides/usdc-casino) covers deposits and withdrawals in detail.

### Fairness

Many skin sites offered no proof at all. A provably fair crypto coinflip publishes a commitment before each game and reveals the seed afterwards, so every result can be checked.

### Who you play against

Both are player versus player. The site's role is to hold the stakes, run the flip and pay the winner. On PVPspinArena the only thing the site keeps is the configured fee.

### Age and location

Crypto coinflip is still gambling. You must be of legal age and allowed to gamble where you live. Check local laws before playing.`,
    },
    {
      id: "tips",
      title: "Tips for playing coinflip responsibly",
      body: `Coinflip is fast. A round can take seconds, which makes it easy to play far more than you meant to.

- **Set your stake before opening the lobby.** Choose one stake size for the session and stick to it.
- **Decide how many flips you will play.** Ten flips at $1 is a very different session from ten flips at $10.
- **Ignore streaks.** Previous flips do not affect the next one.
- **Do not double after a loss.** It does not change the 50% chance, it only raises your risk.
- **Check the fee.** It is the real cost of each flip.
- **Verify some results.** It takes a minute and shows you how the system works.
- **Stop at your limit.** If the session budget is gone, the session is over.

If you find you are playing longer or staking more than you planned, take a break. Our [gambling budget guide](/guides/gambling-budget) has practical steps and helplines.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `CS:GO coinflip was a simple two-player duel: equal stakes, one coin toss, the winner takes the pot. The format became popular on skin sites and lost trust when many of them turned out to be opaque or poorly run.

The modern crypto version keeps the duel but fixes the weak points. Stakes are exact dollar amounts, results are committed before the game with a SHA-256 hash, and the outcome is computed with HMAC-SHA256 so anyone can verify it after the seed is revealed.

The odds are 50/50 for each player, and the fee is the only cost. Play with a fixed budget, verify results when you want to, and never try to beat streaks with bigger stakes. When you are ready, open the [Coinflip lobby](/coinflip) to see live rooms.`,
    },
  ],
  faqs: [
    {
      q: "Is coinflip really 50/50?",
      a: "In a fair coinflip, yes. Each player has a 50% chance on every flip. The only thing that reduces your expected return is the site fee taken from the pot.",
    },
    {
      q: "Is CS:GO coinflip the same as CS2 coinflip?",
      a: "Yes, the game is the same. Counter-Strike 2 replaced CS:GO in 2023, so many players now search for CS2 coinflip, but the rules of the two-player duel are unchanged.",
    },
    {
      q: "Does picking heads or tails matter?",
      a: "No. In a provably fair coinflip, the result comes from a seed committed before the game, and each side has an equal chance. Neither side is luckier.",
    },
    {
      q: "Can the site see my side and change the result?",
      a: "Not on a provably fair site. The server seed's hash is published before the game, so changing the seed afterwards would produce a different hash that no longer matches.",
    },
    {
      q: "How do I verify a PVPspinArena coinflip?",
      a: "Open the Coinflip tab on the fairness page and enter the game number. Your browser checks the seed against its commitment and recomputes the flip with HMAC-SHA256.",
    },
  ],
  sources: [
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST FIPS 180-4: Secure Hash Standard", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
    { label: "Valve statement on CS:GO gambling sites (2016)", url: "https://blog.counter-strike.net/index.php/2016/07/15109/" },
  ],
  related: ["pvp-gambling", "provably-fair-casino", "cs2-roulette"],
  updated: "2026-09-25",
};

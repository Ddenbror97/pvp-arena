import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-coinflip-sites",
  cluster: "CS:GO heritage",
  keyword: "csgo coinflip sites",
  secondary: ["cs2 coinflip sites", "cs2 coinflip", "coinflip gambling", "coin flip gambling"],
  title: "CS:GO Coinflip Sites: What to Check Before You Flip",
  description:
    "How to choose CS:GO coinflip sites in the CS2 era: true 50/50 odds, fees, room rules, verification and why USDC stakes beat skin pricing for fair duels.",
  h1: "CS:GO coinflip sites: how to choose a fair one",
  answer:
    "Good CSGO coinflip sites, often now called CS2 coinflip sites, give both players an exact 50% chance, state the fee they take from the pot, let you verify every flip and pay the winner automatically. The biggest difference between sites is not the coin; it is how stakes are valued, how much the site keeps and whether you can prove the flip was fair.",
  facts: [
    "A fair coinflip gives each player exactly a 50% chance of winning.",
    "The site fee is the only thing that changes your long-run return.",
    "Skin coinflips depend on the site's item prices; USDC stakes are exact.",
    "PVPspinArena Coinflip has a 0% default fee and verifiable results.",
    "You can check any PVPspinArena flip on the Fairness page.",
  ],
  sections: [
    {
      id: "what-sites-do",
      title: "What a coinflip site actually does",
      body: `Coinflip is the simplest player-versus-player game there is. One player creates a room with a stake and a side. Another player matches the stake and takes the other side. A random flip decides who takes the whole pot. If you want the history and the full rules, read our [CS:GO coinflip guide](/guides/csgo-coinflip).

The site's job is to be a fair referee. It holds both stakes, generates the flip, pays the winner and keeps a fee, if it charges one. It does not bet against you.

That means the differences between CS:GO coinflip sites come down to how well they do that job:

- Is the flip really 50/50, and can you prove it?
- How much does the site keep?
- How are stakes valued and matched?
- How quickly and safely is the winner paid?

The rest of this guide takes those questions one at a time.`,
    },
    {
      id: "odds",
      title: "Check 1: the odds must be exactly 50/50",
      body: `A coin has two sides, so each player should have a 50% chance. That sounds obvious, but the way a site turns a random number into heads or tails matters.

A common mistake is taking a random number and using the remainder after dividing by two in a way that slightly favours one side. Well-built sites use a method called rejection sampling, which throws away the rare values that would cause bias. Our [coin flip odds guide](/guides/coin-flip-odds) explains the maths behind a fair flip.

You should also know that past flips do not affect the next one. Five heads in a row does not make tails more likely. That belief is called the [gambler's fallacy](/guides/gamblers-fallacy), and it catches many coinflip players.

On PVPspinArena, each Coinflip result is produced with HMAC-SHA256 from a server seed committed before the game, and rejection sampling removes any bias.`,
    },
    {
      id: "fees",
      title: "Check 2: how much does the site keep?",
      body: `On a fair flip, the only thing that changes your long-run return is the fee. If two players each stake $10 and the site keeps 5%, the winner receives $19, not $20. Over many flips, that 5% adds up.

Look for the fee on the game page, not buried in the terms. A good site shows exactly what the winner will receive before you join a room.

Some sites add extra charges: deposit fees, withdrawal fees or poor exchange rates when turning skins into site coins. Those are part of the real cost too.

PVPspinArena's house fee is configurable and set to 0% by default, so the winner of a Coinflip receives the full pot. If that ever changes, the fee is shown in the game.`,
    },
    {
      id: "stakes",
      title: "Check 3: how are stakes valued and matched?",
      body: `In the skin era, coinflip rooms were filled with items. The site priced each skin and let an opponent join if their items were "close enough" in value. That created problems:

- Different sites price the same skin differently.
- Prices move while a room is open.
- "Close enough" usually meant one side put in slightly more.

With a stablecoin such as USDC, stakes are exact. If you open a $5 room, your opponent stakes exactly $5. Nobody argues about the value of an item. Our [skin gambling vs crypto guide](/guides/skin-gambling-vs-crypto) compares the two approaches in more detail.

Also check the room rules: minimum and maximum stakes, how long a room stays open, and whether you can cancel it before someone joins.`,
    },
    {
      id: "verify",
      title: "Check 4: can you verify every flip?",
      body: `A coinflip site that asks you to trust its random number generator is asking a lot. The best CS2 coinflip sites let you check each flip yourself.

The usual method is commit and reveal. Before the flip, the site publishes a hash of a secret seed. After the flip, it reveals the seed. You can confirm the seed matches the hash and rerun the formula to get the same side. Our [commit-reveal guide](/guides/commit-reveal-scheme) explains why this stops the site from changing the result.

To check a PVPspinArena flip:

1. Open the room after it finishes and note the round details.
2. Go to the [Fairness page](/fairness) and choose Coinflip.
3. Enter the details. The verifier recomputes the result in your browser.
4. Compare it with what happened in the room.

You can also run the numbers by hand with our [provably fair calculator guide](/guides/provably-fair-calculator).`,
    },
    {
      id: "payouts",
      title: "Check 5: how is the winner paid?",
      body: `The winner should be credited automatically as soon as the flip is decided. Delays, manual reviews of every win or "processing" messages that last for hours are warning signs.

Then check how you get money off the site. Look for published withdrawal limits and clear rules on when a withdrawal needs review. Our [crypto casino withdrawals guide](/guides/crypto-casino-withdrawals) covers what to look for.

On PVPspinArena, the Coinflip winner is credited in the same database step that settles the room, so a win can never be paid twice. Withdrawals to your wallet are automatic, with a $250 daily limit and review for requests over $25.`,
    },
    {
      id: "how-to-play",
      title: "Playing Coinflip on PVPspinArena, step by step",
      body: `If you want to try a crypto coinflip site that passes the checks above, here is how it works on PVPspinArena:

1. **Create a free account.** Sign in with a 6-digit code sent to your email. No password needed.
2. **Verify your wallet and deposit USDC on Base.** Deposits from your verified wallet are credited automatically.
3. **Open the [Coinflip page](/coinflip).** You will see open rooms with their stake and the side still available.
4. **Join a room or create your own.** Choose your stake and side, or match someone else's.
5. **Watch the flip.** The result is decided from a seed committed before the game.
6. **Verify it.** Check the result on the Fairness page if you want to be sure.

Set a budget before you start, and treat each flip as entertainment, not income. Over time, a fair 50/50 game with no fee leaves the average player where they started, and any fee moves them below it.`,
    },
    {
      id: "maths",
      title: "The maths of a coinflip session",
      body: `It helps to see what a session looks like in numbers. This is an illustrative example, not a prediction.

Suppose you play 100 flips at $1 each on a site with a 0% fee. On average you would expect about 50 wins and 50 losses, finishing close to where you started. In practice, your result will usually land somewhere between about 10 flips ahead and 10 flips behind, simply because of normal variation.

Now add a 5% fee. Each win pays $1.90 instead of $2.00. With 50 wins and 50 losses, you get back $95 from the $100 you staked. The fee costs you about $5 per 100 flips, every time, no matter how lucky you feel.

That is why the fee matters more than anything else on a coinflip site. The coin is fair everywhere it is honest. The price is not.

A few more points worth knowing:

- **Stake size does not change the odds.** A $100 flip is still 50/50. It only changes how much you can win or lose.
- **Streaks are normal.** In 100 fair flips, a run of six or seven in a row is quite likely. It does not mean anything is wrong.
- **Doubling up does not help.** Raising your stake after a loss can recover one loss, but a long losing run can wipe out your budget. See our [martingale strategy guide](/guides/martingale-strategy).`,
    },
    {
      id: "skins-to-usdc",
      title: "Moving from skin coinflip to USDC coinflip",
      body: `If you used skin coinflip sites in the CS:GO days, switching to a crypto coinflip site takes a little setup, but only once.

You will need a wallet that supports the Base network, such as MetaMask. Our guide to [adding Base to MetaMask](/guides/add-base-network-metamask) walks through it. Then you need some USDC on Base. Our [how to buy USDC guide](/guides/how-to-buy-usdc) covers the common ways to get it.

After that, the experience is simpler than with skins. There are no trade offers to accept, no trade holds and no arguments about item prices. You deposit from your wallet, play, and withdraw back to the same wallet. Your balance is always a clear dollar figure.`,
    },
    {
      id: "red-flags",
      title: "Red flags on coinflip sites",
      body: `Walk away if you see any of these:

- **Bots or house accounts** that seem to join every room. Ask whether the site ever plays against you.
- **No verifier**, or a verifier that only works for recent flips.
- **Hidden fees** that only show up when you are paid.
- **Winning streak marketing**, such as streamers who never seem to lose.
- **Pressure to top up** after a loss.

Check that online gambling is legal where you live, and never play if you are under 18.`,
    },
  ],
  faqs: [
    { q: "What makes a good CS:GO coinflip site?", a: "Exact 50/50 odds, a clear fee, exact stake matching, a working verifier for every flip and automatic payouts. Everything else is presentation." },
    { q: "Are CS2 coinflip sites rigged?", a: "Some sites in the skin era were caught cheating. You do not have to take any site on trust: pick one that commits to its seed before each flip and lets you verify the result afterwards." },
    { q: "What fee do coinflip sites charge?", a: "It varies. Some take a few percent of each pot. PVPspinArena's default fee is 0%, so the winner receives the full pot." },
    { q: "Can I coinflip with USDC instead of skins?", a: "Yes. Crypto coinflip sites let both players stake an exact dollar amount in a stablecoin such as USDC, which avoids arguments about item prices." },
    { q: "Does a losing streak mean I am due a win?", a: "No. Each flip is independent and stays 50/50. Believing otherwise is the gambler's fallacy." },
  ],
  sources: [
    { label: "RFC 2104 — HMAC: Keyed-Hashing for Message Authentication", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST FIPS 180-4 — Secure Hash Standard (SHA-256)", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
    { label: "Circle — USDC overview", url: "https://www.circle.com/usdc" },
    { label: "NCPG — Responsible gambling resources", url: "https://www.ncpgambling.org/" },
  ],
  related: ["csgo-coinflip", "coin-flip-odds", "provably-fair-calculator", "skin-gambling-vs-crypto", "pvp-gambling"],
  updated: "2026-09-25",
  cta: {
    title: "Flip with exact stakes",
    text: "Create a free account, join a Coinflip room and verify the result yourself.",
    primary: { to: "/auth", label: "Create your free account" },
    secondary: { to: "/coinflip", label: "See open rooms" },
  },
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-jackpot",
  cluster: "CS:GO heritage",
  keyword: "csgo jackpot",
  secondary: ["cs2 jackpot", "csgo jackpot sites", "jackpot gambling", "skin jackpot"],
  title: "CSGO Jackpot Explained: How the Pot Game Works",
  description:
    "How the CSGO jackpot game worked: everyone adds to one pot, your share of the pot is your chance to win, and how provably fair crypto jackpots work today.",
  h1: "CSGO jackpot explained: how the pot game works",
  answer:
    "CSGO jackpot is a player-versus-player pot game from the CS:GO skin era. Every player adds a stake to one shared pot, and the bigger your share of the pot, the bigger your chance to win it. When the timer ends, one winner is drawn at random and takes the whole pot, minus any site fee. Modern versions use crypto stakes and provably fair draws.",
  facts: [
    "Jackpot is player versus player: the pot is made only of players' stakes.",
    "Your chance to win equals your stake divided by the total pot.",
    "In the skin era, stakes were CS:GO items; crypto jackpots use exact dollar stakes.",
    "On PVPspinArena the winner is drawn with HMAC-SHA256 from a server seed committed before the round.",
    "The site keeps only the configured house fee; the default fee on PVPspinArena is 0%.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What was CSGO jackpot?",
      body: `CSGO jackpot was one of the defining games of the Counter-Strike: Global Offensive skin gambling scene. Players deposited weapon skins, cosmetic items that could be traded on Steam, into one shared pot. When the round ended, the site picked one winner, who received every skin in the pot.

The game was simple to explain and exciting to watch. A pot could start with a few small items and grow quickly as more players joined. Streamers would join big pots live, and chat would count down the final seconds as the wheel spun.

What made jackpot different from most casino games is that nobody plays against the house. The pot is just the players' stakes added together. The site runs the timer, draws the winner and may keep a small fee, but it does not win or lose when a player wins.

That player-versus-player design is why jackpot survived long after most skin sites closed. PVPspinArena's [crypto jackpot](/guides/crypto-jackpot) keeps the same format, with dollar stakes funded in USDC or ETH instead of skins. For the wider picture of this kind of play, see our [PvP gambling guide](/guides/pvp-gambling).`,
    },
    {
      id: "how-it-works",
      title: "How a jackpot round works",
      body: `Every jackpot site has its own timings, but the core loop is the same.

1. **The round opens.** A new, empty pot is created. On a provably fair site, the hash of the round's secret seed is published now.
2. **Players join.** Each player adds a stake. Every stake is shown in the pot with its share of the total.
3. **The timer starts.** Once enough players have joined, a countdown begins. Some sites extend the timer when late entries arrive, up to a maximum.
4. **Entries lock.** When the countdown ends, no more stakes are accepted.
5. **The draw.** The site computes the winner from the committed seed and shows it with a wheel animation.
6. **Payout.** The winner is credited with the whole pot, minus any fee. A new round opens.

### Tickets

Many sites describe stakes as tickets. If one ticket equals one cent, a $5.00 stake is 500 tickets. The draw picks one ticket number out of all tickets in the pot, and whoever owns that ticket wins. This makes it easy to see that the chance to win is exactly proportional to the stake.

You can watch a live round, including the countdown and wheel, on the [Jackpot page](/).`,
    },
    {
      id: "odds",
      title: "CSGO jackpot odds explained",
      body: `Jackpot odds are the easiest of any gambling game to calculate. Your chance to win is your stake divided by the total pot.

### Example round

Three players join a pot:

- Player A stakes $10.
- Player B stakes $5.
- Player C stakes $35.

The total pot is $50. The chances are:

- A: 10 ÷ 50 = 20%
- B: 5 ÷ 50 = 10%
- C: 35 ÷ 50 = 70%

### Expected value

With no fee, every player's expected result is zero. For Player A: 20% × $50 − $10 = $0. The same is true for B and C. Bigger stakes do not give a better deal; they buy a bigger chance at the same pot.

### With a fee

If the site kept 5%, the winner would receive $47.50 instead of $50. A's expected result becomes 20% × $47.50 − $10 = −$0.50. The fee is the whole cost of playing. That is why it matters to check the fee before joining, and why PVPspinArena shows its fee openly, with a default of 0%.

### The small player's view

Player B only has a 10% chance, but would receive ten times their stake when winning. Jackpot is high-variance for small stakes: most rounds are lost, and wins are large. Set a [gambling budget](/guides/gambling-budget) with that in mind.`,
    },
    {
      id: "history",
      title: "The rise and fall of skin jackpot sites",
      body: `Skin jackpot sites grew fast from around 2014. Steam's trading system made it easy to move items, and many players already owned skins from in-game drops and cases.

### The problems

- **No proof of fairness.** Many sites never published how the winner was chosen. Players had to trust the operator.
- **Hidden sponsorships.** In 2016, it emerged that some popular promoters had undisclosed links to sites they promoted.
- **Age checks.** Deposits did not require identity or age verification, and underage players were common.
- **Price disputes.** Skin values moved with the Steam market, so the "value" of a pot was always approximate.

### The crackdown

In July 2016, Valve stated that using Steam trading to run gambling businesses broke its terms and began sending cease-and-desist letters. Many jackpot sites closed or changed how deposits worked. Lawsuits and regulator attention followed in several countries.

### What carried over

The jackpot format itself was never the problem. Players liked the shared pot, the visible odds and the social tension of the final seconds. What needed to change was trust: transparent odds, provable draws and clear payments. That is what modern crypto jackpots try to deliver. Since Counter-Strike 2 replaced CS:GO in 2023, many players search for CS2 jackpot instead, but the game is identical.`,
    },
    {
      id: "fair-draw",
      title: "How a provably fair jackpot draw works",
      body: `A provably fair jackpot lets anyone check that the winner was fixed before the draw and was chosen correctly.

### Commit

At the start of each round, PVPspinArena generates a random 32-byte server seed and publishes its SHA-256 hash. The hash proves the seed exists without revealing it.

### Draw

When entries lock, the winning ticket is computed:

- message = \`PVPCasino:jackpot:v1:\` + round number + \`:\` + draw version + \`:\` + counter
- h = HMAC-SHA256(key = server seed, message)
- The first 8 bytes of h become a number r.
- If r falls in the small remainder range that would cause bias, the counter increases and a new h is computed. This is rejection sampling.
- The winning ticket is r mod the total number of tickets.

The player who owns that ticket wins.

### Reveal

After the round settles, the seed is published. Anyone can hash it, compare with the commitment and repeat the calculation.

Because the seed was committed before players joined, the site could not choose it to favour any player. Our [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair) explains the maths, and the [provably fair casino guide](/guides/provably-fair-casino) covers the wider idea.`,
    },
    {
      id: "verify",
      title: "How to verify a jackpot result",
      body: `Checking a finished PVPspinArena jackpot round takes about a minute.

1. **Find the round.** Completed rounds have public audit pages showing the players, stakes, commitment and revealed seed.
2. **Open Fairness.** Go to the [Fairness page](/fairness) and choose the Jackpot tab.
3. **Enter the details.** Enter the round number, the revealed seed and the total pot in tickets, or load them from the round.
4. **Check the commitment.** Your browser hashes the seed with SHA-256 and compares it with the published hash.
5. **Recompute the ticket.** Your browser runs HMAC-SHA256 with rejection sampling and shows the winning ticket number.
6. **Match it to a player.** Tickets are assigned in entry order. Check that the winning ticket falls inside the winner's range.

Everything runs in your browser. You can also repeat it with any independent tool, as shown in our [provably fair calculator guide](/guides/provably-fair-calculator).

### What a match proves

A match proves the winner was fixed by the committed seed and chosen by the published method. It does not check your payout; your wallet history shows that separately.`,
    },
    {
      id: "strategy",
      title: "Is there a jackpot strategy?",
      body: `Players often ask whether timing or stake size can improve their chances. The honest answer is no, not in expected value.

### Joining late

Some players wait until the last seconds to see the pot size. This lets you choose your share, but it does not change the maths. Your expected return is still your stake minus your share of the fee.

### Big stakes

A bigger stake raises your chance to win, but you are also putting more into a pot you will usually share with others. With no fee, the expected result is zero regardless of size. With a fee, bigger stakes lose more on average.

### Small stakes in big pots

A small stake in a big pot has a low chance and a large payout. Over many rounds this averages out the same, but the swings are extreme. You may lose many rounds in a row before one win.

### What actually helps

- Pick one stake size per session.
- Decide how many rounds you will play.
- Check the fee.
- Stop when your session budget is gone.

No timing trick, pattern or predictor beats a provably fair draw, because the seed is secret until after the round.`,
    },
    {
      id: "choosing",
      title: "What to look for in a jackpot site",
      body: `If you compare CSGO jackpot or CS2 jackpot sites today, these checks matter most.

- **Visible odds.** Every player's share of the pot should be shown live.
- **Provably fair with public audits.** Look for a commitment before each round and a way to verify after, ideally with a public record of every past round.
- **A clear fee.** You should know exactly what percentage, if any, the site keeps.
- **Exact stakes.** Dollar or stablecoin stakes avoid the price disputes of skins.
- **Transparent payments.** Check the supported network, deposit confirmations and withdrawal limits. Our [USDC casino guide](/guides/usdc-casino) explains what to expect.
- **Age and location checks.** A responsible site requires you to be of legal age and allowed to gamble where you live.

Avoid sites that promise "guaranteed" wins, offer to sell predictions or do not explain how the winner is chosen.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `CSGO jackpot is a shared-pot game where every player's chance to win equals their share of the pot. It became famous on CS:GO skin sites and lost trust when many of them turned out to be opaque, poorly regulated or connected to their promoters.

The modern crypto version keeps the pot and the visible odds, and fixes the trust problem. Stakes are exact dollar amounts, each round's seed is committed with SHA-256 before anyone joins, and the winning ticket is drawn with HMAC-SHA256 and rejection sampling so anyone can verify it afterwards.

With no fee, every player's expected result is zero; with a fee, the fee is the cost of playing. Play with a fixed budget, verify rounds when you want to, and treat each pot as entertainment.`,
    },
  ],
  faqs: [
    {
      q: "How are CSGO jackpot odds calculated?",
      a: "Your chance to win is your stake divided by the total pot. If you put $10 into a $50 pot, you have a 20% chance to win the whole pot.",
    },
    {
      q: "Is CS2 jackpot the same as CSGO jackpot?",
      a: "Yes. Counter-Strike 2 replaced CS:GO in 2023, so players now often say CS2 jackpot, but the shared-pot game works the same way.",
    },
    {
      q: "Does joining at the last second help?",
      a: "No. It lets you see the pot before choosing a stake, but your expected return is the same. The winner comes from a seed committed before the round.",
    },
    {
      q: "Does the house win jackpot rounds?",
      a: "No. The pot is made only of players' stakes and one player always wins it. The site keeps only its configured fee.",
    },
    {
      q: "Can I check who should have won a PVPspinArena jackpot?",
      a: "Yes. Use the Jackpot tab on the Fairness page with the round's revealed seed. Your browser recomputes the winning ticket and you can match it to the player.",
    },
  ],
  sources: [
    { label: "Valve statement on CS:GO gambling sites (2016)", url: "https://blog.counter-strike.net/index.php/2016/07/15109/" },
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST FIPS 180-4: Secure Hash Standard", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
  ],
  related: ["crypto-jackpot", "csgo-coinflip", "cs2-roulette"],
  updated: "2026-09-25",
};

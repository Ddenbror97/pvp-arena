import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-case-battle-sites",
  cluster: "CS:GO heritage",
  keyword: "csgo case battle sites",
  secondary: ["case battle", "cs2 case battle", "case battle odds"],
  title: "CS:GO Case Battle Sites: Odds, Risks and Alternatives",
  description:
    "How CS:GO case battle sites work: 1v1 and team formats, odds, expected value and hidden house edge, what to check, and fairer PvP alternatives with USDC.",
  h1: "CS:GO case battle sites: how they work and what to check",
  answer:
    "CSGO case battle sites let two or more players pay to open the same virtual cases, and the player whose items are worth the most takes everything. It looks like a pure player duel, but every case already carries a house edge, so the group as a whole loses on average. Before you use any case battle site, check the case odds, the item values and whether you can verify each opening.",
  facts: [
    "In a case battle, players open the same cases and the highest total value wins.",
    "Each case has a built-in house edge, so battles lose money on average.",
    "Common formats are 1v1, 1v1v1, 2v2 and reverse or 'crazy' mode.",
    "Item values are set by the site, not by an independent market.",
    "PVPspinArena has no case battles; its Jackpot and Coinflip are pure PvP.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What is a case battle?",
      body: `A case battle is a competitive version of case opening. In CS:GO and CS2, cases are containers that hold a random skin. Our [CS:GO case opening guide](/guides/csgo-case-opening) explains how the odds inside a case work.

In a case battle, two or more players each pay for the same list of cases. The site opens them one by one, and each player gets their own items. At the end, the total value of each player's items is compared. In the standard format, the player with the highest total takes all the items from the battle.

Case battles became popular because they add a social, head-to-head element to case opening. Instead of opening a case alone, you are racing someone else, and a big pull can swing the whole battle.

Most case battle sites use their own versions of cases with their own item lists and prices, rather than official Valve cases.`,
    },
    {
      id: "formats",
      title: "Common case battle formats",
      body: `Sites use different names, but these formats are the most common:

- **1v1.** Two players, same cases, highest total wins everything.
- **1v1v1 or 1v1v1v1.** Three or four players, one winner.
- **2v2 or team battles.** Two teams; the team with the higher combined value wins and splits the items.
- **Reverse or "crazy" mode.** The lowest total wins instead of the highest.
- **Shared or group mode.** Everyone splits the total equally, which turns the battle into a group case opening.

The format changes who wins, but not how much the group loses on average. That is decided by the cases themselves.`,
    },
    {
      id: "odds",
      title: "Case battle odds and expected value",
      body: `This is the part most case battle players miss. Each case has an expected value: the average value of the item you get, weighted by the odds. On almost every site, a case's expected value is lower than its price. The difference is the [house edge](/guides/house-edge).

Here is an illustrative example. Suppose a case costs $2.00 and its expected value is $1.80, a 10% edge. In a 1v1 battle with five of these cases, each player pays $10.00, so $20.00 goes in. The expected total value of all ten items is $18.00. The winner takes $18.00 on average, but the group has lost $2.00.

So even though you are playing against another person, you are also paying the house on every case. Over many battles, the average player loses the case edge, in the same way they would when opening cases alone.

The variance is also high. Most openings return low-value items, and a single rare item usually decides the battle. That makes results swing much more than in a simple 50/50 game such as [coinflip](/guides/csgo-coinflip).`,
    },
    {
      id: "checklist",
      title: "What to check on any case battle site",
      body: `If you still want to try case battles, check these points first:

### Published odds for every item

A good site shows the exact chance of every item in every case. If odds are hidden or rounded to "rare", you cannot work out the expected value.

### Item prices

Check how the site values each item and whether you can actually sell or withdraw it at that price. An item "worth $50" that you can only swap for site credit is not worth $50.

### Verifiable openings

Each opening should be provably fair: a seed committed before the battle, revealed after, and a public formula you can rerun. Our [provably fair casino guide](/guides/provably-fair-casino) explains the method.

### Bots and house players

Some sites fill empty battle slots with bots. Find out whether a bot is playing, who owns its winnings and whether it uses the same odds.

### Withdrawal rules

Check how you turn items or balance back into something you can use outside the site, including limits and fees.`,
    },
    {
      id: "risks",
      title: "Risks and legal questions",
      body: `Case opening and case battles sit close to loot boxes, which several countries regulate or restrict. Some treat paid loot boxes as gambling; others do not. The rules keep changing, so check what applies where you live.

There are also personal risks. Case battles are fast, bright and loud. A near miss on a rare item can feel like you almost won, which makes it tempting to play "one more". Our [gambler's fallacy guide](/guides/gamblers-fallacy) explains why a string of bad openings does not make a good one more likely.

Set a budget before you start. Our [gambling budget guide](/guides/gambling-budget) shows a simple way to do it. You must be 18 or older, or the legal age where you live if that is higher.`,
    },
    {
      id: "pvp-alternative",
      title: "The PvP alternative: jackpot and coinflip",
      body: `Many people enjoy case battles for the head-to-head feeling. If that is what you like, pure player-versus-player games give you the same competition without the built-in case edge.

- **Jackpot.** Players add stakes to one pot. Your chance of winning is your share of the pot. With no fee, the pot's full value goes to the winner. See our [CS:GO jackpot guide](/guides/csgo-jackpot).
- **Coinflip.** Two players, equal stakes, one fair flip. With no fee, the winner takes the full pot.

In these games the site does not add any hidden value gap: the money that goes in is the money that comes out, minus a stated fee if there is one. Our [PvP gambling guide](/guides/pvp-gambling) explains why this structure is kinder to players over time.`,
    },
    {
      id: "pvpspinarena",
      title: "Where PVPspinArena fits",
      body: `To be clear: PVPspinArena does not offer case opening or case battles. We focus on the player-versus-player formats that made the CS:GO era popular:

- **[Jackpot](/)**: shared pot, chance equal to your share, 0% default fee.
- **[Coinflip](/coinflip)**: 1v1 duel, exact 50/50, 0% default fee.
- **Roulette**: a coloured wheel with a stated edge of about 6.67%.

All stakes are USDC on Base, shown in US dollars, and every result can be checked on the [Fairness page](/fairness). If you like the competition of case battles but want to know exactly what you are paying, create a free account and watch a few live Jackpot rounds first.`,
    },
  ],
  faqs: [
    { q: "What is a case battle?", a: "A case battle is a game where players pay to open the same virtual cases, and the player (or team) whose items are worth the most at the end takes all the items." },
    { q: "Are case battles profitable?", a: "Not on average. Each case usually has an expected value below its price, so the group of players loses that house edge in every battle, even though one player wins." },
    { q: "Are CS:GO case battle sites legal?", a: "It depends on where you live. Some countries regulate loot boxes and case opening as gambling. Check local laws and never play if you are under 18." },
    { q: "How do I check case battle odds?", a: "Look for published odds for every item and multiply each item's chance by its value. Add these up to get the case's expected value, then compare it with the case price." },
    { q: "Does PVPspinArena have case battles?", a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette. Jackpot and Coinflip are pure player-versus-player games with a 0% default fee." },
  ],
  sources: [
    { label: "Counter-Strike 2 — official site", url: "https://www.counter-strike.net/cs2" },
    { label: "UK Gambling Commission — Loot boxes and skins", url: "https://www.gamblingcommission.gov.uk/" },
    { label: "NCPG — Responsible gambling resources", url: "https://www.ncpgambling.org/" },
  ],
  related: ["csgo-case-opening", "house-edge", "pvp-gambling", "csgo-jackpot", "gamblers-fallacy"],
  updated: "2026-09-25",
  cta: {
    title: "Head-to-head, without the case edge",
    text: "Create a free account and try Jackpot or Coinflip, where the pot goes to the players.",
    primary: { to: "/auth", label: "Create your free account" },
    secondary: { to: "/", label: "Watch Jackpot" },
  },
};

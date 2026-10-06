import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-trade-up-calculator",
  cluster: "CS:GO heritage",
  keyword: "cs2 trade up calculator",
  secondary: [
    "cs2 tradeup calculator",
    "trade up contract calculator",
    "cs2 float calculator",
    "trade up ev",
  ],
  title: "CS2 Trade Up Calculator: Odds, Float and EV",
  description:
    "A CS2 trade up calculator: 10-skin odds, post-2025 normalized floats, 5-skin knife contracts, and a worked example you can replay.",
  h1: "CS2 trade up calculator: odds, normalized float and expected value",
  answer:
    "A CS2 trade up calculator turns a filled contract into odds, a predicted float and expected value. For weapons you submit ten skins of one rarity; for knives or gloves you submit five Coverts. Each collection’s share is inputs_from_collection divided by n, then split evenly across that collection’s next-tier finishes. After October 2025 the float is normalized per skin, averaged, then mapped onto the output’s own min and max. The live tool on this page uses that recipe.",
  facts: [
    "Weapon contracts consume 10 skins of one rarity; Covert to knife or gloves consumes 5.",
    "Outcome chance is P = (inputs_from_collection / n) × (1 / outcomes_in_collection).",
    "After October 2025 each input is normalized: (float − min) / (max − min), then those values are averaged.",
    "Wear bands: FN 0–0.07, MW 0.07–0.15, FT 0.15–0.38, WW 0.38–0.45, BS 0.45–1.",
    "Selling the result on the Steam Community Market usually costs about 15% in combined fees.",
  ],
  sections: [
    {
      id: "use-calculator",
      title: "Use the live calculator on this page",
      body: `The CS2 trade up calculator sits on this page — jump to the [live calculator](#calculator). It is the same math as the teaching catalog in our library: ten-skin weapon contracts, five-skin Covert contracts, collection-weighted odds, and the post-October 2025 normalized float. Prices are optional numbers you type. This is not a live Steam feed and PVPspinArena does not execute trade-ups.

### How to fill the slots

1. **Jump to the widget.** Open the [live calculator](#calculator). You will see ten rows for a weapon contract, or five rows if you pick Covert. Default rows start on Dust 2 with float 0.15.
2. **Choose input rarity.** Consumer Grade through Classified uses ten slots and outputs the next colour. Covert switches to five slots and outputs a knife or pair of gloves.
3. **Match StatTrak.** Tick the box only if every input is StatTrak. Mixed StatTrak contracts are invalid in game; the checkbox is a reminder, not a bypass.
4. **Pick a collection per row.** Use “Fill every slot from” to load Dust 2, Inferno, Mirage, Dreams & Nightmares, or Revolution into every row, then change individual rows if you want a mix.
5. **Enter float, skin min and skin max.** Float is the inspect number (0 to 1). Min and max are that finish’s clip from the game files. The wear label next to the float updates as you type.
6. **Add costs if you want EV.** Type what you paid (or would pay) for each input. Then type a sale price on each outcome row. Expected value is probability-weighted sale prices minus input cost.

The three summary tiles show average normalized float, total input cost, and trade up ev. Below them, each possible output lists chance, predicted float, wear name, and a price box. If a collection has no next-tier finish, a gold warning reports the wasted share. Replay the worked example later in this guide by typing the same numbers into those slots.

This article sits in the [CS:GO heritage topic](/guides/topics/csgo-heritage) with the older [CSGO trade up contract](/guides/csgo-trade-up-contract) rules. If you still think in CS:GO terms, start there, then come back to the slots.`,
    },
    {
      id: "odds",
      title: "Ten-skin odds and collection weights",
      body: `A trade up contract calculator does not roll a fresh case. It reads which collections you submitted and how many next-tier finishes each of those collections holds.

Let n be the number of slots (10 for weapons, 5 for Covert). For every collection in the contract:

P(one specific next-tier skin) = (inputs_from_collection / n) × (1 / outcomes_in_collection)

That is the entire odds model. Ten Dust 2 Restricted skins have one Classified finish, so the R8 Revolver | Amber Fade is 100%. Six Dreams & Nightmares Mil-Specs plus four Revolution Mil-Specs split the weight 60/40. Dreams & Nightmares has five Restricted finishes, so each of those five is 0.60 × 0.20 = 12%. Revolution also has five Restricted finishes, so each of those five is 0.40 × 0.20 = 8%. The ten probabilities sum to 100% when every input collection actually has a next tier.

### Wasted weight

Collections with no next-tier skins contribute no outcomes. Those inputs are wasted weight. Dust 2 has no Covert, so a Classified → Covert contract filled only with Dust 2 R8s produces nothing useful. Restricted → Classified is the Dust 2 ceiling. Inferno and Mirage stop at Classified in this catalog too. Dreams & Nightmares and Revolution have Coverts, so they can climb to knives or gloves.

The on-page widget prints that wasted share instead of inventing a fake gold drop. If the outcomes table is empty, mix in a collection that actually has the next colour.`,
    },
    {
      id: "float",
      title: "Post-2025 normalized float",
      body: `A CS2 float calculator for trade-ups is no longer “average the raw numbers.” Valve changed the formula in October 2025. Each input is first stretched across its own min–max clip, then those 0–1 values are averaged, then the average is painted onto the output’s clip.

normalized_i = (float_i − min_i) / (max_i − min_i)

avgNorm = mean of the normalized inputs

outputFloat = outMin + avgNorm × (outMax − outMin)

A 0.08 Factory New on a 0–0.08 Anodized finish is now a mid-range input (normalized 1.0 if it sits on the cap, or 0.5 if it sits in the middle of a 0–0.08 window). The same 0.08 on a 0–1 finish is still a low input (normalized 0.08). Before 2025, both skins fed 0.08 into the average and cheap narrow-range fillers could drag a result toward Factory New. That trick is gone.

### Wear bands

The output float is then labelled with the usual exteriors:

| Wear | Code | Float range |
| --- | --- | --- |
| Factory New | FN | 0.00–0.07 |
| Minimal Wear | MW | 0.07–0.15 |
| Field-Tested | FT | 0.15–0.38 |
| Well-Worn | WW | 0.38–0.45 |
| Battle-Scarred | BS | 0.45–1.00 |

Boundaries match the widget: a float of 0.07 is Minimal Wear, 0.15 is Field-Tested, 0.38 is Well-Worn, 0.45 is Battle-Scarred. Two outcomes from the same contract can land in different wear bands because each output has its own min and max. A 0.23 average on a 0–0.4 Amber Fade is 0.092 (MW). The same average on a 0–1 AK is 0.23 (FT).`,
    },
    {
      id: "knives",
      title: "Five-skin Covert contracts",
      body: `Since October 2025 you can spend five Covert skins for one knife or pair of gloves from a collection represented in the contract. Five StatTrak Coverts yield a StatTrak knife. Five regular Coverts yield a regular knife or regular gloves. You still cannot mix StatTrak with non-StatTrak.

The odds formula does not change. n is 5 instead of 10. If all five Coverts come from Dreams & Nightmares, the whole contract weight sits on that collection’s extraordinary pool. If you split 3 / 2 across Dreams & Nightmares and Revolution, the knife-or-gloves outcomes split 60 / 40.

Dust 2, Inferno and Mirage have empty Covert lists in this catalog. A five-skin Covert contract that only uses those collections wastes 100% of its weight. Use Dreams & Nightmares (AK-47 | Nightwish, MP9 | Starlight Protector) or Revolution (M4A1-S | Emphorosaur-S, P2000 | Wicked Sick) as the Covert inputs if you want the widget to show a gold outcome.

Knife and glove prices move fast. Treat any EV you type as a snapshot, then read [CS2 skin prices](/guides/cs2-skin-prices) before you assume last week’s listing still holds.`,
    },
    {
      id: "example",
      title: "Worked example you can replay",
      body: `Open the [live calculator](#calculator), set rarity to Restricted, leave StatTrak off, and fill the ten slots as follows.

- Slots 1–7: The Dust 2 Collection. Float 0.10, skin min 0.00, skin max 0.40 (P2000 | Amber Fade). Cost $4 each.
- Slots 8–10: The Inferno Collection. Float 0.20, skin min 0.06, skin max 0.80 (M4A4 | Tornado). Cost $6 each.

Input cost is 7 × 4 + 3 × 6 = $46.

### Normalized float

Dust 2 rows: (0.10 − 0) / (0.40 − 0) = 0.25 each.

Inferno rows: (0.20 − 0.06) / (0.80 − 0.06) = 0.14 / 0.74 = 0.1892 each.

avgNorm = (7 × 0.25 + 3 × 0.1892) / 10 = 0.2318.

### Odds and output floats

Dust 2 has one Classified: R8 Revolver | Amber Fade (0–0.40). Chance = (7 / 10) × (1 / 1) = 70%. Output float = 0 + 0.2318 × 0.40 = 0.0927 (Minimal Wear).

Inferno has one Classified: AK-47 | Emerald Pinstripe (0–1). Chance = (3 / 10) × (1 / 1) = 30%. Output float = 0 + 0.2318 × 1 = 0.2318 (Field-Tested).

Type $35 on the R8 row and $90 on the AK row. Gross expected sale value is 0.70 × 35 + 0.30 × 90 = $51.50. Trade up ev before fees is 51.50 − 46 = +$5.50. After a 15% Steam take the same listings net about $29.75 and $76.50, so EV becomes 0.70 × 29.75 + 0.30 × 76.50 − 46 ≈ −$2.23. The contract looked plus-EV until you priced the market cut. That is the usual trap.`,
    },
    {
      id: "ev-fees",
      title: "Expected value and Steam market fees",
      body: `Expected value here is not a promise. It is:

EV = Σ (probability × your sale price) − input cost

The widget uses the prices you type. It does not scrape Steam. If you paste last month’s listings, you will get last month’s fantasy.

Steam’s Community Market charges a Steam transaction fee plus a game publisher fee. Together they are commonly about 15% of the seller amount, with small-listing floors that bite cheap outputs even harder. Steam wallet funds also cannot be withdrawn as cash. For the fee breakdown, use Steam’s own Market FAQ and our [Steam market fees](/guides/steam-market-fees) guide.

### A fair EV checklist

- Price inputs at what you would actually pay today, including any third-party cut you already paid.
- Price outputs at what you could sell today, not at a collector screenshot.
- Subtract about 15% if the sale is on Steam.
- Ignore “I might get the expensive one” as a plan. That is the [gambler’s fallacy](/guides/gamblers-fallacy) wearing a trade-up costume.
- If EV is near zero before fees, it is negative after fees.

Buying the target skin on the market is often cheaper than assembling ten inputs and hoping. Opening cases to farm inputs is worse still; [CS:GO case opening](/guides/csgo-case-opening) already has a large gap between key cost and average drop value.`,
    },
    {
      id: "vs-pvp",
      title: "This is not a trade-up site",
      body: `PVPspinArena does not take your skins, does not run a Trade Up Contract, and does not pay out knives. The calculator exists so the [CS:GO heritage](/guides/topics/csgo-heritage) guides can show the real in-game math. If you want to trade up, you do that in Counter-Strike 2.

What this site does run is cash player-versus-player. On [Jackpot](/) and [Coinflip](/coinflip) you stake USDC on Base against other players. The house does not sit in the pot. The default fee is configurable and starts at 0%. Every round is provably fair.

That is a different product from a trade-up:

- **Trade-up**: you destroy n skins and receive one random next-tier skin. Valve sets the recipe. Steam takes a cut if you sell.
- **PvP here**: you choose a stake in dollars. Another player matches or joins. The result is a commit-reveal draw you can check.

If you came from skin sites, read [skin gambling vs crypto](/guides/skin-gambling-vs-crypto) for why USD on a wallet is a different risk than a pink AK that might be $40 tomorrow. Use the calculator to understand Steam. Use [Coinflip](/coinflip) only if you meant to play a cash game, and only if you are 18 or older.`,
    },
  ],
  faqs: [
    {
      q: "How does a CS2 trade up calculator work out the odds?",
      a: "It counts how many inputs came from each collection, divides by 10 (or 5 for Covert), then splits that share evenly across the next-tier finishes in that collection. Collections with no next tier add wasted weight, not a hidden drop.",
    },
    {
      q: "What is the post-2025 normalized float formula?",
      a: "For each input, (float − min) / (max − min). Average those values. Output float is outMin + average × (outMax − outMin). Raw averaging of inspect floats is the old CS:GO method and is wrong after October 2025.",
    },
    {
      q: "How many skins do you need for a knife or glove trade-up?",
      a: "Five Covert skins. Five StatTrak Coverts return a StatTrak knife. Five regular Coverts return a regular knife or regular gloves from a collection you submitted.",
    },
    {
      q: "Why does Dust 2 stop at Classified in the calculator?",
      a: "The Dust 2 Collection has no Covert finish. Restricted → Classified (R8 Revolver | Amber Fade) is the top of that ladder. Classified inputs from Dust 2 cannot produce a red or a knife.",
    },
    {
      q: "Does PVPspinArena process trade-up contracts?",
      a: "No. The widget is a teaching calculator. Trade-ups happen in CS2. This site’s games are cash PvP such as Jackpot and Coinflip.",
    },
    {
      q: "Should trade up ev include Steam fees?",
      a: "Yes if you plan to sell on the Community Market. Combined fees are about 15%, and wallet funds are not cash. A contract that is plus-EV on list prices is often minus-EV after the cut.",
    },
  ],
  sources: [
    {
      label: "Trade Up Contract — Counter-Strike Wiki",
      url: "https://counterstrike.fandom.com/wiki/Trade_Up_Contract",
    },
    {
      label: "Valve: The Contract’s Out (12 September 2013)",
      url: "https://blog.counter-strike.net/2013/09/7590/",
    },
    {
      label: "Valve: Trade Up Contract allows mixed collections (14 May 2014)",
      url: "https://blog.counter-strike.net/2014/05/9612/",
    },
    {
      label: "Steam Support: Community Market FAQ (fees)",
      url: "https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B",
    },
  ],
  related: ["csgo-trade-up-contract", "cs2-skin-prices", "steam-market-fees", "csgo-case-opening"],
  updated: "2026-09-26",
  howTo: true,
  widget: "cs2-trade-up",
};

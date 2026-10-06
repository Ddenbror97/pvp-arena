import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-case-odds",
  cluster: "CS:GO heritage",
  keyword: "cs2 case odds",
  secondary: [
    "cs2 case drop rates",
    "csgo case odds",
    "knife drop rate cs2",
    "case opening percentages",
  ],
  title: "CS2 Case Odds: Official Drop Rates by Rarity",
  description:
    "CS2 case odds by rarity: Valve's published drop percentages, expected hits in a batch, and why one opening is not those odds.",
  h1: "CS2 case odds: official drop percentages by rarity",
  answer:
    "CS2 case odds are the published chances of each rarity when you open an official weapon case. Valve’s China disclosure in 2017 — still the figures people use for CS2 — is about 79.92% Mil-Spec, 15.98% Restricted, 3.20% Classified, 0.64% Covert and 0.26% rare special items (knives or gloves). Those are long-run rates, not a promise for your next key.",
  facts: [
    "The widely cited rarity ladder was published for China in 2017 by Perfect World / Valve: 79.92 / 15.98 / 3.20 / 0.64 / 0.26%.",
    "The 0.26% rare-special line is the knife or glove tier, not a named knife inside the case.",
    "Expected count in a batch is openings × drop rate; it is an average, not a schedule.",
    "Each opening is independent: a long dry spell does not raise the next knife chance.",
    "Third-party case sites set their own percentages; they are not these official CS2 case odds.",
  ],
  sections: [
    {
      id: "calculator",
      title: "How to use the live drop-rate calculator",
      body: `The live calculator is at the [top of this page](#calculator). It applies Valve’s published rarity ladder to a batch size you choose. It does not open a case and it does not pick a named skin.

### Steps

1. Jump to [#calculator](#calculator).
2. Enter how many official openings you want to model, for example 10 or 100.
3. Optionally enter a case-plus-key cost so you can see spend next to expected hits.
4. Read the expected count column: that is openings × each published rate.

The widget is a batch average. Ten openings do not “owe” you 0.026 knives. How keys, cases and wear work is not this page; that walkthrough is [CS:GO case opening](/guides/csgo-case-opening).

This site is 18+. PVPspinArena does not sell cases or keys. It is crypto PvP — Jackpot, Coinflip, Roulette — with USDC or ETH on Base.`,
    },
    {
      id: "published-rates",
      title: "Official CS2 and CS:GO drop percentages",
      body: `For years the rarity ladder was inferred from huge samples. In September 2017, after China required loot-box disclosure, Perfect World published the official case rates on the CS:GO China site. The rounded figures the west still quotes as **cs2 case drop rates** (and older **csgo case odds**) are:

| Rarity | Colour | Published rate | 1 in … |
| --- | --- | --- | --- |
| Mil-Spec | Blue | 79.92% | ~1.25 |
| Restricted | Purple | 15.98% | ~6.3 |
| Classified | Pink | 3.20% | ~31 |
| Covert | Red | 0.64% | ~156 |
| Rare special | Gold | 0.26% | ~385 |

The China table used slightly longer decimals (79.923%, 15.985%, 3.197%, 0.639%, 0.256%). Rounding to two decimals is what most English write-ups use, including the calculator on this page.

Those five rates add to 100%. If an overlay’s colours add to 102% or omit gold, it is not this disclosure. The 2017 notice also said items that share a quality share a rate, and that StatTrak (where it exists) is about one in ten inside that item. StatTrak is a modifier on a rarity, not a sixth colour.

### What the table is not

- It is not the chance of one named rifle inside a tier. Skins that share a rarity share that tier’s rate.
- It is not StatTrak. The same disclosure put StatTrak at about 1 in 10 on items that have a StatTrak version.
- It is not souvenir packages, sticker capsules or a site’s “custom case.”

If a stream overlay shows different gold odds, it is not this official ladder.`,
    },
    {
      id: "expected-batch",
      title: "Expected hits in a batch, not a promise",
      body: `Expected count = openings × published rate. That is the only formula the calculator uses.

### Worked batch of 100 official openings

| Rarity | Rate | Expected in 100 |
| --- | --- | --- |
| Mil-Spec | 0.7992 | 79.92 |
| Restricted | 0.1598 | 15.98 |
| Classified | 0.0320 | 3.20 |
| Covert | 0.0064 | 0.64 |
| Rare special | 0.0026 | 0.26 |

In 1,000 openings the same rates scale to about 799 / 160 / 32 / 6.4 / 2.6. You can type 1000 in the [#calculator](#calculator) and match those cells.

### What “0.64 Coverts in 100” means

Most 100-key sessions will not print exactly 0.64 reds. Some print zero. Some print two. The 0.64 is where a huge number of sessions sits on average. Treating a single weekend as if it must match the table is the mistake this page exists to stop.

Spend is openings × (case + key). The widget shows that product so you can see the cash you put in beside a fractional gold. It does not compute expected item value; prices change and this page stays on percentages. For cost versus typical item value, use the case-opening guide, not this one.

### Zero, one, or two — not 0.26

A fractional expected gold is an average across many people. In 100 independent openings the chance of **zero** rare-specials is (1 − 0.0026)^100 ≈ 0.771, about **77%**. The chance of at least one is about **23%**. Most 100-key batches print no gold. That is the 0.26% line doing its job, not a broken crate. Type 100 in the calculator; the expected column will still say 0.26. Live sessions will mostly say 0.`,
    },
    {
      id: "knife-odds",
      title: "CS2 knife odds: the 0.26% rare-special rate",
      body: `**CS2 knife odds**, as people search them, are not a per-knife table. Official cases publish one gold line: **rare special items at 0.26%**. That line is knives and, in cases that contain them, gloves. The calculator’s last row is that rate.

### Expected knives or gloves per batch

Using 0.26% exactly as 0.0026:

- **Per 100 openings:** 100 × 0.0026 = **0.26** gold items on average.
- **Per 1,000 openings:** 1,000 × 0.0026 = **2.6** gold items on average.
- **Average wait:** 1 / 0.0026 ≈ **385** openings per gold item.

A case with several knives still pays that 0.26% for “any gold,” then picks among the gold pool. Wanting one named blade is a thinner slice of an already thin tier. This page will not pretend a Karambit is 0.26% by itself.

If a case lists ten gold finishes at equal weight inside the tier, a single named knife is about 0.26% / 10 = **0.026%**, roughly 1 in 3,850 openings. That extra division is not on Valve’s published colour table; it is only true if the gold pool is actually equal. We do not publish per-knife tables here because Valve did not. Treat 0.26% as “any gold,” then be honest that your favourite finish is a slice.

### What a dry spell does not do

Zero golds in 200 keys does not raise the next key to “due.” The next opening is still about 0.26% for any rare special. Hundreds of misses are normal at 1 in 385.

### What this section will not do

It will not walk keys, crates, wear or whether opening is “worth it.” That is [CS:GO case opening](/guides/csgo-case-opening). Keep this H2 for the published knife/glove percentage and the 100 / 1,000 expected counts.

Gloves share this gold line in cases that include them. A “knife only” overlay that still quotes 0.26% is mixing the official rare-special rate with a wish. If the case can drop gloves, 0.26% is knives **or** gloves.

PVPspinArena does not sell a knife case. If you want a published chance you can count on a wheel or a pot, that is a different product on [Roulette](/roulette) or Jackpot.`,
    },
    {
      id: "one-opening",
      title: "Why one opening is not those odds",
      body: `A percentage is a long-run frequency. One key is a single draw from that frequency.

### Independence

Each official opening is a new draw. The case does not store a pity timer in the published ladder. After nine blues, the tenth key is still about 79.92% blue.

### Variance in a short session

In 10 openings, expected gold is 0.026. The realistic outcomes are almost always zero golds, occasionally one. Seeing a knife in a clip of ten is luck, not proof the overlay was “2% tonight.”

In 10 openings, expected Classifieds are 0.32. Most people will see zero or one pink. That is the table working, not the table breaking.

### Gambler’s fallacy

“I am owed a red” is the same error as “red is due on a wheel.” Past keys do not pay a debt. If you want that idea in gambling terms, [house edge](/guides/house-edge) is the cost side; this page is only the drop side.

Type a small N and a large N into the calculator back to back. The rates stay still. Only the expected-count column moves. That is the whole lesson.

Covert at 0.64% is the same shape with a shorter wait: about 1 in 156. In 50 openings expected reds are 0.32. Seeing none is ordinary. Seeing two is ordinary. Building a story about “this case is hot tonight” from a clip of twelve keys is not reading CS2 case odds. It is reading a sample that is too small to talk.`,
    },
    {
      id: "not-site-odds",
      title: "Official rates versus a website’s case",
      body: `Third-party “case” pages print their own percentages. Some publish a per-item table. Some do not. None of them are Valve’s 79.92 / 15.98 / 3.20 / 0.64 / 0.26 ladder unless they copied it and actually use it.

### Checks that stay on odds

- Is every item’s rate listed, and do the rates add to 100%?
- Is gold a real 0.26%, or a marketing “rare” without a number?
- Is the item you want one row, or hidden inside a colour?

If the site will not show the table, you do not have CS2 case odds. You have a mystery box.

This guide will not re-teach deposits, keys or trade bots. Official mechanics stay on [CS:GO case opening](/guides/csgo-case-opening). Unverified overlays stay someone else’s problem.

PVPspinArena is not a case site and not a Kick or Twitch house. Rounds you can check live on [Fairness](/fairness). That is a different question than a loot-box percentage, but it is the honest contrast if you came here from a skin lobby.`,
    },
    {
      id: "heritage",
      title: "Where these percentages sit on this site",
      body: `This article is drop percentages only. It belongs with other leftover Counter-Strike economy pages in [CS:GO heritage](/guides/topics/csgo-heritage).

Use it when you need:

- the official rarity ladder in one table
- expected counts for 100 or 1,000 keys
- **cs2 knife odds** as the 0.26% gold line

Use [CS:GO case opening](/guides/csgo-case-opening) when you need keys, wear, expected value or loot-box law. Use [CS2 inventory value](/guides/cs2-inventory-value) when you already have the item and want a price worksheet. Do not open a second “csgo case odds” article on this site; the 2017 ladder is this page.

If you came here to decide whether to buy another key, the percentages will not make that a good bet. They only tell you how rare each colour is. Treat a key as paid entertainment with a known rarity table, or do not buy it.

If a streamer yells a knife rate that is not 0.26% for official gold, they are either talking about a named finish inside the gold pool or they are not talking about official CS2 case odds. Ask which. Then open the calculator and type their batch size. The expected gold cell is the only official number this page will defend.

Adults 18+ only.

Opening one case and betting cases against someone else are different products. [CS2 case battles](/guides/cs2-case-battle) are the second, and the odds of the case still sit underneath.`,
    },
  ],
  faqs: [
    {
      q: "What are the official CS2 case odds?",
      a: "The figures still quoted from Valve’s 2017 China disclosure are about 79.92% Mil-Spec, 15.98% Restricted, 3.20% Classified, 0.64% Covert and 0.26% rare special items.",
    },
    {
      q: "What are CS2 knife odds?",
      a: "Official cases do not publish a per-knife rate. The rare-special (knife or glove) tier is 0.26%, about 1 in 385 openings. Expected golds are 0.26 per 100 keys and 2.6 per 1,000.",
    },
    {
      q: "Do CS:GO case odds still apply in CS2?",
      a: "The same rarity ladder is what English guides still use for official CS2 cases. Souvenirs, capsules and third-party site cases are not this table.",
    },
    {
      q: "Why did I open 50 cases and see only blues?",
      a: "Because about four in five official openings are Mil-Spec. Fifty keys are a short sample. The next key is still about 79.92% blue.",
    },
    {
      q: "Does the calculator tell me if opening is worth it?",
      a: "No. It multiplies published rates by your batch size. Cost versus item value is on the case-opening guide, not here.",
    },
    {
      q: "Are these the odds on PVPspinArena?",
      a: "No. This site does not open CS2 cases. It runs PvP Jackpot, Coinflip and Roulette with crypto on Base.",
    },
  ],
  sources: [
    {
      label: "CS:GO China / Perfect World case probability notice (11 Sep 2017)",
      url: "https://www.csgo.com.cn/news/gamebroad/20170911/206155.shtml",
    },
    {
      label: "PCGamesN: CS:GO loot box odds (2017)",
      url: "https://www.pcgamesn.com/counter-strike-global-offensive/csgo-case-odds",
    },
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
  ],
  related: [
    "pvp-gambling",
    "cs2-trade-up-calculator",
    "csgo-trade-up-contract",
    "csgo-case-opening",
  ],
  updated: "2026-09-26",
  howTo: true,
  widget: "cs2-case-odds",
};

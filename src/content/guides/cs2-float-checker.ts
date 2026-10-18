import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-float-checker",
  cluster: "CS:GO heritage",
  keyword: "cs2 float checker",
  secondary: ["cs2 float value", "what is float cs2", "skin wear checker", "csgo float checker"],
  title: "CS2 Float Checker: Wear Bands from 0 to 1",
  description:
    "A CS2 float checker: paste a 0–1 float, read Factory New through Battle-Scarred, and see how close you are to the next wear band.",
  h1: "CS2 float checker: convert a float into a wear name",
  answer:
    "A CS2 float checker maps a skin’s float value — a number from 0.0000 to 1.0000 — onto the official wear name: Factory New, Minimal Wear, Field-Tested, Well-Worn or Battle-Scarred. Paste the float you already read from an inventory or inspect tool. This page does not decode an inspect link by itself.",
  facts: [
    "Float is a number in [0, 1]. Lower usually looks cleaner; higher usually looks more worn.",
    "Official wear bands: FN 0.00–0.07, MW 0.07–0.15, FT 0.15–0.38, WW 0.38–0.45, BS 0.45–1.00.",
    "A skin’s possible float range can be narrower than 0–1; some finishes never roll Factory New.",
    "An inspect URL is not the float. You still need a value from an inventory API or inspect site.",
    "Wear names affect price; two floats inside the same band can still trade at different asks.",
  ],
  sections: [
    {
      id: "calculator",
      title: "How to use the live float checker",
      body: `The live tool is at the [top of this page](#calculator). One box. Three outputs: wear name, band min–max, and distance to the next band.

### Steps

1. Read the float from your inventory overlay or an inspect site you trust. Write it with four decimals if you have them.
2. Open [#calculator](#calculator) and paste that number.
3. Confirm the wear label matches what CS2 shows in-game.
4. Read “distance to next” if you care about sitting on a cut (for example 0.0699 versus 0.0701).

Out of range values are clamped to 0–1 in the widget. If you pasted 15 because you copied a paint seed, you will get a nonsense Battle-Scarred read. Float is not the pattern index.

This is the same job people still call a **csgo float checker**. CS2 kept the 0–1 scale and the five names. Searches for cs2 float value belong on this page, not on a second tool.

Adults 18+ only. PVPspinArena does not inspect Steam items. It is crypto PvP with USDC or ETH on Base.`,
    },
    {
      id: "wear-bands",
      title: "Wear bands from 0 to 1",
      body: `**What is float CS2?** It is the hidden wear number rolled when the item is created. The game then shows a public name from these official cuts:

| Wear | Abbreviation | Float range |
| --- | --- | --- |
| Factory New | FN | 0.00 up to 0.07 |
| Minimal Wear | MW | 0.07 up to 0.15 |
| Field-Tested | FT | 0.15 up to 0.38 |
| Well-Worn | WW | 0.38 up to 0.45 |
| Battle-Scarred | BS | 0.45 up to 1.00 |

The checker uses the same cuts as our trade-up math: a float **below** 0.07 is FN, **below** 0.15 is MW, and so on. A value sitting exactly on 0.07 is Minimal Wear in that rule.

### Worked reads

- **0.0312** → Factory New. Next band is 0.07. Distance 0.0388.
- **0.1490** → Minimal Wear, 0.0010 under the FT cut. A tiny roll the other way would rename the skin.
- **0.3800** → Well-Worn (not Field-Tested) under a “below 0.38 is FT” rule. Check the widget if you are on the knife edge.
- **0.72** → Battle-Scarred. No next named band; distance shows as a dash.

A **skin wear checker** is this table plus your number. It is not a screenshot filter.

The bands are not equal width. FN is 0.07 wide, MW is 0.08, FT is 0.23, WW is 0.07, BS is 0.55. Most of the 0–1 line is Battle-Scarred. That is why “a random float” is usually a worn-looking skin, and why Factory New screenshots get the attention. The checker will not make a 0.62 look FN. It will name it honestly.`,
    },
    {
      id: "get-float",
      title: "Where the float number actually comes from",
      body: `CS2 will show wear by name in the tooltip. The precise float is not in the inspect link text by itself.

### Honest sources

- In-game or inventory overlays that call Steam’s inventory description.
- Inspect sites that fetch the inspect parameters and print \`wear\` / float.
- A trade-up or listing UI that already exposes the value.

### What to paste

Use the 0–1 value, not a percent. 0.15 is Field-Tested, not “15%.” If a site shows 0.15000000, the extra zeros do not change the band.

### Paint seed and finish

Pattern index (paint seed) is a different integer. It can matter a lot on Case Hardened, Fade or Marble Fade. The float checker will not rank a blue gem. It will only name the wear.

Steam’s own tooltip often hides the decimals. Traders who only trust the word “Field-Tested” then argue about a 0.16 versus a 0.37 as if they were the same listing. They share a name. They do not share a look. Paste both. Read both distances to 0.38.

If you are pricing after you know wear, [CS2 skin prices](/guides/cs2-skin-prices) is the market page. If you are feeding ten inputs into a contract, that is the [CS2 trade-up calculator](/guides/cs2-trade-up-calculator) and the older [trade-up contract](/guides/csgo-trade-up-contract) explainer — not this tool.`,
    },
    {
      id: "next-band",
      title: "Distance to the next wear band",
      body: `Collectors pay for looks and for the label. The label flips on a hard cut. Distance to next is how much float remains before that flip.

### Why a 0.0701 MW can look like a “bad FN”

Visually, 0.0699 and 0.0701 can be close. On the market they are different names. Some buyers filter FN only. Your checker’s job is to tell you which filter you fail.

### Why a “low FT” can beat a “high MW” on looks

Field-Tested starts at 0.15. A 0.1502 FT can look cleaner than a 0.1490 MW on some finishes, or worse on others. The name is a bucket, not a beauty score. Always look at the screenshot; use float to know the bucket.

### Max float on a finish

Many skins cannot roll the full 0–1 range. A finish with max 0.08 can still be FN or MW only. Pasting 0.40 on that skin is not a real drop; it is a hypothetical. The widget will still name 0.40 as Well-Worn because it only sees the number.

Trade-ups output a new float from the ten inputs. Do not use this checker to invent the output; use the trade-up tool, then (if you want) drop that result float here to name it.

A “low float” brag without the finish name is incomplete. 0.01 on a skin that always looks clean is a trophy. 0.01 on a skin whose scratches live in a different map can still look busy. Always pair the number with a screenshot if money is involved. The widget will not render the gun.`,
    },
    {
      id: "price",
      title: "How float shows up in a price, without guessing a bid",
      body: `Wear is one of the first filters on the Community Market and on third-party lists. FN of a popular rifle can be several times a BS of the same name. That does not mean every 0.01 inside FN is a new tier.

### Practical rules

- Price the **name** first (FN vs MW), then look at screenshots inside the band.
- On finishes where scratches land in ugly places, mid-band floats can look worse than the name suggests.
- StatTrak and stickers are separate. The checker does not add them.

[Steam market fees](/guides/steam-market-fees) still take a cut when you sell. A “god float” screenshot is still a Steam-wallet number unless a cash buyer agrees a price.

### Tiny hypothetical, not a live book

| Wear name | Example float | What a buyer filtered |
| --- | --- | --- |
| FN | 0.02 | FN only searches include you |
| FN | 0.069 | Still FN; some buyers still skip “high FN” |
| MW | 0.071 | Dropped out of every FN search |
| FT | 0.18 | The wide middle of the market |
| BS | 0.77 | BS-only or “any cheap copy” filters |

Those rows are labels, not bids. A 0.02 and a 0.069 can be hundreds of dollars apart on a knife and three cents apart on a filler rifle. The checker will not tell you which world you are in.

This page will not quote a dollar for your AK. It will tell you whether you are allowed to write Factory New in the listing title.`,
    },
    {
      id: "not-a-casino",
      title: "Float is not a betting chip",
      body: `Skin lobbies used to flash floats next to deposit values. A 0.00x knife is still an item on someone else’s bot if you send it. Wear does not make a trade hold shorter or a site safer.

If you are valuing a whole backpack, use the [CS2 inventory value](/guides/cs2-inventory-value) adder after you know each wear. If you are comparing skins-as-chips to a dollar token, that is [skin gambling vs crypto](/guides/skin-gambling-vs-crypto).

PVPspinArena will not ingest a float. Balances are USDC or ETH on Base. You can move them from a [wallet](/wallet) you control. The heritage cluster for leftover CS economy pages is [CS:GO heritage](/guides/topics/csgo-heritage). Use one checker for CS2 and leftover CS:GO floats. There is not a second page.

If someone offers a “float unlock” browser extension that wants your Steam login, close it. You only need a number and this box.

18+ only. A cleaner float is not an edge on Jackpot, Coinflip or Roulette.`,
    },
    {
      id: "finish-range",
      title: "When a finish cannot use the full 0–1 line",
      body: `Some paints declare a minimum and maximum float in the game files. A skin that only rolls 0.06–0.80 will never be a 0.01 trophy and will never be a 0.99 wreck. The checker still names whatever number you paste, because it only implements the five public cuts.

### How to use that without lying

- If a database says max 0.08, a paste of 0.40 is a thought experiment, not your drop.
- If min is 0.14, you will never write Factory New on that finish no matter how clean the screenshot looks at 0.1401.
- Trade-up outputs are clamped into the output finish’s min/max. Name the result float after the contract tool gives it to you.

### Worked band versus finish

Imagine a rifle that only exists from 0.15 to 0.45. Every copy is Field-Tested or Well-Worn. Pasting 0.06 will make this widget say Factory New. That label is mathematically true for 0.06 and factually false for that finish. Believe the collection range first.

This is also why two “MW” listings are not twins. One finish’s MW window might be 0.07–0.08 only. Another might use the full 0.07–0.15. The name is shared. The possible floats are not.

Souvenir and StatTrak copies use the same float scale. The checker does not care which. The market does. Put that extra in the listing title after you have the wear name right.

Keep this page on naming. Keep contracts on the trade-up guide. Keep dollars on skin prices and market fees.`,
    },
    {
      id: "checklist",
      title: "A short checklist before you trust the label",
      body: `1. Confirm the number is float, not seed, not a price, not a 0–100 “condition %” from a random overlay.
2. Paste it in [#calculator](#calculator).
3. Match the wear name to the in-game tooltip.
4. If you are on a cut (within ~0.002 of 0.07, 0.15, 0.38 or 0.45), look at the screenshot twice and do not title the listing from memory.
5. If the finish cannot exist in that band, believe the collection’s min/max over a fantasy paste.
6. If you are buying, ask for the float in chat and paste it here before you confirm. “Looks FN” is not a band.

That is the whole checker. It is a unit conversion from a 0–1 float into a wear name, plus the distance to the next official cut.

If two sites disagree on the fourth decimal, believe the inspect payload over a rounded tooltip. Listings that say “0.00x” without digits are marketing. Paste the full value.`,
    },
  ],
  faqs: [
    {
      q: "What is a CS2 float value?",
      a: "A number from 0 to 1 assigned when the skin is created. It decides wear. Lower is usually cleaner. The five public names are Factory New through Battle-Scarred.",
    },
    {
      q: "What are the CS2 wear float ranges?",
      a: "Factory New 0.00–0.07, Minimal Wear 0.07–0.15, Field-Tested 0.15–0.38, Well-Worn 0.38–0.45, Battle-Scarred 0.45–1.00.",
    },
    {
      q: "Can I paste an inspect link into this checker?",
      a: "No. The widget only accepts the 0–1 float. Get that number from an inventory or inspect tool first, then paste it here.",
    },
    {
      q: "Is a CSGO float checker different?",
      a: "No. CS2 kept the same 0–1 scale and the same five wear names. Use this page for both.",
    },
    {
      q: "Does a lower float always sell for more?",
      a: "Often inside a finish, but not as a law. Band cuts, screenshots, pattern and liquidity matter. This tool names the band; it does not price the listing.",
    },
    {
      q: "Does PVPspinArena use float in its games?",
      a: "No. Games here use USDC or ETH on Base. Float is a Counter-Strike item property only.",
    },
  ],
  sources: [
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
    { label: "Counter-Strike Wiki: Wear", url: "https://counterstrike.fandom.com/wiki/Wear" },
    {
      label: "Steam Community Market (inspect listings show wear names)",
      url: "https://steamcommunity.com/market/",
    },
  ],
  related: [
    "pvp-gambling",
    "cs2-inventory-value",
    "cs2-skin-prices",
    "most-expensive-cs2-skins",
    "cs2-knife-prices",
  ],
  updated: "2026-09-26",
  howTo: true,
  widget: "cs2-float",
};

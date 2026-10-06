import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-trade-up-contract",
  cluster: "CS:GO heritage",
  keyword: "csgo trade up contract",
  secondary: [
    "trade up contract csgo",
    "csgo tradeup",
    "trade up 10 skins",
    "cs2 trade up contract",
  ],
  title: "CSGO Trade Up Contract: Rules, Float and Odds",
  description:
    "How the CSGO trade up contract works: ten skins, collection weights, float carry, and how CS2 changed the formula in 2025.",
  h1: "CSGO trade up contract: the ten-skin rule and what CS2 changed",
  answer:
    "A CSGO trade up contract consumes ten skins of one rarity and returns one skin of the next rarity, chosen from the collections you submitted. Odds follow collection weight: each input is 1/10 toward its collection, then the result is uniform among that collection’s next-tier finishes. CS:GO averaged raw floats. CS2, from October 2025, normalizes each float to the skin’s own min and max first, and also lets five Coverts become a knife or gloves. Run the numbers on the CS2 trade up calculator before you confirm in game.",
  facts: [
    "The original Arms Deal Contract (2013) exchanged ten same-collection skins for one higher-tier finish.",
    "From May 2014 you could mix collections; the output comes from one of the collections you put in.",
    "A standard weapon contract still uses ten skins; a CS2 Covert contract uses five.",
    "Output chance is P = (inputs_from_collection / n) × (1 / outcomes_in_collection).",
    "Steam Community Market sales usually lose about 15% to combined Steam and publisher fees.",
  ],
  sections: [
    {
      id: "what",
      title: "What the CSGO trade up contract is",
      body: `The trade up contract CSGO players opened in the inventory started as the Arms Deal Contract in September 2013. Valve’s post “The Contract’s Out” described the first version: exchange ten Arms Deal collection items of identical quality for one item one tier higher. Operation Bravo renamed it the Trade Up Contract and, by May 2014, let you mix collections. The output still had to come from a collection of one of the items you provided.

That ten-skin rule is what people still mean by a csgo tradeup. You pick ten Consumer, Industrial, Mil-Spec, Restricted or Classified finishes of the same colour. You cannot mix rarities. You cannot mix StatTrak with non-StatTrak if you want a StatTrak result. Souvenir and extraordinary (★) items stay out of the weapon ladder. The paper you sign in the inventory is flavour; the math is the ten inputs and the collection list.

### How to run one in game

1. Open your inventory and start the Trade Up Contract.
2. Select ten eligible skins of one rarity (or five Coverts in CS2 — see below).
3. Check that every collection you used actually has a finish one tier up. A collection whose ladder ends here wastes that slot.
4. Read the confirm screen, then submit. The ten inputs are destroyed.
5. Before you click, price the contract on the [CS2 trade up calculator](/guides/cs2-trade-up-calculator). That page is where you run the numbers for this article.

The contract is crafting, not a case. You are not paying a key. You are burning ten items you already own. If those ten items were cheaper to sell than the output is to buy, you did not “beat” the system — you paid a lottery ticket in inventory. The [CS:GO heritage topic](/guides/topics/csgo-heritage) collects the rest of that economy, including [case opening](/guides/csgo-case-opening).`,
    },
    {
      id: "odds",
      title: "Collection weights and the odds formula",
      body: `Players used to argue that “more outputs in a collection made that collection likelier.” The working model, and the one the calculator implements, is simpler.

n = 10 for a weapon contract (n = 5 for a CS2 Covert contract).

P(one specific next-tier skin) = (inputs_from_collection / n) × (1 / outcomes_in_collection)

Each input weighs 1/n toward its own collection. Inside that collection, every next-tier finish shares the weight equally. A collection with one Classified and a collection with five Restricted do not get extra collection-level chance for being “deeper.” They only split their own share more ways.

### Trade up 10 skins: two pictures

All ten Restricted from Dust 2: one Classified exists (R8 Revolver | Amber Fade), so the contract is 100% that R8.

Five Restricted from Dust 2 and five from Mirage: Dust 2 Classified chance 50%, Mirage Classified chance 50% (MP9 | Bulldozer). Same 50/50 if you had used Inferno instead of Mirage, because Inferno also has a single Classified (AK-47 | Emerald Pinstripe).

Six Mil-Specs from Dreams & Nightmares and four from Revolution: Dreams holds five Restricted finishes, Revolution holds five. Each Dreams Restricted is 12%. Each Revolution Restricted is 8%.

If a collection has zero next-tier skins, its inputs add wasted weight and no row. Dust 2 has no Covert, so Classified Dust 2 inputs cannot climb to red.`,
    },
    {
      id: "float",
      title: "Float carry: CS:GO versus the 2025 CS2 formula",
      body: `Wear is not rolled like a case drop. The contract carries float from the inputs to the output. What changed in 2025 is how each input is scaled.

### CS:GO (raw average)

The older method averaged the inspect floats as written, then mapped that average onto the output’s min–max:

outputFloat ≈ outMin + mean(float_i) × (outMax − outMin)

A 0.04 skin on a 0–0.08 clip and a 0.04 skin on a 0–1 clip both contributed 0.04. Narrow-range fillers could pull a result toward Factory New even when those fillers were not “low for their own finish.”

### CS2 after October 2025 (normalized)

Each input is first turned into a position inside its own clip:

normalized_i = (float_i − min_i) / (max_i − min_i)

avgNorm = mean of those normalized values

outputFloat = outMin + avgNorm × (outMax − outMin)

The same 0.04 on a 0–0.08 clip is now 0.50 of that skin’s range. The 0.04 on a 0–1 clip is 0.04. Cheap “low float” fillers lost most of their power. If you want a Factory New output, you now need inputs that are low for their own min and max, not merely small raw numbers.

Wear labels after the output float is known:

| Wear | Code | Float range |
| --- | --- | --- |
| Factory New | FN | 0.00–0.07 |
| Minimal Wear | MW | 0.07–0.15 |
| Field-Tested | FT | 0.15–0.38 |
| Well-Worn | WW | 0.38–0.45 |
| Battle-Scarred | BS | 0.45–1.00 |

A float of 0.07 is MW, 0.15 is FT, 0.38 is WW, 0.45 is BS. Two outputs from one contract can wear differently because each finish has its own clip.`,
    },
    {
      id: "ladder",
      title: "The rarity ladder and collection ceilings",
      body: `A trade up 10 skins contract climbs one colour at a time. CS2 added a five-skin step at the top.

| Input rarity | Skins required | Output |
| --- | --- | --- |
| Consumer Grade | 10 | Industrial Grade |
| Industrial Grade | 10 | Mil-Spec |
| Mil-Spec | 10 | Restricted |
| Restricted | 10 | Classified |
| Classified | 10 | Covert |
| Covert (CS2, Oct 2025) | 5 | Knife or gloves |

Map collections in the teaching catalog do not all climb that far. Dust 2, Inferno and Mirage have no Covert. Restricted → Classified is the ceiling: Dust 2 ends on R8 Revolver | Amber Fade, Inferno on AK-47 | Emerald Pinstripe, Mirage on MP9 | Bulldozer. Dreams & Nightmares and Revolution have Coverts, so they can feed a CS2 knife or glove contract.

That is why “just buy ten cheap Dust 2 pinks and hit a knife” does not work. There is no red in that collection, and a wasted-weight contract does not invent one. Case collections such as Dreams & Nightmares exist because [case opening](/guides/csgo-case-opening) put them there; the contract only rearranges what a collection already contains.

StatTrak is a second ladder. All ten (or all five) inputs must be StatTrak to receive StatTrak. Five regular Coverts can return gloves; five StatTrak Coverts return a StatTrak knife, not gloves.`,
    },
    {
      id: "example",
      title: "Worked numeric example",
      body: `This example is a ten-skin Industrial Inferno contract. Replay it on the [CS2 trade up calculator](/guides/cs2-trade-up-calculator): set rarity to Industrial Grade, fill every slot from The Inferno Collection, float 0.08, min 0.00, max 0.40 (P250 | Franklin).

### Odds

Inferno has two Mil-Spec finishes: Tec-9 | Brass (0–1) and Dual Berettas | Anodized Navy (0–0.08). Ten of ten inputs are Inferno, so each finish is (10 / 10) × (1 / 2) = 50%.

### Float, old versus new

All ten inspect floats are 0.08 on a 0–0.40 clip.

CS:GO raw mean = 0.08.

- Tec-9 | Brass: 0 + 0.08 × 1.00 = 0.0800 (Minimal Wear).
- Dual Berettas | Anodized Navy: 0 + 0.08 × 0.08 = 0.0064 (Factory New).

CS2 normalized: (0.08 − 0) / (0.40 − 0) = 0.20. avgNorm = 0.20.

- Tec-9 | Brass: 0 + 0.20 × 1.00 = 0.2000 (Field-Tested).
- Dual Berettas | Anodized Navy: 0 + 0.20 × 0.08 = 0.0160 (Factory New).

The Anodized pair stays Factory New either way because its whole clip sits under 0.07. The Tec-9 jumps a full wear band. That is the 2025 change in one contract: the same inventory that used to print a 0.08 Brass now prints a 0.20 Brass.

Give the Tec-9 a $12 sale price and the Anodized a $40 sale price, with inputs at $1.50 each ($15 total). Gross EV = 0.50 × 12 + 0.50 × 40 − 15 = $11. After a 15% Steam cut the sale values become about $10.20 and $34.00, and EV falls to 0.50 × 10.20 + 0.50 × 34.00 − 15 = $7.10. Illustrative prices only — check live listings and [Steam market fees](/guides/steam-market-fees) before you copy the contract.`,
    },
    {
      id: "fees",
      title: "Steam fees and why “free money” contracts vanish",
      body: `A CSGO trade up contract has no house edge in the casino sense. Valve is not taking a rake at submit. The tax arrives when you turn the output back into wallet funds.

Steam’s Community Market FAQ documents a Steam transaction fee and a game-specific publisher fee. Together they are the familiar “about 15%” cut, with $0.01 floors that punish cheap listings. Wallet credit is not withdrawable cash. Third-party markets take their own cut and add trade-hold and scam risk.

That is why screenshot EV dies on contact with a listing screen:

- Input prices already include someone else’s fee if you bought them on Steam.
- Output prices on tracking sites are often buyer-pays figures. You receive less.
- Float bands move price. A Field-Tested Brass is not a Factory New Brass.
- A 50/50 between a $12 skin and a $40 skin is not “basically $40.”

If you are hunting a specific finish, buying it is usually cheaper than assembling ten inputs, accepting a coin-flip among several finishes, then paying Steam to sell the one you did not want. [CS2 skin prices](/guides/cs2-skin-prices) move; a contract that was plus-EV last month can be minus-EV today without the formula changing.`,
    },
    {
      id: "cs2-and-pvp",
      title: "The CS2 trade up contract, and what this site is not",
      body: `The CS2 trade up contract keeps the ten-skin weapon ladder and adds the five-Covert knife or glove recipe. Float is normalized. Filler abuse is weaker. Dust 2 still cannot invent a Covert. Those are in-game facts. The place to simulate them is the [CS2 trade up calculator](/guides/cs2-trade-up-calculator), which already has the slots, the catalog and the EV tiles.

PVPspinArena is not a trade-up site. We do not take skins, we do not submit contracts, and we do not pay knives. The calculator is an article widget. The games here are cash PvP: [Jackpot](/) and [Coinflip](/coinflip), staked in USDC on Base, with a configurable fee that defaults to 0% and a result you can check.

Skin-era sites blurred that line. They took your inventory through trade bots and called the pot a “contract.” That model is how [skin gambling vs crypto](/guides/skin-gambling-vs-crypto) started, and it is not what a Trade Up Contract in your CS2 inventory does. One burns ten items for a higher-tier cosmetic. The other is a bet.

Use the contract in CS2 if you want a cosmetic. Use the calculator if you want the odds. Use [Coinflip](/coinflip) only if you intended to play a cash game, and only if you are 18 or older. If you need a break, the [responsible gambling](/responsible-gambling) page is the stop.`,
    },
  ],
  faqs: [
    {
      q: "How does the CSGO trade up contract work?",
      a: "You submit ten skins of one rarity. The game destroys them and returns one skin of the next rarity from a collection you used. Chance is (count from that collection / 10) divided across that collection’s next-tier finishes.",
    },
    {
      q: "Can you mix collections in a trade up?",
      a: "Yes, since May 2014. Each collection’s chance equals its share of the ten (or five) inputs. The output finish is then uniform among that collection’s next-tier skins.",
    },
    {
      q: "What did CS2 change in 2025?",
      a: "Two things. Float is normalized to each skin’s own min and max before averaging. And five Covert skins can return a knife or gloves. The ten-skin weapon ladder is otherwise the same.",
    },
    {
      q: "What is the ten-skin rule?",
      a: "A weapon trade-up always consumes exactly ten skins of the same rarity and StatTrak status. Covert contracts in CS2 are the exception: they consume five.",
    },
    {
      q: "Where do I calculate odds and float before I confirm?",
      a: "Use the CS2 trade up calculator guide. It applies collection weights, the post-2025 float formula, five-skin Covert contracts, and optional expected value.",
    },
    {
      q: "Are trade-ups guaranteed profit?",
      a: "No. The output is random among the next-tier pool, wear can miss the listing you priced, and Steam takes about 15% if you sell on the Community Market.",
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
  related: [
    "cs2-trade-up-calculator",
    "csgo-case-opening",
    "steam-market-fees",
    "skin-gambling-vs-crypto",
  ],
  updated: "2026-09-26",
  howTo: true,
};

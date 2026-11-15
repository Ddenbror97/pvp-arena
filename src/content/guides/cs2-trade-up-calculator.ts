import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-trade-up-calculator",
  cluster: "CS:GO heritage",
  keyword: "cs2 trade up calculator",
  secondary: ["trade up odds", "trade up float", "trade up ev"],
  title: "CS2 Trade Up Calculator: Odds, Floats and Valid Inputs",
  description:
    "Estimate weapon trade-up odds and floats with corrected sample collections. Check input eligibility, enter complete net prices and understand the model limits.",
  h1: "CS2 trade up calculator: validate the inputs before the odds",
  answer:
    "This CS2 trade up calculator estimates weapon outcomes from ten inputs using collection weights and a normalized float model. It contains five sample collections, not every CS2 item. Invalid inputs produce an explanation rather than a partial result. Knife/glove outcomes are not modelled, and prices must be entered by you.",
  facts: [
    "The sample weapon catalogue was checked against Valve-authored item and loot-list data, mirrored by SteamDatabase at the linked revision.",
    "Revolution’s Covert weapons are AK-47 | Head Shot and M4A4 | Temukau; Emphorosaur-S is Restricted.",
    "Valve added five-Covert contracts in October 2025, but the widget does not invent a knife/glove pool or a shared float range.",
    "A mathematical estimate and a confirmed contract in the current CS2 client are different evidence.",
  ],
  sections: [
    {
      id: "scope",
      title: "What the interactive estimate includes",
      body: "The [calculator](#calculator) covers ordinary weapon tiers in the original Dust 2, Inferno and Mirage collections, plus Dreams & Nightmares and Revolution. It is a sample catalogue, not an inventory import or a live marketplace. Collections with similar names, such as a later version of Dust 2, are separate.\n\nCheck the item’s rarity, collection, StatTrak status and actual float range before filling a row. The [trade-up contract guide](/guides/csgo-trade-up-contract) explains the item exchange; the [CS:GO heritage hub](/guides/topics/csgo-heritage) covers the wider item economy.",
    },
    {
      id: "odds",
      title: "Collection-weighted odds in this model",
      body: "For ten valid weapon inputs, the model assigns a collection its input count divided by ten, then divides that share across its next-tier weapons. Seven inputs from collection A and three from B therefore allocate 70% and 30%. If each has three next-tier weapons, each A weapon receives 23.33% and each B weapon 10%.\n\nA collection with no weapon at the next rarity is not a chance to receive nothing. It means the supplied recipe is invalid or unsupported, so no odds are shown. A catalogue missing possible outcomes would also produce misleading odds; do not substitute an abbreviated list for a complete pool.",
    },
    {
      id: "float",
      title: "The normalized float estimate",
      body: "For each row the tool computes (input float − skin minimum) ÷ (skin maximum − skin minimum), averages those normalized values, then maps the average into each output’s range.\n\nThis is the model used by this tool, not a Valve-published guarantee of the current engine’s entire selection algorithm. Supplying an invented range creates an invented estimate. Invalid ranges and floats outside them are rejected rather than silently clamped.",
    },
    {
      id: "example",
      title: "A six-outcome example you can reproduce",
      body: "Select Restricted and leave StatTrak off. Put seven rows in Dreams & Nightmares at float 0.10, minimum 0 and maximum 1, matching G3SG1 | Dream Glade. Put three in Revolution at float 0.20, minimum 0 and maximum 0.80, matching M4A1-S | Emphorosaur-S.\n\nThe normalized average is (7 × 0.10 + 3 × 0.25) ÷ 10 = 0.145. The three Dreams & Nightmares Classified weapons each receive 23.33%; the three Revolution Classified weapons each receive 10%. An output with range 0–0.80 is estimated at 0.116; a 0–1 output at 0.145.\n\nIf the seven rows cost $4 each and the other three $6, total input cost is $46. Those costs are illustrative, not current skin quotes. [CS2 skin prices](/guides/cs2-skin-prices) explains quote differences.",
    },
    {
      id: "gold",
      title: "Five-Covert contracts need a different output pool",
      body: "Valve’s October 2025 update says five regular Covert items can return a regular knife or gloves from a supplied collection; five StatTrak Covert items can return a StatTrak knife. That does not mean every knife and glove shares the same paint range or probability.\n\nSelecting Covert in this widget therefore shows its modelling limit, not a generic gold result with invented precision. Verify the actual contract and eligibility in CS2.",
    },
    {
      id: "value",
      title: "Expected value needs all costs and all net prices",
      body: "The widget withholds EV until every input cost and every output price is filled. Use the amount you expect to receive after selling fees, not an unmatched listing or a Steam Wallet figure you are treating as cash. [Steam market fees](/guides/steam-market-fees) explains the settlement difference.\n\nThis tool does not buy, sell, submit or guarantee a contract. A positive model EV is not a promised profit, especially when quotes or liquidity change. PVPspinArena is independent of Valve; [responsible gambling](/responsible-gambling) provides support when paid play is difficult to control.",
    },
  ],
  faqs: [
    {
      q: "Does the calculator include every CS2 collection?",
      a: "No. It includes five named sample collections and ordinary weapon outcomes. The linked data revision identifies the catalogue source.",
    },
    {
      q: "Why are there no odds for some inputs?",
      a: "Wrong counts, missing input tiers, unsupported StatTrak items, invalid float ranges or missing next-tier weapons invalidate the estimate. That is not a valid contract with a chance to pay nothing.",
    },
    {
      q: "Does it predict which knife I will receive?",
      a: "No. Valve supports five-Covert contracts, but this widget does not model the knife/glove output pools or their individual float ranges.",
    },
    {
      q: "Why is expected value hidden until all prices are entered?",
      a: "A missing price is unknown, not zero. Every outcome and input cost must be supplied to calculate the model’s EV.",
    },
    {
      q: "Are the float and odds estimates guaranteed?",
      a: "No. They depend on the stated model, complete catalogue data and correct inputs. Confirm the recipe in the current CS2 client before any irreversible exchange.",
    },
  ],
  sources: [
    {
      label:
        "Valve-authored CS2 item sets, rarity loot lists and paint ranges (SteamDatabase mirror, pinned revision)",
      url: "https://github.com/SteamDatabase/GameTracking-CS2/blob/6ac247908a83c309b37314fd097c47dc78103746/game/csgo/pak01_dir/scripts/items/items_game.txt",
    },
    {
      label: "Valve: October 22, 2025 Covert contract update",
      url: "https://store.steampowered.com/news/posts/?appids=730&enddate=1762988336&feed=steam_community_announcements",
    },
    {
      label: "Steam Support: Community Market FAQ and fees",
      url: "https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B",
    },
  ],
  related: [
    "csgo-trade-up-contract",
    "cs2-skin-prices",
    "steam-market-fees",
    "cheapest-covert-skins-cs2",
  ],
  updated: "2026-11-15",
  widget: "cs2-trade-up",
};

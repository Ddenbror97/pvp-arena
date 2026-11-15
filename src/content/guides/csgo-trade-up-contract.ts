import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-trade-up-contract",
  cluster: "CS:GO heritage",
  keyword: "csgo trade up contract",
  secondary: ["cs2 trade up contract", "trade up rules", "ten skin contract"],
  title: "CSGO Trade Up Contract: Eligibility and CS2 Changes",
  description:
    "Understand what a trade-up consumes, which collection tiers can advance and what changed in CS2. Check the contract before an irreversible exchange.",
  h1: "CSGO trade up contract: what is consumed and what can return",
  answer:
    "A CSGO trade up contract exchanges ten eligible weapon finishes of one rarity for a higher-tier weapon. In CS2, Valve also added five-Covert contracts for knives or gloves in October 2025. An unsupported input is not a valid contract with a chance to receive nothing: check eligibility and the actual result pool in the client.",
  facts: [
    "Valve introduced the contract as an exchange of owned items, not a purchase from this website.",
    "CS2’s five regular Covert recipe and five StatTrak Covert recipe have different stated result types.",
    "A collection must have an eligible result pool; not every weapon collection reaches Covert.",
    "Contract results and later market sale proceeds are separate transactions.",
  ],
  sections: [
    {
      id: "inventory",
      title: "What the confirmation actually exchanges",
      body: "The contract consumes the items submitted. It does not hold them as a refundable stake while you preview a result. Verify every finish, collection and quality on the confirmation screen, including whether an item you wanted to keep is among the inputs.\n\nA [CS2 trade-up calculator](/guides/cs2-trade-up-calculator) is an estimate, not the submission screen. Use the [CS:GO heritage guides](/guides/topics/csgo-heritage) for the surrounding item-market terminology.",
    },
    {
      id: "tiers",
      title: "Do not invent a missing tier",
      body: "The sample game data shows the original Dust 2 collection reaching Classified, while the original Mirage collection stops at Restricted. These are not the later collections with similar map names. If a selected collection lacks the required next-tier weapon, changing a price or adding more copies does not create one.\n\nDreams & Nightmares and Revolution contain Covert weapons, but their names and tiers must be matched correctly. Rarity is not a generic colour you can assign to any skin. [Cheapest Covert skins](/guides/cheapest-covert-skins-cs2) discusses identifying the relevant market category.",
    },
    {
      id: "changes",
      title: "What Valve added in CS2",
      body: "Valve’s October 22, 2025 update says five regular Covert items can be exchanged for a regular knife or gloves from a supplied collection. Five StatTrak Covert items can be exchanged for a StatTrak knife. That is a separate recipe from an ordinary ten-weapon upgrade.\n\nIt does not establish a universal knife float range, a guaranteed valuable finish or the exact odds of every possible gold item. The calculator linked here deliberately withholds an unsupported gold estimate rather than inventing one.",
    },
    {
      id: "cost",
      title: "A valuable-looking result is not realised profit",
      body: "Suppose inputs cost $25 and the resulting item is advertised at $28. That $3 difference is not money you have received. A listing may remain unmatched, the selling venue may charge fees, and the proceeds may be Steam Wallet credit rather than withdrawable cash.\n\nUse the amount actually received after fees when comparing acquisition and sale. [Steam market fees](/guides/steam-market-fees) and [CS2 skin prices](/guides/cs2-skin-prices) explain those distinctions. These figures are hypothetical, not current prices or a recommended contract.",
    },
    {
      id: "limits",
      title: "What can be checked before you confirm",
      body: "Check the number of eligible inputs, their actual tiers and collections, quality restrictions, float data and the output information available in the current client. Stop if a website’s named skin or tier disagrees with the game.\n\nPVPspinArena does not process Valve contracts, sell skins or retrieve items after an exchange. [Responsible gambling](/responsible-gambling) offers help when paying for random outcomes is becoming difficult to control.",
    },
  ],
  faqs: [
    {
      q: "Does every trade-up require ten items?",
      a: "Ordinary weapon upgrades use ten eligible inputs. Valve’s later CS2 Covert recipe uses five items and has different result types.",
    },
    {
      q: "Can original Mirage inputs always upgrade to a Covert?",
      a: "No. The original collection’s weapon ladder does not contain every rarity. Do not confuse it with a later Mirage collection.",
    },
    {
      q: "Does an invalid input create a chance to receive nothing?",
      a: "No. That is an eligibility problem, not a legitimate zero-result outcome to include in a probability table.",
    },
    {
      q: "Does a calculator execute a contract?",
      a: "No. A calculator estimates from its data and assumptions. The exchange must be checked and confirmed in the actual game.",
    },
  ],
  sources: [
    {
      label: "Valve: The Contract’s Out, original contract announcement",
      url: "https://blog.counter-strike.net/2013/09/7590/",
    },
    {
      label: "Valve: October 22, 2025 Covert contract update",
      url: "https://store.steampowered.com/news/posts/?appids=730&enddate=1762988336&feed=steam_community_announcements",
    },
    {
      label: "Valve-authored item sets and loot tiers (SteamDatabase mirror, pinned revision)",
      url: "https://github.com/SteamDatabase/GameTracking-CS2/blob/6ac247908a83c309b37314fd097c47dc78103746/game/csgo/pak01_dir/scripts/items/items_game.txt",
    },
  ],
  related: [
    "cs2-trade-up-calculator",
    "cheapest-covert-skins-cs2",
    "steam-market-fees",
    "cs2-skin-prices",
  ],
  updated: "2026-11-15",
};

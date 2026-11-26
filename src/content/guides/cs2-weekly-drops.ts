import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-weekly-drops",
  cluster: "CS:GO heritage",
  keyword: "cs2 weekly drops",
  secondary: ["weekly care package", "cs2 free drops", "prime drops"],
  title: "CS2 Weekly Drops: Eligibility, Choices and Claiming",
  description:
    "Learn how CS2’s Weekly Care Package relates to Prime and XP ranks, what reward selections cost, when unclaimed rewards expire and why a case still needs a key.",
  h1: "CS2 weekly drops: check eligibility and each reward’s cost",
  answer:
    "CS2 weekly drops are offered through the Weekly Care Package. Eligible Prime players earn a package through the qualifying XP rank increase. The client shows reward choices and their selection cost; some options consume both available selections. Claiming a weapon case is separate from opening it, and a displayed reward is not a cash payment.",
  facts: [
    "Prime eligibility, profile XP rank and competitive rating are different systems.",
    "Valve’s UI text explicitly includes an option that consumes both reward selections; not every claim must be two separate items.",
    "The UI says unclaimed rewards can be redeemed later in the store, but are lost if new rewards are earned before the old ones are redeemed.",
    "A case-opening requirement is separate from the package that awarded the case.",
  ],
  sections: [
    {
      id: "eligibility",
      title: "Qualifying XP is not a competitive rank",
      body: `Valve’s client text identifies Prime eligibility for XP and weekly rewards, then tells eligible players to earn an XP rank for a Care Package. That is a profile progression event, not a Premier rating threshold or a promise based on match wins. Read the current progress and weekly eligibility notice in the client.

A [free CS2 skins](/guides/free-cs2-skins) claim from a third-party site is a separate proposition. The [CS:GO heritage hub](/guides/topics/csgo-heritage) distinguishes the official item systems from external services.`,
    },
    {
      id: "choices",
      title: "Read selection cost before claiming",
      body: `Do not assume every offered reward costs one selection. The current UI text includes a warning for an untradable option that consumes both rewards. Compare the item, its tradability and the displayed selection cost before confirming.

Two available selections therefore do not necessarily mean two separate items. Read the current client’s offers; item pools and presentation can change with updates.`,
    },
    {
      id: "later",
      title: "Unclaimed rewards can be stored—but not indefinitely",
      body: `The client says rewards can be redeemed later through the store. It also warns that unredeemed rewards are lost if you earn new ones first. That is different from claiming that profile XP itself vanishes at the weekly reset.

Check the current rollover and claim notices before assuming an old package will accumulate alongside a new one. Do not confuse this claim flow with [Armory rewards](/guides/cs2-armory-pass), which have their own conditions.`,
    },
    {
      id: "case",
      title: "Receiving a case does not open it",
      body: `Valve’s case-reward UI warns that opening requires a purchased key. A claimed case and a result inside an opened case are separate inventory events; the package itself does not promise the case’s rarest item.

[CS2 case odds](/guides/cs2-case-odds) explains the separate outcome question. You do not need to buy a key merely because you received a case.`,
    },
    {
      id: "pool",
      title: "A dated pool update is not a permanent drop list",
      body: `Valve’s January 21, 2026 announcement introduced new Care Package collections. That is evidence that the pool can change, not a complete current inventory list. Check the actual reward offers and trade restrictions rather than pricing a hoped-for drop from an old article.

If an item can be sold, [Steam market fees](/guides/steam-market-fees) explains why a listed buyer price is not necessarily the amount received. PVPspinArena does not distribute Valve rewards or pay for claiming them. Use [responsible gambling](/responsible-gambling) for support with paid random outcomes.`,
    },
  ],
  faqs: [
    {
      q: "Is a weekly reward tied to Premier rating?",
      a: "The Care Package uses qualifying profile XP progression and eligibility. Premier rating is a different system.",
    },
    {
      q: "Do I always receive two separate items?",
      a: "Not necessarily. Read each option’s selection cost; the UI includes options that consume both selections.",
    },
    {
      q: "Can I redeem the package later?",
      a: "The current client text says rewards can be redeemed later through the store, but warns that old unredeemed rewards are lost when new rewards are earned.",
    },
    {
      q: "Does receiving a case also open it?",
      a: "No. Claiming the case and opening it are separate events. The client states the applicable key requirement.",
    },
  ],
  sources: [
    {
      label:
        "Valve-authored client text: Prime, weekly eligibility, claim costs, storage and key requirement (SteamDatabase mirror, pinned revision)",
      url: "https://github.com/SteamDatabase/GameTracking-CS2/blob/6ac247908a83c309b37314fd097c47dc78103746/game/csgo/pak01_dir/resource/csgo_english.txt",
    },
    {
      label: "Valve: January 21, 2026 Weekly Care Package collection update",
      url: "https://www.counter-strike.net/newsentry/511855214544814488?l=english",
    },
  ],
  related: ["free-cs2-skins", "cs2-armory-pass", "cs2-case-odds", "steam-market-fees"],
  updated: "2026-11-26",
};

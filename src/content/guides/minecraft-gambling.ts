import type { Guide } from "./types";

export const guide: Guide = {
  slug: "minecraft-gambling",
  cluster: "CS:GO heritage",
  keyword: "minecraft gambling",
  secondary: [
    "minecraft casino server",
    "minecraft gambling sites",
    "minecraft crate keys",
    "is gambling allowed on minecraft servers",
  ],
  title: "Minecraft Gambling: Server Casinos, Crates and Rules",
  description:
    "Minecraft gambling explained: server casino plugins, paid crate keys, real-money sites, Mojang's commercial usage rules, and the risks for kids.",
  h1: "Minecraft gambling: server casinos, crate keys and the rules",
  answer:
    "Minecraft gambling covers three different things: casino games played on servers with in-game currency, paid crate keys that give random items, and outside sites that let players stake real money or items. Playing for in-game currency you cannot cash out is usually treated as a game; buying random rewards with real money and anything that pays out real value raise gambling and consumer-protection questions, and many players are children.",
  facts: [
    "Server casino plugins run coin flips, slots and roulette with in-game currency.",
    "Crate keys bought with real money for random items work like loot boxes.",
    "Sites that let players stake real money or tradeable items are gambling sites, licensed or not.",
    "Mojang's usage guidelines let servers run a business within its rules, but not sell items that give a competitive gameplay advantage.",
    "Minecraft's audience includes many children, which is why regulators look closely at paid random rewards.",
  ],
  sections: [
    {
      id: "forms",
      title: "Three kinds of Minecraft gambling",
      body: `1. **Server casinos with in-game money.** Plugins add coin flips, slot machines, roulette and lotteries that use a server's currency (often earned by playing). If that currency cannot be bought or cashed out, it is a game mechanic, much like play-money [free casino games](/guides/free-casino-games). If the currency can be bought with real money, the picture changes.
2. **Crate keys.** Many servers sell keys for real money that open a crate with a random cosmetic, rank or item. That is a paid random reward: the same mechanic as a [loot box](/guides/loot-boxes-and-gambling).
3. **Outside sites.** Some websites let players stake real money, crypto or tradeable items on games themed around Minecraft. Those are gambling sites, and many are unlicensed. The pattern is the same as [Roblox gambling](/guides/roblox-gambling) and the skin sites in the [CS:GO heritage topic](/guides/topics/csgo-heritage).`,
    },
    {
      id: "rules",
      title: "What Mojang's rules say",
      body: `Minecraft servers that make money must follow Mojang's EULA and commercial usage guidelines. In its [commercial usage guidelines update](https://www.minecraft.net/en-us/article/commercial-usage-guidelines-updated) (17 April 2020) Mojang says it is fine to run a business within the rules, and that what a server sells should not be "designed to give someone a competitive gameplay advantage or make another player's experience worse". Later updates added rules on artificial scarcity and crypto. Server owners should read the current guidelines themselves; a server that breaks them can lose access to Minecraft services.

Whether a crate system or casino plugin is lawful also depends on local gambling and consumer law, not only on Mojang's rules.`,
    },
    {
      id: "risk",
      title: "Why it matters: odds, money and age",
      body: `- **Hidden odds.** Crate drop rates are often not shown. Without them you cannot work out what a key is worth on average; [expected value](/guides/expected-value-gambling) shows the calculation when odds are published.
- **Real money in, random value out.** Paying for keys again and again to chase a rare item follows the same pattern as slot play.
- **Children.** Many players are under 18. The FTC's [staff perspective on loot boxes](https://ftc.gov/news-events/press-releases/2020/08/ftc-staff-issue-perspective-paper-video-game-loot-boxes-workshop) highlights spending by children and people prone to compulsive spending. [Underage gambling risks](/guides/underage-gambling-risks) covers warning signs for parents.`,
    },
    {
      id: "parents",
      title: "For parents and server owners",
      body: `**Parents:** check what your child's server sells, use the platform's purchase controls, and talk about crate keys the way you would talk about scratch cards. If a site asks a child to deposit money or items for a chance to win, it is a gambling site.

**Server owners:** publish drop rates for anything sold for real money, keep casino plugins on currency that cannot be bought or cashed out, follow Mojang's guidelines, and check local law before adding anything that pays out real value.

Gambling with real money is for adults only, 18 or the higher age your law sets. This page is not legal advice. PVPspinArena is a real-money site for adults; its games are explained on [how it works](/how-it-works). If spending stops being a fixed, affordable amount, stop and read [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "Is gambling allowed on Minecraft servers?",
      a: "Casino plugins using currency that cannot be bought or cashed out are generally treated as game mechanics. Selling random rewards or paying out real value raises legal questions, and servers must also follow Mojang's commercial usage guidelines.",
    },
    {
      q: "Are Minecraft crate keys gambling?",
      a: "They are paid random rewards, like loot boxes. Whether the law treats them as gambling depends on the country, but the spending risk is the same.",
    },
    {
      q: "What are Minecraft gambling sites?",
      a: "Outside websites that let players stake real money, crypto or items on Minecraft-themed games. They are gambling sites and many are unlicensed.",
    },
    {
      q: "What does Mojang say about server monetization?",
      a: "Its guidelines allow servers to run a business within the rules, but what they sell must not give a competitive gameplay advantage or make other players' experience worse.",
    },
    {
      q: "How can I protect my child?",
      a: "Use purchase controls, check what the server sells, and treat paid crates like any other chance-based purchase. Real-money gambling is for adults only.",
    },
  ],
  sources: [
    {
      label: "Mojang: commercial usage guidelines updated (April 2020)",
      url: "https://www.minecraft.net/en-us/article/commercial-usage-guidelines-updated",
    },
    {
      label: "FTC staff perspective on video game loot boxes (August 2020)",
      url: "https://ftc.gov/news-events/press-releases/2020/08/ftc-staff-issue-perspective-paper-video-game-loot-boxes-workshop",
    },
    { label: "GambleAware", url: "https://www.gambleaware.org/" },
  ],
  related: [
    "loot-boxes-and-gambling",
    "roblox-gambling",
    "fortnite-gambling",
    "underage-gambling-risks",
    "free-casino-games",
  ],
  updated: "2026-11-18",
  cta: {
    title: "For adults: a pot with published odds",
    text: "PVPspinArena is for adults 18+. Jackpot's chance equals stake share, with a 5% fee.",
    primary: { to: "/responsible-gambling", label: "Responsible gambling" },
    secondary: { to: "/guides/loot-boxes-and-gambling", label: "Loot boxes and gambling" },
  },
};

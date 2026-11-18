import type { Guide } from "./types";

export const guide: Guide = {
  slug: "mystery-box-site",
  cluster: "CS:GO heritage",
  keyword: "mystery box site",
  secondary: [
    "mystery box odds",
    "online mystery boxes",
    "are mystery boxes gambling",
    "mystery box expected value",
  ],
  title: "Mystery Box Sites: Odds, Expected Value and Buyback",
  description:
    "How mystery box sites work: published odds, a box's expected value worked out, buyback credit, shipping, and whether boxes count as gambling.",
  h1: "Mystery box sites: odds, expected value and the buyback",
  answer:
    "A mystery box site sells a box at a fixed price that contains one random item from a published list, such as sneakers, electronics or game skins, each with a stated probability. You can usually ship the item or sell it back for site credit. The sum of each item's value times its probability is the box's expected value; on most sites it is below the box price, which is how the site makes money.",
  facts: [
    "You pay a fixed price for one random item from a list of possible prizes.",
    "Expected value = sum of (item value × probability); compare it with the box price.",
    "Buyback offers are usually below the item's resale value and paid in site credit.",
    "Whether boxes are gambling depends on the country and on whether prizes can be cashed out.",
    "The FTC has studied loot boxes and in 2025 settled a $20 million case over loot box practices.",
  ],
  sections: [
    {
      id: "how",
      title: "How mystery box sites work",
      body: `You choose a box (for example "sneaker box, $25"), the site shows the possible items and the odds for each, you pay and an animation reveals your item. Then you choose to:

- **Ship it** to your address, often for a shipping fee, or
- **Sell it back** for credit at a buyback rate, usually a percentage of the site's listed value, which you can spend on more boxes or withdraw if the site allows.

Many sites also run "upgrades" (stake an item for a chance at a better one) and "battles" (several players open the same boxes and the best total takes all). Those are the same mechanics as [CS2 case battles](/guides/cs2-case-battle) and [case opening](/guides/csgo-case-opening), with physical goods instead of skins.`,
    },
    {
      id: "ev",
      title: "Working out a box's expected value",
      body: `Take a $25 box with this published list (values are the site's own):

| Item | Value | Probability | Value × probability |
| --- | --- | --- | --- |
| Rare sneakers | $400 | 1% | $4.00 |
| Headphones | $120 | 4% | $4.80 |
| Hoodie | $45 | 15% | $6.75 |
| Phone case | $10 | 80% | $8.00 |
| **Total** | | 100% | **$23.55** |

The expected value is $23.55 for a $25 box: on average you get back 94% of what you pay, before shipping. And that uses the site's listed values. If the buyback rate is 80% of value, the expected credit is about $18.84, or 75% of the price. The most likely result (80% here) is a $10 phone case.

Check that the probabilities add up to 100% and that the listed values match real resale prices. A box that lists a $400 item at a value no shop would pay is not worth $23.55.`,
    },
    {
      id: "fair",
      title: "Fairness claims",
      body: `Some sites say their openings are "provably fair": they publish a hashed server seed before you open and reveal it afterwards, so you can check the result was not changed. That proves the draw matched the committed seed; it does not prove the odds table or the item values are reasonable. [Provably fair explained](/guides/provably-fair-casino) and [server and client seeds](/guides/server-seed-client-seed) show what a check covers. Look also for who ships the goods, the return policy for damaged items and how long withdrawals of credit take.`,
    },
    {
      id: "legal",
      title: "Are mystery boxes gambling?",
      body: `It depends on where you live. You pay money for a chance at a prize worth more or less than the price, which is the core of gambling in many legal definitions; the open questions are usually whether the prize counts as "money's worth" and whether it can be cashed out. Some countries treat paid random items that can be converted to money as gambling; others regulate them as consumer sales.

In the US, the FTC held a workshop on loot boxes in 2019 and in August 2020 published a [staff perspective](https://ftc.gov/news-events/press-releases/2020/08/ftc-staff-issue-perspective-paper-video-game-loot-boxes-workshop) warning that such mechanics can encourage overspending and hide costs. In January 2025 the FTC and the publisher of Genshin Impact settled a case over loot box marketing and children's privacy for $20 million; the FTC's [complaint](https://www.ftc.gov/system/files/ftc_gov/pdf/cognosphere_complaint.pdf) sets out the alleged practices. [Loot boxes and gambling](/guides/loot-boxes-and-gambling) covers the wider debate, and the [CS:GO heritage topic](/guides/topics/csgo-heritage) the skin-era sites.`,
    },
    {
      id: "before",
      title: "Before you open a box",
      body: `- Read the odds table and calculate the expected value yourself.
- Price the high-value items at a real shop or resale site.
- Find the buyback rate and the shipping cost.
- Check the age limit and whether the site is allowed in your country.
- Set a budget first; boxes are fast, and a run of phone cases is the expected result.

Adults only. This page is not legal advice. PVPspinArena does not sell boxes; its Jackpot pays the whole pot, minus a 5% fee, to one player, with chance equal to stake share, as [how it works](/how-it-works) explains. If spending stops being a fixed, affordable amount, stop and read [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "Are mystery box sites legit?",
      a: "Some ship real goods and publish odds, but the expected value of a box is usually below its price. Check the odds, the item values, the buyback rate and the shipping cost before buying.",
    },
    {
      q: "How do I calculate a mystery box's value?",
      a: "Multiply each item's value by its probability and add the results. In this guide's example, a $25 box has an expected value of $23.55 at the site's listed values.",
    },
    {
      q: "Are mystery boxes gambling?",
      a: "In many places they meet the basic idea of gambling (pay for a chance at a prize), but whether the law treats them as gambling depends on the country and on whether prizes can be cashed out.",
    },
    {
      q: "Is the buyback price fair?",
      a: "Usually it is below resale value and paid as site credit. It is a convenience priced in the site's favour.",
    },
    {
      q: "What does provably fair mean on a box site?",
      a: "That the draw can be checked against a seed committed before opening. It does not make the odds or item values fair.",
    },
  ],
  sources: [
    {
      label: "FTC staff perspective on video game loot boxes (August 2020)",
      url: "https://ftc.gov/news-events/press-releases/2020/08/ftc-staff-issue-perspective-paper-video-game-loot-boxes-workshop",
    },
    {
      label: "FTC complaint against Cognosphere (Genshin Impact)",
      url: "https://www.ftc.gov/system/files/ftc_gov/pdf/cognosphere_complaint.pdf",
    },
    { label: "GambleAware", url: "https://www.gambleaware.org/" },
  ],
  related: [
    "loot-boxes-and-gambling",
    "csgo-case-opening",
    "cs2-case-battle",
    "provably-fair-casino",
    "expected-value-gambling",
  ],
  updated: "2026-11-18",
  cta: {
    title: "One pot, odds you can see",
    text: "In PVPspinArena's Jackpot your chance equals your share of the pot, and the 5% fee is the only cut.",
    primary: { to: "/", label: "Jackpot" },
    secondary: { to: "/guides/expected-value-gambling", label: "Expected value" },
  },
};

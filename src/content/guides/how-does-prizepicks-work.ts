import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-does-prizepicks-work",
  cluster: "Prediction markets",
  keyword: "prizepicks",
  secondary: ["prizepicks payouts", "power play", "flex play", "more or less picks"],
  title: "How PrizePicks Works: Picks, Payouts and Ties",
  description:
    "Learn how PrizePicks Player Picks, Power and Flex lineups settle, why the entry screen controls payouts and how ties, DNPs and event contracts differ.",
  h1: "How does PrizePicks work?",
  answer:
    "PrizePicks offers several products. Player Picks compare athlete statistics with projections and pay according to the submitted lineup’s rules. Power lineups require all picks correct; Flex lineups can have partial-return tiers. Team and Culture Picks are event contracts with separate rules. Review the product and total payout on the details screen before submitting.",
  facts: [
    "The confirmation screen discloses the payout for the specific lineup.",
    "A partial return below the entry fee is still a net loss.",
    "Ties, DNPs and Reboots can change the payout structure.",
    "Combined Player and Team Picks contain separately governed components.",
  ],
  sections: [
    {
      id: "types",
      title: "Power, Flex and event-contract components",
      body: "Power and Flex describe how a Player Pick lineup pays. In the official payout guide reviewed November 26, 2026, standard three-pick Power pays 6x for three correct picks, while three-pick Flex pays 3x for three correct and 1x for two correct. Special projections, correlated combinations and promotions can change these figures. The accepted details screen controls the individual entry.\n\nTeam and Culture Picks are described as event contracts. A combined lineup allocates the entry between components under separate rules. Do not apply a Player Pick payout table to every product in the app.",
    },
    {
      id: "example",
      title: "Calculate return and profit separately",
      body: "At an example 6x total-return multiplier, a $10 successful entry returns $60 and earns $50 profit. A $10 entry returning 1x gives $10 back, for zero profit; a 0.4x return gives $4 back, a $6 net loss. These are original arithmetic examples of the stated multiplier.\n\nFor three independent, equally likely legs at a 6x all-correct payout, break-even requires p cubed = 1/6, so p is about 55.03%. Real legs need not be independent or equally likely. A Flex lineup needs its entire outcome table in the expectation calculation.",
    },
    {
      id: "changes",
      title: "Ties and missing-player rules",
      body: "The official guide distinguishes ties from DNPs and Reboots. They can reduce the effective payout tier, and some lineups become ineligible or refundable after player removal. Read the exact rule instead of assuming every removed leg returns the original stake. Save the accepted projections, lineup type and payout table.\n\nSee [DFS strategy](/guides/dfs-strategy), [Underdog’s formats](/guides/underdog-fantasy-review) and [promotion terms](/guides/prizepicks-promo-code) in the [prediction market topic](/guides/topics/prediction-markets). Eligibility varies by product and location. Set an entry budget with [responsible gambling tools](/responsible-gambling).",
    },
  ],
  faqs: [
    {
      q: "Does 6x mean six times my entry as profit?",
      a: "No. When 6x is total return, a $10 entry returns $60 including the $10 entry amount, for $50 profit.",
    },
    {
      q: "Does a Flex return always mean profit?",
      a: "No. A 1x return breaks even before other costs; a return below 1x loses part of the entry.",
    },
    {
      q: "What happens when a player ties the projection?",
      a: "PrizePicks applies its tie/reversion rules. The outcome depends on the lineup and remaining results; consult the accepted payout terms.",
    },
    {
      q: "Are Team Picks the same as Player Picks?",
      a: "No. PrizePicks identifies Team and Culture Picks as event contracts, separately governed from the Player Pick DFS component.",
    },
  ],
  sources: [
    {
      label: "PrizePicks: payout rules, ties and lineup types",
      url: "https://www.prizepicks.com/help-center/payouts",
    },
  ],
  related: [
    "prop-bets-explained",
    "implied-probability",
    "underdog-fantasy-review",
    "expected-value-gambling",
  ],
  updated: "2026-11-26",
};

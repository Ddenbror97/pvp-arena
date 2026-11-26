import type { Guide } from "./types";

export const guide: Guide = {
  slug: "quinella-bet",
  cluster: "Horse racing",
  keyword: "quinella bet",
  secondary: ["quinella bet odds", "quinella bet payout", "quinella bet explained"],
  title: "Quinella Bet Explained: Either Order and Costs",
  description:
    "A quinella selects the first two horses in either order. Compare exacta boxes, count ticket combinations and understand pool payouts, scratches and ties.",
  h1: "Quinella bet: first and second in either order",
  answer:
    "A quinella bet wins when your two selected horses finish first and second in either order. Selecting horses 3 and 7 covers both 3–7 and 7–3 as one unordered pair. Payouts are calculated from the quinella pool, so a quinella and a two-way exacta box can have different costs and returns even when they cover the same finish orders.",
  facts: [
    "One two-horse quinella covers both orders.",
    "A three-horse quinella box contains three pairs.",
    "An exacta uses ordered combinations and a separate pool.",
    "Scratches and dead heats follow the track’s wager rules.",
  ],
  sections: [
    {
      id: "orders",
      title: "Quinella versus exacta box",
      body: "| Selection | Winning finishes | Combination count |\n| --- | --- | --- |\n| Quinella 3 and 7 | 3–7 or 7–3 | 1 unordered pair |\n| Exacta 3 then 7 | 3–7 only | 1 ordered pair |\n| Exacta box 3 and 7 | 3–7 or 7–3 | 2 ordered pairs |\n\nEqual coverage does not establish equal value: compare base stakes, final pool payoffs and takeout. NYRA defines both wager types and lists their pool takeout on its wagering page. These are track-specific terms. See [exacta betting](/guides/exacta-bet), [trifecta betting](/guides/trifecta-bet) and the [horse racing topic](/guides/topics/horse-racing).",
    },
    {
      id: "cost",
      title: "Count pairs without buying duplicates",
      body: "For n horses, a full quinella box contains n × (n - 1) / 2 pairs. Three horses produce three pairs; four horses produce six. At an illustrative $2 base, a four-horse box costs $12. The reverse order is already covered, so adding 7–3 to a quinella 3–7 is not a new pair.\n\nA key with one horse and three other horses contains three pairs. It still loses if the key horse finishes outside the first two, even if the other selected horses finish first and second.",
    },
    {
      id: "settlement",
      title: "Read the official pool result",
      body: "Quinella dividends come from their own net pool and winning units. A tote estimate before betting closes is not a fixed-odds quote. Check the payoff’s displayed base before scaling it to your stake. [Horse-racing odds](/guides/horse-racing-odds-explained) covers that conversion.\n\nA scratch, dead heat or disqualification can change the result under the track’s rules. Wait for the official result and retain the ticket. Use [responsible gambling limits](/responsible-gambling) to keep the entire box cost within budget.",
    },
  ],
  faqs: [
    {
      q: "Must I pick the order in a quinella?",
      a: "No. Your two horses must finish first and second in either order.",
    },
    {
      q: "Is a quinella the same ticket as an exacta box?",
      a: "No. They can cover the same two orders but use different combinations, base costs and pools.",
    },
    {
      q: "How many pairs are in a four-horse box?",
      a: "Six unordered pairs. At an example $2 base the cost is $12.",
    },
    {
      q: "Is the displayed payoff always for $1?",
      a: "No. Read the posted base and scale the dividend to the stake actually placed.",
    },
  ],
  sources: [
    {
      label: "NYRA: wager definitions, pools and takeout",
      url: "https://www.nyra.com/saratoga/racing/nyra-wagering-info/",
    },
  ],
  related: [
    "exacta-bet",
    "horse-racing-odds-explained",
    "how-to-bet-on-horse-racing",
    "gambling-age-us",
    "pick-6-horse-racing",
  ],
  updated: "2026-11-26",
};

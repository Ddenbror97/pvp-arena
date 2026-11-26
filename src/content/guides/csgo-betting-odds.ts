import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-betting-odds",
  cluster: "Esports betting",
  keyword: "csgo odds",
  secondary: ["cs2 odds", "csgo betting odds", "cs2 map handicap", "csgo series odds"],
  title: "CS:GO and CS2 Betting Odds Explained: Maps and Series",
  description:
    "Read Counter-Strike odds for series, maps, round handicaps and totals, with original price examples and checks for map labels and overtime treatment.",
  h1: "CSGO odds: CS2 maps, series formats and handicaps",
  answer:
    "CSGO odds are bookmaker prices on Counter-Strike matches, now generally played in CS2. Series-winner, map-winner and handicap markets have different settlement requirements. Decimal odds include the returned stake; implied break-even probability is 1 divided by the decimal price. Confirm the series format, map label and overtime rule before comparing two lines.",
  facts: [
    "CS2 replaced CS:GO in 2023; books still label many markets as CSGO odds.",
    "Series, map-winner and handicap lines are different contracts with different void rules.",
    "Implied probability from decimal odds is 1 ÷ D; two-way markets usually sum above 100%.",
    "Round handicaps depend on overtime rules and whether a replayed pistol counts.",
  ],
  sections: [
    {
      id: "scope",
      title: "What this page covers — and what it does not",
      body: "People still search \"csgo odds\" years after the game became CS2. The matches are Counter-Strike 2. The slip language often still says CS:GO. The arithmetic is the same either way: a book posts a price, you convert it, you decide whether the contract is even the one you meant.\n\nAdults 18+ only. No match tips. Teaching numbers are labelled illustrations, not today's Major board. The [how to bet on esports](/guides/how-to-bet-on-esports) sequence still applies: law, shop, market text, conversion, budget. Counter-Strike does not get a shortcut because you have played the maps.\n\nIf a search mixed this page with a skin-betting list, stop. Skin valuation, trade bots and Valve's terms live on [CS2 betting](/guides/cs2-betting). Crypto cashiers on a match book live on [sports betting with crypto](/guides/sports-betting-with-crypto). Here you are only decoding the noun on a CS line.",
    },
    {
      id: "series",
      title: "Series formats: BO1, BO3, BO5",
      body: 'Counter-Strike series are usually best-of-one, best-of-three or best-of-five maps. The format is part of the contract.\n\n- **BO1:** one map decides the match. A single pistol half can swing the ticket. Books often price these with more noise, especially in online qualifiers.\n- **BO3:** most playoff matches. A 2–0 and a 2–1 are different correct-score markets even when the same team wins.\n- **BO5:** grand finals and some Majors. More maps, more live boards, more chances to spend.\n\nA "match winner" is the series. A "map winner" is one map. Those are easy to mix up on a busy live coupon. Confirm the format on the slip before you treat a 1.35 favourite as finished.\n\nIllustration (format only, not a live price): a BO3 moneyline at 1.70 / 2.20 implies about 58.8% and 45.5%, summing to 104.3%. A $20 stake at 1.70 returns $34 if it wins, including stake. That arithmetic is a teaching example. It is not a recommendation. Convert every real ticket the same way on [esports odds explained](/guides/esports-odds-explained) and [implied probability](/guides/implied-probability).',
    },
    {
      id: "maps",
      title: "Named maps versus map-two markets",
      body: 'CS2 has a rotating competitive map pool. Books write two different map products that look similar in a list.\n\n- **Named map winner:** Team A on Mirage, or Team B on Ancient. The veto has to produce that map or the book should void.\n- **Map-N winner:** who wins the second map played, whatever it is.\n- **Map handicap:** +1.5 maps means the underdog can lose 2–1 in a BO3 and still cash the handicap.\n- **Correct map score:** 2–0, 2–1, 3–1, 3–2.\n\nIf the veto never produces the named map, you want the void rule in writing before the first pistol. If the book settles a named-Mirage ticket on a map that was not Mirage, that is a dispute, not a "close enough".\n\nMap winner is not round winner. A team can win the map 13–10 and lose a round-handicap ticket. Read the noun: maps or rounds.\n\nIllustration (veto language, not a live price): "Team A to win Mirage" is void if Mirage is not played. "Team A to win map two" can cash on Inferno if Inferno is the second map played. Those tickets can sit next to each other on a coupon and still be different contracts. Confirm the text before the first pistol, not after a veto you did not watch.\n\nPick-em style map pools on some books — "Team A wins at least one of these three maps" — need a written list and a void rule if the series ends early. If the list is missing, skip it.',
    },
    {
      id: "handicaps",
      title: "Map handicaps and round handicaps",
      body: "Handicaps are head starts. They are not quality ratings.\n\n### Map handicap\n\n+1.5 maps in a BO3: the + side cashes if they win the series or lose 2–1. −1.5 maps: the favourite must win 2–0. In a BO5 the same idea stretches across more maps. Always check whether the book uses 1.5 or 2.5 and whether the series can even reach that score.\n\n### Round handicap\n\nA map played to 13, with overtime in many events, is a different counting problem. +3.5 rounds means the + side can lose the map by three rounds and still cash. Overtime rounds may or may not count. A replayed pistol after a bug may or may not recount. If the market text is silent, skip it.\n\n| Contract (illustration) | What must happen for the + side to cash |\n| --- | --- |\n| BO3 +1.5 maps | Win the series, or lose 2–1 |\n| BO3 −1.5 maps | Win 2–0 |\n| Map +3.5 rounds | Lose the map by 3 rounds or fewer, or win it |\n| Map over 21.5 rounds | Combined rounds exceed 21.5, if OT counts as written |\n\nThose rows are teaching cases. They are not a quote. The [house edge](/guides/house-edge) analogue on a book is overround: add both sides of the handicap if the book posts them.\n\nA second illustration (not a live price): a map handicap +1.5 at 1.72 and −1.5 at 2.18. Implied chances are about 58.1% and 45.9%, summing to 104.0%. A $20 stake at 1.72 returns $34.40 if it wins, including stake. That is the same conversion as a moneyline. The extra work is knowing which scoreboard cashes the +1.5. In a BO3, a 2–1 loss still cashes the plus. A 2–0 loss does not. If you cannot say that out loud, you bought the wrong noun.",
    },
    {
      id: "totals-pistols",
      title: "Totals, pistols and why the noun on the slip matters",
      body: 'Round totals and pistol props are popular because the HUD makes them visible.\n\n- **Total maps** in a series (over 2.5 in a BO3 means the series goes the distance).\n- **Total rounds** on a map or series.\n- **Pistol winner** on a named map or on map N.\n- **First to 6 / first to 13** on some books.\n\nA pistol is one round. It is high variance. It often carries a wider overround than the series winner. That is a vig statement, not a claim that pistols are "dumb". It is also a live-spend magnet. See [live esports betting](/guides/live-esports-betting) if you are clicking every round.\n\nDo not copy skin-era "under 26.5" folklore as if it were a model. If you cannot write why the total is wrong, you do not have a priced bet. You have a story.\n\nFor skin betting, crypto cashiers and legal status, go back to [CS2 betting](/guides/cs2-betting). The product guide covers skin custody and account risks; the examples below focus on match and map prices. If a streamer treats an under-26.5 as folklore, ask them to write the implied percent and the overtime rule. If they cannot, it is a story.',
    },
    {
      id: "compare-titles",
      title: "How CS lines sit next to Valorant and the rest of the cluster",
      body: 'CS2 and Valorant share pistols, round handicaps and named-map language. Overtime rules and round targets still differ. Do not import a Valorant total habit onto a CS2 coupon without reading the text. The [Valorant betting](/guides/valorant-betting) page is that menu. This page stays on CS nouns.\n\nLeague of Legends and Dota 2 use map handicaps in series of games, not rounds to 13. The word "map" means a different clock. If you bounce between titles on one Saturday, re-read the noun every time. The cluster hub is the [esports betting topic](/guides/topics/esports-betting).\n\nWhat does not change is the shop and the conversion. Use the [esports betting sites](/guides/esports-betting-sites) checklist, then convert with [esports odds explained](/guides/esports-odds-explained). A book that "has every CS qualifier" is not automatically a better shop. Thin BO1 cups are where integrity texture and wide juice meet.',
    },
    {
      id: "safer",
      title: "Read the noun, then stop if you need to",
      body: "The useful habit on a CS slip is boring: read whether you bought a series, a named map, a map number, a map handicap or a round handicap. Then convert the price. Then stake from a budget. The [how to bet on esports](/guides/how-to-bet-on-esports) sequence applies here without a Counter-Strike exception.\n\nThin online cups have historically carried more integrity risk than Majors. A wild handicap on a qualifier is more often a stale book or a stand-in you missed than a gift. The [esports match fixing](/guides/esports-match-fixing) page is the integrity lesson. Report credible integrity concerns through the tournament organizer or ESIC; a suspicious odds move alone is not proof of fixing.\n\nIf converting CSGO odds has become a way to stay in the session, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). A map pool is not a reason to skip those tools. Watching a Major with no ticket is still allowed.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "What are CSGO odds if the game is CS2?",
      a: "They are bookmaker prices on Counter-Strike matches. The live title is CS2. Many slips and search pages still say CS:GO. Convert the number the same way.",
    },
    {
      q: "What is the difference between a map handicap and a round handicap?",
      a: "A map handicap is a head start in maps in the series. A round handicap is a head start in rounds on one map. They cash on different scoreboards.",
    },
    {
      q: "Does a named-map bet void if that map is not played?",
      a: "It should if the book wrote a named map. Read the rule before the veto. Map-two winner is a different contract.",
    },
    {
      q: "Where should I read about CS2 betting as a whole?",
      a: "The CS2 betting guide covers the product, skins, legality and risk. The esports betting guide covers the wider market. This page is only maps, series and handicaps.",
    },
    {
      q: "Do overtime rounds count in CS2 totals?",
      a: "Only if the market text says so. If the book is silent, skip the total rather than guessing.",
    },
  ],
  sources: [
    {
      label: "Counter-Strike 2 official site",
      url: "https://www.counter-strike.net/",
    },
    {
      label: "Esports Integrity Commission (ESIC)",
      url: "https://esic.gg/",
    },
    {
      label: "Wikipedia: Odds (implied probability)",
      url: "https://en.wikipedia.org/wiki/Odds#Implied_probabilities",
    },
  ],
  related: [
    "cs2-betting",
    "esports-betting",
    "esports-odds-explained",
    "implied-probability",
    "valorant-betting",
    "how-to-bet-on-esports",
  ],
  updated: "2026-11-26",
};

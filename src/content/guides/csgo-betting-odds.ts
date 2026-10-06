import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgo-betting-odds",
  cluster: "Esports betting",
  keyword: "csgo odds",
  secondary: ["cs2 odds", "csgo betting odds", "cs2 map handicap", "csgo series odds"],
  title: "CSGO Odds Explained: CS2 Maps, Series, Handicaps",
  description:
    "CSGO odds on CS2 matches: how series, maps and handicaps are priced, how to read implied chance, and how this page differs from the CS2 betting guide.",
  h1: "CSGO odds: CS2 maps, series formats and handicaps",
  answer:
    "CSGO odds are bookmaker prices on Counter-Strike matches, now played in Counter-Strike 2. This page teaches how series, maps and handicaps are written on a slip and how to turn a decimal price into implied probability. It does not replace the [CS2 betting](/guides/cs2-betting) product guide or the [esports betting](/guides/esports-betting) overview. Those pages cover skins, legality and the wider market. Here the job is the number on a map line. PVPspinArena does not post CSGO odds.",
  facts: [
    "CS2 replaced CS:GO in 2023; books still label many markets as CSGO odds.",
    "Series, map-winner and handicap lines are different contracts with different void rules.",
    "Implied probability from decimal odds is 1 ÷ D; two-way markets usually sum above 100%.",
    "Round handicaps depend on overtime rules and whether a replayed pistol counts.",
    "PVPspinArena does not price CS2 maps; it runs hashed Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "scope",
      title: "What this page covers — and what it does not",
      body: `People still search "csgo odds" years after the game became CS2. The matches are Counter-Strike 2. The slip language often still says CS:GO. The arithmetic is the same either way: a book posts a price, you convert it, you decide whether the contract is even the one you meant.

This page sits in the [esports betting topic](/guides/topics/esports-betting). It is a numbers and market-text lesson. It is not a second copy of [CS2 betting](/guides/cs2-betting), which already covers match types, skin-era leftovers, legal risk and safer-play habits. It is not a second copy of [esports betting](/guides/esports-betting), which already covers the product, integrity at a high level, and the PvP contrast. Read those first if you want the whole shop. Stay here if you want maps, series and handicaps decoded.

Adults 18+ only. No match tips. Teaching numbers are labelled illustrations, not today's Major board. The [how to bet on esports](/guides/how-to-bet-on-esports) sequence still applies: law, shop, market text, conversion, budget. Counter-Strike does not get a shortcut because you have played the maps.

If a search mixed this page with a skin-betting list, stop. Skin valuation, trade bots and Valve's terms live on [CS2 betting](/guides/cs2-betting). Crypto cashiers on a match book live on [sports betting with crypto](/guides/sports-betting-with-crypto). Here you are only decoding the noun on a CS line.

PVPspinArena is not a CS book. It runs hashed [Jackpot](/) pots, [Coinflip](/coinflip) and Roulette. A Mirage veto does not transfer to a flip.`,
    },
    {
      id: "series",
      title: "Series formats: BO1, BO3, BO5",
      body: `Counter-Strike series are usually best-of-one, best-of-three or best-of-five maps. The format is part of the contract.

- **BO1:** one map decides the match. A single pistol half can swing the ticket. Books often price these with more noise, especially in online qualifiers.
- **BO3:** most playoff matches. A 2–0 and a 2–1 are different correct-score markets even when the same team wins.
- **BO5:** grand finals and some Majors. More maps, more live boards, more chances to spend.

A "match winner" is the series. A "map winner" is one map. Those are easy to mix up on a busy live coupon. Confirm the format on the slip before you treat a 1.35 favourite as finished.

Illustration (format only, not a live price): a BO3 moneyline at 1.70 / 2.20 implies about 58.8% and 45.5%, summing to 104.3%. A $20 stake at 1.70 returns $34 if it wins, including stake. That arithmetic is a teaching example. It is not a recommendation. Convert every real ticket the same way on [esports odds explained](/guides/esports-odds-explained) and [implied probability](/guides/implied-probability).`,
    },
    {
      id: "maps",
      title: "Named maps versus map-two markets",
      body: `CS2 has a rotating competitive map pool. Books write two different map products that look similar in a list.

- **Named map winner:** Team A on Mirage, or Team B on Ancient. The veto has to produce that map or the book should void.
- **Map-N winner:** who wins the second map played, whatever it is.
- **Map handicap:** +1.5 maps means the underdog can lose 2–1 in a BO3 and still cash the handicap.
- **Correct map score:** 2–0, 2–1, 3–1, 3–2.

If the veto never produces the named map, you want the void rule in writing before the first pistol. If the book settles a named-Mirage ticket on a map that was not Mirage, that is a dispute, not a "close enough".

Map winner is not round winner. A team can win the map 13–10 and lose a round-handicap ticket. Read the noun: maps or rounds.

Illustration (veto language, not a live price): "Team A to win Mirage" is void if Mirage is not played. "Team A to win map two" can cash on Inferno if Inferno is the second map played. Those tickets can sit next to each other on a coupon and still be different contracts. Confirm the text before the first pistol, not after a veto you did not watch.

Pick-em style map pools on some books — "Team A wins at least one of these three maps" — need a written list and a void rule if the series ends early. If the list is missing, skip it.`,
    },
    {
      id: "handicaps",
      title: "Map handicaps and round handicaps",
      body: `Handicaps are head starts. They are not quality ratings.

### Map handicap

+1.5 maps in a BO3: the + side cashes if they win the series or lose 2–1. −1.5 maps: the favourite must win 2–0. In a BO5 the same idea stretches across more maps. Always check whether the book uses 1.5 or 2.5 and whether the series can even reach that score.

### Round handicap

A map played to 13, with overtime in many events, is a different counting problem. +3.5 rounds means the + side can lose the map by three rounds and still cash. Overtime rounds may or may not count. A replayed pistol after a bug may or may not recount. If the market text is silent, skip it.

| Contract (illustration) | What must happen for the + side to cash |
| --- | --- |
| BO3 +1.5 maps | Win the series, or lose 2–1 |
| BO3 −1.5 maps | Win 2–0 |
| Map +3.5 rounds | Lose the map by 3 rounds or fewer, or win it |
| Map over 21.5 rounds | Combined rounds exceed 21.5, if OT counts as written |

Those rows are teaching cases. They are not a quote. The [house edge](/guides/house-edge) analogue on a book is overround: add both sides of the handicap if the book posts them.

A second illustration (not a live price): a map handicap +1.5 at 1.72 and −1.5 at 2.18. Implied chances are about 58.1% and 45.9%, summing to 104.0%. A $20 stake at 1.72 returns $34.40 if it wins, including stake. That is the same conversion as a moneyline. The extra work is knowing which scoreboard cashes the +1.5. In a BO3, a 2–1 loss still cashes the plus. A 2–0 loss does not. If you cannot say that out loud, you bought the wrong noun.`,
    },
    {
      id: "totals-pistols",
      title: "Totals, pistols and why the noun on the slip matters",
      body: `Round totals and pistol props are popular because the HUD makes them visible.

- **Total maps** in a series (over 2.5 in a BO3 means the series goes the distance).
- **Total rounds** on a map or series.
- **Pistol winner** on a named map or on map N.
- **First to 6 / first to 13** on some books.

A pistol is one round. It is high variance. It often carries a wider overround than the series winner. That is a vig statement, not a claim that pistols are "dumb". It is also a live-spend magnet. See [live esports betting](/guides/live-esports-betting) if you are clicking every round.

Do not copy skin-era "under 26.5" folklore as if it were a model. If you cannot write why the total is wrong, you do not have a priced bet. You have a story.

For skin betting, crypto cashiers and legal status, go back to [CS2 betting](/guides/cs2-betting). This page will not rebuild that guide. If a streamer treats an under-26.5 as folklore, ask them to write the implied percent and the overtime rule. If they cannot, it is a story.`,
    },
    {
      id: "vs-pvp",
      title: "A CS price versus a hashed PvP payout",
      body: `A CSGO-odds ticket is a contract on an external match. You cannot recompute Inferno from a server seed. Your checks are the book's rules, the price after vig, and whether you can withdraw.

A PvP round on this site is a contract on an internal random result. [Coinflip](/coinflip) with a 0% fee is 50% at decimal 2.00. Jackpot chance is your share of the pot. Check the commit-reveal on the [fairness page](/fairness). Nobody is pricing a mid-round save.

Do not use a hashed pot as a same-game parlay after a lost Ancient. Do not treat a 2.00 colour on Roulette as "the same as even-money CS". The wheel has a published edge. The book has an overround. They are different leaks.`,
    },
    {
      id: "compare-titles",
      title: "How CS lines sit next to Valorant and the rest of the cluster",
      body: `CS2 and Valorant share pistols, round handicaps and named-map language. Overtime rules and round targets still differ. Do not import a Valorant total habit onto a CS2 coupon without reading the text. The [Valorant betting](/guides/valorant-betting) page is that menu. This page stays on CS nouns.

League of Legends and Dota 2 use map handicaps in series of games, not rounds to 13. The word "map" means a different clock. If you bounce between titles on one Saturday, re-read the noun every time. The cluster hub is the [esports betting topic](/guides/topics/esports-betting).

What does not change is the shop and the conversion. Use the [esports betting sites](/guides/esports-betting-sites) checklist, then convert with [esports odds explained](/guides/esports-odds-explained). A book that "has every CS qualifier" is not automatically a better shop. Thin BO1 cups are where integrity texture and wide juice meet.

PVPspinArena still does not post either product. A hashed pot is not a third map. Keep the book and the PvP game in different mental accounts after a lost Ancient.`,
    },
    {
      id: "safer",
      title: "Read the noun, then stop if you need to",
      body: `The useful habit on a CS slip is boring: read whether you bought a series, a named map, a map number, a map handicap or a round handicap. Then convert the price. Then stake from a budget. The [how to bet on esports](/guides/how-to-bet-on-esports) sequence applies here without a Counter-Strike exception.

Thin online cups have historically carried more integrity risk than Majors. A wild handicap on a qualifier is more often a stale book or a stand-in you missed than a gift. The [esports match fixing](/guides/esports-match-fixing) page is the integrity lesson. This page will not teach anyone how to corrupt a map.

If converting CSGO odds has become a way to stay in the session, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). A map pool is not a reason to skip those tools. Watching a Major with no ticket is still allowed.`,
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
      q: "Does PVPspinArena post CSGO odds?",
      a: "No. It is not a sportsbook. It runs hashed Jackpot, Coinflip and Roulette only.",
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
    { label: "Counter-Strike 2 official site", url: "https://www.counter-strike.net/" },
    { label: "Esports Integrity Commission (ESIC)", url: "https://esic.gg/" },
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
  updated: "2026-09-26",
  cta: {
    title: "This site is not a book",
    text: "PVPspinArena runs hashed PvP Jackpot, Coinflip and Roulette. It does not post CSGO odds.",
    primary: { to: "/fairness", label: "Fairness" },
    secondary: { to: "/coinflip", label: "Coinflip" },
  },
};

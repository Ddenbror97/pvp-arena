import type { Guide } from "./types";

export const guide: Guide = {
  slug: "esports-betting",
  cluster: "Esports betting",
  keyword: "esports betting",
  secondary: ["esports odds", "cs2 betting", "lol betting", "esports bookmaker"],
  title: "Esports Betting Guide: Markets, Odds and Integrity",
  description:
    "How esports betting works: markets, implied odds, match integrity, and how it differs from player-versus-player crypto games you can verify.",
  h1: "Esports betting: markets, odds, integrity and PvP alternatives",
  answer:
    "Esports betting means staking money on competitive video-game events. Common markets include series winners, map winners, handicaps, totals and player or objective props. The accepted odds set the payout; the tournament result and sportsbook rules determine whether the selection wins, loses or is void.",
  facts: [
    "Esports betting is sports betting applied to games such as Counter-Strike 2, League of Legends and Dota 2.",
    "Bookmaker odds include a margin, often called the vig or overround, so implied probabilities add up to more than 100%.",
    "The Esports Integrity Commission (ESIC) investigates match-fixing, betting offences and related corruption.",
    "Lower-tier online cups generally have less public information and, historically, more integrity cases than Majors.",
  ],
  sections: [
    {
      id: "what",
      title: "What esports betting actually is",
      body: "Esports betting is a bookmaker market. You pick a side, a map, a total or another published line, and you are paid at the posted odds if that outcome happens. The opponent is the book, not the other bettors sitting next to you. The book earns from the margin built into every price.\n\nThe biggest titles are Counter-Strike 2, League of Legends, Dota 2, Valorant and a rotating set of fighting and sports games. A CS2 moneyline and a LoL betting market look similar on the slip: decimal odds, a stake box, and a live board that moves as the match unfolds. The underlying contest is still a human match with coaches, patches and, sometimes, last-minute stand-ins.\n\nThis guide sits in our [esports betting topic](/guides/topics/esports-betting). Many players first met betting through Counter-Strike. If you specifically want match markets for that title, the [CS2 betting guide](/guides/cs2-betting) goes deeper on maps, handicaps and skin-era leftovers.",
    },
    {
      id: "markets",
      title: "Markets you will see on an esports slip",
      body: "Most books start with the same menu.\n\n- **Match winner (moneyline):** which team wins the series.\n- **Map winner:** which team wins map two, or a named map such as Mirage.\n- **Map or round handicap:** one side starts with a head start, such as +1.5 maps.\n- **Totals:** over or under a number of maps or rounds.\n- **Correct score:** 2–0, 2–1, 3–1 and so on.\n- **Outrights:** who lifts the trophy.\n- **Live / in-play:** prices that update after each pistol or baron.\n\n### Why the menu matters\n\nSimple markets are usually cheaper. A two-way moneyline on a well-covered match often has a tighter overround than a correct-score grid or a first-blood prop. Live boards move fast, which is entertaining and also an easy way to place ten decisions in one map.\n\nLeague of Legends betting adds its own flavour: first blood, first dragon, first baron and kill totals. Those props can be fun if you already watch the game. They are a poor place to start if you only know the team names. The same rule applies to CS2 first-pistol markets: you need a reason beyond a hunch.\n\nIf a market's rules are not written next to the price, skip it. Esports books sometimes settle on official scoreboard data, sometimes on a feed, and sometimes on a house interpretation after a reconnect or a replay. Read the settlement rules before you treat a live price as locked.",
    },
    {
      id: "odds",
      title: "Odds, implied probability and a worked example",
      body: "Decimal odds tell you two things at once: the payout and the book's implied chance.\n\nImplied probability = 1 ÷ decimal odds.\n\n### Worked example\n\nA CS2 best-of-three is priced at 1.70 on Team A and 2.20 on Team B.\n\n- Team A implied chance: 1 ÷ 1.70 ≈ 58.8%.\n- Team B implied chance: 1 ÷ 2.20 ≈ 45.5%.\n- Sum: 104.3%.\n\nThe extra 4.3% over 100% is the overround. It is how the book is paid. In a fair 50/50 market both sides would sit at 2.00. Here, even if you think Team A really is a 58.8% favourite, you are not being paid a fair price; you are being paid the book's price.\n\nA $20 stake on Team A returns $34.00 if they win, including the stake, for a $14.00 profit. A $20 stake on Team B returns $44.00. Those numbers look attractive until you remember that the book needs you to be wrong often enough to cover the overround and then some.\n\nOur [implied probability guide](/guides/implied-probability) is the longer maths lesson. The short version: converting every price you consider into a percentage stops you treating 1.40 favourites as \"nearly free\". They are not. A 1.40 price implies about 71.4% before you even ask whether the book is sharp.",
    },
    {
      id: "integrity",
      title: "Match integrity, information gaps and fixing",
      body: 'Esports is a young professional sport with a long online-cup tail. That mix creates integrity risk that a Saturday Premier League fixture does not.\n\nThe Esports Integrity Commission publishes an anti-corruption code, an open investigations register and a sanctions list. Confirmed cases have included match-fixing and betting offences in Counter-Strike and other titles. Lower-tier events, with smaller prize pools and thinner oversight, have historically produced more of those cases than Majors.\n\n### What that means for a casual bettor\n\n- A result can be wrong for reasons that never appear on the broadcast: a dumped game, a bought map, a roster that agreed to lose a round total.\n- Public information is uneven. A Tier-1 roster change is on Twitter in minutes. A Tier-3 stand-in may not be.\n- Live betting increases the value of insider information, because prices move on every round.\n\nIntegrity risk does not mean every underdog win is fixed. It means you should treat thin markets as entertainment, not as a puzzle you can solve from a stream overlay. If a price looks "too good", the more common explanations are a stale book, a roster leak you missed, or a market the book does not care to sharpen — not a gift.\n\nESIC\'s public registers are the place to start if you want names and dates rather than forum rumours. Books that take integrity seriously will void or limit markets when a tournament is under investigation. That is a feature, not a nuisance.',
    },
    {
      id: "legal",
      title: "Age, law and what a licensed book actually is",
      body: 'There is no global esports-betting licence. In many countries the product is treated like other sports betting and is legal only through licensed operators. In the United States the picture is state by state: some states that allow sports betting also allow esports markets, some restrict which events qualify, and some do not offer the product at all.\n\nYou must be of legal gambling age where you live. Esports audiences skew young, which is why a real bookmaker asks for age checks and why skin-era sites that skipped those checks were a problem. If you are not an adult under local law, this product is not for you.\n\n### Practical checks\n\n- Confirm that esports betting is lawful in your state or country before you deposit.\n- Prefer an operator you can find on a regulator register, not a Telegram tipster with a "VIP group".\n- Read settlement rules, max payouts and the identity checks that will hit you on withdrawal.\n- Ignore anyone who says a crypto wallet makes a banned market legal. It does not.\n\nLicensing does not make you a winner. It gives you a complaint path and a set of advertising and affordability rules the operator is supposed to follow. Unlicensed books can still pay; they can also disappear. Our [how to stop gambling guide](/guides/how-to-stop-gambling) is the right next page if betting is already taking more time or money than you planned.',
    },
    {
      id: "safer",
      title: "Using esports markets without lying to yourself",
      body: "Most people who bet on esports lose money over a season. The margin guarantees that as a group. A few sharp bettors find value; books limit them. If you are betting as a fan, the honest frame is paid entertainment around matches you would watch anyway.\n\n- Set a budget before the event, not after the first lost map.\n- Stick to markets you can explain in one sentence.\n- Convert odds to implied probability before you click.\n- Do not bet your favourite team if that is the only reason.\n- Treat live betting as a spending accelerator, not a skill test.\n- Stop when the budget is gone. Chasing a 2–0 with a 2–1 hedge is how a $20 night becomes $80.\n\nWatching a Major with no money on it is still allowed. If the slip is the only reason the match is interesting, that is a warning sign, not a hobby. Licensed books should offer deposit limits and time-outs. Use them.\n\nWhether a match ticket is allowed is not the same page as how the odds work. [Esports betting law](/guides/esports-betting-legal) is the permission question.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "What is esports betting?",
      a: "Esports betting is staking money on professional video-game matches at bookmaker odds. You are paid if your selection wins; the book keeps a margin in every price.",
    },
    {
      q: "How do esports odds work?",
      a: "Decimal odds show total return per $1 staked. Implied probability is 1 divided by the odds. When both sides add up to more than 100%, the extra is the bookmaker's margin.",
    },
    {
      q: "Is esports betting legal?",
      a: "It depends on where you live. Many countries treat it like sports betting and require a licensed book. In the US, rules vary by state. Check local law before you deposit.",
    },
    {
      q: "Has esports had match-fixing?",
      a: "Yes. ESIC and tournament organisers have sanctioned players for match-fixing and betting offences. Lower-tier events have historically been more exposed than top events.",
    },
    {
      q: "Is LoL betting different from CS2 betting?",
      a: "The slip looks similar, but the props differ: dragons and barons versus pistols and rounds. The integrity and margin issues are the same product underneath.",
    },
  ],
  sources: [
    {
      label: "Esports Integrity Commission (ESIC)",
      url: "https://esic.gg/",
    },
    {
      label: "ESIC Anti-Corruption Code",
      url: "https://esic.gg/codes/anti-corruption-code/",
    },
    {
      label: "UK Gambling Commission public register",
      url: "https://www.gamblingcommission.gov.uk/public-register",
    },
    {
      label: "Counter-Strike 2 official site",
      url: "https://www.counter-strike.net/",
    },
  ],
  related: [
    "cs2-betting",
    "best-csgo-gambling-sites",
    "csgo-coinflip-sites",
    "csgo-case-battle-sites",
  ],
  updated: "2026-11-26",
};

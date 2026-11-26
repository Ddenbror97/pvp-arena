import type { Guide } from "./types";

export const guide: Guide = {
  slug: "what-is-sports-betting",
  cluster: "Sports betting",
  pillar: true,
  keyword: "what is sports betting",
  secondary: [
    "sports betting meaning",
    "sports betting explained",
    "what is a sportsbook",
    "sports wager",
  ],
  title: "What Is Sports Betting? Markets, Odds and Vig",
  description:
    "Understand sports betting markets, accepted odds, stakes and payouts, with clear distinctions between winners, spreads, totals, props and sportsbook margin.",
  h1: "What is sports betting? A price on a future score",
  answer:
    "What is sports betting? It is staking money on a defined sports outcome at accepted odds. Markets include winners, point spreads, totals and player props. The odds set the return, and the market’s rules determine settlement. A sportsbook’s pricing margin raises the performance needed to break even; a winning team does not necessarily win every bet on that team.",
  facts: [
    "Sports betting is a priced contract on an external event, not a random draw you can recompute from a seed.",
    "Every posted number embeds a margin. Implied chances across a full market add to more than 100%.",
    "Common tickets are moneyline, point spread, over/under and parlays that stack several legs.",
    "Most recreational bettors lose over time because the vig is a fee on every dollar turned over.",
  ],
  sections: [
    {
      id: "definition",
      title: "What sports betting is — and what it is not",
      body: "Sports betting is a stake on a published outcome of a real contest: a team wins, a game lands over a total, a player records a listed stat. The operator that posts the price is a sportsbook. You are buying that price, not buying a share of the league and not buying a random number you can recompute later.\n\nWhat it is not:\n\nIf you only remember one sentence: sports betting is a price, and the price is how the book gets paid. The next pages in this cluster unpack that price. This page stays at the map.\n\nA sports ticket is also a time product. Pre-match, live and cash-out are three different offers on the same event. Boosts and “same-game” tiles are more offers. Each offer has its own implied chance. Treating them as one “bet on the game” is how people lose count of how much they turned over. Write the market in one sentence or do not place it.",
    },
    {
      id: "markets",
      title: "The main bet types you will see on a slip",
      body: "Books sell a menu. The names change by sport; the economics do not.\n\n- **[Moneyline](/guides/moneyline-betting-explained):** which side wins. Quoted as plus or minus American odds, or as a decimal.\n- **[Point spread](/guides/point-spread-explained):** a handicap. The favorite must win by more than the number; the underdog can lose by less than the number and still cash.\n- **[Over/under](/guides/over-under-betting):** a total on points, goals or another counted stat.\n- **[Parlay](/guides/parlay-betting-explained):** several legs that must all hit. The posted payout looks large because the joint chance is small and the juice stacks.\n- **Props and futures:** player stats, trophy winners, season wins. Usually wider margins than a simple two-way match market.\n- **Live / in-play:** the same ideas after the game starts. Speed is not a discount.\n\nA first ticket should be one market you can explain in a sentence. If you cannot say what must happen for the book to pay you, you do not have a bet. You have a story.\n\nEsports uses the same menu on a different schedule. If that is the sport you actually watch, start with [esports betting](/guides/esports-betting) after this pillar, not with a same-game parlay on a league you do not follow.\n\nCrypto cashiers do not change the menu. [Sports betting with crypto](/guides/sports-betting-with-crypto) only changes how you fund the account. The vig is still in the number.\n\nOutrights — who wins a title in June — look cheap because the decimal is large. Large decimals are long shots with wide margins. A 21.00 future implies about 4.8% before you ask whether twenty other names on the board are also juiced. Add those implied chances if the book lists a full field. The sum will not be 100%. That is the same hold story wearing a trophy graphic.",
    },
    {
      id: "vig",
      title: "Odds, vig and implied probability — an illustration",
      body: "A posted price is a sentence about chance. Convert it before you admire it. Decimal odds D imply 1/D. American minus A implies A/(A+100). American plus A implies 100/(A+100). That percent is the [implied probability](/guides/implied-probability), not a weather report.\n\n**Illustration (not a pick):** a two-way moneyline is listed at −110 and −110.\n\n| Side | American | Decimal | Implied chance |\n| --- | --- | --- | --- |\n| Home | −110 | 1.909 | 52.38% |\n| Away | −110 | 1.909 | 52.38% |\n| Sum | — | — | 104.76% |\n\nThe extra 4.76 points over 100% is overround — the book's hold if the book is balanced. That hold is the sports analogue of a [house edge](/guides/house-edge). Crypto rails do not delete it. A converter will not delete it. The [odds converter](/guides/odds-converter) only puts every label on one scale.\n\nWorked cash on the same illustration: you stake $22 on Home at −110. If Home wins, the book returns $42, a $20 profit. If Home loses, you lose $22. You needed to risk $22 to win $20. That extra $2 is the juice on one ticket. Repeat it all season and the fee is the product.\n\nIf you want the dollar language for “is this price any good,” use [expected value](/guides/expected-value-gambling). If implied chance is higher than your honest true chance, the ticket is minus-EV. Most posted recreational prices are minus-EV by design.\n\nA second illustration on the same −110 pair: 50 bets of $11, 25 wins, 25 losses. Wins return $21 each ($525). Losses cost $275. Net −$50 on $550 handled. You were exactly even in wins and still paid the juice. That is why “I pick winners half the time” is not a business. It is the book’s favourite customer story.",
    },
    {
      id: "counterparty",
      title: "Who takes the other side of your ticket",
      body: "That has three practical consequences.\n\n1. **The book can refuse you.** Limits, max payouts and “no new accounts from this zip” are part of the product. A hashed room that lets anyone join a public pot is a different contract.\n2. **Settlement is a rulebook.** Abandoned matches, protests and bad feeds are decided by house rules and a data vendor, not by a seed reveal.\n3. **Integrity sits off-chain.** Injuries, officiating and rare fixing are sports problems. Cryptography does not see them.\n\nAn exchange-style book, where customers fade each other and the house takes a commission, is closer to a pot — and still not a hashed draw. You still need to read the commission and the void rules.\n\nDo not treat a Sunday ticket and a Jackpot share as the same “action.” They fail in different ways. One fails if the line was bad or the book will not pay. The other fails if the reveal bit is not yours. Keep the mental accounts separate so a bad slate does not become an excuse to chase on a wheel.",
    },
    {
      id: "contrast",
      title: "A sports ticket versus a hashed PvP round",
      body: "If you opened this pillar because a search mixed “sports betting” with this brand, keep the split: we teach the vocabulary here so you can read a book. We do not operate the book.",
    },
    {
      id: "cluster",
      title: "What the rest of this cluster teaches",
      body: "Read the pillar, then pick the page that matches the question you actually typed.\n\n- **[How to bet on sports](/guides/how-to-bet-on-sports)** is the procedure: law, account, price, stake, slip, review.\n- **[How does sports betting work](/guides/how-does-sports-betting-work)** is the machinery: lines, hold, live, voids.\n- **[How to win at sports betting](/guides/how-to-win-at-sports-betting)** refuses the promise. Most bettors lose. The page is vig, closing-line value and bankroll, not picks.\n- **Bet types:** spread, moneyline, parlay and over/under tickets have different winning conditions.\n\nMath that already lives in the games-and-odds cluster still applies. Implied probability, the converter, expected value, [Kelly](/guides/kelly-criterion) and house edge are the same tools. Kelly on a minus-EV juice line says bet nothing for growth. That is the honest use of the formula.\n\nNone of those pages is a live odds screen. None is a 50-state legal database. Laws move. Books shade. If you need a current price or a current licence list, you need a book and a regulator, not an explainer.\n\nIf you only watch one sport, read the bet-type page for the ticket you actually use, then stop. You do not need all four. A basketball fan who only bets totals can live on the over/under page plus implied probability. A football fan who only bets sides can live on spread and moneyline. Collecting every jargon word is how people graduate into parlays they still cannot price.",
    },
    {
      id: "stop",
      title: "If betting stops being entertainment",
      body: "Sports betting is 18+ where we write, and often 21+ for the actual product where you live. A budget you can lose is part of the definition of entertainment. A stake you need for rent is not a ticket.\n\nWarning signs are ordinary: chasing a late game, hiding slips, borrowing, raising the unit after a bad Sunday. Those are not solved by a sharper converter. They are solved by stopping.\n\nUse the [responsible gambling](/responsible-gambling) page for site tools and helplines. Use [how to stop gambling](/guides/how-to-stop-gambling) for a practical sequence. Use [gambling self-exclusion](/guides/gambling-self-exclusion) if you need a lock that is harder to reverse than a promise to yourself.\n\nNot every sports bet is a posted price from a book. [Peer to peer sports betting](/guides/peer-to-peer-sports-betting) needs another punter on the other side. A [betting exchange](/guides/betting-exchange-explained) lets you lay as well as back. [F1 betting](/guides/f1-betting) is an outright and a podium, not a point spread.\n\nExplore the [sports betting topic](/guides/topics/sports-betting) for related rules and examples.",
    },
  ],
  faqs: [
    {
      q: "What is sports betting in one sentence?",
      a: "A stake on a published sports outcome at a sportsbook’s posted price, which already includes a margin called vig or juice.",
    },
    {
      q: "Why do implied probabilities add to more than 100%?",
      a: "Because the book builds a margin into both sides. That surplus is overround. A fair two-way market would sum to 100%.",
    },
    {
      q: "Does paying in crypto remove the vig?",
      a: "No. Crypto changes the cashier. The juice is still in the odds. Bitcoin also adds price risk on top of the ticket.",
    },
    {
      q: "Where should I start in this cluster?",
      a: "This pillar, then how to bet on sports for the procedure, then the one bet-type page that matches your ticket. Skip parlays until you can convert a single price.",
    },
  ],
  sources: [
    {
      label: "UK Gambling Commission — Sports betting",
      url: "https://www.gamblingcommission.gov.uk/",
    },
    {
      label: "Wikipedia: Sports betting",
      url: "https://en.wikipedia.org/wiki/Sports_betting",
    },
    {
      label: "National Council on Problem Gambling",
      url: "https://www.ncpgambling.org/",
    },
  ],
  related: [
    "how-to-bet-on-sports",
    "how-does-sports-betting-work",
    "sports-betting-with-crypto",
    "implied-probability",
    "house-edge",
    "esports-betting",
  ],
  updated: "2026-11-26",
};

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
    "What is sports betting: how books price games, how vig sits in the odds, and how a sports ticket differs from a hashed PvP round on this site.",
  h1: "What is sports betting? A price on a future score",
  answer:
    "What is sports betting? It is a wager on a real contest at a price a sportsbook posts. You pick a side, a total or another listed market, stake money you can lose, and collect only if the listed result happens. The book is paid by a margin in the odds, often called vig or juice. PVPspinArena is not a sportsbook and does not take team bets.",
  facts: [
    "Sports betting is a priced contract on an external event, not a random draw you can recompute from a seed.",
    "Every posted number embeds a margin. Implied chances across a full market add to more than 100%.",
    "Common tickets are moneyline, point spread, over/under and parlays that stack several legs.",
    "Most recreational bettors lose over time because the vig is a fee on every dollar turned over.",
    "PVPspinArena is not a sportsbook. It runs hashed Jackpot, Coinflip and Roulette only.",
  ],
  sections: [
    {
      id: "definition",
      title: "What sports betting is — and what it is not",
      body: `Sports betting is a stake on a published outcome of a real contest: a team wins, a game lands over a total, a player records a listed stat. The operator that posts the price is a sportsbook. You are buying that price, not buying a share of the league and not buying a random number you can recompute later.

This [sports betting topic](/guides/topics/sports-betting) is the pillar for the cluster. It is for adults aged 18 or over. It is teaching, not a tout sheet. PVPspinArena will not pick a side for you and will not take a football or basketball ticket.

What it is not:

- **Not a fair coin.** A two-way market that looks like 50/50 is usually juiced on both sides.
- **Not legal advice.** Age, location and product rules vary. Read [how old to sports bet](/guides/how-old-to-sports-bet) and [where sports betting is legal](/guides/sports-betting-legal-states) as orientation, then check your own regulator.
- **Not this site.** A hashed [Coinflip](/coinflip) is a different product. You can verify the bit. You cannot verify a referee.

If you only remember one sentence: sports betting is a price, and the price is how the book gets paid. The next pages in this cluster unpack that price. This page stays at the map.

A sports ticket is also a time product. Pre-match, live and cash-out are three different offers on the same event. Boosts and “same-game” tiles are more offers. Each offer has its own implied chance. Treating them as one “bet on the game” is how people lose count of how much they turned over. Write the market in one sentence or do not place it.`,
    },
    {
      id: "markets",
      title: "The main bet types you will see on a slip",
      body: `Books sell a menu. The names change by sport; the economics do not.

- **[Moneyline](/guides/moneyline-betting-explained):** which side wins. Quoted as plus or minus American odds, or as a decimal.
- **[Point spread](/guides/point-spread-explained):** a handicap. The favorite must win by more than the number; the underdog can lose by less than the number and still cash.
- **[Over/under](/guides/over-under-betting):** a total on points, goals or another counted stat.
- **[Parlay](/guides/parlay-betting-explained):** several legs that must all hit. The posted payout looks large because the joint chance is small and the juice stacks.
- **Props and futures:** player stats, trophy winners, season wins. Usually wider margins than a simple two-way match market.
- **Live / in-play:** the same ideas after the game starts. Speed is not a discount.

A first ticket should be one market you can explain in a sentence. If you cannot say what must happen for the book to pay you, you do not have a bet. You have a story.

Esports uses the same menu on a different schedule. If that is the sport you actually watch, start with [esports betting](/guides/esports-betting) after this pillar, not with a same-game parlay on a league you do not follow.

Crypto cashiers do not change the menu. [Sports betting with crypto](/guides/sports-betting-with-crypto) only changes how you fund the account. The vig is still in the number.

Outrights — who wins a title in June — look cheap because the decimal is large. Large decimals are long shots with wide margins. A 21.00 future implies about 4.8% before you ask whether twenty other names on the board are also juiced. Add those implied chances if the book lists a full field. The sum will not be 100%. That is the same hold story wearing a trophy graphic.`,
    },
    {
      id: "vig",
      title: "Odds, vig and implied probability — an illustration",
      body: `A posted price is a sentence about chance. Convert it before you admire it. Decimal odds D imply 1/D. American minus A implies A/(A+100). American plus A implies 100/(A+100). That percent is the [implied probability](/guides/implied-probability), not a weather report.

**Illustration (not a pick):** a two-way moneyline is listed at −110 and −110.

| Side | American | Decimal | Implied chance |
| --- | --- | --- | --- |
| Home | −110 | 1.909 | 52.38% |
| Away | −110 | 1.909 | 52.38% |
| Sum | — | — | 104.76% |

The extra 4.76 points over 100% is overround — the book's hold if the book is balanced. That hold is the sports analogue of a [house edge](/guides/house-edge). Crypto rails do not delete it. A converter will not delete it. The [odds converter](/guides/odds-converter) only puts every label on one scale.

Worked cash on the same illustration: you stake $22 on Home at −110. If Home wins, the book returns $42, a $20 profit. If Home loses, you lose $22. You needed to risk $22 to win $20. That extra $2 is the juice on one ticket. Repeat it all season and the fee is the product.

If you want the dollar language for “is this price any good,” use [expected value](/guides/expected-value-gambling). If implied chance is higher than your honest true chance, the ticket is minus-EV. Most posted recreational prices are minus-EV by design.

A second illustration on the same −110 pair: 50 bets of $11, 25 wins, 25 losses. Wins return $21 each ($525). Losses cost $275. Net −$50 on $550 handled. You were exactly even in wins and still paid the juice. That is why “I pick winners half the time” is not a business. It is the book’s favourite customer story.`,
    },
    {
      id: "counterparty",
      title: "Who takes the other side of your ticket",
      body: `On a sportsbook you are not betting the other customers in the same way you sit in a PvP pot. The book accepts the risk at its posted number, may lay some of that risk off, and earns if the prices are good and the handle is balanced enough. Your counterparty is the operator plus, in a sense, the vig.

That has three practical consequences.

1. **The book can refuse you.** Limits, max payouts and “no new accounts from this zip” are part of the product. A hashed room that lets anyone join a public pot is a different contract.
2. **Settlement is a rulebook.** Abandoned matches, protests and bad feeds are decided by house rules and a data vendor, not by a seed reveal.
3. **Integrity sits off-chain.** Injuries, officiating and rare fixing are sports problems. Cryptography does not see them.

An exchange-style book, where customers fade each other and the house takes a commission, is closer to a pot — and still not a hashed draw. You still need to read the commission and the void rules.

Do not treat a Sunday ticket and a Jackpot share as the same “action.” They fail in different ways. One fails if the line was bad or the book will not pay. The other fails if the reveal bit is not yours. Keep the mental accounts separate so a bad slate does not become an excuse to chase on a wheel.`,
    },
    {
      id: "contrast",
      title: "A sports ticket versus a hashed PvP round",
      body: `PVPspinArena does not price teams. It runs player-versus-player Jackpot and Coinflip plus a house-banked 33-slot [Roulette](/roulette) wheel. The fairness question on those games is: was the seed committed, and does the reveal match? That question is on the [fairness](/fairness) page. It is the wrong question for a moneyline.

| Check | Sportsbook ticket | Hashed PvP pot |
| --- | --- | --- |
| What you are buying | A price on an external event | A share of an internal draw |
| Can you recompute the result from a seed? | No | Yes, after reveal |
| Where the margin lives | Vig in the odds | Fee on the pot, or a posted house paytable |
| Information edge | Possible in theory, rare in practice | Not a scouting problem |
| This site take the bet? | No | Yes, as Jackpot, Coinflip or Roulette |

A 0% fee Coinflip is about even between two players. That is not a reason to “hedge” a lost spread on a flip. It is a reason to notice that the products are not substitutes.

If you opened this pillar because a search mixed “sports betting” with this brand, keep the split: we teach the vocabulary here so you can read a book. We do not operate the book.`,
    },
    {
      id: "cluster",
      title: "What the rest of this cluster teaches",
      body: `Read the pillar, then pick the page that matches the question you actually typed.

- **[How to bet on sports](/guides/how-to-bet-on-sports)** is the procedure: law, account, price, stake, slip, review.
- **[How does sports betting work](/guides/how-does-sports-betting-work)** is the machinery: lines, hold, live, voids.
- **[How to win at sports betting](/guides/how-to-win-at-sports-betting)** refuses the promise. Most bettors lose. The page is vig, closing-line value and bankroll, not picks.
- **Bet-type pages** unpack the four tickets people search by name: spread, moneyline, parlay and over/under.

Math that already lives in the games-and-odds cluster still applies. Implied probability, the converter, expected value, [Kelly](/guides/kelly-criterion) and house edge are the same tools. Kelly on a minus-EV juice line says bet nothing for growth. That is the honest use of the formula.

None of those pages is a live odds screen. None is a 50-state legal database. Laws move. Books shade. If you need a current price or a current licence list, you need a book and a regulator, not an explainer.

If you only watch one sport, read the bet-type page for the ticket you actually use, then stop. You do not need all four. A basketball fan who only bets totals can live on the over/under page plus implied probability. A football fan who only bets sides can live on spread and moneyline. Collecting every jargon word is how people graduate into parlays they still cannot price.`,
    },
    {
      id: "stop",
      title: "If betting stops being entertainment",
      body: `Sports betting is 18+ where we write, and often 21+ for the actual product where you live. A budget you can lose is part of the definition of entertainment. A stake you need for rent is not a ticket.

Warning signs are ordinary: chasing a late game, hiding slips, borrowing, raising the unit after a bad Sunday. Those are not solved by a sharper converter. They are solved by stopping.

Use the [responsible gambling](/responsible-gambling) page for site tools and helplines. Use [how to stop gambling](/guides/how-to-stop-gambling) for a practical sequence. Use [gambling self-exclusion](/guides/gambling-self-exclusion) if you need a lock that is harder to reverse than a promise to yourself.

PVPspinArena will still be here as a hashed PvP site if you only wanted to understand why a −110 line is not a coin. It will not take your team. It will not tell you the team is due. If the question you came with was “what is sports betting,” the short answer is a priced risk on a real event, sold with a fee in the odds, to adults who can afford to lose the stake.

Not every sports bet is a posted price from a book. [Peer to peer sports betting](/guides/peer-to-peer-sports-betting) needs another punter on the other side. A [betting exchange](/guides/betting-exchange-explained) lets you lay as well as back. [F1 betting](/guides/f1-betting) is an outright and a podium, not a point spread.`,
    },
  ],
  faqs: [
    {
      q: "What is sports betting in one sentence?",
      a: "A stake on a published sports outcome at a sportsbook’s posted price, which already includes a margin called vig or juice.",
    },
    {
      q: "Is PVPspinArena a sportsbook?",
      a: "No. It does not take team, total or parlay bets. It runs hashed Jackpot, Coinflip and Roulette with USDC or ETH on Base.",
    },
    {
      q: "Why do implied probabilities add to more than 100%?",
      a: "Because the book builds a margin into both sides. That surplus is overround. A fair two-way market would sum to 100%.",
    },
    {
      q: "Is sports betting the same as a casino bet?",
      a: "Both can be minus-EV. A sports ticket is a price on an external event. A house roulette colour is a paytable on a counted wheel. A PvP pot is a third product.",
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
    { label: "Wikipedia: Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
  ],
  related: [
    "how-to-bet-on-sports",
    "how-does-sports-betting-work",
    "sports-betting-with-crypto",
    "implied-probability",
    "house-edge",
    "esports-betting",
  ],
  updated: "2026-09-26",
};

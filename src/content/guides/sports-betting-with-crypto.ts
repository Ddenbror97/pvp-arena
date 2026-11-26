import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sports-betting-with-crypto",
  cluster: "Sports betting",
  keyword: "sports betting with crypto",
  secondary: [
    "crypto sportsbook",
    "bitcoin sports betting",
    "crypto betting odds",
    "anonymous sports betting",
  ],
  title: "Sports Betting With Crypto: Odds, Books and Risk",
  description:
    "Understand crypto sportsbook deposits, network and custody risks, odds margins and settlement checks, including why payment rails do not verify results.",
  h1: "Sports betting with crypto: deposits, odds and integrity risk",
  answer:
    "Sports betting with crypto means a sportsbook that takes Bitcoin, ETH or a stablecoin instead of a card. The book still sets prices, takes a margin, and pays if the listed result happens. You can check a deposit on-chain. You cannot recompute a football score from a server seed. Integrity risk — a bad line, a delayed market or a fixed event — sits outside cryptography.",
  facts: [
    "A crypto sportsbook is still a book: it prices events and keeps a margin in the odds.",
    "On-chain deposits prove a payment, not that a match was settled on the right score.",
    "Implied probability from odds is always less than 100% across a market once the book’s margin is included.",
    "Event integrity (referees, injuries, spot-fixing) is a sports problem, not a wallet problem.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a crypto sportsbook actually sells",
      body: '"Anonymous sports betting" in ads usually means a light sign-up and a crypto send. It does not mean the book has no records, that your chain activity is invisible, or that the bet is legal where you live. A public BTC payment to a known deposit cluster is a breadcrumb. A stablecoin send on a transparent ledger is a breadcrumb. If you need privacy, a sportsbook is the wrong tool; if you need a priced football market, accept that the book will know your account.\n\nLive betting and cash-out buttons are still book products. Crypto settlement speed does not give you a fairer in-play price. It only changes how fast you can restock the account after a loss, which is a harm vector as much as a convenience. Decision quality is about the number on the ticket, not the ticker on the cashier.',
    },
    {
      id: "deposits",
      title: "How books take crypto deposits",
      body: 'The cashier looks like any other crypto gambling cashier.\n\n1. The book shows a deposit address and a network.\n2. You send BTC, ETH, USDT or USDC from a wallet or exchange.\n3. After confirmations, a fiat or coin balance appears.\n4. You bet. The book accepts or rejects the risk at its posted price.\n5. After the event, the book settles. You withdraw if the book pays.\n\nFinality of the send is not finality of the bet. A confirmed USDT transfer only proves the book received tokens. Settlement still depends on the book\'s rules: which data provider, when a market suspends, what happens if a match is abandoned.\n\nNetwork mistakes still destroy deposits. TRC-20 is not ERC-20. Bitcoin is not USDC on Base. If you intended to use this site instead of a book, send USDC or ETH on Base to the address on the [wallet](/how-it-works#wallet) page, not to a sportsbook invoice.\n\nLimits and voids live in the house rules. A "crypto" book can still cap a max win, still void a bet struck after a red card the feed lagged on, still request extra checks before a first cashout. Read those paragraphs before the first $20. Speed of the inbound tx is not a waiver of those clauses.\n\nSome books convert every coin into a house unit at a spread. That spread is a silent vig on top of the odds. Prefer a book that credits USDT or USDC 1:1, or one that shows the conversion rate before you confirm. Prefer a wallet you control over depositing straight from an exchange if the book matches senders.',
    },
    {
      id: "odds",
      title: "Odds, margin and implied probability",
      body: "Books do not sell a fair coin. They sell a price that embeds a margin, often called juice or vig.\n\nIf a two-outcome market is priced 1.91 and 1.91 in decimal odds, each side implies 1 / 1.91 ≈ 52.4%. Added together that is about 104.7%. The extra 4.7% is the book's hold if the book is balanced. Your [implied probability](/guides/implied-probability) as a punter is the inverse of the odds; the market's probabilities will sum to more than 100%.\n\nThat margin is the book's analogue of a [house edge](/guides/house-edge). It is not hidden if you can add the implied probabilities. It is easy to ignore if you only look at one side.\n\nCrypto does not shrink the vig. Paying in Bitcoin can add price risk on top: the coin you withdraw after a win may be worth fewer dollars than the coin you deposited, even if the bet won.\n\nAmerican, decimal and fractional prices all convert to the same implied probability. If a book quotes -120 and another quotes 1.83, do the conversion before you call one a \"crypto exclusive.\" Tools in this cluster include an [odds converter](/guides/odds-converter) if you want the arithmetic spelled out; the idea is the same whether the cashier is a card or USDC.\n\nWorked numbers belong in the next section. The habit to learn here is: convert every price to implied probability before you compare books. If you cannot do that, you are shopping brands, not prices.",
    },
    {
      id: "example",
      title: "Worked example: a $20 moneyline and the book's hold",
      body: 'Suppose a book posts decimal odds of 1.80 on Team A and 2.10 on Team B.\n\n1. Implied probability of A: 1 / 1.80 = 55.56%.\n2. Implied probability of B: 1 / 2.10 = 47.62%.\n3. Sum: 103.18%. Overround is about 3.18%.\n4. You stake $20 on A at 1.80. If A wins, the book returns $36, a $16 profit. If A loses, you lose $20.\n5. If you could bet both sides in proportion to "balance" the book, the book would keep a slice of the $20 pair regardless of the winner. You cannot remove that slice by paying in USDC.',
    },
    {
      id: "integrity",
      title: "Integrity risk: the part cryptography does not see",
      body: 'Sports outcomes happen in stadiums and servers run by leagues, not in the book\'s commit-reveal. Integrity risk includes:\n\n- **Information.** A late injury or a lined-up referee decision can move a true price after you bet.\n- **Spot-fixing and match-fixing.** A player can underperform on purpose. Crypto rails do not detect that.\n- **Feed risk.** The book settles on a data vendor. A wrong score, a protested result or a renamed market can strand a ticket.\n- **Book risk.** The operator can void a bet under its rules, delay a cashout, or fail.\n\nProvably fair tools answer a different question: did this site change a random draw after you were in? They do not attest that a striker meant to miss.\n\nLeague integrity units and regulators publish warnings when a market looks corrupted. You will not see that warning inside a MetaMask confirmation. If a price is wildly off a sharp consensus, ask whether you are the informed party or the exit liquidity.\n\nIf betting is stressing you, stop. The [how to stop gambling](/guides/how-to-stop-gambling) guide and the [responsible gambling](/responsible-gambling) page list practical next steps. Crypto speed can make chasing a late game worse, not better. A lost live bet plus an "instant" USDT top-up is how a planned $40 night becomes a $400 night without leaving the couch.\n\nEsports markets have the same vig logic and extra integrity texture: smaller teams, online matches, easier spot-fixing in some titles. That is why this cluster also has a dedicated [esports betting](/guides/esports-betting) page. The cashier being crypto does not clean up a suspect series.',
    },
    {
      id: "contrast",
      title: "A sports ticket versus a verifiable PvP round",
      body: 'A sports ticket is a contract on an external event. Your checks are: Is the book solvent? Are the rules clear? Is the price good after vig? Can you withdraw?\n\nParlays and accumulators stack vig. Four legs at short prices can look like a "safe" 5.0 while each price already has juice and the joint probability is the product of already-shaded numbers. Crypto does not unstack that. If you cannot compute the combined implied probability, you are buying a story, not a price.',
    },
    {
      id: "summary",
      title: "Summary: pay the vig on purpose, or pick a different product",
      body: 'Sports betting with crypto changes the cashier, not the nature of a book. Odds embed a margin. Integrity and settlement sit with leagues and operators. On-chain payment proof is not a proof of reserves for the book\'s open tickets, and it is not a hashed scoreline.\n\nBoosts, "profit boosts" and boosted parlays are just another shaded price with a sticker. Compute the implied probability of the boosted number and compare it with a sharp book. Crypto settlement does not make a bad boost good.\n\nKeep those products in different mental accounts so a bad Sunday slate does not become an excuse to "win it back" on a hashed wheel — or the other way around.\n\nOne sport people try to fund with a coin is racing. [Crypto horse racing betting](/guides/crypto-horse-racing-betting) is still a book, and the coin does not change the tote or the track rules.\n\nSee also: [BetDEX review](/guides/betdex-review), [Novig Review](/guides/novig-review), [Splash Sports Review](/guides/splash-sports-review).\n\nExplore the [sports betting topic](/guides/topics/sports-betting) for related rules and examples.',
    },
  ],
  faqs: [
    {
      q: "Is sports betting with crypto anonymous?",
      a: "Usually not in any strong sense. The book has an account record, and the blockchain has a public transfer. Light KYC is not invisibility, and a USDT deposit to a known cluster can still be linked later.",
    },
    {
      q: "Do crypto odds beat card-funded books?",
      a: "Sometimes a book posts a better number. Crypto does not automatically cut vig. Compare implied probabilities, then count withdrawal friction.",
    },
    {
      q: "Can I verify a sports bet like a provably fair game?",
      a: "You can verify that you paid. You cannot recompute a match from a casino seed. The event lives outside the site.",
    },
    {
      q: "What is the biggest extra risk of bitcoin sports betting?",
      a: "Price risk on BTC plus book risk. A winning ticket paid in BTC can still be down in dollars if Bitcoin fell.",
    },
  ],
  sources: [
    {
      label: "UK Gambling Commission — Sports betting",
      url: "https://www.gamblingcommission.gov.uk/",
    },
    {
      label: "International Olympic Committee — Competition manipulation",
      url: "https://www.olympics.com/ioc/integrity",
    },
    {
      label: "ethereum.org — Wallets",
      url: "https://ethereum.org/en/wallets/",
    },
  ],
  related: ["plinko-gambling", "plinko-odds", "crypto-slots", "what-is-sports-betting"],
  updated: "2026-11-26",
};

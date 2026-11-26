import type { Guide } from "./types";

export const guide: Guide = {
  slug: "esports-sportsbook",
  cluster: "Esports betting",
  keyword: "esports sportsbook",
  secondary: [
    "esports bookmaker",
    "esports betting book",
    "crypto esports sportsbook",
    "what is an esports sportsbook",
  ],
  title: "Esports Sportsbook Guide: What a Book Really Is",
  description:
    "Learn how an esports sportsbook prices match and map bets, handles market margins and applies settlement rules for remakes, forfeits and interruptions.",
  h1: "Esports sportsbook: what a book is and what it is not",
  answer:
    "An esports sportsbook accepts wagers on video-game competitions, including match winners, map results, handicaps and props. The accepted odds determine the return, while the event result and market rules determine settlement. Check eligibility, market margin, postponement and remake rules, and the operator’s complaint procedure.",
  facts: [
    "An esports sportsbook prices events and keeps a margin, often called vig or overround.",
    "You are betting on a real contest: form, stand-ins and rare integrity problems can all matter.",
    "Settlement follows the book's rules and a data feed, not a casino seed you can recompute.",
    "A crypto cashier changes how you deposit, not the nature of the book.",
  ],
  sections: [
    {
      id: "what",
      title: "What an esports sportsbook sells",
      body: "A sportsbook is a shop that buys and sells risk on future facts. An esports sportsbook does that for listed video-game events: series winners, map winners, totals, outrights and a long tail of props. You pick a side. The book accepts or rejects the risk at its posted price. If the listed result happens, the book pays the ticket. If it does not, the book keeps the stake.\n\nThe opponent is the book, not the other bettors watching the same stream. Other people's money on the same team does not improve your payout. The book is not a pot you share. It is a price maker.",
    },
    {
      id: "how-it-earns",
      title: "How the book earns: margin, limits and the other side",
      body: 'Books do not need to "hope you lose" on one named team if they can balance money on both sides and keep the overround. In practice, public money clusters on favourites and popular regions, so the book also shades prices and limits accounts.\n\nIllustration (not a live board): both sides of a two-way series at 1.91. Each side implies about 52.4%. The sum is about 104.7%. If the book is balanced, that extra 4.7% is the hold. You cannot remove it by paying in USDC. The [implied probability](/guides/implied-probability) and [esports odds](/guides/esports-odds-explained) pages show the conversion. The [house edge](/guides/house-edge) page is the casino version of the same economics.\n\nLimits are part of the product. A book that will take $20 at 2.10 may not take $2,000 at the same number. Winning accounts get smaller max bets. That is not a glitch. That is how a price maker stays a price maker.\n\nBoosts and "profit boosts" are another shaded price with a sticker. Compute the implied chance of the boosted number and compare it with a sharp consensus if you have one. A sticker does not make a bad number good.',
    },
    {
      id: "menu",
      title: "What you will see on the board",
      body: 'Most esports sportsbooks start with the same menu, then add title-specific props.\n\n- **Match winner (moneyline):** which team wins the series.\n- **Map winner:** a named map or "map two".\n- **Handicaps:** +1.5 maps, −3.5 rounds, and similar head starts.\n- **Totals:** over or under maps, rounds, kills or objectives.\n- **Correct score:** 2–0, 2–1, 3–2.\n- **Outrights:** who lifts the trophy.\n- **Live / in-play:** prices that update after each pistol, baron or overtime.\n\nLeague of Legends adds dragons and barons. Valorant and CS2 add pistols and round lines. Dota 2 adds first blood, first Roshan and tower races. Rocket League adds game totals and overtime. Those props are entertaining if you already watch the title. They are a poor place to start if you only know the team names.\n\nIf a market\'s rules are not written next to the price, skip it. Remakes, stand-ins and reconnects are normal in esports. The book will settle on its written rule, not on your memory of the cast.\n\nOutrights look like "one bet for the whole weekend". They are a long list of shaded prices. Each name on a 16-team winner board can carry more juice than a two-way moneyline. Futures also sit through roster changes and byes. If you cannot explain the settlement date and the void-on-withdrawal rule, you bought a poster, not a priced ticket.\n\nSame-game parlays — series winner plus first objective plus correct score — stack that juice on purpose. They are a product the book likes because the story is easy and the combined implied chance is hard to see. If you cannot multiply the legs after converting each one, do not build the slip.',
    },
    {
      id: "settlement",
      title: "Feeds, voids and the part cryptography cannot see",
      body: "A sportsbook settles on an external fact. That fact is produced by a tournament admin, a server and a data vendor. Integrity risk — a dumped map, a bought round total, a late stand-in you did not see — sits outside the cashier.\n\nOn-chain deposits prove a payment. They do not prove the score. Our [sports betting with crypto](/guides/sports-betting-with-crypto) guide is the longer cashier warning. A confirmed USDT transfer only shows the book received tokens. Settlement still depends on house rules.\n\nBooks that take integrity seriously will void or limit markets when a cup is under investigation. That is a feature. The [esports match fixing](/guides/esports-match-fixing) page covers what that risk looks like for a fan. Report credible corruption concerns to the competition’s integrity body; an unusual result is not proof of manipulation.",
    },
    {
      id: "legal",
      title: "Age, law and what 'licensed' actually means",
      body: 'There is no global esports-sportsbook licence. Many countries treat the product like other sports betting. In the US, rules vary by state and sometimes by which events qualify. You must be of legal gambling age where you live.\n\nA licensed book should appear on a regulator register, run age checks, and offer a complaint path. Licensing does not shrink the vig. It gives you a place to write when a void looks wrong.\n\nUnlicensed books can still pay. They can also disappear. A Telegram tipster with a "VIP sportsbook" is not a regulator. A VPN slogan is not a licence. If the product is not lawful where you live, do not use it.\n\nEsports audiences skew young, which is why a real book asks for documents and why skin-era sites that skipped those checks were a problem. If you are not an adult under local law, this product is not for you.\n\nAdvertising rules exist for a reason. A licensed book should not sell "guaranteed locks" or target minors. An unlicensed Telegram shop that does both is not a sharper sportsbook. It is a different risk: you may never see the withdrawal. The [esports betting sites](/guides/esports-betting-sites) checklist is how you score that shop on the day you might deposit, not how you pick a favourite logo.',
    },
    {
      id: "safer",
      title: "Using a book without lying to yourself",
      body: 'Most people who use an esports sportsbook lose money over a season. The margin guarantees that as a group. A few sharp bettors find value; books limit them. If you are betting as a fan, the honest frame is paid entertainment around matches you would watch anyway.\n\n- Set a budget before the event, not after the first lost map.\n- Stick to markets you can explain in one sentence.\n- Convert odds to implied probability before you click.\n- Do not bet your favourite team if that is the only reason.\n- Treat live betting as a spending accelerator, not a skill exam.\n- Stop when the budget is gone. A 2–1 hedge after a lost first map is how a $20 night becomes $80.\n- Do not open the casino lobby in the same session "just to look". That is a second product.\n\nWatching a final with no money on it is still allowed. If the slip is the only reason the match is interesting, that is a warning sign. A sportsbook with a pretty live dashboard is still a price maker. The dashboard is not a skill exam. It is a list of shaded contracts you can refuse.\n\nKeep a one-line record: date, market, implied percent, stake, result. After a month you will see whether you were shopping stories. The record is a mirror, not a system for beating the book.\n\nIf betting is already taking more time or money than you planned, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). A sportsbook with responsible-play tools is still a sportsbook. Those tools exist because the product can harm people. Use them early.\n\nExplore the [esports betting topic](/guides/topics/esports-betting) for related rules and examples.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.',
    },
  ],
  faqs: [
    {
      q: "What is an esports sportsbook?",
      a: "A bookmaker that posts odds on professional video-game matches, takes your stake, and pays if the listed result happens. You bet against the book, not against other fans on the same market.",
    },
    {
      q: "Can I verify a sportsbook ticket like a provably fair round?",
      a: "You can verify that you paid and, later, that the official scoreboard matches the settlement rule. You cannot recompute the match from a server seed.",
    },
    {
      q: "Why do books limit winning accounts?",
      a: "Because a sportsbook is a price maker, not a pot. Accounts that consistently take the best number at size are a risk the book will reduce.",
    },
    {
      q: "Is a licensed esports sportsbook a good bet?",
      a: "Licensing is about complaint path and advertising rules, not about beating the vig. Most recreational tickets still lose over a season.",
    },
  ],
  sources: [
    {
      label: "Esports Integrity Commission (ESIC)",
      url: "https://esic.gg/",
    },
    {
      label: "UK Gambling Commission — Sports betting",
      url: "https://www.gamblingcommission.gov.uk/",
    },
    {
      label: "NCPG — Responsible gambling resources",
      url: "https://www.ncpgambling.org/",
    },
  ],
  related: [
    "esports-betting",
    "esports-betting-sites",
    "sports-betting-with-crypto",
    "esports-odds-explained",
    "how-to-bet-on-esports",
    "house-edge",
  ],
  updated: "2026-11-26",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "live-esports-betting",
  cluster: "Esports betting",
  keyword: "live esports betting",
  secondary: ["in-play esports", "live cs2 betting", "esports cash out", "in-play esports odds"],
  title: "Live Esports Betting: In-Play Prices and Risk",
  description:
    "Understand in-play esports prices, broadcast latency, market pauses, map settlement and cash-out risk before adding positions during a live match.",
  h1: "Live esports betting: in-play prices, latency and risk",
  answer:
    "Live esports betting means accepting a price after a match has begun. Rounds, objectives, player availability and pauses can change the price or suspend the market. Broadcast latency means a visible play may already be known to the operator. Confirm the accepted odds, covered map or series, and remake and interruption rules.",
  facts: [
    "Live esports betting is the same book product, priced after the match starts.",
    "Implied probability is still 1 ÷ decimal odds; live does not remove overround.",
    "Stream delay and feed delay are part of the product, not an edge you can VPN away.",
    "Cash-out is another shaded price, not a fairness feature.",
  ],
  sections: [
    {
      id: "what",
      title: "What live esports betting is",
      body: 'A live ticket is a pre-match ticket that you were allowed to strike later. The opponent is still the book. The result is still a real match. The extra ingredients are a moving board, frequent suspensions, and a cash-out button.\n\nThis page sits in the [esports betting topic](/guides/topics/esports-betting). The product explainer is [esports betting](/guides/esports-betting). The arithmetic is [esports odds explained](/guides/esports-odds-explained). The click sequence is [how to bet on esports](/guides/how-to-bet-on-esports). Here the job is the in-play board: what moves, what freezes, and why "I can see the HP bar" is not a model.\n\nAdults 18+ only. No live tips. Teaching numbers are labelled illustrations, not a current overlay. You do not need this product to "do esports properly". A pre-match series winner is enough. This page exists because the in-play board is where recreational budgets go to die.',
    },
    {
      id: "what-moves",
      title: "What the live board is reacting to",
      body: 'Books update esports prices when their feed says something changed. Typical triggers:\n\n- A pistol or an early round swing in CS2 or Valorant.\n- First blood, a dragon soul or a baron in League of Legends.\n- First Roshan or a high-ground push in Dota 2.\n- A goal or an overtime clock in Rocket League.\n- A pause, a reconnect or an admin message.\n\nThe book is not "watching with you". It is ingesting a vendor feed, a model and a risk limit. When the feed lags, the board freezes or the price is already stale when it reappears.\n\nTitle pages in this cluster explain the pre-match menu for each game. Live versions of those props inherit the same void rules and usually a wider overround. A live first-dragon is not a cheaper first-dragon. It is a first-dragon you can click more often.\n\nIf you cannot say in one sentence what you are buying — series winner now, map winner now, next round, next objective — do not click. Live coupons are designed to look like a dashboard. They are still a list of shaded contracts.\n\nTitle pages in this cluster explain the pre-match nouns. Live versions inherit those nouns and add speed. A live first-baron is still a first-baron. A live pistol is still one round. The [League of Legends betting](/guides/lol-betting), [Valorant betting](/guides/valorant-betting) and [CSGO odds](/guides/csgo-betting-odds) pages are the menus. This page is the clock.\n\nDo not open every regional cup because the live board is colourful. Thin cups plus in-play is where integrity texture and wide juice meet. If you would not watch the match with the sound on, you should not price it live.',
    },
    {
      id: "latency",
      title: "Latency, suspensions and the 'I saw it first' myth",
      body: 'Stream delay exists so the broadcast can catch up to the server and so books can protect themselves. Your overlay is not the official clock. A "free" live click because you saw a plant on stream is often a click the book already voided or never offered.\n\nA freeze is not a lock. A price that returns after a hidden round may already include information you did not see. Refreshing, switching streams or using a VPN does not create a lawful information edge. It usually creates a worse session.\n\n### What a serious book does\n\n- Suspends on pauses and reconnects.\n- Voids bets struck after a result the feed later confirms had already happened.\n- Limits live max bets on thin cups.\n\n### What a thin shop does\n\n- Leaves prices up through a pause.\n- Settles on a house interpretation you cannot quote.\n- Encourages click-after-click with no delay warning.\n\nIntegrity risk rises in-play because prices move on every round and insider information is worth more when the board is live. The [esports match fixing](/guides/esports-match-fixing) page covers that without turning it into a how-to. If a live price looks impossible, the common explanations are a stale book, a stand-in you missed, or a market the book does not care to sharpen — not a gift.',
    },
    {
      id: "odds",
      title: "Live odds still convert the same way",
      body: 'The formula does not get a live exception. Implied probability = 1 ÷ decimal odds. Add the other side if you can still see it. The surplus over 100% is still overround.\n\nIllustration (not a live price): after map one, a series is posted at 1.40 and 3.10.\n\n- Favourite: 1 ÷ 1.40 ≈ 71.4%.\n- Underdog: 1 ÷ 3.10 ≈ 32.3%.\n- Sum: 103.7%. Overround ≈ 3.7%.\n- A $20 stake at 1.40 returns $28 if it wins, including stake, for $8 profit.\n\nThose figures teach the conversion. They are not a recommendation to "lock the favourite". A 1.40 live favourite is still a ~71% shot before you ask whether the book is sharp. The longer maths is [implied probability](/guides/implied-probability). The [house edge](/guides/house-edge) guide is the casino twin.\n\n| Live habit | What it actually is |\n| --- | --- |\n| Clicking every pistol | More tickets, more vig |\n| Hedging after map one | A second price, not a refund |\n| Cash-out at 70% | The book buying your ticket back |\n| "I can see the economy" | Not a written model |\n\nCash-out is another shaded number. Compute the implied chance of the offer and compare it with the remaining market if both are visible. A button that saves you from watching is often a worse price than sitting.',
    },
    {
      id: "chase",
      title: "Chasing, hedges and session speed",
      body: 'Live boards turn one match into many decisions. That is the product\'s commercial design. A $20 pre-match plan becomes $80 when each lost pistol "needs" a saver.\n\nA hedge is a new bet. It has its own vig. It is rational only if it was in the plan and the combined prices still make sense after both overrounds. Most recreational hedges are mood. "I cannot watch a 2–0" is a reason to close the stream, not a reason to open the coupon.\n\nParlays built live — next round plus next dragon plus series winner — stack juice while you tell yourself you are "involved". If you cannot compute the combined implied probability, you are buying a story.\n\nA second illustration (not a live price): you already lost $20 on map one. You now see 1.55 on the same favourite to win the series. Implied chance is about 64.5%. A $20 "saver" returns $31 if it wins, including stake, for $11 profit — which does not replace the first $20. You are not even; you are in a second ticket with its own vig. Write both implied percents before you call it a hedge.\n\nIf the planned budget is gone, the live board is closed. "Map three is loading" is not a new budget. It is the same night trying to renegotiate.',
    },
    {
      id: "when-to-use",
      title: "When a live click is even a candidate",
      body: 'You do not need live betting to "do esports properly". Pre-match series winners are enough for a recreational ticket. If you still open the in-play board, keep the bar high.\n\n- The market text still applies after the match started (overtime, remakes, stand-ins).\n- You can see both sides or you accept that you cannot measure overround.\n- The stake is from the remaining budget, not from the last loss.\n- You can name the information you think you have, and it is public on the official feed, not a Discord rumour.\n- You will close the coupon when the budget is gone, even if map three is loading.\n\nThe [esports betting sites](/guides/esports-betting-sites) checklist still applies: a book that will not suspend, will not publish void rules, or only pays through chat is a worse live shop, not a sharper one.\n\nWrite the live ticket down before you confirm: remaining series format, market noun, decimal, implied percent, stake from the leftover budget. If you will not write the percent, you are clicking a dashboard, not placing a priced bet. Close the coupon and watch the round. The next pistol will happen whether you are on it or not.\n\nA long broadcast Saturday — a CS2 afternoon, a LoL closer, an RLCS night — is how a $40 plan becomes thirty live clicks. You do not owe the board a ticket on every title. One pre-match series you would watch anyway is enough. Switch the app off between broadcasts. A closed coupon is still a successful Saturday.\n\n[Sports betting with crypto](/guides/sports-betting-with-crypto) is relevant here for a different reason: instant top-ups make a live chase faster. Speed of the inbound transfer is a harm vector as much as a convenience.',
    },
    {
      id: "stop",
      title: "When the honest next step is to close the board",
      body: 'If you are hiding live slips, reloading during every pause, or using the cash-out button as a mood regulator, the in-play product is already costing more than a planned ticket. Watching the rest of the map with no money on it is allowed.\n\nLicensed books should offer deposit limits and time-outs. Use them before a long broadcast day, not after. If you need a harder stop, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). Site-level exclusion, national schemes and blocking software exist because live products are built to keep you clicking.\n\nA live esports board can make harm look like fandom. Organisation — notes, implied percents, a "system" — is not a reason to continue. If the slip is the only reason the match is interesting, skip the match or watch it clean.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.',
    },
  ],
  faqs: [
    {
      q: "What is live esports betting?",
      a: "Striking a bookmaker price after a match has started. The board moves with the feed. The book still keeps a margin. You are still betting on a real contest.",
    },
    {
      q: "Can stream delay give me an edge?",
      a: "Not in any reliable, legitimate sense. Books suspend, void late clicks and price off a feed that is not your overlay. Chasing delay is how people overtrade.",
    },
    {
      q: "Is cash-out a good idea in-play?",
      a: "Cash-out is another shaded price. Convert it to implied probability. It is often the book buying your ticket back so you will stay in the session.",
    },
    {
      q: "Do I need live betting to bet on esports?",
      a: "No. A pre-match series winner is enough for a recreational ticket. Live boards mainly increase the number of decisions per hour.",
    },
    {
      q: "Why do live prices freeze?",
      a: "Pauses, reconnects, admin messages or a feed the book does not trust. A freeze is not a locked price. Wait for the rule, or do not click when it returns.",
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
    "esports-odds-explained",
    "esports-betting",
    "how-to-bet-on-esports",
    "esports-match-fixing",
    "implied-probability",
    "esports-betting-sites",
    "live-betting-strategy",
  ],
  updated: "2026-11-26",
};

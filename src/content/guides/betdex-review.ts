import type { Guide } from "./types";

export const guide: Guide = {
  slug: "betdex-review",
  cluster: "Sports betting",
  keyword: "betdex",
  secondary: ["betdex fees", "betdex commission", "betdex legit"],
  title: "betdex review: 1% commission, licence, US access",
  description:
    "Review BetDEX’s documented commission, exchange orders, licensing and US access restrictions, with checks for conflicting limits and untested withdrawals.",
  h1: "betdex in 2026: 1% commission, matching, and a US reader",
  answer:
    "betdex matches a back with a lay and charges 1% of net profit in that market. The terms name an Anjouan licence, not a US state permit, and the United States is absent from a ban list that says it is incomplete. We did not fund an account, and this site does not book sports.",
  facts: [
    "Public sources read 20 October 2026 on the homepage, the status page, the terms, the commission article, and the withdrawal article. We did not open an account or time a cash-out. No affiliate link.",
    "The commission article says users pay 1% of net profits in a market, and that every user pays that same rate.",
    "Appendix 1 names Stucktaymore Limited under Anjouan licence ALSI-092404022-FI2. The Irish licence stopped applying on 1 July 2026.",
    "www.betdex.com/terms, www.betdex.com/terms-of-service, and www.betdex.com/blocked each returned 404 Not Found. The terms we read are on the docs host, dated 1 July 2026.",
    "The betdex status page said it was not aware of any issues affecting its systems. The homepage showed a location warning and an empty event list.",
    "A dollar minimum stake, a numbered withdrawal clock, and a live welcome percent were not published on the pages we opened.",
  ],
  sections: [
    {
      id: "pages-opened",
      title: "What the operator pages returned",
      body: "The betdex homepage loaded on 20 October 2026. It said the service was not available in this location, and that an existing account could still log in and bet. The event list said there were no events to show.\n\nMarkets are usually posted about a week ahead. We did not log in, so the empty board is only what this network saw.\n\nThree paths on the main host returned 404 Not Found: /terms, /terms-of-service, and /blocked. The terms that loaded are dated 1 July 2026. The footer still showed a 2026 copyright, an 18-plus line, and the Anjouan number.\n\n[How a back and a lay get matched](/guides/betting-exchange-explained) is the mechanism. [Prices set between two bettors](/guides/peer-to-peer-sports-betting) is the wider idea. The [sports betting](/guides/topics/sports-betting) hub holds the cluster.",
    },
    {
      id: "matching",
      title: "How a back, a lay, and a partial fill work",
      body: "On betdex, the queue is first in, first out. A back fills at the highest odds, and a lay fills at the lowest.\n\nOne full match on their page had $1,881 offered at decimal 1.85. The resting size at that price then shows $1,879.\n\nA $2,000 order at that price would take $1,879 and leave $121 open. An open remainder is not a settled bet. Section 7 reserves the stake from the balance.\n\nMatching and settlement sit on internal records, not on a public chain. Their Chiefs example is a $10 back at 1.67.\n\nA limit at 1.70 can rest unmatched. The lay side shows a price of 1.77, with $10 resting at 1.75.\n\nA postponed match stands if the new start is within 72 hours.\n\nA longer delay voids the markets and returns the stakes. A canceled match is remitted, and settlement uses the governing body's result.",
    },
    {
      id: "commission",
      title: "What betdex charges on a winning market",
      body: "Reading betdex fees starts with the commission article. Users pay 1% of net profits in a given market. Every account is on that rate, with no separate premium charge for winners.\n\nThe betdex commission line in the high-volume terms is that same rate at settlement, 1% of net winnings on matched bets. A market with no net profit does not, on that wording, produce a commission. We did not settle a ticket.\n\n**Example A, one market.** A $100 net win at 1% costs $1 and leaves $99. That figure is arithmetic on the printed rate.\n\n**Example B, their published week.** Trade $100,000 with $5,000 of net market profit and settlement still takes $50. A Tier 2 rebate of 20% returns $10 the next week.\n\nTiers are 1% up to $50,000 traded, 0.8% above that up to $500,000, and 0.5% above $500,000. A back counts as the stake, and a lay counts as the layer's risk. The rebate is paid after the week, not as a different charge at settlement.\n\nThe promo window is Monday 12 October through Sunday 25 October, and no year is printed. Those weekdays match 2026, so 20 October 2026 falls in the second week they name. We did not see a rebate in an account.\n\nPrices on the ladder run from 1.01 to 1000.",
    },
    {
      id: "cash",
      title: "Withdrawal routes and the clock that is missing",
      body: "The betdex withdrawal article says the account currency is USDC. You can send USDC on Solana or Ethereum, USDT on Tron, Solana, or Ethereum, plus BTC or SOL.\n\nSolana USDC is the route they call cheapest and quickest, and they say that route has no fee. Other coins and networks add a conversion fee plus a network fee. That percent is not published.\n\nA dollar withdrawal minimum is not published. Some coins have higher floors, Solana USDC is the lowest, and a partner sets those amounts.\n\nA numbered payout clock is not published. They say funds leave once the blockchain processes the send. We did not time a cash-out.\n\nFiat to a card or bank is described as a later plan. Section 7 still allows a fiat off-ramp where one exists, and an unplayed deposit returns by the original method.\n\nWithdraw to a wallet you already used, or another source you own. MoonPay is one named deposit on-ramp. Live chat and support@betdex.com are printed, and we sent no ticket.",
    },
    {
      id: "licence",
      title: "The Anjouan number, the Irish cutoff, and US access",
      body: "A betdex legit reading starts in Appendix 1. Stucktaymore Limited is the contracting entity, licensed in Anjouan, Union of Comoros, under ALSI-092404022-FI2. The appendix calls it a subsidiary of the labs company named there.\n\nOn 1 July 2026 the Irish licence stopped applying, and existing accounts moved to this Anjouan licence. The homepage footer prints the same number. The GLI page still cites an Isle of Man review, and the report file did not render as text.\n\nThe United States is not named in Appendix 3. That appendix says the list is not every blocked country. Availability is whatever the registration flow shows, and we did not create an account.\n\nThe homepage refused this network with a location warning. Section 22 leaves local law with the reader, and it bars access where the service is illegal. [Which states license a sportsbook](/guides/sports-betting-legal-states) is the state-permit map.\n\nAn Anjouan number is not a state licence. Section 6 puts tax on the account holder. [How a US win is declared](/guides/report-gambling-winnings) covers the filing, and this page is not legal advice.\n\nCourt disputes use UK law. Complaints are supposed to get a reply within 48 hours, and we filed none.",
    },
    {
      id: "limits",
      title: "One account, the limit clash, and a $10,000 cap",
      body: "The betdex terms allow one active account. A duplicate can be folded into the first, and its promotions can be voided. Email closure is supposed to finish within seven calendar days.\n\nThe limits article and section 12 disagree on timing. The terms say a decrease can wait 24 hours and may take seven days, while the limits page says a reduction is immediate and an increase or a removal takes seven days.\n\nSelf-exclusion blocks play and still allows a login to withdraw. We did not set a limit.\n\nNo login for three years makes the account dormant, and the clause does not price leftover funds. Bonus winnings can be forfeited if no deposit arrives within 60 days of opening.\n\nSection 21 caps aggregate liability at $10,000. Anyone under 18 is barred, and underage winnings can be forfeited. Their printed lines include Gambling Therapy, GamCare, GambleAware, and 0808 8020 133.",
    },
    {
      id: "score",
      title: "Scorecard, checklist, and who should stay away",
      body: "Read this before you fund betdex. Where a page printed no figure, the cell says not published. A cashier that disagrees with this text wins for that account.\n\n| Item | What the opened pages printed |\n| --- | --- |\n| Fees | 1% of net market profit at settlement; Solana USDC withdrawal fee none; other networks not published |\n| Payout speed | not published; they say once the blockchain processes it, and we did not time one |\n| Fairness proof | No public seed; section 7 says settlement is internal, not a public chain |\n| Licensing | Anjouan ALSI-092404022-FI2; Irish licence ended 1 July 2026; not a US state licence |\n| Support | support@betdex.com and live chat are named; a 48-hour complaint claim is untested |\n| Bonus terms | $50 credit expired 17:00 UTC on 30 January 2025; a live welcome percent is not published |\n\n- [ ] The betdex commission article still says 1% of net profit in the market.\n- [ ] A volume rebate is a dated promo page, and settlement still shows 1%.\n- [ ] A partial fill can leave an unmatched remainder.\n- [ ] A lay is the other side of the book, and an unwanted price can sit open.\n- [ ] Solana USDC is the withdrawal route they mark as having no fee.\n- [ ] A dollar minimum stake and a dollar withdrawal minimum are not published.\n- [ ] I am 18 or older, and my local age is not higher.\n- [ ] An Anjouan number is not a US state sports-betting licence.\n- [ ] The limits article and section 12 disagree on timing.\n- [ ] 1-800-GAMBLER is saved, and the responsible-gambling page is open.\n\nAggregate liability is capped at $10,000. The board we loaded was empty behind a location warning, and the stake minimum, withdrawal minimum, and payout clock are not published. The limits pages contradict each other, the GLI file did not render, and the $50 credit expired on 30 January 2025.\n\nThat credit needed a first bet of $50 or more and signups from 16 December 2024. Backing and laying the same selection to farm it was barred. It is not a live offer.\n\nStay away if you are under 18, if your law bars the product, or if you need a state-licensed book. Also stay away if you will leave a lay unread, if you are chasing a loss, or if you need a public seed or a printed cash-out clock. Call 1-800-GAMBLER if this stops being a read, and open [responsible gambling](/responsible-gambling) before a deposit.\n\nSee also: [Novig Review](/guides/novig-review).",
    },
  ],
  faqs: [
    {
      q: "What commission does betdex charge?",
      a: "betdex charges 1% of net profit in a market, and every user pays that rate. The high-volume page still takes 1% at settlement, then may rebate part of it after the week. A $100 net win at 1% costs $1 and leaves $99, which is arithmetic, not a ticket we settled.",
    },
    {
      q: "Is betdex legal in the United States?",
      a: "An Anjouan licence is not a US state sports-betting permit, and the terms print no state list. The United States is absent from Appendix 3, which says that list is incomplete, and our homepage load returned a location warning. Check your state regulator before you treat an offshore exchange as allowed where you live.",
    },
    {
      q: "How fast does betdex pay a withdrawal?",
      a: "A numbered withdrawal clock is not published. The withdrawal article says funds go out once the blockchain processes them, and it calls USDC on Solana the quickest route, with no fee. Other coins add conversion and network fees with no printed percent, and we did not time a cash-out.",
    },
    {
      q: "Does betdex publish a fairness proof?",
      a: "No public seed or hash is on the pages we opened. Section 7 puts matching and settlement on internal systems, not a public chain, and a GLI page names an Isle of Man review whose file did not render. The current terms name Anjouan, and we did not audit code.",
    },
    {
      q: "Did the Irish licence end?",
      a: "Yes. Appendix 1 says that on 1 July 2026 accounts moved from the Irish licence to Anjouan licence ALSI-092404022-FI2, held by Stucktaymore Limited, and the footer prints that number. We did not ask any regulator to reconfirm that licence file.",
    },
    {
      q: "Did this review fund an account?",
      a: "No account was funded. We opened the homepage, status page, terms, and fee articles on 20 October 2026, did not deposit or withdraw, and there is no affiliate link. Dollar cases are copied from their pages or labeled as arithmetic, and a cashier that disagrees wins.",
    },
  ],
  sources: [
    {
      label: "betdex homepage",
      url: "https://betdex.com",
    },
    {
      label: "System status",
      url: "https://status.betdex.com/",
    },
    {
      label: "Terms of Service, last updated 1 July 2026",
      url: "https://learn.betdex.com/betdex-exchange/useful-information/terms-of-service",
    },
    {
      label: "Commission article",
      url: "https://learn.betdex.com/betdex-exchange/using-the-betdex-exchange/betting-on-the-betdex-exchange/commission",
    },
    {
      label: "High-volume commission discount",
      url: "https://learn.betdex.com/betdex-exchange/promos/high-volume-commission-discount",
    },
    {
      label: "Withdrawing from your account",
      url: "https://learn.betdex.com/betdex-exchange/using-the-betdex-exchange/funding-my-betdex-account/withdrawing-from-your-betdex-account",
    },
    {
      label: "How matching works",
      url: "https://learn.betdex.com/betdex-exchange/using-the-betdex-exchange/betting-on-the-betdex-exchange/exchange-betting-basics/how-does-matching-work",
    },
    {
      label: "Providing liquidity",
      url: "https://learn.betdex.com/betdex-exchange/using-the-betdex-exchange/betting-on-the-betdex-exchange/providing-liquidity",
    },
    {
      label: "Valid decimal and American odds",
      url: "https://learn.betdex.com/betdex-exchange/useful-information/valid-decimal-and-american-odds",
    },
    {
      label: "Bet and get $50 offer, expired 30 January 2025",
      url: "https://learn.betdex.com/betdex-exchange/marketing/bet-and-get-usd50-offer",
    },
    {
      label: "Responsible gambling",
      url: "https://learn.betdex.com/betdex-exchange/useful-information/responsible-gambling",
    },
    {
      label: "Setting bet limits",
      url: "https://learn.betdex.com/betdex-exchange/using-the-betdex-exchange/managing-my-betdex-account/setting-bet-limits",
    },
    {
      label: "Exchange FAQ",
      url: "https://learn.betdex.com/betdex-exchange/overview/faqs",
    },
    {
      label: "GLI audit page, report file did not render",
      url: "https://learn.betdex.com/betdex-exchange/useful-information/gli-audit-report",
    },
  ],
  related: [
    "betting-exchange-explained",
    "peer-to-peer-sports-betting",
    "vig-betting",
    "sports-betting-legal-states",
    "report-gambling-winnings",
  ],
  updated: "2026-11-26",
};

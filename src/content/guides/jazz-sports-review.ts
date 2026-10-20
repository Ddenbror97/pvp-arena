import type { Guide } from "./types";

export const guide: Guide = {
  slug: "jazz-sports-review",
  cluster: "Sports betting",
  keyword: "jazz sports",
  secondary: [
    "jazz sports bonus",
    "jazz sports withdrawal time",
    "is jazz sports legit",
  ],
  title: "Jazz Sports Review: Bonus Rules and Crypto Cashier",
  description:
    "Jazz Sports caps a card bonus at 10% and limits anonymous accounts to crypto. Rollover math is printed. A payout clock is not published. We did not deposit.",
  h1: "Jazz Sports in 2026: bonus rules, crypto, and the payout clock",
  answer:
    "Jazz Sports is an offshore sportsbook and casino whose conditions cap a credit-card bonus at 10% and limit anonymous accounts to crypto, also with a 10% cash-bonus ceiling. A withdrawal clock is not published on the pages we could read. We did not open an account, and this page has no affiliate link.",
  facts: [
    "Last tested 20 October 2026. Jazz Sports site config loaded. The conditions host returned Cloudflare error 522 to a direct request, and the bonus clauses below are the text of that same URL retrieved the same day.",
    "Minimum age in the site config is 21. The footer on the shell says only 21+ may register. We did not create an account.",
    "The regulatoryCountry field in the public config is the word Somewhere. That is not a licence number.",
    "Anonymous accounts, in the conditions text, may only deposit and withdraw by crypto and may request at most a 10% cash bonus.",
    "A no-bonus player must roll the deposit plus fees at least once before a payout. The fee dollar amount is not published.",
    "Support mail in the site config is csd@jazzsports.ag. A reply time is not published. We did not send a ticket.",
  ],
  sections: [
    {
      id: "shell",
      title: "What the public shell actually returned",
      body: `The marketing host jazzsports.ag answered HTTP 200 on 20 October 2026. The HTML is a shell with Home, Bonuses, and Banking tabs, plus a 2026 copyright line.

The Bonuses and Banking tabs did not print offer copy. Their content fields were empty and pointed at home.jazzsports.ag, and those source URLs returned HTTP 500.

The conditions path on the same host returned the shell, not the rules essay. A direct request to the adsrv conditions URL returned 16 bytes reading error code 522.

[A plain start on sports prices](/guides/what-is-sports-betting) is the wider idea. [The margin a book keeps inside a price](/guides/vig-betting) is the house version of a fee. The [sports betting topic](/guides/topics/sports-betting) collects those pages.

This site does not book sports. The brand under review is Jazz Sports, the offshore book, not a music magazine and not our pots.`,
    },
    {
      id: "bonus",
      title: "What Jazz Sports prints about bonuses",
      body: `Jazz Sports conditions text says any credit-card deposit can receive a max bonus of 10%. Anonymous accounts can only deposit and withdraw by crypto and can request a max 10% cash bonus.

Bonus plans apply only to sports and the online casino. Bonuses are described as for US players, and other players are at management's discretion.

A 50% cash bonus has a maximum wager of $500. A 100% cash bonus has a maximum wager of $250. The player is told to ask what restrictions come with the plan they accept.

To be eligible for any bonus, the same text expects the player to redeposit funds previously withdrawn. It calls that the make-up figure, and exceptions sit with management.

Dollar example 1 is their own line. A $300 deposit with a 10% bonus is $30. They add deposit and bonus to get $330, then multiply by 4, and they print $1,320 in wagers needed.

That worked case is not a ticket we placed. Dollar example 2 uses only the card cap: a $200 card deposit at a 10% ceiling is a $20 bonus if that plan is the one offered.

The shell's Bonuses tab did not confirm that a 10% card plan was live on 20 October 2026. If the cashier shows a different percent, believe the cashier.

Horses, live casino, listed casino restrictions, and live wagering do not count toward the roll. The roll uses the lesser of the risk or the win on each wager.

A player who skips a bonus must still roll the deposit plus fees at least once before a payout. The dollar size of those fees is not published.`,
    },
    {
      id: "freeplay",
      title: "Free-play tickets, spins, and the $50 spin cap",
      body: `Free play at Jazz Sports is described as a no-risk ticket. A winning free-play wager becomes cash in the sports account.

The text limits those tickets to straight bets on NFL, NBA, MLB, and NHL. A parlay, a horse, or a live bet is outside that sentence.

New-customer complimentary casino spins have a max cash-out of $50. If the player then deposits, the text says the max cash-out is removed and the balance is reset to $50 before the new deposit.

Read that reset before you treat a spin balance as withdrawable cash. The casino contribution table is not a flat 100%.

Scratcherz, Predictor, and slots including 3D slots count 100%, with progressive jackpot games excluded. Roulette versions, Draw High-Lo, 3 Card Rummy, and Virtual Racebook count 20%.

Baccarat, American and European blackjack, several poker variants, and video poker count 10%. Pirate 21, Blackjack Super 7, Pai Gow, 21 Burn, Ride'm Poker, keno, Red Dog, Pontoon, and Top Card Trumps count 5%.

Craps and all progressive jackpots are listed at 0% where the retrieved text cuts off on that row. A $100 slot wager can add $100 toward a casino roll on that table, and a $100 craps wager can add $0.

Any game not named above is not published in the text we retrieved.`,
    },
    {
      id: "cashier",
      title: "Cashier keys in the config, and the missing clock",
      body: `The public site config lists payment methods, not a timetable. Ngine is marked for deposits and payouts, cashier code NGNE, with validation on.

QuickCash is marked for payouts, cashier code QCSH. FlashTeller is marked for deposits and payouts, cashier code FLST, validation off, and its icon file name is a crypto deposit image.

QuickCash Venmo, PayPal, and Cash App are marked for deposits only. Allowed currencies in that config are EUR, MXN, and USD.

A crypto coin is not in the currency list. The conditions text still says anonymous accounts can only move money by crypto.

Those two sentences can both be true for different account types, and they can also be stale. We did not open the cashier while logged in.

A withdrawal time for Jazz Sports is not published. No page we opened printed minutes, hours, or business days for a cash-out.

Minimum and maximum amounts are also not published in the config object. The houseMoney field prints $20,000, and that string is not a reserve we audited.

Documentation and proof of identity may be required for payouts on management's request. If the account is credited with funds the book does not receive, winnings from the time of that credit can be withheld.

One account is allowed per person, household, or IP address unless management permits another.`,
    },
    {
      id: "rules",
      title: "Age 21, cancelled live bets, and the Somewhere field",
      body: `Jazz Sports conditions text requires age 21. It also says you and your computer are in a place where internet wagering is not illegal, and that the operator does not know the laws where you live.

That is not a list of accepted US states. [Where a state permit exists](/guides/sports-betting-legal-states) is a different map. This book is not that map.

The software may refuse or limit any wager, and you cannot bet more than the account balance. Internet wagers on games can be cancelled 15 minutes after start, for software error or manipulation.

A bet you thought was live can be voided on that sentence. We did not place one.

Winnings can be withheld on suspected tampering, and on proved multiple accounts. The site config's regulatoryCountry value is the literal word Somewhere.

No licence number, regulator name, or certificate URL appeared in the config we saved. [What a licence line should name](/guides/crypto-casino-license) is the checklist this field fails.

US filers can read IRS Topic 419. Gambling winnings, including sports bets, are taxable even when no Form W-2G arrives, and loss deductions need records.

[How a US filer reports a win](/guides/report-gambling-winnings) follows that topic. This is not tax advice.`,
    },
    {
      id: "compare",
      title: "A house price, this book, and a player pot",
      body: `A house book hides an overround in the price. Jazz Sports public pages do not print a standard vig. They print bonus caps, a rollover formula, and a cashier map without a clock.

[How two bettors get matched](/guides/betting-exchange-explained) is a different product. [The on-chain sports book](/guides/overtime-markets-review) posts a protocol percent this shell does not.

| | This offshore book | A house-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| Fee or edge | Bonus caps and a rollover. A standard vig percent is not published | An overround inside the price | 5% of a Coinflip or Jackpot pot |
| Who you play | The book | The house | Another player |
| Payout speed | not published | not one number | $20 minimum cash-out |
| Provably fair | No | No | Yes |
| Minimum bet | not published | not one number | $1 Coinflip |

Dollar example 3 is our pot, not theirs. Two $50 Coinflip stakes make a $100 pot, the fee is $5, and the winner is paid $95.

Four $50 Jackpot entries make a $200 pot, the fee is $10, and the winner is paid $190. Roulette is 33 slots: 16 Purple and 16 Silver pay 2x, and 1 Green pays 14x.

Five percent comes off a winning payout, about a 7.88% Purple or Silver edge after the fee. Slott takes 10% of a winning pot. Those figures are in the [terms](/terms).

[Coinflip](/coinflip) shows the cut before you match. [Fairness](/fairness) checks the seed. A bonus rollover is a different contract from a pot fee.`,
    },
    {
      id: "score",
      title: "Checklist, scorecard, and who should stay out",
      body: `Read the cashier before you fund anything. The figures below are from pages touched on 20 October 2026, and a live bonus panel wins if it disagrees.

- [ ] I am 21 or older, and my local age is not higher.
- [ ] I know whether the account is anonymous, because crypto-only and a 10% cap attach to that label.
- [ ] A card bonus ceiling of 10% is the printed cap, not a promise the panel still offers it.
- [ ] The $300 plus 10% example needs $1,320 in counted wagers at their x4 line.
- [ ] Horses, live bets, and low-contribution casino games do not fill a roll at 100%.
- [ ] Prior withdrawals may have to be redeposited before any bonus.
- [ ] A payout clock is not published, and ID can be requested.
- [ ] The licence field says Somewhere.
- [ ] One account per person, household, and IP is the printed rule.
- [ ] 1-800-GAMBLER is saved, and the responsible-gambling page is open.

| Item | Printed on pages opened 20 October 2026 |
| --- | --- |
| Fees | Card bonus max 10%. 50% plan max wager $500. 100% plan max wager $250. Standard vig not published |
| Payout speed | not published |
| Fairness proof | No seed page. Software can void a bet 15 minutes after start |
| Licensing | regulatoryCountry is Somewhere. No certificate number |
| Support | csd@jazzsports.ag. Reply time not published |
| Bonus terms | Make-up redeposit, roll of deposit plus bonus times the plan number, contribution table |

Three cons should slow a deposit. The rules host returned error 522, so the bonus essay is a retrieved copy rather than a page that rendered in the browser.

The licence field is not a regulator. The payout clock is not published, and the make-up rule can block a bonus after a withdrawal.

Who should stay out: anyone under 21, anyone where internet wagering is barred, anyone who needs a state-licensed book, anyone who will not roll a deposit, and anyone chasing a loss. If this stops being a read, call 1-800-GAMBLER.

[Responsible gambling](/responsible-gambling) belongs open before a deposit.`,
    },
  ],
  faqs: [
    {
      q: "What bonus does the conditions text actually cap?",
      a: "A credit-card deposit is capped at a 10% bonus in the conditions text, and an anonymous account is limited to crypto with a 10% cash-bonus ceiling. A 50% plan, if offered, caps the wager at $500, and a 100% plan caps it at $250. The Bonuses tab we opened did not print a live offer, so the cashier wins if it disagrees.",
    },
    {
      q: "How does the printed rollover example work?",
      a: "Their line takes a $300 deposit, adds a 10% bonus of $30, and multiplies $330 by 4 to reach $1,320 in wagers. The roll uses the lesser of risk or win, and horses, live casino, restricted casino games, and live wagering do not count. A player who declines a bonus must still roll the deposit plus fees once, and that fee is not published.",
    },
    {
      q: "Is a withdrawal time printed?",
      a: "No clock is printed. The site config lists cashier codes for Ngine, QuickCash, and FlashTeller, plus Venmo, PayPal, and Cash App deposits, and it does not list minutes or business days. Identity documents may be required before a payout. We did not withdraw, and we did not time a cash-out.",
    },
    {
      q: "Is this a licensed US sportsbook?",
      a: "The public config stores regulatoryCountry as the word Somewhere, and no US state licence number was on the pages we opened. The conditions text tells you to decide whether internet wagering is legal where you sit, and it sets 21 as the age floor. That is not a state commission permit.",
    },
    {
      q: "Can an anonymous account use a card?",
      a: "The conditions text says anonymous accounts can only deposit and withdraw by crypto and can request at most a 10% cash bonus. Card deposits are the line that carries the separate 10% bonus cap. Venmo, PayPal, and Cash App appear as deposit methods in the config, not as a promise that an anonymous account may use them.",
    },
    {
      q: "Did this review fund Jazz Sports?",
      a: "No account was funded. We opened the public shell on 20 October 2026, saved the site config, and retrieved the conditions text after the rules host returned Cloudflare error 522. We did not deposit, bet, or withdraw, and there is no affiliate link. If the live cashier disagrees with this page, believe the cashier.",
    },
  ],
  sources: [
    {
      label: "Jazz Sports conditions of use (direct request returned Cloudflare 522; bonus text retrieved the same day)",
      url: "https://adsrv.jazzsports.ag/en/info/conditions-of-use",
    },
    {
      label: "Jazz Sports public site shell and site config, 20 October 2026",
      url: "https://jazzsports.ag/en",
    },
    {
      label: "IRS Topic 419, gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
  ],
  related: [
    "what-is-sports-betting",
    "vig-betting",
    "betting-exchange-explained",
    "sports-betting-legal-states",
    "overtime-markets-review",
    "smarkets-review",
  ],
  updated: "2026-10-20",
};

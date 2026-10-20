import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blockchain-poker-review",
  cluster: "Poker",
  keyword: "blockchain poker",
  secondary: [
    "blockchain poker review",
    "blockchain poker rakeback",
    "is blockchain poker legit",
  ],
  title: "Blockchain Poker Review: Rakeback and the Room",
  description:
    "Blockchain Poker publishes rakeback up to 100% and a 200% match up to $10,000. A cash-game rake percent is not in the files we saved. We did not deposit.",
  h1: "Blockchain Poker in 2026: rakeback claims and the missing rake",
  answer:
    "Blockchain Poker is a crypto poker room, not a generic essay about cards on a chain. Its own blog prints rakeback up to 100% and a 200% deposit match up to $10,000, both subject to terms, and it does not print a cash-game rake percent. We did not open an account or time a cash-out.",
  facts: [
    "Last tested 20 October 2026. Blockchain Poker homepage returned HTTP 200. The terms body did not. We did not fund an account. No affiliate link.",
    "The saved client names Highcard Software SRL, registration 3-102-796711, support@blockchain.poker, and a San Jose, Costa Rica address.",
    "The same screen says the room is licensed by Anjouan and then inserts a licence number from the server. The static file's fallback text is the placeholder [License Number].",
    "The 19 June 2026 blog post prints a free crypto faucet, a $5 verification bonus, and low rake without a percent.",
    "That post prints standard rakeback up to 100%, subject to terms, and a 200% match up to $10,000 for verified players, cleared through play.",
    "A follow-up request for the in-app terms document received a CloudFront 403. The rake schedule was not in the static bundle we saved.",
  ],
  sections: [
    {
      id: "room",
      title: "The room the homepage actually is",
      body: `blockchain.poker returned a poker client on 20 October 2026, not an article about distributed ledgers. The title names Blockchain Poker. The description offers bitcoin poker games and tournaments and a free bankroll line.

The HTML embeds a SideShift widget. The saved config sets the default deposit method to btc and the default settle method to bch. That is a widget default, not a withdrawal we sent.

The client bundle also contains the strings eCash, XEC, BCH, and satoshi. A full cashier menu with minimums and network fees was not in the HTML we saved, so those figures are not published here.

[The order of streets](/guides/texas-holdem-rules) is the game. The [poker topic](/guides/topics/poker) is the hub. [The private-club app](/guides/pppoker-review) is a different contract, with virtual chips the company says you do not own.

This site does not deal the room's hands. Our tables are separate pots.`,
    },
    {
      id: "rake",
      title: "What Blockchain Poker publishes about the fee",
      body: `The Blockchain Poker blog post dated 19 June 2026 lists faucet, freerolls, a verification bonus, a deposit bonus, rakeback, Turbo Rakeback, affiliate share, and low rake. It then says that stack is not an infinite money glitch.

You can still lose. Low rake is not a percent. The post does not print 2%, 3%, or 5%, and it does not print a cap in big blinds.

The client shows a label for rake percent and a label for a rake cap. The numbers that would fill those labels were not in the file we saved.

Dollar example 1 stops there. A $100 pot has no published rake, so the dollar cut is not published. Do not borrow a percent from a review site to fill the cell.

The same post says bonuses clear through play and are not instant cash. Rakeback returns a portion of fees you already paid.

Freerolls are free to enter and still have to be won. Variance remains.

Anyone promising a literal money glitch from this stack is, in the room's own sentence, confused or lying. That disclaimer is the useful part of the post.`,
    },
    {
      id: "back",
      title: "The 100% rakeback line and the boost strings",
      body: `Standard rakeback up to 100%, subject to terms on the room's site, is the blog's ceiling. At that level the post says the qualifying rake comes back, and it also says you can still lose the pot to another player.

The Blockchain Poker client repeats a shorter line: rakeback boosts let you earn back up to 100% of rake paid. A second string offers up to 100% in direct rakeback or 300% toward a community tournament. The 300% figure is a tournament-credit line in the bundle, not a cash multiplier we redeemed.

The post says a boost-style reward is not instant. The terms that would define the volume, the currencies, and the expiry did not load. Our socket follow-up for the terms document returned CloudFront error 403 on 20 October 2026.

Dollar example 2 cannot turn 100% into cash without a rake. If the unpublished rake on a session was $40, 100% of that rake would be $40 back, and the $40 is still not a number the room printed. The example shows the shape only.

A player who treats the ceiling as a wage is misreading the post. The fee comes back only if you paid it, and the other players can still win the pot.`,
    },
    {
      id: "bonus",
      title: "Faucet, the $5 check, and the 200% match",
      body: `The blog says the faucet gives free chips in real cryptocurrency, with no deposit. It then adds a $5 verification bonus as more starting room before you risk your own money. It does not print how often the faucet pays or which coin it pays.

The Blockchain Poker deposit line is a 200% match up to $10,000, for verified players, subject to terms, cleared through play. A $100 deposit is not given a release schedule on that page.

The ceiling is the figure. The release rate is not published in the post we saved.

We did not verify an account, so we did not receive $5, and we did not clear a match. The post says more table time is not a promise that skill shows up. Short samples stay noisy.

Eighteen is the age line at the bottom of the post. The room also says participation is for adults of legal gaming age where they live, and that crypto poker availability varies by region. A country list was not in the post.

[What a licence line should name](/guides/crypto-casino-license) is the next gap. The client names Anjouan and then a variable. The number itself was not in the static file.`,
    },
    {
      id: "company",
      title: "Highcard, Anjouan, and the placeholder number",
      body: `The about-style screen in the client says Blockchain Poker is owned and operated by Highcard Software SRL. The registration number in that string is 3-102-796711. The contact is support@blockchain.poker.

The address in the same string is Barrio Dent, Ofident Building, Office 3, Costa Rican North American Cultural Center, San Pedro, San Jose 11501, Costa Rica. We did not mail that office.

The next sentence says the room is licensed and regulated by the Government of the Autonomous Island of Anjouan, Union of Comoros, and operates under a licence number supplied as data. If that data is missing, the template prints the bracketed words License Number. We did not receive a filled number.

A passed-compliance sentence follows in the same template. A sentence in a bundle is not a certificate we downloaded. [Signs a site is not the operator](/guides/fake-casino-sites) is the habit of checking the company name against a document that actually loads.

The in-app terms, privacy, KYC, and responsible-gaming texts are requested with a policy slug. TERMS_OF_SERVICE is the slug.

The body did not arrive. Quote the blog and the company string, and mark the missing clauses not published.

US filers can read IRS Topic 419. Gambling winnings are taxable even without a Form W-2G.

[How a US filer reports a win](/guides/report-gambling-winnings) follows that topic. This is not tax advice.`,
    },
    {
      id: "compare",
      title: "A cash room, this client, and a player pot",
      body: `A house-banked casino takes an edge on its own game. A cash poker room takes a rake from a pot between players.

This client says the rake is low and does not print the percent. It is still a player-versus-player card room on the pages that loaded.

| | This crypto room | A house-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| Fee or edge | Rake percent not published. Rakeback ceiling 100% of rake paid | A house edge | 5% of a Coinflip or Jackpot pot |
| Who you play | Other players | The house | Another player |
| Payout speed | not published | not one number | $20 minimum cash-out |
| Provably fair | No seed page in the files we saved | No | Yes |
| Minimum bet | not published | not one number | $1 Coinflip |

Dollar example 3 is our pot, not theirs. Two $50 Coinflip stakes make a $100 pot, the fee is $5, and the winner is paid $95.

Four $50 Jackpot entries make a $200 pot, the fee is $10, and the winner is paid $190. Roulette is 33 slots: 16 Purple and 16 Silver pay 2x, and 1 Green pays 14x.

Five percent comes off a winning payout, about a 7.88% Purple or Silver edge after the fee. Slott takes 10% of a winning pot. Those figures are in the [terms](/terms).

[Poker](/poker) shows a table on this site. [Fairness](/fairness) checks the seed. A 100% rakeback ceiling is not that seed check.`,
    },
    {
      id: "score",
      title: "Checklist, scorecard, and who should stay out",
      body: `Read the Blockchain Poker terms if they load for you. The copy below is what we could save on 20 October 2026.

- [ ] The room is a poker client, not a chain essay.
- [ ] Low rake is not a percent I can budget.
- [ ] Rakeback up to 100% is a ceiling, subject to terms that did not load.
- [ ] The 300% string is a community-tournament line, not cash I counted.
- [ ] The 200% match tops out at $10,000 and clears through play.
- [ ] The $5 verification bonus is their sentence, not a payment we received.
- [ ] The faucet is free chips, and the coin schedule is not published here.
- [ ] The licence number was a placeholder in the static file.
- [ ] I am 18 or older, and my local age is not higher.
- [ ] 1-800-GAMBLER is saved, and the responsible-gambling page is open.

| Item | Printed in files opened 20 October 2026 |
| --- | --- |
| Fees | Rake percent not published. Rakeback ceiling 100% of rake paid |
| Payout speed | not published |
| Fairness proof | not published. No hand seed in the saved pages |
| Licensing | Highcard Software SRL, 3-102-796711. Anjouan named. Number not in the static file |
| Support | support@blockchain.poker. Reply time not published |
| Bonus terms | $5 verification line. 200% match up to $10,000, cleared through play |

Three cons should slow a deposit. The rake percent is not published, so low rake cannot be compared with another room's number.

The rakeback ceiling depends on terms that returned an error. The licence number did not render in the file we saved, so the Anjouan sentence is a template until the server fills it.

Who should stay out: anyone under 18, anyone who needs a printed rake before they sit, anyone who will treat rakeback as a wage, anyone chasing, and anyone in a place that bars the game. If this stops being a read, call 1-800-GAMBLER.

[Responsible gambling](/responsible-gambling) belongs open before a deposit. The room's own post says the stack does not guarantee winnings.`,
    },
  ],
  faqs: [
    {
      q: "What rake does the room charge?",
      a: "A cash-game rake percent is not published in the homepage, the client strings, or the 19 June 2026 blog post we saved. The post says the rake is low and does not give a percent or a cap. The client has labels for a rake percent and a cap, and the figures that would fill them were not in the file. Leave the cell as not published.",
    },
    {
      q: "How does the rakeback ceiling work?",
      a: "The blog prints standard rakeback up to 100%, subject to terms, meaning qualifying rake can come back at that ceiling. The client repeats up to 100% of rake paid, and a separate string mentions 300% toward a community tournament. The terms that define the volume did not load on 20 October 2026. You can still lose the pot.",
    },
    {
      q: "What is the deposit match?",
      a: "The blog prints a 200% deposit bonus match up to $10,000 for verified players, subject to terms, and says it clears through play. It does not print a release rate, such as dollars of bonus per dollar of rake. We did not deposit. If the cashier shows a different cap, believe the cashier.",
    },
    {
      q: "Is the faucet real money?",
      a: "The blog says the faucet gives free chips in real cryptocurrency, with no deposit, and it adds a $5 verification bonus. It does not print the coin, the drip size, or the wait between claims. We did not claim it. Free chips are not a promise that the next session wins.",
    },
    {
      q: "Who operates the room, and under what number?",
      a: "The client names Highcard Software SRL, registration 3-102-796711, in San Jose, Costa Rica, with support@blockchain.poker. It says Anjouan licenses the room and then inserts a licence number from the server. The static fallback is the placeholder License Number, so the filled number is not published in the file we saved.",
    },
    {
      q: "Did this review fund Blockchain Poker?",
      a: "No. We opened the homepage and saved the client bundle and the 19 June 2026 blog post on 20 October 2026. A request for the in-app terms returned CloudFront error 403. We did not deposit, play, or withdraw, and there is no affiliate link. A live cashier wins if it disagrees with this page.",
    },
  ],
  sources: [
    {
      label: "Blockchain Poker homepage and client shell, 20 October 2026",
      url: "https://blockchain.poker/",
    },
    {
      label: "Blockchain Poker blog, 19 June 2026, on rakeback and the deposit match",
      url: "https://blog.blockchain.poker/p/the-infinite-money-glitch-lets-actually",
    },
    {
      label: "IRS Topic 419, gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
  ],
  related: [
    "texas-holdem-rules",
    "heads-up-poker-strategy",
    "crypto-casino-license",
    "fake-casino-sites",
    "pppoker-review",
    "coinpoker-review",
  ],
  updated: "2026-10-20",
};

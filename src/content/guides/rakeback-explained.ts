import type { Guide } from "./types";

export const guide: Guide = {
  slug: "rakeback-explained",
  cluster: "Foundations",
  keyword: "rakeback explained",
  secondary: ["what is rakeback", "poker rakeback", "rakeback percentage", "casino rakeback"],
  title: "Rakeback Explained: Poker Rooms and What You Keep",
  description:
    "Rakeback explained: a refund of part of the rake a poker room already took. How it is calculated, versus casino cashback, and what it does not change.",
  h1: "Rakeback explained: how poker rooms return a slice of rake",
  answer:
    "Rakeback explained simply: the poker room takes rake from pots or a time charge, then returns a contracted percentage of the rake you generated. It is a rebate on a fee you already paid, not a rebate on cards that went against you. It can lower the cost of volume. It cannot make a losing player a winner by itself.",
  facts: [
    "Rake is the room’s cut: a percentage of the pot with a cap, or a fee per hour/hand.",
    "Rakeback is a share of that cut, paid to the player or an affiliate deal.",
    "Contribution is usually based on weighted contributed rake, not on whether you won the pot.",
    "Casino “rakeback” on slots is often just cashback with borrowed language.",
    "PVPspinArena is not a poker room; see crypto poker for how tables actually run.",
  ],
  sections: [
    {
      id: "rake",
      title: "Start with rake, not with the refund",
      body: `Rakeback explained only makes sense after rake.

In cash-game poker the room does not play a hand against you. Players play each other. The room is paid by:

- **Pot rake.** A percentage of each pot, often with a cap (for example 5% up to $5). Small pots pay a higher effective rate; capped pots pay less as a percentage.
- **Time rake / deal-making fees.** A charge per hour or per hand, common at higher stakes.
- **Tournament fees.** A buy-in split into prize pool and fee (the “+$10” on a $100+$10). That fee is not pot rake but it is the same idea: the house is paid for hosting.

This [Foundations](/guides/topics/foundations) page is for adults 18+. For how crypto rooms deal cards and what you can actually verify, read [crypto poker](/guides/crypto-poker). PVPspinArena runs Jackpot, Coinflip and Roulette only. A 0% default fee on some PvP pots is a published fee, not poker rakeback.

If poker volume is already a problem, skip the rebate math and use [responsible gambling](/responsible-gambling).

Rake is not a house edge on a slot. You can be a winning player versus the field and still lose after rake. You can be a losing player and still receive rakeback. Mixing those columns is how people say “I almost broke even with the deal.” Almost even versus the field plus a rebate is still a cost if the field beat you.

Time charges at high stakes make the fee predictable. Pot rake makes it lumpy: a night of limped pots can rake more than a night of one big all-in, depending on the cap. Your rakeback follows that lumpiness.

If you cannot get a rake statement for last week, you cannot price the deal. Ask for one. A percent without a dollar base is a slogan. Slogans are how people sit extra hours. Get the dollar figure for last week before you sign a new deal. No figure, no deal.`,
    },
    {
      id: "what-rb",
      title: "What rakeback is",
      body: `Rakeback is a contract: you generate rake, the room (or a skin, club or affiliate deal) returns a percentage of that rake on a schedule — daily, weekly, or as table chips.

Illustration: you contributed $80 of rake this week by playing many pots. Deal is 30% rakeback. Gross rebate = $24. If the deal pays in bonus chips with extra playthrough, you do not have $24 cash. If it pays to the cash balance, you do.

“Contributed” matters. Rooms use methods such as:

- **Dealt or weighted contributed rake (WCR).** Your share of the rake in pots you were dealt into, sometimes weighted by how you put money in.
- **Actual rake paid when you win the pot.** Older and less common; it rewards winners of raked pots.

Two players in the same game can see different rakeback from the same session if the method is WCR versus “winner pays.” Read the method, not the big percentage in an ad.

Released versus generated rake is another split. A room may generate $100 of rake on your tables and “release” $70 into the deal pool after they take a house share or an affiliate override. 40% of $70 is not 40% of $100. Ask which number the percent applies to.

Payment form: cash, pending bonus, tournament tickets, or a token. Tickets are a [casino tournament](/guides/casino-tournaments) problem on top of a rake problem. Tokens you can only reload are chips.`,
    },
    {
      id: "math",
      title: "A worked illustration",
      body: `Illustration only — stakes and caps vary by room.

- 6-max cash, $0.50/$1, 5% rake, $4 cap.
- You play 400 hands. Suppose your contributed rake totals $30 for the week (a made-up working number, not a forecast).
- Rakeback 27% → $8.10 returned.
- Your win/loss versus other players is a separate column. If you lost $120 to the field, you are still down about $111.90 after rakeback. The rebate did not flip the month.

Compare that to a casino [cashback casino bonus](/guides/cashback-casino-bonus) of 10% on a $120 slot loss = $12. Different base: loss versus rake. Different game: you were not playing other people.

Effective hourly cost of poker is: expected value versus the field, minus rake, plus rakeback, minus time. Recreational players often skip the first term and stare at the third. That is how a 40% rakeback deal becomes a reason to play eight hours you did not have.

Bankroll math still applies. A deal does not replace [poker bankroll](/guides/poker-bankroll-management) discipline or a household [gambling budget](/guides/gambling-budget). If the only way the deal “works” is 30 hours a week you do not have, it does not work. It is a job listing without a wage.

Illustration of hours: $8.10 a week rakeback is about $1 an hour if you played eight hours. You would not take a shift for $1. Do not take one because the $8.10 arrived as a push notification.`,
    },
    {
      id: "deals",
      title: "Where deals come from",
      body: `Retail players may see a flat site-wide percent. Grinders may have a personal deal. Affiliates sometimes take a cut of the rake you generate and share part of it — which is why “70% rakeback” ads exist and why the room still profits.

Ask:

- Is the percent of actual contributed rake or of a smaller “released” number?
- Are there downsides: ticket requirements, locked chips, a grind to a VIP tier?
- Does the deal require you to play through a skin that takes an extra cut?

[VIP casino programs](/guides/vip-casino-programs) on house-banked sites copy the language. Demand a formula. If they cannot show rake because there is no rake, you are looking at cashback or a gift.

Soft landing deals (extra percent for a month) exist to move you off another room. Price the first month and the month after. A 60% teaser that becomes 20% is a teaser.

Clubs and skins on some crypto networks take a second cut for hosting a table inside a larger network. Your “70%” may be 70% of what remains after the network and the club. Ask for a waterfall, not a slogan.`,
    },
    {
      id: "vs-cashback",
      title: "Rakeback versus casino cashback",
      body: `| | Poker rakeback | Casino cashback |
| Base | Rake generated | Usually net loss |
| Opponent | Other players | The house edge |
| Skill | Can change the player-vs-player column | Does not change edge |
| Marketing lie | “Get paid to play” | “Get losses back” |

Both can be real numbers. Both are used to increase hours. Neither is a salary.

[Casino bonuses explained](/guides/casino-bonuses-explained) still applies if rakeback lands as bonus chips.

If you play both poker and casino on one brand, do not let casino cashback and poker rakeback share a mental bucket. They have different bases and different ways to increase hours. A combined “rewards balance” is how sites hide which product you are feeding.`,
    },
    {
      id: "crypto",
      title: "Crypto rooms and borrowed words",
      body: `Crypto poker clubs may pay rakeback in the same stablecoin you buy-in with, or in a token. Tokens you can only reload on that club are chips. USDT rakeback to a wallet you control is closer to cash.

Provably fair claims on a full deck are harder than on a one-shot [provably fair casino](/guides/provably-fair-casino) game. Do not let a rakeback percent distract you from how cards are dealt. That is the [crypto poker](/guides/crypto-poker) problem.

If a “rakeback” page is attached to crash, dice or slots, read the formula. You are probably looking at a house-banked rebate. The [house edge](/guides/house-edge) is still the price of those games.

Wallet payouts should go to an address you control. A club that keeps “your rakeback” as a balance you can only sit with is not paying you. They are seating you.

Provably fair marketing next to a rakeback percent is two claims. Check both. A high rebate does not prove the shuffle.`,
    },
    {
      id: "limits",
      title: "What rakeback does not do",
      body: `- It does not make calling too wide a winning strategy.
- It does not remove variance. Downswings still happen; the rebate is a few percent of rake, not of the swing.
- It does not justify staking a [gambling budget](/guides/gambling-budget) you cannot afford “because of the deal.”
- It does not replace table selection, game choice or quitting when you are no longer thinking.

If you are increasing stakes only to generate more rake for a deal, you are paying the field for a coupon.

Moving up in stakes to “hit the deal” is how recreational stacks die. The field at the next level is often tougher. Rake caps may be higher in dollars. Your rebate percent may not rise as fast as the dollars you lose to better players.

If volume is already harm — hiding hours, skipping work, using bill money for buy-ins — the deal is irrelevant. Use the stop tools. A rakeback statement is not a reason to stay.`,
    },
    {
      id: "next",
      title: "Use the rebate as a fee discount, not a job",
      body: `Rakeback explained: a slice of rake returned after you already paid to play other people. Price the method and the pay form. Keep poker in a budget like any other gambling product.

If volume is already harm, ignore deals. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). More basics sit in our [Foundations guides](/guides/topics/foundations). Site help is on [responsible gambling](/responsible-gambling). For table mechanics, return to [crypto poker](/guides/crypto-poker).

If a deal only works at hours you do not have, it is not a deal. It is a job listing without a wage. Walk away from the percent. Keep the evenings. Rakeback that requires you to become a different person is priced wrong no matter what the email says.`,
    },
  ],
  faqs: [
    {
      q: "What is rakeback in poker?",
      a: "It is a refund of part of the rake you generated, paid by the room or a deal. It is not a refund of chips you lost to other players. Ask which contributed-rake number the percent actually uses.",
    },
    {
      q: "Is rakeback the same as cashback?",
      a: "No. Cashback is usually a slice of net losses on house-banked games. Rakeback is a slice of hosting fees on player-versus-player poker. Different base, different product.",
    },
    {
      q: "Does a high rakeback percentage mean I will profit?",
      a: "No. You can still lose to the field by more than the rebate. Rakeback only shrinks the fee column.",
    },
    {
      q: "How is contributed rake calculated?",
      a: "Rooms publish a method such as weighted contributed rake. Two methods can pay two different players differently after the same session. Read the method.",
    },
    {
      q: "Do online casinos offer real rakeback?",
      a: "On house-banked games they usually mean cashback. Real rakeback belongs to raked poker or similar PvP fee products.",
    },
    {
      q: "Does PVPspinArena pay rakeback?",
      a: "No. It is not a poker room. PvP Jackpot and Coinflip use a published house fee (0% by default). There is no rake-and-rebate ladder.",
    },
  ],
  sources: [
    { label: "Wizard of Odds — house edge", url: "https://wizardofodds.com/gambling/house-edge/" },
    { label: "National Council on Problem Gambling", url: "https://www.ncpgambling.org/" },
  ],
  related: [
    "crypto-poker",
    "casino-bonuses-explained",
    "vip-casino-programs",
    "house-edge",
    "what-is-a-crypto-casino",
    "cashback-casino-bonus",
  ],
  updated: "2026-09-26",
};

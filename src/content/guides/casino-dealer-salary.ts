import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-dealer-salary",
  cluster: "Casino knowledge",
  keyword: "casino dealer salary",
  secondary: [
    "how much do casino dealers make",
    "dealer tokes",
    "croupier salary",
    "blackjack dealer pay",
  ],
  title: "Casino Dealer Salary: Base Pay, Tokes and Variation",
  description:
    "Casino dealer salary explained: base wage plus pooled tips (tokes), why pay swings by venue, game and country, and how to read BLS wage data correctly.",
  h1: "Casino dealer salary: base pay, tips and why it varies so much",
  answer:
    "A casino dealer salary usually has two parts: an hourly base wage set by the employer and a share of pooled tips, known as tokes. In busy high-limit venues the tip share is often larger than the base. Total pay therefore depends heavily on the property, the games dealt, the shift and local tipping culture, which is why published averages hide a very wide range.",
  facts: [
    "Dealer pay is typically base wage plus a share of a tip pool, split by hours worked.",
    "US law lets employers count some tips toward minimum wage in many states; others require the full minimum before tips.",
    "US BLS occupational wage data for gambling dealers includes tips in its wage definition.",
    "High-limit rooms, busy resorts and weekend night shifts generally produce larger tip pools.",
    "Tipping culture differs by country; in some places croupier tips are pooled into a tronc or are uncommon.",
  ],
  sections: [
    {
      id: "structure",
      title: "How dealer pay is structured",
      body: `Most dealers are paid in two streams, and understanding the split is the whole story.

**Base wage.** An hourly rate paid by the casino. In many places it sits at or slightly above the legal minimum wage for the area. It is predictable and is what shows on a job ad.

**Tokes.** "Toke" is casino slang for a tip, usually said to come from "token". Players tip dealers by handing chips across or by placing a bet for the dealer. At most casinos dealers do not keep tips individually. Every toke goes into a locked box at the table, the boxes are counted at the end of each day under supervision, and the pool is divided among dealers according to hours worked. A dealer who worked 8 hours gets twice the share of one who worked 4, regardless of which table they stood at.

### Why pooling exists

Pooling removes the incentive for a dealer to favour a big tipper, rush a slow table or steer players, and it spreads the reward of a lucky high-limit night across the whole team. It also makes tips auditable, which regulators and tax authorities like.

### Other parts of the package

Full-time casino jobs often include health insurance, paid time off, meals on shift and, in unionised properties, negotiated scales and seniority rules. These matter when comparing a job with a higher toke rate but no benefits.

This guide sits in the [Casino knowledge topic](/guides/topics/casino-knowledge). Training and licensing are covered in [dealer school](/guides/dealer-school), and the player's side of tipping is covered in [casino etiquette](/guides/casino-etiquette).`,
    },
    {
      id: "worked",
      title: "A worked example of a dealer's week",
      body: `The numbers below are an illustration, not a survey. They show how the two streams combine.

Suppose a dealer earns a base of $12 an hour and works five 8-hour shifts, 40 hours. The casino's daily tip pool divided by total dealer hours gives a toke rate per hour. Assume that rate averages $18 an hour across the week.

| Item | Calculation | Weekly total |
| --- | --- | --- |
| Base wage | 40 × $12 | $480 |
| Tokes | 40 × $18 | $720 |
| Gross pay | $480 + $720 | $1,200 |

In this example tips are **60%** of gross pay. If the toke rate dropped to $8 an hour in a slow month, tokes would fall to $320 and gross to $800, a 33% pay cut with no change in the base.

### Annualising carefully

$1,200 × 52 weeks = $62,400 before tax. But nobody works 52 weeks, toke rates are seasonal, and many new dealers work part-time or split shifts. A realistic estimate uses the hours you will actually get and a toke rate averaged across a full year, including quiet months.

### Where the toke rate comes from

The toke rate is simply total tips ÷ total dealer hours. It rises when players are winning and generous, when high-limit tables are busy, and during conventions, holidays and big sporting weekends. It falls midweek and off-season. Dealers usually learn the typical range for a property within their first months, and experienced dealers often ask about the toke rate before accepting an offer.

### Why the pool is shared across tables

Under pooling, a dealer on a $10 blackjack table on a quiet Tuesday receives the same hourly toke share as a colleague dealing a $500 baccarat game that night. Over a year the rotation evens this out, since most dealers work a mix of tables. It does mean an individual dealer's income depends on the whole property's traffic, not on their own charm at the table. Some large resorts run separate pools for high-limit rooms or for specific games, which changes the maths: a baccarat-only pool at a resort with many high-stakes players can pay far more per hour than the main floor pool. When comparing offers, ask which pool you would join and how shares are calculated for part-time and trainee dealers, who sometimes receive a reduced share at first.`,
    },
    {
      id: "bls",
      title: "Reading BLS wage data for gambling dealers",
      body: `In the United States the Bureau of Labor Statistics publishes annual wage data for **gambling dealers** (occupation code 39-3011) and for **first-line supervisors of gambling services workers** (39-1013). It is the most authoritative national source, and it is worth understanding what it measures before quoting it.

### What the BLS figures include

The BLS Occupational Employment and Wage Statistics definition of wages includes tips along with base pay. That means the published hourly and annual figures are meant to reflect both streams, not base pay alone. In practice, reported tips depend on what employers record, so the figures are an approximation of total pay.

### Why the median can mislead

- **Mix of venues.** The national figure blends small regional casinos, tribal properties, card rooms and major resorts. A dealer at a busy resort can earn several times what a dealer at a quiet regional venue earns.
- **Part-time work.** Annual figures are calculated from hourly rates assuming full-time hours, which many dealers do not work.
- **Geography.** BLS publishes state and metropolitan breakdowns; these vary more than the national median suggests.

Check the latest BLS release for current numbers rather than relying on figures repeated on job sites, which are often old or leave out tips. The BLS page for gambling dealers also lists the industries that employ the most dealers and the states with the highest employment.

### Supervisors and pit bosses

Supervisors generally earn a salary or higher hourly rate and often do not share in the dealer toke pool. A promotion can mean steadier pay, but in a strong tipping venue it does not always mean more money. The role is covered in [pit boss](/guides/pit-boss).`,
    },
    {
      id: "variation",
      title: "What makes dealer pay go up or down",
      body: `Beyond the property itself, a handful of factors decide where a dealer lands in the range.

| Factor | Effect on pay | Why |
| --- | --- | --- |
| Venue size and traffic | Large | More players and higher limits mean bigger tip pools |
| Games dealt | Moderate | Multi-game dealers get more shifts and high-limit tables |
| Shift | Moderate | Weekend nights are busiest; weekday mornings are quiet |
| Seniority | Moderate | Seniority can mean better shifts and first choice of hours |
| Pooling rules | Moderate | Some pools are property-wide, some by game or room |
| Local wage law | Varies | Sets the floor for base pay |

### Minimum wage and tip credits

In the US, federal law lets employers pay tipped workers a lower cash wage, $2.13 an hour at the federal level, as long as tips bring the total up to the full minimum wage. Many states set a higher tipped wage, and several, including Nevada and California, require employers to pay the full state minimum wage before tips. So the same toke rate produces different total pay in different states. The US Department of Labor keeps a state-by-state table.

### Poker dealers are different

Poker dealers are often tipped per pot by the winner rather than through a property-wide pool, and many keep their own tips or pool only with other poker dealers. Their income depends heavily on how many hands per hour they deal and the stakes of the game. A few rooms pay poker dealers mostly in tips on top of a low base.`,
    },
    {
      id: "countries",
      title: "Dealer pay outside the United States",
      body: `Tipping culture shapes dealer pay more than any other factor, and it varies country by country. Treat the notes below as general patterns and check local employers for specifics.

- **Tronc systems.** In several European countries, tips given to croupiers go into a shared pot called a **tronc**, which is distributed among staff. In some continental casinos the tronc has historically made up a large share of staff pay.
- **Low-tipping cultures.** Where tipping is uncommon, dealers are paid mainly by salary, so pay is steadier but has less upside from busy nights.
- **Cruise ships.** Ship croupiers work on contracts that include accommodation and food, which changes how a headline wage compares with a land job.
- **Live casino studios.** Dealers who work on camera for online live-dealer tables are usually salaried or paid hourly, since online players tip less or not at all. See [live dealer casino](/guides/live-dealer-casino).

### Comparing offers across countries

Compare net pay after tax, the value of accommodation or meals if provided, guaranteed hours, and whether tips are pooled and how. A headline hourly rate is almost meaningless without those details. If you are researching broader industry numbers, the [gambling statistics](/guides/gambling-statistics) guide covers market size and employment data sources.

### Tax on tips

In most countries tips are taxable income. In the US, employees must report tips to their employer, and pooled tips distributed by the casino usually run through payroll so tax is withheld. Rules differ elsewhere, so ask the employer how the tip pool is taxed.`,
    },
    {
      id: "players",
      title: "What players should know, and the PvP angle",
      body: `If you play table games, knowing how dealers are paid clarifies a few habits.

- **Tips go to the pool.** A $5 toke is not a private gift to that dealer; it is shared with everyone on the shift. Tip because you want to, not because you think it buys luck or better cards. It does not.
- **Betting for the dealer.** At blackjack, a small bet placed for the dealer beside your own is a common way to tip. If it wins, the dealer's winnings go to the pool too.
- **Dealers cannot change outcomes.** Pay, tips and mood do not affect the cards or the ball. A tip for "a hot dealer" is a cousin of the [gambler's fallacy](/guides/gamblers-fallacy).
- **Tipping is part of your cost.** If you tip $5 an hour on top of an expected loss from the [house edge](/guides/house-edge), include both in your budget.

### How PVPspinArena compares

PVPspinArena runs three player-vs-player games, [Jackpot](/), Coinflip and Roulette, with no dealer at all, so there is no tipping and no toke pool. Coinflip is a 50/50 between two players, and the winner takes the pot minus any fee shown before entry. Roulette pays 2x on Purple or Silver and 14x on Green, a edge you can read from the 33-slot pay table from the pay table. Results come from committed seeds you can check on the [fairness](/fairness) page. Play is 18+, and budgeting tools are on the [responsible gambling](/responsible-gambling) page.`,
    },
  ],
  faqs: [
    {
      q: "How much do casino dealers make?",
      a: "It varies widely. Pay is a base wage plus a share of pooled tips, so a dealer at a busy resort can earn several times what one at a quiet regional casino earns. Check current BLS data for US averages and ask employers about typical toke rates.",
    },
    {
      q: "Do casino dealers keep their own tips?",
      a: "Usually not. Most casinos pool dealer tips and divide them by hours worked. Poker dealers are an exception in many rooms and may keep their own tips or pool only with other poker dealers.",
    },
    {
      q: "What are tokes?",
      a: "Toke is casino slang for a tip to a dealer. Tokes go into a locked box at the table and are counted and split among dealers, typically by hours worked.",
    },
    {
      q: "Is being a casino dealer a good job?",
      a: "It can pay well in a busy venue and needs only short training. Downsides are standing all shift, nights and weekends, repetitive strain and pay that swings with tips.",
    },
    {
      q: "Do the BLS dealer wage figures include tips?",
      a: "Yes. The BLS occupational wage definition includes tips, so its figures are meant to reflect total pay, though they depend on the tips employers report.",
    },
  ],
  sources: [
    {
      label: "US BLS: Gambling dealers wage data",
      url: "https://www.bls.gov/oes/current/oes393011.htm",
    },
    {
      label: "US Department of Labor: Minimum wages for tipped employees",
      url: "https://www.dol.gov/agencies/whd/state/minimum-wage/tipped",
    },
    { label: "Wikipedia: Croupier", url: "https://en.wikipedia.org/wiki/Croupier" },
  ],
  related: ["dealer-school", "pit-boss", "casino-host", "casino-etiquette", "live-dealer-casino"],
  updated: "2026-09-27",
};

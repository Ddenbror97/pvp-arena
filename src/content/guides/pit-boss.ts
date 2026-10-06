import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pit-boss",
  cluster: "Casino knowledge",
  keyword: "pit boss",
  secondary: [
    "pit boss casino",
    "pit manager",
    "casino floor supervisor",
    "what does a pit boss do",
  ],
  title: "Pit Boss: What a Casino Pit Boss Actually Does",
  description:
    "Pit boss explained: where the role sits in the casino hierarchy, what a pit manager signs, how players get rated, and how it differs from a floor supervisor.",
  h1: "Pit boss: the casino role, the hierarchy and the daily job",
  answer:
    "A pit boss is the casino manager responsible for a pit, the cluster of table games arranged around a central work area. The pit boss supervises floor supervisors and dealers, approves chip fills and credits, signs off on large payouts and markers, settles disputes, rates players for comps and works with surveillance when something looks wrong. It is a management role, not a dealing role.",
  facts: [
    "A pit is a ring of table games with a staff-only area in the middle; the pit boss runs one pit per shift.",
    "Typical chain: dealer → floor supervisor → pit boss (pit manager) → shift manager → casino or table games director.",
    "Chip fills and credits move bankroll between the cage and a table and need paperwork signed by several people.",
    "Player ratings record average bet, time played and game, which drive comps and host attention.",
    "In the US the role is grouped by the BLS under first-line supervisors of gambling services workers.",
  ],
  sections: [
    {
      id: "what",
      title: "What a pit boss is and where the word comes from",
      body: `Walk onto a table-games floor and you will see the tables arranged in ovals or horseshoes, with the dealers facing outward and a staff-only space in the middle. That inner space is the **pit**. The person accountable for everything that happens in it during a shift is the pit boss. In modern corporate casinos the job title on the badge is usually **pit manager**, and in some venues the same work is split between a pit manager and one or more floor supervisors. "Pit boss" survives as the everyday name, partly because films made it famous.

The role is about control. Table games are the part of a casino where cash, chips and human judgement meet at speed. A dealer can make a mistake, a player can try a past-post, a chip rack can run low in the middle of a hot shoe. The pit boss is the person who has authority to stop the game, count the rack, call surveillance or approve a payout that is larger than a dealer is allowed to push on their own.

People sometimes use "pit boss" loosely for anyone in a suit standing behind the tables. On most floors that person is a floor supervisor watching two to six games. The pit boss is one step up and watches the whole pit, which can be a dozen or more tables. If you want the vocabulary that surrounds the job, the [casino terminology](/guides/casino-terminology) glossary covers the floor words, and this page sits in the [Casino knowledge topic](/guides/topics/casino-knowledge) with the other jobs guides.`,
    },
    {
      id: "hierarchy",
      title: "Where the pit boss sits in the casino hierarchy",
      body: `Titles vary by company and country, but the table-games ladder in a large casino usually looks like this:

| Level | Common titles | Span of control |
| --- | --- | --- |
| Dealer | Dealer, croupier | One table at a time |
| Floor supervisor | Floorperson, floor, inspector | Two to six tables |
| Pit boss | Pit manager, pit supervisor | One pit, often 8–20 tables |
| Shift manager | Table games shift manager | The whole table floor for a shift |
| Director | Table games director, casino manager | All shifts, budgets and policy |

Dealers are the front line and the entry point; the path into that seat, including auditions and licensing, is covered in [dealer school](/guides/dealer-school). The word croupier is simply the European and roulette-flavoured name for the same seat.

### Who the pit boss answers to and works beside

The pit boss reports to a shift manager and works sideways with three departments that are independent on purpose. **Surveillance** watches the cameras and reports to its own chain, often straight to compliance or the general manager, so that the people handling chips are not the people watching them. **The cage** holds the casino bankroll and issues chips and cash; see [casino cage](/guides/casino-cage). **Security** handles physical safety and removals. A pit boss can ask any of them for help but cannot overrule them.

### Small venues and card rooms

In a small casino one person may be pit boss for the entire table floor. In poker rooms the equivalent role is usually called the **floor** or **floor manager**, and its main job is rulings on hand disputes rather than bankroll control, because the house is not a party to the pot.`,
    },
    {
      id: "duties",
      title: "The daily job: fills, credits, payouts and disputes",
      body: `A shift in the pit follows a routine that is mostly paperwork and attention.

1. **Opening the tables.** Each table has a chip float. At the start of a shift the pit boss or a supervisor verifies the rack count against the opening slip and signs it.
2. **Fills and credits.** When a table's rack runs low, the pit requests a fill from the cage. A runner brings chips, and the fill slip is signed by the runner, the dealer and the supervisor, with the cage keeping a copy. A credit moves surplus chips back the other way. The multiple signatures exist so that no single person can move bankroll unobserved.
3. **Large payouts and limit changes.** Dealers usually need a supervisor to verify big wins, colour-ups and raised table limits. The pit boss approves the biggest ones.
4. **Markers.** When a credit player wants chips at the table, the pit issues a marker, the player signs it and the chips are released. The mechanics and the legal weight of that paper are in [casino marker](/guides/casino-marker).
5. **Disputes.** A player says the dealer mispaid, or a card was exposed, or a bet was placed late. The floor supervisor makes the first call; the pit boss is the escalation. For anything unclear, the standard answer is to ask surveillance for a replay before ruling.
6. **Closing.** At shift end, racks are counted and the table's win or loss for the shift is recorded.

### What pit bosses watch for

Pit staff are trained to notice patterns: bets that grow sharply at odd moments, players who never lose to the house edge over long sessions, chips being passed between players, dealers who handle chips unusually. Blackjack advantage play is the classic example; [card counting](/guides/card-counting) is legal in most places, but casinos can respond by shuffling earlier, flat-limiting a player or asking them to play other games. Suspected cheating goes to surveillance, not to a confrontation at the table.`,
    },
    {
      id: "rating",
      title: "Rating players and handing off to hosts",
      body: `Every time a player hands over a loyalty card at a table game, a supervisor starts a rating. The rating records four numbers: the game, the average bet, the start and end time, and sometimes buy-in and cash-out. The system turns those into a **theoretical loss**, the amount the house expects to win from that play on average.

### A worked rating

A player sits at a six-deck blackjack game for two hours at an average bet of $50. The casino might assume 60 hands per hour and a house edge of around 1% for an average, less-than-perfect player (the edge assumed varies by property and by game rules). Theoretical loss is:

$50 × 60 hands × 2 hours × 0.01 = **$60**

That $60 is what the property budgets comps against, not the player's actual result that night. The same player could win $400 or lose $700; the rating does not change.

### Why pit bosses care about ratings

Ratings drive who gets free rooms, meals and host attention. A pit boss who under-rates big players loses the casino goodwill; one who over-rates friends gives away margin. Most properties audit ratings against surveillance or the table's drop. When a rated player crosses a threshold, the pit introduces them to a [casino host](/guides/casino-host), whose job is the relationship. How ratings turn into free rooms and meals is covered in [casino comps](/guides/casino-comps).

The table's edge is doing the real work here. The [house edge](/guides/house-edge) guide explains why a casino can budget off an average like 1% while individual nights swing hundreds of dollars either way.`,
    },
    {
      id: "career",
      title: "How people become pit bosses and what the job pays",
      body: `Almost every pit boss started as a dealer. The usual route is several years dealing multiple games, then promotion to floor supervisor, then to pit manager. Supervisors are expected to know every game in their pit well enough to catch a misdeal or a wrong payout by eye, so dealers who can deal blackjack, roulette, craps and baccarat are promoted more readily than single-game dealers.

### Skills the role actually uses

- **Game protection:** spotting procedural errors, chip movement and advantage play.
- **Arithmetic under pressure:** payouts, rack counts and theoretical loss in your head.
- **Paperwork discipline:** fills, credits, markers and incident reports that stand up to audit.
- **People handling:** calming an angry loser, correcting a dealer without humiliating them, saying no to a regular.
- **Regulatory knowledge:** internal controls, anti-money-laundering reporting and age checks. The [AML gambling](/guides/aml-gambling) guide covers why large cash movements trigger paperwork.

### Licensing and pay

Supervisors usually hold a higher-level gaming licence or registration than dealers, because they approve money movements. In the United States the Bureau of Labor Statistics groups the role as first-line supervisors of gambling services workers and publishes wage data each year; supervisor pay is typically salaried or a higher hourly rate, and unlike dealers most supervisors do not share in tips. Pay varies widely between a regional property and a major resort, so check the current BLS figure and local job postings rather than a single national number. Dealer pay, where tips matter far more, is covered in [casino dealer salary](/guides/casino-dealer-salary).`,
    },
    {
      id: "myths",
      title: "Pit boss myths from films and forums",
      body: `Films give the pit boss a lot of power and a bit of menace. Real floors are more procedural.

- **"The pit boss can change the odds when you are winning."** The rules and payouts of a table game are fixed and approved; a pit boss cannot make roulette land differently. What they can do is change the dealer, raise or lower the table limit for new bets, or shuffle a blackjack shoe earlier. None of that alters the edge on a basic bet.
- **"Changing dealers is to cool you down."** Dealers rotate on a schedule, usually every 20 to 60 minutes, for breaks and fatigue. A mid-hot-streak swap is almost always the rota. Believing otherwise is a cousin of the [gambler's fallacy](/guides/gamblers-fallacy).
- **"The pit boss decides whether you get comps."** They influence ratings, but comps are calculated by a system and approved by hosts and marketing.
- **"They throw out card counters."** Rules differ by jurisdiction. In some places casinos can refuse blackjack play to anyone; in others, including New Jersey after the Uston case, they cannot bar counters outright but can use countermeasures.

### How the same idea works on PVPspinArena

PVPspinArena has no pit, no dealer and no supervisor at a table, because nobody on the house side handles chips. Its three games, [Jackpot](/), Coinflip and Roulette, settle from committed seeds, and anyone can re-check a finished round on the [fairness](/fairness) page. That replaces the pit's human controls with arithmetic you can verify yourself: Roulette's 33-slot wheel returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee you can check rather than trust. Play is 18+.`,
    },
  ],
  faqs: [
    {
      q: "What does a pit boss do in a casino?",
      a: "A pit boss manages a group of table games during a shift. They supervise floor supervisors and dealers, approve fills, credits and large payouts, issue markers, settle disputes, rate players and escalate suspected cheating to surveillance.",
    },
    {
      q: "Is a pit boss the same as a floor supervisor?",
      a: "No. A floor supervisor usually watches two to six tables. The pit boss, or pit manager, is one level up and is responsible for the whole pit and the supervisors in it.",
    },
    {
      q: "Can a pit boss kick you out for winning?",
      a: "Rules depend on the jurisdiction. Many casinos can refuse service at their discretion, while some places limit that power. Winning alone is not cheating, but advantage play such as card counting can lead to countermeasures.",
    },
    {
      q: "How do you become a pit boss?",
      a: "Most start as dealers, learn several games, get promoted to floor supervisor and then to pit manager. Expect several years on the floor and a supervisor-level gaming licence or registration.",
    },
    {
      q: "Do pit bosses get tips?",
      a: "Generally no. Dealers usually pool tips, while supervisors and pit managers are paid a salary or higher hourly rate. Policies differ between properties, so check the specific casino.",
    },
  ],
  sources: [
    { label: "Wikipedia: Pit boss", url: "https://en.wikipedia.org/wiki/Pit_boss" },
    {
      label: "US BLS: First-line supervisors of gambling services workers",
      url: "https://www.bls.gov/oes/current/oes391013.htm",
    },
    { label: "Nevada Gaming Control Board", url: "https://gaming.nv.gov/" },
  ],
  related: [
    "dealer-school",
    "casino-dealer-salary",
    "casino-host",
    "casino-surveillance",
    "casino-cage",
    "casino-marker",
  ],
  updated: "2026-09-27",
};

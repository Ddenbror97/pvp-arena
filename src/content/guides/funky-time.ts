import type { Guide } from "./types";

export const guide: Guide = {
  slug: "funky-time",
  cluster: "Game shows",
  keyword: "funky time",
  secondary: [
    "funky time rtp",
    "funky time letters",
    "funky time bonus games",
    "funky time wheel",
    "funky time vip disco",
  ],
  title: "Funky Time: Letters Wheel, Bonus Games and RTP Guide",
  description:
    "Funky Time explained: the disco letters wheel, how letter and number bets pay, the Bar, Stayin' Alive, Disco and VIP Disco bonuses, and RTP.",
  h1: "Funky Time: the letters wheel, the four bonus games and RTP",
  answer:
    "Funky Time is Evolution's disco-themed live game show. A host spins a large wheel whose segments show the number 1, the letters of FUNKY TIME, and four bonus games: Bar, Stayin' Alive, Disco and VIP Disco. Letter bets pay far more than the 1 but land far less often. Evolution lists a separate RTP for each bet spot, in the mid-90s.",
  facts: [
    "Funky Time launched in 2023 as one of Evolution's larger-format money-wheel shows.",
    "Bet spots cover the number 1, the individual letters F-U-N-K-Y-T-I-M-E, and four bonus games.",
    "Letter bets are high-payout, low-frequency; the 1 is low-payout, high-frequency.",
    "The odds of any spot are its segment count divided by the wheel's total, shown in the help screen.",
    "Each bonus game generates multipliers for that round only; past bonuses do not change future spins.",
  ],
  sections: [
    {
      id: "what",
      title: "What Funky Time is",
      body: `Funky Time is a live game show from Evolution, released in 2023. It follows the pattern set by [Dream Catcher](/guides/dream-catcher-game) and extended by [Crazy Time](/guides/crazy-time): a presenter, a large physical wheel in a studio, a short betting window, and a set of bonus games that only players who backed them can enter. The theme is 1970s disco, with a dance floor, a DJ booth and a bar set.

What makes Funky Time different is the letters. Instead of a ladder of numbers such as 1, 2, 5 and 10, most of the non-bonus wheel is split between a single number, the 1, and the letters that spell FUNKY TIME. The 1 is the frequent, low-paying outcome. Each letter is a rarer, much higher-paying outcome. That structure gives two very different ways to play the same wheel.

A round runs in four steps:

1. **Bet.** Place chips on the 1, on any letters, and on any of the four bonus games.
2. **Spin.** The host spins the wheel.
3. **Settle.** If the pointer lands on the 1 or a letter, bets on that spot are paid at the listed odds.
4. **Bonus.** If it lands on a bonus segment, players who backed it play that bonus.

Like the other titles in the [Game shows topic](/guides/topics/game-shows), Funky Time is streamed to licensed operators, and real-money play is for adults 18+ (or the local legal age).`,
    },
    {
      id: "wheel",
      title: "How to work out the wheel odds yourself",
      body: `Funky Time's wheel has more segments than the 54 used by Crazy Time and Monopoly Live, and Evolution has adjusted the game's presentation since launch. Rather than copy a segment list that may be out of date for your table, use the method below with the counts in the game's own help screen.

### The formula

For any spot:

- **Chance per spin** = segments for that spot ÷ total segments.
- **Base return** = chance × total paid back (payout + stake).

A bet that pays 25 to 1 returns 26 units when it wins.

### Illustration with example numbers

The numbers below are an illustration of the method, not a statement of the live wheel. Suppose a wheel has 64 segments and a letter holds 2 of them:

- Chance = 2 ÷ 64 = 3.125%.
- At 25 to 1, base return = 3.125% × 26 = 81.25%.

If the 1 held 30 of the same 64 segments and paid 1 to 1:

- Chance = 30 ÷ 64 = 46.9%.
- Base return = 46.9% × 2 = 93.75%.

Two lessons carry over whatever the exact counts. First, a letter's base return is often well below its published RTP, which tells you a slice of its value arrives through extra multipliers rather than ordinary wins. Second, the 1 carries most of its value in its own frequent hits, so it has the smallest swings on the wheel.

### Frequency in practice

With a 1-in-32 chance per spin, a letter misses 31 of every 32 spins. The chance of going 50 spins without it is (31/32)^50 ≈ 20%, and 100 spins without it about 4%. Plan stakes around those gaps.`,
    },
    {
      id: "letters",
      title: "Letter bets vs the 1",
      body: `Letters are where Funky Time feels most like a lottery. A $1 bet on a single letter usually loses. When it lands, it pays a large multiple. Covering several letters at once raises the hit rate but also multiplies the amount at risk each spin.

### Covering letters

If each letter has the same chance p, betting on k letters wins with probability k × p per spin, and the stake is k units. The payout per hit is unchanged, so the return percentage does not improve. Suppose p = 1/32:

| Letters covered | Stake per spin | Chance a letter lands | Base return |
| --- | --- | --- | --- |
| 1 | $1 | 3.1% | same as one letter |
| 4 | $4 | 12.5% | same as one letter |
| 9 | $9 | 28.1% | same as one letter |

Covering all nine letters turns a rare win into a frequent one, but each hit pays one letter while the other eight lose. The swings get smaller; the cost per dollar stays the same.

### The 1

The 1 is the low-variance option. It pays even money and wins often, so a bankroll lasts longest on it. Its RTP is typically close to the top of the game's range, which makes it the choice for players who want time on the table rather than a big hit.

### Mixing both

Many players put a base bet on the 1 and a smaller bet on a few letters. That smooths the session a little, but the combined return is still just the stake-weighted average of each bet's RTP. See [variance in gambling](/guides/variance-in-gambling) for why smoother and cheaper are different things.`,
    },
    {
      id: "bonus",
      title: "The four bonus games",
      body: `Funky Time has four bonus segments. Each bonus is a separate animated or studio mini-game that generates multipliers for that round only. Precise mechanics and multiplier ranges are in the help screen, and they are the part of the game most likely to be tuned between versions, so this section describes them in outline.

### Bar

A bar-themed round in which prizes are revealed from a set of choices or positions. It is the most frequent and usually the most modest of the four bonuses.

### Stayin' Alive

Named after the disco hit, this round moves through a sequence of stages, with multipliers building as it progresses. The appeal is watching a total climb; the risk is that it can stop early.

### Disco

A dance-floor round in which a dancer moves across a tiled floor collecting the multipliers on the tiles until the round ends. It has a higher ceiling than Bar and Stayin' Alive.

### VIP Disco

The rarest bonus on the wheel and the one with the highest multipliers. It is an upgraded version of the dance-floor idea, with bigger values and extra features. It is also, as with the Crazy Time bonus in Crazy Time, where much of the game's long tail lives.

### How to think about bonus bets

Rarer bonuses pay more when they land and miss for longer when they do not. A bonus with a 1-in-60 chance goes 100 spins without appearing about 19% of the time. Players who back only VIP Disco should expect long empty stretches. The general maths of long-shot bets is covered in [expected value](/guides/expected-value-gambling).`,
    },
    {
      id: "rtp",
      title: "Funky Time RTP and cost per session",
      body: `Evolution publishes an RTP for every bet spot in Funky Time's help menu. Widely reported figures sit in the mid-90s for most spots, with the spread between the best and worst bet large enough to change your expected cost. Always read the figure for the table in front of you, because operators can offer different configurations.

### From RTP to money

| RTP | Loss per $100 wagered | 250 spins at $2 |
| --- | --- | --- |
| 96% | $4 | $20 |
| 95% | $5 | $25 |
| 94% | $6 | $30 |

Those are averages. A session backing letters and VIP Disco can finish far above or below the average, because most of the return arrives in a few rare rounds.

### What does not change the RTP

- **Bet size.** A $10 bet has the same RTP as a $1 bet.
- **Covering more spots.** Your return is the stake-weighted average of each spot's RTP.
- **Timing.** Waiting for a spot that has not landed recently changes nothing; each spin is independent. The "due" feeling is the [gambler's fallacy](/guides/gamblers-fallacy).

### What can change your cost

- Choosing higher-RTP spots over lower ones.
- Playing fewer spins. Expected loss is RTP gap × total wagered, so a shorter session costs less.
- Setting a hard budget before the stream starts, as described in [gambling budget](/guides/gambling-budget).

Operators also cap the maximum payout per round, and that cap varies. A very large VIP Disco multiplier can be cut to the cap, which slightly lowers the effective return for big stakes.

### Common Funky Time mistakes

1. **Treating the letters as one bet.** Spelling out FUNKY or TIME across several letters is a set of separate bets, each with its own stake at risk.
2. **Judging a spot by one session.** Fifty spins is far too few to tell whether a letter is "cold". A 1-in-32 spot can miss 50 spins in a row about one session in five.
3. **Chasing a bonus after a near-miss.** The pointer stopping one segment away from VIP Disco says nothing about the next spin.
4. **Forgetting the cap.** Big bonus stakes can run into the operator's maximum payout, which makes the top of the multiplier range worth less than it looks.
5. **Buying signals.** Chat groups selling Funky Time "patterns" are repackaging public history, and the same scam playbook appears in [fake casino sites](/guides/fake-casino-sites).`,
    },
    {
      id: "pvp",
      title: "Letters, colours and a simpler PvP wheel",
      body: `Funky Time's letters are a high-payout, low-frequency bet sitting beside a frequent low-payout one. PVPspinArena's [Roulette](/roulette) has the same shape with much less machinery. Its 33-slot wheel has 16 Purple and 16 Silver slots paying 2x and 1 Green paying 14x. Green is the "letter": rare and high-paying. Purple and Silver are the "1": frequent and even money. The difference is that the return is identical on all three: 16/33 × 2 and 1/33 × 14 both equal 32/33, about 96.97%, about a 7.88% house edge on Purple or Silver after the 5% win fee.

That makes the trade-off between colours purely about variance. Results come from committed seeds, and any settled round can be checked on the [fairness](/fairness) page. If a session stops being fun, the [responsible gambling](/responsible-gambling) page has limits and support.`,
    },
  ],
  faqs: [
    {
      q: "How do letters work in Funky Time?",
      a: "Each letter of FUNKY TIME is a bet spot with its own segments on the wheel. If the pointer stops on your letter, you are paid at the listed letter odds; otherwise the bet loses.",
    },
    {
      q: "What are the bonus games in Funky Time?",
      a: "There are four: Bar, Stayin' Alive, Disco and VIP Disco. Each is a separate round with its own random multipliers. VIP Disco is the rarest and has the highest ceiling.",
    },
    {
      q: "What is the best bet in Funky Time?",
      a: "The spot with the highest RTP in the help screen, usually the 1, loses least on average. Letters and VIP Disco offer bigger wins but longer losing runs and often a lower RTP.",
    },
    {
      q: "Does betting on all letters guarantee a win?",
      a: "No. It raises the chance that some letter lands, but only one letter pays while the others lose, and non-letter segments lose the whole stake. The return per dollar stays the same.",
    },
    {
      q: "Who makes Funky Time and when did it launch?",
      a: "Funky Time is made by Evolution, the studio behind Dream Catcher, Monopoly Live and Crazy Time. It launched in 2023 and is streamed live from Evolution's studios to licensed casino operators.",
    },
    {
      q: "Can Funky Time stats predict the next spin?",
      a: "No. Stats sites record past spins, which is useful for checking frequencies over thousands of rounds, but each spin is independent and nothing becomes due.",
    },
  ],
  sources: [
    { label: "Evolution: official site", url: "https://www.evolution.com/" },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    { label: "Wikipedia: Big Six wheel", url: "https://en.wikipedia.org/wiki/Big_Six_wheel" },
  ],
  related: [
    "crazy-time",
    "dream-catcher-game",
    "monopoly-live",
    "lightning-roulette",
    "wheel-of-fortune-odds",
    "variance-in-gambling",
  ],
  updated: "2026-09-27",
};

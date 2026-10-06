import type { Guide } from "./types";

export const guide: Guide = {
  slug: "handicapping-horses",
  cluster: "Games of chance",
  keyword: "handicapping horses",
  secondary: [
    "horse racing handicapping",
    "beyer speed figures",
    "pace handicapping",
    "horse class form",
  ],
  title: "Handicapping Horses: Speed, Class, Pace, Form",
  description:
    "Handicapping horses with speed figures, class, pace and form: what each factor measures, how they conflict, and why a top figure still loses money.",
  h1: "Handicapping horses: speed figures, class, pace and form",
  answer:
    "Handicapping horses means reading a past-performance line and pricing a runner against the field. Speed figures measure adjusted final time. Class is who they beat. Pace is how the race was run. Form is whether they are fit now. None of that is a ticket until the tote or the book pays more than the chance you estimated.",
  facts: [
    "Andrew Beyer published the US speed-figure method in 1975; Daily Racing Form printed Beyer Speed Figures in past performances from 1992.",
    "A Beyer figure is a final-time number, normalised for distance and the day's surface speed. It is not a pace rating.",
    "Top North American stakes horses often run Beyer figures in the 100s; rare performances reach the 120s.",
    "Timeform ratings (Europe) sit on a different scale; a rough rule of thumb is to subtract about 12–14 points to compare with a Beyer.",
    "A 1970s claim in Steve Davidowitz's *Betting Thoroughbreds* said the top-figure horse won about 35% of the time at a slight loss on a $2 win bet.",
  ],
  sections: [
    {
      id: "what",
      title: "What handicapping horses actually is",
      body: `Handicapping, in horse racing, means assigning a chance — and then a price — to each runner. You are not picking a mascot. You are asking whether 4.00 (3/1) on the favourite is 40% implied plus margin, or a gift. The inputs are public: past performances, workouts, trainer and jockey, distance, surface, draw, going, weight. The output is a ranking you will throw away if the odds do not pay.

This page is the live-race craft: speed, class, pace, form. Virtual or cartoon tracks paid in crypto are a different product with an RNG and an overround; that is [crypto horse racing betting](/guides/crypto-horse-racing-betting). Sportsbook holds on other sports are [how to win at sports betting](/guides/how-to-win-at-sports-betting). Both neighbours stay in their lanes.

Racing is gambling. Adults only, 18+ or the local legal age. A form book does not create an edge by itself. The [Games of chance topic](/guides/topics/games-of-chance) is the right hub because even a careful line still faces a ten-horse sample. A well-made 30% shot still loses seven times in ten. That is not a broken figure; it is a small sample. Bankroll for the seven, or do not take the price.

### The four words in the title

- **Speed:** how fast, as a number you can compare across days.
- **Class:** who they beat, and in what kind of race (maiden, claimer, allowance, stakes).
- **Pace:** who was in front at the first call, and whether that shape helps a closer today.
- **Form:** recent runs, layoffs, works, equipment, and whether the last figure was a peak or a stall.

They disagree often. A high figure earned in a slow-pace claimer can bounce in a fast-pace stakes race. That disagreement is the job.`,
    },
    {
      id: "speed",
      title: "Speed figures: Beyer, variants and what they omit",
      body: `A raw clocking is almost useless by itself. Six furlongs in 1:10.20 on a speed-favouring dirt is not the same race as 1:10.20 on a dull, drying track. A **speed figure** converts final time into a number that already includes:

1. Distance (a parallel-time chart so a mile and a sprint can be compared).
2. Surface and the **daily variant** (how fast or slow the whole card ran that day).

Andrew Beyer described the US amateur method in *Picking Winners* (1975). The Daily Racing Form later hired the process; Beyer figures have appeared in DRF past performances since 1992. Wikipedia's Beyer page is the public summary: the figure tells you how fast the horse ran, not how fast it will run today. Beyer has said as much.

### How to read the number

On the Beyer scale, ordinary claiming races live well below the 90s. Serious stakes horses in the United States and Canada often print **100+**. A 120-something is a rare, rumoured-about afternoon, not a weekly par. Do not treat a 78 and an 81 as a different species; figure-making has noise, especially on short fields and odd distances.

Europe's **Timeform** ratings are a cousin with a different zero and spread. A commonly repeated conversion is "subtract 12 to 14 points from Timeform to guess a Beyer." That is a rough translator for conversation, not a laboratory identity. Other brands (Equibase, Brisnet, TimeformUS) use their own methods; TimeformUS, unlike classic Beyer, folds pace into the number. **Do not mix scales in one sentence.**

### What a final-time figure misses

It does not say the horse went 22.1 and 45, then died. It does not say the horse was trapped four wide. It does not say the field was weak. Those are pace, trip and class. If you use the top figure as a "power rating" and bet it blindly, you are doing what Davidowitz reported in the mid-1970s: winning often enough to feel clever and still showing a small loss on the $2 window after the take. That 35% figure is a published claim from that era, not a live statistic for today's circuits.`,
    },
    {
      id: "class-pace-form",
      title: "Class, pace and form, and when they overrule a figure",
      body: `### Class

North American condition ladders run, roughly: maiden special weight and maiden claimers, then claiming bands, optional claimers, allowances, and stakes (listed, then Grade 3, 2 and 1). A horse dropping from an allowance into a $16,000 claimer may be "class relief": easier rivals, same or better figure. A horse jumping from a cheap win into a graded stake may be "class up": the 92 Beyer was earned against softer fractions and weaker late pace.

Class is not a moral ranking. It is a description of the company. A $10,000 claimer can run a faster final time than a sleepy stakes race on a different day; Beyer will say so. Your job is to ask whether that 10k figure survives a rise in class **and** a change in pace.

### Pace

Pace is the shape of the race. Two horses with a 88 Beyer are not equals if one earned it on an uncontested lead and the other earned it closing into a collapse. Pace figures (for example DRF's Moss figures) score the early and middle sections on a scale meant to sit next to the final-time number.

A simple projected shape:

- **Lone speed** in a field of closers: the leader gets a cheaper trip than the figure suggests.
- **Four need-the-lead types** in a one-turn sprint: the early numbers cook, and a closer's last figure may **improve**.
- **A rail-bias card:** inside speed is not the same animal as the same speed in lane six.

If you skip pace, you will overbet last-out winners who stole soft fractions.

### Form

Form is the recent body of work: last three races, layoff length, works since a rest, blinkers on or off, a new trainer, a drop in weight, a move from turf to dirt. A horse that ran 94, then 82, then 79 is telling a different story from 79, 82, 94. The rising line might be fitness. The falling line might be a physical problem, or a rise in class, or a pair of wide trips.

Workouts are clues, not times you can convert into Beyers. A bullet five-furlong work on a quiet morning can mean fitness or a fast maintenance strip. Read them against the trainer's habit, not as a hidden figure.

### A four-factor card (worked sketch)

Six-horse allowance, one mile dirt. You are not looking for a name. You are looking for a conflict.

| Horse | Last Beyer | Class last out | Likely run style | Form note |
| --- | --- | --- | --- | --- |
| A | 91 | Stakes, beaten | Closer | Layoff 60 days, two works |
| B | 88 | Allowance win | Speed | Clear lead last time |
| C | 87 | Claimer win (rise) | Stalk | First vs winners of this quality |
| D | 84 | Allowance | Speed | Needs the lead, draws inside |

If B and D both go, A's 91 closing figure may be the one that **improves**, and C's 87 may be empty class. If D scratches and B is alone, B's 88 may be worth more than A's 91. The sheet is a set of arguments, not a verdict. The price decides whether any argument is a bet.`,
    },
    {
      id: "price",
      title: "From a line to a ticket: overround and passing",
      body: `Handicapping without price is collecting baseball cards. Suppose you make B 35% to win. Fair decimal odds are 1 / 0.35 ≈ 2.86. If the tote shows 2.20, the public has already crushed the value; passing is the play. If it shows 4.00, you have a theoretical overlay **if your 35% is honest**.

Books and totes do not pay fair odds. Win pools take a commission; fixed-odds books build an [overround](/guides/house-edge) so implied probabilities sum to more than 100%. A beautiful 91 Beyer at 1.50 is often a bad ticket. A 84 figure at 12.00 can be a good ticket if your pace story is real and the market is asleep.

### Exotic bets multiply the take

Exactas, trifectas and superfectas are still handicapping — they are just more ways to be right and more ways to pay the take. If you cannot state why the second horse finishes in front of the third, you do not have a trifecta opinion. You have a lottery slip.

### Virtual tracks

A lobby "race" that starts every 45 seconds with invented form lines is not handicapping. The generator already picked a weighted winner. Read [crypto horse racing betting](/guides/crypto-horse-racing-betting) and walk away from the silks.`,
    },
    {
      id: "pvp",
      title: "A priced opinion, and a hashed PvP round",
      body: `Good handicapping is a budgeted opinion. You can be right about pace and still lose the photo. You can be wrong about class and still cash if the price was wide enough. The craft is repeating small, priced edges, not finding a horse that "cannot lose."

PVPspinArena does not run a book on live racing. It runs three player-vs-player games in USDC or ETH on Base. [Coinflip](/coinflip) is a 50/50. [Roulette](/roulette) is 33 slots, 16 Purple and 16 Silver at 2x, 1 Green at 14x, every bet returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee — a price you can write without a past-performance line. [Jackpot](/) sets win chance equal to your share of the pot. Seeds are committed; verify a settled round on [fairness](/fairness).

The ticket itself, from win through exacta, is [how to bet on horse racing](/guides/how-to-bet-on-horse-racing). Speed figures stay on this page. If the next race is already a chase to recover the last exacta, stop. Use [responsible gambling](/responsible-gambling). Play is 18+ only.

In the same cluster, see also [quick pick](/guides/quick-pick-lottery), [pull tabs](/guides/pull-tabs), and [lucky number](/guides/lucky-numbers-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What does handicapping horses mean?",
      a: "Reading past performances to estimate each horse's chance, then betting only when the tote or the book pays more than that chance after the take. Speed, class, pace and form are the usual inputs.",
    },
    {
      q: "What is a Beyer Speed Figure?",
      a: "A final-time rating for North American Thoroughbreds that adjusts for distance and how fast the track played that day. Daily Racing Form has printed them since 1992. They do not include pace.",
    },
    {
      q: "Does the fastest last-out figure always win?",
      a: "No. The top figure wins more than its share of races and still loses money if you bet it every time, because the price is short and pace or class can undo the number.",
    },
    {
      q: "What is pace in horse racing?",
      a: "How the early and middle fractions were run. A lone leader can steal a race; a crowded speed duel can set the table for a closer. Two horses with the same final figure can have opposite pace stories.",
    },
    {
      q: "Is handicapping the same as betting virtual horse races?",
      a: "No. Virtual races are weighted RNG animations. Live handicapping prices a real field. If the meeting name is invented and a new race starts every minute, you are not handicapping.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Beyer Speed Figure",
      url: "https://en.wikipedia.org/wiki/Beyer_Speed_Figure",
    },
    {
      label: "Daily Racing Form: the science behind Beyer Figures",
      url: "https://www.drf.com/news/jerardi-science-behind-beyer-figures",
    },
    {
      label: "Encyclopaedia Britannica: horse racing",
      url: "https://www.britannica.com/sports/horse-racing",
    },
    {
      label: "Wikipedia: Handicap (horse racing)",
      url: "https://en.wikipedia.org/wiki/Handicap_(horse_racing)",
    },
  ],
  related: [
    "crypto-horse-racing-betting",
    "nfl-betting",
    "how-to-win-at-sports-betting",
    "expected-value-gambling",
    "house-edge",
    "survivor-pool",
    "quick-pick-lottery",
    "pull-tabs",
    "lucky-numbers-gambling",
  ],
  updated: "2026-09-27",
};

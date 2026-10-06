import type { Guide } from "./types";

export const guide: Guide = {
  slug: "carnival-games",
  cluster: "Games of chance",
  keyword: "carnival games",
  secondary: [
    "are carnival games rigged",
    "midway games odds",
    "carnival game tricks",
    "fair games physics",
  ],
  title: "Carnival Games: Are They Rigged? Physics and Odds",
  description:
    "Carnival games explained: ring toss, milk bottles, basketball and balloon darts, the physics that makes them hard, what is rigged, and the maths of prizes.",
  h1: "Carnival games: are they rigged? The physics and odds of midway games",
  answer:
    "Most carnival games are not strictly rigged, but many are designed to be much harder than they look. Oval or undersized hoops, weighted bottles, snug rings and underinflated balloons push win rates down, and prize tiers keep the cost of payouts well below what players spend. A few games are genuinely crooked. Treat every midway game as paid entertainment, not a way to win.",
  facts: [
    "Carnival slang distinguishes games that are merely hard from 'gaffed' games an operator can control.",
    "A regulation basketball hoop is 18 inches across, only about twice a ball's diameter; midway hoops are often tighter or oval.",
    "In ring toss, the ring must drop almost perfectly flat to settle over a bottle neck; most throws bounce off.",
    "Race games like water-gun races pay one winner from many paying players, so the operator profits on every round.",
    "Large plush prizes are usually reached by trading up small prizes, which multiplies the number of paid plays required.",
  ],
  sections: [
    {
      id: "what",
      title: "What carnival games are and how operators make money",
      body: `Carnival games, also called midway games, are the paid skill-and-chance booths at fairs, amusement parks, piers and travelling carnivals: ring toss, milk bottles, basketball, balloon darts, duck ponds, water-gun races and many more. You pay per attempt, and a success wins a prize from the booth's wall.

The business model is simple. The operator pays wholesale for prizes, often a small fraction of their apparent value, and charges enough per attempt that the average cost of prizes handed out stays well under takings. That margin exists whether the game is fair-but-hard or actually gaffed. Travelling carnival workers developed their own slang for this world. The terms most often cited are:

- **hanky-pank:** a cheap, easy game where nearly everyone wins a small prize;
- **slum:** the cheap small prizes those games hand out;
- **flat store or flat joint:** a game run to cheat, where the operator decides who wins;
- **gaff:** a hidden control that lets the operator switch a game from hard to impossible.

Most modern midway games sit between the first and the third: legitimately winnable, but tuned so wins are rarer than players expect. They belong in the [Games of chance topic](/guides/topics/games-of-chance) because the skill involved is small next to the design of the booth.`,
    },
    {
      id: "physics",
      title: "The physics of common carnival games",
      body: `### Basketball

A regulation hoop is 18 inches (45.7 cm) across, and a men's regulation ball is about 9.4 inches in diameter. That already leaves little room. Midway versions commonly add one or more tricks: a rim that is oval, so it looks wide from the front but is narrow front to back; a rim that is smaller than regulation; a rim set higher than the standard 10 feet; or a ball that is overinflated so it bounces hard off the rim instead of rolling in. Each change looks small. Together they turn a shot a decent player makes half the time into one they make rarely.

### Ring toss

A rigid plastic ring must drop almost perfectly flat to fall over a bottle neck, and the inner diameter of the ring is often only slightly larger than the neck. A ring arriving at any tilt catches the lip and bounces off the glass. Because the bottles are packed together, a bounce usually lands on another bottle and repeats the problem.

### Milk bottles

You knock down a pyramid of bottles with a ball. Light balls transfer little momentum, and heavier bottles at the bottom, or bottles placed so their bases sit on the edge of the platform, resist toppling. A hit that knocks the top bottles away while the bottom row wobbles and stands again is the classic result.

### Balloon darts

Underinflated balloons are soft and let a dart bounce off. Dull or lightweight darts make it worse. A well-inflated balloon is taut and pops on almost any clean hit.

### Coin toss onto glass

In the coin-pitch version, you throw a coin at a table of glass plates, dishes or bowls and win the piece it stays on. Glass is smooth and slightly curved, so a coin arriving with any horizontal speed slides off the rim. The coins that stay are the ones that land nearly flat, at low speed, near the centre of a dish, which is hard to do from behind a counter several feet away. Every coin thrown, hit or miss, stays with the booth, and the dishes cost far less than the coins they attract.

### Rope ladder

A rope ladder fixed at each end on a swivel flips as soon as your weight moves off centre. It is winnable with technique (low centre of mass, moving opposite hand and foot together, spreading limbs wide) but punishes the natural way of climbing.`,
    },
    {
      id: "rigged",
      title: "Are carnival games rigged? Hard versus gaffed",
      body: `It helps to separate three categories.

| Category | Example | Can you win? |
| --- | --- | --- |
| Fair and easy | Duck pond where every duck wins a small prize | Always, but the prize is worth less than the play |
| Fair but hard | Ring toss, most basketball, balloon darts with decent balloons | Yes, rarely, with some skill |
| Gaffed or flat | Games where the operator can switch between winnable and unwinnable | Only when the operator allows it |

### Common gaffs

- A hidden way to change the target between a demonstration and your turn, such as a different ball, a moved bottle or a switched rim.
- A shooting gallery where you must remove every trace of a printed star with a limited number of pellets, with the sights misaligned.
- A game where the operator demonstrates an easy win using a different technique or equipment from the one you are given.

### Signs a game is fair enough

- You can watch other players win without the operator's help.
- The equipment you use is the equipment in the demonstration.
- Rules and prizes are posted clearly before you pay.

Many jurisdictions license midway games and inspect for gaffs, and some require that games be winnable and prizes displayed. Rules differ widely by country, state and event, so a posted licence or inspection sticker is a good sign but not a guarantee.`,
    },
    {
      id: "odds",
      title: "The odds and prize maths",
      body: `The useful way to think about any carnival game is expected value: what you pay minus the average worth of what you win.

### Race games

Water-gun and horse-race games are popular with operators because they need no skill tuning at all. Suppose ten players each pay $3. One wins a prize. The booth takes $30 per race. If the prize costs the operator a few dollars wholesale, the booth earns most of that $30 whether players are skilled or not. For each player, the average return is the prize's value divided by ten. Even if the prize is worth $10 to you, your expected result is $10/10 − $3 = −$2 per race.

### Trade-up prizes

The giant plush on the top row is rarely a direct prize. The usual path is: win a small prize, then trade two small ones for a medium, then two mediums for a large. Suppose a game costs $5 and a skilled player wins 1 play in 4. Then:

| Prize tier | Wins needed | Expected plays | Expected cost |
| --- | --- | --- | --- |
| Small | 1 | 4 | $20 |
| Medium (2 smalls) | 2 | 8 | $40 |
| Large (2 mediums) | 4 | 16 | $80 |

Eighty dollars for a stuffed animal that may retail far lower is the whole point of the design. The numbers here are illustrative, but the doubling structure is the common one.

### Guess-your-weight and similar

The guesser needs to land within a stated margin. If they miss, you win a prize that usually costs less than your fee. The booth profits either way, which is why these games tend to be good-humoured rather than hard-sold.

If you want the general method, [expected value](/guides/expected-value-gambling) and [house edge](/guides/house-edge) explain the same maths as it applies to casino games.`,
    },
    {
      id: "tips",
      title: "How to improve your chances (a little)",
      body: `You cannot beat the margin, but some games are more winnable than others, and technique matters in a few.

1. **Watch before you pay.** If nobody wins in ten minutes, that is your answer.
2. **Prefer games where the equipment is visible.** Balloon darts with tight balloons and a basketball booth with a round rim are better bets than anything you cannot inspect.
3. **Basketball:** use a higher arc. A steeper entry angle makes the rim effectively larger from the ball's point of view, and a soft shot bounces less off an overinflated ball.
4. **Ring toss:** toss the ring flat with backspin and aim for the dense centre of the bottles, where a bounce has more chances to settle.
5. **Milk bottles:** aim low at the base of the bottom row, where most of the pyramid's mass sits.
6. **Rope ladder:** keep your body flat and low, move one hand and the opposite foot together, and go slowly.
7. **Set a spend.** Decide what the day's games are worth before you arrive, and stop there.

Most people enjoy carnival games more once they think of them as paid entertainment with a souvenir at the end, rather than a contest they need to win.`,
    },
    {
      id: "related",
      title: "Carnival games and other hustle games",
      body: `Carnival games sit on a spectrum. At one end is a cheap duck pond where everyone wins a trinket. In the middle are hard skill games with a built-in margin, similar in spirit to [claw machines](/guides/claw-machine-tricks), where payout settings decide how often a grab holds. At the far end is outright fraud like [three card monte](/guides/three-card-monte), where the operator controls the result completely. Street coin games like [penny pitching](/guides/penny-pitching) are different again: player versus player, with no booth taking a cut.

The physical [Plinko board](/guides/plinko-board) is a useful comparison. It is a genuinely random device: pegs deflect the disc left or right unpredictably, and the result is governed by probability rather than an operator's hidden hand. Carnival games are usually the reverse: they look random or skill-based, but the booth's design sets the odds.`,
    },
    {
      id: "pvp",
      title: "Stated odds versus hidden odds on PVPspinArena",
      body: `The problem with most midway games is not that they have a margin. It is that you cannot see it. The rim is a little oval, the balloon a little soft, and you only find out by paying.

PVPspinArena works the other way. It runs three player-vs-player games, and the odds are published before you play. On [Roulette](/roulette), the 33-slot wheel has 16 Purple and 16 Silver slots paying 2x and 1 Green slot paying 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. [Coinflip](/coinflip) is a 50/50 between two players, with any fee shown before entry. Results come from committed seeds, and any settled round can be checked on the [fairness](/fairness) page.

That does not make any of it a way to earn money. Like a carnival game, it is entertainment with a cost. Play only at 18+ (or your local legal age), set a limit in advance, and use the [responsible gambling](/responsible-gambling) tools if you need them.`,
    },
  ],
  faqs: [
    {
      q: "Are carnival games rigged?",
      a: "Most are legally winnable but designed to be much harder than they look, through tight rims, snug rings, weighted bottles or soft balloons. A minority are gaffed so the operator controls who wins.",
    },
    {
      q: "What is the easiest carnival game to win?",
      a: "Duck ponds and similar games where every player wins something are easiest, but the prize is worth less than the fee. Among skill games, balloon darts with well-inflated balloons are often the most winnable.",
    },
    {
      q: "Why is carnival basketball so hard?",
      a: "Midway hoops are often oval, smaller than regulation or set higher, and the balls may be overinflated. Each change makes a clean shot less likely to drop.",
    },
    {
      q: "How do you win the ring toss at a carnival?",
      a: "Throw the ring flat with a little backspin and aim at the centre of the bottles. It stays hard because the ring barely fits over the neck and must land almost perfectly level.",
    },
    {
      q: "Do carnival games make a lot of money?",
      a: "Yes, relative to cost. Prizes are bought wholesale, race games pay one winner from many players, and trade-up tiers mean big prizes require many paid plays.",
    },
  ],
  sources: [
    { label: "Wikipedia: Carnival game", url: "https://en.wikipedia.org/wiki/Carnival_game" },
    { label: "Wikipedia: Ring toss", url: "https://en.wikipedia.org/wiki/Ring_toss" },
    {
      label: "Encyclopaedia Britannica: basketball",
      url: "https://www.britannica.com/sports/basketball",
    },
  ],
  related: [
    "three-card-monte",
    "claw-machine-tricks",
    "penny-pitching",
    "plinko-board",
    "expected-value-gambling",
  ],
  updated: "2026-09-27",
};

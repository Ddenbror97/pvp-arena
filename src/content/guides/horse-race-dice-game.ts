import type { Guide } from "./types";

export const guide: Guide = {
  slug: "horse-race-dice-game",
  cluster: "Games of chance",
  keyword: "horse race dice",
  secondary: [
    "dice horse race game",
    "horse race dice rules",
    "two dice horse race",
    "horses 2 through 12",
    "party dice race",
  ],
  title: "Horse Race Dice: Party Rules and Odds | PvP Spin Arena",
  description:
    "Horse race dice is a party game: horses 2–12, two dice, and the matching total moves one space. See equal lanes and the fairer staggered track.",
  h1: "Horse race dice: eleven paper horses and two dice",
  answer:
    "Horse race dice is a party game played with two dice and eleven horses numbered 2 through 12. Each roll, the horse whose number equals the total advances one space. A common track is a sheet of paper with a lane per horse. Horse 7 is the favorite because 7 can be rolled in 6 of 36 ways, while 2 and 12 can be rolled in 1 of 36 ways each. The first horse to the finish wins. This page is that dice game. It is not a guide to betting on live horse racing.",
  facts: [
    "Eleven horses, numbered 2 through 12. A total of 1 cannot be rolled with two dice, so there is no horse 1.",
    "Two fair dice have 36 equally likely outcomes. The count of ways is 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1 for totals 2 through 12.",
    "On an equal-length track, often 5, 6, or 7 spaces for every horse, horse 7 wins most races.",
    "On an odds-balanced track, lane length matches the number of ways: horse 7 has the longest lane, and horses 2 and 12 have the shortest.",
    "A longer equal track makes 7 even more dominant. A one-space race is just the single-roll table.",
    "Players may each claim a horse before the first roll. The dice, not a pool or a tote, decide the winner.",
  ],
  howTo: true,
  sections: [
    {
      id: "party",
      title: "The party game on a sheet of paper",
      body: `Horse race dice needs two standard dice, a pencil, and a sheet ruled into eleven lanes. Label the lanes 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, and 12. Draw a start line and a finish line. Put a mark, a coin, or a scrap of paper in each lane at the start. Those marks are the horses.

Anyone may roll. The roller is not a player with an advantage; the dice are shared. Add the two faces. The horse with that total moves one space toward the finish. Roll again. The first horse to land on or past the finish line wins the race. A horse that is not rolled simply waits.

There is no pari-mutuel pool, no morning line, and no track takeout, because there is no track. People at a party often "claim" a horse before the race and cheer for it. If adults attach a stake to that claim, the stake is a side bet among themselves, the players should be 18 or the local legal age, and the amount should be fixed before the first roll. The movement rule does not change.

This game lives with the other dice pastimes in the [games of chance hub](/guides/topics/games-of-chance). The two-dice totals are the same totals counted in [dice roll probability](/guides/dice-roll-probability). Read that page if you want every combination written out. This page uses the counts and then talks about lanes.

A classroom version of the same race is common in probability lessons. Colin Foster and David Martin described it in Teaching Statistics in 2016, including the trap of thinking horse 1 should exist. With two dice the lowest total is 2. Drawing a lane for 1 teaches the wrong sample space. Number the lanes from 2.`,
    },
    {
      id: "equal",
      title: "Equal-length lanes",
      body: `The equal-length version gives every horse the same number of spaces, often 5, 6, or 7. Six is a comfortable race on a notebook page: long enough that 7 pulls ahead, short enough that you finish before people wander off.

One roll moves exactly one horse, by one space. The chance a roll moves a given horse is the chance of that total:

| Horse | Ways out of 36 | Chance a roll moves it |
| --- | --- | --- |
| 2 | 1 | 1/36, about 2.8% |
| 3 | 2 | 2/36, about 5.6% |
| 4 | 3 | 3/36, about 8.3% |
| 5 | 4 | 4/36, about 11.1% |
| 6 | 5 | 5/36, about 13.9% |
| 7 | 6 | 6/36, about 16.7% |
| 8 | 5 | 5/36, about 13.9% |
| 9 | 4 | 4/36, about 11.1% |
| 10 | 3 | 3/36, about 8.3% |
| 11 | 2 | 2/36, about 5.6% |
| 12 | 1 | 1/36, about 2.8% |

The six ways to roll 7 are 1+6, 2+5, 3+4, 4+3, 5+2, and 6+1. The one way to roll 2 is 1+1. The one way to roll 12 is 6+6. Order matters for counting: 1 then 6 is a different outcome from 6 then 1, and both are in the 36.

On a one-space track, those percentages are the win chances. Horse 7 wins 6 races in 36, horse 2 wins 1 in 36. On a longer equal track the favorite's advantage grows. Each space is another independent demand for the same uneven totals, so the horse that moves most often pulls away. A six-space equal race is already lopsided. A twenty-space equal race is a long exhibition for horse 7, with 6 and 8 as the only plausible upsets and 2 and 12 as spectators.

That is the point of the equal version. It shows, in pencil marks, that totals are not equally likely. If your party wants a closer finish, use the staggered lanes in the next section instead of lengthening the straight track.

[Chuck-a-luck](/guides/chuck-a-luck) prices three dice rather than two, and the house pays on how many dice show your number. The party race pays nobody a multiple. It only moves a horse. The shared idea is that you count faces before you decide which number is the good one.`,
    },
    {
      id: "balanced",
      title: "Odds-balanced lanes",
      body: `A fairer sheet gives the frequent horses farther to travel and the rare horses a short hop. Set the number of spaces equal to the number of ways that total can be rolled:

| Horse | Spaces to finish | Why that length |
| --- | --- | --- |
| 2 | 1 | 1 way, so a short lane |
| 3 | 2 | 2 ways |
| 4 | 3 | 3 ways |
| 5 | 4 | 4 ways |
| 6 | 5 | 5 ways |
| 7 | 6 | 6 ways, the longest lane |
| 8 | 5 | 5 ways |
| 9 | 4 | 4 ways |
| 10 | 3 | 3 ways |
| 11 | 2 | 2 ways |
| 12 | 1 | 1 way, so a short lane |

Horse 7 must be rolled six times to win. Horse 2 must be rolled once. Because 7 is rolled about six times as often as 2, the expected number of rolls until each horse finishes is the same: length divided by the chance per roll. For horse 7 that is 6 / (6/36) = 36. For horse 2 it is 1 / (1/36) = 36. Every horse on this sheet has an expected finish time of 36 rolls.

Expected finish time is not the same statement as "each horse wins 1 in 11 races." A horse with one space is jumpy: it can win on roll 1, or it can sit forever. A horse with six spaces has to arrive in steps, so its finish time clusters nearer the average. The staggered sheet makes the race much closer than six equal spaces. It does not make eleven perfectly equal win probabilities. For a party, closer is the goal.

Draw every lane as a row of boxes: six for horse 7, one each for horses 2 and 12. Doubling every length (12 spaces for 7, 2 spaces for 2 and 12) keeps the same expected-time tie if the table wants a longer race.`,
    },
    {
      id: "run",
      title: "How to run the race",
      body: `Set up once, then roll until somebody finishes.

1. Choose equal lanes or staggered lanes, and write the length of each lane on the sheet.
2. Each person claims one horse, or the table runs the race with no claims and just watches. Two people may share a horse. A horse with no claimant still moves.
3. Roll two dice. Announce the total. Advance that horse one space.
4. Repeat. The first horse to complete its lane wins.
5. If you are playing more than one race, clear the marks back to the start. Do not let a horse keep a head start into the next race.

Ties in the sense of two horses finishing on the same roll cannot happen, because one roll moves only one horse. The winner is unique on the roll that crosses the line.

A cocked die is rolled again. Both dice must sit flat. If a die falls on the floor, both dice are rolled again so nobody is tempted to keep the convenient face and reroll the other.

[Hazard](/guides/hazard-dice-game) is the old two-dice gambling game with a called main and a chance. It uses the same dice and a different winning condition. A caller who names a point is not running this sheet.

Children can play the pencil version as a probability toy. Keep money out of it unless every participant is an adult.`,
    },
    {
      id: "sample",
      title: "What one race does and does not show",
      body: `Suppose an equal track of three spaces, short enough to finish on a napkin. The first twelve totals are 7, 6, 7, 9, 4, 7, 8, 5, 7, 6, 10, 8. Follow horse 7: it moved on rolls 1, 3, 6, and 9. It had already won on roll 9, with three spaces filled and a fourth move to spare. Horse 6 had two spaces. Horse 8 had one, then would have had two on roll 12, after the race was over.

That transcript is one path, not a promise that 7 wins by roll 9. The single-roll table is the stable fact. After 7 wins three equal races, the next total is still drawn from the same 36 outcomes. Reset the sheet and roll again. [Dice roll probability](/guides/dice-roll-probability) is the page for independence.

If you are choosing a horse on the equal sheet and you want the best chance, choose 7, then 6 or 8. If you are choosing on the staggered sheet and you want a chance that can hit immediately, choose 2 or 12, and accept the long silences. If you want the horse whose finishes bunch up near the average, choose 7 even though its lane is the longest. Say which sheet you are on before anyone claims, because the best-looking number flips with the sheet.

Groups sometimes roll one die and race horses 1 through 6 on equal lanes. That race is fair: each face has probability 1/6, so equal lanes really are equal. It is a different game. The eleven-horse race is interesting only because two-dice totals are unequal. Keep two dice if the point is the shape of 2 through 12.`,
    },
    {
      id: "pvp",
      title: "Paper horses and a 33-slot wheel",
      body: `The party race is a demonstration of two-dice totals. A casino wheel is a demonstration of a different distribution, printed as slot counts instead of lane lengths. On this site the wheel is small enough to count by eye.

PVPspinArena runs Jackpot, Coinflip, and Roulette, in USDC or ETH on Base. [Roulette](/roulette) uses 33 slots: 16 purple and 16 silver pay 2x, and 1 green pays 14x. Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. That edge is the price of the game, the way an equal-length horse sheet is a price paid by anyone who claimed horse 2. Coinflip is a 50/50 between two players. Jackpot gives a win chance equal to your share of the pot, and the winner takes the pot minus any fee shown before entry. Settled rounds are checked from committed seeds on the [fairness](/fairness) page.

Nothing on this page is a sportsbook, a tote, or a handicapping method. The horses are numbers. When the sheet is finished, clear it. If money was involved, it was an adult side stake, and the [responsible gambling](/responsible-gambling) tools are the right next stop if a stake stopped feeling like a party.

[Bunco](/guides/bunco-rules) is the social dice game if the table wants rounds and a scorepad instead of lanes. Horse race dice is done when the first lane fills.

See also [tenzi](/guides/tenzi-rules).`,
    },
  ],
  faqs: [
    {
      q: "What is horse race dice?",
      a: "A party game with two dice and horses numbered 2 through 12. Each roll advances the horse that matches the total by one space. The first horse to finish its lane wins. It is not a bet on a live horse race.",
    },
    {
      q: "Why is horse 7 the favorite?",
      a: "Two dice can total 7 in 6 ways out of 36, more than any other total. Totals 2 and 12 each have only 1 way out of 36. On a track where every lane is the same length, 7 wins most often.",
    },
    {
      q: "How do you make the dice horse race fairer?",
      a: "Give each horse a lane as long as its number of ways: 7 runs six spaces, 6 and 8 run five, and so on down to one space for 2 and for 12. Each horse then has the same expected number of rolls to finish, which is 36.",
    },
    {
      q: "How many spaces should an equal track have?",
      a: "Five, six, or seven spaces for every horse is the usual party length. Shorter races finish quickly and stay closer to the single-roll odds. Longer equal races make horse 7 more dominant.",
    },
    {
      q: "Is there a horse numbered 1?",
      a: "No. Two dice cannot total 1. The lanes run from 2 through 12. A lane labeled 1 never moves.",
    },
  ],
  sources: [
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
    {
      label: "Foster and Martin, Two-dice horse race, Teaching Statistics (2016)",
      url: "https://doi.org/10.1111/test.12108",
    },
  ],
  related: ["tenzi-rules", "chuck-a-luck", "bunco-rules", "yahtzee-rules", "dice-roll-probability"],
  updated: "2026-09-29",
};

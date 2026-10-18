import type { Guide } from "./types";

export const guide: Guide = {
  slug: "roulette-table-layout",
  cluster: "Games & odds",
  keyword: "roulette table layout",
  secondary: [
    "roulette wheel numbers",
    "roulette dozens and columns",
    "roulette zero placement",
    "roulette bet zones",
  ],
  title: "Roulette Table Layout: Wheel Numbers and Bet Zones",
  description:
    "The roulette table layout and wheel numbers explained: number order, dozens, columns, zero placement and how layouts differ by roulette type.",
  h1: "Roulette table layout: wheel order, dozens, columns and zero",
  answer:
    "Roulette table layout is a map of bets, not a payout chart. The wheel carries the numbers in a fixed order around zero. The felt lays the same numbers out in three columns of twelve, with dozens along the side and even-money boxes at the end. A single-zero layout puts one green zero at the head of the grid. A double-zero layout puts 0 and 00 there. You must be 18+ or the local legal age.",
  facts: [
    "On a European wheel, clockwise from 0, the order begins 32, 15, 19, 4, 21, 2, 25.",
    "Zero sits between 26 and 32 on that wheel. On the felt, zero sits outside every dozen and every column.",
    "Each dozen holds 12 numbers: 1–12, 13–24 and 25–36. Three dozens cover 36 numbers and leave 0 out.",
    "Column 1 is 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34. The other columns step up by one.",
    "A street is one felt row of three numbers. There are 12 streets, from 1–2–3 through 34–35–36.",
    "Neighbours on the wheel are often far apart on the felt. 17 sits beside 34 on the European wheel.",
  ],
  sections: [
    {
      id: "two-maps",
      title: "The wheel and the felt are two different maps",
      body: `A roulette table layout is two pictures of one set of pockets. The wheel is a circle. The felt is a rectangle. Bets are placed on the rectangle. The ball lands on the circle. Learning the game is learning how a spot on the felt names a pocket on the wheel.

The felt is what people mean by the table layout. At the top, nearest the wheel, sits zero. Below it, the numbers run in three columns. The first row is 1, 2, 3. The next is 4, 5, 6. The last is 34, 35, 36. Along one side are the dozen boxes. Along the bottom, or the near end, are the even-money boxes: red, black, odd, even, low and high. The rules for what those boxes pay are on [how to play roulette](/guides/how-to-play-roulette). This page is where the boxes sit and which numbers they own.

You must be 18+. The felt does not become kinder because you can name every zone. [Responsible gambling](/responsible-gambling) is the stop. Colour probabilities are a different article, [roulette colors](/guides/roulette-colors). The price of each zone is the [roulette odds chart](/guides/roulette-odds-chart). Guides in this family sit under [Games and odds](/guides/topics/games-and-odds).`,
    },
    {
      id: "wheel-order",
      title: "European wheel numbers in order from zero",
      body: `The standard single-zero wheel uses this clockwise order, starting at 0:

0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26.

Then you are back at 0. The two neighbours of zero are 32 and 26. Count five pockets clockwise from 0 and you land on 2: the pockets are 0, 32, 15, 19, 4, 2. That little arc is a wheel fact. It is not a felt row. On the felt, 32 is in the third dozen and 15 is in the second.

Worked example 1. 17 and 34 are neighbours in the list above: 25, then 17, then 34, then 6. On the felt, 17 is in the second dozen and the middle column. 34 is in the third dozen and the first column. They do not share a corner. A chip on the felt-corner between two table-neighbours does not cover a wheel-neighbour. If you want wheel neighbours you have to bet them as separate straight-up chips, or use a neighbour bet the dealer offers by name.

The sequence is the layout. Memorise the neighbours of zero first. The rest can live on a card until you care about announced bets.`,
    },
    {
      id: "dozens-columns",
      title: "Dozens, columns and the streets they are built from",
      body: `The grid is three columns of twelve. Reading down column 1, the numbers are 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34. Column 2 is those numbers plus one. Column 3 is those numbers plus two. A column bet is the box at the foot of that line. It covers all twelve numbers in the line and it does not cover zero.

The dozens cut the grid the other way. The first dozen is the top four rows, 1 through 12. The second dozen is 13 through 24. The third dozen is 25 through 36. A dozen bet is the side box level with those rows.

| Zone | Numbers | How many | Includes 0? |
| --- | --- | --- | --- |
| First dozen | 1–12 | 12 | No |
| Second dozen | 13–24 | 12 | No |
| Third dozen | 25–36 | 12 | No |
| Column 1 | 1, 4, 7 … 34 | 12 | No |
| Column 2 | 2, 5, 8 … 35 | 12 | No |
| Column 3 | 3, 6, 9 … 36 | 12 | No |

Worked example 2. Three dozens cover 12 + 12 + 12 = 36 numbers. A single-zero wheel has 37 pockets. The pocket left outside every dozen and every column is 0. A street is one row, so 7-8-9 is a street and there are 12 streets in the grid. A six-line is two adjacent streets, six numbers, such as 7 through 12. Those shapes are felt shapes. They do not follow the wheel order.`,
    },
    {
      id: "zero",
      title: "Where zero sits on the wheel and on the felt",
      body: `Zero has two addresses. On the European wheel it sits between 26 and 32. On the felt it sits in a green compartment at the head of the three columns, wide enough that a chip can rest on zero alone or on the line between zero and a number in the first row.

A split of 0 and 1, 0 and 2, or 0 and 3 is a chip on the line between zero and that number. A street that includes zero is the trio 0, 1, 2 or 0, 2, 3, depending on the line you touch. The exact lines are printed. If your chip is ambiguous, ask the dealer to set it in the centre of the zone you mean before the ball drops.

Double zero, on layouts that have it, sits beside 0 in that head compartment. The pair 0 and 00 is its own split. The five-number basket, the zone that covers 0, 00, 1, 2 and 3, is a mark on that double-zero felt only. It is a layout object. Its price belongs on the odds chart, not in a tour of the boxes.

French tables often add a separate oval, the racetrack, beside the grid. The oval is the wheel order drawn as a loop so announced bets can be placed by section. The names of those sections live on [French roulette](/guides/french-roulette). The rectangle of dozens and columns is still the main layout underneath.`,
    },
    {
      id: "types",
      title: "How the layout changes with the roulette type",
      body: `Single-zero layouts, the usual European and French felts, have one green compartment. The number grid under it is the same 1-to-36 rectangle. French felts print more of the bets in French and add the racetrack. The columns and dozens do not move.

Double-zero layouts add 00 on the felt and a 00 pocket on the wheel. The wheel order is not the European sequence with a pocket squeezed in. The American wheel uses its own order, with 0 and 00 opposite each other. Do not take the clockwise list from the single-zero section and insert 00 next to 0. You would be naming the wrong neighbours.

| Layout | Zero compartments on the felt | Wheel order | Extra diagram |
| --- | --- | --- | --- |
| European | Single 0 | The clockwise list above | Usually none |
| French | Single 0 | Same single-zero order | Racetrack for announced bets |
| American | 0 and 00 | A different 38-pocket order | Basket zone at the head |

The live game at [Roulette](/roulette) is not one of these three felts. It is a separate coloured wheel. Use this page to read a casino layout. Use that page for the game this site runs. A practice picture of a 37-pocket felt is a picture of the European rows above, not a picture of the live table.`,
    },
    {
      id: "checklist",
      title: "A checklist for reading any felt you sit at",
      body: `Before the first chip, spend one minute on geography. It prevents a split you meant as a straight, and a dozen you thought included zero.

- Find zero. Count the green compartments: one, or two.
- Find the first row. It should be 1, 2, 3, under zero.
- Trace column 1 down to 34 and find the column box at the foot.
- Find the three dozen boxes and read 1–12, 13–24, 25–36.
- Remember 0 is outside those boxes.
- If you want wheel neighbours, use the clockwise list, not the felt row.
- You are 18+. The minimum bet is on the plaque, not in the diagram.

Count the first street with a finger: 1, 2 and 3 are three pockets, one row. Count a six-line as two of those rows. If the finger count and the name disagree, move the imaginary chip before you ever set down a real one. The same finger test works on a column: twelve numbers, ending in 34, 35 or 36, and no zero in the stack.

If the table has a racetrack and you do not know the section names, ignore the oval and play the rectangle. The rectangle is enough to make every standard bet. The oval is a convenience for people who already think in wheel order. Confusing the two is how a "neighbour" chip ends up on a felt corner that covers four unrelated pockets.`,
    },
    {
      id: "practice",
      title: "How to practice the map without turning it into a system",
      body: `Draw the twelve rows. Write 1, 2, 3 on the first and keep adding three until you reach 34, 35, 36. Then write the clockwise wheel list on a second card. Pick a number and find it on both cards. Say its dozen, its column and its two wheel neighbours. That drill is the layout. It is not a method for choosing the next bet.

When the drill is easy, look at a printed felt and place an imaginary chip on a street, a corner and a six-line. Name the numbers under the chip before you look them up. The mistakes worth catching are a corner that you counted as three numbers, and a six-line that jumped a row.

[Roulette simulator](/guides/roulette-simulator) talks about spinning a practice wheel many times. The layout does not change across those spins. 17 stays beside 34 on the European wheel whether the last number was 17 or not. If a practice tool rearranges the wheel, it is not showing this layout. If it offers a recovery sequence, it has left geography and started selling a system. Stay with the two cards until you can put a chip on the zone you named.`,
    },
  ],
  faqs: [
    {
      q: "What order are the numbers on a European roulette wheel?",
      a: "Clockwise from 0 the order is 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26, then back to 0.",
    },
    {
      q: "Does a dozen bet include zero?",
      a: "No. The dozens are 1–12, 13–24 and 25–36. Zero sits in its own compartment at the head of the grid, outside every dozen and every column.",
    },
    {
      q: "Are wheel neighbours next to each other on the felt?",
      a: "Usually not. On the European wheel, 17 and 34 are neighbours. On the felt, 17 is in the second dozen and 34 is in the third, in different columns.",
    },
    {
      q: "How is an American layout different?",
      a: "The felt adds 00 beside 0, and the wheel uses its own 38-pocket order. The dozens and columns on the number grid are still the same 1-to-36 rectangle.",
    },
    {
      q: "What is a street on the layout?",
      a: "A street is one row of three numbers, such as 7, 8 and 9. The grid has 12 streets. Two adjacent streets together are a six-line.",
    },
  ],
  sources: [
    { label: "Roulette", url: "https://en.wikipedia.org/wiki/Roulette" },
    {
      label: "Roulette wheel",
      url: "https://en.wikipedia.org/wiki/Roulette#Roulette_wheel_number_sequence",
    },
  ],
  related: ["how-to-play-roulette", "roulette-colors", "french-roulette", "roulette-odds-chart"],
  updated: "2026-10-06",
};

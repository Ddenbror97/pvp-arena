import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bingo-odds",
  cluster: "Games & odds",
  keyword: "bingo odds",
  secondary: [
    "chance of winning bingo",
    "bingo probability",
    "bingo card odds",
    "bingo players odds",
  ],
  title: "Bingo Odds: Your Real Chance of Winning Explained",
  description:
    "What are your bingo odds? We calculate the chance of winning by card count and players, explain pattern odds and share the few tips that help.",
  h1: "Bingo odds: your chance by cards, players and pattern",
  answer:
    "Bingo odds are the chance your cards cover the called pattern before the other cards do. When cards are exchangeable, your share of the win is about the share of the cards you hold. Ten cards out of 100 is about 10%, before a same-call split. The pattern changes how many numbers must be covered. It does not, by itself, beat the gap between card sales and the prize. You must be 18+ or the local legal age.",
  facts: [
    "A US 75-ball card is a 5×5 grid with a free centre, so it carries 24 numbers from 1 to 75.",
    "With 100 cards in play, 4 cards are about a 4% share of the winning ticket, ties aside.",
    "The chance 5 specific numbers are all drawn in 20 calls is (20×19×18×17×16)/(75×74×73×72×71), about 0.09%.",
    "A 4-number set, such as a line through the free centre, is easier on one card and still a long shot by call 15.",
    "Buying more cards raises your share and your cost together. It does not raise the prize-to-sales ratio.",
    "Shape names and pictures of patterns belong on the bingo patterns page. This page is the probability.",
  ],
  sections: [
    {
      id: "share",
      title: "Your chance is mostly your share of the cards",
      body: `Bingo odds start from a race, not from a casino paytable. Numbers are drawn without replacement. The first card to complete the pattern wins, or the cards that complete it on the same call share the prize. If every card is a fair random card, the cards are exchangeable: none of them is special before the draw. Your chance of holding the winning card is then your count divided by the count in play.

Worked example 1. The game sells 100 cards. You buy 4. Your share is 4/100 = 4%. Buy 1 card and the share is about 1%. Buy 10 and it is about 10%. A same-call tie splits the prize among the cards that hit together, so the expectation of a fair split is still your share of the prize. You did not need a hot colour or a lucky corner to get that result. You needed a fraction.

The fraction is not a return. If those 100 cards sold for $1 and the prize is $70, the room kept $30 before anyone won. Your expected payout on 4 cards is about 0.04 × $70 = $2.80, against $4 spent. More cards multiply the $2.80 and the $4 in the same direction. [Variance in gambling](/guides/variance-in-gambling) is why one night can still pay you the whole $70. The mean stays the prize ratio. You must be 18+. [Responsible gambling](/responsible-gambling) is the spend limit. More odds guides sit under [Games and odds](/guides/topics/games-and-odds).`,
    },
    {
      id: "players",
      title: "Players, cards and a table of shares",
      body: `Players and cards are different counts. Ten players with one card each is a 10-card game. Ten players with six cards each is a 60-card game. Your odds follow the cards, not the heads. A quiet room where you hold half the cards is a different probability from a hall where you hold half a percent, even if both feel like "bingo night."

| Cards you hold | Cards in play | Approximate chance you hold the winner |
| --- | --- | --- |
| 1 | 20 | 5% |
| 1 | 100 | 1% |
| 4 | 100 | 4% |
| 10 | 100 | 10% |
| 6 | 60 | 10% |
| 2 | 200 | 1% |

The table ignores the small effect of two cards finishing on the same call. In a split you still receive a slice, so the expectation stays near the share. What changes in a crowded hall is the chance that the winning call completes several cards at once. Your chance of being the only winner falls. Your expected share of the prize does not suddenly improve.

Ask two numbers before you buy: how many cards are in this game, and what is the prize relative to sales. A poster that shouts the prize and hides the card count has hidden the odds. A poster that shouts "more cards, better odds" and hides the price per card has hidden the cost.`,
    },
    {
      id: "pattern-math",
      title: "The chance of covering one pattern on one card",
      body: `Pattern odds are a covering problem. A pattern that needs k specific numbers is complete once those numbers have all been drawn. For a 75-ball draw, the chance that k named numbers are among the first n calls is

(n × (n − 1) × … × (n − k + 1)) / (75 × 74 × … × (75 − k + 1)).

Worked example 2. Five specific numbers in 20 calls: k = 5, n = 20.

Numerator: 20 × 19 × 18 × 17 × 16 = 1,860,480.
Denominator: 75 × 74 × 73 × 72 × 71 = 2,071,126,800.
The ratio is about 0.000898, or about 0.09%.

A line that uses the free centre needs only four numbers. After 15 calls the same style of product is 15 × 14 × 13 × 12 / (75 × 74 × 73 × 72) = 32,760 / 29,170,800, about 0.11%. One card, one line, early in the game, is a slim event. The game still ends, because many cards each carry several lines, and the winning call is whenever the first of those lines completes.

The pictures and the usual names of those shapes are on [bingo patterns](/guides/bingo-patterns). This page only needs the count of numbers the shape demands. A shape that needs more numbers takes more calls on a single card. In a room full of cards, the race ends at the first completion, so a harder shape lengthens the game more than it hands you the prize.`,
    },
    {
      id: "many-cards",
      title: "Why the room hits even when one line looks impossible",
      body: `The 0.09% figure is easy to misuse. It is the chance that one named set of five numbers is fully drawn by call 20. A 75-ball card has many lines, and a hall has many cards. The chance that some line on some card is done by call 20 is far higher than 0.09%. That is why a line game in a busy room ends in the teens, while your personal copy of one specific line is still unlikely to be the one.

| Covering problem | Calls | Approximate probability |
| --- | --- | --- |
| 5 specific numbers on one line | 20 | about 0.09% |
| 4 specific numbers through the free centre | 15 | about 0.11% |
| You hold 4 of 100 cards | whole game | about 4% |
| You hold 1 of 20 cards | whole game | about 5% |

Read the rows as different questions. The first two are "has this exact set been drawn yet?" The last two are "whose card won the race?" People mix them and conclude that bingo is generous because games end quickly, or impossible because 0.09% looks like a lottery. The game ends quickly because the room has many attempts. Your payout follows your share of those attempts, and then the prize ratio.

[Keno vs bingo](/guides/keno-vs-bingo) is the neighbour that uses a fixed draw and a paytable instead of a race among cards. Do not import a keno catch-rate into a bingo hall. The products do not share a denominator.`,
    },
    {
      id: "prize",
      title: "The prize ratio is the return, the share is the variance",
      body: `Separate two levers. The prize divided by card sales sets the average return of the game. Your cards divided by all cards sets how lumpy that return is. A game that returns $90 of every $100 in sales is a gentler average than a game that returns $50, whatever pattern is on the poster. Holding 20% of the cards in the gentler game is still an average loss. It is a smaller average loss, delivered with less chance of a blank night.

Session packs and early-bird sheets are still cards in a denominator. If the pack puts you into six games, you have six fractions, not a new law. Add the cost of the pack and compare it with the prizes you are eligible for. A free consolation square that almost nobody hits is not a second game with a fat share. Read how many numbers it needs and how many cards are eligible.

Crypto-cashier bingo is the same covering maths with a different purse. Sites, RTP talk and why a card is not a shared PvP pot are on [crypto bingo](/guides/crypto-bingo). Nothing in a wallet changes 75 × 74 × 73 × 72 × 71. If a site lets you set the pattern and the card count, you can compute both levers. If it hides one of them, you cannot know the odds, only the artwork.`,
    },
    {
      id: "tips",
      title: "The few tips that actually move the result",
      body: `Most bingo advice is superstition with a dauber. The short list that changes money or eligibility is smaller.

- Know the pattern before you buy. The number of squares it needs is the k in the formula. Names and pictures are on the patterns page.
- Know the card count and your count. Your share is the chance you hold the winner.
- Compare the prize with sales. That ratio is the average return.
- Extra cards scale chance and cost together. Buy them only inside a spend you already accepted.
- In a hall that requires a claim, call when you have the pattern. A silent winner can be disqualified under the house rule.
- Do not chase a number because it is "due." Draws within a game are without replacement. The next game does not remember the last. That urge is the [gambler's fallacy](/guides/gamblers-fallacy).
- You are 18+. A session limit beats a feeling that the room is hot.

A tip that sounds clever and fails the list is usually a pattern nickname or a colour of dauber. Those change nothing in the fraction. The patterns guide can tell you the nickname. It cannot make five specific numbers more likely than the product above.

Nothing on the list raises the prize ratio by clever daubing. Accurate daubing keeps you eligible for the share you already bought. Clever daubing is still the same card.`,
    },
    {
      id: "checklist",
      title: "A checklist before you pay for another card",
      body: `Run the list once per session, not once per feeling.

- You can say the pattern's number count, or you can point at the patterns guide and read it.
- You know how many cards are in play, or you know the cap if the game has not filled.
- You know the prize and the card price, so you can see the ratio.
- Your share, cards you hold divided by cards in play, is a number you accept.
- A same-call split does not surprise you. The prize may be shared.
- You are not buying the extra strip to repair the last blank game.
- You are 18+ and the spend is inside the limit you set before the first call.

If you cannot fill the second and third lines, you are buying a story. Stories are allowed as entertainment when the price is one you can lose. They are not a probability. The probability is the share, the covering count and the prize ratio. Write those three down. The rest of the night is the draw, which neither you nor the card can steer.`,
    },
  ],
  faqs: [
    {
      q: "What are my bingo odds if I hold 4 cards out of 100?",
      a: "About 4% of the win, because fair cards are exchangeable. A tie on the winning call splits the prize. The expected share is still about your fraction of the cards.",
    },
    {
      q: "Do more cards improve bingo odds?",
      a: "They raise your share of the winning ticket and they raise your cost by the same kind of step. They do not improve the prize relative to total card sales.",
    },
    {
      q: "How rare is one exact five-number line after 20 calls?",
      a: "About 0.09% for five specific numbers. The product is (20×19×18×17×16)/(75×74×73×72×71). A whole room of cards is why the game can still end near then.",
    },
    {
      q: "Does the pattern change who has the best chance?",
      a: "A harder pattern needs more numbers, so the game runs longer. If everyone plays the same pattern, your chance of holding the winner is still about your share of the cards.",
    },
    {
      q: "Where are the pattern names and the crypto game?",
      a: "Shape names and how long each shape takes are on the bingo patterns page. Crypto-cashier bingo is on the crypto bingo page. This page is the probability of covering and of holding the winner.",
    },
  ],
  sources: [
    {
      label: "Bingo (American version)",
      url: "https://en.wikipedia.org/wiki/Bingo_(American_version)",
    },
    {
      label: "Hypergeometric distribution",
      url: "https://en.wikipedia.org/wiki/Hypergeometric_distribution",
    },
  ],
  related: ["bingo-patterns", "crypto-bingo", "keno-vs-bingo", "variance-in-gambling"],
  updated: "2026-10-06",
};

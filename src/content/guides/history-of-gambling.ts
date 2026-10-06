import type { Guide } from "./types";

export const guide: Guide = {
  slug: "history-of-gambling",
  cluster: "Casino knowledge",
  keyword: "history of gambling",
  secondary: [
    "gambling history",
    "origins of gambling",
    "history of casinos",
    "slot machine history",
    "blackjack history",
  ],
  title: "History of Gambling: From Ancient Dice to Crypto",
  description:
    "The history of gambling from knucklebones and Roman dice to lotteries, roulette, slot machines, blackjack, online casinos and crypto, with dates and sources.",
  h1: "History of gambling: from knucklebones to online and crypto play",
  answer:
    "The history of gambling runs back at least five thousand years. People cast knucklebones and early dice in the ancient Near East, India, China and Rome. Playing cards spread from China to Europe by the 1370s, state lotteries funded governments from the 1500s, and probability theory grew out of dice problems in 1654. Casinos, slot machines, blackjack, online play in the 1990s and crypto games in the 2010s followed.",
  facts: [
    "Six-sided dice have been excavated at Bronze Age sites in Iran and the Indus Valley, dated to roughly the third millennium BCE.",
    "Pascal and Fermat's 1654 letters on dice and the 'problem of points' are usually treated as the start of probability theory.",
    "The Ridotto, opened in Venice in 1638, is often called the first public, government-sanctioned gambling house.",
    "Charles Fey's Liberty Bell (1890s) set the three-reel slot template; Bally's Money Honey (1963) made it electromechanical.",
    "Thorp's Beat the Dealer (1962) proved blackjack could be beaten by card counting and changed casino rules worldwide.",
  ],
  sections: [
    {
      id: "ancient",
      title: "Ancient games: bones, dice and the gods",
      body: `The oldest gambling tools were animal bones. Astragali, the knucklebones of sheep and goats, have four distinct resting faces and turn up in sites across the Mediterranean and Near East. They were used for children’s games, for divination and for betting, and the line between those uses was often thin. Casting lots to learn the will of the gods and casting lots to settle a wager used the same objects.

Cubic dice came later. Six-sided dice have been found at Shahr-i Sokhta in eastern Iran and at Indus Valley cities, dated to roughly the third millennium BCE. Some ancient dice are visibly uneven or have unusual pip layouts, so "fair" was not a given.

### India

The Rigveda, one of the oldest surviving religious texts, contains a hymn usually called the Gambler’s Lament (Book 10, hymn 34). The speaker describes dice made from vibhidaka nuts, a wife driven away and a household lost, and ends with advice to farm instead. The Mahabharata turns on a rigged dice game in which Yudhishthira stakes and loses his kingdom, his brothers and finally Draupadi. Gambling as a path to ruin is one of the oldest stories on record.

### China and Rome

Chinese sources mention games of chance and betting on animal fights from early dynasties. The popular claim that keno funded the Great Wall is a legend with no solid documentation, so treat it as folklore.

Romans gambled constantly and legislated against it constantly. Dice games (alea) were formally restricted, with an exception during the Saturnalia festival. Enforcement was patchy. Suetonius reports that Augustus wrote cheerfully about losing at dice and that Claudius wrote a book on the game and had his carriage fitted so he could play while travelling. Julius Caesar’s line at the Rubicon, "alea iacta est" (the die is cast), shows how natural dice metaphors were to a Roman audience.`,
    },
    {
      id: "cards-lotteries-maths",
      title: "Cards, lotteries and the birth of probability",
      body: `Playing cards appear in China by the Tang dynasty, around the ninth century, and in Europe by the 1370s, when several cities issued bans on them within a few years of each other. That burst of bans is the best evidence for how fast cards spread once they arrived. Suits changed along the way: Italian and Spanish cups, coins, swords and batons; German hearts, bells, acorns and leaves; and the French hearts, diamonds, clubs and spades that became the modern [52 card deck](/guides/52-card-deck).

### Lotteries as public finance

Towns in the Low Countries ran lotteries in the fifteenth century to fund walls and poor relief. England’s first state lottery was chartered under Elizabeth I in 1566 and drawn in 1569 to pay for harbours and public works. The Virginia Company used lotteries to fund the Jamestown colony, and colonial American lotteries later paid for roads, churches and college buildings. Adam Smith noted in 1776 that no lottery is perfectly fair, because the organiser has to make money on it. That is the house edge stated two centuries before casinos printed it on a sign.

### Dice problems become mathematics

Gerolamo Cardano wrote a manual on games of chance in the sixteenth century; it was published only in 1663, long after his death. The real starting point came in 1654, when Blaise Pascal and Pierre de Fermat corresponded about gambling puzzles, including one reportedly raised by the gambler Chevalier de Méré:

- Chance of at least one six in 4 rolls of one die: 1 − (5/6)⁴ ≈ 51.8%.
- Chance of at least one double six in 24 rolls of two dice: 1 − (35/36)²⁴ ≈ 49.1%.

The first bet is slightly favourable and the second slightly unfavourable, which is why the story says de Méré lost money on the second. Jacob Bernoulli’s Ars Conjectandi (1713) then proved an early form of the [law of large numbers](/guides/law-of-large-numbers-gambling): over many trials, the average result settles close to the expected value. Every casino business model since rests on that theorem.`,
    },
    {
      id: "casinos-roulette",
      title: "Gambling houses, spa towns and roulette",
      body: `Venice opened the Ridotto in 1638, a government-run room where masked nobles played card games during Carnival. It closed in 1774 after the Great Council decided it was ruining the aristocracy. The [oldest casino](/guides/oldest-casino) guide covers the Ridotto, Casino di Venezia and the spa casinos in detail.

### Roulette

By the late 1700s a wheel called roulette, with a single zero and a double zero, was being played in Paris. The claim that Blaise Pascal invented it while chasing perpetual motion is a popular story with no good evidence behind it. In 1843, at Bad Homburg in Germany, François and Louis Blanc offered a wheel with only one zero to draw players away from rival casinos. That cut the house edge on an even-money bet from 2/38 ≈ 5.26% to 1/37 ≈ 2.70%. François Blanc later ran the Monte Carlo casino, which opened in 1863, and the single-zero wheel became the European standard. American wheels kept the double zero.

### Hazard to craps

The medieval English dice game hazard used a "main" and "chance" scheme that is hard to follow today. The commonly told story is that a simplified version reached New Orleans in the early 1800s and became craps; Bernard de Marigny is often credited with spreading it, though the details are hard to verify. See the [hazard dice game](/guides/hazard-dice-game) guide for the rules. Craps reached casinos in the 1900s once John H. Winn introduced the "don’t pass" bet, which let the house bank the game instead of taking a cut of side bets between players.`,
    },
    {
      id: "blackjack-slots",
      title: "Blackjack and the slot machine",
      body: `### Blackjack

Vingt-et-un ("twenty-one") was played in French casinos in the eighteenth century, and Cervantes mentions a game called veintiuna in a story from the early 1600s. The American name is usually explained by a bonus some houses paid for an ace of spades with a black jack; that story is widely repeated but thinly sourced. Nevada legalised wide-open casino gambling in 1931, and twenty-one became a fixture of the new Las Vegas clubs.

The game changed in two steps. In 1956 four US Army mathematicians, Roger Baldwin, Wilbert Cantey, Herbert Maisel and James McDermott, published the first near-correct basic strategy, cutting the edge to well under 1% for a rule-perfect player. In 1962 [Edward Thorp](/guides/edward-thorp) published Beat the Dealer, which showed that tracking removed cards can flip the edge in the player’s favour. Casinos answered with multi-deck shoes, earlier shuffles, banning known counters and, later, continuous shuffling machines. The [card counting](/guides/card-counting) guide explains the method, and [blackjack rules](/guides/blackjack-rules) covers how 6:5 payouts and dealer-hits-soft-17 rules claw back the edge.

### The slot machine

| Year | Machine | What changed |
| --- | --- | --- |
| 1891 | Sittman and Pitt (Brooklyn) | Five drums of cards showing poker hands; prizes paid by the bar, not the machine |
| 1890s | Charles Fey’s Liberty Bell (San Francisco) | Three reels, automatic coin payout, bell symbol as top prize |
| 1963 | Bally Money Honey | Electromechanical, large hopper, payouts of hundreds of coins |
| 1976 | Fortune Coin | First video slot approved in Nevada |
| 1984 | Inge Telnaes patent | Random numbers mapped to "virtual reels", allowing very large jackpots |

The fruit symbols and BAR logo are often traced to early machines that dispensed chewing gum to get around gambling bans. That link is plausible and commonly told, but hard to pin to one source. The Telnaes patent is the one that mattered most for the maths. Once a computer picks the stop, a jackpot symbol can have a tiny chance of landing while appearing on the reel as often as any other symbol. Modern [slot machine odds](/guides/slot-machine-odds) are set in software, not by the reels you see.`,
    },
    {
      id: "modern",
      title: "Regulation, online casinos and crypto",
      body: `The twentieth century mixed booms and crackdowns. Nevada legalised casino gambling in 1931; the [Las Vegas history](/guides/las-vegas-history) guide follows the city from railroad stop to mob era to corporate resorts. Lotteries returned to US states in 1964, when New Hampshire launched the first modern state lottery. Britain’s Betting and Gaming Act 1960 legalised betting shops, and Macau, Atlantic City (1978) and tribal casinos in the US grew over the following decades.

### Online gambling

In 1994 Antigua and Barbuda passed a free trade law that let it license online gambling operators, and software firms began building casino platforms around the same time. The Kahnawake Gaming Commission, in Quebec, began licensing online operators in the late 1990s. Planet Poker dealt the first real-money online poker game in 1998. The US Unlawful Internet Gambling Enforcement Act of 2006 targeted payment processing, the UK’s Gambling Act 2005 created the Gambling Commission, and in 2018 the US Supreme Court struck down the federal sports betting ban in Murphy v. NCAA, opening sports betting state by state. See [online gambling](/guides/online-gambling) for how it works today.

### Crypto and skins

Bitcoin launched in 2009, and on-chain dice games appeared within a few years. Crypto sites popularised "provably fair" play: the server commits to a hashed seed before the bet, then reveals it afterwards so anyone can recompute the result. Video game items became a gambling currency in the mid-2010s; the [CS:GO gambling history](/guides/csgo-gambling-history) guide covers that skin era and the crackdowns that followed.`,
    },
    {
      id: "patterns",
      title: "What five thousand years of gambling teaches",
      body: `A few patterns repeat through every era.

1. **Bans follow booms.** Rome, medieval cities, colonial legislatures and modern regulators all tried to prohibit or tax gambling after it spread quickly. Prohibition moved it rather than ending it.
2. **The house edge moved from cheating to arithmetic.** Early games relied on loaded dice and card sharps. Modern houses rely on payouts set slightly below true odds, as with the zero on a roulette wheel. The [house edge](/guides/house-edge) guide shows the calculation.
3. **Governments became operators.** Lotteries, state monopolies and licensed casinos turned gambling into a source of public money.
4. **Technology changes speed, not odds.** The slot machine, the internet and crypto each raised the number of bets a person can place in an hour. Faster bets meet the law of large numbers sooner.

More history is collected in the [Casino knowledge topic](/guides/topics/casino-knowledge), including [the history of poker](/guides/history-of-poker) and [gambling quotes](/guides/gambling-quotes).

### Where PVPspinArena sits

PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network: [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette). In a sense it goes back to the oldest form of gambling, people betting against each other, with a modern record of fairness. Coinflip is a 50/50 between two players, and the winner takes the pot minus any fee shown before entry. Roulette uses a 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee that the law of large numbers enforces as surely as it did at the Ridotto. Every result comes from committed seeds that you can check on [fairness](/fairness). Play is 18+ only, and limits and help are on [responsible gambling](/responsible-gambling).

See also [the history of dice](/guides/history-of-dice).`,
    },
  ],
  faqs: [
    {
      q: "What is the oldest known form of gambling?",
      a: "Casting knucklebones (astragali) and early dice is the oldest well-evidenced form. Six-sided dice from the third millennium BCE have been found in Iran and the Indus Valley, and older bone lots were used for both divination and betting.",
    },
    {
      q: "When did casinos start?",
      a: "The Ridotto in Venice, opened in 1638, is usually cited as the first public, state-sanctioned gambling house. Spa-town casinos in Germany and Belgium followed in the eighteenth and nineteenth centuries, and Monte Carlo opened in 1863.",
    },
    {
      q: "Who invented the slot machine?",
      a: "Sittman and Pitt built a card-drum poker machine in Brooklyn in 1891, but Charles Fey’s Liberty Bell in San Francisco in the 1890s set the three-reel, automatic-payout design most people mean by a slot machine.",
    },
    {
      q: "How old is blackjack?",
      a: "Its ancestor vingt-et-un was played in France in the 1700s, and a Spanish game called veintiuna appears in Cervantes in the early 1600s. The modern strategy era began with a 1956 paper and Edward Thorp’s 1962 book.",
    },
    {
      q: "When did online gambling begin?",
      a: "In the mid-1990s. Antigua and Barbuda began licensing online operators in 1994, the first real-money online poker game ran in 1998, and crypto dice games followed Bitcoin’s 2009 launch within a few years.",
    },
  ],
  sources: [
    {
      label: "Encyclopaedia Britannica: gambling",
      url: "https://www.britannica.com/topic/gambling",
    },
    { label: "Wikipedia: Slot machine", url: "https://en.wikipedia.org/wiki/Slot_machine" },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
    { label: "Wikipedia: Ridotto", url: "https://en.wikipedia.org/wiki/Ridotto" },
  ],
  related: [
    "history-of-poker",
    "las-vegas-history",
    "oldest-casino",
    "gambling-quotes",
    "csgo-gambling-history",
    "law-of-large-numbers-gambling",
    "history-of-dice",
  ],
  updated: "2026-09-27",
};

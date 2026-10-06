import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-chip-values",
  cluster: "Casino knowledge",
  keyword: "casino chip values",
  secondary: [
    "casino chip colors",
    "poker chip values",
    "what are casino chips worth",
    "casino chip denominations",
  ],
  title: "Casino Chip Values: Colors, Denominations and Security",
  description:
    "Casino chip values by color: the common $1 to $5,000 scheme, roulette wheel chips, plaques, regional differences, old slot tokens and how chips resist forgery.",
  h1: "Casino chip values: colors, denominations and how chips are protected",
  answer:
    "Casino chip values are set by each casino, but most North American venues follow a shared colour scheme: white or blue for $1, red for $5, green for $25, black for $100, purple for $500 and orange or yellow for $1,000. The printed denomination on the chip is what counts. Roulette wheel chips have no printed value, and chips are only redeemable at the casino that issued them.",
  facts: [
    "The printed value on a chip always overrides its colour; colour schemes are a convention, not a law everywhere.",
    "Red $5, green $25 and black $100 are the most consistent colours across North American casinos.",
    "Roulette wheel chips carry no denomination; their value is set at buy-in and they must be cashed at the same table.",
    "European casinos often use rectangular plaques for high values, sometimes with serial numbers.",
    "Modern chips carry layered security features, and many high-value chips embed RFID tags.",
  ],
  sections: [
    {
      id: "scheme",
      title: "The common colour scheme",
      body: `There is no single worldwide standard for casino chip values, but North American casinos have converged on a scheme that most players learn within one visit. Some regulators prescribe colours by denomination; others leave the choice to the operator subject to approval. Either way, the printed number on the chip is the value, and the colour is a fast visual cue for dealers, players and surveillance.

| Colour | Common value | Nicknames and notes |
| --- | --- | --- |
| White or blue | $1 | Blue is also common for $1 in some regions |
| Pink | $2.50 | Used at blackjack to pay 3:2 on $5 bets |
| Red | $5 | "Nickels" |
| Green | $25 | "Quarters" |
| Black | $100 | A big bet in black prompts a "checks play" call |
| Purple | $500 | Sometimes called "barneys" |
| Orange or yellow | $1,000 | Varies more than lower values |
| Grey, brown or other | $5,000 and up | Casino-specific |

### Why the scheme matters at the table

When a dealer pays a bet, they "cut" stacks of chips by colour. A player betting $65 might put down two greens, two reds and five whites; a dealer can read that stack from across the table in a second. The pink $2.50 chip exists because a 3:2 blackjack on a $5 bet pays $7.50, and dealers otherwise have to make change constantly. On a 6:5 table, that same $5 blackjack pays only $6, which is one reason the [blackjack rules](/guides/blackjack-rules) guide treats 3:2 versus 6:5 as a key rule to check.

Standard casino chips are about 39 mm in diameter and weigh roughly 8.5 to 10 grams. Most are compression-moulded clay composite, although ceramic chips are common for printed designs.

This page belongs to the [Casino knowledge topic](/guides/topics/casino-knowledge). For how to handle chips at a table, see [casino etiquette](/guides/casino-etiquette).`,
    },
    {
      id: "regional",
      title: "Regional variation around the world",
      body: `Outside North America, chip colour conventions vary much more, and many casinos denominate chips in local currency with their own palette.

### United Kingdom and Europe

UK and European casinos use chips denominated in pounds or euros, often in values such as 1, 5, 10, 25, 100 and 500. Colours differ by venue. High values commonly come as plaques: rectangular or oval pieces with printed values that can reach tens of thousands of euros. Plaques are usually serial-numbered, which makes them easier to track and harder to pass if stolen.

### Macau and Asia

Macau casinos denominate chips in Hong Kong dollars or patacas. High-value chips and plaques are widespread because baccarat bets there can be very large. Several Macau operators were early adopters of RFID-embedded chips, and some casinos issue "non-negotiable" or "dead" chips to junkets and premium players, which can be bet but not cashed until they are converted after a win. The [baccarat rules](/guides/baccarat-rules) guide explains the game those chips mostly go on.

### Cruise ships and small venues

Cruise ship casinos usually run in US dollars with a colour scheme similar to Las Vegas. Small card rooms may use generic stock chips with a venue stamp.

### Roulette wheel chips

Roulette is the exception everywhere. Each player at a table gets a unique colour with no printed value. When you buy in, the dealer sets the value per chip, for example $1 each for 100 chips, and marks it with a button on the wheel-chip rack. Those chips are only worth anything at that table. Before you leave, you must exchange them for value chips; a cashier cannot redeem them. On PVPspinArena's own [Roulette](/roulette), the colours Purple, Silver and Green are wheel slots rather than chip denominations, but the idea is the same: a colour only has meaning within its own game.`,
    },
    {
      id: "chips-vs-tokens",
      title: "Chips, cheques, plaques and tokens",
      body: `Players use "chips" for everything, but casino staff and collectors use several distinct terms.

- **Chips:** the general word for table-game currency with a printed value.
- **Cheques or checks:** an older industry word for value chips, still heard in dealer phrases such as "checks play" when a large bet goes down.
- **Plaques:** high-value rectangular pieces, common in Europe and Asia.
- **Tokens:** metal coins issued for slot machines. Before ticket-in, ticket-out (TITO) systems spread in the late 1990s and 2000s, many US casinos minted $1 tokens and larger slot tokens and sold them at the change booth.
- **Promotional or non-negotiable chips:** chips that can be bet but not cashed. They are often given as a free-bet promotion.

### What happened to slot tokens

Once slot machines moved to printed barcode tickets, the need for coin tokens mostly disappeared. Casinos sold off or destroyed their stocks, and old tokens became collectible. Most casinos that have closed or changed ownership no longer redeem their tokens, and a regulator may set a deadline after which tokens and chips from a closed casino cannot be cashed. The [Stardust casino](/guides/stardust-casino) is one example of a closed Las Vegas property whose chips and tokens now circulate mainly among collectors.

### Chips are not money outside the casino

Casino chips are the property of the casino and represent a claim on it. Casinos generally only redeem their own chips, and many take steps to prevent chips from circulating as private currency. In practice, you should cash out before you leave, and you should expect the cage to ask where large amounts of chips came from. That process is explained in the [casino cage](/guides/casino-cage) guide.`,
    },
    {
      id: "security",
      title: "How casinos stop counterfeit chips",
      body: `A casino chip is a bearer instrument: whoever holds a $5,000 chip can try to cash it. That makes chips a counterfeiting target, and modern chips carry several layers of protection.

### Physical features

- **Edge spots and inserts:** unique colour patterns around the rim that must be matched exactly.
- **Inlays and printing:** a centre label with the casino name and value, often with micro-printing.
- **Ultraviolet marks:** invisible under normal light, visible under UV lamps at the cage and in surveillance.
- **Weight and material:** chip manufacturers use proprietary clay or ceramic formulations that are hard to copy exactly.

### RFID chips

Many high-value chips now embed a radio-frequency identification tag. The casino knows every chip's serial number and can check at the cage or the table whether a chip is genuine and whether it was issued or reported stolen. RFID also lets tables track bets automatically, which helps with player ratings and with spotting unusual chip flows.

### Retiring a chip set

If a casino suspects counterfeits or has chips stolen, it can switch to a new chip set and set a redemption window for old ones. A well-reported case came in 2010, when a man robbed the Bellagio in Las Vegas of about $1.5 million in chips; he was arrested after trying to sell high-value chips, which were of little use once the casino knew what had been taken. Large, unexplained chip cash-outs are exactly what the cage and [casino surveillance](/guides/casino-surveillance) teams look for.

### Counting at the table

Dealers stack chips in standard columns of 20. That makes counting fast and visual: a stack of twenty greens is $500, a stack of twenty blacks is $2,000. Uneven stacks or mixed colours are pulled apart and recounted on camera.`,
    },
    {
      id: "maths",
      title: "Buying in, colouring up and quick maths",
      body: `Knowing chip values makes the arithmetic of a table easier, and it helps you track what you are actually spending.

### Worked buy-in

You put $500 on a $25 minimum blackjack table. The dealer might give you 16 greens ($400), 16 reds ($80) and 20 whites ($20), or simply 20 greens. Ask for smaller chips if you plan to tip or bet unusual amounts.

### Tracking your session

At 70 hands an hour and $25 a hand, you are putting $1,750 an hour through the game. With a house edge around 0.5% for a good rule set played with basic strategy, the expected loss is about $8.75 an hour. With a sloppy strategy and a worse rule set, closer to 2%, it becomes about $35 an hour. The chips in front of you move up and down far more than that, which is why chips can hide the real price. The [house edge](/guides/house-edge) guide explains the formula.

### Colouring up

When you finish, push your chips to the dealer and ask to colour up. You might turn 11 greens, 7 reds and 4 whites ($314) into three blacks, two reds and four whites. It is courteous, and it means the cashier can count your chips quickly.

### A note on chip psychology

Chips feel less like money than cash. Gambling writers and researchers have long suggested that turning notes into coloured discs makes it easier to bet more than you would hand over in cash, although the size of that effect is hard to measure. A simple guard is to note your buy-in total and check your chip count against it every hour. If the number is well below where you planned to stop, colour up and leave.`,
    },
    {
      id: "online",
      title: "Stablecoin stakes instead of chips",
      body: `Online, chips disappear entirely. PVPspinArena runs three player-vs-player games, Jackpot, Coinflip and Roulette, and stakes are placed in USDC or ETH on the Base network. USDC is designed to track the US dollar one-to-one, so a 5 USDC bet reads like a red chip, without the colour conversion step. There is no cage because there are no chips to redeem.

The absence of chips removes some of the psychological padding: the amount you stake is shown in the same units you hold in your wallet. It does not remove the edge or the variance.

- In Roulette, 16 Purple and 16 Silver slots pay 2x, and one Green pays 14x. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. On 100 USDC wagered, the expected loss is about 7.88 USDC on Purple or Silver after the win fee.
- In Coinflip, the two sides are a true 50/50, and the winner takes the pot minus any fee shown before entry.
- In [Jackpot](/), your win chance equals your share of the pot.

Where a physical casino relies on chip security features and cameras, PVPspinArena relies on committed seeds: the result of every round is fixed before the round begins, and any settled round can be verified on the [fairness](/fairness) page. That is the online counterpart to UV marks and RFID tags, a way to check that what you were paid matches what the game promised.

Play is for adults 18 and over. Whatever the unit, chip or stablecoin, set the limit in money before you start.`,
    },
  ],
  faqs: [
    {
      q: "What color casino chip is worth the most?",
      a: "It depends on the casino. In the common North American scheme, purple is $500 and orange or yellow is $1,000, with higher values in casino-specific colours. Always read the printed denomination.",
    },
    {
      q: "How much is a black chip worth in a casino?",
      a: "In most North American casinos a black chip is worth $100. Check the printed value, because a few venues and many non-US casinos use different colours.",
    },
    {
      q: "Can I cash casino chips at another casino?",
      a: "Usually not. Casinos generally redeem only their own chips, even when both properties share an owner. Cash out at the casino that issued them before you leave.",
    },
    {
      q: "Why do roulette chips have no value printed on them?",
      a: "Each player gets a unique colour so bets on a crowded layout are never confused. The dealer sets the value at buy-in, and the chips must be exchanged at that table.",
    },
    {
      q: "Do casino chips expire?",
      a: "Chips from an operating casino generally remain redeemable, but when a casino closes or retires a chip set, it may set a deadline. After that, old chips are usually only worth their collector value.",
    },
  ],
  sources: [
    { label: "Wikipedia: Casino token", url: "https://en.wikipedia.org/wiki/Casino_token" },
    {
      label: "Wikipedia: Radio-frequency identification",
      url: "https://en.wikipedia.org/wiki/Radio-frequency_identification",
    },
    {
      label: "Encyclopaedia Britannica: gambling",
      url: "https://www.britannica.com/topic/gambling",
    },
  ],
  related: [
    "casino-etiquette",
    "casino-cage",
    "casino-surveillance",
    "casino-terminology",
    "house-edge",
  ],
  updated: "2026-09-27",
};

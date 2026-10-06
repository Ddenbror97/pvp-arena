import type { Guide } from "./types";

export const guide: Guide = {
  slug: "is-card-counting-illegal",
  cluster: "Blackjack",
  keyword: "is card counting illegal",
  secondary: [
    "is counting cards illegal",
    "card counting legal",
    "banned for counting cards",
    "casino backoff",
  ],
  title: "Is Card Counting Illegal? The Law and Casino Responses",
  description:
    "Is card counting illegal? Counting in your head is legal in most places, but devices are crimes and casinos can back you off or bar you. Here is how it works.",
  h1: "Is card counting illegal? What the law says and what casinos do",
  answer:
    "Is card counting illegal? In most jurisdictions, no: keeping track of cards in your head is not cheating and is not a crime. Using a device to count is different and is a criminal offence in Nevada and many other places. Casinos are private businesses, though, so where the law allows they can refuse your action, limit your bets, back you off blackjack or bar you entirely.",
  facts: [
    "Mental card counting is legal in the US, UK and most jurisdictions with legal casinos.",
    "Nevada's gaming law makes it a crime to use or possess a device to count cards or predict outcomes.",
    "New Jersey's Supreme Court ruled in Uston v. Resorts International (1982) that Atlantic City casinos could not bar players simply for counting.",
    "A backoff is a request to stop playing blackjack; a trespass warning bars you from the property.",
    "Continuous shuffling machines and early reshuffles remove most of a counter's edge without any legal action.",
  ],
  sections: [
    {
      id: "short-answer",
      title: "The short legal answer",
      body: `Card counting means tracking the ratio of high to low cards left in a blackjack shoe and betting more when the remaining cards favour the player. How it is done is covered in the [card counting guide](/guides/card-counting); this page is only about whether it is allowed and what happens if a casino decides it does not like it.

The legal position in most places rests on a simple distinction:

| Activity | Typical legal status |
| --- | --- |
| Counting cards in your head | Legal; not cheating |
| Team play with signals, all mental | Generally legal |
| Using a phone app, hidden computer or counter at the table | Criminal offence in Nevada and many other gaming jurisdictions |
| Marking cards, past-posting, colluding with a dealer | Cheating, illegal almost everywhere |
| Being refused service or barred for counting | Lawful in many places; restricted in New Jersey |

The reason mental counting is legal is that you are using only information that the casino puts face up on the table. Nothing is altered, hidden or stolen. Law generally punishes interference with a game, not skill at playing it.

That said, "not illegal" does not mean "welcome". Casinos run blackjack on the assumption that most players lose at a small percentage over time. A skilled counter can turn that into a small player edge, commonly quoted as roughly 0.5% to 1.5% depending on rules and penetration, and a casino is entitled in most places to decide it does not want that business. The rest of this page is about how that plays out. Everything here concerns adults: gambling is 18+ or older depending on your local law, and some venues set 21.`,
    },
    {
      id: "devices",
      title: "Devices: where counting becomes a crime",
      body: `The line that turns legal skill into a criminal act is usually a device. Nevada's gaming statutes, in Chapter 465 of the Nevada Revised Statutes, make it a crime to use or possess a device intended to help project the outcome of a game, track the cards played, or analyse the probability of an event. Nevada tightened these rules in the mid-1980s after hidden blackjack computers appeared in casinos. Penalties include felony charges.

What counts as a device is broad:

- a smartphone running a counting or strategy app at the table;
- concealed computers, including shoe-mounted or body-worn units;
- signalling devices used to relay a count between team members;
- any mechanical aid to tracking cards.

Other jurisdictions have similar provisions in their cheating laws. In Great Britain, cheating is an offence under section 42 of the Gambling Act 2005, and casinos treat device use as cheating.

History has several examples of how close the line has been. Edward Thorp and Claude Shannon built a wearable computer to predict roulette in the early 1960s, before such devices were outlawed; see the [Edward Thorp profile](/guides/edward-thorp). Later, commercial blackjack computers pushed legislators to act.

### Where edge play becomes a court case

The UK Supreme Court's 2017 decision in Ivey v Genting Casinos is often mentioned in counting discussions, but it concerned edge sorting at punto banco, not card counting. The court held that Phil Ivey's method amounted to cheating for the purposes of his contract with the casino, even though he did not touch the cards himself. It is a reminder that "no device" does not automatically mean "no legal risk" for every advantage technique. The case is covered on the [Phil Ivey page](/guides/phil-ivey).`,
    },
    {
      id: "backoffs",
      title: "Backoffs, barring and trespass",
      body: `Casinos that spot a counter rarely call the police, because there is no crime. Instead they use their rights as private property owners. The escalation usually runs like this:

1. **Heat.** Floor staff watch closely, a supervisor stands at the table, or the dealer shuffles early. Many counters leave at this stage.
2. **Flat-bet request.** The casino allows you to keep playing but only at a single bet size, which removes the bet spread a counter relies on.
3. **Backoff.** A floor supervisor or security officer politely tells you that you are welcome to play any game except blackjack.
4. **Barring or 86ing.** You are asked to leave and told you may not return. In many jurisdictions this is delivered as a formal trespass warning.
5. **Trespass.** Coming back after a trespass warning can itself be a criminal offence under local trespass law, even though the original counting was legal.

### What a casino cannot do

Being barred is not the same as being detained. In the US, casino security generally has authority to hold someone only when there is reasonable suspicion of a crime. Because counting is not a crime, holding a counter against their will creates legal exposure for the casino. In the 2000s, advantage player James Grosjean brought widely reported civil claims against Las Vegas casinos and the surveillance firm Griffin Investigations after being detained; the litigation is often cited in the collapse of Griffin's business in the mid-2000s.

Casinos also cannot confiscate winnings simply for counting where counting is legal. They can decline further action. Disputes over payouts usually turn on whether something other than counting, such as a device or collusion, was alleged.

The people who manage these decisions on the floor are described in the [pit boss guide](/guides/pit-boss).`,
    },
    {
      id: "new-jersey",
      title: "New Jersey and the Uston case",
      body: `New Jersey is the best-known exception to the "casinos can bar counters" rule. Ken Uston, a well-known blackjack team player and author, challenged his exclusion from Resorts International in Atlantic City. In Uston v. Resorts International Hotel (1982), the New Jersey Supreme Court held that the casino could not exclude him simply for using a skilful strategy. The reasoning was that the state Casino Control Commission had exclusive authority to set the rules of licensed games, so individual casinos could not create their own exclusion rule for skilled play.

The practical effect was that Atlantic City casinos turned to game-level countermeasures rather than barring. The Commission allowed casinos to shuffle when they identified a counter, limit bet sizes and adjust other procedures. Counters could stay, but their edge was largely neutralised.

### Why that matters beyond New Jersey

The Uston case is still cited because it shows the two separate levers a casino has:

| Lever | Example | Legal basis |
| --- | --- | --- |
| Exclude the player | Backoff, barring, trespass | Private property rights (varies by jurisdiction) |
| Change the game | Earlier shuffles, bet limits, CSMs | Game rules approved by the regulator |

In Nevada, casinos use both. In New Jersey, the first lever is restricted for counting, so the second does the work.

Uston's career, his team play and his legal fights are covered in more detail on the [Ken Uston page](/guides/ken-uston). Rules differ elsewhere, and this page is not legal advice; check the law and gaming regulations where you play.`,
    },
    {
      id: "countermeasures",
      title: "Game countermeasures that make counting pointless",
      body: `Most of the time, casinos do not need to identify a counter at all. They choose rules and procedures that shrink the counter's edge for everyone.

### Shuffle and penetration

Counting works because information builds up as the shoe is dealt. Penetration is how much of the shoe is dealt before the reshuffle. Cutting off two decks of six (about 67% penetration) instead of one (about 83%) cuts the number of high-count hands a counter sees. **Preferential shuffling**, reshuffling when the count turns favourable, removes the good hands entirely.

### Continuous shuffling machines

A continuous shuffling machine (CSM) returns discards to the machine after every round or two. The shoe never gets deep enough for a count to become useful. Against a CSM, counting is effectively worthless.

### Rules that raise the base edge

- **6:5 blackjack payouts** instead of 3:2 add about 1.4 percentage points to the house edge, more than a typical counter's edge.
- **Hitting soft 17** and restrictions on doubling or splitting add smaller amounts.
- More decks slightly increase the house edge and spread out useful counts; the [how many decks guide](/guides/how-many-decks-blackjack) has the numbers.

### Bet and entry limits

**No mid-shoe entry** signs stop players from jumping in when a table's count is high. Table maximums and bet-spread limits narrow the range between a counter's small and large bets.

### Surveillance and databases

Surveillance teams watch bet sizing against the count and track players across visits. Facial recognition and shared databases of suspected advantage players are used in some markets. More on how that works is in the [casino surveillance guide](/guides/casino-surveillance), and the full rule set that countermeasures modify is on the [blackjack rules page](/guides/blackjack-rules). The whole cluster sits in the [blackjack topic hub](/guides/topics/blackjack).`,
    },
    {
      id: "online",
      title: "Online blackjack and counting",
      body: `Counting online is not a crime in itself, but it is mostly pointless and often against the terms.

- **RNG blackjack** reshuffles a virtual deck every hand. There is nothing to count, because each hand starts from a full deck.
- **Live dealer blackjack** is dealt from a physical shoe on camera. Many studios cut the shoe early, so penetration is shallow and counts rarely become large. Terms of service also commonly ban software that tracks cards, and breaching them can lead to account closure or voided winnings.
- **Bot and assistant software** is the clearest risk. Using an automated tool may break a site's terms and, in some jurisdictions, may fall under cheating or computer-misuse laws.

In other words, the legal question online is usually a contractual one: what did you agree to when you opened the account? Read the terms before assuming that something legal in a land-based casino is allowed on a website. Checking whether an online game is fair in the first place is a separate question, covered in [are online casinos rigged](/guides/are-online-casinos-rigged).`,
    },
    {
      id: "pvp",
      title: "No shoe to count on PVPspinArena",
      body: `PVPspinArena is a player-vs-player crypto casino for adults 18+ only, with three games played in USDC or ETH on the Base network. None of them uses a deck, so there is nothing to count and no dealer deciding when to shuffle.

- [Coinflip](/coinflip) is a 50/50 between two players. The winner takes the pot minus any fee shown before entry.
- In [Jackpot](/), your win chance equals your share of the pot.
- [Roulette](/roulette) uses a 33-slot wheel: 16 Purple and 16 Silver slots pay 2x, and 1 Green pays 14x. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee, and no betting pattern changes that.

Each round comes from committed seeds, so the result is fixed before anyone can react to it, and you can verify any settled round on the [fairness page](/fairness). If play stops being fun, the [responsible gambling](/responsible-gambling) page has limits and support links.

See also [hole carding](/guides/hole-carding).`,
    },
  ],
  faqs: [
    {
      q: "Is counting cards illegal in Las Vegas?",
      a: "No. Counting cards in your head is legal in Nevada. Casinos can still refuse your action, back you off blackjack or bar you. Using a device to count is a crime under Nevada gaming law.",
    },
    {
      q: "Can you go to jail for counting cards?",
      a: "Not for mental counting in most jurisdictions. People face criminal charges for using counting devices, for cheating such as marking cards, or for trespassing after being formally barred.",
    },
    {
      q: "What happens if a casino catches you counting cards?",
      a: "Usually staff shuffle early, ask you to flat bet, or tell you that you can play anything except blackjack. Repeated or heavy counting can lead to being barred with a trespass warning.",
    },
    {
      q: "Is card counting legal in Atlantic City?",
      a: "Yes, and after Uston v. Resorts International (1982) New Jersey casinos cannot bar players simply for counting. They use countermeasures such as earlier shuffles and bet limits instead.",
    },
    {
      q: "Is using a card counting app illegal?",
      a: "Using a counting app or any device at a live table is a crime in Nevada and many other gaming jurisdictions. Practising with an app at home is fine.",
    },
  ],
  sources: [
    {
      label: "Nevada Revised Statutes Chapter 465: Crimes and liabilities concerning gaming",
      url: "https://www.leg.state.nv.us/nrs/nrs-465.html",
    },
    { label: "Wikipedia: Card counting", url: "https://en.wikipedia.org/wiki/Card_counting" },
    {
      label: "UK Supreme Court: Ivey v Genting Casinos (UK) Ltd",
      url: "https://www.supremecourt.uk/cases/uksc-2016-0213.html",
    },
  ],
  related: [
    "card-counting",
    "blackjack-rules",
    "how-many-decks-blackjack",
    "ken-uston",
    "mit-blackjack-team",
    "casino-surveillance",
    "hole-carding",
  ],
  updated: "2026-09-27",
};

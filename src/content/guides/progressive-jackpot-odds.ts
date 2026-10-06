import type { Guide } from "./types";

export const guide: Guide = {
  slug: "progressive-jackpot-odds",
  cluster: "Games & odds",
  keyword: "progressive jackpot odds",
  secondary: [
    "progressive jackpot",
    "jackpot odds",
    "lottery jackpot odds",
    "mega jackpot probability",
  ],
  title: "Progressive Jackpot Odds: Why Jackpots Are Long Shots",
  description:
    "Progressive jackpot odds: how the pool is funded, why the advertised prize is a long shot, and how that differs from a PvP jackpot pot.",
  h1: "Progressive jackpot odds: pool funding, long shots and PvP pots",
  answer:
    "Progressive jackpot odds are the chance of hitting a rare combination that pays a pool funded by a skim from many other bets. The advertised prize looks like a pot you could share. It is not: you cannot see your probability from your stake, and the hit is often in the millions-to-one range. A PvP jackpot pot is the opposite product — a finite pile of player stakes and a chance equal to your share.",
  facts: [
    "A progressive pool grows because each qualifying bet contributes a small percentage to the meter.",
    "The jackpot combination is usually a specific weighted symbol set; probabilities of 1 in several million are common on networked slots.",
    "Expected value of the jackpot component is prize times hit probability, not the prize itself.",
    "Must-hit-by and mystery progressives still hide the true draw probability inside the operator’s model.",
    "A PvP jackpot on PVPspinArena is a player pot; your chance is stake divided by pot, not a hidden reel weight.",
  ],
  sections: [
    {
      id: "funding",
      title: "How a progressive pool is funded",
      body: `A progressive is an accounting trick with a marketing screen. Every qualifying spin or ticket drops a slice — often a fraction of a percent of stake — into a pool. The pool is displayed as a rising cash figure. When the rare event hits, that figure is paid (sometimes minus taxes, caps or shared-tier rules) and the meter resets to a seed amount.

### Where the slice comes from

The slice is not free RTP. The base game is built a little leaner, or a dedicated jackpot symbol is given a tiny virtual-strip weight, or both. Players who never hit the jackpot paid for the screenshots of the one who did.

### Local versus networked

- **Local.** One machine or one site instance feeds one meter. The pool grows slower and the hit rate, while still rare, is the rate of that one model.
- **Networked.** Thousands of terminals feed one meter. The prize can look lottery-sized because the skim has a huge base. Your personal chance per spin does not improve; you just watch a larger number.

Our [slot machine odds guide](/guides/slot-machine-odds) is the right parent: this is a slot (or sometimes a table side-bet) with an extra, extremely skewed, payline.`,
    },
    {
      id: "long-shot",
      title: "Why the advertised prize is a long shot",
      body: `Price the jackpot as a lottery ticket that happens to sit on a reel.

Expected value of the jackpot piece = advertised prize × P(hit).

### Worked example

A networked slot advertises $8,000,000. Independent estimates and studio sheets for similar titles often sit around 1 in 10 million to 1 in 50 million per qualifying spin.

| Hit probability | Prize | EV of jackpot piece per $1 qualifying spin |
| --- | --- | --- |
| 1 in 5,000,000 | $8,000,000 | $1.60 |
| 1 in 10,000,000 | $8,000,000 | $0.80 |
| 1 in 25,000,000 | $8,000,000 | $0.32 |
| 1 in 50,000,000 | $8,000,000 | $0.16 |

If the jackpot EV is $0.32, that is 32% of one dollar — but only that component, and only if your stake qualifies. The rest of the paytable must then be thin enough that total RTP still sits at, say, 88% to 94%, which is common on heavy progressive titles. You are not “almost even” because the meter is large. You are buying a cheap-looking lottery inside a slot.

### Must-hit-by meters

Some mystery progressives guarantee a hit before a ceiling. That raises P(hit) as the meter approaches the cap. It can make the jackpot component +EV for a short window — in theory — if you know the ceiling, the current value, the qualifying bet and the hidden hazard rate. You almost never know the hazard rate. Treat “must hit by” as a marketing shape, not as a priced edge, unless the operator publishes the function.

Lottery-scale odds belong in the same mental bin as a state jackpot: entertainment with a brutal mean. Our [house edge guide](/guides/house-edge) still applies to the spin as a whole.`,
    },
    {
      id: "vs-pvp",
      title: "Progressive meters versus a PvP pot",
      body: `The word jackpot is doing too much work.

### Progressive (house-banked)

- Pool is a skim from the house’s game, plus a seed.
- Your chance is a hidden symbol weight or mystery draw.
- Other players do not take the other side of your spin; the house does.
- You cannot compute P(win) from “I put in $20 of the $8m”.
- Hitting does not require the meter to equal a fair parimutuel.

### PvP jackpot (PVPspinArena)

- Pool is the stakes sitting in this round.
- Your chance equals your stake divided by the pot.
- Other players are the bank.
- The house take is a fee, default 0% here.
- You can write the probability before the draw.

That PvP product is [crypto jackpot](/guides/crypto-jackpot). You can watch it on [Jackpot](/). A $20 ticket in a $200 pot is 10%, not 1 in 10 million. Different sport.

### Why the confusion is profitable

A rising meter feels like a pot you are “in”. You are in a queue for a rare RNG event. The feeling is the product. The [games and odds topic](/guides/topics/games-and-odds) keeps the two piles in separate guides for this reason.

Shared-win and community-jackpot formats, where a hit is split among recent players, change the prize in “prize × p” without telling you p. A $2 million headline that becomes $400,000 after splits is a different EV. Read whether the meter is winner-take-all. If the rules are a paragraph of exceptions, you cannot finish the multiplication, and a number you cannot finish is not a reason to raise the stake.`,
    },
    {
      id: "crypto",
      title: "Crypto lobbies and “mega” badges",
      body: `[Crypto slots](/guides/crypto-slots) inherit the same progressive math as fiat studios. Paying the spin in bitcoin does not thicken the symbol weight. A “provably fair jackpot” badge that does not publish the hit function is a badge.

If a site runs a site-wide progressive across many titles, ask:

1. What percentage of each bet is skimmed?
2. What event triggers the hit — a symbol, a mystery RNG, a must-hit-by?
3. Is that event hashed and replayable?
4. Does your stake size qualify, or are you feeding the meter for whales?

If those answers are missing, you cannot complete an expected-value sentence. Skip the badge.`,
    },
    {
      id: "practical",
      title: "How to treat a long shot if you still play one",
      body: `This is not a method for beating a progressive. There is no such method from the outside without the strips or the mystery function.

- Decide a spin budget that you can lose when the jackpot does not arrive — which is the usual case.
- Do not raise stakes because the meter “looks ready” unless a published must-hit function actually says so.
- Do not confuse a seed reset after someone else hits with a hotter machine.
- Compare the experience with a PvP pot where the chance is on the screen.

If the chase is the point, that is a [responsible gambling](/responsible-gambling) conversation, not an odds conversation. Long-shot meters are built to be chased.

Write a spin cap that assumes the jackpot will not hit, because that is the default outcome even on a “hot” week for the network. If the only reason the stake is at max is the qualifier, you are paying extra base-game edge for a ticket whose probability you still cannot write. Compare that, once, with putting the same $20 into a [Jackpot](/) round you can price as 20 / pot. The comparison is the lesson. You do not need to take either bet to learn it.`,
    },
    {
      id: "not-here",
      title: "What you will find on PVPspinArena instead",
      body: `There is no progressive reel and no networked meter. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/guides/crypto-jackpot) — a pot of player stakes, chance = share.
- [Coinflip](/coinflip) — two players, 50/50.
- [Roulette](/roulette) — 33 slots, 16 Purple, 16 Silver, 1 Green, no hidden jackpot strip.
- [Fairness](/fairness) — verify the committed result.

If you came here because a lobby tile said “$4.2m jackpot”, use this page to price that tile as a long shot, then look at a pot whose probability you can write as a fraction.`,
    },
    {
      id: "lottery",
      title: "Lottery-scale numbers and multi-tier meters",
      body: `Networked slot jackpots sit next to lotteries in probability, not next to a table pot.

### Worked lottery comparison

A 6/49 style lotto is on the order of 1 in 14 million for the top tier. A networked “mega” slot symbol can be similar or worse. The difference is packaging: the slot still spins a base game every second, so you can lose the jackpot hunt and also leak the base RTP in the same minute. A weekly lotto ticket applies its edge once.

### Mini / major / mega

Many titles split the skim into several meters. The mini hits more often and pays a small pool; the mega almost never hits and pays the billboard. Marketing shows the mega. The RTP sheet, if you can get it, assigns most of the jackpot-component return to the minis. Hitting a mini is not evidence that the mega is “close”. Different symbols, different weights.

### Seed amounts

After a hit the meter jumps back to a seed, sometimes a few thousand dollars on a mega that just paid millions. The jackpot EV collapses at reset because the prize in “prize × p” just shrank while p stayed the same. Players who “jump on a fresh meter” have it backwards unless p rises at reset, which it does not on a fixed-symbol progressive.

### Worked $2 qualifier

A game that only qualifies at $2 max bet doubles your leak versus a $1 spin if you were only raising the stake to chase the meter. If P(hit) does not improve enough to cover the extra dollar of edge on the base game, the qualifier is a tax. Read the bet-size rule before you slide to max.

A PvP pot never asks you to oversize a stake to “qualify”. Your $2 in a $50 pot is 4% at any table minimum. Keep that contrast in mind when a lobby tile flashes eight digits. If the qualifier is “max bet only” and max is $20, you also multiplied every non-jackpot spin’s edge by twenty relative to a $1 habit. That is the usual way a long shot becomes an expensive evening without ever printing the mega.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Progressive jackpot odds are prize times a tiny hidden probability, funded by a skim off many losing bets. Networked meters look like lottery jackpots because they are: huge base, rare hit, thin leftover RTP on the base game. Must-hit-by and mystery formats can change the hazard rate without showing it.

A PvP jackpot pot is a different object. On PVPspinArena your chance is your share of a live pile. Do not import progressive folklore onto that pile, and do not treat an $8m slot meter as a 10% ticket. If a friend shows you a meter screenshot, ask for p, not for the headline. Without p there is no odds sentence, only a poster.`,
    },
  ],
  faqs: [
    {
      q: "What are typical progressive jackpot odds?",
      a: "Networked slot progressives often sit in the millions-to-one per qualifying spin. The exact figure is a studio secret unless the strips or the mystery function are published.",
    },
    {
      q: "How is a progressive jackpot funded?",
      a: "A percentage of each qualifying bet is added to a pool, which starts from a seed after a hit. That skim is taken from the game’s overall return.",
    },
    {
      q: "Is a huge meter +EV?",
      a: "Only if prize × hit probability, plus the rest of the paytable, exceeds 1. You rarely know the hit probability, so a large number on the screen is not proof of a bargain.",
    },
    {
      q: "How is a PvP jackpot different?",
      a: "A PvP jackpot is a pot of player stakes. Your win chance is your stake divided by the pot. There is no hidden million-to-one reel weight.",
    },
    {
      q: "Does PVPspinArena have a progressive jackpot?",
      a: "No. Jackpot here is a player pot each round. There are no networked slot meters. The other live games are Coinflip and Roulette.",
    },
    {
      q: "Do must-hit-by progressives have better odds?",
      a: "The hit becomes more likely as the meter nears the cap, but without the hazard function you cannot price it. Treat the ceiling as a bound, not as a known edge.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Progressive jackpot",
      url: "https://en.wikipedia.org/wiki/Progressive_jackpot",
    },
    { label: "Wikipedia: Slot machine", url: "https://en.wikipedia.org/wiki/Slot_machine" },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
  ],
  related: [
    "crypto-jackpot",
    "rtp-explained",
    "rtp-calculator",
    "expected-value-gambling",
    "variance-in-gambling",
  ],
  updated: "2026-09-26",
};

import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-roulette",
  cluster: "CS:GO heritage",
  keyword: "cs2 roulette",
  secondary: ["csgo roulette", "cs2 roulette sites", "crypto roulette", "roulette colors"],
  title: "CS2 Roulette Explained: Colours, Payouts and Odds",
  description:
    "How CS2 roulette works: the colour wheel from the CS:GO era, payouts like 2x and 14x, real odds per colour, and how to verify each spin is provably fair.",
  h1: "CS2 roulette explained: colours, payouts and odds",
  answer:
    "CS2 roulette is a colour-based wheel game that grew out of CS:GO skin sites. Instead of numbers, you bet on colours: two common colours pay 2x and a single rare slot pays 14x. Everyone bets on the same spin, and on provably fair sites the result is committed before the round so you can check it afterwards.",
  facts: [
    "CS-style roulette uses colours, not the 37 or 38 numbers of casino roulette.",
    "PVPspinArena's wheel has 15 slots: 7 Purple (2x), 7 Silver (2x) and 1 Green (14x).",
    "Each colour's chance is its slot count divided by 15: Purple and Silver 46.7%, Green 6.7%.",
    "Rounds run continuously; a new spin starts about every few seconds whether or not anyone bets.",
    "Each result is computed with HMAC-SHA256 from a server seed whose hash is shown before the spin.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What is CS2 roulette?",
      body: `CS2 roulette, also called CS:GO roulette, is a simplified wheel game made popular by skin gambling sites in the CS:GO era. It borrows the idea of a spinning wheel from casino roulette but throws away most of the complexity.

Instead of betting on numbers, dozens or odd and even, players pick a colour. Most slots on the wheel are split between two main colours, and there is usually one special slot, often green, that pays much more. The whole round takes a few seconds: a short betting window, a spin, a result and the next round.

The format became a staple on Counter-Strike community sites because it was quick, social and easy to understand. Everyone sees the same spin at the same time, which turns each round into a shared moment in chat.

When Counter-Strike 2 replaced CS:GO in 2023, the name changed but the game did not. Many sites now use crypto for stakes instead of skins. PVPspinArena runs this style of roulette with dollar balances funded in USDC or ETH, alongside its [crypto jackpot](/guides/crypto-jackpot) and [coinflip](/guides/csgo-coinflip) games.`,
    },
    {
      id: "wheel",
      title: "The wheel: colours and payouts",
      body: `Every CS-style roulette site sets its own wheel, so always check the layout before betting. The layout decides both the payouts and the true odds.

### PVPspinArena's wheel

PVPspinArena's wheel has 15 slots:

- **Purple**: 7 slots, pays 2x your stake.
- **Silver**: 7 slots, pays 2x your stake.
- **Green**: 1 slot, pays 14x your stake.

A "2x" payout means a $1 bet returns $2 in total: your $1 back plus $1 profit. A "14x" payout means a $1 bet returns $14 in total.

### Other common layouts

Older CS:GO sites often used red and black instead of purple and silver, and some used 15 slots with one green, similar to this layout. Some sites add extra colours or bonus slots with higher payouts. Whatever the layout, you can always work out the odds by counting slots.

Our [roulette colours guide](/guides/roulette-colors) goes deeper into how different sites arrange their wheels. You can see the live wheel and recent results on the [Roulette page](/roulette).`,
    },
    {
      id: "odds",
      title: "CS2 roulette odds and house edge",
      body: `The chance of any colour is the number of its slots divided by the total number of slots. On a 15-slot wheel:

- **Purple**: 7 ÷ 15 = 46.67%
- **Silver**: 7 ÷ 15 = 46.67%
- **Green**: 1 ÷ 15 = 6.67%

### Expected return per $1 bet

Multiply the chance of winning by the total payout:

- **Purple or Silver**: 0.4667 × $2 = $0.933. You get back about 93.3 cents per dollar on average.
- **Green**: 0.0667 × $14 = $0.933. The same 93.3 cents.

That gap of about 6.7% is the house edge: the part of each bet the game keeps on average over many spins. Notice that every colour has the same expected return. Green is not a better or worse bet in the long run; it is just more volatile, with rare big wins and long gaps between them.

### Comparison with casino roulette

European roulette with a single zero has a house edge of about 2.7%. So colour roulette is simpler but, with this layout, more expensive per bet. That is useful to know before you decide how much to play. Our [house edge guide](/guides/house-edge) explains the idea across different games.`,
    },
    {
      id: "round",
      title: "How a round works",
      body: `CS-style roulette runs in fixed, repeating rounds. On PVPspinArena the cycle keeps going continuously, whether or not anyone is betting, so there is always a round open or spinning.

1. **Betting window.** The round is open. You choose a colour and a stake. You can place bets on more than one colour if you want.
2. **Bets locked.** Just before the spin, betting closes. No new bets or changes are accepted.
3. **Spin.** The wheel spins for about seven seconds and stops on the result that was already computed from the committed seed.
4. **Settlement.** Winning bets are paid at the colour's multiplier. Losing bets are kept.
5. **Next round.** A new round opens with a new committed seed.

### Why the result is decided before the spin

The animation is just a display. The actual result comes from the fairness calculation, which uses a server seed whose hash was shown before betting closed. That is what makes it possible to check each spin afterwards.

### Betting on several colours

Betting on Purple and Silver together does not create profit: one of them wins 2x and the other loses, so you roughly break even on those unless Green lands, in which case both lose. Covering colours changes how the results feel, not the maths.`,
    },
    {
      id: "fairness",
      title: "How provably fair roulette works",
      body: `On a provably fair roulette site, every spin can be checked by anyone. PVPspinArena uses the same approach as its Jackpot draw.

### Commit

Each round starts with a random 32-byte server seed. The site publishes its SHA-256 hash before betting closes. This hash commits the site to the seed without revealing it.

### Compute

When the round is drawn, the result is calculated as:

- message = \`PVPCasino:roulette:v1:\` + round number + \`:\` + draw version + \`:\` + counter
- h = HMAC-SHA256(key = server seed, message)
- Take the first 8 bytes of h as a number r.
- If r falls in an unusable remainder range, increase the counter and try again. This step, called rejection sampling, makes sure every slot is exactly equally likely.
- Slot = r mod 15. The colour is the colour of that slot.

### Reveal

After the spin, the server seed is published. Anyone can hash it and confirm it matches the commitment, then repeat the calculation and get the same slot.

This is explained in more depth in our [provably fair casino guide](/guides/provably-fair-casino). The future [provably fair roulette guide](/guides/provably-fair-roulette) will cover edge cases in detail.`,
    },
    {
      id: "verify",
      title: "How to verify a roulette spin",
      body: `You can check any finished PVPspinArena roulette round in under a minute.

1. **Find the round number.** It is shown in the recent results strip on the Roulette page, for example #389.
2. **Open Fairness.** Go to the [Fairness page](/fairness) and choose the Roulette tab.
3. **Enter the round.** Type the number, with or without the # symbol.
4. **Review the checks.** Your browser loads the revealed seed and the commitment, hashes the seed and compares the two.
5. **Recompute the slot.** Your browser runs the HMAC-SHA256 calculation with rejection sampling and shows the slot and colour.
6. **Compare.** The colour must match the result that was shown when the wheel stopped.

The calculation runs locally in your browser, so the site cannot fake what you see. You can also repeat it with any independent HMAC-SHA256 tool, as explained in our [provably fair calculator guide](/guides/provably-fair-calculator).`,
    },
    {
      id: "strategies",
      title: "Do roulette strategies work?",
      body: `Many players look for a system that beats CS2 roulette. None of them change the odds.

### Waiting for Green

A common idea is to wait until Green has not appeared for a while and then bet on it. But each spin is independent. The chance of Green on the next spin is 6.67% whether it landed one round ago or fifty rounds ago. Long gaps are normal: the chance of no Green in 30 spins is about 12.6%.

### Doubling after a loss

The Martingale system doubles the stake after every loss on Purple or Silver so one win recovers everything. In practice, a run of losses quickly needs stakes far larger than your budget. With a 53.3% chance of losing each spin, eight losses in a row happens around once in every 150 attempts, and at that point a $1 starting bet has grown to $256.

### What actually helps

- Choose a stake size that fits your session budget.
- Decide in advance how many rounds you will play.
- Accept the house edge as the price of the entertainment.
- Stop when your session limit is reached.

Our [gambling budget guide](/guides/gambling-budget) shows how to set those limits.`,
    },
    {
      id: "choosing",
      title: "Choosing a CS2 roulette site",
      body: `If you are comparing CS2 roulette sites, a few checks tell you a lot.

- **Published wheel layout.** You should be able to count slots and work out the odds yourself.
- **Provably fair with a real verifier.** Look for a seed commitment before each round and a way to check results after, ideally in your browser.
- **Clear fees and house edge.** You should know what each bet costs on average.
- **Transparent payments.** For crypto sites, check the supported network, confirmation times and withdrawal limits.
- **Age and location rules.** A responsible site asks you to confirm you are of legal age and allowed to gamble where you live.
- **Responsible play tools and information.** Look for limit guidance and links to support services.

Avoid sites that promise guaranteed wins, sell "predictors" or hide how results are produced. A predictor cannot work on a provably fair wheel, because the seed is secret until after the spin.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `CS2 roulette is a fast colour wheel inherited from the CS:GO skin era. On PVPspinArena's 15-slot wheel, Purple and Silver each cover 7 slots and pay 2x, while Green covers 1 slot and pays 14x.

Every colour has the same expected return of about 93.3 cents per dollar, so the house edge is around 6.7% whichever colour you pick. Green is simply more volatile. Streaks and gaps are normal and no betting system changes the odds of the next spin.

Each round's seed is committed with SHA-256 before betting closes, and the slot is computed with HMAC-SHA256 and rejection sampling. You can verify any finished round on the Fairness page. Play with a fixed budget and treat each spin as entertainment.`,
    },
  ],
  faqs: [
    {
      q: "What are the odds of Green in CS2 roulette?",
      a: "On a 15-slot wheel with one Green slot, the chance is 1 in 15, or about 6.67% per spin. Previous spins do not change this.",
    },
    {
      q: "Which colour is the best bet?",
      a: "On PVPspinArena's wheel, all colours have the same expected return of about 93.3%. Purple and Silver win more often with smaller payouts; Green wins rarely but pays 14x.",
    },
    {
      q: "Is CS2 roulette the same as casino roulette?",
      a: "No. Casino roulette uses 37 or 38 numbered pockets and many bet types. CS2 roulette uses a small colour wheel with only a few bets and different payouts.",
    },
    {
      q: "Can a roulette predictor work?",
      a: "Not on a provably fair site. The server seed is secret until after the spin, and HMAC-SHA256 output cannot be predicted without it.",
    },
    {
      q: "How do I check a PVPspinArena roulette result?",
      a: "Open the Roulette tab on the Fairness page, enter the round number, and your browser will verify the seed commitment and recompute the slot.",
    },
  ],
  sources: [
    { label: "RFC 2104: HMAC", url: "https://www.rfc-editor.org/rfc/rfc2104" },
    { label: "NIST FIPS 180-4: Secure Hash Standard", url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
    { label: "Wikipedia: Roulette", url: "https://en.wikipedia.org/wiki/Roulette" },
  ],
  related: ["csgo-coinflip", "crypto-jackpot", "provably-fair-casino"],
  updated: "2026-09-25",
};

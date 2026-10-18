import type { Guide } from "./types";

export const guide: Guide = {
  slug: "march-madness-betting",
  cluster: "Sports betting",
  keyword: "march madness betting",
  secondary: ["NCAA tournament odds", "seed upset history", "bracket versus sportsbook", "college basketball futures"],
  title: "March Madness Betting: Seed Stats and Smart Bet Types",
  description:
    "March Madness betting guide: seed-by-seed upset history, spreads vs moneylines, futures, live betting tips and how bracket pools differ from sportsbooks.",
  h1: "March Madness Betting: Seed Stats and Smart Bet Types",
  answer:
    "March Madness betting is wagering on the NCAA basketball tournament: spreads, moneylines, totals, futures, and live prices, plus the office bracket that is not a sportsbook at all. Seed numbers are a label, not a price. A 12-seed beats a 5-seed more often than a typical short 5-seed moneyline implies, and that sentence stays qualitative on purpose. This page will not quote a precise all-time upset rate. It explains the bet types. Adults 18+ only. Not a pick sheet.",
  facts: [
    "A seed is a bracket label. The bet is the spread, the moneyline, the total, or a future.",
    "1-versus-16 upsets are rare enough to be news. This page does not count them for you.",
    "12-seeds beat 5-seeds often enough that a very short 5-seed price can be the tax. No fake percentage here.",
    "A spread and a moneyline on the same game cash different margins. A small win can split them.",
    "A futures ticket pays if that club wins the tournament. A pool pays the sheet you wrote.",
    "PVPspinArena does not book college basketball. Adults 18+ only.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What March Madness prices are",
      body: `March Madness betting covers a single-elimination tournament. One loss and the club's title path is over. That structure is why a first-round price and a futures price feel related and are not the same contract. The first-round ticket ends that night. The futures ticket needs five or six more wins after it.

The seed is a committee's label. It is useful as a map of the bracket. It is not the odds. A 5-seed can be a short moneyline favorite or a milder one, depending on the clubs, the injuries, and the number the book will actually sell. Read the number. The seed is the nickname beside it.

[Point spread explained](/guides/point-spread-explained) is the handicap. [Moneyline betting](/guides/moneyline-betting-explained) is who wins. [Bracket pool](/guides/bracket-pool) is the friends' sheet that scores picks by round. Those three get confused every March because the television shows one bracket and the book shows a board. They grade differently.

[Sports betting guides](/guides/topics/sports-betting) is the cluster. Adults 18+ only. This is not legal advice and not a card of sides. PVPspinArena does not post tournament lines. [Fairness](/fairness) checks Jackpot, Coinflip and Roulette. [Jackpot](/) is a pot, not a region. [Responsible gambling](/responsible-gambling) is the stop if a first-round loss becomes a live bet you cannot explain.`,
    },
    {
      id: "seeds",
      title: "Seed history without a fake percentage",
      body: `Use seeds as categories, not as a formula. The patterns people repeat are real as stories and dangerous as precise rates, because the tournament adds games every year and a memorized percent goes stale. This page keeps the claims qualitative.

1-seeds against 16-seeds almost always win. When a 16-seed wins, it is national news. Do not treat that rarity as a number you can recite from this guide. The betting point is narrower: the moneyline on the 16-seed is a longshot ticket, and the spread on the 1-seed is a different question about the margin. A 1-seed can win the game and fail to cover. Fans call that a boring blowout that was not quite a blowout. The slip calls it a loss if you bought the favorite's handicap.

8-seeds against 9-seeds are the first-round pair that behaves most like a toss-up in the way people talk about the bracket. A short price on the 8, taken only because the seed is a smaller integer, is often just juice wearing a uniform. Compare the price with [implied probability](/guides/implied-probability). If you will not convert it, the seed is doing your thinking.

5-seeds against 12-seeds are the pair where the upset is a known script rather than a miracle. 12-seeds beat 5-seeds more often than a typical short 5-seed moneyline implies. That is as precise as this page will get. It does not mean this year's 12-seed is a bet. It means a minus-400 style price, if you ever see one on a 5-seed, should be converted before you call the seed a lock. No all-time percentage is printed here, because a precise rate this guide is not willing to freeze would be a made-up stat.

4-versus-13 and 2-versus-15 produce upsets too. They are less common conversation than 5-versus-12 and still not impossible. "Less common" is not a price. The board is the price.

| Pair | How to use the history |
| --- | --- |
| 1 vs 16 | Outright upsets are rare headlines. The spread is a separate bet on the margin |
| 8 vs 9 | Treated as close. A short 8-seed price is often the juice, not a seed edge |
| 5 vs 12 | 12-seeds win often enough to challenge a very short 5-seed moneyline. Qualitative only |
| 4 vs 13 | Upsets happen and are not the same story as 5 vs 12 |
| 2 vs 15 | Uncommon, still not a lock. Read the number |`,
    },
    {
      id: "spread-vs-ml",
      title: "Spreads, moneylines, and futures",
      body: `A moneyline cashes if the club wins, by one point or by thirty. A spread cashes if the club clears a margin. In the first round those two tickets split whenever the favorite wins a tight game under the number. People who "like the 5-seed" have not said which ticket they like.

Futures are a third type. A tournament-winner price pays only if that club is the champion. It does not pay for a Sweet 16 run. The decimal is long because many clubs can win the title and only one will. The book's margin is inside a field, not inside a two-team spread. Parlaying several futures does not invent a hedge. Correlated clubs in the same region can knock each other out. If you cannot say what happens when your two tickets meet, you do not understand the futures slip.

Live prices are a fourth type. They move on runs, fouls, and timeouts. The tip is procedural. Write the number you are taking and the game clock. Do not take a live spread to repair a pre-game ticket that is losing. The live number is a new contract with its own juice. Latency between the arena and your screen is part of the product. If the price looks generous, assume someone else's screen is ahead of yours until you know otherwise.

Totals exist too. They are not a seed stat. A defensive 8-versus-9 can sit under a total that a preview never mentioned. [Over/under betting](/guides/over-under-betting) is that market. Keep it off the upset narrative unless your note is actually about points.

None of these types is the smart one in the abstract. The smart type is the one whose settlement matches the opinion you can write in a sentence, at a price you converted. "I like the underdog" is not a sentence until it says spread or moneyline or future.`,
    },
    {
      id: "example-split",
      title: "Worked example: spread versus moneyline",
      body: `Illustration, not a pick. A 5-seed is minus 7 at minus 110 on the spread, and minus 250 on the moneyline. You are deciding between two $20 tickets, not crowning a champion.

The moneyline at minus 250 pays $20 times 100/250, which is $8, if the 5-seed wins by any score. The spread at minus 110 pays about $18.18 if the 5-seed wins by 8 or more. A win by 1 through 7 loses the spread and wins the moneyline.

- 5-seed wins by 4: moneyline +$8. Spread −$20.
- 5-seed wins by 10: moneyline +$8. Spread about +$18.18.
- 5-seed loses: both lose $20. The 12-seed upset does not pay you unless you bought the 12-seed.

The $8 versus $18.18 is the trade for needing the margin. A qualitative note that 12-seeds win "more often than a short price implies" argues with the minus 250, not automatically with the minus 7. The spread can be a bad number even when the moneyline is the one that looks arrogant, and the reverse is also possible. Convert both. Then see which sentence you believe: "they win" or "they win by 8." This page believes neither about a real club.

A hypothetical, labeled as hypothetical: if you thought the 5-seed won 70% of the time and covered 7 only 50% of the time, the moneyline's implied 250/350, about 71.4%, would be a different argument from the spread's 52.4% break-even at minus 110. You would still subtract the fact that 70 and 50 were your inventions for the example. Do not promote the hypothetical into a seed law.`,
    },
    {
      id: "example-pool",
      title: "Worked example: a pool sheet versus a future",
      body: `Second illustration. Two ways to spend $20 on the same tournament.

A sportsbook future at plus 800 on one club pays $160 profit if that club wins the title, and loses the $20 otherwise. A round of 32 exit pays $0. The book does not care that your club was a clever pick. The contract is the championship.

A friends' pool can use any sheet. Here is a hypothetical scoring rule, not an official NCAA table: 1 point in the first round, then double each round, so a correct champion is worth much more than a correct 12-over-5. Your $20 buys an entry into a pot with other entries. You can win the pot without a correct champion if the sheet pays earlier rounds and your card is unique enough. You can also finish last with a correct final if everyone else had it too and the early rounds buried you. Uniqueness matters in a pool. It does not matter on a futures ticket, which pays the posted price even if the whole country held it, subject only to the book's limit.

| Product | What $20 buys in this illustration |
| --- | --- |
| Future at +800 | $160 profit only if that club is champion. Otherwise −$20 |
| Pool entry | A share of the pot under your written sheet, not under the book's price |
| First-round moneyline | One game. Done that night. No trophy points |

[Bracket pool](/guides/bracket-pool) is where the sheet lives. Do not ask a futures price to behave like office points, and do not ask the office to pay plus 800. People who copy a sportsbook chalk bracket into a big pool are often buying the same card as the room. People who click a long future because the pool rewarded chaos are buying a championship they may not have priced. Name the product before you spend the $20.`,
    },
    {
      id: "checklist",
      title: "Checklist and live-betting tips",
      body: `One ticket type per line in your notes.

- The slip says spread, moneyline, total, or future. You did not say "the 5-seed" and stop.
- You converted the American price. The seed is not the implied percent.
- You did not paste an all-time upset percentage you cannot source. Qualitative history is enough.
- A pool entry and a futures bet are not logged as the same result.
- Live bets include the clock and the new price. They do not "fix" the pre-game stake.
- If the screen lags the arena, you skip the price that looks kind.
- You are 18+. The stake fits a limit. A lost first round is not a deposit trigger.

Live tips, kept short: fewer clicks after a bad beat, no parlay built from four live underdogs to get even, and no assumption that a timeout price is the pre-game number with a discount. The book repriced the game. You are late or you are early. Assume late until the clock on your screen matches the hall.`,
    },
    {
      id: "not-a-book",
      title: "A bracket on this site is not for sale",
      body: `PVPspinArena will not book a region, a 12-seed, or a championship future. There is no spread on a college game here. Jackpot, Coinflip and Roulette settle without a tournament clock. [Fairness](/fairness) verifies a reveal. It does not verify a buzzer beater.

March Madness betting, if you do it, belongs at a book you are allowed to use or in a pool whose sheet you can read. Adults 18+ only. When the history is clear and you still cannot name the contract, do not stake. The seed will still be there tomorrow, until that club loses.`,
    },
  ],
  faqs: [
    {
      q: "How should seed history affect a bet?",
      a: "Use it as a category, not as a percentage this page will invent. 16-over-1 results are rare headlines. 8-versus-9 games are treated as close. 12-seeds beat 5-seeds more often than a typical short 5-seed moneyline implies. That is qualitative. Convert the actual price. A seed is not an implied probability, and it is not a pick.",
    },
    {
      q: "Is the spread the same as the moneyline in March?",
      a: "No. The moneyline pays if the team wins by any margin. The spread pays if it clears the number. A 5-seed can win by four, cash the moneyline, and lose a minus 7. Futures are a third contract: the club must win the tournament, not the first round. Say which ticket is on the slip before you stake.",
    },
    {
      q: "How is a bracket pool different from a sportsbook?",
      a: "A pool pays the scoring sheet you agreed to, often with more points in later rounds, and uniqueness can matter. A sportsbook future pays the posted odds if that club wins the title, even if everyone else bet it. A first-round ticket ends that night. Do not expect office points from a book, or a book's plus-money from the office pot.",
    },
    {
      q: "What is a sensible live-betting habit?",
      a: "Treat the live number as a new bet. Write the price and the clock. Expect your screen to lag the arena. Do not buy a live spread to repair a pre-game loss. Do not fire a string of live underdogs to get even. If you cannot state the contract in one sentence, skip the timeout. Juice is still in the live price.",
    },
    {
      q: "Can I bet March Madness on PVPspinArena?",
      a: "No. This site is not a sportsbook and does not post tournament spreads, moneylines, or futures. The games are Jackpot, Coinflip and Roulette, adults 18+ only. A hashed round does not grade a seed, a bracket, or a buzzer beater.",
    },
  ],
  sources: [
    { label: "Wikipedia: NCAA Division I men's basketball tournament", url: "https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_basketball_tournament" },
    { label: "NCAA", url: "https://www.ncaa.com" },
    { label: "Wikipedia: Sports betting", url: "https://en.wikipedia.org/wiki/Sports_betting" },
  ],
  related: ["bracket-pool", "point-spread-explained", "moneyline-betting-explained", "over-under-betting"],
  updated: "2026-10-06",
};

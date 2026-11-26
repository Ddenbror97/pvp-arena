import type { Guide } from "./types";

export const guide: Guide = {
  slug: "march-madness-betting",
  cluster: "Sports betting",
  keyword: "march madness betting",
  secondary: [
    "NCAA tournament odds",
    "seed upset history",
    "bracket versus sportsbook",
    "college basketball futures",
  ],
  title: "March Madness Betting: Seed Stats and Smart Bet Types",
  description:
    "March Madness betting guide: seed-by-seed upset history, spreads vs moneylines, futures, live betting tips and how bracket pools differ from sportsbooks.",
  h1: "March Madness Betting: Seed Stats and Smart Bet Types",
  answer:
    "March Madness betting is wagering on the NCAA basketball tournament: spreads, moneylines, totals, futures, and live prices, plus the office bracket that is not a sportsbook at all. Seed numbers are a label, not a price. A 12-seed beats a 5-seed more often than a typical short 5-seed moneyline implies, and that sentence stays qualitative on purpose. A seed matchup’s historical upset rate depends on the tournament era and sample; it is not the current game’s probability. It explains the bet types. Adults 18+ only. Not a pick sheet.",
  facts: [
    "A seed is a bracket label. The bet is the spread, the moneyline, the total, or a future.",
    "1-versus-16 upsets are rare enough to be news. Check the exact combinations and total stake before submitting a bracket or multiple ticket.",
    "12-seeds beat 5-seeds often enough that a very short 5-seed price can be the tax. No fake percentage here.",
    "A spread and a moneyline on the same game cash different margins. A small win can split them.",
    "A futures ticket pays if that club wins the tournament. A pool pays the sheet you wrote.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What March Madness prices are",
      body: "March Madness betting covers a single-elimination tournament. One loss and the club's title path is over. That structure is why a first-round price and a futures price feel related and are not the same contract. The first-round ticket ends that night. The futures ticket needs five or six more wins after it.\n\nThe seed is a committee's label. It is useful as a map of the bracket. It is not the odds. A 5-seed can be a short moneyline favorite or a milder one, depending on the clubs, the injuries, and the number the book will actually sell. Read the number. The seed is the nickname beside it.\n\n[Point spread explained](/guides/point-spread-explained) is the handicap. [Moneyline betting](/guides/moneyline-betting-explained) is who wins. [Bracket pool](/guides/bracket-pool) is the friends' sheet that scores picks by round. Those three get confused every March because the television shows one bracket and the book shows a board. They grade differently.",
    },
    {
      id: "seeds",
      title: "Use seeding as context, not as a betting probability",
      body: "A tournament seed summarizes selection and placement; it does not give a team a fixed win or cover probability. Compare the actual matchup, available players, location, rest and accepted odds. Historical seed results need a stated tournament range and sample before they can support a numerical claim.\n\nA favorite can win and fail to cover, while an underdog can lose and cover. A lower seed’s past upsets do not establish that its current moneyline offers value. For a hypothetical -250 moneyline, break-even is 250 / 350 = 71.43%; deciding whether that price is attractive requires a current matchup estimate.",
    },
    {
      id: "spread-vs-ml",
      title: "Spreads, moneylines, and futures",
      body: 'A moneyline cashes if the club wins, by one point or by thirty. A spread cashes if the club clears a margin. In the first round those two tickets split whenever the favorite wins a tight game under the number. People who "like the 5-seed" have not said which ticket they like.\n\nFutures are a third type. A tournament-winner price pays only if that club is the champion. It does not pay for a Sweet 16 run. The decimal is long because many clubs can win the title and only one will. The book\'s margin is inside a field, not inside a two-team spread. Parlaying several futures does not invent a hedge. Correlated clubs in the same region can knock each other out. If you cannot say what happens when your two tickets meet, you do not understand the futures slip.\n\nLive prices are a fourth type. They move on runs, fouls, and timeouts. The tip is procedural. Write the number you are taking and the game clock. Do not take a live spread to repair a pre-game ticket that is losing. The live number is a new contract with its own juice. Latency between the arena and your screen is part of the product. If the price looks generous, assume someone else\'s screen is ahead of yours until you know otherwise.\n\nTotals exist too. They are not a seed stat. A defensive 8-versus-9 can sit under a total that a preview never mentioned. [Over/under betting](/guides/over-under-betting) is that market. Keep it off the upset narrative unless your note is actually about points.\n\nNone of these types is the smart one in the abstract. The smart type is the one whose settlement matches the opinion you can write in a sentence, at a price you converted. "I like the underdog" is not a sentence until it says spread or moneyline or future.',
    },
    {
      id: "example-split",
      title: "Separate the moneyline question from the margin",
      body: "At hypothetical odds of -250, a $20 stake earns $8 profit if the selected team wins. At -110 on a spread, a $20 winning stake earns about $18.18, but the team must cover that handicap. A four-point win can cash the moneyline and lose a -7 spread. Neither price can be judged from seed numbers alone.\n\n[Moneylines](/guides/moneyline-betting-explained), [point spreads](/guides/point-spread-explained) and [bracket pools](/guides/bracket-pool) have different winning requirements.",
    },
    {
      id: "example-pool",
      title: "Worked example: a pool sheet versus a future",
      body: "Second illustration. Two ways to spend $20 on the same tournament.\n\nA sportsbook future at plus 800 on one club pays $160 profit if that club wins the title, and loses the $20 otherwise. A round of 32 exit pays $0. The book does not care that your club was a clever pick. The contract is the championship.\n\nA friends' pool can use any sheet. Here is a hypothetical scoring rule, not an official NCAA table: 1 point in the first round, then double each round, so a correct champion is worth much more than a correct 12-over-5. Your $20 buys an entry into a pot with other entries. You can win the pot without a correct champion if the sheet pays earlier rounds and your card is unique enough. You can also finish last with a correct final if everyone else had it too and the early rounds buried you. Uniqueness matters in a pool. It does not matter on a futures ticket, which pays the posted price even if the whole country held it, subject only to the book's limit.\n\n| Product | What $20 buys in this illustration |\n| --- | --- |\n| Future at +800 | $160 profit only if that club is champion. Otherwise −$20 |\n| Pool entry | A share of the pot under your written sheet, not under the book's price |\n| First-round moneyline | One game. Done that night. No trophy points |\n\n[Bracket pool](/guides/bracket-pool) is where the sheet lives. Do not ask a futures price to behave like office points, and do not ask the office to pay plus 800. People who copy a sportsbook chalk bracket into a big pool are often buying the same card as the room. People who click a long future because the pool rewarded chaos are buying a championship they may not have priced. Name the product before you spend the $20.",
    },
    {
      id: "checklist",
      title: "Checklist and live-betting tips",
      body: 'One ticket type per line in your notes.\n\n- The slip says spread, moneyline, total, or future. You did not say "the 5-seed" and stop.\n- You converted the American price. The seed is not the implied percent.\n- You did not paste an all-time upset percentage you cannot source. Qualitative history is enough.\n- A pool entry and a futures bet are not logged as the same result.\n- Live bets include the clock and the new price. They do not "fix" the pre-game stake.\n- If the screen lags the arena, you skip the price that looks kind.\n- You are 18+. The stake fits a limit. A lost first round is not a deposit trigger.\n\nLive tips, kept short: fewer clicks after a bad beat, no parlay built from four live underdogs to get even, and no assumption that a timeout price is the pre-game number with a discount. The book repriced the game. You are late or you are early. Assume late until the clock on your screen matches the hall.',
    },
    {
      id: "not-a-book",
      title: "A bracket on this site is not for sale",
      body: "March Madness betting, if you do it, belongs at a book you are allowed to use or in a pool whose sheet you can read. Adults 18+ only. When the history is clear and you still cannot name the contract, do not stake. The seed will still be there tomorrow, until that club loses.\n\nExplore the [sports betting topic](/guides/topics/sports-betting) for related rules and examples.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "How should seed history affect a bet?",
      a: "Use a defined historical sample as background, then assess the actual matchup and price. A seed is not a win probability, and past upset patterns do not establish value at today’s odds.",
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
  ],
  sources: [
    {
      label: "Wikipedia: NCAA Division I men's basketball tournament",
      url: "https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_basketball_tournament",
    },
    {
      label: "NCAA",
      url: "https://www.ncaa.com",
    },
    {
      label: "Wikipedia: Sports betting",
      url: "https://en.wikipedia.org/wiki/Sports_betting",
    },
  ],
  related: [
    "bracket-pool",
    "point-spread-explained",
    "moneyline-betting-explained",
    "over-under-betting",
  ],
  updated: "2026-11-26",
};

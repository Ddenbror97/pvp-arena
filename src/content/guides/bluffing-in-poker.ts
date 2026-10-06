import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bluffing-in-poker",
  cluster: "Poker",
  keyword: "bluffing in poker",
  secondary: [
    "semi-bluff",
    "pure bluff",
    "bluff to value ratio",
    "fold equity",
  ],
  title: "Bluffing in Poker: When, How Often and Against Whom",
  description:
    "Learn bluffing in poker: semi-bluffs vs pure bluffs, bluff-to-value ratios, the best boards and opponents to bluff and how to size bluffs.",
  h1: "Bluffing in poker: frequency, price, and the opponent who folds",
  answer:
    "Bluffing in poker is betting or raising with a hand that is probably behind, so that a better hand will fold. A pure bluff has little chance to improve if called. A semi-bluff can still win when called because it has outs. The bluff has to work often enough to pay for the times you get called and lose. If the pot you win is twice the bet you risk, a 2-to-1 price, a pure bluff needs to succeed more than one time in three. That is the fold-equity formula, not a feeling. Bluff players who can fold, on boards that favor the range you are representing, and size the bet so the price matches the story. Game-theory ratios are the long-run version of the same idea.",
  facts: [
    "A pure bluff wins only when the opponent folds.",
    "A semi-bluff can also win by improving on a later card.",
    "Required success rate for a pure bluff is bet divided by pot plus bet.",
    "A pot that offers 2-to-1 on your bluff needs folds more than one-third of the time.",
    "Calling stations are the wrong audience for a bluff.",
    "Value bets and bluffs should share sizes so the size itself is not a tell.",
  ],
  sections: [
    {
      id: "kinds",
      title: "Pure bluffs and semi-bluffs",
      body: `Bluffing in poker fails in two different ways, so split the word. A pure bluff is a hand that is almost certainly behind and will not improve. You are buying the pot. If they call, you lose the bet. A semi-bluff is a draw or a weak hand with outs. You can win immediately when they fold, and you can still hit a pair, a flush, or a straight when they call. The semi-bluff is the workhorse. The pure bluff is the specialist tool on the river, when no more cards are coming.

The [Poker guides](/guides/topics/poker) hub is the index. [Poker pot odds](/guides/poker-pot-odds) is the price of a call. This page is the price of a bluff, which is the mirror. [GTO poker strategy](/guides/gto-poker-strategy) is where balanced frequencies live once the basic formula feels small. You do not need a solver to stop bluffing the calling station.

A bluff is not a lie you tell with your face. [Poker tells](/guides/poker-tells) is a separate subject and a weaker one. If your plan requires a facial expression, you do not have a plan. You have a bet size and a hand they might fold.

Worked example 1. The pot is $200 on the river. You bet $100 with a missed draw. You risk $100 to win $200. That is 2-to-1. The formula for a pure bluff is success rate greater than bet / (pot + bet), which is 100 / (200 + 100) = 1/3. You need them to fold more than one time in three. If they fold 34 percent of the time and call 66 percent, and you always lose when called, the bluff is a thin winner before rake. If they fold less than that, the bluff loses money. Fold equity is not optional. It is the whole result.`,
    },
    {
      id: "formula",
      title: "The formula, and why one-third is not a slogan",
      body: `Write it once and keep it. For a pure bluff, required fold frequency is the amount you risk divided by the amount you risk plus the pot you win. Risk is your bet. The pot you win does not include your bet, because you do not win your own chips back as profit. You win what was already there, including their earlier money.

If you bet the size of the pot, you risk P to win P. That price is 1-to-1, so a pure bluff needs folds more than half the time. If you bet half the pot, you risk half of P to win P. That is the same 2-to-1 shape as the $100 bet into a $200 pot, and the required fold rate is again one-third. A smaller bet needs fewer folds and applies less pressure. A bigger bet needs more folds. That trade is the sizing decision.

Semi-bluffs lower the bar because you sometimes win when called. Count outs honestly, and remember that a second caller makes the pure-bluff fraction harsher. Rake makes the required fold rate a little higher than the textbook fraction.

| Your bet into the pot | Price you lay yourself | Pure bluff must work more often than |
| --- | --- | --- |
| $50 into $150 | 3-to-1 | 50/200 = 25 percent |
| $100 into $200 | 2-to-1 | 100/300 = 33 percent |
| $100 into $100 | 1-to-1 | 100/200 = 50 percent |
| $150 into $100 | You risk more than the pot | 150/250 = 60 percent |`,
    },
    {
      id: "ratio",
      title: "Bluff-to-value ratios",
      body: `A single bluff is a cash question: will this opponent fold often enough. A range is a ratio question: of the hands you bet this way, how many are value and how many are bluffs. If you bet the size of the pot, a caller who is getting 2-to-1 needs to win one time in three to break even. If your betting range is two value hands for each bluff, they win one-third of the time when they call and cannot exploit you by always calling or always folding. That is the toy version of balance. [GTO poker strategy](/guides/gto-poker-strategy) adds blockers, board coverage, and the fact that real ranges are messy.

You do not need that toy ratio against a recreational player who never folds a pair. Bluff less. You do not need it against a player who folds everything but the nuts. Bluff more. The ratio is the defense against an opponent who is paying attention. The exploitative adjustment is the profit against an opponent who is not.

Pick the bluffs that block calling hands when you can, and bluff with hands that have little showdown value. Size bluffs the same way you size value. A special bluff size is a translation guide for the table.

| Opponent | Bluff | Skip the bluff |
| --- | --- | --- |
| Over-folder | Scary boards | The hand just woke up |
| Calling station | Almost never | Every pure bluff |
| Unknown player | Small semi-bluffs | Huge river bets |
| Multiway pot | Rarely | After two callers |`,
    },
    {
      id: "boards",
      title: "Boards and opponents worth a bluff",
      body: `Bluff when the story is believable. A dry ace-high board favors the preflop raiser. A bet from that player can represent the ace. A low connected board that clearly helped the caller is a worse place to fire a second barrel just because you are “being aggressive.” Aggression without the range is a donation with better posture.

The best opponent owns a folding button. Tight players fold too much on scary rivers. Fit-or-fold players fold when they miss, so a continuation bet on a dry flop prints money until they adapt. Calling stations, gamblers who came to see a showdown, and anyone who has announced they never fold a pair are the wrong audience. Believe them.

Position helps because you see the check. A check from a straightforward player on a scary card is a green light only if their check really means weakness. Some checks are traps. One trap does not end betting. It does mean you stop auto-firing.

Worked example 2. You raised preflop and the big blind called. The flop is king-seven-two rainbow. You bet half pot with a missed suited connector, a semi-bluff with two overcards and a backdoor. They call. The turn is a blank. They check. You give up. The call said they have a piece, the blank did not add a new story, and a second barrel now needs them to fold a pair. This opponent has not folded a pair all night. The formula still wants folds. You will not get them. Checking back is the bluff you did not fire, which is how the frequency stays honest.`,
    },
    {
      id: "how-often",
      title: "How often to bluff without a solver",
      body: `Count your bluffs for a session if you want the truth. Many players think they bluff constantly and actually bluff once a night, always in a giant pot, always as a pure bluff on the river. That is the expensive shape. Small semi-bluffs on dry flops, given up on bad turns, are the cheap shape.

A practical cap: if you cannot name the fold you are targeting, you are not bluffing. You are betting because the silence felt awkward. Awkward is not a frequency. Against unknown players, bluff less than the balanced toy ratio until you see a fold. Against nits who over-fold, bluff more and value-bet thinner, because they also call too little with medium hands. Against stations, delete the pure bluffs and value-bet every pair that can get called by worse.

Rake and stack depth change the price. Once the bet is most of the stack, the decision is push or give up. Use the chips actually at risk.`,
    },
    {
      id: "checklist",
      title: "A checklist before the bluff goes in",
      body: `Read it on the river especially, where the pure bluff has no outs left.

- Name the better hands you want to fold. If you cannot, check.
- Compute risk and pot. For a 2-to-1 pot, you need folds more than one-third of the time if the bluff has no equity.
- If it is a semi-bluff, say how often you improve when called, and do not double-count.
- Check the opponent. Stations do not pay you for a story.
- Check the board. Your range should contain the hand you are pretending to have.
- Use a size you also use for value.

Then bet once, with a plan for the next street. A bluff without a turn plan becomes two bluffs, and the second one is usually the loser. Giving up is part of bluffing in poker. Players who never give up are not aggressive. They are the customers.`,
    },
    {
      id: "contrast",
      title: "What bluffing cannot do",
      body: `A bluff does not change the cards. It changes whether the cards are shown. If they call and you are behind, you lose. No story fixes that. A bluff also does not work in a game with no decision to fold. [Coinflip](/coinflip) pays the player who picked the side that landed. There is no fold equity, because there is no second action. Poker’s extra layer is the fold. That layer is profitable only when someone sometimes uses it.

Do not bluff multiway just to “take the pot away” when two players have already called a street. You need both to fold. The pure-bluff fraction gets harder as soon as a second caller exists. Semi-bluff multiway only when the price and the outs are real, which is rarer than the movies suggest.

And do not confuse a bluff with a tell war. If you want faces, read the tells page and then come back to the fraction. The fraction is what keeps the lights on. One-third is the worked answer for a 2-to-1 pot with no equity. A real opponent may simply decline to fold.`,
    },
  ],
  faqs: [
    {
      q: "When is a bluff profitable?",
      a: "A pure bluff is profitable when the opponent folds more often than the bet divided by the pot plus the bet. If you bet $100 into a $200 pot, you are laying yourself 2-to-1 and you need folds more than one-third of the time, assuming you always lose when called. A semi-bluff can succeed with fewer folds because you sometimes win the pot anyway when you improve. Rake nudges the required fold rate up. No folder, no bluff.",
    },
    {
      q: "What is the difference between a semi-bluff and a pure bluff?",
      a: "A pure bluff has almost no chance to improve if called, so the fold is the only way the bet wins. River bluffs with missed draws are the usual case. A semi-bluff still has outs, such as a flush draw or two overcards, so a call does not end the hand. Semi-bluffs are more forgiving and belong earlier in the hand. Pure bluffs need a better price or a more fold-prone opponent. Use the same sizes you use for value.",
    },
    {
      q: "What bluff-to-value ratio should I use?",
      a: "It depends on the bet size. If you bet the size of the pot, a bluff-catcher getting 2-to-1 is indifferent when about one-third of your betting range is a bluff and two-thirds is value. That toy ratio is a defense against a good opponent. Against a calling station, bluff less than the toy ratio. Against a player who over-folds, bluff more. The GTO page covers balanced ranges in more detail. Value and bluffs should share a size.",
    },
    {
      q: "Who should I bluff, and who should I stop bluffing?",
      a: "Bluff opponents who have shown they can fold pairs and missed draws, especially tight players on scary boards that favor your range. Stop bluffing opponents who call because they are curious, who announce they never fold, or who have called every barrel all night. Dry ace-high boards are friendlier to a preflop raiser’s bluff than wet boards that helped the caller. Multiway pots are worse, because more than one player must fold.",
    },
    {
      q: "How should I size a bluff?",
      a: "Choose the size from the fold rate you need and from the story you are telling, then use that same size with value hands. A smaller bet needs fewer folds and risks less. A pot-sized bet needs folds more than half the time on a pure bluff and puts maximum pressure on a medium hand. Do not use a special bluff size you never use for value. In the 2-to-1 spot, apply the one-third test first.",
    },
  ],
  sources: [
    {
      label: "World Series of Poker",
      url: "https://www.wsop.com/",
    },
    {
      label: "Pagat — public card-game rules",
      url: "https://www.pagat.com/",
    },
  ],
  related: ["poker-pot-odds", "gto-poker-strategy", "poker-tells", "poker-for-beginners"],
  updated: "2026-10-06",
};

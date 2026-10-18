import type { Guide } from "./types";

export const guide: Guide = {
  slug: "seven-card-stud",
  cluster: "Poker",
  keyword: "seven card stud",
  secondary: [
    "seven card stud rules",
    "bring-in bet",
    "stud betting streets",
    "reading exposed cards",
  ],
  title: "Seven Card Stud: Rules, Betting Rounds and Strategy",
  description:
    "How to play seven card stud: deal order, bring-in, betting streets, reading exposed cards and beginner strategy for this classic poker game.",
  h1: "Seven card stud: streets, the bring-in, and live cards",
  answer:
    "Seven card stud deals each player seven cards across five betting streets, three of them hidden and four face up, and the best five-card hand wins. Everyone posts an ante. On third street you get two down cards and one up card. The lowest up card posts a forced bring-in, and other players may call or complete to a full small bet. Fourth street adds an up card and is usually a small-bet street unless a pair is showing. Fifth and sixth streets are up cards and big bets. Seventh street is a down card and a big bet. There is no community board. Hand rankings are the ordinary ones. Beginners should fold most of third street and track which cards are dead.",
  facts: [
    "Each player ends with three hidden cards and four exposed cards.",
    "An ante is posted before any cards are dealt.",
    "The lowest up card on third street makes the bring-in.",
    "Later streets are opened by the highest hand showing.",
    "You use the best five cards out of your seven.",
    "Folded up cards are dead and should change your decisions.",
  ],
  sections: [
    {
      id: "deal",
      title: "Deal order from ante to seventh street",
      body: `Seven card stud starts with an ante from every player, small compared with the later bets and large compared with folding every hand. The dealer then gives each player two cards face down and one face up. That round is third street, because you now hold three cards. The player with the lowest up card posts the bring-in, a forced bet smaller than a full small bet. In many casino games the ace is high for this purpose, so a deuce brings it in, and a tie is broken by suit. House rules differ. Ask before the first ante.

Clockwise action follows. Players may fold, call the bring-in, or complete to a small bet. A complete reopens the action the way a raise does. When the betting is done, fourth street gives everyone still in one more up card.

There is no flop and no board. [Texas Hold’em rules](/guides/texas-holdem-rules) are a different game that shares only the hand rankings. [Poker hand rankings](/guides/poker-hand-rankings) are the five-card order you will use at the end. [History of poker](/guides/history-of-poker) is where stud’s older place in the casino story lives. This page is the deal.

The [Poker guides](/guides/topics/poker) hub is the index if you want Hold’em next. Stud rewards memory more than position nicknames.

| Street | Cards you receive | Bet size in a typical game | Who acts first |
| --- | --- | --- | --- |
| Third | 2 down, 1 up | Bring-in, then a small bet | Lowest up card |
| Fourth | 1 up | Small bet, or big if a pair shows | Highest board |
| Fifth | 1 up | Big bet | Highest board |
| Sixth | 1 up | Big bet | Highest board |
| Seventh | 1 down | Big bet | Highest board |`,
    },
    {
      id: "fourth",
      title: "Fourth street through the river",
      body: `On fourth street the player with the highest showing hand acts first and may check or bet. If any player’s exposed cards contain a pair, many rule sets let the bettor choose a small bet or a big bet. That option is the pair-on-fourth rule. It is not universal in home games. Confirm it. Fifth street deals another up card and the bet jumps to the big size for good. Sixth street deals the fourth up card. Seventh street deals one last card face down, so you hold three concealed cards and four exposed ones. A final big-bet round follows.

Do not assume no-limit. Caps on raises are a house rule. Confirm them.

At showdown you make the best five-card hand from your seven. Follow the dealer on whether a called hand must be shown.

Worked example 1. Your door card, the up card on third street, is the 4♣. A player to your left shows a 2♦. The deuce is lower, so that player owes the bring-in if ace is high. You may fold, call the bring-in, or complete. Completing with only a four and two rags in the hole is how antes get donated. Folding is allowed and usually correct.`,
    },
    {
      id: "live",
      title: "Live cards, dead cards, and why stud is a memory game",
      body: `A card you can see is information Hold’em hides on the board for everyone. In stud the information is personal. If you hold two kings and both other kings are folded face up, your pair is less likely to improve to trips, and anyone playing a king is representing a card that is dead. If your flush needs the heart that was folded on third street, the flush is dead. Beginners who stare only at their own three cards miss the actual game.

Keep a simple count. Note exposed pairs. Note when the ace of your suit is gone. Note how many cards higher than your pair are still live. You do not need a perfect fifty-two-card memory to beat a table that remembers nothing. You need to see the cards that were turned up and then folded.

The player who acts first on later streets is the one showing the highest hand. That is a disadvantage, the reverse of the button. A wired pair with a low door card can act later and still be ahead of a pretty ace that is paired with nothing. Do not fall in love with a high door card. The table can see it too, and the high card has to speak first when the bets get large.

[Coinflip](/coinflip) hides nothing and remembers nothing, because both players only have the flip. Stud is the old opposite: most of the deck becomes public one card at a time, and the player who was not watching pays for it.`,
    },
    {
      id: "third-strategy",
      title: "Beginner strategy on third street",
      body: `Fold most starting hands. The ante is small and the later bets are not. Playable starts are usually a pair, especially a pair higher than anything showing, or three high cards that can make a straight or a strong flush, or three flush cards with live ranks. A small pair with the pair buried, called a wired pair, is more attractive than a small pair split with one card showing, because the table does not know and the kickers can be chosen from live cards.

A split pair of queens is less exciting when two queens are already folded and an ace and a king are staring at you from other door cards. Your pair may be best and still have no future. A three-flush in small cards is a draw that will pay big bets to chase a hand someone else can see coming.

Completing every suited door card is the leak that funds the game. Folding most of third street is allowed. The players who continue should be able to pay fifth street.

Worked example 2. You are dealt (K♠ Q♠) K♦, so you show a king and hold a pair of kings with a spade queen. One other king appears and folds on third street. Two spades fold elsewhere. Your pair is live enough to play, and the flush is damaged. You complete or call a complete, and you stop planning a flush. If the last king then appears on fourth street in an opponent’s hand, your trips are dead and your hand is a bare pair. That is a fold on a later street, not a tragedy. You saw it.`,
    },
    {
      id: "later",
      title: "How to play the later streets",
      body: `Fourth street is where a lot of stud is decided, because the bet can jump if a pair shows and because draws either pick up a friend or they do not. If you called on third with three to a flush and fourth street misses, you are often done. If you paired your door card and the pair is higher than the boards you see, you can bet. If you paired and a higher pair is already showing, you are calling a stronger hand or you are bluffing a card the table can count. Bluffing a card that is dead is a gift.

Fifth street is the last cheap mistake. Fold draws that are not live. A made hand that is still best should bet. If their representing cards are live and you cannot beat that hand, fold.

| What you see | Lean | Why |
| --- | --- | --- |
| Your pair’s rank is folded elsewhere | Continue less often | Trips are dead |
| Opponent pairs a high door card | Give credit | The table can see the pair |
| Your flush card arrived and is live | Continue | The draw improved |
| Fourth street missed a weak draw | Fold | Big bets start next |
| You show the high pair | Bet for value | You must act first anyway |`,
    },
    {
      id: "checklist",
      title: "A checklist for a first stud session",
      body: `Read this before you post the ante, then follow it when the cards are in the air.

- Confirm the ante, the bring-in, the small bet, the big bet, and whether a pair on fourth street may bet big.
- Ask whether the ace is high or low for the bring-in.
- Look at every up card, including cards that fold.
- On third street, keep pairs and strong three-card hands, and fold the rest.
- Name whether the cards you need are live before you call a big bet.
- On fifth street, stop chasing a draw that did not improve.

Stud is tiring because the information is the product. If you cannot watch the table, do not play the game that day. The cards will not become community cards to rescue you. Each up card belongs to someone, and when they fold it belongs to the muck, which is just as useful to count.`,
    },
    {
      id: "mistakes",
      title: "Mistakes that come from playing it like Hold’em",
      body: `The first mistake is hunting a button that does not exist. Later position in stud is “my board is lower, so I act after the scare card.” That is useful, and it is not a seat you can buy by sitting to the left of a dealer. The second mistake is playing every ace door card. The ace is visible. Better hands know to proceed against it, and worse hands fold. You win a small pot or you pay a large one.

The ante is the cost of seeing three cards. It is not a ticket to fifth street. If the table deals Stud Hi-Lo, an eight-or-better low is a different game and a different starting chart. Do not use this high-only sketch unchanged. Ask which game is being dealt. Then go back to live cards. They remain the strategy, in both forms, because a dead deuce cannot make your low and a dead king cannot make your trips.`,
    },
  ],
  faqs: [
    {
      q: "How does the deal work in seven card stud?",
      a: "Everyone antes. Third street is two cards down and one up, and the lowest up card posts the bring-in. Fourth, fifth, and sixth streets each add one up card. Seventh street adds a final down card. You finish with three hidden cards and four exposed cards, and you make the best five-card poker hand. There is no shared board. Betting follows each street. Later streets are opened by the highest hand showing, not by a dealer button.",
    },
    {
      q: "What is the bring-in?",
      a: "The bring-in is a forced bet by the lowest exposed card on third street. It is smaller than a full small bet. Other players may fold, call that amount, or complete to the small bet. Casino cards often treat the ace as high for choosing the bring-in, so the deuce brings it in, with suit as a tiebreak. Home games differ. Ask before you play. A bring-in is not evidence of a strong hand.",
    },
    {
      q: "When do the bets get bigger?",
      a: "Third street uses the bring-in and the small bet. Fourth street is a small-bet round in the common structure, unless a player shows a pair and the rules allow a big bet. Fifth, sixth, and seventh streets are big-bet rounds. Many games also cap the number of raises. None of this is no-limit unless the house says so. Confirm the stakes when you sit down.",
    },
    {
      q: "What should a beginner play on third street?",
      a: "Mostly fold. Keep big pairs, especially when the other cards of that rank look live, and keep strong three-card combinations such as three high cards or three to a live flush. A small pair with dead kickers, or a low three-flush, is how players donate antes plus a complete. The ante is not a reason to see fifth street. If the cards you need are already face up in the muck, the draw is not a draw.",
    },
    {
      q: "How is seven card stud different from Texas Hold’em?",
      a: "Hold’em gives everyone the same five community cards and two hole cards. Stud gives each player a private set of seven cards, four of which the table can see, and no board at all. Position is determined by the exposed cards, not by a button that acts last every street. Hand rankings are the same best-five order. Strategy is about live and dead cards.",
    },
  ],
  sources: [
    {
      label: "Pagat — public card-game rules",
      url: "https://www.pagat.com/",
    },
    {
      label: "World Series of Poker",
      url: "https://www.wsop.com/",
    },
  ],
  related: ["poker-hand-rankings", "history-of-poker", "texas-holdem-rules", "poker-for-beginners"],
  updated: "2026-10-06",
};

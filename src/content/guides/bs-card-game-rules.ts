import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bs-card-game-rules",
  cluster: "Games of chance",
  keyword: "bs card game",
  secondary: [
    "bullshit card game",
    "cheat card game",
    "i doubt it",
    "how to play bs",
    "how to play cheat",
  ],
  title: "BS Card Game Rules: Bullshit, Cheat | PvP Spin Arena",
  description:
    "BS card game rules, also called bullshit and cheat: deal 52 cards, play face down from aces upward, and call a bluff or take the pile.",
  h1: "BS card game rules, also called bullshit and cheat",
  answer:
    "The BS card game is one game with three usual names. In the United States it is BS or bullshit. In the UK the same game is called Cheat. Some tables say I doubt it. Three to eight players use a 52-card deck, dealt out until the pack is gone. Aces are played first, then twos, then threes, and so on up to kings, then aces again. On your turn you play one to four cards face down and claim they are the rank this turn requires. Any player may call BS. If the call is right, the liar takes the pile. If the call is wrong, the caller takes the pile. The first player to empty their hand wins, provided the last play survives a call.",
  facts: [
    "One game, several names: BS, bullshit, Cheat in the UK, and I doubt it.",
    "Three to eight players. Deal the whole 52-card deck. Some hands will hold one extra card.",
    "The required rank runs ace, 2, 3, and on through king, then back to ace.",
    "You play 1 to 4 cards face down. They do not have to be the rank you announce.",
    "A correct BS call makes the player who just played pick up the pile. A wrong call makes the caller pick it up.",
    "Going out on a lie still loses if someone calls and the cards are wrong. An uncalled last play wins.",
  ],
  sections: [
    {
      id: "names",
      title: "BS, bullshit, and Cheat are the same game",
      body: `Do not hunt for a second rulebook. BS, bullshit, and Cheat are one shedding game. American tables usually say BS or bullshit when they challenge. British tables usually say Cheat. I doubt it is the same call with politer furniture. This page uses BS for the call and teaches the shared rules. It is not a poker tell game, and it is not a separate "cheat" patience.

Sit three to eight players. Two can play a thin version, but the call is obvious and the game is worse. Use one [52-card deck](/guides/52-card-deck). Jokers out. Deal every card, one at a time, face down. With five players the hands will be 11, 11, 10, 10, and 10, or whatever the count gives. A difference of one card is normal. Do not set cards aside to even the hands. The player with one extra card is not "it."

Shuffle in sight. The game is a bluff about hidden cards, so a stacked deck is the only real way to cheat at Cheat. [How to shuffle cards](/guides/how-to-shuffle-cards) is the practical bar: riffle, strip, riffle, and let someone else cut.

The first player is whoever you cut for, or the player left of the dealer. They must start with aces. BS lives in the [games of chance hub](/guides/topics/games-of-chance) because the cards you are dealt decide how often you are forced to lie. The skill is when to lie small and when to call.`,
    },
    {
      id: "turn",
      title: "The rank you must claim, and the cards you may play",
      body: `There is one discard pile, starting empty. Turns go clockwise. Each turn has a required rank, and the ranks move in order no matter what anyone actually holds.

1. First play: aces.
2. Next player: twos.
3. Then threes, fours, fives, sixes, sevens, eights, nines, tens, jacks, queens, kings.
4. After kings, the next player is on aces again.

You play one, two, three, or four cards, face down, onto the pile. You announce the count and the rank. "Two aces." "One king." You do not show the cards. They do not have to be the rank you named. If you have no cards of the required rank, you are forced to lie. If you have some, you may still lie, including by mixing real cards of that rank with other cards. A mixed play is a lie. The call is right if any card in the play is the wrong rank.

You must play at least one card. You cannot pass because the rank is inconvenient. Four is the maximum, because there are only four suits of a rank in one deck. Playing five and calling them aces is an obvious lie and an illegal count. Do not do it.

The pile stays face down. Nobody rifles through it between turns. The only time cards are turned up is a call.

After a quiet turn, the next player must claim the next rank. They do not get to choose aces again because aces would have emptied their hand. The ladder does not care about your hand. That is the whole engine of the game.

[Rummy](/guides/how-to-play-rummy) lets you save cards until they make a set. BS does not. A pair of queens is useless on a five, except as the raw material of a lie.`,
    },
    {
      id: "call",
      title: "Calling BS, and who picks up the pile",
      body: `Any player may call, not only the next player. Say "BS," "bullshit," or "cheat," matching the name you are using. Call promptly, before the next player has put cards down. A late call after two more plays is a different, messier game. Do not allow it.

Turn up only the cards just played, not the whole history, unless your call is about that play and the pile is what the liar or the caller will pick up. The whole pile moves. The older cards underneath are not re-judged.

- **The call is right.** At least one card is not the claimed rank. The player who played takes the entire pile into their hand and sorts it later.
- **The call is wrong.** Every card just played really is the claimed rank. The caller takes the entire pile.

If two people call at once, give the call to the player nearest the left of the person who played. That person is the one who will pick up the pile if the play was honest. Other shouters do not also get punished. One call, one pile.

After the pile is picked up, play continues. The player to the left of the person who was challenged claims the next rank. Example: you were challenged on sevens, whether the call was right or wrong. The player on your left now has to play eights. You do not replay sevens.

A honest four-of-a-kind is the strongest quiet play in the game, because a call cannot be right. It is also how callers get stuck with a fat pile. If you actually hold four aces on the ace turn, say "four aces" and wait. People who have been lied to all night will often call.

You may call your own teammate if you mistakenly think you have teams. There are no teams. Calling a friend who told the truth hands you the pile. The friendship is not a rule.`,
    },
    {
      id: "out",
      title: "Getting rid of the last cards",
      body: `The first player with no cards left wins, but the last play can still be called. If you put down your last two cards and call them "two nines," you are not out yet. Wait.

- If nobody calls, you win.
- If someone calls and both cards are nines, you win, and the caller still takes the pile. The pile does not matter, because the game is over.
- If someone calls and either card is not a nine, you pick the pile up, including those two cards, and the game goes on. You were not out.

Do not sweep your hand into the pile and leave the room. The call window is part of the last turn.

Hands can get huge. A player who picks up forty cards is not eliminated. They play on, one to four cards a turn, and they will be lying for a long time. That is the penalty. There is no score sheet and no second life. One deal is the game, unless you agree to play a match of several deals and count wins.

Count what has appeared only as far as memory allows. Four aces have either been played honestly, played as a lie that was not called, or are still in hands. You will not know which, because uncalled lies stay hidden inside the pile. The practical tell is easier than a count: a player with one card left, on a rank they look relaxed about, is often telling the truth, and a player who announces "four kings" while holding twelve cards is often padding. Neither tell is a fact. The cards are the fact, and only a call reveals them.

If the room is loud, point at the player you are calling so the nearest-left rule is not a second argument. Then turn the cards. Then move the pile. Then name the next rank out loud so the left-hand player does not repeat the old one.`,
    },
    {
      id: "example",
      title: "A call that is right and a call that is wrong",
      body: `Five players. It is your turn on fours. You hold no fours. You hold two jacks and a lot of low cards. You play the two jacks face down and say "two fours." That is a lie, and it is legal.

The player across calls BS. You turn the jacks up. The call is right. You take the whole pile. It was small, six cards, so the lie was cheap. Your hand grows, and the player on your left is now on fives.

Two laps later you really do hold three fives, and it is fives again. You play all three and say "three fives." The same player calls. You turn them up. They are fives. The call is wrong. That player takes the pile, which is now most of the deck, and you are down to two cards.

You need the rank ladder to hit a rank you hold, or you need one more lie that nobody calls. If the next required ranks are six, then seven, before you can act, you wait. When your turn is a six and you do not have one, you play one wrong card, not three. A thin lie is harder to love as a call, and a failed call is the only way a thin lie hurts you. A thick lie empties your hand faster and paints a target.

Suppose those last two cards are a six and a king, and your turn is sixes. Playing both and saying "two sixes" is a lie. Playing the six alone and saying "one six" is the truth, and it leaves the king. You are not out. Being almost out is how players get called. Being truthful with one card left is how they actually get out on the following lap, if the king comes around or if they risk it.

[Oh Hell](/guides/oh-hell-card-game) is the trick game if you would rather bid a number than bluff a rank. [Three-card monte](/guides/three-card-monte) is not this game. Monte is a proposition you do not win. BS is a parlor game you can win by emptying your hand.

Adults sometimes stake a small amount on the winner. That is gambling, and it is for adults only (18+, or the legal age where you live). Agree it before the deal. A call is not a side bet.`,
    },
    {
      id: "stakes",
      title: "A face-down play and a hashed coin",
      body: `BS is memory, nerve, and the deal. You will be forced to lie whenever the ladder lands on a rank you do not hold. Calling every lie is impossible, because you cannot see the cards. Calling none of them lets a liar walk out. The good callers wait for counts that cannot exist, like a fifth ace, or for a player who is one card from winning and suddenly produces three of a rank the table has already seen.

Nothing in that is a system that beats the shuffle. Four honest kings still look like a lie. Four fake kings still look like a lie. Only the flip of those cards settles the pile.

PVPspinArena does not deal this game. It runs Jackpot, [Coinflip](/coinflip) and Roulette in USDC or ETH on Base, for adults 18+ only. Coinflip is a 50/50 between two players, with no rank to claim. Roulette is a 33-slot wheel that returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee, a 7.88 percent on Purple or Silver after the win fee edge. Jackpot pays a shared pot according to your share. Seeds are committed before the round. You can check a settled round on the [fairness](/fairness) page.

If the call stops being funny and the stake starts climbing, stop. The [responsible gambling](/responsible-gambling) page has the tools. The next ace is not an apology for the last pile.

See also [president](/guides/president-card-game-rules), [crazy eights](/guides/crazy-eights-rules) and [speed](/guides/speed-card-game).`,
    },
  ],
  faqs: [
    {
      q: "Is bullshit the same as the BS card game?",
      a: "Yes. BS and bullshit are the usual American names. Cheat is the usual British name for the same game. I doubt it is another name for the same call.",
    },
    {
      q: "How do you play the BS card game?",
      a: "Deal out a 52-card deck. Players play 1 to 4 cards face down, claiming aces, then twos, then threes, and so on. Anyone may call. A true call punishes the liar. A false call punishes the caller. First to empty their hand wins.",
    },
    {
      q: "What happens if you call BS and you are wrong?",
      a: "You pick up the whole discard pile. The player you called told the truth, so every card they just played matched the rank they claimed.",
    },
    {
      q: "Can you pass in the BS card game?",
      a: "No. You must play at least one card and at most four. If you do not hold the required rank, you play other cards and claim the rank anyway.",
    },
    {
      q: "Do you win as soon as you play your last card?",
      a: "You win if nobody calls, or if a call shows the last cards were honest. If a call shows a lie, you pick up the pile and play on.",
    },
  ],
  sources: [
    { label: "Wikipedia: Cheat (game)", url: "https://en.wikipedia.org/wiki/Cheat_(game)" },
    { label: "Pagat: Cheat / I Doubt It", url: "https://www.pagat.com/beating/cheat.html" },
  ],
  related: [
    "president-card-game-rules",
    "crazy-eights-rules",
    "speed-card-game",
    "52-card-deck",
    "how-to-shuffle-cards",
  ],
  howTo: true,
  updated: "2026-09-29",
};

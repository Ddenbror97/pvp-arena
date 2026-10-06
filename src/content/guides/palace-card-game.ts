import type { Guide } from "./types";

export const guide: Guide = {
  slug: "palace-card-game",
  cluster: "Games of chance",
  keyword: "palace card game",
  secondary: [
    "shithead card game",
    "palace shithead",
    "karma card game",
    "how to play palace",
    "shed card game",
  ],
  title: "Palace Card Game Rules and the Loser | PvP Spin Arena",
  description:
    "Palace card game rules for 2 to 5 players: three down, three up, three in hand, play equal or higher, and the last player with cards loses.",
  h1: "Palace card game rules, also called shithead and karma",
  answer:
    "The palace card game is the shedding game also called Shithead, Karma, and Shed. Two to five players use a 52-card deck. Deal each player three cards face down, three face up on top of them, and three in hand. Play a card equal to or higher than the top of the pile. A common set of powers, not a universal code: a 2 may be played on anything and the next card may be anything, a 10 clears the pile, and four of a kind clears it too. If you cannot play, you pick up the pile. When your hand is empty you play the face-up cards, then the face-down cards blind. The last player holding cards loses and is the palace servant, the shithead, for the next deal.",
  facts: [
    "Two to five players is the usual table. Three to five is the best count. One 52-card deck, aces high.",
    "Each player gets three face-down cards, three face-up cards on them, and three cards in hand.",
    "You may swap hand cards with your face-up cards before the first play.",
    "Play one rank, or several cards of that same rank, equal to or higher than the pile.",
    "Common powers: 2 resets the rank, 10 burns the pile, four of a kind burns it. Tables drop these.",
    "The stock refills your hand to three cards. Face-up cards come next, then face-down cards one at a time.",
  ],
  sections: [
    {
      id: "names",
      title: "Palace, Shithead, Karma, and the deal",
      body: `Palace is one name for a backpacker shedding game. The same deal is called Shithead, Karma, Shed, and a handful of local jokes. This page uses Palace in the title and teaches one common rule set. It says when a power is usual rather than required, because the game has no single governing sheet.

Sit two to five players. Three to five is the count Wikipedia and Pagat treat as the best game. You need one [52-card deck](/guides/52-card-deck). Aces are high. Suits do not matter. Jokers stay out unless you have agreed a joker rule, which this page does not use.

Shuffle. [How to shuffle cards](/guides/how-to-shuffle-cards) matters here because the face-down row is a secret even from its owner. Then deal:

1. Three cards face down in a row in front of each player. Nobody looks.
2. Three cards face up, one on each face-down card.
3. Three cards as a hand. The player may look at these.
4. The rest of the deck is the stock, face down in the middle.

Before anyone plays, you may swap cards between your hand and your face-up row. The usual aim is to park high cards, 2s, and 10s face up for the end, and to keep low cards in hand for the start. You may not look at or swap the face-down row.

Palace is a race to be empty, in the [games of chance hub](/guides/topics/games-of-chance). It is not a meld game. If you wanted sets that score, that is [rummy](/guides/how-to-play-rummy). Here a set of four is only a way to burn the pile.`,
    },
    {
      id: "play",
      title: "Equal or higher, and refilling to three",
      body: `The start is specific. The first player who has a 3 among their face-up cards leads. If nobody does, the first player to declare a 3 in hand leads. If nobody has a 3, do the same with 4s, then 5s, and so on. That player starts the waste pile with one rank: a single card, or several cards of that same rank played together.

Play goes clockwise. On your turn you play a card, or several cards of one rank, that is equal to or higher than the current top. A 7 plays on a 7. A king plays on a 7. A 6 does not play on a 7. Suits never help.

You may play two or three or four of a kind as one play if they are equal to or higher than the top. You may not play a run such as 6-7-8. One rank only.

After you play from your hand, draw from the stock until you hold three cards again, as long as the stock has cards. If you played two cards, you draw two. Once the stock is gone, you play your hand down without refilling. You do not draw in the face-up or face-down phase.

If you cannot play, or you choose not to, you pick up the entire waste pile and add it to your hand. The next player then starts a new pile with any legal card. Picking up on purpose is allowed at many tables and is sometimes the right way to collect four of a kind. Say whether a voluntary pickup is legal. The base idea is that an illegal position forces the pickup.

The pile can grow fast. A player who picks it up may be holding 15 cards and still owe the three-card draw rule only when they play back down and the stock remains. They do not discard down to three by right. They have to play the extras off.`,
    },
    {
      id: "powers",
      title: "Twos, tens, and four of a kind",
      body: `These three powers are the common published set. They are not universal. A table that plays "higher card only" with no specials is still playing a cousin of Palace. Agree the list before the swap.

**Two resets.** A 2 may be played on any card, including an ace. It does not have to be higher. After a 2, the next player may play any card. The 2 does not remove the pile. It sets the requirement back to "anything." Some houses instead burn the pile with a 2, the same way a 10 works. This page uses the reset, which is the usual published power. Do not do both unless you meant to.

**Ten clears.** A 10 may be played on any pile, and it may start a pile. The whole waste pile, including the 10, is set aside and does not come back. The same player then starts a fresh pile with any card or set. That extra play is part of the ten. It is not a second turn later.

**Four of a kind clears.** If you play four of one rank at once, the pile is set aside and you start a new one, as with a 10. If four of a kind accumulate on top because several players added the same rank, the player who laid the fourth card also clears the pile and leads again. A buried four of a kind under other ranks does nothing. The four have to be the top.

Rank order for ordinary cards, low to high, is 3, 4, 5, 6, 7, 8, 9, jack, queen, king, ace. The 2 and the 10 sit outside that ladder when you are using the common powers. A jack is not wild. A queen does not skip.

A recorded variant makes a 7 reverse the ladder: the next card must be 7 or lower, and a 10 may still be played. That is optional. It is not part of the base deal on this page. Another variant makes 8s transparent, so you play on the card under the 8. Leave it out unless you wrote it down.

If you are unsure whether your house burns on a 2, you do not have a rule yet. Stop and pick the reset.`,
    },
    {
      id: "endgame",
      title: "Face-up cards, blind cards, and the loser",
      body: `When the stock is gone and your hand is empty, you move to the face-up row. On your turn you play one of those visible cards, or several of the same rank if you parked a pair there. They still have to be equal or higher, or a legal special. If you cannot play a face-up card, you pick up the pile into your hand. You are back in the hand phase. You must empty that hand again before you touch another face-up card.

When the face-up row is also gone, you play the face-down cards blind, one at a time. Pick a card, turn it over, and hope.

- If it is legal on the pile, it plays, and your turn ends unless it was a 10 or the fourth of a kind, in which case you clear and may continue.
- If it is illegal, you pick up the pile and that card. They become your hand. You do not get to turn a second blind card to rescue the first.

The first players to shed every card, hand and table, drop out and are safe. Play continues among the rest. The last player who still has cards loses. That player is the palace servant for the next deal, which is the polite name, or the shithead, which is the name the game carries in most English. The usual forfeit is that they deal next. Tables also assign drinks, chores, or the worst seat. Agree the forfeit before the game, not after the last blind card fails.

You can lose on one face-down 3 under an ace. Parking good cards face up does not make that hidden row safe. A player who is out stays out. The loser is the last one in.`,
    },
    {
      id: "example",
      title: "A short palace hand and the variants to name",
      body: `Three players. Your face-up row is K, 10, 4. Your hand is 3, 3, 9. You swap the 9 with the 4, so the face-up row becomes K, 10, 9 and your hand is 3, 3, 4. You cannot see the three cards under the face-up row. Leave them.

You have a 3 in hand, so you may be the starter if nobody shows a face-up 3. You lead both 3s. The next player plays a 3. The third player plays a 7. The pile's top is a 7. Your 4 does not play. You have no 2. You pick up the pile: two 3s, their 3, and the 7, plus your remaining cards. That hurts, and it is legal.

A 10 in hand is often better early, because you can burn during the stock phase and then draw back to three. Four 8s on top also burn, and the player who laid the fourth leads again.

Do not add these mid-hand:

- A 7 that forces lower cards.
- Transparent 8s.
- A joker that hands the pile to a chosen player.
- Skipping with a jack.

[Thirty-one](/guides/31-card-game) is the short hand if you want a score instead of a loser. [Bourré](/guides/bourre-card-game) is the trick game if you want a bid. Palace is finished when one person is still holding cardboard.

Adults sometimes play the forfeit as a small stake instead of a deal or a drink. That is gambling, and it is for adults only (18+, or the legal age where you live). The blind card does not know you raised the price.`,
    },
    {
      id: "stakes",
      title: "A blind card and a hashed coin",
      body: `You choose which cards to park face up, when to spend a 10, and whether to pick up a pile to build four of a kind. The last face-down card is still a blind play. A 2 that resets and a 2 that burns are different games. The loser is still the last player with cards.

If you want a result with no pile to pick up, PVPspinArena runs Jackpot, [Coinflip](/coinflip) and Roulette in USDC or ETH on Base. Adults 18+ only. Coinflip is a 50/50 between two players. Roulette returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee on a 33-slot wheel, a 7.88 percent on Purple or Silver after the win fee edge. Jackpot pays a shared pot by share. Seeds are committed before the round. A settled round can be checked on the [fairness](/fairness) page.

The [responsible gambling](/responsible-gambling) page is the stop when the forfeit stops being funny. Being the palace servant for one deal is the game. Chasing it with a larger stake is not.

See also [president](/guides/president-card-game-rules), [crazy eights](/guides/crazy-eights-rules) and [skip-bo](/guides/skip-bo-rules).`,
    },
  ],
  faqs: [
    {
      q: "What is the palace card game?",
      a: "Palace is the shedding game also called Shithead, Karma, and Shed. Two to five players get three face-down cards, three face-up cards, and three in hand. Play equal or higher. The last player with cards loses.",
    },
    {
      q: "What does a 2 do in palace?",
      a: "On the common sheet, a 2 plays on anything and the next player may play any card. It resets the rank. It does not clear the pile. Some houses burn the pile with a 2 instead. Agree which power you are using.",
    },
    {
      q: "What does a 10 do in palace?",
      a: "On the common sheet, a 10 plays on anything, the pile is set aside, and the same player starts a new pile. Four of a kind on top clears the pile the same way.",
    },
    {
      q: "When do you play the face-down cards?",
      a: "After the stock is gone, your hand is empty, and your face-up cards are gone. Turn one face-down card. If it is illegal, you pick up the pile plus that card and play from your hand again.",
    },
    {
      q: "Who is the palace servant?",
      a: "The last player still holding cards. They deal the next hand, unless the table agreed a different forfeit. Everyone else is already out.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Shithead (card game)",
      url: "https://en.wikipedia.org/wiki/Shithead_(card_game)",
    },
    { label: "Pagat: Shithead", url: "https://www.pagat.com/beating/shithead.html" },
  ],
  related: [
    "president-card-game-rules",
    "crazy-eights-rules",
    "skip-bo-rules",
    "bs-card-game-rules",
    "52-card-deck",
  ],
  howTo: true,
  updated: "2026-09-29",
};

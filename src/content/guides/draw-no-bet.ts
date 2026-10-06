import type { Guide } from "./types";

export const guide: Guide = {
  slug: "draw-no-bet",
  cluster: "Sports betting",
  keyword: "draw no bet",
  secondary: ["DNB meaning", "draw no bet refund", "DNB vs Asian handicap", "soccer draw refund"],
  title: "Draw No Bet: How DNB Works in Soccer Betting",
  description:
    "Draw no bet explained: how DNB refunds a draw, how its odds compare to the moneyline and Asian handicap 0, and when DNB is the smarter soccer bet.",
  h1: "Draw No Bet: How DNB Works in Soccer Betting",
  answer:
    "Draw no bet is a soccer price that refunds your stake if the match is a draw. Your team must win for the ticket to pay. If your team loses, the stake is lost. The draw is not a win and not a loss. It is a void of that stake. The odds are shorter than the three-way moneyline because you no longer risk the draw. Asian handicap 0 settles the same way. This page is the contract, not a pick. Adults 18+ only.",
  facts: [
    "Draw no bet pays only if your selection wins. A draw returns the stake. A loss loses the stake.",
    "DNB prices are shorter than the same team's three-way price because the draw no longer loses.",
    "Asian handicap 0, sometimes called level ball, grades the same three results as draw no bet.",
    "A better DNB price and a better handicap-0 price are the same contract. Shop the number, not the label.",
    "Removing the draw is a shape choice. It is not proof that the side is more likely to win.",
    "PVPspinArena does not book soccer. Adults 18+ only. This is not a pick sheet.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What draw no bet removes",
      body: `Draw no bet takes the draw out of the ways you can lose. In a normal [soccer betting](/guides/soccer-betting) coupon the match is three results: home, draw, away. All three can lose your stake if you picked one of the others. DNB keeps two losing paths from becoming three. You still lose if your team loses. You do not lose if they draw.

That refund is why the price shrinks. The book is no longer paying you for the risk that a 1–1 ruins the ticket. You sold that risk back to the book and took a shorter number. People who see a short DNB price and call it "safer" are half right about the draw and wrong about the loss. A defeat still takes the full stake. Safer on one result is not safer on the match.

The [moneyline](/guides/moneyline-betting-explained) in a two-way sport has no draw to remove. Importing that habit into football is how bettors treat the draw as a nuisance instead of a real score. DNB is the product that agrees with them, for a fee built into the shorter odds. [Asian handicap](/guides/asian-handicap) 0 is the same agreement under another name.

[Sports betting guides](/guides/topics/sports-betting) holds the rest of the menu. Adults 18+ only. PVPspinArena is not a sportsbook. [Fairness](/fairness) checks Jackpot, Coinflip and Roulette. [Jackpot](/) is a pot, not a 1X2 coupon. [Responsible gambling](/responsible-gambling) is the stop if a refunded draw sends you hunting a second match to "use the money." A refund is your stake back. It is not a win you are owed to press.`,
    },
    {
      id: "settlement",
      title: "Win, refund, and loss",
      body: `Say the selection out loud with the result.

- Your team wins in the graded period: DNB wins at the posted odds.
- The match draws: stake returned. No profit. No juice kept on that ticket, beyond whatever the shorter price already charged you for the protection.
- Your team loses: stake lost.

Most DNB markets grade 90 minutes plus stoppage time, not extra time and not penalties. A match that is 1–1 after 90 and then decided in extra time is still a draw for a 90-minute DNB. The cup tie has a winner. Your refund rule may not care. Read "regular time" on the coupon. If the book includes extra time, the word will be there, and the price should be different because the draw is less likely to survive.

Voids and postponements follow the book. A match that does not kick off is not a DNB refund in the special sense. It is an unsettled or void ticket under the postponement rule. Do not argue a refund you liked on draws into a game that never started.

Cash out, if you see it, is a new sale. It is not the original DNB. A cash-out number with ten minutes left and the score level is the book buying the ticket back, including the refund you might have had at the whistle. Take it only if you prefer that number to the rule you already hold.

Handicap 0 on the [Asian handicap](/guides/asian-handicap) page is the settlement twin. Win, push on the draw, lose on a defeat. If one screen says DNB at 1.55 and another says handicap 0 at 1.58, they are arguing about price, not about what a 0–0 does.`,
    },
    {
      id: "prices",
      title: "How DNB odds compare with the three-way",
      body: `The three-way price is longer because the draw can beat you. The DNB price is shorter because it cannot. An illustration, not a live coupon and not a pick:

| Contract | Price | If your side wins | If the match draws | If your side loses |
| --- | --- | --- | --- | --- |
| Three-way home | 2.10 | Profit on the full odds | Stake lost | Stake lost |
| Draw no bet home | 1.55 | Smaller profit | Stake back | Stake lost |
| Asian handicap 0 | 1.58 | Profit at 1.58 | Stake back | Stake lost |

Home at 2.10 implies about 47.6% before you remove the hold. A draw at 3.40 would imply about 29.4%, and an away price at 3.60 about 27.8%. Those three sum over 100%, which is the three-way margin. DNB is a two-result contract, so its hold is a different sum. You cannot divide the three-way home price by something simple and get the book's DNB without the margin moving.

A fair sketch, still not a quote: among the non-draw slice of those raw implied figures, home's share is 47.6 / (47.6 + 27.8), about 63%. A fair decimal near 1.58 sits in that neighborhood. The illustration posts DNB at 1.55 and handicap 0 at 1.58. Same settlement. The 1.58 returns more profit on a win and the same refund on a draw. Prefer the higher decimal. The label does not pay you.

Use [implied probability](/guides/implied-probability) if the book shows American odds. A short DNB minus number can look "safe" and still be a worse price than the handicap 0 across the street. Convert both. Then compare profit on a win, because the draw pays the same: zero, plus your stake.`,
    },
    {
      id: "example-dnb",
      title: "Worked example: $20 draw no bet",
      body: `Illustration only. Stake $20 on home draw no bet at decimal 1.55. Profit if home wins is $20 times 0.55, which is $11. Return is $31. The three-way home price in the same illustration is 2.10, so $20 there would profit $22 if home wins, and would lose the $20 if the match draws.

- Home wins 2–0: DNB profit $11. Three-way profit $22.
- Match draws 1–1: DNB returns $20. Three-way loses $20.
- Away wins 1–0: both lose $20.

| Result | $20 at DNB 1.55 | $20 at three-way 2.10 |
| --- | --- | --- |
| Home wins | +$11 | +$22 |
| Draw | $20 back | −$20 |
| Away wins | −$20 | −$20 |

The $11 versus $22 is the cost of the refund. You gave up $11 of profit on the win so that 1–1 gives the stake back. That trade is the smarter shape only when you actually want the refund more than the extra $11. If your view is that home wins and draws are both fine but you need the longer payout, the three-way is the contract that matches the view. If your view is that a draw should not cost the stake, DNB matches that view and pays you less when you are right about the win.

Nothing in the arithmetic says home will win. A shorter price is not a stronger team. It is a smaller set of losing scores. Adults 18+ only. One match. Do not parlay the refund into a story about "free" money. The stake comes back. The time you spent is not a bonus bet.`,
    },
    {
      id: "example-ah0",
      title: "Worked example: same match, handicap 0",
      body: `Second illustration, same $20, same match, Asian handicap 0 at 1.58 instead of DNB at 1.55.

- Home wins: profit is $20 times 0.58, which is $11.60. That is $0.60 more than the DNB.
- Draw: $20 back. Identical to DNB.
- Away wins: −$20. Identical to DNB.

Sixty cents on a $20 stake is the whole gap. It will not change your life. It is still the better ticket, because the results match and the win pays more. People who pick DNB because the button is labeled in English, and ignore handicap 0 at a higher decimal, pay for a translation.

If handicap 0 were 1.50 and DNB were 1.55, take the DNB. Loyalty to a market name is not a price. Write both decimals before you choose. If the book only offers one, you do not have a shop. You have a single offer. Take it or leave it. Do not invent a refund the coupon does not print.

Extra time remains the trap. A 1–1 that becomes 2–1 in the 118th minute can win a "to qualify" bet and still refund a 90-minute DNB or handicap 0. If you wanted the cup winner, you did not want this market. [Soccer betting](/guides/soccer-betting) separates the match price from the advancement price. Read the clock the book uses.`,
    },
    {
      id: "checklist",
      title: "Checklist before any draw no bet",
      body: `Use the list on the slip. A blank line means you skip.

- The button says draw no bet, or handicap 0, and you know they match.
- You wrote the decimal and the profit on a win, not only the team name.
- You checked a second price so you are not paying for the friendlier label.
- The graded period is 90 minutes or includes extra time. You can point at the words.
- A draw, in your own sentence, returns the stake and pays no profit.
- A loss still loses the full stake. You are fine with that.
- You are 18+ and the book is one you are allowed to use. The stake fits a limit you set first.

DNB is the smarter soccer bet when the refund is the result you refuse to lose on and the shorter price still beats the other book's same contract. It is not smarter because a preview said the match "will not be a draw." Previews do not grade tickets. Prices do.`,
    },
    {
      id: "not-a-book",
      title: "A refund is not a pot on this site",
      body: `PVPspinArena will not book a match, refund a 1–1, or lay handicap 0. Jackpot, Coinflip and Roulette do not settle football. [Fairness](/fairness) verifies a seed reveal. It does not verify a late equalizer.

If draw no bet was the product, a coin will not replace the refund rule. A push on a sportsbook and a void on a postponed match are book rules. They are not a jackpot share.

When a refunded draw makes you open a second match at a worse price, stop. The stake came back so you could keep it. Adults 18+ only.`,
    },
  ],
  faqs: [
    {
      q: "What happens to a draw no bet if the game is a draw?",
      a: "The stake is returned. You do not win and you do not lose. Profit is zero. That refund is why the odds are shorter than the three-way price on the same team. A draw after extra time is a different question. Most DNB tickets grade 90 minutes plus stoppage, so a later winner may not pay.",
    },
    {
      q: "Is draw no bet the same as Asian handicap 0?",
      a: "The settlement matches. Your side wins, you win. The match draws, the stake comes back. Your side loses, the stake is lost. The prices do not have to match. If one book posts 1.55 and another posts 1.58 on that same rule, take the higher decimal. The name on the button is not part of the payout.",
    },
    {
      q: "Why is a draw no bet price shorter than the moneyline?",
      a: "On a three-way soccer coupon the draw can take your stake. Draw no bet removes that loss, so the book pays you less when your team wins. Shorter odds are the cost of the refund, not a sign that the team became more likely. Compare profit on a win before you call the shorter number safer.",
    },
    {
      q: "When is draw no bet the better shape?",
      a: "When you want a win to pay and a draw to return the stake, and you accept a smaller profit than the three-way price. If you need the longer payout and you can stand losing on a draw, the three-way matches that view. Shop handicap 0 against DNB. Same results, possibly a better decimal. This page will not name a team.",
    },
    {
      q: "Can I place draw no bet on PVPspinArena?",
      a: "No. There is no soccer book here. Jackpot, Coinflip and Roulette are the games, adults 18+ only. A hashed pot does not refund a draw, grade 90 minutes, or pay a three-way price. Fairness checks on this site do not settle a match.",
    },
  ],
  sources: [
    { label: "Wikipedia: Asian handicap", url: "https://en.wikipedia.org/wiki/Asian_handicap" },
    { label: "Wikipedia: Association football", url: "https://en.wikipedia.org/wiki/Association_football" },
    { label: "FIFA", url: "https://www.fifa.com" },
  ],
  related: ["soccer-betting", "asian-handicap", "moneyline-betting-explained", "implied-probability"],
  updated: "2026-10-06",
};

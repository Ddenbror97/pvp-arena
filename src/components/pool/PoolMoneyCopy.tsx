export const POOL_PAGE_TITLE = "8 Ball Pool for Real Money: Crypto PvP Matches";
export const POOL_PAGE_DESCRIPTION =
  "Play 1v1 8 ball for a cash stake. The winner is the rules replay of the shots. A 5% fee comes off the pot. Stakes run from $1 to $50.";

export const POOL_FAQS = [
  {
    q: "Can you play 8 ball pool for real money?",
    a: "Yes. Two players stake the same amount from a US-dollar balance. The winner is whoever the published 8-ball rules name after the shots. The rack seed does not pick a winner.",
  },
  {
    q: "What fee does the match take?",
    a: "When a match settles, 5% of the pot is the fee and the winner receives the other 95%. A $10 versus $10 match is a $20 pot, a $1 fee, and $19 to the winner. If nobody joins within 24 hours, the stake is refunded and no fee is charged.",
  },
  {
    q: "How do you prove a match was fair?",
    a: "The server publishes the SHA-256 hash of a 32-byte rack seed before the table opens. The seed is revealed once the match is playing. The fairness page replays the shot list under the physics id stored with that rack.",
  },
  {
    q: "What does a crypto 8 ball pool wager cost?",
    a: "You choose any amount from $1 to $50. Quick amounts are $1, $2, $5, $10, $25 and $50. Bitcoin, USDC or ETH on Base can fund the US-dollar balance. They are not a separate playable balance. Promo credit and partner credit can fund a stake. Deposited or won money is used first, and bonus you lose to the other player stays bonus.",
  },
  {
    q: "Is betting on pool legal?",
    a: "That depends on where you live. This page is not legal advice. You must be 18 or older and allowed to play for money where you are. Some places ban skill games for money even when the balls are not a random draw.",
  },
  {
    q: "Does the 8 on the break win?",
    a: "On this table, the 8 on the break wins unless the cue ball is scratched. That scratch loses. That is this site's rule. It is not the World Pool-Billiard Association rule, which spots the 8 or rebreaks.",
  },
] as const;

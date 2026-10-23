/** Public game facts copied from the live rules. Do not add unverified limits. */
export type GameFact = { label: string; text: string };
export type GameFactPage = {
  id: string;
  name: string;
  facts: GameFact[];
  reads: { to: "/guides/$slug"; slug: string; label: string }[];
};

const AGE =
  "You must be 18 or older, and permitted to play for money where you live. Only use money you can afford to lose.";

export const GAME_FACT_PAGES: Record<string, GameFactPage> = {
  jackpot: {
    id: "jackpot",
    name: "Jackpot",
    facts: [
      {
        label: "How you enter",
        text: "You add money from your US-dollar balance to one shared pot. Every cent you add is one ticket.",
      },
      {
        label: "How the winner is chosen",
        text: "One draw picks a ticket. Your chance equals your share of the pot. A larger stake is more tickets, not a separate prize.",
      },
      {
        label: "Fee",
        text: "When the round settles, 5% of the pot is kept as the fee. The winner receives the other 95%.",
      },
      {
        label: "Payout",
        text: "The winner's share is credited to the US-dollar balance. Bitcoin, and USDC or ETH on Base, fund that balance. They are not separate playable balances.",
      },
      {
        label: "Checking the result",
        text: "The server publishes the SHA-256 hash of a secret seed before the round. After settlement the seed is revealed. The Fairness page recomputes the draw. That check covers the published result. It does not remove the fee, protect a wallet, or change the chance of losing.",
      },
      {
        label: "If a round is cancelled",
        text: "A cancelled round refunds the affected stakes without the game fee.",
      },
      { label: "Who can play", text: AGE },
    ],
    reads: [
      { to: "/guides/$slug", slug: "crypto-jackpot", label: "How a crypto jackpot pot works" },
      { to: "/guides/$slug", slug: "commit-reveal-scheme", label: "What a commit-reveal draw is" },
    ],
  },
  coinflip: {
    id: "coinflip",
    name: "Coinflip",
    facts: [
      {
        label: "How you enter",
        text: "Two players stake the same amount. One player picks heads or tails. The other player takes the opposite side.",
      },
      {
        label: "How the winner is chosen",
        text: "One bit from HMAC-SHA256 decides the side. Each side has a 50% chance. The animation does not decide the result.",
      },
      {
        label: "Fee",
        text: "When the round settles, 5% of the combined pot is kept as the fee. The winner receives the other 95%. The fee is not charged again on deposit or withdrawal.",
      },
      {
        label: "Payout",
        text: "The winner's share is credited to the US-dollar balance.",
      },
      {
        label: "Checking the result",
        text: "The seed hash is published before the flip and the seed is revealed after it. You can recompute the side on the Fairness page. A matching hash shows the seed was not swapped. It is not a promise that you will win, and it does not cover custody of your wallet.",
      },
      {
        label: "If a round is cancelled",
        text: "A cancelled round refunds the affected stakes without the game fee.",
      },
      { label: "Who can play", text: AGE },
    ],
    reads: [
      { to: "/guides/$slug", slug: "coin-flip-odds", label: "Why a fair coin is 50%" },
      {
        to: "/guides/$slug",
        slug: "coin-flip-for-money",
        label: "What a money coinflip actually pays",
      },
    ],
  },
  roulette: {
    id: "roulette",
    name: "Roulette",
    facts: [
      {
        label: "How you enter",
        text: "You place a bet on a timed round from your US-dollar balance. Other players can bet in the same round. Their bets do not change your payout.",
      },
      {
        label: "How the result is chosen",
        text: "The wheel has 33 slots: 16 Purple, 16 Silver, and 1 Green. Purple and Silver pay 2x. Green pays 14x. This is a house-banked wheel, not a player pot.",
      },
      {
        label: "Fee and return",
        text: "A 5% fee is taken from each winning payout. A losing bet is not charged that fee. Before the fee, Purple or Silver returns 32/33 of the stake and Green returns 14/33. After the fee, the theoretical average return is about 92.12% on Purple or Silver (about a 7.88% house edge) and about 40.30% on Green (about a 59.70% house edge). A betting pattern does not change those figures.",
      },
      {
        label: "Payout",
        text: "Each winning bet is settled on its own into the US-dollar balance. The wheel used for the round is the wheel that was active when the round opened, and that wheel is recorded on the round.",
      },
      {
        label: "Checking the result",
        text: "The seed hash is published before the spin and the seed is revealed after it. Fairness recomputes the slot. That verifies the draw. It does not remove the house edge.",
      },
      { label: "Who can play", text: AGE },
    ],
    reads: [
      {
        to: "/guides/$slug",
        slug: "provably-fair-roulette",
        label: "How a provably fair wheel is checked",
      },
      { to: "/guides/$slug", slug: "house-edge", label: "What a house edge means" },
    ],
  },
  slott: {
    id: "slott",
    name: "P2P Slott",
    facts: [
      {
        label: "How you enter",
        text: "Two players stake the same amount and take turns spinning a 5×4 board, six spins each.",
      },
      {
        label: "How the winner is chosen",
        text: "The higher score wins. A draw refunds both stakes and charges no fee.",
      },
      {
        label: "Fee",
        text: "When a player wins, 10% of the players' pot is kept as the fee. The winner receives the other 90%, plus any promotional WILD bonus added to that match. Those bonuses are paid in full. A per-match cap and a daily promo budget can reduce a bonus. The amount is shown on the result.",
      },
      {
        label: "Bomb",
        text: "If either player lands a bomb, the match ends immediately. The house keeps both stakes, and any promotional bonus returns to the promo budget.",
      },
      {
        label: "Payout",
        text: "A match already open keeps the rules it was created with. The result is credited to the US-dollar balance.",
      },
      {
        label: "Checking the result",
        text: "The seed is committed when the match is created and revealed when it ends. Every cell can be recomputed on the Fairness page. That check does not change the 10% fee or the bomb rule.",
      },
      { label: "Who can play", text: AGE },
    ],
    reads: [
      {
        to: "/guides/$slug",
        slug: "pvp-gambling",
        label: "How player-versus-player gambling differs from a house game",
      },
    ],
  },
  poker: {
    id: "poker",
    name: "Poker",
    facts: [
      {
        label: "How you enter",
        text: "Poker is six-max No-Limit Texas Hold'em against the other seated players. Blinds run from $0.02/$0.05 to $5/$10. A buy-in is 40 to 125 big blinds, depending on the stakes. Each player has 20 seconds to act. Your chips stay at the seat between hands and return to your US-dollar balance when you leave.",
      },
      {
        label: "How the winner is chosen",
        text: "The best hand at showdown, or the last player left in the hand, wins the pot. Decisions change the pot. The deal does not play for you.",
      },
      {
        label: "Fee",
        text: "The fee is 5% of each pot, and only when a flop is dealt. A hand that ends before the flop pays no fee. Uncalled chips are returned before the fee and are not charged.",
      },
      {
        label: "Promo credit",
        text: "Promo and partner credit can be used for a buy-in. Deposited or won money is used first. Bonus you lose to another player stays bonus.",
      },
      {
        label: "Checking the shuffle",
        text: "Each seated player commits a secret. The server mixes the reveals with its own committed seed. If someone does not reveal in time, the hand is voided before any card or blind and no money moves. After the hand, the Hands tab rebuilds the deck in your browser. Hole cards are visible only to you during the hand. The check confirms the published shuffle. It does not promise a profit or protect the wallet that funded the buy-in.",
      },
      { label: "Who can play", text: AGE },
    ],
    reads: [
      {
        to: "/guides/$slug",
        slug: "texas-holdem-rules",
        label: "Texas Hold'em street order and hand rankings",
      },
    ],
  },
  pool: {
    id: "pool",
    name: "8-ball",
    facts: [
      {
        label: "How you enter",
        text: "Two players stake the same amount from a US-dollar balance. The stakes are $1, $2, $5, $10, $25 and $50. Join an open table, or play to take the oldest open table at that stake. There is no house opponent. Promo and partner credit can fund a stake. Deposited or won money is used first.",
      },
      {
        label: "How the winner is chosen",
        text: "The winner is whoever the published 8-ball rules name after the shots. A legal 8-ball wins. An early 8, the 8 in the wrong pocket, or a scratch on the 8 loses. Three shot-clock timeouts, or leaving a live match, give the match to the other player. The server runs that function. It does not draw a winner.",
      },
      {
        label: "Fee",
        text: "When the match settles, 5% of the pot is kept as the fee. The winner receives the other 95%.",
      },
      {
        label: "Payout",
        text: "The winner's share is credited to the US-dollar balance. Bitcoin, and USDC or ETH on Base, fund that balance. They are not separate playable balances. Bonus you lose to the other player stays bonus.",
      },
      {
        label: "Checking the result",
        text: "Before the table opens, the server publishes the SHA-256 hash of a 32-byte rack seed. The seed is revealed once the match is playing. It only shuffles the coloured balls. The 8 stays in the centre. The Fairness page replays the shot list under the physics id stored with that rack. A paid winner that disagrees with that replay is not a verified result. The check does not move money back, remove the fee, or protect a wallet.",
      },
      {
        label: "If a round is cancelled",
        text: "If nobody joins within 24 hours, the stake is refunded and no fee is charged. A player cannot cancel a waiting table. A match that does not open within 30 seconds after both players are seated, or that ends before the break because both players left, refunds both stakes with no fee.",
      },
      { label: "Who can play", text: AGE },
    ],
    reads: [
      {
        to: "/guides/$slug",
        slug: "8-ball-pool-rules",
        label: "8 ball pool rules on this table",
      },
      {
        to: "/guides/$slug",
        slug: "8-ball-pool-hub",
        label: "How 8 ball pool online maps to a money match",
      },
    ],
  },
};

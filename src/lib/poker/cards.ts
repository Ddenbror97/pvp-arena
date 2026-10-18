/**
 * Card encoding shared with the database (`_poker_*` functions).
 * A card is an integer 0..51: rank = c % 13 (0 = deuce .. 12 = ace),
 * suit = floor(c / 13) (0 = clubs, 1 = diamonds, 2 = hearts, 3 = spades).
 */
export type Card = number;

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export const SUITS = ["c", "d", "h", "s"] as const;
export const SUIT_SYMBOL = { c: "♣", d: "♦", h: "♥", s: "♠" } as const;
export const SUIT_NAME = { c: "clubs", d: "diamonds", h: "hearts", s: "spades" } as const;
export const RANK_NAME = [
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Jack",
  "Queen",
  "King",
  "Ace",
] as const;

export const rankOf = (c: Card) => c % 13;
export const suitOf = (c: Card) => Math.floor(c / 13);

export function isCard(c: unknown): c is Card {
  return typeof c === "number" && Number.isInteger(c) && c >= 0 && c < 52;
}

export function cardCode(c: Card): string {
  if (!isCard(c)) throw new Error(`Invalid card ${String(c)}`);
  return RANKS[rankOf(c)]! + SUITS[suitOf(c)]!;
}

export function parseCard(code: string): Card {
  const r = RANKS.indexOf(code[0]?.toUpperCase() as (typeof RANKS)[number]);
  const s = SUITS.indexOf(code[1]?.toLowerCase() as (typeof SUITS)[number]);
  if (r < 0 || s < 0 || code.length !== 2) throw new Error(`Invalid card code ${code}`);
  return s * 13 + r;
}

/** Display parts for a card face: rank text ("10" for tens), suit symbol, red/black. */
export function cardFace(c: Card) {
  if (!isCard(c)) throw new Error(`Invalid card ${String(c)}`);
  const rank = RANKS[rankOf(c)]!;
  const suit = SUITS[suitOf(c)]!;
  return {
    rank: rank === "T" ? "10" : rank,
    suit,
    symbol: SUIT_SYMBOL[suit],
    red: suit === "d" || suit === "h",
    label: `${RANK_NAME[rankOf(c)]} of ${SUIT_NAME[suit]}`,
  };
}

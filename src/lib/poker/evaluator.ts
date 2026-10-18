/**
 * Best-five-of-N Texas Hold'em evaluator (5..7 cards). Mirrors `_poker_eval` in SQL.
 * score = category << 20 | k1 << 16 | k2 << 12 | k3 << 8 | k4 << 4 | k5, ranks 0..12.
 * A higher score wins; equal scores split.
 */
import { rankOf, suitOf, type Card } from "./cards";

export const CATEGORY = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
] as const;

const pack = (cat: number, k: number[]) => {
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * 16 + (k[i] ?? 0);
  return s;
};

/** Top rank of the best straight in a 13-bit rank mask, or -1. The wheel (A-2-3-4-5) returns 3. */
export function straightTop(mask: number): number {
  for (let top = 12; top >= 4; top--) {
    const run = 0b11111 << (top - 4);
    if ((mask & run) === run) return top;
  }
  const wheel = (1 << 12) | 0b1111;
  return (mask & wheel) === wheel ? 3 : -1;
}

export function evaluate(cards: readonly Card[]): number {
  if (cards.length < 5 || cards.length > 7) throw new Error("evaluate needs 5 to 7 cards");
  const counts = new Array<number>(13).fill(0);
  const suitMask = [0, 0, 0, 0];
  const suitCount = [0, 0, 0, 0];
  let mask = 0;
  for (const c of cards) {
    const r = rankOf(c);
    const s = suitOf(c);
    counts[r]!++;
    suitMask[s]! |= 1 << r;
    suitCount[s]!++;
    mask |= 1 << r;
  }
  const flushSuit = suitCount.findIndex((n) => n >= 5);
  if (flushSuit >= 0) {
    const sf = straightTop(suitMask[flushSuit]!);
    if (sf >= 0) return pack(8, [sf]);
  }
  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (let r = 12; r >= 0; r--) {
    const n = counts[r]!;
    if (n === 4) quads.push(r);
    else if (n === 3) trips.push(r);
    else if (n === 2) pairs.push(r);
    else if (n === 1) singles.push(r);
  }
  const ranksDesc = (exclude: number[]) => {
    const out: number[] = [];
    for (let r = 12; r >= 0; r--) if (counts[r]! > 0 && !exclude.includes(r)) out.push(r);
    return out;
  };
  if (quads.length) return pack(7, [quads[0]!, ranksDesc([quads[0]!])[0]!]);
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const pair = Math.max(trips[1] ?? -1, pairs[0] ?? -1);
    return pack(6, [trips[0]!, pair]);
  }
  if (flushSuit >= 0) {
    const ks: number[] = [];
    for (let r = 12; r >= 0 && ks.length < 5; r--) if (suitMask[flushSuit]! & (1 << r)) ks.push(r);
    return pack(5, ks);
  }
  const st = straightTop(mask);
  if (st >= 0) return pack(4, [st]);
  if (trips.length) return pack(3, [trips[0]!, ...ranksDesc([trips[0]!]).slice(0, 2)]);
  if (pairs.length >= 2) {
    return pack(2, [pairs[0]!, pairs[1]!, ranksDesc([pairs[0]!, pairs[1]!])[0]!]);
  }
  if (pairs.length === 1) return pack(1, [pairs[0]!, ...ranksDesc([pairs[0]!]).slice(0, 3)]);
  return pack(0, singles.slice(0, 5));
}

export const categoryOf = (score: number) => Math.floor(score / 16 ** 5);
export const handName = (score: number) => CATEGORY[categoryOf(score)] ?? "Unknown";

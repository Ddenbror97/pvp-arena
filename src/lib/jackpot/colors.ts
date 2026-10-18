/**
 * One color per player on the jackpot wheel.
 * The old palette had 12 swatches and the first joiner was always swatch 1 (purple),
 * so a full round repeated colors and the same person saw purple every game.
 * Consecutive joiners are spaced by the golden angle (~137.5°), which stays
 * far apart on the wheel no matter how many people join. The round id rotates
 * the whole set, so the same seat is a different color next game.
 * Every viewer of a round derives the same color; nothing here is random.
 */
const GOLDEN = 137.50776405003785;

export function playerHue(index: number, roundId: number): number {
  const n = Math.max(0, Math.trunc(index));
  const round = Math.abs(Math.trunc(roundId)) || 1;
  const hue = ((round * 47 + n) * GOLDEN) % 360;
  return Math.round(hue * 100) / 100;
}

export function playerColor(index: number, roundId: number): string {
  const hue = playerHue(index, roundId);
  const light = [0.68, 0.58, 0.76][Math.abs(Math.trunc(index)) % 3];
  const chroma = Math.abs(Math.trunc(index)) % 2 === 0 ? 0.2 : 0.15;
  return `oklch(${light} ${chroma} ${hue})`;
}

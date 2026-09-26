import { coinHeads, coinTails, rouletteGreen } from "@/assets/media";
import type { RlColor } from "@/lib/roulette/api";

/** Visual skin only — the server still works with RED/BLACK/YELLOW/GREEN. */
export const COIN: Record<RlColor, { src: string; filter?: string; glow: string; label: string }> = {
  RED: { src: coinHeads, glow: "var(--primary)", label: "Purple" },
  BLACK: { src: coinTails, glow: "oklch(0.85 0.01 285)", label: "Silver" },
  YELLOW: { src: coinHeads, filter: "hue-rotate(150deg) saturate(1.6) brightness(1.5)", glow: "var(--rl-yellow)", label: "Gold" },
  GREEN: { src: rouletteGreen, glow: "var(--rl-green)", label: "Green" },
};

export function CoinImg({ c, className, size = 64 }: { c: RlColor; className?: string; size?: number }) {
  const k = COIN[c];
  return (
    <img
      src={k.src}
      alt={k.label}
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ filter: k.filter, width: size, height: size }}
    />
  );
}

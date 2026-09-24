import heads from "@/assets/coin-heads.png.asset.json";
import tails from "@/assets/coin-tails.png.asset.json";
import green from "@/assets/roulette-green.png.asset.json";
import type { RlColor } from "@/lib/roulette/api";

/** Visual skin only — the server still works with RED/BLACK/YELLOW/GREEN. */
export const COIN: Record<RlColor, { src: string; filter?: string; glow: string; label: string }> = {
  RED: { src: heads.url, glow: "var(--primary)", label: "Purple" },
  BLACK: { src: tails.url, glow: "oklch(0.85 0.01 285)", label: "Silver" },
  YELLOW: { src: heads.url, filter: "hue-rotate(150deg) saturate(1.6) brightness(1.5)", glow: "var(--rl-yellow)", label: "Gold" },
  GREEN: { src: green.url, glow: "var(--rl-green)", label: "Jackpot" },
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

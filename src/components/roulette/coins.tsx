import { coinHeads, coinTails, rouletteGreen } from "@/assets/media";
import type { RlColor } from "@/lib/roulette/api";

/** Visual skin only — the server still works with RED/BLACK/YELLOW/GREEN. */
export const COIN: Record<RlColor, { src: string; filter?: string; glow: string; label: string }> =
  {
    RED: { src: coinHeads, glow: "var(--primary)", label: "Purple" },
    BLACK: { src: coinTails, glow: "oklch(0.86 0.02 260)", label: "Silver" },
    YELLOW: {
      src: coinHeads,
      filter: "hue-rotate(150deg) saturate(1.6) brightness(1.5)",
      glow: "var(--rl-yellow)",
      label: "Gold",
    },
    GREEN: { src: rouletteGreen, glow: "var(--rl-green)", label: "Green" },
  };

export function CoinImg({
  c,
  className,
  size = 64,
  fluid = false,
}: {
  c: RlColor;
  className?: string;
  size?: number;
  /** Size comes from CSS so the first paint matches the measured rail. */
  fluid?: boolean;
}) {
  const k = COIN[c];
  return (
    <img
      src={k.src}
      alt={k.label}
      width={fluid ? undefined : size}
      height={fluid ? undefined : size}
      decoding="async"
      draggable={false}
      className={className}
      style={fluid ? { filter: k.filter } : { filter: k.filter, width: size, height: size }}
    />
  );
}

import { memo } from "react";
import { cardFace, isCard } from "@/lib/poker/cards";
import { cn } from "@/lib/utils";

/**
 * One card. `card` null renders the back. Sizes come from the `--card-w` custom property
 * (set by the table stage in container units), so cards scale with the table, not the page.
 */
export const PlayingCard = memo(function PlayingCard({
  card,
  className,
  fresh,
  dim,
  win,
  lift,
}: {
  card: number | null | undefined;
  className?: string;
  /** Just revealed: a brief, restrained highlight. */
  fresh?: boolean;
  dim?: boolean;
  /** Part of the winning hand. */
  win?: boolean;
  /** Lift on hover (own hole cards). */
  lift?: boolean;
}) {
  if (!isCard(card)) {
    return (
      <span
        aria-label="Face-down card"
        role="img"
        className={cn("poker-card poker-card-back", dim && "opacity-45 saturate-50", className)}
      />
    );
  }
  const f = cardFace(card);
  return (
    <span
      role="img"
      aria-label={f.label}
      className={cn(
        "poker-card poker-card-face",
        f.red ? "text-[#d4203f]" : "text-[#0d1020]",
        fresh && "poker-card-fresh",
        win && "poker-card-win",
        dim && "opacity-45 saturate-50",
        lift && "poker-card-lift",
        className,
      )}
    >
      <span className="poker-card-corner">
        <span>{f.rank}</span>
        <span aria-hidden>{f.symbol}</span>
      </span>
      <span className="poker-card-pip" aria-hidden>
        {f.symbol}
      </span>
    </span>
  );
});

const CHIP_COLORS = ["#7c3aed", "#e11d48", "#0ea5e9", "#f59e0b", "#10b981"];

/** A short chip stack with its amount. Purely visual: the amount is the server's number. */
export const ChipStack = memo(function ChipStack({
  amount,
  label,
  className,
  pulse,
}: {
  amount: number;
  label: string;
  className?: string;
  pulse?: number;
}) {
  const n = Math.max(1, Math.min(5, Math.ceil(Math.log10(Math.max(amount, 1)))));
  return (
    <span key={pulse} className={cn("poker-chips", pulse ? "poker-chips-pulse" : "", className)}>
      <span className="poker-chip-pile" aria-hidden>
        {Array.from({ length: n }, (_, i) => (
          <span
            key={i}
            className="poker-chip"
            style={
              {
                "--chip": CHIP_COLORS[i % CHIP_COLORS.length],
                translate: `0 ${-i * 0.18}em`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
      <span className="poker-chip-amount">{label}</span>
    </span>
  );
});

import { memo, useEffect, useRef, useState } from "react";
import type { RlColor, RlGame } from "@/lib/roulette/api";
import { cn } from "@/lib/utils";

const TILE = 72; // px, includes gap
const REPEATS = 12;
export const colorClass: Record<RlColor, string> = {
  RED: "bg-rl-red text-foreground",
  BLACK: "bg-rl-black text-foreground border border-border",
  YELLOW: "bg-rl-yellow text-background",
  GREEN: "bg-rl-green text-background",
};

/**
 * Presentation only. The winning slot is already fixed on the server before the strip moves;
 * the strip is positioned from server timestamps so every viewer lands on the same tile at the same time.
 */
export const RouletteStrip = memo(function RouletteStrip({
  layout,
  game,
  now,
}: {
  layout: RlColor[];
  game: RlGame | null;
  now: () => number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [, force] = useState(0);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = layout.length;
  const tiles = Array.from({ length: n * REPEATS }, (_, i) => layout[i % n]!);
  const slot = game?.winning_slot;
  const start = game?.spin_start_at ? new Date(game.spin_start_at).getTime() : 0;
  const end = game?.spin_end_at ? new Date(game.spin_end_at).getTime() : 0;
  const spinning = slot != null && (game?.status === "SPINNING" || game?.status === "SETTLEMENT" || game?.status === "COMPLETED");

  // Stable per-round landing offset inside the tile (deterministic from id so all viewers match).
  const jitter = game ? ((Number(game.id) * 37) % 40) - 20 : 0;
  const target = slot != null ? (n * (REPEATS - 2) + slot) * TILE + TILE / 2 + jitter : 0;
  const base = (n * 2) * TILE + TILE / 2;
  let pos = base;
  if (spinning && end > start) {
    const t = Math.min(1, Math.max(0, (now() - start) / (end - start)));
    const eased = 1 - Math.pow(1 - t, 4);
    pos = base + (target - base) * eased;
  }

  useEffect(() => {
    if (!spinning) return;
    let raf = 0;
    const loop = () => {
      force((x) => x + 1);
      if (now() < end + 50) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinning, end, now]);

  const done = spinning && now() >= end;
  const landedIndex = n * (REPEATS - 2) + (slot ?? 0);

  return (
    <div ref={wrap} className="relative h-24 overflow-hidden rounded-xl border border-border bg-card">
      <div
        className="absolute top-3 flex gap-2 will-change-transform"
        style={{ transform: `translate3d(${width / 2 - pos}px,0,0)` }}
      >
        {tiles.map((c, i) => (
          <div
            key={i}
            className={cn(
              "flex h-[4.5rem] w-16 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold transition-shadow",
              colorClass[c],
              done && i === landedIndex && "ring-4 ring-primary",
            )}
          >
            {c === "GREEN" ? "14x" : ""}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_12px_var(--primary)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent" />
    </div>
  );
});

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
let lastWidth = 0;
import type { RlColor, RlGame } from "@/lib/roulette/api";
import { cn } from "@/lib/utils";
import { COIN, CoinImg } from "./coins";

const TILE = 116; // px, includes gap
// Eight wheel copies still give the roll a long runway while keeping a third
// fewer transformed/image nodes alive than the previous twelve copies.
const REPEATS = 8;
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
  const [width, setWidth] = useState(lastWidth || 800);
  const track = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  useIso(() => {
    const el = wrap.current;
    if (!el) return;
    const set = () => { lastWidth = el.clientWidth; setWidth(el.clientWidth); };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = layout.length;
  const slot = game?.winning_slot;
  const start = game?.spin_start_at ? new Date(game.spin_start_at).getTime() : 0;
  const end = game?.spin_end_at ? new Date(game.spin_end_at).getTime() : 0;
  const spinning = slot != null && (game?.status === "SPINNING" || game?.status === "SETTLEMENT" || game?.status === "COMPLETED");

  // Stable per-round landing offset inside the tile (deterministic from id so all viewers match).
  const jitter = game ? ((Number(game.id) * 37) % 40) - 20 : 0;
  const target = slot != null ? (n * (REPEATS - 2) + slot) * TILE + TILE / 2 + jitter : 0;
  const base = (n * 2) * TILE + TILE / 2;
  const posAt = (ms: number) => {
    if (!(spinning && end > start)) return base;
    const t = Math.min(1, Math.max(0, (ms - start) / (end - start)));
    // Brisk start, then a long, gradual slowdown over the final 70% for suspense.
    const e = t < 0.3 ? (0.55 * t) / 0.3 : 0.55 + 0.45 * (1 - Math.pow(1 - (t - 0.3) / 0.7, 3));
    return base + (target - base) * e;
  };
  const pos = posAt(now());

  // Per-frame motion writes the transform directly (no React re-render of ~180 tiles per frame).
  useEffect(() => {
    if (!spinning) return;
    let raf = 0;
    let wasDone = now() >= end;
    const loop = () => {
      const t = now();
      if (track.current) track.current.style.transform = `translate3d(${width / 2 - posAt(t)}px,0,0)`;
      if (!wasDone && t >= end) { wasDone = true; force((x) => x + 1); }
      if (t < end + 50) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinning, start, end, target, width, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = spinning && now() >= end;
  const landedIndex = n * (REPEATS - 2) + (slot ?? 0);
  const tileEls = useMemo(
    () =>
      Array.from({ length: n * REPEATS }, (_, i) => {
        const c = layout[i % n]!;
        const win = done && i === landedIndex;
        return (
          <div
            key={i}
            className={cn(
              "relative flex h-[108px] w-[108px] shrink-0 items-center justify-center rounded-full transition-all duration-500",
              done && !win && "opacity-35",
              win && "z-10 scale-110",
            )}
            style={win ? { filter: `drop-shadow(0 0 18px ${COIN[c].glow})` } : undefined}
          >
            <CoinImg c={c} size={104} className={cn("rounded-full", win && "scale-110 animate-[pulse_1.8s_ease-in-out_infinite] transition-transform duration-700")} />
          </div>
        );
      }),
    [layout, n, done, landedIndex],
  );

  return (
    <div ref={wrap} className="relative h-[136px] overflow-hidden rounded-2xl border border-border bg-[radial-gradient(ellipse_at_center,var(--surface-2),var(--card))]">
      <div
        ref={track}
        className="absolute top-3.5 flex gap-2 will-change-transform [contain:layout_style]"
        style={{ transform: `translate3d(${width / 2 - pos}px,0,0)` }}
      >
        {tileEls}
      </div>
      <div className="pointer-events-none absolute inset-y-3 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[13px] border-x-transparent border-t-primary" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-card to-transparent" />
    </div>
  );
});

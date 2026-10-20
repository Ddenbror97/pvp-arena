import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RlColor, RlGame } from "@/lib/roulette/api";
import { emitSound } from "@/lib/sound";
import { nextRouletteLand, type LandGate } from "@/lib/sound-cues";
import { cn } from "@/lib/utils";
import { COIN, CoinImg } from "./coins";
import {
  stripClock,
  stripLandOffset,
  stripMetrics,
  stripOffset,
  stripTranslate,
  STRIP_COIN,
  type StripMetrics,
} from "./strip-motion";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

const DESKTOP: StripMetrics = { coin: STRIP_COIN, gap: 8, tile: STRIP_COIN + 8, compact: false };
// Seven copies: three laps. The 15-slot strip traveled four short laps at this
// opening speed; three laps of the 30-slot wheel matches that fast start.
const REPEATS = 7;
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
  const track = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const [metrics, setMetrics] = useState<StripMetrics>(DESKTOP);
  const [, force] = useState(0);
  const n = layout.length;
  const slot = game?.winning_slot;
  // winning_slot is intentionally public from SPINNING onward (bets already locked)
  // so every client targets the same strip land; see AGENTS.md.
  // Betting-window end starts the roll. Official spin times still set duration/land.
  const clock = stripClock(game, now());
  const { start, end, spinning } = clock;

  // The stop varies by round, from the middle of the coin toward its face, and every
  // viewer of a round uses the same fraction of that coin.
  const coinCenter = metrics.coin / 2;
  const edge = stripLandOffset(Number(game?.id ?? 0)) * (metrics.coin / STRIP_COIN);
  const target =
    slot != null ? (n * (REPEATS - 2) + slot) * metrics.tile + coinCenter + edge : null;
  // Half a tile before the landing copy's first coin: every real stop is ahead of it,
  // so steering onto the slot only ever adds forward distance.
  const aim = n * (REPEATS - 2) * metrics.tile + coinCenter - metrics.tile / 2;
  const base = n * 2 * metrics.tile + coinCenter;

  // When this strip was already rolling a round before its slot arrived, remember
  // when the slot showed up so the rest of the roll bends onto it without a jump.
  const gid = Number(game?.id ?? 0);
  const steer = useRef<{ id: number; blind: boolean; at: number | null }>({
    id: 0,
    blind: false,
    at: null,
  });

  const live = useRef({ gid, game, base, target, aim, now });
  live.current = { gid, game, base, target, aim, now };

  useIso(() => {
    const box = wrap.current;
    const el = track.current;
    if (!box || !el) return;
    let raf = 0;
    let alive = true;
    let gate: LandGate = { armedEnd: 0, announcedEnd: -1 };
    let applied = "";
    const paint = () => {
      const width = widthRef.current;
      if (width <= 0) return;
      const m = live.current;
      const ms = m.now();
      const clock = stripClock(m.game, ms);
      if (steer.current.id !== m.gid) steer.current = { id: m.gid, blind: false, at: null };
      const st = steer.current;
      if (clock.spinning && m.target == null && ms > clock.start) st.blind = true;
      if (m.target != null && st.blind && st.at == null) st.at = ms;
      const next = stripTranslate(
        width,
        stripOffset({ ms, ...m, ...clock, steerAt: st.at }),
      );
      if (next !== applied) {
        applied = next;
        el.style.transform = next;
      }
    };
    const frame = () => {
      if (!alive) return;
      const m = live.current;
      const ms = m.now();
      const clock = stripClock(m.game, ms);
      paint();
      const step = nextRouletteLand(gate, clock.end, ms, clock.spinning);
      if (step.gate.announcedEnd !== gate.announcedEnd) {
        if (step.play) emitSound("roulette_land");
        force((tick) => tick + 1);
      }
      gate = step.gate;
      raf = requestAnimationFrame(frame);
    };
    const measure = () => {
      const width = box.getBoundingClientRect().width;
      if (!(width > 0) || Math.abs(width - widthRef.current) < 0.5) return;
      widthRef.current = width;
      const next = stripMetrics(width);
      setMetrics((prev) =>
        prev.coin === next.coin && prev.gap === next.gap && prev.compact === next.compact
          ? prev
          : next,
      );
    };
    measure();
    paint();
    const ro = new ResizeObserver(() => {
      measure();
      paint();
    });
    ro.observe(box);
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [metrics.coin, metrics.tile]);

  const done = spinning && slot != null && now() >= end;
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
              "relative flex shrink-0 items-center justify-center rounded-full",
              done && !win && "opacity-35",
              win && "z-10",
            )}
            style={{
              width: metrics.coin,
              height: metrics.coin,
              filter: win ? `drop-shadow(0 0 18px ${COIN[c].glow})` : undefined,
            }}
          >
            <CoinImg c={c} size={metrics.coin - 4} className="rounded-full" />
          </div>
        );
      }),
    [layout, n, done, landedIndex, metrics.coin],
  );

  return (
    <div
      ref={wrap}
      className="game-stage relative touch-pan-y overflow-clip rounded-2xl border border-line bg-[radial-gradient(ellipse_at_center,var(--surface-2),var(--card))] [&_*]:touch-pan-y"
      style={{ height: metrics.coin + (metrics.compact ? 28 : 16) }}
    >
      <div
        ref={track}
        className="absolute flex will-change-transform"
        style={{ top: 14, gap: metrics.gap }}
      >
        {tileEls}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-5 -translate-x-1/2"
      >
        <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 rounded-full bg-primary/50 opacity-90 blur-[6px]" />
        <div
          className="absolute inset-y-1 left-1/2 w-[3px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.85 0.22 300) 0%, oklch(0.72 0.28 304) 45%, oklch(0.55 0.24 300) 100%)",
            boxShadow:
              "0 0 6px 1px oklch(0.92 0.08 300), 0 0 16px 4px oklch(0.68 0.28 304), 0 0 28px 8px oklch(0.58 0.26 308 / 0.65)",
          }}
        />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-x-[11px] border-t-[14px] border-x-transparent border-t-primary drop-shadow-[0_0_10px_var(--primary)]" />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-card to-transparent",
          metrics.compact ? "w-4" : "w-24",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l from-card to-transparent",
          metrics.compact ? "w-4" : "w-24",
        )}
      />
    </div>
  );
});

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RlColor, RlGame } from "@/lib/roulette/api";
import { emitSound } from "@/lib/sound";
import { nextRouletteLand, type LandGate } from "@/lib/sound-cues";
import { cn } from "@/lib/utils";
import { COIN, CoinImg } from "./coins";
import {
  stripClock,
  stripLandOffset,
  stripOffset,
  stripTranslate,
  STRIP_COIN,
  type StripMetrics,
} from "./strip-motion";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
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
  const metricsRef = useRef<StripMetrics>({
    coin: STRIP_COIN,
    gap: 8,
    tile: STRIP_COIN + 8,
    compact: false,
  });
  const [placed, setPlaced] = useState(false);
  const [, force] = useState(0);
  const n = layout.length;
  const slot = game?.winning_slot;
  // winning_slot is intentionally public from SPINNING onward (bets already locked)
  // so every client targets the same strip land; see AGENTS.md.
  // Betting-window end starts the roll. Official spin times still set duration/land.
  const clock = stripClock(game, now());
  const { end, spinning } = clock;

  // The stop varies by round, from the middle of the coin toward its face, and every
  // viewer of a round uses the same fraction of that coin.
  // When this strip was already rolling a round before its slot arrived, remember
  // when the slot showed up so the rest of the roll bends onto it without a jump.
  const gid = Number(game?.id ?? 0);
  const steer = useRef<{ id: number; blind: boolean; at: number | null }>({
    id: 0,
    blind: false,
    at: null,
  });

  const live = useRef({ gid, game, n, slot, now });
  live.current = { gid, game, n, slot, now };

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
      const metrics = metricsRef.current;
      if (width <= 0 || !(metrics.coin > 0)) return false;
      const m = live.current;
      const ms = m.now();
      const clock = stripClock(m.game, ms);
      const coinCenter = metrics.coin / 2;
      const edge = stripLandOffset(m.gid) * (metrics.coin / STRIP_COIN);
      const target =
        m.slot != null ? (m.n * (REPEATS - 2) + m.slot) * metrics.tile + coinCenter + edge : null;
      const aim = m.n * (REPEATS - 2) * metrics.tile + coinCenter - metrics.tile / 2;
      const base = m.n * 2 * metrics.tile + coinCenter;
      if (steer.current.id !== m.gid) steer.current = { id: m.gid, blind: false, at: null };
      const st = steer.current;
      if (clock.spinning && target == null && ms > clock.start) st.blind = true;
      if (target != null && st.blind && st.at == null) st.at = ms;
      const next = stripTranslate(
        width,
        stripOffset({ ms, base, target, aim, ...clock, steerAt: st.at }),
      );
      if (next !== applied) {
        applied = next;
        el.style.transform = next;
      }
      return true;
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
      const coinEl = el.querySelector<HTMLElement>("[data-coin]");
      const coin = coinEl?.getBoundingClientRect().width ?? 0;
      if (!(width > 0) || !(coin > 0)) return;
      const gap = Number.parseFloat(getComputedStyle(el).columnGap);
      const safeGap = Number.isFinite(gap) ? gap : 8;
      const next: StripMetrics = {
        coin,
        gap: safeGap,
        tile: coin + safeGap,
        compact: width < (STRIP_COIN + 8) * 4,
      };
      const sameWidth = Math.abs(width - widthRef.current) < 0.5;
      const sameSize =
        Math.abs(next.coin - metricsRef.current.coin) < 0.5 &&
        Math.abs(next.gap - metricsRef.current.gap) < 0.5;
      if (widthRef.current > 0 && sameWidth && sameSize) return;
      widthRef.current = width;
      metricsRef.current = next;
    };
    measure();
    if (paint()) setPlaced(true);
    const ro = new ResizeObserver(() => {
      measure();
      if (paint()) setPlaced(true);
    });
    ro.observe(box);
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

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
            data-coin=""
            className={cn(
              "roulette-coin relative flex shrink-0 items-center justify-center rounded-full",
              done && !win && "opacity-35",
              win && "z-10",
            )}
            style={win ? { filter: `drop-shadow(0 0 18px ${COIN[c].glow})` } : undefined}
          >
            <CoinImg c={c} fluid className="roulette-coin-img rounded-full" />
          </div>
        );
      }),
    [layout, n, done, landedIndex],
  );

  return (
    <div className="roulette-rail-slot">
      <div
        ref={wrap}
        data-spinning={spinning ? "1" : undefined}
        suppressHydrationWarning
        className={cn(
          "roulette-rail game-stage relative touch-pan-y overflow-clip rounded-2xl border border-line bg-[radial-gradient(ellipse_at_center,var(--surface-2),var(--card))] [&_*]:touch-pan-y",
          placed && "is-set",
        )}
        style={{ ["--rail-laps" as string]: String(n * 2) }}
      >
        <div ref={track} className="roulette-rail-track absolute flex will-change-transform">
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
        <div className="roulette-rail-fade pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-card to-transparent" />
        <div className="roulette-rail-fade pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l from-card to-transparent" />
      </div>
    </div>
  );
});

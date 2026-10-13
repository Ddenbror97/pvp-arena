import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { PAYLINES, REELS, ROWS, SYMBOLS, WILD, type LineWin } from "@/lib/slott/paytable";
import { SYMBOL_IMG } from "@/lib/slott/symbols";
import { formatUsd } from "@/lib/jackpot/math";
import { cn } from "@/lib/utils";
import { hitsDoneMs, LINE_DRAW_MS, lineColor, orderLines, reachMs, winLevel } from "./hits";
import { useCountUp } from "./SlotCabinet";
import { reelValues, TALLY_STEP_MS, tallyStartMs } from "./tally";

const TIER: Record<string, string> = {
  WILD: "WILD BONUS",
  MEGA_WILD: "MEGA WILD",
  GOLDEN_WILD: "GOLDEN WILD",
  JACKPOT_WILD: "JACKPOT WILD",
};

/** Everything that plays after the reels land. Remount (key) per spin to replay. */
export const SpinFx = memo(function SpinFx({
  grid,
  lines,
  score,
  bonus,
  who,
  target,
  onTarget,
}: {
  grid: number[];
  lines: LineWin[];
  score: number;
  bonus?: { tier: string; cents: number } | null | undefined;
  who?: string | undefined;
  /** Final spin: points this spin needs to win the match outright. */
  target?: number | null | undefined;
  onTarget?: (() => void) | undefined;
}) {
  const ordered = orderLines(lines);
  const lineScore = lines.reduce((a, l) => a + l.score, 0);
  const level = winLevel(lineScore, !!bonus);
  const best = ordered[ordered.length - 1];
  const done = hitsDoneMs(lines);
  const bannerAt = level >= 2 ? done + 80 : 0;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg">
      {level >= 2 ? (
        <div className="slott-flash absolute inset-0" style={{ animationDelay: `${bannerAt}ms` }} />
      ) : null}
      {level >= 2 ? (
        <div
          className={
            level === 3
              ? "slott-marquee slott-marquee-mega absolute inset-0"
              : "slott-marquee absolute inset-0"
          }
        />
      ) : null}
      {ordered.length ? (
        <svg
          viewBox="0 0 500 400"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {ordered.map((l, i) => {
            const rows = PAYLINES[l.line - 1]!;
            const pts = rows
              .slice(0, l.count)
              .map((row, reel) => `${reel * 100 + 50},${row * 100 + 50}`);
            const color = lineColor(l.line);
            return (
              <g
                key={l.line}
                style={
                  {
                    "--d": `${reachMs(i, 0, l.count)}ms`,
                    "--draw": `${LINE_DRAW_MS}ms`,
                  } as CSSProperties
                }
                className="slott-line"
              >
                <polyline
                  points={pts.join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={14}
                  strokeOpacity={0.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                />
                <polyline
                  points={pts.join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                />
                <polyline
                  points={pts.join(" ")}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                />
                {pts.map((p, j) => {
                  const [x, y] = p.split(",");
                  return (
                    <circle
                      key={j}
                      cx={x}
                      cy={y}
                      r={9}
                      fill={color}
                      className="slott-line-dot"
                      style={{ animationDelay: `${reachMs(i, j, l.count)}ms` }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      ) : null}
      {ordered.map((l, i) => {
        const rows = PAYLINES[l.line - 1]!;
        const reel = l.count - 1;
        const left = Math.min(88, ((reel * 100 + 50) / 500) * 100 + 7);
        const top = ((rows[reel]! * 100 + 50) / 400) * 100;
        return (
          <span
            key={l.line}
            className="slott-line-tag tabular absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 font-display text-[10px] text-black sm:px-2 sm:text-xs"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              background: lineColor(l.line),
              animationDelay: `${reachMs(i, reel, l.count) + 60}ms`,
            }}
          >
            +{l.score}
          </span>
        );
      })}

      {level === 3 ? (
        <div
          className="slott-rays absolute left-1/2 top-1/2 h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2"
          style={{ animationDelay: `${bannerAt}ms` }}
        />
      ) : null}
      {level >= 2 ? <Coins n={level === 3 ? 26 : 14} delay={bannerAt} /> : null}

      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center text-center">
          {bonus ? (
            <div className="slott-banner" style={{ animationDelay: `${bannerAt}ms` }}>
              <div className="slott-banner-title font-display text-[clamp(1.4rem,6vw,3rem)] leading-none">
                {TIER[bonus.tier] ?? bonus.tier}
              </div>
              <div className="tabular mt-1 rounded-full bg-black/60 px-3 py-0.5 font-display text-[clamp(0.8rem,2.6vw,1.15rem)] text-gold">
                +{formatUsd(bonus.cents)} to the pot
              </div>
            </div>
          ) : level >= 2 ? (
            <div className="slott-banner" style={{ animationDelay: `${bannerAt}ms` }}>
              <div className="slott-banner-title font-display text-[clamp(1.5rem,6.5vw,3.2rem)] leading-none">
                {level === 3 ? "MEGA WIN" : "BIG WIN"}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <Tally
        grid={grid}
        lines={lines}
        score={score}
        label={best ? `${best.count}× ${SYMBOLS[best.symbol]!.name}` : who}
        icon={best?.symbol}
        target={target}
        onTarget={onTarget}
      />
    </div>
  );
});

/** Reel-by-reel cash-in of the spin's points, ending on the exact server score. */
function Tally({
  grid,
  lines,
  score,
  label,
  icon,
  target,
  onTarget,
}: {
  grid: number[];
  lines: LineWin[];
  score: number;
  label?: string | undefined;
  icon?: number | undefined;
  target?: number | null | undefined;
  onTarget?: (() => void) | undefined;
}) {
  const values = reelValues(grid);
  const lineScore = lines.reduce((a, l) => a + l.score, 0);
  const start = tallyStartMs(lines);
  const [step, setStep] = useState(-1);
  useEffect(() => {
    const timers = values.map((_, i) => setTimeout(() => setStep(i), start + i * TALLY_STEP_MS));
    return () => timers.forEach(clearTimeout);
    // One run per mount (SpinFx remounts per spin).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const running =
    step < 0
      ? 0
      : step >= REELS - 1
        ? score
        : lineScore + values.slice(0, step + 1).reduce((a, v) => a + v, 0);
  const shown = useCountUp(running, 160);
  const hit = target != null && target > 0 && running >= target;
  const told = useRef(false);
  useEffect(() => {
    if (hit && !told.current) {
      told.current = true;
      onTarget?.();
    }
  }, [hit, onTarget]);
  return (
    <>
      {step >= 0
        ? values.slice(0, step + 1).map((_, r) => (
            <div
              key={r}
              className="slott-tally-col absolute inset-y-0"
              style={{ left: `${r * 20}%`, width: "20%" }}
            >
              {grid.slice(r * ROWS, r * ROWS + ROWS).map((s, row) =>
                (SYMBOLS[s]?.value ?? 0) >= 2 ? (
                  <span
                    key={row}
                    className={cn(
                      "slott-tally-tag tabular absolute left-1/2 rounded-full px-1.5 font-display text-[10px] leading-4 sm:text-xs sm:leading-5",
                      s === WILD ? "bg-gold text-black" : "bg-black/75 text-primary-soft",
                    )}
                    style={{ top: `${row * 25 + 18}%` }}
                  >
                    +{SYMBOLS[s]!.value}
                  </span>
                ) : null,
              )}
            </div>
          ))
        : null}
      {target != null ? <TargetChip target={target} running={running} live={step >= 0} /> : null}
      {step >= 0 ? (
        <div className="absolute inset-x-0 bottom-[8%] flex justify-center">
          <div
            className={cn(
              "slott-tally-pill flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 backdrop-blur-sm",
              step >= REELS - 1 && "slott-tally-done",
              hit && "ring-2 ring-gold",
            )}
          >
            {icon != null ? (
              <img src={SYMBOL_IMG[icon]} alt="" className="h-6 w-6 sm:h-7 sm:w-7" />
            ) : null}
            <span className="tabular font-display text-lg text-white sm:text-2xl">+{shown}</span>
            {label ? (
              <span className="max-w-[9rem] truncate text-[10px] font-semibold uppercase tracking-wider text-primary-soft sm:text-xs">
                {label}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Final spin target. Before and during the spin it shows what's needed; during the tally it fills. */
export function TargetChip({
  target,
  running = 0,
  live = false,
  label = "FINAL SPIN",
}: {
  target: number;
  running?: number;
  live?: boolean;
  label?: string;
}) {
  const hit = target > 0 && running >= target;
  const pct = target > 0 ? Math.min(100, (running / target) * 100) : 100;
  return (
    <div className="absolute inset-x-0 top-[5%] flex justify-center">
      <div
        className={cn(
          "slott-target min-w-[11rem] overflow-hidden rounded-xl border px-3 py-1 text-center backdrop-blur-sm",
          hit ? "slott-target-hit border-gold/80 bg-gold/20" : "border-primary/50 bg-black/70",
        )}
      >
        <div
          className={cn(
            "text-[9px] font-semibold tracking-[0.18em] sm:text-[10px]",
            hit ? "text-gold" : "text-primary-soft",
          )}
        >
          {hit ? "TARGET HIT" : label}
        </div>
        <div className="tabular font-display text-sm leading-tight text-white sm:text-base">
          {target > 0
            ? live
              ? `${Math.min(running, target)} / ${target}`
              : `NEEDS ${target}`
            : "ALREADY AHEAD"}
        </div>
        {target > 0 && live ? (
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-150",
                hit ? "bg-gold" : "bg-primary-soft",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Coins({ n, delay }: { n: number; delay: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = ((i * 37) % 100) - 50;
        const d = 800 + ((i * 53) % 700);
        return (
          <span
            key={i}
            className="slott-coin absolute left-1/2 top-1/2"
            style={
              {
                "--dx": `${x * 3.2}px`,
                "--dy": `${-70 - ((i * 29) % 130)}px`,
                animationDelay: `${delay + ((i * 41) % 320)}ms`,
                animationDuration: `${d}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </>
  );
}

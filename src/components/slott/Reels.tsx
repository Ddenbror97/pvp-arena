import { memo, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { REELS, ROWS, WILD, SYMBOLS } from "@/lib/slott/paytable";
import { SYMBOL_IMG } from "@/lib/slott/symbols";
import { cn } from "@/lib/utils";
import { reelStops, teases, type ReelSpin } from "./timing";
import type { HitCell } from "./hits";

const FILLER_BASE = 14;
const FILLER_STEP = 5;
const TEASE_EXTRA = 12;

/** Deterministic, cosmetic filler: WILDs and high-value symbols flash past often. */
function filler(seed: number, reel: number, n: number): number[] {
  let x = (seed * 2654435761 + reel * 40503 + 17) >>> 0;
  const flashy = [WILD, 17, 19, 11, 16, 8, 12];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out.push(x % 5 === 0 ? flashy[(x >>> 8) % flashy.length]! : (x >>> 11) % SYMBOLS.length);
  }
  return out;
}

export const Reels = memo(function Reels({
  spin,
  grid,
  highlight,
  landed,
  fx,
  seamless,
  className,
}: {
  spin: ReelSpin | null;
  grid: number[];
  highlight: Map<number, HitCell>;
  landed: boolean;
  /** Overlay drawn above the reels (paylines, win callouts). */
  fx?: ReactNode;
  /** One continuous reel window with hairline dividers instead of five boxed columns. */
  seamless?: boolean;
  className?: string;
}) {
  const stops = spin ? reelStops(spin.grid, spin.durationMs) : null;
  const tease = !!spin && teases(spin.grid);
  return (
    <div className={cn("relative", className)}>
      <div className={cn("grid grid-cols-5", seamless ? "slott-reel-window overflow-hidden rounded-lg sm:rounded-xl" : "gap-1 sm:gap-1.5")}>
        {Array.from({ length: REELS }, (_, r) => (
          <Reel
            key={r}
            reel={r}
            spin={spin}
            stop={stops?.[r] ?? 0}
            teaseFrom={tease && r >= 3 ? stops![2]! : null}
            column={grid.slice(r * ROWS, r * ROWS + ROWS)}
            highlight={highlight}
            landed={landed}
            seamless={seamless}
          />
        ))}
      </div>
      {fx ? <div className="slott-fx contents">{fx}</div> : null}
    </div>
  );
});

function Reel({
  reel,
  spin,
  stop,
  teaseFrom,
  column,
  highlight,
  landed,
  seamless,
}: {
  reel: number;
  spin: ReelSpin | null;
  stop: number;
  teaseFrom: number | null;
  column: number[];
  highlight: Map<number, HitCell>;
  landed: boolean;
  seamless?: boolean | undefined;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const ran = useRef<string | null>(null);
  const k = FILLER_BASE + reel * FILLER_STEP + (teaseFrom != null ? TEASE_EXTRA : 0);
  const cells = spin ? [...spin.prev.slice(reel * ROWS, reel * ROWS + ROWS), ...filler(spin.grid.reduce((a, b) => a * 31 + b, reel), reel, k), ...column] : column;
  // CSS delays are relative to when the style was first applied, so pin the offset per spin.
  const mount = useRef<{ key: string; since: number } | null>(null);
  if (spin && mount.current?.key !== spin.key) mount.current = { key: spin.key, since: Date.now() - spin.startAt };
  const since = spin ? mount.current!.since : Infinity;
  const live = !!spin && since < stop;

  useLayoutEffect(() => {
    const el = strip.current;
    if (!el || !spin || ran.current === spin.key) return;
    ran.current = spin.key;
    const elapsed = Date.now() - spin.startAt;
    if (elapsed >= stop) return;
    const total = cells.length;
    const end = -((total - ROWS) / total) * 100;
    const over = (0.22 / total) * 100;
    const anim = el.animate(
      [
        { transform: "translateY(0%)", filter: "blur(0px)", offset: 0 },
        { transform: `translateY(${(1 / total) * 30}%)`, filter: "blur(0px)", offset: 0.04 },
        { transform: `translateY(${end * 0.14}%)`, filter: "blur(2px)", offset: 0.16 },
        { transform: `translateY(${end - over}%)`, filter: "blur(0.8px)", offset: 0.9 },
        { transform: `translateY(${end + over * 0.35}%)`, filter: "blur(0px)", offset: 0.96 },
        { transform: `translateY(${end}%)`, filter: "blur(0px)", offset: 1 },
      ],
      { duration: stop, delay: -elapsed, easing: "cubic-bezier(0.3, 0.05, 0.25, 1)", fill: "backwards" },
    );
    return () => anim.cancel();
    // cells are derived from spin; the key guards re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.key]);

  const at = (ms: number) => `${Math.round(ms - since)}ms`;
  const teaseStyle: CSSProperties | undefined =
    live && teaseFrom != null ? { animation: `slott-tease ${stop - teaseFrom}ms linear ${at(teaseFrom)} both` } : undefined;

  return (
    <div className={cn("relative aspect-[1/4] overflow-hidden", seamless ? "slott-reel-seam" : "slott-reel rounded-md sm:rounded-lg")}>
      <div
        ref={strip}
        className="absolute inset-x-0 top-0 will-change-transform"
        style={{ height: `${(cells.length / ROWS) * 100}%`, transform: spin ? `translateY(-${((cells.length - ROWS) / cells.length) * 100}%)` : undefined }}
      >
        {cells.map((s, i) => {
          const row = i - (cells.length - ROWS);
          const cell = reel * ROWS + row;
          const final = row >= 0;
          const h = final && landed ? highlight.get(cell) : undefined;
          const hit = !!h;
          const vars = h ? ({ "--d": `${h.delay}ms`, "--c": h.color } as CSSProperties) : undefined;
          return (
            <div key={i} data-rarity={SYMBOLS[s]!.rarity} className="slott-cell relative flex items-center justify-center" style={{ height: `${100 / cells.length}%` }}>
              {hit ? (
                <>
                  <span aria-hidden className="slott-hit-ring" style={vars} />
                  <span aria-hidden className="slott-shock" style={vars} />
                  <span aria-hidden className="slott-spark" style={vars} />
                </>
              ) : null}
              <img
                src={SYMBOL_IMG[s]}
                alt={final ? SYMBOLS[s]!.name : ""}
                draggable={false}
                style={vars}
                className={cn(
                  "relative select-none object-contain transition-[filter,opacity] duration-300",
                  final && landed && s === WILD && "slott-wild-glow",
                  hit && (h.big ? "slott-hit slott-hit-big" : "slott-hit"),
                  final && landed && highlight.size > 0 && !hit && "opacity-40 saturate-50",
                )}
              />
            </div>
          );
        })}
      </div>
      {live ? (
        <div key={spin!.key} aria-hidden className="pointer-events-none absolute inset-0">
          <div className="slott-reel-sheen absolute inset-0" style={{ animation: `slott-fade-out ${stop}ms linear ${at(0)} both` }} />
          {teaseStyle ? <div className="slott-tease-glow absolute inset-0" style={teaseStyle} /> : null}
          <div className="slott-stop-flash absolute inset-0" style={{ animationDelay: at(stop - 40) }} />
        </div>
      ) : null}
    </div>
  );
}

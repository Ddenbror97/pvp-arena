import { memo, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { BOMB, REELS, ROWS, WILD, SYMBOLS } from "@/lib/slott/paytable";
import { warmSlotStage, SLOT_STAGE } from "@/lib/slott/stage";
import { SYMBOL_IMG } from "@/lib/slott/symbols";
import { cn } from "@/lib/utils";
import { reelStops, teases, type ReelSpin } from "./timing";
import type { HitCell } from "./hits";
import { prefersReducedMotion, spinAccent } from "./presentation";
import { claimReelRun, reelStrip, releaseReelRun } from "./reel-run";

const FILLER_BASE = 14;
const FILLER_STEP = 5;

warmSlotStage();

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
  const stops = spin && !spin.pending ? reelStops(spin.grid, spin.durationMs) : null;
  const tease = !!spin && !spin.pending && teases(spin.grid);
  const calm = prefersReducedMotion();
  const spinNo = Number(spin?.key.split(":").pop());
  const accent = spinAccent(Number.isFinite(spinNo) ? spinNo : 0);
  const spinning = !!spin && !landed && !calm;
  return (
    <div
      className={cn("slott-reels relative", className)}
      data-live={spinning ? "true" : "false"}
      style={{ "--slott-accent": accent } as CSSProperties}
    >
      <div
        className={cn(
          "relative grid grid-cols-5",
          seamless
            ? "slott-reel-window overflow-hidden rounded-lg sm:rounded-xl"
            : "gap-1 sm:gap-1.5",
        )}
      >
        <img
          src={SLOT_STAGE}
          alt=""
          width={1024}
          height={850}
          draggable={false}
          decoding="sync"
          fetchPriority="high"
          className="slott-stage pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover"
        />
        <div aria-hidden className="slott-stage-scrim pointer-events-none absolute inset-0 z-0" />
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
            calm={calm}
            seamless={seamless}
          />
        ))}
      </div>
      {fx ? <div className="slott-fx pointer-events-none absolute inset-0 z-20">{fx}</div> : null}
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
  calm,
  seamless,
}: {
  reel: number;
  spin: ReelSpin | null;
  stop: number;
  teaseFrom: number | null;
  column: number[];
  highlight: Map<number, HitCell>;
  landed: boolean;
  calm: boolean;
  seamless?: boolean | undefined;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const ran = useRef<string | null>(null);
  const k = FILLER_BASE + reel * FILLER_STEP;
  const head = spin ? spin.prev.slice(reel * ROWS, reel * ROWS + ROWS) : [];
  const blur = spin
    ? filler(
        spin.prev.reduce((a, b) => a * 31 + b, reel),
        reel,
        k,
      )
    : [];
  const cells = reelStrip(
    spin ? { pending: !!spin.pending, head, filler: blur, column } : null,
    column,
  );
  // CSS delays are relative to when the style was first applied, so pin the offset per spin.
  const mount = useRef<{ key: string; since: number } | null>(null);
  if (spin && mount.current?.key !== spin.key)
    mount.current = { key: spin.key, since: Date.now() - spin.startAt };
  const since = spin ? mount.current!.since : Infinity;
  const live = !!spin && !calm && (spin.pending || since < stop);

  useLayoutEffect(() => {
    const el = strip.current;
    if (!el || !spin) return;
    const token = spin.pending ? `${spin.key}:loop` : spin.key;
    if (!claimReelRun(ran, token)) return;
    const travel = spin.pending ? stop : Math.max(stop, 400);
    const total = cells.length;
    const end = -((total - ROWS) / total) * 100;
    if (calm) {
      if (!spin.pending) el.style.transform = `translateY(${end}%)`;
      return () => releaseReelRun(ran, token);
    }
    const cell = 100 / total;
    const anim = spin.pending
      ? el.animate([{ transform: "translateY(0%)" }, { transform: `translateY(${end}%)` }], {
          duration: Math.max(480, Math.round(spin.durationMs * 0.42)),
          iterations: Infinity,
          easing: "linear",
        })
      : el.animate(
          [
            { transform: "translateY(0%)", offset: 0 },
            { transform: `translateY(${cell * 0.28}%)`, offset: 0.055 },
            { transform: `translateY(${end * 0.1}%)`, offset: 0.2 },
            { transform: `translateY(${end * 0.7}%)`, offset: 0.58 },
            { transform: `translateY(${end * 0.94}%)`, offset: 0.8 },
            { transform: `translateY(${end - cell * 0.42}%)`, offset: 0.91 },
            { transform: `translateY(${end + cell * 0.1}%)`, offset: 0.965 },
            { transform: `translateY(${end}%)`, offset: 1 },
          ],
          {
            duration: travel,
            easing: "linear",
            fill: "forwards",
          },
        );
    return () => {
      anim.cancel();
      releaseReelRun(ran, token);
    };
    // cells are derived from spin; the key guards re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.key, spin?.pending, stop]);

  const at = (ms: number) => `${Math.round(ms - since)}ms`;
  const teaseStyle: CSSProperties | undefined =
    live && teaseFrom != null
      ? { animation: `slott-tease ${stop - teaseFrom}ms linear ${at(teaseFrom)} both` }
      : undefined;

  return (
    <div
      className={cn(
        "relative z-[1] aspect-[1/4] overflow-hidden",
        seamless ? "slott-reel-seam" : "slott-reel rounded-md sm:rounded-lg",
        live && "slott-reel-live",
      )}
    >
      <div
        ref={strip}
        className="slott-strip absolute inset-x-0 top-0"
        style={{
          height: `${(cells.length / ROWS) * 100}%`,
          transform:
            spin && !spin.pending && landed
              ? `translateY(-${((cells.length - ROWS) / cells.length) * 100}%)`
              : undefined,
        }}
      >
        {cells.map((s, i) => {
          const row = i - (cells.length - ROWS);
          const cell = reel * ROWS + row;
          const final = row >= 0;
          const sym = SYMBOLS[s];
          const h = final && landed ? highlight.get(cell) : undefined;
          const hit = !!h;
          const vars = h ? ({ "--d": `${h.delay}ms`, "--c": h.color } as CSSProperties) : undefined;
          return (
            <div
              key={i}
              data-rarity={sym?.rarity ?? "legendary"}
              className="slott-cell relative flex items-center justify-center"
              style={{ height: `${100 / cells.length}%` }}
            >
              {hit ? (
                <>
                  <span aria-hidden className="slott-hit-ring" style={vars} />
                  <span aria-hidden className="slott-shock" style={vars} />
                  <span aria-hidden className="slott-spark" style={vars} />
                </>
              ) : null}
              <img
                src={SYMBOL_IMG[s]}
                alt={final ? (sym?.name ?? "Bomb") : ""}
                draggable={false}
                decoding={final ? "sync" : "async"}
                style={vars}
                className={cn(
                  "relative select-none object-contain",
                  !live && "transition-[filter,opacity] duration-300",
                  s === BOMB && "slott-bomb-symbol",
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
          <div
            className="slott-reel-sheen absolute inset-0"
            style={{ animation: `slott-fade-out ${stop}ms linear ${at(0)} both` }}
          />
          <div
            className="slott-streak absolute inset-0"
            style={{
              animation: `slott-fade-out ${Math.max(120, stop - 80)}ms linear ${at(0)} both`,
            }}
          />
          {teaseStyle ? (
            <div className="slott-tease-glow absolute inset-0" style={teaseStyle} />
          ) : null}
          <div
            className="slott-stop-flash absolute inset-0"
            style={{ animationDelay: at(stop - 40) }}
          />
        </div>
      ) : null}
    </div>
  );
}

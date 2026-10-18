import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { timelineState, type TimelineState } from "@/lib/prestige/progress";
import type { PrestigeLevel, PrestigeState } from "@/lib/prestige/api";
import { ArtStage } from "./frames";
import { CosmeticArt, rewardAccent, rewardRarity } from "./CosmeticCollection";
import { cn } from "@/lib/utils";

export function RewardStage({
  row,
  locked,
  className,
  size,
  animated,
}: {
  row: PrestigeLevel;
  locked?: boolean | undefined;
  className?: string | undefined;
  size: number;
  animated?: boolean | undefined;
}) {
  return (
    <ArtStage
      accent={rewardAccent(row)}
      rarity={rewardRarity(row)}
      locked={locked}
      className={className}
    >
      <span
        className={cn("flex items-center justify-center", locked && "opacity-60 saturate-[.55]")}
      >
        <CosmeticArt row={row} size={size} animated={animated} />
      </span>
    </ArtStage>
  );
}

function statusLabel(state: TimelineState) {
  return state === "current" ? "You are here" : state === "done" ? "Unlocked" : "Locked";
}

export function PrestigeLevelCard({ row, state }: { row: PrestigeLevel; state: TimelineState }) {
  return (
    <article
      data-level={row.level}
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "w-[7.4rem] shrink-0 rounded-xl border bg-card p-2 text-center",
        state === "current" &&
          "border-primary shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
        state === "done" && "border-primary/40",
        state === "locked" && "border-border",
      )}
    >
      <RewardStage row={row} size={58} locked={state === "locked"} className="h-[4.8rem] w-full" />
      <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-muted-foreground">
        Level {row.level}
      </p>
      <p className="truncate text-sm font-semibold">{row.name}</p>
      <p
        className={cn(
          "mt-2 text-[10px] font-semibold uppercase tracking-widest",
          state === "current" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {statusLabel(state)}
      </p>
    </article>
  );
}

function PrestigeLevelRow({ row, state }: { row: PrestigeLevel; state: TimelineState }) {
  return (
    <li
      className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 pb-3 last:pb-0"
      aria-current={state === "current" ? "step" : undefined}
    >
      <span
        className={cn(
          "relative z-10 mt-6 h-3.5 w-3.5 rounded-full border-2",
          state === "locked" ? "border-border bg-background" : "border-primary bg-primary",
        )}
      />
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-2.5",
          state === "current" ? "border-primary bg-primary/5" : "border-border bg-card",
        )}
      >
        <RewardStage
          row={row}
          size={38}
          locked={state === "locked"}
          className="h-11 w-11 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
            Level {row.level}
          </p>
          <p className="truncate text-sm font-semibold">{row.name}</p>
        </div>
        {state === "current" ? (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-primary">
            You
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function PrestigeTimeline({ state }: { state: PrestigeState }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const total = state.levels.length;
  const maxLevel = state.levels.reduce((m, l) => Math.max(m, l.level), 1);
  const from = Math.max(1, Math.min(state.level - 1, maxLevel - 4));
  const nearby = state.levels.filter((l) => l.level >= from && l.level < from + 5);
  const rows = showAll ? state.levels : nearby;

  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const update = () => {
      const max = root.scrollWidth - root.clientWidth;
      setEdges({ start: root.scrollLeft <= 1, end: root.scrollLeft >= max - 1 });
    };
    update();
    root.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => {
      root.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  function page(dir: 1 | -1) {
    const root = scroller.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.scrollBy({ left: dir * root.clientWidth * 0.8, behavior: reduced ? "auto" : "smooth" });
  }

  const arrow =
    "hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 md:inline-flex";

  return (
    <section aria-labelledby="prestige-roadmap">
      <div className="flex items-center justify-between gap-3">
        <h2 id="prestige-roadmap" className="font-display text-sm uppercase tracking-widest">
          Prestige roadmap
        </h2>
        <div className="flex items-center gap-2">
          <p className="tabular text-xs text-muted-foreground">
            Level {state.level} of {maxLevel}
          </p>
          <button
            type="button"
            className={arrow}
            onClick={() => page(-1)}
            disabled={edges.start}
            aria-label="Scroll roadmap left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={arrow}
            onClick={() => page(1)}
            disabled={edges.end}
            aria-label="Scroll roadmap right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative mt-4 hidden md:block">
        <div ref={scroller} className="no-scrollbar overflow-x-auto overscroll-x-contain">
          <div className="flex min-w-max gap-2.5 px-1 py-1">
            {state.levels.map((row) => (
              <PrestigeLevelCard
                key={row.level}
                row={row}
                state={timelineState(row.level, state.level)}
              />
            ))}
          </div>
        </div>
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity",
            edges.start && "opacity-0",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity",
            edges.end && "opacity-0",
          )}
        />
      </div>
      <div className="md:hidden">
        <ol className="relative mt-4" aria-label="Levels">
          <span className="absolute bottom-7 left-[0.4rem] top-7 w-px bg-border" aria-hidden />
          {rows.map((row) => (
            <PrestigeLevelRow
              key={row.level}
              row={row}
              state={timelineState(row.level, state.level)}
            />
          ))}
        </ol>
        {total > nearby.length ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="mt-3 min-h-11 w-full rounded-xl border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showAll ? "Show fewer levels" : `Show all ${total} levels`}
          </button>
        ) : null}
      </div>
    </section>
  );
}

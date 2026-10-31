import { useEffect, useRef, useState } from "react";

const TARGETS = [
  [18, 25],
  [78, 70],
  [33, 80],
  [70, 20],
  [48, 52],
  [15, 72],
  [83, 35],
  [40, 18],
  [65, 82],
  [22, 45],
  [80, 78],
  [48, 28],
  [17, 18],
  [72, 50],
  [40, 75],
] as const;

/** A local repeatable pointing task, not a reaction-time benchmark or ranking. */
export function MouseAccuracyDrill() {
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const [running, setRunning] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startAt = useRef(0);
  const target = TARGETS[hits];
  function start() {
    startAt.current = performance.now();
    setHits(0);
    setMisses(0);
    setElapsed(0);
    setRunning(true);
  }
  function hit() {
    if (!running) return;
    const next = hits + 1;
    setHits(next);
    setElapsed(performance.now() - startAt.current);
    if (next === TARGETS.length) setRunning(false);
  }
  return (
    <section id="calculator" className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6">
      <h2 className="font-display text-2xl">Mouse accuracy drill: 15 targets</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Click each target once. Background clicks count as misses. Keep the window size, mouse
        settings and target sequence constant when comparing your own sessions. Elapsed time
        includes aiming and clicking; it does not measure pure reaction time or predict duel wins.
        Results stay in this page and are not uploaded.
      </p>
      <button
        type="button"
        disabled={!interactive}
        className="my-4 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
        onClick={start}
      >
        {running ? "Restart drill" : "Start drill"}
      </button>
      <div
        className="relative h-72 touch-manipulation overflow-hidden rounded-xl border border-border bg-secondary/40"
        onPointerDown={(event) => {
          if (running && event.button === 0) setMisses((value) => value + 1);
        }}
      >
        {running && target ? (
          <button
            type="button"
            aria-label={`Target ${hits + 1} of 15`}
            className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            style={{ left: `${target[0]}%`, top: `${target[1]}%` }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={hit}
          >
            +
          </button>
        ) : (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {hits === 15
              ? "Drill complete. Review the result or repeat with the same setup."
              : "Start when your pointer and window are ready."}
          </p>
        )}
      </div>
      <output className="mt-4 block text-sm tabular-nums" aria-live="polite">
        {hits} / 15 targets · {misses} misses · Accuracy{" "}
        {hits + misses ? Math.round((hits / (hits + misses)) * 100) : 0}%
        {elapsed > 0 && ` · ${(elapsed / 1000).toFixed(2)} seconds elapsed`}
      </output>
      <p className="mt-2 text-xs text-muted-foreground">
        Touch and keyboard activation also work for accessibility, but do not compare those runs
        with mouse runs. A new target may require an additional Tab press for keyboard navigation.
      </p>
    </section>
  );
}

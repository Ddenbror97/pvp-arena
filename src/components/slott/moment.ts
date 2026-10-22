import { useEffect, useState } from "react";

/** The soonest mark still in the future, or null when every mark has passed. */
export function nextInstant(now: number, marks: readonly number[]): number | null {
  let next: number | null = null;
  for (const mark of marks) {
    if (!Number.isFinite(mark) || mark <= now) continue;
    if (next == null || mark < next) next = mark;
  }
  return next;
}

/**
 * Re-render when the next timestamp is reached.
 * Countdown digits keep their own clock; this one only crosses thresholds.
 */
export function useNextInstant(marks: readonly number[], active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  const key = marks.map((mark) => Math.round(mark)).join("|");
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const arm = () => {
      if (stopped) return;
      const current = Date.now();
      setNow(current);
      const at = nextInstant(
        current,
        key.length > 0 ? key.split("|").map((value) => Number(value)) : [],
      );
      if (at == null) return;
      timer = setTimeout(arm, Math.max(16, at - Date.now()));
    };
    arm();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, key]);
  return now;
}

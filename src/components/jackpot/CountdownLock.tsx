import { useEffect, useRef } from "react";
import { emitSound } from "@/lib/sound";

/** Circumference of the countdown ring (r = 42 inside a 100x100 viewBox). */
const CIRC = 2 * Math.PI * 42;

/** The colour heats up as the wheel gets closer to releasing. */
const TONE: Record<number, string> = {
  3: "text-primary",
  2: "text-gold",
  1: "text-rival",
};

interface Props {
  /** Server-clock ms when the wheel starts spinning. */
  spinAt: number;
  /** Server-synced clock. */
  now: () => number;
}

/**
 * The 3-2-1 that runs once entries close, before the wheel is released.
 * Every screen derives it from the same server-anchored spin start, so all
 * viewers count down together and the wheel moves at the same instant.
 */
export function CountdownLock({ spinAt, now }: Props) {
  const arc = useRef<SVGCircleElement>(null);
  const count = Math.min(3, Math.max(1, Math.ceil((spinAt - now()) / 1000)));
  const last = useRef(count);

  useEffect(() => {
    if (last.current === count) return;
    last.current = count;
    emitSound("spin_tick");
  }, [count]);

  // The ring drains across each second and refills on the next tick. Written
  // straight to the DOM so the smooth sweep costs no React re-render.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const left = spinAt - now();
      const frac = left <= 0 ? 1 : (left % 1000) / 1000;
      if (arc.current) arc.current.style.strokeDashoffset = String(CIRC * (1 - frac));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinAt, now]);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative grid h-24 w-24 place-items-center ${TONE[count] ?? "text-primary"}`}>
        <span aria-hidden className="count-heat absolute inset-3 rounded-full bg-current blur-xl" />
        <span key={count} aria-hidden className="count-shock absolute inset-1" />
        <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="5" />
          <circle
            ref={arc}
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC}
          />
        </svg>
        <span
          key={`n${count}`}
          className="animate-count-slam tabular font-display text-5xl leading-none"
          style={{ textShadow: "0 0 26px currentColor" }}
        >
          {count}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {[3, 2, 1].map((n) => (
          <span
            key={n}
            className={`h-1 rounded-full transition-all duration-300 ${
              n >= count ? "w-4 bg-current opacity-90" : "w-2 bg-current opacity-25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

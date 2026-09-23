import { useMemo } from "react";
import { PLAYER_COLORS } from "./JackpotWheel";

/** Subtle confetti + light burst. Rendered only after a reveal (client-side). */
export function Celebration() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.4 + Math.random() * 1.8,
        dx: `${(Math.random() - 0.5) * 30}vw`,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        w: 5 + Math.random() * 6,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/30 blur-2xl" style={{ animation: "burst 1.4s ease-out both" }} />
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 1.6,
            background: p.color,
            ["--dx" as string]: p.dx,
            animation: `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(0.3, 0.6, 0.5, 1) both`,
          }}
        />
      ))}
    </div>
  );
}

import { useEffect, useMemo, useRef } from "react";
import { avatarSrc } from "@/lib/avatar";
import { wheelSegments } from "@/lib/jackpot/math";
import { JACKPOT_SPIN_MS } from "@/lib/jackpot/reveal";
import { wheelEase } from "@/lib/jackpot/wheel-motion";
import { playerColor } from "@/lib/jackpot/colors";
import type { PlayerRow } from "@/lib/jackpot/api";
import { emitSound } from "@/lib/sound";

const R = 200;
const INNER = 138;

function arcPath(startDeg: number, endDeg: number, r: number, inner: number) {
  const toXY = (deg: number, rad: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [R + rad * Math.cos(a), R + rad * Math.sin(a)];
  };
  const sweep = endDeg - startDeg;
  if (sweep >= 359.999) {
    return `M ${R} ${R - r} A ${r} ${r} 0 1 1 ${R - 0.01} ${R - r} L ${R - 0.01} ${R - inner} A ${inner} ${inner} 0 1 0 ${R} ${R - inner} Z`;
  }
  const large = sweep > 180 ? 1 : 0;
  const [x1, y1] = toXY(startDeg, r);
  const [x2, y2] = toXY(endDeg, r);
  const [x3, y3] = toXY(endDeg, inner);
  const [x4, y4] = toXY(startDeg, inner);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
}

export interface SpinTarget {
  winnerId: string;
  winningTicket: number;
  /** Server-clock ms when the spin begins. Every viewer derives the same position from it. */
  startAt: number;
}

interface Props {
  players: PlayerRow[];
  spin: SpinTarget | null;
  /** Server-synced clock. */
  now: () => number;
  highlightId?: string | null | undefined;
  /** Rotates the palette so the same joiner is not the same color every round. */
  roundId?: number | undefined;
  children?: React.ReactNode;
}

/** Presentation length of the wheel spin. Three seconds longer than the old 7.6s so the spin is the focus. */
export const SPIN_MS = JACKPOT_SPIN_MS;

export function JackpotWheel({ players, spin, now, highlightId, roundId = 0, children }: Props) {
  const segments = useMemo(() => wheelSegments(players), [players]);
  const svg = useRef<SVGSVGElement>(null);
  const nowRef = useRef(now);
  nowRef.current = now;
  const winnerSeg = spin ? segments.find((s) => s.user_id === spin.winnerId) : undefined;

  // Final rotation: land inside the winner's slice at a spot derived from the
  // (already decided) winning ticket, so all viewers land on the same pixel.
  const target = useMemo(() => {
    if (!spin || !winnerSeg) return null;
    const frac = 0.15 + 0.7 * ((spin.winningTicket % 997) / 997);
    const angle = winnerSeg.start + (winnerSeg.end - winnerSeg.start) * frac;
    return 8 * 360 + (360 - angle);
  }, [spin, winnerSeg]);

  const rotAt = (t: number) => {
    if (!spin || target == null) return 0;
    const p = Math.min(1, Math.max(0, (t - spin.startAt) / SPIN_MS));
    return target * wheelEase(p);
  };

  // Clock-driven animation: position depends only on server time, never on
  // when this browser received the result. Hidden tabs resume at the right spot.
  // `now` is read from a ref so a clock correction moves the wheel and the
  // ratchet together without tearing the loop down and leaving the old cue.
  useEffect(() => {
    if (!spin || target == null) {
      if (svg.current) svg.current.style.transform = "rotate(0deg)";
      return;
    }
    let raf = 0;
    let stopped = false;
    const loop = () => {
      const t = nowRef.current();
      if (svg.current) svg.current.style.transform = `rotate(${rotAt(t)}deg)`;
      const elapsed = t - spin.startAt;
      if (elapsed >= 0 && elapsed < SPIN_MS) {
        emitSound("wheel_spin", { elapsedMs: elapsed });
      }
      if (!stopped && elapsed >= SPIN_MS) {
        stopped = true;
        emitSound("spin_stop");
      }
      if (elapsed < SPIN_MS + 50) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      emitSound("spin_stop");
    };
  }, [spin, target]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause the decorative RGB ring while the page scrolls or the wheel is off-screen:
  // repainting the rotating gradient + blur during scroll caused jank on mid-range phones.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let t = 0;
    const onScroll = () => {
      el.dataset["ringPaused"] = "1";
      clearTimeout(t);
      t = window.setTimeout(() => {
        if (el.dataset["visible"] !== "0") delete el.dataset["ringPaused"];
      }, 180);
    };
    const io = new IntersectionObserver(([e]) => {
      el.dataset["visible"] = e?.isIntersecting ? "1" : "0";
      if (e?.isIntersecting) delete el.dataset["ringPaused"];
      else el.dataset["ringPaused"] = "1";
    });
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={box}
      data-panel
      className="game-stage relative mx-auto aspect-square w-full max-w-[min(340px,86vw)] touch-pan-y sm:max-w-[460px] [&_*]:touch-pan-y"
    >
      {/* pointer */}
      <div className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2">
        <div className="h-0 w-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-primary drop-shadow-[0_0_10px_var(--primary)]" />
      </div>
      <div aria-hidden className="rgb-ring rgb-ring-blur" />
      <div aria-hidden className="rgb-ring" />
      <div className="jp-wheel-base absolute inset-0 rounded-full bg-surface ring-1 ring-border" />
      <svg
        ref={svg}
        viewBox={`0 0 ${R * 2} ${R * 2}`}
        suppressHydrationWarning
        className="absolute inset-0 h-full w-full overflow-visible will-change-transform"
        style={{ transform: `rotate(${rotAt(now())}deg)` }}
      >
        {segments.length === 0 && (
          <circle
            cx={R}
            cy={R}
            r={(R + INNER) / 2 - 4}
            fill="none"
            stroke="var(--wheel-tick, var(--border))"
            strokeWidth={R - INNER - 8}
            strokeDasharray="4 10"
          />
        )}
        {segments.map((s, i) => {
          const mid = (s.start + s.end) / 2;
          const a = ((mid - 90) * Math.PI) / 180;
          const rr = (R + INNER) / 2 - 4;
          const dim = highlightId && highlightId !== s.user_id;
          return (
            <g key={s.user_id} opacity={dim ? 0.25 : 1} style={{ transition: "opacity 600ms" }}>
              <path
                d={arcPath(s.start, s.end, R - 8, INNER)}
                fill={playerColor(i, roundId)}
                stroke="var(--background)"
                strokeWidth={2.5}
              />
              {s.end - s.start > 14 && avatarSrc(s.profiles?.avatar_url) && (
                <g
                  transform={`translate(${R + rr * Math.cos(a)} ${R + rr * Math.sin(a)}) rotate(${mid})`}
                >
                  <clipPath id={`clip-${s.user_id}`}>
                    <circle r={15} />
                  </clipPath>
                  <circle r={17} fill="var(--background)" />
                  <image
                    href={avatarSrc(s.profiles?.avatar_url)!}
                    x={-15}
                    y={-15}
                    width={30}
                    height={30}
                    clipPath={`url(#clip-${s.user_id})`}
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="jp-wheel-hub absolute inset-[18%] z-10 flex items-center justify-center rounded-full bg-background ring-1 ring-border">
        {children}
      </div>
    </div>
  );
}

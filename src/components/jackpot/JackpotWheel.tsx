import { useEffect, useMemo, useRef, useState } from "react";
import { wheelSegments } from "@/lib/jackpot/math";
import type { PlayerRow } from "@/lib/jackpot/api";
import { emitSound } from "@/lib/sound";

export const PLAYER_COLORS = Array.from({ length: 12 }, (_, i) => `var(--p${i + 1})`);

export function colorFor(index: number) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

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
}

interface Props {
  players: PlayerRow[];
  spin: SpinTarget | null;
  onSpinEnd?: () => void;
  highlightId?: string | null | undefined;
  children?: React.ReactNode;
}

const SPIN_MS = 7600;

export function JackpotWheel({ players, spin, onSpinEnd, highlightId, children }: Props) {
  const segments = useMemo(() => wheelSegments(players), [players]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const spunFor = useRef<string | null>(null);

  useEffect(() => {
    if (!spin || !segments.length) return;
    const key = `${spin.winnerId}:${spin.winningTicket}`;
    if (spunFor.current === key) return;
    spunFor.current = key;
    const seg = segments.find((s) => s.user_id === spin.winnerId);
    if (!seg) return;
    // Land inside the winner's slice; position within the slice is derived from
    // the (already decided) winning ticket so the reveal is deterministic.
    const frac = 0.15 + 0.7 * ((spin.winningTicket % 997) / 997);
    const angle = seg.start + (seg.end - seg.start) * frac;
    const target = 8 * 360 + (360 - angle);
    setSpinning(true);
    emitSound("spin_start");
    requestAnimationFrame(() => setRotation(target));
    const t = setTimeout(() => {
      setSpinning(false);
      emitSound("spin_stop");
      onSpinEnd?.();
    }, SPIN_MS + 100);
    return () => clearTimeout(t);
  }, [spin, segments, onSpinEnd]);

  useEffect(() => {
    if (!spin) {
      spunFor.current = null;
      setRotation(0);
    }
  }, [spin]);

  return (
    <div data-panel className="relative mx-auto aspect-square w-full max-w-[460px]">
      {/* pointer */}
      <div className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2">
        <div className="h-0 w-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-primary drop-shadow-[0_0_10px_var(--primary)]" />
      </div>
      <div aria-hidden className="rgb-ring rgb-ring-blur" />
      <div aria-hidden className="rgb-ring" />
      <div className="absolute inset-0 rounded-full bg-surface ring-1 ring-border" />
      <svg
        viewBox={`0 0 ${R * 2} ${R * 2}`}
        className="absolute inset-0 h-full w-full will-change-transform"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.72, 0.08, 1)` : "none",
        }}
      >
        {segments.length === 0 && (
          <circle cx={R} cy={R} r={(R + INNER) / 2 - 4} fill="none" stroke="var(--muted)" strokeWidth={R - INNER - 8} strokeDasharray="4 10" />
        )}
        {segments.map((s, i) => {
          const mid = (s.start + s.end) / 2;
          const a = ((mid - 90) * Math.PI) / 180;
          const rr = (R + INNER) / 2 - 4;
          const dim = highlightId && highlightId !== s.user_id;
          return (
            <g key={s.user_id} opacity={dim ? 0.25 : 1} style={{ transition: "opacity 600ms" }}>
              <path d={arcPath(s.start, s.end, R - 8, INNER)} fill={colorFor(i)} stroke="var(--background)" strokeWidth={2.5} />
              {s.end - s.start > 14 && s.profiles?.avatar_url && (
                <g transform={`translate(${R + rr * Math.cos(a)} ${R + rr * Math.sin(a)}) rotate(${mid})`}>
                  <clipPath id={`clip-${s.user_id}`}>
                    <circle r={15} />
                  </clipPath>
                  <circle r={17} fill="var(--background)" />
                  <image href={s.profiles.avatar_url} x={-15} y={-15} width={30} height={30} clipPath={`url(#clip-${s.user_id})`} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-[18%] z-10 flex items-center justify-center rounded-full bg-background/90 ring-1 ring-border backdrop-blur">
        {children}
      </div>
    </div>
  );
}

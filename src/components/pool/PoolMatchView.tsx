import { useEffect, useRef, useState, type ReactNode, type HTMLAttributes } from "react";
import { Crown, MessageSquare } from "lucide-react";
import room from "@/assets/pool/room.webp";
import { arenaLogo } from "@/assets/media";
import { GameChat } from "@/components/chat/GameChat";
import { SHARED_CHAT_ROOM } from "@/lib/chat/config";
import { formatCents } from "@/lib/pool/copy";
import type { RackBall } from "@/lib/pool/presentation";

export function PoolShell({
  children,
  className = "",
  ...props
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <div
      {...props}
      className={`pool-screen${className ? ` ${className}` : ""}`}
      data-chat={chatOpen ? "open" : "closed"}
    >
      <div className="pool-room" style={{ backgroundImage: `url(${room})` }} aria-hidden>
        <img className="pool-room-logo" src={arenaLogo} alt="" />
      </div>
      {children}
      <GameChat gameType={SHARED_CHAT_ROOM} className="pool-chat" />
      <button
        type="button"
        className="pool-chat-toggle"
        aria-expanded={chatOpen}
        onClick={() => setChatOpen((open) => !open)}
      >
        <MessageSquare className="h-4 w-4" aria-hidden />
        {chatOpen ? "Close chat" : "Live chat"}
      </button>
    </div>
  );
}

function ShotClock({ deadline, serverNow }: { deadline: string; serverNow: string | undefined }) {
  const [left, setLeft] = useState(30_000);
  useEffect(() => {
    const skew = serverNow ? Date.now() - Date.parse(serverNow) : 0;
    const tick = () => setLeft(Date.parse(deadline) - (Date.now() - skew));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadline, serverNow]);
  const clock = Math.max(0, Math.ceil(left / 1000));
  return <em aria-label={`Shot clock ${clock} seconds`}>{clock}s</em>;
}

const PIP = ["#f4d35e", "#3a86ff", "#e63946", "#9b5de5", "#f77f00", "#2a9d8f", "#9b2226"];

function pipColor(id: number): string {
  const n = id > 8 ? id - 9 : id - 1;
  return PIP[n] ?? "#cccccc";
}

export function SeatCard({
  name,
  avatar,
  stake,
  stakeLabel,
  rack,
  group,
  ahead,
  present,
  away = false,
  active,
  hand = false,
  deadline,
  serverNow,
  align = "start",
}: {
  name: string;
  avatar?: string | null | undefined;
  stake: number;
  stakeLabel?: string;
  rack: RackBall[];
  group: "solids" | "stripes" | null;
  ahead: boolean;
  present: boolean;
  away?: boolean;
  active: boolean;
  hand?: boolean;
  deadline: string | null;
  serverNow: string | undefined;
  align?: "start" | "end";
}) {
  const initial = name.slice(0, 1).toUpperCase();
  const down = rack.filter((ball) => ball.down).length;
  const groupLabel = group === "solids" ? "solids" : group === "stripes" ? "stripes" : null;
  const slots =
    rack.length > 0
      ? rack
      : Array.from({ length: 7 }, (_, index) => ({ id: -(index + 1), down: false, stripe: false }));
  const rackLabel = groupLabel
    ? `${down} of 7 ${groupLabel} down`
    : present
      ? "Groups not chosen yet"
      : "Waiting for an opponent";
  return (
    <div className={`pool-seat${align === "end" ? " is-end" : ""}`}>
      {align === "end" ? null : (
        <Face avatar={avatar} initial={initial} active={active} present={present} />
      )}
      <span className="pool-seat-copy">
        <strong>
          {ahead ? <Crown className="pool-crown" aria-hidden /> : null}
          {name}
          {away ? " · table" : null}
          {active ? <span className="sr-only">, your turn</span> : null}
          {deadline ? <ShotClock deadline={deadline} serverNow={serverNow} /> : null}
        </strong>
        <small>{stakeLabel ?? formatCents(stake)}</small>
        <span className="pool-down">
          {hand ? "Ball in hand" : groupLabel ? `${down} down` : present ? "Open" : "Waiting"}
        </span>
        <span className="pool-pips" role="img" aria-label={rackLabel}>
          {slots.map((ball) => (
            <i
              key={ball.id}
              className={
                ball.id < 1
                  ? "is-up"
                  : `${ball.down ? "is-down" : "is-up"} ${ball.stripe ? "is-stripe" : "is-solid"}`
              }
              style={ball.id > 0 ? { ["--pip" as string]: pipColor(ball.id) } : undefined}
            >
              {ball.id > 0 ? (
                <span className={ball.id > 9 ? "is-wide" : undefined}>{ball.id}</span>
              ) : null}
            </i>
          ))}
        </span>
      </span>
      {align === "end" ? (
        <Face avatar={avatar} initial={initial} active={active} present={present} />
      ) : null}
    </div>
  );
}

function clampSpin(value: number): number {
  return Math.max(-1000, Math.min(1000, value));
}

export function SpinPad({
  spinX,
  spinY,
  disabled,
  onChange,
}: {
  spinX: number;
  spinY: number;
  disabled: boolean;
  onChange: (spinX: number, spinY: number) => void;
}) {
  const pad = useRef<HTMLDivElement>(null);
  const setFrom = (clientX: number, clientY: number) => {
    const el = pad.current;
    if (!el || disabled) return;
    const rect = el.getBoundingClientRect();
    const max = rect.width * 0.36;
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > max && dist > 0) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    onChange(clampSpin(Math.round((dx / max) * 1000)), clampSpin(Math.round((-dy / max) * 1000)));
  };
  return (
    <div
      ref={pad}
      className="pool-spin"
      role="group"
      aria-label="Spin. Drag the red dot. Up is follow, down is draw, sideways is side spin."
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setFrom(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          setFrom(event.clientX, event.clientY);
      }}
      onDoubleClick={() => onChange(0, 0)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 40 : 120;
        if (event.key === "ArrowLeft") onChange(clampSpin(spinX - step), spinY);
        else if (event.key === "ArrowRight") onChange(clampSpin(spinX + step), spinY);
        else if (event.key === "ArrowUp") onChange(spinX, clampSpin(spinY + step));
        else if (event.key === "ArrowDown") onChange(spinX, clampSpin(spinY - step));
        else if (event.key === "Home") onChange(0, 0);
        else return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <i style={{ left: `${50 + (spinX / 1000) * 36}%`, top: `${50 - (spinY / 1000) * 36}%` }} />
    </div>
  );
}

function Face({
  avatar,
  initial,
  active,
  present,
}: {
  avatar?: string | null | undefined;
  initial: string;
  active: boolean;
  present: boolean;
}) {
  return (
    <span className={active ? "pool-face is-on" : "pool-face"}>
      {avatar ? <img src={avatar} alt="" /> : <span>{initial}</span>}
      {present ? <i className="pool-presence" aria-hidden /> : null}
    </span>
  );
}

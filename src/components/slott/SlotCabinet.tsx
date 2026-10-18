import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Crown, Users, Zap } from "lucide-react";
import { formatUsd } from "@/lib/jackpot/math";
import { PAYLINES } from "@/lib/slott/paytable";
import { cn } from "@/lib/utils";

const FIT_GAP = 8;
/** Below this the symbols get too small to read; the page scrolls instead. */
const MIN_REEL_W = 200;

/**
 * The machine shell shared by the lobby and a live match. On lg+ the seats sit
 * beside the reels (like the cabinet art); below lg they sit in a row above them.
 * The reel window is sized from the viewport height so the whole cabinet fits,
 * and the seats close in on it so the space goes to the reels, not the frame.
 * Every slot except the reels is optional (the desktop lobby shows a bare machine).
 */
export function SlotCabinet({
  top,
  left,
  right,
  asideLeft,
  asideRight,
  seats,
  duel,
  reels,
  event,
  bottom,
  shake,
  edge,
  bleed,
  fill,
  onFit,
  className,
  toolbar,
}: {
  top?: ReactNode;
  /** Match chrome drawn inside the frame (back link, match number). */
  toolbar?: ReactNode;
  /** Score race strip directly above the reels. */
  duel?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  /** lg+ only, under the side seats. When given, `top` and `bottom` show below lg only, so the reels get the height. */
  asideLeft?: ReactNode;
  asideRight?: ReactNode;
  /** Compact seats shown above the reels below lg. */
  seats?: ReactNode;
  reels: ReactNode;
  event: ReactNode;
  bottom?: ReactNode;
  /** Changing value replays the cabinet shake (big wins). */
  shake?: string | null | undefined;
  /** Square the right corners so the cabinet runs into the screen edge. */
  edge?: boolean;
  /** Desktop match: the cabinet fills the viewport and the reels grow to that space. */
  bleed?: boolean;
  /** Below lg, keep the reels at full width and let the page scroll instead of fitting the cabinet to the viewport height. */
  fill?: boolean;
  /** Reports the fitted frame width (and the `[data-fit-top]` column's width) so the column can shrink to it. */
  onFit?: (width: number, columnWidth: number | undefined) => void;
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const report = useRef(onFit);
  report.current = onFit;
  const aside = !!(asideLeft || asideRight);
  useLayoutEffect(() => {
    const fr = frame.current;
    const el = box.current;
    if (!fr || !el) return;
    // On desktop a height-bound cabinet shrinks to wrap the seats and reels, so the reels
    // are not a small window in the middle of a wide empty frame.
    const hug = matchMedia("(min-width: 1024px)").matches;
    const fit = () => {
      el.style.width = "";
      el.style.flex = "";
      fr.style.maxWidth = "";
      fr.style.marginLeft = "";
      fr.style.marginRight = "";
      const full = el.getBoundingClientRect();
      if (!full.width || !full.height || (fill && !hug)) return;
      const tab = [...document.querySelectorAll<HTMLElement>('nav[aria-label="Main"]')].find(
        (n) => getComputedStyle(n).position === "fixed" && n.getBoundingClientRect().height > 0,
      );
      const bottom = tab ? tab.getBoundingClientRect().height : 0;
      const pin = fr.closest<HTMLElement>("[data-fit-top]");
      const pinBox = pin?.getBoundingClientRect();
      const top =
        pinBox && pinBox.top > 0
          ? pinBox.top
          : pin
            ? Number(pin.dataset["fitTop"])
            : fr.getBoundingClientRect().top;
      const rest = fr.getBoundingClientRect().height - full.height;
      const fromPin = pinBox && pinBox.height > 200 ? pinBox.height - rest - 4 : null;
      const avail = fromPin ?? window.innerHeight - bottom - top - rest - FIT_GAP;
      const w = Math.max(MIN_REEL_W, Math.min(full.width, avail * (full.width / full.height)));
      // Desktop match: the reel window is the widescreen. It already fills the
      // well between the seats; shrinking it back to 5:4 leaves a small screen.
      if (bleed && hug) {
        report.current?.(fr.getBoundingClientRect().width, pinBox?.width);
        return;
      }
      if (w < full.width - 1) {
        el.style.flex = "0 0 auto";
        el.style.width = `${Math.floor(w)}px`;
        if (hug) {
          fr.style.maxWidth = `${Math.ceil(fr.getBoundingClientRect().width - (full.width - Math.floor(w)))}px`;
          if (edge) {
            fr.style.marginLeft = "auto";
            fr.style.marginRight = "0";
          }
        }
      }
      report.current?.(fr.getBoundingClientRect().width, pinBox?.width);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(fr);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [bleed, edge, fill]);
  useEffect(() => {
    if (!shake || !frame.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    frame.current.animate(
      [0, -5, 5, -4, 4, -2, 2, 0].map((x, i) => ({
        transform: `translate(${x}px, ${i % 2 ? 1 : -1}px)`,
      })),
      { duration: 480, easing: "ease-out" },
    );
  }, [shake]);
  return (
    <div
      ref={frame}
      className={cn(
        "slott-frame slott-cabinet mx-auto p-2 sm:p-3",
        bleed ? "slott-bleed lg:mx-0 lg:flex lg:h-full lg:w-full lg:max-w-none lg:flex-col lg:overflow-hidden lg:rounded-none lg:px-3 lg:py-2" : "lg:p-2.5",
        edge && "slott-edge",
        className,
      )}
    >
      {toolbar ? <div className={bleed ? "lg:shrink-0" : undefined}>{toolbar}</div> : null}
      {top ? <div className={aside ? "lg:hidden" : undefined}>{top}</div> : null}
      {seats ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5 short:mt-1.5 sm:gap-2 lg:hidden">{seats}</div>
      ) : null}
      {duel ? (
        <div className={cn("mt-2 short:mt-1.5", !top && !seats && "mt-0", aside && "lg:mt-0", bleed && "lg:shrink-0")}>
          {duel}
        </div>
      ) : null}
      <div
        className={cn(
          "flex items-center justify-center gap-1.5 short:mt-1.5",
          top || seats || duel ? "mt-2" : null,
          aside && !duel && "lg:mt-0",
          bleed && "lg:min-h-0 lg:w-full lg:flex-1 lg:items-stretch lg:justify-between lg:gap-3",
        )}
      >
        {left || asideLeft ? (
          <div
            className={cn(
              "hidden w-[132px] shrink-0 flex-col gap-2 lg:flex xl:w-[148px]",
              bleed && "lg:justify-center",
            )}
          >
            {left}
            {asideLeft}
          </div>
        ) : null}
        <div
          ref={box}
          className={cn(
            "slott-well relative min-w-0 flex-1 p-0.5 sm:p-1",
            bleed &&
              "lg:flex lg:h-full lg:min-h-0 lg:items-stretch lg:self-stretch lg:overflow-hidden lg:p-0",
          )}
        >
          <div className={cn("relative z-[1] w-full max-w-full", bleed && "lg:h-full lg:min-h-0")}>
            {reels}
          </div>
        </div>
        {right || asideRight ? (
          <div
            className={cn(
              "hidden w-[132px] shrink-0 flex-col gap-2 lg:flex xl:w-[148px]",
              bleed && "lg:justify-center",
            )}
          >
            {right}
            {asideRight}
          </div>
        ) : null}
      </div>
      <div
        aria-live="polite"
        className={cn(
          "mx-auto mt-2 line-clamp-2 h-8 max-w-2xl px-2 text-center text-[12px] leading-4 text-foreground/90 short:mt-1.5 short:line-clamp-1 short:h-4 sm:h-5 sm:line-clamp-1 sm:text-[13px] sm:leading-5 lg:mt-1.5",
          bleed && "lg:shrink-0",
        )}
      >
        {event}
      </div>
      {bottom ? <div className={aside ? "lg:hidden" : undefined}>{bottom}</div> : null}
    </div>
  );
}

export function PotHeader({
  match,
  pot,
  bonus,
  maxWin,
  bonusKey,
  bonusText,
}: {
  match: number;
  pot: number;
  bonus: number;
  maxWin: number;
  bonusKey?: string | number;
  bonusText?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] items-center gap-1.5 sm:gap-3">
      <div className="slott-chip flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 sm:rounded-xl sm:px-3">
        <Users className="hidden h-4 w-4 shrink-0 text-primary-soft sm:block" />
        <div className="min-w-0 leading-tight">
          <div className="text-[9px] text-muted-foreground sm:text-[10px]">Match</div>
          <div className="tabular truncate text-[12px] font-semibold sm:text-sm">
            {formatUsd(match)}
          </div>
        </div>
      </div>
      <div className="slott-pot">
        <div className="slott-pot-inner px-3 py-1 text-center short:py-0.5 sm:py-1.5">
          <div className="text-[9px] font-semibold tracking-[0.16em] text-primary-soft sm:text-[10px]">
            P2P POT
          </div>
          <div className="tabular font-display text-base leading-tight short:text-sm sm:text-2xl">
            {formatUsd(pot)}
          </div>
          <div
            key={bonusKey}
            className={cn(
              "tabular text-[9px] font-semibold sm:text-[11px]",
              bonus > 0 ? "slott-bonus-pop text-gold" : "text-muted-foreground",
            )}
          >
            {bonusText ?? `BONUS +${formatUsd(bonus)}`}
          </div>
        </div>
      </div>
      <div className="slott-chip flex min-w-0 items-center justify-end gap-2 rounded-lg px-2 py-1.5 text-right sm:rounded-xl sm:px-3">
        <div className="min-w-0 leading-tight">
          <div className="text-[9px] text-muted-foreground sm:text-[10px]">Max Win</div>
          <div className="tabular truncate text-[12px] font-semibold sm:text-sm">
            {formatUsd(maxWin)}
          </div>
        </div>
        <Crown className="hidden h-4 w-4 shrink-0 text-primary-soft sm:block" />
      </div>
    </div>
  );
}

/** Desktop pot card that sits under a side seat. */
export function SidePot({
  match,
  pot,
  bonus,
  maxWin,
  bonusKey,
}: {
  match: number;
  pot: number;
  bonus: number;
  maxWin: number;
  bonusKey?: string | number;
}) {
  return (
    <div className="slott-seat rounded-xl p-2 text-center">
      <div className="text-[9px] font-semibold tracking-[0.16em] text-primary-soft">P2P POT</div>
      <div className="tabular font-display text-xl leading-tight">{formatUsd(pot)}</div>
      <div
        key={bonusKey}
        className={cn(
          "tabular text-[10px] font-semibold",
          bonus > 0 ? "slott-bonus-pop text-gold" : "text-muted-foreground",
        )}
      >
        BONUS +{formatUsd(bonus)}
      </div>
      <dl className="mt-1.5 grid grid-cols-2 gap-1 text-[10px]">
        <div className="slott-chip rounded-md py-0.5">
          <dt className="text-[8px] text-muted-foreground">MATCH</dt>
          <dd className="tabular font-semibold">{formatUsd(match)}</dd>
        </div>
        <div className="slott-chip rounded-md py-0.5">
          <dt className="text-[8px] text-muted-foreground">MAX WIN</dt>
          <dd className="tabular font-semibold">{formatUsd(maxWin)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Desktop spin controls that sit under a side seat. */
export function SideControls({
  button,
  aux,
  value,
}: Pick<Parameters<typeof BottomBar>[0], "button" | "aux" | "value">) {
  return (
    <div className="slott-seat flex flex-col items-center gap-1.5 rounded-xl p-2">
      <div className="relative">
        <button
          type="button"
          onClick={button.onClick}
          disabled={button.disabled}
          aria-label={button.ariaLabel ?? button.label}
          className={cn(
            "slott-spin-btn grid h-[76px] w-[76px] place-items-center rounded-full font-display text-white",
            button.pulse && "slott-spin-ready",
          )}
        >
          <span className="flex flex-col items-center leading-none">
            <Zap className="h-5 w-5 fill-current" />
            <span className="mt-1 text-sm">{button.label}</span>
          </span>
        </button>
        {button.timer ? (
          <TimerRing
            key={button.timer.key}
            leftMs={button.timer.leftMs}
            totalMs={button.timer.totalMs}
          />
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-1 [&>button]:w-full">{aux}</div>
      <div className="slott-chip w-full rounded-md py-0.5 text-center">
        <div className="text-[8px] text-muted-foreground">{value.label}</div>
        <div className="tabular text-xs font-semibold">{formatUsd(value.amount)}</div>
      </div>
    </div>
  );
}

export function SeatPanel({
  seat,
  avatar,
  name,
  stake,
  active,
  dim,
  badge,
  score,
  spins,
  status,
  compact,
}: {
  seat: "A" | "B";
  avatar: ReactNode;
  name: string;
  stake?: number | undefined;
  active?: boolean | undefined;
  dim?: boolean | undefined;
  badge?: string | null | undefined;
  score?: number | null | undefined;
  /** [used, per player]; sudden-death extras show as +n. */
  spins?: [number, number] | null | undefined;
  status?: ReactNode;
  compact?: boolean | undefined;
}) {
  const shown = useCountUp(score ?? 0);
  if (compact) {
    return (
      <div
        data-seat={seat}
        className={cn(
          "slott-chip min-w-0 rounded-xl p-1.5 sm:p-2",
          active && "slott-turn",
          dim && "opacity-55",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex shrink-0">{avatar}</div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex min-w-0 items-center gap-1">
              <div className="truncate text-[12px] font-semibold sm:text-sm">{name}</div>
              {badge ? (
                <span className="shrink-0 rounded bg-primary/30 px-1 text-[8px] text-foreground">
                  {badge}
                </span>
              ) : null}
            </div>
          </div>
          {score != null ? (
            <div className="tabular shrink-0 font-display text-lg leading-none sm:text-xl">
              {shown}
            </div>
          ) : null}
        </div>
        <div className="mt-1 flex min-h-3.5 items-center justify-between gap-1">
          {spins ? (
            <Pips used={spins[0]} of={spins[1]} />
          ) : (
            <span className="tabular text-[10px] text-muted-foreground">
              {stake != null ? formatUsd(stake) : ""}
            </span>
          )}
          <div className="min-w-0 truncate text-right text-[9px] font-semibold tracking-wider text-primary-soft sm:text-[10px]">
            {status}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      data-seat={seat}
      className={cn(
        "slott-seat rounded-xl p-2 text-center xl:p-2.5",
        active && "slott-turn",
        dim && "opacity-55",
      )}
    >
      <div className="flex justify-center">{avatar}</div>
      <div className="mt-2 flex items-center justify-center gap-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        {badge ? (
          <span className="shrink-0 rounded bg-primary/30 px-1 text-[9px] text-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      {stake != null ? (
        <div className="slott-chip tabular mx-auto mt-2 w-fit rounded-md px-2.5 py-0.5 text-xs">
          {formatUsd(stake)}
        </div>
      ) : null}
      {score != null ? (
        <div className="slott-score mt-2.5 rounded-lg px-2 py-1.5">
          <div className="text-[9px] tracking-wider text-muted-foreground">SCORE</div>
          <div className="tabular font-display text-xl leading-tight">{shown}</div>
          {spins ? (
            <div className="mt-1 flex justify-center">
              <Pips used={spins[0]} of={spins[1]} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-2.5">{status}</div>
    </div>
  );
}

function Pips({ used, of }: { used: number; of: number }) {
  return (
    <span
      className="flex items-center gap-[3px]"
      aria-label={`${Math.min(used, of)} of ${of} spins used`}
    >
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2",
            i < used ? "bg-primary-soft shadow-[0_0_6px_rgb(170_120_255/0.9)]" : "bg-foreground/15",
          )}
        />
      ))}
      {used > of ? (
        <span className="tabular ml-0.5 text-[9px] font-bold text-gold">+{used - of}</span>
      ) : null}
    </span>
  );
}

export function BottomBar({
  bet,
  button,
  aux,
  value,
}: {
  bet: ReactNode;
  button: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    pulse?: boolean;
    ariaLabel?: string;
    /** Turn clock drawn around the button; `key` changes per turn. */
    timer?: { key: string; leftMs: number; totalMs: number } | null;
  };
  aux: ReactNode;
  value: { label: string; amount: number };
}) {
  return (
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 short:mt-1.5 sm:gap-3">
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:gap-2">
        <div className="slott-chip flex items-center short:hidden justify-between gap-2 rounded-lg px-2.5 py-1 sm:block sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-center">
          <div className="text-[9px] text-muted-foreground sm:text-[10px]">LINES</div>
          <div className="tabular font-display text-sm leading-tight sm:text-lg">
            {PAYLINES.length}
          </div>
        </div>
        {bet}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={button.onClick}
          disabled={button.disabled}
          aria-label={button.ariaLabel ?? button.label}
          className={cn(
            "slott-spin-btn grid h-[68px] w-[68px] place-items-center rounded-full font-display text-white short:h-[58px] short:w-[58px] sm:h-[80px] sm:w-[80px] lg:h-[84px] lg:w-[84px]",
            button.pulse && "slott-spin-ready",
          )}
        >
          <span className="flex flex-col items-center leading-none">
            <Zap className="h-5 w-5 fill-current sm:h-6 sm:w-6" />
            <span className="mt-1 text-[13px] sm:text-base">{button.label}</span>
          </span>
        </button>
        {button.timer ? (
          <TimerRing
            key={button.timer.key}
            leftMs={button.timer.leftMs}
            totalMs={button.timer.totalMs}
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col-reverse gap-1.5 short:gap-1 sm:flex-row sm:gap-2">
        {aux}
        <div className="slott-chip min-w-0 rounded-lg px-2.5 py-1 text-center short:py-0.5 sm:flex-1 sm:rounded-xl sm:py-1.5">
          <div className="truncate text-[9px] text-muted-foreground sm:text-[10px]">
            {value.label}
          </div>
          <div className="tabular truncate text-[13px] font-semibold sm:text-sm">
            {formatUsd(value.amount)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Drains once per turn; the first render pins the start so re-renders never restart it. */
function TimerRing({ leftMs, totalMs }: { leftMs: number; totalMs: number }) {
  const [start] = useState(() => ({
    left: Math.max(0, leftMs),
    from: Math.min(1, Math.max(0, 1 - leftMs / Math.max(1, totalMs))),
  }));
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -inset-[7px] -rotate-90 overflow-visible"
    >
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.12}
        strokeWidth="3.5"
      />
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength={1}
        className="slott-timer"
        style={
          { "--from": start.from, animationDuration: `${start.left}ms` } as React.CSSProperties
        }
      />
    </svg>
  );
}

export function BetChip({
  amount,
  onDown,
  onUp,
}: {
  amount: number;
  onDown?: (() => void) | undefined;
  onUp?: (() => void) | undefined;
}) {
  return (
    <div className="slott-chip flex min-w-0 flex-1 items-center justify-between gap-1 rounded-lg px-1.5 py-1 sm:rounded-xl sm:px-2 sm:py-1.5">
      {onDown ? (
        <button
          type="button"
          onClick={onDown}
          aria-label="Lower bet"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-base text-primary-soft hover:bg-foreground/10"
        >
          −
        </button>
      ) : null}
      <div className="min-w-0 flex-1 text-center">
        <div className="text-[9px] text-muted-foreground sm:text-[10px]">BET</div>
        <div className="tabular truncate text-[13px] font-semibold sm:text-sm">
          {formatUsd(amount)}
        </div>
      </div>
      {onUp ? (
        <button
          type="button"
          onClick={onUp}
          aria-label="Raise bet"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-base text-primary-soft hover:bg-foreground/10"
        >
          +
        </button>
      ) : null}
    </div>
  );
}

export function AuxButton({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "slott-chip rounded-lg px-3 py-1 font-display short:py-0.5 text-[11px] tracking-wider disabled:opacity-50 sm:rounded-xl sm:py-1.5 sm:text-sm",
        active && "slott-turn text-primary-soft",
      )}
    >
      {children}
    </button>
  );
}

/** Eases a number toward its target so scores roll up instead of jumping. */
export function useCountUp(target: number, ms = 700) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    if (a === target) return;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const v = Math.round(a + (target - a) * (1 - (1 - p) ** 3));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

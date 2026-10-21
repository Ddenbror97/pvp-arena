import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { cn } from "@/lib/utils";

// Shared create/enter controls so every game's bet slip looks and behaves the same.

const short = (cents: number) => formatUsd(cents).replace(".00", "");

export function SlipCard({
  title,
  tag,
  children,
  className,
}: {
  title: string;
  tag?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex h-4 items-center justify-between gap-2">
        <h2 className="min-w-0 truncate font-display text-xs uppercase leading-4 tracking-widest">
          {title}
        </h2>
        {tag}
      </div>
      {children}
    </div>
  );
}

export function SlipBalance({ cents, loading }: { cents: number | null; loading?: boolean }) {
  return (
    <div className="mt-2 flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">Balance</span>
      <span className="tabular font-semibold">
        {cents == null || loading ? "—" : formatUsd(cents)}
      </span>
    </div>
  );
}

export function SlipLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mt-3 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
    >
      {children}
    </label>
  );
}

const chip =
  "tabular rounded-lg border py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50";
const chipIdle =
  "border-border bg-secondary/60 text-foreground/85 hover:border-primary/50 hover:text-foreground";
const chipOn =
  "border-primary bg-primary/15 text-primary-soft shadow-[0_0_0_1px_var(--color-primary)]";

/** Fixed stake presets (one tap, no typing). */
export function StakeChips({
  stakes,
  value,
  onChange,
  balance,
}: {
  stakes: readonly number[];
  value: number;
  onChange: (cents: number) => void;
  balance?: number | null;
}) {
  return (
    <div
      className="mt-1.5 grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${Math.min(stakes.length, 6)}, minmax(0, 1fr))` }}
    >
      {stakes.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={s === value}
          onClick={() => onChange(s)}
          className={cn(
            chip,
            s === value ? chipOn : chipIdle,
            balance != null && s > balance && "opacity-50",
          )}
        >
          {short(s)}
        </button>
      ))}
    </div>
  );
}

/** Free amount with ½ / 2× nudges and quick picks. */
export function StakeInput({
  id,
  value,
  onChange,
  quick,
  min,
  max,
  invalid,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  quick: readonly number[];
  min: number;
  max: number;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const cents = parseUsdToCents(value);
  const base = cents ?? (value.trim() === "" ? min : null);
  const set = (c: number) =>
    onChange((Math.max(min, Math.min(max, Math.floor(c))) / 100).toFixed(2));
  return (
    <>
      <div
        className={cn(
          "mt-1.5 flex h-12 items-center gap-1 rounded-xl border bg-background pl-3 pr-1.5 focus-within:ring-2 focus-within:ring-ring",
          invalid ? "border-destructive/60" : "border-input",
        )}
      >
        <span className="text-muted-foreground">$</span>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-invalid={invalid}
          className="tabular h-full w-full min-w-0 bg-transparent px-1 text-lg font-semibold outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled || base == null) return;
            set(Math.floor(base / 2));
          }}
          className={cn(chip, chipIdle, "w-10 shrink-0")}
          aria-label="Halve amount"
        >
          ½
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled || base == null) return;
            set(base * 2);
          }}
          className={cn(chip, chipIdle, "w-10 shrink-0")}
          aria-label="Double amount"
        >
          2×
        </button>
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) set(q);
            }}
            className={cn(chip, q === cents ? chipOn : chipIdle)}
          >
            {short(q)}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) set(max);
          }}
          className={cn(chip, max > 0 && cents === max ? chipOn : chipIdle)}
        >
          MAX
        </button>
      </div>
    </>
  );
}

/** The reward line: what the player is playing for, as the visual focus. */
export function WinPreview({
  label = "You win",
  cents,
  detail,
  accent,
}: {
  label?: string;
  cents: number | null;
  detail?: ReactNode;
  accent?: ReactNode;
}) {
  return (
    <div className="mt-3 rounded-xl border border-primary/25 bg-primary/[0.07] px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {accent}
      </div>
      <div className="tabular mt-0.5 font-display text-2xl leading-none text-primary-soft">
        {cents == null ? "—" : formatUsd(cents)}
      </div>
      {detail ? (
        <div className="tabular mt-1.5 text-[11px] text-muted-foreground">{detail}</div>
      ) : null}
    </div>
  );
}

export function SlipStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="tabular mt-0.5 truncate text-base font-semibold leading-tight text-foreground">
        {value}
      </div>
      {sub ? <div className="tabular truncate text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

const playBtn =
  "flex h-12 w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 font-display text-sm tracking-wide text-primary-foreground shadow-[0_8px_24px_-10px_var(--color-primary)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100";

function PlayContent({ label, amount }: { label: ReactNode; amount?: number | null | undefined }) {
  return amount != null ? (
    <>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span className="tabular inline-flex h-6 min-w-16 shrink-0 items-center justify-center rounded-lg bg-black/20 px-2 text-sm">
        {formatUsd(amount)}
      </span>
    </>
  ) : (
    <span className="w-full truncate text-center">{label}</span>
  );
}

/** The one primary action of a bet slip: action on the left, stake on the right. */
export function PlayButton({
  label,
  amount,
  onClick,
  disabled,
  className,
}: {
  label: ReactNode;
  amount?: number | null | undefined;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(playBtn, "mt-3", className)}
    >
      <PlayContent label={label} amount={amount} />
    </button>
  );
}

export function SignInPlayButton({ className }: { className?: string }) {
  return (
    <Link to="/auth" className={cn(playBtn, "mt-3", className)}>
      <PlayContent label="Sign in to play" />
    </Link>
  );
}

/** Reserved line under the button for the blocking reason or a quiet note. */
export function SlipNote({ error, children }: { error?: ReactNode; children?: ReactNode }) {
  return (
    <p
      className={cn(
        "mt-2 h-4 truncate text-center text-[11px] leading-4",
        error ? "text-destructive" : "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {error ?? children}
    </p>
  );
}

import { useRef } from "react";

export function OtpInput({
  value,
  onChange,
  disabled,
  label = "Verification code",
  autoComplete = "one-time-code",
  autoFocus = true,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  /** Fixed-size digits for a small dialog. The default row stretches to the parent. */
  compact?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function set(i: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (clean.length > 1) {
      const next = (value.slice(0, i) + clean).slice(0, 6);
      onChange(next);
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const arr = digits.slice();
    arr[i] = clean;
    const next = arr.join("").slice(0, 6);
    onChange(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  }

  return (
    <div
      className={compact ? "flex justify-center gap-1.5" : "flex justify-between gap-2"}
      role="group"
      aria-label={label}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? autoComplete : "off"}
          maxLength={6}
          aria-label={`Digit ${i + 1}`}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => set(i, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            set(i, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          className={
            compact
              ? "h-11 w-9 rounded-md border border-input bg-background text-center font-mono text-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              : "h-14 min-w-0 flex-1 rounded-md border border-input bg-background text-center font-mono text-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 sm:text-2xl"
          }
        />
      ))}
    </div>
  );
}

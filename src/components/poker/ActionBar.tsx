import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Circle, Coins, Loader2, Minus, Plus } from "lucide-react";
import { money, type Legal, type PokerHand } from "@/lib/poker/api";
import { cn } from "@/lib/utils";

export type ActIntent = {
  action: "FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN";
  amount: number;
};

/** "$12.50", "12.5" or "12" in dollars to cents; null when it isn't a number. */
function parseDollars(raw: string): number | null {
  const v = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(v) ? Math.round(v * 100) : null;
}

/**
 * Betting controls for the seat to act. Every option and bound comes from the server's
 * `legal` payload; the server validates again on submit.
 */
export function ActionBar({
  legal,
  hand,
  busy,
  onAct,
  highlight,
}: {
  legal: Legal;
  hand: PokerHand;
  busy: boolean;
  onAct: (a: ActIntent) => void;
  highlight?: boolean;
}) {
  const bb = hand.big_blind;
  const min = legal.min_raise_to;
  const max = legal.max_raise_to;
  const [to, setTo] = useState(min);
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setTo(min), [min, hand.id, hand.version]);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const value = clamp(to);
  const pot = hand.players.reduce((s, p) => s + p.total_bet, 0);
  const potRaise = hand.current_bet + pot + legal.to_call;
  const isBet = hand.current_bet === 0;
  const allIn = legal.can_raise && value >= max;

  const raise = () =>
    onAct(
      allIn
        ? { action: "ALL_IN", amount: max }
        : { action: isBet ? "BET" : "RAISE", amount: value },
    );
  const call = () =>
    legal.can_check ? onAct({ action: "CHECK", amount: 0 }) : onAct({ action: "CALL", amount: 0 });
  const cancelDraft = useRef(false);
  const commitDraft = () => {
    const c = draft === null || cancelDraft.current ? null : parseDollars(draft);
    cancelDraft.current = false;
    if (c !== null) setTo(clamp(c));
    setDraft(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (busy || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "f" && !legal.can_check) onAct({ action: "FOLD", amount: 0 });
      else if (k === "c") call();
      else if (k === "r" && legal.can_raise) raise();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const step = (dir: 1 | -1) => setTo((v) => clamp(v + dir * bb));
  const preset = (label: string, amt: number) => (
    <button
      key={label}
      type="button"
      disabled={busy}
      onClick={() => setTo(clamp(amt))}
      className={cn("poker-preset", value === clamp(amt) && "is-on")}
    >
      {label}
    </button>
  );

  return (
    <div
      className={cn("poker-actions", highlight && "poker-actions-coach")}
      role="group"
      aria-label="Your action"
    >
      {legal.can_raise ? (
        <div className="poker-amount-row">
          <div className="poker-presets">
            {preset("Min", min)}
            {preset("½ Pot", Math.floor(potRaise / 2))}
          </div>
          <div className="poker-stepper">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={busy || value <= min}
              aria-label="Lower amount"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              inputMode="decimal"
              aria-label={`${isBet ? "Bet" : "Raise to"} amount, ${money(min)} to ${money(max)}`}
              value={draft ?? money(value)}
              disabled={busy || max <= min}
              onFocus={(e) => {
                setDraft(String(value / 100));
                requestAnimationFrame(() => e.target.select());
              }}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitDraft();
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  cancelDraft.current = true;
                  e.currentTarget.blur();
                }
              }}
            />
            <button
              type="button"
              onClick={() => step(1)}
              disabled={busy || value >= max}
              aria-label="Raise amount"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="poker-presets">
            {preset("Pot", potRaise)}
            {preset("All-in", max)}
          </div>
        </div>
      ) : null}
      <div className="poker-action-buttons">
        <button
          type="button"
          className="poker-btn poker-btn-fold"
          onClick={() => onAct({ action: "FOLD", amount: 0 })}
          disabled={busy}
          aria-keyshortcuts="F"
        >
          <Circle className="h-4 w-4" aria-hidden /> Fold
        </button>
        <button
          type="button"
          className="poker-btn poker-btn-call"
          onClick={call}
          disabled={busy}
          aria-keyshortcuts="C"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : legal.can_check ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Coins className="h-4 w-4" aria-hidden />
          )}
          {legal.can_check ? "Check" : `Call ${money(legal.call_amount)}`}
        </button>
        {legal.can_raise ? (
          <button
            type="button"
            className="poker-btn poker-btn-raise"
            onClick={raise}
            disabled={busy}
            aria-keyshortcuts="R"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
            {allIn ? `All-in ${money(max)}` : `${isBet ? "Bet" : "Raise to"} ${money(value)}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

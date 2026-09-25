import { readAuthHint } from "@/lib/auth-hint";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet, type Game } from "@/lib/jackpot/api";
import { estimatedChanceBps, formatBps, formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { QUICK_AMOUNTS, APP } from "@/lib/config";
import { emitSound } from "@/lib/sound";
import { Button } from "@/components/ui/button";

interface Props {
  game: Game | null;
  myTotal: number;
  closed: boolean;
}

export function EntryPanel({ game, myTotal, closed }: Props) {
  const { userId, profile, needsProfile, ready } = useAuth();
  const [hint] = useState(readAuthHint);
  const wallet = useWallet(userId);
  const qc = useQueryClient();
  const [input, setInput] = useState("25.00");
  const [pending, setPending] = useState(false);
  // One idempotency key per intended entry; reused if the request is retried
  // after a network failure so it can never be processed twice.
  const pendingKey = useRef<{ key: string; amount: number } | null>(null);

  const amount = parseUsdToCents(input);
  const balance = wallet.data?.available ?? 0;
  const pot = game?.pot_amount ?? 0;
  const min = game?.min_entry ?? 100;
  const max = Math.min(game?.max_entry ?? 1000000, balance);
  const valid = amount != null && amount >= min && amount <= (game?.max_entry ?? 1000000);
  const affordable = valid && amount! <= balance;
  const chance = valid ? estimatedChanceBps(myTotal, pot, amount!) : 0;

  async function submit() {
    if (!profile || !valid || !affordable || pending || closed) return;
    setPending(true);
    if (!pendingKey.current || pendingKey.current.amount !== amount) {
      pendingKey.current = { key: crypto.randomUUID(), amount: amount! };
    }
    let { data, error } = await supabase.rpc("jackpot_join", {
      p_amount: amount!,
      p_idempotency_key: pendingKey.current.key,
    });
    if (error?.message.includes("SESSION_REVOKED")) {
      // Stale local session (signed out elsewhere or expired): renew once and retry.
      // The idempotency key makes a retried join safe.
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        ({ data, error } = await supabase.rpc("jackpot_join", {
          p_amount: amount!,
          p_idempotency_key: pendingKey.current.key,
        }));
      }
    }
    setPending(false);
    if (error) {
      toast.error(friendlyError(error));
      if (!/fetch|network/i.test(error.message)) pendingKey.current = null;
      return;
    }
    pendingKey.current = null;
    const r = data as { amount: number; timer_extended?: boolean };
    emitSound("entry");
    toast.success(`You entered the Jackpot with ${formatUsd(r.amount)}`);
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["players"] });
  }

  if (!userId && (ready || !hint)) {
    return (
      <Panel>
        <div>
        <h3 className="font-display text-base">Join the pot</h3>
        <p className="mt-2 text-sm text-muted-foreground">Sign in and deposit USDC to enter.</p>
        <Button asChild className="mt-4 w-full font-display">
          <Link to="/auth">Sign in to play</Link>
        </Button>
        </div>
      </Panel>
    );
  }
  if (!profile && needsProfile) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">Finish setting up your profile to play.</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Your balance</span>
        <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold">{APP.creditsLabel}</span>
      </div>
      <div className="tabular mt-0.5 text-xl font-semibold">{!userId || wallet.isLoading ? "—" : formatUsd(balance)}</div>

      <label className="mt-3 block text-[11px] uppercase tracking-widest text-muted-foreground" htmlFor="entry-amount">
        Enter amount
      </label>
      <div className="mt-1.5 flex items-center rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
        <span className="tabular text-muted-foreground">$</span>
        <input
          id="entry-amount"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="tabular h-10 w-full bg-transparent px-2 text-base outline-none"
          aria-invalid={!valid}
        />
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setInput((q / 100).toFixed(2))}
            className="tabular rounded-md bg-secondary py-1.5 text-xs hover:bg-accent"
          >
            ${q / 100}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setInput((Math.max(0, max) / 100).toFixed(2))}
          className="rounded-md bg-secondary py-1.5 text-xs font-bold hover:bg-accent"
        >
          MAX
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Your estimated chance</span>
        <span className="tabular font-semibold text-primary">{formatBps(chance)}</span>
      </div>
      <p className="mt-2 min-h-4 text-xs leading-4 text-destructive" aria-live="polite">
        {!valid && input
          ? `Enter between ${formatUsd(min)} and ${formatUsd(game?.max_entry ?? 1000000)}.`
          : valid && !affordable && userId && !wallet.isLoading
            ? "Not enough balance."
            : null}
      </p>

      <Button
        size="lg"
        className="mt-3 h-11 w-full font-display text-sm tracking-wide"
        disabled={!profile || !affordable || pending || closed}
        onClick={submit}
      >
        {closed ? "No more entries" : pending ? "Entering..." : `Enter jackpot · ${valid ? formatUsd(amount!) : "$0.00"}`}
      </Button>
      <p className="mt-2 min-h-4 text-center text-xs leading-4 text-muted-foreground">
        {myTotal > 0 && (
          <>You're in with <span className="tabular text-foreground">{formatUsd(myTotal)}</span></>
        )}
      </p>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-4">{children}</div>;
}

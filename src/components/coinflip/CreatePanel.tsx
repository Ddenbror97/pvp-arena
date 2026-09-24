import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/jackpot/api";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { APP } from "@/lib/config";
import { useCoinflipConfig, type CoinSide } from "@/lib/coinflip/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUICK = [500, 1000, 2500, 5000];

export function CreatePanel() {
  const { userId, profile } = useAuth();
  const wallet = useWallet(userId);
  const cfg = useCoinflipConfig();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [input, setInput] = useState("5.00");
  const [side, setSide] = useState<CoinSide>("HEADS");
  const [pending, setPending] = useState(false);
  const pendingKey = useRef<{ key: string; amount: number; side: CoinSide } | null>(null);

  const amount = parseUsdToCents(input);
  const balance = wallet.data?.available ?? 0;
  const min = Number(cfg.data?.min_wager ?? 100);
  const max = Number(cfg.data?.max_wager ?? 1000000);
  const fee = Number(cfg.data?.fee_bps ?? 0);
  const valid = amount != null && amount >= min && amount <= max;
  const affordable = valid && amount! <= balance;
  const pot = valid ? amount! * 2 : 0;
  const win = pot - Math.floor((pot * fee) / 10000);

  async function submit() {
    if (!valid || !affordable || pending) return;
    setPending(true);
    const k = pendingKey.current;
    if (!k || k.amount !== amount || k.side !== side) pendingKey.current = { key: crypto.randomUUID(), amount: amount!, side };
    const { data, error } = await supabase.rpc("coinflip_create", {
      p_amount: amount!,
      p_side: side,
      p_idempotency_key: pendingKey.current!.key,
    });
    setPending(false);
    if (error) {
      toast.error(friendlyError(error));
      if (!/fetch|network/i.test(error.message)) pendingKey.current = null;
      return;
    }
    pendingKey.current = null;
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["coinflip-open"] });
    const gid = (data as { game_id: number }).game_id;
    navigate({ to: "/coinflip/$gameId", params: { gameId: String(gid) } });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs uppercase tracking-widest">Create a coinflip</h2>
        <span className="shrink-0 whitespace-nowrap rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold">{APP.creditsLabel}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">1 vs 1 · winner takes the pot</p>

      {!userId ? (
        <Button asChild className="mt-4 w-full font-display"><Link to="/auth">Sign in to play</Link></Button>
      ) : !profile ? (
        <p className="mt-5 text-sm text-muted-foreground">Finish setting up your profile to play.</p>
      ) : (
        <>
          <div className="mt-3 text-xs text-muted-foreground">
            Available <span className="tabular text-foreground">{formatUsd(balance)}</span> {APP.creditsLabel}
          </div>
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cf-amount">Wager</label>
          <div className="mt-1 flex items-center rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
            <span className="text-muted-foreground">$</span>
            <input
              id="cf-amount"
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="tabular h-10 w-full bg-transparent px-2 text-base outline-none"
            />
          </div>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setInput((q / 100).toFixed(2))} className="tabular rounded-md bg-secondary py-1.5 text-xs hover:bg-secondary/70">
                {formatUsd(q).replace(".00", "")}
              </button>
            ))}
            <button type="button" onClick={() => setInput((Math.min(balance, max) / 100).toFixed(2))} className="rounded-md bg-secondary py-1.5 text-xs font-bold hover:bg-secondary/70">
              MAX
            </button>
          </div>

          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your side</div>
          <div className="mt-1 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Your side">
            {(["HEADS", "TAILS"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={side === s}
                onClick={() => setSide(s)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border py-2 font-display text-xs transition",
                  side === s
                    ? s === "HEADS" ? "border-primary bg-primary/10 text-primary" : "border-rival bg-rival/10 text-rival"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("inline-block h-4 w-4 rounded-full", s === "HEADS" ? "coin-heads" : "coin-tails")} />
                {s}
              </button>
            ))}
          </div>

          <dl className="tabular mt-3 grid grid-cols-2 gap-y-0.5 rounded-lg bg-background/60 px-3 py-2 text-xs">
            <dt className="text-muted-foreground">You wager</dt><dd className="text-right">{valid ? formatUsd(amount!) : "—"}</dd>
            <dt className="text-muted-foreground">Your side</dt><dd className="text-right">{side}</dd>
            <dt className="text-muted-foreground">Pot</dt><dd className="text-right">{valid ? formatUsd(pot) : "—"}</dd>
            <dt className="font-semibold">Win</dt><dd className="text-right font-semibold text-primary">{valid ? formatUsd(win) : "—"}</dd>
          </dl>

          <Button onClick={submit} disabled={!affordable || pending} className="mt-3 h-11 w-full font-display text-sm">
            {pending ? "Creating..." : !valid ? `Wager ${formatUsd(min)}–${formatUsd(max)}` : !affordable ? "Not enough balance" : "Create game"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Test credits have no cash value.</p>
        </>
      )}
    </div>
  );
}

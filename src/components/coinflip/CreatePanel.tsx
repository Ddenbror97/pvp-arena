import { readAuthHint } from "@/lib/auth-hint";
import { useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/jackpot/api";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { openRoom, useCoinflipConfig, type CoinSide } from "@/lib/coinflip/api";
import {
  PlayButton,
  SignInPlayButton,
  SlipBalance,
  SlipCard,
  SlipLabel,
  SlipNote,
  StakeInput,
} from "@/components/game/BetSlip";
import { cn } from "@/lib/utils";
import { coinHeads as headsAsset, coinTails as tailsAsset } from "@/assets/media";

const QUICK = [500, 1000, 2500, 5000];

export function CreatePanel() {
  const { userId, profile, ready, needsProfile } = useAuth();
  const [hint] = useState(readAuthHint);
  const wallet = useWallet(userId);
  const cfg = useCoinflipConfig();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const [input, setInput] = useState("1.00");
  const [side, setSide] = useState<CoinSide>("HEADS");
  const [pending, setPending] = useState(false);
  const pendingKey = useRef<{ key: string; amount: number; side: CoinSide } | null>(null);
  const submitting = useRef(false);

  const amount = parseUsdToCents(input);
  const balance = wallet.data?.available ?? 0;
  const min = Number(cfg.data?.min_wager ?? 100);
  const max = Number(cfg.data?.max_wager ?? 1000000);
  const valid = amount != null && amount >= min && amount <= max;
  const affordable = valid && amount! <= balance;

  async function submit() {
    if (submitting.current || !profile || !valid || !affordable || pending) return;
    submitting.current = true;
    try {
      await create();
    } finally {
      submitting.current = false;
    }
  }

  async function create() {
    setPending(true);
    const k = pendingKey.current;
    if (!k || k.amount !== amount || k.side !== side)
      pendingKey.current = { key: crypto.randomUUID(), amount: amount!, side };
    const { data, error } = await supabase.rpc("coinflip_create", {
      p_amount: amount!,
      p_side: side,
      p_idempotency_key: pendingKey.current!.key,
    });
    if (error) {
      setPending(false);
      toast.error(friendlyError(error));
      if (!/fetch|network/i.test(error.message)) pendingKey.current = null;
      return;
    }
    pendingKey.current = null;
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["coinflip-open"] });
    const gid = (data as { game_id: number }).game_id;
    setPending(false);
    openRoom(qc, router, gid);
    navigate({ to: "/coinflip/$gameId", params: { gameId: String(gid) } });
  }

  const signedOut = !userId && (ready || !hint);
  const broke = !signedOut && valid && !affordable && !wallet.isLoading;
  const cap = signedOut ? max : Math.min(balance, max);
  const setAmount = (cents: number) =>
    setInput((Math.max(min, Math.min(cap, Math.floor(cents))) / 100).toFixed(2));
  const needsSetup = !signedOut && !profile && needsProfile;

  return (
    <>
      <MobileCreate
        side={side}
        setSide={setSide}
        input={input}
        setInput={setInput}
        setAmount={setAmount}
        amount={amount}
        valid={valid}
        pending={pending}
        signedOut={signedOut}
        needsSetup={needsSetup}
        broke={broke}
        affordable={affordable}
        hasProfile={!!profile}
        cap={cap}
        onSubmit={submit}
      />
      <SlipCard
        title="Create a coinflip"
        tag={<span className="text-[11px] text-muted-foreground">1 vs 1</span>}
        className="hidden lg:block"
      >
      {!signedOut && !profile && needsProfile ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Finish setting up your profile to play.
        </p>
      ) : (
        <>
          {signedOut ? null : <SlipBalance cents={balance} loading={!userId || wallet.isLoading} />}

          <SlipLabel>Pick your side</SlipLabel>
          <div className="mt-1.5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Your side">
            {(["HEADS", "TAILS"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={side === s}
                onClick={() => setSide(s)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2 font-display text-xs transition active:scale-[0.98]",
                  side === s
                    ? s === "HEADS"
                      ? "border-coin-heads bg-coin-heads/10 text-coin-heads shadow-[0_0_0_1px_var(--color-coin-heads)]"
                      : "border-coin-tails bg-coin-tails/10 text-coin-tails shadow-[0_0_0_1px_var(--color-coin-tails)]"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <img
                  src={s === "HEADS" ? headsAsset : tailsAsset}
                  alt=""
                  width={32}
                  height={32}
                  draggable={false}
                  className={cn(
                    "h-8 w-8 rounded-full object-cover transition select-none",
                    side !== s && "opacity-60 grayscale",
                  )}
                />
                {s}
              </button>
            ))}
          </div>

          <SlipLabel htmlFor="cf-amount">Wager</SlipLabel>
          <StakeInput
            id="cf-amount"
            value={input}
            onChange={setInput}
            quick={QUICK}
            min={min}
            max={signedOut ? max : Math.min(balance, max)}
            invalid={!valid && !!input}
            disabled={pending}
          />

          {signedOut ? (
            <SignInPlayButton />
          ) : (
            <PlayButton
              onClick={submit}
              disabled={!profile || !affordable || pending}
              label={pending ? "Creating…" : `Create · ${side === "HEADS" ? "Heads" : "Tails"}`}
              amount={valid ? amount : null}
            />
          )}
          <SlipNote
            error={
              broke ? (
                <>
                  Not enough balance ·{" "}
                  <Link to="/wallet" className="underline">
                    Deposit
                  </Link>
                </>
              ) : null
            }
          >
            Every flip is verifiable.
          </SlipNote>
        </>
      )}
    </SlipCard>
    </>
  );
}

function MobileCreate({
  side,
  setSide,
  input,
  setInput,
  setAmount,
  amount,
  valid,
  pending,
  signedOut,
  needsSetup,
  broke,
  affordable,
  hasProfile,
  cap,
  onSubmit,
}: {
  side: CoinSide;
  setSide: (side: CoinSide) => void;
  input: string;
  setInput: (next: string) => void;
  setAmount: (cents: number) => void;
  amount: number | null;
  valid: boolean;
  pending: boolean;
  signedOut: boolean;
  needsSetup: boolean;
  broke: boolean;
  affordable: boolean;
  hasProfile: boolean;
  cap: number;
  onSubmit: () => void;
}) {
  if (needsSetup) {
    return (
      <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground lg:hidden">
        Finish setting up your profile to play.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-2 lg:hidden">
      <div className="flex items-center gap-1.5">
        <div className="flex shrink-0 gap-1" role="radiogroup" aria-label="Your side">
          {(["HEADS", "TAILS"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              aria-label={s === "HEADS" ? "Heads" : "Tails"}
              disabled={pending}
              onClick={() => setSide(s)}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full border transition active:scale-95 disabled:opacity-50",
                side === s
                  ? s === "HEADS"
                    ? "border-coin-heads shadow-[0_0_0_1px_var(--color-coin-heads)]"
                    : "border-coin-tails shadow-[0_0_0_1px_var(--color-coin-tails)]"
                  : "border-transparent opacity-50 grayscale",
              )}
            >
              <img
                src={s === "HEADS" ? headsAsset : tailsAsset}
                alt=""
                width={32}
                height={32}
                draggable={false}
                className="h-8 w-8 rounded-full object-cover select-none"
              />
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="cf-amount-mobile">
          Wager
        </label>
        <div
          className={cn(
            "flex h-10 min-w-0 flex-1 items-center rounded-lg border bg-background px-2",
            !valid && input ? "border-destructive/60" : "border-input",
          )}
        >
          <span className="text-xs text-muted-foreground">$</span>
          <input
            id="cf-amount-mobile"
            inputMode="decimal"
            value={input}
            disabled={pending}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-invalid={!valid && !!input}
            className="tabular h-full w-full min-w-0 bg-transparent px-1 text-sm font-semibold outline-none disabled:opacity-50"
          />
        </div>
        {signedOut ? (
          <Link
            to="/auth"
            className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-3 font-display text-xs tracking-wide text-primary-foreground"
          >
            Sign in
          </Link>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!hasProfile || !affordable || pending}
            className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-3 font-display text-xs tracking-wide text-primary-foreground transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "…" : "Create"}
          </button>
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={pending}
            onClick={() => setAmount(q)}
            className={cn(
              "tabular rounded-md border py-1 text-[11px] font-semibold disabled:opacity-50",
              amount === q
                ? "border-primary bg-primary/15 text-primary-soft"
                : "border-border bg-secondary/60 text-foreground/85",
            )}
          >
            {formatUsd(q).replace(".00", "")}
          </button>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() => setAmount(cap)}
          className={cn(
            "tabular rounded-md border py-1 text-[11px] font-semibold disabled:opacity-50",
            cap > 0 && amount === cap
              ? "border-primary bg-primary/15 text-primary-soft"
              : "border-border bg-secondary/60 text-foreground/85",
          )}
        >
          MAX
        </button>
      </div>
      {broke ? (
        <p className="mt-1.5 text-center text-[11px] text-destructive">
          Not enough balance ·{" "}
          <Link to="/wallet" className="underline">
            Deposit
          </Link>
        </p>
      ) : null}
    </div>
  );
}

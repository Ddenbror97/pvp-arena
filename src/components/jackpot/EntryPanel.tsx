import { readAuthHint } from "@/lib/auth-hint";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet, type Game } from "@/lib/jackpot/api";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { QUICK_AMOUNTS } from "@/lib/config";
import { emitSound } from "@/lib/sound";
import {
  PlayButton,
  SignInPlayButton,
  SlipBalance,
  SlipCard,
  SlipLabel,
  SlipNote,
  StakeInput,
} from "@/components/game/BetSlip";

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
  const [input, setInput] = useState("1.00");
  const [pending, setPending] = useState(false);
  // One idempotency key per intended entry; reused if the request is retried
  // after a network failure so it can never be processed twice.
  const pendingKey = useRef<{ key: string; amount: number } | null>(null);
  // Synchronous lock: a second click before React re-renders would reuse the key
  // (safe server-side) but surface a duplicate toast or a spurious error.
  const submitting = useRef(false);

  const amount = parseUsdToCents(input);
  const balance = wallet.data?.available ?? 0;
  const min = game?.min_entry ?? 100;
  const max = Math.min(game?.max_entry ?? 1000000, balance);
  const valid = amount != null && amount >= min && amount <= (game?.max_entry ?? 1000000);
  const affordable = valid && amount! <= balance;

  async function submit() {
    if (submitting.current || !profile || !valid || !affordable || pending || closed) return;
    submitting.current = true;
    try {
      await join();
    } finally {
      submitting.current = false;
    }
  }

  async function join() {
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

  const signedOut = !userId && (ready || !hint);
  const maxEntry = game?.max_entry ?? 1000000;
  const error =
    !valid && input ? (
      `Enter ${formatUsd(min)}–${formatUsd(maxEntry)}`
    ) : valid && !affordable && userId && !wallet.isLoading ? (
      <>
        Not enough balance ·{" "}
        <Link to="/wallet" className="underline">
          Deposit
        </Link>
      </>
    ) : null;

  return (
    <SlipCard title={myTotal > 0 ? "Add to your entry" : "Join the pot"}>
      {!signedOut && !profile && needsProfile ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Finish setting up your profile to play.
        </p>
      ) : (
        <>
          {signedOut ? null : <SlipBalance cents={balance} loading={!userId || wallet.isLoading} />}
          <SlipLabel htmlFor="entry-amount">Entry</SlipLabel>
          <StakeInput
            id="entry-amount"
            value={input}
            onChange={setInput}
            quick={QUICK_AMOUNTS}
            min={min}
            max={signedOut ? maxEntry : Math.max(0, max)}
            invalid={!valid && !!input}
            disabled={pending}
          />

          {signedOut ? (
            <SignInPlayButton />
          ) : (
            <PlayButton
              onClick={submit}
              disabled={!profile || !affordable || pending || closed}
              label={
                closed
                  ? "No more entries"
                  : pending
                    ? "Entering…"
                    : myTotal > 0
                      ? "Add entry"
                      : "Enter jackpot"
              }
              amount={closed ? null : valid ? amount : null}
            />
          )}
          <SlipNote error={error}>Every draw is verifiable.</SlipNote>
        </>
      )}
    </SlipCard>
  );
}

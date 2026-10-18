import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatUsd } from "@/lib/jackpot/math";
import { claimPromoCode, openPromoClaim, promoClaimError } from "@/lib/promo/claim";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PromoCodeField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        Promo code <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={16}
        placeholder="Code"
        className="min-h-11 text-base uppercase"
      />
    </div>
  );
}

export function PromoCodePanel() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = useQuery({
    queryKey: ["promo-mine"],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc("promo_mine" as never);
      if (err) throw err;
      return (data ?? {}) as { code?: string | null; partner?: string | null };
    },
    staleTime: 15_000,
  });

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const flight = openPromoClaim(trimmed);
    let result: { ok?: boolean; reason?: string; reward_cents?: number } | null = null;
    try {
      result = await claimPromoCode(trimmed);
    } catch {
      result = null;
    }
    setBusy(false);
    const show = flight.announce();
    if (!show) {
      if (result?.ok) setCode("");
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
      await queryClient.invalidateQueries({ queryKey: ["promo-mine"] });
      return;
    }
    if (!result?.ok) {
      setError(promoClaimError(result));
      return;
    }
    setError(null);
    toast.success(`Promo claimed — ${formatUsd(result.reward_cents ?? 0)} added to your balance.`);
    setCode("");
    await queryClient.invalidateQueries({ queryKey: ["wallet"] });
    await queryClient.invalidateQueries({ queryKey: ["promo-mine"] });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-sm uppercase tracking-widest">Promo code</h2>
      {mine.data?.code || mine.data?.partner ? (
        <p className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          {mine.data.partner ? (
            <>
              Playing with <span className="font-semibold">@{mine.data.partner}</span>
              {mine.data.code ? (
                <>
                  {" "}
                  · code <span className="font-mono font-semibold">{mine.data.code}</span>
                </>
              ) : null}
              . This is the proof that you used their code.
            </>
          ) : (
            <>
              You claimed <span className="font-mono font-semibold">{mine.data.code}</span>.
            </>
          )}
        </p>
      ) : null}
      {mine.data?.code ? null : (
        <>
          <form onSubmit={claim} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={16}
              placeholder="Code"
              aria-label="Promo code"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "promo-claim-error" : undefined}
              className="min-h-11 uppercase"
            />
            <Button
              type="submit"
              className="min-h-11 sm:w-auto"
              disabled={busy || code.trim().length < 4}
            >
              {busy ? "Claiming…" : "Claim"}
            </Button>
          </form>
          {error ? (
            <p id="promo-claim-error" role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

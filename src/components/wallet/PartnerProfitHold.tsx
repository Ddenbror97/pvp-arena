import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd } from "@/lib/jackpot/math";

async function loadHold(): Promise<number> {
  const { data, error } = await supabase.rpc("partner_profit_status" as never);
  if (error) throw error;
  return Number((data as { held_cents?: number } | null)?.held_cents ?? 0);
}

export const partnerProfitHoldQuery = () =>
  queryOptions({ queryKey: ["partner-profit-hold"], queryFn: loadHold, staleTime: 15_000 });

/** Held partner-sourced profit in cents (0 while loading or on error; the server still enforces it). */
export function usePartnerProfitHold(enabled = true) {
  const q = useQuery({ ...partnerProfitHoldQuery(), enabled });
  return q.data ?? 0;
}

export function PartnerProfitNote({
  heldCents,
  availableCents,
}: {
  heldCents: number;
  availableCents?: number;
}) {
  if (heldCents <= 0) return null;
  return (
    <p className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs leading-snug text-muted-foreground">
      {availableCents !== undefined && (
        <>
          <b className="text-foreground">{formatUsd(Math.max(0, availableCents - heldCents))}</b> is
          available to withdraw.{" "}
        </>
      )}
      <b className="text-foreground">{formatUsd(heldCents)}</b> is temporarily held because it came
      from promotional partner-funded gameplay and requires review. It stays in your balance and can
      still be played.
    </p>
  );
}

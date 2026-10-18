import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = {
  id: string;
  code: string;
  reward_cents: number;
  max_claims: number;
  claim_count: number;
  remaining: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  partner: string | null;
};

async function load(): Promise<Row[]> {
  const { data, error } = await supabase.rpc("promo_admin_list" as never);
  if (error) throw error;
  return (data as { rows: Row[] }).rows ?? [];
}

export function PromoAdmin() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["admin-promos"], queryFn: load });
  const [code, setCode] = useState("");
  const [reward, setReward] = useState("2.00");
  const [maxClaims, setMaxClaims] = useState("100");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseUsdToCents(reward);
    const max = Number(maxClaims);
    if (cents == null || cents < 100 || cents > 500) {
      toast.error("Reward must be between $1.00 and $5.00.");
      return;
    }
    if (!Number.isInteger(max) || max < 1) {
      toast.error("Max claims must be a positive whole number.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc(
      "promo_admin_create" as never,
      {
        p_code: code,
        p_reward_cents: cents,
        p_max_claims: max,
        p_expires: expires ? new Date(expires).toISOString() : null,
      } as never,
    );
    setBusy(false);
    if (error) {
      toast.error("Couldn't create that code.");
      return;
    }
    toast.success("Promo code created.");
    setCode("");
    await queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
  }

  async function remove(row: Row) {
    if (!window.confirm(`Delete promo code ${row.code}? This cannot be undone.`)) return;
    const { error } = await supabase.rpc("promo_admin_delete" as never, { p_id: row.id } as never);
    if (error) {
      toast.error(
        /CODE_USED/.test(error.message)
          ? "That code has already been claimed, so it cannot be deleted. Deactivate it instead."
          : "Couldn't delete that code.",
      );
      return;
    }
    toast.success("Promo code deleted.");
    await queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
  }

  async function toggle(row: Row) {
    const { error } = await supabase.rpc(
      "promo_admin_update" as never,
      {
        p_id: row.id,
        p_active: !row.active,
        p_max_claims: row.max_claims,
        p_expires: row.expires_at,
        p_touch_expiry: false,
      } as never,
    );
    if (error) {
      toast.error("Couldn't update that code.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={create}
        className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="promo-code">Code</Label>
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="uppercase"
            maxLength={16}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-reward">Reward (USD)</Label>
          <Input
            id="promo-reward"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            inputMode="decimal"
            min={1}
            max={5}
            step="0.01"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-max">Max claims</Label>
          <Input
            id="promo-max"
            value={maxClaims}
            onChange={(e) => setMaxClaims(e.target.value)}
            inputMode="numeric"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-exp">Expires (optional)</Label>
          <Input
            id="promo-exp"
            type="datetime-local"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating…" : "Create code"}
          </Button>
        </div>
      </form>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading promo codes…</p>}
      {q.error && <p className="text-sm text-muted-foreground">Unable to load promo codes.</p>}
      {q.data && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Reward</th>
                <th className="px-3 py-2">Claims</th>
                <th className="px-3 py-2">Remaining</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {q.data.length === 0 && (
                <tr>
                  <td className="px-3 py-2 text-muted-foreground" colSpan={9}>
                    No promo codes.
                  </td>
                </tr>
              )}
              {q.data.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.code}</td>
                  <td className="px-3 py-2">{row.partner ?? "—"}</td>
                  <td className="tabular px-3 py-2">{formatUsd(row.reward_cents)}</td>
                  <td className="tabular px-3 py-2">
                    {row.claim_count} / {row.max_claims}
                  </td>
                  <td className="tabular px-3 py-2">{row.remaining}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {row.expires_at ? new Date(row.expires_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">{row.active ? "Active" : "Inactive"}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex gap-3">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => toggle(row)}
                      >
                        {row.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => void remove(row)}
                      >
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

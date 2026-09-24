import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatUsd } from "@/lib/jackpot/math";
import { getCryptoAdmin, reviewCryptoWithdrawal, setCryptoSwitches } from "@/lib/crypto/crypto.functions";

export function CryptoAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(getCryptoAdmin);
  const review = useServerFn(reviewCryptoWithdrawal);
  const setSw = useServerFn(setCryptoSwitches);
  const q = useQuery({ queryKey: ["crypto-admin"], queryFn: () => load(), refetchInterval: 20_000 });
  const d = q.data;
  if (!d) return null;
  const s = d.settings;

  async function toggle(key: "system" | "deposits" | "withdrawals", v: boolean) {
    const next = { system: s.crypto_system_enabled, deposits: s.deposits_enabled, withdrawals: s.withdrawals_enabled, [key]: v };
    const r = await setSw({ data: next });
    if (!r.ok) toast.error(r.error);
    qc.invalidateQueries({ queryKey: ["crypto-admin"] });
  }
  async function act(id: string, approve: boolean) {
    const r = await review({ data: { id, approve } });
    if (!r.ok) toast.error(r.error);
    else toast.success(approve ? "Approved" : "Rejected and refunded");
    qc.invalidateQueries({ queryKey: ["crypto-admin"] });
  }

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-sm uppercase tracking-widest">Crypto rails</h2>
        <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">TESTNET · NO REAL VALUE</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-6 rounded-2xl border border-border bg-card p-4 text-sm">
        {([
          ["system", "Crypto system", s.crypto_system_enabled],
          ["deposits", "Deposits", s.deposits_enabled],
          ["withdrawals", "Withdrawals", s.withdrawals_enabled],
        ] as const).map(([k, label, v]) => (
          <label key={k} className="flex items-center gap-2">
            <Switch checked={v} onCheckedChange={(c) => toggle(k, c)} /> {label}
          </label>
        ))}
        <span className="text-muted-foreground">Ledger custody: <b className="text-foreground">{formatUsd(d.custody_cents)}</b></span>
      </div>

      <h3 className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Withdrawals in progress</h3>
      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
        {d.pending.length === 0 && <li className="p-3 text-muted-foreground">None.</li>}
        {d.pending.map((w: any) => (
          <li key={w.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="flex-1">{w.username} · {w.asset_key} · {formatUsd(w.usd_cents)} → <span className="font-mono text-xs">{w.to_address.slice(0, 10)}…</span></span>
            <span className="text-xs">{w.status}</span>
            {w.status === "PENDING" && (
              <>
                <Button size="sm" onClick={() => act(w.id, true)}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => act(w.id, false)}>Reject</Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Unmatched deposits</h3>
      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
        {d.unmatched.length === 0 && <li className="p-3 text-muted-foreground">None.</li>}
        {d.unmatched.map((x: any) => (
          <li key={x.id} className="p-3 font-mono text-xs">{x.asset_key} from {x.from_address} · {formatUsd(x.usd_cents)} · {x.tx_hash.slice(0, 12)}…</li>
        ))}
      </ul>

      <h3 className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Alerts</h3>
      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
        {d.incidents.length === 0 && <li className="p-3 text-muted-foreground">No alerts.</li>}
        {d.incidents.map((i: any, n: number) => (
          <li key={n} className="p-3 text-xs"><b>{i.check_name}</b> × {i.occurrences} · {new Date(i.last_seen_at).toLocaleString()} · <span className="font-mono">{JSON.stringify(i.details)}</span></li>
        ))}
      </ul>
    </section>
  );
}

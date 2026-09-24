import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/jackpot/math";
import { TESTNET } from "@/lib/crypto/allowlist";
import {
  cancelCryptoWithdrawal,
  getCryptoActivity,
  quoteEthWithdrawal,
  requestCryptoWithdrawal,
} from "@/lib/crypto/crypto.functions";

const STATUS: Record<string, string> = {
  DETECTED: "Confirming",
  CONFIRMED: "Confirming",
  CREDITED: "Credited",
  UNMATCHED: "Unmatched — under review",
  REJECTED: "Rejected",
  PENDING: "Waiting for review",
  APPROVED: "Approved",
  SUBMITTING: "Sending",
  SUBMITTED: "Sent",
  RELEASED: "Cancelled — refunded",
};

function formatUnits(units: string, asset: string) {
  const dec = asset === "ETH" ? 18 : 6;
  const s = units.split(".")[0].padStart(dec + 1, "0");
  const v = `${s.slice(0, -dec)}.${s.slice(-dec)}`.replace(/\.?0+$/, "");
  return `${v} ${asset}`;
}

function TxLink({ hash }: { hash: string | null }) {
  if (!hash) return null;
  return (
    <a href={`${TESTNET.explorer}/tx/${hash}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline">
      {hash.slice(0, 10)}…
    </a>
  );
}

export function CryptoRails() {
  const qc = useQueryClient();
  const fetchActivity = useServerFn(getCryptoActivity);
  const doQuote = useServerFn(quoteEthWithdrawal);
  const doRequest = useServerFn(requestCryptoWithdrawal);
  const doCancel = useServerFn(cancelCryptoWithdrawal);
  const activity = useQuery({ queryKey: ["crypto-activity"], queryFn: () => fetchActivity(), refetchInterval: 15_000 });
  const [asset, setAsset] = useState<"USDC" | "ETH">("USDC");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<null | { quote_id: string; usd_cents: number; wei: string; price_micro_usd: number; expires_at: string }>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!quote) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [quote]);

  const a = activity.data;
  const cents = Math.round(Number(amount) * 100);
  const valid = Number.isFinite(cents) && cents > 0;
  const quoteLeft = quote ? Math.max(0, Math.ceil((new Date(quote.expires_at).getTime() - now) / 1000)) : 0;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crypto-activity"] });
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
  };

  async function getQuote() {
    setBusy(true);
    const r = await doQuote({ data: { usdCents: cents } }).finally(() => setBusy(false));
    if (!r.ok) return toast.error(r.error);
    setQuote(r.quote);
  }
  async function submit() {
    setBusy(true);
    const r = await doRequest({ data: { asset, usdCents: cents, quoteId: asset === "ETH" ? quote?.quote_id ?? null : null } }).finally(() => setBusy(false));
    setQuote(null);
    if (!r.ok) return toast.error(r.error);
    toast.success(r.result.status === "PENDING" ? "Withdrawal requested — waiting for review" : "Withdrawal approved — sending shortly");
    setAmount("");
    refresh();
  }
  async function cancel(id: string) {
    const r = await doCancel({ data: { id } });
    if (!r.ok) return toast.error(r.error);
    toast.success("Withdrawal cancelled and refunded");
    refresh();
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-sm uppercase tracking-widest">Crypto deposit &amp; withdraw</h2>
        <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-bold tracking-wider text-destructive">TESTNET · NO REAL VALUE</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Base Sepolia test network only. Test USDC and test ETH have no value.</p>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="min-h-[13rem] rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Deposit</div>
          {!a ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : !a.wallet ? (
            <p className="mt-3 text-sm">Verify a MetaMask wallet on your profile first. Deposits are matched to your verified wallet.</p>
          ) : (
            <>
              <p className="mt-2 text-sm">Send test USDC or test ETH on <b>Base Sepolia</b> to:</p>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(a.treasury); toast.success("Address copied"); }}
                className="mt-2 block w-full break-all rounded-lg bg-muted px-3 py-2 text-left font-mono text-xs hover:bg-muted/70"
              >
                {a.treasury}
              </button>
              <p className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-2 text-xs text-gold">
                Send only from your verified wallet <span className="font-mono">{a.wallet.slice(0, 6)}…{a.wallet.slice(-4)}</span>. Transfers from any other address are not credited automatically.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Minimum {formatUsd(a.settings.min_deposit_cents)}. Credited after about 6 minutes (safe block).
                {!a.settings.deposits_enabled && " Deposits are paused right now."}
              </p>
            </>
          )}
        </div>

        <div className="min-h-[13rem] rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Withdraw to your verified wallet</div>
          <div className="mt-3 flex gap-2">
            {(["USDC", "ETH"] as const).map((k) => (
              <Button key={k} size="sm" variant={asset === k ? "default" : "secondary"} onClick={() => { setAsset(k); setQuote(null); }}>
                {k}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input inputMode="decimal" placeholder="Amount in USD" value={amount} onChange={(e) => { setAmount(e.target.value); setQuote(null); }} />
            {asset === "ETH" && !quote ? (
              <Button onClick={getQuote} disabled={!valid || busy || !a?.settings.withdrawals_enabled}>Get quote</Button>
            ) : (
              <Button onClick={submit} disabled={!valid || busy || !a?.wallet || !a?.settings.withdrawals_enabled || (asset === "ETH" && quoteLeft === 0)}>
                Withdraw
              </Button>
            )}
          </div>
          <div className="mt-2 min-h-[2.5rem] text-xs text-muted-foreground">
            {asset === "ETH" && quote ? (
              quoteLeft > 0 ? (
                <>You receive <b className="text-foreground">{formatUnits(quote.wei, "ETH")}</b> at ${(quote.price_micro_usd / 1e6).toFixed(2)}/ETH · quote valid {quoteLeft}s</>
              ) : (
                <>Quote expired. <button className="text-primary underline" onClick={getQuote}>Get a new quote</button></>
              )
            ) : a ? (
              <>Fee {formatUsd(a.settings.fee_cents)} · min {formatUsd(a.settings.min_withdrawal_cents)} · {formatUsd(a.settings.daily_limit_cents)}/day · above {formatUsd(a.settings.auto_approve_cents)} is reviewed.{!a.settings.withdrawals_enabled && " Withdrawals are paused right now."}</>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        {!a || (!a.deposits.length && !a.withdrawals.length) ? (
          <p className="p-4 text-sm text-muted-foreground">{a ? "No crypto deposits or withdrawals yet." : "Loading…"}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {[
              ...a.deposits.map((d: any) => ({ ...d, type: "Deposit", at: d.detected_at })),
              ...a.withdrawals.map((w: any) => ({ ...w, type: "Withdrawal", at: w.created_at })),
            ]
              .sort((x, y) => (x.at < y.at ? 1 : -1))
              .map((r: any) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{r.type} · {formatUnits(r.units, r.asset_key)}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{new Date(r.at).toLocaleString()}</span>
                      <TxLink hash={r.tx_hash} />
                    </div>
                  </div>
                  <span className="text-xs">{r.status === "CONFIRMED" && r.type === "Withdrawal" ? "Confirmed" : STATUS[r.status] ?? r.status}</span>
                  <span className="tabular font-semibold">{r.type === "Deposit" ? "+" : "−"}{formatUsd(r.usd_cents)}</span>
                  {r.type === "Withdrawal" && ["PENDING", "APPROVED"].includes(r.status) && (
                    <Button size="sm" variant="secondary" onClick={() => cancel(r.id)}>Cancel</Button>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/jackpot/math";
import { TESTNET } from "@/lib/crypto/allowlist";
import type { DepositInstruction } from "@/lib/crypto/deposit";
import { getWalletSession } from "@/lib/web3/metamask";
import { WALLET_CONFIG } from "@/lib/web3/config";
import { WalletError, WALLET_MESSAGES } from "@/lib/web3/errors";
import {
  cancelCryptoWithdrawal,
  getCryptoActivity,
  prepareCryptoDeposit,
  quoteEthWithdrawal,
  requestCryptoWithdrawal,
} from "@/lib/crypto/crypto.functions";

const STATUS: Record<string, string> = {
  DETECTED: "Detected", CONFIRMED: "Confirming", CREDITED: "Credited",
  UNMATCHED: "Unmatched — under review", REJECTED: "Rejected", PENDING: "Waiting for review",
  APPROVED: "Approved", SUBMITTING: "Sending", SUBMITTED: "Sent", RELEASED: "Cancelled — refunded",
};
const PRESETS = [5, 10, 25, 50];
type Asset = "USDC" | "ETH";
type DepositReview = {
  instruction: DepositInstruction;
  verifiedAddress: string;
  usdCents: number;
  priceMicroUsd: number | null;
};
type WithdrawalReview = {
  asset: Asset;
  usdCents: number;
  quote: null | { quote_id: string; usd_cents: number; wei: string; price_micro_usd: number; expires_at: string };
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
function formatUnits(units: string, asset: Asset) {
  const decimals = asset === "ETH" ? 18 : 6;
  const padded = (units.split(".")[0] ?? "0").padStart(decimals + 1, "0");
  const value = `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`.replace(/\.?0+$/, "");
  return `${value} ${asset}`;
}
function TxLink({ hash }: { hash: string | null }) {
  if (!hash) return null;
  return (
    <a href={`${TESTNET.explorer}/tx/${hash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
      {hash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
    </a>
  );
}
function AssetSelector({ value, onChange }: { value: Asset; onChange: (asset: Asset) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Asset">
      {(["USDC", "ETH"] as const).map((asset) => (
        <Button key={asset} type="button" variant={value === asset ? "default" : "secondary"} onClick={() => onChange(asset)}>
          {asset}
        </Button>
      ))}
    </div>
  );
}
function AmountField({ amount, setAmount, max }: { amount: string; setAmount: (value: string) => void; max: number | undefined }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor="crypto-amount" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Amount in USD</label>
        {max !== undefined && <span className="text-xs text-muted-foreground">Available {formatUsd(max)}</span>}
      </div>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">$</span>
        <Input id="crypto-amount" inputMode="decimal" autoComplete="off" className="h-12 pl-7 pr-16 font-mono text-lg" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
        {max !== undefined && <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-2" onClick={() => setAmount((max / 100).toFixed(2))}>Max</Button>}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {PRESETS.map((preset) => <Button key={preset} type="button" size="sm" variant="secondary" onClick={() => setAmount(String(preset))}>${preset}</Button>)}
      </div>
    </div>
  );
}

export function CryptoRails({
  availableCents,
  requestedMode = "deposit",
}: {
  availableCents: number;
  requestedMode?: "deposit" | "withdraw";
}) {
  const qc = useQueryClient();
  const fetchActivity = useServerFn(getCryptoActivity);
  const prepareDeposit = useServerFn(prepareCryptoDeposit);
  const doQuote = useServerFn(quoteEthWithdrawal);
  const doRequest = useServerFn(requestCryptoWithdrawal);
  const doCancel = useServerFn(cancelCryptoWithdrawal);
  const activity = useQuery({ queryKey: ["crypto-activity"], queryFn: () => fetchActivity(), refetchInterval: 15_000 });
  const [mode, setMode] = useState<"deposit" | "withdraw">(requestedMode);
  const [asset, setAsset] = useState<Asset>("USDC");
  const [amount, setAmount] = useState("");
  const [depositReview, setDepositReview] = useState<DepositReview | null>(null);
  const [withdrawalReview, setWithdrawalReview] = useState<WithdrawalReview | null>(null);
  const [submittedHash, setSubmittedHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const data = activity.data;
  const cents = Math.round(Number(amount) * 100);
  const valid = Number.isFinite(cents) && cents > 0;
  const quoteLeft = withdrawalReview?.quote ? Math.max(0, Math.ceil((new Date(withdrawalReview.quote.expires_at).getTime() - now) / 1000)) : 0;

  useEffect(() => {
    if (!withdrawalReview?.quote) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [withdrawalReview?.quote]);

  const rows = useMemo(() => data ? [
    ...data.deposits.map((row: any) => ({ ...row, type: "Deposit", at: row.detected_at })),
    ...data.withdrawals.map((row: any) => ({ ...row, type: "Withdrawal", at: row.created_at })),
  ].sort((a, b) => a.at < b.at ? 1 : -1) : [], [data]);

  function reset(nextMode = mode, nextAsset = asset) {
    setMode(nextMode);
    setAsset(nextAsset);
    setAmount("");
    setDepositReview(null);
    setWithdrawalReview(null);
    setSubmittedHash(null);
  }
  function refresh() {
    qc.invalidateQueries({ queryKey: ["crypto-activity"] });
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
  }
  async function reviewDeposit() {
    setBusy(true);
    try {
      const result = await prepareDeposit({ data: { asset, usdCents: cents } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDepositReview(result as DepositReview & { ok: true });
    } finally { setBusy(false); }
  }
  async function sendDeposit() {
    if (!depositReview) return;
    setBusy(true);
    try {
      const session = await getWalletSession();
      const connected = await session.connect();
      if (connected.address.toLowerCase() !== depositReview.verifiedAddress.toLowerCase()) {
        throw new WalletError("ADDRESS_MISMATCH");
      }
      let chain = connected.chainId;
      if (chain !== WALLET_CONFIG.requiredChainId) {
        await session.switchToRequiredNetwork();
        chain = await session.chainId();
      }
      if (chain !== WALLET_CONFIG.requiredChainId) throw new WalletError("UNSUPPORTED_NETWORK");
      const hash = await session.sendTestDeposit(depositReview.instruction, depositReview.verifiedAddress);
      setSubmittedHash(hash);
      toast.success("Deposit submitted to Base Sepolia");
      window.setTimeout(refresh, 1500);
    } catch (error) {
      toast.error(error instanceof WalletError ? error.message : WALLET_MESSAGES.GENERIC);
    } finally { setBusy(false); }
  }
  async function reviewWithdrawal() {
    if (!valid) return;
    setBusy(true);
    try {
      if (asset === "ETH") {
        const result = await doQuote({ data: { usdCents: cents } });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setNow(Date.now());
        setWithdrawalReview({ asset, usdCents: cents, quote: result.quote });
      } else setWithdrawalReview({ asset, usdCents: cents, quote: null });
    } finally { setBusy(false); }
  }
  async function confirmWithdrawal() {
    if (!withdrawalReview) return;
    setBusy(true);
    try {
      const result = await doRequest({ data: { asset: withdrawalReview.asset, usdCents: withdrawalReview.usdCents, quoteId: withdrawalReview.quote?.quote_id ?? null } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.result.status === "PENDING" ? "Withdrawal requested — waiting for review" : "Withdrawal approved — sending shortly");
      reset("withdraw", asset);
      refresh();
    } finally { setBusy(false); }
  }
  async function cancel(id: string) {
    const result = await doCancel({ data: { id } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Withdrawal cancelled and refunded");
    refresh();
  }

  return (
    <section className="mt-8" aria-label="Crypto wallet">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-sm uppercase tracking-widest">Crypto wallet</h2>
        <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-bold tracking-wider text-destructive">TESTNET · NO REAL VALUE</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Base Sepolia only. Test USDC and test ETH have no cash value.</p>

      <div className="mt-4 grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Crypto action">
        <Button role="tab" aria-selected={mode === "deposit"} variant={mode === "deposit" ? "default" : "ghost"} onClick={() => reset("deposit", asset)}><ArrowDownToLine /> Add funds</Button>
        <Button role="tab" aria-selected={mode === "withdraw"} variant={mode === "withdraw" ? "default" : "ghost"} onClick={() => reset("withdraw", asset)}><ArrowUpFromLine /> Withdraw</Button>
      </div>

      <div className="mt-3 min-h-[31rem] rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-base">{mode === "deposit" ? "Add test funds" : "Withdraw test funds"}</div>
              <div className="mt-1 text-xs text-muted-foreground">Base Sepolia · Verified wallet only</div>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          {!data ? <div className="mt-6 h-72 animate-pulse rounded-lg bg-muted" /> : !data.wallet ? (
            <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">Verify a MetaMask wallet on your Profile before depositing or withdrawing.</div>
          ) : submittedHash ? (
            <div className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-5 text-center">
              <Check className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-3 font-display text-sm">Deposit submitted</h3>
              <p className="mt-2 text-sm text-muted-foreground">MetaMask sent the transaction. Test credits appear only after the server verifies the safe block, usually about 6 minutes.</p>
              <div className="mt-3"><TxLink hash={submittedHash} /></div>
              <Button className="mt-4" variant="secondary" onClick={() => reset("deposit", asset)}>Make another deposit</Button>
            </div>
          ) : mode === "deposit" && depositReview ? (
            <div className="mt-6 space-y-4">
              <h3 className="font-display text-sm">Review deposit</h3>
              <dl className="divide-y divide-border rounded-lg border border-border bg-muted/30 text-sm">
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">You send</dt><dd className="font-mono font-semibold">{formatUnits(depositReview.instruction.units, asset)}</dd></div>
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">Estimated credit</dt><dd className="font-mono font-semibold">{formatUsd(depositReview.usdCents)}</dd></div>
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">From</dt><dd className="font-mono">{shortAddress(depositReview.verifiedAddress)}</dd></div>
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">To PVPspinArena</dt><dd className="font-mono">{shortAddress(depositReview.instruction.treasury)}</dd></div>
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">Network</dt><dd>Base Sepolia</dd></div>
              </dl>
              {asset === "ETH" && <p className="text-xs text-muted-foreground">ETH credit is recalculated from the server price when the confirmed deposit is credited.</p>}
              <div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => setDepositReview(null)}>Back</Button><Button onClick={sendDeposit} disabled={busy}>{busy ? "Check MetaMask…" : "Deposit with MetaMask"}</Button></div>
              <Button variant="ghost" className="w-full" onClick={() => navigator.clipboard.writeText(depositReview.instruction.treasury).then(() => toast.success("Deposit address copied"))}><Copy /> Copy address instead</Button>
            </div>
          ) : mode === "withdraw" && withdrawalReview ? (
            <div className="mt-6 space-y-4">
              <h3 className="font-display text-sm">Review withdrawal</h3>
              <dl className="divide-y divide-border rounded-lg border border-border bg-muted/30 text-sm">
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">Balance deducted</dt><dd className="font-mono font-semibold">{formatUsd(withdrawalReview.usdCents)}</dd></div>
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">You receive</dt><dd className="font-mono font-semibold">{withdrawalReview.quote ? formatUnits(withdrawalReview.quote.wei, "ETH") : formatUnits(String(BigInt(withdrawalReview.usdCents) * 10_000n), "USDC")}</dd></div>
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">To</dt><dd className="font-mono">{shortAddress(data.wallet)}</dd></div>
                <div className="flex justify-between gap-3 p-3"><dt className="text-muted-foreground">Fee</dt><dd>{formatUsd(data.settings.fee_cents)}</dd></div>
              </dl>
              {withdrawalReview.quote && <p className={quoteLeft ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{quoteLeft ? `ETH quote expires in ${quoteLeft}s` : "Quote expired. Go back and request a new quote."}</p>}
              {withdrawalReview.usdCents > data.settings.auto_approve_cents && <p className="text-xs text-muted-foreground">This amount requires review before it is sent.</p>}
              <div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => setWithdrawalReview(null)}>Back</Button><Button onClick={confirmWithdrawal} disabled={busy || (!!withdrawalReview.quote && quoteLeft === 0)}>{busy ? "Submitting…" : "Confirm withdrawal"}</Button></div>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <AssetSelector value={asset} onChange={(next) => reset(mode, next)} />
              <AmountField amount={amount} setAmount={(value) => { setAmount(value); setDepositReview(null); setWithdrawalReview(null); }} max={mode === "withdraw" ? availableCents : undefined} />
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                {mode === "deposit" ? <><b className="text-foreground">From {shortAddress(data.wallet)}</b><br />Only a transfer sent from this verified address is credited. Minimum {formatUsd(data.settings.min_deposit_cents)} · about 6 minutes.</> : <><b className="text-foreground">To {shortAddress(data.wallet)}</b><br />Minimum {formatUsd(data.settings.min_withdrawal_cents)} · {formatUsd(data.settings.daily_limit_cents)}/day · above {formatUsd(data.settings.auto_approve_cents)} requires review.</>}
              </div>
              <Button className="h-11 w-full" onClick={mode === "deposit" ? reviewDeposit : reviewWithdrawal} disabled={!valid || busy || (mode === "deposit" ? !data.settings.deposits_enabled : !data.settings.withdrawals_enabled) || (mode === "withdraw" && cents > availableCents)}>
                {busy ? "Preparing…" : mode === "deposit" ? "Review deposit" : asset === "ETH" ? "Get ETH quote" : "Review withdrawal"}
              </Button>
              {!(mode === "deposit" ? data.settings.deposits_enabled : data.settings.withdrawals_enabled) && <p className="text-center text-xs text-destructive">{mode === "deposit" ? "Deposits" : "Withdrawals"} are paused right now.</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-widest">Crypto activity</div>
        {!data || rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">{data ? "No crypto activity yet." : "Loading…"}</p> : (
          <ul className="divide-y divide-border text-sm">
            {rows.map((row: any) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1"><div className="font-medium">{row.type} · {formatUnits(row.units, row.asset_key)}</div><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{new Date(row.at).toLocaleString()}</span><TxLink hash={row.tx_hash} /></div></div>
                <span className="text-xs">{row.status === "CONFIRMED" && row.type === "Withdrawal" ? "Confirmed" : STATUS[row.status] ?? row.status}</span>
                <span className="font-mono font-semibold">{row.type === "Deposit" ? "+" : "−"}{formatUsd(row.usd_cents)}</span>
                {row.type === "Withdrawal" && ["PENDING", "APPROVED"].includes(row.status) && <Button size="sm" variant="secondary" onClick={() => cancel(row.id)}>Cancel</Button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
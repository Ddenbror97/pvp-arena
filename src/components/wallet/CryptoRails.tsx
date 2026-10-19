import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import {
  checkWithdrawalLiquidity,
  quoteEthWithdrawal,
  requestCryptoWithdrawal,
} from "@/lib/crypto/crypto.functions";
import {
  formatCryptoUnits,
  pegUnits,
  railEquivalent,
  readStoredRail,
  resolveRail,
  writeStoredRail,
  type FundingAsset,
} from "@/lib/crypto/rails";
import { depositWaitPhrase } from "@/lib/crypto/deposit-notice";
import { announceWithdrawalSubmitted } from "@/lib/crypto/withdraw-notify";
import { useCryptoActivity, type CryptoActivity } from "@/components/wallet/RailPreference";
import { BtcDepositPanel } from "@/components/wallet/BtcDepositPanel";
import { getBtcDepositConfig, getBtcPayoutConfig } from "@/lib/crypto/btcpay/btcpay.functions";
import { claimSendLock, VerifiedWalletActions } from "@/components/wallet/VerifiedWalletActions";
import { TokenMark } from "@/components/wallet/TokenMark";
import { useWithdrawalCode, WithdrawalCodeField } from "@/components/wallet/WithdrawalCode";
import { PartnerProfitNote, usePartnerProfitHold } from "@/components/wallet/PartnerProfitHold";
import {
  BonusCashoutNotice,
  cashoutMaxCents,
  cashoutMaxLabel,
} from "@/components/wallet/BonusCashoutNotice";
import { bonusWithdrawBlockedMessage } from "@/lib/crypto/bonus-withdraw";

const PRESETS = [20, 50, 100, 250];
/** Rail order left to right; Bitcoin is its own rail and sits last. */
const RAIL_ORDER = ["USDC", "ETH"];
const DEFAULT_RAIL = "USDC";
function railRank(key: string) {
  const i = RAIL_ORDER.indexOf(key);
  return i === -1 ? RAIL_ORDER.length : i;
}
function fallbackRail(keys: string[]) {
  return keys.includes(DEFAULT_RAIL) ? DEFAULT_RAIL : (keys[0] ?? "BTC");
}
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
type WithdrawalReview = {
  asset: string;
  usdCents: number;
  toAddress: string;
  quote: null | {
    quote_id: string;
    usd_cents: number;
    wei: string;
    price_micro_usd: number;
    expires_at: string;
  };
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
function storage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
function CurrencyList({
  assets,
  value,
  onChange,
  withdraw,
  floors,
  layout = "stack",
}: {
  assets: FundingAsset[];
  value: string;
  onChange: (asset: string) => void;
  withdraw: boolean;
  floors: Record<string, number>;
  layout?: "stack" | "row";
}) {
  const loaded = assets
    .map((asset) => ({
      key: asset.asset_key,
      label: asset.asset_key,
      closed: withdraw && !asset.payout_ready,
      pending: false,
    }))
    .sort((a, b) => railRank(a.key) - railRank(b.key));
  const btc = { key: "BTC", label: "BTC", closed: false, pending: false };
  const rows =
    loaded.length > 0
      ? [...loaded, btc]
      : [
          { key: "USDC", label: "USDC", closed: false, pending: true },
          { key: "ETH", label: "ETH", closed: false, pending: true },
          btc,
        ];
  if (layout === "row") {
    return (
      <div role="radiogroup" aria-label="Currency" className="grid grid-cols-3 gap-1.5">
        {rows.map((row) => {
          const selected = row.key === value;
          return (
            <button
              key={row.key}
              type="button"
              role="radio"
              aria-checked={selected}
              title={row.closed ? `${row.label} withdrawals are unavailable` : row.label}
              disabled={row.pending}
              onClick={() => {
                if (!row.pending) onChange(row.key);
              }}
              className={`flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 ${
                row.pending || row.closed
                  ? "border-border bg-muted/30 text-muted-foreground"
                  : selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <TokenMark asset={row.key} className="h-4 w-4" />
              <span className="min-w-0 text-left">
                <span className="block truncate text-xs font-medium leading-4">{row.label}</span>
                <span className="block h-3 truncate text-[10px] font-normal leading-3 text-muted-foreground">
                  {row.closed ? "Disabled" : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="radiogroup" aria-label="Currency" className="space-y-1">
      {rows.map((row) => {
        const selected = row.key === value;
        const floor = floors[row.key];
        return (
          <button
            key={row.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(row.key)}
            className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left ${selected ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/40"}`}
          >
            <TokenMark asset={row.key} className="h-6 w-6" />
            <span className="text-xs font-medium">{row.label}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {row.closed ? "Withdrawals unavailable" : floor ? `From ${formatUsd(floor)}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
function AmountField({
  amount,
  setAmount,
  max,
  maxAsset,
  id,
}: {
  amount: string;
  setAmount: (value: string) => void;
  max: number | undefined;
  maxAsset?: string | null;
  id: string;
}) {
  return (
    <div>
      <div className="flex min-h-4 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <label
          htmlFor={id}
          className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Amount in USD
        </label>
        {max !== undefined && (
          <span className="text-[11px] text-muted-foreground sm:text-right">
            Available {formatUsd(max)}
            {maxAsset ? ` · ${maxAsset}` : ""}
          </span>
        )}
      </div>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="h-9 pl-7 pr-14 font-mono"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        {max !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0.5 top-1/2 h-7 -translate-y-1/2 px-2"
            onClick={() => setAmount((max / 100).toFixed(2))}
          >
            Max
          </Button>
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setAmount(String(preset))}
          >
            ${preset}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function CryptoRails({
  availableCents,
  requestedMode = "deposit",
  requestedAsset,
  children,
}: {
  availableCents: number;
  requestedMode?: "deposit" | "withdraw";
  requestedAsset?: string | undefined;
  children: (panels: { form: ReactNode }) => ReactNode;
}) {
  const qc = useQueryClient();
  const doQuote = useServerFn(quoteEthWithdrawal);
  const doRequest = useServerFn(requestCryptoWithdrawal);
  const doLiquidity = useServerFn(checkWithdrawalLiquidity);
  const btcDepositFn = useServerFn(getBtcDepositConfig);
  const btcPayoutFn = useServerFn(getBtcPayoutConfig);
  const activity = useCryptoActivity(true);
  const btcDeposit = useQuery({
    queryKey: ["btc-deposit-config"],
    queryFn: () => btcDepositFn(),
    staleTime: 30_000,
  });
  const btcPayout = useQuery({
    queryKey: ["btc-payout-config"],
    queryFn: () => btcPayoutFn(),
    staleTime: 30_000,
  });
  const [depositRail, setDepositRail] = useState(
    requestedMode !== "withdraw" && requestedAsset ? requestedAsset : DEFAULT_RAIL,
  );
  const [withdrawRail, setWithdrawRail] = useState(
    requestedMode === "withdraw" && requestedAsset ? requestedAsset : DEFAULT_RAIL,
  );
  const seededRails = useRef(false);
  const [chainId, setChainId] = useState<number>(8453);
  const [amount, setAmount] = useState("20");
  const [outAddress, setOutAddress] = useState("");
  const [withdrawalReview, setWithdrawalReview] = useState<WithdrawalReview | null>(null);
  const [busy, setBusy] = useState(false);
  const withdrawLock = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const emailCode = useWithdrawalCode();
  const heldCents = usePartnerProfitHold(true);
  const data: CryptoActivity | undefined = activity.data;
  const withdrawSnap = data?.withdraw ?? null;
  const withdrawableCents = cashoutMaxCents(availableCents, heldCents, withdrawSnap);
  const cashoutCapHint = cashoutMaxLabel(withdrawSnap, withdrawableCents);
  const chains = data?.chains ?? [];
  const chain = chains.find((c) => c.chain_id === chainId) ?? chains[0];
  const assets = chain?.assets ?? [];
  const withdrawAsset = assets.find((item) => item.asset_key === withdrawRail) ?? null;
  const depositAsset = assets.find((item) => item.asset_key === depositRail) ?? null;
  const chainName = chain?.name ?? "Network";
  const isTestnet = chain?.network_mode === "testnet";
  const cents = parseUsdToCents(amount);
  const outOk = EVM_ADDRESS.test(outAddress.trim());
  const quoteLeft = withdrawalReview?.quote
    ? Math.max(0, Math.ceil((new Date(withdrawalReview.quote.expires_at).getTime() - now) / 1000))
    : 0;
  const assetKeys = assets.map((item) => item.asset_key).join("\n");
  const codeTarget =
    withdrawalReview && chain
      ? {
          rail: "evm" as const,
          chainId: chain.chain_id,
          asset: withdrawalReview.asset,
          usdCents: withdrawalReview.usdCents,
          address: withdrawalReview.toAddress,
        }
      : null;
  const codeProof = codeTarget ? emailCode.proof(codeTarget) : null;
  const minDepositCents = chain?.min_deposit_cents ?? data?.settings.min_deposit_cents ?? 200;
  const minWithdrawCents =
    chain?.min_withdrawal_cents ?? data?.settings.min_withdrawal_cents ?? 2000;
  const depositFloors: Record<string, number> = {
    BTC: btcDeposit.data?.enabled ? btcDeposit.data.minCents : 200,
  };
  const withdrawFloors: Record<string, number> = {
    BTC: btcPayout.data?.enabled ? btcPayout.data.minCents : 2000,
  };
  for (const item of assets) {
    depositFloors[item.asset_key] = minDepositCents;
    withdrawFloors[item.asset_key] = minWithdrawCents;
  }
  useEffect(() => {
    if (requestedMode !== "withdraw") return;
    document.getElementById("wallet-withdraw")?.scrollIntoView({ block: "nearest" });
  }, [requestedMode]);
  useEffect(() => {
    if (outAddress || !data?.wallet) return;
    setOutAddress(data.wallet);
  }, [data?.wallet, outAddress]);

  useEffect(() => {
    const keys = assets.map((item) => item.asset_key);
    const stored = readStoredRail(storage());
    if (stored && stored !== "BTC" && keys.length > 0 && stored !== resolveRail(stored, keys))
      writeStoredRail(storage(), null);
    const requested =
      requestedAsset && (requestedAsset === "BTC" || keys.includes(requestedAsset))
        ? requestedAsset
        : null;
    if (!seededRails.current) {
      // A plain visit opens on USDC. A header link can still name one asset.
      if (requested && requestedMode === "withdraw") setWithdrawRail(requested);
      else if (requested) setDepositRail(requested);
      seededRails.current = true;
      return;
    }
    if (keys.length === 0) return;
    setDepositRail((current) =>
      current === "BTC" || keys.includes(current) ? current : fallbackRail(keys),
    );
    setWithdrawRail((current) =>
      current === "BTC" || keys.includes(current) ? current : fallbackRail(keys),
    );
  }, [chain?.chain_id, requestedAsset, assetKeys, requestedMode]);

  useEffect(() => {
    if (!withdrawalReview?.quote) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [withdrawalReview?.quote]);

  function clearWithdrawDraft() {
    setAmount("20");
    setWithdrawalReview(null);
  }
  function chooseDeposit(next: string) {
    writeStoredRail(storage(), next);
    setDepositRail(next);
  }
  function chooseWithdraw(next: string) {
    writeStoredRail(storage(), next);
    setWithdrawRail(next);
    setWithdrawalReview(null);
  }
  function refresh() {
    qc.invalidateQueries({ queryKey: ["crypto-activity"] });
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
  }
  async function reviewWithdrawal() {
    if (withdrawLock.current || busy) return;
    if (cents == null || !withdrawAsset || !chain || !outOk) return;
    if (cents < minWithdrawCents) {
      toast.error(`Minimum cashout is ${formatUsd(minWithdrawCents)}.`);
      return;
    }
    if (withdrawSnap && cents > withdrawableCents) {
      toast.error(bonusWithdrawBlockedMessage(withdrawSnap, cents));
      return;
    }
    const toAddress = outAddress.trim();
    if (!claimSendLock(withdrawLock)) return;
    setBusy(true);
    try {
      const liquid = await doLiquidity({
        data: { asset: withdrawAsset.asset_key, usdCents: cents, chainId: chain.chain_id },
      });
      if (!liquid.ok) {
        toast.error(liquid.error);
        return;
      }
      if (withdrawAsset.settlement_kind === "native") {
        const result = await doQuote({ data: { usdCents: cents, chainId: chain.chain_id } });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setNow(Date.now());
        setWithdrawalReview({
          asset: withdrawAsset.asset_key,
          usdCents: cents,
          toAddress,
          quote: result.quote,
        });
      } else
        setWithdrawalReview({
          asset: withdrawAsset.asset_key,
          usdCents: cents,
          toAddress,
          quote: null,
        });
      await emailCode.send({
        rail: "evm",
        chainId: chain.chain_id,
        asset: withdrawAsset.asset_key,
        usdCents: cents,
        address: toAddress,
      });
    } catch {
      toast.error("Withdrawals are unavailable right now.");
    } finally {
      withdrawLock.current = false;
      setBusy(false);
    }
  }
  async function confirmWithdrawal() {
    if (withdrawLock.current || busy) return;
    if (!withdrawalReview || !chain || !codeProof) return;
    if (!claimSendLock(withdrawLock)) return;
    setBusy(true);
    try {
      const result = await doRequest({
        data: {
          asset: withdrawalReview.asset,
          usdCents: withdrawalReview.usdCents,
          quoteId: withdrawalReview.quote?.quote_id ?? null,
          chainId: chain.chain_id,
          toAddress: withdrawalReview.toAddress,
          ...codeProof,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        emailCode.failed(result.error);
        return;
      }
      emailCode.clear();
      announceWithdrawalSubmitted({
        usdCents: withdrawalReview.usdCents,
        asset: withdrawalReview.asset,
        network: "base",
      });
      clearWithdrawDraft();
      refresh();
    } catch {
      toast.error("Withdrawals are unavailable right now.");
    } finally {
      withdrawLock.current = false;
      setBusy(false);
    }
  }
  const receiveUnits =
    withdrawalReview && withdrawAsset
      ? withdrawalReview.quote
        ? formatCryptoUnits(
            withdrawalReview.quote.wei,
            withdrawAsset.decimals,
            withdrawAsset.asset_key,
          )
        : formatCryptoUnits(
            pegUnits(withdrawalReview.usdCents, withdrawAsset.decimals),
            withdrawAsset.decimals,
            withdrawAsset.asset_key,
          )
      : "";

  function networkPicker() {
    if (chains.length <= 1) return null;
    return (
      <div
        className="mb-2 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${Math.min(chains.length, 3)}, 1fr)` }}
        aria-label="Network"
      >
        {chains.map((c) => (
          <Button
            key={c.chain_id}
            type="button"
            variant={c.chain_id === chain?.chain_id ? "default" : "secondary"}
            size="sm"
            onClick={() => {
              setChainId(c.chain_id);
              setWithdrawalReview(null);
            }}
          >
            {c.name}
          </Button>
        ))}
      </div>
    );
  }
  function testnetMark() {
    if (!isTestnet) return null;
    return (
      <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-bold tracking-wider text-destructive">
        TESTNET · NO REAL VALUE
      </span>
    );
  }

  const form = (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <section aria-label="Deposit" className="min-w-0 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-none">Deposit</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {depositRail === "BTC"
                ? "Send Bitcoin to the address below."
                : `Connect a wallet and send ${depositAsset?.asset_key ?? "crypto"} on ${chainName}.`}
            </p>
          </div>
        </div>
        {depositRail !== "BTC" && isTestnet ? <div className="mt-2">{testnetMark()}</div> : null}
        <div className="mt-3 space-y-2.5">
          <CurrencyList
            assets={assets}
            value={depositRail}
            onChange={chooseDeposit}
            withdraw={false}
            floors={depositFloors}
            layout="row"
          />
          <div className="min-h-[18.5rem] min-w-0">
            <div className={depositRail === "BTC" ? undefined : "hidden"}>
              <BtcDepositPanel mode="deposit" active={depositRail === "BTC"} />
            </div>
            <div className={depositRail === "BTC" ? "hidden" : undefined}>
              {networkPicker()}
              <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-xs leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground">Send from a linked wallet</p>
                <p className="mt-1">
                  Connect MetaMask or Coinbase Wallet, sign once to link it, then send{" "}
                  {depositAsset?.asset_key ?? "USDC or ETH"} on {chainName}. Minimum{" "}
                  {formatUsd(minDepositCents)}. The balance updates within{" "}
                  {depositWaitPhrase(chain?.network_mode)}. A send from an unlinked wallet is not
                  credited.
                </p>
                {data && !data.settings.deposits_enabled ? (
                  <p className="mt-2 text-destructive">Deposits are paused.</p>
                ) : null}
              </div>
            </div>
          </div>
          {depositRail !== "BTC" ? (
            <VerifiedWalletActions
              purpose="deposit"
              chainId={chain?.chain_id ?? chainId}
              asset={depositAsset?.asset_key ?? null}
              minCents={minDepositCents}
              payments
            />
          ) : null}
        </div>
      </section>
      <section
        id="wallet-withdraw"
        aria-label="Withdraw"
        className="min-w-0 rounded-lg border border-border bg-card p-3"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-none">Withdraw</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {withdrawRail === "BTC"
                ? "Cash out to a bc1 address."
                : "Cash out to a Base address."}
            </p>
          </div>
        </div>
        {withdrawRail !== "BTC" && isTestnet ? <div className="mt-2">{testnetMark()}</div> : null}
        <div className="mt-3">
          <CurrencyList
            assets={assets}
            value={withdrawRail}
            onChange={chooseWithdraw}
            withdraw
            floors={withdrawFloors}
            layout="row"
          />
        </div>
        <div className={withdrawRail === "BTC" ? "mt-2.5" : "hidden"}>
          <BtcDepositPanel mode="withdraw" active={withdrawRail === "BTC"} />
        </div>
        <div className={withdrawRail === "BTC" ? "hidden" : undefined}>
          {withdrawRail !== "BTC" && !withdrawalReview ? (
            <VerifiedWalletActions
              purpose="withdraw"
              chainId={chain?.chain_id ?? chainId}
              asset={withdrawAsset?.asset_key ?? null}
              minCents={minWithdrawCents}
              activeAddress={outAddress}
              onAddress={(address) => {
                setOutAddress(address);
                setWithdrawalReview(null);
              }}
              payments
            />
          ) : null}
          {!data ? (
            <div className="mt-2.5 min-h-[18rem] animate-pulse rounded-lg bg-muted" aria-hidden />
          ) : withdrawalReview && withdrawAsset ? (
            <div className="mt-2.5 space-y-2.5">
              {networkPicker()}
              <h3 className="font-display text-sm">Review withdrawal</h3>
              <dl className="divide-y divide-border rounded-lg border border-border bg-muted/30 text-xs">
                <div className="flex justify-between gap-3 px-2.5 py-1.5">
                  <dt className="text-muted-foreground">Balance deducted</dt>
                  <dd className="font-mono font-semibold">
                    {formatUsd(withdrawalReview.usdCents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-2.5 py-1.5">
                  <dt className="text-muted-foreground">You receive</dt>
                  <dd className="font-mono font-semibold">{receiveUnits}</dd>
                </div>
                <div className="flex justify-between gap-3 px-2.5 py-1.5">
                  <dt className="text-muted-foreground">To</dt>
                  <dd className="font-mono">{shortAddress(withdrawalReview.toAddress)}</dd>
                </div>
                <div className="flex justify-between gap-3 px-2.5 py-1.5">
                  <dt className="text-muted-foreground">Network</dt>
                  <dd>{chainName}</dd>
                </div>
                <div className="flex justify-between gap-3 px-2.5 py-1.5">
                  <dt className="text-muted-foreground">Fee</dt>
                  <dd>{formatUsd(data.settings.fee_cents)}</dd>
                </div>
              </dl>
              {withdrawalReview.quote && (
                <p
                  className={
                    quoteLeft ? "text-xs text-muted-foreground" : "text-xs text-destructive"
                  }
                >
                  {quoteLeft
                    ? `Quote expires in ${quoteLeft}s. The crypto amount is fixed by this server quote.`
                    : "Quote expired. Go back and request a new quote."}
                </p>
              )}
              {withdrawalReview.usdCents > data.settings.auto_approve_cents && (
                <p className="text-xs text-muted-foreground">
                  This amount requires review before it is sent.
                </p>
              )}
              {codeTarget && (
                <WithdrawalCodeField
                  ctl={emailCode}
                  target={codeTarget}
                  disabled={busy}
                  onConfirm={() => void confirmWithdrawal()}
                  confirmLabel={busy ? "Submitting…" : "Confirm withdrawal"}
                />
              )}
              {codeTarget && !emailCode.sentFor(codeTarget) && !emailCode.sending && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => void emailCode.send(codeTarget)}
                >
                  Email me a withdrawal code
                </Button>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" onClick={() => setWithdrawalReview(null)}>
                  Back
                </Button>
                <Button
                  onClick={confirmWithdrawal}
                  disabled={busy || !codeProof || (!!withdrawalReview.quote && quoteLeft === 0)}
                >
                  {busy ? "Submitting…" : "Confirm withdrawal"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-1 flex-col space-y-2.5">
              {networkPicker()}
              <AmountField
                id="crypto-amount"
                amount={amount}
                setAmount={(value) => {
                  setAmount(value);
                  setWithdrawalReview(null);
                }}
                max={withdrawableCents}
                maxAsset={withdrawAsset ? railEquivalent(withdrawAsset, withdrawableCents) : null}
              />
              <PartnerProfitNote heldCents={heldCents} availableCents={availableCents} />
              {withdrawSnap ? (
                <BonusCashoutNotice snap={withdrawSnap} availableCents={availableCents} />
              ) : null}
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                <label htmlFor="evm-cashout-address" className="font-semibold text-foreground">
                  To your linked wallet
                </label>
                <Input
                  id="evm-cashout-address"
                  className="h-9 font-mono text-xs"
                  value={outAddress}
                  readOnly
                  placeholder="Connect a wallet"
                  aria-label="Linked wallet cashout address"
                />
                <p>
                  Connect MetaMask or Coinbase above. Cashouts go to that wallet. Minimum{" "}
                  {formatUsd(chain?.min_withdrawal_cents ?? data.settings.min_withdrawal_cents)}. A
                  code is emailed to approve each cashout.
                </p>
              </div>
              {withdrawAsset && !withdrawAsset.payout_ready ? (
                <p className="text-xs text-destructive">
                  {withdrawAsset.asset_key} withdrawals are temporarily unavailable while that
                  payout wallet is refilled. Choose another asset or try again later.
                </p>
              ) : null}
              <div className="mt-auto space-y-2">
                <Button
                  className="h-9 w-full"
                  onClick={reviewWithdrawal}
                  disabled={
                    cents == null ||
                    cents < minWithdrawCents ||
                    !outOk ||
                    !withdrawAsset ||
                    busy ||
                    !data.settings.withdrawals_enabled ||
                    cents > withdrawableCents ||
                    !withdrawAsset.payout_ready
                  }
                >
                  {busy
                    ? "Preparing…"
                    : withdrawAsset?.asset_key === "USDC"
                      ? "Cash out USDC"
                      : "Cash out ETH"}
                </Button>
                {cents != null && cents < minWithdrawCents ? (
                  <p className="text-center text-xs text-destructive">
                    Minimum cashout is {formatUsd(minWithdrawCents)}.
                  </p>
                ) : null}
                {!data.settings.withdrawals_enabled && (
                  <p className="text-center text-xs text-destructive">Withdrawals are paused.</p>
                )}
                {cashoutCapHint && withdrawableCents < minWithdrawCents ? (
                  <p className="text-center text-xs text-destructive">{cashoutCapHint}</p>
                ) : cashoutCapHint ? (
                  <p className="text-center text-xs text-muted-foreground">{cashoutCapHint}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return children({ form });
}

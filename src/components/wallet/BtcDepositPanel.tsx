import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { encodeQR } from "qr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DepositAddress } from "@/components/wallet/DepositAddress";
import { Input } from "@/components/ui/input";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { claimSendLock } from "@/components/wallet/VerifiedWalletActions";
import {
  createBtcInvoice,
  getBtcDepositConfig,
  getBtcInvoice,
  getOpenBtcInvoice,
  getBtcPayoutConfig,
  requestBtcCashout,
} from "@/lib/crypto/btcpay/btcpay.functions";
import { bitcoinPaymentUri, btcInvoicePhase } from "@/lib/crypto/btcpay/policy";
import { announceDepositSubmitted } from "@/lib/crypto/deposit-notify";
import { announceWithdrawalSubmitted } from "@/lib/crypto/withdraw-notify";
import { PartnerProfitNote, usePartnerProfitHold } from "@/components/wallet/PartnerProfitHold";

const DEFAULT_DEPOSIT_USD = "10";

/** Bitcoin deposit invoices and cashouts. MetaMask is not used. */
export function BtcDepositPanel({
  mode = "deposit",
  active = true,
}: {
  mode?: "deposit" | "withdraw";
  /** When false (another rail selected), do not create BTCPay invoices in the background. */
  active?: boolean;
}) {
  const configFn = useServerFn(getBtcDepositConfig);
  const payoutFn = useServerFn(getBtcPayoutConfig);
  const createFn = useServerFn(createBtcInvoice);
  const invoiceFn = useServerFn(getBtcInvoice);
  const openFn = useServerFn(getOpenBtcInvoice);
  const cashoutFn = useServerFn(requestBtcCashout);
  const qc = useQueryClient();
  const config = useQuery({
    queryKey: ["btc-deposit-config"],
    queryFn: () => configFn(),
    staleTime: 30_000,
  });
  const payout = useQuery({
    queryKey: ["btc-payout-config"],
    queryFn: () => payoutFn(),
    staleTime: 30_000,
  });
  const [amount, setAmount] = useState(DEFAULT_DEPOSIT_USD);
  const [outAmount, setOutAmount] = useState("20");
  const [outAddress, setOutAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  const autoEnsureDone = useRef(false);
  const [outBusy, setOutBusy] = useState(false);
  const cashoutLock = useRef(false);
  const heldCents = usePartnerProfitHold(!!payout.data?.enabled);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const latest = useQuery({
    queryKey: ["btc-open-invoice"],
    queryFn: () => openFn(),
    staleTime: 8_000,
  });
  const resolvedId = invoiceId ?? (latest.data?.ok ? latest.data.id : null);
  const preview = latest.data?.ok ? latest.data.invoice : null;
  const invoicePoll = useRef(0);
  const invoiceSeen = useRef<string | null>(null);
  if (invoiceSeen.current !== resolvedId) {
    invoiceSeen.current = resolvedId;
    invoicePoll.current = 0;
  }
  const invoice = useQuery({
    queryKey: ["btc-invoice", resolvedId],
    queryFn: () =>
      invoiceFn({
        data: { id: resolvedId!, refresh: invoicePoll.current++ > 0 },
      }),
    enabled: !!resolvedId,
    ...(preview ? { placeholderData: { ok: true as const, invoice: preview } } : {}),
    refetchInterval: (query) => {
      const status = query.state.data?.ok ? query.state.data.invoice.status : "";
      return status === "NEW" || status === "PROCESSING" || status === "SETTLED" ? 8000 : false;
    },
  });

  useEffect(() => {
    if (!invoice.data?.ok || invoice.data.invoice.status !== "CREDITED") return;
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["crypto-activity"] });
  }, [invoice.data, qc]);

  const announcedPayment = useRef<string | null>(null);
  useEffect(() => {
    if (!invoice.data?.ok) return;
    if (invoice.data.invoice.status !== "PROCESSING" && invoice.data.invoice.status !== "SETTLED")
      return;
    const payment = invoice.data.invoice;
    if (announcedPayment.current === payment.id) return;
    announcedPayment.current = payment.id;
    announceDepositSubmitted({
      usdCents: payment.usdCents,
      asset: "BTC",
      networkMode: "bitcoin",
    });
  }, [invoice.data]);

  const open = invoice.data?.ok ? invoice.data.invoice : null;
  const phase = open ? btcInvoicePhase(open.status) : null;
  const payUri = open?.address ? bitcoinPaymentUri(open.address, open.btcDue ?? "") : "";
  const payQr = useMemo(() => {
    if (!payUri) return "";
    try {
      return encodeQR(payUri, "svg", { ecc: "medium", border: 2, scale: 4 });
    } catch {
      return "";
    }
  }, [payUri]);
  const payBy = open?.expiresAt
    ? new Date(open.expiresAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";

  const depositsOn = !!config.data?.enabled;
  const payoutsOn = !!payout.data?.enabled;
  const cents = parseUsdToCents(amount);
  const outCents = parseUsdToCents(outAmount);

  async function start(nextCents = cents) {
    if (busy || starting.current) return;
    if (
      nextCents == null ||
      !Number.isInteger(nextCents) ||
      nextCents < (config.data?.enabled ? config.data.minCents : 0)
    ) {
      toast.error("Enter a USD amount at or above the minimum.");
      return;
    }
    setAmount(String(nextCents / 100));
    const live =
      open && phase === "pay"
        ? open
        : preview && btcInvoicePhase(preview.status) === "pay"
          ? preview
          : null;
    if (live && live.usdCents === nextCents && live.address) {
      setInvoiceId(live.id);
      return;
    }
    starting.current = true;
    setBusy(true);
    try {
      const result = await createFn({ data: { usdCents: nextCents } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const created = {
        id: result.id,
        status: "NEW",
        address: result.address,
        btcDue: result.btcDue,
        usdCents: result.usdCents,
        expiresAt: result.expiresAt,
        network: result.network,
        requiredConfirmations: result.requiredConfirmations,
      };
      setInvoiceId(result.id);
      qc.setQueryData(["btc-invoice", result.id], { ok: true as const, invoice: created });
      qc.setQueryData(["btc-open-invoice"], { ok: true as const, id: result.id, invoice: created });
    } catch {
      autoEnsureDone.current = false;
      toast.error("Bitcoin deposits are unavailable right now.");
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setAmount(String(open.usdCents / 100));
  }, [open?.id, open?.usdCents]);

  useEffect(() => {
    if (!active) {
      autoEnsureDone.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (!active || mode !== "deposit" || !depositsOn) return;
    if (config.isLoading || latest.isLoading) return;
    if (autoEnsureDone.current || busy || starting.current) return;
    const existing =
      open && phase === "pay" && open.address
        ? open
        : preview && btcInvoicePhase(preview.status) === "pay" && preview.address
          ? preview
          : null;
    if (existing) {
      autoEnsureDone.current = true;
      if (!invoiceId) setInvoiceId(existing.id);
      return;
    }
    if (phase === "confirming" || phase === "crediting" || phase === "credited") {
      autoEnsureDone.current = true;
      return;
    }
    if (phase === "closed" || phase === "review") {
      autoEnsureDone.current = false;
      return;
    }
    const min = config.data?.minCents ?? 0;
    const nextCents = cents ?? Math.max(min, 1000);
    if (nextCents == null || !Number.isInteger(nextCents) || nextCents < min) return;
    autoEnsureDone.current = true;
    void start(nextCents);
  }, [
    active,
    mode,
    depositsOn,
    config.isLoading,
    latest.isLoading,
    open,
    phase,
    preview,
    invoiceId,
    cents,
    config.data?.minCents,
    busy,
  ]);

  async function cashout() {
    if (cashoutLock.current || outBusy) return;
    if (!payout.data?.enabled || !payout.data.available) return;
    if (outCents == null || outCents < payout.data.minCents) {
      toast.error("Enter a USD amount at or above the cashout minimum.");
      return;
    }
    if (outAddress.trim().length < 14) {
      toast.error("Enter a Bitcoin address that starts with bc1.");
      return;
    }
    if (!claimSendLock(cashoutLock)) return;
    setOutBusy(true);
    try {
      const result = await cashoutFn({
        data: { usdCents: outCents, address: outAddress },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      announceWithdrawalSubmitted({
        usdCents: outCents,
        asset: "BTC",
        network: "bitcoin",
      });
      setOutAddress("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["crypto-activity"] });
    } catch {
      toast.error("Bitcoin cashouts are unavailable right now.");
    } finally {
      cashoutLock.current = false;
      setOutBusy(false);
    }
  }

  const amountDirty = phase === "pay" && open != null && open.usdCents !== cents;

  return (
    <div className="min-w-0">
      {mode === "deposit" && (depositsOn || !config.isFetched) ? (
        <>
          {open && phase && (phase === "credited" || phase === "review" || phase === "closed") ? (
            <p className="mb-2 text-sm font-medium">
              {phase === "credited" && `${formatUsd(open.usdCents)} is in your balance.`}
              {phase === "review" && "This payment needs a review before it can be added."}
              {phase === "closed" && "This invoice is closed. Enter an amount to deposit again."}
            </p>
          ) : null}
          <DepositAddress
            network="Bitcoin network"
            address={open?.address ?? null}
            qr={payQr}
            copiedLabel="Bitcoin address copied"
            note={
              phase === "confirming" || phase === "crediting"
                ? ""
                : open?.btcDue
                  ? [
                      `Send exactly ${open.btcDue} BTC to this address.`,
                      `It is added to your balance after ${open.requiredConfirmations} confirmations.`,
                      "If a smaller amount confirms, that amount is added at this same price.",
                      payBy ? `Send it before ${payBy}.` : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : config.isFetched
                    ? busy
                      ? "Preparing your Bitcoin address and QR code…"
                      : `Minimum ${formatUsd(config.data?.minCents ?? 0)}. Change the amount and press Enter to update the invoice.`
                    : ""
            }
            pending={
              busy || (depositsOn && !open?.address && !config.isLoading && latest.isLoading)
            }
            emptyAddress="Preparing address…"
          >
            <label htmlFor="btc-deposit-amount" className="mt-2 block text-xs font-medium">
              Amount
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="btc-deposit-amount"
                className="h-8 pl-7 font-mono"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                disabled={
                  busy || phase === "confirming" || phase === "crediting" || phase === "credited"
                }
                onChange={(event) => setAmount(event.target.value)}
                onBlur={() => {
                  if (amountDirty) void start();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  void start();
                }}
                aria-label="Bitcoin deposit amount in USD"
              />
            </div>
            {amountDirty ? (
              <p className="mt-1.5 min-h-4 text-xs text-muted-foreground">
                {busy ? "Updating the address…" : "Press enter to use this amount."}
              </p>
            ) : (
              <p className="mt-1.5 min-h-4 text-xs text-muted-foreground" aria-hidden>
                {"\u00a0"}
              </p>
            )}
          </DepositAddress>
        </>
      ) : mode === "deposit" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Bitcoin deposits are unavailable right now.
        </p>
      ) : null}
      {mode === "withdraw" && (payout.isFetched ? payoutsOn && payout.data?.enabled : true) ? (
        <div className="flex flex-1 flex-col space-y-2">
          <div>
            <label
              htmlFor="btc-cashout-amount"
              className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Amount in USD
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="btc-cashout-amount"
                className="h-8 pl-7 font-mono"
                inputMode="decimal"
                value={outAmount}
                onChange={(event) => setOutAmount(event.target.value)}
                aria-label="Bitcoin cashout amount in USD"
              />
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {["20", "50", "100"].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7"
                  onClick={() => setOutAmount(preset)}
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
            <label htmlFor="btc-cashout-address" className="font-semibold text-foreground">
              To a bc1 address
            </label>
            <Input
              id="btc-cashout-address"
              className="h-8 font-mono text-xs"
              value={outAddress}
              onChange={(event) => setOutAddress(event.target.value)}
              placeholder="bc1…"
              aria-label="Bitcoin cashout address"
            />
            <p className="min-h-[2.5rem] sm:min-h-4">
              {payout.data?.minCents != null
                ? `Minimum ${formatUsd(payout.data.minCents)}.`
                : "\u00a0"}
            </p>
          </div>
          {!payout.isFetched || payout.data?.available ? (
            <PartnerProfitNote heldCents={payout.isFetched ? heldCents : 0} />
          ) : (
            <p className="text-xs text-destructive">
              Bitcoin cashouts are temporarily unavailable. Choose another asset or try again later.
            </p>
          )}
          <div className="mt-auto space-y-2">
            <Button
              type="button"
              className="h-8 w-full"
              onClick={cashout}
              disabled={outBusy || !payout.isFetched || !payout.data?.available}
            >
              {outBusy ? "Requesting…" : "Cash out BTC"}
            </Button>
          </div>
        </div>
      ) : mode === "withdraw" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Bitcoin cashouts are unavailable right now.
        </p>
      ) : null}
    </div>
  );
}
